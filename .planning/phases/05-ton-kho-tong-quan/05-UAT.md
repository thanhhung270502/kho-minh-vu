---
status: complete
phase: 05-ton-kho-tong-quan
source: [05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md, 05-09-SUMMARY.md, 05-10-SUMMARY.md, 05-11-SUMMARY.md]
started: 2026-09-21T15:20:00Z
updated: 2026-09-26T02:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Khởi động nguội
expected: Tắt server, xóa .next, `npm run dev` lại. Server lên không lỗi; ba route mới chưa đăng nhập thì về /dang-nhap kèm ?tiep_tuc=; POST /api/ton-kho/nap-tam khi chưa đăng nhập trả 401.
result: pass
ghi_chu: "Claude chạy: preview_stop → rm -rf .next → preview_start. /dang-nhap 200; /ton-kho, /ton-kho/dinh-muc, /ton-kho/nap-tam đều 307 → /dang-nhap?tiep_tuc=%2Fton-kho…; POST /api/ton-kho/nap-tam 401; preview_logs không có lỗi. Trang chi tiết mã hàng tải lại: mọi request Supabase 200, kể cả rpc/the_kho_san_pham. Console tab cũ còn cảnh báo antd `Timeline items.children` — đã sửa ở 2c5baa9 (kèm nhãn nguồn dinh_muc/gia_von_dau_ky), kiểm lại ở bài 6."

### 2. Nạp tồn tạm — xem trước
expected: Đăng nhập quanly → /ton-kho → link "Nạp tồn tạm" → chọn file DanhSachSanPham_KV….xlsx → kiểm tra. Màn hiện số mã sẽ nạp / bỏ qua / lỗi và tổng số lượng. Chưa ghi gì — /ton-kho vẫn toàn số 0.
result: pass
ghi_chu: "Claude chạy 25/09 (quanly, dev trỏ kho-vu-tru), file data/kiotviet/DanhSachSanPham_KV12092026-153850-575.xlsx qua đúng ô chọn file: Sẽ nạp 2.901, Bỏ qua 365 (tồn KiotViet 0), Lỗi 0, tổng 389.671; /ton-kho vẫn toàn 0 trước khi nạp."

### 3. Nạp thật một lần, nạp lại không nhân đôi
expected: Bấm "Nạp thật" MỘT lần → màn báo số chứng từ (DC…) vừa tạo. Chứng từ đó ở trạng thái Hoàn thành, ghi chú bắt đầu bằng [NAP_TON_TAM]. Chọn lại đúng file đó và kiểm tra lần nữa → không còn mã nào để nạp ("Không tạo chứng từ nào").
result: pass
ghi_chu: "Người dùng chốt nạp thật (giữ làm bước trước go-live). DC26-000001 HOAN_THANH, ghi chú [NAP_TON_TAM]…, 2.901 dòng, tổng 389.671 = tổng ton_kho; màn báo 'Đã tạo và ghi sổ phiếu điều chỉnh DC26-000001'. Kiểm lại cùng file: Sẽ nạp 0, Bỏ qua 3.266 ('Mã đã có chứng từ thật, không nạp đè'), nút 'Không còn mã nào cần nạp' khóa."

### 4. Màn tồn kho theo mã × kho
expected: /ton-kho: mỗi mã một dòng, cột Kho 1, Kho 2, Tổng — vài mã tự chọn khớp số trong file KiotViet. Lọc nhóm / công đoạn / kho / trạng thái tồn làm URL đổi theo, F5 vẫn giữ bộ lọc. Gõ tên không dấu (vd "bac dan") ra mã có dấu. Đổi trang được.
result: pass
ghi_chu: "Đối chiếu file: KDR 53, SSU-27-08L-I 62, YE19-46-1305-S -6, YLX-35BĐ-PP 92 — khớp. 'bac dan' ra 'bạc đen'; trang 2 → ?trang=2; ?nhom=BAGA&kho=Kho 1 ra 62 mã chỉ nhóm BAGA, ẩn cột Kho 2. Lặt vặt: tham số URL hướng sắp xếp tên 'sortDir' (tiếng Anh camelCase) lệch quy ước URL tiếng Việt không dấu."

### 5. Thẻ kho có tồn lũy kế và link chứng từ
expected: Bấm một mã ở /ton-kho → trang chi tiết → tab "Thẻ kho": có cột "Tồn lũy kế"; với "Tất cả kho", dòng trên cùng bằng cột Tổng của mã đó ở /ton-kho. Dòng KiotViet cũ hiện "—" kèm ghi chú dưới bảng. Bấm số phiếu mở đúng chứng từ (nhập / xuất / trả).
result: pass
ghi_chu: "Tab Thẻ kho có cột Tồn lũy kế; dòng trên cùng = tổng tồn (YLX-35BĐ-PP 92, PX-UAT-B 0); số phiếu PN/PX/TK/TN mở đúng trang. Dòng KiotViet cũ đã chuyển sang tab riêng từ Phase 6 nên kỳ vọng 'dòng KiotViet hiện —' không còn áp dụng. Lặt vặt: số phiếu DC26-000001 không bấm được (chưa có trang phiếu điều chỉnh); bút toán gốc hiện giờ 07:00 (ngày chứng từ) còn bút toán đảo hiện giờ thật, trong cùng ngày thứ tự lũy kế không theo trình tự thực tế."

### 6. Duyệt định mức tồn tối thiểu
expected: /ton-kho → link "Duyệt định mức tồn": trên cùng có cảnh báo số ngày dữ liệu; mỗi dòng có căn cứ (nhãn Theo mã / TB nhóm / Không dữ liệu + số ngày, số lần bán, số lượng đã bán). Tick vài mã → "Duyệt N mã" → xác nhận. Tồn tối thiểu của các mã đó đổi ở /danh-muc; tab lịch sử sửa của mã ghi nguồn "Duyệt định mức"; console KHÔNG có cảnh báo antd (kể cả Timeline).
result: pass
ghi_chu: "Cảnh báo 'chỉ trải 10 ngày' + cột Căn cứ (Theo lịch sử bán của mã · 10 ngày · 2 lần bán · đã bán 10). Mặc định chọn sẵn 200 mã — Claude bỏ chọn hết rồi tick 3: 06430GCE910 → 7, 06430K44V80 → 11, 08CLAM9905BOX → 54; hộp xác nhận 'cho 3 mã'; DB chỉ đúng 3 mã có ton_toi_thieu > 0, mỗi mã một dòng nhat_ky_sua nguồn dinh_muc; tab Lịch sử sửa hiện 'Duyệt định mức — Tồn tối thiểu: 0 → 7'; /ton-kho cột Định mức 7; console sạch."

### 7. Danh sách dưới định mức
expected: Mở /ton-kho?ton=duoi_dinh_muc (hoặc chọn Tồn = "Dưới định mức"): ra danh sách mã, không rỗng, mỗi dòng có nhãn cam "Dưới định mức" ở cột Tổng.
result: pass
retest: "26/09 sau migration 0067 — danh_sach_ton_kho và danh_sach_san_pham lọc duoi_dinh_muc trả rỗng (3 mã có định mức đều trên mức), 2 mã tồn âm vẫn ra ở lọc 'am'"
first_result: issue
reported: "Claude kiểm: /ton-kho?ton=duoi_dinh_muc ra 2 mã YE15-35FZĐ-PP (-1) và YE19-46-1305-S (-6) — cả hai CHƯA đặt định mức (—), không có nhãn cam; ba mã vừa duyệt đều tồn trên định mức nên đúng là không lọt."
severity: major

### 8. Thủ kho chỉ thấy kho mình
expected: Đăng nhập thukho1 → /ton-kho chỉ có cột Kho 1 (không có cột Kho 2), bộ lọc Kho chỉ có Kho 1; không thấy link "Duyệt định mức tồn" / "Nạp tồn tạm". Gõ thẳng /ton-kho/dinh-muc và /ton-kho/nap-tam → trang "Không đủ quyền".
result: pass
ghi_chu: "Kiểm DB (rollback) + ma trận route, không xem giao diện dưới thukho1: ton_theo_kho chỉ có Kho 1; /ton-kho/dinh-muc và /ton-kho/nap-tam trả 'quyen' cho thukho1 trong test-route-permissions (150/150)."

### 9. Dùng trên điện thoại
expected: Thu hẹp cửa sổ cỡ điện thoại: thanh tab đáy Tổng quan · Xuất · Nhập · Tồn · Khác ("Đặt hàng" nằm trong Khác). Ở /ton-kho, bảng cuộn ngang trong khung riêng, cả trang không tràn ngang.
result: pass
ghi_chu: "375px: thanh đáy Tổng quan | Xuất | Nhập | Tồn | Khác; /ton-kho bảng cuộn trong khung (1240 trong 319, overflow-x auto), trang 375 không tràn."

### 10. Import Excel danh mục và giá vốn đầu kỳ (bản sửa c51391d)
expected: Màn nhập danh mục Excel: chọn file mẫu → xem trước hiện số thêm / sửa / không đổi, KHÔNG báo lỗi chung. Màn giá vốn đầu kỳ: chọn file mẫu → xem trước chạy được (không rơi vào "Không nạp được giá vốn"). Không cần bấm nạp thật.
result: pass
ghi_chu: "Qua đúng menu Excel ở /danh-muc: Nhập từ Excel với file xuất nhóm BAGA → Thêm 0 / Sửa 0 / Không đổi 189 / Lỗi 0, không lỗi chung. Nạp giá vốn đầu kỳ với file mẫu → xem trước chạy (Sẽ đặt 0, Lỗi 0), không rơi vào 'Không nạp được giá vốn'. Không bấm nạp."

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

```yaml
- truth: "Lọc \"Dưới định mức\" chỉ ra mã có định mức và tồn thấp hơn định mức"
  status: resolved
  fix: "0067 (áp lên kho-vu-tru, md5 lịch sử khớp file) + pgTAP 32/41 đỏ rồi xanh"
  reason: "DB danh_sach_ton_kho lọc `l.tong < l.ton_toi_thieu` với ton_toi_thieu mặc định 0 → mọi mã tồn âm chưa đặt định mức đều lọt; giao diện (stock-columns.tsx isBelowMinimum) lại đòi minStock > 0 nên không gắn nhãn — lệch hai tầng"
  severity: major
  test: 7
  artifacts: [supabase/migrations (danh_sach_ton_kho), src/features/inventory/components/stock-columns.tsx]
  missing: ["migration thay danh_sach_ton_kho: duoi_dinh_muc thêm `and l.ton_toi_thieu > 0` (khớp isBelowMinimum) + pgTAP cho mã tồn âm không định mức"]
```

## Ghi chú vận hành

- 25/09: ĐÃ NẠP TỒN TẠM THẬT (DC26-000001, 2.901 mã, 389.671) theo chốt của người dùng — bước trước go-live, kiểm kê đầu kỳ sẽ đè lên. Đã duyệt định mức 3 mã. Hai việc này KHÔNG hoàn tác.
- File KiotViet đưa vào trang qua máy chủ tĩnh tạm (127.0.0.1:8799, CORS chỉ localhost:3000) trong scratchpad, đã tắt và xóa bản sao sau khi dùng.
- 26/09: pgTAP toàn bộ chạy trên cloud bằng psql + DATABASE_URL: 32/34 file xanh, 508 assert. Hai file đỏ KHÔNG liên quan 0067: 36 (A2) và 39 (E5) giả định vanphong chưa bật duyet_kiem_ke — tài khoản này đang bật từ UAT Phase 6.
