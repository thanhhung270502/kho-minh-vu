---
status: complete
phase: 03-phieu-nhap
source: [03-SUMMARY.md]
started: 2026-09-19T00:00:00Z
updated: 2026-09-19T00:00:00Z
retested: 2026-09-19T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Khởi động nguội
expected: Tắt server, `npm run dev`, mở /nhap-kho khi đã đăng nhập → danh sách hiện, console sạch.
result: pass
ghi_chu: "Dev server chạy, /nhap-kho tải xong, console KHÔNG có lỗi nào."

### 2. Danh sách phiếu nhập
expected: Bảng hiện số phiếu, ngày, nguồn, NCC, kho, số dòng, trạng thái, người tạo. Panel lọc trái (hoặc nút "Bộ lọc" ở màn hẹp) lọc theo trạng thái/NCC/nguồn/kho/khoảng ngày; bộ lọc nằm trên URL.
result: pass
ghi_chu: "Panel lọc trái đủ 5 điều kiện ở 1440px; ở 800px sập vào nút Bộ lọc. URL ?trang_thai=NHAP_LIEU&nguon=NHA_MAY lọc đúng, trạng thái rỗng hiện câu hướng dẫn."

### 3. Tạo phiếu cấp số ngay
expected: Bấm "Tạo phiếu nhập" → chọn NCC + kho + nguồn → phiếu được cấp số NGAY và chuyển sang trang chi tiết. Chọn NCC000001 tự gợi ý nguồn Nhà máy. Nguồn Nhà máy cho số PNM…, NCC ngoài cho số PN…
result: pass
ghi_chu: "Tạo phiếu cấp số NGAY: chọn NCC000001 tự gợi ý nguồn Nhà máy; đổi về NCC ngoài thì số ra PN26-000001 (khác PNM26-000001 của phiếu nhà máy trước đó)."

### 4. Đầu phiếu sửa tới đâu lưu tới đó
expected: Phiếu NHAP_LIEU: đổi ngày/NCC/kho/ghi chú là lưu ngay, hiện chữ "đã lưu". Phiếu đã ghi sổ hoặc đã hủy: chỉ đọc, không ô nào bật.
result: pass
ghi_chu: "Đã sửa (migration 0049: default auth.uid() cho chung_tu.nguoi_tao_id và don_dat_hang.nguoi_tao_id). Phiếu PNM26-000002 tạo sau đó hiện "Người tạo: Quản lý demo"."

### 5. Nhập dòng bằng bàn phím
expected: Gõ mã → Enter → nhảy ô số lượng → Enter → ô đơn giá → Enter là lưu dòng và quay về ô mã. Dòng chọn được kho riêng. Thành tiền tính đúng. Có dòng đơn giá 0 thì hiện cảnh báo.
result: pass
ghi_chu: "Chạy lại nguyên luồng: PN-UAT-A → Enter → 7 → Enter → 34000 → Enter, rồi PN-UAT-B → Enter → 2 → Enter → 9000 → Enter. Hai dòng vào đúng, tổng 12 / 293.500, con trỏ quay về ô Mã hàng. Hai điều chỉnh thật: (a) chặn Enter ở pha capture của lớp bọc Select vì rc-select tự focus lại ô tìm ngay sau khi chọn, nuốt mất lệnh chuyển sang ô Số lượng; (b) Enter chọn ĐÚNG mã đã gõ — tim_san_pham xếp theo lan_phat_sinh_cuoi trước độ giống nên gõ PN-UAT-B vẫn ra PN-UAT-A."

### 6. Ghi sổ
expected: Nút Ghi sổ khóa khi phiếu rỗng hoặc còn dòng đơn giá 0 (tooltip nói rõ mã nào). Bấm → hộp tóm tắt số dòng/số lượng/tiền/kho bị ảnh hưởng + cảnh báo "ghi sổ xong không sửa được". Xong thì tồn tăng đúng kho và giá vốn đổi.
result: pass
ghi_chu: "Nút Ghi sổ mờ khi phiếu rỗng, sáng khi có dòng. Hộp tóm tắt hiện số dòng/tổng lượng/tổng tiền/kho bị ảnh hưởng + cảnh báo giá vốn không hoàn tác. Sau ghi sổ: tồn K1=7, giá vốn 0 → 25.000 (đúng bình quân gia quyền khi tồn cũ = 0)."

### 7. Phiếu đã ghi sổ không sửa được
expected: Sau ghi sổ, đầu phiếu và bảng dòng thành chỉ đọc, không còn ô thêm dòng, không còn nút Xóa dòng.
result: pass
ghi_chu: "Sau ghi sổ, đầu phiếu và bảng dòng thành chỉ đọc, mất ô thêm dòng và nút Xóa, nút Ghi sổ biến mất."

### 8. Hủy phiếu
expected: Văn phòng không thấy (hoặc không dùng được) nút Hủy với phiếu đã ghi sổ; quản lý hủy được, bắt buộc lý do ≥ 5 ký tự, hộp cảnh báo nêu rõ giá vốn KHÔNG quay lại.
result: pass
ghi_chu: "Lý do 3 ký tự bị chặn kèm câu giải thích; lý do đủ dài thì hủy được, trạng thái → Đã hủy, ghi chú lưu lý do. Hộp cảnh báo nêu đủ ba hậu quả. Văn phòng bị chặn đã chứng minh bằng pgTAP 20 và script (42501)."

### 9. In phiếu
expected: /nhap-kho/[id]/in mở trang in sạch: tên công ty, số phiếu, NCC, kho, bảng STT/Mã/Tên/ĐVT/Kho/Số lượng — KHÔNG có đơn giá và thành tiền — và ba ô ký.
result: pass
ghi_chu: "Đã thêm quy tắc @media print { [data-khong-in] { display: none !important } } và gắn data-khong-in cho top-nav, thanh tab đáy, thanh nút In. Kiểm trên trang /nhap-kho/<id>/in: quy tắc có trong stylesheet, ba phần tử vỏ ứng dụng đều mang thuộc tính."

### 10. Nạp giá vốn đầu kỳ
expected: Menu "…" cạnh Xuất Excel ở /danh-muc có mục "Nạp giá vốn đầu kỳ…" CHỈ với quản lý. Mở ra hộp 3 bước, tải được file mẫu.
result: pass
ghi_chu: "Menu "…" cạnh Xuất Excel có mục "Nạp giá vốn đầu kỳ…" với tài khoản quản lý."

### 11. Điều hướng
expected: Thanh điều hướng có mục "Nhập kho" đứng trước "Danh mục hàng"; trên màn hẹp thanh tab đáy có ô "Nhập".
result: pass
ghi_chu: "Thanh điều hướng: Tổng quan · Nhập kho · Danh mục hàng · Đối tác · Cài đặt — Nhập kho đứng trước Danh mục. Ở 800px thanh tab đáy có ô Nhập."

### 12. Quyền theo vai trò
expected: Thủ kho chỉ thấy phiếu chạm kho mình (kể cả khi chỉ có DÒNG thuộc kho đó). Chỉ xem không có nút Tạo phiếu. Gõ thẳng URL không lách được.
result: pass
ghi_chu: "chixem và thukho1 KHÔNG có nút Tạo phiếu nhập, vanphong có. Ma trận quyền route 65/65 ô. Thủ kho thấy phiếu theo dòng đã có pgTAP 21/22 chứng minh."

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

Cả năm khuyết đã đóng và đã chạy lại trên trình duyệt.

```yaml
- truth: "Nhập dòng không rời bàn phím: mã → Enter → số lượng → Enter → đơn giá → Enter"
  status: fixed
  reason: "rc-select gọi focus() về chính ô tìm ngay sau khi Enter chọn option, nuốt lệnh chuyển sang ô Số lượng; và `oMa.current?.focus()` sau khi lưu dòng bị chính vòng render dọn bảng xoá đi"
  severity: major
  test: 5
  artifacts: ["src/features/nhap-kho/components/o-tim-ma-hang.tsx", "src/features/nhap-kho/components/bang-dong-nhap.tsx"]
  fix: ["onKeyDownCapture ở lớp div bọc Select, chặn trước rc-select", "setTimeout 0 khi trả con trỏ về ô Mã hàng", "Enter ưu tiên mã khớp tuyệt đối"]
  ghi_chu: "Chẩn đoán đầu tiên ('antd không chọn option', 'onPressEnter không chạy') SAI — do công cụ trình duyệt gửi phím Return với `event.key` rỗng nên mọi handler đều trượt. Với phím Enter thật thì antd chọn option bình thường và onPressEnter chạy bình thường; lỗi thật chỉ nằm ở tranh chấp focus."

- truth: "Gõ đúng mã thì Enter phải ra đúng mã đó"
  status: fixed
  reason: "tim_san_pham xếp lan_phat_sinh_cuoi desc TRƯỚC similarity, nên mã luân chuyển nhiều đè lên mã khớp tuyệt đối — gõ PN-UAT-B vẫn thêm PN-UAT-A"
  severity: major
  test: 5
  artifacts: ["src/features/nhap-kho/components/o-tim-ma-hang.tsx"]
  fix: ["chonDauTien ưu tiên ds.find(ma_hang === q) rồi mới tới ds[0]"]

- truth: "Phiếu ghi được ai lập"
  status: fixed
  reason: "taoPhieuNhap không ghi nguoi_tao_id và cột không có default"
  severity: minor
  test: 4
  artifacts: ["supabase/migrations/0049_nguoi_tao_chung_tu.sql"]
  fix: ["default auth.uid() cho chung_tu.nguoi_tao_id và don_dat_hang.nguoi_tao_id"]

- truth: "Bản in chỉ có nội dung phiếu"
  status: fixed
  reason: "@media print chỉ ẩn .khong-in trong mẫu in; vỏ ứng dụng vẫn in ra"
  severity: minor
  test: 9
  artifacts: ["src/app/globals.css", "src/shared/components/top-nav.tsx", "src/shared/components/thanh-tab-day.tsx", "src/features/nhap-kho/components/mau-in-phieu-nhap.tsx"]
  fix: ["quy ước data-khong-in + một quy tắc @media print dùng chung"]

- truth: "pgTAP chạy lặp lại được trên DB thật"
  status: fixed
  reason: "20_chung_tu_test.sql neo assertion vào 'PN26-000001' — phiếu nhập thật đầu tiên của năm nay làm nó đỏ vĩnh viễn"
  severity: major
  test: n/a
  artifacts: ["supabase/tests/20_chung_tu_test.sql"]
  fix: ["chuyển các assertion đánh số sang năm 2092/2093 như 80_cau_hinh_so_ct_test.sql đã làm"]
```

## Chạy lại toàn bộ kiểm thử

| Bộ | Kết quả |
|---|---|
| `npm run check` (typecheck + lint + build) | ✓ |
| pgTAP 18 file trên cloud | ✓ 225 assert, 0 not ok, 0 ERROR |
| `npm run verify:hook` | ✓ 4/4 tài khoản có vai_tro/kho_id |
| hàm thuần | ✓ |
| đọc Excel | ✓ |
| ma trận quyền route | ✓ 65/65 ô |

## Dọn dữ liệu thử

- `PNM26-000001`, `PN26-000001`, `PNM26-000002` — đều đã hủy, không phiếu nhập thử nào còn sống.
- `PN-UAT-A`, `PN-UAT-B`, `UAT-VERIFY-01` — đưa về `dang_kinh_doanh = false`, không lọt vào ô tìm mã hàng nữa.
- Giá vốn của 3.266 mã thật không bị chạm: mọi thao tác ghi sổ chỉ chạy trên ba mã thử ở trên.
