-- =============================================================================
-- NHAP-01 — RPC đọc danh sách và chi tiết chứng từ
-- =============================================================================
begin;
select plan(8);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung; v_kho jsonb;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = v_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', v_kho
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

create or replace function pg_temp.sp_test(p_ma text)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

create temp table t_ds as
select pg_temp.sp_test('DS-ZQX-1') as sp1,
       pg_temp.sp_test('DS-ZQX-2') as sp2,
       pg_temp.kho_id('K1') as k1,
       pg_temp.kho_id('K2') as k2,
       (select id from public.doi_tac where ma = 'NCC000001') as ncc;
grant select on t_ds to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- Ba phiếu: 2 hoàn thành (K1, K2), 1 còn nhập liệu
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap)
select 'PN-DS-A', 'NHAP', current_date, k1, ncc, 'NHA_MAY' from t_ds;
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap)
select 'PN-DS-B', 'NHAP', current_date - 40, k2, ncc, 'NCC' from t_ds;
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap)
select 'PN-DS-C', 'NHAP', current_date, k1, ncc, 'NCC' from t_ds;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PN-DS-A'), sp1, 3, 1000, 3000, null from t_ds;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PN-DS-A'), sp2, 2, 2000, 4000, k2 from t_ds;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PN-DS-B'), sp1, 1, 1000, 1000, null from t_ds;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-DS-A'));
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-DS-B'));

-- ─── 1–4: lọc ───────────────────────────────────────────────────────────────
select is(
  (select count(*) from public.danh_sach_chung_tu(p_loai_ct => 'NHAP') d
    where d.so_ct like 'PN-DS-%'),
  3::bigint,
  'lọc theo loại trả đủ ba phiếu vừa tạo'
);

select is(
  (select count(*) from public.danh_sach_chung_tu(p_loai_ct => 'NHAP', p_trang_thai => 'NHAP_LIEU') d
    where d.so_ct like 'PN-DS-%'),
  1::bigint,
  'lọc theo trạng thái chỉ còn phiếu chưa ghi sổ'
);

select is(
  (select count(*) from public.danh_sach_chung_tu(p_nguon_nhap => 'NHA_MAY') d
    where d.so_ct like 'PN-DS-%'),
  1::bigint,
  'lọc theo nguồn nhập tách được phiếu nhà máy'
);

select is(
  (select count(*) from public.danh_sach_chung_tu(
      p_loai_ct => 'NHAP', p_tu_ngay => current_date) d
    where d.so_ct like 'PN-DS-%'),
  2::bigint,
  'lọc khoảng ngày cắt đúng phiếu cũ 40 ngày'
);

-- ─── 5: tổng số dòng đi kèm mỗi dòng ────────────────────────────────────────
select is(
  (select max(d.tong_so_dong) from public.danh_sach_chung_tu(p_tu_khoa => 'PN-DS-', p_kich_thuoc => 2) d),
  3::bigint,
  'tong_so_dong là tổng THẬT, không phải số dòng của trang'
);

-- ─── 6: chi tiết trả kho theo từng dòng ─────────────────────────────────────
select is(
  (select dg.ten_kho from public.dong_chung_tu(
      (select id from public.chung_tu where so_ct = 'PN-DS-A')) dg, t_ds
    where dg.san_pham_id = t_ds.sp2),
  (select ten from public.kho, t_ds where kho.id = t_ds.k2),
  'dòng chọn Kho 2 trả đúng tên Kho 2, không phải kho của phiếu'
);

-- ─── 7–8: phạm vi kho của thủ kho ───────────────────────────────────────────
-- Seed không có thủ kho nào CHỈ có Kho 2 (thukho1 = K1, thukho2 = K1+K2), nên
-- "thấy phiếu nhờ DÒNG" sẽ pass sai lý do nếu dùng thukho2. Gán lại thukho1 chỉ
-- còn K2 ngay trong transaction — cả file rollback nên dữ liệu thật không đổi.
select pg_temp.dang_xuat();

delete from public.nguoi_dung_kho
where nguoi_dung_id = (select id from auth.users where email = 'thukho1@khominhvu.local');

insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
select (select id from auth.users where email = 'thukho1@khominhvu.local'), pg_temp.kho_id('K2');

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select count(*) from public.danh_sach_chung_tu(p_tu_khoa => 'PN-DS-') d),
  2::bigint,
  'thủ kho chỉ Kho 2 thấy phiếu B (header K2) và A (có dòng K2), KHÔNG thấy C'
);

select is(
  (select count(*) from public.chi_tiet_chung_tu(
    (select id from public.chung_tu where so_ct = 'PN-DS-C'))),
  0::bigint,
  'thủ kho chỉ Kho 2 mở chi tiết phiếu thuần Kho 1 thì không có dữ liệu'
);

select * from finish();
rollback;
