---
phase: 20-giao-dien-3b
plan: 04
subsystem: ui
tags: [design-tokens, antd, tailwind, manrope]
requirements: [UI3B-01]
key-files:
  modified:
    - src/app/layout.tsx
    - src/providers/antd-theme.ts
    - src/app/globals.css
    - src/shared/lib/design-tokens.ts
    - src/shared/lib/status-tone.ts
    - src/shared/components/status-dot.tsx
    - src/features/sales-order/lib/order-status.ts
    - src/shared/components/page-header.tsx
metrics:
  completed: 2026-10-04
---

# Phase 20 Plan 04: Token design system 3b Summary

Đổi toàn app sang "hướng 3b" chỉ bằng giá trị token: Manrope, nút viên thuốc, thẻ bo 16, nền trắng, chip hoàn thành nền đen, tiêu đề trang 30/800.

## Token đã đổi (cũ -> mới)

- Font: Be Vietnam Pro 400-700 -> Manrope 400-800 (latin+vietnamese)
- antd: borderRadius 8->10, LG 12->16, SM 7->8; colorBgLayout/Layout.bodyBg #FAFAFA->#FFFFFF; colorBorderSecondary #EBEBEB->#EDEDED; colorFillTertiary #FAFAFA->#F5F5F5; Table headerBg #FCFCFC->#FAFAFA
- Button radius 9->9999 (cả LG/SM), fontWeight 500->600; Tag radius 6->9999; Input/InputNumber/Select/DatePicker radius 8->10; Card LG 12->16
- Segmented: track trắng->#F5F5F5, mục chọn đen/trắng -> trắng/đen, radius 10->9, SM 7; Statistic 24->28; fontWeightStrong 700
- Màu: cam #E08A1E->#BF6600, đỏ #D9352B->#CC2827 (antd + design-tokens); CHART_COLORS #C7C7C7->#D4D4D4 và cam/đỏ mới
- globals.css: canh-bao/chu/nen/nguy-hiem theo oklch mới; nen-trang #FAFAFA->#FFFFFF; vien #EBEBEB->#EDEDED; radius-the 12->16; header-bang #FCFCFC->#FAFAFA; thêm nen-phu #F5F5F5, vien-input #E5E5E5; tiêu đề cột bảng chữ thường 12/600. Giữ nen-tong #FAFAFA và thứ tự @layer.
- StatusTone thêm `complete` (nền đen chữ trắng, chấm trắng ở badge); BADGE.active #F3F3F1; badge h-6, 12.5/700, chấm 6px; ORDER_STATUS_TONES.HOAN_THANH = complete
- PageHeader: 30px/800/-0.04em, mô tả 13.5px

## Deviations

- `npm run check`: typecheck và lint xanh; `next build` không chạy được trong worktree vì Turbopack từ chối symlink node_modules ("points out of the filesystem root"). Đây là hạn chế môi trường worktree, không phải lỗi code; cần chạy `npm run check` ở checkout chính sau khi gộp.
- Thêm chi tiết nhỏ ngoài plan: chấm trắng cho badge `complete` (chấm đen trên nền đen sẽ tàng hình).

## Rủi ro trực quan cần soát ở UAT

- R7: nút pill (9999) trong Space.Compact / Input addon / nút gắn liền ô nhập.
- P9: khối dựa vào nền #FAFAFA (nen-tong, hàng nhập dòng) trên nền trang trắng mới; footer Table #FAFAFA.
- Chữ Manrope rộng hơn Be Vietnam Pro: kiểm các cột hẹp, thanh tab thủ kho trên điện thoại.

## Commits

- 35ca428 style(ui): token design system 3b
- bbe1a1f style(ui): chip trạng thái và tiêu đề trang kiểu 3b

## Self-Check: PASSED
