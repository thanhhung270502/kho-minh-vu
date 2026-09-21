---
phase: 05-ton-kho-tong-quan
plan: 06
subsystem: frontend-data
tags: [typescript, tanstack-query, supabase-js, rpc, mapper, url-filter, inventory]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 05)
    provides: "0058-0062 trên cloud + src/types/database.types.ts sinh lại (danh_sach_ton_kho, de_xuat_dinh_muc, dat_dinh_muc)"
provides:
  - "src/features/inventory/types.ts — InventoryRow, ReorderSuggestion, SuggestionBasis, SUGGESTION_BASES, SUGGESTION_BASIS_LABELS, toInventoryRow, toReorderSuggestion"
  - "src/features/inventory/schemas/inventory.schema.ts — InventoryFilter, DEFAULT_INVENTORY_FILTER, INVENTORY_PAGE_SIZES, read/writeInventoryFilterToUrl, toInventoryRpcArgs, countActiveInventoryFilters"
  - "src/features/inventory/api/inventory.keys.ts — inventoryKeys.all / list(filter) / reorderSuggestions(basis, page)"
  - "src/features/inventory/api/inventory.api.ts — fetchInventory, fetchReorderSuggestions, applyReorderLevels, REORDER_SUGGESTION_PAGE_SIZE (200)"
  - "src/features/inventory/hooks/useInventory.ts — useInventory, useReorderSuggestions(basis, page, enabled), useApplyReorderLevels"
  - "scripts/test-pure-functions.ts — khối assertion bộ lọc tồn kho"
affects: [05-07 (màn /ton-kho), 05-09 (màn duyệt định mức), 05-10 (nạp tồn tạm — invalidate inventoryKeys.all)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jsonb từ RPC (kiểu sinh ra là Json) thu hẹp từ unknown về Record<string, number> trong mapper — không tin kiểu sinh, RPC đổi hình dạng thì màn hiện 0 chứ không vỡ"
    - "Giá trị enum lạ từ database rơi về nhánh 'không biết' (khong_du_lieu) bằng type guard, không ép kiểu"
    - "Gọi RPC qua biến cục bộ `const supabase = getSupabaseBrowserClient()` để `rpc(\"<tên>\"` nằm trên một dòng sau prettier — grep được"

key-files:
  created:
    - src/features/inventory/types.ts
    - src/features/inventory/schemas/inventory.schema.ts
    - src/features/inventory/api/inventory.keys.ts
    - src/features/inventory/api/inventory.api.ts
    - src/features/inventory/hooks/useInventory.ts
  modified:
    - scripts/test-pure-functions.ts

key-decisions:
  - "STOCK_STATUSES và TradingStatus khai lại trong inventory.schema.ts, không import từ features/products — comment trỏ sang feature products để hai bên đi cùng nhau"
  - "Trường nhóm/công đoạn/ĐVT của InventoryRow gõ string | null dù kiểu sinh ghi string — RPC 0058 lấy chúng qua LEFT JOIN"
  - "Thêm INVENTORY_PAGE_SIZES và REORDER_SUGGESTION_PAGE_SIZE (ngoài plan) để 05-07/05-09 dựng phân trang khỏi phải gõ lại số"
  - "useReorderSuggestions cũng dùng keepPreviousData (plan chỉ bắt buộc cho useInventory) — đổi trang đề xuất không nháy trắng"

patterns-established:
  - "Feature inventory: mọi tên RPC/cột tiếng Việt chỉ nằm trong api/ và types.ts; hook chỉ còn khóa audit-log ['audit-log', 'san_pham'] theo quy ước sẵn có"

requirements-completed: [TON-01, TQAN-02]

# Metrics
duration: ~10min
completed: 2026-09-21
---

# Phase 5 Plan 6: Lớp dữ liệu feature inventory Summary

**Kiểu miền + mapper Việt→Anh cho `danh_sach_ton_kho`/`de_xuat_dinh_muc`, bộ lọc tồn kho sống trên URL bằng tham số tiếng Việt không dấu, ba hàm gọi RPC có `throw` lỗi, và ba hook TanStack Query (`keepPreviousData`, `enabled`, invalidate ba nhóm key).**

## Performance

- **Duration:** ~10 min (11:03 → 11:13 UTC)
- **Completed:** 2026-09-21
- **Tasks:** 3/3 (autonomous, không checkpoint)
- **Files:** 5 tạo mới, 1 sửa

## Accomplishments

- `toInventoryRow` đổi `ton_theo_kho` (jsonb `{kho_id: so_luong}`) thành `stockByWarehouse: Record<string, number>` qua hàm `toStockMap(value: unknown)`. Kết quả là `{}` khi giá trị không phải object; không dùng `any` và không dùng `!`. Mọi cột numeric (`tong_ton`, `ton_toi_thieu`, `dinh_muc_*`, `tong_da_ban`, `tong_so_dong`) đều bọc `Number()`.
- `toReorderSuggestion` thu hẹp `nguon_de_xuat` bằng type guard `isSuggestionBasis`. Giá trị lạ rơi về `"khong_du_lieu"`.
- `readInventoryFilterFromUrl` / `writeInventoryFilterToUrl` dùng các khóa `q`, `nhom`, `cong_doan`, `kho`, `ton`, `kinh_doanh`, `sap_xep`, `sortDir`, `trang`, `kich_thuoc`. `readInt` và `readUuid` được chép nguyên, giữ cả comment `Number(null)`. `toInventoryRpcArgs` gửi `p_dang_kinh_doanh = null` tường minh khi chọn "tất cả".
- `useApplyReorderLevels` invalidate `inventoryKeys.all`, `["products"]` và `["audit-log", "san_pham"]`.

## Task Commits

1. **Task 1: types.ts, kiểu miền và mapper**: `4f36880` (feat)
2. **Task 2: inventory.schema.ts, inventory.keys.ts và assertion hàm thuần**: `2b5b586` (feat). Làm theo TDD: chạy assertion trước khi có module thì đỏ, viết xong schema thì xanh.
3. **Task 3: inventory.api.ts và useInventory.ts**: `975b3c0` (feat)
4. **Chạy prettier trên hai file của Task 1–2**: `0614892` (style). Chỉ xuống dòng và thêm dấu phẩy cuối, không đổi logic.

## Files Created/Modified

- `src/features/inventory/types.ts`: `InventoryRow`, `ReorderSuggestion`, `SUGGESTION_BASES`/`LABELS`, hai mapper
- `src/features/inventory/schemas/inventory.schema.ts`: `InventoryFilter`, đọc/ghi URL, `toInventoryRpcArgs`, `countActiveInventoryFilters`
- `src/features/inventory/api/inventory.keys.ts`: `inventoryKeys`
- `src/features/inventory/api/inventory.api.ts`: `fetchInventory`, `fetchReorderSuggestions`, `applyReorderLevels`
- `src/features/inventory/hooks/useInventory.ts`: `useInventory`, `useReorderSuggestions`, `useApplyReorderLevels`
- `scripts/test-pure-functions.ts`: thêm khối "Bộ lọc màn tồn kho (Phase 5, 05-06)" gồm 19 assertion

## Verification

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run check` (typecheck → lint → build) | xanh sau mỗi task |
| `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` |
| `grep -c "if (error) throw error" inventory.api.ts` | 3 |
| `grep antd src/features/inventory` | không có dòng nào |
| `grep -rE "so_luong\|ma_hang\|ton_toi_thieu\|nguon_de_xuat" hooks/` | không có dòng nào |
| `grep "features/products" inventory.schema.ts` | không có dòng nào |
| `grep -E ":\s*any\|as any"` và `grep -E "\w!\."` trên types.ts | không có dòng nào |
| key_link `rpc\("danh_sach_ton_kho"` | khớp, `inventory.api.ts:32` |
| `npx prettier --check src/features/inventory` | sạch |

## Decisions Made

Xem `key-decisions` ở frontmatter. Cả bốn quyết định đều nằm trong phạm vi file của plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hai tiêu chí nghiệm thu của Task 2 mâu thuẫn nhau theo nghĩa đen**
- **Found during:** Task 2
- **Issue:** Plan yêu cầu comment trỏ tới file `filter.schema.ts` của products. Đồng thời plan lại đòi `grep "features/products" inventory.schema.ts` không ra dòng nào. Comment chứa đường dẫn đầy đủ nên làm grep khớp.
- **Fix:** Viết lại comment thành "`STOCK_STATUSES` của feature `products` (file `schemas/filter.schema.ts` bên đó)". Người đọc vẫn biết tìm ở đâu, và grep không còn khớp.
- **Files modified:** `src/features/inventory/schemas/inventory.schema.ts`
- **Commit:** `2b5b586`

**2. [Rule 3 - Blocking] key_link `rpc\("danh_sach_ton_kho"` không grep được sau prettier**
- **Found during:** Task 3
- **Issue:** Khi viết `getSupabaseBrowserClient().rpc(...)` giống khuôn `fetchProducts`, prettier (printWidth 80) đẩy tên RPC xuống dòng sau.
- **Fix:** Tách `const supabase = getSupabaseBrowserClient()` và `const args = toInventoryRpcArgs(filter)` ra biến riêng. Cả ba lời gọi `rpc("…"` giờ nằm trọn trên một dòng. Hành vi không đổi.
- **Files modified:** `src/features/inventory/api/inventory.api.ts`
- **Commit:** `975b3c0`

**3. Commit thêm ngoài số task**
- Plan chỉ ghi một commit `feat(ton-kho): lop du lieu feature inventory`. Điều phối yêu cầu mỗi task một commit, nên có ba commit `feat`, và commit của Task 3 mang đúng tên đó. Thêm một commit `style` (`0614892`) vì prettier chạy ở Task 3 cũng định dạng lại hai file đã commit ở Task 1–2. Tách ra để commit của task nào chỉ chứa việc của task đó.

**Tổng:** 2 lệch được tự sửa, 1 lệch về cách chia commit. Không đụng file ngoài `files_modified`.

## Issues Encountered

- `.memory/index.md` và `.memory/patterns/pgtap-va-test.md` đã bị sửa trong bản làm việc từ trước khi plan này chạy, do phiên khác. Plan này không stage và không đụng hai file đó.
- Prettier không được áp cho toàn repo: chính file mẫu `product.api.ts` cũng không qua `prettier --check`. Plan này chỉ định dạng các file mới của feature inventory và không định dạng lại `scripts/test-pure-functions.ts`.

## Deferred

- **Chưa xác minh bằng trình duyệt và console.** Lớp dữ liệu chưa được component nào render. Phiên này cũng không đăng nhập được, nên việc chạy thật `danh_sach_ton_kho` / `de_xuat_dinh_muc` / `dat_dinh_muc` qua hook dồn sang UAT 05-11. Tầng RPC đã có smoke test bằng phiên người dùng ở 05-05.
- Plan này không cần truy cập database: không `db:push`, không `db:types`, không pgTAP.

## User Setup Required

Không.

## Next Phase Readiness

- 05-07 (màn `/ton-kho`) dùng được ngay các thứ sau: `readInventoryFilterFromUrl`, `writeInventoryFilterToUrl`, `DEFAULT_INVENTORY_FILTER`, `INVENTORY_PAGE_SIZES`, `useInventory`, và `row.stockByWarehouse[warehouse.id] ?? 0`.
- 05-09 (màn duyệt định mức) dùng được: `useReorderSuggestions(basis, page, true)`, `useApplyReorderLevels`, `SUGGESTION_BASIS_LABELS`, `REORDER_SUGGESTION_PAGE_SIZE`. `dat_dinh_muc` giới hạn 1000 id mỗi lần (23514). Một trang đề xuất có 200 dòng, nên duyệt theo trang sẽ không chạm giới hạn đó.
- 05-10 invalidate `inventoryKeys.all` sau khi nạp tồn tạm.

## Known Stubs

Không có. Lượt quét TODO/FIXME/placeholder chỉ khớp option `placeholderData` của TanStack Query.

## Threat Flags

Không có bề mặt mới ngoài threat model của plan:
- T-05-24: `readUuid` và `readInt` kẹp tham số URL, có assertion cho `kho` không phải uuid và `trang=-5`.
- T-05-25: `fetchInventory` không lọc gì ở JS.
- T-05-26: quyền duyệt chặn ở RPC.
- T-05-SC: không thêm dependency nào.

## Self-Check: PASSED

- FOUND: src/features/inventory/types.ts
- FOUND: src/features/inventory/schemas/inventory.schema.ts
- FOUND: src/features/inventory/api/inventory.keys.ts
- FOUND: src/features/inventory/api/inventory.api.ts
- FOUND: src/features/inventory/hooks/useInventory.ts
- FOUND: 4f36880, 2b5b586, 975b3c0, 0614892
