---
phase: 02-khung-ung-dung
plan: 17
status: complete
completed: 2026-09-18
requirements: [DMUC-05, DTAC-03]
---

# Plan 02-17 — Chi tiết mã hàng (thẻ kho) và chi tiết đối tác

## Đã làm

| File | Vai trò |
|---|---|
| `src/shared/components/lich-su-sua.tsx` | Dòng thời gian nhật ký dùng chung; gom nhiều trường sửa cùng lúc thành một mục |
| `src/app/(app)/danh-muc/[id]/page.tsx` | `await params` (Next 16), id không phải uuid → `notFound()` |
| `src/features/danh-muc/components/chi-tiet-san-pham.tsx` | Descriptions + tồn theo kho + 2 tab |
| `src/features/danh-muc/components/the-kho.tsx` | Thẻ kho phân trang server, lọc theo kho, cột giá vốn theo quyền |
| `src/app/(app)/doi-tac/[id]/page.tsx` | Như trên cho đối tác |
| `src/features/doi-tac/components/chi-tiet-doi-tac.tsx` | Hồ sơ + tên ghi chú KiotViet đã gán + 2 tab |
| `src/features/doi-tac/components/lich-su-giao-dich.tsx` | Lịch sử giao dịch gom theo phiếu |

## Kiểm trên dữ liệu thật

```
NCC000001 = CÔNG TY TNHH MTX SXTM VŨ TRỤ L.AN — 10 phiếu nhập KiotViet
  2026-09-11 KIOTVIET_NHAP PN000649 NHAP 48 dòng, SL 1930
  2026-09-10 KIOTVIET_NHAP PN000642 NHAP 36 dòng, SL 1246
thẻ kho HA10-33-CB: có dòng "2026-09-11 KIOTVIET_BAN HD006958 xuất 1"
thukho1 xem thẻ kho mã đó → 0 dòng
thukho1 xem lịch sử sửa → 42501 "Chỉ quản lý và văn phòng xem được lịch sử sửa"
```

**Đính chính con số trong plan:** plan ghi "~289 phiếu nhập" của NCC000001. Kiểm trên
`luu_tru_nhap_kiotviet` thì đó là **289 dòng hàng nằm trong 10 phiếu**. Màn hình gom theo
phiếu nên hiện 10 — đúng, không phải thiếu dữ liệu.

`npm run check` xanh.

## Quyết định khi thực thi

- **Thủ kho không thấy dòng KiotViet trong thẻ kho** (0 dòng ở ví dụ trên): dữ liệu cũ
  không gắn kho, mà RPC áp phạm vi kho cho thủ kho. Đây là hệ quả đã biết của D-21, không
  phải lỗi — nên màn hình có sẵn `Alert` giải thích khi lọc theo một kho cụ thể.
- **`rowKey` của thẻ kho ghép nhiều cột**: một phiếu có thể có nhiều dòng cho cùng mã hàng
  (nhập rồi trả lại), `chung_tu_id` một mình không duy nhất.
- **Khối "Tên trong ô Ghi chú KiotViet" nuốt lỗi 42501 có chủ đích**: bảng ánh xạ chỉ mở cho
  quản lý/văn phòng. Thiếu một dòng thông tin phụ không đáng để cả màn hình báo lỗi —
  `retry: false` để không gọi lại vô ích.
- **Nhật ký đổi uuid thành tên** qua `hienGiaTri` + `useDanhMucPhu()`; trang đối tác không cần
  nên không truyền.
- **Import tĩnh `TheKho`** thay vì `next/dynamic`: tab antd đã không render nội dung tab ẩn,
  thêm một lớp dynamic chỉ làm rối file.

## Chưa làm (đúng phạm vi plan)

- Số phiếu chưa link sang màn chứng từ (Phase 3 mới có màn đó).
