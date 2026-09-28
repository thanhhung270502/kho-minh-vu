---
quick_id: 260928-sn5
completed: 2026-09-28
commits: [319f736]
---

# Phiếu xuất: mở phiếu đang nhập liệu thì con trỏ nằm sẵn ở ô Mã hàng (checklist 5.2)

**Sửa:** `issue-line-table.tsx` — `useEffect` theo `editable`: hẹn `setTimeout(0)` (bẫy 14b)
rồi focus ô mã, chỉ khi `pointer: fine` và chưa có ô nào đang focus.

## Kiểm chứng (trình duyệt, local)
- Tạo phiếu hoàn toàn bằng bàn phím (nút Tạo phiếu xuất → Enter → người nhận → Tab → kho
  ↓ Enter → Tab → Tạo phiếu → Enter) → PX26-000005 mở ra với con trỏ ở ô Mã hàng; gõ
  TEST-01 → Enter → 1 → Enter thêm dòng, con trỏ quay về ô mã. Không cần chuột.
- Phiếu đã ghi sổ (PX26-000004): không có ô mã, không focus gì.
- Khổ 375px (pointer coarse): không tự focus.
- `npm run check` xanh, console sạch.

## Ngoài phạm vi
Phiếu nhập (`receipt-line-table.tsx`) và đơn đặt hàng (`order-line-table.tsx`) cũng không tự
focus ô mã khi mở — chưa sửa, chờ người dùng quyết.
