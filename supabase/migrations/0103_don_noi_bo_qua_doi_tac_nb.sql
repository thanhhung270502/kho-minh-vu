-- 0103: NB001 (Bộ phận điều phối đơn) là đối tác nội bộ.
--   * danh_sach_don trả thêm ma_doi_tac — giao diện cần mã để nhận ra đối tác nội bộ
--     và chỉ hiện tên nhân viên nhận (đổi kiểu trả về nên phải drop rồi tạo lại).
--   * Lọc "Nội bộ" / "Đối tác" (danh_sach_don, dem_don_theo_trang_thai): đơn của đối
--     tác mã NB… có nhân viên nhận xếp vào "Nội bộ".
-- Chỉ thay hàm, không đụng dữ liệu.

drop function if exists public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid);

CREATE FUNCTION public.danh_sach_don(p_trang_thai trang_thai_ddh DEFAULT NULL::trang_thai_ddh, p_doi_tac_id uuid DEFAULT NULL::uuid, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_loai_nhan text DEFAULT NULL::text, p_nguoi_nhan_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, so_dh text, ngay_dh date, trang_thai trang_thai_ddh, ngay_giao_du_kien date, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], so_dong bigint, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text, ghi_chu text, created_at timestamp with time zone, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
           -- 0103: đơn của đối tác nội bộ (mã NB…) có nhân viên nhận tính là "Nội bộ".
           or (p_loai_nhan = 'NOI_BO'
               and (dh.doi_tac_id is null
                    or exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%'))
               -- 0098: đơn tạm chưa chọn người nhận không phải "Nội bộ".
               and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null
               and not (exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%')
                        and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))))
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
    dt.ma, dt.ten,
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
$function$;

revoke all on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid) from public, anon;
grant execute on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dem_don_theo_trang_thai(p_doi_tac_id uuid DEFAULT NULL::uuid, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_loai_nhan text DEFAULT NULL::text, p_nguoi_nhan_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(trang_thai trang_thai_ddh, so_don bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
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
    where (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
      and (p_loai_nhan  is null
           -- 0103: đơn của đối tác nội bộ (mã NB…) có nhân viên nhận tính là "Nội bộ".
           or (p_loai_nhan = 'NOI_BO'
               and (dh.doi_tac_id is null
                    or exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%'))
               -- 0098: đơn tạm chưa chọn người nhận không phải "Nội bộ".
               and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null
               and not (exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%')
                        and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))))
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
  )
  select v.d_tt, coalesce(c.d_so, 0)::bigint
  from unnest(enum_range(null::public.trang_thai_ddh)) as v(d_tt)
  left join (select l.trang_thai as d_tt, count(*) as d_so from loc l group by l.trang_thai) c
    on c.d_tt = v.d_tt
  order by v.d_tt;
end;
$function$;
