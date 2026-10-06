-- 0114: Lọc đơn đặt theo NHIỀU trạng thái cùng lúc (ô tích trên màn Đơn đặt).
-- Mặc định màn hình chọn mọi trạng thái trừ Đã hủy — đơn hủy ẩn đi, tích vào mới hiện.
-- p_trang_thai đổi từ một giá trị sang mảng: null = mọi trạng thái. Đổi kiểu tham số
-- nên drop rồi tạo lại; thân hàm giữ nguyên 0103 / 0107. Chỉ thay hàm, không đụng dữ liệu.

drop function if exists public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text, uuid);
drop function if exists public.xuat_excel_don_dat(public.trang_thai_ddh, uuid, date, date, text, text, uuid, integer);

CREATE FUNCTION public.danh_sach_don(p_trang_thai trang_thai_ddh[] DEFAULT NULL::trang_thai_ddh[], p_doi_tac_id uuid DEFAULT NULL::uuid, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_loai_nhan text DEFAULT NULL::text, p_nguoi_nhan_id uuid DEFAULT NULL::uuid)
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
    where (p_trang_thai is null or dh.trang_thai = any(p_trang_thai))
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

revoke all on function public.danh_sach_don(public.trang_thai_ddh[], uuid, date, date, text, integer, integer, text, uuid) from public, anon;
grant execute on function public.danh_sach_don(public.trang_thai_ddh[], uuid, date, date, text, integer, integer, text, uuid) to authenticated, service_role;

create function public.xuat_excel_don_dat(
  p_trang_thai public.trang_thai_ddh[] default null,
  p_doi_tac_id uuid default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_loai_nhan text default null,
  p_nguoi_nhan_id uuid default null,
  p_toi_da integer default 10000
)
returns jsonb
-- Không STABLE: hàm dựng bảng tạm (plpgsql cấm DDL trong hàm non-volatile).
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_tong integer;
  v_dong jsonb;
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_loai_nhan is not null and p_loai_nhan not in ('DOI_TAC', 'NOI_BO') then
    raise exception 'Loại người nhận không hợp lệ: %', p_loai_nhan using errcode = '22023';
  end if;

  drop table if exists _xd_loc;
  create temp table _xd_loc on commit drop as
  select dh.id, dh.so_dh, dh.ngay_dh, dh.ngay_giao_du_kien, dh.doi_tac_id, dh.ghi_chu
  from public.don_dat_hang dh
  where (p_trang_thai is null or dh.trang_thai = any(p_trang_thai))
    and (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
    and (p_loai_nhan  is null
         or (p_loai_nhan = 'NOI_BO'
             and (dh.doi_tac_id is null
                  or exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%'))
             and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))
         or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null
             and not (exists (select 1 from public.doi_tac nb where nb.id = dh.doi_tac_id and nb.ma ilike 'NB%')
                      and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))))
    and (p_nguoi_nhan_id is null or exists (
          select 1 from public.don_dat_hang_nguoi_nhan ddn
          where ddn.don_dat_hang_id = dh.id and ddn.nguoi_nhan_id = p_nguoi_nhan_id))
    and (p_tu_ngay  is null or dh.ngay_dh >= p_tu_ngay)
    and (p_den_ngay is null or dh.ngay_dh <= p_den_ngay)
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
    );

  select count(*)::integer into v_tong from _xd_loc;
  if v_tong > p_toi_da then
    return jsonb_build_object('tong', v_tong, 'dong', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'so', l.so_dh,
           'ngay', l.ngay_dh,
           'ngay_giao', l.ngay_giao_du_kien,
           'ma_doi_tac', dt.ma,
           'ghi_chu', l.ghi_chu,
           'nv_phieu', nn.ten,
           'ma_hang', sp.ma_hang,
           'so_luong', d.so_luong_dat,
           'nv_dong', nvd.ten_viet_tat
         ) order by l.ngay_dh desc, l.so_dh desc, d.created_at, d.id), '[]'::jsonb)
    into v_dong
  from _xd_loc l
  left join public.doi_tac dt on dt.id = l.doi_tac_id
  left join lateral (
    select string_agg(nvp.ten_viet_tat, ' - ' order by ddn.thu_tu, ddn.nguoi_nhan_id) as ten
    from public.don_dat_hang_nguoi_nhan ddn
    join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
    where ddn.don_dat_hang_id = l.id
  ) nn on true
  left join public.don_dat_hang_dong d on d.don_dat_hang_id = l.id
  left join public.san_pham sp on sp.id = d.san_pham_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id;

  return jsonb_build_object('tong', v_tong, 'dong', v_dong);
end;
$$;

revoke all on function public.xuat_excel_don_dat(public.trang_thai_ddh[], uuid, date, date, text, text, uuid, integer) from public, anon;
grant execute on function public.xuat_excel_don_dat(public.trang_thai_ddh[], uuid, date, date, text, text, uuid, integer) to authenticated;
