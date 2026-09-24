-- =============================================================================
-- 0064 — DLIEU-07: tra_cuu_lich_su_kiotviet + BA CỬA quyền theo công tắc người
-- (D-10..D-13, D-15). Lúc lập kế hoạch chỉ tìm thấy hai cửa (policy 0016,
-- lich_su_giao_dich_doi_tac 0033) — grep kỹ hơn thấy CỬA THỨ BA: the_kho_san_pham
-- (0062) cũng đọc luu_tru_* theo vai trò cứng. Sửa thiếu một cửa là để hở song song.
--
-- D-11: KHÔNG trộn lịch sử KiotViet vào thẻ kho — dòng cũ không có tồn lũy kế
-- đúng (không có kho_movement thật). Thẻ kho (the_kho_san_pham) BỎ HẲN hai nhánh
-- union đọc luu_tru_*; lịch sử KiotViet từ nay chỉ xem qua tra_cuu_lich_su_kiotviet
-- (màn /lich-su-kiotviet, plan 06-08) và tab chi tiết mã hàng gọi cùng RPC đó.
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD lúc viết migration này (project phonzyruoalimgaovljm,
-- đọc bằng pg_get_functiondef qua kết nối trực tiếp Session pooler — khớp HOÀN TOÀN
-- với 0033_ra_ghi_chu_lich_su.sql và 0062_sua_the_kho_cot_mo_ho.sql trong git, không
-- lệch cloud, nên lấy bản git làm gốc để sửa):
--
--   public.lich_su_giao_dich_doi_tac(uuid,integer,integer) — RETURNS TABLE(nguon text,
--   ma_phieu text, chung_tu_id uuid, loai text, ngay timestamptz, so_dong bigint,
--   tong_so_luong numeric, ghi_chu text, tong_so_dong bigint), STABLE SECURITY DEFINER,
--   dòng gate: `v_xem_kv := v_vai_tro in ('quan_ly','van_phong');`
--
--   public.the_kho_san_pham(uuid,uuid,integer,integer) — RETURNS TABLE(nguon text,
--   ngay timestamptz, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text,
--   loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric,
--   gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text,
--   tong_so_dong bigint, ton_luy_ke numeric), STABLE SECURITY DEFINER, có hai
--   nhánh union all đọc luu_tru_nhap_kiotviet/luu_tru_hoa_don_kiotviet (nguồn
--   'KIOTVIET_NHAP'/'KIOTVIET_BAN'), gate `v_xem_kv := v_vai_tro in ('quan_ly','van_phong')`.
--
--   pg_policies (luu_tru_nhap_kiotviet, luu_tru_hoa_don_kiotviet): "doc luu tru nhap" /
--   "doc luu tru hoa don", cmd SELECT, qual `vai_tro_hien_tai() = ANY (ARRAY['quan_ly','van_phong'])`.
--
-- A5 (06-RESEARCH giả định định dạng ngay text luôn ISO): kiểm trên dữ liệu thật —
--   luu_tru_nhap_kiotviet: 0 dòng ngay sai định dạng.
--   luu_tru_hoa_don_kiotviet: 0 dòng ngay sai định dạng.
-- Ép `ngay::timestamptz` trong RPC bên dưới an toàn.
--
-- Migration mới nhất trên cloud lúc viết: 0062 (0063 chưa đẩy — cùng phase, đẩy
-- chung ở 06-05).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CỬA 1: policy đọc thẳng bảng — đổi từ vai trò cứng sang công tắc theo người.
-- -----------------------------------------------------------------------------
drop policy "doc luu tru nhap" on public.luu_tru_nhap_kiotviet;
create policy "doc luu tru nhap" on public.luu_tru_nhap_kiotviet
  for select to authenticated
  using ((select public.xem_duoc_lich_su_kiotviet()));

drop policy "doc luu tru hoa don" on public.luu_tru_hoa_don_kiotviet;
create policy "doc luu tru hoa don" on public.luu_tru_hoa_don_kiotviet
  for select to authenticated
  using ((select public.xem_duoc_lich_su_kiotviet()));

-- -----------------------------------------------------------------------------
-- 2. CỬA 2: RPC tra cứu mới — phục vụ cả màn /lich-su-kiotviet lẫn tab chi tiết
--    mã hàng (D-11). Không trả don_gia/thanh_tien (D-17: không dùng giá ở đây).
-- -----------------------------------------------------------------------------
create or replace function public.tra_cuu_lich_su_kiotviet(
  p_loai text default null,
  p_tu_khoa text default null,
  p_ma_hang text default null,
  p_san_pham_id uuid default null,
  p_so_phieu text default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table(
  nguon text, ma_phieu text, ngay timestamptz, doi_tac text, ma_hang text,
  ten_hang text, so_luong numeric, ghi_chu text,
  tong_so_dong bigint, tong_nhap numeric, tong_xuat numeric
)
language plpgsql
stable security definer
set search_path = ''
as $function$
#variable_conflict use_column
declare
  v_kt      int  := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr      int  := greatest(coalesce(p_trang, 1), 1);
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_ma_sp   text;
begin
  if not (select public.xem_duoc_lich_su_kiotviet()) then
    raise exception 'Không có quyền xem lịch sử KiotViet' using errcode = '42501';
  end if;
  if p_loai is not null and p_loai not in ('NHAP', 'XUAT') then
    raise exception 'Loại phải là NHAP hoặc XUAT' using errcode = '23514';
  end if;
  if p_san_pham_id is not null then
    select sp.ma_hang into v_ma_sp from public.san_pham sp where sp.id = p_san_pham_id;
  end if;

  return query
  with tat_ca as (
    select 'NHAP'::text as nguon, l.ma_phieu as ma_phieu, l.ngay::timestamptz as ngay,
           l.nha_cung_cap as doi_tac, l.ma_hang as ma_hang, l.ten_hang as ten_hang,
           l.so_luong as so_luong, l.ghi_chu as ghi_chu
    from public.luu_tru_nhap_kiotviet l
    union all
    select 'XUAT'::text, h.ma_hoa_don, h.ngay::timestamptz,
           h.khach_hang, h.ma_hang, h.ten_hang, h.so_luong, h.ghi_chu
    from public.luu_tru_hoa_don_kiotviet h
  ),
  loc as (
    select t.* from tat_ca t
    where (p_loai is null or t.nguon = p_loai)
      and (p_so_phieu is null or trim(t.ma_phieu) = trim(p_so_phieu))
      and (p_ma_hang is null or trim(t.ma_hang) = trim(p_ma_hang))
      and (v_ma_sp is null or t.ma_hang = v_ma_sp)
      -- Khoảng ngày theo NGÀY GIỜ VIỆT NAM, không so thẳng timestamptz với date
      -- (máy chủ Postgres chạy UTC).
      and (p_tu_ngay is null or (t.ngay at time zone 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay)
      and (p_den_ngay is null or (t.ngay at time zone 'Asia/Ho_Chi_Minh')::date <= p_den_ngay)
      and (v_tu_khoa is null or public.f_unaccent(
             coalesce(t.ma_hang, '') || ' ' || coalesce(t.ten_hang, '') || ' ' ||
             coalesce(t.doi_tac, '') || ' ' || coalesce(t.ghi_chu, '')
           ) ilike '%' || public.f_unaccent(v_tu_khoa) || '%')
  )
  select l.nguon, l.ma_phieu, l.ngay, l.doi_tac, l.ma_hang, l.ten_hang, l.so_luong, l.ghi_chu,
         count(*) over () as tong_so_dong,
         sum(l.so_luong) filter (where l.nguon = 'NHAP') over () as tong_nhap,
         sum(l.so_luong) filter (where l.nguon = 'XUAT') over () as tong_xuat
  from loc l
  order by l.ngay desc nulls last, l.ma_phieu, l.ma_hang
  limit v_kt offset (v_tr - 1) * v_kt;
end $function$;

revoke all    on function public.tra_cuu_lich_su_kiotviet(text, text, text, uuid, text, date, date, integer, integer) from public, anon;
grant execute on function public.tra_cuu_lich_su_kiotviet(text, text, text, uuid, text, date, date, integer, integer) to authenticated;
comment on function public.tra_cuu_lich_su_kiotviet(text, text, text, uuid, text, date, date, integer, integer) is
  'DLIEU-07. Tra cứu 594 dòng nhập + 4.732 dòng hóa đơn lưu trữ KiotViet, gate bằng
   public.xem_duoc_lich_su_kiotviet() (D-13). Không trả don_gia/thanh_tien (D-17).
   Dùng chung cho màn /lich-su-kiotviet lẫn tab chi tiết mã hàng (D-11).';

-- -----------------------------------------------------------------------------
-- 3. CỬA 3a: lich_su_giao_dich_doi_tac (0033) — đổi DUY NHẤT dòng gán v_xem_kv.
--    Giữ nguyên v_vai_tro (nhánh thu_kho lọc theo kho vẫn dùng biến này).
-- -----------------------------------------------------------------------------
create or replace function public.lich_su_giao_dich_doi_tac(p_doi_tac_id uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ma_phieu text, chung_tu_id uuid, loai text, ngay timestamp with time zone, so_dong bigint, tong_so_luong numeric, ghi_chu text, tong_so_dong bigint)
language plpgsql
stable security definer
set search_path = ''
as $function$
#variable_conflict use_column
declare
  v_vai_tro    text   := (select public.vai_tro_hien_tai())::text;
  v_kho        uuid[] := coalesce((select public.kho_hien_tai()), '{}'::uuid[]);
  v_xem_kv     boolean;
  v_kich_thuoc int    := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
begin
  if v_vai_tro is null then
    raise exception 'Hết phiên hoặc tài khoản không còn hiệu lực' using errcode = '42501';
  end if;
  -- D-13/T-06-08: đổi từ vai trò cứng sang công tắc theo người.
  v_xem_kv := (select public.xem_duoc_lich_su_kiotviet());

  return query
  with dt as (
    select d.id, d.ma, d.loai from public.doi_tac d where d.id = p_doi_tac_id
  ),
  tat_ca as (
    select 'HE_THONG'::text as nguon, ct.so_ct as ma_phieu, ct.id as chung_tu_id,
           ct.loai_ct::text as loai,
           coalesce(ct.ngay_ghi_so, ct.ngay_ct::timestamptz) as ngay,
           (select count(*) from public.chung_tu_dong cd where cd.chung_tu_id = ct.id) as so_dong,
           ct.tong_so_luong, ct.ghi_chu
    from public.chung_tu ct
    where ct.doi_tac_id = p_doi_tac_id
      and (v_vai_tro <> 'thu_kho'
           or ct.kho_id = any(v_kho)
           or ct.kho_den_id = any(v_kho))

    union all

    select 'KIOTVIET_NHAP'::text, l.ma_phieu, null::uuid, 'NHAP'::text,
           min(l.ngay::timestamptz), count(*), sum(l.so_luong), max(l.ghi_chu)
    from public.luu_tru_nhap_kiotviet l, dt
    where v_xem_kv and dt.loai in ('NCC','CA_HAI')
      and (l.nha_cung_cap like dt.ma || ' %'
           or (dt.ma = 'NCC900001' and l.nha_cung_cap like '0317415317 %'))
    group by l.ma_phieu

    union all

    select 'KIOTVIET_BAN'::text, h.ma_hoa_don, null::uuid, 'XUAT'::text,
           min(h.ngay::timestamptz), count(*), sum(h.so_luong), max(h.ghi_chu)
    from public.luu_tru_hoa_don_kiotviet h, dt
    where v_xem_kv and dt.loai in ('KHACH','CA_HAI')
      and ((dt.ma = 'KHACHLE' and public.chuan_hoa_ghi_chu(h.ghi_chu) is null)
           or public.chuan_hoa_ghi_chu(h.ghi_chu) in (
                select a.gia_tri from public.anh_xa_ghi_chu_kiotviet a
                where a.doi_tac_id = p_doi_tac_id
                  and a.loai in ('KHACH','KHACH_VA_SALE')))
    group by h.ma_hoa_don
  )
  select t.nguon, t.ma_phieu, t.chung_tu_id, t.loai, t.ngay, t.so_dong,
         t.tong_so_luong, t.ghi_chu, count(*) over ()
  from tat_ca t
  order by t.ngay desc nulls last
  limit v_kich_thuoc
  offset (greatest(coalesce(p_trang,1),1) - 1) * v_kich_thuoc;
end $function$;

revoke all    on function public.lich_su_giao_dich_doi_tac(uuid, int, int) from public, anon;
grant execute on function public.lich_su_giao_dich_doi_tac(uuid, int, int) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. CỬA 3b (T-06-09, phát hiện ngoài nghiên cứu ban đầu): the_kho_san_pham (0062)
--    — bỏ hẳn hai nhánh union đọc luu_tru_* và biến v_xem_kv/v_ma (chỉ dùng cho
--    hai nhánh đó). D-11: lịch sử KiotViet xem ở tra_cuu_lich_su_kiotviet, không
--    trộn vào thẻ kho. Mọi phần khác (tồn lũy kế, lọc kho thủ kho, giấu giá vốn)
--    giữ nguyên từng ký tự so với 0062. Chữ ký/kiểu trả về không đổi nên dùng
--    create or replace, không cần drop.
-- -----------------------------------------------------------------------------
create or replace function public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid default null::uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  -- D-11 Phase 6: lịch sử KiotViet xem ở tra_cuu_lich_su_kiotviet, không trộn vào
  -- thẻ kho — hai nhánh union đọc luu_tru_nhap_kiotviet/luu_tru_hoa_don_kiotviet
  -- (nguồn KIOTVIET_NHAP/KIOTVIET_BAN) của 0059/0062 đã bị BỎ ở đây.
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           m.ngay                                                 as ngay,
           m.kho_id                                               as kho_id,
           k.ten                                                  as ten_kho,
           m.chung_tu_id                                          as chung_tu_id,
           ct.so_ct                                               as so_ct,
           ct.loai_ct::text                                       as loai_ct,
           dt.ten                                                 as doi_tac,
           case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
           case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
           case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
           m.la_but_toan_dao                                      as la_but_toan_dao,
           ct.ghi_chu                                             as ghi_chu,
           m.ngay                                                 as sx_ngay,
           m.created_at                                           as sx_phu,
           m.id                                                   as sx_id,
           true                                                   as la_he_thong
    from public.kho_movement m
    join public.kho k on k.id = m.kho_id
    left join public.chung_tu ct on ct.id = m.chung_tu_id
    left join public.doi_tac dt on dt.id = ct.doi_tac_id
    where m.san_pham_id = p_san_pham_id
      and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
      and (p_kho_id is null or m.kho_id = p_kho_id)
  ),
  voi_luy_ke as (
    select t.*,
           case when t.la_he_thong then
             sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0)) filter (where t.la_he_thong)
               over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
           end as ton_luy_ke
    from tat_ca t
  )
  select v.nguon, v.ngay, v.kho_id, v.ten_kho, v.chung_tu_id, v.so_ct, v.loai_ct,
         v.doi_tac, v.so_luong_nhap, v.so_luong_xuat, v.gia_von_tai_thoi_diem,
         v.la_but_toan_dao, v.ghi_chu, count(*) over (), v.ton_luy_ke
  from voi_luy_ke v
  order by v.sx_ngay desc, v.sx_phu desc, v.sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

revoke all    on function public.the_kho_san_pham(uuid, uuid, int, int) from public, anon;
grant execute on function public.the_kho_san_pham(uuid, uuid, int, int) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Tự kiểm: không sót bảng nào chưa bật RLS.
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(tablename, ', ') into v_thieu
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if v_thieu is not null then
    raise exception 'Còn bảng chưa bật RLS: %', v_thieu;
  end if;
end $$;
