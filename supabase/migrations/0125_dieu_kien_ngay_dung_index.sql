-- =============================================================================
-- 0125 — Điều kiện ngày dùng được index (Phase 22, D-17..D-20).
--
-- `(m.ngay at time zone 'Asia/Ho_Chi_Minh')::date <= p_den` bắt Postgres tính hàm
-- trên từng dòng sổ cái nên idx_movement_ngay (0124) vô dụng. So sánh cột với hằng
-- đã quy đổi giờ VN thì index dùng được. Giờ VN không có DST nên phép đổi là chính xác.
--
-- CHỈ đổi điều kiện WHERE của ba hàm. Chữ ký, cột trả về, thứ tự sắp, security
-- definer, stable, set search_path = '', revoke/grant giữ y nguyên bản mới nhất
-- (tong_quan_chi_so: 0093; phan_tich_theo_ky, nhap_xuat_theo_ky: 0101). Cùng chữ ký
-- nên create or replace giữ nguyên comment; revoke/grant lặp lại cho chắc (D-20).
--
-- Phép đổi tương đương (c timestamptz, d date, VN = 'Asia/Ho_Chi_Minh'):
--   (c at time zone VN)::date <= d        ->  c <  ((d + 1)::timestamp at time zone VN)
--   (c at time zone VN)::date >  d        ->  c >= ((d + 1)::timestamp at time zone VN)
--   (c at time zone VN)::date between a b ->  c >= (a::timestamp at time zone VN)
--                                             and c < ((b + 1)::timestamp at time zone VN)
--   (c at time zone VN)::date =  d        ->  c >= (d::timestamp at time zone VN)
--                                             and c < ((d + 1)::timestamp at time zone VN)
--
-- KHÔNG đổi (D-17 "nếu có"): hoat_dong_gan_day (0116) chỉ so trực tiếp cột
-- (n.sua_luc < p_truoc, c.created_at < p_truoc, c.ngay_ghi_so < p_truoc,
-- c.updated_at < p_truoc, c.ngay_ghi_so - c.created_at < interval '2 minutes');
-- the_kho_san_pham (0108) chỉ lọc san_pham_id, kho_id — `at time zone` nằm ở danh
-- sách SELECT / khóa sắp, không ở WHERE. Cả hai không có điều kiện ngày bọc hàm
-- quanh cột.
--
-- Giữ nguyên trong tong_quan_chi_so: điều kiện trên san_pham.created_at (bảng nhỏ,
-- ngoài phạm vi D-17) và min((ct.created_at at time zone ...)::date) (hàm gộp,
-- không phải lọc).
--
-- Kiểm chứng: supabase/tests/115_dieu_kien_ngay_dung_index_test.sql (hàm cũ vs mới).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tong_quan_chi_so(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(xem_gia_von boolean, gia_tri_ton numeric, gia_tri_ton_thang_truoc numeric, tong_sl_ton numeric, tong_sl_ton_thang_truoc numeric, xu_huong_ton numeric[], ma_kinh_doanh bigint, ma_moi_thang bigint, xu_huong_ma_kd bigint[], phieu_xuat_tb_ngay numeric, cho_ghi_so bigint, cho_ghi_so_nhap bigint, cho_ghi_so_xuat bigint, cho_ghi_so_cu_nhat_ngay integer, xu_huong_cho_ghi_so bigint[], ton_am_theo_kho jsonb, vi_du_duoi_dinh_muc text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_xem boolean;
  v_gt numeric;
  v_sl numeric;
  v_t_truoc date := date_trunc('month', p_ngay)::date - 1;
  v_sl_truoc numeric;
  v_gt_truoc numeric;
  v_xu_huong numeric[];
  v_ma_kd bigint;
  v_ma_moi bigint;
  v_xh_ma bigint[];
  v_tb numeric;
  v_cho bigint;
  v_cho_nhap bigint;
  v_cho_xuat bigint;
  v_cho_cu integer;
  v_xh_cho bigint[];
  v_am jsonb;
  v_vd text[];
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;

  v_xem := public.co_quyen_xem_gia_von();

  select coalesce(sum(greatest(d.tong, 0)), 0),
         coalesce(sum(greatest(d.tong, 0) * sp.gia_von), 0)
    into v_sl, v_gt
  from (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
        from public.ton_kho tk group by tk.san_pham_id) d
  join public.san_pham sp on sp.id = d.d_sp;

  -- Chuỗi lùi (D-09): ƯỚC TÍNH theo giá vốn HIỆN TẠI — giá trị cuối ngày T =
  -- hiện tại trừ mọi biến động có ngày > T. Không phải giá trị lịch sử thật.
  select coalesce(sum(m.so_luong), 0), coalesce(sum(m.so_luong * sp.gia_von), 0)
    into v_sl_truoc, v_gt_truoc
  from public.kho_movement m
  join public.san_pham sp on sp.id = m.san_pham_id
  where m.ngay >= ((v_t_truoc + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh');
  v_sl_truoc := v_sl - v_sl_truoc;
  v_gt_truoc := v_gt - v_gt_truoc;

  select array_agg(
           case when v_xem then v_gt - coalesce(b.gt, 0) else v_sl - coalesce(b.sl, 0) end
           order by s.t)
    into v_xu_huong
  from generate_series(p_ngay - 29, p_ngay, interval '1 day') as s(t)
  left join lateral (
    select sum(m.so_luong) as sl, sum(m.so_luong * sp.gia_von) as gt
    from public.kho_movement m
    join public.san_pham sp on sp.id = m.san_pham_id
    where m.ngay >= ((p_ngay - 28)::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and m.ngay >= ((s.t::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
  ) b on true;

  select count(*) into v_ma_kd from public.san_pham sp where sp.dang_kinh_doanh;
  select count(*) into v_ma_moi
  from public.san_pham sp
  where sp.dang_kinh_doanh
    and (sp.created_at at time zone 'Asia/Ho_Chi_Minh')::date between date_trunc('month', p_ngay)::date and p_ngay;

  -- Xấp xỉ: mã đang KD tại thời điểm xem mà đã được tạo từ ngày T trở về trước.
  select array_agg((select count(*) from public.san_pham sp
                    where sp.dang_kinh_doanh
                      and (sp.created_at at time zone 'Asia/Ho_Chi_Minh')::date <= s.t::date) order by s.t)
    into v_xh_ma
  from generate_series(p_ngay - 29, p_ngay, interval '1 day') as s(t);

  select round(count(*)::numeric / 30, 1) into v_tb
  from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
    and ct.ngay_ct between p_ngay - 30 and p_ngay - 1;

  select count(*),
         count(*) filter (where ct.loai_ct = 'NHAP'),
         count(*) filter (where ct.loai_ct = 'XUAT'),
         p_ngay - min((ct.created_at at time zone 'Asia/Ho_Chi_Minh')::date)
    into v_cho, v_cho_nhap, v_cho_xuat, v_cho_cu
  from public.chung_tu ct
  where ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH') and ct.trang_thai = 'NHAP_LIEU';

  select array_agg((select count(*) from public.chung_tu ct
                    where ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH')
                      and ct.created_at >= (s.t::date::timestamp at time zone 'Asia/Ho_Chi_Minh')
                      and ct.created_at < ((s.t::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')) order by s.t)
    into v_xh_cho
  from generate_series(p_ngay - 13, p_ngay, interval '1 day') as s(t);

  select coalesce(jsonb_agg(jsonb_build_object('ten_kho', x.ten, 'so_ma', x.n) order by x.ten), '[]'::jsonb)
    into v_am
  from (
    select k.ten, count(*) as n
    from public.ton_kho tk
    join public.kho k on k.id = tk.kho_id
    join public.san_pham sp on sp.id = tk.san_pham_id
    where sp.dang_kinh_doanh and tk.so_luong < 0
    group by k.id, k.ten
  ) x;

  select coalesce(array_agg(y.ma_hang order by y.ma_hang), '{}'::text[])
    into v_vd
  from (
    select sp.ma_hang
    from public.san_pham sp
    left join (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
               from public.ton_kho tk group by tk.san_pham_id) d on d.d_sp = sp.id
    where sp.dang_kinh_doanh
      and sp.ton_toi_thieu > 0 and coalesce(d.tong, 0) < sp.ton_toi_thieu
    order by sp.ma_hang
    limit 2
  ) y;

  return query
  select v_xem,
         case when v_xem then v_gt end,
         case when v_xem then v_gt_truoc end,
         v_sl, v_sl_truoc, v_xu_huong,
         v_ma_kd, v_ma_moi, v_xh_ma, v_tb,
         v_cho, v_cho_nhap, v_cho_xuat, v_cho_cu, v_xh_cho,
         v_am, v_vd;
end;
$function$;

revoke all on function public.tong_quan_chi_so(date) from public, anon;
grant execute on function public.tong_quan_chi_so(date) to authenticated;

CREATE OR REPLACE FUNCTION public.phan_tich_theo_ky(p_tu date, p_den date, p_kho_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      and m.ngay < ((p_den + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
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
$function$;

revoke all on function public.phan_tich_theo_ky(date, date, uuid) from public, anon;
grant execute on function public.phan_tich_theo_ky(date, date, uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.nhap_xuat_theo_ky(p_tu date, p_den date, p_buoc text, p_kho_id uuid DEFAULT NULL::uuid, p_san_pham_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(ky date, nhap numeric, xuat_ban numeric, xuat_noi_bo numeric, so_phieu_nhap bigint, so_hoa_don bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      and m.ngay >= (p_tu::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and m.ngay < ((p_den + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
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
$function$;

revoke all on function public.nhap_xuat_theo_ky(date, date, text, uuid, uuid[]) from public, anon;
grant execute on function public.nhap_xuat_theo_ky(date, date, text, uuid, uuid[]) to authenticated;

