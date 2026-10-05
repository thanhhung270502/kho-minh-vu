-- 0108: Bỏ tiền tố "Nội bộ — " ở cột Người nhận của danh sách chứng từ và thẻ kho:
-- người nhận là nhân viên thì chỉ hiện tên nhân viên, đối tác thì hiện tên đối tác
-- (giao diện bỏ nhãn Nội bộ / Đối tác). Chỉ thay hàm, không đụng dữ liệu.

CREATE OR REPLACE FUNCTION public.danh_sach_chung_tu(p_loai_ct loai_ct DEFAULT NULL::loai_ct, p_trang_thai trang_thai_ct DEFAULT NULL::trang_thai_ct, p_doi_tac_id uuid DEFAULT NULL::uuid, p_kho_id uuid DEFAULT NULL::uuid, p_nguon_nhap nguon_nhap DEFAULT NULL::nguon_nhap, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(id uuid, so_ct text, ngay_ct date, loai_ct loai_ct, nguon_nhap nguon_nhap, trang_thai trang_thai_ct, doi_tac_id uuid, ten_doi_tac text, ten_kho text, so_dong bigint, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text, ngay_ghi_so timestamp with time zone, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select ct.*
    from public.chung_tu ct
    where (p_loai_ct    is null or ct.loai_ct = p_loai_ct)
      and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
      and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
      and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
      and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
      and (
        p_kho_id is null
        or ct.kho_id = p_kho_id
        or exists (select 1 from public.chung_tu_dong d
                   where d.chung_tu_id = ct.id and d.kho_id = p_kho_id)
      )
      and (
        v_vai <> 'thu_kho'
        or ct.kho_id = any(v_kho)
        or ct.kho_den_id = any(v_kho)
        or exists (select 1 from public.chung_tu_dong d
                   where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
      )
      and (
        v_tu_khoa is null
        or ct.so_ct ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = ct.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1
          from public.chung_tu_nguoi_nhan ctn
          join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
          where ctn.chung_tu_id = ct.id
            and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_ct, l.ngay_ct, l.loai_ct, l.nguon_nhap, l.trang_thai,
    l.doi_tac_id,
    case
      -- 0102: đối tác nội bộ (mã NB…) giao qua nhân viên → chỉ hiện tên nhân viên.
      when dt.ma ilike 'NB%' and exists (select 1 from public.chung_tu_nguoi_nhan x where x.chung_tu_id = l.id)
        then (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = l.id)
      else coalesce(dt.ten, (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = l.id))
    end,
    k.ten,
    (select count(*) from public.chung_tu_dong d where d.chung_tu_id = l.id),
    l.tong_so_luong, l.tong_tien,
    nd.ho_ten, l.ngay_ghi_so,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.kho k         on k.id  = l.kho_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_ct desc, l.so_ct desc
  limit greatest(p_kich_thuoc, 1)
  offset greatest(p_trang - 1, 0) * greatest(p_kich_thuoc, 1);
end;
$function$;

CREATE OR REPLACE FUNCTION public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
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
