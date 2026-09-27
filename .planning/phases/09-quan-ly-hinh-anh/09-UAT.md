---
status: testing
phase: 09-quan-ly-hinh-anh
source: [09-01..09-13-SUMMARY.md, 09-VERIFICATION.md, 09-HUMAN-UAT.md]
started: 2026-09-26T14:18:02Z
updated: 2026-09-26T14:18:02Z
---

## Current Test

number: 7
name: Nhìn bảng danh mục và chi tiết mã có ảnh
expected: |
  Mở /danh-muc, lọc Hình ảnh = Có ảnh → 40 mã, mỗi dòng có thumbnail ảnh thật ở cột "Ảnh";
  dòng tổng "Tổng cộng — 40 mã" không bị ép hẹp. Bấm một thumbnail → ảnh phóng to tại chỗ.
  Mở chi tiết một mã có ảnh → mục "Hình ảnh" nằm dưới thông tin mã, có nhãn "Ảnh chính".
awaiting: user response

## Tests

### 1. Cold start: dev server khởi động lại với biến Apps Script
expected: Tắt và bật lại npm run dev, /danh-muc tải được dữ liệu thật, /anh/<id> trả ảnh.
result: pass
note: Claude kiểm 26/09 — khởi động lại preview server, 175/175 quyền route, ảnh thật trả 200.

### 2. Upload ảnh từ máy tính
expected: "Chọn ảnh" → file PNG/JPEG → ảnh nén WebP hiện trong thư viện, hàng đợi báo "Xong".
result: pass
note: Claude kiểm trên localhost (PNG 1600×1000 → WebP 6,6 KB, thumb 1,8 KB, ~10 s).

### 3. Đặt ảnh chính
expected: "Đặt làm ảnh chính" → ảnh đó lên đầu, gắn nhãn "Ảnh chính", thumbnail bảng danh mục đổi theo.
result: pass
note: Claude kiểm trên localhost.

### 4. Xóa ảnh chính → ảnh kế tiếp lên thay
expected: Xóa có hộp xác nhận; xóa ảnh chính thì ảnh còn lại thành chính; /anh/<id đã xóa> trả 404; DB xóa mềm.
result: pass
note: Claude kiểm trên localhost + psql.

### 5. Lọc Có ảnh / Chưa có ảnh
expected: ?anh=co → chỉ mã có ảnh; ?anh=chua → mã chưa có ảnh (ô xám); rỗng thì báo "Không có mã nào khớp bộ lọc".
result: pass
note: Claude kiểm trên localhost (40 / 3.226 sau chép thử).

### 6. Ảnh chỉ xem được khi đăng nhập, lần hai lấy từ cache
expected: Không đăng nhập → 401; lần xem thứ hai không gọi Apps Script.
result: pass
note: Server-Timing 2678 ms → 1 ms; xem lại bảng 0 request /anh.

### 7. Nhìn bảng danh mục và chi tiết mã có ảnh
expected: /danh-muc lọc Có ảnh → 40 mã có thumbnail thật; dòng tổng không bị ép hẹp; bấm thumbnail phóng to tại chỗ; chi tiết mã có mục "Hình ảnh" với nhãn "Ảnh chính".
result: [pending]

### 8. Chụp ảnh bằng điện thoại thật
expected: Trên điện thoại, chi tiết mã → "Chụp ảnh" mở camera sau → chụp → ảnh hiện trong thư viện; iPhone không báo lỗi định dạng HEIC.
result: issue
reported: "khi deploy lên dev bị lỗi không thể upload/chụp ảnh, ở local vẫn bình thường" — iPhone hiện "Trình duyệt này không nén được ảnh WebP"
severity: blocker
fix: fbaf728 — WebKit không mã hóa WebP trên canvas; client dự phòng JPEG, route + Apps Script nhận JPEG. Chờ người dùng clasp push + deploy New version rồi thử lại.

### 9. Thủ kho / chỉ xem không thấy nút sửa ảnh
expected: Đăng nhập thukho1 hoặc chixem → chi tiết mã có ảnh: xem và phóng to được, KHÔNG có "Chụp ảnh", "Chọn ảnh", "Đặt làm ảnh chính", "Xóa"; bảng danh mục vẫn thấy thumbnail.
result: [pending]

### 10. Bản production trên Vercel
expected: Sau khi khai APPS_SCRIPT_URL / APPS_SCRIPT_SECRET trên Vercel và redeploy: lọc Có ảnh hiện thumbnail, upload một ảnh thử thành công.
result: [pending]

### 11. Chép toàn bộ ảnh KiotViet
expected: npm run import:kiotviet-images -- --ghi chép ~1.072 ảnh còn lại; dry-run sau đó báo "Sẽ chép lần này: 0" (trừ link hỏng liệt kê).
result: [pending]

## Summary

total: 11
passed: 6
issues: 1
pending: 4
skipped: 0

## Gaps

- truth: "Chụp/chọn ảnh trên iPhone upload được"
  status: fixed_pending_retest
  reason: "User reported: iPhone báo 'Trình duyệt này không nén được ảnh WebP'"
  severity: blocker
  test: 8
  root_cause: "WebKit (Safari + mọi trình duyệt iOS) canvas.toBlob('image/webp') trả PNG; compress-image.ts, route tai-len và Apps Script đều chỉ nhận WebP"
  artifacts: [src/features/images/lib/compress-image.ts, src/app/api/anh/tai-len/route.ts, apps-script/Code.gs]
  fix_commit: fbaf728
