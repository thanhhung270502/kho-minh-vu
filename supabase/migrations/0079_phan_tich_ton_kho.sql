-- =============================================================================
-- 0079 — Phân tích tồn kho (Phase 13, PTICH-01/06)
--
-- phan_tich_ton_kho trả MỘT dòng cho mỗi mã: tồn, khách đặt, khả dụng, bán
-- trong kỳ, bán TB/ngày, số ngày còn hàng, ngày hết dự kiến. KPI, biểu đồ, top
-- và tồn chậm tính ở client từ chính các dòng này (hàm thuần, có test) — 3.266
-- dòng là đủ nhỏ. Đề nghị nhập cũng tính ở client theo Y của cau_hinh_phan_tich
-- để đổi Y là thấy ngay, không gọi lại RPC.
--
-- Quy ước "bán" (chốt 02/10/2026):
--   * hóa đơn XUAT đã ghi sổ (HOAN_THANH) giao ĐỐI TÁC — bỏ đơn nội bộ
--     (nguoi_nhan_id), hóa đơn hủy tự rơi ra vì trạng thái DA_HUY;
--   * TRỪ phiếu khách trả (TRA_KHACH đã ghi sổ) của hóa đơn đối tác, theo ngày
--     của phiếu trả; mỗi mã không âm;
--   * theo ngày chứng từ ngay_ct, như nhip_ban (0071);
--   * chia theo NGÀY LỊCH; dữ liệu ngắn hơn kỳ thì chia theo số ngày thật kể từ
--     hóa đơn đầu tiên (so_ngay_thuc), trang ghi rõ.
-- Khách đặt = phần chưa xuất của đơn TAM + DA_XAC_NHAN, bỏ đơn nội bộ.
--
-- Không đọc giá vốn (bẫy 5). Toàn công ty, mọi kho — chỉ quản lý + văn phòng
-- xem (SECURITY DEFINER bỏ qua RLS ton_kho theo kho của thủ kho).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Quyền xem — hàm mỏng, Phase 16 thay ruột bằng quyền theo chức vụ.
-- -----------------------------------------------------------------------------
create or replace function public.xem_duoc_phan_tich()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') in ('quan_ly', 'van_phong');
$$;
revoke all    on function public.xem_duoc_phan_tich() from public, anon;
grant execute on function public.xem_duoc_phan_tich() to authenticated;

-- -----------------------------------------------------------------------------
-- (b) Cấu hình ngưỡng — một dòng duy nhất, lưu chung toàn hệ thống.
-- -----------------------------------------------------------------------------
create table public.cau_hinh_phan_tich (
  id boolean primary key default true check (id),
  -- Còn <= đỏ ngày: cần nhập ngay. Còn <= vàng ngày: chuẩn bị nhập.
  nguong_do integer not null default 7 check (nguong_do between 1 and 365),
  nguong_vang integer not null default 14 check (nguong_vang between 1 and 365),
  -- Y: nhập đủ bán bao nhiêu ngày — công thức đề nghị nhập.
  so_ngay_du_tru integer not null default 30 check (so_ngay_du_tru between 1 and 365),
  updated_at timestamptz not null default now(),
  constraint ck_cau_hinh_phan_tich_vang_lon_hon_do check (nguong_vang > nguong_do)
);

insert into public.cau_hinh_phan_tich default values;

create trigger set_updated_at_cau_hinh_phan_tich
  before update on public.cau_hinh_phan_tich
  for each row execute function public.update_updated_at();

alter table public.cau_hinh_phan_tich enable row level security;

create policy "moi vai tro doc cau hinh phan tich" on public.cau_hinh_phan_tich
  for select to authenticated using (true);
create policy "quan ly sua cau hinh phan tich" on public.cau_hinh_phan_tich
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');

-- Một dòng cố định: không ai thêm/xóa.
revoke insert, delete on public.cau_hinh_phan_tich from authenticated, anon;

comment on table public.cau_hinh_phan_tich is
  'Ngưỡng màu (đỏ/vàng, ngày) và Y (ngày dự trữ) của trang Phân tích — một dòng, quản lý sửa (0079).';

-- -----------------------------------------------------------------------------
-- (c) phan_tich_ton_kho — một dòng mỗi mã. p_san_pham_id để panel chi tiết mã
-- (Phase 14) dùng lại cùng con số.
-- -----------------------------------------------------------------------------
create or replace function public.phan_tich_ton_kho(
  p_so_ngay integer default 30,
  p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  p_san_pham_id uuid default null
)
returns table (
  san_pham_id uuid, ma_hang text, ten_hang text,
  nhom_hang_id uuid, ten_nhom_hang text, cong_doan_ma text, ten_dvt text,
  ton numeric, khach_dat numeric, ton_kha_dung numeric,
  ban_trong_ky numeric, ban_nua_dau numeric, ban_nua_sau numeric,
  so_ngay_thuc integer, ban_tb_ngay numeric, so_ngay_con numeric,
  ngay_het_du_kien date, ton_toi_thieu numeric, ngay_ban_cuoi date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    and ct.nguoi_nhan_id is null and ct.ngay_ct <= p_ngay;

  v_so_ngay_thuc := case when v_dau is null then 0 else least(p_so_ngay, p_ngay - v_dau + 1) end;
  -- Mốc chia đôi trên đoạn có dữ liệu thật (biểu đồ nhịp bán: % thay đổi).
  v_giua := p_ngay - (v_so_ngay_thuc - 1) + v_so_ngay_thuc / 2;

  return query
  with ban as (
    -- Hóa đơn đối tác đã ghi sổ trong kỳ.
    select d.san_pham_id as sp_id, ct.ngay_ct as ngay, d.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and ct.nguoi_nhan_id is null
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
    union all
    -- Khách trả cho hóa đơn đối tác: trừ, theo ngày phiếu trả.
    select d.san_pham_id, ct.ngay_ct, -d.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT' and goc.nguoi_nhan_id is null
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
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
    where dh.trang_thai in ('TAM', 'DA_XAC_NHAN') and dh.nguoi_nhan_id is null
      and (p_san_pham_id is null or dd.san_pham_id = p_san_pham_id)
    group by dd.san_pham_id
  ),
  cuoi_ma as (
    select d.san_pham_id as sp_id, max(ct.ngay_ct) as ngay
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and ct.nguoi_nhan_id is null and ct.ngay_ct <= p_ngay
      and (p_san_pham_id is null or d.san_pham_id = p_san_pham_id)
    group by d.san_pham_id
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
$$;

revoke all    on function public.phan_tich_ton_kho(integer, date, uuid) from public, anon;
grant execute on function public.phan_tich_ton_kho(integer, date, uuid) to authenticated;
comment on function public.phan_tich_ton_kho(integer, date, uuid) is
  'Phân tích tồn kho theo mã: tồn, khách đặt, khả dụng, bán trong kỳ (đối tác, trừ trả hàng), bán TB/ngày theo ngày lịch, số ngày còn hàng, ngày hết dự kiến (0079).';

-- -----------------------------------------------------------------------------
-- (d) nhip_ban_theo_ngay — đủ mọi ngày của kỳ (ngày không bán = 0), khuôn 0071.
-- -----------------------------------------------------------------------------
create or replace function public.nhip_ban_theo_ngay(
  p_so_ngay integer default 30,
  p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date
)
returns table (ngay date, so_hoa_don bigint, so_luong numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
      and ct.nguoi_nhan_id is null
      and ct.ngay_ct between p_ngay - (p_so_ngay - 1) and p_ngay
    group by ct.ngay_ct
  )
  select k.n, coalesce(dem.hd, 0), coalesce(dem.sl, 0)
  from khung k
  left join dem on dem.n = k.n
  order by k.n;
end;
$$;

revoke all    on function public.nhip_ban_theo_ngay(integer, date) from public, anon;
grant execute on function public.nhip_ban_theo_ngay(integer, date) to authenticated;
comment on function public.nhip_ban_theo_ngay(integer, date) is
  'Số hóa đơn đối tác và số lượng bán theo từng ngày của kỳ, ngày không bán = 0 (0079).';
