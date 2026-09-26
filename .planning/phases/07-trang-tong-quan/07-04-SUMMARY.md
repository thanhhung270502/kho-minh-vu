---
phase: 07-trang-tong-quan
plan: 04
subsystem: ui
tags: [nextjs, permissions, navigation, url-state, dashboard]

requires:
  - phase: 06-kiem-ke
    provides: "src/shared/lib/navigation.ts, src/shared/lib/permissions.ts (khuôn NAV_ITEMS/PERMISSION_MATRIX có sẵn từ 06-16)"
  - phase: 05-ton-kho
    provides: "src/features/inventory/schemas/inventory.schema.ts (writeInventoryFilterToUrl, DEFAULT_INVENTORY_FILTER)"
  - phase: 04-don-dat-hang-phieu-xuat
    provides: "src/features/documents/lib/negative-reasons.ts (NEGATIVE_REASONS, negativeReasonLabel)"
provides:
  - "homePathForRole(role) — chuyển hướng trang chủ theo vai trò (D-11)"
  - "Quyền view-dashboard, chỉ quan_ly — menu 'Tổng quan' ẩn với 3 vai trò còn lại"
  - "buildInventoryDrilldownUrl(groupBy, groupId, warehouseId, stockStatus) — URL drill-down sang /ton-kho"
  - "countNegativeByReason(lines), compareSalesPace(today, yesterday) — hàm tổng hợp số liệu tổng quan"
affects: [07-05, 07-06, 07-07, 07-08, 07-09]

tech-stack:
  added: []
  patterns:
    - "Hàm thuần (không 'use client') trong features/<x>/lib/*.ts để Server Component gọi trực tiếp (bẫy 9)"
    - "Drill-down URL luôn dựng qua write*FilterToUrl của feature đích, không tự ghép chuỗi (D-08)"

key-files:
  created:
    - src/features/dashboard/lib/home-path.ts
    - src/features/dashboard/lib/stock-drilldown.ts
    - src/features/dashboard/lib/dashboard-stats.ts
  modified:
    - src/shared/lib/permissions.ts
    - src/shared/lib/navigation.ts
    - scripts/test-pure-functions.ts

key-decisions:
  - "Mất quyền view-dashboard đẩy /dat-hang (mobilePriority 5) lên lấp ô thứ 4 của thanh tab đáy thủ kho/chỉ xem/văn phòng — không sửa lại mobilePriority, ngoài phạm vi plan 07-04 (UI thẻ 'Đặt hàng' cho thủ kho không nằm trong scope)"
  - "buildInventoryDrilldownUrl KHÔNG đặt tradingStatus tường minh — giữ mặc định 'active' của DEFAULT_INVENTORY_FILTER để khớp phạm vi đếm của RPC ton_theo_nhom (D-08/D-17)"
  - "countNegativeByReason gộp mã lạ (kể cả null) vào SAU 4 lý do cố định, giữ thứ tự gặp lần đầu — không sắp lại theo count"

patterns-established:
  - "File thuần dashboard/lib/*.ts: mọi hàm phục vụ Server Component page.tsx phải không có 'use client', theo đúng khuôn negative-reasons.ts"

requirements-completed: []  # TQAN-01/06/07 chỉ đóng khi UI thật ra mắt (07-05..09), theo chỉ định của môi trường thực thi

duration: 25min
completed: 2026-09-26
---

# Phase 7 Plan 04: Hàm thuần trang tổng quan Summary

**`homePathForRole` điều hướng theo vai trò + ẩn menu "Tổng quan" ngoài quản lý (quyền `view-dashboard` mới), cộng ba hàm thuần cho drill-down tồn kho và thống kê tổng quan (`buildInventoryDrilldownUrl`, `countNegativeByReason`, `compareSalesPace`), tất cả viết theo TDD trong `scripts/test-pure-functions.ts`.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 hoàn thành, cả hai autonomous, không có checkpoint
- **Files modified:** 6 (3 file mới, 3 file sửa)

## Accomplishments

- `homePathForRole(role)`: `quan_ly` → `/`, `van_phong` → `/xuat-kho`, `thu_kho`/`chi_xem` → `/ton-kho` (D-11), `switch` không có `default` nên TypeScript tự báo thiếu case khi thêm vai trò mới.
- Quyền `view-dashboard` mới trong `PERMISSION_MATRIX`, chỉ `quan_ly` — mục menu "Tổng quan" (`href: "/"`) đổi từ `view-catalog` sang quyền này, ẩn hẳn (không chỉ disable) với ba vai trò còn lại.
- `buildInventoryDrilldownUrl`: dựng URL `/ton-kho?...` bằng `writeInventoryFilterToUrl` của feature `inventory` — không tự ghép chuỗi, không đặt `tradingStatus` (giữ mặc định "đang kinh doanh" khớp phạm vi RPC `ton_theo_nhom`, D-08/D-17).
- `countNegativeByReason`: luôn trả đủ 4 lý do cố định theo đúng thứ tự `NEGATIVE_REASONS` kể cả đếm 0, mã lạ (kể cả `null` → "Chưa ghi lý do") vẫn được đếm và giữ nguyên văn (D-04).
- `compareSalesPace`: so chênh lệch tuyệt đối + chiều tăng/giảm/bằng, không chia — hôm qua = 0 không làm phép tính nổ (D-09).

## Task Commits

1. **Task 1: homePathForRole + quyền view-dashboard + ẩn mục menu Tổng quan** - `5355679` (feat)
2. **Task 2: buildInventoryDrilldownUrl + countNegativeByReason + compareSalesPace** - `799eecc` (feat)

_Note: cả hai task đều TDD (RED viết ca kiểm trước, GREEN viết hàm) nhưng gộp vào một commit `feat` mỗi task — ca kiểm và triển khai đi cùng một thay đổi logic, không tách vì mỗi commit đã tự chạy `npx tsx scripts/test-pure-functions.ts` xanh độc lập trước khi commit (xác nhận bằng cách tạm bỏ import/test của Task 2 khi chạy kiểm tra Task 1 riêng)._

## Files Created/Modified

- `src/features/dashboard/lib/home-path.ts` - `homePathForRole(role)`, hàm thuần
- `src/features/dashboard/lib/stock-drilldown.ts` - `StockGroupBy`, `buildInventoryDrilldownUrl`
- `src/features/dashboard/lib/dashboard-stats.ts` - `countNegativeByReason`, `compareSalesPace`
- `src/shared/lib/permissions.ts` - thêm `Permission = "view-dashboard"` + entry trong `PERMISSION_MATRIX`
- `src/shared/lib/navigation.ts` - mục `href: "/"` đổi `permission` sang `"view-dashboard"`, thêm comment
- `scripts/test-pure-functions.ts` - ca kiểm TDD cho cả 4 hàm mới + cập nhật ca `filterNavItems`/`splitMobileItems` theo hành vi mới

## Decisions Made

- Không sửa lại `mobilePriority` của `NAV_ITEMS` khi "/" bị ẩn khỏi thủ kho/văn phòng/chỉ xem — hệ quả là `/dat-hang` (ưu tiên 5) tự đôn lên lấp ô thứ 4 còn trống của thanh tab đáy. Đây là hành vi tự nhiên của `splitMobileItems` (top 4 theo `mobilePriority` trong các mục còn lại sau `filterNavItems`), không phải lỗi — nhưng đáng chú ý cho người review UI (07-09, plan dọn `NAV_ITEMS` cuối phase): thủ kho giờ thấy "Đặt hàng" ở thanh tab đáy dù không phải người lên đơn. Không sửa trong plan này vì ngoài `files_modified` và `must_haves` của 07-04-PLAN.md.
- `buildInventoryDrilldownUrl` cố tình KHÔNG nhận/đặt `tradingStatus` — nếu sau này cần drill-down cả hàng ngừng kinh doanh thì phải sửa chữ ký hàm tường minh, không được lặng lẽ đặt mặc định khác đi lệch khỏi số RPC `ton_theo_nhom` đã đếm.
- `countNegativeByReason` không sắp lại theo count giảm dần — giữ đúng thứ tự nghiệp vụ cố định trước, mã lạ nối sau theo thứ tự gặp lần đầu, để UI (thẻ số / biểu đồ) ổn định vị trí giữa các lần tải.

## Deviations from Plan

None - plan thực thi đúng như đặc tả. Không phát hiện lỗi, không thiếu chức năng cốt lõi, không có thay đổi kiến trúc.

## Issues Encountered

Trong lúc thực thi, hai commit không liên quan (`67bd655` sửa pgTAP 92-94, `0cd865b` đánh số lại migration 0069-0071) xuất hiện giữa hai commit của plan này — do một phiên thực thi song song khác đang làm việc trên các plan 07-05/06/09 cùng lúc trên cùng working tree. Đã xác nhận không đụng file nào của plan 07-04 (`git show --stat` cho cả hai commit), không cần xử lý gì thêm.

## User Setup Required

None - không cần cấu hình dịch vụ ngoài. Ba file `dashboard/lib/*.ts` là hàm thuần, chưa có route/component nào gọi tới (việc của 07-05 trở đi).

## Next Phase Readiness

- `homePathForRole`, `buildInventoryDrilldownUrl`, `countNegativeByReason`, `compareSalesPace` sẵn sàng cho các plan UI (07-05..09) import trực tiếp, không cần database.
- Quyền `view-dashboard` đã có trong `PERMISSION_MATRIX` — plan 07-09 (redirect `app/(app)/page.tsx`) cần gọi `hasPermission(role, "view-dashboard")` + `homePathForRole` để chặn thật, ẩn menu ở đây chỉ là tiện lợi (T-07-13, accept).
- **requirements TQAN-01/06/07 CHƯA đánh dấu hoàn thành** theo đúng chỉ định môi trường thực thi — chỉ đóng khi UI thật (07-05 trở đi) lên hình.

---
*Phase: 07-trang-tong-quan*
*Completed: 2026-09-26*
