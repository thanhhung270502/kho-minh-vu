-- =============================================================================
-- 0099 — Phân tích theo kỳ (tuần / tháng / quý / năm) cho tab Phân tích
--
-- Chỉ ĐỌC. Tính từ sổ cái kho_movement (nguyên tắc 2) — ngày movement = ngày
-- chứng từ, nên nhập/xuất/tồn của bất kỳ kỳ nào đều dựng lại được.
--   - Chứng từ ĐÃ HỦY bỏ hẳn (cả movement gốc lẫn bút toán đảo — bút toán đảo
--     mang ngày hủy, giữ lại sẽ dời số sang kỳ khác; hai vế triệt tiêu nhau).
--   - Xuất bán = hóa đơn đối tác (cùng luật phan_tich_ton_kho, 0098); hóa đơn chỉ
--     giao nội bộ (không đối tác, có nhân viên nhận) tách riêng cột xuất nội bộ.
--   - Combo không có movement riêng: xuất ghi ở mã thành phần (0088).
-- Quyền: xem_duoc_phan_tich() như mọi RPC phân tích (0079).
-- =============================================================================

-- Trả MỘT mảng jsonb (một dòng): bảng ~3.300 mã vượt max_rows 1000 của PostgREST,
-- trả tập dòng thì phải gọi lại cả hàm cho mỗi trang (mỗi lần quét cả sổ cái).
drop function if exists public.phan_tich_theo_ky(date, date, uuid);
create function public.phan_tich_theo_ky(
  p_tu date,
  p_den date,
  p_kho_id uuid default null
)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_so_ngay integer;
  v_tu_truoc date;
begin
  if not public.xem_duoc_phan_tich() then
    raise exception 'Tài khoản không có quyền xem phân tích tồn kho' using errcode = '42501';
  end if;
  if p_tu is null or p_den is null or p_den < p_tu or p_den - p_tu > 366 then
    raise exception 'Kỳ phân tích phải có ngày bắt đầu ≤ ngày kết thúc và dài tối đa 1 năm' using errcode = '22023';
  end if;
  v_so_ngay := p_den - p_tu + 1;
  v_tu_truoc := p_tu - v_so_ngay;

  return (
  with mv as (
    select m.san_pham_id as sp_id,
           (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date as ngay,
           m.so_luong as sl,
           ct.loai_ct,
           -- Hóa đơn chỉ giao nội bộ: không đối tác, có nhân viên nhận.
           (ct.loai_ct = 'XUAT' and ct.doi_tac_id is null
              and exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) as noi_bo
    from public.kho_movement m
    join public.chung_tu ct on ct.id = m.chung_tu_id
    where ct.trang_thai <> 'DA_HUY'
      and m.la_but_toan_dao = false
      and (p_kho_id is null or m.kho_id = p_kho_id)
      and (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date <= p_den
  ),
  gop as (
    select mv.sp_id,
           coalesce(sum(mv.sl) filter (where mv.ngay < p_tu), 0) as ton_dau,
           coalesce(sum(mv.sl) filter (where mv.ngay >= p_tu and mv.loai_ct = 'NHAP'), 0) as nhap,
           coalesce(-sum(mv.sl) filter (where mv.ngay >= p_tu and mv.loai_ct = 'XUAT' and not mv.noi_bo), 0) as xuat_ban,
           coalesce(-sum(mv.sl) filter (where mv.ngay >= p_tu and mv.loai_ct = 'XUAT' and mv.noi_bo), 0) as xuat_noi_bo,
           coalesce(sum(mv.sl) filter (where mv.ngay >= p_tu and mv.loai_ct in ('TRA_KHACH', 'TRA_NCC')), 0) as tra,
           coalesce(sum(mv.sl) filter (where mv.ngay >= p_tu
                    and mv.loai_ct in ('DIEU_CHINH', 'KIEM_KE', 'CHUYEN_KHO')), 0) as dieu_chinh,
           coalesce(sum(mv.sl), 0) as ton_cuoi,
           coalesce(sum(mv.sl) filter (where mv.ngay between v_tu_truoc and p_tu - 1 and mv.loai_ct = 'NHAP'), 0) as nhap_truoc,
           coalesce(-sum(mv.sl) filter (where mv.ngay between v_tu_truoc and p_tu - 1
                    and mv.loai_ct = 'XUAT' and not mv.noi_bo), 0) as xuat_ban_truoc
    from mv
    group by mv.sp_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'san_pham_id', sp.id, 'ma_hang', sp.ma_hang, 'ten_hang', sp.ten_hang,
           'nhom_hang_id', sp.nhom_hang_id, 'ten_nhom_hang', nh.ten, 'loai_hang', sp.loai_hang,
           'dang_kinh_doanh', sp.dang_kinh_doanh, 'ten_dvt', dvt.ten,
           'hang_xe', sp.hang_xe, 'dong_xe', sp.dong_xe, 'xe_dung_chung', sp.xe_dung_chung,
           'linh_kien', sp.linh_kien, 'cong_doan_id', sp.cong_doan_id, 'ten_cong_doan', cd.ten,
           'ton_dau', coalesce(g.ton_dau, 0), 'nhap', coalesce(g.nhap, 0),
           'xuat_ban', coalesce(g.xuat_ban, 0), 'xuat_noi_bo', coalesce(g.xuat_noi_bo, 0),
           'tra', coalesce(g.tra, 0), 'dieu_chinh', coalesce(g.dieu_chinh, 0),
           'ton_cuoi', coalesce(g.ton_cuoi, 0),
           'nhap_ky_truoc', coalesce(g.nhap_truoc, 0), 'xuat_ban_ky_truoc', coalesce(g.xuat_ban_truoc, 0)
         ) order by sp.ma_hang), '[]'::jsonb)
  from public.san_pham sp
  left join gop g on g.sp_id = sp.id
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dvt on dvt.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  -- Mã đang kinh doanh, hoặc đã ngừng nhưng còn số trong khoảng thời gian.
  where sp.dang_kinh_doanh or g.sp_id is not null
  );
end;
$$;

revoke all on function public.phan_tich_theo_ky(date, date, uuid) from public, anon;
grant execute on function public.phan_tich_theo_ky(date, date, uuid) to authenticated;

comment on function public.phan_tich_theo_ky(date, date, uuid) is
  'Tab Phân tích: tồn đầu/cuối + nhập, xuất bán, xuất nội bộ, trả, điều chỉnh của từng mã trong [p_tu, p_den], kèm nhập/xuất bán kỳ trước cùng độ dài. Tính từ kho_movement, bỏ chứng từ đã hủy.';

-- --- Chuỗi thời gian cho biểu đồ -----------------------------------------------
-- p_buoc: 'ngay' | 'tuan' (tuần bắt đầu thứ Hai) | 'thang'. p_san_pham_ids null =
-- mọi mã; có danh sách = chỉ các mã đã lọc ở giao diện (hãng/dòng/linh kiện…).
create or replace function public.nhap_xuat_theo_ky(
  p_tu date,
  p_den date,
  p_buoc text,
  p_kho_id uuid default null,
  p_san_pham_ids uuid[] default null
)
returns table (ky date, nhap numeric, xuat_ban numeric, xuat_noi_bo numeric, so_phieu_nhap bigint, so_hoa_don bigint)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  if not public.xem_duoc_phan_tich() then
    raise exception 'Tài khoản không có quyền xem phân tích tồn kho' using errcode = '42501';
  end if;
  if p_buoc not in ('ngay', 'tuan', 'thang') then
    raise exception 'Bước gom phải là ngay, tuan hoặc thang' using errcode = '22023';
  end if;
  if p_tu is null or p_den is null or p_den < p_tu or p_den - p_tu > 366 then
    raise exception 'Kỳ phân tích phải có ngày bắt đầu ≤ ngày kết thúc và dài tối đa 1 năm' using errcode = '22023';
  end if;

  return query
  with mv as (
    select (case p_buoc
              when 'ngay' then (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date
              when 'tuan' then date_trunc('week', (m.ngay at time zone 'Asia/Ho_Chi_Minh'))::date
              else date_trunc('month', (m.ngay at time zone 'Asia/Ho_Chi_Minh'))::date
            end) as ky,
           m.so_luong as sl,
           ct.id as ct_id,
           ct.loai_ct,
           (ct.loai_ct = 'XUAT' and ct.doi_tac_id is null
              and exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) as noi_bo
    from public.kho_movement m
    join public.chung_tu ct on ct.id = m.chung_tu_id
    where ct.trang_thai <> 'DA_HUY'
      and m.la_but_toan_dao = false
      and ct.loai_ct in ('NHAP', 'XUAT')
      and (p_kho_id is null or m.kho_id = p_kho_id)
      and (p_san_pham_ids is null or m.san_pham_id = any(p_san_pham_ids))
      and (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date between p_tu and p_den
  )
  select mv.ky,
         coalesce(sum(mv.sl) filter (where mv.loai_ct = 'NHAP'), 0),
         coalesce(-sum(mv.sl) filter (where mv.loai_ct = 'XUAT' and not mv.noi_bo), 0),
         coalesce(-sum(mv.sl) filter (where mv.loai_ct = 'XUAT' and mv.noi_bo), 0),
         count(distinct mv.ct_id) filter (where mv.loai_ct = 'NHAP'),
         count(distinct mv.ct_id) filter (where mv.loai_ct = 'XUAT' and not mv.noi_bo)
  from mv
  group by mv.ky
  order by mv.ky;
end;
$$;

revoke all on function public.nhap_xuat_theo_ky(date, date, text, uuid, uuid[]) from public, anon;
grant execute on function public.nhap_xuat_theo_ky(date, date, text, uuid, uuid[]) to authenticated;
