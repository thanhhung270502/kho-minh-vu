---
phase: 07-trang-tong-quan
plan: 06
subsystem: dashboard-data-layer
tags: [dashboard, tanstack-query, rpc, mapper]
requires:
  - "07-05: migration 0069-0071 (bao_cao_xuat_am, ton_theo_nhom, nhip_ban) live + database.types.ts sinh lại"
  - "07-04: src/features/dashboard/lib/stock-drilldown.ts (StockGroupBy), dashboard-stats.ts"
provides:
  - "src/features/dashboard/types.ts: SalesPace, NegativeStockLine, StockByGroupRow + mapper toSalesPace/toNegativeStockLine/toStockByGroupRow"
  - "src/features/dashboard/api/dashboard.api.ts: fetchSalesPace, fetchNegativeStockReport, fetchStockByGroup"
  - "src/features/dashboard/api/dashboard.keys.ts: dashboardKeys"
  - "src/features/dashboard/hooks/useDashboard.ts: useSalesPace, useNegativeStockReport, useStockByGroup, useRefreshDashboard"
affects:
  - "Wave 4 (07-07/08/09): ba component hiển thị + trang tổng quan dùng hook của plan này"
tech-stack:
  added: []
  patterns:
    - "Lớp mapper tiếng Việt -> tiếng Anh ở types.ts + api/ (khuôn features/inventory)"
    - "keepPreviousData cho hook đổi tham số (ngày/nhóm/kho) không nháy trắng"
    - "dashboardKeys.all invalidate một lần cho nút Làm mới (D-14, không polling/Realtime)"
key-files:
  created:
    - src/features/dashboard/types.ts
    - src/features/dashboard/api/dashboard.api.ts
    - src/features/dashboard/api/dashboard.keys.ts
    - src/features/dashboard/hooks/useDashboard.ts
  modified: []
decisions:
  - "toSalesPace tự sắp theo `ngay` giảm dần rồi tách today/yesterday theo vị trí, ném Error tiếng Việt nếu RPC không trả đủ hai dòng — không tin thứ tự SQL"
  - "StockByGroupRow.key = nhom_id ?? \"__none__\" — kiểu sinh tự động ghi nhom_id là string không null, nhưng SQL (0070) dùng CASE nên vẫn có thể null lúc chạy thật (mã chưa gán nhóm/công đoạn); mapper xử lý an toàn ở cả hai phía"
  - "fetchNegativeStockReport chỉ nhận p_ngay — RPC bao_cao_xuat_am (0069) không có tham số p_kho_id, đúng interfaces đã chốt ở 07-06-PLAN.md, không tự thêm tham số"
metrics:
  duration: "~35 phút"
  completed: "2026-09-26"
---

# Phase 07 Plan 06: Lớp dữ liệu trang tổng quan Summary

Lớp dữ liệu `dashboard` cho ba khối của trang tổng quan (nhịp bán, xuất âm, tồn theo nhóm/công đoạn) — kiểu miền tiếng Anh + mapper, ba hàm gọi RPC, query key tập trung, bốn hook TanStack Query dùng `keepPreviousData` để đổi tham số không nháy trắng.

## Đã làm

- **`types.ts`**: kiểu DB suy từ `Database["public"]["Functions"][...]["Returns"][number]` (không tự khai lại). Ba kiểu miền `SalesPace`/`NegativeStockLine`/`StockByGroupRow` + mapper `toSalesPace`/`toNegativeStockLine`/`toStockByGroupRow`.
- **`api/dashboard.api.ts`**: `fetchSalesPace()` gọi `nhip_ban` không tham số, `fetchNegativeStockReport(date)` gọi `bao_cao_xuat_am({ p_ngay })`, `fetchStockByGroup(groupBy, warehouseId)` gọi `ton_theo_nhom({ p_theo, p_kho_id })` — map `"category"/"stage"` (kiểu miền của 07-04) sang `"nhom"/"cong_doan"` (hợp đồng RPC) ngay trong hàm này, có comment giải thích lý do. Mỗi hàm `if (error) throw error` rồi map.
- **`api/dashboard.keys.ts`**: `dashboardKeys.all/salesPace/negativeStock(date)/stockByGroup(groupBy, warehouseId)`.
- **`hooks/useDashboard.ts`**: bốn hook — ba `useQuery` (`useNegativeStockReport`/`useStockByGroup` dùng `placeholderData: keepPreviousData`) và `useRefreshDashboard` (invalidate `dashboardKeys.all` một lần, `isRefreshing` từ `useIsFetching`).

## Xác minh

- `npm run typecheck && npm run lint && npm run build` (== `npm run check`) xanh toàn bộ, route `/` vẫn build được (chưa đổi giao diện — plan này chỉ là lớp dữ liệu).
- Tất cả acceptance criteria của cả hai task trong `07-06-PLAN.md` đã chạy và khớp: không `any`, không `select(` trên bảng, `if (error) throw error` đúng 3 lần, bốn hook export đủ, không `refetchInterval`/`useEffect`, `invalidateQueries({ queryKey: dashboardKeys.all` có mặt.
- Không có test file riêng cho lớp dữ liệu thuần này (không có logic điều kiện phức tạp ngoài `toSalesPace`/mapper `?? null`) — sẽ được xác minh gián tiếp qua UAT trang tổng quan ở wave sau.

## Deviations from Plan

None - plan executed exactly as written. Hai điểm dưới đây là làm rõ khi đọc `database.types.ts`/migration thật (0069-0071), không phải lệch khỏi đặc tả:

- `bao_cao_xuat_am` chỉ có tham số `p_ngay` (không có `p_kho_id`) — đúng với `<interfaces>` của plan, khác với dòng mô tả `fetchNegativeStockReport` trong `07-PATTERNS.md` (viết `date, warehouseId` — đó là ví dụ minh họa cũ, không phải hợp đồng thật). Đã theo migration/kiểu sinh thật.
- `nhom_id`/`ten_nhom` trong kiểu sinh tự động ghi là `string` (không `| null`) dù SQL (0070) có thể trả null cho mã chưa gán nhóm/công đoạn (CASE + LEFT JOIN). Mapper xử lý bằng `?? "__none__"`/giữ nguyên giá trị chạy thật, không tin nhãn kiểu tĩnh.

## Known Stubs

None.

## Threat Flags

None — cả ba RPC đã tự chặn quyền ở database (T-07-20, mitigate từ 07-06-PLAN.md), lớp api không mở thêm đường gọi nào ngoài ba RPC đã định.

## Self-Check: PASSED

- FOUND: src/features/dashboard/types.ts
- FOUND: src/features/dashboard/api/dashboard.api.ts
- FOUND: src/features/dashboard/api/dashboard.keys.ts
- FOUND: src/features/dashboard/hooks/useDashboard.ts
- FOUND commit 1f8f76c (feat(07-06): lop du lieu trang tong quan)
- FOUND commit 5a8ac1d (feat(07-06): hook tong quan va lam moi)
