-- LOCAL ONLY — chạy bằng supabase_admin trong container DB (scripts/bench/explain.sh).
-- auto_explain cần superuser nên không chạy được bằng vai postgres. Mọi thao tác ghi
-- nằm trong transaction rollback. Mốc "hôm nay" tính theo giờ VN như bộ đo bench:run.
load 'auto_explain';
set auto_explain.log_min_duration = 0;
set auto_explain.log_analyze = on;
set auto_explain.log_buffers = on;
set auto_explain.log_timing = on;
set auto_explain.log_nested_statements = on;
set auto_explain.log_level = 'notice';
set client_min_messages = notice;

select coalesce(
  (select id from auth.users where email = 'bench.quanly@khominhvu.local'),
  (select id from auth.users where email = 'quanly@khominhvu.local')
) as uid \gset
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', :'uid', 'role', 'authenticated', 'vai_tro', 'quan_ly', 'kho_id', '[]'::jsonb)::text, false);
select (now() at time zone 'Asia/Ho_Chi_Minh')::date as hom_nay \gset
select id as kho1 from public.kho where ma = 'K1' \gset
\timing on

\echo '=== CASE: xoa_dong_phieu_nhap ==='
begin;
insert into public.chung_tu (so_ct, loai_ct, kho_id, ngay_ct)
values ('BENCH-EXPLAIN-DRAFT', 'NHAP', :'kho1', :'hom_nay'::date);
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, kho_id)
select (select id from public.chung_tu where so_ct = 'BENCH-EXPLAIN-DRAFT'),
       coalesce((select id from public.san_pham where ma_hang = 'BENCH-0001'),
                (select id from public.san_pham limit 1)),
       1, :'kho1';
select id as line_id from public.chung_tu_dong
 where chung_tu_id = (select id from public.chung_tu where so_ct = 'BENCH-EXPLAIN-DRAFT') limit 1 \gset
-- Dòng "Trigger for constraint kho_movement_chung_tu_dong_id_fkey: time=..." là số chính.
explain (analyze, buffers) delete from public.chung_tu_dong where id = :'line_id';
explain (analyze, buffers) select 1 from only public.kho_movement x where x.chung_tu_dong_id = :'line_id' for key share of x;
rollback;

\echo '=== CASE: danh_sach_don_mac_dinh ==='
set role authenticated;
select count(*) from public.danh_sach_don(
  p_trang_thai => '{TAM,DA_XAC_NHAN,HOAN_THANH}'::public.trang_thai_ddh[],
  p_tu_ngay => date_trunc('month', :'hom_nay'::date)::date,
  p_den_ngay => :'hom_nay'::date, p_trang => 1, p_kich_thuoc => 50);
reset role;

\echo '=== CASE: tim_kiem_so_ct ==='
set role authenticated;
select count(*) from public.tim_kiem_toan_cuc('HD' || to_char(:'hom_nay'::date - 3, 'YYMMDD') || '-04', 5);
reset role;

\echo '=== CASE: tim_kiem_so_dh ==='
set role authenticated;
select count(*) from public.tim_kiem_toan_cuc('DH' || to_char(:'hom_nay'::date - 3, 'YYMMDD') || '-04', 5);
reset role;

\echo '=== CASE: nhap_xuat_theo_ky_thang ==='
set role authenticated;
select count(*) from public.nhap_xuat_theo_ky(date_trunc('month', :'hom_nay'::date)::date, :'hom_nay'::date, 'ngay');
reset role;

\echo '=== CASE: phan_tich_theo_ky_thang ==='
set role authenticated;
select jsonb_array_length(public.phan_tich_theo_ky(date_trunc('month', :'hom_nay'::date)::date, :'hom_nay'::date));
reset role;

\echo '=== CASE: tong_quan_chi_so ==='
set role authenticated;
select count(*) from public.tong_quan_chi_so();
reset role;
