---
phase: 02-khung-ung-dung
plan: 10
status: complete
completed: 2026-09-18
requirements: [AUTH-01, CDAT-01]
---

# Plan 02-10 — Quản trị tài khoản phía server, bắt đổi mật khẩu lần đầu

## Đã làm

| File | Vai trò |
|---|---|
| `src/lib/env-server.ts` | Đọc `SUPABASE_SERVICE_ROLE_KEY`, `server-only`, parse lười để `next build` không cần khóa |
| `src/lib/supabase/admin.ts` | Client service_role, chỉ cho `auth.admin.*` và `thu_hoi_phien_nguoi_dung` |
| `src/features/cai-dat/schemas/nguoi-dung.schema.ts` | Zod: tên đăng nhập chuẩn hóa, mật khẩu ≥ 8 có chữ và số, thủ kho bắt buộc ≥ 1 kho |
| `src/features/cai-dat/actions/nguoi-dung.actions.ts` | 4 Server Action: tạo / cập nhật / đổi trạng thái / đặt lại mật khẩu |
| `src/app/doi-mat-khau/page.tsx` + `form-doi-mat-khau.tsx` | Màn đặt mật khẩu riêng |
| `src/app/(app)/layout.tsx` | Cờ `phai_doi_mat_khau` bật → đẩy về `/doi-mat-khau` |
| `src/providers/query-client.ts` | Gặp 42501 → làm mới phiên một lần rồi thử lại |
| `scripts/kiem-tra-tai-khoan.ts` | 7 assert schema |

## Quyết định khi thực thi

- **Ghi hồ sơ bằng phiên của chính quản lý**, không bằng service_role: RLS kiểm lại một lần
  nữa và trigger nhật ký ghi đúng `auth.uid()` thay vì để trống. Client admin chỉ chạm
  `auth.admin.*` và RPC thu hồi phiên.
- **Rollback tài khoản Auth**: tạo user xong mà `luu_ho_so_nguoi_dung` lỗi thì
  `deleteUser` ngay, nếu không tên đăng nhập bị chiếm bởi một tài khoản không có hồ sơ.
- **Giữ ít nhất một quản lý đang hoạt động** — chặn cả hạ vai trò lẫn vô hiệu hóa.
- **Cờ đổi mật khẩu đọc từ bảng, không từ claim**: đổi xong là vào app được ngay, không
  phải chờ token mới (research đề xuất nhét vào JWT — bỏ vì trễ và phải sửa hook).
- `window.location.assign` khi refresh token đã bị thu hồi: cần **tải lại cả trang** để vứt
  cache TanStack Query của phiên cũ; đã tắt cảnh báo lint kèm lý do.

## Kiểm

`npx tsx scripts/kiem-tra-tai-khoan.ts` xanh · `npm run check` xanh (build liệt kê thêm route `/doi-mat-khau`).

Luồng thật (tạo tài khoản → mật khẩu tạm → buộc đổi → đổi vai trò/kho → vô hiệu hóa) kiểm
tay ở plan 14 khi có màn hình, theo `02-VALIDATION.md` §Manual-Only.
