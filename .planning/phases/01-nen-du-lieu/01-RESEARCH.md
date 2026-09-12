# Phase 1: Nền dữ liệu - Research

**Researched:** 2026-09-12
**Domain:** Postgres/Supabase schema design, append-only ledger, RLS with custom JWT claims, pgTAP testing, Node/Excel data migration
**Confidence:** HIGH cho phần lõi Postgres/Supabase (verified qua docs chính thức tháng 9/2026), MEDIUM cho phần vận hành local pg_cron và exceljs edge-case (nhiều nguồn cộng đồng, ít tài liệu chính thức)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phát triển trên **Supabase local** (`npx supabase start`, Docker 28 đã có sẵn). Chạy pgTAP và thử migration miễn phí, không đụng dữ liệu thật. Push lên project cloud khi schema đã chốt.
- **D-02:** Mọi thay đổi schema là **file trong `supabase/migrations/`**, không bao giờ click sửa trên Dashboard. Dashboard chỉ dùng để bật extension và custom access token hook (những thứ CLI không làm được).
- **D-03:** pgTAP chạy bằng `npx supabase test db`, test đặt ở `supabase/tests/`.
- **D-04:** Import bằng **script Node có `--dry-run`**. Chế độ thử đọc file, validate từng dòng, in báo cáo và **không ghi gì vào database**. Chỉ khi báo cáo sạch mới chạy thật.
- **D-05:** Import **idempotent** — chạy lại nhiều lần không nhân đôi dữ liệu. Upsert theo khóa nghiệp vụ (`san_pham.ma_hang`, `doi_tac.ma`, `nhom_hang.ma`).
- **D-06:** Import chạy **toàn bộ hoặc không gì cả** trong một transaction.
- **D-07:** File export thật đặt ở **`data/kiotviet/`**, thêm vào `.gitignore`.
- **D-08:** Bình quân gia quyền di động tính **toàn công ty** — một mã hàng có đúng một giá vốn, dù nằm ở kho nào. Nguồn sự thật là `san_pham.gia_von`.
- **D-09:** **Lệch với tài liệu thiết kế gốc:** `ton_kho` **không** giữ cột `gia_von_bq`. `ton_kho` chỉ còn `(kho_id, san_pham_id, so_luong, cap_nhat_luc)`.
- **D-10:** `kho_movement.gia_von_tai_thoi_diem` ghi giá vốn toàn công ty tại thời điểm phát sinh.
- **D-11:** Chuyển kho **không đụng giá vốn**. Một chứng từ `CHUYEN_KHO` sinh 2 movement (âm ở kho đi, dương ở kho đến), cùng một `gia_von_tai_thoi_diem`.
- **D-12:** Kiểu số: `numeric(18,4)` cho giá vốn và đơn giá, `numeric(18,0)` cho thành tiền. Mọi phép tính giá vốn làm trong Postgres, không ở JS.
- **D-13:** Seed **4 tài khoản mẫu** (quản lý / văn phòng / thủ kho / chỉ xem) cho môi trường local. pgTAP dùng chính 4 tài khoản này, không giả lập JWT bằng tay.
- **D-14:** Trên cloud, tài khoản tạo tay qua Dashboard cho đến khi có màn Cài đặt (Phase 2).
- **D-15:** Vai trò và kho được bơm vào JWT bằng **custom access token hook**. Helper RLS đọc từ `auth.jwt()` và **phải bọc trong `(select ...)`**.
- **D-16:** **13 bảng**, không phải 11. Thêm `nguoi_dung`.
- **D-17:** Sổ cái bất biến chặn bằng **cả hai lớp**: REVOKE UPDATE/DELETE **và** trigger `BEFORE UPDATE OR DELETE` ném exception. RLS một mình không đủ vì `service_role` bypass RLS.
- **D-18:** Đánh số chứng từ bằng **bảng đếm + `UPDATE ... RETURNING`** (khóa dòng), không dùng Postgres sequence.
- **D-19:** Tìm không dấu dùng `unaccent` + `pg_trgm`. `unaccent()` không IMMUTABLE nên **phải bọc trong hàm wrapper IMMUTABLE**.
- **D-20:** `uuid_generate_v4()` (extension `uuid-ossp`), không `gen_random_uuid()`.

### Claude's Discretion

- **D-21:** Đánh số chứng từ reset theo năm, **không** tách theo kho (`PN26-000001` dùng chung cả 2 kho).
- **D-22:** Lý do xuất âm: danh sách cố định cấu hình được + ô ghi chú tự do, lưu ở **header** chứng từ.
- **D-23:** RPC phải ném exception với **SQLSTATE có nghĩa** (`23514` cho vi phạm quy tắc nghiệp vụ, `42501` cho không đủ quyền) vì `src/shared/lib/errors.ts` đã map sẵn.

### Deferred Ideas (OUT OF SCOPE)

- Sửa từ "xưởng" trong `errors.ts` → Phase 2.
- Sửa `app-shell.tsx` menu cũ → blocker Phase 2.
- DLIEU-04 (trích khách hàng thật từ Ghi chú) → Phase 2.
- Realtime → không bật ở Phase 1 (v1 không dùng).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Migration từ đầu trên DB rỗng dựng đủ 13 bảng, index, ràng buộc | §Architecture Patterns (13-table DDL order), §Migration workflow |
| DATA-02 | UPDATE/DELETE trên `kho_movement` bị từ chối kể cả `service_role` | §Priority 6: chặn ghi sổ cái |
| DATA-03 | Thêm `kho_movement` làm `ton_kho` cập nhật ngay, không cần app gọi thêm | §Priority 7: trigger tồn kho |
| DATA-04 | Giá vốn bình quân gia quyền di động tính lại đúng công thức sau mỗi phiếu nhập | §Priority 7: công thức + khóa concurrency |
| DATA-05 | Ghi sổ một chứng từ là transaction, lỗi dòng n không để lại movement mồ côi | §Priority 8: RPC atomic |
| DATA-06 | Hủy chứng từ sinh bút toán đảo, giữ bản gốc | §Priority 8: RPC atomic (huy_chung_tu) |
| DATA-07 | Tìm sản phẩm không dấu, mã phát sinh gần đây xếp trước | §Priority 5: unaccent + pg_trgm |
| DATA-08 | Đánh số chứng từ theo loại/năm, không trùng khi ghi đồng thời | §Priority: counter table + UPDATE...RETURNING |
| DATA-09 | Job hằng đêm đối chiếu `ton_kho` với `kho_movement`, báo chênh lệch | §Priority 4: pg_cron local vs cloud |
| DATA-10 | Bộ test pgTAP phủ trigger, giá vốn, chặn sửa sổ cái, RLS 4 vai trò | §Priority 3: pgTAP + JWT thật |
| AUTH-03 | Vai trò/kho trong JWT claims; RLS đọc claims không query theo dòng | §Priority 1+2: custom access token hook + `(select auth.jwt())` |
| AUTH-04 | Thủ kho chỉ đọc tồn/chứng từ kho mình | §Architecture Patterns: RLS policy mẫu theo `kho_id` |
| AUTH-05 | Văn phòng sửa danh mục nhưng không sửa giá vốn/giá bán | §Architecture Patterns: cột `gia_von` chỉ ghi được bởi trigger (không GRANT UPDATE trực tiếp cho client) |
| AUTH-06 | Vai trò "chỉ xem" không tạo được chứng từ, chặn ở DB | §Architecture Patterns: RLS + REVOKE INSERT theo vai trò |
| DLIEU-01 | Nạp 3.266 mã hàng, 90 nhóm, 25 đối tác, 2 kho từ export KiotViet | §Priority 11: exceljs + import script |
| DLIEU-02 | Tách trường ĐVT cũ thành `dvt` + `cong_doan` | §Priority 11 + Architecture Patterns danh mục |
| DLIEU-03 | Gán công đoạn cho 1.826 mã không suy được từ ĐVT cũ | §Priority 11: chiến lược mapping/fallback |
</phase_requirements>

## Summary

Phase 1 xây toàn bộ tầng dữ liệu bằng Postgres/Supabase thuần — không một dòng UI. Rủi ro kỹ thuật thật sự không nằm ở "13 bảng" (đó là CRUD DDL bình thường) mà nằm ở bốn cụm: (1) **custom access token hook** — cơ chế còn tương đối mới, tài liệu Supabase chính thức đã ổn định nhưng có khác biệt quan trọng giữa cấu hình local (`config.toml`) và cloud (Dashboard), và claim cũ vẫn còn hiệu lực cho tới khi access token hết hạn (mặc định 3600s) hoặc bị revoke — pgTAP test bằng JWT thật (qua `tests.authenticate_as`) không chạy qua hook nên không phát hiện được lỗi hook; (2) **trigger giá vốn bình quân gia quyền di động dưới concurrency** — hai phiếu nhập cùng sản phẩm chạy đồng thời phải khóa đúng thứ tự (khóa dòng `san_pham` TRƯỚC khi đọc tổng tồn), nếu không sẽ đọc giá trị cũ (lost update); (3) **chặn sửa/xóa sổ cái cho service_role** — pattern REVOKE + trigger là đúng và cần thiết vì Supabase mặc định cấp toàn quyền (`ALTER DEFAULT PRIVILEGES`) cho `anon/authenticated/service_role` trên mọi bảng mới tạo trong `public`; (4) **pg_cron trên Supabase local không ổn định** — nhiều báo cáo lỗi cấp quyền khi tạo qua migration, khớp với quyết định D-02 dùng Dashboard cho việc CLI không làm tốt.

**Primary recommendation:** Xây đúng theo 22 WU đề xuất nhưng: tách WU-14 (RLS) thành nhiều file nhỏ hơn theo nhóm bảng vì khối lượng SQL sẽ vượt xa "3 file/nửa ngày"; coi WU-15 (pg_cron) là rủi ro cao và tách phần "hàm đối chiếu" (test được bằng pgTAP, không phụ thuộc pg_cron) ra khỏi phần "đăng ký lịch chạy" (chỉ verify thủ công, chấp nhận có thể phải làm lại trên Dashboard cloud); dùng khóa dòng `san_pham FOR UPDATE`/`UPDATE...RETURNING` làm điểm nghẽn concurrency duy nhất cho giá vốn.

## Standard Stack

### Core

| Thành phần | Version (đã verify) | Mục đích | Vì sao chuẩn |
|---|---|---|---|
| Supabase CLI | 2.117.0 (đã có qua `npx supabase`) | Local stack, migration, test, type gen | D-01/D-02/D-03 yêu cầu |
| PostgreSQL | 17 (image mặc định Supabase CLI 2.x hiện tại) | Database engine | Bundled với `supabase start` |
| pgTAP | bundled trong Supabase local image (`supabase_test`) | Unit test SQL | D-03, DATA-10 |
| `basejump-supabase_test_helpers` | tùy chọn, không cài sẵn | `tests.create_supabase_user`, `tests.authenticate_as` | Xem cảnh báo bên dưới — quyết định có dùng hay tự viết wrapper |
| exceljs | ^4.4 (đã có trong package.json) | Đọc file `.xlsx` export KiotViet | D-04..D-07 |
| zod | ^4.6 (đã có) | Validate từng dòng import trước khi ghi | D-04 |

### Supporting

| Thành phần | Version | Mục đích | Khi dùng |
|---|---|---|---|
| `uuid-ossp` | contrib, cài qua `CREATE EXTENSION` | `uuid_generate_v4()` | D-20, mọi PK |
| `unaccent` | contrib | Bỏ dấu tiếng Việt | D-19 |
| `pg_trgm` | contrib | Trigram similarity + GIN index | D-19, DATA-07 |
| `pg_cron` | contrib, cần `shared_preload_libraries` (đã preload sẵn trên Supabase) | Job đối chiếu hằng đêm | DATA-09 — xem rủi ro local ở dưới |

### Alternatives Considered

| Thay vì | Có thể dùng | Đánh đổi |
|---|---|---|
| `basejump-supabase_test_helpers` cho pgTAP | Tự viết `set_config('request.jwt.claims', ...)` + `set local role authenticated` thủ công | Tự viết cho toàn quyền kiểm soát claims (`vai_tro`, `kho_id` tùy biến theo schema riêng của dự án) nhưng tốn công hơn; helper package chuẩn hóa nhưng giả định schema `user_roles`/`profiles` không khớp mô hình `nguoi_dung` của dự án — **khuyến nghị: tự viết một schema `tests` nhỏ mô phỏng đúng 2 hàm cần (`tests.dang_nhap_nhu(email)`, seed 4 tài khoản D-13) thay vì kéo nguyên package ngoài** |
| pg_cron cho job đối chiếu | Cron ở tầng application (Vercel Cron / GitHub Actions gọi RPC qua HTTP) | pg_cron giữ logic 100% trong DB đúng triết lý "Postgres là backend" của dự án; nhưng nếu pg_cron local bất ổn, có thể **tạm thời gọi `select doi_chieu_ton()` bằng tay/script trong lúc dev**, chỉ đăng ký lịch `cron.schedule` thật khi đã push cloud |
| `SELECT ... FOR UPDATE` rồi `UPDATE` (2 câu lệnh) cho giá vốn | Một câu `UPDATE ... FROM (subquery) ... RETURNING` | Cả hai đều cần khóa dòng `san_pham` trước tiên; 2 câu lệnh rõ ràng hơn khi phải đọc `ton_kho` (nhiều dòng) trước khi tính, khuyến nghị dùng 2 bước trong cùng transaction của trigger |

**Installation (thêm vào migration 0001, không phải npm install):**
```sql
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "unaccent" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
-- pg_cron: theo D-02, bật qua Dashboard (cloud) / kiểm tra riêng ở local, xem Common Pitfalls
```

**Version verification:** Docker 28.0.1 và Supabase CLI 2.117.0 đã xác nhận có sẵn trên máy (đề bài). `supabase --version` sau `npx supabase start` sẽ in version Postgres image thực tế (thường là 17.x tại thời điểm nghiên cứu, tháng 9/2026) — planner nên chạy `npx supabase --version` khi bắt đầu WU-01 để chốt số chính xác vào commit message, vì tài liệu công khai không đảm bảo pin đúng version cho mọi máy.

## Architecture Patterns

### Thứ tự migration (khớp WORK-UNITS.md, xác nhận đúng hướng)

```
supabase/migrations/
├── 0001_extensions.sql        # schema extensions, uuid-ossp/unaccent/pg_trgm, f_unaccent(), update_updated_at()
├── 0002_enums.sql             # loai_ct, trang_thai_ct, vai_tro, loai_doi_tac, trang_thai_ddh
├── 0003_nguoi_dung_kho.sql    # nguoi_dung (FK auth.users), kho
├── 0004_danh_muc.sql          # nhom_hang, don_vi_tinh, cong_doan, doi_tac
├── 0005_san_pham.sql          # san_pham + index unique + GIN trgm + lan_phat_sinh_cuoi
├── 0006_don_dat_hang.sql      # don_dat_hang, don_dat_hang_dong
├── 0007_chung_tu.sql          # chung_tu, chung_tu_dong
├── 0008_so_cai_ton_kho.sql    # kho_movement, ton_kho, trigger, REVOKE + trigger chặn
├── 0009_danh_so.sql           # chuoi_so_ct, sinh_so_ct()
├── 0010_luu_tru_kiotviet.sql  # bảng lưu trữ (chuẩn bị Phase 6)
├── 0011_rpc_ghi_so.sql        # ghi_so_chung_tu()
├── 0012_rpc_huy.sql           # huy_chung_tu()
├── 0013_rpc_tim_kiem.sql      # tim_san_pham()
├── 0014_rls.sql               # hook + helper + policy 13 bảng
├── 0015_doi_chieu.sql         # v_doi_chieu_ton, doi_chieu_ton(), cron.schedule
```

**⚠️ Cảnh báo tên file migration:** Supabase CLI yêu cầu filename khớp regex `<số>_<tên>.sql` (không bắt buộc đúng 14 chữ số timestamp — số nguyên có độ dài bất kỳ vẫn hợp lệ vì CLI parse phần số làm "version" để sắp thứ tự và ghi vào `supabase_migrations.schema_migrations`). Dùng `0001`..`0015` như đề xuất **chạy được**, nhưng planner cần khóa quy ước này cho **toàn dự án** (không chỉ Phase 1): nếu Phase 2 dùng `supabase migration new <tên>` (CLI tự sinh file dạng `20260920103000_<tên>.sql`), số đó lớn hơn `0015` nên vẫn sắp đúng sau — không xung đột, nhưng để nhất quán khuyến nghị Phase 1 kết thúc, ghi rõ trong STATE.md "migration tiếp theo dùng định dạng nào".

### Bốn nguyên tắc RLS/JWT (D-15, AUTH-03..06)

```sql
-- 0014_rls.sql — helper đọc claim, bọc (select ...) để cache 1 lần/statement
create or replace function public.vai_tro_hien_tai()
returns public.vai_tro
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'vai_tro', '')::public.vai_tro;
$$;

create or replace function public.kho_hien_tai()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'kho_id', '')::uuid;
$$;

-- Policy mẫu — LUÔN bọc (select ...), không gọi trần
create policy "thu_kho chỉ đọc tồn kho mình"
  on public.ton_kho for select
  to authenticated
  using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong')
    or ( (select public.vai_tro_hien_tai()) = 'thu_kho' and kho_id = (select public.kho_hien_tai()) )
  );

create policy "chi_xem không insert chung_tu"
  on public.chung_tu for insert
  to authenticated
  with check ( (select public.vai_tro_hien_tai()) <> 'chi_xem' );
```

**Lưu ý AUTH-05 (văn phòng không sửa giá vốn/giá bán):** RLS `UPDATE ... USING/WITH CHECK` không phân biệt được "cột nào" bị sửa — RLS chỉ chặn theo dòng, không theo cột. Hai cách đúng:
1. **Column-level privilege:** `REVOKE UPDATE (gia_von, gia_ban) ON san_pham FROM authenticated; GRANT UPDATE (ten_hang, nhom_hang_id, ...) ON san_pham TO authenticated;` — Postgres hỗ trợ GRANT/REVOKE theo cột, PostgREST tôn trọng quyền này (trả `42501` nếu client cố PATCH cột bị cấm).
2. **Trigger BEFORE UPDATE kiểm tra:** nếu `NEW.gia_von IS DISTINCT FROM OLD.gia_von` và vai trò không phải hệ thống/trigger nội bộ → raise exception `23514`.

Khuyến nghị dùng **cả hai**: cột-level GRANT chặn ngay ở tầng PostgREST (lỗi rõ ràng, không tốn round-trip), trigger là lưới an toàn thứ hai cho trường hợp update qua RPC nội bộ. `gia_von` **chỉ được ghi bởi trigger giá vốn** (chạy dưới quyền `security definer` hoặc do chính hệ thống gọi trong cùng transaction ghi sổ) — client không bao giờ được cấp UPDATE trên cột này.

### DDL 13 bảng — điểm cần chốt trước khi viết migration

1. `nguoi_dung` — PK = `auth.users.id` (không tự sinh uuid mới), cột `vai_tro public.vai_tro not null`, `kho_id uuid references kho(id)` (nullable cho `quan_ly`/`van_phong` không gắn kho cố định).
2. `kho`, `nhom_hang` (tự tham chiếu `parent_id`), `don_vi_tinh`, `cong_doan`, `doi_tac` (`loai_doi_tac` enum: `NCC`/`KHACH`/`CA_HAI`).
3. `san_pham` — unique index trên `ma_hang`, cột `gia_von numeric(18,4) not null default 0`, `lan_phat_sinh_cuoi timestamptz`, GIN trgm trên `f_unaccent(ma_hang || ' ' || ten_hang)`.
4. `don_dat_hang` + `don_dat_hang_dong` — `trang_thai_ddh` enum.
5. `chung_tu` + `chung_tu_dong` — `loai_ct` enum 7 giá trị, `trang_thai_ct` enum (`NHAP_LIEU`/`HOAN_THANH`/`DA_HUY`), `ly_do_xuat_am text` + `ghi_chu_ly_do text` ở header (D-22), `so_luong_he_thong numeric(18,4)` ở dòng cho kiểm kê.
6. `kho_movement` — append-only, `gia_von_tai_thoi_diem numeric(18,4) not null`, FK tới `chung_tu_dong` (mỗi dòng chứng từ sinh đúng 1 hoặc 2 movement — 2 cho `CHUYEN_KHO`).
7. `ton_kho` — PK composite `(kho_id, san_pham_id)`, **không có `gia_von_bq`** (D-09).
8. `chuoi_so_ct` — PK `(loai_ct, nam)`, cột `so_hien_tai integer not null default 0`.

**FK — lệch quy tắc global có chủ đích (đã ghi trong PROJECT.md Key Decisions):** dự án này DÙNG FK, khác `DATABASE_RULES.md` (cấm FK). Điều này đã được xác nhận là quyết định đúng cho ngữ cảnh "Postgres là backend duy nhất, không có tầng ứng dụng giữ toàn vẹn" — planner **không** cần áp lại quy tắc "no FK" global, giữ nguyên FK theo PROJECT.md.

## Don't Hand-Roll

| Vấn đề | Đừng tự viết | Dùng thay | Vì sao |
|---|---|---|---|
| Đọc claim JWT trong mỗi policy | `select vai_tro from nguoi_dung where id = auth.uid()` lặp lại | Helper `vai_tro_hien_tai()`/`kho_hien_tai()` đọc từ `auth.jwt()`, bọc `(select ...)` | Query theo dòng làm chậm quét bảng lớn (chính lý do D-15 tồn tại) |
| Bỏ dấu tiếng Việt để tìm kiếm | Regex thay ký tự thủ công trong JS | `unaccent` extension + wrapper IMMUTABLE `f_unaccent()` | Regex tay không phủ hết bảng Unicode combining marks, dễ sót trường hợp |
| Đánh số chứng từ không trùng | Đếm bằng `SELECT MAX(so) + 1` | Bảng đếm `chuoi_so_ct` + `UPDATE ... RETURNING` trong 1 câu lệnh | `MAX+1` có race condition kinh điển giữa hai transaction đọc cùng lúc |
| Kiểm tra quyền theo cột trong RLS | Viết trigger tự so sánh mọi cột nhạy cảm | Column-level `GRANT`/`REVOKE UPDATE (cột)` của Postgres | Postgres đã có cơ chế chuẩn, PostgREST tôn trọng, lỗi trả `42501` tự động |
| Parse JWT thủ công trong pgTAP | Tự ghép chuỗi JWT giả rồi decode | `set_config('request.jwt.claims', json, true)` + `set local role authenticated` (hoặc `tests.authenticate_as` nếu dùng helper) trong transaction test | Postgres/PostgREST đọc JWT claims qua GUC `request.jwt.claims`, không qua header thật khi test trực tiếp bằng SQL |

**Key insight:** Ở phase này, "không tự chế" quan trọng nhất là **không tự tính giá vốn ở bất kỳ đâu ngoài trigger DB** (đã là quyết định D-12) và **không thay thế cơ chế GRANT/REVOKE cột bằng logic RLS phức tạp hơn mức cần thiết** — Postgres đã có nguyên bộ công cụ authorization ở tầng câu lệnh, RLS chỉ nên lo việc lọc theo dòng.

## Common Pitfalls

### Pitfall 1: Custom access token hook — claim cũ sống sót sau khi đổi vai trò
**What goes wrong:** Đổi `nguoi_dung.vai_tro` trong DB nhưng người dùng vẫn thao tác được theo vai trò cũ.
**Why it happens:** Hook chỉ chạy khi **cấp mới** access token (login hoặc **refresh token**, mặc định access token sống 3600s). Access token hiện tại không tự cập nhật.
**How to avoid:** Ngoài phạm vi Phase 1 (chưa có màn đổi vai trò), nhưng ghi vào Open Questions cho Phase 2 (CDAT-01): sau khi đổi vai trò phải revoke session (`supabase.auth.admin.signOut(userId, 'others')`) hoặc giảm access token TTL.
**Warning signs:** pgTAP test dùng `set_config` trực tiếp **sẽ không phát hiện** lỗi này vì nó bỏ qua hook hoàn toàn — cần một test tay/script riêng (không phải pgTAP) xác nhận hook thật sự chạy: login qua `supabase-js`, decode JWT, kiểm tra có `vai_tro`/`kho_id`.

### Pitfall 2: Supabase mặc định GRANT toàn quyền — REVOKE tưởng thừa nhưng bắt buộc
**What goes wrong:** Nghĩ RLS + không bật RLS-bypass là đủ, bỏ qua REVOKE UPDATE/DELETE tường minh trên `kho_movement`.
**Why it happens:** Setup mặc định của Supabase gồm `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role` — mọi bảng mới tự động có UPDATE/DELETE cho cả `service_role` (role này có `BYPASSRLS` nên RLS không cản được nó ở tầng row, nhưng **privilege GRANT là một lớp riêng, độc lập với RLS**).
**How to avoid:** `REVOKE UPDATE, DELETE ON public.kho_movement FROM anon, authenticated, service_role;` — REVOKE nhắm đích danh 3 role (không REVOKE FROM PUBLIC vì default privileges cấp trực tiếp cho từng role, không qua PUBLIC).
**Warning signs:** Test `service_role` UPDATE thành công dù đã "bật RLS".

### Pitfall 3: Trigger chặn UPDATE/DELETE không chặn được chủ sở hữu bảng
**What goes wrong:** REVOKE + trigger chặn được `anon`/`authenticated`/`service_role`, nhưng role `postgres` (chủ sở hữu bảng, dùng để chạy migration và trong SQL Editor) **luôn có toàn quyền ngầm định** bất kể REVOKE.
**Why it happens:** Quyền sở hữu bảng (table ownership) không bị REVOKE loại bỏ trừ khi đổi owner.
**How to avoid:** Đây chính xác là lý do D-17 yêu cầu **cả hai lớp** — trigger `BEFORE UPDATE OR DELETE ... RAISE EXCEPTION` chặn được **mọi role kể cả owner/superuser**, vì trigger là cơ chế table-level độc lập với quyền. Chỉ có `ALTER TABLE ... DISABLE TRIGGER` (cần quyền ALTER, tức là owner) hoặc phiên đặt `SET session_replication_role = replica` (cần superuser) mới tắt được trigger — cả hai đều là hành động tường minh, không xảy ra vô tình.
**Warning signs:** pgTAP test D-17 phải chạy bằng **cả 4 role seed lẫn kết nối trực tiếp qua migration runner** để chắc chắn phủ cả hai trường hợp.

### Pitfall 4: Giá vốn bình quân — đọc trước khi khóa
**What goes wrong:** Hai phiếu nhập cùng `san_pham_id` chạy gần như đồng thời, cả hai đọc `ton_kho`/`gia_von` cũ trước khi cái kia commit → một bản ghi cost bị "mất" (lost update), giá vốn cuối cùng sai.
**Why it happens:** Postgres mặc định `READ COMMITTED` — không tự khóa dòng khi chỉ SELECT.
**How to avoid:** Trong trigger `AFTER INSERT ON kho_movement`, câu lệnh **đầu tiên** phải là khóa dòng `san_pham`:
```sql
-- Bước 1: khóa dòng san_pham TRƯỚC (điểm nghẽn serialize duy nhất)
select gia_von into v_gia_von_cu
from public.san_pham
where id = new.san_pham_id
for update;

-- Bước 2: tính tồn cũ TOÀN CÔNG TY (an toàn vì đã giữ khóa ở bước 1,
-- transaction thứ hai buộc phải đợi tới khi transaction này commit)
select coalesce(sum(so_luong), 0) into v_ton_cu
from public.ton_kho
where san_pham_id = new.san_pham_id;

-- Bước 3: công thức D-04, tránh chia 0
if (v_ton_cu + new.so_luong) = 0 then
  v_gia_von_moi := v_gia_von_cu;
else
  v_gia_von_moi := ((v_ton_cu * v_gia_von_cu) + (new.so_luong * new.gia_von_tai_thoi_diem))
                   / (v_ton_cu + new.so_luong);
end if;

update public.san_pham set gia_von = v_gia_von_moi, lan_phat_sinh_cuoi = now()
where id = new.san_pham_id;
```
**Không cần SERIALIZABLE** — READ COMMITTED (mặc định Supabase/PostgREST) + khóa dòng tường minh là đủ và tránh được chi phí retry-on-conflict của SERIALIZABLE (khó retry đúng cách bên trong một trigger).
**Warning signs:** pgTAP test "hai phiên tạo cùng lúc" (WU-18) phải mô phỏng bằng 2 kết nối/transaction chồng nhau thật (không phải 2 câu lệnh tuần tự trong cùng transaction — như vậy không test được race condition).

### Pitfall 5: `unaccent()` không thật sự IMMUTABLE nếu dùng dạng 1 tham số
**What goes wrong:** Tạo index bằng `unaccent(text)` (dạng 1 tham số) ép kiểu `immutable` bằng `CREATE OR REPLACE FUNCTION ... IMMUTABLE AS $$ SELECT unaccent($1) $$` — về mặt kỹ thuật **không an toàn** vì dạng 1 tham số phụ thuộc `search_path` để tìm dictionary mặc định, có thể trả kết quả khác nếu `search_path` đổi.
**How to avoid:** Dùng dạng **2 tham số**, chỉ định thẳng dictionary bằng OID (`regdictionary`), loại bỏ phụ thuộc `search_path`:
```sql
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

create index idx_san_pham_tim_kiem
  on public.san_pham
  using gin (public.f_unaccent(coalesce(ma_hang,'') || ' ' || coalesce(ten_hang,'')) extensions.gin_trgm_ops);
```
**Warning signs:** `EXPLAIN` cho query `WHERE f_unaccent(...) % f_unaccent('tu khoa')` không dùng Index Scan → thường do quên GIN index hoặc quên gọi đúng `f_unaccent` ở cả 2 vế.

### Pitfall 6: pg_cron trên Supabase local (Docker CLI stack) không đáng tin
**What goes wrong:** `CREATE EXTENSION pg_cron` chạy trong migration nhưng job không bao giờ chạy, hoặc lỗi "can only create extension in database postgres" khi `supabase start` (CLI tạo DB tên `main`/`postgres` khác thứ tự với hosted).
**Why it happens:** `pg_cron` cần `shared_preload_libraries` nạp lúc Postgres khởi động và ghi job vào DB được cấu hình bởi `cron.database_name` — trên hosted Supabase việc này đã cấu hình sẵn, trên local CLI thì không đảm bảo nhất quán giữa các version CLI (nhiều issue GitHub xác nhận, chưa có fix chính thức tại thời điểm nghiên cứu 09/2026).
**How to avoid:** Theo đúng D-02 — **tạo extension `pg_cron` và đăng ký `cron.schedule(...)` qua Dashboard khi đã push cloud**, không cố ép chạy được 100% ở local. Trong migration/local dev: viết và test kỹ hàm `doi_chieu_ton()` bằng cách **gọi trực tiếp** (`select public.doi_chieu_ton();`) trong pgTAP — phần này không phụ thuộc pg_cron và verify được 100% local. Phần `cron.schedule` để trong migration nhưng bọc `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE NOTICE ... END $$;` để không làm hỏng `supabase db reset` nếu pg_cron chưa sẵn sàng ở máy dev.
**Warning signs:** `select * from cron.job;` rỗng sau khi migration chạy xong ở local — không nhất thiết là lỗi, có thể do known issue trên.

### Pitfall 7: `SECURITY DEFINER` không đặt `search_path` — lỗ hổng leo quyền
**What goes wrong:** RPC `ghi_so_chung_tu()`/`huy_chung_tu()` cần `SECURITY DEFINER` (vì client không được GRANT INSERT trực tiếp trên `kho_movement`/`chung_tu` — RPC là cửa duy nhất được phép ghi), nhưng nếu không khóa `search_path`, một role có quyền tạo object trong schema nằm trước trong search_path mặc định có thể "che" một bảng/hàm nội bộ và chèn code độc hại chạy với quyền của hàm.
**How to avoid:** Luôn `set search_path = ''` (hoặc `set search_path = public, extensions`, liệt kê tường minh) trên **mọi** hàm `SECURITY DEFINER`, và schema-qualify **mọi** tên object trong thân hàm (`public.kho_movement`, không phải `kho_movement`).
**Warning signs:** Supabase Security Advisor (qua Dashboard hoặc `mcp__supabase__get_advisors` nếu có) sẽ tự động flag hàm `SECURITY DEFINER` thiếu `search_path` — chạy advisory scan sau khi viết xong WU-11/WU-12/WU-13.

## Code Examples

### 1. Custom access token hook (D-15, AUTH-03) — đăng ký cục bộ

```sql
-- 0014_rls.sql, phần đầu
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_vai_tro public.vai_tro;
  v_kho_id uuid;
begin
  select vai_tro, kho_id into v_vai_tro, v_kho_id
  from public.nguoi_dung
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if v_vai_tro is not null then
    claims := jsonb_set(claims, '{vai_tro}', to_jsonb(v_vai_tro));
  end if;
  if v_kho_id is not null then
    claims := jsonb_set(claims, '{kho_id}', to_jsonb(v_kho_id));
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.nguoi_dung to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

```toml
# supabase/config.toml — bật hook cho local (D-02: local qua CLI, cloud qua Dashboard)
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

**Xác nhận nguồn:** Supabase Docs "Custom Access Token Hook" (fetched 2026-09-12) — cấu trúc `event`/`claims`, GRANT/REVOKE, và cách khai báo `uri = "pg-functions://<database>/<schema>/<function>"` khớp chính xác. Docs không nêu rõ hành vi với session đang sống ngoài câu "hook chạy lại mỗi lần refresh token" — suy luận về TTL 3600s dựa trên hành vi mặc định GoTrue (MEDIUM confidence, nên verify bằng thử nghiệm tay ở WU-14).

### 2. RLS policy dùng đúng pattern cache (D-15)

Đã minh họa ở §Architecture Patterns. Điểm bắt buộc: **luôn `(select vai_tro_hien_tai())`**, không bao giờ gọi `vai_tro_hien_tai()` trần trong `USING`/`WITH CHECK` — nếu không Postgres re-evaluate hàm (dù bản thân hàm `stable`) cho từng dòng khi bảng lớn (3.266 sản phẩm × mọi lần SELECT `ton_kho`/`san_pham`).

### 3. pgTAP — test với JWT thật của 4 tài khoản seed (D-13, DATA-10)

```sql
-- supabase/tests/rls_test.sql — tự viết, KHÔNG phụ thuộc package ngoài
begin;
select plan(4);

-- Giả định seed.sql đã tạo 4 user qua auth.admin API hoặc insert trực tiếp auth.users + nguoi_dung
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'thukho1@khominhvu.local'),
    'role', 'authenticated',
    'vai_tro', 'thu_kho',
    'kho_id', (select id::text from public.kho where ma = 'K1')
  )::text,
  true);
set local role authenticated;

select isnt_empty(
  $$ select 1 from public.ton_kho where kho_id = (select id from public.kho where ma = 'K1') $$,
  'thu_kho thấy tồn kho của mình'
);
select is_empty(
  $$ select 1 from public.ton_kho where kho_id = (select id from public.kho where ma = 'K2') $$,
  'thu_kho không thấy kho khác'
);

reset role;
select * from finish();
rollback;
```

**Lưu ý quan trọng:** cách này **bỏ qua hoàn toàn custom access token hook** — `request.jwt.claims` được set thẳng bằng tay, đúng claim mà hook *sẽ* tạo ra, nhưng không chứng minh hook thật sự tạo ra claim đó khi login thật. Cần thêm **một bước kiểm tra thủ công ngoài pgTAP** (ví dụ script Node nhỏ `scripts/verify-hook.ts` gọi `supabase.auth.signInWithPassword` rồi decode JWT) để đóng gap này trước khi coi AUTH-03 là "done".

### 4. Đánh số chứng từ atomic (D-08, D-18, D-21)

```sql
-- 0009_danh_so.sql
create table public.chuoi_so_ct (
  loai_ct public.loai_ct not null,
  nam smallint not null,
  so_hien_tai integer not null default 0,
  primary key (loai_ct, nam)
);

create or replace function public.sinh_so_ct(p_loai public.loai_ct, p_nam smallint)
returns text
language plpgsql
as $$
declare
  v_so integer;
  v_tien_to text;
begin
  insert into public.chuoi_so_ct (loai_ct, nam, so_hien_tai)
  values (p_loai, p_nam, 1)
  on conflict (loai_ct, nam)
  do update set so_hien_tai = public.chuoi_so_ct.so_hien_tai + 1
  returning so_hien_tai into v_so;

  v_tien_to := case p_loai
    when 'NHAP' then 'PN'
    when 'XUAT' then 'PX'
    -- ... map đủ 7 loại theo enum thật
    else 'CT'
  end;

  return format('%s%s-%s', v_tien_to, to_char(p_nam, 'FM00'), lpad(v_so::text, 6, '0'));
end;
$$;
```

`INSERT ... ON CONFLICT DO UPDATE ... RETURNING` trong **một câu lệnh** khóa đúng 1 dòng (hoặc tạo dòng mới) và trả về giá trị mới — an toàn hơn cách "SELECT rồi UPDATE" 2 bước vì không có khoảng hở giữa đọc và ghi. Hai transaction gọi đồng thời sẽ tự động serialize trên khóa dòng `(loai_ct, nam)` — transaction thứ hai đợi tới khi thứ nhất commit/rollback. **Đây là điểm khác với đề xuất "UPDATE...RETURNING" thuần trong CONTEXT.md** — dùng `INSERT ... ON CONFLICT` thay vì `UPDATE` để xử lý luôn trường hợp năm/loại chưa từng có dòng đếm (tránh phải `INSERT ... ON CONFLICT DO NOTHING` trước rồi `UPDATE` sau — gộp thành 1 câu).

### 5. Chặn sửa/xóa sổ cái — hai lớp (D-17, DATA-02)

```sql
-- 0008_so_cai_ton_kho.sql
revoke update, delete on public.kho_movement from anon, authenticated, service_role;

create or replace function public.chan_sua_xoa_so_cai()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Sổ cái kho_movement là bất biến, không được sửa hoặc xóa (thao tác: %)', tg_op
    using errcode = '23514'; -- check_violation, khớp map trong errors.ts
end;
$$;

create trigger chan_sua_xoa_kho_movement
  before update or delete on public.kho_movement
  for each row execute function public.chan_sua_xoa_so_cai();
```

### 6. RPC ghi sổ atomic — khung SECURITY DEFINER an toàn (D-05, D-23)

```sql
-- 0011_rpc_ghi_so.sql
create or replace function public.ghi_so_chung_tu(p_chung_tu_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ct public.chung_tu;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;
  if v_ct.trang_thai_ct <> 'NHAP_LIEU' then
    raise exception 'Chứng từ đã ghi sổ hoặc đã hủy, không ghi lại được' using errcode = '23514';
  end if;

  -- Kiểm tra quyền nghiệp vụ KHÔNG dựa vào RLS (SECURITY DEFINER bỏ qua RLS)
  -- mà check tường minh vai trò/kho ngay trong hàm:
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được ghi sổ chứng từ' using errcode = '42501';
  end if;

  -- ... vòng lặp qua chung_tu_dong, insert kho_movement cho từng dòng
  -- (lỗi ở dòng n tự động rollback toàn bộ vì cả hàm chạy trong 1 transaction ngầm định của RPC)

  update public.chung_tu set trang_thai_ct = 'HOAN_THANH' where id = p_chung_tu_id
  returning * into v_ct;

  return v_ct;
end;
$$;

revoke all on function public.ghi_so_chung_tu(uuid) from public;
grant execute on function public.ghi_so_chung_tu(uuid) to authenticated;
```

**Vì sao `SECURITY DEFINER` là bắt buộc ở đây, không phải tùy chọn:** client (`authenticated`) không được GRANT INSERT trực tiếp trên `kho_movement`/`chung_tu` (đúng nguyên tắc "ghi sổ chỉ qua RPC" trong PROJECT.md) — nếu RPC là `SECURITY INVOKER` (mặc định), hàm chạy dưới quyền caller và sẽ bị chính REVOKE đó chặn lại. `SECURITY DEFINER` cho hàm "mượn" quyền của người tạo hàm (thường là `postgres`) để ghi được, đổi lại phải tự kiểm tra quyền nghiệp vụ **bên trong** hàm (như đoạn `vai_tro_hien_tai() = 'chi_xem'` ở trên) vì RLS trên bảng đích **không áp dụng** khi chạy dưới `SECURITY DEFINER` với chủ sở hữu có `BYPASSRLS`/là superuser cục bộ.

### 7. Trigram search ưu tiên hàng gần đây (D-19, DATA-07)

```sql
-- 0013_rpc_tim_kiem.sql
create or replace function public.tim_san_pham(p_tu_khoa text, p_gioi_han int default 20)
returns setof public.san_pham
language sql
stable
as $$
  select sp.*
  from public.san_pham sp
  where public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang) % public.f_unaccent(p_tu_khoa)
  order by
    sp.lan_phat_sinh_cuoi desc nulls last,
    similarity(public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang), public.f_unaccent(p_tu_khoa)) desc
  limit p_gioi_han;
$$;
```

**Lưu ý hiệu năng:** `%` (toán tử trgm similarity threshold, mặc định `pg_trgm.similarity_threshold = 0.3`) dùng được index GIN đã tạo ở mục Pitfall 5. `ORDER BY lan_phat_sinh_cuoi DESC` **sau khi** lọc bằng `%` sẽ sort trên tập kết quả đã thu hẹp (thường vài chục dòng trong 3.266), không cần index riêng cho cột này ở Phase 1 — chỉ cân nhắc thêm index B-tree trên `lan_phat_sinh_cuoi` nếu sau này đo được chậm.

## State of the Art

| Cách cũ | Cách hiện tại (2026) | Đổi khi nào | Ảnh hưởng |
|---|---|---|---|
| Custom claims qua `app_metadata` cập nhật bằng Admin API sau login | Custom Access Token Hook (GA từ 2024, tài liệu ổn định 2026) | Supabase khuyến nghị hook cho mọi claim động (role, tenant) | Không cần gọi Admin API để "vá" JWT sau khi tạo user |
| `auth.uid() = user_id` trực tiếp trong policy | `(select auth.uid()) = user_id` | Khuyến nghị chính thức từ 2023, vẫn đúng 2026 | Bắt buộc cho bảng lớn như `san_pham`/`ton_kho` |
| Supabase project mặc định "expose mọi bảng public qua API" | Có tùy chọn tắt "Automatically expose new tables" cho project mới | Thay đổi gần đây trên Dashboard cho project mới tạo | Không ảnh hưởng trực tiếp Phase 1 (không cần tắt, chỉ cần REVOKE đúng cột/thao tác), nhưng nên kiểm tra checkbox này khi tạo project cloud để tránh bất ngờ |

## Open Questions

1. **Custom access token hook local: đã verify cấu hình `config.toml`, chưa verify hành vi khi `nguoi_dung.vai_tro` đổi giữa chừng session.**
   - Đã biết: hook chạy lại mỗi lần refresh token.
   - Chưa rõ: TTL access token mặc định của Supabase local (`supabase start`) có giống 3600s như cloud không — cần đọc `[auth] jwt_expiry` trong `config.toml` mặc định lúc `supabase init`.
   - Khuyến nghị: WU-14 thêm bước "đọc `jwt_expiry` trong config.toml sinh ra, ghi vào README nội bộ".

2. **pg_cron trên local Docker stack — sẽ hoạt động hay không chỉ biết khi thử thật trên máy này.**
   - Đã biết: nhiều báo cáo lỗi cấp quyền/database name mismatch, chưa có fix chính thức tính đến 09/2026.
   - Chưa rõ: version Supabase CLI 2.117.0 cụ thể trên máy này đã vá lỗi đó chưa.
   - Khuyến nghị: WU-15 thử `create extension pg_cron;` trong migration trước, nếu lỗi thì fallback theo Pitfall 6 (bọc `DO $$ EXCEPTION WHEN OTHERS $$`).

3. **`basejump-supabase_test_helpers` — dùng package ngoài hay tự viết seed/test helper?**
   - Package chuẩn hóa `tests.create_supabase_user`/`tests.authenticate_as` nhưng giả định model quyền riêng của nó (schema `basejump`), không khớp `nguoi_dung`/`vai_tro`/`kho_id` của dự án.
   - Khuyến nghị: **tự viết** (đã minh họa ở Code Example 3), không cài package ngoài — khớp CLAUDE.md "cài thư viện mới phải hỏi trước" và không có lý do đủ mạnh để thêm phụ thuộc ngoài cho một hàm test đơn giản.

4. **Seed 4 tài khoản (D-13) — tạo qua `auth.admin.createUser()` (Admin API, cần chạy script Node ngoài `seed.sql`) hay insert thẳng vào `auth.users` trong `seed.sql`?**
   - `seed.sql` chỉ chạy SQL thuần qua `psql`, không gọi được GoTrue Admin API để hash password đúng chuẩn bcrypt mà GoTrue set — insert thẳng `auth.users` với `encrypted_password` tự tính bằng `crypt()` (`pgcrypto`) **có thể** hoạt động (nhiều ví dụ cộng đồng làm vậy cho seed local) nhưng không phải API chính thức, dễ vỡ khi Supabase đổi schema `auth.users` giữa các version.
   - Khuyến nghị: WU-16 thử insert trực tiếp trước (nhanh, không cần network), nếu `supabase test db`/pgTAP login thất bại thì chuyển sang script Node gọi `supabase.auth.admin.createUser()` chạy như một bước `predev`/`preseed` riêng (không phải trong `seed.sql`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Docker | Supabase local stack | ✓ (theo đề bài) | 28.0.1 | — |
| Supabase CLI | Toàn bộ D-01/02/03 | ✓ (theo đề bài, qua `npx`) | 2.117.0 | — |
| pg_cron | DATA-09 | Không chắc trên local (xem Pitfall 6) | N/A tại local, có sẵn trên cloud | Gọi hàm `doi_chieu_ton()` thủ công/qua script lúc dev; đăng ký `cron.schedule` thật khi push cloud |
| `basejump-supabase_test_helpers` | DATA-10 (tùy chọn) | Chưa cài, không bắt buộc | — | Tự viết helper tối giản (xem Open Question 3) |
| exceljs | DLIEU-01..03 | ✓ đã có trong package.json | ^4.4 | — |

**Missing dependencies with no fallback:** Không có — mọi phụ thuộc bắt buộc đều đã sẵn sàng hoặc có fallback khả thi.

**Missing dependencies with fallback:** `pg_cron` local (fallback: gọi hàm tay khi dev, đăng ký cron thật ở cloud).

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | pgTAP (bundled Supabase local image) |
| Config file | `supabase/config.toml` mục `[db.pooler]`/mặc định — không cần config riêng cho pgTAP; `seed.sql` cấu hình qua `[db.seed]` |
| Quick run command | `npx supabase test db` (chạy toàn bộ `supabase/tests/*.sql` sau khi `db reset`) |
| Full suite command | `npx supabase db reset && npx supabase test db` (đảm bảo schema + seed sạch trước khi test) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| DATA-01 | Migration chạy sạch trên DB rỗng, đủ 13 bảng | smoke | `npx supabase db reset` (exit code 0) | ❌ Wave 0 — không cần file riêng, là điều kiện tiên quyết của mọi WU sau |
| DATA-02 | UPDATE/DELETE `kho_movement` bị từ chối kể cả `service_role` | pgTAP | `npx supabase test db` → `supabase/tests/ton_kho_test.sql` | ❌ Wave 6 (WU-17) |
| DATA-03 | Insert `kho_movement` → `ton_kho` cập nhật ngay | pgTAP | `supabase/tests/ton_kho_test.sql` | ❌ Wave 6 (WU-17) |
| DATA-04 | Công thức giá vốn bình quân gia quyền di động đúng | pgTAP | `supabase/tests/ton_kho_test.sql` | ❌ Wave 6 (WU-17) |
| DATA-05 | Ghi sổ atomic — lỗi dòng n không để lại movement mồ côi | pgTAP (giả lập lỗi ở dòng n bằng dữ liệu cố ý sai) | `supabase/tests/chung_tu_test.sql` | ❌ Wave 6 (WU-18) |
| DATA-06 | Hủy chứng từ sinh bút toán đảo, giữ bản gốc | pgTAP | `supabase/tests/chung_tu_test.sql` | ❌ Wave 6 (WU-18) |
| DATA-07 | Tìm không dấu ra kết quả có dấu, ưu tiên gần đây | pgTAP + `EXPLAIN` thủ công xác nhận dùng Index Scan | `supabase/tests/tim_kiem_test.sql` (chưa có trong WORK-UNITS — **gap, xem Wave 0 Gaps**) | ❌ |
| DATA-08 | Đánh số theo loại/năm, không trùng khi 2 phiên đồng thời | pgTAP mô phỏng 2 kết nối chồng nhau (dblink hoặc 2 session `psql` song song trong script) | `supabase/tests/chung_tu_test.sql` | ❌ Wave 6 (WU-18) |
| DATA-09 | Job đối chiếu báo đúng chênh lệch | pgTAP gọi trực tiếp `select doi_chieu_ton();` (không phụ thuộc pg_cron) | `supabase/tests/doi_chieu_test.sql` (chưa có trong WORK-UNITS — **gap**) | ❌ |
| DATA-10 | Bộ test pgTAP tổng thể | CLI exit code | `npx supabase test db` | ❌ Wave 6 |
| AUTH-03 | Claims trong JWT, RLS đọc claims không query dòng | pgTAP (`EXPLAIN` xác nhận không có subplan `nguoi_dung` trong policy) + script tay verify hook thật (xem Open Question 1) | `supabase/tests/rls_test.sql` + `scripts/verify-hook.ts` (script chưa có — **gap**) | ❌ Wave 6 (WU-19) |
| AUTH-04 | Thủ kho chỉ thấy kho mình | pgTAP với JWT thật của tài khoản seed `thu_kho` | `supabase/tests/rls_test.sql` | ❌ Wave 6 (WU-19) |
| AUTH-05 | Văn phòng không sửa `gia_von`/`gia_ban` | pgTAP thử `UPDATE san_pham SET gia_von = ...` bằng JWT `van_phong`, expect lỗi `42501` | `supabase/tests/rls_test.sql` | ❌ Wave 6 (WU-19) |
| AUTH-06 | "Chỉ xem" không insert được chứng từ dù gọi thẳng RPC | pgTAP thử gọi `ghi_so_chung_tu`/insert `chung_tu` bằng JWT `chi_xem`, expect lỗi | `supabase/tests/rls_test.sql` | ❌ Wave 6 (WU-19) |
| DLIEU-01 | Nạp đủ 3.266/90/25/2 | script output — đếm dòng sau khi chạy `--dry-run=false`, so với số liệu PROJECT.md | `npx tsx scripts/import-kiotviet/index.ts --dry-run=false` rồi `select count(*) from san_pham;` | ❌ Wave 7 (WU-20/21) |
| DLIEU-02 | ĐVT tách thành `dvt`+`cong_doan` | SQL query — đếm số dòng có cả 2 cột non-null theo đúng mapping | Query tay hoặc thêm vào test suite import | ❌ Wave 7 |
| DLIEU-03 | 1.826 mã không suy được từ ĐVT cũ có `cong_doan` gán | script output — báo cáo dry-run liệt kê số dòng cần gán thủ công/mặc định, so khớp con số 1.826 | `--dry-run` report | ❌ Wave 7 |

### Sampling Rate
- **Per task commit:** `npx supabase db reset` (đảm bảo migration mới không vỡ chain) — nhanh vì local Docker.
- **Per wave merge:** `npx supabase test db` (toàn bộ pgTAP suite).
- **Phase gate:** `npx supabase db reset && npx supabase test db` xanh toàn bộ, cộng chạy thật `scripts/import-kiotviet` với `--dry-run=false` trên dữ liệu mẫu (hoặc thật nếu đã có trong `data/kiotviet/`) trước khi coi Phase 1 done.

### Wave 0 Gaps
- [ ] `supabase/tests/tim_kiem_test.sql` — phủ DATA-07, **không có trong WORK-UNITS.md hiện tại** (WU-13 chỉ viết RPC, không có WU test riêng cho tìm kiếm) — planner nên thêm vào Wave 6 hoặc gộp vào WU-17.
- [ ] `supabase/tests/doi_chieu_test.sql` — phủ DATA-09, cũng thiếu trong WORK-UNITS.md — nên gộp vào WU-17 hoặc tạo WU mới ở Wave 6.
- [ ] `scripts/verify-hook.ts` — không phải pgTAP, là script tay xác nhận custom access token hook chạy đúng khi login thật (đóng gap Pitfall 1) — đề xuất thêm cuối WU-14 hoặc đầu WU-19.
- [ ] Quyết định seed 4 tài khoản: insert thẳng `auth.users` (SQL trong `seed.sql`) hay script Node dùng Admin API — cần chốt trước khi viết WU-16 (xem Open Question 4).

## Work Unit Risk Assessment

| WU | Rủi ro | Vì sao rủi ro hơn vẻ ngoài |
|---|---|---|
| WU-08 | **Cao** | Trigger giá vốn + concurrency là logic tinh vi nhất phase; nếu thứ tự khóa sai (đọc `ton_kho` trước khi khóa `san_pham`), lỗi chỉ lộ ra dưới tải đồng thời thật, pgTAP đơn-transaction không tự phát hiện được nếu không thiết kế test 2-connection cố ý (xem WU-18) |
| WU-11 | **Cao** | "Xử lý đủ 7 loại chứng từ" trong một RPC là khối lượng logic lớn hơn nhiều so với ước lượng "1 file, nửa ngày" — khuyến nghị planner tách thành RPC nội bộ theo loại (`_ghi_so_nhap`, `_ghi_so_xuat`, ...) được `ghi_so_chung_tu` điều phối, vẫn 1 file nhưng nhiều hàm nhỏ dễ test độc lập |
| WU-14 | **Cao** | "Policy bốn vai trò trên mọi bảng" nghĩa là ít nhất 2 policy (SELECT + một trong INSERT/UPDATE/DELETE) × 13 bảng ≈ 20-30 policy trong 1 file — vượt xa quy mô "3 file/nửa ngày"; nên tách theo nhóm bảng (danh mục / chứng từ / sổ cái) thành 2-3 migration file liền kề (`0014a_rls_helper.sql`, `0014b_rls_danh_muc.sql`, `0014c_rls_chung_tu.sql`) |
| WU-15 | **Cao** | Phụ thuộc pg_cron local không ổn định (Pitfall 6) — tách rõ "viết hàm" (rủi ro thấp, test được) khỏi "đăng ký lịch" (rủi ro cao, có thể phải hoãn tới lúc có cloud project) |
| WU-16 | **Trung bình** | Cách seed user vào `auth.users` chưa được xác nhận là "API chính thức" (Open Question 4) — có thể cần đổi cách giữa lúc viết |
| WU-17..19 | **Trung bình** | pgTAP test JWT thật đòi hỏi tự viết helper (không dùng package ngoài, xem Open Question 3) — tốn thời gian hơn ước lượng nếu chưa quen `set_config('request.jwt.claims', ...)` |
| WU-20, WU-21 | **Trung bình, phụ thuộc ngoài** | Đúng như WORK-UNITS.md đã ghi: chưa có file export thật thì không verify được DLIEU-01..03 "xong" thật sự; thêm rủi ro: KiotViet export thường có dòng tổng/dòng trống ở cuối sheet, cột số format "Text" (exceljs trả `cell.value` là string thay vì number) — script phải tự ép kiểu, không tin `typeof` mặc định |
| WU-05 | **Thấp-Trung bình** | Index GIN trgm trên 3.266 dòng nhỏ, không rủi ro hiệu năng ở scale này, nhưng phải đúng thứ tự: tạo `f_unaccent` (WU-01) trước, nếu quên sẽ lỗi "function does not exist" khi tạo index |

## Sources

### Primary (HIGH confidence — official Supabase/Postgres docs, fetched 2026-09-12)
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook — signature, GRANT/REVOKE, config.toml `uri` format
- https://raw.githubusercontent.com/supabase/supabase/master/apps/docs/content/guides/auth/auth-hooks/custom-access-token-hook.mdx — ví dụ đầy đủ có GRANT/REVOKE
- https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — pattern helper `authorize()`, `set search_path = ''`, `(select authorize(...))` trong policy
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv — `(select auth.uid())`, index cột RLS, `EXPLAIN` verify
- https://supabase.com/docs/guides/local-development/testing/pgtap-extended — `tests.create_supabase_user`, `tests.authenticate_as`, thứ tự chạy file alphabetical
- https://supabase.com/docs/guides/cli/config — `[auth.hook.custom_access_token]`, `[db.seed]`, `[db.pooler]`
- https://supabase.com/docs/guides/database/postgres/roles — `service_role` có `BYPASSRLS`, không phải superuser

### Secondary (MEDIUM confidence — cộng đồng + xác nhận chéo với official concept)
- GitHub `supabase/cli#158`, `#1591` — pg_cron local: lỗi "can only create extension in database postgres", grants không setup đúng qua migration
- Community posts (dev.to, cybertec-postgresql.com) — pattern `f_unaccent` 2-tham-số IMMUTABLE, counter table + `UPDATE...RETURNING`/`INSERT...ON CONFLICT` cho đánh số, `FOR UPDATE` cho race condition tồn kho

### Tertiary (LOW confidence — cần validate khi thực thi)
- TTL access token mặc định trên Supabase local (`jwt_expiry` trong `config.toml` sinh bởi `supabase init`) — chưa fetch được giá trị chính xác, cần đọc file thật sau `supabase init`
- Hành vi chính xác của `basejump-supabase_test_helpers` — không đọc source code, chỉ dựa mô tả gián tiếp; **khuyến nghị đã đưa ra là KHÔNG dùng package này** nên rủi ro thấp

## Metadata

**Confidence breakdown:**
- Standard stack (Supabase CLI/pgTAP/extensions): HIGH — verified qua docs chính thức + máy đã có Docker/CLI
- Custom access token hook + RLS pattern: HIGH cho cấu hình/cú pháp, MEDIUM cho hành vi session/TTL (chưa thử nghiệm thật)
- Giá vốn concurrency (locking pattern): HIGH về nguyên lý Postgres (MVCC, row lock), chưa thử nghiệm tải thật trên schema cụ thể của dự án
- pg_cron local: MEDIUM-LOW — nhiều nguồn cộng đồng xác nhận vấn đề nhưng chưa có kết quả thử trên máy này
- exceljs edge cases (merged cell, number-as-text, encoding): MEDIUM — thiếu tài liệu chính thức cụ thể, dựa nguyên lý chung của SheetJS/ExcelJS và kinh nghiệm cộng đồng

**Research date:** 2026-09-12
**Valid until:** ~30 ngày cho phần Postgres/SQL (ổn định), ~14 ngày cho phần pg_cron/CLI local (đang có issue mở, có thể được vá bất kỳ lúc nào) — nếu Phase 1 kéo dài hơn 2 tuần, re-check GitHub `supabase/cli` issues trước khi bắt đầu WU-15.

---
*Phase: 01-nen-du-lieu*
*Research completed: 2026-09-12*
