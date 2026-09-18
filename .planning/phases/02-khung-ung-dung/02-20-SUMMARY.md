---
phase: 02-khung-ung-dung
plan: 20
status: complete
completed: 2026-09-18
requirements: [DMUC-06]
---

# Plan 02-20 — Luồng nhập danh mục từ Excel

## Đã làm

| File | Vai trò |
|---|---|
| `src/features/danh-muc/api/nhap-excel.api.ts` | `guiFileNhap(file, "kiem_tra" \| "nap")`, phản hồi parse bằng zod, `LoiNhapExcel` |
| `src/features/danh-muc/lib/file-loi.ts` | CSV lỗi có BOM UTF-8, escape theo RFC 4180, không đụng exceljs ở client |
| `src/features/danh-muc/components/nhap-excel.tsx` | Hộp thoại 3 bước, state bằng `useReducer`, khóa đóng khi đang gửi |
| `src/features/danh-muc/components/xem-truoc-nhap.tsx` | 4 con số + 3 tab Lỗi/Sửa/Thêm, tải CSV lỗi |
| `src/features/danh-muc/components/bang-san-pham.tsx` | Nối mục "Nhập từ Excel…" và nút "Xem các mã vừa sửa" |
| `scripts/kiem-tra-ham-thuan.ts` | +4 assert cho CSV lỗi |

## Bốn bước thử tay trên file thật

```
1) file KiotViet thật (3.266 dòng): thêm 0, sửa 0, không đổi 3.266, lỗi 0
2) xuất 518 mã CARBON rồi nhập lại chính file đó: 0 thêm, 0 sửa, 518 không đổi
3) sửa tay 1 ô ĐVT thành "Thùng" + đổi 1 tên:
   lỗi 1 → {"dong":2,"cot":"dvt","thong_bao":"Không có đơn vị tính 'Thùng'"}; sửa 1
   bấm Nạp khi còn lỗi → da_nap = false  (không nạp nửa vời)
4) xóa dòng lỗi → nạp: da_nap = true, 0 thêm, 1 sửa
   nhật ký mã đó: ten_hang / nguồn "import"
   đã trả tên HA13-09A-CB về giá trị cũ sau khi thử
```

Kết quả (1) xác nhận dữ liệu trong database đang khớp đúng file KiotViet gốc — không mã nào
lệch. Kết quả (2) chứng minh vòng đời D-23 "xuất → sửa → nhập lại" khép kín.

`npx tsx scripts/kiem-tra-ham-thuan.ts` xanh, `npm run check` xanh.

## Quyết định khi thực thi

- **Phản hồi của route parse bằng zod** trước khi dùng: dữ liệu qua mạng là `unknown`, và
  hình dạng của nó do một RPC jsonb quyết định — sai một khóa thì hỏng ở chỗ khó lần.
- **CSV chứ không .xlsx cho danh sách lỗi**: exceljs bản trình duyệt nặng và không bỏ qua
  được styles. BOM `﻿` bắt buộc, nếu không Excel trên Windows đọc UTF-8 thành ANSI.
- **Assert BOM soi BYTE, không soi chuỗi.** `blob.text()` giải mã UTF-8 theo chuẩn WHATWG và
  chuẩn đó **nuốt BOM** — assert bằng `startsWith("﻿")` sẽ đỏ dù file hoàn toàn đúng.
  Thứ Excel đọc là byte tải về, nên phải kiểm `EF BB BF`.
- **`useReducer` cho trạng thái hộp thoại**: bước / file / phản hồi / lỗi / đang gửi ràng buộc
  nhau, sáu `useState` rời sẽ có trạng thái vô nghĩa (bước 2 mà không có file).
- **Nạp mà server phát hiện lỗi mới → ở lại bước 2** kèm cảnh báo "Chưa có gì được nạp",
  không nhảy sang bước kết quả.
- **`beforeUpload` trả `false`**: antd không tự upload, ta gửi bằng `fetch` để đọc được JSON lỗi.

## Ghi chú vận hành

Script kiểm nằm ngoài thư mục dự án phải chạy kèm `NODE_PATH=<repo>/node_modules` thì mới
resolve được `exceljs`.
