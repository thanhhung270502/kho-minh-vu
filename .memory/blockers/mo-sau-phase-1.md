# Việc còn mở sau Phase 1

Cập nhật: 2026-09-18, hết Phase 2 (plan 21).

---

## Lỗi UAT — đã đóng

### ~~[minor] Dữ liệu kho nằm sai cột~~ — sửa ở migration 0025
Dữ liệu kho giờ ở `san_pham.kho_mac_dinh_id` (Kho 1 = 3.240, Kho 2 = 26), `vi_tri_ke` sạch.
Phase 3–4 dùng `kho_mac_dinh_id` để điền sẵn kho khi tạo phiếu. `vi_tri_ke` để trống chờ
vị trí dãy/kệ/tầng thật.

**Bẫy còn lại:** script import PHẢI gửi `ten_kho_mac_dinh`. Thiếu trường này thì upsert
ghi đè `kho_mac_dinh_id` thành NULL trên cả 3.266 mã.

---

## Cần người dùng quyết

1. ~~**Văn phòng tạo mã hàng có được đặt giá bán không.**~~ — Phase 2 chốt: **chặn**, quản lý
   đặt giá sau (D-17). Chặn bằng trigger 0015, không chỉ bằng giao diện.
2. **8 mã ô ĐVT mâu thuẫn tên/đuôi mã.** Phase 2 đã cho vào danh sách "Cần rà" và có công cụ;
   **việc quyết từng mã vẫn cần người biết hàng** (ô ĐVT nhập sai, hay sơn vân carbon?).
3. **8 tên trong ô Ghi chú là khách sỉ hay nhân viên sale ngoài.** Màn Rà ghi chú đã có lựa
   chọn "Là sale" / "Khách + sale"; vẫn cần người biết chuyện quyết.

---

## Chuyển sang Phase 2 — đã đóng

- ~~**DLIEU-04**~~ — màn `/doi-tac/ra-ghi-chu` (plan 18) rà **150 giá trị** ghi chú.
  Công cụ xong; **việc rà thật vẫn chờ người văn phòng** (xem mục dưới).
- ~~**Gán công đoạn cho mã `MUA_NGOAI`**~~ — có 3 công cụ: gợi ý theo đuôi mã (145 mã),
  gán hàng loạt, sửa ô tại chỗ. Số mã "Cần rà" thật đo được: **364**.
- ~~**Menu phạm vi cũ trong `app-shell.tsx` / `CLAUDE.md`**~~ — đã viết lại (plan 05, 21).
- ~~**Chữ "xưởng" trong `errors.ts`**~~ — đã đổi.
- ~~**Thu hồi phiên khi đổi vai trò**~~ — giải bằng RPC `thu_hoi_phien_nguoi_dung` (0026);
  helper RLS đối chiếu claim với bảng nên **thu hẹp quyền có hiệu lực ngay**, mở rộng chờ
  token mới. Ghi chú cũ về `auth.admin.signOut(userId, 'others')` đúng là sai chữ ký.
- ~~**Thủ kho nhiều kho (D-06)**~~ — bảng `nguoi_dung_kho`, test 30 đã sửa.

## Việc người dùng phải làm trên dữ liệu thật (chưa xong)

- **Rà 150 giá trị ô Ghi chú KiotViet** tại `/doi-tac/ra-ghi-chu`. Hệ thống không tự đoán.
- **Rà 364 mã "Cần rà"** tại `/danh-muc` (bật nút Cần rà). Trong đó 145 mã có thể gán bằng
  nút "Gợi ý theo đuôi mã" sau khi xem lại.

---

## Trước go-live

- Xóa hoặc đổi mật khẩu 4 tài khoản demo (`*@khominhvu.local`).
- **Bật Leaked Password Protection** (Security Advisor cảnh báo): Dashboard → Authentication
  → chặn mật khẩu đã lộ qua HaveIBeenPwned. Công tắc Dashboard, CLI/MCP không bật được.
  Có thể cần gói Pro.
- `DATABASE_URL` trong `.env.local` chứa mật khẩu DB — chỉ dùng cho `test:dong-thoi` và chạy pgTAP.
- **Hỏi người dùng có xóa cột `nguoi_dung.kho_id` không** — từ 0026 quyền kho đọc ở bảng
  `nguoi_dung_kho`, cột cũ còn lại để tương thích ngược và chưa ai dùng.
- Tài khoản `test.uat` (tạo khi thử plan 14) đang ở trạng thái vô hiệu hóa — xóa hẳn hoặc
  để nguyên tùy người dùng.
