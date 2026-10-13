-- =============================================================================
-- 0134 + 0135 — các hàm danh mục / tìm mã / tồn kho / phân tích lọc theo nhóm hàng được xem (0132).
-- Tài khoản thử tự tạo (zq134); mã thử tiền tố ZQ134-. Phần tồn / thẻ kho / dashboard so
-- trên dữ liệu thật theo kiểu TƯƠNG ĐỐI (bẫy 16) — chạy được trên DB là bản sao production.
-- =============================================================================
begin;
select plan(23);

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

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

-- ─── Dữ liệu nền (postgres) ─────────────────────────────────────────────────
create temp table t as
select gen_random_uuid() as u_gh,   -- bị giới hạn
       gen_random_uuid() as u_tu,   -- không giới hạn
       gen_random_uuid() as nhom_a,
       gen_random_uuid() as nhom_b,
       -- mã thật có nhiều biến động nhất → dùng thử thẻ kho
       (select mv.san_pham_id from public.kho_movement mv group by 1 order by count(*) desc limit 1) as sp_that;
alter table t add column nhom_sp_that uuid;
update t set nhom_sp_that = (select nhom_hang_id from public.san_pham where id = t.sp_that);
-- nhóm thật nhiều dòng tồn nhất, KHÁC nhóm của sp_that
alter table t add column nhom_g uuid;
update t set nhom_g = (
  select sp.nhom_hang_id from public.ton_kho tk join public.san_pham sp on sp.id = tk.san_pham_id
  where sp.nhom_hang_id is not null and sp.nhom_hang_id is distinct from t.nhom_sp_that
  group by 1 order by count(*) desc limit 1);
grant select on t to authenticated;

insert into auth.users (id, email, aud, role)
select x.id, x.email, 'authenticated', 'authenticated'
from t, lateral (values (t.u_gh, 'zq134-gh@test.local'), (t.u_tu, 'zq134-tu@test.local')) x(id, email);
insert into public.nguoi_dung (id, ho_ten, vai_tro, chuc_vu_id)
select x.id, x.ten, 'van_phong', (select id from public.chuc_vu where ma = 'NHAN_VIEN')
from t, lateral (values (t.u_gh, 'ZQ134 Giới hạn'), (t.u_tu, 'ZQ134 Tự do')) x(id, ten);
insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select x.id, q from t, lateral (values (t.u_gh), (t.u_tu)) x(id),
  unnest(array['xem_ton_kho', 'xem_dashboard', 'xem_phan_tich']) q;

insert into public.nhom_hang (id, ma, ten)
select nhom_a, 'ZQ134-A', 'ZQ134 nhóm A' from t union all
select nhom_b, 'ZQ134-B', 'ZQ134 nhóm B' from t;
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id)
select x.ma, x.ten, (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI'), x.nhom
from t, lateral (values ('ZQ134-SPA', 'Hàng zq134 nhóm A', t.nhom_a),
                        ('ZQ134-SPB', 'Hàng zq134 nhóm B', t.nhom_b)) x(ma, ten, nhom);

create temp table t_sp as
select (select id from public.san_pham where ma_hang = 'ZQ134-SPA') as a,
       (select id from public.san_pham where ma_hang = 'ZQ134-SPB') as b,
       (select count(*) from public.san_pham sp where sp.nhom_hang_id = (select nhom_g from t)
          and sp.dang_kinh_doanh) as so_ma_g;
grant select on t_sp to authenticated;

-- Giới hạn u_gh vào nhóm A + nhóm thật G
insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids)
select u_gh, array[nhom_a, nhom_g] from t;

-- ─── 1. Người không giới hạn: thấy cả hai mã thử ────────────────────────────
select pg_temp.dang_nhap_id((select u_tu from t));
select is((select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'ZQ134-SP', p_dang_kinh_doanh => null)),
  2::bigint, 'không giới hạn: danh sách sản phẩm có cả mã nhóm A và B');
select is((select count(*) from public.chi_tiet_san_pham((select b from t_sp))), 1::bigint,
  'không giới hạn: xem được chi tiết mã nhóm B');
select ok((select count(*) from public.the_kho_san_pham((select sp_that from t))) > 0,
  'không giới hạn: thẻ kho mã thật có dòng');

-- ─── 2. Người bị giới hạn ───────────────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_gh from t));

-- danh mục
select is((select array_agg(ma_hang) from public.danh_sach_san_pham(p_tu_khoa => 'ZQ134-SP', p_dang_kinh_doanh => null)),
  array['ZQ134-SPA'], 'danh_sach_san_pham: chỉ mã nhóm được xem');
select ok(not exists (
    select 1 from public.danh_sach_san_pham(p_kich_thuoc => 5000, p_dang_kinh_doanh => null) d
    where d.nhom_hang_id is distinct from (select nhom_a from t)
      and d.nhom_hang_id is distinct from (select nhom_g from t)),
  'danh_sach_san_pham (không từ khóa): không lọt mã nhóm nào khác');
select is((select count(*) from public.chi_tiet_san_pham((select a from t_sp))), 1::bigint,
  'chi_tiet_san_pham: mã nhóm A xem được');
select is((select count(*) from public.chi_tiet_san_pham((select b from t_sp))), 0::bigint,
  'chi_tiet_san_pham: mã nhóm B coi như không tồn tại');

-- tìm mã (SECURITY INVOKER — RLS 0132 lọc)
select is((select array_agg(ma_hang) from public.tim_san_pham('ZQ134-SP', 20)), array['ZQ134-SPA'],
  'tim_san_pham: chỉ ra mã nhóm được xem');
select is((select count(*) from public.tim_kiem_toan_cuc('ZQ134-SPB', 20) where loai = 'san_pham'),
  0::bigint, 'tim_kiem_toan_cuc: không ra mã nhóm B');
select is((select count(*) from public.tim_kiem_toan_cuc('ZQ134-SPA', 20) where loai = 'san_pham'),
  1::bigint, 'tim_kiem_toan_cuc: ra mã nhóm A');

-- tồn kho
select is((select array_agg(ma_hang) from public.danh_sach_ton_kho(p_tu_khoa => 'ZQ134-SP', p_dang_kinh_doanh => null)),
  array['ZQ134-SPA'], 'danh_sach_ton_kho: chỉ mã nhóm được xem');
select ok(not exists (
    select 1 from public.danh_sach_ton_kho(p_kich_thuoc => 5000, p_dang_kinh_doanh => null) d
    where d.nhom_hang_id is distinct from (select nhom_a from t)
      and d.nhom_hang_id is distinct from (select nhom_g from t)),
  'danh_sach_ton_kho (không từ khóa): không lọt mã nhóm nào khác');
select is((select count(*) from public.the_kho_san_pham((select sp_that from t))), 0::bigint,
  'the_kho_san_pham: mã nhóm khác → thẻ kho rỗng');

-- dashboard
select ok(not exists (
    select 1 from public.ton_theo_nhom('nhom', null) x
    where x.nhom_id is distinct from (select nhom_a from t)
      and x.nhom_id is distinct from (select nhom_g from t)),
  'ton_theo_nhom: chỉ các nhóm được xem');
select is((select tong_ma from public.ton_theo_nhom('nhom', null) where nhom_id = (select nhom_g from t)),
  (select so_ma_g from t_sp), 'ton_theo_nhom: nhóm được xem vẫn đủ số mã');
select ok(not exists (
    select 1 from public.khong_luan_chuyen(30, 100) k
    join public.san_pham sp on sp.id = k.san_pham_id
    where sp.nhom_hang_id is distinct from (select nhom_a from t)
      and sp.nhom_hang_id is distinct from (select nhom_g from t)),
  'khong_luan_chuyen: không lọt mã nhóm khác');

-- phân tích tồn kho (0135) — màn Danh mục và Phân tích gộp từ đây
select ok(not exists (
    select 1 from public.phan_tich_ton_kho(30) p
    where p.nhom_hang_id is distinct from (select nhom_a from t)
      and p.nhom_hang_id is distinct from (select nhom_g from t)),
  'phan_tich_ton_kho: không lọt mã nhóm khác');
select ok(exists (select 1 from public.phan_tich_ton_kho(30) p where p.nhom_hang_id = (select nhom_g from t)),
  'phan_tich_ton_kho: vẫn có số của nhóm được xem');

-- gợi ý mã trùng
select is((select count(*) from public.goi_y_ma_trung((select sp_that from t), null, 20)), 0::bigint,
  'goi_y_ma_trung: mã nguồn nhóm khác → không gợi ý');
select ok(not exists (
    select 1 from public.goi_y_ma_trung(
      (select sp.id from public.san_pham sp where sp.nhom_hang_id = (select nhom_g from t) limit 1), null, 50) g
    join public.san_pham sp on sp.id = g.san_pham_id
    where sp.nhom_hang_id is distinct from (select nhom_a from t)
      and sp.nhom_hang_id is distinct from (select nhom_g from t)),
  'goi_y_ma_trung: chỉ gợi ý mã trong phạm vi');

-- ─── 3. Bỏ giới hạn có hiệu lực ngay ────────────────────────────────────────
select pg_temp.dang_xuat();
delete from public.nguoi_dung_nhom_hang where nguoi_dung_id = (select u_gh from t);
select pg_temp.dang_nhap_id((select u_gh from t));
select is((select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'ZQ134-SP', p_dang_kinh_doanh => null)),
  2::bigint, 'bỏ giới hạn: thấy lại cả hai mã');
select is((select count(*) from public.chi_tiet_san_pham((select b from t_sp))), 1::bigint,
  'bỏ giới hạn: chi tiết mã nhóm B xem được');
select ok((select count(*) from public.the_kho_san_pham((select sp_that from t))) > 0,
  'bỏ giới hạn: thẻ kho có lại dòng');

select * from finish();
rollback;
