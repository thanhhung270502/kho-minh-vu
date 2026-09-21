---
phase: 05-ton-kho-tong-quan
plan: 07
subsystem: frontend-ui
tags: [typescript, antd, tanstack-query, next-app-router, url-filter, inventory]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 06)
    provides: "features/inventory: InventoryRow, InventoryFilter + read/writeInventoryFilterToUrl, INVENTORY_PAGE_SIZES, INVENTORY_SORT_FIELDS, countActiveInventoryFilters, useInventory"
  - phase: 05-ton-kho-tong-quan (plan 01/05)
    provides: "RPC danh_sach_ton_kho trên cloud (0058) — một dòng mỗi mã, ton_theo_kho jsonb, lọc duoi_dinh_muc"
provides:
  - "src/app/(app)/ton-kho/page.tsx — route /ton-kho (Server Component, requirePermission view-catalog, PageHeader, Suspense)"
  - "src/features/inventory/components/stock-table.tsx — StockTable({ canLoadProvisionalStock }): ListLayout + QueryState, bộ lọc trên URL, phân trang/sắp xếp phía server"
  - "src/features/inventory/components/stock-columns.tsx — buildStockColumns({ filter, warehouses }), cột kho dựng động"
  - "src/features/inventory/components/stock-filter-panel.tsx — StockFilterPanel: nhóm hàng / công đoạn / kho / tồn + Xóa lọc"
  - "src/features/inventory/components/stock-toolbar.tsx — StockToolbar: ô tìm mã/tên gõ không dấu, debounce 300ms"
affects: [05-10 (link /ton-kho/nap-tam đã trỏ sẵn), 05-11 (menu, ma trận quyền route, UAT màn /ton-kho), Phase 6 (TON-05 vẫn chưa làm)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cột theo kho dựng động từ useLookups().warehouses, giá trị row.stockByWarehouse[kho.id] ?? 0 — thêm kho thứ ba không sửa code"
    - "Đang lọc một kho thì chỉ giữ cột của kho đó — RPC chỉ cộng tồn kho được lọc, cột kho còn lại sẽ toàn 0 giả"
    - "scroll.x của bảng tính bằng tổng width các cột (số cột kho thay đổi theo bộ lọc)"

key-files:
  created:
    - src/app/(app)/ton-kho/page.tsx
    - src/features/inventory/components/stock-table.tsx
    - src/features/inventory/components/stock-columns.tsx
    - src/features/inventory/components/stock-filter-panel.tsx
    - src/features/inventory/components/stock-toolbar.tsx
  modified: []

key-decisions:
  - "Ô tìm tách thành stock-toolbar.tsx (ngoài files_modified): must_have đòi ô tìm gõ không dấu, còn ProductToolbar thuộc thư mục nội bộ của feature products và gõ cứng ProductFilter"
  - "Không import formatNumber từ features/products/components/product-columns.tsx (CLAUDE.md: feature không import thư mục nội bộ của feature khác) — dùng toLocaleString('vi-VN') tại chỗ như stock-in/stock-out/returns"
  - "Trạng thái rỗng không bộ lọc nói 'chưa có mã đang kinh doanh', không nói 'chưa có biến động kho' — danh_sach_ton_kho LEFT JOIN nên mã tồn 0 vẫn có dòng; gợi ý nạp tồn tạm chuyển xuống dòng ghi chú dưới bảng khi cả trang tồn 0 và không lọc"
  - "Link /ton-kho/nap-tam chỉ hiện với quan_ly: page truyền canLoadProvisionalStock = user.role === 'quan_ly' (tiền lệ canVoid/canApprove ở 4 trang chi tiết); quyền load-provisional-stock do 05-10 thêm, lúc đó đổi sang hasPermission được"

patterns-established:
  - "Màn danh sách feature inventory: page mỏng → StockTable điều phối → buildStockColumns / StockFilterPanel / StockToolbar, cùng khuôn issue-table của stock-out"

requirements-completed: [TON-01, TQAN-02]

# Metrics
duration: ~9min
completed: 2026-09-21
---

# Phase 5 Plan 7: Màn tồn kho `/ton-kho` Summary

**Route `/ton-kho` hiện một dòng cho mỗi mã hàng. Mỗi kho có một cột tồn riêng, dựng động từ danh mục kho, cộng thêm cột Tổng và cột Định mức. Bộ lọc nhóm / công đoạn / kho / tồn và ô tìm gõ không dấu đều nằm trên URL. Phân trang và sắp xếp chạy phía server. `?ton=duoi_dinh_muc` là màn "mã dưới định mức" của TQAN-02. Không có cột giá vốn hay giá trị tồn (D-02).**

## Performance

- **Duration:** ~9 min (11:26 → 11:35 UTC)
- **Completed:** 2026-09-21
- **Tasks:** 3/3 (autonomous, không checkpoint)
- **Files:** 5 tạo mới, 0 sửa

## Accomplishments

- **Panel lọc** (`stock-filter-panel.tsx`, 146 dòng) có bốn ô. Mọi thay đổi đều về trang 1. Không option nào mang `value: null`: "Tất cả" là trạng thái đã xóa của `Select` (`allowClear` + placeholder), còn rc-select tự hiện placeholder khi `value` là null. Nút "Xóa lọc" đưa bộ lọc về `DEFAULT_INVENTORY_FILTER` nhưng giữ từ khóa và cỡ trang.
- **Bảng** (`stock-table.tsx`, 182 dòng) đọc bộ lọc từ `useSearchParams()` và ghi lại bằng `router.replace(…, { scroll: false })`. Không `useState` nào giữ điều kiện lọc. Trang cuối cạn sau khi lọc thì tự về trang 1. Bọc `QueryState` có ba câu rỗng khác nhau:
  - có từ khóa: gợi ý gõ ít chữ hơn hoặc bỏ dấu
  - có bộ lọc: nói rõ lý do và có nút "Xóa bộ lọc". Riêng `duoi_dinh_muc` giải thích thêm rằng mã chưa đặt định mức chỉ vào danh sách khi tồn âm.
  - không lọc gì: danh mục chưa có mã đang kinh doanh, kèm link sang Danh mục hàng
- **Cột** (`stock-columns.tsx`, 140 dòng):
  - Mã hàng: cố định bên trái, link sang `/danh-muc/{id}`, trang có tab Thẻ kho
  - Tên, Nhóm, Công đoạn (`Tag` theo màu công đoạn), ĐVT
  - Mỗi kho một cột, `align: right`, rộng 110
  - Tổng: in đậm, gắn `Tag` "Dưới định mức" khi `minStock > 0 && totalStock < minStock`
  - Định mức: hiện "—" khi bằng 0 (chưa đặt)
  - Tô màu số: âm đỏ, 0 xám nhạt
- **Ô tìm** (`stock-toolbar.tsx`, 62 dòng) chép khuôn `IssueToolbar`: debounce 300ms, Enter tìm ngay. Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) thì chỉnh lại trong lúc render, không dùng effect.
- **Route** (`ton-kho/page.tsx`) là Server Component, không có `"use client"`, không import antd. Gọi `requirePermission("view-catalog")`, `PageHeader` và `<Suspense fallback={null}>`.
- **Chặn chưa đăng nhập (T-05-27):** `src/proxy.ts` có matcher phủ mọi đường dẫn. `/ton-kho` không nằm trong `PUBLIC_PATHS`, nên bị đẩy về `/dang-nhap?tiep_tuc=%2Fton-kho`. Lớp thứ hai là `getCurrentUser()` của `(app)/layout.tsx`, lớp thứ ba là `requirePermission`. Ba lớp này mới kiểm bằng đọc code, chưa chạy thật.

**Về điện thoại:** việc bọc bảng bằng `overflow-x-auto` và đặt `scroll={{ x }}` là **mức tối thiểu CLAUDE.md đòi cho MỌI bảng**. Nó **KHÔNG** có nghĩa đã làm TON-05 (màn tồn kho dùng được trên điện thoại). TON-05 vẫn thuộc Phase 6 và chưa ai làm. Khi lập kế hoạch Phase 6, đừng coi nó là xong.

## Task Commits

1. **Task 1: stock-filter-panel.tsx**: `17ab01f` (feat)
2. **Task 2: stock-table.tsx + stock-columns.tsx + stock-toolbar.tsx**: `eeffbf5` (feat)
3. **Task 3: route /ton-kho**: `54c63fc` (feat), đúng tên commit plan yêu cầu: `feat(ton-kho): man ton kho theo ma va kho`

## Files Created/Modified

- `src/app/(app)/ton-kho/page.tsx`: route, quyền, header, Suspense
- `src/features/inventory/components/stock-table.tsx`: điều phối URL ↔ hook ↔ bảng
- `src/features/inventory/components/stock-columns.tsx`: cấu hình cột, cột kho dựng động
- `src/features/inventory/components/stock-filter-panel.tsx`: panel bốn ô lọc
- `src/features/inventory/components/stock-toolbar.tsx`: ô tìm

Lớp dữ liệu của 05-06 dùng nguyên, không sửa dòng nào.

## Verification

| Kiểm | Kết quả |
|---|---|
| `npm run check` (typecheck → lint → build) | xanh trước cả ba commit; build liệt kê `ƒ /ton-kho` |
| `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` |
| `npx prettier --check src/features/inventory/components` + page | sạch |
| Dòng đầu `stock-filter-panel.tsx` | `"use client";` |
| `grep "value: null" stock-filter-panel.tsx` | không có dòng nào |
| Bốn chuỗi `con_hang` / `het_hang` / `am` / `duoi_dinh_muc` trong panel | có đủ |
| `grep -E "gia_von\|giaVon\|costPrice\|giá trị tồn" src/features/inventory/components/*.tsx` | không có dòng nào |
| `grep useState stock-table.tsx` | không có dòng nào |
| `grep '"K1"\|"K2"'` trong components | không có dòng nào |
| `stockByWarehouse[` | có, ở `stock-columns.tsx:101` (xem lệch #2) |
| `<QueryState` + `emptyDescription` trong `stock-table.tsx` | có |
| `ton-kho/page.tsx`: `"use client"` / import `antd` | không có |
| `ton-kho/page.tsx`: `requirePermission("view-catalog")`, `<Suspense` | có |
| Số dòng | 182 / 146 / 140 / 62 / 28, không file nào vượt 200 |

**Console trình duyệt: CHƯA MỞ, không có nội dung để ghi.** Phiên này không có trình duyệt và không đăng nhập được. Vì vậy phần `<human-check>` của Task 3 chưa làm: console không có cảnh báo antd, đổi ô lọc thì URL đổi theo, refresh giữ bộ lọc, `?ton=duoi_dinh_muc` mở được, bấm mã sang trang chi tiết. Toàn bộ dồn sang UAT 05-11. Không được coi "console sạch" là đã kiểm.

## Decisions Made

Xem `key-decisions` ở frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tạo `stock-toolbar.tsx`, file này không có trong `files_modified`**
- **Found during:** Task 2
- **Issue:** Must-have yêu cầu "ô tìm gõ không dấu đổi kết quả và đổi URL", nhưng không task nào tạo ô tìm. `ProductToolbar` thì không dùng lại được, vì nó thuộc thư mục nội bộ của feature products và nhận kiểu `ProductFilter`.
- **Fix:** Viết `StockToolbar` (62 dòng) theo khuôn `IssueToolbar` của stock-out.
- **Commit:** `eeffbf5`

**2. Tách `stock-columns.tsx` theo điều khoản dự phòng của plan**
- Nếu gộp cột vào `stock-table.tsx` thì file khoảng 300 dòng. Plan cho phép tách ra `stock-columns.tsx`. Hệ quả là acceptance "`stock-table.tsx` chứa `stockByWarehouse[`" nay khớp ở `stock-columns.tsx`. `stock-table.tsx` vẫn là nơi dựng danh sách kho và truyền vào `buildStockColumns`.

**3. [CLAUDE.md] Không import `formatNumber` từ `product-columns.tsx`**
- Plan bảo dùng lại `formatNumber`, nhưng hàm đó nằm trong `features/products/components/`. CLAUDE.md cấm feature import thư mục nội bộ của feature khác. Làm theo cách stock-in, stock-out và returns đã làm: gọi `toLocaleString("vi-VN")` tại chỗ. `InventoryRow` đã là `number`, nên không cần nhánh xử lý chuỗi hay null như `formatNumber`.

**4. [Rule 1 - Bug] Câu rỗng khi không lọc gì sẽ nói sai**
- **Issue:** Plan bảo khi không có bộ lọc thì hiện "Chưa có biến động kho nào" kèm link nạp tồn tạm. Nhưng `danh_sach_ton_kho` LEFT JOIN `ton_kho` (0058), nên mã tồn 0 vẫn có dòng. Trạng thái rỗng khi không lọc chỉ xảy ra lúc danh mục không có mã đang kinh doanh, và lúc đó câu kia sai.
- **Fix:**
  - Câu rỗng nay nói đúng tình huống đó, kèm link sang Danh mục hàng.
  - Gợi ý nạp tồn tạm chuyển xuống một dòng ghi chú dưới bảng. Dòng này chỉ hiện khi không lọc, không tìm, và mọi mã trên trang đang tồn 0. Câu được viết để luôn đúng: "Tồn của mọi mã trên trang này đang bằng 0". Tổng 0 không có nghĩa là chưa từng có biến động.
  - Link `/ton-kho/nap-tam` chỉ hiện với `quan_ly`. Vai trò khác bấm vào sẽ bị đẩy sang `/khong-du-quyen`.
- **Commit:** `eeffbf5`, `54c63fc`

**5. [Rule 1 - Bug] Lọc theo kho làm cột kho còn lại hiện 0 giả**
- **Issue:** Có `p_kho_id` thì RPC chỉ cộng tồn của kho đó. Cột của kho còn lại vẫn dựng ra và hiện 0 cho mọi mã, trông như kho đó trống.
- **Fix:** Đang lọc một kho thì chỉ dựng cột của kho đó. `scroll.x` tính lại theo tổng `width` các cột.
- **Commit:** `eeffbf5`

**Nhỏ, không đổi hành vi so với plan:**
- Giữ `<div className="overflow-x-auto">` quanh bảng như plan yêu cầu, dù `ListLayout` đã có một lớp như vậy. Lớp này thừa nhưng vô hại.
- Không bật `sticky` header. Bảng nằm trong khung `overflow-x-auto` nên header dính sẽ không dính theo trang.

**Tổng:** 3 lệch tự sửa (1 Rule 3, 2 Rule 1), 1 điều chỉnh theo CLAUDE.md, 1 lần tách file plan đã cho phép. Hai file ngoài `files_modified`: `stock-toolbar.tsx` và `stock-columns.tsx`, đều là file mới trong `features/inventory/components/`. Không sửa file nào có sẵn.

## Issues Encountered

Không có. Cả ba lần `npm run check` đều xanh ngay lần đầu.

## Deferred / cần để ý ở UAT 05-11

- **Kiểm bằng trình duyệt với bốn vai trò** (human-check của Task 3): console, URL đổi theo bộ lọc, refresh, `?ton=duoi_dinh_muc`, bấm mã hàng, thu cửa sổ dưới 992px (panel sập vào Drawer).
- **Thủ kho thấy "0" ở cột kho không được phân.** RPC loại tồn của kho đó, nhưng bảng `kho` thì mọi vai trò đều đọc được (0015), nên cột vẫn dựng ra. Muốn hiện "—" thay cho "0" thì giao diện phải biết danh sách kho của người dùng. `CurrentUser` hiện không có trường này, nên chưa làm. Xem ở UAT có gây hiểu nhầm không.
- **Link "Nạp tồn tạm từ KiotViet" trả 404** cho tới khi 05-10 tạo route `/ton-kho/nap-tam`. Khi 05-10 thêm quyền `load-provisional-stock`, có thể đổi `user.role === "quan_ly"` trong `ton-kho/page.tsx` sang `hasPermission(user.role, "load-provisional-stock")`.
- **Menu và ma trận quyền route:** 05-11 thêm, plan này không đụng `navigation.ts`, `nav-icons.tsx`, `test-route-permissions.ts`.
- **Tra cứu (`useLookups`) lỗi** thì bảng chỉ còn cột Tổng và panel không có lựa chọn. Lỗi này không hiện riêng. Bảng chính vẫn có đủ bốn trạng thái qua `QueryState`.

## User Setup Required

Không.

## Known Stubs

Không có. Chuỗi `placeholder` duy nhất là prop `placeholder="Tất cả"` của `Select` và gợi ý của ô tìm, không phải dữ liệu giả.

## Threat Flags

Không có bề mặt mới ngoài threat model của plan:
- **T-05-27** (vào thẳng `/ton-kho` khi chưa đăng nhập): proxy chặn, rồi layout, rồi `requirePermission`. Chưa chạy thật, 05-11 phủ bằng ma trận quyền.
- **T-05-28** (thủ kho thấy tồn kho khác): màn này không lọc lại ở JS, phạm vi do RPC áp.
- **T-05-29** (rò giá vốn): `InventoryRow` không mang giá vốn, grep sạch.
- **T-05-SC** (cài gói npm mới): không thêm dependency.

## Self-Check: PASSED

- FOUND: src/app/(app)/ton-kho/page.tsx
- FOUND: src/features/inventory/components/stock-table.tsx
- FOUND: src/features/inventory/components/stock-columns.tsx
- FOUND: src/features/inventory/components/stock-filter-panel.tsx
- FOUND: src/features/inventory/components/stock-toolbar.tsx
- FOUND: 17ab01f, eeffbf5, 54c63fc
