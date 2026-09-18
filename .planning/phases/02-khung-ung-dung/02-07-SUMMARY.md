---
phase: 02-khung-ung-dung
plan: 07
status: complete
completed: 2026-09-18
requirements: [DTAC-01, DTAC-02, DTAC-03, DLIEU-04]
---

# Plan 02-07 — Đối tác, rà ghi chú, lịch sử giao dịch

Migration 0032/0033 do phiên làm việc khác áp lên cloud; file được dựng lại từ database ở
commit `b3dd55c` (xem 02-06-SUMMARY để biết bối cảnh). Phiên này viết bộ test còn thiếu.

## Kết quả

`supabase/tests/51_doi_tac_ghi_chu_test.sql` — **17/17 xanh**:

- Có sẵn đối tác "Khách lẻ"; mã khách tự sinh `KH######`; sinh mã NCC bỏ qua dải 900000.
- `danh_sach_doi_tac` tìm không dấu theo tên và theo số điện thoại; đối tác `CA_HAI` hiện
  cả khi lọc nhà cung cấp.
- `danh_sach_ghi_chu_kiotviet` gộp hai cách viết của cùng một tên (`'  zqx  Tiến '` và
  `'ZQX TIẾN'`) thành một giá trị và đếm theo hóa đơn — xác nhận `upper()` gập đúng chữ có
  dấu trên collation của database này.
- `quyet_ghi_chu` tạo khách mới kèm mã tự sinh, lưu ánh xạ; tổ hợp `KHACH_VA_SALE` thiếu
  khách bị CHECK chặn (23514); giá trị đã quyết rời danh sách "chưa rà"; `bo_quyet_ghi_chu`
  hủy được.
- `lich_su_giao_dich_doi_tac` gom hóa đơn KiotViet cũ theo mã hóa đơn cho khách đã ánh xạ,
  và khớp NCC theo tiền tố mã kèm khoảng trắng — `DT-ZQX-2X` KHÔNG lọt vào lịch sử của
  `DT-ZQX-2`.
- Thủ kho gọi RPC rà ghi chú nhận 42501.

## Dữ liệu thật

150 giá trị ghi chú chuẩn hóa trên 4.732 dòng hóa đơn lưu trữ — đúng con số nêu trong
02-CONTEXT (D-28). Việc rà thật do người văn phòng làm ở màn hình của plan 18.
