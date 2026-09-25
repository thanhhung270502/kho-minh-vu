---
status: complete
phase: 04-don-dat-hang-phieu-xuat
source: [04-05-PLAN.md, 04-09-PLAN.md, 04-11-PLAN.md, 04-12-PLAN.md, 04-13-PLAN.md, 04-14-PLAN.md, 04-15-PLAN.md, 04-01..04-10-SUMMARY.md]
started: 2026-09-25T06:00:00Z
updated: 2026-09-25T08:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Khởi động và quyền route
expected: Dev server trỏ kho-vu-tru trả 200 ở /dang-nhap; /dat-hang, /xuat-kho, /nhap-kho chưa đăng nhập thì về /dang-nhap?tiep_tuc=; ma trận quyền route đạt.
result: pass
ghi_chu: "/dat-hang, /xuat-kho, /nhap-kho, /dat-hang/x/in → 307 /dang-nhap?tiep_tuc=…; test-route-permissions 120/120 (bỏ qua route chi tiết vì chưa có phiếu mở — chạy lại cuối bài)."

### 2. Danh sách và dòng phiếu nhập (04-05)
expected: /nhap-kho có panel lọc, lọc đổi URL và giữ khi F5; dưới 992px panel vào Drawer, bảng cuộn trong khung riêng; ở chi tiết phiếu gõ mã → Enter → ô số lượng → Enter về ô mã; trang in không có cột giá.
result: pass
retest: "25/09 sau 4f77209, 8291223 (nhánh fix/uat-04-gaps) — ghi sổ không giá, ô chọn tìm không dấu"
first_result: issue
reported: "Claude kiểm: danh sách, lọc theo URL (?trang_thai=DA_HUY ra đúng 3 phiếu, Drawer hiện 'Đã hủy'), 794px lọc vào Drawer không tràn ngang, luồng bàn phím mã→Enter→SL→Enter→giá→Enter về ô mã, trang in không cột giá — ĐẠT. NHƯNG ghi sổ phiếu nhập bị chặn khi đơn giá = 0 ('dòng chưa có đơn giá'), trái quyết định 24/09 người dùng không dùng giá (DLIEU-05)."
severity: major
ghi_chu: "Chặn chỉ ở giao diện: post-receipt-button.tsx:27 và receipt-line-table.tsx:239 lọc unitPrice <= 0 (D-04 Phase 3). DB (_ghi_so_nhap, ràng buộc) không chặn. Mã thử PX/PN-UAT-* bị ngừng kinh doanh từ lượt dọn trước — bật lại tạm cho UAT, tắt sau khi xong."

### 3. Tạo đơn đặt hàng (04-09)
expected: "Tạo đơn" cấp số DH26-xxxxxx, trạng thái Đơn tạm; ô người nhận tìm được và tạo được đối tác mới; bảng dòng gõ bàn phím, mã gõ đủ khớp tuyệt đối; sửa ngày giao lưu và còn sau F5; không có cột đơn giá/thành tiền; dưới 992px không tràn ngang.
result: pass
ghi_chu: "DH26-000005 (Khách lẻ, Đơn tạm). Ô người nhận: 'khach le' không dấu ra Khách lẻ; tên lạ hiện '+ Thêm đối tác mới' (không bấm tạo để khỏi sinh đối tác rác). Ba dòng chỉ bằng bàn phím, 'px-uat-b' gõ đủ chọn đúng B không phải A; ngày giao 30/09 hiện 'đã lưu', DB ngay_giao_du_kien=2026-09-30. Không cột đơn giá/thành tiền. 794px không tràn ngang."

### 4. Duyệt đơn và in phiếu đi lấy hàng (04-12)
expected: Xác nhận đơn (hộp xác nhận nêu số dòng, tổng SL) → Đã xác nhận, khóa sửa; in phiếu đi lấy hàng nhóm theo kho, có cột trống ghi tay, không giá; mở khóa đòi lý do đủ dài, về Đơn tạm, để lại vết nhật ký; đóng sớm → Hoàn thành.
result: pass
ghi_chu: "Hộp xác nhận nêu '3 dòng, tổng số lượng đặt 33'; sau xác nhận khóa hết ô sửa và ô thêm dòng. In phiếu đi lấy hàng: nhóm Kho 1 (2 dòng) / Kho 2 (VITAL111), cột SL thực lấy để trống, không giá, menu Đặt hàng vẫn sáng ở trang in. Mở khóa lý do 'abc' bị chặn (ít nhất 5 ký tự), lý do hợp lệ → Đơn tạm, nhat_ky_sua ghi '[mở khóa] …'. Đóng sớm → Hoàn thành. Lặt vặt: đơn Hoàn thành vẫn hiện 'Đơn đã xác nhận nên khóa sửa… nhờ quản lý mở lại' — đơn hoàn thành không mở lại được."

### 5. Tạo phiếu xuất từ đơn (04-12, XUAT-01)
expected: Đơn đã xác nhận → "Tạo phiếu xuất" → phiếu xuất mới bê đủ dòng còn lại, không gõ lại mã; ghi sổ được trong vài thao tác.
result: pass
ghi_chu: "Đơn đã xác nhận → Tạo phiếu xuất: hộp xác nhận nói rõ bê 3 dòng, kho theo kho mặc định; PX26-000004 mở ra đủ 3 dòng (VITAL111 ở Kho 2), link 'Từ đơn DH26-000005', không gõ lại mã. Bỏ VITAL111 (mã thật) trước khi ghi sổ."

### 6. Phiếu xuất không cần đơn (04-11)
expected: /xuat-kho → tạo phiếu → gõ mã/Enter/số/Enter liên tục; số lớn hơn tồn tô màu ngay; đổi kho dòng cập nhật màu; không cột giá; dưới 992px không tràn ngang.
result: pass
retest: "25/09 sau 0163f4f — focus giữ khi đi qua ngưỡng tồn cả hai chiều"
first_result: issue
reported: "Claude kiểm PX26-000005 (không đơn): bàn phím mã→Enter→SL→Enter về ô mã đạt; mã chưa có kho mặc định (PN-UAT-A) bị chặn với thông báo chỉ đường Danh mục → Kho mặc định; gõ 999 dòng đỏ ngay, Tooltip 'Tồn kho Kho 1 còn 35, xuất 999'; đổi kho sang Kho 2 dòng đỏ + khối xuất âm cập nhật; không cột giá; 794px không tràn. LỖI: sửa số lượng mà giá trị đi qua ngưỡng tồn (999→9 khi xóa lùi) thì ô số mất focus giữa chừng, số gõ tiếp bị nuốt, ô quay về số cũ."
severity: major

### 7. Xuất âm, gợi ý gộp mã, ghi sổ, hủy (04-13)
expected: Dòng vượt tồn → khối lý do xuất âm, nút Ghi sổ khóa kèm tooltip; "Khác" không ghi chú báo lỗi dưới ô; chọn lý do → mở khóa; hộp tóm tắt nêu dòng vượt tồn; ghi sổ → tồn âm đúng; văn phòng không hủy được, quản lý hủy → tồn về cũ.
result: pass
ghi_chu: "PX26-000004: chỉ PX-UAT-A (tồn 0, xuất 10) tô đỏ; khối lý do hiện đúng dòng; Ghi sổ khóa + Tooltip 'Chọn lý do xuất âm trước khi ghi sổ.'; 'Khác' không ghi chú → lỗi dưới ô 'Chọn Khác thì phải ghi rõ lý do', vẫn khóa; chọn 'Mã bị tách' → đã lưu, mở khóa; gợi ý 'Mã PX-UAT-B … còn 50 ở Kho 1' + Đề nghị gộp → 'Đã ghi lại đề nghị'; hộp tóm tắt nêu dòng vượt tồn 'sau khi ghi sổ còn -10' và lý do; DB tồn A=-10, B=30. vanphong hủy → 42501 'Chỉ quản lý được hủy chứng từ đã ghi sổ' (kiểm DB rollback); quanly hủy TN26-000024 qua giao diện → tồn về. Lặt vặt: phiếu ĐÃ ghi sổ vẫn hiện khối '1 dòng sẽ làm tồn âm nếu ghi sổ … tồn -10' (so với tồn sau ghi sổ) và gợi ý gộp mã."

### 8. Tiến độ đơn sau khi xuất (04-13, DDH-02)
expected: Ghi sổ phiếu sinh từ đơn → đơn gốc hiện đã xuất/còn lại từng dòng đúng số.
result: pass
ghi_chu: "Sau ghi sổ PX26-000004: đơn DH26-000005 cột Đã xuất/Còn lại — PX-UAT-A 10/'Đã giao đủ', PX-UAT-B 20/'Đã giao đủ', VITAL111 0/3; DB so_luong_da_xuat khớp. Hủy phiếu xuất → da_xuat về 0. Lặt vặt: trang đơn không liệt kê các phiếu xuất đã sinh từ đơn."

### 9. In phiếu giao hàng (04-14)
expected: Phiếu chưa ghi sổ in có chữ bản nháp; ghi sổ xong mất chữ nháp; không cột giá, có ô ký người giao/người nhận.
result: pass
ghi_chu: "PX26-000005 chưa ghi sổ in có 'BẢN NHÁP — CHƯA GHI SỔ'; PX26-000004 đã ghi sổ in không có chữ nháp, có Đơn gốc, ô ký Người giao hàng / Người nhận hàng, không cột giá."

### 10. Trả hàng hai chiều (04-14)
expected: Phiếu xuất đã ghi sổ có "Khách trả hàng" → phiếu trả link về phiếu gốc, dòng bê sang, sửa được số, không thêm mã mới; ghi sổ tăng tồn. Phiếu nhập đã ghi sổ có "Trả hàng NCC" → vượt tồn đòi lý do; hủy về tồn cũ. Phiếu chưa ghi sổ không có nút trả.
result: pass
ghi_chu: "Khách trả hàng từ PX26-000004 → TK26-000002 link 'Từ chứng từ PX26-000004', bê 2 dòng, không ô thêm mã; sửa số trả 2 và 5 (tổng 7) → ghi sổ '7 sẽ cộng vào kho', DB tồn B 30→35. Trả hàng NCC từ PN26-000003 → TN26-000024, dòng vượt tồn (B tồn 35, trả 50) đòi lý do, ghi sổ → -15; quanly hủy qua giao diện → về 35. Phiếu nháp PX26-000005 không có nút Khách trả hàng. Lặt vặt: dòng PX-UAT-A trên phiếu KHÁCH TRẢ (tồn tăng) vẫn tô đỏ vượt tồn; hộp hủy phiếu ghi 'Ba điều xảy ra' nhưng chỉ liệt kê hai."

### 11. Menu và điều hướng (04-15)
expected: Menu có Đặt hàng, Xuất kho, đánh dấu đúng mục kể cả ở trang in; 375px thanh tab đáy 4 ô + Khác không tràn; chỉ xem thấy menu nhưng không tạo được đơn/phiếu.
result: pass
ghi_chu: "375px: thanh tab đáy Tổng quan | Xuất | Nhập | Tồn | Khác, scrollWidth 375; Khác mở Đặt hàng, Kiểm kê, Lịch sử KiotViet, Danh mục, Đối tác, Cài đặt; mục đang ở sáng đúng (Xuất kho, và Đặt hàng ở trang in). chixem (kiểm DB rollback, không xem giao diện): đọc được 3 phiếu xuất, insert don_dat_hang và chung_tu XUAT đều 42501. Ma trận quyền route 150/150 sau khi có phiếu."

### 12. Console sạch
expected: Không cảnh báo antd hay lỗi đỏ ở các màn đã đi qua trong bài 2–11.
result: pass
ghi_chu: "read_console_messages sau mốc P4: không cảnh báo antd, không lỗi đỏ qua /nhap-kho, /nhap-kho/[id](+in), /dat-hang, /dat-hang/[id](+in), /xuat-kho, /xuat-kho/[id](+in), /tra-hang/[id]."

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

```yaml
- truth: "Văn phòng ghi sổ được phiếu nhập không có đơn giá (người dùng không dùng giá, chốt 24/09)"
  status: resolved
  fix: "4f77209 — PN26-000004 dòng bỏ trống giá, không cảnh báo, ghi sổ được, hộp tóm tắt không nêu tổng tiền"
  reason: "Giao diện chặn ghi sổ khi đơn giá <= 0 (D-04 Phase 3, có trước quyết định bỏ giá)"
  severity: major
  test: 2
  artifacts: [src/features/stock-in/components/post-receipt-button.tsx, src/features/stock-in/components/receipt-line-table.tsx]
  missing: ["bỏ điều kiện đơn giá > 0 khi ghi sổ, hoặc hỏi người dùng có còn cần giá nhập không"]
- truth: "Ô chọn (nhà cung cấp, nhóm hàng, kho…) tìm được khi gõ không dấu"
  status: resolved
  fix: "8291223 — 'lien' ra LIÊN HOA, 'kho 1' chọn được kho (sau khi tải lại trang; HMR giữ bản cũ)"
  reason: "Claude kiểm: hộp Tạo phiếu nhập gõ 'lien'/'cong' ra 'Trống', 'LIÊN' mới ra CÔNG TY TNHH LIÊN HOA — antd lọc mặc định theo label có dấu"
  severity: major
  test: 2
  artifacts: [src/features/stock-in/components/create-receipt-button.tsx, src/features/stock-in/components/receipt-header.tsx, src/features/stock-in/components/receipt-filter-panel.tsx, src/features/inventory/components/stock-filter-panel.tsx, src/features/products/components/bulk-assign-bar.tsx, src/features/products/components/inline-edit-cell.tsx, src/features/products/components/product-drawer.tsx, src/features/products/components/product-filter-panel.tsx, src/features/settings/components/lookup-drawer.tsx]
  missing: ["filterOption dùng removeDiacritics như labelMatches của open-session-drawer.tsx — nâng hàm lên shared (đã có 2 nơi dùng)"]
- truth: "Sửa số lượng dòng phiếu xuất bằng bàn phím không mất focus"
  status: resolved
  fix: "0163f4f — PX26-000006: 999→9 (bỏ đỏ) → gõ 0 thành 90 (đỏ lại), focus giữ nguyên suốt"
  reason: "Claude kiểm: xóa lùi 999→9 (đi từ vượt tồn về dưới tồn) → ô mất focus, phím tiếp bị nuốt, ô về số cũ"
  severity: major
  test: 6
  artifacts: [src/features/stock-out/components/issue-line-columns.tsx]
  missing: ["luôn bọc Tooltip (title rỗng khi không vượt) thay vì `if (!over) return input` — đổi cây làm React dựng lại InputNumber không kiểm soát (defaultValue)"]
- truth: "Phiếu đã ghi sổ không còn hiện cảnh báo trước-ghi-sổ và gợi ý gộp mã"
  status: resolved
  fix: "f032177 — PX26-000006 sau ghi sổ: không khối xuất âm, không gợi ý gộp, chỉ còn 'Phiếu này đã ghi sổ khi xuất âm — lý do …'"
  reason: "Khối '1 dòng sẽ làm tồn âm nếu ghi sổ … tồn -10' so với tồn SAU ghi sổ, và gợi ý gộp mã vẫn hiện trên PX26-000004 đã ghi sổ"
  severity: minor
  test: 7
  artifacts: [src/features/stock-out/components]
  missing: ["chỉ hiện khối xuất âm/gợi ý khi phiếu NHAP_LIEU; phiếu đã ghi sổ chỉ giữ dòng 'đã ghi sổ khi xuất âm — lý do …'"]
- truth: "Phiếu khách trả hàng (tồn tăng) không tô đỏ vượt tồn"
  status: resolved
  fix: "f032177 — TK26-000003 (A tồn -1, trả 1) không dòng đỏ"
  reason: "TK26-000002: dòng PX-UAT-A (tồn -10, trả 2) có bg-red-50"
  severity: minor
  test: 10
  artifacts: [src/features/returns/components]
  missing: ["bỏ tô vượt tồn cho TRA_KHACH (chỉ TRA_NCC/XUAT làm giảm tồn)"]
- truth: "Chữ trên màn khớp trạng thái thật"
  status: resolved
  fix: "f032177 — DH26-000005 hiện 'Đơn đã hoàn thành — không mở lại được'; hộp hủy 'Điều xảy ra khi hủy phiếu đã ghi sổ'"
  reason: "Đơn Hoàn thành vẫn ghi 'nhờ quản lý mở lại đơn về đơn tạm'; hộp hủy phiếu ghi 'Ba điều xảy ra' nhưng liệt kê hai"
  severity: cosmetic
  test: 4
  artifacts: [src/features/sales-order/components, src/features/documents/components]
  missing: ["sửa câu theo trạng thái; đếm lại số điều trong hộp hủy"]
```

## Ghi chú vận hành

- Claude tự chạy trong trình duyệt nhúng dưới tài khoản quanly đã đăng nhập sẵn, dev server trỏ kho-vu-tru. Vai trò khác kiểm ở tầng DB (transaction rollback).
- Ghi sổ chỉ trên mã thử (PN-UAT-*, PX-UAT-*) như các lượt UAT trước, xong hủy hết.
- Dữ liệu sinh ra 25/09: PN26-000003, PX26-000004, PX26-000005, TK26-000002, TN26-000024 — tất cả ĐÃ HỦY lý do 'Dọn dữ liệu thử UAT Phase 4 (25/09)'; DH26-000005 Hoàn thành (đóng sớm), không còn số đã xuất. Tồn mọi mã về 0, bốn mã thử tắt kinh doanh lại. CÒN LẠI: một dòng đề nghị gộp PX-UAT-A↔B trong de_nghi_gop_ma (Claude không xóa cứng — người dùng quyết).
- Nháp PNM26-000004 (HWNX19-16A-X × 100) của ai đó vẫn giữ nguyên — dòng thử PX-UAT-A thêm vào đã xóa.
- Lưu ý đo: bài 6 lần đầu tưởng số không lưu do công cụ, thực ra là lỗi mất focus (xem gap); chọn-hết-rồi-gõ-đè thì lưu đúng.
- Kiểm lại sau sửa (nhánh fix/uat-04-gaps): sinh thêm PN26-000004, PX26-000006, TK26-000003 — đều ĐÃ HỦY lý do 'Dọn dữ liệu thử sửa gap UAT 04'. Tồn mọi mã 0, mã thử tắt lại.
- Quan sát, không phải lỗi mới: số lượng ở dòng ĐÃ CÓ của phiếu xuất chỉ lưu khi rời ô (blur), Enter không lưu — như trước; hàng thêm dòng mới thì Enter lưu. Một lần chọn lý do xuất âm bằng click JS khi ô số còn focus thì nút hiện chọn nhưng DB chưa lưu; click chuột thật không tái hiện — ghi lại để để ý.
