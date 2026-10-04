-- =============================================================================
-- UI3B-03/04 (D-04, D-05, D-06, D-08, D-09) — bộ RPC cho trang Tổng quan 3b.
--
--   tong_quan_chi_so     4 KPI + delta tháng + sparkline + dữ liệu "Cần xử lý"
--   nhap_xuat_theo_ngay  biểu đồ nhập/xuất 7/30/90 ngày
--   khong_luan_chuyen    mã tồn > 0 mà lâu không phát sinh
--   ton_theo_nhom        thêm cột tong_so_luong (SL tồn dương), cột cũ giữ nguyên
--
-- Giá trị tồn tính ở DB vì gia_von bị thu quyền cột (0029): người không có
-- co_quyen_xem_gia_von() nhận null (D-04) nhưng vẫn có số lượng.
-- Mọi hàm kiểm co_quyen('xem_dashboard') ở dòng đầu (SECURITY DEFINER bỏ qua RLS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. tong_quan_chi_so
-- ---------------------------------------------------------------------------
drop function if exists public.tong_quan_chi_so(date);
create function public.tong_quan_chi_so(
  p_ngay date default ((now() at time zone 'Asia/Ho_Chi_Minh')::date)
)
returns table (
  xem_gia_von boolean,
  gia_tri_ton numeric,
  gia_tri_ton_thang_truoc numeric,
  tong_sl_ton numeric,
  tong_sl_ton_thang_truoc numeric,
  xu_huong_ton numeric[],
  ma_kinh_doanh bigint,
  ma_moi_thang bigint,
  xu_huong_ma_kd bigint[],
  phieu_xuat_tb_ngay numeric,
  cho_ghi_so bigint,
  cho_ghi_so_nhap bigint,
  cho_ghi_so_xuat bigint,
  cho_ghi_so_cu_nhat_ngay integer,
  xu_huong_cho_ghi_so bigint[],
  ton_am_theo_kho jsonb,
  vi_du_duoi_dinh_muc text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.tong_quan_chi_so(date) from public, anon;
grant execute on function public.tong_quan_chi_so(date) to authenticated;
comment on function public.tong_quan_chi_so(date) is
  'UI3B-03/04: 4 KPI tổng quan trong một dòng. gia_tri_ton = sum(max(tồn mọi kho,0) * gia_von hiện tại), null khi không co_quyen_xem_gia_von() (D-04). xu_huong_ton/gia_tri_ton_thang_truoc là ƯỚC TÍNH lùi từ kho_movement theo giá vốn hiện tại (D-09). Phiếu chờ ghi sổ = NHAP/XUAT/TRA_NCC/TRA_KHACH ở NHAP_LIEU, không tính KIEM_KE (D-06). Dưới định mức: ton_toi_thieu > 0 and tổng tồn < ton_toi_thieu (0067).';

-- ---------------------------------------------------------------------------
-- B. nhap_xuat_theo_ngay
-- ---------------------------------------------------------------------------
drop function if exists public.nhap_xuat_theo_ngay(integer, date);
create function public.nhap_xuat_theo_ngay(
  p_so_ngay integer,
  p_ngay date default ((now() at time zone 'Asia/Ho_Chi_Minh')::date)
)
returns table (
  ngay date,
  so_phieu_nhap bigint,
  so_phieu_xuat bigint,
  sl_nhap numeric,
  sl_xuat numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay not in (7, 30, 90) then
    raise exception 'Số ngày chỉ nhận 7, 30 hoặc 90' using errcode = '22023';
  end if;

  return query
  select v.ngay, v.so_phieu_nhap, v.so_phieu_xuat, v.sl_nhap, v.sl_xuat
  from (
    with khung as (
      select g::date as d_ngay
      from generate_series(p_ngay - (p_so_ngay - 1), p_ngay, interval '1 day') g
    ), dem as (
      -- Cùng định nghĩa nhip_ban: chỉ phiếu có >= 1 dòng, count distinct —
      -- KPI Phiếu xuất hôm nay (nhip_ban) và sparkline này phải ra cùng số;
      -- test 111 khóa điều này.
      select ct.ngay_ct as d_ngay,
             count(distinct ct.id) filter (where ct.loai_ct = 'NHAP') as d_pn,
             count(distinct ct.id) filter (where ct.loai_ct = 'XUAT') as d_px,
             coalesce(sum(abs(cd.so_luong)) filter (where ct.loai_ct = 'NHAP'), 0) as d_sln,
             coalesce(sum(abs(cd.so_luong)) filter (where ct.loai_ct = 'XUAT'), 0) as d_slx
      from public.chung_tu ct
      join public.chung_tu_dong cd on cd.chung_tu_id = ct.id
      where ct.loai_ct in ('NHAP', 'XUAT')
        and ct.trang_thai = 'HOAN_THANH'
        and ct.ngay_ct between p_ngay - (p_so_ngay - 1) and p_ngay
      group by ct.ngay_ct
    )
    select k.d_ngay as ngay,
           coalesce(d.d_pn, 0) as so_phieu_nhap,
           coalesce(d.d_px, 0) as so_phieu_xuat,
           coalesce(d.d_sln, 0) as sl_nhap,
           coalesce(d.d_slx, 0) as sl_xuat
    from khung k
    left join dem d on d.d_ngay = k.d_ngay
  ) v
  order by v.ngay asc;
end;
$$;
revoke all on function public.nhap_xuat_theo_ngay(integer, date) from public, anon;
grant execute on function public.nhap_xuat_theo_ngay(integer, date) to authenticated;
comment on function public.nhap_xuat_theo_ngay(integer, date) is
  'UI3B-03 D-08: N dòng (7/30/90) cũ -> mới, ngày trống có dòng 0; chỉ NHAP/XUAT HOAN_THANH có dòng; số phiếu xuất cùng định nghĩa nhip_ban.';

-- ---------------------------------------------------------------------------
-- C. khong_luan_chuyen
-- ---------------------------------------------------------------------------
drop function if exists public.khong_luan_chuyen(integer, integer, date);
create function public.khong_luan_chuyen(
  p_so_ngay integer default 30,
  p_gioi_han integer default 10,
  p_ngay date default ((now() at time zone 'Asia/Ho_Chi_Minh')::date)
)
returns table (
  san_pham_id uuid,
  ma_hang text,
  ten_hang text,
  so_ngay integer,
  ton numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay <= 0 then
    raise exception 'Số ngày phải lớn hơn 0' using errcode = '22023';
  end if;

  return query
  select v.san_pham_id, v.ma_hang, v.ten_hang, v.so_ngay, v.ton
  from (
    select sp.id as san_pham_id, sp.ma_hang as ma_hang, sp.ten_hang as ten_hang,
           (p_ngay - (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date)::integer as so_ngay,
           d.tong as ton
    from public.san_pham sp
    join (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
          from public.ton_kho tk group by tk.san_pham_id) d on d.d_sp = sp.id
    where sp.dang_kinh_doanh
      and d.tong > 0
      and (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date < p_ngay - p_so_ngay
  ) v
  order by v.so_ngay desc, v.ma_hang
  limit least(greatest(coalesce(p_gioi_han, 10), 1), 100);
end;
$$;
revoke all on function public.khong_luan_chuyen(integer, integer, date) from public, anon;
grant execute on function public.khong_luan_chuyen(integer, integer, date) to authenticated;
comment on function public.khong_luan_chuyen(integer, integer, date) is
  'UI3B-03 D-05: mã đang KD, tồn > 0, lan_phat_sinh_cuoi cũ hơn N ngày. Lưu ý: lan_phat_sinh_cuoi bị trigger 0008 đặt lại ở MỌI bút toán (kể cả nạp tồn tạm/kiểm kê) nên danh sách có thể rỗng tới 30 ngày sau lần nạp/kiểm kê; nếu UAT thấy rỗng bất thường, đổi sang lần XUAT cuối trong kho_movement.';

-- ---------------------------------------------------------------------------
-- D. ton_theo_nhom + tong_so_luong (thân lấy từ bản đang chạy, 0083)
-- ---------------------------------------------------------------------------
drop function if exists public.ton_theo_nhom(text, uuid);
create function public.ton_theo_nhom(p_theo text, p_kho_id uuid default null::uuid)
returns table (
  nhom_id uuid, ten_nhom text, tong_ma bigint, con_hang bigint, het_hang bigint,
  am bigint, duoi_dinh_muc bigint, tong_so_luong numeric
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;

  if p_theo is null or p_theo not in ('nhom', 'cong_doan') then
    raise exception 'Tham số p_theo chỉ nhận nhom hoặc cong_doan' using errcode = '22023';
  end if;

  return query
  select v.nhom_id, v.ten_nhom, v.tong_ma, v.con_hang, v.het_hang, v.am, v.duoi_dinh_muc, v.tong_so_luong
  from (
    with ton as (
      select tk.san_pham_id, sum(tk.so_luong) as tong
      from public.ton_kho tk
      where p_kho_id is null or tk.kho_id = p_kho_id
      group by tk.san_pham_id
    ), loc as (
      select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
             coalesce(ton.tong, 0) as tong
      from public.san_pham sp
      left join ton on ton.san_pham_id = sp.id
      where sp.dang_kinh_doanh = true
    ), gan as (
      select l.id, l.ton_toi_thieu, l.tong,
             case when p_theo = 'nhom' then l.nhom_hang_id else l.cong_doan_id end as nhom_id
      from loc l
    )
    select
      g.nhom_id as nhom_id,
      case when p_theo = 'nhom' then nh.ten else cd.ten end as ten_nhom,
      count(*) as tong_ma,
      count(*) filter (where g.tong > 0) as con_hang,
      count(*) filter (where g.tong = 0) as het_hang,
      count(*) filter (where g.tong < 0) as am,
      count(*) filter (where g.ton_toi_thieu > 0 and g.tong < g.ton_toi_thieu) as duoi_dinh_muc,
      coalesce(sum(greatest(g.tong, 0)), 0) as tong_so_luong
    from gan g
    left join public.nhom_hang nh on p_theo = 'nhom'      and nh.id = g.nhom_id
    left join public.cong_doan cd on p_theo = 'cong_doan' and cd.id = g.nhom_id
    group by g.nhom_id, nh.ten, cd.ten
  ) v
  order by v.ten_nhom asc nulls last;
end;
$function$;
revoke all on function public.ton_theo_nhom(text, uuid) from public, anon;
grant execute on function public.ton_theo_nhom(text, uuid) to authenticated;
comment on function public.ton_theo_nhom(text, uuid) is
  'TQAN-01: đếm mã đang KD theo nhóm hàng/công đoạn theo trạng thái tồn, khớp danh_sach_ton_kho (0067). tong_so_luong = tổng SL tồn dương (UI3B-04).';
