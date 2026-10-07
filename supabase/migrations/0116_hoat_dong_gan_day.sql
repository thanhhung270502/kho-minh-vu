-- 0116: "Hoạt động gần đây" trên trang Tổng quan — ai làm gì, lúc nào.
--
-- Không thêm bảng mới: dựng từ dữ liệu đã có.
--   * Đơn đặt: nhat_ky_sua (trigger ghi_nhat_ky_sua) — tạo, sửa, đổi trạng thái
--     (xác nhận / mở khóa / hoàn thành / hủy). Các dòng cùng một lần lưu gộp thành
--     một sự kiện. Dòng đơn (don_dat_hang_dong) không có nhật ký nên sửa dòng chưa hiện.
--   * Chứng từ (nhập, hóa đơn, trả hàng, kiểm kho…): created_at + nguoi_tao (tạo),
--     ngay_ghi_so + nguoi_duyet (ghi sổ), trạng thái Đã hủy + updated_at (hủy — chưa
--     lưu người hủy nên để trống). Phiếu tạo rồi ghi sổ ngay (< 2 phút, vd. Hoàn thành
--     đơn sinh hóa đơn) chỉ hiện sự kiện ghi sổ.
--   * Hàng hóa, đối tác: nhat_ky_sua — thêm / sửa.
--   * Nhiều bản ghi cùng một lần (nhập Excel, ghi sổ hàng loạt) gộp thành một sự kiện
--     có so_luong — không để một lần nhập 800 phiếu đẩy trôi mọi hoạt động khác.
-- Bỏ nguon = 'script' (việc bảo trì dữ liệu, không phải thao tác người dùng).
--
-- p_nhom: null = tất cả | 'don_dat' | 'nhap' | 'xuat' | 'khac' | 'danh_muc'
-- p_truoc: trang sau — lấy sự kiện trước mốc này (thời gian của dòng cuối trang trước).
-- Quyền: như mọi số liệu Tổng quan (co_quyen 'xem_dashboard').

create or replace function public.hoat_dong_gan_day(
  p_nhom text default null,
  p_truoc timestamptz default null,
  p_gioi_han integer default 30
)
returns table(
  thoi_gian timestamptz,
  loai text,
  hanh_dong text,
  doi_tuong_id uuid,
  ma text,
  chi_tiet text,
  so_luong integer,
  nguon text,
  nguoi text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_n integer := least(greatest(coalesce(p_gioi_han, 30), 1), 100);
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền xem Tổng quan' using errcode = '42501';
  end if;
  if p_nhom is not null and p_nhom not in ('don_dat', 'nhap', 'xuat', 'khac', 'danh_muc') then
    raise exception 'Nhóm hoạt động không hợp lệ: %', p_nhom using errcode = '22023';
  end if;

  return query
  with
  -- Đơn đặt: một lần lưu = một sự kiện.
  don_sk as (
    select n.ban_ghi_id, n.sua_luc, n.nguoi_sua_id,
           case
             when bool_or(n.truong = 'trang_thai') then
               case max(case when n.truong = 'trang_thai' then n.gia_tri_moi #>> '{}' end)
                 when 'DA_XAC_NHAN' then 'xac_nhan'
                 when 'TAM'         then 'mo_khoa'
                 when 'HOAN_THANH'  then 'hoan_thanh'
                 when 'DA_HUY'      then 'huy'
                 else 'sua'
               end
             when bool_or(n.truong = '_tao_moi') then 'tao'
             else 'sua'
           end as hanh_dong
    from public.nhat_ky_sua n
    where (p_nhom is null or p_nhom = 'don_dat')
      and n.bang = 'don_dat_hang'
      and n.nguon <> 'script'
      -- Đi kèm trang_thai khi xác nhận — không phải một "sửa" riêng.
      and n.truong not in ('nguoi_xac_nhan_id', 'ngay_xac_nhan', 'updated_at')
      and (p_truoc is null or n.sua_luc < p_truoc)
    group by n.ban_ghi_id, n.sua_luc, n.nguoi_sua_id
    order by n.sua_luc desc
    limit v_n
  ),
  don as (
    select s.sua_luc as thoi_gian, 'DON_DAT'::text as loai, s.hanh_dong, dh.id as doi_tuong_id,
           dh.so_dh as ma,
           coalesce(dt.ten, nn.ten) as chi_tiet,
           1 as so_luong, null::text as nguon, nd.ho_ten as nguoi
    from don_sk s
    join public.don_dat_hang dh on dh.id = s.ban_ghi_id
    left join public.doi_tac dt on dt.id = dh.doi_tac_id
    left join lateral (
      select string_agg(nvp.ten_viet_tat, ', ' order by ddn.thu_tu) as ten
      from public.don_dat_hang_nguoi_nhan ddn
      join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
      where ddn.don_dat_hang_id = dh.id
    ) nn on true
    left join public.nguoi_dung nd on nd.id = s.nguoi_sua_id
  ),
  -- Chứng từ: tạo / ghi sổ / hủy.
  ct_loc as (
    select ct.*
    from public.chung_tu ct
    where p_nhom is null
       or (p_nhom = 'nhap' and ct.loai_ct = 'NHAP')
       or (p_nhom = 'xuat' and ct.loai_ct = 'XUAT')
       or (p_nhom = 'khac' and ct.loai_ct not in ('NHAP', 'XUAT'))
  ),
  ct_tao as (
    select c.created_at as thoi_gian, c.loai_ct::text as loai, 'tao'::text as hanh_dong, c.id, c.so_ct,
           c.doi_tac_id, c.nguoi_tao_id as nguoi_id
    from ct_loc c
    where (p_truoc is null or c.created_at < p_truoc)
      and not (c.ngay_ghi_so is not null and c.ngay_ghi_so - c.created_at < interval '2 minutes')
  ),
  ct_ghi_so as (
    select c.ngay_ghi_so, c.loai_ct::text, 'ghi_so'::text, c.id, c.so_ct, c.doi_tac_id, c.nguoi_duyet_id
    from ct_loc c
    where c.ngay_ghi_so is not null and (p_truoc is null or c.ngay_ghi_so < p_truoc)
  ),
  ct_huy as (
    select c.updated_at, c.loai_ct::text, 'huy'::text, c.id, c.so_ct, c.doi_tac_id, null::uuid
    from ct_loc c
    where c.trang_thai = 'DA_HUY' and (p_truoc is null or c.updated_at < p_truoc)
  ),
  -- Cùng loại + cùng thao tác + cùng người + cùng thời điểm (một transaction: nhập Excel,
  -- ghi sổ hàng loạt) gộp thành một sự kiện có so_luong.
  ct_gop as (
    select e.thoi_gian, e.loai, e.hanh_dong, e.nguoi_id,
           count(*)::integer as so_luong, min(e.id::text)::uuid as mot_id
    from (select * from ct_tao union all select * from ct_ghi_so union all select * from ct_huy) e
    group by e.thoi_gian, e.loai, e.hanh_dong, e.nguoi_id
    -- Gộp TRƯỚC rồi mới cắt trang — cắt trước thì đếm sai số phiếu của một lần.
    order by e.thoi_gian desc
    limit v_n
  ),
  ct as (
    select g.thoi_gian, g.loai, g.hanh_dong,
           case when g.so_luong = 1 then c.id end as doi_tuong_id,
           case when g.so_luong = 1 then c.so_ct end as ma,
           case when g.so_luong = 1 then dt.ten end as chi_tiet,
           g.so_luong, null::text as nguon, nd.ho_ten as nguoi
    from ct_gop g
    left join public.chung_tu c on c.id = g.mot_id
    left join public.doi_tac dt on dt.id = c.doi_tac_id
    left join public.nguoi_dung nd on nd.id = g.nguoi_id
  ),
  -- Hàng hóa, đối tác: thao tác từng bản ghi, rồi gộp các bản ghi cùng một lần lưu.
  dm_ban_ghi as (
    select n.bang, n.ban_ghi_id, n.sua_luc, n.nguoi_sua_id, n.nguon,
           case when bool_or(n.truong = '_tao_moi') then 'tao' else 'sua' end as hanh_dong
    from public.nhat_ky_sua n
    where (p_nhom is null or p_nhom = 'danh_muc')
      and n.bang in ('san_pham', 'doi_tac')
      and n.nguon <> 'script'
      and (p_truoc is null or n.sua_luc < p_truoc)
    group by n.bang, n.ban_ghi_id, n.sua_luc, n.nguoi_sua_id, n.nguon
  ),
  dm_sk as (
    select b.bang, b.sua_luc, b.nguoi_sua_id, b.nguon, b.hanh_dong,
           count(*)::integer as so_luong, min(b.ban_ghi_id::text)::uuid as mot_id
    from dm_ban_ghi b
    group by b.bang, b.sua_luc, b.nguoi_sua_id, b.nguon, b.hanh_dong
    order by b.sua_luc desc
    limit v_n
  ),
  dm as (
    select s.sua_luc, case s.bang when 'san_pham' then 'SAN_PHAM' else 'DOI_TAC' end,
           s.hanh_dong,
           case when s.so_luong = 1 then s.mot_id end,
           case when s.so_luong = 1 then coalesce(sp.ma_hang, dt.ma) end,
           case when s.so_luong = 1 then coalesce(sp.ten_hang, dt.ten) end,
           s.so_luong, s.nguon, nd.ho_ten
    from dm_sk s
    left join public.san_pham sp on s.bang = 'san_pham' and sp.id = s.mot_id
    left join public.doi_tac dt  on s.bang = 'doi_tac'  and dt.id = s.mot_id
    left join public.nguoi_dung nd on nd.id = s.nguoi_sua_id
  )
  select * from (
    select * from don
    union all select * from ct
    union all select * from dm
  ) tat_ca
  order by 1 desc
  limit v_n;
end;
$function$;

revoke all on function public.hoat_dong_gan_day(text, timestamptz, integer) from public, anon;
grant execute on function public.hoat_dong_gan_day(text, timestamptz, integer) to authenticated;
