---
phase: 17-doi-ten-gon-don-dat
plan: 03
subsystem: database
tags: [migration, pgtap, rename, analytics]
requires: []
provides:
  - "cong_doan MUA_NGOAI hiện tên 'Hàng ngoài' (migration 0089, chỉ dữ liệu)"
  - "pgTAP 107: import nhận 'Hàng ngoài', 'Mua ngoài', 'MUA_NGOAI', 'hang ngoai'"
  - "Trang Phân tích và CSV đề nghị nhập ghi 'Đơn đặt'"
affects: [17-04, 17-05]
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - supabase/migrations/0089_ten_hang_ngoai.sql
    - supabase/tests/107_ten_hang_ngoai_test.sql
  modified:
    - src/features/analytics/lib/analysis.ts
    - src/features/analytics/components/reorder-table.tsx
    - src/features/analytics/components/analysis-view.tsx
    - src/features/analytics/types.ts
key-decisions:
  - "Không cần alias map ở TS: khop_danh_muc (0034) đã khớp theo mã có dấu cách"
  - "0089 / pgTAP 107 kiểm lại không bị nhánh nào chiếm"
requirements-completed: [TEN-03, TEN-04]
duration: 10min
completed: 2026-10-03
---

# Phase 17 Plan 03: Hàng ngoài và nhãn Đơn đặt Summary

Một UPDATE dữ liệu đổi tên công đoạn MUA_NGOAI sang "Hàng ngoài" (mã giữ), pgTAP chứng minh import vẫn nhận cả tên cũ lẫn mới, và nhãn "Khách đặt"/"KH đặt" ở Phân tích đổi thành "Đơn đặt".

## Tasks
1. Migration 0089 + pgTAP 107 — `51f1106` (RED 3/6 đỏ trước, GREEN 6/6 sau)
2. Nhãn "Đơn đặt" ở Phân tích — `6e6577a`

## Verification
- pgTAP 107, 63, 41, 62: PASS (36 test) trên DB local
- `npm run check` exit 0; `database.types.ts` không đổi
- Không còn "khách đặt"/"KH đặt" trong `src/features/analytics`; "có khách mua" giữ nguyên

## Deviations from Plan
Cách áp migration: `supabase migration up --local` từ chối (LegacyMigrationMissingLocalError, do DB local đã có 0085–0088 của nhánh quy-chuan). Áp thẳng file 0089 bằng `docker exec ... psql` (idempotent, `UPDATE 1`). Không push cloud, không reset.

Assert header CSV "Đơn đặt" do plan 17-04 thêm (theo plan).

## Known Stubs
None.

## Self-Check: PASSED
