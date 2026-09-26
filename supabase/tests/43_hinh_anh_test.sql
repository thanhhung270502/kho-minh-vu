-- =============================================================================
-- ANH-01 · ANH-02 · ANH-03 · ANH-04 — bảng hinh_anh, RPC ảnh mã hàng
-- (D-02 quyền ghi theo edit-catalog, D-04 không cột URL, D-20 một ảnh chính,
-- D-21 xóa mềm)
--
-- PHỤ THUỘC: `npm run seed:users` đã chạy (quanly, vanphong, thukho1, chixem).
-- Mọi mã hàng test dùng tiền tố HA-ZQX để không phụ thuộc 3.266 mã thật.
--
-- CHƯA CÓ MIGRATION 0068 KHI FILE NÀY ĐƯỢC VIẾT — đây là trạng thái RED có chủ
-- đích (TDD). File này KHÔNG chạy trên cloud ở plan 09-01; migration 0068 và
-- lượt chạy thật của pgTAP 43 là việc của plan 09-05.
-- =============================================================================
begin;
select plan(31);

-- --- Helper (chép nguyên từ supabase/tests/00_helper.sql.inc) --------------
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

-- --- Dữ liệu dựng dưới quyền postgres ---------------------------------------
create temp table t_ha as
select pg_temp.sp_test('HA-ZQX-001') as sp1,   -- sẽ có ảnh
       pg_temp.sp_test('HA-ZQX-002') as sp2;   -- không ảnh (rồi chép KiotViet + xóa mềm)
-- Bảng tạm thuộc postgres: không GRANT thì đọc dưới authenticated ném 42501 —
-- trùng mã lỗi với "RLS/RPC từ chối" nên assertion có thể xanh vì lý do SAI.
grant select on t_ha to authenticated;

create temp table t_anh as
select gen_random_uuid() as a1, gen_random_uuid() as a2, gen_random_uuid() as a3;
grant select on t_anh to authenticated;

-- --- 1-4: schema tĩnh, không cần đăng nhập ----------------------------------
select has_table('public', 'hinh_anh', 'bảng hinh_anh tồn tại');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.hinh_anh'::regclass),
  'RLS bật trên hinh_anh'
);

select hasnt_column('public', 'hinh_anh', 'url', 'không có cột url kiểu URL Drive trực tiếp');

select is(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'hinh_anh'
      and column_name like '%url%' and column_name <> 'nguon_url'),
  0::bigint,
  'không cột nào khác nguon_url chứa chữ url (D-04, không lưu URL Drive)'
);

-- --- 5-7: văn phòng thêm ảnh, ảnh đầu tự thành ảnh chính --------------------
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(
  (select public.them_anh((select a1 from t_anh), (select sp1 from t_ha), 'GDRIVE', 'k1', 'k1t')),
  true,
  'ảnh đầu tiên của mã tự thành ảnh chính'
);

select is(
  (select public.them_anh((select a2 from t_anh), (select sp1 from t_ha), 'GDRIVE', 'k2', 'k2t')),
  false,
  'ảnh thứ hai không tự thành ảnh chính'
);

select pg_temp.dang_xuat();

select is(
  (select thu_tu from public.hinh_anh where id = (select a2 from t_anh)),
  1,
  'ảnh thứ hai có thu_tu = 1'
);

-- --- 8-10: thủ kho / chỉ xem không ghi được ---------------------------------
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select public.them_anh(gen_random_uuid(), (select sp1 from t_ha), 'GDRIVE','x','y')$$,
  '42501', null,
  'thủ kho không thêm ảnh được'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

select throws_ok(
  $$select public.them_anh(gen_random_uuid(), (select sp1 from t_ha), 'GDRIVE','x','y')$$,
  '42501', null,
  'chỉ xem không thêm ảnh được'
);

-- --- 11-13: thủ kho đọc được ảnh nhưng không đọc thẳng khoa_luu -------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$insert into public.hinh_anh (san_pham_id, noi_luu, khoa_luu, khoa_luu_thumb)
    values ((select sp1 from t_ha), 'GDRIVE', 'z', 'zt')$$,
  '42501', null,
  'thủ kho không insert trực tiếp vào bảng hinh_anh được'
);

select is(
  (select count(*) from public.hinh_anh where san_pham_id = (select sp1 from t_ha)),
  2::bigint,
  'mọi vai trò đọc được ảnh còn sống của mã'
);

select throws_ok(
  $$select khoa_luu from public.hinh_anh limit 1$$,
  '42501', null,
  'khóa lưu không đọc thẳng được kể cả bởi vai trò có quyền đọc bảng'
);

-- --- 14-15: chỉ xem đọc khóa qua lay_khoa_anh, anon không gọi được ----------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

select is(
  (select count(*) from public.lay_khoa_anh((select a1 from t_anh))),
  1::bigint,
  'chỉ xem đọc được khóa lưu qua lay_khoa_anh'
);

select ok(
  not has_function_privilege('anon', 'public.lay_khoa_anh(uuid)', 'execute'),
  'anon không được gọi lay_khoa_anh'
);

-- --- 16-17: đặt ảnh chính -----------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select public.dat_anh_chinh((select a2 from t_anh));

select is(
  (select array_agg(id) from public.hinh_anh
    where san_pham_id = (select sp1 from t_ha) and la_anh_chinh),
  array[(select a2 from t_anh)],
  'đúng một ảnh chính là a2 sau khi đặt lại'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select public.dat_anh_chinh((select a1 from t_anh))$$,
  '42501', null,
  'thủ kho không đổi ảnh chính được'
);

-- --- 18-19: xóa ảnh chính, ảnh kế tiếp lên thay ------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select public.them_anh((select a3 from t_anh), (select sp1 from t_ha), 'GDRIVE', 'k3', 'k3t');

select is(
  (select khoa_luu from public.xoa_anh((select a2 from t_anh))),
  'k2',
  'xoa_anh trả khóa lưu gốc để route chuyển file vào thùng rác'
);

select is(
  (select id from public.hinh_anh
    where san_pham_id = (select sp1 from t_ha) and la_anh_chinh),
  (select a1 from t_anh),
  'ảnh chính chuyển về a1 (thu_tu nhỏ hơn a3) sau khi xóa a2'
);

-- --- 20-21: ảnh đã xóa vô hình với mọi vai trò ------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select count(*) from public.hinh_anh where id = (select a2 from t_anh)),
  0::bigint,
  'ảnh đã xóa vô hình trong bảng hinh_anh'
);

select is(
  (select count(*) from public.lay_khoa_anh((select a2 from t_anh))),
  0::bigint,
  'ảnh đã xóa vô hình qua lay_khoa_anh'
);

-- --- 22: xóa lần hai báo không tồn tại --------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$select * from public.xoa_anh((select a2 from t_anh))$$,
  'P0002', null,
  'xóa ảnh đã xóa từ trước báo không tồn tại'
);

-- --- 23-24: xóa mềm, không xóa hẳn; unique index chặn hai ảnh chính ---------
select pg_temp.dang_xuat();

select ok(
  (select xoa_luc is not null from public.hinh_anh where id = (select a2 from t_anh)),
  'ảnh đã xóa vẫn còn dòng với xoa_luc (xóa mềm, không xóa hẳn)'
);

select throws_ok(
  $$insert into public.hinh_anh (san_pham_id, noi_luu, khoa_luu, khoa_luu_thumb, la_anh_chinh)
    values ((select sp1 from t_ha), 'GDRIVE', 'zz', 'zzt', true)$$,
  '23505', null,
  'partial unique index chặn hai ảnh chính cùng sống cho một mã'
);

-- --- 25-26: nap_anh_kiotviet chỉ service_role gọi được ----------------------
select ok(
  not has_function_privilege('authenticated', 'public.nap_anh_kiotviet(uuid,uuid,text,text,text,text)', 'execute'),
  'authenticated không gọi được nap_anh_kiotviet'
);

select ok(
  has_function_privilege('service_role', 'public.nap_anh_kiotviet(uuid,uuid,text,text,text,text)', 'execute'),
  'service_role gọi được nap_anh_kiotviet'
);

-- --- 27-28: nap_anh_kiotviet idempotent theo nguon_url ----------------------
select is(
  (select public.nap_anh_kiotviet(gen_random_uuid(), (select sp2 from t_ha), 'GDRIVE', 'kv1', 'kv1t',
     'https://cdn2-retail-images.kiotviet.vn/zqx-1.jpg')),
  true,
  'nap_anh_kiotviet chép ảnh KiotViet lần đầu'
);

select throws_ok(
  $$select public.nap_anh_kiotviet(gen_random_uuid(), (select sp2 from t_ha), 'GDRIVE', 'kv2', 'kv2t',
     'https://cdn2-retail-images.kiotviet.vn/zqx-1.jpg')$$,
  '23505', null,
  'chạy lại script chép ảnh với cùng nguon_url không chép trùng (idempotent ANH-06)'
);

-- Dọn để sp2 trở lại "chưa có ảnh" cho các assertion p_co_anh bên dưới.
update public.hinh_anh set xoa_luc = now(), la_anh_chinh = false
where san_pham_id = (select sp2 from t_ha)
  and nguon_url = 'https://cdn2-retail-images.kiotviet.vn/zqx-1.jpg';

-- --- 29-31: bộ lọc p_co_anh trên danh_sach_san_pham, đúng 1 overload --------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select array_agg(ma_hang order by ma_hang) from public.danh_sach_san_pham(
     p_tu_khoa => 'HA-ZQX', p_co_anh => true)),
  array['HA-ZQX-001'],
  'p_co_anh true chỉ trả mã có ảnh còn sống'
);

select is(
  (select array_agg(ma_hang order by ma_hang) from public.danh_sach_san_pham(
     p_tu_khoa => 'HA-ZQX', p_co_anh => false)),
  array['HA-ZQX-002'],
  'p_co_anh false chỉ trả mã chưa có ảnh'
);

select is(
  (select array_agg(ma_hang order by ma_hang) from public.danh_sach_san_pham(
     p_tu_khoa => 'HA-ZQX')),
  array['HA-ZQX-001', 'HA-ZQX-002'],
  'p_co_anh bỏ trống (mặc định null) trả cả hai'
);

select pg_temp.dang_xuat();

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'danh_sach_san_pham' and n.nspname = 'public'),
  1::bigint,
  'chỉ đúng một overload của danh_sach_san_pham (drop + create, không phải create or replace)'
);

select * from finish();
rollback;
