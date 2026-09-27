---
status: partial
phase: 09-quan-ly-hinh-anh
source: [09-VERIFICATION.md]
started: 2026-09-26T14:11:08Z
updated: 2026-09-26T14:11:08Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Chụp ảnh bằng điện thoại thật
expected: Mở chi tiết một mã trên điện thoại (bản Vercel hoặc localhost qua IP LAN) → "Chụp ảnh" mở camera sau → chụp → ảnh nén WebP hiện trong thư viện; trên iPhone ảnh HEIC được iOS tự chuyển JPEG, không báo lỗi định dạng.
result: [pending]

### 2. Vai trò không có quyền sửa không thấy nút
expected: Đăng nhập thukho1 và chixem → chi tiết mã có ảnh: xem/phóng to được, KHÔNG có nút "Chụp ảnh", "Chọn ảnh", "Đặt làm ảnh chính", "Xóa".
result: [pending]

### 3. Bản production trên Vercel
expected: Sau khi khai APPS_SCRIPT_URL / APPS_SCRIPT_SECRET và redeploy: bảng danh mục lọc "Có ảnh" hiện thumbnail; upload một ảnh thử thành công.
result: [pending]

### 4. Chép toàn bộ ảnh KiotViet (người dùng tự chạy)
expected: `npm run import:kiotviet-images -- --ghi` chép ~1.072 ảnh còn lại; dry-run sau đó báo "Sẽ chép lần này: 0" (trừ link hỏng liệt kê).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
