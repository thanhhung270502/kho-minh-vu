---
phase: 05-ton-kho-tong-quan
plan: 08
subsystem: frontend-ui
tags: [typescript, antd, next-link, stock-card, running-balance, products]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 05)
    provides: "0059/0062 trên cloud — the_kho_san_pham trả cột thứ 15 ton_luy_ke; database.types.ts đã sinh lại có ton_luy_ke"
provides:
  - "src/features/products/types.ts — StockCardRow.runningBalance: number | null, map từ ton_luy_ke (null giữ nguyên null)"
  - "src/features/products/components/stock-card-columns.tsx — buildStockCardColumns({ canViewCost }), DOC_TYPE_TO_ROUTE, SOURCE_LABELS"
  - "src/features/products/components/stock-card.tsx — cột Tồn lũy kế, số phiếu link sang trang chi tiết chứng từ, dòng chú thích dấu gạch"
affects: [05-11 (UAT tab Thẻ kho), Phase 6 (thêm KIEM_KE/DIEU_CHINH/CHUYEN_KHO vào DOC_TYPE_TO_ROUTE khi có route)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cột numeric có thể null từ RPC: kiểm `=== null` trước `Number()` — kiểu sinh ghi `number` nhưng không tin được, Number(null) ra 0"
    - "Bảng tra loai_ct → route chỉ chứa loại có thư mục [id] thật dưới src/app/(app)/; loại chưa có route nằm trong comment, không nằm trong map"

key-files:
  created:
    - src/features/products/components/stock-card-columns.tsx
  modified:
    - src/features/products/types.ts
    - src/features/products/components/stock-card.tsx

key-decisions:
  - "DOC_TYPE_TO_ROUTE có 4 loại (NHAP, XUAT, TRA_KHACH, TRA_NCC), không phải chỉ NHAP như plan dự đoán — ls src/app/(app) hôm nay có nhap-kho/[id], xuat-kho/[id], tra-hang/[id]; TRA_KHACH và TRA_NCC dùng chung /tra-hang (ReturnDetailView xử lý cả hai)"
  - "Tách mảng cột ra stock-card-columns.tsx theo điều khoản dự phòng của plan — stock-card.tsx lên 210 dòng sau khi thêm; theo khuôn buildXColumns sẵn có (product-columns, order-line-columns, issue-line-columns)"
  - "Chú thích dấu gạch là dòng chữ dưới bảng, chỉ hiện khi trang đang xem có dòng runningBalance null — lọc theo kho thì không có dòng KiotViet nên không hiện"
  - "scroll.x của bảng 1000 → 1120 để bù đúng 120px của cột mới, giữ nguyên khoảng dư cũ cho cột Đối tác"

patterns-established:
  - "Thêm route chi tiết cho loại chứng từ mới → thêm một dòng vào DOC_TYPE_TO_ROUTE trong stock-card-columns.tsx"

requirements-completed: [TON-02]

# Metrics
duration: ~6min
completed: 2026-09-21
---

# Phase 5 Plan 8: Thẻ kho có tồn lũy kế và link chứng từ Summary

**Thẻ kho đang chạy ở tab "Thẻ kho" của chi tiết mã hàng có thêm cột "Tồn lũy kế" (dấu "—" cho dòng lưu trữ KiotViet), và số phiếu của dòng hệ thống mở thẳng trang chi tiết phiếu nhập / xuất / trả hàng.**

## Performance

- **Duration:** ~6 min (11:16 → 11:22 UTC)
- **Completed:** 2026-09-21
- **Tasks:** 2/2 (autonomous, không checkpoint)
- **Files:** 1 tạo mới, 2 sửa

## Accomplishments

- `StockCardRow.runningBalance: number | null`. Mapper viết `row.ton_luy_ke === null ? null : Number(row.ton_luy_ke)` kèm comment giải thích lý do: kiểu sinh ghi `number`, nhưng RPC trả null ở dòng KiotViet, mà `Number(null)` lại ra 0. 14 trường cũ giữ nguyên, diff của `types.ts` chỉ có dòng thêm (+6/-0).
- Cột "Tồn lũy kế" (width 120, căn phải) nằm sau cột giá vốn có điều kiện và ngay trước cột "Bút toán đảo". Giá trị null hiện `<span className="text-gray-400">—</span>`, còn lại đi qua `formatNumber`.
- Cột "Số phiếu" có link `${DOC_TYPE_TO_ROUTE[row.docType]}/${row.documentId}` khi cả hai giá trị đều có. Dòng KiotViet có `documentId` null nên hiện chữ thường, không link. Dòng DIEU_CHINH/KIEM_KE/CHUYEN_KHO cũng hiện chữ thường vì chưa có route.
- Mảng cột chuyển sang `buildStockCardColumns({ canViewCost })`. Nhánh `canViewCost` (T-05-31) được chép nguyên. Props của `StockCard` không đổi, `product-detail.tsx` và `danh-muc/[id]/page.tsx` không nằm trong diff.

## Task Commits

1. **Task 1: types.ts nhận cột ton_luy_ke**: `fa889e9` (feat)
2. **Task 2: stock-card.tsx thêm cột Tồn lũy kế, link số phiếu, tách cột**: `94b1bff` (feat), commit mang đúng tên plan đề ra

## Files Created/Modified

- `src/features/products/types.ts`: thêm `runningBalance` vào `StockCardRow` và `toStockCardRow`
- `src/features/products/components/stock-card-columns.tsx` (mới, 125 dòng): `DOC_TYPE_TO_ROUTE`, `SOURCE_LABELS`, `buildStockCardColumns`
- `src/features/products/components/stock-card.tsx` (210 → 99 dòng): gọi `buildStockCardColumns`, thêm dòng chú thích dưới bảng
- `src/features/products/api/product.api.ts`: **không sửa**. `fetchStockCard` gọi RPC, không liệt kê cột, và vẫn biên dịch với kiểu mới đúng như plan dự đoán.

## Đối chiếu DOC_TYPE_TO_ROUTE với route thật

`ls "src/app/(app)"` → `cai-dat danh-muc dat-hang doi-tac khong-du-quyen nhap-kho tra-hang xuat-kho`

| loai_ct | Route | Trang thật | Component nạp chứng từ |
|---|---|---|---|
| NHAP | `/nhap-kho` | `src/app/(app)/nhap-kho/[id]/page.tsx` ✓ | `ReceiptDetailView` → `fetchDocumentDetail(id)` |
| XUAT | `/xuat-kho` | `src/app/(app)/xuat-kho/[id]/page.tsx` ✓ | `IssueDetailView` → `fetchDocumentDetail(id)` |
| TRA_KHACH | `/tra-hang` | `src/app/(app)/tra-hang/[id]/page.tsx` ✓ | `ReturnDetailView` (xử lý cả hai chiều trả) |
| TRA_NCC | `/tra-hang` | như trên ✓ | như trên |
| CHUYEN_KHO, KIEM_KE, DIEU_CHINH | — | chưa có | chỉ ghi trong comment, không đưa vào map |

Script kiểm: với mỗi giá trị trong map, kiểm `[ -f "src/app/(app)$r/[id]/page.tsx" ]`. Kết quả là 3/3 OK.

## Verification

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit` (Task 1) | exit 0 |
| `npm run check` trước mỗi commit | exit 0 cả hai lần |
| `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` |
| `grep -n runningBalance types.ts` | đúng 2 dòng (khai kiểu dòng 69, map dòng 230) |
| `Number(row.ton_luy_ke)` | chỉ nằm sau `row.ton_luy_ke === null ? null :` |
| `git diff --stat 6a624f3 HEAD` | 3 file: `types.ts`, `stock-card.tsx`, `stock-card-columns.tsx` |
| `product-detail.tsx`, `danh-muc/[id]/page.tsx` trong diff | không có |
| `npx prettier --check` hai file component | sạch |
| `any` / `@ts-ignore` / `console.log` trên ba file | không có |
| Prop antd v6 đã bỏ (bẫy 11) | không dùng. Chỉ có `Table`/`Tag`/`Select`/`Alert title` sẵn có |

## Decisions Made

Xem `key-decisions` ở frontmatter.

## Deviations from Plan

**1. [Theo thực tế repo] `DOC_TYPE_TO_ROUTE` có 4 loại, không phải 1**
- **Found during:** Task 2
- **Issue:** Plan viết "hôm nay mới có `nhap-kho`", nhưng giao diện Phase 4 đã có thêm `xuat-kho/[id]` và `tra-hang/[id]`. Quy tắc chính của plan là "chỉ đưa vào map những loại đã có route THẬT, chạy `ls` để biết".
- **Fix:** Làm theo quy tắc chứ không theo con số dự đoán. Đưa vào map NHAP, XUAT, TRA_KHACH, TRA_NCC, sau khi xác nhận từng trang `[id]` tồn tại và component của nó nạp đúng loại chứng từ đó.
- **Commit:** `94b1bff`

**2. [Điều khoản dự phòng của plan] Tách cột ra `stock-card-columns.tsx`**
- **Found during:** Task 2
- **Issue:** `stock-card.tsx` lên 210 dòng sau khi thêm, vượt ngưỡng ~200 mà plan và CLAUDE.md bước 6 đặt ra.
- **Fix:** Chuyển mảng cột cùng `DOC_TYPE_TO_ROUTE` và `SOURCE_LABELS` sang file mới, theo khuôn `buildXColumns` đã dùng ở ba feature khác. Hệ quả: key_link `DOC_TYPE_TO_ROUTE` giờ nằm ở `stock-card-columns.tsx`, không còn ở `stock-card.tsx`. `stock-card.tsx` vẫn chứa chuỗi "Tồn lũy kế" (trong dòng chú thích) và import cột từ file mới.
- **Files:** `src/features/products/components/stock-card-columns.tsx` (mới)
- **Commit:** `94b1bff`

**3. [Nhỏ] `scroll.x` 1000 → 1120**
- Bảng có thêm một cột 120px. Nếu giữ `scroll.x` cũ thì trên máy tính cột "Đối tác / Ghi chú" (ellipsis, không có width) bị ép hẹp hơn trước. Chỉ đổi prop này của `Table`, không đổi cột nào khác.

**Tổng:** 2 lệch theo thực tế repo hoặc theo điều khoản của plan, 1 chỉnh nhỏ. Không có file nào ngoài phạm vi plan cho phép (3 file + file tách cột).

## Issues Encountered

- Bản làm việc checkout với `core.autocrlf=true`, nên `prettier --check` báo mọi file đã checkout là lệch chỉ vì CRLF. Đã so với nội dung trong git (LF): `types.ts` chỉ khác EOL, còn `stock-card.tsx` có đúng một chỗ xuống dòng của đoạn chú thích. Đã chạy `prettier --write` trên file component trước khi commit.
- Quan sát, không sửa: `StockCardRow.documentId` gõ `string`, nhưng RPC trả null ở dòng KiotViet vì kiểu sinh không biết cột nullable. Link đã kiểm `row.documentId &&` lúc chạy nên không lỗi. Không đổi kiểu vì plan yêu cầu 14 trường cũ giữ nguyên.

## Deferred

- **Chưa kiểm bằng trình duyệt và console.** Phiên này không mở được trình duyệt và không đăng nhập được. Mọi bước `<human-check>` của Task 2 dồn sang UAT 05-11:
  - cột "Tồn lũy kế" hiện số ở dòng hệ thống, hiện "—" ở dòng KiotViet;
  - số ở dòng trên cùng (khi xem "Tất cả kho") khớp cột Tổng của mã đó ở `/ton-kho`;
  - bấm số phiếu của dòng NHAP / XUAT / trả hàng mở đúng phiếu;
  - console không có cảnh báo antd.
- Không cần database: không `db:*`, không pgTAP. Tầng RPC `ton_luy_ke` đã được pgTAP 33 phủ ở 05-05.

## User Setup Required

Không.

## Next Phase Readiness

- UAT 05-11 kiểm được tiêu chí 2 của ROADMAP Phase 5 (tồn lũy kế và link chứng từ) ngay trên tab "Thẻ kho".
- Khi Phase 6 hoặc TON-04 dựng trang chi tiết cho KIEM_KE / DIEU_CHINH / CHUYEN_KHO, chỉ cần thêm một dòng vào `DOC_TYPE_TO_ROUTE`. Phiếu nạp tồn tạm của 05-10 là DIEU_CHINH, nên hiện chữ thường cho tới lúc đó.

## Known Stubs

Không có. Lượt quét TODO/FIXME/placeholder trên ba file không ra dòng nào.

## Threat Flags

Không có bề mặt mới ngoài threat model của plan:
- T-05-31: nhánh `canViewCost` chép nguyên sang file cột.
- T-05-32: link chỉ trỏ tới trang tự `requirePermission("view-catalog")`, trang đó kiểm uuid rồi để RLS chặn.
- T-05-33: map chỉ chứa route thật, đã đối chiếu bằng bảng ở trên.
- T-05-SC: không thêm dependency nào.

## Self-Check: PASSED

- FOUND: src/features/products/types.ts
- FOUND: src/features/products/components/stock-card.tsx
- FOUND: src/features/products/components/stock-card-columns.tsx
- FOUND: fa889e9, 94b1bff
