-- 0134: Phân quyền theo nhóm hàng — PR 3/4: lọc danh mục, tìm mã, tồn kho.
--
-- Các hàm SECURITY DEFINER dưới đây bỏ qua RLS nên phải tự lọc theo nhom_hang_duoc_xem()
-- (0132). Thân hàm chép NGUYÊN từ định nghĩa đang chạy (lấy bằng pg_get_functiondef),
-- chỉ thêm các dòng đánh dấu "-- 0134"; chữ ký, quyền và mọi kiểm tra cũ giữ nguyên.
-- Migration sau ghi đè các hàm này phải giữ phần lọc nhóm.
--
--   danh_sach_san_pham, danh_sach_ton_kho, ton_theo_nhom, khong_luan_chuyen  → bỏ mã nhóm khác
--   chi_tiet_san_pham, the_kho_san_pham                                      → rỗng như mã không tồn tại
--   goi_y_ma_trung                                                           → chỉ gợi ý mã cùng phạm vi
--
-- Không cần vá: tim_san_pham và tim_kiem_toan_cuc là SECURITY INVOKER — RLS san_pham (0132)
-- đã lọc. Đơn đặt / phiếu nhập: PR 4/4.

create or replace function public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_co_anh boolean DEFAULT NULL::boolean, p_quy_chuan text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint, loai_hang text, hang_xe text, dong_xe text, linh_kien text, ghi_chu text, truong_chon_tay text[], xe_dung_chung jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0134: nhóm hàng được xem, null = tất cả
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
  -- 0128: không có quyền Xem tồn thì lọc / sắp theo tồn cũng không được — nếu không
  -- vẫn suy ra được còn hay hết hàng từ việc mã có nằm trong kết quả lọc.
  v_loc_ton text := case when v_xem_ton then p_trang_thai_ton end;
  v_sap_xep text := case when p_sap_xep = 'tong_ton' and not v_xem_ton then 'ma_hang' else p_sap_xep end;
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
      and (v_nhom is null or sp.nhom_hang_id = any(v_nhom))  -- 0134
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
         case when v_xem_ton then l.tong end, l.cr, l.can_ra_dvt, l.updated_at,
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
    and (v_loc_ton is null
         or (v_loc_ton = 'con_hang'     and l.tong > 0)
         or (v_loc_ton = 'het_hang'     and l.tong = 0)
         or (v_loc_ton = 'am'           and l.tong < 0)
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm
         -- (0067, UAT 05 bài 7).
         or (v_loc_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
  order by
    -- 0126: mã khớp đúng → bắt đầu bằng từ khóa → chứa từ khóa → còn lại (bẫy 15).
    case when v_sap_xep is null and v_tk is not null then
      case when upper(public.f_unaccent(l.ma_hang)) = upper(public.f_unaccent(v_tk)) then 0
           when starts_with(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) then 1
           when strpos(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) > 0 then 2
           else 3 end end asc,
    case when v_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when v_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when v_sap_xep = 'ten_hang'   and p_huong = 'asc'  then l.ten_hang end asc,
    case when v_sap_xep = 'ten_hang'   and p_huong = 'desc' then l.ten_hang end desc,
    case when v_sap_xep = 'tong_ton'   and p_huong = 'asc'  then l.tong end asc,
    case when v_sap_xep = 'tong_ton'   and p_huong = 'desc' then l.tong end desc,
    case when v_sap_xep = 'updated_at' and p_huong = 'asc'  then l.updated_at end asc,
    case when v_sap_xep = 'updated_at' and p_huong = 'desc' then l.updated_at end desc,
    case when v_sap_xep = 'ma_hang'    and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

create or replace function public.danh_sach_ton_kho(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, ten_dvt text, ton_theo_kho jsonb, tong_ton numeric, ton_toi_thieu numeric, dang_kinh_doanh boolean, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0134: nhóm hàng được xem, null = tất cả
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
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
      and (v_nhom is null or sp.nhom_hang_id = any(v_nhom))  -- 0134
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
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm —
         -- khớp isBelowMinimum() ở giao diện (0067, UAT 05 bài 7).
         or (p_trang_thai_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
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

create or replace function public.chi_tiet_san_pham(p_id uuid)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone, duoc_ban_truc_tiep boolean, loai_hang text, hang_xe text, ten_hang_xe text, dong_xe text, ten_dong_xe text, linh_kien text, ten_linh_kien text, ma_xu_ly text, mo_ta text, truong_chon_tay text[], xe_dung_chung jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0134: nhóm hàng được xem, null = tất cả
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
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
         case when v_xem_ton then coalesce(ton.so_luong, 0) end,
         public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra),
         sp.can_ra_dvt, sp.barcode, sp.hinh_anh_url, sp.vi_tri_ke, sp.ghi_chu,
         sp.created_at, sp.updated_at, sp.duoc_ban_truc_tiep,
         sp.loai_hang,
         sp.hang_xe,
         (select m.ten from public.ma_hoa m where m.loai = 'hang' and upper(m.ma) = upper(sp.hang_xe) order by m.thu_tu limit 1),
         sp.dong_xe,
         (select m.ten from public.ma_hoa m where m.loai = 'dong' and upper(m.ma_hang) = upper(sp.hang_xe)
            and upper(m.ma) = upper(sp.dong_xe) order by m.thu_tu limit 1),
         sp.linh_kien,
         (select m.ten from public.ma_hoa m where m.loai = 'linh_kien' and upper(m.ma) = upper(sp.linh_kien) order by m.thu_tu limit 1),
         cd.ma_quy_chuan,
         sp.mo_ta,
         sp.truong_chon_tay,
         sp.xe_dung_chung
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  left join public.kho k on k.id = sp.kho_mac_dinh_id
  left join ton on ton.san_pham_id = sp.id
  where sp.id = p_id
    and (v_nhom is null or sp.nhom_hang_id = any(v_nhom))  -- 0134: mã nhóm khác coi như không tồn tại
  ;
end;
$function$;

create or replace function public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric, ly_do_xuat_am text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;
  -- 0134: mã thuộc nhóm hàng không được xem → thẻ kho rỗng, như mã không tồn tại.
  if not public.xem_duoc_san_pham(p_san_pham_id) then
    return;
  end if;
  return query
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           (((m.ngay at time zone 'Asia/Ho_Chi_Minh')::date
             + (m.created_at at time zone 'Asia/Ho_Chi_Minh')::time)
             at time zone 'Asia/Ho_Chi_Minh')                     as ngay,
           m.kho_id                                               as kho_id,
           k.ten                                                  as ten_kho,
           m.chung_tu_id                                          as chung_tu_id,
           ct.so_ct                                               as so_ct,
           ct.loai_ct::text                                       as loai_ct,
           case
      -- 0102: đối tác nội bộ (mã NB…) giao qua nhân viên → chỉ hiện tên nhân viên.
      when dt.ma ilike 'NB%' and exists (select 1 from public.chung_tu_nguoi_nhan x where x.chung_tu_id = ct.id)
        then (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = ct.id)
      else coalesce(dt.ten, (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = ct.id))
    end                                                     as doi_tac,
           case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
           case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
           case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
           m.la_but_toan_dao                                      as la_but_toan_dao,
           ct.ghi_chu                                             as ghi_chu,
           case when m.so_luong < 0 and not m.la_but_toan_dao
                then ct.ly_do_xuat_am end                         as ly_do_xuat_am,
           (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date         as sx_ngay,
           m.created_at                                           as sx_phu,
           m.id                                                   as sx_id
    from public.kho_movement m
    join public.kho k on k.id = m.kho_id
    left join public.chung_tu ct on ct.id = m.chung_tu_id
    left join public.doi_tac dt on dt.id = ct.doi_tac_id
    where m.san_pham_id = p_san_pham_id
      and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
      and (p_kho_id is null or m.kho_id = p_kho_id)
  ),
  voi_luy_ke as (
    select t.*,
           sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0))
             over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
             as ton_luy_ke
    from tat_ca t
  )
  select v.nguon, v.ngay, v.kho_id, v.ten_kho, v.chung_tu_id, v.so_ct, v.loai_ct,
         v.doi_tac, v.so_luong_nhap, v.so_luong_xuat, v.gia_von_tai_thoi_diem,
         v.la_but_toan_dao, v.ghi_chu, count(*) over (), v.ton_luy_ke,
         v.ly_do_xuat_am
  from voi_luy_ke v
  order by v.sx_ngay desc, v.sx_phu desc, v.sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

create or replace function public.goi_y_ma_trung(p_san_pham_id uuid, p_kho_id uuid, p_gioi_han integer DEFAULT 5)
 RETURNS TABLE(san_pham_id uuid, ma_hang text, ten_hang text, kho_id uuid, ten_kho text, ton numeric, do_giong real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with nguon as (
    select public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang) as chuoi
    from public.san_pham sp
    where sp.id = p_san_pham_id
      and public.xem_duoc_san_pham(p_san_pham_id)  -- 0134
  ), pham_vi as (
    select public.nhom_hang_duoc_xem() as v  -- 0134: tính một lần, không theo dòng
  )
  select sp.id, sp.ma_hang, sp.ten_hang, tk.kho_id, k.ten, tk.so_luong,
         extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang))
  from public.san_pham sp
  join public.ton_kho tk on tk.san_pham_id = sp.id
  left join public.kho k on k.id = tk.kho_id
  cross join nguon
  cross join pham_vi
  where sp.id <> p_san_pham_id
    and (pham_vi.v is null or sp.nhom_hang_id = any(pham_vi.v))  -- 0134
    -- 0128: gợi ý dựa trên mã còn tồn — không có quyền Xem tồn thì không gợi ý.
    and public.co_quyen('xem_ton_kho')
    and sp.dang_kinh_doanh
    -- Chỉ trả mã đang còn tồn — gợi ý mã hết tồn không giúp giải quyết xuất âm.
    and tk.so_luong > 0
    and (p_kho_id is null or tk.kho_id = p_kho_id)
    and nguon.chuoi operator(extensions.<%) public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)
  order by
    extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)) desc,
    tk.so_luong desc
  limit greatest(coalesce(p_gioi_han, 5), 1);
$function$;

create or replace function public.khong_luan_chuyen(p_so_ngay integer DEFAULT 30, p_gioi_han integer DEFAULT 10, p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(san_pham_id uuid, ma_hang text, ten_hang text, so_ngay integer, ton numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0134: nhóm hàng được xem, null = tất cả
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay <= 0 then
    raise exception 'Số ngày phải lớn hơn 0' using errcode = '22023';
  end if;

  return query
  select v.san_pham_id, v.ma_hang, v.ten_hang, v.so_ngay, v.ton
  from (
    select sp.id as san_pham_id, sp.ma_hang as ma_hang, sp.ten_hang as ten_hang,
           (p_ngay - (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date)::integer as so_ngay,
           d.tong as ton
    from public.san_pham sp
    join (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
          from public.ton_kho tk group by tk.san_pham_id) d on d.d_sp = sp.id
    where sp.dang_kinh_doanh
      and (v_nhom is null or sp.nhom_hang_id = any(v_nhom))  -- 0134
      and d.tong > 0
      and (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date < p_ngay - p_so_ngay
  ) v
  order by v.so_ngay desc, v.ma_hang
  limit least(greatest(coalesce(p_gioi_han, 10), 1), 100);
end;
$function$;

create or replace function public.ton_theo_nhom(p_theo text, p_kho_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(nhom_id uuid, ten_nhom text, tong_ma bigint, con_hang bigint, het_hang bigint, am bigint, duoi_dinh_muc bigint, tong_so_luong numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0134: nhóm hàng được xem, null = tất cả
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;

  if p_theo is null or p_theo not in ('nhom', 'cong_doan') then
    raise exception 'Tham số p_theo chỉ nhận nhom hoặc cong_doan' using errcode = '22023';
  end if;

  return query
  select v.nhom_id, v.ten_nhom, v.tong_ma, v.con_hang, v.het_hang, v.am, v.duoi_dinh_muc, v.tong_so_luong
  from (
    with ton as (
      select tk.san_pham_id, sum(tk.so_luong) as tong
      from public.ton_kho tk
      where p_kho_id is null or tk.kho_id = p_kho_id
      group by tk.san_pham_id
    ), loc as (
      select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
             coalesce(ton.tong, 0) as tong
      from public.san_pham sp
      left join ton on ton.san_pham_id = sp.id
      where sp.dang_kinh_doanh = true
        and (v_nhom is null or sp.nhom_hang_id = any(v_nhom))  -- 0134
    ), gan as (
      select l.id, l.ton_toi_thieu, l.tong,
             case when p_theo = 'nhom' then l.nhom_hang_id else l.cong_doan_id end as nhom_id
      from loc l
    )
    select
      g.nhom_id as nhom_id,
      case when p_theo = 'nhom' then nh.ten else cd.ten end as ten_nhom,
      count(*) as tong_ma,
      count(*) filter (where g.tong > 0) as con_hang,
      count(*) filter (where g.tong = 0) as het_hang,
      count(*) filter (where g.tong < 0) as am,
      count(*) filter (where g.ton_toi_thieu > 0 and g.tong < g.ton_toi_thieu) as duoi_dinh_muc,
      coalesce(sum(greatest(g.tong, 0)), 0) as tong_so_luong
    from gan g
    left join public.nhom_hang nh on p_theo = 'nhom'      and nh.id = g.nhom_id
    left join public.cong_doan cd on p_theo = 'cong_doan' and cd.id = g.nhom_id
    group by g.nhom_id, nh.ten, cd.ten
  ) v
  order by v.ten_nhom asc nulls last;
end;
$function$;
