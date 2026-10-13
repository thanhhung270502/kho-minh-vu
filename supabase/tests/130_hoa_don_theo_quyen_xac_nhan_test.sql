-- =============================================================================
-- 0130 — hóa đơn (XUAT) và phiếu trả (TRA_KHACH, TRA_NCC) đi theo quyền Xác nhận /
-- duyệt đơn: người chỉ có Tạo đơn đặt hàng không lập / sửa / duyệt / hủy được.
-- Khuôn: supabase/tests/102_quyen_chuc_vu_test.sql
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

-- Văn phòng chỉ có Tạo đơn đặt hàng — đúng mô hình người dùng mô tả.
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xac_nhan_don', false);
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'tao_don', true);

-- Một hóa đơn nháp do Admin lập (chưa có dòng).
insert into public.chung_tu (so_ct, loai_ct, kho_id)
values ('PX-Q130-NHAP', 'XUAT', (select id from public.kho where ma = 'K1'));
create temp table t_q130 as
select id from public.chung_tu where so_ct = 'PX-Q130-NHAP';
grant select on t_q130 to authenticated;

-- ─── 1-6: chỉ có Tạo đơn đặt hàng ───────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id) values ('PX-Q130-A', 'XUAT', (select id from public.kho where ma = 'K1')) $$,
  '42501', null, 'chỉ Tạo đơn: không lập được hóa đơn');
select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id) values ('TK-Q130-A', 'TRA_KHACH', (select id from public.kho where ma = 'K1')) $$,
  '42501', null, 'chỉ Tạo đơn: không lập được phiếu trả');
select throws_ok(
  format($$ select public.tao_phieu_tra(%L) $$, uuid_generate_v4()),
  '42501', null, 'chỉ Tạo đơn: tao_phieu_tra bị chặn trước cả khi tìm chứng từ');
select throws_ok(
  $$ select public.ghi_so_chung_tu((select id from t_q130)) $$,
  '42501', null, 'chỉ Tạo đơn: không duyệt (ghi sổ) được hóa đơn');
select throws_ok(
  $$ select public.huy_chung_tu((select id from t_q130), 'thử hủy') $$,
  '42501', null, 'chỉ Tạo đơn: không hủy được hóa đơn nháp');
create or replace function pg_temp.sua_hoa_don_nhap()
returns bigint language plpgsql as $h$
declare v_n bigint;
begin
  update public.chung_tu set ghi_chu = 'sửa' where id = (select id from t_q130);
  get diagnostics v_n = row_count;
  return v_n;
end $h$;
select is(pg_temp.sua_hoa_don_nhap(), 0::bigint, 'chỉ Tạo đơn: sửa hóa đơn nháp không tác dụng (RLS lọc)');

-- ─── 7-9: bật Xác nhận / duyệt đơn — qua cửa quyền ngay ─────────────────────
select pg_temp.dang_xuat();
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xac_nhan_don', true);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select lives_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id) values ('PX-Q130-B', 'XUAT', (select id from public.kho where ma = 'K1')) $$,
  'có Xác nhận: lập được hóa đơn');
select throws_ok(
  $$ select public.ghi_so_chung_tu((select id from t_q130)) $$,
  '23514', null, 'có Xác nhận: qua cửa quyền, dừng ở luật "phiếu không có dòng"');
select throws_ok(
  format($$ select public.tao_phieu_tra(%L) $$, uuid_generate_v4()),
  '23514', null, 'có Xác nhận: tao_phieu_tra qua cửa quyền, dừng ở "không tìm thấy chứng từ"');

select * from finish();
rollback;
