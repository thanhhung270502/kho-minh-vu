-- 0094: Giao diện 3b — số đếm theo trạng thái (UI3B-05) và thêm dòng có cộng dồn (UI3B-06, D-03).
--
-- Không dùng unique index (đơn, mã, người nhận) vì dữ liệu cũ có thể đã trùng;
-- cộng dồn làm bằng RPC khóa đơn FOR UPDATE để hai lần gõ cùng mã đồng thời xếp hàng.

drop function if exists public.dem_don_theo_trang_thai(uuid, date, date, text, text, uuid);
drop function if exists public.them_dong_don(uuid, uuid, numeric, uuid);

-- ============================================================================
-- A. dem_don_theo_trang_thai — cùng bộ lọc danh_sach_don (0091) trừ trạng thái
-- ============================================================================
create function public.dem_don_theo_trang_thai(
  p_doi_tac_id uuid default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_loai_nhan text default null,
  p_nguoi_nhan_id uuid default null
)
returns table (trang_thai public.trang_thai_ddh, so_don bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
           or (p_loai_nhan = 'NOI_BO'  and dh.doi_tac_id is null)
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null))
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
$$;

revoke all on function public.dem_don_theo_trang_thai(uuid, date, date, text, text, uuid) from public, anon;
grant execute on function public.dem_don_theo_trang_thai(uuid, date, date, text, text, uuid) to authenticated, service_role;

comment on function public.dem_don_theo_trang_thai(uuid, date, date, text, text, uuid) is
  'Số đơn theo từng trạng thái (đủ 4, kể cả 0) với đúng bộ lọc của danh_sach_don trừ trạng thái.';

-- ============================================================================
-- B. them_dong_don — thêm dòng, cộng dồn khi trùng (mã, người nhận dòng)
-- ============================================================================
create function public.them_dong_don(
  p_don_id uuid,
  p_san_pham_id uuid,
  p_so_luong numeric,
  p_nguoi_nhan_id uuid default null
)
returns table (dong_id uuid, da_cong_don boolean, so_luong_moi numeric)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_dong uuid;
begin
  if p_so_luong is null or p_so_luong <= 0 then
    raise exception 'Số lượng phải lớn hơn 0' using errcode = '22023';
  end if;
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  -- Điểm tuần tự hóa: hai lần gõ cùng mã đồng thời xếp hàng ở đây. Policy update
  -- đơn (TAM + tao_don) áp lên FOR UPDATE nên người không quyền không thấy hàng.
  perform 1 from public.don_dat_hang d
  where d.id = p_don_id and d.trang_thai = 'TAM'
  for update;
  if not found then
    raise exception 'Đơn không còn là đơn tạm hoặc bạn không có quyền sửa đơn này' using errcode = '42501';
  end if;

  select dd.id into v_dong
  from public.don_dat_hang_dong dd
  where dd.don_dat_hang_id = p_don_id
    and dd.san_pham_id = p_san_pham_id
    and dd.nguoi_nhan_id is not distinct from p_nguoi_nhan_id
  order by dd.created_at, dd.id
  limit 1
  for update;

  if v_dong is not null then
    return query
    update public.don_dat_hang_dong dd
       set so_luong_dat = dd.so_luong_dat + p_so_luong
     where dd.id = v_dong
    returning dd.id, true, dd.so_luong_dat;
  else
    return query
    insert into public.don_dat_hang_dong as dd (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id)
    values (p_don_id, p_san_pham_id, p_so_luong, p_nguoi_nhan_id)
    returning dd.id, false, dd.so_luong_dat;
  end if;
end;
$$;

revoke all on function public.them_dong_don(uuid, uuid, numeric, uuid) from public, anon;
grant execute on function public.them_dong_don(uuid, uuid, numeric, uuid) to authenticated;

comment on function public.them_dong_don(uuid, uuid, numeric, uuid) is
  'D-03: cùng (đơn, mã, người nhận dòng) thì cộng dồn số lượng; is not distinct from để dòng hàng chung (null) cộng với null. Nhiều dòng trùng sẵn thì cộng vào dòng tạo sớm nhất. Chỉ đơn TAM + quyền tao_don (RLS invoker).';
