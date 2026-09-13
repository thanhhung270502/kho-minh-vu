# Việc còn mở sau Phase 1

Cập nhật: 2026-09-13, sau UAT Phase 1 (5/6 đạt, 1 lỗi nhỏ).

---

## Lỗi UAT

### [minor] Dữ liệu kho nằm sai cột
`san_pham.vi_tri_ke` đang chứa `Kho 1` / `Kho 2` — cột dành cho dãy/kệ/tầng.
Không làm hỏng yêu cầu nào hiện tại, nhưng làm bẩn cột kệ và Phase 3–4 có thể cần kho
mặc định để điền sẵn khi tạo phiếu.
- **A.** Thêm `san_pham.kho_mac_dinh_id`, chuyển dữ liệu sang, xóa `vi_tri_ke`.
- **B.** Xóa trắng `vi_tri_ke`.
Chi tiết: `.planning/phases/01-nen-du-lieu/01-UAT.md` mục Gaps.

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
  Màn Cài đặt (CDAT-01) gọi `auth.admin.signOut(userId, 'others')` sau khi đổi vai trò.

---

## Trước go-live

- Xóa hoặc đổi mật khẩu 4 tài khoản demo (`*@khominhvu.local`).
- `DATABASE_URL` trong `.env.local` chứa mật khẩu DB — chỉ dùng cho `test:dong-thoi`.
