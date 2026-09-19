# Auto-Save: Context Compacted
Created: 2026-09-19T05:04:49.663Z
Session: 6b069423-ccff-4491-a747-1d23472ca790
Trigger: auto-compaction (context was getting full)

## Compact Summary
<analysis>
Let me work through this conversation chronologically.

**Context inherited from prior summary:** The session is building "Kho Minh Vũ", a Next.js 16 + Supabase warehouse system replacing KiotViet for CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ. Phase 1 (data foundation) and most of Phase 2 were already complete. The conversation picks up mid-Phase-2 execution (plan 13).

**Segment 1 — Finishing plan 13 (Đối tác screen):**
I wrote `ngan-keo-doi-tac.tsx`, then `thanh-loc-doi-tac.tsx`, `bang-doi-tac.tsx`, and the real `/doi-tac` page. Errors encountered: RHF resolver type mismatch (fixed with `useForm<DoiTacForm, undefined, DoiTacLuu>`), lint `react-hooks/set-state-in-effect` (fixed by adjusting state during render), `watch()` lint warning (fixed with `useWatch`). Verified via anon-client script: mã gợi ý KH000001, 23505 duplicate, thukho1 blocked 42501. Committed `bd17119`.

**Segment 2 — User says "tiếp tục toàn bộ plan còn lại":**
I executed plans 15, 16, 18, 14, 17, 19, 20, 21 in wave order, inline (no subagents). Key work:
- Plan 15: migration 0040 (DELETE policies, `chan_doi_ma_he_thong` trigger, check constraint), test 63, Cài đặt layout/tabs, `danh-muc-phu.api.ts` with narrow type facade, số chứng từ screen.
- Plan 16: bảng danh mục, cot-san-pham, thanh-loc, ngan-keo-san-pham; dropped `z.coerce.number()`.
- Plan 18: rà ghi chú (150 values), `useSyncExternalStore` for localStorage tip.
- Plan 14: Cài đặt → Người dùng; split `hoSoNguoiDungSchema`.
- Plan 17: chi tiết mã hàng/đối tác, `lich-su-sua.tsx`.
- Plan 19: rà hàng loạt, xuất Excel; **found real exceljs stream-reader bug** (files exceljs itself writes fail to read at 100–1200 rows) → added workbook fallback in `o-excel.ts`.
- Plan 20: nhập Excel 3 bước; BOM assertion had to check bytes not string because `blob.text()` strips BOM.
- Plan 21: `scripts/kiem-tra-quyen-route.ts` (45/45), CLAUDE.md traps 5–7, memory updates.

**Segment 3 — `/spartan:phase verify 2`:**
Created `02-UAT.md` with 16 tests. User said "anh đã start server, tự verify đi". I ran route matrix + server-side HTML sweep. I refused to type the password into the login form (safety rule), asked user to log in; user asked "mật khẩu là gì?" — I told them it's in `.env.local` under `SEED_USER_PASSWORD` and did NOT print it. After they logged in, I found 5 real defects:
1. `/cai-dat` runtime crash — `tabDauTien` client function called from Server Component (blocker)
2. `instanceof PostgrestError` always false (major) — root cause: supabase-js only constructs PostgrestError with `.throwOnError()`
3. `chi_tiet_san_pham` called with empty id → 3× HTTP 400 (retries because `nenThuLai` also used instanceof)
4/5. antd v6 deprecated props (Dropdown.Button, maskClosable, Select null value, Descriptions span, Alert.message ×17)
Fixed all, re-verified, wrote `.memory/patterns/nextjs-antd-supabase-ui.md`, then user asked to record lessons in a file → added CLAUDE.md traps 8–12 plus Bước 7 checklist item.

Then user asked to verify remaining 2 tests (13, 15) after logging in as quanly. Those passed. I then corrected UAT count bookkeeping twice (regex replacements hadn't matched; test 16's note got pasted from test 5).

**Segment 4 — `/spartan:phase discuss 3`:**
Office Hours 3 questions asked via AskUserQuestion. Answers: all 4 pains; full 8 requirements; all 4 assumptions could be wrong. Then measured real data: 594/594 KiotViet import rows have NO price, 3.268/3.268 products have gia_von = 0. Asked 8 more questions across 2 batches. Decisions: D-01 leave 0; D-02 RPC `dat_gia_von_dau_ky`; D-03 clean price; D-04 require price > 0; D-05 **kho per line**; D-06 desktop only; D-07 keyboard flow; D-08 no approval step; D-09 server draft from first row; D-10 separate number series; D-11 only quản lý cancels posted slip; D-12 reason required; D-13 no block on negative stock; D-14 print without prices. Photo capture deferred to Phase 4. Wrote 03-CONTEXT.md + 03-WORK-UNITS.md.

**Segment 5 — `/spartan:phase plan 3`:**
Researched by reading migrations 0011/0012/0016 and tests 10/20 directly. Found: `huy_chung_tu` doesn't need changing (reverses from kho_movement); thủ kho read policy filters by header → would hide slips; D-11 would break test 20 line 180 (runs as vanphong). Wrote 03-RESEARCH.md, 13 plan files. Self-check found 3 same-wave dependencies → recomputed to 8 waves. Committed `bef9f73`.

**Segment 6 — `/spartan:phase execute 3 Chạy toàn bộ tất cả các plan`:**
Discovered another session had made 9 commits (design system rework, horizontal nav + bottom tabs, `BoCucDanhSach` list layout). Updated plans 06/08/13 to match new conventions, then executed all 13 plans:
- 0041 kho per line → caused **infinite RLS recursion** → 0042 fix with SECURITY DEFINER helper. Also had to fetch live policy from `pg_policies` because file 0016 was stale (kho_hien_tai returns array).
- 0043 nguon_nhap + (loai_ct, nguon) keys → spillover: `where loai_ct = X` now matches 2 rows → fixed Cài đặt screen + test 80.
- 0044 dat_gia_von_dau_ky + test 91 (had to read gia_von via RPC, nhat_ky_sua as postgres).
- 0045 RPCs; test 21/22 exposed a **false pass** I created (thukho2 has K1+K2) → fixed by reassigning warehouse inside transaction.
- 0046 D-11 + test 20 → 20 assertions.
- 0047 sinh_so_ct SECURITY DEFINER (discovered when creating a slip failed with 42501 on chuoi_so_ct) → 0048 relaxed role check because it killed 34 assertions in tests 20/80.
- Full E2E on real DB with test products: PNM26-000001, tồn K1=10/K2=20, giá vốn 0→5.000/10.000, vanphong blocked, quanly cancelled, giá vốn stays.
- Also discovered my assert counter lied (only counted `not ok`, missed aborted files) → now counts ERROR too.
Final: 225 pgTAP, 65/65 route cells, check exit 0. Wrote 03-SUMMARY.md.

**Segment 7 — `/spartan:phase verify 3` (current):**
Created 03-UAT.md with 12 tests. Browser session still had quanly logged in. Ran through tests at 1440px viewport. Found 3 defects:
1. **Test 5 (major):** Enter in mã hàng field doesn't select (field became "PN-UAT-A7"); Enter in Số lượng doesn't move focus (field became "725000"). Mouse works.
2. **Test 4 (minor):** "Người tạo: —" — nguoi_tao_id never set.
3. **Test 9 (minor):** print CSS only hides the print button; app shell still prints.
9 tests passed, including ghi sổ (tồn K1=7, giá vốn 0→25.000), hủy phiếu with validation, permissions.

User said "sửa hết đi rồi verify lại". I then:
- Added `onInputKeyDown` handler + controlled `searchValue={q}` to `o-tim-ma-hang.tsx`
- Replaced `onPressEnter` with `onKeyDown` in both InputNumbers in `bang-dong-nhap.tsx`
- Migration 0049: `alter table chung_tu alter column nguoi_tao_id set default auth.uid()` (+ don_dat_hang)
- Added `data-khong-in` convention: globals.css `@media print` rule, attributes on top-nav header, thanh-tab-day nav, and the print template's button
- `npm run check` exit 0

Re-verification: created slip PNM26-000002 — **"Người tạo: Quản lý demo" now shows correctly** (fix #3 works). But the keyboard flow is STILL broken: typed "PN-UAT-A", waited 4s, dropdown showed 2 options, pressed Enter → nothing happened (field still "PN-UAT-A", dropdown still open). I was investigating whether antd v6 forwards `onInputKeyDown`: confirmed `onInputKeyDown` exists in `@rc-component/select/lib/BaseSelect/index.d.ts:126`, and antd's Select spreads `...props` at `node_modules/antd/es/select/index.js:178`. I was inspecting lines 165-185 of that file when the summary was requested.

Security constraints to preserve: never print/paste secrets (service role key, DB password, SEED_USER_PASSWORD); service_role never in NEXT_PUBLIC_*; `data/kiotviet/*.xlsx` is real business data, never commit; don't touch the PO DB; never `db reset` on cloud or delete business data; apply migrations only via `npm run db:push` (never MCP apply_migration); ask before installing new libraries; Claude does not type passwords into login fields.
</analysis>

<summary>
1. **Primary Request and Intent:**
   - Build "Kho Minh Vũ" — Next.js 16 + Supabase warehouse system replacing KiotViet for CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ — driven by Spartan/GSD slash commands.
   - **Phase 2** (app shell, danh mục, đối tác, cài đặt): finish plan 13, then "tiếp tục toàn bộ plan còn lại" (plans 14–21), then `/spartan:phase verify 2`, fix all UAT defects, and record the lessons in a file so they aren't repeated.
   - **Phase 3** (Phiếu nhập): `/spartan:phase discuss 3` → `plan 3` → `execute 3 Chạy toàn bộ tất cả các plan` → `verify 3`, then "sửa hết đi rồi verify lại" (fix all UAT defects and re-verify).
   - User repeatedly delegates decisions ("cứ tự quyết định toàn bộ") and expects Claude to self-verify ("tự verify đi") rather than asking the user to click through.

2. **Key Technical Concepts:**
   - Next.js 16 App Router (`src/proxy.ts` not middleware; `params` is a Promise), React 19, antd v6.6, Tailwind v4, TanStack Query v5, RHF + Zod v4, exceljs 4.4, @supabase/ssr.
   - Supabase cloud project `kho-vu-tru` (ref `phonzyruoalimgaovljm`) — ONLY database, holds REAL data (3.266 products). Migrations applied only via `npm run db:push`.
   - pgTAP run via `psql "$DATABASE_URL" -f <file>`; each test wraps `begin; select plan(N); … select * from finish(); rollback;` with a copied helper block (`pg_temp.dang_nhap_nhu`, `dang_xuat`, `sp_test`, `kho_id`).
   - RLS + SECURITY DEFINER RPCs with explicit role checks; column-level GRANTs hide `gia_von`; append-only `kho_movement` ledger; moving weighted-average cost computed by DB trigger.
   - Phase 3 concepts: kho per document line (`chung_tu_dong.kho_id` nullable + `coalesce`), separate numbering series keyed `(loai_ct, nguon)`, `dat_gia_von_dau_ky` RPC.
   - UI conventions introduced by a parallel session: `BoCucDanhSach` (filter panel left / table right / mobile drawer), `panel-loc-*.tsx` + `thanh-cong-cu-*.tsx` + `noi-dung-bang-*.tsx`, `HangTongCong`, `MUC_DIEU_HUONG` in `src/shared/lib/dieu-huong.ts`, design tokens `rounded-the`, `bg-nen-the`, `shadow-the`, `bg-nen-tong`, `text-chu-phu`.

3. **Files and Code Sections:**

   - **`src/shared/lib/errors.ts`** — central error translation. Rewritten to stop using `instanceof PostgrestError`:
     ```ts
     export type LoiPostgrest = { code: string; message: string; details?: string | null; hint?: string | null };
     export function laLoiPostgrest(e: unknown): e is LoiPostgrest {
       if (!e || typeof e !== "object") return false;
       const o = e as Record<string, unknown>;
       return typeof o.code === "string" && typeof o.message === "string";
     }
     export function maLoi(e: unknown): string | null { return laLoiPostgrest(e) ? e.code : null; }
     ```
   - **`src/features/cai-dat/lib/tab-cai-dat.ts`** (new) — pure module holding `TAB_CAI_DAT`, `tabCuaVaiTro`, `tabDauTien`; fixed the `/cai-dat` blocker where a Server Component called a client function.
   - **`src/shared/lib/o-excel.ts`** — added `docBangWorkbook` fallback (with `ignoreNodes: ["styles"]`) because exceljs's stream reader fails on files exceljs itself wrote at 100–1200 rows.
   - **`supabase/migrations/0041_kho_theo_dong.sql`** — `chung_tu_dong.kho_id` nullable, `_ghi_so_nhap` and the negative-stock check use `coalesce(p_dong.kho_id, p_ct.kho_id)`, plus widened read policy.
   - **`supabase/migrations/0042_sua_de_quy_policy_chung_tu.sql`** — `phieu_co_dong_thuoc_kho_hien_tai(uuid)` SECURITY DEFINER to break the RLS recursion between `chung_tu` and `chung_tu_dong`.
   - **`supabase/migrations/0043_so_phieu_nha_may.sql`** — `nguon_nhap` enum, `chung_tu.nguon_nhap`, `cau_hinh_so_ct`/`chuoi_so_ct` keyed by `(loai_ct, nguon)`, `sinh_so_ct(p_loai, p_nam, p_nguon)` (dropped old 2-arg version first to avoid ambiguity).
   - **`supabase/migrations/0044_gia_von_dau_ky.sql`** — `dat_gia_von_dau_ky(p_du_lieu jsonb, p_chi_kiem_tra boolean)`; three guards (quan_ly only, only when `gia_von = 0`, explicit audit insert since trigger 0027 skips `gia_von`); added `'gia_von_dau_ky'` to `nhat_ky_sua_nguon_check`.
   - **`supabase/migrations/0045_rpc_chung_tu.sql`** — `danh_sach_chung_tu`, `chi_tiet_chung_tu`, `dong_chung_tu` (two functions instead of one jsonb so TypeScript types are real).
   - **`supabase/migrations/0046_chi_quan_ly_huy_nhap.sql`** — adds to `huy_chung_tu`:
     ```sql
     if v_ct.loai_ct = 'NHAP' and v_ct.trang_thai = 'HOAN_THANH'
        and (select public.vai_tro_hien_tai()) <> 'quan_ly' then
       raise exception 'Chỉ quản lý được hủy phiếu nhập đã ghi sổ' using errcode = '42501';
     end if;
     ```
   - **`supabase/migrations/0047_sinh_so_ct_definer.sql` / `0048_sinh_so_ct_cho_phep_script.sql`** — made `sinh_so_ct` SECURITY DEFINER, then relaxed the role check to only block `chi_xem` (blocking null broke 34 assertions).
   - **`supabase/migrations/0049_nguoi_tao_chung_tu.sql`** (newest) —
     ```sql
     alter table public.chung_tu alter column nguoi_tao_id set default auth.uid();
     alter table public.don_dat_hang alter column nguoi_tao_id set default auth.uid();
     ```
   - **`src/features/nhap-kho/components/o-tim-ma-hang.tsx`** — product search Select; just modified to add controlled `searchValue={q}` and:
     ```tsx
     onInputKeyDown={(e) => {
       if (e.key !== "Enter") return;
       const ds = ket_qua.data ?? [];
       if (ds.length === 0) return;
       e.preventDefault();
       e.stopPropagation();
       onChon(ds[0]);
       setQ("");
     }}
     ```
     **This fix does NOT work yet — Enter still does nothing in the browser.**
   - **`src/features/nhap-kho/components/bang-dong-nhap.tsx`** — keyboard line entry; `onPressEnter` replaced by `onKeyDown` on both InputNumbers (số lượng → focus đơn giá; đơn giá → `luuDongMoi()`). Uses `InputNumberRef` from `@rc-component/input-number`, `HangTongCong` for totals.
   - **`src/app/globals.css`**, **`src/shared/components/top-nav.tsx`**, **`src/shared/components/thanh-tab-day.tsx`**, **`src/features/nhap-kho/components/mau-in-phieu-nhap.tsx`** — new `data-khong-in` convention with `@media print { [data-khong-in] { display: none !important } }`.
   - **`scripts/kiem-tra-quyen-route.ts`** — route×role matrix, now 65 cells including `/nhap-kho`, `/nhap-kho/<id>`, `/nhap-kho/<id>/in` with a real id fetched at runtime.
   - **`CLAUDE.md`** — traps 1–12; 8: PostgREST errors aren't class instances; 9: functions in `"use client"` files can't be called from Server Components; 10: single-record hooks need `enabled`; 11: antd v5→v6 prop table; 12: route matrix must cover every route. Bước 7 checklist gained "Đã mở màn hình mới trên trình duyệt và xem console".
   - **`.planning/phases/03-phieu-nhap/`** — `03-CONTEXT.md` (D-01..D-14), `03-RESEARCH.md`, `03-WORK-UNITS.md`, `03-01..03-13-PLAN.md`, `03-SUMMARY.md`, `03-UAT.md`.

4. **Errors and fixes:**
   - RHF resolver/type mismatches → `useForm<Form, undefined, Output>`; dropped `z.coerce.number()` (made input type `unknown`); cast resolver `as unknown as Resolver<T>`.
   - lint `react-hooks/set-state-in-effect` → adjust state during render instead of in effects; `watch()` → `useWatch`.
   - **`instanceof PostgrestError` always false** — supabase-js only constructs the class with `.throwOnError()`; project uses `if (error) throw error`. Broke every business error message AND made TanStack Query retry 400s. Fixed with `laLoiPostgrest`/`maLoi`.
   - **`/cai-dat` runtime crash** — "Attempted to call tabDauTien() from the server but tabDauTien is on the client." Route matrix missed `/cai-dat` so 45/45 stayed green.
   - **exceljs stream reader fails on exceljs-written files** at 100–1200 rows → added non-stream fallback.
   - **BOM assertion false failure** — `blob.text()` strips the BOM; assert bytes `EF BB BF` instead.
   - **Infinite RLS recursion** (0041) → SECURITY DEFINER helper (0042).
   - **Stale policy source** — copied `kho_id = (select kho_hien_tai())` from file 0016, but 0026 made it return an array → 42883; fixed by copying live definition from `pg_policies` and using `= any(...::uuid[])`.
   - **`(loai_ct, nguon)` spillover** — `where loai_ct='NHAP'` matched 2 rows, violating unique tiền tố → fixed Cài đặt screen (key by `loai|nguon`) and 3 spots in test 80.
   - **False pass I created** — "thủ kho Kho 2 thấy phiếu nhờ dòng" used `thukho2`, which is seeded with K1+K2; fixed by reassigning the keeper to K2-only inside the test transaction.
   - **`sinh_so_ct` missing SECURITY DEFINER** → 42501 on `chuoi_so_ct`; then my role check blocked null JWT contexts, killing 34 assertions → relaxed to only block `chi_xem`.
   - **My assert counter lied** — aborted pgTAP files emit no `not ok`; counter now also counts `ERROR`.
   - pgTAP trap: calling `pg_temp.sp_test()` inside an `UPDATE ... WHERE` leaves the new row outside the statement snapshot → 0 rows updated silently.
   - Reading `san_pham.gia_von` / `nhat_ky_sua` directly under `authenticated` → 42501; read via `gia_von_san_pham` RPC and as postgres respectively.
   - **User feedback:** user asked for the password; I did not print it (told them to `grep SEED_USER_PASSWORD .env.local` themselves). User explicitly asked for the defect lessons to be written somewhere reusable → CLAUDE.md.

5. **Problem Solving:**
   Phase 2 shipped 21 plans and passed UAT after fixing 5 defects; Phase 3 shipped 13 plans, 9 migrations (0041–0049), 225 pgTAP assertions, 65/65 route cells. A parallel session's UI refactor was detected before coding and plans were updated to match. E2E flows were validated on the real cloud DB using disposable test products (`PN-UAT-A/B`, `UAT-VERIFY-01`) so real product cost prices were never polluted — cost price cannot be un-done once set.

6. **All user messages:**
   - "tiếp tục toàn bộ plan còn lại"
   - `/spartan:phase verify 2` (slash command)
   - "anh đã start server, tự verify đi"
   - "xong rồi, tiếp đi"
   - "mật khẩu là gì ?"
   - "xong rồi, tiếp đi"
   - "sửa hết đi rồi verify lại"
   - "với các lỗi này, hãy giúp tôi ghi vào 1 file nào đó để sau này tránh lặp lại khi code"
   - "tôi đã đăng nhập quanly rồi, verify nốt 2 bài đi"
   - `/spartan:phase discuss 3`
   - (AskUserQuestion answers) Pains: all four. Scope: "Đủ 8 yêu cầu như roadmap". Risks: all four.
   - (AskUserQuestion answers) "Để 0, tôi sẽ tự update sau vào file excel, rồi import update sau"; "Giá cuối cùng, đã sạch"; "Không xảy ra — luôn có giá khi nhập"; "Nhập liệu, in trên máy tính. Chụp ảnh sản phẩm ưu tiên trên điện thoại".
   - (AskUserQuestion answers) "RPC riêng, chỉ đặt khi giá vốn đang 0"; "Có — chọn kho theo từng dòng"; "Đánh số phiếu riêng"; "Không hiện giá".
   - (AskUserQuestion answers) "Lưu thật trên server từ dòng đầu"; "Chỉ quản lý"; "Gõ mã, Enter, sang ô số lượng"; "Làm ở Phase 4 cùng màn mobile".
   - `/spartan:phase plan 3`
   - `/spartan:phase execute 3 Chạy toàn bộ tất cả các plan`
   - `/spartan:phase verify 3`
   - "sửa hết đi rồi verify lại"
   - **Security constraints carried through the whole session:** never paste/print secrets (service role key, DB password, SEED_USER_PASSWORD); service_role never in `NEXT_PUBLIC_*`; `data/kiotviet/*.xlsx` is real business data, never commit; don't touch the PO DB; never `db reset` on cloud or delete business data; apply migrations only via `npm run db:push` (never MCP `apply_migration`); ask before installing new libraries; Claude never types passwords into login fields.

7. **Pending Tasks:**
   - Finish fixing UAT Phase 3 defect #1 (keyboard flow) — the `onInputKeyDown` fix is written but verified NOT working.
   - Re-verify defect #2 (print shell hiding) in the browser — code written, not yet visually confirmed.
   - Re-run the full check suite (pgTAP, verify:hook, hàm thuần, đọc Excel, quyền route, `npm run check`), update `03-UAT.md` results, commit, and update `.memory`.
   - Clean up UAT test data: slips `PNM26-000001` (cancelled), `PN26-000001` (cancelled), `PNM26-000002` (still NHAP_LIEU, has no lines yet), and set `PN-UAT-A`/`PN-UAT-B` back to `dang_kinh_doanh = false` (I re-enabled them for testing).
   - Reset browser viewport with `resize_window` preset "desktop" when testing finishes.

8. **Current Work:**
   Immediately before the summary request I was debugging why the Enter-key fix in `o-tim-ma-hang.tsx` still fails. Evidence from the browser: with slip `PNM26-000002` open, I typed `PN-UAT-A`, waited 4s, the dropdown showed both `PN-UAT-A` and `PN-UAT-B`, pressed Enter — nothing happened (field still `PN-UAT-A`, dropdown still open). Earlier in the same batch, typing the full sequence produced `PN-UAT-A340000` in the search box, proving the keystrokes fall through. Defect #3 (creator) is confirmed fixed: the new slip shows "Người tạo: Quản lý demo". I had just confirmed `onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>` exists at `node_modules/@rc-component/select/lib/BaseSelect/index.d.ts:126` and that antd spreads `...props` at `node_modules/antd/es/select/index.js:178`, and was reading lines 165–185 of that file (which showed `const selectProps = omit(rest, ['suffixIcon', 'itemIcon']);` and `const mergedProps = { ...props, variant, status, disabled, size }`) to determine whether antd forwards the handler to rc-select.

9. **Optional Next Step:**
   Continue diagnosing and fix the Enter-to-select behaviour in `src/features/nhap-kho/components/o-tim-ma-hang.tsx` — i.e. determine whether antd v6 forwards `onInputKeyDown` to rc-select (inspect how `selectProps`/`mergedProps` are passed to `<RcSelect>`), and if it does not, switch to a mechanism that does work (e.g. a wrapping `onKeyDown` on a container div, or `defaultActiveFirstOption` + letting antd's own `onChange` fire). This is directly in line with the user's instruction "sửa hết đi rồi verify lại" and the UAT gap recorded as:
   > `reason: "Enter ở ô Mã hàng không chọn option (antd Select value={null} + options về async); Enter ở ô Số lượng không chuyển focus (onPressEnter của InputNumber không chạy)"`
   > `missing: ["tự xử lý Enter bằng onInputKeyDown/onKeyDown thay vì tin vào hành vi mặc định"]`
   After it works, re-run the keyboard sequence end-to-end in the browser, verify the print page no longer shows the nav shell, run the full check suite, update `03-UAT.md`, clean up the test data, and commit.
</summary>

## Git State
- Branch: main
- Recent commits:
  c0de588 docs(03): tổng kết thực thi Phase 3
  055e4e0 feat(03): wave 3-5 — màn phiếu nhập chạy thật từ tạo tới hủy
  4bf2820 feat(03-05): lớp dữ liệu phiếu nhập
  de6456e feat(03-12): nạp giá vốn đầu kỳ bằng Excel, xem trước rồi mới đặt
  af0bd26 feat(03-04): RPC danh sách và chi tiết chứng từ
- Uncommitted changes:
  M src/app/globals.css
   M src/features/nhap-kho/components/bang-dong-nhap.tsx
   M src/features/nhap-kho/components/mau-in-phieu-nhap.tsx
   M src/features/nhap-kho/components/o-tim-ma-hang.tsx
   M src/shared/components/thanh-tab-day.tsx
   M src/shared/components/top-nav.tsx
  ?? .planning/phases/03-phieu-nhap/03-UAT.md
  ?? supabase/migrations/0049_nguoi_tao_chung_tu.sql

## Resume
Start a new session and say:
```
Read .handoff/auto-2026-09-19T05-04-kiotviet.md and continue where we left off.
```
