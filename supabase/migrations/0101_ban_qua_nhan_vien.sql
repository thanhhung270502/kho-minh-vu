-- 0101: Hàng giao qua nhân viên nhận cũng là hàng bán cho khách (nhân viên giao
-- tận tay, chỉ là trên giấy tờ không ghi tên khách). Trước đây hóa đơn "nội bộ"
-- (không đối tác, có nhân viên nhận) bị loại khỏi xuất bán, nhịp bán và số Cần
-- nhập. Từ nay mọi hóa đơn XUAT đã ghi sổ đều tính là bán:
--   * phan_tich_ton_kho, nhip_ban_theo_ngay: bỏ điều kiện "có đối tác hoặc không
--     có nhân viên nhận"
--   * phan_tich_theo_ky, nhap_xuat_theo_ky: cờ noi_bo luôn false — cột
--     xuat_noi_bo giữ trong kết quả (= 0) để không đổi hợp đồng với giao diện.
-- Chỉ thay hàm, không đụng dữ liệu.

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
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH' and ct.ngay_ct <= p_ngay;

  v_so_ngay_thuc := case when v_dau is null then 0 else least(p_so_ngay, p_ngay - v_dau + 1) end;
  -- Mốc chia đôi trên đoạn có dữ liệu thật (biểu đồ nhịp bán: % thay đổi).
  v_giua := p_ngay - (v_so_ngay_thuc - 1) + v_so_ngay_thuc / 2;

  return query
  with dong as (
    -- Dòng hóa đơn đối tác đã ghi sổ tới ngày chốt (cả lịch sử — cuoi_ma cần).
    select ct.ngay_ct as ngay, d.san_pham_id as sp_id, d.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and ct.ngay_ct <= p_ngay
    union all
    -- Khách trả cho hóa đơn đối tác: số âm, theo ngày phiếu trả.
    select ct.ngay_ct, d.san_pham_id, -d.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT'
      and ct.ngay_ct between v_tu and p_ngay
  ),
  dong_mo_rong as (
    -- Như _ma_ban_ra: chính mã đó + (nếu là combo) từng thành phần × số lượng.
    select g.ngay, g.sp_id, g.sl from dong g
    union all
    select g.ngay, tp.thanh_phan_id, g.sl * tp.so_luong
    from dong g
    join public.san_pham c on c.id = g.sp_id and c.loai_hang = 'COMBO'
    join public.thanh_phan_combo tp on tp.combo_id = g.sp_id
  ),
  ban as (
    select x.sp_id, x.ngay, x.sl
    from dong_mo_rong x
    where x.ngay between v_tu and p_ngay
      and (p_san_pham_id is null or x.sp_id = p_san_pham_id)
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
    -- Ngày bán cuối: chỉ dòng hóa đơn (sl > 0), không tính phiếu trả.
    select x.sp_id, max(x.ngay) as ngay
    from dong_mo_rong x
    where x.sl > 0
      and (p_san_pham_id is null or x.sp_id = p_san_pham_id)
    group by x.sp_id
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
      and ct.ngay_ct between p_ngay - (p_so_ngay - 1) and p_ngay
    group by ct.ngay_ct
  )
  select k.n, coalesce(dem.hd, 0), coalesce(dem.sl, 0)
  from khung k
  left join dem on dem.n = k.n
  order by k.n;
end;
$function$;

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
           -- 0101: hóa đơn giao qua nhân viên cũng là bán — không còn xuất nội bộ.
           false as noi_bo
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
           false as noi_bo
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
