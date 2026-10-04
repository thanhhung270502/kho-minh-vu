-- =============================================================================
-- UI3B-02 — tim_kiem_toan_cuc(p_tu_khoa, p_gioi_han): ô tìm ⌘K gộp mã hàng,
-- chứng từ, đơn đặt, đối tác. SECURITY INVOKER nên RLS tự lọc phạm vi kho.
-- Fixture dùng tiền tố ZQX-TK- (không đụng dữ liệu thật). thukho1 chỉ có K1,
-- nên phiếu "kho kia" là K2.
-- =============================================================================
begin;
select plan(14);

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
select
  pg_temp.sp_test('ZQX-TK-001')  as sp1,
  pg_temp.sp_test('ZQX-TK-0011') as sp2,
  pg_temp.kho_id('K1') as k1,
  pg_temp.kho_id('K2') as k2;
grant select on t_tk to authenticated, anon;

insert into public.chung_tu (so_ct, loai_ct, kho_id, kho_den_id, ngay_ct)
select 'ZQX-TK-PN-1', 'NHAP', k1, null, date '2092-01-05' from t_tk
union all select 'ZQX-TK-PN-2', 'NHAP', k2, null, date '2092-01-05' from t_tk
union all select 'ZQX-TK-CK-1', 'CHUYEN_KHO', k1, k2, date '2092-01-05' from t_tk;

insert into public.doi_tac (ma, ten, loai)
values ('ZQX-TK-DT', 'ZQX Đối Tác Tìm', 'NCC');

insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'ZQX-TK-DH-1', id from public.doi_tac where ma = 'ZQX-TK-DT';

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select nhan from public.tim_kiem_toan_cuc('ZQX-TK-001') where loai = 'san_pham' order by xep_hang, nhan limit 1),
  'ZQX-TK-001', 'mã khớp tuyệt đối đứng đầu');
select is(
  (select xep_hang from public.tim_kiem_toan_cuc('ZQX-TK-001') where nhan = 'ZQX-TK-001'),
  0, 'mã khớp tuyệt đối xep_hang = 0');
select ok(
  (select xep_hang from public.tim_kiem_toan_cuc('ZQX-TK-001') where nhan = 'ZQX-TK-0011') > 0,
  'mã chỉ chứa từ khóa xếp sau');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('ZQX-TK-PN') where loai = 'chung_tu' and loai_ct = 'NHAP'),
  2, 'quanly thấy phiếu nhập cả hai kho');

select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('ZQX-TK-CK') where loai = 'chung_tu'),
  0, 'CHUYEN_KHO không xuất hiện');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('ZQX-TK-DH') where loai = 'don_dat'),
  1, 'tìm được đơn đặt theo số đơn');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('zqx doi tac tim') where loai = 'doi_tac'),
  1, 'tìm không dấu ra đối tác có dấu');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('') ) + (select count(*)::int from public.tim_kiem_toan_cuc('a')),
  0, 'từ khóa rỗng hoặc 1 ký tự trả 0 dòng');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('ZQX-TK', 1) where loai = 'chung_tu'),
  1, 'p_gioi_han = 1 giới hạn mỗi loại');

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is(
  (select count(*)::int from public.tim_kiem_toan_cuc('ZQX-TK-PN') where loai = 'chung_tu'),
  1, 'thukho1 chỉ thấy phiếu kho mình (RLS lọc)');
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select lives_ok($$select * from public.tim_kiem_toan_cuc('ZQX-TK')$$, 'chixem gọi được');
select pg_temp.dang_xuat();

select ok(
  not has_function_privilege('anon', 'public.tim_kiem_toan_cuc(text,integer)', 'execute'),
  'anon không có quyền execute');
select ok(
  position('gia_von' in pg_get_functiondef('public.tim_kiem_toan_cuc(text,integer)'::regprocedure)) = 0,
  'hàm không đọc gia_von');

select * from finish();
rollback;
