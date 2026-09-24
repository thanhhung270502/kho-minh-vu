-- =============================================================================
-- DMUC-05 — Thẻ kho một mã: movement hệ mới gộp dòng KiotViet cũ (D-21)
-- =============================================================================
begin;
select plan(7);

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


create temp table t_tk as
select pg_temp.sp_test('TK-ZQX-001') as sp,
       pg_temp.kho_id('K1')          as k1,
       pg_temp.kho_id('K2')          as k2;
grant select on t_tk to authenticated;

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 5, 1000 from t_tk;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp, -2, 1000 from t_tk;

insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong)
values ('PN-ZQX', '2026-09-10T08:00:00+07:00', 'NCC000001 X', 'TK-ZQX-001', 3);
insert into public.luu_tru_hoa_don_kiotviet (ma_hoa_don, ngay, ma_hang, so_luong, ghi_chu)
values ('HD-ZQX', '2026-09-11T09:00:00+07:00', 'TK-ZQX-001', 4, 'NGỌC');

-- --- Quản lý: thấy cả dữ liệu KiotViet cũ -----------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select count(*) from public.the_kho_san_pham((select sp from t_tk))),
  2::bigint,
  'D-11: thẻ kho chỉ còn 2 biến động hệ thống — không còn dòng KiotViet cũ'
);

select is(
  (select string_agg(distinct nguon, ',' order by nguon) from public.the_kho_san_pham((select sp from t_tk))),
  'HE_THONG',
  'D-11: mỗi dòng còn lại chỉ mang nhãn nguồn HE_THONG'
);

select is(
  (select count(*) from public.the_kho_san_pham((select sp from t_tk)) where nguon like 'KIOTVIET%'),
  0::bigint,
  'D-11: không còn dòng nguồn KIOTVIET nào — lịch sử KiotViet xem ở tra_cuu_lich_su_kiotviet'
);

select is(
  (select count(*) from public.the_kho_san_pham((select sp from t_tk), (select k2 from t_tk))),
  1::bigint,
  'lọc theo kho chỉ còn biến động hệ mới của kho đó — dòng KiotViet cũ không có kho'
);

select is(
  (select nguon from public.the_kho_san_pham((select sp from t_tk)) limit 1),
  'HE_THONG',
  'sắp xếp mới nhất trước'
);

-- --- Thủ kho K1 -------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select count(*) from public.the_kho_san_pham((select sp from t_tk))),
  1::bigint,
  'thủ kho chỉ thấy biến động kho mình, không thấy dòng KiotViet cũ'
);

select ok(
  (select bool_and(gia_von_tai_thoi_diem is null) from public.the_kho_san_pham((select sp from t_tk))),
  'thủ kho không nhận giá vốn tại thời điểm'
);

select * from finish();
rollback;
