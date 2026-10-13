---
quick_id: 261013-wg8
status: complete
commit: 656b73c
---

# Phân quyền theo nhóm hàng — PR 2/4: màn chọn nhóm hàng

## Đã làm

- `supabase/migrations/0133_dat_nhom_hang_mac_dinh.sql` — `p_nhom_hang_ids` default null (áp demo).
- `src/types/database.types.ts` — bảng `nguoi_dung_nhom_hang` + `dat_nhom_hang_nguoi_dung`,
  `nhom_hang_duoc_xem`, `xem_duoc_nhom`, `xem_duoc_san_pham`, viết theo định dạng `supabase gen types`.
- `settings/api/user.api.ts` — `UserRow.productGroupIds` (null = tất cả), `fetchProductGroups`.
- `settings/schemas/user.schema.ts` — `productGroupScope` / `productGroupIds` + refine ≥ 1 nhóm.
- `settings/actions/user.actions.ts` — `saveAccess` = quyền + nhóm; nhóm chỉ ghi khi đổi;
  lỗi 23514/22023 của RPC hiện nguyên câu tiếng Việt.
- `settings/components/user-product-groups-field.tsx` (mới), gắn vào `user-drawer.tsx`;
  cột "Nhóm hàng" ở `user-table.tsx`.

## Kiểm chứng (localhost:3000 → demo phonzy)

- Cột Nhóm hàng hiện "Tất cả nhóm"; lưu 2 nhóm → "2 nhóm"; mở lại form nạp đúng.
- Chọn "cụ thể" mà chưa chọn nhóm → lỗi ngay tại ô, không gửi.
- Tìm "baga" lọc không dấu; 4 nhóm hiện 2 thẻ + "+ 2 ...".
- Drawer của Admin: khóa ở "Tất cả nhóm hàng" kèm giải thích.
- Chọn lại "Tất cả" → xóa dòng trong `nguoi_dung_nhom_hang`.
- Console không cảnh báo. `npm run check` xanh (92 test, build OK).
- Sự cố khi tự kiểm: một cú click lỡ tích "Sửa phiếu" cho test01 — đã gỡ qua giao diện,
  DB xác nhận test01 chỉ còn `tao_don`, không còn dòng nhóm hàng nào.

## Chưa làm / giả định

- `npm run db:types` chưa chạy (CLI chưa `supabase login`) — chạy lại để xác nhận không lệch.
- `user-drawer.tsx` (307 dòng) và `user-table.tsx` (265) đã vượt ~200 dòng từ trước; PR này
  thêm ~25 dòng mỗi file, chưa tách.
- Danh sách, tìm mã, tồn kho… chưa lọc theo nhóm → PR 3/4.
