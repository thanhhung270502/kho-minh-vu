---
phase: 04-don-dat-hang-phieu-xuat
plan: 08
subsystem: ui
tags: [nextjs, antd, react-hook-form, zod, tanstack-query, supabase, sales-order]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 06
    provides: "OrderRow/OrderFilter/useOrders/useCreateOrder + toàn bộ lớp dữ liệu src/features/sales-order/"
  - phase: 02-khung-ung-dung
    provides: "ListLayout, QueryState, requirePermission, partnerSchema/useSavePartner/useSuggestedPartnerCode/useCustomerSearch của features/partners"
provides:
  - "Route /dat-hang — chặn quyền bằng requirePermission(\"view-catalog\"), thêm vào ma trận scripts/test-route-permissions.ts"
  - "src/shared/components/partner-search-input.tsx — ô tìm người nhận server-side dùng chung cho mọi màn cần chọn doi_tac (đơn đặt hàng, phiếu xuất 04-10 sau này)"
  - "src/features/sales-order/components/{order-table,order-table-body,order-filter-panel,order-toolbar,create-order-button}.tsx — màn danh sách đơn + đường tạo đơn"
affects: ["04-09 (chi tiết đơn dùng lại PartnerSearchInput cho ô sửa người nhận)", "04-10 (màn xuất không qua đơn cũng chọn người nhận qua component này)", "04-15 (route /dat-hang đã có sẵn trong ma trận quyền, không phải thêm nữa)"]

tech-stack:
  added: []
  patterns:
    - "PartnerSearchInput đặt ở shared/components/ (không phải features/sales-order/) vì ≥2 nơi cần chọn doi_tac — nhưng bên trong vẫn import thẳng hook/schema của features/partners (useCustomerSearch, useSavePartner, useSuggestedPartnerCode, partnerSchema) theo đúng chỉ định của plan, không tách một lớp shared/api/ trung gian như product-search-input.tsx đã làm với features/products"
    - "notFoundContent (không phải dropdownRender) là chỗ đặt nút 'Thêm đối tác mới' — vì dữ liệu thật gần như luôn trả rỗng, nút phải hiện ngay khi không có kết quả, không đợi mở dropdown"
    - "order-table.tsx dựng hai lượt: Task 2 để addButton là placeholder disabled (canCreate vẫn được dùng, không unused), Task 3 thay bằng CreateOrderButton thật — tránh Task 2 tự tham chiếu file chưa tồn tại của Task 3 mà vẫn phải npm run check xanh sau mỗi task"
    - "fetchOrders() trả { items, total } (khác { rows, total } của receipt) — order-table.tsx đọc page.items, không copy nguyên văn khuôn receipt-table.tsx"

key-files:
  created:
    - src/shared/components/partner-search-input.tsx
    - src/app/(app)/dat-hang/page.tsx
    - src/features/sales-order/components/order-table.tsx
    - src/features/sales-order/components/order-table-body.tsx
    - src/features/sales-order/components/order-filter-panel.tsx
    - src/features/sales-order/components/order-toolbar.tsx
    - src/features/sales-order/components/create-order-button.tsx
  modified:
    - scripts/test-route-permissions.ts

key-decisions:
  - "PartnerSearchInput.onChange nhận string | undefined (không phải string như văn bản plan gợi ý), vì order-filter-panel cần xóa được lựa chọn người nhận (đưa filter.partnerId về null) — create-order-button vẫn luôn set giá trị thật khi người dùng chọn, không bị ảnh hưởng"
  - "Thêm dòng /dat-hang vào scripts/test-route-permissions.ts ngay trong plan này thay vì để plan 04-15 làm — 04-CONTEXT.md ghi rõ việc này 'làm ở plan 04-15', nhưng success criteria của lượt thực thi này yêu cầu rõ script phải chạy qua; thêm một dòng, cùng quyền xem với /nhap-kho, không ảnh hưởng phạm vi 04-15"

requirements-completed: [DDH-01]

duration: 45min
completed: 2026-09-20
---

# Phase 4 Plan 08: Màn danh sách đơn đặt hàng & đường tạo đơn Summary

**Route `/dat-hang` với bảng lọc trên URL, cộng ô tìm người nhận server-side dùng chung (`PartnerSearchInput`) có nút "Thêm đối tác mới" tại chỗ — vì `doi_tac` hiện chỉ có 1 khách thật, đường tạo mới là đường chính chứ không phải nhánh phụ.**

## Performance

- **Duration:** ~45 phút
- **Tasks:** 3/3 (cộng 1 việc phát sinh: thêm route vào ma trận quyền)
- **Files modified:** 8 (7 tạo mới + 1 sửa)

## Accomplishments

- `PartnerSearchInput` (`src/shared/components/`) tìm `doi_tac` server-side theo từ khóa qua `useCustomerSearch` có sẵn của `features/partners` (không viết hook mới, không gọi RPC trực tiếp), giới hạn 20 dòng. `notFoundContent` luôn có nút "+ Thêm đối tác mới" mở `Modal` tạo đối tác tại chỗ — form dùng lại nguyên `partnerSchema`, mã gợi ý từ `useSuggestedPartnerCode("KHACH", open)`, tên điền sẵn bằng từ khóa vừa gõ, lỗi mã trùng (`23505`) map về đúng field `code`.
- `/dat-hang` (Server Component) chặn quyền bằng `requirePermission("view-catalog")`, bọc `<OrderTable>` trong `Suspense` vì bảng dùng `useSearchParams()`.
- `OrderTable` điều phối `ListLayout` + `QueryState`, đọc/ghi bộ lọc trên URL (`q`, `trang_thai`, `doi_tac`, `tu_ngay`, `den_ngay`, `trang`) qua hàm đã có sẵn từ 04-06, đủ bốn trạng thái loading/error/empty/success. `OrderTableBody` hiện bảy cột (Số đơn, Ngày đơn, Người nhận, Ngày giao dự kiến, Tiến độ, Trạng thái, Người tạo) — không cột giá.
- `OrderFilterPanel`: trạng thái dùng `Select` với option `{ value: "", label: "Tất cả" }` (bẫy 11, không phải `value: null`), người nhận dùng `PartnerSearchInput`, khoảng ngày dùng `DatePicker.RangePicker`.
- `CreateOrderButton`: `Modal` chọn người nhận + ngày giao dự kiến, không có ô số đơn (server cấp qua `sinh_so_dh` bên trong `useCreateOrder`), bắt lỗi riêng `42501` (thiếu quyền) và `23514` (hiện nguyên văn câu RPC), tạo xong `router.push("/dat-hang/{id}")`. Cắm vào cả toolbar và trạng thái rỗng của `QueryState`.
- Thêm `/dat-hang` vào `scripts/test-route-permissions.ts` (cùng kỳ vọng với `/nhap-kho`) — chạy `npx tsx scripts/test-route-permissions.ts` cho kết quả **70/70 ô đúng**.

## Task Commits

1. **Task 1: Ô tìm người nhận trên server, kèm tạo đối tác mới tại chỗ** - `556a76d` (feat)
2. **Task 2: Màn danh sách đơn với bộ lọc trên URL** - `1a88277` (feat)
3. **Task 3: Nút tạo đơn mới** - `1d2d20a` (feat)
4. **Việc phát sinh: thêm `/dat-hang` vào ma trận quyền route** - `27fd895` (chore)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `src/shared/components/partner-search-input.tsx` - `PartnerSearchInput` (tìm + tạo tại chỗ)
- `src/app/(app)/dat-hang/page.tsx` - Route danh sách đơn
- `src/features/sales-order/components/order-table.tsx` - Điều phối `ListLayout`/`QueryState`/URL
- `src/features/sales-order/components/order-table-body.tsx` - Bảng bảy cột, không cột giá
- `src/features/sales-order/components/order-filter-panel.tsx` - Panel lọc (trạng thái/người nhận/khoảng ngày)
- `src/features/sales-order/components/order-toolbar.tsx` - Ô tìm `q` debounce + chỗ cắm nút tạo
- `src/features/sales-order/components/create-order-button.tsx` - Tạo đơn, cấp số server, chuyển trang
- `scripts/test-route-permissions.ts` - Thêm dòng `/dat-hang` vào `MA_TRAN`

## Decisions Made

Xem `key-decisions` ở frontmatter. Hai điều chỉnh đáng chú ý:
1. `PartnerSearchInput.onChange` nhận `string | undefined` thay vì `string` như văn bản plan mô tả sơ lược — cần thiết để `order-filter-panel` xóa được lựa chọn người nhận riêng lẻ (không chỉ qua nút "Xóa bộ lọc" tổng).
2. Route `/dat-hang` đã được thêm vào ma trận quyền ngay trong plan này (xem mục Deviations), sớm hơn dự kiến của `04-CONTEXT.md` (vốn để dành cho plan 04-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment trong `order-filter-panel.tsx` chứa nguyên văn chuỗi cấm `value: null` khiến grep acceptance criteria tự báo sai**
- **Found during:** Task 2, verify bằng grep sau khi viết `order-filter-panel.tsx`
- **Issue:** Comment giải thích lý do dùng `value: ""` cho mục "Tất cả" vô tình viết nguyên văn `` `value: null` `` — cùng bẫy đã ghi lại ở `04-06-SUMMARY.md` (comment giải thích tại sao KHÔNG dùng một chuỗi lại chứa đúng chuỗi đó).
- **Fix:** Diễn đạt lại comment không chứa chuỗi `value: null`, giữ nguyên ý nghĩa cảnh báo.
- **Files modified:** `src/features/sales-order/components/order-filter-panel.tsx`
- **Verification:** `grep -c "value: null" order-filter-panel.tsx` trả `0`; `npm run check` vẫn xanh.
- **Committed in:** `1a88277` (sửa trước khi commit, không có commit riêng)

**2. [Rule 3 - Blocking] Task 3 phải sửa `order-table.tsx` dù file đó không nằm trong `<files>` của Task 3**
- **Found during:** Task 3, khi thực hiện hành động "Cắm nút này vào order-toolbar qua prop addButton ở order-table.tsx, và vào trạng thái rỗng của QueryState" — hành động này đòi sửa `order-table.tsx`, nhưng thẻ `<files>` của Task 3 trong `04-08-PLAN.md` chỉ liệt kê `create-order-button.tsx`.
- **Issue:** Nếu bỏ qua bước sửa `order-table.tsx`, nút "Tạo đơn" mãi mãi là placeholder `disabled` dựng tạm ở Task 2 — không khớp done criteria "Tạo được đơn mới từ màn danh sách và từ trạng thái rỗng".
- **Fix:** Sửa `order-table.tsx` để thay placeholder bằng `<CreateOrderButton />` ở cả `addButton` của toolbar lẫn mô tả trạng thái rỗng của `QueryState`, đúng như hành động Task 3 yêu cầu bằng lời.
- **Files modified:** `src/features/sales-order/components/order-table.tsx` (cộng với `create-order-button.tsx` đã có trong danh sách)
- **Verification:** `grep -c "CreateOrderButton" order-table.tsx` trả `3` (≥2 theo acceptance criteria); `npm run check` xanh.
- **Committed in:** `1d2d20a` (cùng commit Task 3)

**3. [Rule 2 - Thiếu năng lực bắt buộc theo success criteria] Thêm `/dat-hang` vào `scripts/test-route-permissions.ts`**
- **Found during:** Sau khi hoàn tất Task 1–3, đối chiếu success criteria của lượt thực thi (không phải của `04-08-PLAN.md`) yêu cầu rõ script quyền route phải chạy qua cho route mới.
- **Issue:** `04-CONTEXT.md` ghi rằng việc thêm route vào ma trận "làm ở plan 04-15" — nhưng lượt thực thi này được yêu cầu tường minh phải chạy `npx tsx scripts/test-route-permissions.ts` và báo kết quả.
- **Fix:** Thêm một dòng `{ route: "/dat-hang", ky_vong: AI_CUNG_XEM-tương-đương }` vào `MA_TRAN`, cùng kỳ vọng với `/nhap-kho` (bốn vai trò xem được, khách bị đẩy về đăng nhập) — khớp `requirePermission("view-catalog")` đã dùng ở `page.tsx`.
- **Files modified:** `scripts/test-route-permissions.ts`
- **Verification:** `npx tsx scripts/test-route-permissions.ts` → `✓ quyền route: 70/70 ô đúng` (65/65 trước đó + 5 ô cho route mới × 5 vai trò test).
- **Committed in:** `27fd895`

---

**Total deviations:** 3 auto-fixed (1 Rule 1, 1 Rule 3, 1 Rule 2/theo yêu cầu success criteria của lượt thực thi).
**Impact on plan:** Không đổi hình dạng dữ liệu hay hợp đồng API. Việc thứ 3 làm sớm một phần việc dự kiến của plan 04-15 (thêm 1 dòng, không đụng logic route khác) — 04-15 sẽ chỉ cần thêm các route còn lại của phase, không phải làm lại `/dat-hang`.

## Issues Encountered

- Không có `npm run dev` chạy sẵn khi bắt đầu phiên — kiểm tra thấy có một tiến trình dev server đã lắng nghe cổng 3000 từ trước (không phải do phiên này khởi động), dùng luôn để chạy `scripts/test-route-permissions.ts` và một smoke test GET `/dat-hang` thủ công (không phải một phần của bộ test chính thức, đã xóa file script tạm sau khi dùng).

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- `src/shared/components/partner-search-input.tsx` sẵn sàng cho plan 04-09 (chi tiết đơn — sửa người nhận) và 04-10 (màn xuất không qua đơn) tái dùng nguyên vẹn, không phải viết lại.
- `npm run check` (typecheck + lint + build) xanh toàn bộ sau cả bốn commit.
- `npx tsx scripts/test-route-permissions.ts`: **70/70 ô đúng** (yêu cầu `npm run dev` đang chạy — đã xác nhận với tiến trình có sẵn trên máy này).
- pgTAP: **không chạm database, không chạy lại bộ test này** — plan chỉ thêm code giao diện, không có migration.
- **Chưa kiểm bằng mắt trên trình duyệt thật** — đây là plan UI đầu tiên của Phase 4 nhưng agent không có trình duyệt. Xem mục "Cần người kiểm" trong báo cáo cuối của lượt thực thi để biết chính xác cần mở URL nào và xem gì.
- Nợ treo từ 04-05 (checkpoint kiểm mắt `/nhap-kho`) và từ 04-CONTEXT.md (danh sách người nhận thật chưa được rà — `anh_xa_ghi_chu_kiotviet` vẫn 0 dòng) không đổi, không phải việc của plan này.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All seven created files verified present on disk; `scripts/test-route-permissions.ts` modification verified present; all four commit hashes (`556a76d`, `1a88277`, `1d2d20a`, `27fd895`) verified present in git history.
