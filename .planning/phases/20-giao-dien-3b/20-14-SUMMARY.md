---
phase: 20-giao-dien-3b
plan: 14
subsystem: dashboard
tags: [dashboard, attention-panel, stock-by-group]
requires: [20-02, 20-06, 20-10]
provides: [AttentionPanel, IdleProductsCard, buildStockStatusUrl]
key-files:
  created:
    - src/features/dashboard/components/attention-panel.tsx
    - src/features/dashboard/components/idle-products-card.tsx
  modified:
    - src/features/dashboard/lib/stock-drilldown.ts
    - src/features/dashboard/components/stock-by-group-section.tsx
    - src/features/dashboard/components/stock-by-group-table.tsx
    - src/features/dashboard/components/dashboard-view.tsx
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 14: Tổng quan 3b phần B Summary

Aside 300px với panel "Cần xử lý" (4 việc có CTA) và "Không luân chuyển > 30 ngày"; bảng Tồn theo nhóm thêm Tỷ trọng, SL tồn, %; lưới `1fr 300px`.

## Tasks

1. AttentionPanel, IdleProductsCard, buildStockStatusUrl — 57083cb
2. Bảng nhóm + bố cục lưới — 26b18fe

## Decisions

- Số dưới định mức / tồn âm cộng từ `useStockByGroup("category", null)` (cùng nguồn bảng); xuất âm hôm nay từ `useNegativeStockReport(null)`. Query phụ đang tải hiện "…", lỗi hiện "—" kèm tooltip.
- Việc có số 0 hiện "Không có", ẩn CTA, số màu nhạt.
- Cột đếm mã có link drill-down giữ nguyên (D-01); dòng tổng thêm tổng SL.

## Deviations from Plan

- `npm run check` không chạy được trong worktree; chỉ chạy `typecheck` + `eslint` (sạch). Chưa mở trình duyệt — orchestrator kiểm sau merge.
- Không bọc overflow-x-auto mới quanh bảng antd sticky (theo chỉ dẫn 579bf87); bỏ wrapper cũ trong table không đổi.

## Known Stubs

None.

## Self-Check: PASSED
