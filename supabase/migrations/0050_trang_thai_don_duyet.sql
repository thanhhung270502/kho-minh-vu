-- =============================================================================
-- 0050 — Đổi trục enum trang_thai_ddh sang trục DUYỆT (D-04, D-05)
--
-- trang_thai_ddh trước đây đo trục GIAO (MOI | DA_XUAT_MOT_PHAN | DA_XUAT_DU |
-- DA_HUY). D-04 chốt: cột này chỉ còn mang trục DUYỆT (TAM | DA_XAC_NHAN |
-- HOAN_THANH | DA_HUY). Trục giao (đã xuất bao nhiêu / còn lại bao nhiêu) tính
-- KHI ĐỌC từ so_luong_da_xuat so với so_luong_dat trên từng dòng đơn — không
-- phải một enum thứ hai.
--
-- don_dat_hang đang 0 dòng (đo 20/09/2026 trên kho-vu-tru) nên không có dữ liệu
-- thật phải chuyển đổi — mệnh đề USING dưới đây chỉ để migration không phụ
-- thuộc giả định về dữ liệu, không phải một bước di trú dữ liệu thật.
--
-- THỨ TỰ BẮT BUỘC (khuôn theo 0041_kho_theo_dong.sql):
--   1. Bỏ default + drop partial index PHỤ THUỘC kiểu cũ trước khi đụng kiểu.
--   2. Đổi tên kiểu cũ, tạo kiểu mới, ALTER COLUMN ... TYPE ... USING.
--   3. Dựng lại partial index với hai trạng thái còn việc phải làm.
--   4. Viết lại hàm cập nhật tiến độ đơn — làm bước này TRƯỚC bước 2 sẽ lỗi
--      "invalid input value for enum" vì literal cũ không còn tồn tại.
-- =============================================================================

-- --- Bước 1: gỡ default + index phụ thuộc kiểu cũ ---------------------------
alter table public.don_dat_hang alter column trang_thai drop default;
drop index if exists public.idx_ddh_trang_thai;

-- --- Bước 2: đổi tên kiểu cũ, tạo kiểu mới, chuyển cột ----------------------
alter type public.trang_thai_ddh rename to trang_thai_ddh_old;

create type public.trang_thai_ddh as enum ('TAM', 'DA_XAC_NHAN', 'HOAN_THANH', 'DA_HUY');

comment on type public.trang_thai_ddh is
  'Trục DUYỆT của đơn đặt hàng (D-04): TAM -> DA_XAC_NHAN -> HOAN_THANH (+ DA_HUY). Trục giao (đã xuất/còn lại) KHÔNG nằm ở đây — tính khi đọc từ so_luong_da_xuat so với so_luong_dat trên từng dòng đơn.';

-- Bảng đang 0 dòng nên ánh xạ dưới đây chỉ để USING hợp lệ, không phải di trú
-- dữ liệu thật. Hai enum không có phép cast ngầm định nên phải ép qua text.
alter table public.don_dat_hang
  alter column trang_thai type public.trang_thai_ddh
  using (
    case trang_thai::text
      when 'MOI'              then 'TAM'
      when 'DA_XUAT_MOT_PHAN' then 'DA_XAC_NHAN'
      when 'DA_XUAT_DU'       then 'HOAN_THANH'
      else trang_thai::text
    end
  )::public.trang_thai_ddh;

alter table public.don_dat_hang alter column trang_thai set default 'TAM';

drop type public.trang_thai_ddh_old;

-- --- Bước 3: dựng lại partial index với trạng thái sống mới -----------------
-- Chỉ hai trạng thái còn việc phải làm cần được quét thường xuyên, giữ đúng ý
-- đồ partial index gốc của 0006.
create index idx_ddh_trang_thai on public.don_dat_hang (trang_thai)
  where trang_thai in ('TAM', 'DA_XAC_NHAN');

-- --- Bước 4: viết lại hàm cập nhật tiến độ đơn -------------------------------
-- Khối cập nhật so_luong_da_xuat GIỮ NGUYÊN TỪNG KÝ TỰ so với bản 0011
-- (dòng 149-159) — đây không phải lần sửa logic tính. Chỉ đổi khối cập nhật
-- don_dat_hang.trang_thai: bỏ biến đếm số dòng đã xuất một phần (không còn
-- khái niệm đó ở trục duyệt), chỉ tự đóng đơn khi mọi dòng giao đủ VÀ đơn đang
-- ở trạng thái đã xác nhận. Đơn tạm và đơn đã hủy không bị đụng tới ở đây —
-- chuyển đơn tạm sang đã xác nhận là việc của RPC duyệt đơn ở plan sau, không
-- phải của hàm này.
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
end;
$$;
