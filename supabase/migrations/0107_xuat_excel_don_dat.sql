-- 0107: Dòng Excel của các đơn đặt đang lọc trên màn Đơn đặt — nội dung "file mẫu
-- cập nhật" (đủ thông tin để sửa rồi nhập lại). Bộ lọc giống danh_sach_don (0103).
-- Trả jsonb { tong, dong: [...] } (né giới hạn 1000 dòng của PostgREST); tong >
-- p_toi_da thì dong rỗng. Khóa phần tử là hợp đồng với route handler.

create or replace function public.xuat_excel_don_dat(
  p_trang_thai public.trang_thai_ddh default null,
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
  where (p_trang_thai is null or dh.trang_thai = p_trang_thai)
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

revoke all on function public.xuat_excel_don_dat(public.trang_thai_ddh, uuid, date, date, text, text, uuid, integer) from public, anon;
grant execute on function public.xuat_excel_don_dat(public.trang_thai_ddh, uuid, date, date, text, text, uuid, integer) to authenticated;
