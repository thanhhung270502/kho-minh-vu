-- =============================================================================
-- 0128 — hai quyền theo người: Xem tồn kho (ẩn hẳn số tồn) và Sửa phiếu (mở sửa
-- đơn đặt / hóa đơn / phiếu nhập đã duyệt). Bắt đầu từ không: văn phòng mặc định
-- KHÔNG có; Admin luôn có. Khuôn: supabase/tests/102_quyen_chuc_vu_test.sql
-- =============================================================================
begin;
select plan(18);

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

-- ─── Dữ liệu: một mã có tồn 7 ở K1 (ghi thẳng ton_kho, không qua sổ cái) ─────
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('Q128-XT', 'Hàng test quyền xem tồn',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'))
on conflict (ma_hang) do update set ten_hang = excluded.ten_hang;

create temp table t_q as
select (select id from public.san_pham where ma_hang = 'Q128-XT') as sp,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t_q to authenticated;

-- auth.users không đọc được khi đã đăng nhập, nên lấy id văn phòng trước.
create temp table t_vp as select id from auth.users where email = 'vanphong@khominhvu.local';
grant select on t_vp to authenticated;

insert into public.ton_kho (kho_id, san_pham_id, so_luong)
select k1, sp, 7 from t_q
on conflict (kho_id, san_pham_id) do update set so_luong = excluded.so_luong;

-- Bắt đầu từ không: tắt hẳn cả hai quyền (và có Xác nhận đơn để tách bạch với Sửa phiếu).
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xem_ton_kho', false);
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'sua_phieu', false);
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xac_nhan_don', true);

-- ─── 1-9: văn phòng KHÔNG có Xem tồn kho ────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(public.co_quyen('xem_ton_kho'), false, 'văn phòng mặc định không có Xem tồn kho');
select is(public.co_quyen('sua_phieu'), false, 'văn phòng mặc định không có Sửa phiếu');

select is((select count(*) from public.ton_kho where san_pham_id = (select sp from t_q)), 0::bigint,
  'không Xem tồn: đọc thẳng ton_kho không thấy dòng nào');
select is((select count(*) from public.kho_movement), 0::bigint,
  'không Xem tồn: đọc thẳng kho_movement không thấy dòng nào');

select is((select d.tong_ton from public.danh_sach_san_pham(p_tu_khoa => 'Q128-XT') d
           where d.id = (select sp from t_q)), null::numeric,
  'không Xem tồn: danh_sach_san_pham trả tong_ton null');
select is((select d.tong_ton from public.chi_tiet_san_pham((select sp from t_q)) d), null::numeric,
  'không Xem tồn: chi_tiet_san_pham trả tong_ton null');
select is((select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'Q128-XT', p_trang_thai_ton => 'het_hang') d
           where d.id = (select sp from t_q)), 1::bigint,
  'không Xem tồn: lọc "hết hàng" bị bỏ qua — không suy ra được còn/hết');

select throws_ok(
  format($$ select * from public.the_kho_san_pham(%L) $$, (select sp from t_q)),
  '42501', null, 'không Xem tồn: thẻ kho bị chặn');
select throws_ok(
  $$ select * from public.danh_sach_ton_kho() $$,
  '42501', null, 'không Xem tồn: danh_sach_ton_kho bị chặn');

-- ─── 10-13: bật Xem tồn kho — có hiệu lực ngay, cùng token ──────────────────
select pg_temp.dang_xuat();
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'xem_ton_kho', true);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is((select count(*) from public.ton_kho where san_pham_id = (select sp from t_q)), 1::bigint,
  'bật Xem tồn: thấy dòng ton_kho');
select is((select d.tong_ton from public.danh_sach_san_pham(p_tu_khoa => 'Q128-XT') d
           where d.id = (select sp from t_q)), 7::numeric,
  'bật Xem tồn: danh_sach_san_pham trả đúng tồn');
select is((select d.tong_ton from public.chi_tiet_san_pham((select sp from t_q)) d), 7::numeric,
  'bật Xem tồn: chi_tiet_san_pham trả đúng tồn');
select lives_ok(
  format($$ select * from public.the_kho_san_pham(%L) $$, (select sp from t_q)),
  'bật Xem tồn: mở được thẻ kho');

-- ─── 14-15: Sửa phiếu tách khỏi Xác nhận đơn ────────────────────────────────
select throws_ok(
  format($$ select public.mo_khoa_don(%L, 'sửa lại số lượng') $$, uuid_generate_v4()),
  '42501', null, 'có Xác nhận nhưng không Sửa phiếu: không Sửa đơn đã duyệt được');

select pg_temp.dang_xuat();
select pg_temp.dat_quyen('vanphong@khominhvu.local', 'sua_phieu', true);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  format($$ select public.mo_khoa_don(%L, 'sửa lại số lượng') $$, uuid_generate_v4()),
  '23514', null, 'bật Sửa phiếu: qua cửa quyền ngay (đơn không tồn tại → 23514)');

-- ─── 16-18: Admin luôn có; phân quyền nhận hai khóa mới ─────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select ok(public.co_quyen('xem_ton_kho') and public.co_quyen('sua_phieu'),
  'Quản lý/Admin luôn có Xem tồn kho và Sửa phiếu');
select ok(public.quyen_cua_toi() @> array['xem_ton_kho', 'sua_phieu'],
  'quyen_cua_toi của Admin có hai quyền mới');
select is(
  public.dat_quyen_nguoi_dung(
    (select id from t_vp),
    array['xem_ton_kho', 'sua_phieu']),
  array['sua_phieu', 'xem_ton_kho'],
  'dat_quyen_nguoi_dung tích được hai quyền mới');

select * from finish();
rollback;
