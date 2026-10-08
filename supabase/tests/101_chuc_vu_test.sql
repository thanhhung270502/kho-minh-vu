-- =============================================================================
-- Phase 16 (QUYEN-01..03) — chức vụ: 4 chức vụ mặc định mang đúng phạm vi,
-- vai_tro đồng bộ theo phạm vi chức vụ, co_quyen() đọc DB nên đổi là có hiệu
-- lực ngay, người bị khóa không còn quyền nào.
-- Từ 0117 quyền đi theo NGƯỜI (nguoi_dung_quyen); Admin luôn đủ 9 quyền.
-- =============================================================================
begin;
select plan(16);

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

create or replace function pg_temp.quyen_cua(p_email text)
returns text[] language sql stable as $h$
  select coalesce(array_agg(q.quyen order by q.quyen), '{}')
  from public.nguoi_dung_quyen q
  where q.nguoi_dung_id = (select id from auth.users where email = p_email);
$h$;

-- ─── 1. Chức vụ mặc định + quyền theo người của tài khoản mẫu (seed.sql) ────
select set_eq($$ select ma || ':' || pham_vi from public.chuc_vu where ma in ('QUAN_LY','NHAN_VIEN','THU_KHO','CHI_XEM') $$,
  array['QUAN_LY:quan_ly','NHAN_VIEN:van_phong','THU_KHO:thu_kho','CHI_XEM:chi_xem'],
  'bốn chức vụ mặc định, mỗi cái mang đúng phạm vi');
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(cardinality(public.quyen_cua_toi()), 9, 'Quản lý có đủ 9 quyền');
select pg_temp.dang_xuat();
select is(pg_temp.quyen_cua('vanphong@khominhvu.local'),
  array['nhap_kho','tao_don','tao_ma_hang'],
  'Nhân viên = quyền văn phòng đang có');
select is(pg_temp.quyen_cua('thukho1@khominhvu.local'), array['nhap_kho'], 'Thủ kho: nhập kho');
select is(pg_temp.quyen_cua('chixem@khominhvu.local'), '{}'::text[], 'Chỉ xem: không quyền nào');
select is((select count(*)::int from public.nguoi_dung nd join public.chuc_vu cv on cv.id = nd.chuc_vu_id
           where cv.pham_vi <> nd.vai_tro), 0, 'mọi người dùng có chức vụ khớp vai trò cũ');

-- ─── 2. co_quyen đọc DB, đổi có hiệu lực ngay ─────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(public.co_quyen('tao_ma_hang'), 'văn phòng có quyền tạo mã hàng');
select ok(not public.co_quyen('xac_nhan_don'), 'văn phòng chưa có quyền xác nhận');
select pg_temp.dang_xuat();

insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select id, 'xac_nhan_don' from auth.users where email = 'vanphong@khominhvu.local';
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(public.co_quyen('xac_nhan_don'), 'bật quyền cho người: có hiệu lực ngay, cùng token');
select pg_temp.dang_xuat();

update public.nguoi_dung set dang_hoat_dong = false
where id = (select id from auth.users where email = 'vanphong@khominhvu.local');
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(not public.co_quyen('tao_ma_hang'), 'người bị khóa: mất mọi quyền dù token còn hạn');
select pg_temp.dang_xuat();
update public.nguoi_dung set dang_hoat_dong = true
where id = (select id from auth.users where email = 'vanphong@khominhvu.local');

select throws_ok($$ select public.co_quyen('quyen_bia') $$, '22023', null, 'tên quyền lạ: báo lỗi, không im lặng trả false');

-- ─── 3. Đổi chức vụ → vai_tro đồng bộ theo phạm vi ────────────────────────
update public.nguoi_dung set chuc_vu_id = (select id from public.chuc_vu where ma = 'CHI_XEM')
where id = (select id from auth.users where email = 'vanphong@khominhvu.local');
select is((select vai_tro::text from public.nguoi_dung where id = (select id from auth.users where email = 'vanphong@khominhvu.local')),
  'chi_xem', 'đổi chức vụ → vai_tro theo phạm vi chức vụ');

-- Ghi vai_tro trực tiếp (script cũ, seed) → chức vụ mặc định của vai trò đó.
update public.nguoi_dung set vai_tro = 'thu_kho'
where id = (select id from auth.users where email = 'chixem@khominhvu.local');
select is((select cv.ma from public.nguoi_dung nd join public.chuc_vu cv on cv.id = nd.chuc_vu_id
           where nd.id = (select id from auth.users where email = 'chixem@khominhvu.local')),
  'THU_KHO', 'ghi vai_tro trực tiếp → chuyển sang chức vụ mặc định tương ứng');

-- ─── 4. Quyền sửa chức vụ: chỉ quản lý ────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ insert into public.chuc_vu (ma, ten, pham_vi) values ('ZQX', 'Thử Zqx', 'van_phong') $$,
  '42501', null, 'thủ kho không tạo được chức vụ');
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
insert into public.chuc_vu (ma, ten, pham_vi) values ('ZQX', 'Thử Zqx', 'van_phong');
select is((select count(*)::int from public.chuc_vu where ma = 'ZQX'), 1, 'quản lý tạo được chức vụ mới');
select pg_temp.dang_xuat();

-- Không được làm hệ thống mất quản lý cuối cùng.
select throws_ok(
  $$ update public.chuc_vu set pham_vi = 'van_phong' where ma = 'QUAN_LY' $$,
  '23514', null, 'đổi phạm vi làm mất quản lý cuối cùng: bị chặn');

select * from finish();
rollback;
