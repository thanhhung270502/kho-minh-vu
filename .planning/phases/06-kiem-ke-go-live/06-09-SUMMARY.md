---
phase: 06-kiem-ke-go-live
plan: 09
subsystem: frontend-data-layer
tags: [stocktake, tanstack-query, zod, pure-functions]
requires: [06-05]
provides: ["src/features/stocktake/ lop du lieu day du (lib, types, schema, api, keys, hooks)"]
affects: [06-10, 06-11, 06-12, 06-13]
tech-stack:
  added: []
  patterns:
    - "Nhãn trạng thái phiên tính từ tiến độ đếm (counted/scope/recount), không lưu cột riêng"
    - "Ngưỡng lệch lớn là một hằng số duy nhất (LARGE_DISCREPANCY_THRESHOLD), dùng lại từ discrepancy-table.tsx sau này"
key-files:
  created:
    - src/features/stocktake/lib/discrepancy.ts
    - src/features/stocktake/lib/session-status.ts
    - src/features/stocktake/types.ts
    - src/features/stocktake/schemas/stocktake.schema.ts
    - src/features/stocktake/api/stocktake.api.ts
    - src/features/stocktake/api/stocktake.keys.ts
    - src/features/stocktake/hooks/useStocktake.ts
  modified:
    - scripts/test-pure-functions.ts
decisions:
  - "Ngưỡng lệch lớn xác nhận với người dùng 24/09: |lệch| >= 5 đơn vị HOẶC |lệch| >= 10% tồn sổ (D-16/A1 đã chốt, không còn là giả định chờ UAT)"
  - "useApproveSession invalidate thêm inventoryKeys.all vì duyệt phiên ghi sổ thật, đổi tồn ngay"
metrics:
  duration: ~25 min
  completed: 2026-09-24
---

# Phase 6 Plan 09: Lớp dữ liệu phiên kiểm kê — Summary

**`src/features/stocktake/` đầy đủ: hai hàm thuần (ngưỡng lệch, nhãn trạng thái) test trước; types/mapper; zod schema; 10 hàm api gọi 8 RPC kiểm kê qua `.rpc()`; query key tập trung; 8 hook TanStack Query với mutation invalidate đúng tiền tố.**

## Thực hiện

### Task 1 — Hàm thuần (TDD)

Viết case hành vi vào `scripts/test-pure-functions.ts` trước (khối "Kiểm kê: ngưỡng lệch và
nhãn trạng thái phiên"), chạy đỏ (file chưa tồn tại), rồi viết:

- `lib/discrepancy.ts`: `LARGE_DISCREPANCY_THRESHOLD = { absolute: 5, ratio: 0.1 }`,
  `discrepancyOf(counted, book)`, `isLargeDiscrepancy(counted, book)` — lệch 0 → false; đạt
  ngưỡng tuyệt đối → true dù tỉ lệ nhỏ; tồn sổ 0 chỉ xét tuyệt đối (không chia 0); tồn sổ âm
  vẫn dùng trị tuyệt đối để tính tỉ lệ. Comment ghi rõ giá trị đã được người dùng xác nhận
  ngày 24/09 (không còn là giả định A1 chờ UAT như lúc lập kế hoạch).
- `lib/session-status.ts`: `SessionStatus` union 5 giá trị, `sessionStatus()` suy từ
  `state`/`counted`/`scope`/`recount` (không đọc cột database nào), `SESSION_STATUS_LABELS`
  (tiếng Việt) + `SESSION_STATUS_COLORS` (màu `Tag` antd).

`npx tsx scripts/test-pure-functions.ts` xanh (16 assert mới, tổng file vẫn xanh 100%).

### Task 2 — types, schema, api, keys, hooks

Đọc `src/types/database.types.ts` để lấy đúng `Args`/`Returns` của 9 RPC (`mo_phien_kiem_ke`,
`luu_dong_kiem_ke`, `xoa_dong_kiem_ke`, `dat_dem_lai`, `duyet_phien_kiem_ke`, `huy_chung_tu`,
`danh_sach_phien_kiem_ke`, `bang_dem_kiem_ke`, `kho_hien_tai`) — không đoán tên tham số.

- `types.ts`: `StocktakeSession` (từ `danh_sach_phien_kiem_ke`) + `CountSheetRow` (từ
  `bang_dem_kiem_ke`, `counted`/`bookQuantity`/`discrepancy`/`lineId` đều `| null` cho dòng
  chưa đếm) + `StocktakeLookups`, cùng hai mapper `toStocktakeSession`/`toCountSheetRow`.
- `schemas/stocktake.schema.ts`: `openSessionSchema` (categoryIds rỗng = toàn kho),
  `countQuantitySchema`, `voidSessionSchema` — khuôn `inventory.schema.ts`/`user.schema.ts`.
- `api/stocktake.api.ts`: 10 hàm, 9 lần `if (error) throw error`. Mọi ghi qua `.rpc()`
  (T-06-44 — không `.from()` ghi thẳng `chung_tu_dong`). `fetchStocktakeLookups` gọi
  `kho_hien_tai()` lấy kho được phân của thủ kho (rỗng cho quản lý/văn phòng, đúng khuôn
  `inventory.api.ts`).
- `api/stocktake.keys.ts` + `hooks/useStocktake.ts`: `useStocktakeSessions`
  (`keepPreviousData`), `useStocktakeSession`/`useCountSheet` (`enabled: sessionId !== ""`,
  T-06-45), `useStocktakeLookups`, và 6 mutation — mỗi cái `onSuccess` invalidate tiền tố
  `["stocktake","sheet",sessionId]` (mọi nhóm hàng) + `stocktakeKeys.sessions()`;
  `useApproveSession` invalidate thêm `inventoryKeys.all` (duyệt ghi sổ thật, tồn đổi ngay).

`npm run typecheck` xanh, gate `grep -c invalidateQueries` = 13 (yêu cầu ≥6).

## Kiểm tra cuối

- `npx tsx scripts/test-pure-functions.ts` — xanh.
- `npm run check` (typecheck + lint + build) — xanh, build ra đủ route cũ, không route mới
  (plan này chưa tạo route `/kiem-ke`).
- `npx eslint src/features/stocktake --max-warnings=0` — sạch.
- Không `select("*")`/`.select()` trống trong `src/features/stocktake`.
- Không tên cột tiếng Việt (`so_luong_he_thong`, `ton_so`, `ma_hang`, `dong_id`) rò ra ngoài
  `types.ts`/`api/`.

## Deviations

Không có — plan thực thi đúng như viết.

## Việc cần theo dõi ở các plan sau

- 06-10..06-12 (giao diện wave 5: danh sách phiên, đếm mobile/desktop, bảng lệch, import
  Excel) dựng trực tiếp trên lớp này.
- 06-13 gọi `nhap_so_dem_kiem_ke` (import Excel) **từ route server**, không từ
  `stocktake.api.ts` — đúng theo `<interfaces>` của plan, chưa viết ở đây.
- Route `/kiem-ke` chưa tồn tại — `stock-card-columns.tsx` (`DOC_TYPE_TO_ROUTE`) và
  `navigation.ts` vẫn chưa được sửa, đúng theo ghi chú "chỉ thêm SAU KHI route có thật" trong
  `06-PATTERNS.md`.

## Self-Check

- `src/features/stocktake/lib/discrepancy.ts` — FOUND
- `src/features/stocktake/lib/session-status.ts` — FOUND
- `src/features/stocktake/types.ts` — FOUND
- `src/features/stocktake/schemas/stocktake.schema.ts` — FOUND
- `src/features/stocktake/api/stocktake.api.ts` — FOUND
- `src/features/stocktake/api/stocktake.keys.ts` — FOUND
- `src/features/stocktake/hooks/useStocktake.ts` — FOUND
- commit `93177f8` (Task 1) — FOUND trong `git log`
- commit `83fa9e8` (Task 2) — FOUND trong `git log`

## Self-Check: PASSED
