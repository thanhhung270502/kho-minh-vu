-- =============================================================================
-- Phase 22 (D-19) — điều kiện ngày dùng được index (0125): kết quả KHÔNG đổi.
--
-- So khớp tong_quan_chi_so, phan_tich_theo_ky, nhap_xuat_theo_ky với bản chụp
-- thân hàm TRƯỚC 0125 (tên *_cu) trên cùng dữ liệu, ở mọi ranh giới nửa đêm giờ
-- VN, bút toán đảo, movement không chứng từ, kỳ một ngày và nhiều tháng. Các bản
-- *_sai cố ý viết SAI ranh giới để chứng minh bộ dữ liệu bắt được lỗi lệch ngày.
--
-- Fixture mã 'ZQX-115-*', so_ct 'ZQX-115-*', mốc năm 2093 (không ai chạm tới —
-- bẫy 16; test không neo bộ đếm số chứng từ). Số phụ thuộc dữ liệu sống thì so
-- tương đối hàm cũ với hàm mới trong cùng transaction.
--
-- CẢNH BÁO: các bản `*_cu` là ảnh chụp thân hàm TRƯỚC 0125. Khi Wave 2 viết lại
-- tong_quan_chi_so / phan_tich_theo_ky / nhap_xuat_theo_ky (đổi thuật toán, không
-- chỉ WHERE), phải gỡ hoặc chụp lại các bản `_cu`/`_sai` trong file này — nếu
-- không test sẽ đỏ vì khác thuật toán, hoặc tệ hơn, so với một bản cũ không còn
-- đúng hợp đồng.
-- =============================================================================
begin;
select plan(31);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung; v_kho jsonb;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = v_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', v_kho
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

create or replace function pg_temp.sp_test(p_ma text)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

-- Bản sao hàm CŨ (nguyên văn pg_get_functiondef trước 0125, chỉ đổi tên).
CREATE OR REPLACE FUNCTION public.tong_quan_chi_so_cu(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
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
  where (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date > v_t_truoc;
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
      and (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date > s.t::date
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
                      and (ct.created_at at time zone 'Asia/Ho_Chi_Minh')::date = s.t::date) order by s.t)
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
$function$
;

CREATE OR REPLACE FUNCTION public.phan_tich_theo_ky_cu(p_tu date, p_den date, p_kho_id uuid DEFAULT NULL::uuid)
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
$function$
;

CREATE OR REPLACE FUNCTION public.nhap_xuat_theo_ky_cu(p_tu date, p_den date, p_buoc text, p_kho_id uuid DEFAULT NULL::uuid, p_san_pham_ids uuid[] DEFAULT NULL::uuid[])
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
$function$
;

-- Biến thể SAI ranh giới có chủ đích (chỉ đổi điều kiện ngày).
CREATE OR REPLACE FUNCTION public.nhap_xuat_theo_ky_sai(p_tu date, p_den date, p_buoc text, p_kho_id uuid DEFAULT NULL::uuid, p_san_pham_ids uuid[] DEFAULT NULL::uuid[])
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
      and m.ngay >= (p_tu::timestamp at time zone 'Asia/Ho_Chi_Minh') and m.ngay <= (p_den::timestamp at time zone 'Asia/Ho_Chi_Minh')
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
$function$
;

CREATE OR REPLACE FUNCTION public.phan_tich_theo_ky_sai(p_tu date, p_den date, p_kho_id uuid DEFAULT NULL::uuid)
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
      and m.ngay <= (p_den::timestamp at time zone 'Asia/Ho_Chi_Minh')
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
$function$
;

CREATE OR REPLACE FUNCTION public.tong_quan_chi_so_sai(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
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
  where m.ngay >= (v_t_truoc::timestamp at time zone 'Asia/Ho_Chi_Minh');
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
      and (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date > s.t::date
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
                      and (ct.created_at at time zone 'Asia/Ho_Chi_Minh')::date = s.t::date) order by s.t)
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
$function$
;

-- ---------------------------------------------------------------------------
-- Fixture (vai postgres). Số lượng là lũy thừa 2 để tổng chỉ ra đúng dòng nào
-- được tính. Giờ VN = UTC+7, không DST.
-- ---------------------------------------------------------------------------
create temp table t_fx as
select
  pg_temp.kho_id('K1')            as k1,
  pg_temp.sp_test('ZQX-115-A')    as spa,
  pg_temp.sp_test('ZQX-115-B')    as spb;
grant select on t_fx to authenticated;

create temp table t_ct as
select uuid_generate_v4() as c_nhap, uuid_generate_v4() as c_xuat, uuid_generate_v4() as c_huy;

insert into public.chung_tu (id, so_ct, loai_ct, ngay_ct, kho_id, trang_thai)
select c_nhap, 'ZQX-115-N1', 'NHAP'::public.loai_ct, '2093-03-01'::date, k.k1, 'HOAN_THANH'::public.trang_thai_ct from t_ct, t_fx k
union all select c_xuat, 'ZQX-115-X1', 'XUAT', '2093-03-15', k.k1, 'HOAN_THANH' from t_ct, t_fx k
union all select c_huy, 'ZQX-115-H1', 'XUAT', '2093-03-14', k.k1, 'DA_HUY' from t_ct, t_fx k;

-- Phiếu chờ ghi sổ: created_at đúng ranh giới nửa đêm VN (xu_huong_cho_ghi_so).
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, trang_thai, created_at)
select 'ZQX-115-C1', 'NHAP'::public.loai_ct, '2093-03-10'::date, k1, 'NHAP_LIEU'::public.trang_thai_ct, '2093-03-10 00:00:00+07'::timestamptz from t_fx
union all select 'ZQX-115-C2', 'NHAP', '2093-03-09', k1, 'NHAP_LIEU', '2093-03-09 23:59:59+07' from t_fx
union all select 'ZQX-115-C3', 'NHAP', '2093-03-09', k1, 'NHAP_LIEU', '2093-03-09 17:00:00+00' from t_fx;

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at, chung_tu_id, la_but_toan_dao)
select k1, spa,    1, 1000, '2093-03-01 00:00:00+07'::timestamptz,        '2093-03-01 00:00:00+07'::timestamptz,        c_nhap, false from t_fx, t_ct   -- m1
union all select k1, spb,    2, 1000, '2093-02-28 23:59:59+07',            '2093-02-28 23:59:59+07',            c_nhap, false from t_fx, t_ct   -- m2
union all select k1, spa,    4, 1000, '2093-02-28 17:00:00+00',            '2093-02-28 17:00:00+00',            c_nhap, false from t_fx, t_ct   -- m3
union all select k1, spb,    8, 1000, '2093-02-28 16:59:59.999999+00',     '2093-02-28 16:59:59.999999+00',     c_nhap, false from t_fx, t_ct   -- m4
union all select k1, spa,  -16, 1000, '2093-03-15 00:00:00+07',            '2093-03-15 00:00:00+07',            c_xuat, false from t_fx, t_ct   -- m5
union all select k1, spb,  -32, 1000, '2093-03-15 23:59:59+07',            '2093-03-15 23:59:59+07',            c_xuat, false from t_fx, t_ct   -- m6
union all select k1, spa,  -64, 1000, '2093-03-16 00:00:00+07',            '2093-03-16 00:00:00+07',            c_xuat, false from t_fx, t_ct   -- m7
union all select k1, spb,  128, 1000, '2093-04-30 23:59:59+07',            '2093-04-30 23:59:59+07',            c_nhap, false from t_fx, t_ct   -- m8
union all select k1, spa,  256, 1000, '2093-05-01 00:00:00+07',            '2093-05-01 00:00:00+07',            c_nhap, false from t_fx, t_ct   -- m9
union all select k1, spa, -512, 1000, '2093-03-14 00:00:00+07',            '2093-03-14 00:00:00+07',            c_huy,  false from t_fx, t_ct   -- m10
union all select k1, spa,  512, 1000, '2093-03-15 12:00:00+07',            '2093-03-15 12:00:00+07',            c_huy,  true  from t_fx, t_ct   -- m11 bút toán đảo
union all select k1, spb, 1024, 1000, '2093-03-10 09:00:00+07',            '2093-03-10 09:00:00+07',            null,   false from t_fx;        -- m12 không chứng từ

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

-- ---------------------------------------------------------------------------
-- Giá trị tuyệt đối: fixture bắt đúng ranh giới nửa đêm giờ VN.
-- ---------------------------------------------------------------------------
select is((select nhap from public.nhap_xuat_theo_ky_cu('2093-03-01','2093-03-01','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])), 5::numeric,
  'ngày 03-01: nhap = 5 (m1 đúng 00:00 VN + m3 đúng 17:00 UTC)');
select is((select nhap from public.nhap_xuat_theo_ky_cu('2093-02-28','2093-02-28','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])), 10::numeric,
  'ngày 02-28: nhap = 10 (m2 23:59:59 VN + m4 16:59:59.999999 UTC)');
select is((select xuat_ban from public.nhap_xuat_theo_ky_cu('2093-03-15','2093-03-15','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])), 48::numeric,
  'ngày 03-15: xuat_ban = 48 (m5 + m6; bút toán đảo m11 và phiếu hủy bị loại)');

-- tong_quan_chi_so: hiện tại vs _cu
select results_eq($q$select * from public.tong_quan_chi_so('2093-03-01')$q$, $q$select * from public.tong_quan_chi_so_cu('2093-03-01')$q$, 'tong_quan_chi_so khớp _cu: p_ngay = 2093-03-01');
select results_eq($q$select * from public.tong_quan_chi_so('2093-03-20')$q$, $q$select * from public.tong_quan_chi_so_cu('2093-03-20')$q$, 'tong_quan_chi_so khớp _cu: p_ngay = 2093-03-20');
select results_eq($q$select * from public.tong_quan_chi_so('2093-04-01')$q$, $q$select * from public.tong_quan_chi_so_cu('2093-04-01')$q$, 'tong_quan_chi_so khớp _cu: p_ngay = 2093-04-01');
select results_eq($q$select * from public.tong_quan_chi_so((now() at time zone 'Asia/Ho_Chi_Minh')::date)$q$, $q$select * from public.tong_quan_chi_so_cu((now() at time zone 'Asia/Ho_Chi_Minh')::date)$q$, 'tong_quan_chi_so khớp _cu: p_ngay = (now() at time zone Asia/Ho_Chi_Minh)::date');

-- phan_tich_theo_ky (jsonb): hiện tại vs _cu
select is(public.phan_tich_theo_ky('2093-02-28','2093-02-28',null), public.phan_tich_theo_ky_cu('2093-02-28','2093-02-28',null), 'phan_tich_theo_ky khớp _cu: 2093-02-28,2093-02-28,null');
select is(public.phan_tich_theo_ky('2093-03-01','2093-03-01',null), public.phan_tich_theo_ky_cu('2093-03-01','2093-03-01',null), 'phan_tich_theo_ky khớp _cu: 2093-03-01,2093-03-01,null');
select is(public.phan_tich_theo_ky('2093-03-15','2093-03-15',(select k1 from t_fx)), public.phan_tich_theo_ky_cu('2093-03-15','2093-03-15',(select k1 from t_fx)), 'phan_tich_theo_ky khớp _cu: 2093-03-15,2093-03-15,K1');
select is(public.phan_tich_theo_ky('2093-02-01','2093-04-30',null), public.phan_tich_theo_ky_cu('2093-02-01','2093-04-30',null), 'phan_tich_theo_ky khớp _cu: 2093-02-01,2093-04-30,null');
select is(public.phan_tich_theo_ky('2093-02-01','2093-05-01',(select k1 from t_fx)), public.phan_tich_theo_ky_cu('2093-02-01','2093-05-01',(select k1 from t_fx)), 'phan_tich_theo_ky khớp _cu: 2093-02-01,2093-05-01,K1');
select is(public.phan_tich_theo_ky(date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date,null), public.phan_tich_theo_ky_cu(date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date,null), 'phan_tich_theo_ky khớp _cu: date_trunc(month, now() at time zone Asia/Ho_Chi_Minh)::date,(now() at');

-- nhap_xuat_theo_ky: hiện tại vs _cu
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-28','2093-02-28','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-28','2093-02-28','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-28..2093-02-28 ngay');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-28','2093-02-28','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-28','2093-02-28','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-28..2093-02-28 tuan');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-28','2093-02-28','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-28','2093-02-28','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-28..2093-02-28 thang');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-01','2093-03-01','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-01','2093-03-01','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-01..2093-03-01 ngay');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-01','2093-03-01','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-01','2093-03-01','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-01..2093-03-01 tuan');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-01','2093-03-01','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-01','2093-03-01','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-01..2093-03-01 thang');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-15','2093-03-15','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-15','2093-03-15','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-15..2093-03-15 ngay');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-15','2093-03-15','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-15','2093-03-15','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-15..2093-03-15 tuan');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-15','2093-03-15','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-15','2093-03-15','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-03-15..2093-03-15 thang');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-01','2093-05-01','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-01','2093-05-01','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-01..2093-05-01 ngay');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-01','2093-05-01','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-01','2093-05-01','tuan', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-01..2093-05-01 tuan');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-01','2093-05-01','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-01','2093-05-01','thang', null, array[(select spa from t_fx), (select spb from t_fx)])$q$, 'nhap_xuat_theo_ky khớp _cu: 2093-02-01..2093-05-01 thang');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-03-01','2093-03-01','ngay', null, null)$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-01','2093-03-01','ngay', null, null)$q$, 'nhap_xuat_theo_ky khớp _cu: 03-01 ngay, mọi mã');
select results_eq($q$select * from public.nhap_xuat_theo_ky(date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date,'ngay', null, null)$q$, $q$select * from public.nhap_xuat_theo_ky_cu(date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date,'ngay', null, null)$q$, 'nhap_xuat_theo_ky khớp _cu: tháng hiện tại, mọi mã');
select results_eq($q$select * from public.nhap_xuat_theo_ky('2093-02-01','2093-05-01','thang', (select k1 from t_fx), null)$q$, $q$select * from public.nhap_xuat_theo_ky_cu('2093-02-01','2093-05-01','thang', (select k1 from t_fx), null)$q$, 'nhap_xuat_theo_ky khớp _cu: lọc kho K1, 4 tháng');

-- ---------------------------------------------------------------------------
-- Đối chứng: biến thể SAI ranh giới phải cho kết quả KHÁC hàm cũ.
-- ---------------------------------------------------------------------------
select results_ne(
  $q$select * from public.nhap_xuat_theo_ky_sai('2093-03-15','2093-03-15','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$,
  $q$select * from public.nhap_xuat_theo_ky_cu('2093-03-15','2093-03-15','ngay', null, array[(select spa from t_fx), (select spb from t_fx)])$q$,
  'nhap_xuat_theo_ky: biến thể sai ranh giới phải lệch');
select isnt(public.phan_tich_theo_ky_sai('2093-02-28','2093-02-28', null), public.phan_tich_theo_ky_cu('2093-02-28','2093-02-28', null),
  'phan_tich_theo_ky: biến thể sai ranh giới phải lệch');
select results_ne(
  $q$select * from public.tong_quan_chi_so_sai('2093-03-20')$q$,
  $q$select * from public.tong_quan_chi_so_cu('2093-03-20')$q$,
  'tong_quan_chi_so: biến thể sai ranh giới phải lệch');

select * from finish();
rollback;
