---
quick_id: 260928-q4u
completed: 2026-09-28
commits: [1c21ad7, 7047e72, be1a918]
migrations: [0072, 0073, 0074]
tests: [95_luu_ho_so_ten_rong_test.sql (7), 96_the_kho_thu_tu_test.sql (10)]
---

# Sửa 3 lỗi tìm ra khi chạy checklist kiểm thử thủ công 28/09

| Checklist | Lỗi | Sửa | Commit |
|---|---|---|---|
| 9.6 | Sửa tài khoản chưa có tên đăng nhập (5 tài khoản demo) báo lỗi ràng buộc — Server Action gửi `""` vi phạm `ck_ten_dang_nhap`; câu lỗi nói về "mã hàng, kho, số lượng" | 0072: RPC `nullif(btrim(p_ten_dang_nhap), '')`. `user.actions.ts`: 23514 do RPC tự soạn hiện nguyên văn | 1c21ad7 |
| 6.2 | Thẻ kho xếp theo `kho_movement.ngay` — phiếu thường 00:00, bút toán đảo `now()` → tồn lũy kế giữa chừng sai (10→20→16→7→10→0), giờ "07:00" giả | 0073: xếp (ngày VN, created_at, id); cột ngày = ngày chứng từ + giờ ghi sổ | 7047e72 |
| 5.6 | Thẻ kho không hiện lý do xuất âm | 0074: thêm cột `ly_do_xuat_am` (chỉ dòng xuất thật); UI thẻ "Xuất âm: <nhãn>", bỏ ellipsis đang cắt mất thẻ | be1a918 |

## Kiểm chứng
- pgTAP 95, 96 đỏ trước khi áp migration, xanh sau; 33, 42 (thẻ kho cũ) vẫn xanh.
- Toàn bộ `supabase test db` trên local: 611/614 — 3 file đỏ KHÔNG liên quan:
  36 (ô 6) và 51 (ô 14–15) do seed thiếu công tắc `xem_lich_su_kiotviet` cho
  vanphong sau `db reset` (backfill 0063 chạy trước khi seed tạo tài khoản);
  61 (ô 3–4) do ĐVT "Thùng" tạo lúc chạy checklist bước 1.4 trên DB local.
- `npm run check` xanh.
- Trình duyệt (quanly): bỏ/thêm Kho 2 cho thukho2 lưu được, thông báo đúng hiệu lực
  quyền; thủ kho không kho → lỗi đúng ô. Thẻ kho TEST-01: 10→20→10→6→−3→0, giờ ghi
  sổ thật, dòng PX26-000002 có "Xuất âm: Lệch tồn, chờ kiểm kê"; console sạch.

## Chưa làm / lưu ý
- 3.7 (giá vốn sau khi hủy phiếu nhập) — chờ người dùng chốt, không đụng.
- Migration 0072–0074 mới áp local; cloud cần `npm run db:push`.
- `database.types.ts` chỉ thêm cột mới bằng tay theo đúng output generator: DB local
  thiếu `ten_danh_muc` (tồn tại trên cloud, không có migration nào tạo — lệch schema
  có sẵn), sinh cả file từ local sẽ xóa mất hàm đó.
- `.env.local` đang có `SUPABASE_PROJECT_ID=phonzy…` trong khi stack local chạy tên
  `rnpqgb…` → lệnh `supabase test db` / `migration up` phải kèm
  `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz`; `db:types:local` phải dùng `--db-url`.
