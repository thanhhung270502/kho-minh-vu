---
status: testing
phase: 05-ton-kho-tong-quan
source: [05-05-SUMMARY.md, 05-06-SUMMARY.md, 05-07-SUMMARY.md, 05-08-SUMMARY.md, 05-09-SUMMARY.md, 05-10-SUMMARY.md, 05-11-SUMMARY.md]
started: 2026-09-21T15:20:00Z
updated: 2026-09-21T15:20:00Z
---

## Current Test

number: 2
name: Nạp tồn tạm — xem trước
expected: |
  Đăng nhập quanly, mở /ton-kho, bấm link "Nạp tồn tạm" (góc phải tiêu đề). Chọn file
  DanhSachSanPham_KV….xlsx rồi bấm kiểm tra. Màn hiện số mã sẽ nạp, số mã bỏ qua, số lỗi
  và tổng số lượng sẽ nạp. Chưa có gì được ghi sổ — /ton-kho vẫn toàn số 0.
awaiting: user response

## Tests

### 1. Khởi động nguội
expected: Tắt server, xóa .next, `npm run dev` lại. Server lên không lỗi; ba route mới chưa đăng nhập thì về /dang-nhap kèm ?tiep_tuc=; POST /api/ton-kho/nap-tam khi chưa đăng nhập trả 401.
result: pass
ghi_chu: "Claude chạy: preview_stop → rm -rf .next → preview_start. /dang-nhap 200; /ton-kho, /ton-kho/dinh-muc, /ton-kho/nap-tam đều 307 → /dang-nhap?tiep_tuc=%2Fton-kho…; POST /api/ton-kho/nap-tam 401; preview_logs không có lỗi. Trang chi tiết mã hàng tải lại: mọi request Supabase 200, kể cả rpc/the_kho_san_pham. Console tab cũ còn cảnh báo antd `Timeline items.children` — đã sửa ở 2c5baa9 (kèm nhãn nguồn dinh_muc/gia_von_dau_ky), kiểm lại ở bài 6."

### 2. Nạp tồn tạm — xem trước
expected: Đăng nhập quanly → /ton-kho → link "Nạp tồn tạm" → chọn file DanhSachSanPham_KV….xlsx → kiểm tra. Màn hiện số mã sẽ nạp / bỏ qua / lỗi và tổng số lượng. Chưa ghi gì — /ton-kho vẫn toàn số 0.
result: [pending]

### 3. Nạp thật một lần, nạp lại không nhân đôi
expected: Bấm "Nạp thật" MỘT lần → màn báo số chứng từ (DC…) vừa tạo. Chứng từ đó ở trạng thái Hoàn thành, ghi chú bắt đầu bằng [NAP_TON_TAM]. Chọn lại đúng file đó và kiểm tra lần nữa → không còn mã nào để nạp ("Không tạo chứng từ nào").
result: [pending]

### 4. Màn tồn kho theo mã × kho
expected: /ton-kho: mỗi mã một dòng, cột Kho 1, Kho 2, Tổng — vài mã tự chọn khớp số trong file KiotViet. Lọc nhóm / công đoạn / kho / trạng thái tồn làm URL đổi theo, F5 vẫn giữ bộ lọc. Gõ tên không dấu (vd "bac dan") ra mã có dấu. Đổi trang được.
result: [pending]

### 5. Thẻ kho có tồn lũy kế và link chứng từ
expected: Bấm một mã ở /ton-kho → trang chi tiết → tab "Thẻ kho": có cột "Tồn lũy kế"; với "Tất cả kho", dòng trên cùng bằng cột Tổng của mã đó ở /ton-kho. Dòng KiotViet cũ hiện "—" kèm ghi chú dưới bảng. Bấm số phiếu mở đúng chứng từ (nhập / xuất / trả).
result: [pending]

### 6. Duyệt định mức tồn tối thiểu
expected: /ton-kho → link "Duyệt định mức tồn": trên cùng có cảnh báo số ngày dữ liệu; mỗi dòng có căn cứ (nhãn Theo mã / TB nhóm / Không dữ liệu + số ngày, số lần bán, số lượng đã bán). Tick vài mã → "Duyệt N mã" → xác nhận. Tồn tối thiểu của các mã đó đổi ở /danh-muc; tab lịch sử sửa của mã ghi nguồn "Duyệt định mức"; console KHÔNG có cảnh báo antd (kể cả Timeline).
result: [pending]

### 7. Danh sách dưới định mức
expected: Mở /ton-kho?ton=duoi_dinh_muc (hoặc chọn Tồn = "Dưới định mức"): ra danh sách mã, không rỗng, mỗi dòng có nhãn cam "Dưới định mức" ở cột Tổng.
result: [pending]

### 8. Thủ kho chỉ thấy kho mình
expected: Đăng nhập thukho1 → /ton-kho chỉ có cột Kho 1 (không có cột Kho 2), bộ lọc Kho chỉ có Kho 1; không thấy link "Duyệt định mức tồn" / "Nạp tồn tạm". Gõ thẳng /ton-kho/dinh-muc và /ton-kho/nap-tam → trang "Không đủ quyền".
result: [pending]

### 9. Dùng trên điện thoại
expected: Thu hẹp cửa sổ cỡ điện thoại: thanh tab đáy Tổng quan · Xuất · Nhập · Tồn · Khác ("Đặt hàng" nằm trong Khác). Ở /ton-kho, bảng cuộn ngang trong khung riêng, cả trang không tràn ngang.
result: [pending]

### 10. Import Excel danh mục và giá vốn đầu kỳ (bản sửa c51391d)
expected: Màn nhập danh mục Excel: chọn file mẫu → xem trước hiện số thêm / sửa / không đổi, KHÔNG báo lỗi chung. Màn giá vốn đầu kỳ: chọn file mẫu → xem trước chạy được (không rơi vào "Không nạp được giá vốn"). Không cần bấm nạp thật.
result: [pending]

## Summary

total: 10
passed: 1
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
