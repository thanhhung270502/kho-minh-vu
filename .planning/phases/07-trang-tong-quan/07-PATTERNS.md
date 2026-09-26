# Phase 7: Trang tổng quan - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 14 (11 WU × file groups in 07-WORK-UNITS.md)
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/0068_..._bao_cao_xuat_am.sql` (RPC `bao_cao_xuat_am`) | migration (RPC, read-only) | CRUD (aggregate read) | `supabase/migrations/0059_the_kho_ton_luy_ke.sql` (running-balance window fn) + `0060_de_xuat_dinh_muc.sql` (role guard shape) | role-match (running balance) / exact (guard) |
| `supabase/migrations/0068_..._ton_theo_nhom.sql` (RPC `ton_theo_nhom`) | migration (RPC, read-only) | CRUD (aggregate read) | `supabase/migrations/0067_duoi_dinh_muc_bo_ma_chua_dat.sql` (`danh_sach_ton_kho`, bản đang chạy) | exact — phải sao chép nguyên văn CTE `ton`/`loc` |
| `supabase/migrations/0068_..._nhip_ban.sql` (RPC `nhip_ban`) | migration (RPC, read-only) | CRUD (aggregate read) | `supabase/migrations/0066_kiem_ke_duyet.sql` (giờ VN) + `0060` (guard) | role-match |
| `supabase/tests/92_bao_cao_xuat_am_test.sql` | test (pgTAP) | batch | `supabase/tests/33_the_kho_luy_ke_test.sql` | exact (helper `dang_nhap_nhu`/`dang_xuat`/temp fixtures) |
| `supabase/tests/93_ton_theo_nhom_test.sql` | test (pgTAP) | batch | `supabase/tests/33_the_kho_luy_ke_test.sql` | exact (helpers), cross-check với `danh_sach_ton_kho` |
| `supabase/tests/94_nhip_ban_test.sql` | test (pgTAP) | batch | `supabase/tests/33_the_kho_luy_ke_test.sql` | exact (helpers) |
| `src/features/dashboard/types.ts` | model/mapper | transform | `src/features/inventory/types.ts` (pattern: `toXxx()` mapper VN→EN) — not read directly but same shape as `toInventoryRow` referenced in `inventory.api.ts` | role-match |
| `src/features/dashboard/api/dashboard.api.ts` | service (RPC caller) | request-response | `src/features/inventory/api/inventory.api.ts` | exact |
| `src/features/dashboard/api/dashboard.keys.ts` | utility (query keys) | — | `src/features/inventory/api/inventory.keys.ts` (referenced via `inventoryKeys` in `useInventory.ts`) | exact |
| `src/features/dashboard/hooks/useDashboard.ts` | hook | request-response | `src/features/inventory/hooks/useInventory.ts` | exact |
| `src/features/dashboard/lib/home-path.ts` | utility (pure fn, server-safe) | transform | `src/features/documents/lib/negative-reasons.ts` (pure fn, no "use client", single source of truth) | role-match |
| `src/features/dashboard/lib/stock-drilldown.ts` | utility (URL builder) | transform | `src/features/inventory/schemas/inventory.schema.ts` (`writeInventoryFilterToUrl`) — reused directly, not copied | exact (calls into it) |
| `src/app/(app)/page.tsx` | route (Server Component) | request-response | `src/features/auth/api/current-user.server.ts` (guard pattern) + existing `src/app/(app)/page.tsx` (current stub to replace) | role-match |
| `scripts/test-route-permissions.ts` (edit `/` row) | test (route matrix) | batch | itself — existing `/` row + `→${string}` `KyVong` type already supported | exact |
| `src/features/dashboard/components/sales-pace-card.tsx` | component | request-response | `src/features/stocktake/components/count-import-result.tsx` (`Statistic` grid pattern) | role-match |
| `src/features/dashboard/components/negative-stock-section.tsx` / `negative-stock-table.tsx` | component | request-response | `count-import-result.tsx` (Statistic strip + `Table` below) + `src/shared/components/query-state.tsx` | role-match |
| `src/features/dashboard/components/stock-by-group-section.tsx` | component | request-response | `count-import-result.tsx` (Table) + drill-down via `router.push` | role-match |
| `src/features/dashboard/components/dashboard-view.tsx` | component (page composition) | request-response | `src/app/(app)/page.tsx` current stub + `QueryState` usage pattern | role-match |

## Pattern Assignments

### `supabase/migrations/0068_*` — RPC `bao_cao_xuat_am` (D-01..D-04, D-12)

**Analog:** `supabase/migrations/0059_the_kho_ton_luy_ke.sql` (running balance) + `supabase/migrations/0060_de_xuat_dinh_muc.sql` (role guard + grant/revoke)

**Role guard pattern** (source: `0060_de_xuat_dinh_muc.sql` inside `dat_dinh_muc`):
```sql
if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
  raise exception 'Chỉ quản lý và văn phòng duyệt được định mức' using errcode = '42501';
end if;
```
For this phase, adapt to single-role check (D-12): `<> 'quan_ly'` → `raise exception ... errcode = '42501'`.

**Grant/revoke pattern** (source: `0058_rpc_ton_kho.sql:128-129`):
```sql
revoke all    on function public.<ten_ham>(...) from public, anon;
grant execute on function public.<ten_ham>(...) to authenticated;
```

**Running-balance CTE pattern** — the RESEARCH.md Pattern 1 SQL is already the concrete excerpt to copy (candidate filter `ung_vien` → distinct-pairs `cap` → windowed `luy_ke` ordered by `(created_at, id)`, never `ngay`). Source techniques: `0059_the_kho_ton_luy_ke.sql` (window function shape), `0008_so_cai_ton_kho.sql` (`kho_movement` columns, `la_but_toan_dao`), `0007_chung_tu.sql` (`ly_do_xuat_am`, `ghi_chu_ly_do`, index `idx_chung_tu_xuat_am`).

**Timezone default** (source: `0066_kiem_ke_duyet.sql:332`):
```sql
set ngay_ct = (now() at time zone 'Asia/Ho_Chi_Minh')::date
```
Use as `p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date`.

### `supabase/migrations/0068_*` — RPC `ton_theo_nhom` (D-05, D-06, D-08, D-12)

**Analog:** `supabase/migrations/0067_duoi_dinh_muc_bo_ma_chua_dat.sql` — the CURRENTLY RUNNING `danh_sach_ton_kho` definition (not 0058 — that's superseded). Copy `ton`/`loc` CTEs verbatim, replace final `select` with `group by` + `count(*) filter (...)`.

**Exact status-definition excerpt to copy (do NOT rederive):**
```sql
with ton as (
  select tk.san_pham_id,
         sum(tk.so_luong) as tong
  from public.ton_kho tk
  where (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
    and (p_kho_id is null or tk.kho_id = p_kho_id)
  group by tk.san_pham_id
), loc as (
  select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
         coalesce(ton.tong, 0) as tong
  from public.san_pham sp
  left join ton on ton.san_pham_id = sp.id
  where (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
)
-- status filters, copy VERBATIM from 0067 (not 0058):
--   con_hang:      l.tong > 0
--   het_hang:      l.tong = 0
--   am:            l.tong < 0
--   duoi_dinh_muc: l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu   -- 0067 fix, NOT plain `<`
```
`p_dang_kinh_doanh` MUST default `true` to match `DEFAULT_INVENTORY_FILTER.tradingStatus = "active"` in `inventory.schema.ts` (D-08 parity).

### `supabase/migrations/0068_*` — RPC `nhip_ban` (D-09, D-10, D-12)

**Analog:** Pattern 3 SQL in RESEARCH.md is already the concrete excerpt (uses `idx_chung_tu_loai_ngay`, `ct.trang_thai = 'HOAN_THANH'`, `ct.ngay_ct in (p_ngay, p_ngay - 1)`). Timezone default same as above (`0066_kiem_ke_duyet.sql`).

### pgTAP tests (`92_`, `93_`, `94_`)

**Analog:** `supabase/tests/33_the_kho_luy_ke_test.sql` — copy these helpers VERBATIM (already flagged reusable in RESEARCH.md):
```sql
create or replace function pg_temp.dang_nhap_nhu(p_email text) returns void ...
create or replace function pg_temp.dang_xuat() returns void ...
create or replace function pg_temp.sp_test(p_ma text) returns uuid ...
create or replace function pg_temp.kho_id(p_ma text) returns uuid ...
```
Structure: `begin; select plan(N); ... select * from finish(); rollback;` (standard pgTAP transaction wrapper used across `supabase/tests/*.sql`). Use years 2091-2093 or fabricated data in transaction rollback for date-based assertions — do not anchor on live document-number counters (project lesson, `.memory/index.md`).

### `src/features/dashboard/api/dashboard.api.ts`

**Analog:** `src/features/inventory/api/inventory.api.ts`

**Full pattern to copy** (imports, RPC call, error check, mapper call):
```typescript
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function fetchNegativeStockReport(
  date: string,
  warehouseId: string | null,
): Promise<NegativeStockLine[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("bao_cao_xuat_am", {
    p_ngay: date,
    p_kho_id: warehouseId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []).map(toNegativeStockLine);
}
```
Rule (from file header comment in `inventory.api.ts`): the `api/` file + `types.ts` mapper are the ONLY places allowed to touch Vietnamese RPC/column names — hooks/components only see English domain types.

### `src/features/dashboard/api/dashboard.keys.ts`

**Analog:** `inventoryKeys` (imported in `useInventory.ts` as `inventoryKeys.list(filter)`, `inventoryKeys.assignedWarehouses`, `inventoryKeys.reorderSuggestions(basis, page)`, `inventoryKeys.all`). Mirror this shape:
```typescript
export const dashboardKeys = {
  all: ["dashboard"] as const,
  salesPace: () => [...dashboardKeys.all, "sales-pace"] as const,
  negativeStock: (date: string, khoId: string | null) =>
    [...dashboardKeys.all, "negative-stock", date, khoId] as const,
  stockByGroup: (theo: "nhom" | "cong_doan", khoId: string | null) =>
    [...dashboardKeys.all, "stock-by-group", theo, khoId] as const,
};
```

### `src/features/dashboard/hooks/useDashboard.ts`

**Analog:** `src/features/inventory/hooks/useInventory.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

export function useNhipBan() {
  return useQuery({
    queryKey: dashboardKeys.salesPace(),
    queryFn: fetchSalesPace,
  });
}
```
For "Làm mới" (D-14, no polling/Realtime): compose a manual refetch-all function that calls `.refetch()` on all three `useQuery` results — no `useMutation` needed since these are read-only reports.

### `src/features/dashboard/lib/home-path.ts`

**Analog:** `src/features/documents/lib/negative-reasons.ts` — pure function file, explicitly NOT `"use client"` (bẫy 9 — CLAUDE.md), because it must be callable from the Server Component `page.tsx`.

```typescript
// Nguồn dạng: negative-reasons.ts — hàm thuần, không "use client", cả server và client đều import được.
import type { Role } from "@/shared/lib/permissions";

export function homePathForRole(role: Role): string {
  switch (role) {
    case "quan_ly": return "/";
    case "van_phong": return "/xuat-kho";
    case "thu_kho": return "/ton-kho";
    case "chi_xem": return "/ton-kho";
  }
}
```

### `src/app/(app)/page.tsx` (guard + redirect, D-11, D-12)

**Analog:** `src/features/auth/api/current-user.server.ts` (`requirePermission`/`requireKiotVietHistoryAccess` shape) — but explicitly do NOT use `requirePermission()` per RESEARCH.md Pitfall 4 (it redirects to `/khong-du-quyen`, not role-conditional). Write a direct guard in `page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/api/current-user.server";
import { homePathForRole } from "@/features/dashboard/lib/home-path";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (user.role !== "quan_ly") redirect(homePathForRole(user.role));
  return <DashboardView />;
}
```
Current stub being replaced (for reference, do not keep):
```typescript
// src/app/(app)/page.tsx (current — to delete)
import { NotImplemented } from "@/shared/components/not-implemented";
import { PageHeader } from "@/shared/components/page-header";
export default function DashboardPage() {
  return (<><PageHeader title="Tổng quan" .../><NotImplemented planned={[...]} /></>);
}
```

### `scripts/test-route-permissions.ts` (D-11/D-12 verification)

**Analog:** itself. The `KyVong` type already supports `` `→${string}` `` (arrow-redirect assertions), and `doMot()` already resolves RSC-redirect payloads. Only the `/` row's expected value needs to change from the current `AI_CUNG_XEM`-style `"200"` for every role to role-conditional targets:

```typescript
// Current row (line 39) — WRONG after Phase 7, must be replaced:
{ route: "/", ky_vong: { quanly: "200", vanphong: "200", thukho1: "200", chixem: "200", khach: "dangnhap" } },

// New row per D-11:
{ route: "/", ky_vong: { quanly: "200", vanphong: "→/xuat-kho", thukho1: "→/ton-kho", chixem: "→/ton-kho", khach: "dangnhap" } },
```
Follow the existing `/cai-dat` row (line 42) as the template for a role-conditional-redirect row — it is already the closest precedent (`"→/cai-dat/nguoi-dung"` etc.) in this exact file.

### `src/features/dashboard/components/sales-pace-card.tsx` (D-09)

**Analog:** `src/features/stocktake/components/count-import-result.tsx`

```tsx
"use client";
import { Statistic, theme } from "antd";

const { token } = theme.useToken();
<Statistic
  title="Số phiếu xuất hôm nay"
  value={data.todayCount}
  groupSeparator="."
  styles={{ content: { color: token.colorSuccess } }} // NOT valueStyle — antd v6 (bẫy 11)
/>
```
Wrap the whole card in `QueryState` (see `src/shared/components/query-state.tsx`); do not render from `query.data` directly.

### `negative-stock-section.tsx` / `negative-stock-table.tsx` (D-01..D-04)

**Analog:** `count-import-result.tsx` — `Statistic` strip + conditional `Table` below (`IssueTable` sub-component pattern for "no rows → render null / no rows → empty state" split). Reuse:
```tsx
import { negativeReasonLabel } from "@/features/documents/lib/negative-reasons";
```
For empty state, per D-04 use `QueryState`'s `emptyDescription` prop with a POSITIVE message:
```tsx
<QueryState query={query} emptyDescription="Hôm nay không có lần xuất âm nào.">
  {(rows) => <NegativeStockTable rows={rows} />}
</QueryState>
```

### `stock-by-group-section.tsx` (D-05..D-08)

**Analog:** `count-import-result.tsx` (Table) + drill-down via `buildInventoryDrilldownUrl` calling `writeInventoryFilterToUrl` (source: `src/features/inventory/schemas/inventory.schema.ts`). DO NOT hand-build query strings:
```typescript
import { writeInventoryFilterToUrl, DEFAULT_INVENTORY_FILTER } from "@/features/inventory/schemas/inventory.schema";

export function buildInventoryDrilldownUrl(opts: {
  categoryId?: string; stageId?: string; warehouseId?: string | null; stockStatus: StockStatus;
}): string {
  const params = writeInventoryFilterToUrl({
    ...DEFAULT_INVENTORY_FILTER,
    categoryId: opts.categoryId ?? null,
    stageId: opts.stageId ?? null,
    warehouseId: opts.warehouseId ?? null,
    stockStatus: opts.stockStatus,
  });
  return `/ton-kho?${params.toString()}`;
}
```
Note: `writeInventoryFilterToUrl` already omits `kinh_doanh` param when equal to default `"active"` — do NOT set trading status here so the drill-down inherits the same default `/ton-kho` uses (D-08 parity, per RESEARCH.md A2).

### `dashboard-view.tsx` (D-13, D-14)

**Analog:** existing stub `src/app/(app)/page.tsx` (for `PageHeader` usage) + `QueryState` composition pattern seen throughout `inventory`/`stocktake` features. Order sections top-to-bottom per D-13: Nhịp bán → Xuất âm → Tồn theo nhóm/công đoạn. "Làm mới" button calls `.refetch()` on all three query results (see `useDashboard.ts` above), `loading={anyQuery.isFetching}`.

## Shared Patterns

### RPC role guard (D-12) — apply to all 3 new RPCs
**Source:** `supabase/migrations/0060_de_xuat_dinh_muc.sql`
```sql
if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
  raise exception 'Chỉ quản lý xem được trang tổng quan' using errcode = '42501';
end if;
```

### RPC grant/revoke — apply to all 3 new RPCs
**Source:** `supabase/migrations/0058_rpc_ton_kho.sql:128-129`
```sql
revoke all    on function public.<fn>(...) from public, anon;
grant execute on function public.<fn>(...) to authenticated;
```

### Feature-layer VN→EN mapper boundary — apply to `dashboard.api.ts` + `types.ts`
**Source:** header comment, `src/features/inventory/api/inventory.api.ts:16-22` — api/ + types.ts are the ONLY files allowed to reference Vietnamese RPC/column names; hooks and components only see English domain types (`SalesPace`, `NegativeStockLine`, `StockByGroupRow`).

### Four-state UI (loading/error/empty/success) — apply to all dashboard sections
**Source:** `src/shared/components/query-state.tsx` — never render straight from `query.data`; wrap every read screen in `<QueryState>`.

### antd v6 prop names — apply to all new components
**Source:** `count-import-result.tsx` (`Statistic styles={{ content }}`, not `valueStyle`); `Alert title=`, not `message=` (see `query-state.tsx` line 49).

### Pure functions must not be `"use client"` — apply to `home-path.ts`, `stock-drilldown.ts`
**Source:** `src/features/documents/lib/negative-reasons.ts` — no client directive, so Server Component `page.tsx` can import `homePathForRole` directly (bẫy 9).

## No Analog Found

None — every file in 07-WORK-UNITS.md has at least a role-match analog already in the codebase. This phase introduces no new architectural shape (confirmed by RESEARCH.md summary).

## Metadata

**Analog search scope:** `supabase/migrations/`, `supabase/tests/`, `src/features/inventory/`, `src/features/documents/`, `src/features/stocktake/`, `src/features/auth/`, `src/shared/components/`, `src/shared/lib/`, `src/app/(app)/`, `scripts/`
**Files scanned:** ~20 (migrations 0058-0067, inventory feature files, stocktake component, auth server helper, permissions.ts, query-state.tsx, test-route-permissions.ts, pgTAP helper 33_*)
**Pattern extraction date:** 2026-09-26
