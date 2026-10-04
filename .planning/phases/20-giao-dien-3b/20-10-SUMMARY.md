---
phase: 20-giao-dien-3b
plan: 10
subsystem: dashboard
tags: [dashboard, kpi, recharts, sparkline]
requires: [20-04, 20-06]
provides: [KpiStrip, FlowChartCard, Sparkline, useOverviewKpis, useFlowByDay, useIdleProducts]
key-files:
  created:
    - src/features/dashboard/components/sparkline.tsx
    - src/features/dashboard/components/kpi-strip.tsx
    - src/features/dashboard/components/flow-chart-card.tsx
  modified:
    - src/features/dashboard/api/dashboard.api.ts
    - src/features/dashboard/api/dashboard.keys.ts
    - src/features/dashboard/hooks/useDashboard.ts
    - src/features/dashboard/components/dashboard-view.tsx
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 10: Tổng quan 3b phần A Summary

Hàng 4 KPI có sparkline SVG thuần, biểu đồ Nhập – Xuất cột đôi 7N/30N/90N, và `DashboardView` sắp lại để widget mới đứng trên các khối cũ.

## Tasks

1. api/keys/hooks cho `tong_quan_chi_so`, `nhap_xuat_theo_ngay`, `khong_luan_chuyen` + `Sparkline` — f9557d0
2. `KpiStrip`, `FlowChartCard`, sắp lại `DashboardView` — commit kế tiếp (xem git log)

## Ghi chú cho 20-14

- `useIdleProducts()` (và `fetchIdleProducts`, `dashboardKeys.idleProducts`) đã sẵn.
- Neo `id="xuat-am"` bọc `NegativeStockSection` đã sẵn cho CTA "Xem phiếu".
- "Phiếu xuất hôm nay" lấy `useSalesPace().today.documentCount` (D-01); sparkline lấy `nhap_xuat_theo_ngay(30)`.
- Ô giá trị tồn có Tooltip ghi rõ là ước tính (D-09).

## Deviations from Plan

- `npm run check` đầy đủ không chạy được trong worktree (Turbopack từ chối node_modules symlink); chỉ chạy `typecheck` + `eslint` — cả hai sạch. Orchestrator chạy build sau merge. Chưa mở trình duyệt (không dev server theo chỉ dẫn).
- Viền ô KPI dùng biến thể Tailwind `max-lg:nth-[n+3]:border-t max-lg:even:border-l lg:not-first:border-l` — cần mắt kiểm khi UAT.

## Known Stubs

None.

## Self-Check: PASSED
