---
phase: 05-ton-kho-tong-quan
plan: 10
subsystem: frontend-ui
tags: [typescript, antd, tanstack-query, next-app-router, route-handler, exceljs, zod, inventory, provisional-stock]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 04/05)
    provides: "RPC nap_ton_tam(p_du_lieu jsonb, p_kho_mac_dinh uuid, p_chi_kiem_tra boolean) trên cloud (0061) — chỉ quan_ly (42501), xem trước / một chứng từ DIEU_CHINH [NAP_TON_TAM] đã ghi sổ, idempotent"
  - phase: 05-ton-kho-tong-quan (plan 06)
    provides: "features/inventory: inventoryKeys.all để invalidate sau khi nạp"
  - phase: 05-ton-kho-tong-quan (plan 07)
    provides: "/ton-kho đã có link 'Nạp tồn tạm từ KiotViet' tới /ton-kho/nap-tam (canLoadProvisionalStock)"
provides:
  - "src/features/inventory/lib/read-stock-file.server.ts — readStockFile(buf) đọc ma_hang/ton_kho qua readFirstSheet; findDuplicateCodes(rows)"
  - "POST /api/ton-kho/nap-tam — che_do kiem_tra|nap, kho_mac_dinh; 401/403/400/413/422; gọi nap_ton_tam bằng phiên người dùng"
  - "src/features/inventory/api/provisional-stock.api.ts — submitProvisionalStock, ProvisionalStockResult, ProvisionalStockError (zod parse { result })"
  - "src/features/inventory/hooks/useProvisionalStockFlow.ts — luồng ba bước + chặn bấm dồn"
  - "src/features/inventory/components/provisional-stock-preview.tsx + provisional-stock-issues.tsx — màn xem trước ba bước"
  - "Route /ton-kho/nap-tam (requirePermission load-provisional-stock)"
  - "Permission load-provisional-stock = [quan_ly]"
affects: [05-11 (menu, ma trận quyền route phải thêm /ton-kho/nap-tam, UAT nạp thật trước rồi mới soi các màn đọc), Phase 6 (kiểm kê lọc chứng từ ghi_chu like '[NAP_TON_TAM]%')]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route handler upload Excel: guard vai trò → kiểm file/tham số → đọc file ở server → chặn dữ liệu nguy hiểm (mã lặp) → RPC bằng phiên người dùng → { result } nguyên jsonb"
    - "Client parse { result } bằng zod rồi map sang miền trong api/ — sai khóa JSON là lỗi rõ ràng, không lặng lẽ rơi vào nhánh lỗi chung"
    - "Luồng nhiều bước dựa trên upload: reducer + useRef inFlight trong hook riêng, component chỉ giữ JSX"

key-files:
  created:
    - src/features/inventory/lib/read-stock-file.server.ts
    - src/app/api/ton-kho/nap-tam/route.ts
    - src/features/inventory/api/provisional-stock.api.ts
    - src/features/inventory/hooks/useProvisionalStockFlow.ts
    - src/features/inventory/components/provisional-stock-preview.tsx
    - src/features/inventory/components/provisional-stock-issues.tsx
    - src/app/(app)/ton-kho/nap-tam/page.tsx
    - .planning/phases/05-ton-kho-tong-quan/deferred-items.md
  modified:
    - src/shared/lib/permissions.ts
    - src/app/(app)/ton-kho/page.tsx

key-decisions:
  - "Route chặn cả file khi có mã hàng lặp (422, liệt kê tối đa 10 mã) — RPC nap_ton_tam không gộp dòng trùng, nạp cả hai dòng sẽ cộng đôi tồn"
  - "Gọi route + parse zod + mapper đặt ở api/provisional-stock.api.ts theo khuôn excel-import.api.ts, không fetch thẳng trong component như cost-import.tsx — khóa snake_case chỉ sống trong api/"
  - "Đổi kho áp dụng khi đang xem trước thì tự kiểm lại; kiểm hỏng thì quay về bước chọn file — kết quả xem trước luôn khớp kho sẽ gửi khi nạp thật"
  - "Lỗi 42501 từ RPC trả 403 với câu 'Chỉ quản lý nạp được tồn tạm' thay vì câu chung của explainError (vốn nói về kho được phân) — session-expired trả 401, tách khỏi 403"
  - "Không có link mở phiếu DIEU_CHINH ở bước 2 — chưa có route chi tiết cho loại này (DOC_TYPE_TO_ROUTE của 05-08); hiện số phiếu + nói rõ xem trong thẻ kho, kèm link /ton-kho"
  - "/ton-kho đổi canLoadProvisionalStock sang hasPermission(user.role, 'load-provisional-stock') — link và cổng trang dùng chung một quyền"

patterns-established:
  - "Màn upload một lần của quản lý: Alert cảnh báo phạm vi → Steps → Select tham số → Upload.Dragger tự kiểm → Statistic + bảng lý do phân trang → nút ghi thật disabled khi 0"

requirements-completed: []

# Metrics
duration: ~17min
completed: 2026-09-21
---

# Phase 5 Plan 10: Nạp tồn tạm từ file danh mục KiotViet Summary

**Route `/api/ton-kho/nap-tam` đọc hai cột `ma_hang`/`ton_kho` của file danh mục KiotViet ở server rồi gọi `nap_ton_tam` bằng phiên người dùng; màn `/ton-kho/nap-tam` (chỉ quản lý) cho xem trước sẽ nạp / bỏ qua / lỗi kèm lý do trước khi bấm "Nạp thật" tạo đúng một phiếu `DIEU_CHINH` gắn nhãn `[NAP_TON_TAM]`.**

## Performance

- **Duration:** ~17 min (11:53 → 12:10 UTC)
- **Started:** 2026-09-21T11:53:20Z
- **Completed:** 2026-09-21T12:10Z
- **Tasks:** 3/3
- **Files:** 7 tạo mới + 2 sửa (mã nguồn), + `deferred-items.md`

## Accomplishments

- **Đọc file ở server:** `readStockFile` đi qua `readFirstSheet` của `@/shared/lib/excel-cell`
  (giữ cả reader stream lẫn reader dự phòng — Bẫy 7), không import `exceljs` trực tiếp, không
  dùng `readCatalogFile`. Thiếu cột "Mã hàng"/"Tồn kho" → ném câu tiếng Việt nói rõ cần file nào.
  Khóa `ma_hang`/`so_luong` giữ snake_case có comment: hợp đồng jsonb với RPC.
- **Route handler** (`runtime = "nodejs"`): 401 khi hết phiên, 403 khi `user.role !== "quan_ly"`,
  400 file không phải `.xlsx` / kho áp dụng không phải uuid, 413 quá `MAX_FILE_MB`, 422 không đọc
  được / không có dòng nào / **có mã lặp**. Mọi lỗi trả `{ title, action }`. RPC gọi bằng
  `createSupabaseServerClient()` — không dùng secret key; `p_chi_kiem_tra: mode !== "nap"` nên mặc
  định luôn là xem trước. Không có `GET` (không có file mẫu — nguồn là file KiotViet).
- **Màn ba bước:** Alert cảnh báo "SỐ TẠM từ KiotViet, chưa đếm thực tế — kiểm kê sẽ đè lên bằng
  phiếu điều chỉnh, mã đã có chứng từ thật bị bỏ qua"; Select "Kho áp dụng cho mã chưa có kho mặc
  định" (`""` = không chọn, đổi thành `undefined` ở route); Upload.Dragger tự gửi `kiem_tra`; ba
  Statistic (Sẽ nạp / Bỏ qua / Lỗi, dùng `styles.content` của antd v6), tổng số lượng sẽ nạp để
  đối chiếu với KiotViet, hai bảng lý do phân trang 20 dòng; nút "Nạp thật N mã" `loading` khi
  bay, `disabled` khi `dat = 0`, cộng `useRef` chặn bấm dồn trước khi nút kịp vẽ lại. Bước 2 hiện
  số phiếu vừa tạo hoặc "Không tạo chứng từ nào" + `ly_do` của RPC khi chạy lần hai.
- Sau khi nạp thật (và chỉ khi `da_nap = true`): invalidate `inventoryKeys.all` và `["products"]`.
- **Quyền:** `load-provisional-stock = ["quan_ly"]`; `page.tsx` là Server Component không antd,
  `requirePermission("load-provisional-stock")`.

## Task Commits

1. **Task 1: lib đọc file + route handler POST** — `9705302` (feat)
2. **Task 2: màn xem trước ba bước** — `13beced` (feat; kèm prettier cho hai file của Task 1)
3. **Task 3: quyền mới + route /ton-kho/nap-tam** — `12df2fe` (feat)

## Files Created/Modified

- `src/features/inventory/lib/read-stock-file.server.ts` — `readStockFile`, `findDuplicateCodes`, `ProvisionalStockRow`
- `src/app/api/ton-kho/nap-tam/route.ts` — POST, guard quản lý, kiểm file/kho/mã lặp, RPC
- `src/features/inventory/api/provisional-stock.api.ts` — zod schema kết quả RPC, mapper sang miền, `submitProvisionalStock`, `ProvisionalStockError`
- `src/features/inventory/hooks/useProvisionalStockFlow.ts` — reducer ba bước, `selectFile`/`changeWarehouse`/`commit`/`reset`
- `src/features/inventory/components/provisional-stock-preview.tsx` — giao diện (204 dòng)
- `src/features/inventory/components/provisional-stock-issues.tsx` — hai bảng con Lỗi / Bỏ qua
- `src/app/(app)/ton-kho/nap-tam/page.tsx` — route mỏng
- `src/shared/lib/permissions.ts` — thêm `load-provisional-stock` (diff chỉ thêm dòng)
- `src/app/(app)/ton-kho/page.tsx` — link nạp tồn tạm dùng `hasPermission`

## Verification

| Kiểm | Kết quả |
|---|---|
| `npm run check` (typecheck + lint + build) trước mỗi commit | xanh cả 3 lần; build liệt kê `ƒ /api/ton-kho/nap-tam` và `ƒ /ton-kho/nap-tam` |
| `npx tsx scripts/test-pure-functions.ts` | `✓ hàm thuần: tất cả assert đạt` (assertion `hasPermission` cũ không đỏ) |
| `npx tsx scripts/test-excel-reader.ts` | **exit 1** — `Cần data/kiotviet/DanhSachSanPham*.xlsx (dữ liệu thật, không commit)`; file thật không có trong bản làm việc |
| `readStockFile` trên file mẫu `npm run import:sample` (`DanhSachSanPham.xlsx`, có cột "Tồn kho") | 13 dòng (dòng TỔNG CỘNG bị bỏ), đọc đúng số; `findDuplicateCodes` bắt `BD-001` lặp mà file mẫu cố ý cài; dòng thiếu mã ra `ma_hang: null` |
| `readStockFile` trên file thiếu cột "Tồn kho" | ném đúng câu tiếng Việt |
| `readStockFile` trên file exceljs tự ghi 300 dòng (dải 100–1200 dòng làm reader stream hỏng) | đọc đủ 300 dòng, ô text `"1.250"` qua `readNumber` |
| `submitProvisionalStock` với `fetch` giả (xem trước / nạp / chạy lại dat=0 / 403 / sai hình dạng) | map đúng cả năm ca; 403 giữ nguyên `title`; `{ ketQua }` sai khóa → "Máy chủ trả kết quả không đúng dạng" |
| `next start` từ bản build + curl, chưa đăng nhập | `GET /ton-kho/nap-tam` → 307 `/dang-nhap?tiep_tuc=%2Fton-kho%2Fnap-tam`; `POST /api/ton-kho/nap-tam` → 401 (proxy chặn trước route) |
| Grep acceptance | `load-provisional-stock` xuất hiện 2 lần trong `permissions.ts`; không file nào trong `components/`/`hooks/`/`api/` import `read-stock-file`; không "Có lỗi xảy ra"; không `message=` trên Alert; 3 `<Statistic` trong preview |

**Chưa kiểm — dồn sang UAT 05-11 (agent không có trình duyệt, không đăng nhập được):**
- Mở `/ton-kho/nap-tam` bằng `quanly`, đọc console (cảnh báo antd v6) — CHƯA làm.
- Chạy chế độ kiểm trên file KiotViet thật — CHƯA làm, **chưa có ba con số thật** (file
  `DanhSachSanPham_KV…` không có trong `data/kiotviet/`).
- **CHƯA bấm "Nạp thật"**, chưa có chứng từ `DIEU_CHINH` nào được tạo bởi plan này.
- Đăng nhập `vanphong` gõ thẳng `/ton-kho/nap-tam` → `/khong-du-quyen` — chỉ suy từ code
  (`requirePermission` redirect khi `hasPermission` false), chưa chạy thật.

## Decisions Made

Xem `key-decisions` ở frontmatter. Đáng nhắc nhất: **route từ chối cả file khi có mã hàng lặp** —
không có trong plan, nhưng RPC không gộp dòng trùng nên một file sửa tay có mã lặp sẽ cộng đôi tồn
của mã đó vào chứng từ. File KiotViet thật (3.266 dòng = 3.266 mã unique trong `san_pham`) không bị
ảnh hưởng.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] Chặn mã hàng lặp trong file trước khi gọi RPC**
- **Found during:** Task 1
- **Issue:** `nap_ton_tam` đưa mọi dòng hợp lệ vào `v_dat`; cùng một mã xuất hiện hai lần thành hai dòng chứng từ → tồn bị cộng đôi.
- **Fix:** `findDuplicateCodes` trong lib; route trả 422 liệt kê tối đa 10 mã lặp.
- **Files:** `read-stock-file.server.ts`, `route.ts` — **Commit:** `9705302`

**2. [Rule 2 - Correctness] Kiểm `kho_mac_dinh` là uuid ở route; lỗi 42501 và hết phiên map riêng**
- **Found during:** Task 1
- **Issue:** chuỗi không phải uuid làm RPC ném 22P02 → 500 câu kỹ thuật; 42501 qua `explainError` ra câu "chỉ thao tác được trên kho được phân công" — sai lý do; plan chỉ map `forbidden → 403`, mọi thứ khác 500 (gộp cả hết phiên).
- **Fix:** 400 "Kho áp dụng không hợp lệ"; `forbidden` → 403 với câu "Chỉ quản lý nạp được tồn tạm"; `session-expired` → 401.
- **Commit:** `9705302`

**3. [CLAUDE.md] Gọi route + mapper tách ra `api/provisional-stock.api.ts`; luồng tách ra `hooks/useProvisionalStockFlow.ts`** (hai file ngoài `files_modified`)
- **Found during:** Task 2
- **Issue:** plan theo khuôn `cost-import.tsx` (fetch + đọc khóa jsonb snake_case ngay trong component). CLAUDE.md cấm snake_case ngoài `api/`/`types.ts` và yêu cầu lớp gọi dữ liệu tách riêng; chính `cost-import.tsx` đang hỏng vì kiểu đọc khóa thô này (xem Deferred). Sau khi tách API, component vẫn 339 dòng (prettier 80 cột) — vượt ~200.
- **Fix:** api file theo khuôn `excel-import.api.ts` (zod + mapper + lỗi có `title/action` + 401 về đăng nhập với `tiep_tuc`); hook giữ reducer/`run`/chặn bấm dồn; component còn 204 dòng; hai bảng con ở `provisional-stock-issues.tsx` (đúng điều khoản tách của plan).
- **Ảnh hưởng tới acceptance grep:** chuỗi `che_do`, `"kiem_tra"`, `"nap"` nay nằm ở hook/api; trong `provisional-stock-preview.tsx` chỉ còn ở doc comment (nêu rõ hai chế độ và trỏ sang hook). Hai bảng con nằm ở file phụ.
- **Commit:** `13beced`

**4. [Tiện ích nhỏ ngoài plan] Tổng số lượng sẽ nạp trên màn xem trước** — cộng `chi_tiet_dat.so_luong`
  (RPC chỉ trả ở chế độ xem trước) để quản lý đối chiếu với tổng tồn KiotViet trước khi ghi. Hiển thị, không ghi gì. Commit `13beced`.

**5. [Theo gợi ý của điều phối] `/ton-kho/page.tsx` đổi `user.role === "quan_ly"` sang `hasPermission(user.role, "load-provisional-stock")`**
  — một dòng logic, nhưng cần thêm một dòng import (và prettier xuống dòng tham số). Commit `12df2fe`.

**6. [Style] Prettier cho `route.ts` và `read-stock-file.server.ts`** nằm trong commit Task 2 (`13beced`) vì định dạng chạy sau commit Task 1.

---

**Total deviations:** 6 (2 Rule 2, 1 CLAUDE.md, 3 nhỏ/được gợi ý). Không có thay đổi kiến trúc, không cài gói mới, không đụng `navigation.ts` / `nav-icons.tsx` / `scripts/test-route-permissions.ts` / `database.types.ts`.

## Issues Encountered

- Lệnh `python -` trong một bước chỉnh file đụng stub Microsoft Store và treo — đã kill, chuyển sang Edit tool; không để lại thay đổi.
- `node -e` thay chuỗi không khớp vì `permissions.ts` dùng CRLF — dùng Edit tool.

## Deferred / cần để ý ở UAT 05-11

- **Ghi vào `deferred-items.md`: hồi quy có từ commit `9ec9b1f`** — `nhap-excel` và `gia-von-dau-ky`
  trả `{ result }` nhưng `excel-import.api.ts` và `cost-import.tsx` vẫn đọc `ketQua` → nhập danh mục
  Excel và nạp giá vốn đầu kỳ đều báo lỗi dù file đúng. Chỉ đọc code, chưa chạy thật; ngoài phạm vi 05-10.
- `Statistic valueStyle` (deprecated antd v6) ở `cost-import.tsx`, `import-preview.tsx`.
- UAT 05-11 phải: đặt `DanhSachSanPham_KV…xlsx` vào `data/kiotviet/`, chạy
  `npx tsx scripts/test-excel-reader.ts`, mở `/ton-kho/nap-tam` bằng `quanly` → ghi ba con số kiểm +
  console → **nạp thật một lần** → chạy lại cùng file phải ra "Không tạo chứng từ nào" → rồi mới soi
  `/ton-kho`, thẻ kho, `/ton-kho/dinh-muc`. Thêm `/ton-kho/nap-tam` vào ma trận
  `scripts/test-route-permissions.ts` (chỉ quản lý 200, ba vai trò còn lại → `/khong-du-quyen`).
- Mã chưa có `kho_mac_dinh_id` mà không chọn kho áp dụng sẽ vào nhóm Lỗi — người nạp cần chọn kho
  ở Select trước (hoặc sau, màn tự kiểm lại).
- `requirements-completed` để trống: TON-01 vẫn `Pending` trong REQUIREMENTS.md như các plan 05-06..09 —
  chưa đánh dấu cho tới khi UAT 05-11 thấy số tồn thật trên màn.

## User Setup Required

Không có biến môi trường mới.

## Known Stubs

Không có. Chuỗi "Không chọn — mã chưa có kho mặc định sẽ báo lỗi" là lựa chọn thật của Select
(gửi rỗng → RPC dùng kho mặc định của mã), không phải placeholder.

## Threat Flags

Không có bề mặt mới ngoài `<threat_model>` của plan. T-05-38 (403 ở route + 42501 ở RPC), T-05-39
(phiên người dùng, không secret key), T-05-40 (`.xlsx` + `MAX_FILE_MB` trước khi đọc), T-05-41
(RPC bỏ qua mã có `kho_movement`, màn liệt kê trước khi ghi; thêm chặn mã lặp), T-05-42
(`.server.ts` chỉ route import — grep sạch), T-05-43 (bước 2 hiện `so_ct`, nhãn `[NAP_TON_TAM]`),
T-05-SC (không thêm dependency) đều đã áp.

## Self-Check: PASSED

Bảy file mã nguồn mới + `deferred-items.md` có trên đĩa; ba commit `9705302`, `13beced`, `12df2fe` có trong `git log`.
