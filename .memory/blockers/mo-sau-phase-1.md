# Việc còn mở sau Phase 1

Cập nhật: 2026-09-13, sau UAT Phase 1 — 6/6 đạt (lỗi bài 3 đã sửa).

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

1. **Văn phòng tạo mã hàng có được đặt giá bán không.** Hiện chặn — phải để 0.
2. **8 mã ô ĐVT mâu thuẫn tên/đuôi mã.** Ô ĐVT nhập sai, hay là sơn vân carbon (CTS 1022–1024)?
   Danh sách ở `01-UAT.md` mục "Cần người quyết".
3. **8 tên trong ô Ghi chú là khách sỉ hay nhân viên sale ngoài.** Chặn DLIEU-04 (Phase 2).

---

## Chuyển sang Phase 2

- **DLIEU-04** — trích khách hàng từ `luu_tru_hoa_don_kiotviet.ghi_chu` (3.505 dòng, index sẵn).
- **Gán công đoạn cho 1.825 mã `MUA_NGOAI`.** Không phải rà tay hết:
  - 1.324 mã `Hàng Hãng` / `Hàng Ngoài` → đã đúng là mua ngoài.
  - 145 mã có đuôi `-CB`/`-X`/`-S`/`-N` → gán tự động theo quy ước đuôi mã (~95%).
  - Còn khoảng **356 mã** cần người xem.
- **`CLAUDE.md` và `src/shared/components/app-shell.tsx`** còn menu phạm vi cũ
  (`/san-xuat`, `/bao-cao`) — viết lại khi dựng app shell.
- **`src/shared/lib/errors.ts`** còn chữ "xưởng" trong thông báo lỗi — đổi thành "kho".
- **Đổi vai trò phải thu hồi phiên:** hook chỉ chạy khi cấp token mới (TTL 3600s).
  Màn Cài đặt (CDAT-01) phải thu hồi phiên sau khi đổi vai trò. **Chưa kiểm chứng:** ghi chú cũ
  `auth.admin.signOut(userId, 'others')` nhiều khả năng sai chữ ký (supabase-js nhận JWT, không
  nhận userId) — research Phase 2 chốt cơ chế thật (02-CONTEXT D-05).
- **Phase 2 đổi quyết định Phase 1:** thủ kho gắn nhiều kho (D-06) — hook/RLS/test 30 phải sửa.

---

## Trước go-live

- Xóa hoặc đổi mật khẩu 4 tài khoản demo (`*@khominhvu.local`).
- **Bật Leaked Password Protection** (Security Advisor cảnh báo): Dashboard → Authentication
  → chặn mật khẩu đã lộ qua HaveIBeenPwned. Công tắc Dashboard, CLI/MCP không bật được.
  Có thể cần gói Pro.
- `DATABASE_URL` trong `.env.local` chứa mật khẩu DB — chỉ dùng cho `test:dong-thoi`.
