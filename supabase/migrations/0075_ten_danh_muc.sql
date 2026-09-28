-- =============================================================================
-- 0075 — public.ten_danh_muc(p_bang, p_id): hàm helper bị sót khi dựng lại 0034
--
-- 0030–0036 được dựng lại từ catalog của database cloud (commit b3dd55c) vì file
-- nguồn gốc bị mất. nhap_danh_muc (0034) gọi public.ten_danh_muc() để ghi nhật ký
-- "tên cũ → tên mới" khi import Excel đổi nhóm/ĐVT/công đoạn/kho, nhưng lần dựng
-- lại không trích hàm này → mọi database dựng từ chuỗi migration (local sau
-- `db reset`, project cloud mới) thiếu hàm, import đổi danh mục chết giữa chừng.
--
-- Định nghĩa + quyền dưới đây đọc nguyên văn từ cloud (pg_get_functiondef,
-- information_schema.routine_privileges, phiên read-only, 28/09/2026).
-- `create or replace` nên áp lên cloud đang có sẵn hàm cũng không đổi gì.
-- =============================================================================

create or replace function public.ten_danh_muc(p_bang text, p_id uuid)
returns text
language plpgsql
stable
set search_path to ''
as $function$
declare v_ten text;
begin
  if p_id is null then
    return null;
  end if;
  if p_bang = 'nhom_hang' then
    select ten into v_ten from public.nhom_hang where id = p_id;
  elsif p_bang = 'don_vi_tinh' then
    select ten into v_ten from public.don_vi_tinh where id = p_id;
  elsif p_bang = 'cong_doan' then
    select ten into v_ten from public.cong_doan where id = p_id;
  elsif p_bang = 'kho' then
    select ten into v_ten from public.kho where id = p_id;
  else
    raise exception 'Bảng danh mục không hợp lệ: %', p_bang;
  end if;
  return v_ten;
end $function$;

revoke all    on function public.ten_danh_muc(text, uuid) from public, anon;
grant execute on function public.ten_danh_muc(text, uuid) to authenticated, service_role;
