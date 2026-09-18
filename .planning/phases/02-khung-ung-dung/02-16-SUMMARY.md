---
phase: 02-khung-ung-dung
plan: 16
status: complete
completed: 2026-09-18
requirements: [DMUC-01, DMUC-02, DMUC-03, DMUC-04]
---

# Plan 02-16 — Bảng danh mục hàng + ngăn kéo tạo/sửa mã

## Đã làm

| File | Vai trò |
|---|---|
| `src/app/(app)/danh-muc/page.tsx` | Guard `xem_danh_muc`, truyền 3 quyền (sửa / xem giá vốn / sửa giá bán) |
| `src/features/danh-muc/components/thanh-loc-san-pham.tsx` | Ô tìm debounce 300ms + Enter tìm ngay; 5 bộ lọc; nút Xóa bộ lọc; khe `hanhDongPhu`/`nutThem` cho plan 19–20 |
| `src/features/danh-muc/components/cot-san-pham.tsx` | `taoCot()` — cột Giá vốn chỉ sinh ra trong nhánh `xemGiaVon`; helper `soVn` |
| `src/features/danh-muc/components/bang-san-pham.tsx` | Bộ lọc trên URL, sắp xếp server, phân trang 20/50/100/200, 4 trạng thái |
| `src/features/danh-muc/schemas/san-pham.schema.ts` | Zod: ĐVT và công đoạn là hai trường riêng, quy đổi > 0, tồn tối đa ≥ tối thiểu |
| `src/features/danh-muc/components/ngan-keo-san-pham.tsx` | Form 2 cột, giá bán khóa với văn phòng, giá vốn chỉ đọc, "Tạo tiếp mã khác" |

## Kiểm trên dữ liệu thật (3.266 mã)

```
tổng mã đang kinh doanh: 3266
tìm không dấu "op po air blade" (741ms): 233 mã khớp — "Ốp pô AIR BLADE 10 xi"
mã Cần rà: 364
vanphong tạo UAT-ZQX-001 (ĐVT Cặp + công đoạn Sơn) → tìm "uat zqx" ra ngay
vanphong đặt giá bán → 42501 "Chỉ vai trò quản lý được sửa giá bán"
quanly  đặt giá bán → ok
mã trùng → 23505
ghi thẳng gia_von → 42501 permission denied for table san_pham
thukho1 xem danh mục → được, gia_von trả về null
thukho1 sửa mã → KHÔNG lỗi, count 0, tên giữ nguyên
mã test đã đặt về ngừng kinh doanh
```

`npm run check` xanh.

## Quyết định khi thực thi

- **Bỏ `z.coerce.number()`** mà plan đề xuất: nó để kiểu đầu vào là `unknown`, làm mọi
  `InputNumber` mất kiểu `value` và phải rải ép kiểu khắp form. `InputNumber` của antd
  đã trả `number | null` sẵn nên `z.number()` là đủ và giữ được kiểu thật.
- **"Tạo tiếp mã khác" là checkbox ở `extra` của ngăn kéo**, giữ lại Nhóm/ĐVT/Công đoạn/Kho
  và xóa Mã/Tên rồi focus ô Mã — nhập một loạt mã cùng loại không phải chọn lại 4 ô.
- **Mã mới mặc định ĐVT `CAI` + công đoạn `MUA_NGOAI`** (đa số hàng thương mại), tra id
  từ `useDanhMucPhu()` chứ không hard-code uuid.
- **Lưu ngăn kéo KHÔNG gỡ cờ "Cần rà"** — có `Alert` nói rõ gỡ bằng nút "Xác nhận đã rà"
  (plan 19). Sửa ĐVT chưa chắc là đã rà xong.
- **Sắp xếp đọc `columnKey`** chứ không `field`: cột Mã hàng render ra `Link` nên `field`
  không phải lúc nào cũng là tên cột RPC.

## Ghi nhận để plan sau dùng

Thủ kho `update` mã hàng trả về **không lỗi, count 0** (RLS lọc sạch dòng). Giao diện đã
ẩn nút Sửa với vai trò này, nhưng mọi màn ghi dữ liệu về sau nên kiểm `count` như
`danh-muc-phu.api.ts` đang làm, đừng tin `error === null` là đã ghi được.

## Chưa làm (đúng phạm vi plan)

- `rowSelection`, ô sửa nhanh, gợi ý công đoạn, nút Excel — plan 19/20 (thanh lọc đã chừa khe).
- `/danh-muc/[id]` — plan 17. Cột Mã hàng đã trỏ sẵn link.
