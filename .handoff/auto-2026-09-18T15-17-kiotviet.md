# Auto-Save: Context Compacted
Created: 2026-09-18T15:17:38.921Z
Session: 6b069423-ccff-4491-a747-1d23472ca790
Trigger: auto-compaction (context was getting full)

## Compact Summary
<analysis>
Let me chronologically work through this conversation to capture everything needed to continue.

**Context from prior summary (pre-compaction):** This session continues a Next.js 16 + Supabase warehouse management project ("Kho Minh Vũ") replacing KiotViet. Phase 1 (database foundation) was complete and verified. The user drives work via Spartan/GSD slash commands.

**Conversation flow in this session:**

1. Session started mid-`/spartan:phase discuss 2`. I asked the Office Hours 3 forcing questions via AskUserQuestion. User answered: all four pains, full 18-requirement scope, all four assumptions risky.

2. I then ran the discuss-phase workflow: read the workflow file, gathered context (REQUIREMENTS.md, 01-CONTEXT.md, existing src/ code, migrations), asked gray-area selection (user picked all 4 areas), then asked detailed questions in batches. Key answers:
   - Login: username + password (not email)
   - Account creation: manager creates with temp password
   - Menu: hide entirely if no permission
   - Numbering config: prefix + digit count
   - Departing staff: deactivate, don't delete
   - **Thủ kho: one OR MANY warehouses** (deviated from my recommendation → schema change)
   - Form: right-side drawer
   - Bulk review: ALL FOUR tools
   - Selling price: keep blocked
   - 8 conflicting ĐVT codes: put in "Cần rà" list
   - Cost price: manager + office only
   - Discontinued codes: only "Ngừng kinh doanh"
   - **Audit log: full per-change journal** (deviated from my recommendation)
   - Inline edit: công đoạn, nhóm hàng, ĐVT only
   - Excel: accept BOTH formats, update by code, preview-then-confirm, error on unknown lookup values
   - Ghi chú names: "Lẫn cả hai" (mixed customers and sales)
   - Partner history: include old KiotViet data

3. I queried the real database to analyze ghi chú values (923 invoices, 150 distinct values, ~20 short names, ~130 long shop names). User then interrupted an AskUserQuestion and said "Tiếp tục, với các câu hỏi cứ tự quyết định toàn bộ" (continue, decide all remaining questions yourself).

4. I wrote 02-CONTEXT.md (37 decisions D-01..D-37), 02-DISCUSSION-LOG.md, 02-WORK-UNITS.md (31 WUs), committed.

5. User ran `/spartan:phase plan 2`. I ran research (gsd-phase-researcher sonnet, accepted), which produced 02-RESEARCH.md with 4 key findings. I then found TWO research errors by checking the real DB:
   - Column-level REVOKE doesn't override table-level GRANT (verified: `authenticated` had table-level SELECT)
   - `signOut` takes JWT not userId (confirmed)
   - Verified postgres CAN delete auth.sessions
   - Verified "Cần rà" expression yields exactly 356
6. I wrote 02-VALIDATION.md and 21 plan files myself (user had rejected opus planner in Phase 1). Ran gsd-plan-checker (sonnet) → 2 blockers + 2 warnings → fixed all → re-verified → PASSED. Committed.

7. User ran `/spartan:phase execute 2`. I began spawning gsd-executor (sonnet) agents sequentially:
   - Plan 01 (multi-kho + immediate permission revocation): 98/98 pgTAP. Deviation: `any((select f()))` parses as ANY(subquery) → needs `::uuid[]` cast.
   - Plan 02 (audit log): 110/110. Deviations: reading nhat_ky_sua under authenticated blocked by design; `now()` constant in transaction.
   - Plan 03 (numbering config): 120/120. Deviation: self-check DO block in migration must not always raise.
   - Plan 04 (hide cost price): 131/131.
   - Plan 05 (app shell + login) — interrupted mid-Task-1, then resumed via new executor: completed, verified redirects with curl using real sessions.
   - Plan 06 executor spawn was **REJECTED by the user**, then user said "continue". I started to say I'd do it inline; user interrupted again.

8. Session restarted (date changed to 2026-09-18). User re-invoked `/spartan:phase execute 2`. I proceeded **inline** (no subagents).

9. **Major discovery:** When running the newly written test 41 against the cloud, assertions 1-10 passed — meaning `danh_sach_san_pham` already existed. Investigation revealed the cloud DB had migrations 0030–0036 applied, but the repo only had up to 0029. No other repo copy on the machine; not on any git branch. ListAgents revealed a cloud session named **"Plan 06 continuation"** had executed plans 06–08 against the same cloud database without leaving files.

10. I surfaced this to the user with AskUserQuestion. User chose: **"Tôi dựng lại file từ database"** (reconstruct files from the database).

11. I reconstructed migrations 0030–0036 from `pg_get_functiondef`, `pg_constraint`, `pg_policies`, `pg_indexes`, comments. Fixed two bugs: missing `;` after function definitions (two passes — first regex only caught `$function$` at line start; second pass handled `end $function$` inline). Validated each file by applying in a rolled-back transaction on cloud. Committed `b3dd55c`.

12. Wrote the missing pgTAP tests the other session never wrote: 41 (16), 42 (7), 51 (17), 61 (14), 62 (8) = 62 new assertions. Full suite: **193/193 green**. Verified real-data numbers: 364 Cần rà, 8 ĐVT conflicts, 145 suffix suggestions, 150 normalized ghi chú values. Wrote SUMMARYs for plans 06, 07, 08.

13. Plan 09 (gate): regenerated types (1577 lines), verify:hook 5/5, npm run check green, advisors reviewed (no new unexpected warnings), updated supabase/README.md with Phase 2 migration table + accepted advisor warnings, added 2 memory patterns, SUMMARY.

14. Plan 10: env-server.ts, admin.ts, nguoi-dung.schema.ts, nguoi-dung.actions.ts (4 server actions), doi-mat-khau page + form + ThongBaoMatKhauTam client component, layout redirect, query-client refresh-on-42501, kiem-tra-tai-khoan.ts (7 asserts). Fixed: diacritic variable name, lint warning for window.location.assign (disabled with justification).

15. Plan 11: types.ts, bo-loc.schema.ts, san-pham.keys.ts, san-pham.api.ts, useSanPham.ts, lich-su-sua.api.ts, 10 new asserts. Two bugs caught by asserts: `Number(null)===0` clamping page size to 10; "tất cả" filter needing explicit null.

16. Plan 12: moved tách ĐVT + Excel cell reader to src/shared/lib, scripts re-export, mau-excel.ts, doc-file-danh-muc.server.ts, kiem-tra-doc-excel.ts (verified on REAL KiotViet file: 3266 rows, 26 Kho 2 codes, round-trip), two route handlers (nhap-excel, mau-excel), curl-verified 401s. Fixed: tsx compiles CJS so no top-level await (wrapped in async main).

17. User said "tiếp tục plan 13". I checked antd v6 Drawer API (`size` accepts number, `destroyOnHidden`, `mask.closable` instead of `maskClosable`), then wrote: ngan-keo-form.tsx (shared), doi-tac/types.ts, doi-tac.schema.ts, doi-tac.keys.ts, doi-tac.api.ts, useDoiTac.ts. Typecheck passed. Remaining for plan 13 Task 2: bang-doi-tac.tsx, ngan-keo-doi-tac.tsx, and the real /doi-tac page (currently a ChuaTrienKhai placeholder).

**Security constraints stated by the user / in project files (must preserve):**
- Never print secrets; service_role key never in NEXT_PUBLIC_*
- data/kiotviet/*.xlsx is real business data, never commit
- Don't touch PO DB
- Never run db reset on the cloud DB; never delete business data
- Apply migrations only with `npm run db:push`, never MCP apply_migration
- Ask before installing new libraries

Now for the summary, I need full technical detail on the reconstruction work, tests, and the in-progress plan 13.
</analysis>

<summary>
1. **Primary Request and Intent:**
   - Build "Kho Minh Vũ" — a Next.js 16 + Supabase warehouse system replacing KiotViet for CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ. Driven by Spartan/GSD commands: `/spartan:phase discuss 2` → `plan 2` → `execute 2`.
   - **Phase 2 scope (18 requirements):** AUTH-01/02/07, DMUC-01..07, DTAC-01..03, DLIEU-04, CDAT-01..04 — login + app shell by role, 3.266-product catalog (server-side table, search, CRUD, detail + thẻ kho, bulk review tools, Excel import/export), partners (NCC + customers extracted from KiotViet Ghi chú), and Settings (users, warehouses, sub-catalogs, document numbering).
   - User repeatedly told me to decide open questions myself: **"Tiếp tục, với các câu hỏi cứ tự quyết định toàn bộ"**.
   - User rejected spawning an executor subagent for plan 06; after that I execute plans **inline** in this session (no subagents).
   - User's most recent instructions: "tiếp tục plan 11", "tiếp tục plan 12", "tiếp tục plan 13".

2. **Key Technical Concepts:**
   - Next.js 16 App Router (`src/proxy.ts` not middleware.ts; `params` is a Promise), React 19, antd v6.6, Tailwind v4, TanStack Query v5, RHF + Zod v4, exceljs 4.4, @supabase/ssr 0.12.
   - Supabase cloud project `kho-vu-tru` ref `phonzyruoalimgaovljm` — the ONLY database, holds REAL data (3.266 products). No local stack.
   - pgTAP via psql (Docker often unavailable); each test file wraps `begin; select plan(N); … select * from finish(); rollback;`.
   - RLS + SECURITY DEFINER RPCs with explicit role checks; column-level GRANTs; append-only ledger/audit patterns.
   - Key Phase 2 architecture decisions: username→`@khominhvu.local` email; helpers compare JWT claim against DB tables (demotion immediate, promotion on token refresh); `revoke select on table` + `grant select (cols)` to hide `gia_von`; Excel parsed server-side only.

3. **Files and Code Sections:**

   **Planning artifacts (all committed):**
   - `.planning/phases/02-khung-ung-dung/02-CONTEXT.md` — 37 locked decisions D-01..D-37 (login by username, temp passwords, hide menus, prefix+digits numbering, multi-warehouse thủ kho, drawer forms, 4 bulk-review tools, keep price block, cost price for manager+office only, full audit journal, both Excel formats, mixed customer/sale names, KiotViet history in thẻ kho and partner history).
   - `.planning/phases/02-khung-ung-dung/02-RESEARCH.md` (961 lines), `02-VALIDATION.md`, `02-WORK-UNITS.md`, `02-DISCUSSION-LOG.md`.
   - `02-01-PLAN.md` … `02-21-PLAN.md` — 21 plans across 9 waves (01/03/04/05 w1; 02/06 w2; 07/08 w3; 09 w4; 10/11/12/13 w5; 15/16/18 w6; 14/17/19 w7; 20 w8; 21 w9).
   - SUMMARYs written: 02-01 … 02-12 (06/07/08 written by me documenting the other session's work).

   **Reconstructed migrations (commit `b3dd55c`)** — `supabase/migrations/0030_danh_sach_san_pham.sql`, `0031_the_kho_san_pham.sql`, `0032_doi_tac.sql`, `0033_ra_ghi_chu_lich_su.sql`, `0034_import_danh_muc.sql`, `0035_ra_hang_loat.sql`, `0036_sua_search_path.sql`. Each carries a header explaining it was rebuilt from the live catalog.

   **New pgTAP tests (mine):** `supabase/tests/41_danh_sach_san_pham_test.sql` (16), `42_the_kho_test.sql` (7), `51_doi_tac_ghi_chu_test.sql` (17), `61_import_danh_muc_test.sql` (14), `62_ra_hang_loat_test.sql` (8). Total suite = 193 assertions, all green.

   **Plan 10 files:**
   - `src/lib/env-server.ts` — lazy-parsed `SUPABASE_SERVICE_ROLE_KEY`, `import "server-only"`.
   - `src/lib/supabase/admin.ts` — `createSupabaseAdminClient()` only for `auth.admin.*` + `thu_hoi_phien_nguoi_dung`.
   - `src/features/cai-dat/schemas/nguoi-dung.schema.ts` — `taoNguoiDungSchema`, `capNhatNguoiDungSchema`, `datLaiMatKhauSchema`, `doiMatKhauSchema`.
   - `src/features/cai-dat/actions/nguoi-dung.actions.ts` — `taoNguoiDung`, `capNhatNguoiDung`, `doiTrangThaiNguoiDung`, `datLaiMatKhau`; `layPhienQuanLy()` verifies caller via `getUser()` + table; writes profile with the manager's own client so the audit trigger records `auth.uid()`; rolls back the Auth user if profile insert fails; `KHOA_VO_THOI_HAN = "876000h"`.
   - `src/app/doi-mat-khau/page.tsx`, `src/features/xac-thuc/components/form-doi-mat-khau.tsx`, `thong-bao-mat-khau-tam.tsx`.
   - `src/app/(app)/layout.tsx` — added `if (nd.phaiDoiMatKhau) redirect("/doi-mat-khau");`
   - `src/providers/query-client.ts` — `lamMoiPhienMotLan()` + QueryCache/MutationCache onError refresh on `khong-du-quyen`.

   **Plan 11 files:** `src/features/danh-muc/types.ts`, `schemas/bo-loc.schema.ts` (`docBoLocTuUrl`, `ghiBoLocRaUrl`, `thamSoRpc`, `BO_LOC_MAC_DINH`), `api/san-pham.keys.ts`, `api/san-pham.api.ts` (11 functions, all `if (error) throw error`, explicit column lists, `boGiaBanNeuKhongDuQuyen`), `hooks/useSanPham.ts` (9 hooks), `src/shared/api/lich-su-sua.api.ts`.

   **Plan 12 files:** `src/shared/lib/tach-dvt-cong-doan.ts` (moved, now uses `boDau`), `src/shared/lib/o-excel.ts` (`docSheetDau(path|Buffer)` returning `{tenCot, tenCotGoc, dong}`, stream reader with `styles:"ignore"`), `scripts/import-kiotviet/{tach-dvt-cong-doan,doc-file}.ts` (re-export shims), `src/features/danh-muc/lib/mau-excel.ts` (`COT_MAU` 15 columns, `DongNhap`, `DongXuat`, `GIOI_HAN_FILE_MB = 5`), `src/features/danh-muc/lib/doc-file-danh-muc.server.ts` (`docFileDanhMuc`, `taoFileMau`, `nhanDang`, `dongKiotViet` with `cong_doan: tach.suyDuoc ? tach.maCongDoan : null` + `cong_doan_khi_tao_moi: "MUA_NGOAI"`), `scripts/kiem-tra-doc-excel.ts`, `src/app/api/danh-muc/nhap-excel/route.ts`, `src/app/api/danh-muc/mau-excel/route.ts` (both `export const runtime = "nodejs"`).

   **Plan 13 files written so far:**
   - `src/shared/components/ngan-keo-form.tsx` — shared Drawer wrapper: `size={toanManHinh ? "100%" : 560}`, `destroyOnHidden`, `closable={!dangLuu}`, `mask={{ closable: !dangLuu }}`, footer Hủy/Lưu.
   - `src/features/doi-tac/types.ts` — `LoaiDoiTac`, `DongDoiTac`, `ChiTietDoiTac`, `DongLichSuGiaoDich`, `NHAN_LOAI_DOI_TAC`, `MAU_LOAI_DOI_TAC`, `BoLocDoiTac`, `BO_LOC_DOI_TAC_MAC_DINH`.
   - `src/features/doi-tac/schemas/doi-tac.schema.ts` — `doiTacSchema` (ma uppercase regex, ten, loai enum, phone regex, email union, optional fields → null, dang_hoat_dong).
   - `src/features/doi-tac/api/doi-tac.keys.ts` — `khoaDoiTac` (tatCa, danhSach, chiTiet, lichSu, maGoiY).
   - `src/features/doi-tac/api/doi-tac.api.ts` — `docBoLocDoiTac`, `ghiBoLocDoiTac`, `layDanhSachDoiTac` (explicit null for "tat_ca"), `layChiTietDoiTac`, `goiYMaDoiTac`, `luuDoiTac`, `layLichSuGiaoDich`.
   - `src/features/doi-tac/hooks/useDoiTac.ts` — `useDanhSachDoiTac`, `useChiTietDoiTac`, `useGoiYMaDoiTac` (staleTime/gcTime 0), `useLuuDoiTac`, `useLichSuGiaoDich`.
   - `src/app/(app)/doi-tac/page.tsx` still a `ChuaTrienKhai` placeholder — must be replaced.

4. **Errors and fixes:**
   - **`any((select f()))` mis-parsed** as ANY(subquery) → `42883 uuid = uuid[]`; fix: `= any((select public.kho_hien_tai())::uuid[])`.
   - **pgTAP false pass:** reading `auth.users` while role is `authenticated` throws 42501, same code as RLS denial; fix: resolve ids as postgres into temp tables + `grant select … to authenticated`, and call `pg_temp.dang_xuat()` before switching accounts.
   - **`now()` constant in a pgTAP transaction** → "latest by timestamp" assertions unreliable; assert exact content instead.
   - **Self-check DO block in a migration that always raises** would roll back the whole migration; make it raise only on real failure.
   - **Column-level REVOKE doesn't override table-level GRANT** (research was wrong) → `revoke select on table` + `grant select (cols)`; also broke `tim_san_pham` (`select sp.*`) which had to be dropped/recreated with explicit columns.
   - **Missing `;` after `pg_get_functiondef` output** when rebuilding migrations; fixed in two passes (line-start `$function$`, then inline `end $function$`).
   - **`Number(null) === 0`** made missing URL params clamp to minimum (page size 10 instead of 50); fixed by null/empty check before `Number()`.
   - **"Tất cả" filter** must send `p_dang_kinh_doanh: null` explicitly, else the RPC default `true` silently hides discontinued codes.
   - **tsx compiles CJS** → top-level `await` fails; wrapped `scripts/kiem-tra-doc-excel.ts` in `async function main()`.
   - **ESLint `no-location-assign-relative-destination`** → kept `window.location.assign` with an inline eslint-disable plus justification (full reload needed to drop stale query cache).
   - **Diacritic identifier `hạQuyenQuanLy`** → renamed `haQuyenQuanLy` (project convention: no-diacritics identifiers).
   - **Plan-checker blockers (pre-execution):** plan 02 had a hidden same-wave dependency on plan 01 (fixed: wave 2 + `depends_on`, unconditional trigger); plan 01 left 3 pre-existing scalar `kho_hien_tai()` comparisons in test 30 (fixed with explicit rewrite step).

5. **Problem Solving:**
   - **Cross-session collision (biggest issue):** a cloud session "Plan 06 continuation" had applied migrations 0030–0036 to the shared cloud DB with no files in the repo. User chose reconstruction; I rebuilt all 7 files from the catalog, validated each in rolled-back transactions, and `supabase migration list --linked` now shows local==remote 0001–0036. Documented in `supabase/README.md` with a warning that only ONE session should run `db push`.
   - Wrote the 62 missing test assertions proving the other session's implementation matches the plans.
   - Verified real-data invariants: 364 Cần rà, 8 ĐVT conflicts, 145 suffix suggestions, 150 normalized ghi chú values, 26 Kho 2 codes, 3.266 rows read from the real KiotViet file.
   - Advisors reviewed: 17 SECURITY DEFINER functions callable by `authenticated` (intentional, each checks role), `nhat_ky_sua` RLS-without-policy (intentional), leaked-password protection (pre-go-live).

6. **All user messages:**
   - (AskUserQuestion answers) Pains: all four. Scope: "Đủ 18 yêu cầu như roadmap". Risks: all four.
   - (AskUserQuestion answers) Discuss areas: all four selected.
   - (AskUserQuestion answers) Login: "Tên đăng nhập + mật khẩu"; account creation: "Quản lý tạo, đặt mật khẩu tạm"; menu: "Ẩn hẳn"; numbering: "Tiền tố + số chữ số".
   - (AskUserQuestion answers) Departing staff: "Vô hiệu hóa, không xóa"; warehouses per user: "Một hoặc nhiều kho".
   - (AskUserQuestion answers) Form: "Ngăn kéo bên phải"; bulk review: all four tools; price: "Giữ chặn, quản lý đặt sau"; 8 ĐVT codes: "Đưa vào danh sách 'Cần rà'".
   - (AskUserQuestion answers) Cost price: "Quản lý + văn phòng"; discontinue: "Chỉ 'Ngừng kinh doanh'"; audit: "Nhật ký từng lần sửa"; inline edit: "Công đoạn, nhóm hàng, ĐVT".
   - (AskUserQuestion answers) Excel: "Nhận cả hai"; "Cập nhật theo mã"; "Xem trước rồi xác nhận"; "Báo lỗi dòng".
   - (AskUserQuestion answers) Short names: "Lẫn cả hai"; partner history: "Gồm cả dữ liệu cũ".
   - "Tiếp tục, với các câu hỏi cứ tự quyết định toàn bộ"
   - `/spartan:phase plan 2`
   - `/spartan:phase execute 2` (three times across restarts)
   - "Continue from where you left off." / "continue" (several times, including after rejecting the plan-06 executor spawn)
   - (AskUserQuestion answer) Cloud-session collision: "Tôi dựng lại file từ database"
   - "tiếp tục plan 11"
   - "tiếp tục plan 12"
   - "tiếp tục plan 13"
   - **Security constraints carried through the session:** never paste/print secrets (service role key, DB password); service_role never in `NEXT_PUBLIC_*`; `data/kiotviet/*.xlsx` is real business data, never commit; don't touch the PO DB; never `db reset` on cloud or delete business data; apply migrations only via `npm run db:push` (never MCP `apply_migration`); ask before installing new libraries.

7. **Pending Tasks:**
   - Finish plan 13 Task 2: `bang-doi-tac.tsx`, `ngan-keo-doi-tac.tsx`, real `/doi-tac` page, then `npm run check`, SUMMARY, commit.
   - Plans 14–21: Cài đặt người dùng UI (14), Cài đặt kho/danh mục phụ/số CT + migration 0040 (15), bảng danh mục + drawer sản phẩm (16), chi tiết mã + chi tiết đối tác + lịch sử sửa (17), màn Rà ghi chú (18), công cụ rà hàng loạt + route xuất Excel (19), luồng nhập Excel (20), plan tích hợp cuối + `scripts/kiem-tra-quyen-route.ts` (21).
   - Then `/spartan:phase verify 2`.

8. **Current Work:**
   Executing plan 13 (màn Đối tác) inline. I verified antd v6 Drawer API in `node_modules/antd/es/drawer/Drawer.d.ts` (`size?: sizeType | number | string`, `destroyOnHidden`, `maskClosable` deprecated in favor of `mask.closable`) and Table `rowSelection.preserveSelectedRowKeys`. Task 1 is complete and typechecks cleanly: `src/shared/components/ngan-keo-form.tsx`, plus `src/features/doi-tac/{types.ts, schemas/doi-tac.schema.ts, api/doi-tac.keys.ts, api/doi-tac.api.ts, hooks/useDoiTac.ts}`. The last command run was `npx tsc --noEmit` which produced no output (clean). Nothing from plan 13 has been committed yet.

9. **Optional Next Step:**
   Complete plan 13 Task 2 per the plan: "**`bang-doi-tac.tsx`** (`"use client"`): Bộ lọc từ `useSearchParams()` → `docBoLocDoiTac`; đổi bộ lọc → `router.replace(pathname + "?" + ghiBoLocDoiTac(b))` … `Table` `rowKey="id"`, `size="small"`, `scroll={{ x: 900 }}` … Cột: Mã (link `/doi-tac/[id]`), Tên, Loại (`Tag` màu…), Điện thoại, Địa chỉ (ellipsis), Trạng thái…" and "**`ngan-keo-doi-tac.tsx`** … RHF + `zodResolver(doiTacSchema)` … mã PostgREST `23505` → `setError("ma", { message: "Mã này đã có. Dùng mã khác." })`", replacing the `ChuaTrienKhai` placeholder in `src/app/(app)/doi-tac/page.tsx` with `yeuCauQuyen("xem_danh_muc")` + `<BangDoiTac coQuyenSua={…} />`, then run `npm run check`, write `02-13-SUMMARY.md`, and commit.
</summary>

## Git State
- Branch: main
- Recent commits:
  70cc92b feat(02-12): Excel một nguồn logic, đọc ở server, hai route handler
  6619d7d feat(02-11): lớp dữ liệu danh mục — kiểu, bộ lọc URL, API, hook
  8c6ec2d docs(02-10): summary quản trị tài khoản phía server
  f6116af feat(02-10): quản trị tài khoản phía server và bắt đổi mật khẩu lần đầu
  ab6201f docs(02-09): chốt cổng chặn — 193 pgTAP xanh, types sinh lại, hai bài học vào bộ nhớ
- Uncommitted changes:
  ?? src/features/doi-tac/
  ?? src/shared/components/ngan-keo-form.tsx

## Resume
Start a new session and say:
```
Read .handoff/auto-2026-09-18T15-17-kiotviet.md and continue where we left off.
```
