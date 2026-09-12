-- =============================================================================
-- 0014a — Custom access token hook
--
-- Bơm vai_tro và kho_id vào JWT claims khi GoTrue cấp token, để RLS đọc được
-- mà không phải truy vấn bảng nguoi_dung theo từng dòng.
-- =============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_vai_tro public.vai_tro;
  v_kho_id uuid;
begin
  select vai_tro, kho_id into v_vai_tro, v_kho_id
  from public.nguoi_dung
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if v_vai_tro is not null then
    claims := jsonb_set(claims, '{vai_tro}', to_jsonb(v_vai_tro));
  end if;
  if v_kho_id is not null then
    claims := jsonb_set(claims, '{kho_id}', to_jsonb(v_kho_id));
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

grant usage   on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select  on public.nguoi_dung to supabase_auth_admin;

-- Hook CHỈ được GoTrue gọi. Client tuyệt đối không được tự gọi để tự cấp claim.
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

comment on function public.custom_access_token_hook(jsonb) is
  'GIỚI HẠN ĐÃ BIẾT: hook chỉ chạy khi CẤP MỚI access token (login hoặc refresh, TTL mặc định 3600s). Đổi nguoi_dung.vai_tro KHÔNG làm token đang sống đổi theo — người dùng vẫn thao tác theo vai trò cũ tới lần refresh kế tiếp. Màn Cài đặt ở Phase 2 phải gọi auth.admin.signOut(userId, ''others'') sau khi đổi vai trò.';
