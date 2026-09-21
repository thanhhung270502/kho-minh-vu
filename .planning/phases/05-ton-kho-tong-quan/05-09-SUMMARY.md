---
phase: 05-ton-kho-tong-quan
plan: 09
subsystem: frontend-ui
tags: [typescript, antd, tanstack-query, next-app-router, inventory, reorder-level]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 06)
    provides: "features/inventory: ReorderSuggestion, SUGGESTION_BASES/LABELS, useReorderSuggestions(basis, page, enabled), useApplyReorderLevels, REORDER_SUGGESTION_PAGE_SIZE (200)"
  - phase: 05-ton-kho-tong-quan (plan 03/05)
    provides: "RPC de_xuat_dinh_muc + dat_dinh_muc trên cloud (0060): căn cứ theo_ma / trung_binh_nhom / khong_du_lieu, ghi chỉ quan_ly + van_phong (42501), tối đa 1000 id (23514)"
provides:
  - "src/app/(app)/ton-kho/dinh-muc/page.tsx — route /ton-kho/dinh-muc (Server Component, requirePermission edit-catalog, PageHeader, Suspense)"
  - "src/features/inventory/components/reorder-level-table.tsx — ReorderLevelTable: lọc nguồn (Segmented), bảng chọn dòng qua nhiều trang, nút duyệt có xác nhận"
  - "src/features/inventory/components/reorder-level-columns.tsx — REORDER_LEVEL_COLUMNS + REORDER_LEVEL_TABLE_WIDTH, cột Căn cứ (Tag màu theo độ tin cậy + số)"
  - "src/features/inventory/components/reorder-data-warning.tsx — ReorderDataWarning({ dataDays }) + ARCHIVE_SNAPSHOT (số đo lưu trữ 20/09)"
affects: [05-11 (menu, ma trận quyền route cho /ton-kho/dinh-muc, UAT màn duyệt), Phase 6 (chạy lại đề xuất khi có lịch sử riêng)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Duyệt hàng loạt có phân trang server: nút duyệt chỉ phủ các trang ĐÃ MỞ (viewedPages theo số trang), không bao giờ duyệt mù trang chưa xem; lựa chọn giữ bằng Map<id, boolean> các dòng người duyệt tự đổi khác mặc định"
    - "Ghi nhận trang đã xem bằng cách chỉnh state trong lúc render (khuôn stock-toolbar), bỏ qua dữ liệu giữ chỗ isPlaceholderData của trang trước"
    - "Số đo tĩnh (ngày, độ phủ) chỉ in ra khi số động từ RPC còn khớp số đo — lệch thì thà bỏ câu còn hơn nói sai"

key-files:
  created:
    - src/app/(app)/ton-kho/dinh-muc/page.tsx
    - src/features/inventory/components/reorder-level-table.tsx
    - src/features/inventory/components/reorder-level-columns.tsx
    - src/features/inventory/components/reorder-data-warning.tsx
  modified: []

key-decisions:
  - "Nút duyệt chỉ phủ các trang người duyệt đã mở từ lần duyệt / đổi nguồn gần nhất — trang chưa mở không bị duyệt; mặc định chọn hết trên trang đã mở trừ khong_du_lieu"
  - "khong_du_lieu không chọn sẵn: màn chỉ lấy mã có đề xuất KHÁC định mức đang đặt, nên dòng loại này chỉ hiện khi mã đang có định mức và đề xuất 0 — duyệt là xóa định mức về 0"
  - "Cảnh báo dữ liệu lấy so_ngay_du_lieu thật từ dòng đầu; kỳ 03/09 → 12/09/2026 và độ phủ 1.223/3.266 là số đo 20/09 gõ cứng (RPC không trả), chỉ in khi so_ngay_du_lieu còn bằng 10"
  - "Nút duyệt còn disabled khi bảng đang tải lại (suggestions.isFetching) — sau khi duyệt, trang 1 cũ còn hiện tới lúc refetch về, bấm lúc đó là duyệt trên số cũ"
  - "Thêm link 'Xem mã dưới định mức' → /ton-kho?ton=duoi_dinh_muc cạnh nút duyệt để nối trọn vòng TQAN-02"
  - "Bộ lọc nguồn và trang để ở useState, không lên URL — lựa chọn duyệt vốn mất khi tải lại, giữ nguồn trên URL không cứu được gì"

patterns-established:
  - "Màn 'hệ đề xuất — người duyệt' có phân trang: page mỏng → ReorderLevelTable điều phối → columns / warning tách file"

requirements-completed: []

# Metrics
duration: ~10min
completed: 2026-09-21
---

# Phase 5 Plan 9: Màn duyệt đề xuất định mức `/ton-kho/dinh-muc` Summary

**Route `/ton-kho/dinh-muc` cho quản lý và văn phòng duyệt định mức tồn tối thiểu do hệ đề xuất. Trên cùng là cảnh báo chất lượng dữ liệu bằng số: lịch sử chỉ 10 ngày, chỉ chạm 1.223/3.266 mã. Mỗi dòng có cột Căn cứ, gồm `Tag` màu theo độ tin cậy và số ngày, số lần bán, lượng đã bán. Định mức chỉ đổi khi người duyệt bấm "Duyệt N mã" và xác nhận.**

## Performance

- **Duration:** ~10 min (11:40 → 11:49 UTC)
- **Completed:** 2026-09-21
- **Tasks:** 2/2 (autonomous, không checkpoint)
- **Files:** 4 tạo mới, 0 sửa

## Accomplishments

- **Cảnh báo dữ liệu** (`reorder-data-warning.tsx`, 56 dòng): `<Alert type="warning" showIcon title=…>`, dùng prop `title` của antd v6, không dùng `message`. Tiêu đề lấy `so_ngay_du_lieu` thật từ dòng đầu kết quả. Chưa có dòng nào thì mới rơi về số đo 10. Phần mô tả có ba ý:
  - Kỳ lưu trữ và độ phủ 1.223 trong 3.266 mã. Mã chưa từng bán thì mượn trung bình nhóm.
  - Một đơn lớn bất thường đủ thổi định mức lên gấp đôi.
  - Nên chạy lại sau vài tháng.
- **Cột** (`reorder-level-columns.tsx`, 87 dòng): Mã hàng (cố định trái), Tên hàng (ellipsis), Nhóm, Định mức hiện tại (0 hiện "—" giống màn tồn kho), Đề xuất (in đậm), Căn cứ. Căn cứ dùng `SUGGESTION_BASIS_LABELS` trong `Tag` với màu `green` / `gold` / `default`. Dòng chữ nhỏ bên dưới ghi:
  - `theo_ma`: `{dataDays} ngày · {saleCount} lần bán · đã bán {totalSold}`
  - `trung_binh_nhom`: `trung bình của {peersWithHistory} mã cùng nhóm`
  - `khong_du_lieu`: `nhóm chưa có mã nào từng bán`
- **Bảng** (`reorder-level-table.tsx`, 215 dòng, riêng thân component ~155 dòng):
  - `Segmented` lọc nguồn (Tất cả + ba nguồn), đẩy vào `useReorderSuggestions(basis, page, true)`.
  - Bọc `QueryState` đủ bốn trạng thái. Có hai câu rỗng: một khi xem tất cả, một khi lọc một nguồn (gợi ý chọn "Tất cả").
  - Phân trang server theo `result.total`, 200 dòng một trang. `rowSelection` truyền mọi id đã chọn trên các trang đã mở, kèm `preserveSelectedRowKeys: true`.
  - Trang cuối cạn (người khác vừa duyệt) thì tự về trang 1.
- **Nút duyệt:** nhãn là `Duyệt {N} mã`. Bấm thì mở `modal.confirm`, nói rõ định mức được ghi thẳng vào danh mục, mỗi mã có một dòng nhật ký sửa, và con số do máy chủ tính lại. Nút `disabled` khi 0 mã, khi mutation đang chạy hoặc khi bảng đang tải lại. `loading` khi mutation đang chạy. Nút OK của confirm cũng tự loading vì `onOk` trả promise.
  - Thành công: `message.success` hiện số dòng thật RPC trả về. Nếu ít hơn số đã chọn thì nói rõ phần còn lại vừa ngừng kinh doanh. Sau đó xóa lựa chọn, về trang 1, và `invalidateQueries` của hook làm mới.
  - Thất bại: `errorCode(error) === "42501"` hiện thông điệp về quyền, kể cả trường hợp vai trò vừa đổi thì tải lại trang (Bẫy 6). `"23514"` hiện nguyên văn message của RPC, ví dụ "Tối đa 1000 mã mỗi lần", và báo lựa chọn vẫn giữ nguyên. Các lỗi còn lại đi qua `explainError`.
- **Route** (`ton-kho/dinh-muc/page.tsx`): Server Component, không `"use client"`, không import antd. Gọi `requirePermission("edit-catalog")`, `metadata.title = "Duyệt định mức tồn"`, `PageHeader` và `<Suspense fallback={null}>`.
- **Chặn truy cập:** `src/proxy.ts` đẩy người chưa đăng nhập về `/dang-nhap?tiep_tuc=%2Fton-kho%2Fdinh-muc`, vì route không nằm trong `PUBLIC_PATHS`. Tiếp theo là `getCurrentUser()` ở layout. Cuối cùng `requirePermission` đẩy thủ kho và chỉ xem sang `/khong-du-quyen`. Ba lớp này giống `/ton-kho`. Mới kiểm bằng đọc code.

## Task Commits

1. **Task 1: reorder-level-table.tsx (+ columns, warning)**: `293e5c6` (feat) `feat(dinh-muc): bang duyet de xuat dinh muc kem can cu`
2. **Task 2: route /ton-kho/dinh-muc**: `ea80d00` (feat) `feat(dinh-muc): man duyet de xuat dinh muc ton toi thieu`, đúng tên plan yêu cầu

## Files Created/Modified

- `src/app/(app)/ton-kho/dinh-muc/page.tsx`: route, quyền, header, Suspense
- `src/features/inventory/components/reorder-level-table.tsx`: điều phối nguồn / trang / lựa chọn / duyệt
- `src/features/inventory/components/reorder-level-columns.tsx`: cột, cột Căn cứ
- `src/features/inventory/components/reorder-data-warning.tsx`: cảnh báo chất lượng dữ liệu

Lớp dữ liệu 05-06 dùng nguyên, không sửa dòng nào. `useVisibleWarehouses` / `fetchAssignedWarehouseIds` của `2222851` cũng giữ nguyên.

## Verification

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit` + `npx eslint` trên file mới (verify của Task 1) | exit 0 |
| `npm run check` (typecheck → lint → build) | xanh trước cả hai commit; build liệt kê `ƒ /ton-kho/dinh-muc` |
| `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` |
| `npx prettier --check` trên 4 file mới | sạch |
| `<Alert` có `title=`, không có `message=` | có, ở `reorder-data-warning.tsx:28-32` (xem lệch #1) |
| `SUGGESTION_BASIS_LABELS` | `reorder-level-table.tsx` (Segmented, câu rỗng) + `reorder-level-columns.tsx` (Tag) |
| `dataDays`, `saleCount` hiện ra | `reorder-level-columns.tsx:27`; `dataDays` còn ở cảnh báo |
| `preserveSelectedRowKeys` | `reorder-level-table.tsx:198` |
| `explainError`, `errorCode` | có; `instanceof PostgrestError` không có |
| Chuỗi "Có lỗi xảy ra" | không có |
| `page.tsx`: `"use client"` / import `antd` | không có |
| `page.tsx`: `requirePermission("edit-catalog")` | có, dòng 13 |
| key_link `useApplyReorderLevels` | có, `reorder-level-table.tsx` |
| `grep gia_von\|giaVon\|costPrice` trên component mới | không có (T-05-37) |
| Số dòng | 215 / 87 / 56 / 27 |

**Kiểm trên trình duyệt: CHƯA LÀM.** Plan và acceptance của Task 2 yêu cầu SUMMARY ghi ba thứ, và cả ba đều chưa có:

- **Nội dung console sau khi mở trang:** chưa mở trang, không có nội dung để ghi. Chưa được coi là "console sạch".
- **Số mã đã duyệt thử:** 0. Chưa gọi `dat_dinh_muc` lần nào từ giao diện, nên database thật không bị ghi.
- **Kết quả với `thukho1`:** chưa kiểm. Đọc code thì `requirePermission("edit-catalog")` sẽ đẩy sang `/khong-du-quyen`.

Lý do: phiên này không có trình duyệt, không đăng nhập được, và không truy cập database. Toàn bộ `<human-check>` của Task 2 dồn sang UAT 05-11:
- Mở bằng `quanly` / `vanphong`, xem console có cảnh báo antd không.
- Cảnh báo 10 ngày hiện trên cùng, cột Căn cứ có số.
- Duyệt vài mã rồi mở `/ton-kho?ton=duoi_dinh_muc`.
- `thukho1` / `chixem` gõ thẳng URL.

## Decisions Made

Xem `key-decisions` ở frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [CLAUDE.md ~200 dòng] Tách thêm `reorder-data-warning.tsx`, file này nằm ngoài `files_modified`**
- **Found during:** Task 1
- **Issue:** Tách cột ra `reorder-level-columns.tsx` theo điều khoản của plan rồi mà `reorder-level-table.tsx` vẫn 256 dòng.
- **Fix:** Khối cảnh báo dữ liệu và `ARCHIVE_SNAPSHOT` chuyển sang `reorder-data-warning.tsx` (56 dòng). Bảng còn 215 dòng, riêng thân component ~155.
- **Hệ quả acceptance:** "`reorder-level-table.tsx` chứa `<Alert` với prop `title`" nay khớp ở `reorder-data-warning.tsx`. Bảng vẫn là nơi truyền `dataDays` thật vào. Tiền lệ giống lệch #2 của 05-07.
- **Commit:** `293e5c6`

**2. Tách `reorder-level-columns.tsx` theo điều khoản dự phòng của plan**
- Plan cho phép tách khi file vượt ~200 dòng. `saleCount` và `SUGGESTION_BASIS_LABELS[row.basis]` trong `Tag` vì thế nằm ở file cột.

**3. Lựa chọn giữ bằng `Map<id, boolean>` thay cho `Set` các dòng bỏ chọn**
- Plan bảo chép khuôn `Set` bỏ chọn của `stage-suggestions.tsx`. Ở màn này có hai khác biệt: mặc định chọn khác nhau theo từng dòng (`khong_du_lieu` không chọn), và dòng nạp dần theo trang. Map các dòng người duyệt tự đổi khác mặc định diễn đạt đúng việc này bằng một state. Ngữ nghĩa vẫn như analog: mặc định chọn hết, trừ loại đáng ngờ.

**4. [Rule 2 - Đúng đắn] Nút duyệt chỉ phủ các trang đã mở, và còn disabled khi bảng đang tải lại**
- Plan không nói lựa chọn trải bao xa khi phân trang server. Nếu "chọn hết" hiểu là mọi dòng ở mọi trang thì người duyệt sẽ ghi cả nghìn mã chưa từng nhìn thấy. Điều đó ngược với D-04 ("hệ đề xuất — người duyệt"). Vì vậy nút chỉ phủ các trang đã mở, và câu hướng dẫn dưới thanh công cụ nói rõ điều này.
- Sau khi duyệt, trang 1 cũ còn hiện tới lúc refetch về. Nút bị khóa trong khoảng đó để không duyệt trên số cũ.

**5. Thêm link "Xem mã dưới định mức"** trỏ tới `/ton-kho?ton=duoi_dinh_muc`, nằm cạnh nút duyệt. Plan không yêu cầu. Link này nối vòng TQAN-02 mà human-check mô tả. Không thêm route mới.

**Tổng:** 1 file ngoài `files_modified` (`reorder-data-warning.tsx`, tách theo CLAUDE.md), 1 lần tách plan đã cho phép, 3 điều chỉnh nhỏ. Không sửa file nào có sẵn. Không đụng `navigation.ts`, `nav-icons.tsx`, `test-route-permissions.ts`.

## Issues Encountered

Không có. `npm run check` xanh ngay lần đầu ở cả hai task.

## Deferred / cần để ý ở UAT 05-11

- **Toàn bộ kiểm trên trình duyệt** (xem mục Verification): console, cảnh báo, cột Căn cứ, duyệt thử rồi mở `/ton-kho?ton=duoi_dinh_muc`, chặn với `thukho1` / `chixem`.
- **Ma trận quyền route:** `scripts/test-route-permissions.ts` phải thêm dòng `/ton-kho/dinh-muc`, cho phép `quan_ly` và `van_phong`, chặn `thu_kho` và `chi_xem` (Bẫy 12). Plan 05-11 sở hữu file đó.
- **Menu:** `navigation.ts` / `nav-icons.tsx` chưa có mục cho màn này. 05-11 lo phần này. Hiện muốn vào thì phải gõ URL.
- **`ARCHIVE_SNAPSHOT` là số gõ cứng**: kỳ 03/09 → 12/09/2026 và 1.223/3.266. Nếu nạp thêm lưu trữ mà `so_ngay_du_lieu` vẫn bằng 10 (trường hợp hiếm) thì câu độ phủ có thể cũ. Muốn chính xác thì RPC phải trả thêm ngày đầu/cuối và số mã có lịch sử. Việc này để đợt sau, khi chạy lại đề xuất trên lịch sử của hệ mới.
- **REQUIREMENTS.md chưa tick TQAN-02**: yêu cầu này còn chờ UAT 05-11 nối trọn vòng trên dữ liệu thật.

## User Setup Required

Không.

## Known Stubs

Không có. Lượt quét TODO / FIXME / placeholder / coming soon trên bốn file mới không khớp dòng nào. `ARCHIVE_SNAPSHOT` là số đo có nguồn (05-CONTEXT §Specific Ideas), có comment nói chỗ sửa. Đó không phải dữ liệu giả chảy vào bảng.

## Threat Flags

Không có bề mặt mới ngoài threat model của plan:
- **T-05-34** (gõ URL vượt quyền): `requirePermission("edit-catalog")`, chặn thật lần hai ở `dat_dinh_muc` (42501). Ma trận HTTP để 05-11.
- **T-05-35** (bấm duyệt nhiều lần): nút `disabled` + `loading`, OK của confirm cũng loading. RPC tính lại nên lần hai là no-op.
- **T-05-36** (không rõ ai duyệt): RPC ghi `nhat_ky_sua` nguồn `dinh_muc`. Màn hiện căn cứ trước khi duyệt, và confirm nhắc có ghi nhật ký.
- **T-05-37** (rò giá vốn): `ReorderSuggestion` không có giá vốn, grep sạch.
- **T-05-SC:** không thêm dependency.

## Self-Check: PASSED

- FOUND: src/app/(app)/ton-kho/dinh-muc/page.tsx
- FOUND: src/features/inventory/components/reorder-level-table.tsx
- FOUND: src/features/inventory/components/reorder-level-columns.tsx
- FOUND: src/features/inventory/components/reorder-data-warning.tsx
- FOUND: 293e5c6, ea80d00
