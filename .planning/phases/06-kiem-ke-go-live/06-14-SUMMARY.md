---
phase: 06-kiem-ke-go-live
plan: 14
subsystem: frontend
tags: [excel, upload-dragger, stocktake, kiem-ke]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    provides: "Route GET /api/kiem-ke/mau-excel + POST /api/kiem-ke/nhap-excel (06-13); lớp dữ liệu stocktake.api.ts/useCountSheet (06-09)"
provides:
  - "count-import.api.ts + useCountImport.ts — luồng chọn file → kiểm tra → nạp gọi hai route 06-13"
  - "CountExcelImport — component 3 khối (tải mẫu theo nhóm, kéo file đã điền, kết quả kiểm/nạp) sẵn sàng ghép vào trang chi tiết"
affects: [06-15, 06-16]

# Tech tracking
tech-stack:
  added: []
  patterns: ["useReducer 3 bước idle/checked/loaded khuôn useProvisionalStockFlow, tách bảng kết quả ra file riêng khuôn provisional-stock-issues.tsx"]

key-files:
  created:
    - src/features/stocktake/api/count-import.api.ts
    - src/features/stocktake/hooks/useCountImport.ts
    - src/features/stocktake/components/count-excel-import.tsx
    - src/features/stocktake/components/count-import-result.tsx
  modified: []

key-decisions:
  - "Zod schema của result coi TẤT CẢ trường chi tiết (chi_tiet_dat/chi_tiet_cap_nhat/chi_tiet_bo_qua/loi/ly_do) là optional — đọc thẳng 0065_kiem_ke_dem.sql xác nhận ba nhánh trả về (kiểm tra, nạp còn lỗi, nạp thành công) không nhánh nào có đủ tất cả khóa"
  - "count-import-result.tsx tách khỏi count-excel-import.tsx (khuôn provisional-stock-issues.tsx) — giữ cả hai file dưới ~200 dòng, không phải deviation vì plan đã dự liệu trước (\"vượt thì tách khối kết quả ra count-import-result.tsx\")"
  - "Bước 'loaded' tự phân nhánh theo result.loaded (không giả định luôn true) — phòng trường hợp hiếm RPC vẫn trả 200 nhưng da_nap=false (dòng lỗi mới phát sinh giữa lúc kiểm và bấm nạp, do người khác sửa danh mục đồng thời)"

requirements-completed: [KKE-02, DLIEU-06]

duration: 40min
completed: 2026-09-24
---

# Phase 06 Plan 14: Nhập số đếm từ Excel (giao diện) Summary

**Component ba khối (tải file mẫu theo nhóm → kéo file đã điền → xem kiểm tra/nạp) gọi hai route Excel của 06-13, khóa nút "Nạp số đếm" khi còn dòng lỗi.**

## Performance

- **Duration:** 40 min
- **Completed:** 2026-09-24
- **Tasks:** 2/2
- **Files modified:** 4 (tất cả tạo mới)

## Accomplishments

- `count-import.api.ts`: kiểu `CountImportResult` (miền tiếng Anh) + mapper từ khóa snake_case của RPC `nhap_so_dem_kiem_ke` (`dat`→`newCount`, `cap_nhat`→`overwriteCount`, `bo_qua`→`skippedCount`, `so_loi`→`errorCount`); `postCountFile()` gửi FormData `phien`/`che_do`, tách 401 (redirect kèm `?tiep_tuc=`) khỏi lỗi khác (`CountImportError` giữ `title`/`action` route đã soạn); `countTemplateUrl()` dựng URL GET file mẫu theo nhóm.
- `useCountImport.ts`: `useReducer` ba bước `idle → checked → loaded`, chặn bấm dồn bằng `useRef`, nạp thành công mới `invalidateQueries` tiền tố `stocktake.sheet` + `stocktake.sessions`.
- `count-excel-import.tsx`: chọn nhóm (rút từ `useCountSheet` đang có, thêm "Toàn phạm vi phiên") + link tải mẫu; `Upload.Dragger` tự gửi chế độ kiểm tra ngay khi chọn file; bốn `Statistic` + bảng lỗi/bỏ qua qua `CountImportResultView`; nút "Nạp số đếm" `disabled` khi `errorCount > 0` kèm `Tooltip`; `!editable` chỉ hiện khối tải mẫu.
- `count-import-result.tsx`: tách khối bốn `Statistic` + hai bảng ra khỏi component chính (khuôn `provisional-stock-issues.tsx`) để cả hai file dưới ~200 dòng.

## Task Commits

1. **Task 1: api gọi route + hook luồng nhập** - `f38b931` (feat)
2. **Task 2: Component nhập số đếm từ Excel** - `1261e0b` (feat)

## Files Created/Modified

- `src/features/stocktake/api/count-import.api.ts` - mapper `CountImportResult`, `postCountFile`, `countTemplateUrl`, `CountImportError`
- `src/features/stocktake/hooks/useCountImport.ts` - `useCountImport(sessionId)` — `check(file)`, `load()`, `reset()`
- `src/features/stocktake/components/count-excel-import.tsx` - ba khối tải mẫu/kéo file/kết quả, `!editable` chỉ hiện khối tải mẫu
- `src/features/stocktake/components/count-import-result.tsx` - `CountImportResultView` — bốn `Statistic` + hai `IssueTable`

## Decisions Made

- **Zod schema mọi trường chi tiết là optional** — đọc trực tiếp `0065_kiem_ke_dem.sql` (dòng 498-539) xác nhận ba nhánh trả về hình dạng khác nhau: kiểm tra (có `chi_tiet_dat`/`chi_tiet_cap_nhat`/`chi_tiet_bo_qua`/`loi`), nạp còn lỗi (chỉ `loi`+`ly_do`), nạp thành công (chỉ `chi_tiet_bo_qua`). Parse cứng nhắc sẽ vỡ ở nhánh nạp thành công.
- **Tách `count-import-result.tsx` ngay từ đầu** thay vì viết hết vào một file rồi tách — plan đã tính trước khả năng vượt 200 dòng, làm luôn cho gọn.
- **Bước "loaded" phân nhánh theo `result.loaded`** thay vì luôn coi là thành công — phòng race condition RPC trả `da_nap=false` dù không ném lỗi HTTP (dòng lỗi mới phát sinh giữa lúc kiểm và lúc bấm nạp).

## Deviations from Plan

None - plan executed exactly as written (kể cả việc tách `count-import-result.tsx` đã được plan dự liệu sẵn).

## Issues Encountered

Không có.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần thiết.

## Cần mở trình duyệt kiểm tra (không tự động hóa được trong môi trường này)

`CountExcelImport` CHƯA được ghép vào trang chi tiết `/kiem-ke/[id]` (việc của 06-15) — UAT thật sự chỉ làm được sau đó. Khi 06-15 ghép xong, cần kiểm bằng mắt (giao cho 06-16):

- Chọn nhóm hàng → bấm "Tải file mẫu nhóm này" → mở file: đúng 4 cột (Mã hàng, Tên hàng, ĐVT, Số đếm), cột Số đếm trống, KHÔNG có cột tồn nào (D-08).
- Điền vài dòng, để trống vài dòng, kéo vào `Upload.Dragger` → tự kiểm ngay (chưa ghi gì) → đúng bốn `Statistic` (Mới/Ghi đè/Bỏ qua/Lỗi).
- File có ít nhất một dòng lỗi (mã sai, số âm) → nút "Nạp số đếm" bị khóa, `Tooltip` hiện đúng câu giải thích.
- Sửa hết lỗi, tải lại file, bấm "Nạp số đếm" → `message.success` hiện, bảng đếm (`count-desk-table`/`count-mobile`) và bảng lệch (`discrepancy-table`) tự cập nhật không cần tải lại trang (kiểm `invalidateQueries`).
- Đăng xuất giữa chừng rồi bấm "Tải file mẫu"/kéo file → về `/dang-nhap?tiep_tuc=<đường dẫn phiên>`.
- Phiên đã duyệt/hủy (`editable=false`) → chỉ thấy khối 1 (tải mẫu), không thấy khối kéo file.

## Next Phase Readiness

- `06-15` (trang chi tiết `/kiem-ke/[id]`) ghép `CountExcelImport` cùng `CountDeskTable`/`CountMobile`/`DiscrepancyTable`/`UncountedPanel`/`ApproveSessionButton` đã có từ các plan trước.
- Không có blocker mới cho 06-15/06-16.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 4 claimed files found on disk; both task commits (`f38b931`, `1261e0b`) found in git log.
