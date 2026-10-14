---
quick_id: 261013-w3y
status: complete
commit: 85df8ac
---

# Phân quyền theo nhóm hàng — PR 1/4: nền database

## Đã làm

- `supabase/migrations/0132_phan_quyen_nhom_hang.sql`
  - bảng `nguoi_dung_nhom_hang (nguoi_dung_id pk, nhom_hang_ids uuid[])` — có dòng = giới hạn,
    không có dòng = tất cả. RLS: đọc chính mình / `phan_quyen` / `tao_tai_khoan`; ghi chỉ qua RPC.
  - `nhom_hang_duoc_xem()`, `xem_duoc_nhom(uuid)`, `xem_duoc_san_pham(uuid)`
  - RPC `dat_nhom_hang_nguoi_dung(p_id, p_nhom_hang_ids)` — null = bỏ giới hạn; từ chối mảng rỗng,
    nhóm không tồn tại, tài khoản Admin, và tự đặt cho mình (trừ Admin).
  - RLS `san_pham` (select / insert / update), `ton_kho`, `kho_movement` thêm điều kiện nhóm.
- `supabase/tests/132_phan_quyen_nhom_hang_test.sql` — 28 bài, tự tạo tài khoản thử.

## Kiểm chứng

- Chạy migration + test trong transaction rollback trên demo → 28/28; áp thật bằng
  `supabase db push --db-url` lên demo `phonzyruoalimgaovljm` → chạy lại 28/28.
- Đo RLS: `count(*)` trên `kho_movement` (56.691 dòng) ~70 ms không giới hạn, ~60 ms giới hạn 1 nhóm.
- Production `rnpq…` KHÔNG được áp.

## Lỗi bắt được khi test

- `uuid = any((select f()))` bị Postgres hiểu là subquery → phải ép `::uuid[]`.
- `xem_duoc_nhom(null)` trả NULL thay vì false → bọc `coalesce(..., false)`.

## Chưa làm / giả định

- `npm run db:types` chưa chạy được: CLI cần `supabase login` (hoặc Docker). Chưa có code TS dùng
  bảng mới nên không chặn PR này; phải chạy trước PR 2.
- Các pgTAP cũ phụ thuộc tài khoản seed (`vanphong@…`) — DB demo là bản sao production nên không chạy
  được ở đó; chưa chạy lại bộ test cũ.
- Hàm SECURITY DEFINER vẫn trả mọi nhóm → PR 3/4.
