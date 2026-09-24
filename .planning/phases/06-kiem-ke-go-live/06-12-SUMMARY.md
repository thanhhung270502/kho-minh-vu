---
phase: 06-kiem-ke-go-live
plan: 12
subsystem: frontend-ui
tags: [stocktake, antd, tanstack-query, approval-flow]
requires:
  - phase: 06-kiem-ke-go-live
    plan: 9
    provides: "src/features/stocktake/ lop du lieu (hooks, api, schema, types, lib), isLargeDiscrepancy/LARGE_DISCREPANCY_THRESHOLD"
provides:
  - "DiscrepancyTable — bang lech, to noi lech lon, tra ve/bo yeu cau dem lai (KKE-03)"
  - "UncountedPanel — danh sach ma chua dem truoc nut duyet, mac dinh chap nhan 0 (DLIEU-06)"
  - "ApproveSessionButton — nut duyet theo cong tac canApprove, hop xac nhan hau qua (KKE-04)"
affects: [06-15, 06-16]
tech-stack:
  added: []
  patterns:
    - "Bang lech chi hien dong da dem (lineId !== null); danh sach chua dem tach rieng thanh panel khac, khong gop chung mot bang"
    - "UncountedPanel luu Set<string> cac MA BI BO CHON (doi lap voi mac dinh chon tat ca) — khuon overrides cua reorder-level-table.tsx, dao nguoc chieu vi mac dinh la 'chon het'"
key-files:
  created:
    - src/features/stocktake/components/discrepancy-table.tsx
    - src/features/stocktake/components/discrepancy-columns.tsx
    - src/features/stocktake/components/uncounted-panel.tsx
    - src/features/stocktake/components/approve-session-button.tsx
  modified: []
key-decisions:
  - "discrepancy-columns.tsx tach rieng khoi discrepancy-table.tsx (nhu count-desk-columns.tsx cua 06-11) de ca hai file duoi 200 dong — khong nam trong files_modified goc cua plan nhung dung khuon CLAUDE.md Buoc 6"
  - "ApproveSessionButton dat o cuoi UncountedPanel (khong phai component doc lap ngang hang) vi acceptZeroProductIds va blockers phai tinh tu du lieu cua UncountedPanel — trang chi tiet (06-15) chi can render <UncountedPanel .../>, khong phai ghep hai component rieng"
patterns-established:
  - "Nut duyet/ghi so voi hop xac nhan tom tat hau qua + phan biet loi 42501 (thieu quyen) / 23514 (rang buoc nghiep vu, hien nguyen van cau database) — khuon lap lai tu post-document-button.tsx, ap dung cho moi nut 'ghi so cuoi cung' cua Phase 6"
requirements-completed: [KKE-03, KKE-04, DLIEU-06]
duration: ~20min
completed: 2026-09-24
---

# Phase 6 Plan 12: Bảng lệch + danh sách chưa đếm + nút duyệt — Summary

**`DiscrepancyTable` (bảng lệch tô nổi + bộ lọc 4 trạng thái + trả về đếm lại) và `UncountedPanel` (danh sách mã chưa đếm, mặc định chấp nhận 0, bỏ chọn = trả về đếm bù) ghép `ApproveSessionButton` (hộp xác nhận hậu quả, disable theo công tắc `canApprove`) — cả ba component chỉ chờ 06-15 ghép vào trang chi tiết `/kiem-ke/[id]`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files modified:** 4 (tất cả file mới)

## Accomplishments

- Bảng lệch chỉ hiện dòng đã đếm, tô nền đỏ nhạt dòng lệch lớn (`isLargeDiscrepancy`), cột "Tồn
  KiotViet tạm" chỉ hiện khi có ít nhất một dòng mang giá trị đó, nút "Trả về đếm lại"/"Bỏ yêu
  cầu" không chặn gì theo mức lệch (D-16).
- Danh sách chưa đếm hiện trước nút duyệt, mặc định chọn (chấp nhận 0) toàn bộ mã chưa đếm; bỏ
  chọn một mã đổi nó sang "chờ đếm bù" và chặn nút duyệt bằng Tooltip liệt kê lý do (D-07).
- Nút duyệt disable khi thiếu quyền `canApprove` hoặc còn blocker (mã chờ đếm bù/dòng chờ đếm
  lại), hộp `Modal.confirm` tóm tắt số mã chấp nhận 0 và hậu quả ghi sổ trước khi gọi
  `useApproveSession`, phân biệt lỗi `42501`/`23514` đúng khuôn `post-document-button.tsx`.

## Task Commits

1. **Task 1: Bảng lệch với tô nổi và trả về đếm lại** - `e62bd47` (feat)
2. **Task 2: Danh sách chưa đếm + nút duyệt** - `46eab67` (feat)

**Plan metadata:** (commit này)

## Files Created/Modified

- `src/features/stocktake/components/discrepancy-table.tsx` - Bảng lệch, thống kê tóm tắt, bộ
  lọc 4 trạng thái, `QueryState` bốn trạng thái với `isEmpty` tùy biến (chỉ tính dòng đã đếm).
- `src/features/stocktake/components/discrepancy-columns.tsx` - Cấu hình cột thuần (tách để giữ
  file điều phối dưới 200 dòng, khuôn `count-desk-columns.tsx`).
- `src/features/stocktake/components/uncounted-panel.tsx` - Danh sách mã chưa đếm + `rowSelection`
  (Set mã bị bỏ chọn) + render `ApproveSessionButton` ở cuối.
- `src/features/stocktake/components/approve-session-button.tsx` - Nút duyệt, `Modal.confirm`,
  xử lý lỗi.

## Decisions Made

- `discrepancy-columns.tsx` tách khỏi `discrepancy-table.tsx` ngay từ đầu (không đợi vượt 200
  dòng rồi mới tách) — theo đúng khuôn đã lập ở 06-11 cho bảng đếm văn phòng, tránh phải tái cấu
  trúc sau.
- `ApproveSessionButton` được `UncountedPanel` gọi trực tiếp ở cuối thay vì để 06-15 tự ghép hai
  component song song — `acceptZeroProductIds`/`blockers` là dữ liệu suy ra TỪ danh sách chưa đếm
  (dòng bị bỏ chọn, dòng cần đếm lại), tách hai component ra hai nơi độc lập sẽ buộc trang chi
  tiết phải trùng lặp logic tính toán này.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking] Sửa comment tự vi phạm gate cấm cụm "giá trị lệch/thành tiền/giá vốn/₫/VND"**
- **Found during:** Task 1, chạy gate `grep -ci "giá trị lệch\|thành tiền\|giá vốn\|₫\|VND"`.
- **Issue:** Comment giải thích "Không cột tiền/giá vốn (D-17)" tự chứa chuỗi "giá vốn" mà chính
  gate cấm — lặp lại đúng kiểu lỗi đã gặp ở 06-11 (comment giải thích lý do lại chứa từ khóa bị
  cấm).
- **Fix:** Viết lại câu comment thành "Chỉ hiện số lượng, không quy đổi ra tiền tệ (D-17)", giữ
  nguyên ý nghĩa, không còn khớp regex.
- **Files modified:** `src/features/stocktake/components/discrepancy-table.tsx`.
- **Verification:** `grep -ci` cả hai file = 0 sau khi sửa.
- **Committed in:** `e62bd47` (Task 1 commit, sửa trước khi commit — không có commit riêng).

---

**Total deviations:** 1 auto-fixed (1 blocking — tự vi phạm gate của chính plan)
**Impact on plan:** Không đổi hành vi, chỉ đổi câu chữ comment. Không scope creep.

## Issues Encountered

None.

## User Setup Required

Không có cấu hình dịch vụ ngoài nào. Ba component này CHƯA được ghép vào trang chi tiết
`/kiem-ke/[id]` (việc của 06-15) nên KHÔNG kiểm được bằng cách mở URL ở plan này. UAT (06-16, sau
khi 06-15 ghép xong) cần kiểm bằng mắt:

1. Dòng lệch lớn tô nền đỏ nhạt, `Tag` "Lệch lớn" đỏ + "Chờ đếm lại" cam hiện đúng khi có cả hai.
2. Bộ lọc "Có lệch/Lệch lớn/Chờ đếm lại" trả đúng tập con, "Tất cả" trả về đầy đủ.
3. Cột "Tồn KiotViet tạm" chỉ hiện khi phiên có nạp tồn tạm từ trước (một số phiên đầu kỳ mới
   có, phiên định kỳ thường không).
4. Bấm "Trả về đếm lại"/"Bỏ yêu cầu" không hỏi lý do, không chặn theo mức lệch (D-16).
5. `UncountedPanel`: mặc định mọi mã chưa đếm đều được chọn (tick), bỏ chọn một dòng → nút duyệt
   hiện Tooltip "1 mã chưa đếm đang chờ đếm bù", bấm lại vẫn disable cho tới khi chọn lại hoặc mã
   đó được đếm thật.
6. Bấm "Duyệt phiên" → hộp xác nhận đúng số mã chấp nhận 0 → xác nhận → tồn kho đổi ngay, phiếu
   khóa lại (không sửa được số đếm nữa) — kiểm bằng cách mở lại `/kiem-ke/[id]` sau khi duyệt.
7. Tài khoản không có công tắc `duyet_kiem_ke` (và không phải `quan_ly`) thấy nút duyệt disable
   kèm Tooltip đúng câu "Cần quyền..." — không có cách nào bấm được kể cả khi không còn blocker
   khác.
8. Console sạch cảnh báo antd v6 (bẫy 11 CLAUDE.md).

## Next Phase Readiness

- 06-15 (trang chi tiết `/kiem-ke/[id]`) ghép trực tiếp `<DiscrepancyTable sessionId editable
  canApprove />` và `<UncountedPanel sessionId editable canApprove />` — không cần logic thêm,
  cả hai tự đọc `useCountSheet`/`useApproveSession`/`useSetRecount` từ 06-09.
- `canApprove`/`editable` phải được trang chi tiết tính từ `user.canApproveStocktake` (field mới
  trên `CurrentUser`, xem `06-PATTERNS.md`) và `session.state === "NHAP_LIEU"` — hai plan đó
  (per-user permission field + route) chưa nằm trong phạm vi 06-12.
- Không có blocker.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check

- `src/features/stocktake/components/discrepancy-table.tsx` — FOUND
- `src/features/stocktake/components/discrepancy-columns.tsx` — FOUND
- `src/features/stocktake/components/uncounted-panel.tsx` — FOUND
- `src/features/stocktake/components/approve-session-button.tsx` — FOUND
- commit `e62bd47` (Task 1) — FOUND trong `git log`
- commit `46eab67` (Task 2) — FOUND trong `git log`

## Self-Check: PASSED
