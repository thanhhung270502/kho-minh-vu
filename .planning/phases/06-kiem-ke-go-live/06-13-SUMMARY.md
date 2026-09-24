---
phase: 06-kiem-ke-go-live
plan: 13
subsystem: api
tags: [excel, exceljs, nextjs-route-handler, stocktake, kiem-ke]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    provides: "RPC bang_dem_kiem_ke, danh_sach_phien_kiem_ke, nhap_so_dem_kiem_ke (06-05); lớp dữ liệu stocktake.api.ts + types.ts (06-09)"
provides:
  - "Lib server buildCountTemplate/readCountFile (đọc/ghi file mẫu đếm không lộ số liệu hệ thống, D-08)"
  - "GET /api/kiem-ke/mau-excel — xuất file mẫu đếm theo phiên/nhóm hàng"
  - "POST /api/kiem-ke/nhap-excel — nhận file đã điền, chế độ kiểm tra/nạp qua nhap_so_dem_kiem_ke"
affects: [06-14, 06-16]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Route handler xuất/nhập Excel theo khuôn nap-tam/xuat-excel đã có (runtime nodejs, MAX_FILE_MB, explainError → 401/403/404/409/422/500)"]

key-files:
  created:
    - src/features/stocktake/lib/count-template.server.ts
    - src/features/stocktake/lib/read-count-file.server.ts
    - src/app/api/kiem-ke/mau-excel/route.ts
    - src/app/api/kiem-ke/nhap-excel/route.ts
  modified:
    - scripts/test-excel-reader.ts

key-decisions:
  - "23514 (ràng buộc nghiệp vụ của nhap_so_dem_kiem_ke, ví dụ 'phiên đã duyệt') trả 409 kèm NGUYÊN VĂN câu lỗi database (error.message), không dùng câu chung chung của explainError — theo đúng plan 'trả về 409 với câu database'"
  - "categoryName của file mẫu lấy từ dòng đầu kết quả bang_dem_kiem_ke (ten_nhom) khi có lọc nhóm, không truy vấn thêm bảng nhom_hang — giảm một round-trip"
  - "Đưa hai route vào lớp lỗi 3 bậc: forbidden→403, session-expired→401, invalid-data/not-found (23514 do phiên không hợp lệ)→404 cho GET mau-excel"

requirements-completed: [KKE-02, DLIEU-06]

duration: 55min
completed: 2026-09-24
---

# Phase 06 Plan 13: File mẫu đếm kiểm kê + route nhập/xuất Excel Summary

**Route server xuất file mẫu đếm theo nhóm hàng (4 cột, không lộ số liệu hệ thống) và nhận file đã điền qua `nhap_so_dem_kiem_ke` với chế độ kiểm tra trước / nạp thật.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-24T13:37:00Z (ước tính từ thời điểm khởi tạo môi trường)
- **Completed:** 2026-09-24
- **Tasks:** 2/2
- **Files modified:** 5 (4 tạo mới, 1 sửa)

## Accomplishments
- `buildCountTemplate`/`readCountFile`: xuất và đọc lại file mẫu đếm 4 cột (Mã hàng, Tên hàng, ĐVT, Số đếm) — sheet dữ liệu tên theo nhóm hàng (hoặc "Toàn kho") + sheet "Hướng dẫn"; đọc lại đúng nghĩa D-07 (ô trống = chưa đếm, không phải 0) và hiểu cả định dạng số thập phân Việt Nam.
- Route `GET /api/kiem-ke/mau-excel`: lấy đầu phiên qua `danh_sach_phien_kiem_ke`, dữ liệu mã hàng qua `bang_dem_kiem_ke` (lọc theo `nhom` nếu có), đặt tên file `dem-<so_ct>-<nhóm|toàn-kho>.xlsx`.
- Route `POST /api/kiem-ke/nhap-excel`: đọc file bằng `readCountFile`, chặn `chi_xem` ở tầng route (lớp chặn thứ nhất, RPC tự chặn lần hai), gọi `nhap_so_dem_kiem_ke` với `p_chi_kiem_tra` theo `che_do`.
- 4 case quay vòng mới trong `scripts/test-excel-reader.ts` (đọc lại file mẫu rỗng, điền số nguyên/định dạng VN/để trống, quay vòng 1.200 dòng, thiếu cột báo lỗi tiếng Việt).

## Task Commits

1. **Task 1: Lib file mẫu + reader, kiểm quay vòng** - `7b9b746` (feat)
2. **Task 2: Route GET file mẫu và POST nhập số đếm** - `aeb6812` (feat)

_Không có commit riêng cho SUMMARY/STATE — gộp vào commit metadata cuối cùng của plan này._

## Files Created/Modified
- `src/features/stocktake/lib/count-template.server.ts` - `STOCKTAKE_TEMPLATE_COLUMNS` (4 cột, không cột số liệu hệ thống) + `buildCountTemplate` (sheet dữ liệu + sheet Hướng dẫn)
- `src/features/stocktake/lib/read-count-file.server.ts` - `readCountFile` đọc lại `{ ma_hang, so_dem }[]`, giữ chuỗi khi `so_dem` không phải số để RPC báo đúng lỗi
- `src/app/api/kiem-ke/mau-excel/route.ts` - `GET` xuất file mẫu đếm theo `?phien=&nhom=`
- `src/app/api/kiem-ke/nhap-excel/route.ts` - `POST` nhận file, gọi `nhap_so_dem_kiem_ke`
- `scripts/test-excel-reader.ts` - thêm 4 case quay vòng cho mẫu đếm kiểm kê

## Decisions Made
- **23514 → 409 kèm câu lỗi database nguyên văn** (không qua `explainError` generic) vì plan yêu cầu rõ "trả về 409 với câu database" — người dùng cần đọc đúng lý do nghiệp vụ (ví dụ "Phiên đã duyệt hoặc đã hủy, không nhập số đếm được") thay vì câu chung "Dữ liệu không hợp lệ".
- **Không truy vấn thêm bảng `nhom_hang`** để lấy tên nhóm cho file mẫu — `bang_dem_kiem_ke` đã trả `ten_nhom` trên mọi dòng khi có lọc, lấy từ dòng đầu là đủ và tránh round-trip thừa.
- **Trạng thái phiên không hợp lệ ở `bang_dem_kiem_ke` (23514) ánh xạ về 404** (không phải 400/500) — coi như "không tìm thấy phiên", nhất quán với nhánh `!session` (0 dòng ở `danh_sach_phien_kiem_ke`) đã trả 404 phía trên.

## Deviations from Plan

None - plan executed exactly as written. (Đã thêm helper nội bộ `statusFor`/`slugify` trong `mau-excel/route.ts` — không phải deviation, chỉ là chi tiết triển khai của khuôn `errorResponse` đã có ở `nap-tam`/`xuat-excel`.)

## Issues Encountered

**`data/kiotviet/DanhSachSanPham*.xlsx` không có trong môi trường thực thi này** (file dữ liệu thật, có chủ đích không commit — ghi rõ trong docstring gốc của `test-excel-reader.ts`). Vì vậy `npx tsx scripts/test-excel-reader.ts` đầy đủ KHÔNG chạy hết được ở đây (assertion đầu tiên dừng lại ở bước tìm file KiotViet thật). Đã xác minh 4 case mới bằng script độc lập tạm thời (import đúng hai hàm mới, chạy toàn bộ assertion, xóa ngay sau khi xác nhận `OK`) — tất cả PASS. `npm run typecheck`, `npm run lint`, `npm run build` (qua `npm run check`) đều xanh, và cả hai route đã lên danh sách route của `next build`. Khi chạy trên máy có sẵn `data/kiotviet/DanhSachSanPham*.xlsx`, lệnh `npx tsx scripts/test-excel-reader.ts` đầy đủ (bao gồm cả case Task 13 lẫn case KiotViet thật đã có từ trước) cần được chạy lại để xác nhận không hồi quy.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần thiết.

## Cần mở trình duyệt kiểm tra (không tự động hóa được trong môi trường này)

Theo `<environment_facts>`: không khởi động dev server ở đây; việc dưới đây để lại cho UAT (06-16) hoặc orchestrator:

- `GET /api/kiem-ke/mau-excel?phien=<uuid phiên thật>` khi CHƯA đăng nhập → phải trả 401 kèm `{title, action}`.
- `GET /api/kiem-ke/mau-excel?phien=<uuid phiên thật>` khi đã đăng nhập → tải về file `.xlsx`, mở bằng Excel/LibreOffice kiểm: sheet đầu có đúng 4 cột (Mã hàng, Tên hàng, ĐVT, Số đếm), cột Số đếm trống, sheet 2 "Hướng dẫn" có đủ 4 dòng + 3 dòng đầu phiên.
- `GET /api/kiem-ke/mau-excel?phien=<uuid>&nhom=<uuid nhóm>` → tên file chứa đúng slug tên nhóm không dấu.
- `POST /api/kiem-ke/nhap-excel` với FormData rỗng khi đã đăng nhập vai trò `van_phong` → 400 `"Chưa chọn file"`.
- `POST /api/kiem-ke/nhap-excel` với vai trò `chi_xem` → 403 `"Vai trò chỉ xem không nhập số đếm được"`.
- `POST /api/kiem-ke/nhap-excel` gửi file mẫu vừa xuất, đã điền vài dòng, `che_do` mặc định (kiểm tra) → không ghi gì xuống DB, trả `{ result: { da_nap: false, ... } }`; gửi lại với `che_do=nap` → ghi thật, `bang_dem_kiem_ke` phản ánh đúng `so_dem` vừa nạp.

## Next Phase Readiness
- Hai route đã sẵn sàng cho `06-14` (UI `count-excel-import.tsx` — 3 bước xem trước/nạp, gọi đúng hai route này qua khóa `result` đã giữ nguyên khuôn `nap-tam`).
- `scripts/test-excel-reader.ts` cần chạy lại đầy đủ (kèm file KiotViet thật) trên máy có `data/kiotviet/DanhSachSanPham*.xlsx` trước khi coi plan này là "đã kiểm hết" — xem mục Issues Encountered.
- Không có blocker mới cho 06-14/06-16.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 5 claimed files found on disk; both task commits (`7b9b746`, `aeb6812`) found in git log.
