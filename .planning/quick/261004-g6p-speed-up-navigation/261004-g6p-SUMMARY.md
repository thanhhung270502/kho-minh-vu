# Quick 261004-g6p: Tăng tốc chuyển trang — Summary

## Đã làm

| Commit | File | Thay đổi |
|---|---|---|
| 24e63f7 | `src/features/auth/api/current-user.server.ts` | `getCurrentUser` bọc `cache()` (layout + page dùng chung trong 1 request); `nguoi_dung` + `quyen_cua_toi` chạy `Promise.all` |
| 2bbd9e8 | `src/app/(app)/loading.tsx` | Khung xương Tailwind dưới `AppShell` — menu giữ nguyên, nội dung đổi ngay khi bấm |

## Số lượt gọi Supabase phía server

| | Trước | Sau |
|---|---|---|
| Tải đầy đủ trang | proxy 1 + layout 3 nối tiếp + page 3 nối tiếp | proxy 1 + getUser 1 + 1 lượt song song |
| Chuyển trang client | proxy 1 + page 3 nối tiếp | proxy 1 + getUser 1 + 1 lượt song song |

## Kiểm chứng

- `npm run check` xanh.
- `next start` cổng 3100 + Supabase local: 8 route (`/danh-muc`, `/don-dat`, `/duyet-don`, `/doi-tac`,
  `/nhap-kho`, `/kiem-ke`, `/phan-tich`, `/`) đều hiện khung chờ sau 4–117ms kể từ khi bấm; console không lỗi.
- Chưa đo lại trên production — cần deploy.

## Giả định / chưa làm

- Giữ `getUser()` ở proxy (không đổi sang `getClaims()`), theo quy tắc CLAUDE.md.
- Đổi region Vercel/Supabase: người dùng tự làm. Đây mới là đòn bẩy lớn nhất (rnpq ở `ap-southeast-2`, function ở `hkg1`).
