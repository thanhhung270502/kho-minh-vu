-- =============================================================================
-- 0035 — Rà hàng loạt: gán nhiều mã, gợi ý công đoạn theo đuôi mã (DMUC-04, D-18)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cong_doan_theo_duoi(p_ma_hang text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_ma_hang ~ '-CB$'        then 'CARBON'
    when p_ma_hang ~ '-X$'         then 'XI_MA'
    when p_ma_hang ~ '-S[A-ZĐ]*$'  then 'SON'
    when p_ma_hang ~ '-N$'         then 'NANO'
  end;
$function$;

revoke all    on function public.cong_doan_theo_duoi(text) from public, anon;
grant execute on function public.cong_doan_theo_duoi(text) to authenticated;

CREATE OR REPLACE FUNCTION public.goi_y_cong_doan_theo_duoi()
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, ten_nhom_hang text, cong_doan_de_xuat_id uuid, ma_cong_doan_de_xuat text, ten_cong_doan_de_xuat text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select sp.id, sp.ma_hang, sp.ten_hang, nh.ten, cd2.id, cd2.ma, cd2.ten
  from public.san_pham sp
  join public.cong_doan cd on cd.id = sp.cong_doan_id and cd.ma = 'MUA_NGOAI'
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  join public.cong_doan cd2 on cd2.ma = public.cong_doan_theo_duoi(sp.ma_hang)
  order by cd2.ma, sp.ma_hang;
$function$;

revoke all    on function public.goi_y_cong_doan_theo_duoi() from public, anon;
grant execute on function public.goi_y_cong_doan_theo_duoi() to authenticated;

CREATE OR REPLACE FUNCTION public.ap_dung_goi_y_cong_doan(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so int;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng sửa được danh mục' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  perform set_config('app.nguon_sua', 'goi_y_duoi', true);
  update public.san_pham sp
  set cong_doan_id = cd2.id
  from public.cong_doan cd, public.cong_doan cd2
  where sp.id = any(p_ids) and cd.id = sp.cong_doan_id and cd.ma = 'MUA_NGOAI'
    and cd2.ma = public.cong_doan_theo_duoi(sp.ma_hang);
  get diagnostics v_so = row_count;
  return v_so;
end $function$;

revoke all    on function public.ap_dung_goi_y_cong_doan(uuid[]) from public, anon;
grant execute on function public.ap_dung_goi_y_cong_doan(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.gan_hang_loat(p_ids uuid[], p_thay_doi jsonb, p_nguon text DEFAULT 'hang_loat'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so int; k text;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng sửa được danh mục' using errcode = '42501';
  end if;
  if p_nguon not in ('hang_loat', 'sua_o') then
    raise exception 'Nguồn sửa không hợp lệ: %', p_nguon using errcode = '23514';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  for k in select jsonb_object_keys(p_thay_doi) loop
    if k not in ('nhom_hang_id','dvt_id','cong_doan_id','dang_kinh_doanh') then
      raise exception 'Không gán hàng loạt được trường %', k using errcode = '23514';
    end if;
  end loop;
  perform set_config('app.nguon_sua', p_nguon, true);
  update public.san_pham set
    nhom_hang_id    = case when p_thay_doi ? 'nhom_hang_id'    then nullif(p_thay_doi->>'nhom_hang_id','')::uuid else nhom_hang_id end,
    dvt_id          = case when p_thay_doi ? 'dvt_id'          then (p_thay_doi->>'dvt_id')::uuid else dvt_id end,
    cong_doan_id    = case when p_thay_doi ? 'cong_doan_id'    then (p_thay_doi->>'cong_doan_id')::uuid else cong_doan_id end,
    dang_kinh_doanh = case when p_thay_doi ? 'dang_kinh_doanh' then (p_thay_doi->>'dang_kinh_doanh')::boolean else dang_kinh_doanh end
  where id = any(p_ids);
  get diagnostics v_so = row_count;
  return v_so;
end $function$;

revoke all    on function public.gan_hang_loat(uuid[], jsonb, text) from public, anon;
grant execute on function public.gan_hang_loat(uuid[], jsonb, text) to authenticated;

