-- =============================================================================
-- 0136 — phiếu nhập lọc theo nhóm hàng được xem (0132): ẩn dòng nhóm khác, tổng chỉ tính dòng
-- thấy được, phiếu chỉ toàn nhóm khác thì ẩn, phiếu còn dòng nhóm khác thì khóa thao tác.
-- Tài khoản / nhóm / mã / phiếu thử tiền tố zq136 / ZQ136-, phiếu đều ở NHAP_LIEU (không đụng sổ cái).
-- =============================================================================
begin;
select plan(25);

create or replace function pg_temp.dang_nhap_id(p_id uuid)
returns void language plpgsql as $helper$
declare v_nd public.nguoi_dung; v_kho jsonb;
begin
  -- Đọc hồ sơ bằng postgres: nếu vẫn mang vai tài khoản trước, RLS nguoi_dung giấu dòng
  -- của tài khoản mới và claim vai_tro thành rỗng.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
  select * into v_nd from public.nguoi_dung where id = p_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = p_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', v_kho
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

-- Số dòng UPDATE / DELETE thật sự chạm tới (RLS lọc mất thì 0, không báo lỗi).
create or replace function pg_temp.sua_ghi_chu(p_id uuid)
returns integer language plpgsql as $h$
declare n integer;
begin
  update public.chung_tu set ghi_chu = 'zq136 sửa' where id = p_id;
  get diagnostics n = row_count;
  return n;
end $h$;

create or replace function pg_temp.xoa_dong(p_chung_tu_id uuid)
returns integer language plpgsql as $h$
declare n integer;
begin
  delete from public.chung_tu_dong where chung_tu_id = p_chung_tu_id;
  get diagnostics n = row_count;
  return n;
end $h$;

-- ─── Dữ liệu nền (postgres) ─────────────────────────────────────────────────
create temp table t as
select gen_random_uuid() as u_gh, gen_random_uuid() as u_tu,
       gen_random_uuid() as nhom_a, gen_random_uuid() as nhom_b,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t to authenticated;

insert into auth.users (id, email, aud, role)
select x.id, x.email, 'authenticated', 'authenticated'
from t, lateral (values (t.u_gh, 'zq136-gh@test.local'), (t.u_tu, 'zq136-tu@test.local')) x(id, email);
insert into public.nguoi_dung (id, ho_ten, vai_tro, chuc_vu_id)
select x.id, x.ten, 'van_phong', (select id from public.chuc_vu where ma = 'NHAN_VIEN')
from t, lateral (values (t.u_gh, 'ZQ136 Giới hạn'), (t.u_tu, 'ZQ136 Tự do')) x(id, ten);
insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select x.id, 'nhap_kho' from t, lateral (values (t.u_gh), (t.u_tu)) x(id);

insert into public.nhom_hang (id, ma, ten)
select nhom_a, 'ZQ136-A', 'ZQ136 nhóm A' from t union all
select nhom_b, 'ZQ136-B', 'ZQ136 nhóm B' from t;
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id)
select x.ma, x.ten, (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI'), x.nhom
from t, lateral (values ('ZQ136-SPA', 'Hàng zq136 A', t.nhom_a), ('ZQ136-SPA2', 'Hàng zq136 A2', t.nhom_a),
                        ('ZQ136-SPB', 'Hàng zq136 B', t.nhom_b)) x(ma, ten, nhom);

insert into public.chung_tu (so_ct, loai_ct, kho_id)
select x.so, 'NHAP', t.k1 from t, lateral (values ('ZQ136-MIX'), ('ZQ136-B'), ('ZQ136-A'), ('ZQ136-RONG')) x(so);

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select ct.id, sp.id, x.sl, 100, x.sl * 100
from (values ('ZQ136-MIX', 'ZQ136-SPA', 3), ('ZQ136-MIX', 'ZQ136-SPB', 5),
             ('ZQ136-B', 'ZQ136-SPB', 2), ('ZQ136-A', 'ZQ136-SPA', 1)) x(so, ma, sl)
join public.chung_tu ct on ct.so_ct = x.so
join public.san_pham sp on sp.ma_hang = x.ma;

-- Hóa đơn thử: CI chạy trên DB rỗng nên không thể trông chờ hóa đơn có sẵn.
insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'XUAT-ZQ-136', 'XUAT', t.k1 from t;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select ct.id, sp.id, 1, 100, 100
from public.chung_tu ct, public.san_pham sp where ct.so_ct = 'XUAT-ZQ-136' and sp.ma_hang = 'ZQ136-SPB';

create temp table t_ct as
select (select id from public.chung_tu where so_ct = 'ZQ136-MIX') as mix,
       (select id from public.chung_tu where so_ct = 'ZQ136-B') as b,
       (select id from public.chung_tu where so_ct = 'ZQ136-A') as a,
       (select id from public.san_pham where ma_hang = 'ZQ136-SPA') as sp_a,
       (select id from public.san_pham where ma_hang = 'ZQ136-SPA2') as sp_a2,
       (select id from public.san_pham where ma_hang = 'ZQ136-SPB') as sp_b;
grant select on t_ct to authenticated;

insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids)
select u_gh, array[nhom_a] from t;

-- ─── 1. Không giới hạn: không đổi gì ────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_tu from t));
select is((select count(*) from public.danh_sach_chung_tu(p_loai_ct => 'NHAP', p_tu_khoa => 'ZQ136')),
  4::bigint, 'không giới hạn: thấy cả 4 phiếu nhập thử');
select is((select count(*) from public.dong_chung_tu((select mix from t_ct))), 2::bigint,
  'không giới hạn: phiếu lẫn nhóm hiện đủ 2 dòng');
select is(public.so_dong_an_nhom_hang((select mix from t_ct)), 0, 'không giới hạn: không có dòng ẩn');

-- ─── 2. Giới hạn nhóm A: đọc ────────────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_gh from t));
select is((select array_agg(so_ct order by so_ct) from public.danh_sach_chung_tu(p_loai_ct => 'NHAP', p_tu_khoa => 'ZQ136')),
  array['ZQ136-A', 'ZQ136-MIX', 'ZQ136-RONG'], 'danh sách: ẩn phiếu toàn nhóm khác, giữ phiếu lẫn và phiếu chưa có dòng');
select ok((select so_dong = 1 and tong_so_luong = 3 and tong_tien = 300
           from public.danh_sach_chung_tu(p_loai_ct => 'NHAP', p_tu_khoa => 'ZQ136-MIX')), 'danh sách: số dòng và tổng chỉ tính dòng thấy được');
select is((select count(*) from public.chi_tiet_chung_tu((select b from t_ct))), 0::bigint,
  'chi tiết: phiếu toàn nhóm khác coi như không tồn tại');
select ok((select tong_so_luong = 3 and tong_tien = 300 from public.chi_tiet_chung_tu((select mix from t_ct))), 'chi tiết: tổng chỉ tính dòng thấy được');
select is((select array_agg(ma_hang) from public.dong_chung_tu((select mix from t_ct))), array['ZQ136-SPA'],
  'dòng phiếu: ẩn dòng nhóm khác');
select is(public.so_dong_an_nhom_hang((select mix from t_ct)), 1, 'so_dong_an_nhom_hang: phiếu lẫn = 1');
select is(public.so_dong_an_nhom_hang((select a from t_ct)), 0, 'so_dong_an_nhom_hang: phiếu nhóm A = 0');
select is((select count(*) from public.chung_tu where so_ct like 'ZQ136-%'), 3::bigint,
  'đọc thẳng bảng chung_tu: ẩn phiếu toàn nhóm khác');
select is((select count(*) from public.chung_tu_dong where chung_tu_id = (select mix from t_ct)), 1::bigint,
  'đọc thẳng bảng chung_tu_dong: ẩn dòng nhóm khác');
select is((public.xuat_excel_chung_tu('NHAP', p_tu_khoa => 'ZQ136') ->> 'tong')::integer, 3,
  'xuất Excel: 3 phiếu');
select ok(not exists (
    select 1 from jsonb_array_elements(public.xuat_excel_chung_tu('NHAP', p_tu_khoa => 'ZQ136') -> 'dong') e
    where e ->> 'ma_hang' = 'ZQ136-SPB'),
  'xuất Excel: không có dòng mã nhóm B');

-- ─── 3. Giới hạn nhóm A: ghi ────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
     values ((select a from t_ct), (select sp_b from t_ct), 1) $$,
  '42501', null, 'không thêm được mã nhóm B vào phiếu');
select lives_ok(
  $$ insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
     values ((select a from t_ct), (select sp_a2 from t_ct), 1) $$,
  'thêm được mã nhóm A vào phiếu chỉ có nhóm A');
select throws_ok(
  $$ insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
     values ((select mix from t_ct), (select sp_a2 from t_ct), 1) $$,
  '42501', null, 'phiếu còn dòng nhóm khác: không thêm dòng');
select is(pg_temp.sua_ghi_chu((select mix from t_ct)), 0, 'phiếu còn dòng nhóm khác: không sửa đầu phiếu');
select is(pg_temp.sua_ghi_chu((select a from t_ct)), 1, 'phiếu chỉ nhóm A: sửa đầu phiếu được');
select is(pg_temp.xoa_dong((select mix from t_ct)), 0, 'phiếu còn dòng nhóm khác: không xóa dòng');
select throws_ok($$ select public.ghi_so_chung_tu((select mix from t_ct)) $$, '42501', null,
  'phiếu còn dòng nhóm khác: không ghi sổ');
select throws_ok($$ select public.huy_chung_tu((select mix from t_ct), 'zq136') $$, '42501', null,
  'phiếu còn dòng nhóm khác: không hủy');

-- ─── 4. Nhập Excel ──────────────────────────────────────────────────────────
select ok(
  public.nhap_chung_tu_excel('PHIEU_NHAP', 'moi', jsonb_build_array(jsonb_build_object(
    'so', 'ZQ136-XL', 'dong_dau', 2, 'ma_kho', 'K1',
    'dong', jsonb_build_array(jsonb_build_object('dong', 2, 'ma_hang', 'ZQ136-SPB', 'so_luong', 1),
                              jsonb_build_object('dong', 3, 'ma_hang', 'ZQ136-SPA', 'so_luong', 1)))), true)
    -> 'loi' @> jsonb_build_array(jsonb_build_object('dong', 2, 'so', 'ZQ136-XL', 'loi', 'Không có mã hàng ZQ136-SPB')),
  'nhập Excel: mã nhóm B báo "Không có mã hàng"');
select ok(
  public.nhap_chung_tu_excel('PHIEU_NHAP', 'cap_nhat', jsonb_build_array(jsonb_build_object(
    'so', 'ZQ136-MIX', 'dong_dau', 2, 'ma_kho', 'K1',
    'dong', jsonb_build_array(jsonb_build_object('dong', 2, 'ma_hang', 'ZQ136-SPA', 'so_luong', 9)))), true)
    -> 'loi' @> jsonb_build_array(jsonb_build_object('dong', 2, 'so', 'ZQ136-MIX',
         'loi', 'Phiếu ZQ136-MIX có hàng thuộc nhóm hàng bạn không được xem — không sửa được')),
  'nhập Excel cập nhật: không thay được phiếu còn dòng nhóm khác');

-- ─── 5. Phiếu loại khác không bị ảnh hưởng ──────────────────────────────────
select is(
  (select count(*) from public.danh_sach_chung_tu(p_loai_ct => 'XUAT', p_tu_khoa => 'XUAT-ZQ-136')),
  1::bigint, 'hóa đơn (XUAT): người bị giới hạn vẫn thấy như cũ');

select * from finish();
rollback;
