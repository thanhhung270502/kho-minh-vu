-- =============================================================================
-- DDH-02, DDH-03 — Trục duyệt của trang_thai_ddh (D-04, D-05)
--
-- trang_thai_ddh chỉ còn TAM | DA_XAC_NHAN | HOAN_THANH | DA_HUY. _cap_nhat_
-- tien_do_ddh chỉ tự đóng HOAN_THANH cho đơn DA_XAC_NHAN giao đủ; đơn TAM
-- không tự đổi trạng thái dù giao đủ, đơn DA_XAC_NHAN giao một phần vẫn ở
-- nguyên DA_XAC_NHAN (không có trạng thái "giao một phần" nào nữa).
-- =============================================================================
begin;
select plan(10);

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

-- ─── Dựng dữ liệu: ba mã hàng, một kho, một đối tác có sẵn ───────────────────
create temp table t_dh as
select pg_temp.sp_test('DDH-ZQX-A') as sp_a,
       pg_temp.sp_test('DDH-ZQX-B') as sp_b,
       pg_temp.sp_test('DDH-ZQX-C') as sp_c,
       pg_temp.kho_id('K1')         as k1,
       (select id from public.doi_tac limit 1) as doi_tac;
grant select on t_dh to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- ─── 1–2: kiểu chỉ còn bốn nhãn của trục duyệt ───────────────────────────────
select is(
  (select exists(select 1 from pg_type where typname = 'trang_thai_ddh' and typnamespace = 'public'::regnamespace)),
  true,
  'kiểu trang_thai_ddh tồn tại trong schema public'
);

select is(
  enum_range(null::public.trang_thai_ddh)::text[],
  array['TAM','DA_XAC_NHAN','HOAN_THANH','DA_HUY'],
  'trang_thai_ddh chỉ còn bốn nhãn của trục duyệt, đúng thứ tự'
);

-- ─── 3: default là TAM ───────────────────────────────────────────────────────
select is(
  (with ins as (
     insert into public.don_dat_hang (so_dh, doi_tac_id)
     select 'DH-DDH-ZQX-DEFAULT', doi_tac from t_dh
     returning trang_thai
   ) select trang_thai::text from ins),
  'TAM',
  'don_dat_hang.trang_thai mặc định TAM khi không truyền'
);

-- ─── 4: partial index dựng lại ───────────────────────────────────────────────
select is(
  (select exists(
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'don_dat_hang' and indexname = 'idx_ddh_trang_thai'
  )),
  true,
  'index idx_ddh_trang_thai tồn tại trên don_dat_hang'
);

-- ─── Dựng tồn ban đầu: nhập 100 mỗi mã vào K1, tránh vướng chặn xuất âm ──────
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id)
select 'PN-DDH-ZQX', 'NHAP', current_date, k1, doi_tac from t_dh;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'PN-DDH-ZQX'), sp_a, 100, 1000, 100000 from t_dh
union all
select (select id from public.chung_tu where so_ct = 'PN-DDH-ZQX'), sp_b, 100, 1000, 100000 from t_dh
union all
select (select id from public.chung_tu where so_ct = 'PN-DDH-ZQX'), sp_c, 100, 1000, 100000 from t_dh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-DDH-ZQX'));

-- ─── Kịch bản 1: đơn DA_XAC_NHAN, giao đủ hai dòng → tự đóng HOAN_THANH ─────
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-DDH-ZQX-A', doi_tac, 'DA_XAC_NHAN' from t_dh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A'), sp_a, 10 from t_dh
union all
select (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A'), sp_b, 5 from t_dh;

insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, don_dat_hang_id)
select 'XK-DDH-ZQX-A', 'XUAT', current_date, k1, doi_tac,
       (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A')
from t_dh;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-A'), sp_a, 10, 0, 0 from t_dh
union all
select (select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-A'), sp_b, 5, 0, 0 from t_dh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-A'));

select is(
  (select d.so_luong_da_xuat from public.don_dat_hang_dong d, t_dh
    where d.don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A')
      and d.san_pham_id = t_dh.sp_a),
  10::numeric(18,4),
  'dòng A giao đủ: so_luong_da_xuat bằng so_luong_dat'
);

select is(
  (select d.so_luong_da_xuat from public.don_dat_hang_dong d, t_dh
    where d.don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A')
      and d.san_pham_id = t_dh.sp_b),
  5::numeric(18,4),
  'dòng B giao đủ: so_luong_da_xuat bằng so_luong_dat'
);

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-A'),
  'HOAN_THANH',
  'đơn DA_XAC_NHAN giao đủ mọi dòng tự đóng HOAN_THANH'
);

-- ─── Kịch bản 2: đơn DA_XAC_NHAN, giao MỘT PHẦN → vẫn DA_XAC_NHAN ───────────
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-DDH-ZQX-B', doi_tac, 'DA_XAC_NHAN' from t_dh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-B'), sp_a, 20 from t_dh;

insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, don_dat_hang_id)
select 'XK-DDH-ZQX-B', 'XUAT', current_date, k1, doi_tac,
       (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-B')
from t_dh;

-- Giao 8/20 — cố ý ít hơn số đặt.
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-B'), sp_a, 8, 0, 0 from t_dh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-B'));

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-B'),
  'DA_XAC_NHAN',
  'đơn DA_XAC_NHAN giao một phần vẫn DA_XAC_NHAN, KHÔNG có trạng thái "giao một phần"'
);

-- ─── Kịch bản 3: đơn TAM, giao đủ → so_luong_da_xuat cập nhật nhưng vẫn TAM ──
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-DDH-ZQX-C', doi_tac, 'TAM' from t_dh;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-C'), sp_c, 15 from t_dh;

insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, don_dat_hang_id)
select 'XK-DDH-ZQX-C', 'XUAT', current_date, k1, doi_tac,
       (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-C')
from t_dh;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-C'), sp_c, 15, 0, 0 from t_dh;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XK-DDH-ZQX-C'));

select is(
  (select d.so_luong_da_xuat from public.don_dat_hang_dong d, t_dh
    where d.don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-C')
      and d.san_pham_id = t_dh.sp_c),
  15::numeric(18,4),
  'đơn TAM giao đủ: so_luong_da_xuat vẫn cập nhật đúng'
);

select is(
  (select trang_thai::text from public.don_dat_hang where so_dh = 'DH-DDH-ZQX-C'),
  'TAM',
  'đơn TAM giao đủ KHÔNG tự chuyển trạng thái — chỉ RPC duyệt đơn mới đổi TAM'
);

select * from finish();
rollback;
