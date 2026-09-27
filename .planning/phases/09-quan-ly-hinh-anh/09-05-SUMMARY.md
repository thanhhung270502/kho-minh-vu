---
phase: 09-quan-ly-hinh-anh
plan: 05
subsystem: database
tags: [postgres, supabase, pgtap, rpc, hinh-anh, migration]

requires:
  - phase: 09-quan-ly-hinh-anh
    provides: "supabase/migrations/0068_hinh_anh.sql + supabase/tests/43_hinh_anh_test.sql (09-01, RED)"
provides:
  - "Migration 0068 chạy thật trên cloud kho-vu-tru (phonzyruoalimgaovljm), history khớp md5 với file trong git"
  - "src/types/database.types.ts biết bảng hinh_anh, 6 RPC ảnh, tham số p_co_anh"
  - "Bằng chứng pgTAP: toàn bộ 35 file (43_hinh_anh 31/31, 41_danh_sach_san_pham 16/16) — 0 not ok, 0 ERROR"
affects: [09-06, 09-07, 09-08, 09-09, 09-10]

tech-stack:
  added: []
  patterns:
    - "Đẩy migration không CLI (tài khoản CLI mất quyền quản trị dự án): psql với DATABASE_URL (session pooler 5432) trong một BEGIN/COMMIT, ghi supabase_migrations.schema_migrations kèm nội dung file dollar-quoted để md5 khớp tuyệt đối"
    - "Sinh kiểu không CLI: supabase gen types typescript --db-url \"$DATABASE_URL\" (không cần management API/login)"

key-files:
  created: []
  modified:
    - src/types/database.types.ts

key-decisions:
  - "CLI supabase (login/link/gen types --project-id) mất quyền quản trị Management API trên máy này ('does not have the necessary privileges') — dùng --db-url cho gen types và psql trực tiếp cho đẩy migration/pgTAP thay vì MCP (không có MCP tool nào lộ ra trong phiên chấp hành này, chỉ có Read/Write/Edit/Bash)"
  - "Không dùng pg_read_file/current_query() (pattern 12 dành cho MCP execute_sql) — với psql chạy file trực tiếp, ghi statements[1] bằng chuỗi dollar-quoted duy nhất ($migration_0068$) chứa nguyên văn nội dung file, kiểm md5(statements[1]) khớp md5 file LF"

requirements-completed: [ANH-01, ANH-02, ANH-03, ANH-04, ANH-05]

duration: ~35min
completed: 2026-09-26
---

# Phase 9 Plan 05: Đẩy migration 0068 hinh_anh lên cloud + kiểm chứng pgTAP Summary

Migration 0068 (bảng `hinh_anh` + 6 RPC ảnh + `danh_sach_san_pham` 12 tham số) chạy thật trên `phonzyruoalimgaovljm`, `database.types.ts` sinh lại, và toàn bộ 35 file pgTAP (bao gồm 43 mới và 41 bị đổi chữ ký) đều đạt trên cloud.

## Xác nhận đích trước khi đẩy (bước 1-3 của Task 1)

- `.env.local` khối đang bật: `SUPABASE_PROJECT_ID=phonzyruoalimgaovljm`, `DATABASE_URL` trỏ `postgres.phonzyruoalimgaovljm@aws-0-ap-southeast-1.pooler.supabase.com:5432` — **đúng** dự án `kho-vu-tru`, khối `rnpq…` (sai) vẫn đang comment. (Ghi chú blocker `mo-sau-phase-6.md` nói khối sai đang bật — thực tế đã được sửa trước plan này, không cần AI tự sửa.)
- `npx supabase migration list --linked` không chạy được (IPv6 not supported); `npx supabase link` báo tài khoản CLI mất quyền Management API. Xác nhận đích bằng cách khác: `psql "$DATABASE_URL" -c "select version,name from supabase_migrations.schema_migrations order by version desc limit 5"` → mới nhất `0067` (không có version lạ ≥ 0068).
- So thân `danh_sach_san_pham(11 tham số)` đang chạy trên cloud với file `0067_duoi_dinh_muc_bo_ma_chua_dat.sql`: `pg_get_functiondef(...)` khớp **từng dòng WHERE** với file 0067 (chỉ khác cách `pg_get_functiondef` viết hoa `SET search_path TO ''` — không phải lệch nội dung). An toàn để drop + create theo 0068.

## Đẩy migration (không CLI — tài khoản mất quyền Management API)

`npx supabase db push` không dùng được (không login/không quyền). Dùng `psql "$DATABASE_URL"` (session pooler, đã xác nhận đúng project ở trên) chạy một script bọc:

```sql
begin;
<nguyên văn 0068_hinh_anh.sql>
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('0068', 'hinh_anh', array[$migration_0068$<nguyên văn file>$migration_0068$]);
commit;
```

Kết quả: `CREATE TABLE / 3×CREATE INDEX / CREATE TRIGGER / 6×CREATE FUNCTION / ... / DO` chạy sạch, khối `DO` tự kiểm cuối 0068 (đúng 1 overload, 7 hàm khóa search_path, anon không có quyền `them_anh`) không raise lỗi, `COMMIT` thành công.

**md5 khớp tuyệt đối:** `md5(statements[1])` trên cloud = `6c87d74a2438a6cc2a0e2e941682ff89` = `md5sum supabase/migrations/0068_hinh_anh.sql` local (file không có CR, LF thuần).

## Sinh kiểu (không CLI login)

`supabase gen types typescript --project-id ... ` cũng mất quyền Management API. Dùng `supabase gen types typescript --db-url "$DATABASE_URL" --schema public` — kết nối trực tiếp database, không qua Management API. Ghi đè `src/types/database.types.ts`. `npm run typecheck` xanh không cần sửa gì thêm (tham số mới có default, không phá `toListRpcArgs` hiện có).

## Gọi thật dưới phiên `quanly@khominhvu.local` (bước 6)

Script tạm (đã xóa sau khi chạy) dùng `taoAnonClient()` + `signInWithPassword`, gọi 4 RPC:

| Lời gọi | Kết quả |
|---|---|
| `danh_sach_san_pham(p_kich_thuoc := 1)` (11 tham số cũ) | không lỗi, 1 dòng — chữ ký cũ vẫn chạy nhờ default `p_co_anh := null` |
| `danh_sach_san_pham(p_co_anh := false, p_kich_thuoc := 5)` | không lỗi, 5 dòng, `tong_so_dong = 3266` (toàn bộ danh mục chưa mã nào có ảnh) |
| `danh_sach_san_pham(p_co_anh := true)` | không lỗi, 0 dòng (đúng — chưa ảnh nào được thêm) |
| `lay_khoa_anh('00000000-0000-4000-8000-000000000000')` | không lỗi, 0 dòng (uuid giả, không phải lỗi quyền) |

## Advisory bảo mật (bước 7 — thay MCP `get_advisors` bằng kiểm tra thủ công)

Không có MCP tool nào lộ ra trong bộ công cụ của phiên chấp hành này (chỉ Read/Write/Edit/Bash/SubagentHandback) nên không gọi được `get_advisors`. Thay bằng truy vấn trực tiếp trên cloud:

- `hinh_anh`: `relrowsecurity = true`, đúng **1** policy (`SELECT` cho `authenticated`, lọc `xoa_luc is null and vai_tro_hien_tai() is not null`) — không có policy INSERT/UPDATE/DELETE, đúng thiết kế (mọi ghi qua RPC `SECURITY DEFINER`).
- 7 hàm mới/sửa (`_chen_anh, them_anh, nap_anh_kiotviet, dat_anh_chinh, xoa_anh, lay_khoa_anh, danh_sach_san_pham`) đều có `proconfig = {"search_path=\"\""}`.
- `anon` **không** có `EXECUTE` trên `them_anh/xoa_anh/dat_anh_chinh/nap_anh_kiotviet`; `authenticated` có execute trên `them_anh/xoa_anh/dat_anh_chinh` (tự kiểm vai trò bên trong hàm, đúng khuôn RPC self-check của dự án) nhưng **không** có `nap_anh_kiotviet` (chỉ `service_role`, đúng thiết kế job hệ thống).
- Không tìm thấy grant/permission mới nào rộng hơn thiết kế — không có mục cần chấp nhận rủi ro.

## Task 2 — pgTAP toàn bộ bộ, đếm cả ERROR

Docker không sẵn sàng trên máy này (như các phase trước) nên chạy từng file bằng `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <file>` — mỗi file tự `begin; ... rollback;` nên không để lại dữ liệu. Đếm cả `^not ok` lẫn `ERROR` (không chỉ dựa `finish()`), theo đúng bài học ghi trong `.memory/index.md`.

**Kết quả toàn bộ 35 file:** `not_ok=0`, `error_lines=0` cho **mọi file**, 35/35 `ROLLBACK` (không file nào chết giữa chừng).

- **43_hinh_anh_test.sql**: `1..31`, 31/31 `ok` — dòng cuối: `ok 31 - chỉ đúng một overload của danh_sach_san_pham (drop + create, không phải create or replace)`.
- **41_danh_sach_san_pham_test.sql**: `1..16`, 16/16 `ok` — dòng cuối: `ok 16 - không có phiên đăng nhập hợp lệ thì bị từ chối`.

Không cần migration vá `0069` — không có test nào đỏ.

## Task Commits

1. **Task 1 + Task 2** (gộp — Task 2 không tạo file mới, chỉ xác nhận pgTAP đạt trên schema mà Task 1 đã đẩy) — `0126f29` (`chore(db): day migration 0068 hinh_anh va sinh lai kieu`)

## Files Created/Modified

- `src/types/database.types.ts` — sinh lại từ cloud sau 0068 (thêm `hinh_anh`, `them_anh`, `nap_anh_kiotviet`, `dat_anh_chinh`, `xoa_anh`, `lay_khoa_anh`, `danh_sach_san_pham` 12 tham số với `p_co_anh`)

## Decisions Made

- CLI `supabase` (login/link/gen types theo `--project-id`) mất quyền Management API trên máy này. Thay bằng: `psql "$DATABASE_URL"` (session pooler, đã xác nhận đúng project trước khi chạy bất cứ gì) để đẩy migration + chạy pgTAP; `supabase gen types typescript --db-url "$DATABASE_URL"` để sinh kiểu (đường vòng chính thức của CLI, không qua Management API).
- Không có MCP tool nào (Supabase/khác) lộ ra trong bộ công cụ thực tế của phiên chấp hành này dù hướng dẫn hệ thống có nhắc tới MCP servers — mọi bước "MCP execute_sql"/"MCP get_advisors" trong plan được thay bằng Bash + psql tương đương, có ghi rõ trong Summary để lần sau không hiểu nhầm là đã bỏ qua bước kiểm chứng.

## Deviations from Plan

None về mặt kết quả — cách thực hiện đổi từ "MCP execute_sql" sang "psql trực tiếp" (đã ghi ở trên) vì không có MCP tool khả dụng trong phiên chấp hành, nhưng đạt đúng mọi tiêu chí: md5 khớp, khối DO tự kiểm không lỗi, gọi thật đúng như mô tả, pgTAP 35/35 file sạch.

## Issues Encountered

- `npm run db:types` (script gốc dùng `--project-id`) lỗi quyền Management API — chuyển sang `--db-url` (Task 1, không phải deviation về database, chỉ đổi lệnh gọi CLI).
- `npx supabase migration list --linked` lỗi IPv6 — bỏ qua, xác nhận version cao nhất bằng truy vấn SQL trực tiếp thay thế (tương đương).

## Next Phase Readiness

- `database.types.ts` đã sẵn `hinh_anh`/6 RPC/`p_co_anh` cho Wave 3 (route, lớp dữ liệu, bộ lọc ảnh) dùng ngay.
- Màn danh mục production không gãy: `danh_sach_san_pham` gọi 11 tham số cũ vẫn chạy (đã gọi thật, không chỉ suy luận từ default).
- Chưa có ảnh nào trong `hinh_anh` (đúng — chưa chạy script ANH-06 nạp ảnh KiotViet), plan sau có thể thêm ảnh thật để kiểm UI.

---
*Phase: 09-quan-ly-hinh-anh*
*Completed: 2026-09-26*
