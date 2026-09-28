---
quick_id: 260928-t0j
completed: 2026-09-28
commits: [b20a846, 202b96f, 0d93f8b]
migrations: [0075]
tests: [97_ten_danh_muc_test.sql (7)]
---

# Seed đúng quyền demo, tự focus ô mã ở phiếu nhập/đơn hàng, migration ten_danh_muc

| Mục | Sửa | Commit |
|---|---|---|
| 15 | 0075 tạo `ten_danh_muc` (bị sót khi dựng lại 0034 từ cloud ở b3dd55c) — định nghĩa + quyền đọc nguyên văn từ cloud phonzy… bằng phiên read-only. Kiểu sinh từ local giờ khớp hoàn toàn `database.types.ts` | b20a846 |
| 5 | `seed.sql` đủ 5 tài khoản như SAMPLE_ACCOUNTS, có `ten_dang_nhap`, văn phòng bật `xem_lich_su_kiotviet` (backfill 0063 không chạm được vì migration chạy trước seed), gán kho qua `nguoi_dung_kho`. `seed:users` luôn đặt tên đăng nhập, chỉ bật công tắc văn phòng khi tạo mới | 202b96f |
| 6 | Hook `useFocusOnOpen` (src/shared/hooks) dùng cho phiếu xuất, phiếu nhập, đơn đặt hàng | 0d93f8b |

## Kiểm chứng
- `db reset` local sạch → seed đúng 5 tài khoản; `seed:users` không lật công tắc; `verify:hook` 5/5.
- pgTAP toàn bộ **621/621 xanh** (trước: 36, 51, 61 đỏ); 97 đỏ trước 0075, xanh sau.
- `test-route-permissions`: 125/125 (không còn lệch /lich-su-kiotviet × vanphong).
- Trình duyệt: mở PN26-000001, DH26-000001, PX26-000001 mới tạo → con trỏ ở ô mã; vanphong
  thấy tab Lịch sử KiotViet; màn Người dùng hiện tên đăng nhập; console sạch.
- `npm run check` xanh.

## Lưu ý
- `db reset` đã xóa dữ liệu test checklist trên local; đã nạp lại dữ liệu KiotViet
  (`import:kiotviet --ghi`). Tồn vẫn = 0 (chưa nạp tồn tạm).
- Migration 0072–0075 chưa đẩy lên cloud.
- `receipt-line-table.tsx` dài 352 dòng (vượt ~200 từ trước) — chưa tách.
