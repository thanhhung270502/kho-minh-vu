---
phase: 05-ton-kho-tong-quan
plan: 00
status: partial
completed: 2026-09-21
---

# 05-00 — Trang bị máy: xong phần chặn viết code, còn hai việc của người dùng

Cổng này có bốn mục. Ba mục đủ để các plan viết code và đẩy schema chạy tiếp; hai việc
chỉ người dùng làm được vẫn còn treo, nhưng không chặn wave 2–5.

## Đã xong

| Mục | Làm thế nào | Kiểm |
|---|---|---|
| Cài thư viện | `npm ci` (không phải `npm install`) — cài đúng `package-lock.json`, không sửa nó | lockfile không đổi; không chạy `npm audit fix` (bẫy 4) |
| `.env.local` phần công khai | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (giá trị `sb_publishable_…`), `SUPABASE_PROJECT_ID` — lấy qua Supabase MCP `get_project_url` / `get_publishable_keys` | file bị gitignore; **0** biến `NEXT_PUBLIC_*` chứa secret (T-05-00a) |
| Mốc sức khỏe | `npm run check` (typecheck + lint + build) | **exit 0** chỉ với khóa công khai — secret key không cần cho build |
| Ai đẩy 0050–0057 | Chính người dùng, từ máy làm Phase 4 | database đang ở `0057`, **không có migration lạ ≥ 0058** (T-05-00b) |

## Lệch khỏi plan, có chủ đích

**Không đăng nhập Supabase CLI.** Thay vào đó phiên điều phối đẩy migration và chạy pgTAP
qua kết nối Supabase MCP đang có:

- Đẩy migration bằng `execute_sql` rồi **tự ghi dòng lịch sử** vào
  `supabase_migrations.schema_migrations` với `version` = số của tên file (`0058`…`0061`),
  đúng khuôn CLI đã ghi cho `0050`–`0057`. **Không dùng `apply_migration`** của MCP vì nó
  ghi version theo timestamp — lệch tên file, lần sau ai chạy `supabase db push` bằng CLI
  sẽ thấy `0058` "chưa áp" rồi áp lại.
- pgTAP: extension `pgtap` đã bật sẵn trên database. Chạy từng file test qua `execute_sql`
  với `finish(true)` để một assert đỏ hoặc một số assert chạy thiếu so với `plan(N)` đều
  làm câu lệnh ném lỗi — không phải đếm tay dòng `not ok`.

Lý do: không lấy/chép access token của CLI (bí mật cá nhân của người dùng).

## Còn treo — việc của người dùng

1. **Điền secret vào `.env.local`**: `SUPABASE_SERVICE_ROLE_KEY` (hoặc `sb_secret_…`),
   `SUPABASE_DB_PASSWORD`, `DATABASE_URL`. Cần cho: `npm run seed:users`,
   `npm run import:kiotviet`, `npm run verify:hook`, `npm run test:concurrency`, màn Cài đặt
   → Người dùng. **Không cần** cho build, typecheck, lint, hay các plan viết code của Phase 5.
2. **Đặt `DanhSachSanPham_KV….xlsx` vào `data/kiotviet/`.** Chỉ cần khi chạy nạp tồn tạm
   THẬT (UAT của 05-10). Không chặn việc viết RPC `nap_ton_tam` (05-04) hay màn nạp (05-10).

## Phát hiện phục vụ plan sau

Định nghĩa đang chạy của các đối tượng mà 05-02/03/04 sẽ sửa đã đọc và ghi vào
`05-LIVE-DEFS.md`. Một phát hiện chặn 05-04: `_ghi_so_dieu_chinh` trên database vẫn ghi
**kho đầu phiếu** (`p_ct.kho_id`), chưa theo kho của dòng — đúng điều kiện dừng Task 1 của
05-04 đã cài sẵn. Đã báo người dùng.
