-- =============================================================================
-- 0050 — Đổi trục enum trang_thai_ddh sang trục DUYỆT (Phase 4, D-04/D-05)
--
-- trang_thai_ddh trước đây đo TRỤC GIAO (MOI | DA_XUAT_MOT_PHAN | DA_XUAT_DU |
-- DA_HUY). D-04 chốt: đơn chỉ cần trục DUYỆT (TAM | DA_XAC_NHAN | HOAN_THANH |
-- DA_HUY). Trục giao (đã xuất bao nhiêu / còn lại bao nhiêu) tính KHI ĐỌC từ
-- so_luong_da_xuat so với so_luong_dat trên từng dòng, không cần enum riêng.
--
-- don_dat_hang đang 0 dòng (đo 20/09/2026) — không có dữ liệu thật phải chuyển
-- đổi, nhưng vẫn viết migration như thể có dữ liệu để không phụ thuộc giả định
-- bảng rỗng (bài học pgtap-va-test.md).
--
-- Thứ tự bắt buộc (04-PATTERNS.md mục WU-1): bỏ default + drop index PHỤ THUỘC
-- kiểu cũ trước, đổi kiểu, dựng lại index, RỒI MỚI viết lại hàm dùng literal
-- của kiểu mới. Làm hàm trước bước đổi kiểu sẽ lỗi "invalid input value for
-- enum" vì literal 'DA_XUAT_DU' không còn tồn tại trong kiểu cũ tại thời điểm
-- đó (kiểu cũ đã bị rename).
-- =============================================================================

-- 1. Bỏ default và index phụ thuộc kiểu cũ TRƯỚC khi đụng vào kiểu.
alter table public.don_dat_hang alter column trang_thai drop default;
drop index if exists public.idx_ddh_trang_thai;

-- 2. Đổi tên kiểu cũ, tạo kiểu mới, chuyển cột bằng USING (ép qua text vì hai
--    enum không có phép cast ngầm định).
alter type public.trang_thai_ddh rename to trang_thai_ddh_old;

create type public.trang_thai_ddh as enum ('TAM', 'DA_XAC_NHAN', 'HOAN_THANH', 'DA_HUY');

comment on type public.trang_thai_ddh is
  'Trục DUYỆT của đơn đặt hàng: TAM (nháp) -> DA_XAC_NHAN (quản lý duyệt) -> HOAN_THANH (đóng, tự động khi giao đủ hoặc quản lý đóng sớm), cộng DA_HUY. Trục GIAO (đã xuất/còn lại) KHÔNG nằm trong enum này — tính khi đọc từ so_luong_da_xuat so với so_luong_dat trên don_dat_hang_dong.';

alter table public.don_dat_hang
  alter column trang_thai type public.trang_thai_ddh
  using (
    case trang_thai::text
      when 'MOI'               then 'TAM'
      when 'DA_XUAT_MOT_PHAN'  then 'DA_XAC_NHAN'
      when 'DA_XUAT_DU'        then 'HOAN_THANH'
      else trang_thai::text
    end
  )::public.trang_thai_ddh;

alter table public.don_dat_hang alter column trang_thai set default 'TAM';

drop type public.trang_thai_ddh_old;

-- 3. Dựng lại partial index với hai trạng thái sống mới (còn việc phải làm).
create index idx_ddh_trang_thai on public.don_dat_hang (trang_thai)
  where trang_thai in ('TAM', 'DA_XAC_NHAN');

-- 4. Viết lại _cap_nhat_tien_do_ddh — chỉ SAU khi kiểu mới đã tồn tại.
--    Khối cập nhật so_luong_da_xuat GIỮ NGUYÊN TỪNG KÝ TỰ so với bản 0011:
--    đây không phải lần sửa logic tính tổng đã xuất.
--    Khối cập nhật trang_thai đổi hẳn: chỉ tự đóng HOAN_THANH cho đơn đã
--    DA_XAC_NHAN và giao đủ. Đơn TAM không tự đổi trạng thái ở đây — chuyển
--    TAM -> DA_XAC_NHAN là việc của RPC xac_nhan_don (plan 04-02). Đơn DA_HUY
--    không bị đụng tới vì điều kiện where chỉ khớp trang_thai = 'DA_XAC_NHAN'.
create or replace function public._cap_nhat_tien_do_ddh(p_ddh_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_con_thieu integer;
begin
  update public.don_dat_hang_dong d
  set so_luong_da_xuat = coalesce((
    select sum(ctd.so_luong)
    from public.chung_tu_dong ctd
    join public.chung_tu ct on ct.id = ctd.chung_tu_id
    where ct.don_dat_hang_id = p_ddh_id
      and ct.loai_ct = 'XUAT'
      and ct.trang_thai = 'HOAN_THANH'
      and ctd.san_pham_id = d.san_pham_id
  ), 0)
  where d.don_dat_hang_id = p_ddh_id;

  select count(*) into v_con_thieu
  from public.don_dat_hang_dong
  where don_dat_hang_id = p_ddh_id and so_luong_da_xuat < so_luong_dat;

  update public.don_dat_hang
  set trang_thai = 'HOAN_THANH'::public.trang_thai_ddh
  where id = p_ddh_id
    and trang_thai = 'DA_XAC_NHAN'
    and v_con_thieu = 0;
end; $$;
