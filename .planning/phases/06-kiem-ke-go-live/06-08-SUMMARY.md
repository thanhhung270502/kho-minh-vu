---
phase: 06-kiem-ke-go-live
plan: 08
subsystem: ui
tags: [nextjs, antd, tanstack-query, kiotviet-history, url-filter]

requires:
  - phase: 06-kiem-ke-go-live
    provides: "Lớp dữ liệu và bảng hiển thị tra cứu lịch sử KiotViet (types/schema/api/hooks/HistoryTable/VoucherDrawer) — 06-07"
  - phase: 06-kiem-ke-go-live
    provides: "requireKiotVietHistoryAccess() và CurrentUser.canViewKiotVietHistory — 06-06"
provides:
  - "Màn /lich-su-kiotviet: bộ lọc trên URL (loại, khoảng ngày, mã hàng, số phiếu, từ khóa), ListLayout + HistoryTable + VoucherDrawer"
  - "Tab 'Lịch sử KiotViet' nhúng vào chi tiết mã hàng (/danh-muc/[id]), gate theo canViewKiotVietHistory"
affects: [06-16]

tech-stack:
  added: []
  patterns:
    - "history-screen.tsx ghép panel lọc + toolbar tìm kiếm (debounce, ngoài panel) + ListLayout — cùng khuôn StockTable (Phase 5)"
    - "ProductHistoryTab dùng lại HistoryTable/VoucherDrawer với hideProductColumns, không tạo bảng riêng cho tab nhúng"

key-files:
  created:
    - src/features/kiotviet-history/components/history-filter-panel.tsx
    - src/features/kiotviet-history/components/history-screen.tsx
    - src/app/(app)/lich-su-kiotviet/page.tsx
    - src/features/kiotviet-history/components/product-history-tab.tsx
  modified:
    - scripts/test-pure-functions.ts
    - src/features/kiotviet-history/schemas/history-filter.schema.ts
    - src/features/products/components/product-detail.tsx
    - src/app/(app)/danh-muc/[id]/page.tsx

key-decisions:
  - "readDate (06-07) chỉ kiểm khuôn số bằng regex, không kiểm ngày có thật — '2026-13-45' lọt qua. Sửa thành dựng lại Date rồi so ngược ba phần (Rule 1 - bug)."
  - "Đổi tên tab key từ 'kiotviet-history' sang 'lich-su-kiotviet' để tránh trùng chuỗi với comment/import feature kiotviet-history trong product-detail.tsx — giữ đúng ý acceptance criteria 'không import feature khác' mà vẫn đọc rõ nghĩa"
  - "Tab Lịch sử KiotViet chèn NGAY TRƯỚC tab 'Lịch sử sửa' (audit-log), theo đúng thứ tự plan yêu cầu (cạnh 'Thẻ kho')"

patterns-established: []

requirements-completed: [DLIEU-07]

duration: ~45min
completed: 2026-09-24
---

# Phase 6 Plan 08: Ghép màn tra cứu lịch sử KiotViet và tab chi tiết mã hàng Summary

**Bộ lọc URL cho `/lich-su-kiotviet` (loại/khoảng ngày/mã hàng/số phiếu/từ khóa) và tab "Lịch sử KiotViet" nhúng vào chi tiết mã hàng, dùng chung lớp dữ liệu và component từ 06-07 — kèm sửa một lỗi kiểm ngày sót từ 06-07.**

## Performance

- **Duration:** ~45 phút
- **Tasks:** 2/2
- **Files modified:** 4 tạo mới, 4 sửa

## Accomplishments

- `history-filter-panel.tsx`: `Select` loại (Tất cả/Nhập/Bán), `DatePicker.RangePicker` (hiển thị dd/MM/yyyy, ghi URL YYYY-MM-DD), `Input` mã hàng, `Input` số phiếu, nút "Xóa lọc" disable khi không có điều kiện nào đang bật. Đổi lọc nào cũng về trang 1.
- `history-screen.tsx`: đọc/ghi filter qua URL (`readHistoryFilterFromUrl`/`writeHistoryFilterToUrl`), ô tìm riêng ngoài panel (debounce 300ms, theo đúng khuôn `StockToolbar`), `ListLayout` + `HistoryTable` + `VoucherDrawer`, banner `Alert` info nói rõ đây là dữ liệu tra cứu, không phải sổ kho.
- `src/app/(app)/lich-su-kiotviet/page.tsx`: Server Component thuần (không `"use client"`, không import `antd`), `requireKiotVietHistoryAccess()`, bọc `<Suspense>` quanh `HistoryScreen` (dùng `useSearchParams`).
- `product-history-tab.tsx`: tab nhúng chi tiết mã hàng — `Segmented` lọc loại, dùng lại `HistoryTable`/`VoucherDrawer` với `hideProductColumns`, câu phụ giải thích vì sao tách khỏi Thẻ kho.
- `product-detail.tsx`: thêm prop tùy chọn `kiotVietHistoryTab?: ReactNode` — KHÔNG import trực tiếp feature `kiotviet-history` (đúng luật `src/features/README.md`); tab chèn ngay trước "Lịch sử sửa".
- `danh-muc/[id]/page.tsx`: route ghép hai feature — truyền `kiotVietHistoryTab` theo `user.canViewKiotVietHistory` (đọc thẳng từ `CurrentUser`, KHÔNG qua `hasPermission()`/`PERMISSION_MATRIX`, đúng D-13).
- 10 case test mới cho bộ lọc lịch sử KiotViet trong `scripts/test-pure-functions.ts` (đọc URL, đọc ngày sai, ghi URL, quay vòng, `toHistoryRpcArgs`, `countActiveHistoryFilters`).

## Task Commits

1. **Task 1: Bộ lọc, màn tra cứu, route /lich-su-kiotviet, test hàm thuần bộ lọc** - `4a889ae` (feat)
2. **Task 2: Tab "Lịch sử KiotViet" trong chi tiết mã hàng** - `e1b3868` (feat)

**Plan metadata:** (commit này) `docs(06-08): complete man tra cuu va tab lich su kiotviet plan`

## Files Created/Modified

- `src/features/kiotviet-history/components/history-filter-panel.tsx` - panel lọc URL (loại, khoảng ngày, mã hàng, số phiếu)
- `src/features/kiotviet-history/components/history-screen.tsx` - ghép ô tìm + panel + ListLayout + HistoryTable + VoucherDrawer
- `src/app/(app)/lich-su-kiotviet/page.tsx` - route mỏng, `requireKiotVietHistoryAccess`
- `src/features/kiotviet-history/components/product-history-tab.tsx` - tab nhúng chi tiết mã hàng
- `src/features/products/components/product-detail.tsx` - thêm prop `kiotVietHistoryTab`
- `src/app/(app)/danh-muc/[id]/page.tsx` - truyền tab theo `user.canViewKiotVietHistory`
- `scripts/test-pure-functions.ts` - 10 case mới cho bộ lọc lịch sử KiotViet
- `src/features/kiotviet-history/schemas/history-filter.schema.ts` - sửa `readDate` (Rule 1)

## Decisions Made

- Sửa `readDate` trong `history-filter.schema.ts` (file của 06-07) để kiểm ngày có thật, không chỉ khuôn số — theo đúng chỉ dẫn `<action>` của plan ("sửa schema của 06-07 nếu đỏ"). Test case `tu_ngay=2026-13-45` phát hiện lỗi này khi viết case trước khi code (RED), sửa xong xanh lại (GREEN).
- Đổi tên tab key `kiotviet-history` → `lich-su-kiotviet` để `grep -c "kiotviet-history" product-detail.tsx` = 0 đúng acceptance criteria (tránh nhầm giữa "chuỗi trùng tên feature" và "import feature") mà không đổi cách hiển thị.
- Tab lịch sử KiotViet chèn NGAY SAU "Thẻ kho", TRƯỚC "Lịch sử sửa" — đúng thứ tự plan mô tả ("cạnh 'Thẻ kho'").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `readDate` (06-07) chấp nhận ngày không có thật**
- **Found during:** Task 1, viết case test theo `<behavior>` trước khi code (TDD RED)
- **Issue:** `readDate` chỉ kiểm chuỗi khớp khuôn `\d{4}-\d{2}-\d{2}` bằng regex, không kiểm giá trị tháng/ngày có hợp lệ hay không — `"2026-13-45"` (tháng 13, ngày 45) khớp regex nên lọt qua bộ lọc thay vì bị bỏ về rỗng.
- **Fix:** Dựng lại `Date` từ ba phần năm/tháng/ngày rồi so ngược `getUTCFullYear`/`getUTCMonth`/`getUTCDate` — ngày không khớp thì về `""`.
- **Files modified:** `src/features/kiotviet-history/schemas/history-filter.schema.ts`
- **Verification:** `npx tsx scripts/test-pure-functions.ts` xanh với case `tu_ngay=2026-13-45` → `from === ""`.
- **Committed in:** `4a889ae` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Đúng dự liệu của plan ("sửa schema của 06-07 nếu đỏ, ghi lại trong SUMMARY"). Không có scope creep.

## Issues Encountered

- `writeHistoryFilterToUrl` (06-07) trả về `string` (không phải `URLSearchParams` như `writeInventoryFilterToUrl` của màn tồn kho) — viết case quay vòng đầu tiên lỗi `params.get is not a function`. Sửa lại test bằng cách bọc `new URLSearchParams(writeHistoryFilterToUrl(...))` trước khi đọc lại — không phải lỗi code, chỉ là khác chữ ký hàm giữa hai module tương tự.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào.

**CHƯA kiểm trên trình duyệt** — theo `<sequential_execution>` của phiên chạy này, executor không khởi động `npm run dev`. Việc kiểm mắt thật (acceptance criteria Task 2, phần "Trên trình duyệt") để lại cho UAT `06-16` hoặc người dùng kiểm tay. Danh sách cần xem:
- `quanly` mở `/lich-su-kiotviet`: gõ "quynh" ra đúng dòng ghi chú QUỲNH; lọc Bán + khoảng ngày; bấm số hóa đơn mở drawer đủ dòng.
- Mở một mã hàng có lịch sử KiotViet: thấy tab "Lịch sử KiotViet" cạnh "Thẻ kho"; Thẻ kho không còn dòng KiotViet cũ (đã tách sang tab riêng từ Phase 5).
- `thukho1` (chưa bật công tắc `xem_lich_su_kiotviet`): không thấy tab "Lịch sử KiotViet"; gõ thẳng `/lich-su-kiotviet` bị đẩy sang `/khong-du-quyen`.
- Console không cảnh báo antd (bẫy 11 CLAUDE.md) — đặc biệt `DatePicker.RangePicker` và `Segmented` là component mới dùng trong plan này.
- Trên điện thoại: filter panel sập vào Drawer đáy đúng khuôn `ListLayout`, ô tìm không tràn ngang.

## Next Phase Readiness

- `06-16` (UAT + ma trận quyền route) có thể thêm `/lich-su-kiotviet` vào `scripts/test-route-permissions.ts` — route đã tồn tại thật, quyền theo `user.canViewKiotVietHistory` (không theo `PERMISSION_MATRIX`), cần đối chiếu với dữ liệu seed 4 user mẫu xem ai đã bật công tắc (ghi chú ở `06-PATTERNS.md`).
- `06-16` cũng cần thêm menu `/lich-su-kiotviet` vào `src/shared/lib/navigation.ts` (chưa làm ở plan này — theo đúng phạm vi plan: "Menu và ma trận quyền route để plan cuối (06-16) làm cùng mọi route mới của phase").
- `npm run check` (typecheck + lint + build) xanh tại thời điểm hoàn thành plan — cả 31+1 route (thêm `/lich-su-kiotviet`) biên dịch thành công.
- DLIEU-07 dùng được ở cả hai nơi (màn riêng + tab chi tiết mã hàng) — đúng tiêu chí thành công của plan.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 9 files (4 created, 4 modified, 1 summary) found on disk; both task commits (`4a889ae`, `e1b3868`) found in git log.
