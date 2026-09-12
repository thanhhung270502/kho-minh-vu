-- =============================================================================
-- KHÔNG PHẢI FILE TEST. Đuôi .inc để test runner không nhặt chạy.
--
-- Đây là bản gốc của khối helper được CHÉP vào đầu mỗi file *_test.sql.
-- Chép thay vì \i vì \i phụ thuộc thư mục làm việc của psql, và mọi file trong
-- supabase/tests/ có đuôi .sql đều bị chạy như một test (thiếu plan() là fail).
--
-- Sửa ở đây thì phải chép lại vào cả năm file test. Khối này cố ý ngắn.
--
-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ CẢNH BÁO: dang_nhap_nhu ĐẶT THẲNG request.jwt.claims nên BỎ QUA HOÀN     │
-- │ TOÀN custom_access_token_hook. Test xanh KHÔNG chứng minh hook chạy.      │
-- │ Việc đó do `npm run verify:hook` đảm nhiệm.                               │
-- └───────────────────────────────────────────────────────────────────────────┘
-- =============================================================================

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  perform set_config('request.jwt.claims', json_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', coalesce(v_nd.kho_id::text, '')
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
