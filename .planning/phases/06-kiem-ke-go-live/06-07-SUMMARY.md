---
phase: 06-kiem-ke-go-live
plan: 07
subsystem: ui
tags: [supabase-rpc, tanstack-query, antd, kiotviet-history]

requires:
  - phase: 06-kiem-ke-go-live
    provides: "RPC tra_cuu_lich_su_kiotviet (0064) và policy đọc luu_tru_* — 06-05"
provides:
  - "Lớp dữ liệu tra cứu lịch sử KiotViet dùng chung (types + schema URL + api + keys + hooks)"
  - "HistoryTable — bảng dùng chung, QueryState bốn trạng thái, phân trang server"
  - "VoucherDrawer — mở lại nguyên phiếu KiotViet cũ với đủ mọi dòng"
affects: [06-08]

tech-stack:
  added: []
  patterns:
    - "RPC lịch sử trả cả tổng nhập/tổng xuất trên mọi dòng (tong_nhap/tong_xuat) — đọc từ dòng đầu như tong_so_dong"
    - "Nguồn NHAP/XUAT lạ ném Error rõ nghĩa thay vì âm thầm coi là XUAT (types.ts toSource)"

key-files:
  created:
    - src/features/kiotviet-history/types.ts
    - src/features/kiotviet-history/schemas/history-filter.schema.ts
    - src/features/kiotviet-history/api/kiotviet-history.api.ts
    - src/features/kiotviet-history/api/kiotviet-history.keys.ts
    - src/features/kiotviet-history/hooks/useKiotVietHistory.ts
    - src/features/kiotviet-history/components/history-table.tsx
    - src/features/kiotviet-history/components/voucher-drawer.tsx
  modified: []

key-decisions:
  - "toHistoryRpcArgs nhận extra?: { productId } để tab chi tiết mã hàng (06-08) truyền p_san_pham_id mà không cần filter riêng"
  - "history-table.tsx nhận hideProductColumns để dùng chung cho cả màn riêng lẫn tab nhúng vào chi tiết mã (D-11)"
  - "VoucherDrawer dùng Drawer thô (không FormDrawer) vì không có form/nút Lưu — chỉ xem, size={560} theo đúng khuôn antd v6"

patterns-established:
  - "kiotviet-history/types.ts là ranh giới DUY NHẤT chạm tên cột tiếng Việt của RPC lịch sử — component/hook chỉ thấy KiotVietHistoryRow camelCase"

requirements-completed: []

duration: 20min
completed: 2026-09-24
---

# Phase 6 Plan 07: Lớp dữ liệu và bảng hiển thị tra cứu lịch sử KiotViet Summary

**Lớp dữ liệu (types/schema/api/keys/hooks) và hai component hiển thị (HistoryTable, VoucherDrawer) cho tra cứu lịch sử KiotViet, dùng chung một RPC `tra_cuu_lich_su_kiotviet` (0064) cho cả màn riêng và tab chi tiết mã hàng.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-24T15:14:05Z
- **Tasks:** 2/2
- **Files modified:** 7 created, 0 modified

## Accomplishments

- Lớp dữ liệu thuần (`types.ts`, `schemas/history-filter.schema.ts`) đọc/ghi bộ lọc qua URL tiếng Việt không dấu, sinh đúng `Args` của RPC 0064 (chuỗi rỗng → undefined).
- `api/kiotviet-history.api.ts` + `api/kiotviet-history.keys.ts` + `hooks/useKiotVietHistory.ts`: `fetchKiotVietHistory` (phân trang, đọc `tong_so_dong`/`tong_nhap`/`tong_xuat` từ dòng đầu), `fetchKiotVietVoucher` (mở lại nguyên phiếu, `p_kich_thuoc: 500`), hook phiếu có `enabled: voucherNo !== ""`.
- `history-table.tsx`: bảng dùng chung — cột Ngày giờ (giờ Việt Nam), Loại (Tag Nhập/Bán), Số phiếu (bấm mở drawer), Khách/NCC, Mã hàng + Tên hàng (ẩn được qua `hideProductColumns`), Số lượng, Ghi chú — không cột giá. Dòng tóm tắt tổng nhập/tổng bán dưới bảng.
- `voucher-drawer.tsx`: mở lại nguyên phiếu cũ với đủ mọi dòng, đầu phiếu (ngày, đối tác, ghi chú dòng đầu), bảng dòng + tổng số lượng, câu phụ nói rõ đây là dữ liệu lưu trữ chỉ để tra cứu.

## Task Commits

1. **Task 1: types, filter schema thuần, api, keys, hooks** - `ad7dc13` (feat)
2. **Task 2: Bảng lịch sử dùng chung + drawer mở lại nguyên phiếu** - `c4c87ae` (feat)

**Plan metadata:** (commit này) `docs(06-07): complete lop du lieu va bang lich su kiotviet plan`

## Files Created/Modified

- `src/features/kiotviet-history/types.ts` - `KiotVietHistoryRow`/`KiotVietHistoryPage` + mapper `toKiotVietHistoryRow` (chặn nguồn lạ)
- `src/features/kiotviet-history/schemas/history-filter.schema.ts` - `KiotVietHistoryFilter`, đọc/ghi URL, `toHistoryRpcArgs`
- `src/features/kiotviet-history/api/kiotviet-history.api.ts` - `fetchKiotVietHistory`, `fetchKiotVietVoucher`
- `src/features/kiotviet-history/api/kiotviet-history.keys.ts` - `kiotVietHistoryKeys`
- `src/features/kiotviet-history/hooks/useKiotVietHistory.ts` - `useKiotVietHistory`, `useKiotVietVoucher`
- `src/features/kiotviet-history/components/history-table.tsx` - bảng dùng chung, `QueryState`, phân trang server
- `src/features/kiotviet-history/components/voucher-drawer.tsx` - Drawer mở lại nguyên phiếu

## Decisions Made

- `toHistoryRpcArgs(filter, extra?)` tách riêng `extra.productId` khỏi filter chính để 06-08 gắn tab chi tiết mã hàng mà không cần một filter type khác.
- `HistoryTable` nhận `hideProductColumns` thay vì tạo hai component riêng — đúng "một lớp dữ liệu duy nhất... dùng chung cho màn riêng và tab chi tiết mã hàng" (D-11) của plan.
- `VoucherDrawer` dùng `Drawer` thô thay vì bọc `FormDrawer` (không có hành động Lưu/Hủy, chỉ xem) — `size={560}`, không dùng `width=` (bẫy 11 CLAUDE.md).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Đây là lớp dữ liệu + component hiển thị; 06-08 mới ghép route/tab/bộ lọc để có màn hình thật kiểm bằng mắt trên trình duyệt.

## Next Phase Readiness

- `HistoryTable`, `VoucherDrawer`, hooks đã sẵn sàng để 06-08 ghép vào `history-filter-panel.tsx`, route `/lich-su-kiotviet`, và tab "Lịch sử KiotViet" trong chi tiết mã hàng.
- Chưa route/UI thật nào gọi tới các component này — cần UAT bằng mắt sau khi 06-08 hoàn thành, không phải ở plan này (theo `<sequential_execution>` của phiên chạy).
- `npm run check` xanh (typecheck + lint + build) tại thời điểm hoàn thành plan.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 7 created files found on disk; both task commits (`ad7dc13`, `c4c87ae`) found in git log.
