-- =============================================================================
-- 0087 — Quy chuẩn mã, phần A: chọn tay, lọc quy chuẩn, điền hàng loạt
--
-- 1. san_pham.truong_chon_tay: trường quy chuẩn người dùng CHỌN TAY (mã không
--    tách ra được giá trị đó). Lọc ra mã lệch chuẩn; điền hàng loạt không đụng.
-- 2. danh_sach_san_pham trả thêm cột quy chuẩn + lọc p_quy_chuan
--    ('du' | 'thieu' | 'chon_tay').
-- 3. dien_quy_chuan: điền Hãng/Dòng/Linh kiện/Xử lý tách từ mã (client tách bằng
--    hàm TS — cùng công thức TRA_CUU) cho NHIỀU mã, chỉ lấp ô trống. Xử lý
--    "trống" = công đoạn ngoài quy chuẩn (Mua ngoài, Ép).
-- =============================================================================

alter table public.san_pham
  add column truong_chon_tay text[] not null default '{}'
  check (truong_chon_tay <@ array['hang_xe', 'dong_xe', 'linh_kien', 'xu_ly']);

grant select (truong_chon_tay) on public.san_pham to authenticated;
grant insert (truong_chon_tay) on public.san_pham to authenticated;
grant update (truong_chon_tay) on public.san_pham to authenticated;

-- Nguồn nhật ký mới: điền quy chuẩn hàng loạt. Giữ đủ danh sách cũ (0060).
alter table public.nhat_ky_sua drop constraint nhat_ky_sua_nguon_check;
alter table public.nhat_ky_sua add constraint nhat_ky_sua_nguon_check check (nguon = any (array[
  'form', 'sua_o', 'hang_loat', 'goi_y_duoi', 'import', 'ra_ghi_chu', 'cai_dat', 'script',
  'gia_von_dau_ky', 'dinh_muc', 'quy_chuan'
]));

-- --- dien_quy_chuan ----------------------------------------------------------
-- p_dong: [{id, hang_xe, dong_xe, linh_kien, ma_xu_ly}] — khóa là hợp đồng jsonb.
create or replace function public.dien_quy_chuan(p_dong jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so int;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;
  if p_dong is null or jsonb_typeof(p_dong) <> 'array' then
    raise exception 'Dữ liệu điền quy chuẩn phải là một mảng' using errcode = '23514';
  end if;
  if jsonb_array_length(p_dong) > 1000 then
    raise exception 'Mỗi lần điền tối đa 1.000 mã — chia lô nhỏ hơn' using errcode = '23514';
  end if;

  perform set_config('app.nguon_sua', 'quy_chuan', true);

  with vao as (
    select (e->>'id')::uuid as id,
           nullif(btrim(coalesce(e->>'hang_xe', '')), '') as hang_xe,
           nullif(btrim(coalesce(e->>'dong_xe', '')), '') as dong_xe,
           nullif(btrim(coalesce(e->>'linh_kien', '')), '') as linh_kien,
           (select cd.id from public.cong_doan cd
            where upper(cd.ma_quy_chuan) = upper(nullif(btrim(coalesce(e->>'ma_xu_ly', '')), ''))) as cong_doan_moi
    from jsonb_array_elements(p_dong) e
  ), moi as (
    select sp.id,
           case when nullif(btrim(coalesce(sp.hang_xe, '')), '') is null and not 'hang_xe' = any(sp.truong_chon_tay)
                then coalesce(v.hang_xe, sp.hang_xe) else sp.hang_xe end as hang_xe,
           case when nullif(btrim(coalesce(sp.dong_xe, '')), '') is null and not 'dong_xe' = any(sp.truong_chon_tay)
                then coalesce(v.dong_xe, sp.dong_xe) else sp.dong_xe end as dong_xe,
           case when nullif(btrim(coalesce(sp.linh_kien, '')), '') is null and not 'linh_kien' = any(sp.truong_chon_tay)
                then coalesce(v.linh_kien, sp.linh_kien) else sp.linh_kien end as linh_kien,
           case when cd.ma_quy_chuan is null and not 'xu_ly' = any(sp.truong_chon_tay)
                then coalesce(v.cong_doan_moi, sp.cong_doan_id) else sp.cong_doan_id end as cong_doan_id
    from vao v
    join public.san_pham sp on sp.id = v.id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
  ), doi as (
    update public.san_pham sp
    set hang_xe = m.hang_xe, dong_xe = m.dong_xe, linh_kien = m.linh_kien, cong_doan_id = m.cong_doan_id
    from moi m
    where sp.id = m.id
      and (sp.hang_xe, sp.dong_xe, sp.linh_kien, sp.cong_doan_id)
          is distinct from (m.hang_xe, m.dong_xe, m.linh_kien, m.cong_doan_id)
    returning sp.id
  )
  select count(*) into v_so from doi;

  return jsonb_build_object('so_ma_doi', v_so);
end;
$$;

revoke all    on function public.dien_quy_chuan(jsonb) from public, anon;
grant execute on function public.dien_quy_chuan(jsonb) to authenticated;

-- --- danh_sach_san_pham: cột quy chuẩn + lọc ----------------------------------
drop function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, integer, integer, boolean);

CREATE FUNCTION public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_co_anh boolean DEFAULT NULL::boolean, p_quy_chuan text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint, loai_hang text, hang_xe text, dong_xe text, linh_kien text, ghi_chu text, truong_chon_tay text[])
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
         l.loai_hang, l.hang_xe, l.dong_xe, l.linh_kien, l.ghi_chu, l.truong_chon_tay
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

revoke all    on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, integer, integer, boolean, text) from public, anon;
grant execute on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, integer, integer, boolean, text) to authenticated;

-- --- chi_tiet_san_pham: kèm truong_chon_tay để form biết ô nào chọn tay -------
drop function public.chi_tiet_san_pham(uuid);

CREATE FUNCTION public.chi_tiet_san_pham(p_id uuid)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone, duoc_ban_truc_tiep boolean, loai_hang text, hang_xe text, ten_hang_xe text, dong_xe text, ten_dong_xe text, linh_kien text, ten_linh_kien text, ma_xu_ly text, mo_ta text, truong_chon_tay text[])
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
         sp.truong_chon_tay
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
