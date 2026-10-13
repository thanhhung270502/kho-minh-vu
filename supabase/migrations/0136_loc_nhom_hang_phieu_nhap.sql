-- 0136: Phân quyền theo nhóm hàng — PR 4/4: lọc PHIẾU NHẬP (13/10/2026).
--
-- Chốt với người dùng: chỉ lọc phiếu nhập (đơn đặt trong hệ là đơn của khách — để nguyên);
-- phiếu nhập lẫn nhóm (41% số phiếu) → ẩn dòng nhóm khác, không ẩn cả phiếu.
--
-- Người bị giới hạn (nhom_hang_duoc_xem() không null), với phiếu loai_ct = NHAP:
--   · danh sách / Excel: chỉ phiếu có ít nhất một dòng trong phạm vi (phiếu chưa có dòng vẫn hiện)
--   · chi tiết: dòng nhóm khác bị ẩn; tổng số lượng / tổng tiền chỉ cộng dòng thấy được
--   · phiếu còn dòng nhóm khác: không sửa đầu phiếu, không thêm/sửa/xóa dòng, không ghi sổ,
--     không hủy, không mở sửa — so_dong_an_nhom_hang() > 0
--   · thêm / đổi dòng: chỉ mã trong phạm vi; nhập Excel coi mã ngoài phạm vi là "Không có mã hàng"
-- Phiếu loại khác (hóa đơn, trả hàng, kiểm kê…) và người không bị giới hạn: không đổi gì.
--
-- Thân hàm chép NGUYÊN định nghĩa đang chạy (pg_get_functiondef), chỉ thêm dòng "-- 0136".

-- --- 1. Hàm phạm vi của phiếu nhập ------------------------------------------
-- Số dòng của phiếu NHẬP mà người gọi không được xem. Phiếu loại khác, hoặc người gọi không bị
-- giới hạn → 0. Giao diện dùng để hiện "còn N dòng thuộc nhóm khác" và khóa sửa / hủy.
create or replace function public.so_dong_an_nhom_hang(p_chung_tu_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());
begin
  if v_nhom is null or not public.la_phieu_nhap(p_chung_tu_id) then
    return 0;
  end if;
  return (select count(*)::integer
          from public.chung_tu_dong d
          join public.san_pham sp on sp.id = d.san_pham_id
          where d.chung_tu_id = p_chung_tu_id
            and not coalesce(sp.nhom_hang_id = any(v_nhom), false));
end;
$$;
comment on function public.so_dong_an_nhom_hang(uuid) is
  '0136: số dòng phiếu nhập thuộc nhóm hàng người gọi không được xem (0 nếu không giới hạn / không phải phiếu nhập).';

-- Phiếu nhập hiện với người gọi khi: không bị giới hạn, chưa có dòng, hoặc có ít nhất một dòng trong phạm vi.
create or replace function public.phieu_nhap_trong_pham_vi(p_chung_tu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select v is null
    or not public.la_phieu_nhap(p_chung_tu_id)
    or not exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = p_chung_tu_id)
    or exists (select 1 from public.chung_tu_dong d
               join public.san_pham sp on sp.id = d.san_pham_id
               where d.chung_tu_id = p_chung_tu_id and sp.nhom_hang_id = any(v))
  from (select public.nhom_hang_duoc_xem() as v) x;
$$;
comment on function public.phieu_nhap_trong_pham_vi(uuid) is
  '0136: phiếu (nhập) có hiện với người gọi không — ẩn khi MỌI dòng thuộc nhóm hàng không được xem.';

revoke all on function public.so_dong_an_nhom_hang(uuid) from public, anon;
revoke all on function public.phieu_nhap_trong_pham_vi(uuid) from public, anon;
grant execute on function public.so_dong_an_nhom_hang(uuid) to authenticated, service_role;
grant execute on function public.phieu_nhap_trong_pham_vi(uuid) to authenticated, service_role;

-- --- 2. Hàm đọc / ghi chứng từ ------------------------------------------------
create or replace function public.danh_sach_chung_tu(p_loai_ct loai_ct DEFAULT NULL::loai_ct, p_trang_thai trang_thai_ct DEFAULT NULL::trang_thai_ct, p_doi_tac_id uuid DEFAULT NULL::uuid, p_kho_id uuid DEFAULT NULL::uuid, p_nguon_nhap nguon_nhap DEFAULT NULL::nguon_nhap, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(id uuid, so_ct text, ngay_ct date, loai_ct loai_ct, nguon_nhap nguon_nhap, trang_thai trang_thai_ct, doi_tac_id uuid, ten_doi_tac text, ten_kho text, so_dong bigint, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text, ngay_ghi_so timestamp with time zone, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
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

create or replace function public.chi_tiet_chung_tu(p_id uuid)
 RETURNS TABLE(id uuid, so_ct text, ngay_ct date, loai_ct loai_ct, nguon_nhap nguon_nhap, trang_thai trang_thai_ct, kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text, ghi_chu text, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text, ngay_ghi_so timestamp with time zone, created_at timestamp with time zone, don_dat_hang_id uuid, so_dh text, chung_tu_goc_id uuid, so_ct_goc text, ly_do_xuat_am text, ghi_chu_ly_do text, nguoi_duyet_id uuid, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], ho_ten_nguoi_duyet text, ho_ten_nguoi_xac_nhan_don text, ban_sua_cua_id uuid, so_ct_ban_sua text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0136: null = xem mọi nhóm
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select ct.id, ct.so_ct, ct.ngay_ct, ct.loai_ct, ct.nguon_nhap, ct.trang_thai,
         ct.kho_id, k.ten, ct.doi_tac_id, dt.ma, dt.ten,
         ct.ghi_chu,
         -- 0136: tổng của phiếu nhập chỉ tính các dòng người gọi được xem.
         case when v_nhom is null or ct.loai_ct <> 'NHAP' then ct.tong_so_luong
              else (select coalesce(sum(d.so_luong), 0) from public.chung_tu_dong d
                    where d.chung_tu_id = ct.id and exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom))) end,
         case when v_nhom is null or ct.loai_ct <> 'NHAP' then ct.tong_tien
              else (select coalesce(sum(d.thanh_tien), 0) from public.chung_tu_dong d
                    where d.chung_tu_id = ct.id and exists (select 1 from public.san_pham x where x.id = d.san_pham_id and x.nhom_hang_id = any(v_nhom))) end,
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at,
         ct.don_dat_hang_id, dh.so_dh,
         ct.chung_tu_goc_id, goc.so_ct,
         ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.nguoi_duyet_id,
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
         ndd.ho_ten,
         ndx.ho_ten,
         ct.ban_sua_cua_id, cu.so_ct
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.nguoi_dung ndd on ndd.id = ct.nguoi_duyet_id
  left join lateral (
    select coalesce(array_agg(ctn.nguoi_nhan_id order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = ct.id
  ) nn on true
  left join public.don_dat_hang dh on dh.id = ct.don_dat_hang_id
  left join public.nguoi_dung ndx  on ndx.id = dh.nguoi_xac_nhan_id
  left join public.chung_tu goc   on goc.id = ct.chung_tu_goc_id
  left join public.chung_tu cu    on cu.id = ct.ban_sua_cua_id
  where ct.id = p_id
    and (v_nhom is null or ct.loai_ct <> 'NHAP' or public.phieu_nhap_trong_pham_vi(ct.id))  -- 0136
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d
                 where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    );
end;
$function$;

create or replace function public.dong_chung_tu(p_id uuid)
 RETURNS TABLE(id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text, so_luong numeric, don_gia numeric, thanh_tien numeric, kho_id uuid, ten_kho text, ghi_chu text, ton_hien_tai numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
  v_nhom uuid[] := (select public.nhom_hang_duoc_xem());  -- 0136: null = xem mọi nhóm
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  -- Quyền xem dòng bám theo quyền xem phiếu: hàm trên đã lọc phạm vi kho.
  if not exists (select 1 from public.chi_tiet_chung_tu(p_id)) then
    return;
  end if;

  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong, d.don_gia, d.thanh_tien,
         coalesce(d.kho_id, ct.kho_id), k.ten, d.ghi_chu,
         case when not v_xem_ton then null
              when sp.loai_hang = 'COMBO' then
           coalesce((
             select min(floor(coalesce(t2.so_luong, 0) / tp.so_luong))
             from public.thanh_phan_combo tp
             left join public.ton_kho t2 on t2.san_pham_id = tp.thanh_phan_id
                                        and t2.kho_id = coalesce(d.kho_id, ct.kho_id)
             where tp.combo_id = d.san_pham_id
           ), 0)
         else coalesce(tk.so_luong, 0) end
  from public.chung_tu_dong d
  join public.chung_tu ct       on ct.id = d.chung_tu_id
  join public.san_pham sp       on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k        on k.id = coalesce(d.kho_id, ct.kho_id)
  left join public.ton_kho tk   on tk.san_pham_id = d.san_pham_id
                                and tk.kho_id = coalesce(d.kho_id, ct.kho_id)
  where d.chung_tu_id = p_id
    -- 0136: dòng phiếu nhập thuộc nhóm khác bị ẩn (mã chưa gán nhóm cũng ẩn).
    and (v_nhom is null or ct.loai_ct <> 'NHAP' or coalesce(sp.nhom_hang_id = any(v_nhom), false))
  order by d.created_at, d.id;
end;
$function$;

create or replace function public.xuat_excel_chung_tu(p_loai_ct loai_ct, p_trang_thai trang_thai_ct DEFAULT NULL::trang_thai_ct, p_doi_tac_id uuid DEFAULT NULL::uuid, p_kho_id uuid DEFAULT NULL::uuid, p_nguon_nhap nguon_nhap DEFAULT NULL::nguon_nhap, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_toi_da integer DEFAULT 10000)
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
    and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
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

create or replace function public.nhap_chung_tu_excel(p_loai text, p_kieu text, p_phieu jsonb, p_chi_kiem_tra boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho_dau uuid;
  v_loai_ct public.loai_ct;
  v_moi integer := 0;
  v_sua integer := 0;
  v_so_dong integer := 0;
  v_ket_qua jsonb;
begin
  if p_loai is null or p_loai not in ('DON_DAT', 'HOA_DON', 'PHIEU_NHAP') then
    raise exception 'Loại chứng từ không hợp lệ: %', p_loai using errcode = '22023';
  end if;
  if p_kieu is null or p_kieu not in ('moi', 'cap_nhat') then
    raise exception 'Kiểu nhập không hợp lệ: %', p_kieu using errcode = '22023';
  end if;
  if jsonb_typeof(p_phieu) is distinct from 'array' then
    raise exception 'Dữ liệu phiếu phải là một mảng' using errcode = '22023';
  end if;
  if jsonb_array_length(p_phieu) > 1000 then
    raise exception 'Mỗi lần gửi tối đa 1.000 phiếu' using errcode = '22023';
  end if;

  -- SECURITY DEFINER bỏ qua RLS → kiểm quyền tường minh, khớp policy của bảng.
  if v_vai is null or v_vai = 'chi_xem' then
    raise exception 'Tài khoản không được tạo chứng từ' using errcode = '42501';
  end if;
  if p_loai = 'DON_DAT' and not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;
  if p_loai = 'PHIEU_NHAP' and not public.co_quyen('nhap_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Nhập kho' using errcode = '42501';
  end if;
  -- 0130: nhập hóa đơn từ Excel = lập hóa đơn → quyền Xác nhận / duyệt đơn.
  if p_loai = 'HOA_DON' and not public.co_quyen('xac_nhan_don') then
    raise exception 'Tài khoản chưa có quyền Xác nhận / duyệt đơn' using errcode = '42501';
  end if;

  v_loai_ct := case p_loai when 'HOA_DON' then 'XUAT' when 'PHIEU_NHAP' then 'NHAP' end;
  select k.id into v_kho_dau from public.kho k order by k.ma limit 1;

  drop table if exists _xl_phieu, _xl_dong, _xl_nv, _xl_loi, _xl_khop;

  create temp table _xl_loi (dong integer, so text, loi text, canh_bao boolean not null default false)
    on commit drop;

  create temp table _xl_phieu on commit drop as
  select
    nullif(trim(x->>'so'), '')                 as so,
    coalesce((x->>'dong_dau')::integer, 0)     as dong,
    nullif(x->>'ngay', '')::date               as ngay,
    nullif(x->>'ngay_giao', '')::date          as ngay_giao,
    nullif(x->>'loai_nhan', '')                as loai_nhan,
    nullif(trim(x->>'ma_doi_tac'), '')         as ma_doi_tac,
    nullif(x->>'nguon', '')                    as nguon,
    nullif(trim(x->>'ma_kho'), '')             as ma_kho,
    nullif(trim(x->>'ma_dat_hang'), '')        as ma_dat_hang,
    nullif(trim(x->>'ghi_chu'), '')            as ghi_chu,
    nullif(trim(x->>'ly_do_xuat_am'), '')      as ly_do_xuat_am,
    nullif(trim(x->>'ghi_chu_ly_do'), '')      as ghi_chu_ly_do,
    nullif(trim(x->>'nguoi_nhap'), '')         as nguoi_nhap,
    nullif(trim(x->>'nguoi_ban'), '')          as nguoi_ban,
    jsonb_array_length(coalesce(x->'dong', '[]')) as so_dong_file,
    null::uuid  as id_cu,
    null::date  as ngay_cu,
    null::uuid  as kho_cu,
    null::text  as loai_cu,
    null::text  as trang_thai_cu,
    null::uuid  as doi_tac_id,
    null::uuid  as kho_id,
    null::uuid  as don_id,
    null::uuid  as id_moi
  from jsonb_array_elements(p_phieu) as t(x);

  create temp table _xl_dong on commit drop as
  select
    nullif(trim(p.x->>'so'), '')                as so,
    coalesce((l->>'dong')::integer, 0)          as dong,
    d.thu_tu                                    as thu_tu,
    nullif(trim(l->>'ma_hang'), '')             as ma_hang,
    (l->>'so_luong')::numeric                   as so_luong,
    nullif(trim(l->>'ghi_chu'), '')             as ghi_chu,
    nullif(trim(l->>'nhan_vien'), '')           as nhan_vien,
    null::uuid as san_pham_id,
    null::uuid as kho_mac_dinh,
    null::uuid as nguoi_nhan_id
  from jsonb_array_elements(p_phieu) as p(x),
       jsonb_array_elements(coalesce(p.x->'dong', '[]')) with ordinality as d(l, thu_tu);

  create temp table _xl_nv on commit drop as
  select nullif(trim(p.x->>'so'), '') as so, trim(n.ten) as ten, n.thu_tu, null::uuid as nv_id
  from jsonb_array_elements(p_phieu) as p(x),
       jsonb_array_elements_text(coalesce(p.x->'nhan_vien', '[]')) with ordinality as n(ten, thu_tu)
  where trim(n.ten) <> '';

  -- 0110: phiếu nhập mới để trống Mã NCC → nhà máy Vũ Trụ (NCC000001), như nút Tạo phiếu nhập.
  if p_loai = 'PHIEU_NHAP' and p_kieu = 'moi' then
    update _xl_phieu p set ma_doi_tac = 'NCC000001' where p.ma_doi_tac is null;
  end if;

  -- 0120: đơn đặt / hóa đơn nhập mới không ghi Mã khách hàng lẫn nhân viên nhận →
  -- hóa đơn lấy người nhận của đơn đặt ở cột Mã đặt hàng; còn lại là NB001 (như tạo đơn, 0119).
  if p_loai in ('DON_DAT', 'HOA_DON') and p_kieu = 'moi' then
    if p_loai = 'HOA_DON' then
      update _xl_phieu p set ma_doi_tac = dt.ma, loai_nhan = null
      from public.don_dat_hang dh join public.doi_tac dt on dt.id = dh.doi_tac_id
      where p.ma_doi_tac is null and dh.so_dh = p.ma_dat_hang
        and not exists (select 1 from _xl_nv n where n.so = p.so);
    end if;
    update _xl_phieu p set ma_doi_tac = 'NB001', loai_nhan = null
    where p.ma_doi_tac is null
      and not exists (select 1 from _xl_nv n where n.so = p.so);
  end if;

  -- --- Tra mã -----------------------------------------------------------------
  update _xl_phieu p set doi_tac_id = dt.id
  from public.doi_tac dt where upper(dt.ma) = upper(p.ma_doi_tac);

  update _xl_phieu p set kho_id = k.id
  from public.kho k where upper(k.ma) = upper(p.ma_kho) or lower(k.ten) = lower(p.ma_kho);

  update _xl_dong d set san_pham_id = sp.id, kho_mac_dinh = sp.kho_mac_dinh_id
  from public.san_pham sp where upper(sp.ma_hang) = upper(d.ma_hang);

  -- 0136: phiếu nhập — mã thuộc nhóm hàng không được xem coi như không có (báo "Không có mã hàng").
  if p_loai = 'PHIEU_NHAP' then
    update _xl_dong d set san_pham_id = null, kho_mac_dinh = null
    where d.san_pham_id is not null and not public.xem_duoc_san_pham(d.san_pham_id);
  end if;

  update _xl_nv n set nv_id = nv.id
  from public.nhan_vien_phu_trach nv
  where upper(nv.ten_viet_tat) = upper(n.ten) or upper(nv.ten_day_du) = upper(n.ten);

  -- Dòng ghi đúng một tên nhân viên → người nhận của dòng.
  update _xl_dong d set nguoi_nhan_id = nv.id
  from public.nhan_vien_phu_trach nv
  where upper(nv.ten_viet_tat) = upper(d.nhan_vien) or upper(nv.ten_day_du) = upper(d.nhan_vien);

  if p_loai = 'DON_DAT' then
    update _xl_phieu p set id_cu = dh.id, trang_thai_cu = dh.trang_thai::text, loai_cu = 'DON_DAT'
    from public.don_dat_hang dh where dh.so_dh = p.so;
  else
    update _xl_phieu p set id_cu = ct.id, trang_thai_cu = ct.trang_thai::text, loai_cu = ct.loai_ct::text,
                           ngay_cu = ct.ngay_ct, kho_cu = ct.kho_id
    from public.chung_tu ct where ct.so_ct = p.so;

    update _xl_phieu p set don_id = dh.id
    from public.don_dat_hang dh where dh.so_dh = p.ma_dat_hang;
  end if;

  -- --- Kiểm lỗi ---------------------------------------------------------------
  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Thiếu số phiếu' from _xl_phieu p where p.so is null;

  insert into _xl_loi (dong, so, loi)
  select min(p.dong), p.so, 'Số phiếu ' || p.so || ' lặp lại trong file ở các dòng không liền nhau — gom các dòng của cùng một phiếu lại'
  from _xl_phieu p where p.so is not null group by p.so having count(*) > 1;

  if p_kieu = 'moi' then
    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Số ' || p.so || ' đã có trên hệ thống — dùng "Cập nhật" nếu muốn sửa phiếu này'
    from _xl_phieu p where p.id_cu is not null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Thiếu ngày' from _xl_phieu p where p.ngay is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Phiếu không có dòng hàng nào' from _xl_phieu p where p.so_dong_file = 0;

    if p_loai <> 'PHIEU_NHAP' then
      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Cần Mã khách hàng hoặc tên Nhân viên nhận'
      from _xl_phieu p
      where p.ma_doi_tac is null
        and not exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;
  else
    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Không tìm thấy số ' || p.so || ' — dùng "Nhập mới" để tạo phiếu này'
    from _xl_phieu p where p.so is not null and p.id_cu is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Số ' || p.so || ' là chứng từ loại khác, không phải '
      || case p_loai when 'HOA_DON' then 'hóa đơn' else 'phiếu nhập' end
    from _xl_phieu p
    where p.id_cu is not null and p_loai <> 'DON_DAT' and p.loai_cu <> v_loai_ct::text;

    -- Phiếu đã hủy: bỏ qua (cảnh báo), không chặn cả file — mẫu cập nhật xuất theo
    -- bộ lọc có thể chứa phiếu đã hủy.
    -- 0136: phiếu nhập cũ có dòng thuộc nhóm hàng không được xem → không cho thay.
    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Phiếu ' || p.so || ' có hàng thuộc nhóm hàng bạn không được xem — không sửa được'
    from _xl_phieu p
    where p.id_cu is not null and p_loai = 'PHIEU_NHAP' and public.so_dong_an_nhom_hang(p.id_cu) > 0;

    insert into _xl_loi (dong, so, loi, canh_bao)
    select p.dong, p.so, 'Phiếu ' || p.so || ' đã hủy — bỏ qua, không sửa', true
    from _xl_phieu p where p.trang_thai_cu = 'DA_HUY';
    delete from _xl_dong d using _xl_phieu p where d.so = p.so and p.trang_thai_cu = 'DA_HUY';
    delete from _xl_nv n using _xl_phieu p where n.so = p.so and p.trang_thai_cu = 'DA_HUY';
    delete from _xl_phieu p where p.trang_thai_cu = 'DA_HUY';

    -- Cập nhật chỉ sửa thông tin KHÔNG đụng tồn: ngày (thẻ kho ghi theo ngày phiếu),
    -- kho, mã hàng, số lượng phải giữ nguyên — ô trống = giữ nguyên.
    if p_loai <> 'DON_DAT' then
      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Ngày ' || to_char(p.ngay, 'DD/MM/YYYY') || ' khác ngày phiếu ('
        || to_char(p.ngay_cu, 'DD/MM/YYYY') || ') — Cập nhật không đổi ngày vì thẻ kho ghi theo ngày phiếu'
      from _xl_phieu p where p.id_cu is not null and p.ngay is not null and p.ngay <> p.ngay_cu;

      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Kho "' || p.ma_kho || '" khác kho của phiếu — Cập nhật không đổi kho vì ảnh hưởng tồn'
      from _xl_phieu p where p.id_cu is not null and p.kho_id is not null and p.kho_id <> p.kho_cu;
    end if;

    -- Ghép dòng file với dòng của phiếu theo (mã hàng, lần xuất hiện thứ n).
    if p_loai = 'DON_DAT' then
      create temp table _xl_khop on commit drop as
      with cu as (
        select p.so, x.id as dong_id, x.san_pham_id, x.so_luong_dat as so_luong,
               row_number() over (partition by x.don_dat_hang_id, x.san_pham_id order by x.created_at, x.id) as rn
        from _xl_phieu p join public.don_dat_hang_dong x on x.don_dat_hang_id = p.id_cu
        where p.so_dong_file > 0
      ), moi as (
        select d.so, d.dong, d.san_pham_id, d.so_luong,
               row_number() over (partition by d.so, d.san_pham_id order by d.thu_tu) as rn
        from _xl_dong d where d.san_pham_id is not null
      )
      select coalesce(m.so, c.so) as so, m.dong, coalesce(m.san_pham_id, c.san_pham_id) as san_pham_id,
             m.so_luong as so_luong_file, c.so_luong as so_luong_cu, c.dong_id
      from cu c full join moi m on m.so = c.so and m.san_pham_id = c.san_pham_id and m.rn = c.rn
      where coalesce(m.so, c.so) in (select x.so from _xl_phieu x where x.id_cu is not null);
    else
      create temp table _xl_khop on commit drop as
      with nguon as (
        -- Dòng của phiếu bổ sung "<số>-BS" tính như dòng của chính phiếu đó. UNION thay
        -- cho OR trong điều kiện join: OR làm mất index chung_tu_dong(chung_tu_id).
        select p.so, x.id, x.san_pham_id, x.so_luong, x.created_at, 0 as uu_tien
        from _xl_phieu p join public.chung_tu_dong x on x.chung_tu_id = p.id_cu
        where p.so_dong_file > 0
        union all
        select p.so, x.id, x.san_pham_id, x.so_luong, x.created_at, 1
        from _xl_phieu p
        join public.chung_tu bs on bs.so_ct = p.so || '-BS' and bs.loai_ct = v_loai_ct and bs.trang_thai <> 'DA_HUY'
        join public.chung_tu_dong x on x.chung_tu_id = bs.id
        where p.so_dong_file > 0 and p.id_cu is not null
      ), cu as (
        select n.so, n.id as dong_id, n.san_pham_id, n.so_luong,
               row_number() over (partition by n.so, n.san_pham_id order by n.uu_tien, n.created_at, n.id) as rn
        from nguon n
      ), moi as (
        select d.so, d.dong, d.san_pham_id, d.so_luong,
               row_number() over (partition by d.so, d.san_pham_id order by d.thu_tu) as rn
        from _xl_dong d where d.san_pham_id is not null
      )
      select coalesce(m.so, c.so) as so, m.dong, coalesce(m.san_pham_id, c.san_pham_id) as san_pham_id,
             m.so_luong as so_luong_file, c.so_luong as so_luong_cu, c.dong_id
      from cu c full join moi m on m.so = c.so and m.san_pham_id = c.san_pham_id and m.rn = c.rn
      where coalesce(m.so, c.so) in (select x.so from _xl_phieu x where x.id_cu is not null);
    end if;

    insert into _xl_loi (dong, so, loi)
    select k.dong, k.so, 'Mã ' || sp.ma_hang || ' không có trong phiếu ' || k.so
      || ' — Cập nhật không thêm dòng hàng vì ảnh hưởng tồn'
    from _xl_khop k join public.san_pham sp on sp.id = k.san_pham_id
    where k.dong_id is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, k.so, 'Phiếu ' || k.so || ' có mã ' || sp.ma_hang || ' (SL '
      || trim_scale(k.so_luong_cu)::text || ') nhưng file thiếu dòng này — Cập nhật không bớt dòng hàng. '
      || 'Muốn chỉ sửa đầu phiếu thì xóa trống Mã hàng và Số lượng ở mọi dòng của phiếu'
    from _xl_khop k
    join public.san_pham sp on sp.id = k.san_pham_id
    join _xl_phieu p on p.so = k.so
    where k.dong is null;

    insert into _xl_loi (dong, so, loi)
    select k.dong, k.so, 'Mã ' || sp.ma_hang || ': số lượng ' || trim_scale(k.so_luong_file)::text
      || ' khác phiếu (' || trim_scale(k.so_luong_cu)::text || ') — Cập nhật không đổi số lượng vì ảnh hưởng tồn'
    from _xl_khop k join public.san_pham sp on sp.id = k.san_pham_id
    where k.dong is not null and k.dong_id is not null and k.so_luong_file is distinct from k.so_luong_cu;
  end if;

  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Không có đối tác mã ' || p.ma_doi_tac
  from _xl_phieu p where p.ma_doi_tac is not null and p.doi_tac_id is null;

  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Không có kho "' || p.ma_kho || '" — ghi mã kho (K1, K2) hoặc tên kho'
  from _xl_phieu p where p.ma_kho is not null and p.kho_id is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Không có mã hàng ' || d.ma_hang
  from _xl_dong d where d.ma_hang is not null and d.san_pham_id is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Thiếu mã hàng' from _xl_dong d where d.ma_hang is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Số lượng phải lớn hơn 0'
  from _xl_dong d where d.so_luong is null or d.so_luong <= 0;

  -- --- Cảnh báo (không chặn) -------------------------------------------------
  insert into _xl_loi (dong, so, loi, canh_bao)
  select p.dong, p.so, 'Không tìm thấy đơn đặt ' || p.ma_dat_hang || ' — hóa đơn nhập không gắn đơn', true
  from _xl_phieu p where p.ma_dat_hang is not null and p.don_id is null and p_loai = 'HOA_DON';

  insert into _xl_loi (dong, so, loi, canh_bao)
  select min(d.dong), n.so, 'Không có nhân viên tên "' || n.ten || '" — bỏ qua tên này'
    || case when p_loai = 'DON_DAT' then '' else ', giữ trong ghi chú dòng' end, true
  from _xl_nv n
  left join _xl_dong d on d.so = n.so and upper(d.nhan_vien) like '%' || upper(n.ten) || '%'
  where n.nv_id is null
  group by n.so, n.ten;

  select count(*)::integer into v_so_dong from _xl_dong;

  v_ket_qua := jsonb_build_object(
    'loi', coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong, l.loi)
                     from _xl_loi l where not l.canh_bao), '[]'),
    'canh_bao', coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong, l.loi)
                          from _xl_loi l where l.canh_bao), '[]'),
    'phieu_moi', case when p_kieu = 'moi' then (select count(*) from _xl_phieu) else 0 end,
    'phieu_sua', case when p_kieu = 'cap_nhat' then (select count(*) from _xl_phieu) else 0 end,
    'so_dong', v_so_dong
  );

  if p_chi_kiem_tra or exists (select 1 from _xl_loi where not canh_bao) then
    return v_ket_qua || jsonb_build_object('committed', false);
  end if;

  -- Tên nhân viên không khớp được giữ lại trong ghi chú dòng (hóa đơn / phiếu nhập).
  update _xl_dong d
  set ghi_chu = concat_ws(' · ', d.ghi_chu, 'Nhân viên nhận: ' || d.nhan_vien)
  where d.nhan_vien is not null and d.nguoi_nhan_id is null
    and exists (select 1 from _xl_nv n
                where n.so = d.so and n.nv_id is null and upper(d.nhan_vien) like '%' || upper(n.ten) || '%');

  -- --- Ghi: đơn đặt -------------------------------------------------------------
  if p_loai = 'DON_DAT' then
    if p_kieu = 'moi' then
      insert into public.don_dat_hang (so_dh, ngay_dh, doi_tac_id, ngay_giao_du_kien, ghi_chu)
      select p.so, p.ngay, case when p.loai_nhan = 'NOI_BO' then null else p.doi_tac_id end, p.ngay_giao, p.ghi_chu
      from _xl_phieu p;

      update _xl_phieu p set id_moi = dh.id from public.don_dat_hang dh where dh.so_dh = p.so;
    else
      update public.don_dat_hang dh set
        ngay_dh = coalesce(p.ngay, dh.ngay_dh),
        doi_tac_id = case when p.loai_nhan = 'NOI_BO' then null else coalesce(p.doi_tac_id, dh.doi_tac_id) end,
        ngay_giao_du_kien = coalesce(p.ngay_giao, dh.ngay_giao_du_kien),
        ghi_chu = coalesce(p.ghi_chu, dh.ghi_chu)
      from _xl_phieu p where dh.id = p.id_cu;

      -- "where true": pg_safeupdate chặn UPDATE không WHERE khi gọi qua PostgREST (bẫy 22).
      update _xl_phieu p set id_moi = p.id_cu where true;

      -- Người nhận đơn: file có tên nhân viên thì thêm vào trước (dòng hàng chỉ được
      -- trỏ tới người đã có ở đơn — bất biến D1)...
      insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
      select p.id_moi, n.nv_id, min(n.thu_tu)::integer
      from _xl_nv n join _xl_phieu p on p.so = n.so
      where n.nv_id is not null
      group by p.id_moi, n.nv_id
      on conflict (don_dat_hang_id, nguoi_nhan_id) do update set thu_tu = excluded.thu_tu;

      -- ...rồi đổi người nhận của dòng (số lượng đã kiểm là giữ nguyên)...
      update public.don_dat_hang_dong dd set nguoi_nhan_id = dl.nguoi_nhan_id
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where dd.id = k.dong_id and dl.nguoi_nhan_id is not null;

      -- 0120: ghi chú dòng — ô trống = giữ nguyên.
      update public.don_dat_hang_dong dd set ghi_chu = dl.ghi_chu
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where dd.id = k.dong_id and dl.ghi_chu is not null;

      -- ...cuối cùng bỏ người không còn trong file và không còn dòng nào dùng.
      delete from public.don_dat_hang_nguoi_nhan x
      using _xl_phieu p
      where x.don_dat_hang_id = p.id_moi
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null)
        and not exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id = x.nguoi_nhan_id)
        and not exists (select 1 from public.don_dat_hang_dong dd
                        where dd.don_dat_hang_id = x.don_dat_hang_id and dd.nguoi_nhan_id = x.nguoi_nhan_id);
    end if;

    if p_kieu = 'moi' then
      -- Cùng mã + cùng người nhận trong một đơn thì cộng dồn (như gõ tay, 0094).
      -- 0118/0120: khác ghi chú dòng thì tách dòng.
      insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id, ghi_chu)
      select p.id_moi, d.san_pham_id, sum(d.so_luong), d.nguoi_nhan_id, d.ghi_chu
      from _xl_dong d join _xl_phieu p on p.so = d.so
      group by p.id_moi, d.san_pham_id, d.nguoi_nhan_id, d.ghi_chu;

      insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
      select p.id_moi, n.nv_id, min(n.thu_tu)::integer
      from _xl_nv n join _xl_phieu p on p.so = n.so
      where n.nv_id is not null
      group by p.id_moi, n.nv_id
      on conflict do nothing;
    end if;

    -- Người nhận ở dòng luôn phải có ở đơn (bất biến D1).
    insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
    select dd.don_dat_hang_id, dd.nguoi_nhan_id, 1000
    from public.don_dat_hang_dong dd join _xl_phieu p on p.id_moi = dd.don_dat_hang_id
    where dd.nguoi_nhan_id is not null
    group by dd.don_dat_hang_id, dd.nguoi_nhan_id
    on conflict do nothing;

    if p_kieu = 'moi' then
      insert into public.chuoi_so_dh (nam, so_hien_tai)
      select 0, max(substring(p.so from '^DH(\d+)$')::integer)
      from _xl_phieu p where p.so ~ '^DH\d+$'
      having count(*) > 0
      on conflict (nam)
      do update set so_hien_tai = greatest(public.chuoi_so_dh.so_hien_tai, excluded.so_hien_tai);
    end if;

  -- --- Ghi: hóa đơn / phiếu nhập -------------------------------------------------
  else
    -- Kho đầu phiếu: ô Kho trong file → (hóa đơn) kho mặc định của mã đầu tiên →
    -- kho đầu tiên theo mã (K1 = Kho 1). 0110: phiếu nhập trống Kho → Kho 1.
    update _xl_phieu p set kho_id = coalesce(p.kho_id, case when v_loai_ct = 'XUAT' then (
      select d.kho_mac_dinh from _xl_dong d where d.so = p.so and d.kho_mac_dinh is not null
      order by d.thu_tu limit 1
    ) end, v_kho_dau)
    where p_kieu = 'moi';

    if p_kieu = 'moi' then
      insert into public.chung_tu (
        so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap, don_dat_hang_id,
        ghi_chu, ly_do_xuat_am, ghi_chu_ly_do
      )
      select p.so, v_loai_ct, p.ngay, p.kho_id,
             case when p.loai_nhan = 'NOI_BO' then null else p.doi_tac_id end,
             case when v_loai_ct = 'NHAP' then coalesce(p.nguon, 'NCC')::public.nguon_nhap end,
             p.don_id,
             -- 0122: hóa đơn ghi người duyệt đơn thành đoạn "Người bán: X" như KiotViet.
             nullif(concat_ws(' · ', p.ghi_chu, 'Người nhập: ' || p.nguoi_nhap, 'Người bán: ' || p.nguoi_ban), ''),
             p.ly_do_xuat_am, p.ghi_chu_ly_do
      from _xl_phieu p;

      update _xl_phieu p set id_moi = ct.id from public.chung_tu ct where ct.so_ct = p.so;
    else
      -- Không đổi ngày / kho / dòng hàng: những thứ đó quyết định tồn và thẻ kho.
      update public.chung_tu ct set
        doi_tac_id = case when p.loai_nhan = 'NOI_BO' then null else coalesce(p.doi_tac_id, ct.doi_tac_id) end,
        nguon_nhap = case when v_loai_ct = 'NHAP' then coalesce(p.nguon::public.nguon_nhap, ct.nguon_nhap) else ct.nguon_nhap end,
        don_dat_hang_id = coalesce(p.don_id, ct.don_dat_hang_id),
        -- Phiếu nhập: "Người nhập: X" là một đoạn của ghi chú (nạp từ KiotViet). Ô Ghi chú
        -- phiếu chỉ thay phần còn lại; ô Người nhập trống hoặc trùng người đang hiện
        -- (đoạn trong ghi chú, không có thì người ghi sổ) = giữ nguyên.
        -- 0122: hóa đơn — "Người bán: X" (người duyệt đơn) xử lý y như "Người nhập: X";
        -- người đang hiện = đoạn trong ghi chú, không có thì người xác nhận đơn gốc, rồi người ghi sổ.
        ghi_chu = case when v_loai_ct <> 'NHAP' then nullif(concat_ws(' · ',
          coalesce(p.ghi_chu, public.bo_nguoi_ban(ct.ghi_chu)),
          case
            when p.nguoi_ban is null
              or upper(p.nguoi_ban) = upper(coalesce(public.tach_nguoi_ban(ct.ghi_chu),
                   (select nd.ho_ten from public.don_dat_hang dh join public.nguoi_dung nd on nd.id = dh.nguoi_xac_nhan_id
                    where dh.id = ct.don_dat_hang_id),
                   (select nd.ho_ten from public.nguoi_dung nd where nd.id = ct.nguoi_duyet_id), ''))
            then 'Người bán: ' || public.tach_nguoi_ban(ct.ghi_chu)
            else 'Người bán: ' || p.nguoi_ban
          end), '') else nullif(concat_ws(' · ',
          coalesce(p.ghi_chu, public.bo_nguoi_nhap(ct.ghi_chu)),
          case
            when p.nguoi_nhap is null
              or upper(p.nguoi_nhap) = upper(coalesce(public.tach_nguoi_nhap(ct.ghi_chu),
                   (select nd.ho_ten from public.nguoi_dung nd where nd.id = ct.nguoi_duyet_id), ''))
            then 'Người nhập: ' || public.tach_nguoi_nhap(ct.ghi_chu)
            else 'Người nhập: ' || p.nguoi_nhap
          end), '') end,
        ly_do_xuat_am = coalesce(p.ly_do_xuat_am, ct.ly_do_xuat_am),
        ghi_chu_ly_do = coalesce(p.ghi_chu_ly_do, ct.ghi_chu_ly_do)
      from _xl_phieu p where ct.id = p.id_cu;

      -- "where true": pg_safeupdate chặn UPDATE không WHERE khi gọi qua PostgREST (bẫy 22).
      update _xl_phieu p set id_moi = p.id_cu where true;

      update public.chung_tu_dong d set
        ghi_chu = coalesce(dl.ghi_chu, d.ghi_chu),
        nguoi_nhan_id = coalesce(dl.nguoi_nhan_id, d.nguoi_nhan_id)
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where d.id = k.dong_id;

      -- File có tên nhân viên thì thay tập người nhận của hóa đơn (chèn lại ở dưới).
      delete from public.chung_tu_nguoi_nhan x
      using _xl_phieu p
      where x.chung_tu_id = p.id_moi
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;

    if p_kieu = 'moi' then
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, nguoi_nhan_id)
    select p.id_moi, d.san_pham_id, d.so_luong, 0, 0,
           -- Hóa đơn: kho theo mã (như tạo hóa đơn từ đơn, 0098); phiếu nhập: kho đầu phiếu.
           case when v_loai_ct = 'XUAT' and p.ma_kho is null then coalesce(d.kho_mac_dinh, p.kho_id) else p.kho_id end,
           d.ghi_chu, d.nguoi_nhan_id
    from _xl_dong d join _xl_phieu p on p.so = d.so
    order by p.id_moi, d.thu_tu;

    update public.chung_tu ct
    set tong_so_luong = coalesce((select sum(d.so_luong) from public.chung_tu_dong d where d.chung_tu_id = ct.id), 0)
    from _xl_phieu p where ct.id = p.id_moi;
    end if;

    insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
    select p.id_moi, n.nv_id, min(n.thu_tu)::integer
    from _xl_nv n join _xl_phieu p on p.so = n.so
    where n.nv_id is not null and v_loai_ct = 'XUAT'
    group by p.id_moi, n.nv_id
    on conflict do nothing;

    if p_kieu = 'moi' then
      -- Chỉ NÂNG bộ đếm (như 0098): số tự cấp về sau nối tiếp số lớn nhất trong file.
      insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
      select c.loai_ct, 0, c.nguon, max(substring(p.so from '^' || c.tien_to || '(\d+)$')::integer)
      from public.cau_hinh_so_ct c
      join _xl_phieu p on p.so ~ ('^' || c.tien_to || '\d+$')
      where c.loai_ct = v_loai_ct and not c.theo_nam
      group by c.loai_ct, c.nguon
      on conflict (loai_ct, nam, nguon)
      do update set so_hien_tai = greatest(public.chuoi_so_ct.so_hien_tai, excluded.so_hien_tai);
    end if;
  end if;

  if p_kieu = 'moi' then
    v_moi := (select count(*) from _xl_phieu);
  else
    v_sua := (select count(*) from _xl_phieu);
  end if;

  return v_ket_qua || jsonb_build_object('committed', true, 'phieu_moi', v_moi, 'phieu_sua', v_sua);
end;
$function$;

create or replace function public.ghi_so_chung_tu(p_chung_tu_id uuid)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_dong public.chung_tu_dong;
  v_so_dong integer;
  v_ton_hien_tai numeric(18,4);
  v_tp record;
  v_dong_tp public.chung_tu_dong;
  v_la_combo boolean;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;

  -- 0136: phiếu nhập có dòng thuộc nhóm hàng người gọi không được xem → không thao tác.
  if public.so_dong_an_nhom_hang(p_chung_tu_id) > 0 then
    raise exception 'Phiếu có hàng thuộc nhóm hàng bạn không được xem — nhờ Quản lý/Admin hoặc người phụ trách nhóm đó xử lý'
      using errcode = '42501';
  end if;

  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Chứng từ % đang ở trạng thái %, không ghi sổ lại được', v_ct.so_ct, v_ct.trang_thai
      using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  -- 0083: vai_tro_hien_tai() NULL (tài khoản bị khóa / token lệch bảng) trước
  -- đây lọt qua phép so sánh "= 'chi_xem'". Chỉ bỏ qua khi không có người dùng
  -- (postgres chạy script) — cùng quy ước co_quyen().
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được ghi sổ chứng từ' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'NHAP' and not public.co_quyen('nhap_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Nhập đơn hàng' using errcode = '42501';
  end if;
  -- 0130: hóa đơn và phiếu trả đi theo quyền Xác nhận / duyệt đơn — người chỉ có
  -- Tạo đơn đặt hàng không lập / duyệt / hủy được.
  if v_ct.loai_ct in ('XUAT', 'TRA_KHACH', 'TRA_NCC') and not public.co_quyen('xac_nhan_don') then
    raise exception 'Tài khoản chưa có quyền Xác nhận / duyệt đơn' using errcode = '42501';
  end if;

  -- 0066 (KKE-04, T-06-22/T-06-23, 06-RESEARCH.md §Security Domain): ghi_so_chung_tu
  -- được grant cho MỌI authenticated — một người có quyền ghi sổ thường (mọi vai
  -- trò trừ chi_xem) vẫn gọi thẳng được hàm này cho phiếu KIEM_KE nếu không có cửa
  -- chặn ở đây, bỏ qua toàn bộ kiểm D-07 (còn mã chưa đếm)/D-14 (quyền duyệt) của
  -- duyet_phien_kiem_ke. Cờ kho_minh_vu.duyet_kiem_ke là transaction-local
  -- (set_config ... true) — chỉ duyet_phien_kiem_ke đặt được, và PostgREST không
  -- cho client tự gọi set_config nên không giả được cờ này qua REST. Kiểm
  -- duyet_duoc_kiem_ke() lần hai ở đây là phòng thủ nhiều lớp (defense in depth),
  -- phòng trường hợp có đường gọi nội bộ khác quên đặt cờ đúng cách.
  -- auth.uid() is null (chạy dưới postgres — script/migration/nap_ton_tam nội bộ,
  -- không qua phiên PostgREST) KHÔNG bị chặn: các RPC nội bộ tự gọi
  -- ghi_so_chung_tu cho KIEM_KE (không có trong dự án hiện tại, nhưng để ngỏ) chạy
  -- dưới postgres nên không có JWT, và mọi client PostgREST LUÔN có auth.uid() khi
  -- đã đăng nhập (chưa đăng nhập thì vai_tro_hien_tai() đã null từ khối RLS khác).
  if v_ct.loai_ct = 'KIEM_KE' and auth.uid() is not null
     and (
       coalesce(current_setting('kho_minh_vu.duyet_kiem_ke', true), '') <> 'on'
       or not (select public.duyet_duoc_kiem_ke())
     ) then
    raise exception 'Phiếu kiểm kê chỉ ghi sổ qua nút Duyệt phiên' using errcode = '42501';
  end if;

  select count(*) into v_so_dong from public.chung_tu_dong where chung_tu_id = p_chung_tu_id;
  if v_so_dong = 0 then
    raise exception 'Chứng từ % không có dòng nào, không ghi sổ được', v_ct.so_ct
      using errcode = '23514';
  end if;

  for v_dong in
    select * from public.chung_tu_dong where chung_tu_id = p_chung_tu_id order by created_at, id
  loop
    -- 0088: combo không có tồn riêng. Chỉ phiếu Xuất / Trả NCC / Khách trả
    -- tách combo ra mã thành phần; nhập, chuyển kho, kiểm kê, điều chỉnh làm
    -- theo mã thành phần (nhập combo phải chia giá vốn — không có quy tắc).
    v_la_combo := (select sp.loai_hang = 'COMBO' from public.san_pham sp where sp.id = v_dong.san_pham_id);
    if v_la_combo then
      if v_ct.loai_ct not in ('XUAT', 'TRA_NCC', 'TRA_KHACH') then
        raise exception 'Mã % là combo — % theo từng mã thành phần, không theo mã combo.',
          (select ma_hang from public.san_pham where id = v_dong.san_pham_id),
          case v_ct.loai_ct when 'NHAP' then 'nhập kho' when 'KIEM_KE' then 'kiểm kê'
                            when 'CHUYEN_KHO' then 'chuyển kho' else 'điều chỉnh' end
          using errcode = '23514';
      end if;
      if not exists (select 1 from public.thanh_phan_combo where combo_id = v_dong.san_pham_id) then
        raise exception 'Combo % chưa khai báo mã thành phần — khai ở Danh sách hàng hóa trước khi ghi sổ.',
          (select ma_hang from public.san_pham where id = v_dong.san_pham_id)
          using errcode = '23514';
      end if;
    end if;

    -- Mỗi dòng "thật" đi vào sổ cái: chính dòng đó, hoặc từng mã thành phần
    -- (số lượng x định mức) khi là combo. Bút toán vẫn trỏ về dòng combo
    -- (chung_tu_dong_id) nên huy_chung_tu đảo đúng từng dòng thành phần.
    for v_tp in select * from public._tach_combo(v_dong.san_pham_id, v_dong.so_luong)
    loop
      v_dong_tp := v_dong;
      v_dong_tp.san_pham_id := v_tp.san_pham_id;
      v_dong_tp.so_luong := v_tp.so_luong;

      -- Chặn xuất âm khi chưa chọn lý do.
      if v_ct.loai_ct in ('XUAT','TRA_NCC') and v_ct.ly_do_xuat_am is null then
        select coalesce(so_luong, 0) into v_ton_hien_tai
        from public.ton_kho
        where kho_id = coalesce(v_dong_tp.kho_id, v_ct.kho_id) and san_pham_id = v_dong_tp.san_pham_id;

        if coalesce(v_ton_hien_tai, 0) - v_dong_tp.so_luong < 0 then
          raise exception
            'Xuất quá tồn cho sản phẩm % (tồn %, xuất %). Phải chọn lý do xuất âm trước khi ghi sổ.',
            v_dong_tp.san_pham_id, coalesce(v_ton_hien_tai, 0), v_dong_tp.so_luong
            using errcode = '23514';
        end if;
      end if;

      case v_ct.loai_ct
        when 'NHAP'       then perform public._ghi_so_nhap(v_ct, v_dong_tp);
        when 'XUAT'       then perform public._ghi_so_xuat(v_ct, v_dong_tp);
        when 'TRA_NCC'    then perform public._ghi_so_tra_ncc(v_ct, v_dong_tp);
        when 'TRA_KHACH'  then perform public._ghi_so_tra_khach(v_ct, v_dong_tp);
        when 'CHUYEN_KHO' then perform public._ghi_so_chuyen_kho(v_ct, v_dong_tp);
        when 'KIEM_KE'    then perform public._ghi_so_kiem_ke(v_ct, v_dong_tp);
        when 'DIEU_CHINH' then perform public._ghi_so_dieu_chinh(v_ct, v_dong_tp);
      end case;
    end loop;
  end loop;

  -- KHÔNG bọc vòng lặp trên trong `exception when others` — làm vậy sẽ nuốt lỗi
  -- và phá đúng tính chất atomic cần có. Lỗi ở dòng thứ n phải rollback cả n-1
  -- dòng trước, và transaction ngầm định của RPC lo việc đó.

  update public.chung_tu
  set trang_thai = 'HOAN_THANH',
      ngay_ghi_so = now(),
      nguoi_duyet_id = auth.uid(),
      tong_so_luong = (select coalesce(sum(so_luong),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id),
      tong_tien     = (select coalesce(sum(thanh_tien),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id)
  where id = p_chung_tu_id
  returning * into v_ct;

  -- Đặt SAU khi chứng từ đã HOAN_THANH: subquery bên trong _cap_nhat_tien_do_ddh
  -- lọc trang_thai = 'HOAN_THANH' trên bảng chung_tu, phải thấy đúng chứng từ vừa
  -- ghi sổ này (bug thật đã sửa ở 0051, xem comment gốc).
  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
  end if;

  return v_ct;
end;
$function$;

create or replace function public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;

  -- 0136: phiếu nhập có dòng thuộc nhóm hàng người gọi không được xem → không thao tác.
  if public.so_dong_an_nhom_hang(p_chung_tu_id) > 0 then
    raise exception 'Phiếu có hàng thuộc nhóm hàng bạn không được xem — nhờ Quản lý/Admin hoặc người phụ trách nhóm đó xử lý'
      using errcode = '42501';
  end if;
  if v_ct.trang_thai = 'DA_HUY' then
    raise exception 'Chứng từ % đã hủy rồi', v_ct.so_ct using errcode = '23514';
  end if;
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Phải nhập lý do khi hủy chứng từ' using errcode = '23514';
  end if;
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được hủy chứng từ' using errcode = '42501';
  end if;

  -- 0066: thủ kho không hủy được phiên KIEM_KE của kho khác — áp cho cả phiên
  -- còn NHAP_LIEU (khác NHAP/XUAT/TRA_* vốn không có khái niệm "kho của phiếu"
  -- bị giới hạn ở bước hủy nháp, vì D-02 cho phép kiểm kê chạy song song với
  -- biến động kho khác — hủy nhầm phiên kho khác vẫn là rủi ro cần chặn).
  if v_ct.loai_ct = 'KIEM_KE' and (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ hủy được phiên kiểm kê của kho mình' using errcode = '42501';
  end if;

  -- 0046 mới chặn NHAP; 0051 thêm XUAT/TRA_NCC/TRA_KHACH. 0066 thêm KIEM_KE:
  -- hủy phiên đã duyệt = đảo sổ cái + đảo cả tồn tạm KiotViet vừa nạp lúc duyệt
  -- (D-06) — cùng mức rủi ro như đảo NHAP/XUAT, chỉ quản lý được hủy.
  -- Phiếu còn NHAP_LIEU chưa đụng tồn, người nhập tự hủy được.
  -- CHUYEN_KHO/DIEU_CHINH chưa có giao diện, để nguyên luật cũ, sẽ quyết ở
  -- phase của chúng.
  -- 0083 (QUYEN-01): hủy hóa đơn đã ghi sổ = quyền "Sửa hóa đơn" của chức vụ.
  -- 0130: hóa đơn và phiếu trả đi theo quyền Xác nhận / duyệt đơn — người chỉ có
  -- Tạo đơn đặt hàng không lập / duyệt / hủy được.
  if v_ct.loai_ct in ('XUAT', 'TRA_KHACH', 'TRA_NCC') and not public.co_quyen('xac_nhan_don') then
    raise exception 'Tài khoản chưa có quyền Xác nhận / duyệt đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'XUAT' and v_ct.trang_thai = 'HOAN_THANH' and not public.co_quyen('sua_hoa_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Sửa hóa đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct in ('NHAP','TRA_NCC','TRA_KHACH','KIEM_KE') and v_ct.trang_thai = 'HOAN_THANH'
     and auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được hủy chứng từ đã ghi sổ' using errcode = '42501';
  end if;

  -- Chứng từ mới nhập liệu chưa đụng tồn: hủy thẳng, không sinh bút toán đảo.
  if v_ct.trang_thai = 'NHAP_LIEU' then
    update public.chung_tu
    set trang_thai = 'DA_HUY',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
    where id = p_chung_tu_id
    returning * into v_ct;
    return v_ct;
  end if;

  -- Đã ghi sổ: đảo TỪNG movement. Điều kiện la_but_toan_dao = false tránh đảo
  -- lại chính bút toán đảo nếu hàm bị gọi hai lần.
  for v_mv in
    select * from public.kho_movement
    where chung_tu_id = p_chung_tu_id and la_but_toan_dao = false
  loop
    insert into public.kho_movement (
      ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem,
      chung_tu_id, chung_tu_dong_id, la_but_toan_dao
    ) values (
      now(), v_mv.kho_id, v_mv.san_pham_id, -v_mv.so_luong, v_mv.gia_von_tai_thoi_diem,
      v_mv.chung_tu_id, v_mv.chung_tu_dong_id, true
    );
  end loop;

  update public.chung_tu
  set trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
  where id = p_chung_tu_id
  returning * into v_ct;

  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
    -- 0078: hủy hóa đơn ĐÃ GHI SỔ của đơn -> đơn quay về Đã xác nhận, để hoàn
    -- thành lại hoặc hủy đơn. Trước đây đơn kẹt ở Hoàn thành dù không còn hàng
    -- nào đã xuất (_cap_nhat_tien_do_ddh chỉ đẩy lên, không hạ xuống).
    update public.don_dat_hang
    set trang_thai = 'DA_XAC_NHAN',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || '[hủy hóa đơn ' || v_ct.so_ct || '] ' || p_ly_do
    where id = v_ct.don_dat_hang_id and trang_thai = 'HOAN_THANH';
  end if;

  return v_ct;
end;
$function$;

create or replace function public.mo_sua_chung_tu(p_chung_tu_id uuid, p_ly_do text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
  v_so_cu text;
  v_lan integer;
  v_moi uuid;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;

  -- 0136: phiếu nhập có dòng thuộc nhóm hàng người gọi không được xem → không thao tác.
  if public.so_dong_an_nhom_hang(p_chung_tu_id) > 0 then
    raise exception 'Phiếu có hàng thuộc nhóm hàng bạn không được xem — nhờ Quản lý/Admin hoặc người phụ trách nhóm đó xử lý'
      using errcode = '42501';
  end if;
  if v_ct.loai_ct not in ('XUAT', 'NHAP') then
    raise exception 'Chỉ sửa được hóa đơn và phiếu nhập' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'HOAN_THANH' then
    raise exception 'Phiếu % chưa ghi sổ — sửa thẳng trên phiếu, không cần mở sửa', v_ct.so_ct
      using errcode = '23514';
  end if;
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Phải nhập lý do sửa phiếu' using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS: kiểm quyền tường minh, cùng luật với huy_chung_tu.
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được sửa chứng từ' using errcode = '42501';
  end if;
  if not public.co_quyen('sua_phieu') then
    raise exception 'Tài khoản chưa có quyền Sửa phiếu' using errcode = '42501';
  end if;

  -- 1. Đảo sổ — chỉ movement gốc của phiếu này (phiếu chỉ ghi sổ một lần).
  for v_mv in
    select * from public.kho_movement
    where chung_tu_id = p_chung_tu_id and la_but_toan_dao = false
  loop
    insert into public.kho_movement (
      ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem,
      chung_tu_id, chung_tu_dong_id, la_but_toan_dao
    ) values (
      now(), v_mv.kho_id, v_mv.san_pham_id, -v_mv.so_luong, v_mv.gia_von_tai_thoi_diem,
      v_mv.chung_tu_id, v_mv.chung_tu_dong_id, true
    );
  end loop;

  -- 2. Phiếu cũ nhường số: "<số>-S1", "<số>-S2"... theo số lần đã sửa.
  select count(*) + 1 into v_lan
  from public.chung_tu
  where left(so_ct, length(v_ct.so_ct) + 2) = v_ct.so_ct || '-S'
    and substr(so_ct, length(v_ct.so_ct) + 3) ~ '^[0-9]+$';
  v_so_cu := v_ct.so_ct || '-S' || v_lan;

  update public.chung_tu
  set so_ct = v_so_cu,
      trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Sửa: ' || trim(p_ly_do) || ' (bản sửa giữ số ' || v_ct.so_ct || ')'
  where id = p_chung_tu_id;

  -- 3. Bản sửa: nháp, đúng số cũ, chép đầu phiếu (người nhận nằm ở chung_tu_nguoi_nhan, chép ở dưới). Tổng tính lại khi ghi sổ.
  insert into public.chung_tu (
    so_ct, loai_ct, ngay_ct, kho_id, kho_den_id, doi_tac_id, don_dat_hang_id, chung_tu_goc_id,
    trang_thai, giam_gia, ly_do_xuat_am, ghi_chu_ly_do, ghi_chu, nguoi_tao_id, nguon_nhap,
    pham_vi_nhom_hang, ban_sua_cua_id
  ) values (
    v_ct.so_ct, v_ct.loai_ct, v_ct.ngay_ct, v_ct.kho_id, v_ct.kho_den_id, v_ct.doi_tac_id,
    v_ct.don_dat_hang_id, v_ct.chung_tu_goc_id, 'NHAP_LIEU', v_ct.giam_gia, v_ct.ly_do_xuat_am,
    v_ct.ghi_chu_ly_do, v_ct.ghi_chu, v_ct.nguoi_tao_id, v_ct.nguon_nhap, v_ct.pham_vi_nhom_hang,
    p_chung_tu_id
  )
  returning id into v_moi;

  insert into public.chung_tu_dong (
    chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, so_luong_he_thong, ghi_chu,
    created_at, kho_id, nguoi_nhan_id
  )
  select v_moi, d.san_pham_id, d.so_luong, d.don_gia, d.thanh_tien, d.so_luong_he_thong, d.ghi_chu,
         d.created_at, d.kho_id, d.nguoi_nhan_id
  from public.chung_tu_dong d where d.chung_tu_id = p_chung_tu_id;

  insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
  select v_moi, n.nguoi_nhan_id, n.thu_tu
  from public.chung_tu_nguoi_nhan n where n.chung_tu_id = p_chung_tu_id;

  -- Phiếu trả hàng tham chiếu phiếu gốc đi theo bản sửa.
  update public.chung_tu set chung_tu_goc_id = v_moi where chung_tu_goc_id = p_chung_tu_id;

  return v_moi;
end;
$function$;

-- --- 3. RLS chung_tu / chung_tu_dong (đọc / ghi trực tiếp bảng) ----------------
-- Điều kiện cũ chép nguyên từ pg_policies; chỉ thêm phần "0136".
drop policy "doc chung tu theo pham vi" on public.chung_tu;
create policy "doc chung tu theo pham vi" on public.chung_tu
  for select to authenticated using (
    (((select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro, 'chi_xem'::public.vai_tro]))
     or (((select public.vai_tro_hien_tai()) = 'thu_kho'::public.vai_tro)
         and ((kho_id = any ((select public.kho_hien_tai())::uuid[]))
              or (kho_den_id = any ((select public.kho_hien_tai())::uuid[]))
              or public.phieu_co_dong_thuoc_kho_hien_tai(id))))
    -- 0136
    and ((select public.nhom_hang_duoc_xem()) is null or loai_ct <> 'NHAP' or public.phieu_nhap_trong_pham_vi(id))
  );

drop policy "chi sua chung tu dang nhap lieu" on public.chung_tu;
create policy "chi sua chung tu dang nhap lieu" on public.chung_tu
  for update to authenticated
  using (
    (trang_thai = 'NHAP_LIEU'::public.trang_thai_ct)
    and ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and (loai_ct <> 'KIEM_KE'::public.loai_ct)
    and ((loai_ct <> 'NHAP'::public.loai_ct) or (select public.co_quyen('nhap_kho')))
    and ((loai_ct <> all (array['XUAT'::public.loai_ct, 'TRA_KHACH'::public.loai_ct, 'TRA_NCC'::public.loai_ct])) or (select public.co_quyen('xac_nhan_don')))
    -- 0136: phiếu nhập còn dòng nhóm khác thì không sửa đầu phiếu
    and (loai_ct <> 'NHAP'::public.loai_ct or public.so_dong_an_nhom_hang(id) = 0)
  )
  with check (
    ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and ((loai_ct <> 'NHAP'::public.loai_ct) or (select public.co_quyen('nhap_kho')))
    and ((loai_ct <> all (array['XUAT'::public.loai_ct, 'TRA_KHACH'::public.loai_ct, 'TRA_NCC'::public.loai_ct])) or (select public.co_quyen('xac_nhan_don')))
  );

drop policy "doc dong chung tu theo cha" on public.chung_tu_dong;
create policy "doc dong chung tu theo cha" on public.chung_tu_dong
  for select to authenticated using (
    (exists (select 1 from public.chung_tu ct where ct.id = chung_tu_dong.chung_tu_id))
    -- 0136: dòng phiếu nhập thuộc nhóm khác bị ẩn
    and ((select public.nhom_hang_duoc_xem()) is null
         or not public.la_phieu_nhap(chung_tu_id)
         or san_pham_id in (select sp.id from public.san_pham sp
                            where sp.nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[])))
  );

drop policy "tao dong chung tu tru chi xem" on public.chung_tu_dong;
create policy "tao dong chung tu tru chi xem" on public.chung_tu_dong
  for insert to authenticated with check (
    ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and (not public.la_chung_tu_kiem_ke(chung_tu_id))
    and ((not public.la_phieu_nhap(chung_tu_id)) or (select public.co_quyen('nhap_kho')))
    and ((not public.la_hoa_don_hoac_phieu_tra(chung_tu_id)) or (select public.co_quyen('xac_nhan_don')))
    -- 0136: chỉ thêm mã trong phạm vi, vào phiếu nhập không có dòng nhóm khác
    and ((not public.la_phieu_nhap(chung_tu_id))
         or (public.xem_duoc_san_pham(san_pham_id) and public.so_dong_an_nhom_hang(chung_tu_id) = 0))
  );

drop policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong
  for update to authenticated
  using (
    (exists (select 1 from public.chung_tu ct
             where ct.id = chung_tu_dong.chung_tu_id and ct.trang_thai = 'NHAP_LIEU'::public.trang_thai_ct))
    and ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and (not public.la_chung_tu_kiem_ke(chung_tu_id))
    and ((not public.la_phieu_nhap(chung_tu_id)) or (select public.co_quyen('nhap_kho')))
    and ((not public.la_hoa_don_hoac_phieu_tra(chung_tu_id)) or (select public.co_quyen('xac_nhan_don')))
    -- 0136
    and ((not public.la_phieu_nhap(chung_tu_id)) or public.so_dong_an_nhom_hang(chung_tu_id) = 0)
  )
  with check (
    ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and ((not public.la_phieu_nhap(chung_tu_id)) or (select public.co_quyen('nhap_kho')))
    and ((not public.la_hoa_don_hoac_phieu_tra(chung_tu_id)) or (select public.co_quyen('xac_nhan_don')))
    -- 0136: không đổi sang mã ngoài phạm vi
    and ((not public.la_phieu_nhap(chung_tu_id)) or public.xem_duoc_san_pham(san_pham_id))
  );

drop policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong
  for delete to authenticated using (
    (exists (select 1 from public.chung_tu ct
             where ct.id = chung_tu_dong.chung_tu_id and ct.trang_thai = 'NHAP_LIEU'::public.trang_thai_ct))
    and ((select public.vai_tro_hien_tai()) <> 'chi_xem'::public.vai_tro)
    and (not public.la_chung_tu_kiem_ke(chung_tu_id))
    and ((not public.la_phieu_nhap(chung_tu_id)) or (select public.co_quyen('nhap_kho')))
    and ((not public.la_hoa_don_hoac_phieu_tra(chung_tu_id)) or (select public.co_quyen('xac_nhan_don')))
    -- 0136
    and ((not public.la_phieu_nhap(chung_tu_id)) or public.so_dong_an_nhom_hang(chung_tu_id) = 0)
  );
