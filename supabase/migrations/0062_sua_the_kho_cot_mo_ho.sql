-- =============================================================================
-- 0062 — Sửa lỗi 0059: the_kho_san_pham báo "column reference is ambiguous"
--
-- 0059 viết câu SELECT cuối bằng tên cột TRƠN (nguon, ngay, kho_id, ...). Hàm khai
-- RETURNS TABLE(nguon text, ngay timestamptz, kho_id uuid, ...), nên trong PL/pgSQL
-- mỗi tên đó CŨNG là một biến OUT. Postgres không biết `nguon` là cột của CTE hay
-- biến OUT, và từ chối cả câu:
--
--   ERROR 42702: column reference "nguon" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--
-- Lỗi nổ ở MỌI lần gọi (lúc RETURN QUERY), nên tab "Thẻ kho" ở trang chi tiết mã
-- hàng lỗi với mọi người dùng từ lúc 0059 được áp. Bắt được bằng pgTAP 33 chạy
-- ngay sau khi đẩy — plan 05-02 chỉ kiểm được bằng grep vì bản làm việc không có
-- database, và grep không bắt được lỗi phân giải tên.
--
-- Bản gốc 0031 không dính lỗi này vì viết `t.nguon, t.ngay, ...`. Sửa đúng một chỗ:
-- thêm tiền tố bảng `v.` cho mọi cột ở câu SELECT cuối và ORDER BY cuối. Toàn bộ
-- phần còn lại của thân hàm giữ nguyên từng ký tự so với 0059. Kiểu trả về không
-- đổi nên dùng `create or replace`, không cần drop — và vì không drop nên quyền đã
-- cấp ở 0059 giữ nguyên; vẫn cấp lại cho rõ ràng.
-- =============================================================================

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
  -- SỬA Ở ĐÂY: mọi cột mang tiền tố `v.` để không trùng tên với biến OUT của
  -- RETURNS TABLE (xem đầu file).
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
