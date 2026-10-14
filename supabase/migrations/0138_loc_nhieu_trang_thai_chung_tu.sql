-- 0138: Bộ lọc trạng thái của Hóa đơn (/duyet-don) và Nhập hàng (/nhap-hang) làm
-- giống Đơn đặt — tích nhiều trạng thái cùng lúc, có số đếm từng trạng thái.
--
-- A. danh_sach_chung_tu: p_trang_thai đổi từ một giá trị sang MẢNG. Đổi kiểu tham
--    số là đổi chữ ký nên phải drop rồi tạo lại; để hai bản cùng tên sống song song
--    thì PostgREST báo PGRST203 (không chọn được hàm). Thân hàm giữ nguyên bản 0136
--    (lọc nhóm hàng), chỉ đổi đúng một điều kiện trạng thái.
-- B. dem_chung_tu_theo_trang_thai: đếm theo trạng thái với ĐÚNG bộ lọc của
--    danh_sach_chung_tu trừ trạng thái — khuôn dem_don_theo_trang_thai (0094).
--    Hai hàm lặp điều kiện lọc; sửa lọc ở một hàm thì sửa cả hàm kia.
-- C. xuat_excel_chung_tu: nút Excel dùng chung bộ lọc URL — p_trang_thai cũng thành mảng.

-- --- A. danh_sach_chung_tu ----------------------------------------------------
drop function if exists public.danh_sach_chung_tu(
  public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer, integer
);

create function public.danh_sach_chung_tu(
  p_loai_ct public.loai_ct default null,
  p_trang_thai public.trang_thai_ct[] default null,
  p_doi_tac_id uuid default null,
  p_kho_id uuid default null,
  p_nguon_nhap public.nguon_nhap default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct, nguon_nhap public.nguon_nhap,
  trang_thai public.trang_thai_ct, doi_tac_id uuid, ten_doi_tac text, ten_kho text,
  so_dong bigint, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text,
  ngay_ghi_so timestamp with time zone, tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0136: null = xem mọi nhóm
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select ct.*
    from public.chung_tu ct
    where (p_loai_ct    is null or ct.loai_ct = p_loai_ct)
      -- 0138: mảng rỗng coi như không lọc, giống null.
      and (p_trang_thai is null or cardinality(p_trang_thai) = 0 or ct.trang_thai = any(p_trang_thai))
      and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
      and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
      and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
      and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
      -- 0136: phiếu nhập mà mọi dòng thuộc nhóm khác thì ẩn (phiếu chưa có dòng vẫn hiện).
      and (v_nhom is null or ct.loai_ct <> 'NHAP' or public.phieu_nhap_trong_pham_vi(ct.id))
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
    -- 0136: người bị giới hạn chỉ đếm / cộng các dòng mình thấy của phiếu nhập.
    (select count(*) from public.chung_tu_dong d where d.chung_tu_id = l.id
       and (v_nhom is null or l.loai_ct <> 'NHAP' or exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom)))),
    case when v_nhom is null or l.loai_ct <> 'NHAP' then l.tong_so_luong
         else (select coalesce(sum(d.so_luong), 0) from public.chung_tu_dong d
               where d.chung_tu_id = l.id and exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom))) end,
    case when v_nhom is null or l.loai_ct <> 'NHAP' then l.tong_tien
         else (select coalesce(sum(d.thanh_tien), 0) from public.chung_tu_dong d
               where d.chung_tu_id = l.id and exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom))) end,
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

revoke all    on function public.danh_sach_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer, integer) from public, anon;
grant execute on function public.danh_sach_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer, integer) to authenticated, service_role;

comment on function public.danh_sach_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer, integer) is
  'Danh sách chứng từ có lọc + phân trang; p_trang_thai là mảng, null/rỗng = mọi trạng thái (0138).';

-- --- B. dem_chung_tu_theo_trang_thai ------------------------------------------
create function public.dem_chung_tu_theo_trang_thai(
  p_loai_ct public.loai_ct default null,
  p_doi_tac_id uuid default null,
  p_kho_id uuid default null,
  p_nguon_nhap public.nguon_nhap default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null
)
returns table (trang_thai public.trang_thai_ct, so_chung_tu bigint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select ct.trang_thai
    from public.chung_tu ct
    where (p_loai_ct    is null or ct.loai_ct = p_loai_ct)
      and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
      and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
      and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
      and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
      and (v_nhom is null or ct.loai_ct <> 'NHAP' or public.phieu_nhap_trong_pham_vi(ct.id))
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
  )
  select v.d_tt, coalesce(c.d_so, 0)::bigint
  from unnest(enum_range(null::public.trang_thai_ct)) as v(d_tt)
  left join (select l.trang_thai as d_tt, count(*) as d_so from loc l group by l.trang_thai) c
    on c.d_tt = v.d_tt
  order by v.d_tt;
end;
$function$;

revoke all    on function public.dem_chung_tu_theo_trang_thai(public.loai_ct, uuid, uuid, public.nguon_nhap, date, date, text) from public, anon;
grant execute on function public.dem_chung_tu_theo_trang_thai(public.loai_ct, uuid, uuid, public.nguon_nhap, date, date, text) to authenticated, service_role;

comment on function public.dem_chung_tu_theo_trang_thai(public.loai_ct, uuid, uuid, public.nguon_nhap, date, date, text) is
  'Số chứng từ theo từng trạng thái (đủ mọi trạng thái, kể cả 0) với đúng bộ lọc của danh_sach_chung_tu trừ trạng thái (0138).';

-- --- C. xuat_excel_chung_tu ---------------------------------------------------
-- Nút Excel của hai màn đọc CHÍNH bộ lọc trên URL rồi gọi hàm này, nên p_trang_thai
-- cũng phải là mảng. Thân hàm giữ nguyên bản 0136, chỉ đổi điều kiện trạng thái.
drop function if exists public.xuat_excel_chung_tu(
  public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer
);

create function public.xuat_excel_chung_tu(p_loai_ct public.loai_ct, p_trang_thai public.trang_thai_ct[] DEFAULT NULL, p_doi_tac_id uuid DEFAULT NULL::uuid, p_kho_id uuid DEFAULT NULL::uuid, p_nguon_nhap public.nguon_nhap DEFAULT NULL::public.nguon_nhap, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_toi_da integer DEFAULT 10000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_tong integer;
  v_dong jsonb;
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0136: null = xem mọi nhóm
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  drop table if exists _xx_loc;
  create temp table _xx_loc on commit drop as
  select ct.id, ct.so_ct, ct.ngay_ct, ct.kho_id, ct.doi_tac_id, ct.nguon_nhap, ct.don_dat_hang_id,
         ct.ghi_chu, ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.trang_thai, ct.nguoi_tao_id, ct.nguoi_duyet_id
  from public.chung_tu ct
  where ct.loai_ct = p_loai_ct
    -- 0138: mảng, null/rỗng = mọi trạng thái — cùng điều kiện với danh_sach_chung_tu.
    and (p_trang_thai is null or cardinality(p_trang_thai) = 0 or ct.trang_thai = any(p_trang_thai))
    and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
    and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
    and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
    and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
    and (v_nhom is null or ct.loai_ct <> 'NHAP' or public.phieu_nhap_trong_pham_vi(ct.id))  -- 0136
    and (
      p_kho_id is null
      or ct.kho_id = p_kho_id
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = p_kho_id)
    )
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
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
    );

  select count(*)::integer into v_tong from _xx_loc;
  if v_tong > p_toi_da then
    return jsonb_build_object('tong', v_tong, 'dong', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'so', l.so_ct,
           'ngay', l.ngay_ct,
           'ma_dat_hang', dh.so_dh,
           'ma_doi_tac', dt.ma,
           'nguon', l.nguon_nhap,
           'ma_kho', k.ma,
           'ghi_chu', case when p_loai_ct = 'NHAP' then public.bo_nguoi_nhap(l.ghi_chu) else public.bo_nguoi_ban(l.ghi_chu) end,
           'nguoi_nhap', case when p_loai_ct = 'NHAP' then coalesce(public.tach_nguoi_nhap(l.ghi_chu), ndd.ho_ten) end,
           -- 0122: Người duyệt đơn của hóa đơn — cùng thứ tự với màn Duyệt đơn.
           'nguoi_ban', case when p_loai_ct = 'XUAT' then coalesce(public.tach_nguoi_ban(l.ghi_chu), ndx.ho_ten, ndd.ho_ten) end,
           'nguoi_tao', ndt.ho_ten,
           'trang_thai', l.trang_thai,
           'ly_do_xuat_am', l.ly_do_xuat_am,
           'ghi_chu_ly_do', l.ghi_chu_ly_do,
           'nv_phieu', nn.ten,
           'ma_hang', sp.ma_hang,
           'so_luong', d.so_luong,
           'ghi_chu_dong', d.ghi_chu,
           'nv_dong', nvd.ten_viet_tat
         ) order by l.ngay_ct desc, l.so_ct desc, d.created_at, d.id), '[]'::jsonb)
    into v_dong
  from _xx_loc l
  left join public.don_dat_hang dh on dh.id = l.don_dat_hang_id
  left join public.doi_tac dt on dt.id = l.doi_tac_id
  left join public.kho k on k.id = l.kho_id
  left join public.nguoi_dung ndt on ndt.id = l.nguoi_tao_id
  left join public.nguoi_dung ndd on ndd.id = l.nguoi_duyet_id
  left join public.nguoi_dung ndx on ndx.id = dh.nguoi_xac_nhan_id
  left join lateral (
    select string_agg(nvp.ten_viet_tat, ' - ' order by ctn.thu_tu, ctn.nguoi_nhan_id) as ten
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = l.id
  ) nn on true
  left join public.chung_tu_dong d on d.chung_tu_id = l.id
    and (v_nhom is null or p_loai_ct <> 'NHAP' or exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom)))  -- 0136
  left join public.san_pham sp on sp.id = d.san_pham_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id;

  return jsonb_build_object('tong', v_tong, 'dong', v_dong);
end;
$function$;

revoke all    on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer) from public, anon;
grant execute on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer) to authenticated;

comment on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct[], uuid, uuid, public.nguon_nhap, date, date, text, integer) is
  'Xuất Excel hóa đơn / phiếu nhập theo đúng bộ lọc màn danh sách; p_trang_thai là mảng (0138).';
