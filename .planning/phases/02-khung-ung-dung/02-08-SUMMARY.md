---
phase: 02-khung-ung-dung
plan: 08
status: complete
completed: 2026-09-18
requirements: [DMUC-06, DMUC-04]
---

# Plan 02-08 — Import danh mục và rà hàng loạt

Migration 0034/0035 do phiên làm việc khác áp lên cloud; file dựng lại ở commit `b3dd55c`.
Phiên này viết bộ test còn thiếu.

## Kết quả

`supabase/tests/61_import_danh_muc_test.sql` — **14/14 xanh**:

- Chế độ kiểm tra đếm đúng số mã thêm/sửa và **không ghi gì**.
- Ba dòng lỗi được gom đủ (không dừng ở lỗi đầu), mỗi lỗi chỉ đúng dòng + cột.
- Có lỗi thì không nạp dòng nào — không nạp nửa vời.
- Mã lặp trong cùng file báo lỗi cả hai dòng.
- Khớp công đoạn theo tên không dấu, không phân biệt hoa thường (`'carbon'` → CARBON).
- Ô trống giữ nguyên giá trị cũ.
- Văn phòng đặt giá bán → lỗi dòng `gia_ban`, không ném exception giữa chừng.
- **File KiotViet không ghi đè công đoạn đã rà**: mã có sẵn giữ CARBON, mã mới nhận
  MUA_NGOAI qua `cong_doan_khi_tao_moi`. Đây là điều khoản chống mất công rà của D-22.
- Thủ kho import → 42501.

`supabase/tests/62_ra_hang_loat_test.sql` — **8/8 xanh**: gợi ý đúng 4 mã có đuôi (kể cả
`-SĐM` → Sơn), áp dụng chỉ đổi mã còn mua ngoài, gán hàng loạt không đụng trường khác,
trường ngoài danh sách cho phép bị chặn 23514, thủ kho bị chặn 42501.

## Dữ liệu thật

`goi_y_cong_doan_theo_duoi()` trả **145 mã** — đúng con số đã kiểm khi lập plan.
