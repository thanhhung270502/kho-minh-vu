# Phase 17: Đổi tên & gọn đơn đặt - Research

**Researched:** 2026-10-03
**Domain:** Rename/removal phase on Next.js 16 App Router + Supabase + antd v6 (routes, labels, DB display data, dead-feature removal, print template)
**Confidence:** HIGH (every inventory below comes from grep on the real tree; Next.js redirect semantics verified against nextjs.org docs v16.3.8)

## BASE-BRANCH WARNING (read first)

The brief said the checkout is `feature/quy-chuan-ma-b` containing "main + 4 quy-chuan commits". **That is not what git shows:**

- The working tree at research time is **`main` @ 799b364** (highest migration **0084**).
- `feature/quy-chuan-ma-b` (1f2c5b4) is 6 commits ahead of AND 6 commits behind main. It does NOT contain main's 3 newest feature commits (`67ca94e`/`a3fa8a3` create-order dialog, `1e0d02f` load-test script). `main` is NOT an ancestor of it.
- Quy-chuan work continues on other branches: `-a` (+10), `-d` (+13) and `-d` already carries **0087_dien_quy_chuan.sql and 0088_combo.sql**. So "next migration = 0087" is **already taken** on an unmerged branch.

I inventoried **main's working tree** (what Phase 17 will actually edit) and diffed it against branch `-b`. The Cần rà / Khách đặt / Mua ngoài / route inventories are identical on both; the only real differences are listed in "Merge-conflict surface" below. **The planner must pick the base branch explicitly** (recommend: plan and execute on main; quy-chuan merges later and conflicts are small, see below).

## Summary

Phase 17 is a mechanical rename + removal phase with exactly one DB change (a data-only `UPDATE` of `cong_doan.ten`). No RPC signature, no table column, no generated type changes. Three findings remove work the brief expected:

1. **TEN-04 import needs no code.** `khop_danh_muc('cong_doan', …)` (0034) already matches by `ma`, by `ten`, AND by `ma` with `_`→space, all accent- and case-insensitive. "Mua ngoài", "MUA NGOAI", "MUA_NGOAI" resolve via the code even after `ten` becomes "Hàng ngoài", and "Hàng ngoài" resolves via the new `ten`. Only a pgTAP assertion is needed. There is no alias map to build.
2. **DDAT-03 needs no migration.** `chi_tiet_don` (latest def 0078, kept in 0083) already returns `ho_ten_nguoi_tao` = `nguoi_dung.ho_ten` joined on `don_dat_hang.nguoi_tao_id`; it is already mapped to `OrderDetail.createdByName`. Print time is pure client time.
3. **DDAT-01 needs no RPC change.** Orders are created/edited through plain table `insert`/`update` (`order.api.ts`), not an RPC with `p_ngay_giao_du_kien`. Stop sending the column; the RPC return tables (`danh_sach_don`, `chi_tiet_don`) keep the column and the TS mappers simply stop reading it.

Route rename is the riskiest part by file count (~25 literal references) but is fully enumerated below. `next.config.ts` redirects run **before** `proxy.ts`, so an unauthenticated hit on an old URL is rewritten to the new path first and then `proxy.ts` builds `?tiep_tuc=<new path+query>` — the login flow needs zero code change.

**Primary recommendation:** 3 waves / 4 plans — W1: 17-01 (routes+menu) ∥ 17-02 (DB rename + analytics labels); W2: 17-03 (products: Cần rà, Khách đặt, Hàng ngoài strings); W3: 17-04 (order form/print: Ngày giao dự kiến, phiếu lấy hàng). Ordering exists only because three plans share files (see "Plan split").

<user_constraints>
## User Constraints (from PROJECT.md "Quyết định đã chốt (03/10/2026)" — no CONTEXT.md exists)

### Locked Decisions
- Đổi cả URL, không chỉ nhãn: `/dat-hang` → `/don-dat`, `/hoa-don` → `/duyet-don`; `/xuat-kho` chuyển thẳng tới `/duyet-don`, không qua bước trung gian
- Không xóa cột DB: `ngay_giao_du_kien`, `can_ra` thôi dùng; mã `MUA_NGOAI` giữ nguyên, chỉ đổi tên hiển thị
- Không có UI-SPEC: bám layout hiện có
- (Từ CLAUDE.md, cùng hiệu lực) Dev trên cloud: không chạy migration xóa/đổi cột trên DB thật mà không hỏi

### Claude's Discretion
- Wording chi tiết các nhãn phụ (bảng wording bên dưới), cách tách plan, số migration, tên helper in ấn

### Deferred Ideas (OUT OF SCOPE)
- Đơn nhiều người nhận (Phase 18), một mã nhiều dòng xe (Phase 19), Đối tác chỉ còn NCC / load test 50 người / Phân tích theo kỳ (FUT-01..03)
- Không chạm in "Phiếu giao hàng" của hóa đơn (`delivery-print-template.tsx`) — yêu cầu DDAT chỉ nói phiếu LẤY hàng
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEN-01 | Menu "Đơn đặt"/"Duyệt đơn" (desktop + mobile); tiêu đề/nút dùng tên mới | §1.4 navigation.ts is the single source for both desktop group and bottom tabs; §2 wording table |
| TEN-02 | `/don-dat` (+`/moi`,`/[id]`,`/[id]/in`), `/duyet-don` (+`/[id]`,`/[id]/in`); redirects keep sub-path + query; login returns to new path | §1 full inventory; Next docs: query values pass through; redirects precede proxy |
| TEN-03 | "Khách đặt" → "Đơn đặt" (bảng, chi tiết mã, Excel) | §3: 4 UI/CSV spots; DB `khach_dat`/`customerOrdered` stay |
| TEN-04 | "Mua ngoài" → "Hàng ngoài" mọi màn + file xuất; import nhận cả hai tên | §4: name lives only in `cong_doan.ten` (seed 0018); `khop_danh_muc` already dual-accepts |
| TEN-05 | Bỏ bộ lọc/cảnh báo/nút rà hàng loạt/nhãn Cần rà | §5: 11 files, what to delete vs keep |
| DDAT-01 | Bỏ Ngày giao dự kiến ở tạo/sửa/danh sách/chi tiết/in | §6: 9 files, no RPC change |
| DDAT-02 | Phiếu lấy hàng: người nhận = tên đầy đủ, không mã | §7: `formatRecipient` adds "Nội bộ —" prefix / partner code; add name-only helper |
| DDAT-03 | Phiếu lấy hàng: giờ in (HH:mm DD/MM/YYYY) + người đặt | §7: `createdByName` already in OrderDetail; client clock |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Code/file/folder names English kebab-case; user strings Vietnamese with diacritics; **URLs Vietnamese without diacritics** (`/don-dat`, `/duyet-don` comply); DB names stay Vietnamese; only `api/` and `types.ts` touch snake_case columns.
- Bẫy 1/9: file importing `antd` needs `"use client"`; pure helpers/constants go in `lib/*.ts` WITHOUT `"use client"` (the new recipient helper must go in `src/shared/lib/recipient.ts`, which is already pure).
- Bẫy 3: proxy is `src/proxy.ts` (no change needed).
- Bẫy 11: antd v6 props — this phase adds no new antd props; removing `DatePicker` import must not leave unused imports (`npm run check` runs lint).
- Bẫy 12: `scripts/test-route-permissions.ts` must list every real route; add the new routes, keep old ones as redirect rows.
- Bẫy 19: if the browser frame is hidden, white screen is a React 19 view-transition artifact, not an app bug — verify with `document.hidden` / `document.startViewTransition = undefined; window.next.router.push(...)`.
- Bẫy 5: do not add `select("*")` on `san_pham`; nothing in this phase should.
- Không cài thư viện mới; không sửa ngoài phạm vi; không đổi build/lint/tsconfig.
- Step 7 checklist: `npm run check`, no `any`, no leftover imports/files, open the new screens in a browser and read the console.
- GSD enforcement: edits only through GSD plan execution.
- Commit style Conventional Commits, one thing per commit (e.g. `feat(don-dat): đổi đường dẫn /dat-hang → /don-dat`).

## Standard Stack

No new packages. Everything is existing: Next.js 16 (`next.config.ts` `redirects()`), `src/proxy.ts`, supabase-js, antd v6, dayjs (already imported in the print template), tsx scripts, pgTAP via `supabase test db`.

### Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | npm scripts, tsx | ✓ | v24.19.0 | — |
| supabase CLI (via npx) | pgTAP, db push | ✓ | 2.117.0 | — |
| Docker | `supabase db reset` / local pgTAP | ✓ | 28.0.1 | `npm run db:test:linked` runs pgTAP on cloud (CLAUDE.md) |
| `.env.local` | dev server, route-permission script | ✓ | present (points dev at CLOUD per MEMORY) | — |
| Browser tool | UAT / console check | assumed | — | manual by user |

Missing with no fallback: none.

## Architecture Patterns

### 1. Route inventory — `/dat-hang`, `/hoa-don`, `/xuat-kho`

**Folder tree to move (git mv, keep history):**
```
src/app/(app)/dat-hang/            →  src/app/(app)/don-dat/
  page.tsx                              (title "Đơn đặt hàng" → "Đơn đặt")
  moi/page.tsx                          (link "/dat-hang" + title "Tạo đơn đặt hàng")
  [id]/page.tsx
  [id]/in/page.tsx
src/app/(app)/hoa-don/             →  src/app/(app)/duyet-don/
  page.tsx                              (title/PageHeader "Hóa đơn")
  [id]/page.tsx                         (title "Hóa đơn")
  [id]/in/page.tsx
src/app/(app)/xuat-kho/                 does NOT exist (only a next.config redirect)
```
No per-route permission map exists anywhere (`requirePermission(...)` is called inside each `page.tsx`, so moving a folder carries its gate). `src/proxy.ts` has no route list. No `revalidatePath`, no `redirect("/hoa-don")`-style calls, no e2e directory.

**Every literal reference (main tree). Left = file:line, right = change:**

| File | Reference | Change |
|------|-----------|--------|
| `next.config.ts` | `/xuat-kho`→`/hoa-don` (+`:path*`) | rewrite dest to `/duyet-don` (NO chain); add `/dat-hang`,`/dat-hang/:path*`→`/don-dat…`; `/hoa-don`,`/hoa-don/:path*`→`/duyet-don…`; fix comment |
| `src/shared/lib/navigation.ts:61,71` | `href: "/dat-hang"`, `"/hoa-don"` | hrefs + labels (§2); comment lines 47-49 |
| `src/features/dashboard/lib/home-path.ts:8,18` | returns `"/hoa-don"` | → `"/duyet-don"` (+ doc comment) |
| `src/features/products/components/stock-card-columns.tsx:20` | `XUAT: "/hoa-don"` | → `"/duyet-don"` |
| `src/features/dashboard/components/negative-stock-table.tsx:18` | `` `/hoa-don/${id}` `` | → `/duyet-don/` |
| `src/features/returns/components/return-detail.tsx:58` | `` `/hoa-don/${sourceDocId}` `` | → `/duyet-don/` |
| `src/features/sales-order/components/complete-order-dialog.tsx:67` | `router.push(`/hoa-don/${invoiceId}`)` | → `/duyet-don/` |
| `src/features/sales-order/components/order-actions.tsx:81` | `` `/dat-hang/${orderId}/in` `` | → `/don-dat/…/in` |
| `src/features/sales-order/components/order-table-body.tsx:25` | `` `/dat-hang/${row.id}` `` | → `/don-dat/` |
| `src/features/sales-order/components/order-detail.tsx:37,52,95` | `/dat-hang` ×2, `/hoa-don/${invoice.id}` | → new paths |
| `src/features/sales-order/components/new-order-form.tsx:21,22,44` | comments + `router.replace(`/dat-hang/${id}`)` | → `/don-dat/` |
| `src/features/sales-order/components/new-order-card.tsx:7` | comment `/dat-hang/moi` | comment only |
| `src/features/sales-order/schemas/order.schema.ts:79` | comment `/dat-hang?q=…` | comment only |
| `src/features/sales-order/hooks/useOrders.ts:149` | comment `/hoa-don` | comment only |
| `src/features/stock-out/components/create-issue-button.tsx:73` | `router.push(`/hoa-don/${id}`)` | → `/duyet-don/` |
| `src/features/stock-out/components/issue-detail.tsx:45,61,74,82` | `/hoa-don` ×2, `/dat-hang/${orderId}`, `/hoa-don/${id}/in` | → new paths |
| `src/features/stock-out/components/issue-header.tsx:175` | `` `/dat-hang/${issue.orderId}` `` | → `/don-dat/` |
| `src/features/stock-out/components/issue-table-body.tsx:22,40` | `/hoa-don/${row.id}`, `/dat-hang/${row.orderId}` | → new paths |
| `src/features/stock-out/schemas/issue.schema.ts:19` · `types.ts:22` | comments | comment only |
| `src/shared/components/partner-search-input.tsx:47`, `staff-select.tsx:18` | comments | comment only |
| `scripts/test-route-permissions.ts` | lines 51,58,61,62,64,67,143,225,576-593,627-648 | matrix + helpers (see §8) |
| `scripts/test-pure-functions.ts` | 173,177-182,333-354 | `homePathFor` + nav expectations (§8) |
| `scripts/load-test/load.mjs:163,257` | `page /hoa-don` + stat key | → `/duyet-don` (otherwise the load test measures a 307) |
| `README.md`, `supabase/README.md`, `src/features/README.md` | not grepped for route strings | planner: `grep -n "hoa-don\|dat-hang" **/*.md` as a final sweep |

Note the `/dat-hang/moi` page is kept on main ("route giữ lại cho link/bookmark cũ"; list creates via dialog). Keep it as `/don-dat/moi` (TEN-02 requires it). On branch `-b` the page is the only creator and `create-order-button.tsx` links to it — either way the move is the same.

**Redirect rules (next.config.ts) — final block:**
```ts
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects (v16.3.8)
{ source: "/dat-hang", destination: "/don-dat", permanent: false },
{ source: "/dat-hang/:path*", destination: "/don-dat/:path*", permanent: false },
{ source: "/hoa-don", destination: "/duyet-don", permanent: false },
{ source: "/hoa-don/:path*", destination: "/duyet-don/:path*", permanent: false },
// "Xuất kho" → thẳng Duyệt đơn; KHÔNG trỏ qua /hoa-don (tránh chuỗi 2 bước)
{ source: "/xuat-kho", destination: "/duyet-don", permanent: false },
{ source: "/xuat-kho/:path*", destination: "/duyet-don/:path*", permanent: false },
```
Keep `permanent: false` (307, not cached — matches every existing rule and the file's own rationale).

**Verified Next.js semantics (HIGH, official docs):**
- "When a redirect is applied, any query values provided in the request will be passed through to the redirect destination" — `/old-blog/post-1?hello=world` → `/blog/post-1?hello=world`. So `?q=&trang_thai=&trang=` survive without extra config.
- `:path*` = zero or more segments, so `/hoa-don/<uuid>/in` → `/duyet-don/<uuid>/in`. The explicit bare-source rule is redundant but matches the file's existing style and the existing test rows.
- "Redirects are checked before the filesystem", and next.config redirects run before Proxy (Next routing order: headers → redirects → proxy → …). Consequence for login: an unauthenticated `GET /dat-hang/<id>?x=1` receives 307 → `/don-dat/<id>?x=1` **first** (no auth check, no 401), then the browser requests the new URL, `proxy.ts` sees no user and builds `/dang-nhap?tiep_tuc=%2Fdon-dat%2F<id>%3Fx%3D1` (`safeRedirectPath(pathname+search)`), and after login `proxy.ts` sends them to the new URL. **Zero change to `proxy.ts` / `redirect-path.ts`.** This is the same behaviour the existing matrix already encodes for `/xuat-kho` (`ALL("→/hoa-don")` including `khach`).
- A bookmark whose `tiep_tuc` still holds an old path (`/dang-nhap?tiep_tuc=/hoa-don/x`) works too: after login the proxy redirects to `/hoa-don/x`, the next.config rule then forwards to `/duyet-don/x` (one extra hop, not a chain in the locked-decision sense).
- `scripts/test-route-permissions.ts::doMot` compares only `new URL(location).pathname`, so the existing helper cannot prove query preservation — add one targeted check (§8).

### 2. User-visible strings: change vs keep

Principle (recommended, flag A1 in Open Questions): rename **the screen names and the buttons/headings/breadcrumbs that point at those screens**; keep **"hóa đơn" as the noun for the XUAT document** inside sentences, document-type labels, metrics and permissions, because Duyệt đơn is the *screen* where hóa đơn are reviewed, and renaming every noun would corrupt accounting wording (thẻ kho, partner history, void dialog).

| Location | Current | New |
|----------|---------|-----|
| `navigation.ts` item `/don-dat` | label/short "Đặt hàng" | "Đơn đặt" / "Đơn đặt" |
| `navigation.ts` item `/duyet-don` | label/short "Hóa đơn" | "Duyệt đơn" / "Duyệt đơn" (9 chars, comment says ≤~8 — check 4-tab bar at 375px in browser) |
| `NAV_GROUPS.orders.label` | "Đơn hàng" | **keep** |
| `don-dat/page.tsx` | metadata + PageHeader "Đơn đặt hàng" | "Đơn đặt" |
| `don-dat/moi/page.tsx` | "Tạo đơn đặt hàng" ×2 | "Tạo đơn đặt" |
| `don-dat/[id]/page.tsx` | metadata "Đơn đặt hàng" | "Đơn đặt" |
| `order-detail.tsx:53` | "← Đơn đặt hàng" | "← Đơn đặt" |
| `order-table.tsx:78` | "Chưa có đơn đặt hàng nào." | "Chưa có đơn đặt nào." |
| `create-order-button.tsx` Modal title | "Tạo đơn đặt hàng" | "Tạo đơn đặt" |
| `permissions.ts:53` label | "Tạo đơn đặt hàng" | "Tạo đơn đặt" (settings UI label only; key `tao_don` unchanged) |
| `staff-drawer.tsx:72` | "…chọn nhanh khi đặt hàng." | "…khi tạo đơn đặt." (optional polish) |
| `duyet-don/page.tsx` | metadata + PageHeader "Hóa đơn" | "Duyệt đơn" |
| `duyet-don/[id]/page.tsx` | metadata "Hóa đơn" | "Duyệt đơn" |
| `issue-detail.tsx:46,62` | "Về danh sách hóa đơn", "← Hóa đơn" | "Về Duyệt đơn", "← Duyệt đơn" |
| `issue-table.tsx:78` | "Chưa có hóa đơn nào." | "Chưa có đơn nào để duyệt." |
| `create-issue-button.tsx:19,97` | label/title "Tạo hóa đơn" | **A1 decision**: recommend keep "Tạo hóa đơn" (creates a XUAT document); change only if user wants |
| `order-detail.tsx:94-101`, `complete-order-dialog.tsx`, `void-document-dialog.tsx`, `doc-type-labels.ts` (`XUAT: "hóa đơn"`), `partners/types.ts:74`, `doc-numbering.api.ts:21` ("Hóa đơn"), dashboard `sales-pace-card.tsx`, analytics sales-pace/analysis-view, `permissions.ts:55,56` ("tạo hóa đơn", "Sửa hóa đơn"), note-review.tsx, negative-stock-section, reorder-data-warning | "hóa đơn" as document noun | **keep** |
| `permissions.ts:52` | "Nhập đơn hàng" (= phiếu nhập kho) | **keep** (not the "Đặt hàng" screen) |

"Đơn hàng" appears as the menu group name only (navigation.ts:38) — **keep**. DB RPC error strings that say "hóa đơn" stay (no migration for wording).

### 3. "Khách đặt" display labels (DB `khach_dat`, RPC `phan_tich_ton_kho`, field `customerOrdered` all stay)

| File:line | Current | New |
|-----------|---------|-----|
| `products/components/product-columns.tsx:200` (+ doc comment :190) | column title "Khách đặt" | "Đơn đặt" |
| `products/components/product-info-tab.tsx:86` | `<Field label="Khách đặt">` | "Đơn đặt" |
| `analytics/lib/analysis.ts:223` | CSV header "Khách đặt" (Excel/CSV "đề nghị nhập") | "Đơn đặt" |
| `analytics/components/reorder-table.tsx:44` | column "KH đặt" | "Đơn đặt" (consistency; mapped to same metric) |
| comments: `product-table.tsx:54`, `danh-muc/page.tsx:31`, `analytics/types.ts:37` | | update wording (optional) |
| `analytics/components/analysis-view.tsx:78` | "Tồn và khách đặt vẫn đúng…" sentence | → "Tồn và đơn đặt vẫn đúng…" |
| `analytics/components/kpi-cards.tsx:19`, `reorder-table.tsx:93` | "có khách mua" (a different concept: demand) | **keep** |

`products/lib/product-expanded.ts` has no label text (only `customerOrdered` field) — no change. pgTAP `98_phan_tich_ton_kho_test.sql` mentions "khách đặt" only in assertion descriptions about the SQL column — leave.

### 4. "Mua ngoài" → "Hàng ngoài"

- **Where the name comes from:** `public.cong_doan.ten` = `'Mua ngoài'` seeded by `0018_du_lieu_nen.sql` for `ma='MUA_NGOAI'`. There is **no hardcoded display string** in TS: every screen (lookup selects, columns, drawers, analytics, Excel export, import preview tables) reads `ten`/`ten_cong_doan` from the DB. The analytics bucket maps `MUA_NGOAI` into "Khác" (`FINISH_LABELS`) — never shows the name.
- **Therefore one `UPDATE` fixes every screen and export:**
  ```sql
  -- 0089_ten_hang_ngoai.sql  (number: see Pitfall 5)
  update public.cong_doan set ten = 'Hàng ngoài'
   where ma = 'MUA_NGOAI' and ten = 'Mua ngoài';   -- giữ nếu văn phòng đã tự đổi tên ở Danh mục phụ
  ```
  Allowed: trigger `chan_doi_ma_cong_doan` (0040) only blocks changing `ma`; pgTAP 63 proves `ten` is editable. Column grants unchanged. Idempotent; safe to apply out of order.
- **Import matching (verified in SQL, 0034 `khop_danh_muc`):** for `cong_doan` it matches `upper(f_unaccent(ma)) = v` OR `upper(f_unaccent(ten)) = v` OR `upper(f_unaccent(replace(ma,'_',' '))) = v`. After the rename: `"Mua ngoài"` → normalized `MUA NGOAI` = code-with-space ✓; `"Hàng ngoài"` → `HANG NGOAI` = new `ten` ✓; `"MUA_NGOAI"` ✓. Used by `nhap_danh_muc` for both `cong_doan` and `cong_doan_khi_tao_moi` (0086 lines 269, 290). The TS side sends the literal `"MUA_NGOAI"` code (`read-catalog-file.server.ts:87`, `parse-unit-stage.ts`) — unaffected. The Phase-15 "nhập mã mới" path (`nhap_ma_hang_moi`) resolves by `ma_quy_chuan`, not by name — unaffected.
- **Remaining hardcoded display strings to reword (TS):**
  - `products/components/import-preview.tsx:89` "mã mới nhận Mua ngoài" → "Hàng ngoài"
  - `products/components/product-drawer.tsx:306` "…hoặc mua ngoài" → "…hoặc hàng ngoài"
  - `products/components/review-alert.tsx:20`, `stage-suggestions.tsx:137` — **deleted** by TEN-05
  - comments only (leave): `create-receipt-button.tsx:106`, `product-drawer.tsx:54,109`, `lookup.api.ts:84/92` (keeps code `MUA_NGOAI`), `parse-unit-stage.ts`, `scripts/import-kiotviet/validate.ts:159,187` (script console messages — optional reword)
- **Tests:** no existing test asserts the literal `'Mua ngoài'` ten (63 only renames it inside a rolled-back txn; 62/104 only mention it in assertion descriptions). Add pgTAP `105_ten_hang_ngoai_test.sql`: (a) `ten` = 'Hàng ngoài' after migration, (b) `khop_danh_muc('cong_doan','Mua ngoài')`, `('cong_doan','MUA_NGOAI')`, `('cong_doan','hàng ngoài')` all return the same id (proves TEN-04 "nhận cả tên cũ lẫn mới"), (c) `ma` still `MUA_NGOAI`. Optionally a `nhap_danh_muc` dry-run row with `"cong_doan":"Mua ngoài"` → no error.

### 5. "Cần rà" removal (all UI; DB columns, RPC params, RPCs stay)

| File | What | Action |
|------|------|--------|
| `products/schemas/filter.schema.ts:60,75,92,137,157,182` | `needsReview` in type, default, `countActiveFilters`, URL read (`can_ra`), URL write, RPC arg `p_can_ra` | **delete** all six; `toListRpcArgs` stops sending `p_can_ra` (RPC arg is optional → no signature change). Old `?can_ra=1` bookmarks are silently ignored by `readFilterFromUrl` and dropped on next write |
| `products/components/review-actions.tsx` | contains the "Cần rà" button AND hosts `extraActions` (Danh mục phụ) + `ExcelButton` | **do not delete the file wholesale**: rename to e.g. `product-secondary-actions.tsx`, drop `Badge`/button/`reviewCount`/`filter.needsReview`; keep `extraActions` + `ExcelButton`. Update the import in `product-table.tsx` |
| `products/components/review-alert.tsx` | warning bar + "Gợi ý theo đuôi mã" button | **delete file**; remove `<ReviewAlert>` from `product-table.tsx:174` |
| `products/components/stage-suggestions.tsx` | modal "Gợi ý theo đuôi mã" (= "rà hàng loạt") | **delete file**; remove from `product-modals.tsx` (props `suggestionsOpen`, `onCloseSuggestions`) and `product-table.tsx` state `suggestionsOpen` |
| `products/components/bulk-assign-bar.tsx:63,175-178` | "Xác nhận đã rà" button + `useConfirmReviewed` | **delete button + hook use** (it is part of rà hàng loạt) |
| `products/components/product-table.tsx:41,71-77,143-150,174` | `hasActiveFilter` uses `needsReview`; `reviewCount` query (extra RPC call per page load!) | delete; also removes one `danh_sach_san_pham` request per load |
| `products/components/product-columns.tsx:156-162` | Status column tags "ĐVT mâu thuẫn" / "Cần rà" | delete both tags (keep "Ngừng KD") |
| `products/components/product-detail.tsx:181`, `product-info-tab.tsx:61` | `Cần rà` tag | delete |
| `products/components/product-drawer.tsx:186,220-228` | `needsReview` alert "Mã này đang trong danh sách Cần rà…" | delete (also `unitNeedsReview` use) |
| `products/hooks/useProducts.ts` (74-80, 120-135), `api/product.api.ts` (179-200), `api/product.keys.ts:13`, `types.ts` (`StageSuggestion`, `toStageSuggestion`, `needsReview`, `unitNeedsReview` fields + both mappers lines ~195-196, ~222-223, `StageSuggestionDb`) | dead wrappers | delete the TS wrappers; **do not touch the RPCs** `goi_y_cong_doan_theo_duoi`, `ap_dung_goi_y_cong_doan`, `xac_nhan_da_ra`, `danh_sach_san_pham(p_can_ra)` or `database.types.ts` (pgTAP 41/62 still cover them) |
| `product-detail.tsx:50-51` | audit-log labels `can_ra_dvt`, `da_xac_nhan_ra` | **keep** — old `nhat_ky_sua` rows still render |
| `scripts/test-pure-functions.ts:388,409` | `sampleFilter.needsReview`, `p_can_ra` assertion | remove `needsReview` from the fixture, delete line 409 |

**"ĐVT mâu thuẫn" (`can_ra_dvt`):** same family as Cần rà (it is the red variant of the same badge and drives the same drawer alert). Recommend removing with Cần rà (flag A2). No permission key, route or `NAV` entry relates to Cần rà (`grep` over `permissions.ts`: none). `lookup.api.ts:84` comment mentions `la_can_ra` — comment only, leave.

### 6. "Ngày giao dự kiến" removal

| File | Change |
|------|--------|
| `sales-order/schemas/order.schema.ts:23-26,60-62` | remove `deliveryDate` from `orderHeaderSchema` and the `update.ngay_giao_du_kien` branch of `toOrderUpdate` |
| `sales-order/api/order.api.ts:68,86` | `createOrder` input loses `deliveryDate`; drop `ngay_giao_du_kien` from the `insert` (column is nullable, default null) |
| `sales-order/hooks/useOrders.ts:83` | `useCreateOrder` input type |
| `sales-order/components/new-order-form.tsx:32,58` | stop passing `deliveryDate: null`; help text → "Bấm Tạo là tạo đơn tạm và chuyển sang gõ dòng hàng. Ghi chú sửa ở đầu đơn." |
| `sales-order/components/order-header.tsx:3-4,90-108` | delete the descriptions item; remove `DatePicker` from the antd import (dayjs still used at :75) |
| `sales-order/components/order-table-body.tsx:51-56` | delete the "Ngày giao dự kiến" column |
| `sales-order/components/picking-print-template.tsx:64-67` | delete the field (layout grid rewritten, §7) |
| `sales-order/types.ts:21,37,69,93` | remove `deliveryDate` from `OrderRow`/`OrderDetail` and both mappers |

**RPCs: nothing to change.** `danh_sach_don` / `chi_tiet_don` return `ngay_giao_du_kien` in their `RETURNS TABLE` (0076/0077/0078/0083) but no RPC takes it as input; create/update are direct table writes. The TS mappers just stop reading it; `scripts/test-pure-functions.ts:624,635,678` fixtures set `ngay_giao_du_kien: null` on DB-shaped rows — still valid because `database.types.ts` is unchanged. No pgTAP references the column. Existing data stays in the DB.

### 7. Phiếu lấy hàng (DDAT-02, DDAT-03)

- **Template:** `sales-order/components/picking-print-template.tsx`, rendered by `picking-print-page.tsx` from `useOrderDetail` + `useOrderLines`, route `/don-dat/[id]/in`.
- **Current recipient text:** `formatRecipient(order.recipient)` (`shared/lib/recipient.ts:56`): internal → `"Nội bộ — {ten_day_du}"` (name is `nhan_vien_phu_trach.ten_day_du` — already the full name); partner → `"{ma_doi_tac} {ten}"`. There is **no field called "mã nhân viên"** anywhere in the data; the only code that can appear on this sheet is the partner code, plus the "Nội bộ —" prefix. Interpretation recommended: DDAT-02 = print the recipient's name only (flag A3).
- **Change:** add to `shared/lib/recipient.ts` (pure file, bẫy 9):
  ```ts
  /** Phiếu in: chỉ tên người nhận, không tiền tố "Nội bộ —", không mã đối tác. */
  export function recipientDisplayName(recipient: Recipient | null): string {
    return recipient?.name?.trim() || "—";
  }
  ```
  and use it ONLY in the picking template. **Do not change `formatRecipient`** — 6 other call sites (lists, headers, delivery print) depend on it, and Phase 18 will rework recipient display.
- **Người đặt:** already available — `OrderDetail.createdByName` ← `ho_ten_nguoi_tao` ← `nguoi_dung.ho_ten` via `don_dat_hang.nguoi_tao_id` (verified in `chi_tiet_don` 0078 L373/378). "Tài khoản đã tạo đơn trên app" is exactly this. **No migration/RPC change.** Fall back to "—" when null.
- **Giờ in:** client clock formatted `dayjs(...).format("HH:mm DD/MM/YYYY")`. The template only renders after the client-side `useOrderDetail` resolves (QueryState), so there is no SSR/hydration mismatch. Recommended: `const [printedAt, setPrintedAt] = useState(() => new Date())` plus a `window.addEventListener("beforeprint", …)` effect that refreshes it, so a tab opened earlier prints the actual print minute (and the button `onClick` can also refresh before `window.print()`).
- **Layout:** header section becomes: left "Người nhận: **{name}**", right "Người đặt: {createdByName}", then "In lúc: {HH:mm DD/MM/YYYY}" (and keep Ghi chú full width). With the deliveryDate block gone the grid has 2 cells + note.
- Not in scope: `stock-out/components/delivery-print-template.tsx` ("Phiếu giao hàng").

### 8. Test assets

| Asset | Update |
|-------|--------|
| `scripts/test-route-permissions.ts` | rows: `/dat-hang`→`/don-dat`, `/dat-hang/moi`→`/don-dat/moi`, `/hoa-don`→`/duyet-don`; **add** redirect rows `ALL("→/don-dat")` for `/dat-hang`, `ALL("→/duyet-don")` for `/hoa-don` and `/xuat-kho` (was `→/hoa-don`); home row `vanphong: "→/duyet-don"`; detail rows (L627-648) use `/don-dat/${id}`, `/don-dat/${id}/in`, `/duyet-don/${id}`, `/duyet-don/${id}/in`, plus redirect rows for old `/dat-hang/${id}`, `/hoa-don/${id}(/in)`, `/xuat-kho/${id}(/in)` all `ALL("→/duyet-don/…")`; toggle tests L578/590, 577/589 (`→/duyet-don`); comments/warnings L143,225,634,651. **Add one query-preservation check** (new small helper reading full `Location`, e.g. `/dat-hang?trang=2` must end with `/don-dat?trang=2`) and one unauthenticated check that `/dat-hang/<id>` → eventually `Location` contains `tiep_tuc=%2Fdon-dat%2F` (follow 2 hops manually). Branch `-b` adds +3 lines here (cron route) — expect a trivial merge |
| `scripts/test-pure-functions.ts` | L173-183 `homePathFor` → `/duyet-don`; L333-340 bottom-tab hrefs `["/duyet-don","/nhap-kho","/danh-muc","/don-dat"]`; L348 keep "không còn mục /xuat-kho" and add "/dat-hang","/hoa-don" absent; L354 `groupHrefs("Đơn hàng")` → `["/don-dat","/duyet-don"]`; L388/409 Cần rà (see §5); add asserts for `recipientDisplayName` (internal, partner-with-code → name only, null → "—") and for nav labels "Đơn đặt"/"Duyệt đơn" |
| `scripts/test-excel-reader.ts` | none required (asserts `"MUA_NGOAI"` code, unchanged) |
| pgTAP | new `105_ten_hang_ngoai_test.sql` (§4). Existing 41/62 keep passing because RPCs untouched. Next free test number on main is 100 (100-104 live on branch -b; on main use the next unused to avoid collision when quy-chuan merges — pick **105** to match both) |
| `scripts/load-test/load.mjs` | `/hoa-don` → `/duyet-don` (2 places) |

### Recommended plan split (waves + file ownership)

Constraint: `test-pure-functions.ts` is edited by nav/home work AND Cần rà work AND new helper asserts; sales-order files are touched by both the route rename and the Ngày giao/print work. Hence:

**Wave 1 (parallel, disjoint files)**
- **17-01 — Đường dẫn & menu (TEN-01, TEN-02).** Owns: `git mv` of both route folders; `next.config.ts`; `navigation.ts`; `home-path.ts`; every route-literal file in §1 table (sales-order, stock-out, returns, dashboard, `stock-card-columns.tsx`); page titles/PageHeader/back-link/empty-state wording (§2) in those moved pages and in `order-detail.tsx`, `order-table.tsx`, `create-order-button.tsx`, `issue-detail.tsx`, `issue-table.tsx`, `permissions.ts` label, `staff-drawer.tsx`; `scripts/test-route-permissions.ts`; `scripts/load-test/load.mjs`; `scripts/test-pure-functions.ts` nav/home hunks only. Verify: `npm run check`, `npx tsx scripts/test-pure-functions.ts`, `npx tsx scripts/test-route-permissions.ts` (needs `npm run dev`).
- **17-02 — Hàng ngoài (DB) + nhãn phân tích (TEN-04 DB half, TEN-03 analytics half).** Owns: `supabase/migrations/0089_ten_hang_ngoai.sql`, `supabase/tests/105_ten_hang_ngoai_test.sql`, `analytics/lib/analysis.ts`, `analytics/components/reorder-table.tsx`, `analysis-view.tsx` sentence, `analytics/types.ts` comment. Verify: pgTAP, `npm run check`.

**Wave 2**
- **17-03 — Danh mục hàng hóa (TEN-05, TEN-03 products half, TEN-04 strings).** Owns everything under `src/features/products/` (§5, §3 product rows, `import-preview.tsx`, `product-drawer.tsx`), `danh-muc/page.tsx` comment, and `scripts/test-pure-functions.ts` filter hunk (L388, L409). Must run after 17-01 only because of the shared test file. Verify: `npm run check`, `npx tsx scripts/test-pure-functions.ts`, browser Danh sách hàng hóa (no console warnings, extraActions + Excel button still present, expanded row shows "Đơn đặt").

**Wave 3**
- **17-04 — Đơn đặt gọn & phiếu lấy hàng (DDAT-01/02/03).** Owns: `order.schema.ts`, `order.api.ts`, `useOrders.ts`, `new-order-form.tsx`, `order-header.tsx`, `order-table-body.tsx`, `picking-print-template.tsx`, `sales-order/types.ts`, `shared/lib/recipient.ts`, and its asserts in `scripts/test-pure-functions.ts`. After 17-01 (same sales-order files) and after 17-03 (test file). Verify: `npm run check`, pure tests, browser: tạo đơn → chi tiết (không ô Ngày giao) → xác nhận → mở `/don-dat/<id>/in`, check name-only recipient, "Người đặt", "In lúc HH:mm DD/MM/YYYY", Ctrl+P preview.

(17-02 could be merged into 17-01's wave as a separate parallel plan as listed; if the planner prefers fewer plans, fold 17-02 into 17-03 — it touches disjoint files.)

### Merge-conflict surface with quy-chuan branches (informational for planner)
Branch `-b` (and a/d) edit: `product-detail.tsx`, `product-drawer.tsx`, `product-info-tab.tsx`, `product-expanded-detail.tsx`, `products/types.ts`, `product.api.ts`, `lookup.api.ts`, `proxy.ts` (+3, cron path), `database.types.ts`, `test-pure-functions.ts` (+122), `test-route-permissions.ts` (+3), migrations 0085-0088. Phase 17-03 edits `types.ts` (needsReview mapper lines), `product-drawer.tsx`, `product-info-tab.tsx`, `product-detail.tsx` — different hunks from the quy-chuan diffs seen, expect clean or trivial conflicts. 17-01/17-04 do not overlap with those branches except `scripts/*`. `new-order-form.tsx`/`create-order-button.tsx`/`new-order-card.tsx` differ between main and `-b` only because `-b` lacks main's dialog commits (not a real conflict).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Old→new URL mapping | middleware/proxy rewrite or per-page `redirect()` | `next.config.ts` `redirects()` with `:path*` | Runs before proxy/filesystem, preserves sub-path and query natively, one place, already the file's convention |
| Accept old & new công đoạn name on import | TS alias map `{ "Mua ngoài": "MUA_NGOAI" }` | existing `khop_danh_muc` | Already matches code, name and code-with-spaces, accent/case-insensitive |
| Renaming a display label that lives in DB | TS override of `ten` per screen | one data `UPDATE` migration | Every screen/export reads `cong_doan.ten`; overriding in TS would miss Excel + RPC-driven text |
| Creator name on the print | new RPC / join | `OrderDetail.createdByName` | Already returned by `chi_tiet_don` |
| Hiding Cần rà | feature flag / CSS hide | delete the UI and keep DB | Locked decision; flags rot |
| Print timestamp | server clock / DB `now()` | client `dayjs()` at render + `beforeprint` | Print time is a client event; DB time would be page-load time at best |

## Common Pitfalls

### Pitfall 1: Redirect chain `/xuat-kho → /hoa-don → /duyet-don`
**What goes wrong:** Leaving the old `/xuat-kho` rule pointing at `/hoa-don` after adding a `/hoa-don` rule makes two hops (violates locked decision; matrix would show `→/hoa-don`).
**How to avoid:** rewrite the `/xuat-kho` destinations to `/duyet-don` in the same edit; matrix row `ALL("→/duyet-don")`.

### Pitfall 2: `ReviewActions` hosts non-Cần-rà controls
**What goes wrong:** deleting `review-actions.tsx` removes the Excel menu and the "Danh mục phụ" button (`extraActions`).
**How to avoid:** rename/trim, keep `ExcelButton` + `extraActions`.

### Pitfall 3: Dangling imports/props after removals (lint fails the build)
`DatePicker` in `order-header.tsx`, `Badge` in review-actions, `suggestionsOpen` props through `ProductModals`, `StageSuggestion` type, `useConfirmReviewed`, `dayjs` in `order-table-body.tsx` (still used for Ngày đơn — keep), `hasActiveFilter` clause. `npm run check` catches them; run it per plan, not only at the end.

### Pitfall 4: `findActiveHref` uses `startsWith`
New hrefs `/don-dat`, `/duyet-don` have no prefix overlap with `/doi-tac`, `/danh-muc` — OK. Verify in browser that "Đơn đặt" highlights on `/don-dat/<id>/in` and "Duyệt đơn" on `/duyet-don/<id>`.

### Pitfall 5: Migration number collision
Highest on main = **0084**; `-b` has 0085/0086; `-d` has **0087 (dien_quy_chuan) and 0088 (combo)**. Using 0085-0088 will collide when quy-chuan merges, and applying a lower-numbered migration after a higher one is already on cloud makes `supabase db push` refuse without `--include-all`. **Recommend `0089_ten_hang_ngoai.sql`** (idempotent data update, safe in any order) and re-check `git branch -a` + `ls supabase/migrations` at execution time. MEMORY: cloud currently has up to 0084; local up to 0085; `.env.local` points dev at cloud — do not auto-apply; pgTAP via local reset or `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz`.

### Pitfall 6: Unauthenticated redirect order expectations
The matrix reports `khach /dat-hang` as `→/don-dat` (not `dangnhap`) because next.config redirects precede proxy. Don't "fix" this; it is the documented existing behaviour (see current `/xuat-kho` row).

### Pitfall 7: Query-string loss misattributed
`doMot` strips the query. Don't conclude redirects drop params; add the dedicated full-Location check.

### Pitfall 8: Renaming `formatRecipient` instead of adding a helper
It feeds 6 other screens (lists, headers, Phiếu giao hàng). Phase 18 reworks recipient display; keep this phase additive.

### Pitfall 9: Hidden browser tab ⇒ blank page (bẫy 19)
Checks of the new `/don-dat` / `/duyet-don` pages in a hidden frame can look broken; check `document.hidden` first.

### Pitfall 10: Wording over-reach
Renaming every "hóa đơn" would change accounting vocabulary in thẻ kho / partner history / void dialog. Follow §2 table and confirm A1.

## Code Examples

### Redirect block (see §1) — Source: Next.js 16.3.8 docs, `redirects`

### Name-only recipient + print header
```tsx
// shared/lib/recipient.ts (no "use client")
export function recipientDisplayName(recipient: Recipient | null): string {
  return recipient?.name?.trim() || "—";
}

// picking-print-template.tsx
const [printedAt, setPrintedAt] = useState(() => new Date());
useEffect(() => {
  const refresh = () => setPrintedAt(new Date());
  window.addEventListener("beforeprint", refresh);
  return () => window.removeEventListener("beforeprint", refresh);
}, []);
// …
<div><span className="text-gray-600">Người nhận: </span><strong>{recipientDisplayName(order.recipient)}</strong></div>
<div><span className="text-gray-600">Người đặt: </span>{order.createdByName ?? "—"}</div>
<div><span className="text-gray-600">In lúc: </span>{dayjs(printedAt).format("HH:mm DD/MM/YYYY")}</div>
```

### Stop sending Ngày giao (order.api.ts)
```ts
.insert({
  so_dh: orderNo,
  doi_tac_id: input.recipient.kind === "partner" ? input.recipient.id : null,
  nguoi_nhan_id: input.recipient.kind === "internal" ? input.recipient.id : null,
})
```

### Migration
```sql
-- 0089_ten_hang_ngoai.sql — chỉ đổi tên hiển thị; mã MUA_NGOAI giữ nguyên (code đang dựa vào)
update public.cong_doan set ten = 'Hàng ngoài'
 where ma = 'MUA_NGOAI' and ten = 'Mua ngoài';
```

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| `middleware.ts` | `proxy.ts` (Next 16) | already in repo; redirects in `next.config.ts` still precede it |
| antd v5 props | v6 props (bẫy 11) | no new antd props in this phase |

## Runtime State Inventory (rename phase)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `cong_doan.ten='Mua ngoài'` (data, on cloud + local); `don_dat_hang.ngay_giao_du_kien` values; `san_pham.can_ra*` flags; `nhat_ky_sua` rows with `can_ra_dvt`/`da_xac_nhan_ra` labels | **Data migration** (UPDATE ten); the other three: keep, no action (code stops reading/writing) |
| Live service config | Vercel project env / config: none keyed on route names; `vercel.json` (branch -b) has a cron — grep it for route strings at execution (only `/api/cron/ma-hoa` seen). No n8n/Datadog/etc. | None found — verified by grep of repo; planner re-grep `vercel.json` |
| OS-registered state | None — verified: no launchd/pm2/Task Scheduler in repo | None |
| Secrets/env vars | None reference these names | None |
| Build artifacts | `.next/` cache holds old route manifests; `tsconfig.tsbuildinfo` | Stale only locally; `npm run build`/dev restart regenerates. No installed package carries the names |
| **User bookmarks / browser history** | old `/dat-hang/*`, `/hoa-don/*`, `/xuat-kho/*`, `?tiep_tuc=/hoa-don/…` | **Handled by redirects** (307, uncached) — keep rules indefinitely |
| **Printed/saved docs** | none store URLs | None |

Canonical question answer: after every file is updated, the only runtime state still holding old strings is `cong_doan.ten` (fixed by migration) and users' bookmarks (fixed by redirects).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tsx assert scripts (pure functions, Excel reader, route matrix) + pgTAP + `npm run check` + browser UAT |
| Config file | none (scripts run via `npx tsx`); pgTAP in `supabase/tests/*.sql` |
| Quick run command | `npx tsx scripts/test-pure-functions.ts` |
| Full suite command | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-excel-reader.ts && npx tsx scripts/test-route-permissions.ts` (dev server up) `&& SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEN-01 | Menu labels/hrefs, group order, 4-tab bar | unit | `npx tsx scripts/test-pure-functions.ts` (update L333-354, add label asserts) | ✅ edit |
| TEN-01 | Mobile bottom bar shows "Đơn đặt"/"Duyệt đơn" at 375px | manual-only (visual) | browser | — |
| TEN-02 | New routes gated like old; old → new keeps sub-path; `/xuat-kho` direct | integration | `npx tsx scripts/test-route-permissions.ts` | ✅ edit |
| TEN-02 | Query string preserved; unauth → `tiep_tuc` = new path | integration | new check in same script | ❌ Wave 0 (17-01) |
| TEN-03 | "Đơn đặt" in product table/info tab/CSV | unit+manual | add assert on `buildReorderCsv` header row in test-pure; browser for columns | ❌ add |
| TEN-04 | `ten` renamed; old+new names resolve | pgTAP | `supabase test db` → `105_ten_hang_ngoai_test.sql` | ❌ Wave 0 (17-02) |
| TEN-04 | Excel export/preview show "Hàng ngoài" | manual | export from Danh sách hàng hóa, check cell | — |
| TEN-05 | No filter/alert/button/tag; `toListRpcArgs` no `p_can_ra`; old `?can_ra=1` ignored | unit + manual | test-pure (`readFilterFromUrl(new URLSearchParams("can_ra=1"))` equals default) + browser | ✅ edit |
| DDAT-01 | No Ngày giao field in create/edit/list/detail/print; insert omits column | typecheck + manual | `npm run check` (removed fields break stale refs) + browser | — |
| DDAT-02 | Print recipient name-only | unit | test-pure `recipientDisplayName` | ❌ add |
| DDAT-03 | Print shows Người đặt + In lúc HH:mm DD/MM/YYYY | manual | open `/don-dat/<id>/in`, Ctrl+P | — |

### Sampling Rate
- **Per task commit:** `npm run typecheck` + `npx tsx scripts/test-pure-functions.ts`
- **Per wave merge:** `npm run check` + route matrix (W1) / pgTAP (W1 17-02)
- **Phase gate:** full suite above green + browser pass on: menu (desktop + 375px), `/don-dat`, `/don-dat/moi`, an order detail, `/don-dat/<id>/in`, `/duyet-don`, a hóa đơn detail + `/in`, `/danh-muc` (expand a row), old URLs typed by hand (`/hoa-don/<id>?x=1`, `/xuat-kho`), logged-out `/dat-hang/<id>`, console clean (bẫy 11, 19)

### Wave 0 Gaps
- [ ] `supabase/tests/105_ten_hang_ngoai_test.sql` — TEN-04
- [ ] full-`Location` redirect helper in `scripts/test-route-permissions.ts` — TEN-02 query + tiep_tuc
- [ ] asserts for `recipientDisplayName`, CSV header "Đơn đặt", `can_ra` URL ignored in `scripts/test-pure-functions.ts`

## Open Questions

1. **A1 — How far to rename "hóa đơn"?**
   - Known: requirement says "Duyệt đơn" replaces "Hóa đơn" as the menu/page name; says nothing about the document noun.
   - Unclear: should the "Tạo hóa đơn" button, "Hóa đơn" metric cards, thẻ kho type labels also change?
   - Recommendation: rename only screen names + back-links/headings/empty-state; keep noun everywhere else (table in §2). Confirm with user before 17-01 executes the optional rows.
2. **A2 — "ĐVT mâu thuẫn" badge** (`can_ra_dvt`) is a sibling of Cần rà. Recommend remove with it (same drawer alert, same family). Confirm.
3. **A3 — "không kèm mã nhân viên"**: no staff-code field exists; closest matches are the "Nội bộ —" prefix and the partner code. Recommend name-only for both recipient kinds on the Phiếu lấy hàng. Confirm wording with user (one-line change either way).
4. **Base branch.** Brief says branch `-b` with main merged; git says checkout = main and `-b` is diverged. Confirm which branch Phase 17 executes on (affects only migration number and trivial merges).
5. Mobile label "Duyệt đơn" is 9 characters vs the ≤~8 note in `navigation.ts`; verify fit at 375px, fall back to "Duyệt" only if it truncates.

## Sources

### Primary (HIGH confidence)
- Repo grep/Read of `/Users/hungly/Desktop/Projects/kiotviet` (main @ 799b364) and `git archive feature/quy-chuan-ma-b` for diff — all inventories in §1-§8
- `supabase/migrations/0018_du_lieu_nen.sql`, `0034_import_danh_muc.sql` (`khop_danh_muc`), `0040_danh_muc_phu.sql`, `0078_hoan_thanh_don.sql` (`chi_tiet_don`), `0086_truong_quy_chuan.sql`
- https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects (v16.3.8, lastUpdated 2026-06-30) — query pass-through, `:path*`, redirects before filesystem, 307 vs 308

### Secondary (MEDIUM)
- Next.js routing order (headers → redirects → proxy) — documented in Next proxy docs; also consistent with this repo's existing `/xuat-kho` matrix row ("redirect trong next.config.ts chạy TRƯỚC proxy") that already passes in the project's own test.

### Tertiary (LOW)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libs
- Architecture / inventories: HIGH — exhaustive grep on real tree, cross-checked main vs branch -b
- Pitfalls: HIGH for code-level; MEDIUM for migration-number/branch topology (other branches are moving)
- Interpretation of DDAT-02 and "hóa đơn" scope: MEDIUM — flagged A1/A3

**Research date:** 2026-10-03
**Valid until:** 2026-10-10 (quy-chuan branches are moving; re-check `git branch -a` and `ls supabase/migrations` at plan time)

## Resolved Decisions (user, 2026-10-03)

- **A1:** "Duyệt đơn" chỉ thay TÊN MÀN — menu, tiêu đề trang, link quay lại, trạng thái rỗng. Chứng từ vẫn gọi "hóa đơn" ở mọi chỗ khác (nút "Tạo hóa đơn", loại chứng từ trên thẻ kho, số HĐ, nhãn quyền "Sửa hóa đơn").
- **A2:** Bỏ luôn nhãn "ĐVT mâu thuẫn" (`can_ra_dvt`) cùng "Cần rà". Cột DB giữ.
- **A3:** Phiếu lấy hàng in người nhận CHỈ TÊN đầy đủ — bỏ tiền tố "Nội bộ —" và mã đối tác. `formatRecipient` giữ nguyên cho các màn khác; thêm helper riêng.
- **Base branch:** Phase 17 làm trên nhánh tách từ `main` (không phụ thuộc quy chuẩn). Migration dữ liệu dùng số **0089** (0085–0088 đã có ở các nhánh quy chuẩn).
- Nhãn mobile "Duyệt đơn": kiểm ở 375px, chỉ rút gọn thành "Duyệt" nếu bị cắt.
