---
phase: 02-khung-ung-dung
plan: 19
status: complete
completed: 2026-09-18
requirements: [DMUC-04, DMUC-07]
---

# Plan 02-19 — Công cụ rà hàng loạt + xuất Excel

## Đã làm

| File | Vai trò |
|---|---|
| `src/features/danh-muc/components/o-sua-nhanh.tsx` | Sửa Nhóm/ĐVT/Công đoạn ngay trên bảng, hoàn lại cache khi lỗi |
| `src/features/danh-muc/components/thanh-gan-hang-loat.tsx` | Thanh dính khi có mã được chọn: gán 3 trường, đổi trạng thái, Xác nhận đã rà; chặn > 1000 mã |
| `src/features/danh-muc/components/goi-y-cong-doan.tsx` | Hộp gợi ý theo đuôi mã, nhóm theo công đoạn, bỏ tick sẵn mã đáng ngờ |
| `src/app/api/danh-muc/xuat-excel/route.ts` | Xuất đúng bộ lọc đang xem, trần 5000 mã, cột giá vốn theo quyền |
| `src/features/danh-muc/components/nut-excel.tsx` | Nút Xuất + menu Tải mẫu / Nhập từ Excel (chừa cho plan 20) |
| `src/features/danh-muc/components/cot-san-pham.tsx` | 3 cột thành ô sửa nhanh; Tag "ĐVT mâu thuẫn" có tooltip |
| `src/features/danh-muc/components/bang-san-pham.tsx` | `rowSelection` giữ khóa qua trang, nút Cần rà có badge, Alert hướng dẫn |
| `src/shared/lib/o-excel.ts` | **Sửa lỗi đọc file** — xem bên dưới |

## Kiểm trên dữ liệu thật

```
Cần rà trước: 364
gợi ý theo đuôi mã: 145 mã — Carbon 64, Sơn 78, Xi mạ 2, Nano 1
gán hàng loạt 3 mã → 3; xác nhận đã rà → 3 ⇒ Cần rà còn 361
nhật ký mã đầu: da_xac_nhan_ra/hang_loat, cong_doan_id/hang_loat
hoàn tác → Cần rà về lại 364

xuất Excel lọc công đoạn Carbon: 518 mã → file 518 dòng
  vanphong: có cột Giá vốn
  thukho1 : KHÔNG có cột Giá vốn
GET /api/danh-muc/xuat-excel khi chưa đăng nhập → 401
```

`npm run check` xanh, `npx tsx scripts/kiem-tra-doc-excel.ts` xanh.

## Lỗi thật phát hiện khi kiểm — đã sửa

**Reader dạng stream của exceljs không đọc được chính file mà exceljs vừa ghi ra.**
Đo bằng cách xuất rồi đọc lại với nhiều kích thước:

```
50 dòng  → OK        800 dòng  → LỖI
100 dòng → LỖI       1200 dòng → LỖI
200 dòng → LỖI       1600 dòng → OK
```

Lỗi: `Cannot read properties of undefined (reading 'sheets')`. Reader stream giả định các
mục trong file zip đến theo thứ tự (workbook.xml trước worksheets); file exceljs ghi ra
không luôn theo thứ tự đó, tùy kích thước.

Đây **không phải lỗi của riêng script kiểm**: vòng đời D-23 là "xuất Excel → sửa → nhập
lại", nên người dùng sẽ gặp ngay ở plan 20 với file 100–1200 dòng — đúng cỡ hay dùng nhất.

Sửa trong `docSheetDau`: thử reader stream trước (vẫn cần, vì reader thường chết trên
styles lệch chuẩn của KiotViet), **hỏng thì rơi xuống reader thường** với
`ignoreNodes: ["styles"]`. Sau khi sửa, cả 9 kích thước đều đọc được và file KiotViet thật
vẫn đọc bình thường.

## Quyết định khi thực thi

- **Cập nhật lạc quan của ô sửa nhanh làm bằng ảnh chụp toàn bộ cache `["san-pham"]`**
  (`getQueriesData` → `setQueryData` khi lỗi), không sửa từng dòng: bảng có nhiều trang
  đang cache, sửa tay từng nơi dễ sót và lệch.
- **Badge "Cần rà" dùng lại chính RPC danh sách** với `kichThuoc: 10` chỉ để lấy
  `tong_so_dong` — không thêm RPC mới cho một con số.
- **Ô "Gán …" tách thành `SelectGan`** có state riêng: sau khi gán phải trở lại placeholder
  vì nó là hành động, không phải ô dữ liệu.
- **Đổi bộ lọc thì bỏ chọn** (`doiBoLoc` gọi `setChon([])`), nhưng việc *tự về trang 1* dùng
  `dieuHuong` không setState — lint cấm setState trong effect.
- **Mã "Kiểm tra" trong hộp gợi ý mặc định BỎ tick**: tên hàng nhắc công đoạn khác với đuôi mã.
- Cột Trạng thái ưu tiên hiện "ĐVT mâu thuẫn" (đỏ) thay vì "Cần rà" (cam) khi mã dính cả hai.

## Chưa làm (đúng phạm vi plan)

- Mục "Nhập từ Excel…" đã có trong menu nhưng chỉ hiện khi plan 20 truyền `onMoNhap`.
