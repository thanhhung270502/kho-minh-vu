---
phase: 20-giao-dien-3b
plan: 06
subsystem: types-contracts
tags: [types, pure-functions, tdd, supabase-types]
requires: ["20-01", "20-02", "20-03"]
provides:
  - "database.types.ts sinh lại từ DB local (có 0092-0094)"
  - "global-search: toGlobalSearchResult + search-results lib"
  - "dashboard: mapper tổng quan 3b + overview-format"
  - "sales-order: mapper đếm/cộng dồn, date-presets, order-progress"
affects: [20-09, 20-10, 20-11, 20-12, 20-13, 20-14, 20-15]
key-files:
  created:
    - src/features/global-search/types.ts
    - src/features/global-search/lib/search-results.ts
    - src/features/dashboard/lib/overview-format.ts
    - src/features/sales-order/lib/date-presets.ts
    - src/features/sales-order/lib/order-progress.ts
  modified:
    - src/types/database.types.ts
    - src/features/dashboard/types.ts
    - src/features/sales-order/types.ts
    - src/features/sales-order/schemas/order.schema.ts
    - scripts/test-pure-functions.ts
decisions:
  - "Chạy migration up --local --include-all: 0092-0094 vào lịch sử, idempotent, không lỗi"
  - "Sinh kiểu bằng --db-url local (diff chỉ +82 dòng, đúng 7 hàm RPC)"
metrics:
  tasks: 3
  files: 10
---

# Phase 20 Plan 06: Hợp đồng TypeScript cho màn 3b Summary

Đồng bộ lịch sử migration 0092-0094 trên DB local, sinh lại `database.types.ts`, và thêm kiểu miền + mapper + hàm thuần (có assert) cho tìm kiếm toàn cục, tổng quan và đơn đặt.

## Exports mới

**global-search** (`types.ts`, `lib/search-results.ts`)
- `type SearchKind = "product"|"document"|"order"|"partner"`; `type GlobalSearchResult { key, kind, id, label, hint, documentType, status, rank }`
- `toGlobalSearchResult(row): GlobalSearchResult | null` (loại lạ → null)
- `searchResultHref(r): string | null` (CHUYEN_KHO → null; partner → `/doi-tac?q=`)
- `groupSearchResults(results): { kind, title, items }[]`, `defaultActiveIndex(flat, query): number`
- `SEARCH_GROUP_ORDER`, `SEARCH_GROUP_LABELS`, `DOCUMENT_TYPE_LABELS`

**dashboard** (`types.ts`, `lib/overview-format.ts`)
- Kiểu: `OverviewKpis`, `NegativeByWarehouse`, `FlowDay`, `IdleProduct`; `StockByGroupRow.totalQuantity`
- Mapper: `toOverviewKpis(row)`, `toFlowDay(row)`, `toIdleProduct(row)`
- Format: `percentChange(cur, prev|null)`, `formatPercentDelta(pct|null, monthNo)`, `previousMonthNumber(iso)`, `formatMoneyShort(n) -> {value, unit}`, `buildInventoryKpi(kpis, todayIso) -> {label,value,unit,delta}` (D-04), `newProductsLabel`, `averageIssuesLabel`, `oldestPendingLabel`, `examplesLabel(examples,total)`, `pendingBreakdownLabel(total,receipts,issues)`, `negativeByWarehouseLabel`, `groupShare(rows) -> Map<key, %>`, `formatUpdatedAt(ms)`

**sales-order**
- `types.ts`: `OrderStatusCounts {byStatus, total}`, `toOrderStatusCounts(rows)`, `AddOrderLineResult {lineId, merged, quantity}`, `toAddOrderLineResult(row)`
- `schemas/order.schema.ts`: `OrderStatusCountKey`, `statusCountKeyOf(filter)`, `toOrderStatusCountRpcArgs(filter)`, `toAddOrderLineRpcArgs(orderId, line)`
- `lib/date-presets.ts`: `DatePreset`, `DATE_PRESETS`, `DATE_PRESET_LABELS`, `todayInVietnam(now?)`, `datePresetRange(preset, today)`, `activeDatePreset(from, to, today)`
- `lib/order-progress.ts`: `orderProgress(shipped, ordered) -> {percent|null, label}`

## Commits
- 9ad1523 feat(tim-kiem): kiểu + hàm thuần kết quả tìm kiếm toàn cục, sinh lại database.types
- ddc8dd9 feat(tong-quan): mapper RPC tổng quan 3b + hàm định dạng KPI có test
- abea1bc feat(don-dat): mapper đếm trạng thái/cộng dồn, preset ngày giờ VN, % tiến độ có test

## Deviations from Plan
- Tests được thêm dạng khối đồng bộ trước dòng `void Promise.all(...)` cuối `test-pure-functions.ts` (không phải trong hàm async). Không ảnh hưởng hành vi.
- `npm run check` (có `next build`) không chạy trong worktree (Turbopack từ chối node_modules symlink); đã chạy `npm run typecheck` + `npm run lint` (xanh, 0 warning) + `npx tsx scripts/test-pure-functions.ts` (xanh). Orchestrator chạy full check sau merge.
- Các cột RPC sinh kiểu là `number` (không `string`); mapper vẫn `Number()` để chắc chắn với numeric trả dạng chuỗi.

## Known Stubs
None.

## Self-Check: PASSED
- 5 file tạo mới tồn tại; 3 commit có trong `git log`; migration 0092-0094 có trong `supabase_migrations.schema_migrations`.
