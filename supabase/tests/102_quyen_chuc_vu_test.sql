-- =============================================================================
-- Phase 16 (QUYEN-03), 0117 — bật/tắt quyền của NGƯỜI có hiệu lực NGAY ở database,
-- kể cả gọi thẳng RPC/REST, cùng một token (claim không đổi giữa các lần gọi).
-- =============================================================================
begin;
select plan(13);

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

create or replace function pg_temp.dat_quyen(p_email text, p_quyen text, p_bat boolean)
returns void language plpgsql as $h$
begin
  if p_bat then
    insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
    select id, p_quyen from auth.users where email = p_email on conflict do nothing;
  else
    delete from public.nguoi_dung_quyen
    where quyen = p_quyen and nguoi_dung_id = (select id from auth.users where email = p_email);
  end if;
end $h$;

-- ─── Xem dashboard ─────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select lives_ok($$ select public.nhip_ban(current_date) $$, 'quản lý xem được tổng quan');
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok($$ select public.nhip_ban(current_date) $$, '42501', null, 'văn phòng chưa có Xem dashboard: bị từ chối');
select pg_temp.dang_xuat();
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xem_dashboard', true);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok($$ select public.nhip_ban(current_date) $$, 'bật Xem dashboard cho văn phòng: xem được ngay, cùng token');
select pg_temp.dang_xuat();

-- ─── Xác nhận đơn: bật cho văn phòng → qua cửa quyền (dừng ở "không tìm thấy") ─
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok($$ select public.xac_nhan_don(uuid_generate_v4()) $$, '42501', null, 'văn phòng chưa có quyền Xác nhận');
select pg_temp.dang_xuat();
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xac_nhan_don', true);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok($$ select public.xac_nhan_don(uuid_generate_v4()) $$, '23514', null, 'bật Xác nhận: qua cửa quyền ngay');
select pg_temp.dang_xuat();

-- ─── Tạo đơn đặt hàng ──────────────────────────────────────────────────────
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'tao_don', false);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok($$ select public.sinh_so_dh(2093::smallint) $$, '42501', null, 'tắt Tạo đơn: không cấp được số đơn');
select pg_temp.dang_xuat();

-- ─── Hoàn thành đi theo Xác nhận/duyệt đơn (0117) ──────────────────────────
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xac_nhan_don', false);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(not public.hoan_thanh_duoc_don(), 'tắt Xác nhận: hoan_thanh_duoc_don() = false ngay');
select pg_temp.dang_xuat();

-- ─── Nhập đơn hàng (phiếu nhập) — phiếu xuất không bị ảnh hưởng ────────────
select pg_temp.dat_quyen('thukho1@khominhvu.local', 'nhap_kho', false);
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id) values ('PN-Q102', 'NHAP', (select id from public.kho where ma = 'K1')) $$,
  '42501', null, 'tắt Nhập đơn hàng: thủ kho không tạo được phiếu nhập');
select lives_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id) values ('PX-Q102', 'XUAT', (select id from public.kho where ma = 'K1')) $$,
  'phiếu xuất vẫn tạo được — chỉ phiếu nhập bị chặn');
select pg_temp.dang_xuat();

-- ─── Tạo mã hàng (cả danh mục phụ) ─────────────────────────────────────────
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'tao_ma_hang', false);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok($$ insert into public.nhom_hang (ma, ten) values ('Q102', 'Nhóm Q102') $$,
  '42501', null, 'tắt Tạo mã hàng: không thêm được danh mục phụ');
select pg_temp.dang_xuat();

-- ─── Tạo nhân viên: chỉ Admin (0117) ──────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values ('Q102', 'Nhân viên Q102') $$,
  '42501', null, 'thủ kho không có quyền Tạo nhân viên');
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select lives_ok($$ insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values ('Q102', 'Nhân viên Q102') $$,
  'Admin thêm được nhân viên phụ trách');
select pg_temp.dang_xuat();

-- ─── Kiểm kho: chỉ Admin (0117) ────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ select public.mo_phien_kiem_ke((select id from public.kho where ma = 'K1'), null, 'Q102') $$,
  '42501', null, 'thủ kho không mở được phiên kiểm kê');
select pg_temp.dang_xuat();

select * from finish();
rollback;
