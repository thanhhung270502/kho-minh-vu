-- =============================================================================
-- 0074 — thẻ kho trả thêm lý do xuất âm
--
-- Lỗi (checklist kiểm thử 28/09, bước 5.6): ghi sổ phiếu xuất âm bắt chọn lý do
-- và lưu vào chung_tu.ly_do_xuat_am, nhưng thẻ kho — nơi thủ kho truy vết khi
-- lệch — không hiện lý do đó. Thêm cột `ly_do_xuat_am` (mã; nhãn tiếng Việt do
-- giao diện dịch bằng negativeReasonLabel, một chỗ duy nhất giữ nhãn).
--
-- Đổi RETURNS TABLE nên phải drop + create; cấp lại quyền như 0064. Thân hàm
-- giữ nguyên thứ tự xếp của 0073.
-- =============================================================================

drop function public.the_kho_san_pham(uuid, uuid, int, int);

create function public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid default null::uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric, ly_do_xuat_am text)
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
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           -- Ngày chứng từ + giờ ghi sổ thật, dựng lại theo giờ VN.
           (((m.ngay at time zone 'Asia/Ho_Chi_Minh')::date
             + (m.created_at at time zone 'Asia/Ho_Chi_Minh')::time)
             at time zone 'Asia/Ho_Chi_Minh')                     as ngay,
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
           -- Lý do lưu ở mức phiếu; chỉ gắn vào dòng xuất thật của phiếu đó
           -- (bút toán đảo khi hủy phiếu không phải "xuất âm").
           case when m.so_luong < 0 and not m.la_but_toan_dao
                then ct.ly_do_xuat_am end                         as ly_do_xuat_am,
           (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date         as sx_ngay,
           m.created_at                                           as sx_phu,
           m.id                                                   as sx_id
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
           sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0))
             over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
             as ton_luy_ke
    from tat_ca t
  )
  -- Mọi cột mang tiền tố `v.` để không trùng tên biến OUT của RETURNS TABLE (0062).
  select v.nguon, v.ngay, v.kho_id, v.ten_kho, v.chung_tu_id, v.so_ct, v.loai_ct,
         v.doi_tac, v.so_luong_nhap, v.so_luong_xuat, v.gia_von_tai_thoi_diem,
         v.la_but_toan_dao, v.ghi_chu, count(*) over (), v.ton_luy_ke,
         v.ly_do_xuat_am
  from voi_luy_ke v
  order by v.sx_ngay desc, v.sx_phu desc, v.sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

revoke all    on function public.the_kho_san_pham(uuid, uuid, int, int) from public, anon;
grant execute on function public.the_kho_san_pham(uuid, uuid, int, int) to authenticated;
