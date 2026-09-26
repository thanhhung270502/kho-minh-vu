---
phase: 07-trang-tong-quan
plan: 08
subsystem: dashboard-components
tags: [dashboard, antd, query-state, stock-by-group, drilldown]
requires:
  - "07-06: useStockByGroup(groupBy, warehouseId), StockByGroupRow type"
  - "07-04: buildInventoryDrilldownUrl, StockGroupBy"
provides:
  - "src/features/dashboard/components/stock-by-group-table.tsx: StockByGroupTable"
  - "src/features/dashboard/components/stock-by-group-section.tsx: StockByGroupSection"
affects:
  - "07-09: ghép ba khối (khối này + sales-pace-card + negative-stock-section) vào dashboard-view.tsx / trang /"
tech-stack:
  added: []
  patterns:
    - "Bảng số mã bấm được: từng ô số > 0 là next/link qua buildInventoryDrilldownUrl, không tự ghép chuỗi URL"
    - "Table.Summary.Row cộng khi render, không lưu useState"
key-files:
  created:
    - src/features/dashboard/components/stock-by-group-table.tsx
    - src/features/dashboard/components/stock-by-group-section.tsx
  modified: []
decisions:
  - "sumBy(rows: readonly StockByGroupRow[], ...) — Table.Summary nhận pageData kiểu readonly từ antd, không ép sang mảng thường"
  - "Màu ô 'Âm'/'Dưới định mức' áp cho cả text thường lẫn link (style={{ color }}) — giữ tín hiệu màu nhất quán dù ô đó bấm được hay không"
metrics:
  duration: "~20 phút"
  completed: "2026-09-26"
---

# Phase 07 Plan 08: Khối tồn theo nhóm hàng / công đoạn Summary

Khối "Tồn theo nhóm hàng / công đoạn" (TQAN-01): hai tab dùng chung một khuôn bảng, lọc kho gộp mặc định, mỗi con số khác 0 là link mở `/ton-kho` lọc sẵn đúng nhóm + trạng thái + kho — không dựng bảng chi tiết mới (D-08). Chưa ghép vào trang `/` — đó là việc của 07-09.

## Đã làm

- **`stock-by-group-table.tsx`**: `StockByGroupTable({ rows, groupBy, warehouseId })` — cột đầu là tên nhóm/công đoạn (`groupName ?? "Chưa phân nhóm"/"Chưa gán công đoạn"` theo `groupBy`, sorter `localeCompare("vi")`), năm cột số (Tổng mã/Còn hàng/Hết hàng/Âm/Dưới định mức) canh phải, sorter số. Mỗi ô là `next/link` qua `buildInventoryDrilldownUrl({ groupBy, groupId, warehouseId, stockStatus })` khi `groupId !== null && value > 0`; "Âm" tô `token.colorError`, "Dưới định mức" tô `token.colorWarning`. `Table` `rowKey="key"`, `size="small"`, `pagination={false}`, `scroll={{ x: "max-content", y: 480 }}`, `summary` cộng từng cột số khi render (`sumBy`). 118 dòng.
- **`stock-by-group-section.tsx`**: `StockByGroupSection()` — state cục bộ `groupBy` (mặc định "category") và `warehouseId` (mặc định `""` = tất cả kho, đổi sang `null` khi gọi hook). `Card` với `Select` kho ở `extra` (option đầu `{ value: "", label: "Tất cả kho" }` + danh mục từ `useLookups().data?.warehouses`), `Tabs` hai tab "Theo nhóm hàng"/"Theo công đoạn", `QueryState` bọc `StockByGroupTable` với `emptyDescription="Chưa có mã đang kinh doanh nào để thống kê."`, dòng chú thích D-17/D-08 bên dưới. 69 dòng.

## Xác minh

- `npm run typecheck && npm run lint` xanh riêng từng file, `npm run check` (typecheck+lint+build) xanh toàn bộ — route `/` vẫn build được dù component chưa được import (yêu cầu acceptance criteria Task 2).
- Cả hai lệnh `<verify><automated>` của `07-08-PLAN.md` chạy và in `OK`; bốn giá trị `"con_hang"`/`"het_hang"`/`"am"`/`"duoi_dinh_muc"` đều có trong `stock-by-group-table.tsx`; không `"/ton-kho?"` ghép tay; không `value: null` trong `stock-by-group-section.tsx`; `useStockByGroup` có mặt.
- Cả hai file có `"use client"` dòng đầu, ≤ 200 dòng.

## Deviations from Plan

**1. [Rule 1 - Bug] `readonly StockByGroupRow[]` cho tham số `sumBy`**
- **Found during:** Task 1, `npm run typecheck` sau khi viết `summary`
- **Issue:** `Table.Summary` của antd v6 truyền `pageData` kiểu `readonly StockByGroupRow[]` vào callback `summary`, không khớp chữ ký `sumBy(rows: StockByGroupRow[], ...)` ban đầu — lỗi TS2345.
- **Fix:** Đổi chữ ký `sumBy` sang `readonly StockByGroupRow[]`.
- **Files modified:** `src/features/dashboard/components/stock-by-group-table.tsx`
- **Commit:** `e13096c`

## Known Stubs

None.

## Threat Flags

None — T-07-24 (URL drill-down) mitigate đúng theo threat_model của plan: URL dựng qua `buildInventoryDrilldownUrl` → `writeInventoryFilterToUrl` (`URLSearchParams`), không tự ghép chuỗi. T-07-25 (tên nhóm hiển thị) chấp nhận theo threat_model — render qua JSX text bình thường, React tự escape.

## Self-Check: PASSED

- FOUND: src/features/dashboard/components/stock-by-group-table.tsx
- FOUND: src/features/dashboard/components/stock-by-group-section.tsx
- FOUND commit e13096c (feat(07-08): bang so ma theo nhom bam mo ton kho)
- FOUND commit 387fab6 (feat(07-08): khoi ton theo nhom va cong doan)
