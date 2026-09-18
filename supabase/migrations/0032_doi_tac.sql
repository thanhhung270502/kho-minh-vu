-- =============================================================================
-- 0032 — Đối tác: Khách lẻ, mã tự sinh, danh sách (DTAC-01/02, D-32, D-33)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

insert into public.doi_tac (ma, ten, loai, ghi_chu)
values ('KHACHLE', 'Khách lẻ', 'KHACH',
        'Đối tác chung cho hóa đơn không ghi tên khách (02-CONTEXT D-31).')
on conflict (ma) do nothing;

create index if not exists idx_doi_tac_tim_kiem on public.doi_tac
  using gin (public.f_unaccent(
    coalesce(ma,'') || ' ' || coalesce(ten,'') || ' ' || coalesce(dien_thoai,'')
  ) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.sinh_ma_doi_tac(p_loai loai_doi_tac)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_tien_to text := case p_loai when 'NCC' then 'NCC' when 'KHACH' then 'KH' else 'DT' end;
  v_so int;
begin
  select coalesce(max(
           case when d.ma ~ ('^' || v_tien_to || '[0-9]{6}$')
                then (case when substring(d.ma from length(v_tien_to) + 1)::int < 900000
                           then substring(d.ma from length(v_tien_to) + 1)::int end)
           end), 0) + 1
    into v_so
  from public.doi_tac d;
  return v_tien_to || lpad(v_so::text, 6, '0');
end $function$;

revoke all    on function public.sinh_ma_doi_tac(public.loai_doi_tac) from public, anon;
grant execute on function public.sinh_ma_doi_tac(public.loai_doi_tac) to authenticated;
comment on function public.sinh_ma_doi_tac(public.loai_doi_tac) is
  'Chỉ là GỢI Ý. Hai người tạo cùng lúc có thể nhận cùng mã — unique(ma) chặn, người thứ hai nhận lỗi 23505 và thử lại.';

CREATE OR REPLACE FUNCTION public.danh_sach_doi_tac(p_tu_khoa text DEFAULT NULL::text, p_loai loai_doi_tac DEFAULT NULL::loai_doi_tac, p_dang_hoat_dong boolean DEFAULT true, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(id uuid, ma text, ten text, loai loai_doi_tac, dien_thoai text, email text, dia_chi text, khu_vuc text, ma_so_thue text, ghi_chu text, dang_hoat_dong boolean, updated_at timestamp with time zone, tong_so_dong bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select d.id, d.ma, d.ten, d.loai, d.dien_thoai, d.email, d.dia_chi, d.khu_vuc, d.ma_so_thue,
         d.ghi_chu, d.dang_hoat_dong, d.updated_at, count(*) over ()
  from public.doi_tac d
  where (nullif(trim(coalesce(p_tu_khoa,'')),'') is null
         or public.f_unaccent(coalesce(d.ma,'') || ' ' || coalesce(d.ten,'') || ' ' || coalesce(d.dien_thoai,''))
              ilike '%' || public.f_unaccent(trim(p_tu_khoa)) || '%')
    and (p_loai is null or d.loai = p_loai or d.loai = 'CA_HAI')
    and (p_dang_hoat_dong is null or d.dang_hoat_dong = p_dang_hoat_dong)
  order by d.ma
  limit least(greatest(coalesce(p_kich_thuoc,50),1),500)
  offset (greatest(coalesce(p_trang,1),1) - 1) * least(greatest(coalesce(p_kich_thuoc,50),1),500);
$function$;

revoke all    on function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int) from public, anon;
grant execute on function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int) to authenticated;

