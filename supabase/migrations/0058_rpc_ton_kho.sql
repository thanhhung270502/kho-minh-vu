-- =============================================================================
-- 0058 — RPC danh_sach_ton_kho (TON-01, TQAN-02, D-01, D-02)
--
-- Nguồn dữ liệu duy nhất của màn tồn kho: một dòng cho mỗi mã hàng, tồn của
-- từng kho nằm trong cùng dòng đó dưới dạng jsonb (D-01 — "kho là cột, không
-- phải dòng" ở GIAO DIỆN; SQL không sinh được cột động nên RPC trả một object
-- {kho_id: so_luong}, giao diện tự dựng cột từ danh sách kho có sẵn
-- useLookups().warehouses — thêm kho thứ ba không phải sửa migration này).
--
-- Bộ lọc/phân trang/quyền chép khuôn của danh_sach_san_pham (0030).
-- p_trang_thai_ton dùng lại đúng bốn giá trị của 0030 (con_hang/het_hang/am/
-- duoi_dinh_muc) nên /ton-kho?ton=duoi_dinh_muc đáp ứng TQAN-02 mà không cần
-- RPC riêng (05-PATTERNS.md Đính chính #2).
--
-- KHÔNG có cột giá vốn, KHÔNG có cột giá trị tồn (D-02) — hàm này không tham
-- chiếu san_pham.gia_von ở bất kỳ đâu, nhờ vậy không dính hàng rào quyền cột
-- của migration 0029.
-- =============================================================================

create or replace function public.danh_sach_ton_kho(
  p_tu_khoa text default null,
  p_nhom_hang_id uuid default null,
  p_cong_doan_id uuid default null,
  p_kho_id uuid default null,
  p_trang_thai_ton text default null,
  p_dang_kinh_doanh boolean default true,
  p_sap_xep text default null,
  p_huong text default 'asc',
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table (
  id uuid,
  ma_hang text,
  ten_hang text,
  nhom_hang_id uuid,
  ten_nhom_hang text,
  cong_doan_id uuid,
  ma_cong_doan text,
  ten_cong_doan text,
  mau_cong_doan text,
  ten_dvt text,
  ton_theo_kho jsonb,
  tong_ton numeric,
  ton_toi_thieu numeric,
  dang_kinh_doanh boolean,
  tong_so_dong bigint
)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
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
    -- Gộp tồn theo mã x kho thành một object jsonb {kho_id: so_luong}. Thủ
    -- kho chỉ cộng tồn của kho được phân — hàm tự áp phạm vi ở đây, không
    -- dựa vào RLS (SECURITY DEFINER bỏ qua RLS bên trong thân hàm).
    select tk.san_pham_id,
           jsonb_object_agg(tk.kho_id::text, tk.so_luong) as theo_kho,
           sum(tk.so_luong) as tong
    from public.ton_kho tk
    where (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
      and (p_kho_id is null or tk.kho_id = p_kho_id)
    group by tk.san_pham_id
  ), loc as (
    -- LEFT JOIN bắt buộc: phần lớn mã chưa có dòng ton_kho nào và vẫn phải
    -- hiện với tồn 0, không được rơi khỏi danh sách.
    select sp.*,
           nh.ten as ten_nhom,
           cd.ma as ma_cd, cd.ten as ten_cd, cd.mau_hien_thi,
           dv.ten as ten_dv,
           coalesce(ton.theo_kho, '{}'::jsonb) as theo_kho,
           coalesce(ton.tong, 0) as tong
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
    left join public.don_vi_tinh dv on dv.id = sp.dvt_id
    left join ton on ton.san_pham_id = sp.id
    where (v_tk is null
           or public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
                ilike '%' || public.f_unaccent(v_tk) || '%'
           or public.f_unaccent(v_tk) operator(extensions.<%)
                public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
      and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
      and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
      -- Nhánh is null BẮT BUỘC: lớp client map "Tất cả" thành null. Viết
      -- thẳng sp.dang_kinh_doanh = p_dang_kinh_doanh sẽ cho ra unknown ở mọi
      -- dòng khi p_dang_kinh_doanh là null, RPC trả 0 dòng thay vì trả tất cả.
      and (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi,
         l.ten_dv, l.theo_kho, l.tong, l.ton_toi_thieu, l.dang_kinh_doanh,
         count(*) over ()
  from loc l
  where (p_trang_thai_ton is null
         or (p_trang_thai_ton = 'con_hang'      and l.tong > 0)
         or (p_trang_thai_ton = 'het_hang'      and l.tong = 0)
         or (p_trang_thai_ton = 'am'            and l.tong < 0)
         or (p_trang_thai_ton = 'duoi_dinh_muc' and l.tong < l.ton_toi_thieu))
  order by
    case when p_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when p_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when p_sap_xep = 'ten_hang' and p_huong = 'asc'  then l.ten_hang end asc,
    case when p_sap_xep = 'ten_hang' and p_huong = 'desc' then l.ten_hang end desc,
    case when p_sap_xep = 'tong_ton' and p_huong = 'asc'  then l.tong end asc,
    case when p_sap_xep = 'tong_ton' and p_huong = 'desc' then l.tong end desc,
    case when p_sap_xep = 'ma_hang'  and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

revoke all    on function public.danh_sach_ton_kho(text, uuid, uuid, uuid, text, boolean, text, text, int, int) from public, anon;
grant execute on function public.danh_sach_ton_kho(text, uuid, uuid, uuid, text, boolean, text, text, int, int) to authenticated;
comment on function public.danh_sach_ton_kho(text, uuid, uuid, uuid, text, boolean, text, text, int, int) is
  'Nguồn dữ liệu duy nhất của màn tồn kho (TON-01) và bộ lọc dưới định mức (TQAN-02). Một dòng mỗi mã hàng; pivot theo kho nằm ở cột ton_theo_kho (jsonb, khóa là kho_id dạng text, giá trị là số lượng). Không có cột giá vốn hay giá trị tồn ở đợt này (D-02). Thủ kho chỉ cộng tồn của kho được phân — hàm tự áp phạm vi, không dựa vào RLS.';
