-- 0126: tìm mã hàng — mã khớp đúng luôn đứng đầu (08/10/2026).
--
-- Gõ đủ "HVR18-12TT-PC" mà danh sách đưa HVR18-12TKN-PC (phát sinh gần đây hơn) lên trước:
-- cả danh_sach_san_pham lẫn tim_san_pham xếp lan_phat_sinh_cuoi TRƯỚC độ giống. Thêm
-- tiêu chí đứng đầu: khớp đúng mã → mã bắt đầu bằng từ khóa → mã chứa từ khóa → còn lại.
-- Thân hàm chép từ 0096 / 0029, chỉ vá chỗ ghi "0126". Chữ ký giữ nguyên.
--
-- Hạng 1/2 so bằng starts_with/strpos, không bằng ILIKE: từ khóa người gõ có thể chứa
-- `_`/`%` — với ILIKE chúng thành ký tự đại diện và đẩy mã không liên quan lên hạng 1.
--
-- Số 0126 (không phải 0123): main đã có 0123_thu_quyen_them_dong_don_anon.

CREATE OR REPLACE FUNCTION public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_co_anh boolean DEFAULT NULL::boolean, p_quy_chuan text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint, loai_hang text, hang_xe text, dong_xe text, linh_kien text, ghi_chu text, truong_chon_tay text[], xe_dung_chung jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with ton as (
    select tk.san_pham_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho)
    group by tk.san_pham_id
  ), loc as (
    select sp.*,
           nh.ten as ten_nhom, dv.ten as ten_dv,
           cd.ma as ma_cd, cd.ten as ten_cd, cd.mau_hien_thi,
           coalesce(ton.so_luong, 0) as tong,
           public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra) as cr
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join public.don_vi_tinh dv on dv.id = sp.dvt_id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
    left join ton on ton.san_pham_id = sp.id
    where (v_tk is null
           or public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
                ilike '%' || public.f_unaccent(v_tk) || '%'
           or public.f_unaccent(v_tk) operator(extensions.<%)
                public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
      and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
      and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
      and (p_dvt_id is null or sp.dvt_id = p_dvt_id)
      and (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
      and (p_co_anh is null
           or p_co_anh = exists (select 1 from public.hinh_anh h
                                 where h.san_pham_id = sp.id and h.xoa_luc is null))
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom, l.dvt_id, l.ten_dv,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi, l.quy_doi, l.gia_ban,
         case when v_xem_gv then l.gia_von end,
         l.ton_toi_thieu, l.ton_toi_da, l.kho_mac_dinh_id, l.dang_kinh_doanh,
         l.tong, l.cr, l.can_ra_dvt, l.updated_at,
         count(*) over (),
         l.loai_hang, l.hang_xe, l.dong_xe, l.linh_kien, l.ghi_chu, l.truong_chon_tay,
         l.xe_dung_chung
  from loc l
  where (p_can_ra is null or l.cr = p_can_ra)
    -- 0087: lọc quy chuẩn — ghi_chu do trigger 0086 tự sinh, null = đủ.
    and (p_quy_chuan is null
         or (p_quy_chuan = 'du'       and l.ghi_chu is null)
         or (p_quy_chuan = 'thieu'    and l.ghi_chu is not null)
         or (p_quy_chuan = 'chon_tay' and cardinality(l.truong_chon_tay) > 0))
    and (p_trang_thai_ton is null
         or (p_trang_thai_ton = 'con_hang'     and l.tong > 0)
         or (p_trang_thai_ton = 'het_hang'     and l.tong = 0)
         or (p_trang_thai_ton = 'am'           and l.tong < 0)
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm
         -- (0067, UAT 05 bài 7).
         or (p_trang_thai_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
  order by
    -- 0126: mã khớp đúng → bắt đầu bằng từ khóa → chứa từ khóa → còn lại (bẫy 15).
    case when p_sap_xep is null and v_tk is not null then
      case when upper(public.f_unaccent(l.ma_hang)) = upper(public.f_unaccent(v_tk)) then 0
           when starts_with(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) then 1
           when strpos(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) > 0 then 2
           else 3 end end asc,
    case when p_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when p_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when p_sap_xep = 'ten_hang'   and p_huong = 'asc'  then l.ten_hang end asc,
    case when p_sap_xep = 'ten_hang'   and p_huong = 'desc' then l.ten_hang end desc,
    case when p_sap_xep = 'tong_ton'   and p_huong = 'asc'  then l.tong end asc,
    case when p_sap_xep = 'tong_ton'   and p_huong = 'desc' then l.tong end desc,
    case when p_sap_xep = 'updated_at' and p_huong = 'asc'  then l.updated_at end asc,
    case when p_sap_xep = 'updated_at' and p_huong = 'desc' then l.updated_at end desc,
    case when p_sap_xep = 'ma_hang'    and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

create or replace function public.tim_san_pham(
  p_tu_khoa text,
  p_gioi_han int default 20
)
returns table (
  id uuid, ma_hang text, ten_hang text, barcode text, nhom_hang_id uuid, dvt_id uuid,
  cong_doan_id uuid, quy_doi numeric, gia_ban numeric, dang_kinh_doanh boolean,
  kho_mac_dinh_id uuid, lan_phat_sinh_cuoi timestamptz
)
language sql
stable
set search_path = ''
as $$
  select sp.id, sp.ma_hang, sp.ten_hang, sp.barcode, sp.nhom_hang_id, sp.dvt_id,
         sp.cong_doan_id, sp.quy_doi, sp.gia_ban, sp.dang_kinh_doanh,
         sp.kho_mac_dinh_id, sp.lan_phat_sinh_cuoi
  from public.san_pham sp
  where sp.dang_kinh_doanh
    and coalesce(trim(p_tu_khoa), '') <> ''
    and (
      -- Nhánh 1: chuỗi con. Index GIN trigram tăng tốc được ILIKE.
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
        ilike '%' || public.f_unaccent(p_tu_khoa) || '%'
      -- Nhánh 2: gần đúng, chịu được gõ sai. word_similarity so từ khóa với
      -- đoạn khớp nhất trong chuỗi đích, không so với toàn chuỗi như `%`.
      or public.f_unaccent(p_tu_khoa)
         operator(extensions.<%)
         public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
    )
  order by
    -- 0126: mã khớp đúng → bắt đầu bằng từ khóa → chứa từ khóa → còn lại (bẫy 15).
    case when upper(public.f_unaccent(sp.ma_hang)) = upper(public.f_unaccent(trim(p_tu_khoa))) then 0
         when starts_with(upper(public.f_unaccent(sp.ma_hang)), upper(public.f_unaccent(trim(p_tu_khoa)))) then 1
         when strpos(upper(public.f_unaccent(sp.ma_hang)), upper(public.f_unaccent(trim(p_tu_khoa)))) > 0 then 2
         else 3 end,
    sp.lan_phat_sinh_cuoi desc nulls last,
    extensions.word_similarity(
      public.f_unaccent(p_tu_khoa),
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
    ) desc
  limit p_gioi_han;
$$;
