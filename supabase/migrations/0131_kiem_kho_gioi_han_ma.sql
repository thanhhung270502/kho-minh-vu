-- 0131: giới hạn số mã của phiên kiểm kê chọn theo mã (13/10/2026).
--
-- Review PR kiểm kho: danh sách mã chọn không có chặn trên — nút "Thêm các mã đang âm"
-- ở kho nhiều mã âm có thể đẩy hàng nghìn uuid vào một tham số RPC. Chặn 2.000 mã
-- (giao diện chặn cùng mức ở schema Zod). Thân hàm chép từ 0129, chỉ thêm khối "0131".
-- CREATE OR REPLACE giữ nguyên quyền thực thi đã cấp ở 0129.

CREATE OR REPLACE FUNCTION public.mo_phien_kiem_ke(p_kho_id uuid, p_nhom_hang_ids uuid[] DEFAULT NULL::uuid[], p_ghi_chu text DEFAULT NULL::text, p_san_pham_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_kho public.kho;
  v_pham_vi uuid[];
  v_ma uuid[];
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (p_kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ mở được phiên của kho mình' using errcode = '42501';
  end if;

  select * into v_kho from public.kho where id = p_kho_id and dang_hoat_dong;
  if v_kho.id is null then
    raise exception 'Kho không tồn tại hoặc không hoạt động' using errcode = '23514';
  end if;

  -- Mảng rỗng đối xử như NULL — cả hai đều nghĩa là "toàn kho" (KKE-01).
  if p_nhom_hang_ids is null or cardinality(p_nhom_hang_ids) = 0 then
    v_pham_vi := null;
  else
    v_pham_vi := p_nhom_hang_ids;
    if exists (
      select 1 from unnest(v_pham_vi) as x(id)
      left join public.nhom_hang nh on nh.id = x.id
      where nh.id is null
    ) then
      raise exception 'Có nhóm hàng không tồn tại trong phạm vi phiên' using errcode = '23514';
    end if;
  end if;

  -- 0129: chọn theo mã — loại trùng, bỏ phần tử null; rỗng = không chọn theo mã.
  v_ma := (select array_agg(distinct x) from unnest(coalesce(p_san_pham_ids, '{}'::uuid[])) as x where x is not null);
  if v_ma is not null then
    -- 0131: chặn trên — một phiên theo mã tối đa 2.000 mã (toàn kho thì chọn theo nhóm).
    if cardinality(v_ma) > 2000 then
      raise exception 'Một phiên chọn theo mã tối đa 2.000 mã — nhiều hơn thì chọn theo nhóm hàng' using errcode = '23514';
    end if;
    if v_pham_vi is not null then
      raise exception 'Chọn theo nhóm hàng hoặc theo mã, không chọn cả hai' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(v_ma) as x(id)
      left join public.san_pham sp on sp.id = x.id
      where sp.id is null or sp.loai_hang = 'COMBO'
    ) then
      raise exception 'Có mã không tồn tại hoặc là combo (combo kiểm theo mã thành phần)' using errcode = '23514';
    end if;
  end if;

  insert into public.chung_tu (so_ct, loai_ct, kho_id, pham_vi_nhom_hang, pham_vi_san_pham, ghi_chu, nguoi_tao_id)
  values (
    public.sinh_so_ct('KIEM_KE'::public.loai_ct),
    'KIEM_KE',
    p_kho_id,
    v_pham_vi,
    v_ma,
    nullif(trim(coalesce(p_ghi_chu, '')), ''),
    auth.uid()
  )
  returning * into v_ct;

  return v_ct;
end;
$function$;
