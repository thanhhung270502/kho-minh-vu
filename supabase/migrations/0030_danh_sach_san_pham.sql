-- =============================================================================
-- 0030 — Cột Cần rà + RPC danh sách/chi tiết sản phẩm (DMUC-01..03, D-11, D-18, D-19)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

alter table public.san_pham add column if not exists can_ra_dvt boolean not null default false;
alter table public.san_pham add column if not exists da_xac_nhan_ra boolean not null default false;

comment on column public.san_pham.can_ra_dvt is
  '8 mã ô ĐVT gốc mâu thuẫn tên/đuôi (01-UAT). Không tự sửa dữ liệu — người rành hàng quyết (02-CONTEXT D-19).';
comment on column public.san_pham.da_xac_nhan_ra is
  'Người dùng đã xác nhận công đoạn/ĐVT hiện tại là đúng → rời bộ lọc Cần rà.';

-- 8 mã có ô ĐVT gốc mâu thuẫn tên/đuôi mã — danh sách ở 01-UAT.md.
update public.san_pham set can_ra_dvt = true where ma_hang in (
  'HVR23-75-35-CB','HVR23-75-36-CB','HVR23-75-37-CB',
  'YE19-46-9635-CB','YE19-46-9736-CB','YE19-46-9837-CB',
  'YE15-29-CB','HL10-16ATBAĐ-S'
);

-- Migration 0029 thu quyền SELECT mức bảng của san_pham: cột mới PHẢI grant tường minh.
grant select (can_ra_dvt, da_xac_nhan_ra) on public.san_pham to authenticated;
grant update (can_ra_dvt, da_xac_nhan_ra) on public.san_pham to authenticated;

CREATE OR REPLACE FUNCTION public.la_can_ra(p_cong_doan_ma text, p_ten_nhom text, p_ma_hang text, p_can_ra_dvt boolean, p_da_xac_nhan boolean)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select not p_da_xac_nhan and (
    p_can_ra_dvt
    or (p_cong_doan_ma = 'MUA_NGOAI'
        and coalesce(p_ten_nhom, '') not in ('Hàng Hãng - L5/6', 'Hàng Ngoài - L5/6')
        and p_ma_hang !~ '-(CB|X|S[A-ZĐ]*|N)$')
  );
$function$;

revoke all    on function public.la_can_ra(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.la_can_ra(text, text, text, boolean, boolean) to authenticated;
comment on function public.la_can_ra(text, text, text, boolean, boolean) is
  'Quy tắc D-18.3: mã cần người rành hàng rà lại. Dùng chung cho bộ lọc danh sách, bộ đếm lùi và mọi báo cáo — không chép lại biểu thức ra chỗ khác.';

CREATE OR REPLACE FUNCTION public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint)
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
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom, l.dvt_id, l.ten_dv,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi, l.quy_doi, l.gia_ban,
         case when v_xem_gv then l.gia_von end,
         l.ton_toi_thieu, l.ton_toi_da, l.kho_mac_dinh_id, l.dang_kinh_doanh,
         l.tong, l.cr, l.can_ra_dvt, l.updated_at,
         count(*) over ()
  from loc l
  where (p_can_ra is null or l.cr = p_can_ra)
    and (p_trang_thai_ton is null
         or (p_trang_thai_ton = 'con_hang'     and l.tong > 0)
         or (p_trang_thai_ton = 'het_hang'     and l.tong = 0)
         or (p_trang_thai_ton = 'am'           and l.tong < 0)
         or (p_trang_thai_ton = 'duoi_dinh_muc' and l.tong < l.ton_toi_thieu))
  order by
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

revoke all    on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int) from public, anon;
grant execute on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int) to authenticated;
comment on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int) is
  'Bảng danh mục server-side (D-11): lọc, sắp xếp, phân trang và tổng số dòng đều ở database. gia_von chỉ trả cho quản lý/văn phòng (D-16); tong_ton của thủ kho chỉ cộng kho được phân. Trang vượt quá dữ liệu trả 0 dòng — giao diện tự lùi về trang 1.';

CREATE OR REPLACE FUNCTION public.chi_tiet_san_pham(p_id uuid)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with ton as (
    select tk.san_pham_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where tk.san_pham_id = p_id
      and (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
    group by tk.san_pham_id
  )
  select sp.id, sp.ma_hang, sp.ten_hang, sp.nhom_hang_id, nh.ten, sp.dvt_id, dv.ten,
         sp.cong_doan_id, cd.ma, cd.ten, cd.mau_hien_thi, sp.quy_doi, sp.gia_ban,
         case when v_xem_gv then sp.gia_von end,
         sp.ton_toi_thieu, sp.ton_toi_da, sp.kho_mac_dinh_id, k.ten, sp.dang_kinh_doanh,
         coalesce(ton.so_luong, 0),
         public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra),
         sp.can_ra_dvt, sp.barcode, sp.hinh_anh_url, sp.vi_tri_ke, sp.ghi_chu,
         sp.created_at, sp.updated_at
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  left join public.kho k on k.id = sp.kho_mac_dinh_id
  left join ton on ton.san_pham_id = sp.id
  where sp.id = p_id;
end;
$function$;

revoke all    on function public.chi_tiet_san_pham(uuid) from public, anon;
grant execute on function public.chi_tiet_san_pham(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.xac_nhan_da_ra(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so integer;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng xác nhận được dữ liệu đã rà'
      using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Mỗi lần xác nhận tối đa 1.000 mã, hãy chia nhỏ lựa chọn'
      using errcode = '23514';
  end if;

  perform set_config('app.nguon_sua', 'hang_loat', true);
  update public.san_pham
  set da_xac_nhan_ra = true, can_ra_dvt = false
  where id = any(p_ids);
  get diagnostics v_so = row_count;
  return v_so;
end;
$function$;

revoke all    on function public.xac_nhan_da_ra(uuid[]) from public, anon;
grant execute on function public.xac_nhan_da_ra(uuid[]) to authenticated;

