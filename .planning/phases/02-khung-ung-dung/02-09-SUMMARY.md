---
phase: 02-khung-ung-dung
plan: 09
status: complete
completed: 2026-09-18
requirements: [CDAT-01, DMUC-01, DMUC-06, DLIEU-04]
---

# Plan 02-09 — Cổng chặn giữa database và giao diện

## Kết quả

| Kiểm | Kết quả |
|---|---|
| `supabase migration list --linked` | local và remote khớp **0001–0036** (sau khi dựng lại 0030–0036 ở `b3dd55c`) |
| Toàn bộ pgTAP trên cloud (14 file) | **193/193 xanh, 0 lỗi** |
| `npm run verify:hook` | 5/5 tài khoản nhận đúng `vai_tro` + mảng `kho_id` (kể cả `thukho2` K1+K2) |
| `npm run db:types` | sinh lại từ cloud, 1.577 dòng, có đủ 19 RPC và 4 bảng mới của Phase 2 |
| `npm run check` | typecheck + lint + build xanh; build liệt kê đủ route `/`, `/dang-nhap`, `/danh-muc`, `/doi-tac`, `/cai-dat`, `/khong-du-quyen` |
| `get_advisors(security)` | không có cảnh báo mới ngoài dự kiến — xem bảng trong `supabase/README.md` |

Docker Desktop không chạy ở phiên này nên pgTAP chạy bằng `psql` thay cho
`supabase test db --linked` (mỗi file tự `begin/rollback`, kết quả TAP giống hệt).

## Advisor

17 hàm SECURITY DEFINER gọi được bởi `authenticated` — **cố ý**: 0029 đã thu quyền đọc cột
giá vốn nên mọi đường đọc hợp lệ phải đi qua RPC, và mỗi RPC tự kiểm vai trò ở dòng đầu.
`nhat_ky_sua` bật RLS không policy cũng cố ý (đọc qua `lich_su_sua`, ghi bằng trigger).
Còn lại là hai mục đã chấp nhận từ Phase 1 và `auth_leaked_password_protection` (việc
trước go-live).

## Bộ nhớ dự án

`.memory/patterns/supabase-rls-bao-mat.md` thêm hai mục: "REVOKE một cột không gỡ được
quyền mức bảng" và "Thu hồi quyền tức thời mà vẫn đọc claim từ JWT".
