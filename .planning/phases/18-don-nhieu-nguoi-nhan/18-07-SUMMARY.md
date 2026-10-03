---
phase: 18-don-nhieu-nguoi-nhan
plan: 07
subsystem: stock-out
tags: [react, antd, supabase, duyet-don]
requires: ["18-03"]
provides:
  - "fetchIssueLines nối nguoi_nhan_dong_chung_tu vào dòng hóa đơn"
  - "issueRecipients(issue) dựng OrderRecipients từ hóa đơn"
  - "Duyệt đơn hiện nhân viên nhận (chỉ đọc), cột Người nhận theo dòng, phiếu giao hàng in nhân viên nhận"
affects: [18-08]
key-files:
  modified:
    - src/features/stock-out/types.ts
    - src/features/stock-out/api/issue.api.ts
    - src/features/stock-out/hooks/useIssues.ts
    - src/features/stock-out/components/issue-header.tsx
    - src/features/stock-out/components/issue-detail.tsx
    - src/features/stock-out/components/issue-line-columns.tsx
    - src/features/stock-out/components/issue-line-table.tsx
    - src/features/stock-out/components/delivery-print-template.tsx
    - src/features/stock-out/components/similar-code-hint.tsx
key-decisions:
  - "Người nhận trên hóa đơn chỉ đọc; bỏ ô sửa người nhận nội bộ"
requirements-completed: [NNHAN-05]
duration: 15min
completed: 2026-10-03
---

# Phase 18 Plan 07: Duyệt đơn hiện người nhận Summary

Hóa đơn sinh từ đơn hiện đủ nhân viên nhận (chỉ đọc) ở đầu phiếu, cột "Người nhận" theo dòng (dòng chung ghi "Chung" khi >= 2 nhân viên), và phiếu giao hàng in danh sách nhân viên nhận.

## Commits

- 0ef0ac4: dòng hóa đơn mang người nhận theo dòng (types, api, hook)
- 30304d8: hiện người nhận của đơn và theo dòng trên hóa đơn (5 component + similar-code-hint)

## Deviations from Plan

**1. [Rule 3 - Blocking] `similar-code-hint.tsx` đổi kiểu prop `IssueLine` sang `DocumentLine`**
- `NegativeStockPanel.renderLineExtra` đưa `DocumentLine`, không gán được cho `IssueLine` mới; hint không dùng trường người nhận nên nới kiểu là đủ. File này ngoài danh sách plan nhưng thuộc cùng feature.

**2. Rút bớt comment ở `issue-header.tsx`** để giữ <= 200 dòng (hiện 200).

## Verification

- `npx tsc --noEmit` toàn dự án: 0 lỗi. eslint `src/features/stock-out` sạch.
- `npx tsx scripts/test-pure-functions.ts`: xanh.
- Kiểm trên trình duyệt để 18-08.

## Known Stubs

None.

## Self-Check: PASSED

- Commit 0ef0ac4, 30304d8 có trong git log.
