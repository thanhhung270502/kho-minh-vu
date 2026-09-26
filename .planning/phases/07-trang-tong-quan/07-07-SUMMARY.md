---
phase: 07-trang-tong-quan
plan: 07
subsystem: dashboard-components
tags: [dashboard, antd, query-state, negative-stock, sales-pace]
requires:
  - "07-06: useSalesPace, useNegativeStockReport, SalesPace/NegativeStockLine types"
  - "07-04: countNegativeByReason, compareSalesPace (dashboard-stats.ts)"
provides:
  - "src/features/dashboard/components/sales-pace-card.tsx: SalesPaceCard"
  - "src/features/dashboard/components/negative-stock-section.tsx: NegativeStockSection"
  - "src/features/dashboard/components/negative-stock-table.tsx: NegativeStockTable"
affects:
  - "07-09: ghép ba component (khối này + stock-by-group) vào dashboard-view.tsx / trang /"
tech-stack:
  added: []
  patterns:
    - "Card.extra không được đọc query.data trực tiếp — thông tin phụ thuộc dữ liệu (ngày chốt) đưa vào nội dung bên trong QueryState children, không đặt ở prop ngoài"
    - "countNegativeByReason/compareSalesPace tính khi render trong children, không lưu useState"
key-files:
  created:
    - src/features/dashboard/components/sales-pace-card.tsx
    - src/features/dashboard/components/negative-stock-section.tsx
    - src/features/dashboard/components/negative-stock-table.tsx
  modified: []
decisions:
  - "Ngày chốt của SalesPaceCard hiện trong nội dung thẻ (dòng phụ phía trên lưới Statistic), không dùng Card.extra như draft đầu của plan — vì extra là prop ngoài QueryState, đọc query.data ở đó vi phạm acceptance criteria 'không truy cập query.data ngoài children của QueryState'. DatePicker của NegativeStockSection thì đặt ở Card.extra bình thường vì nó không đọc query.data, chỉ đọc state date cục bộ."
  - "NegativeStockTable dùng useColumns() nội bộ (không phải hằng số module-level) để lấy token.colorError qua theme.useToken() cho cột Tồn sau — antd v6 hook chỉ gọi được trong component/hook, không gọi được ở top-level module."
metrics:
  duration: "~30 phút"
  completed: "2026-09-26"
---

# Phase 07 Plan 07: Thẻ nhịp bán và khối báo cáo xuất âm Summary

Hai khối giao diện đầu trang tổng quan (D-13): `SalesPaceCard` (TQAN-07, thẻ nhịp bán hôm nay/hôm qua, không biểu đồ) và `NegativeStockSection` + `NegativeStockTable` (TQAN-06, báo cáo xuất âm theo ngày với DatePicker, dải thẻ đếm theo lý do, bảng chi tiết mở phiếu). Chưa ghép vào trang `/` — đó là việc của 07-09.

## Đã làm

- **`sales-pace-card.tsx`**: `SalesPaceCard` gọi `useSalesPace()`, bọc `<Card title="Nhịp bán hôm nay">` quanh `<QueryState isEmpty={() => false}>` (số 0 vẫn là dữ liệu hợp lệ, không phải rỗng). Bên trong: dòng "Số chốt ngày DD/MM/YYYY", lưới ba `Statistic` (Phiếu xuất/Dòng hàng/Mã khác nhau) mỗi ô kèm "Hôm qua: {n}" + nhãn chênh lệch từ `compareSalesPace` (▲/▼ màu success/error hoặc "Bằng hôm qua"), và chú thích "Chỉ tính phiếu xuất đã ghi sổ...". 105 dòng.
- **`negative-stock-section.tsx`**: `NegativeStockSection` giữ `date: string | null` (null = hôm nay) bằng `useState`, gọi `useNegativeStockReport(date)`. `Card` có `DatePicker` ở `extra` (`disabledDate` chặn tương lai, `allowClear` về hôm nay). `QueryState` với `emptyDescription` đổi theo `date` (tin tốt, không phải lỗi — D-04). Nội dung: dòng đếm tổng, dải `Statistic` từ `countNegativeByReason(rows)` tính khi render, rồi `<NegativeStockTable rows={rows} />`. 66 dòng.
- **`negative-stock-table.tsx`**: `NegativeStockTable` — antd `Table` `rowKey="key"`, `scroll={{ x: "max-content" }}`, `pagination={{ pageSize: 20, hideOnSinglePage: true }}`. Cột: Mã hàng (mã + tên xám), Kho, SL xuất, Tồn sau (màu đỏ, sorter), Phiếu (`next/link` → `/xuat-kho/{id}` hoặc `/tra-hang/{id}` theo `documentKind`, `Tag` "Trả NCC"), Người lập, Lý do (`negativeReasonLabel` + ghi chú xám). 104 dòng.

## Xác minh

- `npm run typecheck && npm run lint && npm run build` (== `npm run check`) xanh toàn bộ.
- Cả hai lệnh `<verify><automated>` của PLAN.md chạy và in `OK`.
- Acceptance criteria từng task: không `valueStyle`/`message=` (bẫy 11), `rowKey="key"` đúng, không `ma_hang`/`ly_do_xuat_am`/`so_ct` trong component (mapper không bị bỏ qua — chỉ dùng kiểu miền từ `types.ts`), `countNegativeByReason` không lưu trong `useState` (chỉ `date` được lưu state), cả ba file có `"use client"` dòng đầu và ≤ 200 dòng (105/66/104).

## Deviations from Plan

**1. [Rule 1 - Bug/đúng đặc tả hơn] Bỏ `Card.extra={todayLabel}` ở SalesPaceCard, chuyển vào nội dung**
- **Found during:** Task 1, lúc viết acceptance criteria check "không truy cập `query.data` ngoài children của `QueryState`"
- **Issue:** Bản nháp đầu tính `todayLabel` từ `query.data` rồi truyền vào `Card extra` — đọc `query.data` ngoài `QueryState` children, vi phạm nguyên tắc bốn trạng thái (component không được tự suy luận từ `query.data` khi chưa qua `QueryState`).
- **Fix:** Dời dòng "Số chốt ngày DD/MM/YYYY" vào bên trong `SalesPaceContent` (children của `QueryState`), `Card` không còn `extra`.
- **Files modified:** `src/features/dashboard/components/sales-pace-card.tsx`
- **Commit:** `5a6234b`

## Known Stubs

None.

## Threat Flags

None — T-07-22 (XSS qua lý do/ghi chú) đã tự mitigate bằng cách render qua JSX text bình thường (React tự escape), không dùng `dangerouslySetInnerHTML` ở đâu trong ba file. T-07-23 (link mở phiếu) chấp nhận theo threat_model của plan — link chỉ chứa uuid, trang đích tự áp quyền.

## Self-Check: PASSED

- FOUND: src/features/dashboard/components/sales-pace-card.tsx
- FOUND: src/features/dashboard/components/negative-stock-section.tsx
- FOUND: src/features/dashboard/components/negative-stock-table.tsx
- FOUND commit 5a6234b (feat(07-07): the nhip ban hom nay so voi hom qua)
- FOUND commit 1292e87 (feat(07-07): khoi bao cao xuat am theo ngay)
