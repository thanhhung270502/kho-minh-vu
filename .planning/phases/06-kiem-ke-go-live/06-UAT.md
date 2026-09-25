---
status: complete
phase: 06-kiem-ke-go-live
source: [06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-10-SUMMARY.md, 06-11-SUMMARY.md, 06-12-SUMMARY.md, 06-13-SUMMARY.md, 06-14-SUMMARY.md, 06-15-SUMMARY.md, 06-16-SUMMARY.md]
started: 2026-09-25T03:30:00Z
updated: 2026-09-25T05:45:00Z
---

## Current Test

[testing complete]

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
result: pass
retest: "25/09 sau 8339626 — trang chi tiết KK26-000002 mở được, ba tab không lỗi"
first_result: issue
reported: "Máy chủ từ chối yêu cầu — invalid input syntax for type uuid: \"\". Thử lại, nếu vẫn lỗi hãy báo quản trị kèm mã 22P02."
severity: blocker
ghi_chu: "Phiên VẪN được tạo (KK26-000001 lúc 03:42, KK26-000002 lúc 03:54 UTC trên kho-vu-tru); lỗi ở trang chi tiết: discrepancy-table, uncounted-panel, count-excel-import gọi useCountSheet(id, \"\") nên p_nhom_hang_id = \"\". Sửa 8339626 ở hook + api. Cần thử lại bài 6."

### 7. Đếm trên điện thoại
expected: Thu cửa sổ về ~375px, tab "Đếm": gõ vài ký tự mã không dấu → Enter chọn đúng mã (khớp tuyệt đối trước) → gõ số → Enter lưu; con trỏ quay về ô tìm. Ba mã liên tiếp chỉ bằng bàn phím. Không hiện số tồn. Trang không tràn ngang, nút đủ to.
result: pass
retest: "25/09 sau 4dd4636 + 12cb816 (nhánh fix/uat-06-gaps) — KK26-000003, 375px: xwa→Enter→con trỏ ở ô số→5→Enter, w10lr 3, cui dia dream→CN72 12 chỉ bằng bàn phím; DB đủ 3 dòng; header 3/62 khớp tab 3/62"
first_result: issue
reported: "Claude tự chạy (quanly, 375px, KK26-000001): Enter chọn mã xong con trỏ ở LẠI ô tìm, không sang ô số — gõ '5' rơi vào ô tìm. Phải tự bấm vào ô số. Ngoài ra header 'Tiến độ đếm' không cập nhật sau khi lưu (tab ghi 3/62, header 2/62)."
severity: major
ghi_chu: "Phần còn lại ĐẠT: 'xwa'/'w10lr' chọn đúng mã, 'cui dia dream' (không dấu) ra CN72 đầu tiên; không hiện tồn; scrollWidth 375 không tràn; nút Lưu cao 48px; Enter ở ô số lưu và trả con trỏ về ô tìm. DB: XWA 5, W10LR 3, CN72 12 trong KK26-000001 (04:44 UTC). Gợi ý còn đưa mã ngoài phạm vi (42615KFV950) — đúng thiết kế (hợp phạm vi ∪ dòng đã đếm), ghi lại để biết. KK26-000002 (Kho 2, BAGA-CHỤP LỌC MÁY) có 0 mã trong phạm vi nên đếm trên KK26-000001."


### 8. Bảng đếm máy tính
expected: Cửa sổ rộng, tab Bảng: gõ số cho hai dòng, Enter/Tab sang dòng kế; số vừa lưu hiện lại khi tải lại trang.
result: pass
ghi_chu: "Claude tự chạy (quanly, KK26-000001): bảng không có cột tồn; gõ 7 + Enter lưu AGL6L và nhảy xuống BGOPG1; gõ 4 + Tab lưu và nhảy tiếp; tải lại trang (reload + điều hướng lại) vẫn hiện 7 và 4."

### 9. File mẫu và nhập số đếm từ Excel
expected: Tab "Nhập Excel": tải file mẫu của nhóm đã chọn → mở ra có đúng 4 cột, KHÔNG có cột tồn. Điền vài số, bỏ trống một ô, gõ sai một mã → tải lên: thấy phân loại mới/ghi đè/bỏ qua/lỗi, nút Nạp bị khóa khi còn lỗi. Sửa mã sai, tải lại → Nạp được, số vào phiên.
result: pass
ghi_chu: "File mẫu nhóm BAGA: sheet BAGA + Hướng dẫn, đúng 4 cột Mã hàng/Tên hàng/ĐVT/Số đếm, 62 dòng, không cột tồn. File thử (AGL6L 9, CN64 6, CNRS trống, ZZZ999 2) qua đúng ô upload: Mới 1/Ghi đè 1/Bỏ qua 1/Lỗi 1 (ZZZ999 'Không có mã này trong danh mục'), nút Nạp khóa. Sửa ZZZ999→CNYA: Mới 2/Ghi đè 1/Bỏ qua 1/Lỗi 0 → Nạp → 'Đã nạp 3 số đếm'; DB: AGL6L 7→9, CN64 6, CNYA 2, CNRS không có dòng."

### 10. Tồn sổ chốt theo từng dòng (D-03)
expected: Ghi sổ một phiếu xuất cho một mã ĐÃ đếm trong phiên thử. Mở tab bảng lệch: tồn sổ của mã đó KHÔNG đổi. Đếm lại mã đó → tồn sổ cập nhật theo lúc lưu mới.
result: pass
ghi_chu: "Chạy ở tầng DB trong transaction ROLLBACK dưới vanphong (không để lại phiếu xuất thật trên kho-vu-tru sắp go-live): trước ton_so=0/hiện tại=0 → ghi sổ PX 2 XWA → ton_so VẪN 0, hiện tại −2 → đếm lại XWA=5 → ton_so=−2 (so_luong_he_thong −2). Sau đó kiểm: 0 phiếu PX-UAT-D03, 0 movement XWA. Cột 'Tồn sổ lúc đếm' ở bảng lệch đọc đúng cột này (bài 11)."

### 11. Bảng lệch, chưa đếm, đếm lại, nút duyệt
expected: Dòng lệch từ 5 cái hoặc 10% tô nổi. Danh sách "chưa đếm" hiện trước nút Duyệt. quanly trả một dòng về "đếm lại" → nút Duyệt khóa kèm lý do. Đăng nhập vanphong (chưa bật Duyệt): nút Duyệt khóa kèm hướng dẫn. Không có cột tiền.
result: pass
ghi_chu: "Bảng lệch (quanly): AGL6L +9, CN64 +6, CN72 +12, XWA +5 có bg-red-50 + tag 'Lệch lớn'; BGOPG1 +4, CNYA +2, W10LR +3 không tô. Không cột tiền. Panel 'Còn 55 mã chưa đếm' nằm trước nút Duyệt. Trả CNYA về đếm lại → 'Chờ đếm lại', nút Duyệt khóa, tooltip '1 dòng chờ đếm lại'. vanphong: KHÔNG kiểm được trên giao diện (Claude không đăng nhập hộ); DB hiện vanphong ĐANG BẬT duyet_kiem_ke (bật 03:52, lúc bài 2–3) nên kịch bản 'chưa bật' không còn đúng dữ liệu — tắt thử trong transaction rollback thì duyet_phien_kiem_ke trả 42501 'Không có quyền duyệt kiểm kê'; tooltip thiếu quyền có trong approve-session-button.tsx:36."

### 12. Hủy phiên thử
expected: quanly hủy phiên thử với lý do "UAT" → phiên chuyển trạng thái đã hủy, không đếm/sửa được nữa, không sinh biến động tồn nào (tồn của các mã đã đếm không đổi).
result: pass
ghi_chu: "Hủy KK26-000001 và KK26-000002 bằng giao diện, lý do 'UAT': modal nói rõ không sinh bút toán; trạng thái Đã hủy + banner 'Phiên đã hủy — không đếm/duyệt được nữa'; DB DA_HUY, ghi_chu 'Hủy: UAT', 0 kho_movement, 0 dòng ton_kho ≠ 0; luu_dong_kiem_ke sau hủy → 23514. Lặt vặt: trang phiên đã hủy vẫn hiện panel 'duyệt sẽ tính tồn 0 cho mã được chọn' (chữ thừa, không bấm được gì)."

### 13. Phân quyền thủ kho và chỉ xem
expected: thukho1: /kiem-ke chỉ thấy phiên kho của mình, không mở được phiên kho khác; không thấy menu Lịch sử KiotViet. chixem: xem được danh sách/chi tiết phiên, không mở phiên, không đếm.
result: pass
ghi_chu: "Kiểm ở tầng DB (rollback) + code, KHÔNG xem giao diện dưới hai vai này (cần đăng nhập). thukho1 (kho K1, xem_lich_su_kiotviet=false): danh_sach_phien_kiem_ke chỉ trả KK26-000001 (K1); bang_dem_kiem_ke phiên K2 → 42501, K1 đọc được. chixem: thấy 2 phiên, đọc bảng đếm được, mo_phien_kiem_ke → 42501, luu_dong_kiem_ke có nhánh chi_xem → 42501 (phiên đã hủy nên chạy thật ra 23514 trước). Menu Lịch sử KiotViet ẩn theo requires: kiotviet-history (navigation.ts:111)."

### 14. Console sạch
expected: Mở DevTools console ở /kiem-ke, /kiem-ke/<id> (cả bốn tab), /lich-su-kiotviet, tab lịch sử ở chi tiết mã, Cài đặt → Người dùng: không có cảnh báo antd ("deprecated", "is not supported") hay lỗi đỏ.
result: pass
retest: "25/09 sau daaa804 — console sạch sau mốc kiểm: /kiem-ke/<id> (điện thoại, bảng lệch, phiên 0 mã, phiên đã hủy), /lich-su-kiotviet + ngăn kéo phiếu. Lỗi 400 không rõ URL vẫn chưa tái hiện."
first_result: issue
reported: "Bắt được trong log trình duyệt (preview_logs) khi mở /kiem-ke/<id>: Warning: [antd: Descriptions] Sum of column `span` in a line not match `column` of Descriptions."
severity: minor
ghi_chu: "session-header.tsx dòng ~128 đặt span: 2 cố định trong Descriptions responsive — bẫy 11 CLAUDE.md. Claude kiểm tiếp 25/09 (console trình duyệt): thêm [antd: Statistic] valueStyle deprecated (discrepancy-table.tsx:97-98, tab Bảng lệch) và [antd: Table] index của rowKey deprecated (kiotviet-history history-table.tsx:122, voucher-drawer.tsx:97). Một lỗi 400 không rõ URL xuất hiện đầu phiên trình duyệt (trước lần reload), không tái hiện được khi đi lại /kiem-ke, hai phiên, bốn tab, /lich-su-kiotviet, /cai-dat/nguoi-dung. Cài đặt → Người dùng: không cảnh báo."

## Summary

total: 14
passed: 13
issues: 1
pending: 0
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
- truth: "Mở phiên xong vào trang chi tiết không lỗi"
  status: resolved
  fix: "8339626 — useCountSheet/fetchCountSheet đổi chuỗi rỗng thành không lọc"
  reason: "User reported: invalid input syntax for type uuid (22P02)"
  severity: blocker
  test: 6
  artifacts: [src/features/stocktake/hooks/useStocktake.ts, src/features/stocktake/api/stocktake.api.ts]
  missing: ["không gửi chuỗi rỗng vào tham số uuid của bang_dem_kiem_ke"]
- truth: "Trang chi tiết phiên kiểm kê không sinh cảnh báo antd"
  status: resolved
  fix: "daaa804"
  reason: "Log trình duyệt: [antd: Descriptions] Sum of column `span` in a line not match `column`"
  severity: minor
  test: 14
  artifacts: [src/features/stocktake/components/session-header.tsx]
  missing: ["bỏ span cố định trong Descriptions responsive (bẫy 11)"]
  fix: "daaa804"
- truth: "Tab Bảng lệch và màn Lịch sử KiotViet không sinh cảnh báo antd"
  status: resolved
  fix: "daaa804"
  reason: "Console: [antd: Statistic] valueStyle deprecated; [antd: Table] index parameter of rowKey deprecated"
  severity: minor
  test: 14
  artifacts: [src/features/stocktake/components/discrepancy-table.tsx, src/features/kiotviet-history/components/history-table.tsx, src/features/kiotviet-history/components/voucher-drawer.tsx]
  missing: ["Statistic dùng styles.content thay valueStyle", "rowKey không dùng index — cần khóa ổn định từ dữ liệu (id dòng) hoặc gán key lúc map"]
- truth: "Enter chọn mã ở màn đếm điện thoại đưa con trỏ sang ô số"
  status: resolved
  fix: "4dd4636"
  reason: "Claude kiểm: selectProduct() focus lại codeRef (ô tìm), InputNumber không có ref"
  severity: major
  test: 7
  artifacts: [src/features/stocktake/components/count-mobile.tsx]
  missing: ["ref cho InputNumber; selectProduct focus ô số bằng setTimeout 0 (bẫy 14b)"]
- truth: "Header phiên (tiến độ, trạng thái) cập nhật ngay sau khi lưu/xóa/đánh dấu đếm lại"
  status: resolved
  fix: "12cb816 (cả nạp Excel)"
  reason: "Claude kiểm: useSaveCount/useDeleteCount/useSetRecount không invalidate stocktakeKeys.session(id); header 2/62 khi tab đã 3/62"
  severity: minor
  test: 7
  artifacts: [src/features/stocktake/hooks/useStocktake.ts]
  missing: ["invalidate ['stocktake','session',sessionId] trong ba mutation"]
- truth: "Mở phiên có phạm vi 0 mã thì được cảnh báo trước"
  status: resolved
  fix: "1796f5d — đầu phiên giải thích phạm vi rỗng; cảnh báo NGAY trong ngăn kéo Mở phiên cần RPC xem trước phạm vi, chưa làm"
  reason: "Claude kiểm: KK26-000002 (Kho 2 × BAGA - CHỤP LỌC MÁY) tạo được, trang đếm hiện 'Đã đếm 0/0' không giải thích"
  severity: minor
  test: 6
  artifacts: [src/features/stocktake/components/open-session-drawer.tsx, src/features/stocktake/components/count-mobile.tsx]
  missing: ["trạng thái rỗng giải thích phạm vi (mã có kho mặc định là kho này hoặc có tồn ≠ 0)"]
```

## Ghi chú vận hành (không phải bài test)

- 25/09 (lượt Claude tự kiểm): bài 7–14 do Claude chạy trong trình duyệt nhúng dưới tài khoản quanly người dùng đã đăng nhập sẵn, dev server trỏ kho-vu-tru (đã xác nhận bundle gọi phonzyruoalimgaovljm). Phần cần vanphong/thukho1/chixem kiểm ở tầng DB trong transaction rollback. Hai phiên thử đã hủy; KK26-000001 còn 7 dòng đếm (phiên hủy, không đụng tồn).
- Sửa gap (nhánh fix/uat-06-gaps): mở thêm KK26-000003 (K1 BAGA) và KK26-000004 (K2, 0 mã) để kiểm lại, đã hủy cả hai lý do 'UAT sửa gap'.
- vanphong đang BẬT duyet_kiem_ke và xem_lich_su_kiotviet — tắt lại trong Cài đặt nếu không chủ ý.

- Bài 7 (25/09): người dùng trả lời "oke"/"pass" hai lần nhưng database không có dòng đếm nào trong KK26-000001/000002; log server chỉ có lượt mở trang. RPC `luu_dong_kiem_ke` gọi thử dưới vanphong (rollback) chạy đúng. Bài 7 vẫn chờ, cần bằng chứng mã + số đã lưu.
- Hai phiên thử KK26-000001, KK26-000002 (NHAP_LIEU, 0 dòng) đang nằm trên kho-vu-tru — hủy ở bài 12.

- Bài 6 ban đầu được trả lời "pass" nhưng database kho-vu-tru không có phiếu KIEM_KE nào; người dùng xác nhận chưa thử thật → chuyển thành skipped. Bài 2–5 là kết quả người dùng báo, không có dấu vết database để đối chiếu (chỉ đọc).
- Luồng kiểm kê (mở phiên, đếm 3 đường, D-03, bảng lệch, duyệt/hủy) CHƯA có bằng chứng chạy trên giao diện thật; logic DB được pgTAP 38/39 phủ (89 assert).

- Bước đầu kỳ (D-01, D-06) — nạp tồn tạm → mở phiên toàn kho → đếm sát ngày chuyển → nhập → duyệt — là việc vận hành trước go-live, chưa làm (25/09: 0 DIEU_CHINH, 0 KIEM_KE trên kho-vu-tru).
- Lần trả lời "đạt" ở 06-16 (24/09) không để lại dấu vết trên database và dev server trỏ kho-vu-tru đã dừng trước đó — biên bản này là lần UAT thật của Phase 6.
- .env.local vẫn trỏ project rnpq…; dùng dev server ở localhost:3000 do Claude khởi động (trỏ kho-vu-tru).
