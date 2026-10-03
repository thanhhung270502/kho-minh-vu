# Auto-Save: Context Compacted
Created: 2026-10-03T06:17:12.797Z
Session: 0598c38f-7ff0-4ad1-a931-77ebbef46559
Trigger: auto-compaction (context was getting full)

## Compact Summary
<analysis>
Session covered: Phase 14 tasks 2-4, marking Phase 14-16 docs, Phase 15 (import v2), Phase 16 (chức vụ & quyền), merges/push to main, Notion check, Danh mục row-expand detail redesign, then the Notion task "Quy chuẩn mã hàng" split into C→B→A→D. C and B done; A in progress (Task 1 committed, Task 2 form auto-fill nearly done, verified in browser, not yet committed).

Key recent state: branch feature/quy-chuan-ma-a (from feature/quy-chuan-ma-b from feature/quy-chuan-ma-c from main). Task 2 changes uncommitted: standard-fields.ts, standard-fields-section.tsx, product-form-fields.tsx, product-drawer slimmed, product-classification-fields.tsx git rm'd, types/schema/mappers updated, code-dictionary api/hook, 0087 migration appended chi_tiet with truong_chon_tay (migration file modified after commit 5fbbdbb — needs to be included in commit), database.types regenerated. Browser verification done: auto fill, manual, retype, save → DB Y|E|75|XI_MA|{linh_kien}|ghi_chu null. Console clean.

Next: commit Task 2 (include 0087 amendment + types), then Task 3 (table/detail 17 fields, Quy chuẩn filter, hide Cần rà, rename Công đoạn→Xử lý), Task 4 (bulk fill modal + CSV).

Constraints: don't apply migrations to cloud without asking; .env.local now local (user switched back); no sign out of browser sessions; commit attribution line; don't push without asking (user asked push before explicitly). Memory files updated.
</analysis>

<summary>
1. Primary Request and Intent:
   - Earlier phases (10–16 of milestone v1.1 "Phản hồi vận hành", from Notion feedback) were planned and executed via `/spartan:quickplan`, each followed by "đánh dấu Phase N vào ROADMAP, REQUIREMENTS và STATE". All done: Phase 14 (panel), 15 (import v2), 16 (chức vụ & quyền) marked in planning docs (commits 80b60b1, e7debed, 65d2db6).
   - User asked "merge vô main" (fast-forwarded main to phase-16), later redesign of Danh mục detail per KiotViet screenshot (row-expand, 4 tabs, buttons, forecast columns) → merged to main and pushed ("push lên đi em").
   - Current big task: Notion "[Feature] Quy chuẩn mã hàng: nhập mã tự điền Hãng xe, Dòng xe, Linh kiện, Xử lý; chuẩn hóa trường sản phẩm; Combo" split into 4 quickplans C→B→A→D (user choices: follow Notion overriding Phase 15; Vercel Cron; hide "Cần rà"; store codes not names; keep Ép/Mua ngoài as "ngoài quy chuẩn"; keep duoc_ban_truc_tiep column but hide; bulk fill = in-app button for manager; only fill empty fields, never touch "chọn tay" fields, retyping code updates auto fields but keeps manual; rename "Công đoạn"→"Xử lý" everywhere in UI).
   - C done, B done (verified in browser after user "anh đã đổi về db local"), user said "tiếp phần A đi em" then "go". Currently executing part A.

2. Key Technical Concepts:
   - Next.js 16 App Router, antd v6, Tailwind v4, TanStack Query v5, RHF+Zod, Supabase (RLS, SECURITY DEFINER RPCs, PostgREST), pgTAP, conventions in CLAUDE.md (English code / Vietnamese UI & DB; mapper only in api/types; trap list; trap 22 added: PostgREST pg_safeupdate blocks DELETE/UPDATE without WHERE — use `where true`).
   - co_quyen(text) (0082) business permissions; vai_tro_hien_tai scope; allows(user, perm) frontend.
   - Quy chuẩn mã parser ported verbatim from Google Sheet TRA_CUU formulas; dictionary table ma_hoa (loai hang/dong/linh_kien/xu_ly/mau, ma_hang for dòng, thu_tu first-wins); daily sync via /api/cron/ma-hoa (CRON_SECRET, vercel.json "0 22 * * *"); source sheet 1PkbqzSaEF7W_LOrxxMLbgPokS71M0QNhIuA4IShnkOc (public, IMPORTRANGE A1:J1000 from private origin 1GijaY6fvs-uMK-BQoih1u0PNUThEcaEvcXJG0UsSEgo). Rules sheet 1GBXD-tuYK2wEdM8NAB5jfA6estotjFMB4T5DVP6RYDw.
   - Oracle: data/quy-chuan/danh-muc-hang-hoa.xlsx (3,311 codes, cols L–P expected Hãng/Dòng/LK/Xử lý/Ghi chú) + data/quy-chuan/quy-chuan-ma.csv (gitignored); `npx tsx scripts/test-product-codes.ts` → 100% match incl. Ghi chú, and via ma_hoa path.
   - Local commands: pgTAP `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db [file]`; migrate `... npx supabase migration up --local`; types `npx supabase gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --schema public > <scratch>/types.ts` then cp to src/types/database.types.ts; reapply edited function via `awk ... | docker exec -i supabase_db_rnpqgbuypmecxiatuulz psql -U postgres -q -v ON_ERROR_STOP=1` then `notify pgrst, 'reload schema'`; local API env via `npx supabase status -o env`. Tests: test-pure-functions.ts, test-excel-reader.ts, test-route-permissions.ts (needs dev server), test-product-codes.ts, npm run test:concurrency, npm run check. Dev server preview "kho-minh-vu", tab "seed".
   - Cloud project rnpqgbuypmecxiatuulz has migrations through 0084 (checked read-only via OpenAPI with service key). 0085–0087 only local.

3. Files and Code Sections (part C/B/A highlights):
   - C (branch feature/quy-chuan-ma-c, commits aff1f40, af28729, f3bd3e6): src/features/product-codes/lib/parse-product-code.ts (buildCodeDictionary, parseProductCode returning brand/brandCode/model/modelCode/part/partCode/finish/finishCode/finishFrom/status/issues[{field:"code"|"brand"|"model"|"part"|"finish",message}]/note; isSheetNumber for "đời"), lib/source-sheet.ts (SOURCE_HEADERS 10 cols, parseCsv, readSourceSheet, SourceSheetError), lib/sync-entries.ts (CodeEntry {loai,ma,ten,ma_hang,thu_tu}, toSyncEntries, dictionaryFromEntries), api/sync.server.ts (syncCodeDictionary("cron"|"tay")), src/app/api/cron/ma-hoa/route.ts, src/lib/env-server.ts getCodeSyncEnv, src/proxy.ts exempts /api/cron/, vercel.json, .env.example (CRON_SECRET, MA_HOA_SHEET_ID), migration 0085_ma_hoa.sql (ma_hoa, ma_hoa_dong_bo, dong_bo_ma_hoa with validations, `delete ... where true`), tests 103_ma_hoa_test.sql, CLAUDE.md trap 22, .gitignore data/quy-chuan, data/quy-chuan/README.md. Local .env.local has added CRON_SECRET.
   - B (branch feature/quy-chuan-ma-b, commits bfc63d9, 3f3c611): migration 0086_truong_quy_chuan.sql (drop loai_hang/dong_xe tables & loai_hang_id/dong_xe_id; add loai_hang HANG_HOA|COMBO, hang_xe, dong_xe, linh_kien (codes), mo_ta; cong_doan.ma_quy_chuan + 17 new rows, SON→S CARBON→CB XI_MA→X NANO→NM; ghi_chu_quy_chuan() + trigger tu_sinh_ghi_chu_san_pham "Thiếu: Hãng xe, Dòng xe, Linh kiện, Xử lý theo quy chuẩn"; backfill moved ghi_chu→mo_ta with session_replication_role replica; chi_tiet_san_pham returns ten_hang_xe/ten_dong_xe/ten_linh_kien/ma_xu_ly/mo_ta/loai_hang; nhap_danh_muc ghi_chu→mo_ta; nhap_ma_hang_moi accepts loai_hang, hang_xe, dong_xe, linh_kien, ma_xu_ly, mo_ta; dong_bo_ma_hoa auto-inserts cong_doan for new xu_ly). Test 104; updated tests 100, 102, 70, 61. UI: types.ts (ProductKind, PRODUCT_KIND_LABELS, ProductDetail brandCode/brandName/... finishCode, description, kind), schema (description, kind), product-detail.tsx, product-info-tab.tsx, product-expanded-detail.tsx, lookup manager tabs removed, new-product-import (kind, mo_ta), excel-template key mo_ta "Mô tả", read-catalog-file (mo_ta ?? ghi_chu), lib/product-expanded.ts standardFieldText(name, code).
   - A (branch feature/quy-chuan-ma-a):
     - Committed 5fbbdbb: supabase/migrations/0087_dien_quy_chuan.sql (san_pham.truong_chon_tay text[] check <@ {hang_xe,dong_xe,linh_kien,xu_ly}; nhat_ky_sua nguon adds 'quy_chuan'; dien_quy_chuan(p_dong jsonb) fills only empty fields, xử lý empty = cong_doan.ma_quy_chuan null, skips manual, returns {so_ma_doi}, co_quyen('tao_ma_hang'); danh_sach_san_pham recreated with p_quy_chuan ('du'|'thieu'|'chon_tay') and extra return cols loai_hang, hang_xe, dong_xe, linh_kien, ghi_chu, truong_chon_tay), tests 105_dien_quy_chuan_test.sql (13), types.
     - UNCOMMITTED (Task 2): 0087 file appended with chi_tiet_san_pham drop/recreate adding truong_chon_tay (applied locally); database.types.ts regenerated; src/features/products/lib/standard-fields.ts:
       ```ts
       export type StandardFieldKey = "hang_xe" | "dong_xe" | "linh_kien" | "xu_ly";
       export const STANDARD_FIELD_LABELS = {...};
       export type StandardValues = { brandCode; modelCode; partCode; stageId: string; manualFields: string[] };
       export function applyCodeToStandardFields(parsed, current, stages: {id, standardCode}[], fallbackStageId: string): StandardValues & { autoFields }
       // manual fields kept; others follow code; xu_ly: matched standard stage else if current stage is standard → fallbackStageId (MUA_NGOAI)
       export function toggleManual(fields, key, manual): string[]
       ```
       src/features/product-codes/api/code-dictionary.api.ts (fetchCodeEntries with fetchAllPages, codeDictionaryKeys), hooks/useCodeDictionary.ts (staleTime 30min, returns entries + dictionary); products/types.ts (ProductInput + brandCode, modelCode, partCode, manualFields; toProductInsert writes hang_xe/dong_xe/linh_kien/truong_chon_tay; ProductDetail.manualFields; StageLookupItem.standardCode); product.api fetchLookups selects ma_quy_chuan; schema adds brandCode/modelCode/partCode nullable strings + manualFields enum array; lib/product-expanded.ts toProductFormValues maps them (ProductFormSource manualFields string[]); components/standard-fields-section.tsx (useWatch all 4 fields, auto-fill only when code field dirty, issue messages per field, tags "Tự điền"/"Chọn tay", "Lấy lại theo mã", options with filterByLabel, dòng filtered by brand, Xử lý options show "(CB)" or "— ngoài quy chuẩn"); components/product-form-fields.tsx (17-field layout: Mã, Loại hàng, Tên, Nhóm, ĐVT, StandardFieldsSection, Kho mặc định, Vị trí kệ, Mô tả, Ghi chú alert read-only, Đang kinh doanh when editing; hidden quy đổi/min/max/barcode/bán trực tiếp/Cần rà alert); product-drawer.tsx slimmed to 230 lines using ProductFormFields (setValue added to useForm destructure; EMPTY_FORM includes new fields); product-classification-fields.tsx git rm'd; scripts/test-pure-functions.ts tests added/updated (payload hang_xe "H", dong_xe null, truong_chon_tay ["linh_kien"]; applyCodeToStandardFields cases incl. stale carbon reverted to st-mn; toggleManual).
   - Memory: /Users/hungly/.claude/projects/-Users-hungly-Desktop-Projects-kiotviet/memory/v11-deploy-pending.md updated (cloud up to 0084; 0085–0086(+0087) local; check .env.local local vs cloud before writes); MEMORY.md index line updated.

4. Errors and fixes:
   - Phase 15/16/etc. earlier errors already resolved (see commits).
   - C: GROUP BY error in dong_bo_ma_hoa (used min(ma)); parser mismatch "N1.4-6.3UNI" fixed via Sheets-like numeric coercion; PGRST202 because .env.local pointed dev server to CLOUD (rnpq...) lacking 0085 — tested sync against local via supabase status env; then `DELETE requires a WHERE clause` (pg_safeupdate) → `where true` + trap 22 in CLAUDE.md.
   - B: tests referencing old columns updated; search test failures caused by leftover local product "HA-75ĐOB-CB" named with "ZQX" → renamed to "Mã thử quy chuẩn (local)". nhat_ky_sua immutable (can't delete audit rows) — test product left in local DB.
   - A: Select values not reactive (used getValues) → useWatch; `bg-nen-trang` nonexistent → bg-gray-50; stale finish (Carbon kept when new code has no finish) → fallbackStageId logic + test; missing setValue in drawer destructure fixed; unused imports removed.
   - User checked out main accidentally; switched back to feature/quy-chuan-ma-b with untracked test intact.

5. Problem Solving:
   - Verified A Task 2 in browser (local DB): typing HA26-75-35-WRG-CB → HONDA/Air Blade/Mặt nạ/Carbon all "Tự điền"; YE15-03MLSĐOB → LK empty with reason, Xử lý → Mua ngoài; manual pick "mat na" → Mặt nạ (75) "Chọn tay"; retype YE15-03MLSĐOB-X keeps manual LK, Xử lý → Xi mạ; saved "Mã thử quy chuẩn A (local)" → DB: Y|E|75|XI_MA|{linh_kien}|ghi_chu null. Console clean. tsc/eslint/pure tests pass.

6. All user messages (this segment and earlier key ones):
   - "Em dựa vào app.notion.com/p/fa4c5f639055429185, giúp anh plan làm toàn bộ" ... (earlier phases; repeated "/spartan:quickplan phase N", "go", "đánh dấu Phase N vào ROADMAP, REQUIREMENTS và STATE luôn em")
   - "merge vô main đi em" (twice), "push lên đi em"
   - "giúp anh kiểm tra task này đã làm chưa? <Notion link Danh mục panel>"
   - (image) "anh muốn xem chi tiết như thế này" → answers: Dòng mở rộng như ảnh; tabs Thông tin, Mô tả ghi chú, Thẻ kho, Tồn kho; forecast columns for QL+VP; buttons Chỉnh sửa, Sao chép, Ngừng kinh doanh, Xem chi tiết; "go"
   - "/spartan:quickplan giúp anh plan làm task này "[Feature] Quy chuẩn mã hàng..."" → answers: 4 quickplan C→B→A→D; theo Notion thay Phase 15; Vercel Cron; ẩn Cần rà
   - "@"/Users/hungly/Downloads/Danh mục hàng hóa.xlsx" quy tắt tạo trường: https://docs.google.com/spreadsheets/d/1GBXD-tuYK2wEdM8NAB5jfA6estotjFMB4T5DVP6RYDw/edit?usp=sharing link gốc của quy chuẩn mã =IMPORTRANGE("https://docs.google.com/spreadsheets/d/1PkbqzSaEF7W_LOrxxMLbgPokS71M0QNhIuA4IShnkOc","Sheet1!A1:J1000")"
   - "go" (C), "Try again", "chạy mấy task rùi", "tiếp task 2 đi em" (interpreted as part B), answers: lưu mã hiện tên; giữ Ép/Mua ngoài ngoài quy chuẩn; giữ cột bán trực tiếp ẩn khỏi màn; "anh mới lỡ checkout về main, giúp anh back lại branch đang làm"; "go" (B); "anh đã đổi về db local"; "tiếp phần A đi em" → answers: nút trong app cho quản lý; chỉ điền ô trống, không đụng ô chọn tay; đổi tên Công đoạn→Xử lý khắp giao diện; "go".
   - Constraints in effect: don't apply migrations to cloud / push without asking; never put service_role key in NEXT_PUBLIC_*; don't send user email to services; never sign out of browser sessions (treat as user's); confirm destructive ops; commit messages end with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; PR bodies end with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".

7. Pending Tasks:
   - Part A: commit Task 2; Task 3 (table/detail 17 fields with brand/model/part names via dictionary, Quy chuẩn filter replacing Cần rà in filter panel/toolbar, hide Cần rà button/review alert/stage suggestions/ĐVT mâu thuẫn tags, detail/info hide quy đổi/định mức/barcode/bán trực tiếp, rename "Công đoạn"→"Xử lý" across UI strings; update filter schema/URL + toListRpcArgs to pass p_quy_chuan; toProductRow map new list columns); Task 4 (in-app "Điền quy chuẩn từ mã" modal: fetch all products, parse, preview counts, apply via dien_quy_chuan in chunks of 500, CSV of sai chuẩn codes with reasons; browser verify on local 3,266 codes; full test suite). Commit names planned: `feat(danh-muc): gõ mã tự điền hãng/dòng/linh kiện/xử lý`, `feat(danh-muc): màn sản phẩm 17 trường, lọc quy chuẩn`, `feat(danh-muc): điền quy chuẩn từ mã cho mã cũ`.
   - Part D (Combo) afterwards.
   - Open items: apply 0085–0087 to cloud (ask), CRON_SECRET on Vercel, merge branches C/B/A to main, Notion statuses update (offered), task chips (Excel export 1000 cap; coalesce holes).

8. Current Work:
   Executing part A Task 2 (form gõ mã tự điền + form 17 trường) on branch feature/quy-chuan-ma-a. All code written, tests green, browser-verified including save (DB row `Y|E|75|XI_MA|{linh_kien}|(trống)` for YE15-03MLSĐOB-X), console clean. Not yet committed; uncommitted files include supabase/migrations/0087_dien_quy_chuan.sql (appended chi_tiet_san_pham with truong_chon_tay), src/types/database.types.ts, src/features/product-codes/api/code-dictionary.api.ts, src/features/product-codes/hooks/useCodeDictionary.ts, src/features/products/lib/standard-fields.ts, components/standard-fields-section.tsx, components/product-form-fields.tsx, product-drawer.tsx, product-classification-fields.tsx (deleted), types.ts, schemas/product.schema.ts, api/product.api.ts, lib/product-expanded.ts, scripts/test-pure-functions.ts.

9. Optional Next Step:
   Run full pgTAP (since 0087 was amended) + tsc/eslint/pure tests, then commit Task 2 with message `feat(danh-muc): gõ mã tự điền hãng/dòng/linh kiện/xử lý`, and continue to Task 3 of the approved plan ("3. **Bảng / chi tiết 17 trường, bộ lọc Quy chuẩn, ẩn Cần rà, đổi tên Xử lý** → `feat(danh-muc): màn sản phẩm 17 trường, lọc quy chuẩn`"), per the user's "tiếp phần A đi em" and "go".
</summary>

## Git State
- Branch: feature/quy-chuan-ma-a
- Recent commits:
  5fbbdbb feat(db): đánh dấu chọn tay, lọc quy chuẩn, điền quy chuẩn hàng loạt
  1f2c5b4 feat(handoff): add auto-save context for Phase 14 planning of Kho Minh Vũ app
  3f3c611 feat(danh-muc): loại hàng Hàng hóa/Combo, mô tả, hiện hãng/dòng/linh kiện
  bfc63d9 feat(db): trường quy chuẩn mã hàng, 21 loại xử lý, ghi chú tự sinh
  f3bd3e6 feat(ma-hoa): đồng bộ bộ mã hóa hằng ngày từ Google Sheet
- Uncommitted changes:
  M scripts/test-pure-functions.ts
   M src/features/products/api/product.api.ts
  D  src/features/products/components/product-classification-fields.tsx
   M src/features/products/components/product-drawer.tsx
   M src/features/products/lib/product-expanded.ts
   M src/features/products/schemas/product.schema.ts
   M src/features/products/types.ts
   M src/types/database.types.ts
   M supabase/migrations/0087_dien_quy_chuan.sql
  ?? src/features/product-codes/api/code-dictionary.api.ts
  ?? src/features/product-codes/hooks/
  ?? src/features/products/components/product-form-fields.tsx
  ?? src/features/products/components/standard-fields-section.tsx
  ?? src/features/products/lib/standard-fields.ts

## Resume
Start a new session and say:
```
Read .handoff/auto-2026-10-03T06-17-kiotviet.md and continue where we left off.
```
