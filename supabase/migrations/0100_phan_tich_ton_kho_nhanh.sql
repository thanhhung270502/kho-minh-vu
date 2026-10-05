-- 0100: phan_tich_ton_kho (0098) gọi _ma_ban_ra cho TỪNG dòng hóa đơn của cả lịch
-- sử (cuoi_ma) — hai hàm security definer lồng nhau × ~50 nghìn dòng vượt
-- statement_timeout 8 giây của vai trò authenticated, RPC trả 500 (trang Phân tích
-- và Tổng quan không tải được Cần nhập hàng). Viết lại phần tách combo bằng join
-- tập hợp: cùng kết quả (mã chính + thành phần × số lượng), không đổi chữ ký, không
-- đụng dữ liệu. _ma_ban_ra giữ nguyên cho chỗ khác dùng sau này.

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
  with dong as (
    -- Dòng hóa đơn đối tác đã ghi sổ tới ngày chốt (cả lịch sử — cuoi_ma cần).
    select ct.ngay_ct as ngay, d.san_pham_id as sp_id, d.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id))
      and ct.ngay_ct <= p_ngay
    union all
    -- Khách trả cho hóa đơn đối tác: số âm, theo ngày phiếu trả.
    select ct.ngay_ct, d.san_pham_id, -d.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT' and (goc.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = goc.id))
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
