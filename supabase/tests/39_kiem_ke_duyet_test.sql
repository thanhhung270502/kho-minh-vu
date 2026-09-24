-- =============================================================================
-- KKE-03/04, DLIEU-06 (D-03/D-06/D-07/D-09/D-14/D-16) — bảng lệch của phiên
-- (danh_sach_phien_kiem_ke, bang_dem_kiem_ke), cờ đếm lại (dat_dem_lai), duyệt
-- phiên (duyet_phien_kiem_ke), và cửa chặn ghi_so_chung_tu/huy_chung_tu cho
-- KIEM_KE — chỉ đi được qua wrapper, không gọi thẳng được.
--
-- KHÔNG đụng _ghi_so_kiem_ke (0011) — công thức lệch = so_luong -
-- so_luong_he_thong đã đúng D-03 từ Phase 1.
-- =============================================================================
begin;
select plan(48);

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

-- ─── Dữ liệu, dưới quyền postgres (bypass RLS) ──────────────────────────────
do $$
begin
  insert into public.nhom_hang (ma, ten) values ('ZQX-KD-N1', 'Nhóm test KD 1')
    on conflict (ma) do update set ten = excluded.ten;
end $$;

create temp table t_id as
select
  pg_temp.sp_test('KD-ZQX-A') as a,
  pg_temp.sp_test('KD-ZQX-B') as b,
  pg_temp.sp_test('KD-ZQX-C') as c,
  pg_temp.kho_id('K1')        as k1,
  pg_temp.kho_id('K2')        as k2,
  (select id from public.nhom_hang where ma = 'ZQX-KD-N1') as n1,
  -- Đọc id NGAY BÂY GIỜ dưới postgres — 'authenticated' không có SELECT trên
  -- auth.users (Supabase khóa bảng này).
  (select id from auth.users where email = 'vanphong@khominhvu.local') as u_vanphong,
  (select id from auth.users where email = 'quanly@khominhvu.local')   as u_quanly;
grant select on t_id to authenticated;

update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.a;
update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.b;
update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.c;

-- Tồn tạm KiotViet qua nap_ton_tam (D-05/D-09): A=10, B=4, C=3 tại K1.
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select public.nap_ton_tam(
  jsonb_build_array(
    jsonb_build_object('ma_hang', 'KD-ZQX-A', 'so_luong', 10),
    jsonb_build_object('ma_hang', 'KD-ZQX-B', 'so_luong', 4),
    jsonb_build_object('ma_hang', 'KD-ZQX-C', 'so_luong', 3)
  ),
  null,
  false
);
select pg_temp.dang_xuat();

-- Phiên P: kho K1, phạm vi nhóm N1, mở dưới vanphong.
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

create temp table t_p as
select (public.mo_phien_kiem_ke(
  p_kho_id := (select k1 from t_id),
  p_nhom_hang_ids := array[(select n1 from t_id)]
)).*;
grant select on t_p to authenticated;

-- =============================================================================
-- E1 — bang_dem_kiem_ke(P): 3 dòng A/B/C, chưa đếm (dong_id null),
-- ton_hien_tai = ton_kiotviet = 10/4/3 (D-09).
-- =============================================================================
select is(
  (select count(*)::int from public.bang_dem_kiem_ke((select id from t_p))),
  3, 'E1: bang_dem_kiem_ke trả đúng 3 dòng A/B/C'
);
select is(
  (select count(*)::int from public.bang_dem_kiem_ke((select id from t_p)) where dong_id is null),
  3, 'E1: cả ba dòng chưa đếm (dong_id null)'
);
select is(
  (select ton_hien_tai from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  10::numeric, 'E1: ton_hien_tai A = 10'
);
select is(
  (select ton_kiotviet from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  10::numeric, 'E1: ton_kiotviet A = 10 (D-09)'
);
select is(
  (select ton_hien_tai from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-B'),
  4::numeric, 'E1: ton_hien_tai B = 4'
);
select is(
  (select ton_kiotviet from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-C'),
  3::numeric, 'E1: ton_kiotviet C = 3'
);

-- =============================================================================
-- E2 — D-03: đếm A = 8 -> ton_so = 10 (chốt lúc lưu), lech = -2. XUAT 1 A rồi
-- ghi sổ SAU khi đếm -> bang_dem_kiem_ke VẪN ton_so=10, lech=-2, còn
-- ton_hien_tai = 9.
-- =============================================================================
select public.luu_dong_kiem_ke((select id from t_p), (select a from t_id), 8);

select is(
  (select so_dem from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  8::numeric, 'E2: so_dem A = 8'
);
select is(
  (select ton_so from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  10::numeric, 'E2: ton_so A = 10 (chốt lúc lưu)'
);
select is(
  (select lech from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  -2::numeric, 'E2: lech A = -2'
);

insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PX-KD-ZQX01', 'XUAT', t_id.k1 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select ct.id, t_id.a, 1 from public.chung_tu ct, t_id where ct.so_ct = 'PX-KD-ZQX01';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PX-KD-ZQX01'));
-- Tồn A tại K1 giờ = 9.

select is(
  (select ton_so from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  10::numeric, 'E2: sau XUAT, ton_so A VẪN = 10 (chốt lúc lưu, không đổi theo biến động sau)'
);
select is(
  (select lech from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  -2::numeric, 'E2: sau XUAT, lech A VẪN = -2'
);
select is(
  (select ton_hien_tai from public.bang_dem_kiem_ke((select id from t_p)) where ma_hang = 'KD-ZQX-A'),
  9::numeric, 'E2: ton_hien_tai A = 9 (tồn sống, có XUAT xen giữa)'
);

-- =============================================================================
-- E3 — p_nhom_hang_id lọc đúng; danh_sach_phien_kiem_ke có P với so_da_dem=1,
-- so_trong_pham_vi=3, so_dem_lai=0; lọc theo p_chung_tu_id trả đúng một dòng.
-- =============================================================================
select is(
  (select count(*)::int from public.bang_dem_kiem_ke((select id from t_p), (select n1 from t_id))),
  3, 'E3: p_nhom_hang_id = N1 vẫn trả 3 dòng'
);
select is(
  (select count(*)::int from public.bang_dem_kiem_ke((select id from t_p), gen_random_uuid())),
  0, 'E3: p_nhom_hang_id không khớp -> 0 dòng'
);
select is(
  (select so_da_dem from public.danh_sach_phien_kiem_ke() where id = (select id from t_p)),
  1::bigint, 'E3: so_da_dem = 1 (mới đếm A)'
);
select is(
  (select so_trong_pham_vi from public.danh_sach_phien_kiem_ke() where id = (select id from t_p)),
  3::bigint, 'E3: so_trong_pham_vi = 3 (A/B/C)'
);
select is(
  (select so_dem_lai from public.danh_sach_phien_kiem_ke() where id = (select id from t_p)),
  0::bigint, 'E3: so_dem_lai = 0'
);
select is(
  (select count(*)::int from public.danh_sach_phien_kiem_ke(p_chung_tu_id := (select id from t_p))),
  1, 'E3: lọc theo p_chung_tu_id trả đúng một dòng'
);

-- =============================================================================
-- E4 — thủ kho không xem/thấy được bảng đếm và phiên của kho khác. thukho1
-- thuộc K1 (đã xác nhận ở pgTAP 38) nên mở phiên P2 tại K2 để kiểm.
-- =============================================================================
create temp table t_p2 as
select (public.mo_phien_kiem_ke(p_kho_id := (select k2 from t_id))).*;
grant select on t_p2 to authenticated;
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  format('select public.bang_dem_kiem_ke(%L::uuid)', (select id from t_p2)),
  '42501', null,
  'E4: thủ kho không xem được bảng đếm phiên kho khác (K2)'
);
select is(
  (select count(*)::int from public.danh_sach_phien_kiem_ke() where id = (select id from t_p2)),
  0, 'E4: thủ kho không thấy phiên kho khác trong danh sách'
);
select is(
  (select count(*)::int from public.danh_sach_phien_kiem_ke() where id = (select id from t_p)),
  1, 'E4: thủ kho vẫn thấy phiên kho mình (K1)'
);
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- =============================================================================
-- E5 — dat_dem_lai: vanphong chưa bật cột duyet_kiem_ke -> 42501; bật cột
-- (postgres) -> dat_dem_lai được, dem_lai=true; luu_dong_kiem_ke lại -> false.
-- =============================================================================
create temp table t_dong_a as
select id as dong_id from public.chung_tu_dong
where chung_tu_id = (select id from t_p) and san_pham_id = (select a from t_id);
grant select on t_dong_a to authenticated;

select throws_ok(
  format('select public.dat_dem_lai(%L::uuid, true)', (select dong_id from t_dong_a)),
  '42501', null,
  'E5: vanphong chưa bật cột duyet_kiem_ke -> 42501'
);

select pg_temp.dang_xuat();
update public.nguoi_dung set duyet_kiem_ke = true where id = (select u_vanphong from t_id);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select public.dat_dem_lai((select dong_id from t_dong_a), true);
select is(
  (select dem_lai from public.chung_tu_dong where id = (select dong_id from t_dong_a)),
  true, 'E5: dat_dem_lai đặt true thành công sau khi bật cột'
);

select public.luu_dong_kiem_ke((select id from t_p), (select a from t_id), 8);
select is(
  (select dem_lai from public.chung_tu_dong where id = (select dong_id from t_dong_a)),
  false, 'E5: luu_dong_kiem_ke đặt lại dem_lai = false'
);

-- =============================================================================
-- E6 — còn B, C chưa đếm -> 23514; đặt dem_lai=true cho A rồi duyệt với đủ
-- danh sách chấp nhận 0 (B, C) -> vẫn 23514 (còn dòng chờ đếm lại).
-- =============================================================================
select throws_ok(
  format('select public.duyet_phien_kiem_ke(%L::uuid, ''{}''::uuid[])', (select id from t_p)),
  '23514', null,
  'E6: còn B, C chưa đếm -> 23514'
);

select public.dat_dem_lai((select dong_id from t_dong_a), true);
select throws_ok(
  format(
    'select public.duyet_phien_kiem_ke(%L::uuid, array[%L::uuid, %L::uuid])',
    (select id from t_p), (select b from t_id), (select c from t_id)
  ),
  '23514', null,
  'E6: A còn chờ đếm lại dù B, C được chấp nhận 0 -> 23514'
);

-- =============================================================================
-- E7 — ghi_so_chung_tu gọi thẳng bị chặn dù CÓ quyền duyệt (thiếu cờ
-- transaction); cột duyệt tắt -> duyet_phien_kiem_ke và ghi_so_chung_tu đều
-- 42501.
-- =============================================================================
select throws_ok(
  format('select public.ghi_so_chung_tu(%L::uuid)', (select id from t_p)),
  '42501', null,
  'E7: ghi_so_chung_tu gọi thẳng bị chặn dù CÓ quyền duyệt (chỉ qua wrapper)'
);

select pg_temp.dang_xuat();
update public.nguoi_dung set duyet_kiem_ke = false where id = (select u_vanphong from t_id);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  format('select public.duyet_phien_kiem_ke(%L::uuid)', (select id from t_p)),
  '42501', null,
  'E7: vanphong cột duyet false -> duyet_phien_kiem_ke 42501'
);
select throws_ok(
  format('select public.ghi_so_chung_tu(%L::uuid)', (select id from t_p)),
  '42501', null,
  'E7: ghi_so_chung_tu gọi thẳng vẫn 42501 khi KHÔNG có quyền duyệt'
);

-- =============================================================================
-- E8 — dưới quanly (cột duyet_kiem_ke false trên bảng — D-15, quan_ly luôn
-- đúng) duyệt với p_chap_nhan_khong_dem := array[B, C] (A hết cờ đếm lại).
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select public.dat_dem_lai((select dong_id from t_dong_a), false);
select is(
  (select dem_lai from public.chung_tu_dong where id = (select dong_id from t_dong_a)),
  false, 'E8 setup: A hết cờ đếm lại trước khi duyệt'
);

create temp table t_duyet as
select (public.duyet_phien_kiem_ke(
  (select id from t_p),
  array[(select b from t_id), (select c from t_id)]
)).*;
grant select on t_duyet to authenticated;

select is((select trang_thai::text from t_duyet), 'HOAN_THANH', 'E8: chung_tu trả về HOAN_THANH');
select is(
  (select ngay_ct from t_duyet),
  (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'E8: ngay_ct = ngày hôm nay giờ Việt Nam'
);
select is(
  (select coalesce(sum(so_luong), 0) from public.kho_movement
    where chung_tu_id = (select id from t_p) and san_pham_id = (select a from t_id)),
  -2::numeric, 'E8: movement A = -2 (lệch đã chốt 8 - 10, KHÔNG phải 8 - 9)'
);
select is(
  (select coalesce(sum(so_luong), 0) from public.kho_movement
    where chung_tu_id = (select id from t_p) and san_pham_id = (select b from t_id)),
  -4::numeric, 'E8: movement B = -4 (0 - 4)'
);
select is(
  (select coalesce(sum(so_luong), 0) from public.kho_movement
    where chung_tu_id = (select id from t_p) and san_pham_id = (select c from t_id)),
  -3::numeric, 'E8: movement C = -3 (0 - 3)'
);
select is(
  (select so_luong from public.ton_kho where kho_id = (select k1 from t_id) and san_pham_id = (select a from t_id)),
  7::numeric, 'E8: ton_kho A = 7 (9 - 2)'
);
select is(
  (select coalesce(so_luong, 0) from public.ton_kho where kho_id = (select k1 from t_id) and san_pham_id = (select b from t_id)),
  0::numeric, 'E8: ton_kho B = 0 (đảo đúng tồn tạm, D-06)'
);
select is(
  (select coalesce(so_luong, 0) from public.ton_kho where kho_id = (select k1 from t_id) and san_pham_id = (select c from t_id)),
  0::numeric, 'E8: ton_kho C = 0 (đảo đúng tồn tạm, D-06)'
);

-- =============================================================================
-- E9 — sau khi duyệt: mọi thao tác sửa đều 23514.
-- =============================================================================
select throws_ok(
  format('select public.luu_dong_kiem_ke(%L::uuid, %L::uuid, 5)', (select id from t_p), (select b from t_id)),
  '23514', null,
  'E9: đã duyệt, sửa số đếm -> 23514'
);
select throws_ok(
  format('select public.dat_dem_lai(%L::uuid, true)', (select dong_id from t_dong_a)),
  '23514', null,
  'E9: đã duyệt, dat_dem_lai -> 23514'
);
select throws_ok(
  format('select public.duyet_phien_kiem_ke(%L::uuid)', (select id from t_p)),
  '23514', null,
  'E9: duyệt lần hai -> 23514'
);

-- =============================================================================
-- E10 — huy_chung_tu: KIEM_KE đã ghi sổ chỉ quản lý hủy; phiên NHAP_LIEU khác
-- vanphong tự hủy được (DA_HUY, không movement).
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  format('select public.huy_chung_tu(%L::uuid, %L)', (select id from t_p), 'test'),
  '42501', null,
  'E10: vanphong không hủy được phiên KIEM_KE đã ghi sổ'
);

create temp table t_p3 as
select (public.mo_phien_kiem_ke(p_kho_id := (select k1 from t_id))).*;
grant select on t_p3 to authenticated;

select lives_ok(
  format('select public.huy_chung_tu(%L::uuid, %L)', (select id from t_p3), 'test hủy phiên nháp'),
  'E10: vanphong hủy được phiên KIEM_KE còn NHAP_LIEU'
);
select is(
  (select trang_thai::text from public.chung_tu where id = (select id from t_p3)),
  'DA_HUY', 'E10: phiên P3 chuyển DA_HUY'
);
select is(
  (select count(*)::int from public.kho_movement where chung_tu_id = (select id from t_p3)),
  0, 'E10: hủy phiên còn NHAP_LIEU không sinh movement nào'
);

-- =============================================================================
-- E11 — chấp nhận 0 một san_pham_id KHÔNG thuộc danh sách chưa đếm -> 23514.
-- =============================================================================
create temp table t_p4 as
select (public.mo_phien_kiem_ke(
  p_kho_id := (select k1 from t_id),
  p_nhom_hang_ids := array[(select n1 from t_id)]
)).*;
grant select on t_p4 to authenticated;

select public.luu_dong_kiem_ke((select id from t_p4), (select a from t_id), 7);
select public.luu_dong_kiem_ke((select id from t_p4), (select b from t_id), 0);
select public.luu_dong_kiem_ke((select id from t_p4), (select c from t_id), 0);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select throws_ok(
  format(
    'select public.duyet_phien_kiem_ke(%L::uuid, array[%L::uuid])',
    (select id from t_p4), (select a from t_id)
  ),
  '23514', null,
  'E11: chấp nhận 0 một mã ĐÃ đếm (không thuộc tập chưa đếm) -> 23514'
);

-- =============================================================================
-- E12 — ghi_so_chung_tu cho phiếu NHAP thường dưới vanphong vẫn lives_ok
-- (không phá luồng cũ); gọi dưới postgres cho KIEM_KE không bị chặn.
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PN-KD-ZQX01', 'NHAP', t_id.k1 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select ct.id, t_id.a, 1, 100 from public.chung_tu ct, t_id where ct.so_ct = 'PN-KD-ZQX01';

select lives_ok(
  format('select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = %L))', 'PN-KD-ZQX01'),
  'E12: ghi_so_chung_tu cho phiếu NHAP thường vẫn hoạt động bình thường'
);

select pg_temp.dang_xuat();
select lives_ok(
  format('select public.ghi_so_chung_tu(%L::uuid)', (select id from t_p4)),
  'E12: ghi_so_chung_tu dưới postgres (script, auth.uid() null) cho KIEM_KE không bị chặn'
);

select * from finish();
rollback;
