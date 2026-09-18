---
status: complete
phase: 02-khung-ung-dung
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md, 02-07-SUMMARY.md, 02-08-SUMMARY.md, 02-09-SUMMARY.md, 02-10-SUMMARY.md, 02-11-SUMMARY.md, 02-12-SUMMARY.md, 02-13-SUMMARY.md, 02-14-SUMMARY.md, 02-15-SUMMARY.md, 02-16-SUMMARY.md, 02-17-SUMMARY.md, 02-18-SUMMARY.md, 02-19-SUMMARY.md, 02-20-SUMMARY.md, 02-21-SUMMARY.md]
started: 2026-09-18T00:00:00Z
updated: 2026-09-18T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Khởi động nguội
expected: Tắt server, `npm run dev`, mở http://localhost:3000 → đẩy về /dang-nhap; đăng nhập `vanphong` vào được app, không màn trắng, console sạch.
result: pass

### 2. Đăng nhập bằng tên đăng nhập và menu theo vai trò
expected: Đăng nhập bằng TÊN (không cần email). `thukho1` không thấy mục Cài đặt; `vanphong` thấy Cài đặt nhưng không có tab Người dùng / Số chứng từ; `quanly` thấy đủ 6 tab.
result: pass

### 3. Bắt đổi mật khẩu lần đầu
expected: Quản lý tạo tài khoản mới với mật khẩu tạm → đăng nhập bằng tài khoản đó bị đẩy thẳng sang /doi-mat-khau, không vào được màn nào khác cho tới khi đổi xong.
result: skipped
reason: "Đã chứng minh bằng script ở plan 14 (tạo tài khoản → cờ phải đổi mật khẩu → đổi xong gỡ cờ). Không lặp lại trên giao diện vì cần đăng nhập bằng tài khoản thứ hai."

### 4. Danh mục — tìm không dấu và bộ lọc trên URL
expected: /danh-muc hiện 3.266 mã. Gõ "op po air blade" (không dấu) ra đúng nhóm ốp pô AIR BLADE. Lọc nhóm hàng/công đoạn → URL đổi theo; F5 giữ nguyên bộ lọc; gửi link cho người khác ra cùng kết quả.
result: pass

### 5. Tạo và sửa mã hàng
expected: Bấm "Thêm mã hàng" mở ngăn kéo bên phải. ĐVT và Công đoạn là HAI ô riêng. Tạo mã mới xong tìm thấy ngay. Với `vanphong`, ô Giá bán bị khóa kèm chữ "Chỉ quản lý đặt giá bán"; với `quanly` sửa được.
result: issue
reported: "Mã trùng hiện Alert đỏ chung chung "Không tải được dữ liệu. Bấm Thử lại…" thay vì lỗi "Mã hàng đã tồn tại" dưới ô Mã. Dữ liệu đã nhập vẫn giữ."
severity: major

### 6. Chi tiết mã hàng và thẻ kho
expected: Bấm mã hàng mở trang chi tiết: thông tin, tồn theo kho, tab Thẻ kho có dòng lịch sử KiotViet (nguồn "KiotViet · bán"/"KiotViet · nhập"), tab Lịch sử sửa hiện các lần sửa kèm tên người sửa.
result: pass

### 7. Rà hàng loạt 364 mã "Cần rà"
expected: Nút "Cần rà" có số 364. Bật lên → chọn nhiều dòng → gán công đoạn một lần cho cả nhóm. Bấm "Gợi ý theo đuôi mã" hiện 145 mã nhóm theo Carbon/Sơn/Xi mạ/Nano, bỏ tick được. Sửa nhanh ĐVT/nhóm ngay trên ô của bảng.
result: pass

### 8. Xuất Excel theo bộ lọc
expected: Lọc một nhóm bất kỳ rồi bấm "Xuất Excel" → tải file .xlsx, mở bằng Excel đúng tiếng Việt, số dòng bằng số mã đang lọc. Đăng nhập `vanphong` có cột Giá vốn, `thukho1` KHÔNG có cột đó.
result: pass

### 9. Nhập Excel — xem trước rồi mới nạp
expected: Menu "Nhập từ Excel…" → kéo file vào → hiện Thêm/Sửa/Không đổi/Lỗi trước khi nạp. Sửa một ô ĐVT thành chữ bậy → có lỗi, nút Nạp bị khóa, tải được file lỗi .csv mở bằng Excel đúng dấu. Sửa lại file → nạp được.
result: partial
reason: "Hộp 3 bước, vùng kéo thả, link file mẫu đúng. Không tải file lên được từ khung trình duyệt của Claude; luồng nạp đã chứng minh bằng script trên file KiotViet thật (plan 20)."

### 10. Đối tác — NCC và khách trong một bảng
expected: /doi-tac hiện NCC + khách chung, lọc theo loại được, tìm theo mã/tên/SĐT. Tạo đối tác mới thấy mã gợi ý sẵn (KH…/NCC…), sửa được. Nhập trùng mã báo lỗi ngay dưới ô Mã, dữ liệu đã gõ không mất.
result: pass

### 11. Chi tiết đối tác và lịch sử giao dịch
expected: Mở NCC000001 (VŨ TRỤ L.AN) → tab Giao dịch hiện 10 phiếu nhập KiotViet kèm ngày, số phiếu, số dòng, tổng số lượng.
result: pass

### 12. Rà ghi chú KiotViet
expected: /doi-tac/ra-ghi-chu hiện thanh tiến độ và 150 giá trị chưa rà, sắp theo số hóa đơn giảm dần. Mỗi giá trị quyết được: Tạo khách (tên điền sẵn từ ghi chú) / Gộp vào khách có sẵn / Là sale / Khách + sale / Bỏ qua. Tab "Đã rà" hủy được quyết định.
result: pass

### 13. Cài đặt → Người dùng
expected: Quản lý tạo tài khoản (chọn vai trò có mô tả từng dòng; thủ kho bắt buộc tick kho), đặt lại mật khẩu (sinh ngẫu nhiên + copy), vô hiệu hóa (có cảnh báo nhân viên bị đăng xuất). Không tự hạ quyền mình khi là quản lý duy nhất.
result: blocked
reason: "Cần đăng nhập bằng quanly; Claude không nhập mật khẩu vào ô đăng nhập."
blocked_by: other

### 14. Cài đặt → Kho, nhóm hàng, ĐVT, công đoạn
expected: Thêm/sửa được ở cả 4 tab. Kho chỉ ngừng hoạt động, không có nút Xóa. Xóa nhóm hàng đang có mã dùng → báo "Đang có mã hàng dùng…". Mã hệ thống (CAI, SON, CARBON…) có nhãn "Hệ thống", không đổi mã và không xóa được.
result: issue
reported: "Xóa nhóm hàng đang có mã dùng bị chặn ĐÚNG nhưng thông báo sai: hiện "Không tải được dữ liệu" thay vì "Đang có mã hàng dùng nhóm hàng này…"."
severity: major

### 15. Cài đặt → Số chứng từ
expected: Hiện 7 loại với tiền tố, số chữ số, số đã phát, ví dụ số kế tiếp (PN26-000001). Sửa tiền tố → ví dụ đổi ngay khi gõ. Đặt trùng tiền tố loại khác → báo lỗi dưới ô. `vanphong` vào tab này bị chặn.
result: blocked
reason: "Cần đăng nhập bằng quanly."
blocked_by: other

### 16. Gõ thẳng URL không lách được quyền
expected: Đăng nhập `thukho1` rồi gõ thẳng /cai-dat/nguoi-dung → bị đẩy sang trang "Không đủ quyền", không hiện dữ liệu. Đăng xuất rồi gõ /danh-muc → về /dang-nhap, đăng nhập xong quay lại đúng /danh-muc.
result: pass
ghi_chu: "Sau khi sửa: mã trùng hiện “Mã hàng đã tồn tại. Dùng mã khác.” ngay dưới ô Mã, dữ liệu đã nhập giữ nguyên."

## Summary

total: 16
passed: 14
issues: 0
pending: 0
skipped: 1
blocked: 0
partial: 1

Ba bài lỗi (5, 14, 16) đã sửa và kiểm lại trên trình duyệt — xem mục "Đã sửa" dưới.

## Gaps

```yaml
- truth: "Bấm Cài đặt trên menu mở được khu Cài đặt"
  status: failed
  reason: "Runtime error: Attempted to call tabDauTien() from the server but tabDauTien is on the client — src/app/(app)/cai-dat/page.tsx:13"
  severity: blocker
  test: 16
  artifacts: ["src/features/cai-dat/components/tab-cai-dat.tsx", "src/app/(app)/cai-dat/page.tsx"]
  missing: ["module thuần (không 'use client') chứa TAB_CAI_DAT + tabDauTien", "/cai-dat trong ma trận kiem-tra-quyen-route.ts"]

- truth: "Lỗi nghiệp vụ hiện đúng câu và đúng ô (mã trùng, nhóm đang dùng, thiếu quyền)"
  status: failed
  reason: "supabase-js chỉ tạo instance PostgrestError khi dùng .throwOnError(); code dự án dùng `if (error) throw error` nên ném object thường → mọi `e instanceof PostgrestError` đều false"
  severity: major
  test: 5, 14
  artifacts: ["src/shared/lib/errors.ts", "src/providers/query-client.ts", "src/features/danh-muc/components/ngan-keo-san-pham.tsx", "src/features/doi-tac/components/ngan-keo-doi-tac.tsx", "src/features/cai-dat/components/ngan-keo-danh-muc-phu.tsx", "src/features/cai-dat/components/danh-muc-phu.tsx", "src/features/cai-dat/components/cau-hinh-so-ct.tsx"]
  missing: ["nhận diện lỗi PostgREST theo hình dạng thay vì instanceof"]

- truth: "Mở trang danh mục không sinh request lỗi"
  status: failed
  reason: "NganKeoSanPham gọi useChiTietSanPham(id ?? '') khi ngăn kéo đóng → rpc chi_tiet_san_pham với uuid rỗng → 400, lặp 3 lần vì nenThuLai() cũng không nhận ra lỗi PostgREST"
  severity: minor
  test: 4
  artifacts: ["src/features/danh-muc/components/ngan-keo-san-pham.tsx", "src/features/danh-muc/hooks/useSanPham.ts"]
  missing: ["enabled guard cho useChiTietSanPham"]

- truth: "Không dùng API antd đã bỏ, không cảnh báo console"
  status: failed
  reason: "Dropdown.Button deprecated (nut-excel.tsx), Modal maskClosable deprecated (nhap-excel.tsx), Select option value null (the-kho.tsx), Descriptions span không khớp (chi-tiet-doi-tac.tsx)"
  severity: cosmetic
  test: 4, 6, 9, 11
  artifacts: ["src/features/danh-muc/components/nut-excel.tsx", "src/features/danh-muc/components/nhap-excel.tsx", "src/features/danh-muc/components/the-kho.tsx", "src/features/doi-tac/components/chi-tiet-doi-tac.tsx"]
  missing: []
```

## Đã sửa (cùng phiên UAT)

| Gốc | Sửa ở | Kiểm lại |
|---|---|---|
| `tabDauTien` là hàm client nhưng Server Component gọi → `/cai-dat` crash | tách `src/features/cai-dat/lib/tab-cai-dat.ts` (module thuần) | `/cai-dat` vào thẳng tab đầu; ma trận route 50/50 |
| `instanceof PostgrestError` luôn false → mọi lỗi nghiệp vụ ra câu chung chung | `laLoiPostgrest()` / `maLoi()` trong `errors.ts`; thay ở `query-client.ts` + 5 component | mã trùng và nhóm đang dùng hiện đúng câu |
| Ngăn kéo đóng vẫn gọi `chi_tiet_san_pham` với id rỗng → 3× HTTP 400 | `enabled: id !== ""` | tải trang chỉ còn 2 RPC, không request lỗi |
| 5 API antd v6 đã bỏ: `Dropdown.Button`, `Modal.maskClosable`, `Select` value null, `Descriptions.span`, `Alert.message` (17 chỗ) | 6 file | 5 trang, console không còn lỗi nào |

Bộ kiểm sau sửa: pgTAP **199 assert / 0 lỗi**, `verify:hook` ✓, hàm thuần ✓, đọc Excel ✓,
quyền route **50/50**, `npm run check` exit 0.

## Còn lại

- Bài 13 và 15 đã kiểm xong sau khi người dùng đăng nhập `quanly` vào khung trình duyệt.
  Console sạch trên cả hai màn; không để lại tài khoản hay cấu hình thử nào.
- Bài 9: chưa tải file lên được từ khung trình duyệt; luồng nạp đã kiểm bằng script trên
  file KiotViet thật (plan 20).
- Dữ liệu thử: mã `UAT-VERIFY-01` để ở trạng thái **ngừng kinh doanh** (không xóa).
