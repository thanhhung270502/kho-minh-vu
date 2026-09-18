---
phase: 02-khung-ung-dung
plan: 06
status: complete
completed: 2026-09-18
requirements: [DMUC-01, DMUC-02, DMUC-03, DMUC-05]
---

# Plan 02-06 — RPC danh sách, chi tiết, thẻ kho

## Điều bất thường phải ghi rõ

Migration của plan này (0030, 0031) **do một phiên làm việc khác áp thẳng lên database
cloud**, file nguồn không có trong repo, không ở nhánh nào, không ở máy này. Phiên hiện tại
phát hiện khi chạy test đầu tiên: cloud đã có `danh_sach_san_pham`, `chi_tiet_san_pham`,
`the_kho_san_pham`, `xac_nhan_da_ra`, `la_can_ra` và hai cột `can_ra_dvt`, `da_xac_nhan_ra`.

Xử lý (người dùng chọn): **dựng lại file migration từ chính database** —
`pg_get_functiondef`, `pg_constraint`, `pg_policies`, `pg_indexes`, comment — rồi nạp thử
từng file trên cloud trong transaction rollback để chắc chúng chạy được. Commit `b3dd55c`.
`supabase migration list --linked` báo local và remote khớp 0001–0036.

Phiên kia **không để lại test**. Toàn bộ pgTAP của plan này viết mới ở đây, và chính nó là
bằng chứng bản cài kia đúng plan.

## Kết quả

- `supabase/tests/41_danh_sach_san_pham_test.sql` — **16/16 xanh**: phân trang + tổng số
  dòng, mặc định chỉ mã đang kinh doanh, trang vượt quá trả 0 dòng, tìm không dấu, lọc công
  đoạn, lọc dưới định mức, Cần rà và "xác nhận đã rà thì rời danh sách", giá vốn chỉ quản lý
  thấy, tồn của thủ kho chỉ cộng kho được phân, tham số sắp xếp lạ bị bỏ qua, không phiên
  hợp lệ thì 42501.
- `supabase/tests/42_the_kho_test.sql` — **7/7 xanh**: gộp movement hệ mới với dòng KiotViet
  cũ, nhãn nguồn, hóa đơn cũ vào cột xuất, lọc theo kho loại dòng KiotViet, sắp xếp mới nhất
  trước, thủ kho chỉ thấy kho mình và không nhận giá vốn.

## Số liệu thật trên cloud

| Chỉ số | Giá trị | Kỳ vọng |
|---|---|---|
| Mã "Cần rà" | 364 | 364 (356 mua ngoài chưa rõ + 8 ĐVT mâu thuẫn) |
| Mã gắn cờ ĐVT mâu thuẫn | 8 | 8 |
| Mã gợi ý công đoạn theo đuôi | 145 | 145 |
| Giá trị ghi chú chuẩn hóa | 150 | ~150 |

## Bài học

- pgTAP: đang ở role `authenticated` thì helper `dang_nhap_nhu` không đọc được `auth.users`
  (42501 "permission denied for table users"). Phải `pg_temp.dang_xuat()` trước khi đổi
  tài khoản.
- `danh_sach_san_pham(p_tu_khoa => '<mã>')` có nhánh `word_similarity` nên trả nhiều hơn một
  dòng: truy vấn con trong assertion phải lọc thêm `where ma_hang = ...`.
- `pg_get_functiondef` KHÔNG kèm dấu `;` — dựng lại file migration phải tự thêm, nếu không
  câu lệnh kế tiếp bị nuốt vào thân hàm.
