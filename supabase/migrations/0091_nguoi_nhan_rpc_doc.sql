-- 0091: đổi các RPC đọc sang bảng nối người nhận (0090).
--
-- Nội bộ = doi_tac_id IS NULL. Người nhận của đơn/hóa đơn nằm ở
-- don_dat_hang_nguoi_nhan / chung_tu_nguoi_nhan (thứ tự thu_tu); cột
-- nguoi_nhan_id cũ trên don_dat_hang/chung_tu ngừng dùng, không hàm nào đọc nữa.
-- Không sửa hoan_thanh_don / ghi_so_chung_tu / dong_chung_tu (0088 nhánh quy chuẩn
-- chỉ gọi tao_phieu_xuat_tu_don theo tên nên hàm này đổi ở đây là đủ).
--
-- Quy ước bí danh (để khối tự kiểm cuối file dò được việc còn đọc cột cũ):
-- bảng nối đơn = ddn, bảng nối hóa đơn = ctn, dòng đơn = d, dòng hóa đơn = ctd.
-- Mọi phép gộp người nhận đều order by thu_tu, nguoi_nhan_id (khóa phụ giữ thứ tự
-- ổn định và hai mảng song song khớp nhau).

-- ============================================================================
-- 1. danh_sach_don — hai mảng người nhận + lọc theo người nhận
-- ============================================================================
drop function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text);

create function public.danh_sach_don(
  p_trang_thai public.trang_thai_ddh default null,
  p_doi_tac_id uuid default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50,
  p_loai_nhan text default null,
  p_nguoi_nhan_id uuid default null
)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh, ngay_giao_du_kien date,
  doi_tac_id uuid, ten_doi_tac text, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[],
  so_dong bigint, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric,
  ho_ten_nguoi_tao text, ghi_chu text, created_at timestamptz, tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kich_thuoc integer := least(greatest(coalesce(p_kich_thuoc, 50), 1), 200);
  v_trang integer := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_loai_nhan is not null and p_loai_nhan not in ('DOI_TAC', 'NOI_BO') then
    raise exception 'Loại người nhận không hợp lệ: %', p_loai_nhan using errcode = '22023';
  end if;

  return query
  with loc as (
    select dh.*
    from public.don_dat_hang dh
    where (p_trang_thai is null or dh.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
      and (p_loai_nhan  is null
           or (p_loai_nhan = 'NOI_BO'  and dh.doi_tac_id is null)
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null))
      -- Cấp đơn đã bao cấp dòng (bất biến D1: người ở dòng luôn có ở đơn).
      and (p_nguoi_nhan_id is null or exists (
            select 1 from public.don_dat_hang_nguoi_nhan ddn
            where ddn.don_dat_hang_id = dh.id and ddn.nguoi_nhan_id = p_nguoi_nhan_id))
      and (p_tu_ngay    is null or dh.ngay_dh >= p_tu_ngay)
      and (p_den_ngay   is null or dh.ngay_dh <= p_den_ngay)
      and (
        v_tu_khoa is null
        or dh.so_dh ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = dh.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1
          from public.don_dat_hang_nguoi_nhan ddn
          join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
          where ddn.don_dat_hang_id = dh.id
            and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_dh, l.ngay_dh, l.trang_thai, l.ngay_giao_du_kien, l.doi_tac_id,
    dt.ten,
    nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
    (select count(*) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_dat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_da_xuat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    nd.ho_ten,
    l.ghi_chu, l.created_at,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join lateral (
    select coalesce(array_agg(ddn.nguoi_nhan_id order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.don_dat_hang_nguoi_nhan ddn
    join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
    where ddn.don_dat_hang_id = l.id
  ) nn on true
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_dh desc, l.so_dh desc
  limit v_kich_thuoc
  offset (v_trang - 1) * v_kich_thuoc;
end;
$$;

revoke all on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid) from public, anon;
grant execute on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid) to authenticated, service_role;

-- ============================================================================
-- 2. chi_tiet_don
-- ============================================================================
drop function public.chi_tiet_don(uuid);

create function public.chi_tiet_don(p_id uuid)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh, ngay_giao_du_kien date,
  doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[],
  ghi_chu text, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric,
  ho_ten_nguoi_tao text, created_at timestamptz, hoa_don_id uuid, so_hoa_don text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select dh.id, dh.so_dh, dh.ngay_dh, dh.trang_thai, dh.ngay_giao_du_kien,
         dh.doi_tac_id, dt.ma, dt.ten,
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
         dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at,
         hd.id, hd.so_ct
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join lateral (
    select coalesce(array_agg(ddn.nguoi_nhan_id order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.don_dat_hang_nguoi_nhan ddn
    join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
    where ddn.don_dat_hang_id = dh.id
  ) nn on true
  left join public.nguoi_dung nd on nd.id = dh.nguoi_tao_id
  -- Một đơn tối đa một hóa đơn chưa hủy (uq_chung_tu_hoa_don_cua_don).
  left join public.chung_tu hd
    on hd.don_dat_hang_id = dh.id and hd.loai_ct = 'XUAT' and hd.trang_thai <> 'DA_HUY'
  where dh.id = p_id;
end;
$$;

revoke all on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated, service_role;

-- ============================================================================
-- 3. dong_don — thêm người nhận của từng dòng (NULL = hàng chung)
-- ============================================================================
drop function public.dong_don(uuid);

create function public.dong_don(p_id uuid)
returns table (
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong_dat numeric, so_luong_da_xuat numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text,
  created_at timestamptz, nguoi_nhan_id uuid, ten_nguoi_nhan text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  -- Quyền xem dòng bám theo quyền xem đơn: hàm trên đã kiểm đăng nhập.
  -- Đúng cách `dong_chung_tu` gọi lại `chi_tiet_chung_tu` ở 0045 — không lặp
  -- logic quyền ở hai nơi.
  if not exists (select 1 from public.chi_tiet_don(p_id)) then
    return;
  end if;

  -- Liệt kê cột san_pham tường minh, KHÔNG chọn nguyên hàng — 0029 đã thu
  -- quyền đọc mức bảng, chọn nguyên hàng trả 42501. kho_mac_dinh_id trả null khi mã chưa gán kho
  -- (4/3.270 mã còn thiếu) — giao diện dùng để chặn đúng chỗ, không đoán kho.
  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong_dat, d.so_luong_da_xuat,
         sp.kho_mac_dinh_id, k.ten,
         d.created_at,
         d.nguoi_nhan_id, nvd.ten_day_du
  from public.don_dat_hang_dong d
  join public.san_pham sp        on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k          on k.id = sp.kho_mac_dinh_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id
  where d.don_dat_hang_id = p_id
  order by d.created_at, d.id;
end;
$$;

revoke all on function public.dong_don(uuid) from public, anon;
grant execute on function public.dong_don(uuid) to authenticated, service_role;

-- ============================================================================
-- 4. chi_tiet_chung_tu
-- ============================================================================
drop function public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct, nguon_nhap public.nguon_nhap,
  trang_thai public.trang_thai_ct, kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text,
  ten_doi_tac text, ghi_chu text, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text,
  ngay_ghi_so timestamptz, created_at timestamptz, don_dat_hang_id uuid, so_dh text,
  chung_tu_goc_id uuid, so_ct_goc text, ly_do_xuat_am text, ghi_chu_ly_do text, nguoi_duyet_id uuid,
  nguoi_nhan_ids uuid[], ten_nguoi_nhan text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select ct.id, ct.so_ct, ct.ngay_ct, ct.loai_ct, ct.nguon_nhap, ct.trang_thai,
         ct.kho_id, k.ten, ct.doi_tac_id, dt.ma, dt.ten,
         ct.ghi_chu, ct.tong_so_luong, ct.tong_tien,
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at,
         ct.don_dat_hang_id, dh.so_dh,
         ct.chung_tu_goc_id, goc.so_ct,
         ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.nguoi_duyet_id,
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join lateral (
    select coalesce(array_agg(ctn.nguoi_nhan_id order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = ct.id
  ) nn on true
  left join public.don_dat_hang dh on dh.id = ct.don_dat_hang_id
  left join public.chung_tu goc   on goc.id = ct.chung_tu_goc_id
  where ct.id = p_id
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d
                 where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    );
end;
$$;

revoke all on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated, service_role;

-- 5. danh_sach_chung_tu
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
    coalesce(dt.ten, (
      select 'Nội bộ — ' || string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
      from public.chung_tu_nguoi_nhan ctn
      join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
      where ctn.chung_tu_id = l.id
    )),
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

-- 6. the_kho_san_pham
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
           coalesce(dt.ten, (
             select 'Nội bộ — ' || string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
             from public.chung_tu_nguoi_nhan ctn
             join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
             where ctn.chung_tu_id = ct.id
           ))                                                     as doi_tac,
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

-- 7. phan_tich_ton_kho, nhip_ban_theo_ngay: 'bán cho đối tác' = có đối tác hoặc (hóa đơn cũ) chưa có người nhận nào
CREATE OR REPLACE FUNCTION public.phan_tich_ton_kho(p_so_ngay integer DEFAULT 30, p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date, p_san_pham_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(san_pham_id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, cong_doan_ma text, ten_dvt text, ton numeric, khach_dat numeric, ton_kha_dung numeric, ban_trong_ky numeric, ban_nua_dau numeric, ban_nua_sau numeric, so_ngay_thuc integer, ban_tb_ngay numeric, so_ngay_con numeric, ngay_het_du_kien date, ton_toi_thieu numeric, ngay_ban_cuoi date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tu date;
  v_dau date;
  v_so_ngay_thuc integer;
  v_giua date;
begin
  if not public.xem_duoc_phan_tich() then
    raise exception 'Tài khoản không có quyền xem phân tích tồn kho' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay not between 1 and 365 then
    raise exception 'Kỳ phân tích phải từ 1 đến 365 ngày' using errcode = '22023';
  end if;

  v_tu := p_ngay - (p_so_ngay - 1);

  -- Hóa đơn đối tác đầu tiên của hệ: kỳ dài hơn dữ liệu đang có thì chia theo
  -- số ngày thật, không chia cho những ngày hệ chưa chạy.
  select min(ct.ngay_ct) into v_dau
  from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
    and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) and ct.ngay_ct <= p_ngay;

  v_so_ngay_thuc := case when v_dau is null then 0 else least(p_so_ngay, p_ngay - v_dau + 1) end;
  -- Mốc chia đôi trên đoạn có dữ liệu thật (biểu đồ nhịp bán: % thay đổi).
  v_giua := p_ngay - (v_so_ngay_thuc - 1) + v_so_ngay_thuc / 2;

  return query
  with ban as (
    -- Hóa đơn đối tác đã ghi sổ trong kỳ.
    select d.san_pham_id as sp_id, ct.ngay_ct as ngay, d.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id))
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
    union all
    -- Khách trả cho hóa đơn đối tác: trừ, theo ngày phiếu trả.
    select d.san_pham_id, ct.ngay_ct, -d.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT' and (goc.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = goc.id))
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
  ),
  ban_ma as (
    select b.sp_id,
           greatest(sum(b.sl), 0) as tong,
           greatest(coalesce(sum(b.sl) filter (where b.ngay < v_giua), 0), 0) as nua_dau,
           greatest(coalesce(sum(b.sl) filter (where b.ngay >= v_giua), 0), 0) as nua_sau
    from ban b
    group by b.sp_id
  ),
  ton_ma as (
    select tk.san_pham_id as sp_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where p_san_pham_id is null or tk.san_pham_id = p_san_pham_id
    group by tk.san_pham_id
  ),
  dat_ma as (
    select dd.san_pham_id as sp_id, sum(greatest(dd.so_luong_dat - dd.so_luong_da_xuat, 0)) as so_luong
    from public.don_dat_hang_dong dd
    join public.don_dat_hang dh on dh.id = dd.don_dat_hang_id
    where dh.trang_thai in ('TAM', 'DA_XAC_NHAN') and dh.doi_tac_id is not null
      and (p_san_pham_id is null or dd.san_pham_id = p_san_pham_id)
    group by dd.san_pham_id
  ),
  cuoi_ma as (
    select d.san_pham_id as sp_id, max(ct.ngay_ct) as ngay
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) and ct.ngay_ct <= p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
    group by d.san_pham_id
  ),
  tinh as (
    select sp.id, sp.ma_hang, sp.ten_hang, sp.nhom_hang_id, nh.ten as ten_nhom, cd.ma as cd_ma,
           dvt.ten as dvt_ten, sp.ton_toi_thieu, sp.dang_kinh_doanh,
           coalesce(t.so_luong, 0) as ton,
           coalesce(dm.so_luong, 0) as dat,
           coalesce(b.tong, 0) as ban,
           coalesce(b.nua_dau, 0) as nua_dau,
           coalesce(b.nua_sau, 0) as nua_sau,
           c.ngay as ban_cuoi,
           case when v_so_ngay_thuc > 0 and coalesce(b.tong, 0) > 0
                then coalesce(b.tong, 0) / v_so_ngay_thuc end as adu
    from public.san_pham sp
    left join public.nhom_hang nh   on nh.id = sp.nhom_hang_id
    left join public.cong_doan cd   on cd.id = sp.cong_doan_id
    left join public.don_vi_tinh dvt on dvt.id = sp.dvt_id
    left join ton_ma t   on t.sp_id = sp.id
    left join dat_ma dm  on dm.sp_id = sp.id
    left join ban_ma b   on b.sp_id = sp.id
    left join cuoi_ma c  on c.sp_id = sp.id
    where p_san_pham_id is null or sp.id = p_san_pham_id
  )
  select x.id, x.ma_hang, x.ten_hang, x.nhom_hang_id, x.ten_nhom, x.cd_ma, x.dvt_ten,
         x.ton, x.dat, x.ton - x.dat,
         x.ban, x.nua_dau, x.nua_sau,
         v_so_ngay_thuc,
         round(x.adu, 4),
         round(greatest(x.ton - x.dat, 0) / x.adu, 2),
         p_ngay + floor(greatest(x.ton - x.dat, 0) / x.adu)::integer,
         x.ton_toi_thieu,
         x.ban_cuoi
  from tinh x
  -- Toàn danh mục: mã đang kinh doanh, hoặc đã ngừng nhưng còn tồn / còn bán.
  where p_san_pham_id is not null or x.dang_kinh_doanh or x.ton <> 0 or x.ban > 0
  order by x.ma_hang;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nhip_ban_theo_ngay(p_so_ngay integer DEFAULT 30, p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(ngay date, so_hoa_don bigint, so_luong numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.xem_duoc_phan_tich() then
    raise exception 'Tài khoản không có quyền xem phân tích tồn kho' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay not between 1 and 365 then
    raise exception 'Kỳ phân tích phải từ 1 đến 365 ngày' using errcode = '22023';
  end if;

  -- Tên cột OUT trùng tên cột bảng gây 42702 (0071) — đặt bí danh khác hẳn.
  return query
  with khung as (
    select g::date as n
    from generate_series(p_ngay - (p_so_ngay - 1), p_ngay, interval '1 day') g
  ),
  dem as (
    select ct.ngay_ct as n, count(distinct ct.id) as hd, sum(d.so_luong) as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id))
      and ct.ngay_ct between p_ngay - (p_so_ngay - 1) and p_ngay
    group by ct.ngay_ct
  )
  select k.n, coalesce(dem.hd, 0), coalesce(dem.sl, 0)
  from khung k
  left join dem on dem.n = k.n
  order by k.n;
end;
$function$;

-- 8. tao_phieu_xuat_tu_don: chép người nhận đơn + dòng sang hóa đơn
CREATE OR REPLACE FUNCTION public.tao_phieu_xuat_tu_don(p_don_id uuid)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_don public.don_dat_hang;
  v_so_dong integer;
  v_ma_thieu_kho text;
  v_so_ct text;
  v_kho_dau_phieu uuid;
  v_ct public.chung_tu;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
    raise exception 'Tài khoản không có quyền tạo phiếu xuất' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_don_id using errcode = '23514';
  end if;

  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, chỉ đơn đã xác nhận mới tạo được phiếu xuất',
      v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  select count(*) into v_so_dong from public.don_dat_hang_dong where don_dat_hang_id = p_don_id;
  if v_so_dong = 0 then
    raise exception 'Đơn % không có dòng nào, không tạo phiếu xuất được', v_don.so_dh
      using errcode = '23514';
  end if;

  select string_agg(sp.ma_hang, ', ' order by sp.ma_hang) into v_ma_thieu_kho
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id and sp.kho_mac_dinh_id is null;

  if v_ma_thieu_kho is not null then
    raise exception 'Mã hàng %  chưa có kho mặc định. Sửa ở Danh mục → mã hàng → kho mặc định rồi tạo lại phiếu.',
      v_ma_thieu_kho
      using errcode = '23514';
  end if;

  v_so_ct := public.sinh_so_ct('XUAT'::public.loai_ct);

  select sp.kho_mac_dinh_id into v_kho_dau_phieu
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id
  limit 1;

  -- Người nhận KHÔNG còn nằm trên chung_tu: chép từ bảng nối của đơn (0090),
  -- giữ nguyên thứ tự. Đơn đối tác có thể kèm nhân viên phụ trách nên hóa đơn
  -- vừa có doi_tac_id vừa có người nhận.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id)
  values (v_so_ct, 'XUAT', v_kho_dau_phieu, v_don.doi_tac_id, v_don.id)
  returning * into v_ct;

  insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
  select v_ct.id, ddn.nguoi_nhan_id, ddn.thu_tu
  from public.don_dat_hang_nguoi_nhan ddn
  where ddn.don_dat_hang_id = p_don_id;

  -- Dòng hóa đơn 1:1 với dòng đơn, mang theo người nhận riêng của dòng (NULL = hàng chung).
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, nguoi_nhan_id)
  select v_ct.id, d.san_pham_id, d.so_luong_dat, 0, 0, sp.kho_mac_dinh_id, d.nguoi_nhan_id
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id;

  update public.chung_tu
  set tong_so_luong = (select coalesce(sum(so_luong), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id)
  where id = v_ct.id;

  select * into v_ct from public.chung_tu where id = v_ct.id;

  return v_ct;
end;
$function$;

-- ============================================================================
-- 9. nguoi_nhan_dong_chung_tu — người nhận theo từng dòng hóa đơn
-- ============================================================================
-- security invoker: RLS của chung_tu_dong (phạm vi kho) tự áp, không lặp logic quyền.
create function public.nguoi_nhan_dong_chung_tu(p_id uuid)
returns table (chung_tu_dong_id uuid, nguoi_nhan_id uuid, ten_nguoi_nhan text)
language sql
stable
security invoker
set search_path = ''
as $$
  select ctd.id, ctd.nguoi_nhan_id, nvp.ten_day_du
  from public.chung_tu_dong ctd
  join public.nhan_vien_phu_trach nvp on nvp.id = ctd.nguoi_nhan_id
  where ctd.chung_tu_id = p_id and ctd.nguoi_nhan_id is not null
  order by ctd.id
$$;

revoke all on function public.nguoi_nhan_dong_chung_tu(uuid) from public, anon;
grant execute on function public.nguoi_nhan_dong_chung_tu(uuid) to authenticated, service_role;

-- ============================================================================
-- Tự kiểm: không hàm public nào còn đọc cột nguoi_nhan_id cũ của đơn/hóa đơn
-- ============================================================================
do $$
declare v_ds text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into v_ds
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosrc ~ '\m(dh|ct|goc|v_don|v_ct)\.nguoi_nhan_id';
  if v_ds is not null then
    raise exception 'Còn hàm đọc cột nguoi_nhan_id cũ: %', v_ds;
  end if;
end;
$$;
