---
phase: 18-don-nhieu-nguoi-nhan
plan: 03
subsystem: frontend-contracts
tags: [typescript, zod, supabase, mapper]
requires: ["18-02"]
provides:
  - "recipient.ts: OrderRecipients, StaffRef, formatOrderRecipients, lineRecipientLabel, isMultiRecipientOrder, COMMON_GOODS_LABEL"
  - "sales-order: recipients/recipientId trong mapper, orderRecipientsSchema, createOrder qua tao_don, setOrderRecipients, bộ lọc ?nhan_vien="
  - "documents: staffRecipients, withLineRecipients, fetchDocumentLineRecipients"
affects: [18-04, 18-05, 18-06, 18-07]
key-files:
  modified:
    - src/types/database.types.ts
    - src/shared/lib/recipient.ts
    - src/features/sales-order/types.ts
    - src/features/sales-order/schemas/order.schema.ts
    - src/features/sales-order/api/order.api.ts
    - src/features/sales-order/hooks/useOrders.ts
    - src/features/documents/types.ts
    - src/features/documents/schemas/document.schema.ts
    - src/features/documents/api/document.api.ts
    - scripts/test-pure-functions.ts
key-decisions:
  - "Bỏ hoàn toàn mô hình Recipient union; mọi nơi dùng OrderRecipients { partner, staff[] }"
  - "Hóa đơn không còn sửa người nhận ở header (bỏ internalRecipientId)"
requirements-completed: [NNHAN-01, NNHAN-02, NNHAN-03, NNHAN-04, NNHAN-05, NNHAN-06]
duration: 20min
completed: 2026-10-03
---

# Phase 18 Plan 03: Hợp đồng TS cho nhiều người nhận Summary

Sinh lại `database.types.ts` từ DB local (0090 + 0091), dựng hàm thuần người nhận, mapper/schema/api/hook của sales-order và documents; `test-pure-functions.ts` xanh toàn bộ.

## Commits

- c004276: kiểu người nhận nhiều-nhiều + regen database.types
- dd42ae5: mapper, schema, api người nhận đơn và dòng
- 8d3521e: người nhận hóa đơn theo đơn và theo dòng

## Deviations from Plan

- Fixture `sampleOrderLine` trong test được thêm `recipientId/recipientName: null` (bắt buộc theo kiểu mới). Không lệch nào khác.
- Hook pre-commit không chặn commit nào.

## Known Stubs

None.

## File còn đỏ typecheck (cố ý, chờ wave 4)

Kết quả `npx tsc --noEmit 2>&1 | grep -E "error TS" | sed -E 's/\(.*//' | sort | uniq -c`:

```
   1 src/features/sales-order/components/new-order-form.tsx            (18-04)
   2 src/features/sales-order/components/order-detail.tsx              (18-04/05)
   4 src/features/sales-order/components/order-header.tsx              (18-04)
   2 src/features/sales-order/components/order-recipient-field.tsx    (18-04)
   2 src/features/sales-order/components/order-table-body.tsx          (18-05)
   1 src/features/sales-order/components/picking-print-template.tsx   (18-06)
   3 src/features/stock-out/components/delivery-print-template.tsx    (18-07)
   3 src/features/stock-out/components/issue-detail.tsx               (18-07)
   5 src/features/stock-out/components/issue-header.tsx               (18-07)
```

(Cột plan là ước lượng theo phạm vi wave 4; plan tương ứng xác nhận khi sửa.)

CẢNH BÁO: KHÔNG push/deploy trước khi 18-08 xanh `npm run check`.

## Self-Check: PASSED

- Commit c004276, dd42ae5, 8d3521e có trong git log; `tsx scripts/test-pure-functions.ts` xanh; eslint sạch trên file của plan.
