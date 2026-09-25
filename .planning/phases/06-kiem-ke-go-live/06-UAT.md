---
status: testing
phase: 06-kiem-ke-go-live
source: [06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-10-SUMMARY.md, 06-11-SUMMARY.md, 06-12-SUMMARY.md, 06-13-SUMMARY.md, 06-14-SUMMARY.md, 06-15-SUMMARY.md, 06-16-SUMMARY.md]
started: 2026-09-25T03:30:00Z
updated: 2026-09-25T04:45:00Z
---

## Current Test

number: 6
name: Mở phiên kiểm kê thử
expected: |
  ⚠️ Từ bài này là database thật — KHÔNG bấm Duyệt (bài 12 sẽ hủy phiên thử).
  Mở http://localhost:3000 (đúng server này), đăng nhập vanphong → menu "Kiểm kê" → /kiem-ke
  → "Mở phiên": chọn MỘT kho, MỘT nhóm hàng nhỏ → tạo được, URL chuyển sang /kiem-ke/<mã dài>,
  có số phiếu. Màn nói rõ kho không cần đóng và tồn chốt lúc lưu từng dòng. Quay lại /kiem-ke:
  phiên hiện trong danh sách, cột người mở là TÊN (không phải mã).
awaiting: user response

## Tests

### 1. Khởi động nguội
expected: Tắt server, xóa .next, chạy lại dev server trỏ kho-vu-tru. Server lên không lỗi; /kiem-ke, /kiem-ke/[id], /lich-su-kiotviet chưa đăng nhập thì về /dang-nhap kèm ?tiep_tuc=; hai endpoint Excel trả 401 khi chưa đăng nhập.
result: pass
ghi_chu: "Claude chạy (25/09): rm -rf .next → preview_start (launcher nạp khối biến kho-vu-tru, không sửa .env.local). /dang-nhap 200; ba route mới 307 → /dang-nhap?tiep_tuc=…; POST /api/kiem-ke/nhap-excel 401; GET /api/kiem-ke/mau-excel 401; preview_logs không lỗi. Trước đó: pgTAP 34/34 file (~510 assert), quyền route 145/145, verify:hook 5/5."

### 2. Công tắc quyền trong Cài đặt
expected: quanly → Cài đặt → Người dùng: vanphong có "Xem lịch sử KiotViet" bật sẵn, "Duyệt kiểm kê" tắt; dòng quản lý hai ô tick và khóa. Tắt công tắc xem của vanphong và lưu được.
result: issue
reported: "Console Error: Warning: [antd: Notification] `message` is deprecated. Please use `title` instead. at src/features/settings/components/user-drawer.tsx:149:24 (notification.info({ message: \"Đã lưu\", ... }))"
severity: minor
ghi_chu: "Có từ Phase 2 (ebfb181), không phải code Phase 6; chỉ còn đúng một chỗ trong src. Bẫy 11. Chưa rõ phần công tắc có lưu đúng không — người dùng chỉ báo cảnh báo; nếu bài 3 đạt thì phần lưu đạt."

### 3. Công tắc có hiệu lực ngay, không cần đăng nhập lại
expected: Cửa sổ ẩn danh đăng nhập vanphong, tải lại: menu KHÔNG có "Lịch sử KiotViet"; gõ /lich-su-kiotviet bị chặn; chi tiết mã hàng không có tab "Lịch sử KiotViet". quanly bật lại → vanphong tải lại trang là có ngay.
result: pass

### 4. Tra cứu lịch sử KiotViet
expected: /lich-su-kiotviet: gõ "quynh" (không dấu) ra hóa đơn có ghi chú QUỲNH; lọc loại Nhập + khoảng ngày; tìm theo mã hàng; URL đổi theo bộ lọc, F5 giữ nguyên. Bấm một số hóa đơn → ngăn kéo hiện đủ các dòng của phiếu đó. Không có cột tiền.
result: pass

### 5. Tab lịch sử trong chi tiết mã hàng, thẻ kho sạch
expected: Mở một mã có lịch sử KiotViet → có tab "Lịch sử KiotViet" cạnh "Thẻ kho", liệt kê nhập/bán cũ của mã đó. Tab "Thẻ kho" không còn dòng KiotViet cũ nào.
result: pass

### 6. Mở phiên kiểm kê thử
expected: vanphong → menu Kiểm kê → /kiem-ke → "Mở phiên": chọn MỘT kho, MỘT nhóm hàng nhỏ → tạo được, chuyển sang /kiem-ke/<id>. Màn nói rõ kho không cần đóng, tồn chốt lúc lưu từng dòng. Phiên hiện trong danh sách với người mở là tên (không phải mã).
result: [pending]

### 7. Đếm trên điện thoại
expected: Thu cửa sổ về ~375px, tab "Đếm": gõ vài ký tự mã không dấu → Enter chọn đúng mã (khớp tuyệt đối trước) → gõ số → Enter lưu; con trỏ quay về ô tìm. Ba mã liên tiếp chỉ bằng bàn phím. Không hiện số tồn. Trang không tràn ngang, nút đủ to.
result: [pending]

### 8. Bảng đếm máy tính
expected: Cửa sổ rộng, tab Bảng: gõ số cho hai dòng, Enter/Tab sang dòng kế; số vừa lưu hiện lại khi tải lại trang.
result: [pending]

### 9. File mẫu và nhập số đếm từ Excel
expected: Tab "Nhập Excel": tải file mẫu của nhóm đã chọn → mở ra có đúng 4 cột, KHÔNG có cột tồn. Điền vài số, bỏ trống một ô, gõ sai một mã → tải lên: thấy phân loại mới/ghi đè/bỏ qua/lỗi, nút Nạp bị khóa khi còn lỗi. Sửa mã sai, tải lại → Nạp được, số vào phiên.
result: [pending]

### 10. Tồn sổ chốt theo từng dòng (D-03)
expected: Ghi sổ một phiếu xuất cho một mã ĐÃ đếm trong phiên thử. Mở tab bảng lệch: tồn sổ của mã đó KHÔNG đổi. Đếm lại mã đó → tồn sổ cập nhật theo lúc lưu mới.
result: [pending]

### 11. Bảng lệch, chưa đếm, đếm lại, nút duyệt
expected: Dòng lệch từ 5 cái hoặc 10% tô nổi. Danh sách "chưa đếm" hiện trước nút Duyệt. quanly trả một dòng về "đếm lại" → nút Duyệt khóa kèm lý do. Đăng nhập vanphong (chưa bật Duyệt): nút Duyệt khóa kèm hướng dẫn. Không có cột tiền.
result: [pending]

### 12. Hủy phiên thử
expected: quanly hủy phiên thử với lý do "UAT" → phiên chuyển trạng thái đã hủy, không đếm/sửa được nữa, không sinh biến động tồn nào (tồn của các mã đã đếm không đổi).
result: [pending]

### 13. Phân quyền thủ kho và chỉ xem
expected: thukho1: /kiem-ke chỉ thấy phiên kho của mình, không mở được phiên kho khác; không thấy menu Lịch sử KiotViet. chixem: xem được danh sách/chi tiết phiên, không mở phiên, không đếm.
result: [pending]

### 14. Console sạch
expected: Mở DevTools console ở /kiem-ke, /kiem-ke/<id> (cả bốn tab), /lich-su-kiotviet, tab lịch sử ở chi tiết mã, Cài đặt → Người dùng: không có cảnh báo antd ("deprecated", "is not supported") hay lỗi đỏ.
result: [pending]

## Summary

total: 14
passed: 4
issues: 1
pending: 9
skipped: 0

## Gaps

```yaml
- truth: "Lưu người dùng trong Cài đặt không sinh cảnh báo antd trong console"
  status: resolved
  fix: "7b1fe8f — title thay message; npm run check xanh; chưa mở lại màn trong trình duyệt để xác nhận console (cần đăng nhập)"
  reason: "User reported: Warning: [antd: Notification] `message` is deprecated. Please use `title` instead. (user-drawer.tsx:149)"
  severity: minor
  test: 2
  artifacts: [src/features/settings/components/user-drawer.tsx]
  missing: ["notification.info dùng `title` thay `message` (antd v6)"]
```

## Ghi chú vận hành (không phải bài test)

- Bài 6 ban đầu được trả lời "pass" nhưng database kho-vu-tru không có phiếu KIEM_KE nào; người dùng xác nhận chưa thử thật → chuyển thành skipped. Bài 2–5 là kết quả người dùng báo, không có dấu vết database để đối chiếu (chỉ đọc).
- Luồng kiểm kê (mở phiên, đếm 3 đường, D-03, bảng lệch, duyệt/hủy) CHƯA có bằng chứng chạy trên giao diện thật; logic DB được pgTAP 38/39 phủ (89 assert).

- Bước đầu kỳ (D-01, D-06) — nạp tồn tạm → mở phiên toàn kho → đếm sát ngày chuyển → nhập → duyệt — là việc vận hành trước go-live, chưa làm (25/09: 0 DIEU_CHINH, 0 KIEM_KE trên kho-vu-tru).
- Lần trả lời "đạt" ở 06-16 (24/09) không để lại dấu vết trên database và dev server trỏ kho-vu-tru đã dừng trước đó — biên bản này là lần UAT thật của Phase 6.
- .env.local vẫn trỏ project rnpq…; dùng dev server ở localhost:3000 do Claude khởi động (trỏ kho-vu-tru).
