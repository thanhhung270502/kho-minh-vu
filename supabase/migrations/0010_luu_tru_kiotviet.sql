-- =============================================================================
-- 0010 — Bảng lưu trữ chứng từ KiotViet cũ
--
-- 594 dòng nhập và 4.732 dòng hóa đơn cũ để TRA CỨU, không nạp vào chung_tu:
-- lịch sử cũ có đơn giá bằng 0 trên toàn bộ dòng và thiếu dữ kiện để dựng thành
-- chứng từ hợp lệ. Bê vào chung_tu sẽ làm bẩn sổ cái ngay từ ngày đầu.
--
-- Số hiệu 0010 đặt sớm (trước 0011) là cố ý: hai bảng này không FK tới bảng nào
-- nên không phải chờ chung_tu, và script import cần đích ghi sẵn sàng.
-- =============================================================================

create table public.luu_tru_nhap_kiotviet (
  id uuid primary key default uuid_generate_v4(),
  ma_phieu text,
  ngay text,                 -- giữ nguyên dạng chuỗi của nguồn, không ép kiểu
  nha_cung_cap text,
  ma_hang text,
  ten_hang text,
  so_luong numeric(18,4),
  don_gia numeric(18,4),
  thanh_tien numeric(18,0),
  ghi_chu text,
  -- Cả dòng gốc. Phát hiện bỏ sót trường nào thì đọc lại được mà không phải
  -- mở lại file Excel.
  du_lieu_goc jsonb,
  nap_luc timestamptz not null default now()
);
create index idx_luu_tru_nhap_ma_hang on public.luu_tru_nhap_kiotviet (ma_hang);

create table public.luu_tru_hoa_don_kiotviet (
  id uuid primary key default uuid_generate_v4(),
  ma_hoa_don text,
  ngay text,
  khach_hang text,
  ma_hang text,
  ten_hang text,
  so_luong numeric(18,4),
  don_gia numeric(18,4),
  thanh_tien numeric(18,0),
  ghi_chu text,
  du_lieu_goc jsonb,
  nap_luc timestamptz not null default now()
);
create index idx_luu_tru_hoa_don_ma_hang on public.luu_tru_hoa_don_kiotviet (ma_hang);
-- Index trên ghi_chu là cố ý: tên khách hàng thật nằm trong cột này.
-- DLIEU-04 ở Phase 2 sẽ quét nó để trích 8 tên khách (QUỲNH, NGỌC, TỐT...).
create index idx_luu_tru_hoa_don_ghi_chu on public.luu_tru_hoa_don_kiotviet (ghi_chu);
