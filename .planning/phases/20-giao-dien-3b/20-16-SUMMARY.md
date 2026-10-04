---
phase: 20-giao-dien-3b
plan: 16
status: checkpoint — chờ người dùng xác nhận UAT
requirements: [UI3B-01, UI3B-02, UI3B-03, UI3B-04, UI3B-05, UI3B-06, UI3B-07]
---

# 20-16 — Chốt phase 20: cổng kiểm + UAT trình duyệt

## Task 1 — Ma trận quyền + cổng kiểm (commit b9d6b28)

- `scripts/test-route-permissions.ts`: thêm `/api/don-dat/xuat-excel` (khách 401, 4 vai trò 200).
- `.env.local` trỏ LOCAL `http://127.0.0.1:54321` ✓
- `npm run check` ✓ · `test-pure-functions` ✓ · `supabase test db` (local) **54 file / 904 test PASS** ✓ · `test-excel-reader` ✓
- `test-route-permissions`: **8/272 ô lệch — có từ trước phase 20.** Trên `main` lệch đúng 8 ô y hệt (8/267):
  redirect phía server ở `/` (theo vai trò) và `/cai-dat` (sang tab con) trả 200 thay vì chuyển hướng. Bỏ ô tìm khỏi
  layout vẫn lệch 8 → không do phase này. Đã tách thành việc riêng (chip "Fix server redirects returning 200").
  Dòng mới `/api/don-dat/xuat-excel` không nằm trong 8 ô lệch.

## Task 2 — UAT trình duyệt (Claude tự đi trước, tài khoản `quanly`, Supabase LOCAL)

| Bước | Kết quả |
|---|---|
| 1 Header | ✓ 1440: logo tròn MV, ô tìm giữa, tên + avatar, tab gạch chân, không có "Tất cả kho". 1024: menu vừa. 375: tầng 2 ẩn, nút kính lúp, tab đáy còn, không tràn ngang |
| 2 ⌘K | ✓ (quanly) ⌘K mở; gõ "BAGA" ra mã hàng; gõ mã chính xác 06410KFL850 → Enter mở `/danh-muc/<id>`; Esc đóng. **Chưa thử:** số phiếu/số đơn/đối tác, và cô lập kho với `thukho1` |
| 3 Tổng quan | ✓ 4 KPI + sparkline, Nhập–Xuất 7N/30N/90N, Tồn theo nhóm có Tỷ trọng/SL/%, aside Cần xử lý (link `/kiem-ke`, `/nhap-kho?trang_thai=NHAP_LIEU`), Nhịp bán + `#xuat-am` còn. "Không luân chuyển" RỖNG trên dữ liệu local (đúng caveat D-05). Ghi chú: "Ghi sổ →" chỉ mở phiếu NHẬP dù đếm cả phiếu xuất |
| 4 thủ kho thấy "Tổng SL tồn" | ⏳ cần đăng nhập `thukho1` + bật quyền dashboard — người dùng kiểm |
| 5 Đơn đặt | ✓ số đếm từng trạng thái, preset 7N/30N/Tháng/Tùy, cột Tiến độ có thanh, "N đơn", nút Xuất Excel. **Lỗi đã sửa:** tiêu đề bảng dính rơi vào giữa các dòng ở mọi màn danh sách (commit 579bf87 — `ListLayout` bỏ `overflow-x-auto`). ⏳ mở file Excel tải về — người dùng kiểm |
| 6 Chi tiết đơn | ✓ hai cột, Enter→SL→Enter, gõ lại cùng mã ⇒ "Đã cộng thêm 3 … nay 5", con trỏ về ô mã (`event.key` = Enter). **Lỗi đã sửa (819fb22):** ô SL giữ số cũ sau cộng dồn; nhãn "Tổng cộng" dồn vào cột #; gợi ý phím hiện 2 lần. Dữ liệu thử đã trả về như cũ |
| 7 Chi tiết hàng | ✓ chip "Đang kinh doanh", nút Ngừng KD + Sửa, lưới 12 trường, bảng Tồn theo kho (Tồn · Tối thiểu · Giá trị · Tổng tồn), aside Hình ảnh + Quản lý, Thẻ kho/Lịch sử sửa. ⏳ bấm Ngừng/Mở lại KD và kiểm `thukho1` không thấy cột Giá trị — người dùng kiểm |
| 8 Màn khác | ✓ Nhập kho 1024px không vỡ; console sạch ở mọi màn đã mở (bẫy 11) |

## Nhắc deploy
Migration 0092–0094 mới ở **LOCAL** (đã vào `schema_migrations` local). Deploy cloud phải đẩy cùng các migration đang
chờ (0085–0091…) và **HỎI người dùng trước**.
