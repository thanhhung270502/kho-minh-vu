-- =============================================================================
-- 0059 — TON-02 (D-03): thêm cột tồn lũy kế tại thời điểm vào the_kho_san_pham
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD, đọc từ cloud lúc 2026-09-21 09:24 UTC (database
-- `kho-vu-tru`, phonzyruoalimgaovljm) qua Supabase MCP của phiên điều phối, bằng
-- hai câu lệnh:
--   select pg_get_functiondef('public.the_kho_san_pham(uuid,uuid,int,int)'::regprocedure);
--   select * from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.proname = 'the_kho_san_pham';
-- Migration mới nhất trên database lúc đọc: 0057 (khớp repo, không trôi).
--
-- NGUYÊN VĂN pg_get_functiondef ĐỌC ĐƯỢC (chưa sửa gì, dán y nguyên):
--
-- CREATE OR REPLACE FUNCTION public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
--  RETURNS TABLE(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint)
--  LANGUAGE plpgsql
--  STABLE SECURITY DEFINER
--  SET search_path TO ''
-- AS $function$
-- declare
--   v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
--   v_kho uuid[] := (select public.kho_hien_tai());
--   v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
--   v_xem_kv boolean;
--   v_ma text;
--   v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
--   v_tr int := greatest(coalesce(p_trang, 1), 1);
-- begin
--   if v_vai_tro is null then
--     raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
--       using errcode = '42501';
--   end if;
--   v_xem_kv := v_vai_tro in ('quan_ly', 'van_phong');
--   select sp.ma_hang into v_ma from public.san_pham sp where sp.id = p_san_pham_id;
--   return query
--   with tat_ca as (
--     select 'HE_THONG'::text                                       as nguon,
--            m.ngay                                                 as ngay,
--            m.kho_id                                               as kho_id,
--            k.ten                                                  as ten_kho,
--            m.chung_tu_id                                          as chung_tu_id,
--            ct.so_ct                                               as so_ct,
--            ct.loai_ct::text                                       as loai_ct,
--            dt.ten                                                 as doi_tac,
--            case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
--            case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
--            case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
--            m.la_but_toan_dao                                      as la_but_toan_dao,
--            ct.ghi_chu                                             as ghi_chu
--     from public.kho_movement m
--     join public.kho k on k.id = m.kho_id
--     left join public.chung_tu ct on ct.id = m.chung_tu_id
--     left join public.doi_tac dt on dt.id = ct.doi_tac_id
--     where m.san_pham_id = p_san_pham_id
--       and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
--       and (p_kho_id is null or m.kho_id = p_kho_id)
--     union all
--     select 'KIOTVIET_NHAP'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
--            l.ma_phieu, 'NHAP'::text, l.nha_cung_cap,
--            l.so_luong, null::numeric, null::numeric, false, l.ghi_chu
--     from public.luu_tru_nhap_kiotviet l
--     where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
--     union all
--     select 'KIOTVIET_BAN'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
--            l.ma_hoa_don, 'XUAT'::text, coalesce(nullif(l.ghi_chu, ''), l.khach_hang),
--            null::numeric, l.so_luong, null::numeric, false, l.ghi_chu
--     from public.luu_tru_hoa_don_kiotviet l
--     where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
--   )
--   select t.nguon, t.ngay, t.kho_id, t.ten_kho, t.chung_tu_id, t.so_ct, t.loai_ct,
--          t.doi_tac, t.so_luong_nhap, t.so_luong_xuat, t.gia_von_tai_thoi_diem,
--          t.la_but_toan_dao, t.ghi_chu, count(*) over ()
--   from tat_ca t
--   order by t.ngay desc
--   limit v_kt offset (v_tr - 1) * v_kt;
-- end;
-- $function$
--
-- ĐỐI CHIẾU VỚI supabase/migrations/0031_the_kho_san_pham.sql TRONG REPO: KHỚP
-- HOÀN TOÀN — cùng 4 tham số, cùng 14 cột trả về đúng tên đúng thứ tự, cùng thân
-- hàm từng ký tự (declare/if/CTE tat_ca/union all/order by/limit). Không có phiên
-- nào khác ghi đè hàm này giữa lúc 0031 được dựng lại từ database (18/09/2026) và
-- lúc đọc lại hôm nay (21/09/2026, 09:24 UTC). KHÔNG LỆCH — Task 2 sửa trực tiếp
-- trên bản đã xác nhận khớp này, không cần dừng plan hay báo người dùng.
--
-- Nhận xét của phiên điều phối, giữ lại để tham khảo khi sửa: cột `ngay` là
-- `timestamp with time zone`, nhưng biến động ghi qua `ghi_so_chung_tu` lấy
-- `p_ct.ngay_ct` (kiểu `date`) nên mọi dòng của cùng một ngày chứng từ rơi đúng
-- nửa đêm — vẫn hòa nhau, vẫn cần khóa phá hòa `created_at, id`. Bản đang chạy
-- chỉ `order by t.ngay desc`, không khóa phá hòa — đúng lỗi migration này sửa.
-- =============================================================================

drop function public.the_kho_san_pham(uuid, uuid, int, int);

create function public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid default null::uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_kv boolean;
  v_ma text;
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  v_xem_kv := v_vai_tro in ('quan_ly', 'van_phong');
  select sp.ma_hang into v_ma from public.san_pham sp where sp.id = p_san_pham_id;
  return query
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
    union all
    select 'KIOTVIET_NHAP'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
           l.ma_phieu, 'NHAP'::text, l.nha_cung_cap,
           l.so_luong, null::numeric, null::numeric, false, l.ghi_chu,
           l.ngay::timestamptz, l.nap_luc, l.id, false
    from public.luu_tru_nhap_kiotviet l
    where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
    union all
    select 'KIOTVIET_BAN'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
           l.ma_hoa_don, 'XUAT'::text, coalesce(nullif(l.ghi_chu, ''), l.khach_hang),
           null::numeric, l.so_luong, null::numeric, false, l.ghi_chu,
           l.ngay::timestamptz, l.nap_luc, l.id, false
    from public.luu_tru_hoa_don_kiotviet l
    where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
  ),
  voi_luy_ke as (
    select t.*,
           case when t.la_he_thong then
             sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0)) filter (where t.la_he_thong)
               over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
           end as ton_luy_ke
    from tat_ca t
  )
  select nguon, ngay, kho_id, ten_kho, chung_tu_id, so_ct, loai_ct,
         doi_tac, so_luong_nhap, so_luong_xuat, gia_von_tai_thoi_diem,
         la_but_toan_dao, ghi_chu, count(*) over (), ton_luy_ke
  from voi_luy_ke
  order by sx_ngay desc, sx_phu desc, sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

revoke all    on function public.the_kho_san_pham(uuid, uuid, int, int) from public, anon;
grant execute on function public.the_kho_san_pham(uuid, uuid, int, int) to authenticated;
comment on function public.the_kho_san_pham(uuid, uuid, int, int) is
  'Thẻ kho một mã (D-21, TON-02/D-03): kho_movement của hệ mới gộp với phiếu nhập/hóa đơn KiotViet cũ, mỗi dòng gắn nhãn nguon. Dòng KiotViet chỉ quản lý/văn phòng thấy và biến mất khi lọc theo kho (dữ liệu cũ không có kho). Cột ton_luy_ke (thêm ở 0059): tồn lũy kế TẠI THỜI ĐIỂM dòng đó phát sinh, chỉ cộng dòng HE_THONG — dòng KiotViet để null, vì số tồn tạm D-05 nạp qua một chứng từ DIEU_CHINH đã bao gồm hiệu ứng ròng của toàn bộ lịch sử KiotViet; cộng thêm từng dòng KiotViet nữa sẽ đếm hai lần. Thứ tự tính lũy kế (cửa sổ) và order by ngoài cùng đều dùng bộ khóa (ngay, created_at/nap_luc, id) — chỉ ngay không đủ vì mọi biến động trong cùng một ngày chứng từ có cùng giá trị ngay (kiểu date ép sang timestamptz nên rơi đúng nửa đêm). Lũy kế tính SAU khi đã áp p_kho_id, nên dòng mới nhất trong phạm vi đang xem luôn khớp đúng ton_kho.so_luong của đúng phạm vi đó — bất biến kiểm bằng pgTAP 33.';
