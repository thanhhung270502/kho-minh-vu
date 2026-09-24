-- =============================================================================
-- D-13/D-14/D-15 — hai công tắc quyền theo TỪNG NGƯỜI trên nguoi_dung:
--   xem_lich_su_kiotviet (D-13) và duyet_kiem_ke (D-14).
-- D-15: quản lý (vai_tro = 'quan_ly') LUÔN có cả hai quyền dù cột = false — không
--   ai tự khóa được mình bằng cách tắt công tắc của chính mình.
-- Helper đọc THẲNG bảng nguoi_dung (không qua JWT claim) — cả nâng lẫn hạ quyền
-- có hiệu lực NGAY câu lệnh kế tiếp, không cần chờ token mới (né bẫy 6 CLAUDE.md).
-- =============================================================================
begin;
select plan(19);

-- ─── Helper (chép nguyên khối từ 00_helper.sql.inc, KHÔNG dùng \i) ──────────
-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ CẢNH BÁO: dang_nhap_nhu ĐẶT THẲNG request.jwt.claims nên BỎ QUA HOÀN     │
-- │ TOÀN custom_access_token_hook. Test xanh KHÔNG chứng minh hook chạy.      │
-- │ Việc đó do `npm run verify:hook` đảm nhiệm.                               │
-- └───────────────────────────────────────────────────────────────────────────┘

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

-- ─── A1 (1-4): quan_ly luôn có cả hai quyền, kể cả sau khi tự tắt cột (D-15) ─
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select ok(
  (select public.xem_duoc_lich_su_kiotviet()),
  'A1a: quan_ly xem_duoc_lich_su_kiotviet() = true (mặc định)'
);
select ok(
  (select public.duyet_duoc_kiem_ke()),
  'A1b: quan_ly duyet_duoc_kiem_ke() = true (mặc định)'
);

select pg_temp.dang_xuat();
update public.nguoi_dung set xem_lich_su_kiotviet = false, duyet_kiem_ke = false
where id = (select id from auth.users where email = 'quanly@khominhvu.local');

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select ok(
  (select public.xem_duoc_lich_su_kiotviet()),
  'A1c: quan_ly vẫn true dù cột xem_lich_su_kiotviet = false (D-15, không tự khóa được mình)'
);
select ok(
  (select public.duyet_duoc_kiem_ke()),
  'A1d: quan_ly vẫn true dù cột duyet_kiem_ke = false (D-15)'
);

-- ─── A2 (5-6): backfill — mọi van_phong có xem_lich_su_kiotviet=true, duyet_kiem_ke=false
select pg_temp.dang_xuat();

select ok(
  exists(select 1 from public.nguoi_dung where vai_tro = 'van_phong'),
  'A2 tiền đề: có ít nhất một tài khoản van_phong thật để kiểm backfill (tránh giả pass trên bảng rỗng)'
);
select is(
  (select count(*) from public.nguoi_dung
    where vai_tro = 'van_phong' and (not xem_lich_su_kiotviet or duyet_kiem_ke)),
  0::bigint,
  'A2: mọi van_phong có xem_lich_su_kiotviet=true (giữ quyền cũ) và duyet_kiem_ke=false sau backfill'
);

-- ─── A3 (7-9): thukho1 mặc định false; đổi cột trong CÙNG transaction có hiệu lực ngay
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select public.xem_duoc_lich_su_kiotviet()), false,
  'A3a: thukho1 xem_duoc_lich_su_kiotviet() = false mặc định (không phải van_phong, không backfill)'
);
select is(
  (select public.duyet_duoc_kiem_ke()), false,
  'A3b: thukho1 duyet_duoc_kiem_ke() = false mặc định'
);

select pg_temp.dang_xuat();
update public.nguoi_dung set duyet_kiem_ke = true
where id = (select id from auth.users where email = 'thukho1@khominhvu.local');

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is(
  (select public.duyet_duoc_kiem_ke()), true,
  'A3c: đổi cột duyet_kiem_ke dưới postgres rồi gọi lại ngay trong CÙNG transaction → true, không cần token mới'
);

-- ─── A4 (10-11): dang_hoat_dong = false → cả hai helper = false dù cột true ─
select pg_temp.dang_xuat();
update public.nguoi_dung set xem_lich_su_kiotviet = true, dang_hoat_dong = false
where id = (select id from auth.users where email = 'thukho1@khominhvu.local');

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is(
  (select public.xem_duoc_lich_su_kiotviet()), false,
  'A4a: người dùng bị vô hiệu hóa → xem_duoc_lich_su_kiotviet() = false dù cột = true'
);
select is(
  (select public.duyet_duoc_kiem_ke()), false,
  'A4b: người dùng bị vô hiệu hóa → duyet_duoc_kiem_ke() = false dù cột = true (đã bật ở A3)'
);

-- Khôi phục dang_hoat_dong (chỉ trong transaction test) cho các assertion sau.
select pg_temp.dang_xuat();
update public.nguoi_dung set dang_hoat_dong = true
where id = (select id from auth.users where email = 'thukho1@khominhvu.local');

-- ─── A5 (12-13): không có phiên (auth.uid() null) → cả hai helper = false ──
select pg_temp.dang_xuat();

select is(
  (select public.xem_duoc_lich_su_kiotviet()), false,
  'A5a: không có phiên (auth.uid() null) → xem_duoc_lich_su_kiotviet() = false'
);
select is(
  (select public.duyet_duoc_kiem_ke()), false,
  'A5b: không có phiên → duyet_duoc_kiem_ke() = false'
);

-- ─── A6 (14): quan_ly gọi luu_ho_so_nguoi_dung 8 tham số, bật p_xem_lich_su_kiotviet cho thukho1
create temp table t_thukho1 as
select nd.id, nd.ho_ten, nd.ten_dang_nhap, nd.vai_tro, nd.phai_doi_mat_khau,
       coalesce((select array_agg(kho_id) from public.nguoi_dung_kho where nguoi_dung_id = nd.id), '{}'::uuid[]) as kho_ids
from public.nguoi_dung nd
join auth.users u on u.id = nd.id
where u.email = 'thukho1@khominhvu.local';
grant select on t_thukho1 to authenticated;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select public.luu_ho_so_nguoi_dung(
  p_id := (select id from t_thukho1),
  p_ho_ten := (select ho_ten from t_thukho1),
  p_ten_dang_nhap := (select ten_dang_nhap from t_thukho1),
  p_vai_tro := (select vai_tro from t_thukho1),
  p_kho_ids := (select kho_ids from t_thukho1),
  p_phai_doi_mat_khau := (select phai_doi_mat_khau from t_thukho1),
  p_xem_lich_su_kiotviet := true
);

select pg_temp.dang_xuat();
select is(
  (select xem_lich_su_kiotviet from public.nguoi_dung where id = (select id from t_thukho1)),
  true,
  'A6: luu_ho_so_nguoi_dung(8 tham số đặt tên) bật p_xem_lich_su_kiotviet cho thukho1 → cột đổi thành true'
);

-- ─── A7 (15-16): gọi 6 tham số cũ (app đang chạy) → hai cột GIỮ NGUYÊN, không reset về false
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select public.luu_ho_so_nguoi_dung(
  p_id := (select id from t_thukho1),
  p_ho_ten := (select ho_ten from t_thukho1),
  p_ten_dang_nhap := (select ten_dang_nhap from t_thukho1),
  p_vai_tro := (select vai_tro from t_thukho1),
  p_kho_ids := (select kho_ids from t_thukho1),
  p_phai_doi_mat_khau := (select phai_doi_mat_khau from t_thukho1)
);

select pg_temp.dang_xuat();
select is(
  (select xem_lich_su_kiotviet from public.nguoi_dung where id = (select id from t_thukho1)),
  true,
  'A7a: gọi 6 tham số đặt tên như app cũ (thiếu 2 tham số mới) KHÔNG reset xem_lich_su_kiotviet về false'
);
select is(
  (select duyet_kiem_ke from public.nguoi_dung where id = (select id from t_thukho1)),
  true,
  'A7b: gọi 6 tham số đặt tên như app cũ KHÔNG reset duyet_kiem_ke về false (đã bật ở A3)'
);

-- ─── A8 (17): van_phong gọi luu_ho_so_nguoi_dung → 42501 ────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$ select public.luu_ho_so_nguoi_dung(
       p_id := extensions.uuid_generate_v4(), p_ho_ten := 'Test', p_ten_dang_nhap := 'test_a8_zqx',
       p_vai_tro := 'thu_kho'::public.vai_tro, p_kho_ids := '{}'::uuid[],
       p_phai_doi_mat_khau := false
     ) $$,
  '42501', null,
  'A8: van_phong không được phép gọi luu_ho_so_nguoi_dung (chỉ quan_ly)'
);

-- ─── A9 (18-19): anon không có quyền execute cả hai helper ──────────────────
select pg_temp.dang_xuat();

select is(
  has_function_privilege('anon', 'public.xem_duoc_lich_su_kiotviet()', 'execute'),
  false,
  'A9a: anon KHÔNG có quyền execute xem_duoc_lich_su_kiotviet()'
);
select is(
  has_function_privilege('anon', 'public.duyet_duoc_kiem_ke()', 'execute'),
  false,
  'A9b: anon KHÔNG có quyền execute duyet_duoc_kiem_ke()'
);

select * from finish();
rollback;
