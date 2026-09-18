---
phase: 02-khung-ung-dung
plan: 18
status: complete
completed: 2026-09-18
requirements: [DLIEU-04]
---

# Plan 02-18 — Rà ghi chú KiotViet

## Đã làm

| File | Vai trò |
|---|---|
| `src/features/doi-tac/lib/ghi-chu.ts` | Hàm thuần: `goiYTenKhach`, `tachSoDienThoai`, `rutGon` |
| `src/features/doi-tac/api/ra-ghi-chu.api.ts` | 3 RPC rà ghi chú + đếm tiến độ + tìm khách để gộp |
| `src/features/doi-tac/hooks/useRaGhiChu.ts` | 5 hook; quyết xong invalidate cả `["ra-ghi-chu"]` lẫn `["doi-tac"]` |
| `src/features/doi-tac/components/ra-ghi-chu.tsx` | Tiến độ, mẹo đóng được, tab Chưa rà/Đã rà, bảng 30 dòng/trang |
| `src/features/doi-tac/components/hanh-dong-ghi-chu.tsx` | 5 quyết định; Popover trên máy tính, Modal + menu trên điện thoại |
| `src/app/(app)/doi-tac/ra-ghi-chu/page.tsx` | Guard `sua_danh_muc` |
| `scripts/kiem-tra-ham-thuan.ts` | +3 assert cho tên đề xuất và tách SĐT |

## Kiểm trên dữ liệu thật

```
tổng giá trị ghi chú: 150 — chưa rà: 150
5 giá trị đầu: NGỌC (59 HĐ) · TỐT (50) · PHƯƠNG (48) · OANH (45) · QUỲNH (42)
tạo khách / là sale / khách + sale / bỏ qua → ok  → chưa rà còn 146
tab Đã rà: KHACH/UAT Khách · SALE/UAT Sale · KHACH_VA_SALE/…/UAT Sale 2 · BO_QUA
thukho1 quyết → 42501 "Chỉ quản lý và văn phòng quyết được ghi chú"
đã hủy hết 4 quyết định thử → chưa rà về lại 150
KH000002, KH000003 (khách tạo lúc thử) đã đặt ngừng hoạt động, không xóa
```

`npx tsx scripts/kiem-tra-ham-thuan.ts` xanh, `npm run check` xanh.

**Dữ liệu thử đã hoàn tác trọn vẹn** — người văn phòng thật sẽ rà từ đầu với đủ 150 giá trị.

## Quyết định khi thực thi

- **Ô SĐT giữ lại**: `quyet_ghi_chu` của plan 07 đọc `p_tao_khach->>'dien_thoai'` và
  `->>'dia_chi'`, nên gửi kèm số tách được từ ghi chú là hợp lệ.
- **Mẹo đầu màn đọc `localStorage` bằng `useSyncExternalStore`**, không `useEffect` +
  `setState`: lint `react-hooks/set-state-in-effect` chặn, và đây đúng là "nguồn dữ liệu
  ngoài React". Ảnh chụp phía server trả `true` nên HTML server không hiện mẹo → không lệch
  hydrate. Mọi lần đọc/ghi vẫn bọc `try/catch` (chế độ riêng tư ném ngay ở lời gọi).
- **Về trang 1 khi trang hiện tại cạn**: chỉnh state ngay trong lúc render thay vì effect,
  cùng cách đã dùng ở plan 13/16.
- **Nút "Gộp" tách khỏi "Tạo khách"** cho đủ 2 lần bấm ở ca phổ biến, và trên màn < 768px
  gom hết vào `Dropdown` + `Modal` (Popover neo theo nút sẽ tràn màn hình điện thoại).
- **`rowKey="gia_tri"`** — RPC gom theo giá trị ghi chú, không có id.

## Chưa làm (đúng phạm vi plan)

- Xem hóa đơn KiotViet của khách vừa tạo — tab Giao dịch thuộc plan 17.
