-- =============================================================================
-- DDH-02/DDH-03 — Trục duyệt trang_thai_ddh và _cap_nhat_tien_do_ddh (Phase 4)
-- =============================================================================
begin;
select plan(9);

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

-- ─── 1–4: kiểu và cột ────────────────────────────────────────────────────────
select has_type('public', 'trang_thai_ddh', 'kiểu trang_thai_ddh tồn tại');

select enum_has_labels(
  'public', 'trang_thai_ddh',
  array['TAM', 'DA_XAC_NHAN', 'HOAN_THANH', 'DA_HUY'],
  'trang_thai_ddh chỉ còn trục duyệt, đúng bốn nhãn theo đúng thứ tự'
);

select col_default_is(
  'public', 'don_dat_hang', 'trang_thai', 'TAM',
  'cột trang_thai mặc định TAM (đơn tạo mới ở dạng nháp)'
);

select has_index('public', 'don_dat_hang', 'idx_ddh_trang_thai', 'partial index idx_ddh_trang_thai còn tồn tại sau khi dựng lại');

-- ─── Dựng dữ liệu nghiệp vụ ──────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

create temp table t_ddh as
select pg_temp.sp_test('DDH-ZQX-A') as sp_a,
       pg_temp.sp_test('DDH-ZQX-B') as sp_b,
       pg_temp.kho_id('K1')         as k1,
       (select id from public.doi_tac limit 1) as dt;
grant select on t_ddh to authenticated;

-- Đơn A: DA_XAC_NHAN, hai dòng, sẽ giao đủ cả hai.
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-ZQX-A', dt, 'DA_XAC_NHAN' from t_ddh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-ZQX-A'), sp_a, 10 from t_ddh;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-ZQX-A'), sp_b, 5 from t_ddh;

-- Phiếu xuất gắn đơn A, ly_do_xuat_am đặt sẵn để không cần dựng tồn thật
-- (bỏ qua khối kiểm xuất âm trong ghi_so_chung_tu, không liên quan mục tiêu test này).
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id, ly_do_xuat_am, ghi_chu_ly_do)
select 'XU-ZQX-A', 'XUAT', k1, dt, (select id from public.don_dat_hang where so_dh = 'DH-ZQX-A'),
       'khac', 'pgTAP test' from t_ddh;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-ZQX-A'), sp_a, 10 from t_ddh;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-ZQX-A'), sp_b, 5 from t_ddh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-ZQX-A'));

-- ─── 5–7: đơn DA_XAC_NHAN giao đủ hai dòng thì tự đóng HOAN_THANH ───────────
select is(
  (select d.so_luong_da_xuat from public.don_dat_hang_dong d, t_ddh
    where d.don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-ZQX-A')
      and d.san_pham_id = t_ddh.sp_a),
  10::numeric(18,4),
  'dòng A so_luong_da_xuat cộng đúng bằng so_luong_dat'
);

select is(
  (select d.so_luong_da_xuat from public.don_dat_hang_dong d, t_ddh
    where d.don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-ZQX-A')
      and d.san_pham_id = t_ddh.sp_b),
  5::numeric(18,4),
  'dòng B so_luong_da_xuat cộng đúng bằng so_luong_dat'
);

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-ZQX-A'),
  'HOAN_THANH',
  'đơn DA_XAC_NHAN giao đủ mọi dòng tự đóng HOAN_THANH'
);

-- ─── 8: đơn DA_XAC_NHAN chỉ giao MỘT PHẦN thì vẫn DA_XAC_NHAN ───────────────
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-ZQX-B', dt, 'DA_XAC_NHAN' from t_ddh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-ZQX-B'), sp_a, 10 from t_ddh;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-ZQX-B'), sp_b, 5 from t_ddh;

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id, ly_do_xuat_am, ghi_chu_ly_do)
select 'XU-ZQX-B', 'XUAT', k1, dt, (select id from public.don_dat_hang where so_dh = 'DH-ZQX-B'),
       'khac', 'pgTAP test' from t_ddh;

-- Chỉ giao dòng A, dòng B chưa giao gì.
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-ZQX-B'), sp_a, 10 from t_ddh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-ZQX-B'));

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-ZQX-B'),
  'DA_XAC_NHAN',
  'đơn giao một phần KHÔNG có trạng thái riêng — vẫn DA_XAC_NHAN, không tự đóng'
);

-- ─── 9: đơn TAM giao đủ vẫn ở TAM (không tự nhảy sang HOAN_THANH) ──────────
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-ZQX-C', dt, 'TAM' from t_ddh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-ZQX-C'), sp_a, 3 from t_ddh;

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id, ly_do_xuat_am, ghi_chu_ly_do)
select 'XU-ZQX-C', 'XUAT', k1, dt, (select id from public.don_dat_hang where so_dh = 'DH-ZQX-C'),
       'khac', 'pgTAP test' from t_ddh;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-ZQX-C'), sp_a, 3 from t_ddh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-ZQX-C'));

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-ZQX-C'),
  'TAM',
  'đơn TAM giao đủ vẫn ở TAM — chỉ so_luong_da_xuat cập nhật, chuyển TAM->DA_XAC_NHAN là việc của xac_nhan_don'
);

select * from finish();
rollback;
