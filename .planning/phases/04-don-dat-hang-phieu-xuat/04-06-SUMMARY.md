---
phase: 04-don-dat-hang-phieu-xuat
plan: 06
subsystem: api
tags: [typescript, zod, tanstack-query, supabase, sales-order]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 03
    provides: "danh_sach_don/chi_tiet_don/dong_don + chữ ký RPC duyệt (xac_nhan_don/mo_khoa_don/dong_don_som) và sinh_so_dh/tao_phieu_xuat_tu_don của plan 04-02/04-04"
  - phase: 04-don-dat-hang-phieu-xuat plan 05
    provides: "readUuid/readDate ở features/documents/lib/url-filter, documentKeys để invalidate chéo sau khi tạo phiếu xuất"
provides:
  - "OrderRow/OrderDetail/OrderLine + ba mapper toOrderRow/toOrderDetail/toOrderLine, remainingQuantity tính trong mapper (D-04)"
  - "OrderStatus + ORDER_STATUS_LABELS/ORDER_STATUS_COLORS ở lib thuần, không phụ thuộc client component"
  - "orderHeaderSchema/orderLineSchema + toOrderUpdate/toOrderLineUpdate — không trường giá nào"
  - "Bộ lọc URL /dat-hang: q, trang_thai, doi_tac, tu_ngay, den_ngay, trang — toOrderListRpcArgs viết riêng cho danh_sach_don"
  - "order.api.ts: fetchOrders/fetchOrderDetail/fetchOrderLines, createOrder (cấp số sinh_so_dh trong cùng hàm), updateOrderHeader, addOrderLine/updateOrderLine/deleteOrderLine, approveOrder/unlockOrder/closeOrderEarly, createIssueFromOrder"
  - "useOrders.ts: useOrders/useOrderDetail/useOrderLines + chín hook mutation, mọi hook đọc một bản ghi có enabled: id !== \"\""
affects: [04-07, 04-08, 04-09, 04-10, 04-11, 04-12, "mọi plan giao diện của Phase 4 dùng lớp dữ liệu này thay vì tự viết"]

tech-stack:
  added: []
  patterns:
    - "orderKeys KHÔNG đi qua documentKeys — đơn đặt hàng không phải chứng từ (loai_ct), tách namespace [\"orders\", ...] riêng"
    - "createOrder cấp số trên server (sinh_so_dh) rồi insert trong cùng một hàm — không ghép so_dh ở client, giống khuôn createReceipt"
    - "addOrderLine không truyền don_gia trong payload insert — cột giữ mặc định 0 ở tầng database, không phải client set 0 tường minh"
    - "useCreateIssueFromOrder invalidate thêm documentKeys.all (phiếu xuất mới hiện ở /xuat-kho) nhưng không invalidate cache danh mục sản phẩm — tạo phiếu chưa ghi sổ, chưa đụng tồn/giá vốn"

key-files:
  created:
    - src/features/sales-order/types.ts
    - src/features/sales-order/lib/order-status.ts
    - src/features/sales-order/schemas/order.schema.ts
    - src/features/sales-order/api/order.keys.ts
    - src/features/sales-order/api/order.api.ts
    - src/features/sales-order/hooks/useOrders.ts
  modified: []

key-decisions:
  - "Comment giải thích 'đơn không mang giá' hai lần vô tình chứa nguyên văn chuỗi cấm (unitPrice, productKeys) và tự làm hỏng grep acceptance criteria của chính plan — sửa cách diễn đạt, không đổi ý nghĩa (lặp lại đúng bài học đã ghi ở 04-03-SUMMARY.md)"
  - "Bỏ ép kiểu (as ...) thừa ở cuối createIssueFromOrder sau khi xác nhận bằng file TS thử riêng rằng data.id đã đúng kiểu string không cần ép — giữ code đúng khuôn 'không workaround' của CORE_RULES.md"

requirements-completed: [DDH-01, DDH-02, DDH-03, DDH-04]

duration: 28min
completed: 2026-09-20
---

# Phase 4 Plan 06: Lớp dữ liệu đơn đặt hàng Summary

**Sáu file `src/features/sales-order/` (kiểu, schema, bộ lọc URL, query key, lớp gọi Supabase, hook TanStack Query) khép kín hợp đồng dữ liệu cho ba plan giao diện đơn ở Wave 7–9 — chưa có component nào, và đơn không mang giá ở bất kỳ tầng nào.**

## Performance

- **Duration:** ~28 phút
- **Tasks:** 2/2
- **Files modified:** 6 (toàn bộ file mới)

## Accomplishments

- `OrderRow`/`OrderDetail`/`OrderLine` suy từ `Returns` của `danh_sach_don`/`chi_tiet_don`/`dong_don` (04-03), không tự viết tay; `remainingQuantity` tính trong `toOrderLine` bằng `Math.max(0, orderedQuantity - shippedQuantity)` — D-04, không lưu cột, không lưu state.
- `OrderStatus` + nhãn/màu ở `lib/order-status.ts` (file thuần, không `"use client"`) khớp đúng trục duyệt bốn giá trị `TAM | DA_XAC_NHAN | HOAN_THANH | DA_HUY` của migration 0051.
- `order.schema.ts` viết bộ lọc URL riêng (`?doi_tac=` thay vì `?ncc=` của màn nhập, không có `?kho=`/`?nguon=` vì đơn không có hai trục đó) và `toOrderListRpcArgs` viết mới hoàn toàn — không mượn `toReceiptListRpcArgs`.
- `order.api.ts`: `createOrder` cấp số qua `sinh_so_dh` rồi `insert` trong cùng một hàm (không ghép số ở client); `addOrderLine` cố tình không đưa `don_gia` vào payload insert để cột giữ mặc định 0; năm hàm đổi trạng thái/tạo phiếu (`approveOrder`, `unlockOrder`, `closeOrderEarly`, `createIssueFromOrder`) gọi đúng năm RPC đã chốt chữ ký ở 04-02/04-04.
- `useOrders.ts`: 12 hook, hai hook đọc một bản ghi đều có `enabled: id !== ""` (bẫy 10); `useCreateIssueFromOrder` invalidate thêm `documentKeys.all` để phiếu xuất mới hiện ngay ở `/xuat-kho`, không invalidate cache danh mục sản phẩm (tạo phiếu chưa ghi sổ, chưa đụng tồn/giá vốn).

## Task Commits

1. **Task 1: Kiểu, nhãn trạng thái, schema và query key của đơn** - `7a78840` (feat)
2. **Task 2: Hàm gọi Supabase và hook TanStack Query cho đơn** - `040bcfa` (feat)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `src/features/sales-order/lib/order-status.ts` - `OrderStatus`, `ORDER_STATUSES`, `ORDER_STATUS_LABELS`, `ORDER_STATUS_COLORS`
- `src/features/sales-order/types.ts` - `OrderRow`/`OrderDetail`/`OrderLine` + `toOrderRow`/`toOrderDetail`/`toOrderLine` + `isFullyShipped`
- `src/features/sales-order/schemas/order.schema.ts` - `orderHeaderSchema`/`orderLineSchema`, `toOrderUpdate`/`toOrderLineUpdate`, `OrderFilter` + bộ lọc URL + `toOrderListRpcArgs`
- `src/features/sales-order/api/order.keys.ts` - `orderKeys` (namespace `["orders", ...]` riêng, không qua `documentKeys`)
- `src/features/sales-order/api/order.api.ts` - Toàn bộ hàm gọi Supabase của đơn
- `src/features/sales-order/hooks/useOrders.ts` - Hook TanStack Query bọc lớp `api`

## Danh sách export đầy đủ (để plan 04-08/04-09/04-12 khỏi đoán)

**`lib/order-status.ts`**
- `type OrderStatus = "TAM" | "DA_XAC_NHAN" | "HOAN_THANH" | "DA_HUY"`
- `ORDER_STATUSES: OrderStatus[]`
- `ORDER_STATUS_LABELS: Record<OrderStatus, string>` — `TAM` → "Đơn tạm", `DA_XAC_NHAN` → "Đã xác nhận", `HOAN_THANH` → "Hoàn thành", `DA_HUY` → "Đã hủy"
- `ORDER_STATUS_COLORS: Record<OrderStatus, string | undefined>` — `gold` / `blue` / `green` / `undefined`

**`types.ts`**
- `type OrderRow = { id, orderNo, orderDate, status, deliveryDate, partnerId, partnerName, lineCount, orderedQuantity, shippedQuantity, createdByName, note, createdAt, totalRows }`
- `type OrderDetail = { id, orderNo, orderDate, status, deliveryDate, partnerId, partnerCode, partnerName, createdByName, note, orderedQuantity, shippedQuantity, createdAt }`
- `type OrderLine = { id, productId, productCode, productName, unitName, orderedQuantity, shippedQuantity, remainingQuantity, defaultWarehouseId, defaultWarehouseName, createdAt }` — `defaultWarehouseId`/`defaultWarehouseName` là `null` cho 4 mã còn thiếu kho mặc định.
- `toOrderRow(row): OrderRow`, `toOrderDetail(row): OrderDetail`, `toOrderLine(row): OrderLine`, `isFullyShipped(line): boolean`

**`schemas/order.schema.ts`**
- `orderHeaderSchema` — `{ partnerId: uuid bắt buộc, orderDate?: string, deliveryDate: string | null, note: string | null }`
- `orderLineSchema` — `{ productId: uuid bắt buộc, quantity: number dương }` (dùng `z.coerce.number()`)
- `type OrderHeaderInput = z.input<typeof orderHeaderSchema>`, `type OrderLineInput = z.infer<typeof orderLineSchema>`
- `toOrderUpdate(input): Database["public"]["Tables"]["don_dat_hang"]["Update"]` — map `partnerId→doi_tac_id`, `deliveryDate→ngay_giao_du_kien`, `note→ghi_chu`
- `toOrderLineUpdate(input): Partial<...["don_dat_hang_dong"]["Update"]>` — map `productId→san_pham_id`, `quantity→so_luong_dat`
- `type OrderFilter = { q, status, partnerId, fromDate, toDate, page }`, `DEFAULT_ORDER_FILTER`, `ORDER_PAGE_SIZE = 50`
- `countActiveOrderFilters`, `readOrderFilterFromUrl`, `writeOrderFilterToUrl`, `toOrderListRpcArgs`

**`api/order.keys.ts`**
- `orderKeys = { all: ["orders"], list(filter), detail(id), lines(id) }`

**`api/order.api.ts`**
- `fetchOrders(filter): Promise<{ items: OrderRow[]; total: number }>`
- `fetchOrderDetail(id): Promise<OrderDetail | null>`
- `fetchOrderLines(id): Promise<OrderLine[]>`
- `createOrder(input: { partnerId: string; deliveryDate?: string | null }): Promise<string>`
- `updateOrderHeader(id, input: Partial<OrderHeaderInput>): Promise<void>`
- `addOrderLine(orderId, line: OrderLineInput): Promise<string>`
- `updateOrderLine(id, line: Partial<OrderLineInput>): Promise<void>`
- `deleteOrderLine(id): Promise<void>`
- `approveOrder(id): Promise<void>` → `xac_nhan_don`
- `unlockOrder(id, reason): Promise<void>` → `mo_khoa_don`
- `closeOrderEarly(id, reason): Promise<void>` → `dong_don_som`
- `createIssueFromOrder(orderId): Promise<string>` → `tao_phieu_xuat_tu_don`, trả `id` của `chung_tu` (`XUAT`) vừa sinh

**`hooks/useOrders.ts`** (`"use client"`)
- `useOrders(filter)`, `useOrderDetail(id)` (`enabled: id !== ""`), `useOrderLines(id)` (`enabled: id !== ""`)
- `useCreateOrder()`, `useUpdateOrderHeader(id)`, `useAddOrderLine(orderId)`, `useUpdateOrderLine(orderId)`, `useDeleteOrderLine(orderId)`
- `useApproveOrder(id)`, `useUnlockOrder(id)`, `useCloseOrderEarly(id)`, `useCreateIssueFromOrder(id)` (invalidate thêm `documentKeys.all`)

## Tên tham số URL đã chốt cho `/dat-hang`

`q`, `trang_thai`, `doi_tac`, `tu_ngay`, `den_ngay`, `trang` — khác hẳn `/nhap-kho` (không có `kho`, `nguon`; `ncc` đổi thành `doi_tac`).

## Decisions Made

Xem `key-decisions` ở frontmatter. Không có quyết định kiến trúc mới ngoài việc thực thi đúng đặc tả plan; hai điều chỉnh nhỏ nêu trên đều là sửa lỗi tự phát hiện trong lúc verify, không đổi hình dạng hợp đồng dữ liệu mà 04-CONTEXT.md/04-06-PLAN.md đã chốt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug tự gây bởi comment] Hai comment chứa nguyên văn chuỗi cấm khiến grep acceptance criteria tự báo sai**
- **Found during:** Task 1 (comment "không có field `unitPrice`/`amount`" trong `types.ts`) và Task 2 (comment nhắc `productKeys` trong `useOrders.ts`)
- **Issue:** `grep -rc "unitPrice\|don_gia\|thanh_tien"` và `grep -rc "productKeys"` khớp luôn vào nội dung comment giải thích tại sao KHÔNG dùng các thứ đó — cùng bẫy đã ghi lại ở `04-03-SUMMARY.md` ("Đối chiếu chuỗi cấm" khớp cả comment).
- **Fix:** Diễn đạt lại hai comment không chứa nguyên văn hai chuỗi, giữ nguyên ý nghĩa cảnh báo.
- **Files modified:** `src/features/sales-order/types.ts`, `src/features/sales-order/hooks/useOrders.ts`
- **Verification:** `grep -rc` trả `0` cho mọi file sau khi sửa; `npm run check` vẫn xanh.
- **Committed in:** `7a78840`, `040bcfa` (sửa trước khi commit, không có commit riêng)

**2. [Rule 1 - Bug nhỏ] Ép kiểu thừa ở cuối `createIssueFromOrder`**
- **Found during:** Task 2, viết xong `order.api.ts`
- **Issue:** Ban đầu viết `(data as Database["public"]["Tables"]["chung_tu"]["Row"]).id` để phòng trường hợp TypeScript không suy đúng kiểu `data` từ RPC trả về một hàng (`returns public.chung_tu`, không phải bảng). Đây là workaround không cần thiết nếu kiểu đã đúng sẵn.
- **Fix:** Viết một file `.ts` thử riêng ở `src/features/sales-order/__scratch_type_check.ts` (xóa ngay sau khi kiểm), xác nhận `data.id` đã có kiểu `string` không cần ép, rồi bỏ ép kiểu và import `Database` không dùng nữa.
- **Files modified:** `src/features/sales-order/api/order.api.ts`
- **Verification:** `npm run check` xanh sau khi bỏ ép kiểu và import thừa.
- **Committed in:** `040bcfa`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 — cả hai là tự sửa lỗi/thừa do chính phiên này viết ra, không phải lỗi kế thừa từ plan trước).
**Impact on plan:** Không đổi hợp đồng dữ liệu, không đổi hành vi runtime. Chỉ làm sạch comment và bỏ workaround thừa.

## Issues Encountered

- Trong lúc đọc context ban đầu, một lệnh `state advance-plan --help` bị gsd-tools hiểu nhầm thành lệnh thật (không có xử lý `--help`) và đã tăng bộ đếm plan trong `STATE.md` từ 4 lên 5 dù chưa thực thi gì. Phát hiện ngay qua `git diff` trước khi làm bất cứ việc gì khác, revert bằng `git checkout -- .planning/STATE.md`. Không có tác động tới code hay database; chỉ nêu lại để lần sau tránh gọi cờ `--help` với các subcommand ghi (write) của gsd-tools.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- Sáu file của `src/features/sales-order/` sẵn sàng cho Wave 7–9 (04-07 trở đi: màn danh sách/chi tiết/dòng đơn) — component chỉ việc import, không phải đoán tên cột hay tự viết mapper.
- pgTAP: **324 ok / 0 not ok / 0 ERROR** trên toàn bộ 26 file `supabase/tests/*.sql` (chạy trực tiếp từng file bằng `psql`, không dùng `db:test:linked` vì Docker treo trên máy này) — không đổi so với sau 04-04, đúng như kỳ vọng vì plan này không chạm database.
- `npm run check` (typecheck + lint + build) xanh toàn bộ.
- Plan 04-05 (`features/documents` + refactor `stock-in`) đã xong hai task ghi code (`819ef7e`, `7a6044f`) nhưng checkpoint kiểm mắt trình duyệt (Task 3, `type="checkpoint:human-verify"`) **vẫn đang mở** — chưa ai chạy sáu bước ở `04-05-PLAN.md`. Đây không phải việc của plan 04-06 và không chặn plan này, nhưng người tiếp theo cần biết: `04-05-SUMMARY.md` **chưa tồn tại**, và `STATE.md`/`ROADMAP.md` hiện vẫn ghi "04-04 done, 04-05 next" — cần được người dùng đóng checkpoint đó (mở `http://localhost:3000/nhap-kho`, làm đúng sáu bước ở `04-05-PLAN.md` Task 3) trước khi coi Phase 4 tuần tự đã qua khỏi Wave 5.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All six created files verified present on disk; both task commit hashes (`7a78840`, `040bcfa`) verified present in git history.
