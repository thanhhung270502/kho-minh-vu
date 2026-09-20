---
phase: 04-don-dat-hang-phieu-xuat
plan: 07
subsystem: api
tags: [typescript, zod, tanstack-query, supabase, stock-out, returns]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 05
    provides: "features/documents (fetchDocuments/postDocument/voidDocument/addDocumentLine/...), documentKeys với scope nhap/xuat/tra, readUuid/readDate ở lib/url-filter"
  - phase: 04-don-dat-hang-phieu-xuat plan 04
    provides: "chữ ký RPC tao_phieu_tra(p_goc_id), goi_y_ma_trung(p_san_pham_id, p_kho_id), ghi_de_nghi_gop_ma"
  - phase: 04-don-dat-hang-phieu-xuat plan 06
    provides: "orderKeys của sales-order để usePostIssue invalidate tiến độ đơn"
provides:
  - "Bốn lý do xuất âm (D-11) khai đúng một chỗ ở lib/negative-reasons.ts, MA_BI_TACH đứng đầu"
  - "src/features/stock-out/ mỏng trên documents: IssueRow/IssueDetail/IssueLine chỉ alias, SimilarCode + exceedsStock cho D-12/D-14"
  - "issue.api.ts: createIssue (XUAT-02), saveNegativeReason/clearNegativeReason, postIssue lưu lý do TRƯỚC khi ghi sổ, fetchSimilarCodes/proposeMerge (D-14)"
  - "useIssues.ts: usePostIssue/useVoidIssue làm hết hạn productKeys; usePostIssue làm hết hạn thêm orderKeys (XUAT-05)"
  - "src/features/returns/: createReturn gọi đúng một RPC tao_phieu_tra (XUAT-09, D-15), còn lại dùng chung document.api"
affects: ["04-08", "04-09", "04-10", "04-11", "mọi plan giao diện phiếu xuất/phiếu trả của Phase 4"]

tech-stack:
  added: []
  patterns:
    - "postIssue gọi saveNegativeReason TRƯỚC postDocument — hàm ghi sổ ở tầng database đọc ly_do_xuat_am từ đầu phiếu đã lưu, không nhận qua tham số"
    - "issueKeys/returnKeys dựng trên documentKeys với scope riêng (\"xuat\"/\"tra\"), giống khuôn receiptKeys của stock-in"
    - "exceedsStock đặt trong types.ts (không phải lib/) — theo đúng tiền lệ isFullyShipped của sales-order/types.ts, giữ nhất quán thay vì tạo thêm file lib chỉ cho một hàm"
    - "Comment giải thích hành vi database KHÔNG được chứa nguyên văn chuỗi mà acceptance criteria grep cấm (ghi_so_chung_tu, p_nguon_nhap, \"use client\") — lặp lại đúng bẫy đã ghi ở 04-06-SUMMARY.md, ba lần trong plan này"

key-files:
  created:
    - src/features/stock-out/lib/negative-reasons.ts
    - src/features/stock-out/types.ts
    - src/features/stock-out/schemas/issue.schema.ts
    - src/features/stock-out/api/issue.keys.ts
    - src/features/stock-out/api/issue.api.ts
    - src/features/stock-out/hooks/useIssues.ts
    - src/features/returns/api/return.api.ts
    - src/features/returns/hooks/useReturns.ts
  modified: []

key-decisions:
  - "exceedsStock đặt trong types.ts thay vì một file lib/ riêng — files_modified của plan chỉ liệt kê đúng 8 file (không có lib/exceeds-stock.ts), và sales-order/types.ts đã có tiền lệ isFullyShipped ngay trong types.ts"
  - "returnKeys khai trong return.api.ts (không phải file .keys.ts riêng) — đúng theo đặc tả plan, vì files_modified không liệt kê file keys riêng cho returns"
  - "usePostReturn làm hết hạn documentKeys.all (toàn bộ, không chỉ returnKeys.all) — ghi sổ phiếu trả đổi tồn nên mọi màn danh sách chứng từ (nhập/xuất/trả) đều có thể hiện dữ liệu liên quan đổi"

requirements-completed: [XUAT-01, XUAT-02, XUAT-04, XUAT-05, XUAT-09]

duration: ~35min
completed: 2026-09-20
---

# Phase 4 Plan 07: Lớp dữ liệu phiếu xuất và phiếu trả hàng Summary

**Tám file mỏng trên `features/documents`: bốn lý do xuất âm cố định (D-11), `postIssue` lưu lý do trước khi ghi sổ để tránh lỗi 23514 giả, và `createReturn` gọi đúng một RPC `tao_phieu_tra` — khép hợp đồng dữ liệu cho bốn plan giao diện xuất/trả ở Wave 7–10.**

## Performance

- **Duration:** ~35 phút
- **Tasks:** 2/2
- **Files modified:** 8 (toàn bộ file mới)

## Accomplishments

- `lib/negative-reasons.ts`: `NEGATIVE_REASONS` bốn mã cố định, `MA_BI_TACH` (mã bị tách/xuất nhầm mã) đứng đầu đúng nguyên nhân gốc người dùng chỉ ra; `negativeReasonLabel()` không vỡ khi gặp chuỗi tự do cũ.
- `types.ts`: `IssueRow`/`IssueDetail`/`IssueLine` chỉ alias `DocumentRow`/`DocumentDetail`/`DocumentLine`, không định nghĩa lại; thêm `SimilarCode`/`toSimilarCode` (kiểu trả `goi_y_ma_trung`) và `exceedsStock()` cho tô màu dòng vượt tồn (D-12) và quyết định bắt buộc chọn lý do.
- `schemas/issue.schema.ts`: bộ lọc URL riêng của `/xuat-kho` (`doi_tac` thay vì `ncc`, không có `nguon`/`kho`-nguồn vì XUAT không phân biệt nguồn nhập); `negativeReasonSchema` bắt buộc ghi chú ≥ 5 ký tự khi chọn "Khác"; `newIssueSchema` cho phiếu không cần đơn (XUAT-02).
- `issue.api.ts`: `createIssue` cấp số qua `sinh_so_ct(p_loai: "XUAT")` rồi insert trong cùng hàm; `postIssue` gọi `saveNegativeReason` **trước** `postDocument` — thứ tự đã kiểm bằng script node trong acceptance criteria; `fetchSimilarCodes`/`proposeMerge` bọc `goi_y_ma_trung`/`ghi_de_nghi_gop_ma` cho D-14.
- `hooks/useIssues.ts`: `usePostIssue`/`useVoidIssue` làm hết hạn `productKeys.all` (tồn + giá vốn đổi); riêng `usePostIssue` làm hết hạn thêm `orderKeys.all` vì ghi sổ phiếu xuất gắn đơn cập nhật `so_luong_da_xuat` và có thể tự đóng đơn (XUAT-05).
- `returns/api/return.api.ts`: `createReturn` gọi đúng một RPC `tao_phieu_tra(p_goc_id)`, loại phiếu trả (`TRA_KHACH`/`TRA_NCC`) do RPC tự suy — không truyền loại từ client; mọi thao tác khác (đọc/sửa dòng/ghi sổ/hủy) re-export thẳng từ `document.api`, không viết lại.
- `returns/hooks/useReturns.ts`: `usePostReturn` làm hết hạn cả `productKeys.all` lẫn `documentKeys.all` (toàn bộ danh sách chứng từ, không chỉ nhánh "tra") vì ghi sổ phiếu trả đổi tồn.

## Task Commits

1. **Task 1: Lý do xuất âm, kiểu và bộ lọc URL của màn phiếu xuất** - `f0807a2` (feat)
2. **Task 2: Hàm gọi Supabase và hook cho phiếu xuất và phiếu trả** - `505df58` (feat)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `src/features/stock-out/lib/negative-reasons.ts` - `NEGATIVE_REASONS`, `NEGATIVE_REASON_LABELS`, `negativeReasonLabel()`
- `src/features/stock-out/types.ts` - `IssueRow`/`IssueDetail`/`IssueLine` (alias), `IssuePermissions`, `SimilarCode`/`toSimilarCode`, `exceedsStock()`
- `src/features/stock-out/schemas/issue.schema.ts` - `IssueFilter` + bộ lọc URL, `negativeReasonSchema`, `newIssueSchema`, `toIssueListRpcArgs`
- `src/features/stock-out/api/issue.keys.ts` - `issueKeys` (scope "xuat" trên `documentKeys`, thêm `similar()`)
- `src/features/stock-out/api/issue.api.ts` - Toàn bộ hàm gọi Supabase riêng của chiều xuất
- `src/features/stock-out/hooks/useIssues.ts` - Hook TanStack Query cho phiếu xuất
- `src/features/returns/api/return.api.ts` - `createReturn`, `returnKeys` (scope "tra"), re-export phần dùng chung
- `src/features/returns/hooks/useReturns.ts` - Hook TanStack Query cho phiếu trả

## Danh sách export đầy đủ (để plan 04-08/04-09/04-10/04-11 khỏi đoán)

**`lib/negative-reasons.ts`**
- `NEGATIVE_REASONS: readonly ["MA_BI_TACH", "HANG_VE_CHUA_NHAP", "LECH_TON_CHO_KIEM_KE", "KHAC"]`
- `type NegativeReasonCode = (typeof NEGATIVE_REASONS)[number]`
- `NEGATIVE_REASON_LABELS: Record<NegativeReasonCode, string>`
- `negativeReasonLabel(code: string | null): string | null`

**`types.ts`**
- `type DocStatus` (re-export), `DOC_STATUS_COLORS`, `DOC_STATUS_LABELS`, `toDocumentDetail`, `toDocumentLine`, `toDocumentRow` (re-export nguyên tên, không đổi tên hàm)
- `type IssueRow = DocumentRow`, `type IssueDetail = DocumentDetail`, `type IssueLine = DocumentLine`
- `type IssuePermissions = { canEdit: boolean; canVoid: boolean }`
- `type SimilarCode = { productId, productCode, productName, warehouseId, warehouseName, stock, similarity }`, `toSimilarCode(row): SimilarCode`
- `exceedsStock(line: IssueLine): boolean` — **quyết định: đặt trong `types.ts`, không tách file `lib/` riêng** (xem `key-decisions`)

**`schemas/issue.schema.ts`**
- `type IssueFilter = { q, status, partnerId, warehouseId, fromDate, toDate, page }`, `DEFAULT_ISSUE_FILTER`, `ISSUE_PAGE_SIZE = 50`
- `countActiveIssueFilters`, `readIssueFilterFromUrl`, `writeIssueFilterToUrl`, `toIssueListRpcArgs` (`p_loai_ct: "XUAT"`, không có `p_nguon_nhap`)
- `negativeReasonSchema` (`z.object({ code, note }).superRefine(...)`), `type NegativeReasonInput`
- `newIssueSchema` (`partnerId`, `warehouseId` uuid bắt buộc, `docDate` tùy chọn), `type NewIssueInput`
- Re-export `documentHeaderSchema`/`documentLineSchema`/`toDocumentUpdate`/`toDocumentLineUpdate` từ `documents`

**`api/issue.keys.ts`**
- `issueKeys = { all, list(filter), detail(id), lines(id), similar(productId, warehouseId) }`

**`api/issue.api.ts`**
- `fetchIssues(filter): Promise<Page<IssueRow>>`
- `type NewIssueInput = { partnerId, warehouseId, docDate? }`, `createIssue(input): Promise<string>`
- `saveNegativeReason(id, { code, note }): Promise<void>`, `clearNegativeReason(id): Promise<void>`
- `postIssue(id, reason?): Promise<void>` — gọi `saveNegativeReason` trước khi ghi sổ nếu có `reason`
- `voidIssue(id, reason): Promise<void>`
- `fetchSimilarCodes(productId, warehouseId): Promise<SimilarCode[]>`
- `proposeMerge(productIdA, productIdB, docId, note?): Promise<void>`
- Re-export `addIssueLine`, `deleteIssueLine`, `fetchIssueDetail`, `fetchIssueLines`, `updateIssueHeader`, `updateIssueLine` từ `document.api`

**`hooks/useIssues.ts`** (`"use client"`)
- `useIssues(filter)`, `useIssueDetail(id)` (`enabled: id !== ""`), `useIssueLines(id)` (`enabled: id !== ""`)
- `useCreateIssue()`, `useUpdateIssueHeader(id)`, `useAddIssueLine(id)`, `useUpdateIssueLine(id)`, `useDeleteIssueLine(id)`, `useSaveNegativeReason(id)`
- `usePostIssue(id)` — invalidate `productKeys.all` + `orderKeys.all`; `useVoidIssue(id)` — invalidate `productKeys.all`
- `useSimilarCodes(productId, warehouseId)` (`enabled: productId !== ""`), `useProposeMerge()`

**`returns/api/return.api.ts`**
- `returnKeys = { all, detail(id), lines(id) }` (không có `list` — Phase 4 không có màn danh sách phiếu trả riêng, chỉ tạo từ nút trên chứng từ gốc)
- `createReturn(sourceDocId): Promise<string>`
- Re-export `fetchReturnDetail`, `fetchReturnLines`, `postReturn`, `updateReturnLine`, `deleteReturnLine`, `voidReturn` từ `document.api`

**`returns/hooks/useReturns.ts`** (`"use client"`)
- `useCreateReturn()`, `useReturnDetail(id)` (`enabled: id !== ""`), `useReturnLines(id)` (`enabled: id !== ""`)
- `useUpdateReturnLine(id)`, `useDeleteReturnLine(id)`
- `usePostReturn(id)` — invalidate `productKeys.all` + `documentKeys.all`

## Tên tham số URL đã chốt cho `/xuat-kho`

`q`, `trang_thai`, `doi_tac`, `kho`, `tu_ngay`, `den_ngay`, `trang` — khác `/nhap-kho` ở chỗ dùng `doi_tac` thay vì `ncc` và không có `?nguon=`.

## Decisions Made

Xem `key-decisions` ở frontmatter. Điểm đáng chú ý nhất là chỗ đặt `exceedsStock`: plan gợi ý cân nhắc giữa `types.ts` và `lib/`, nhưng danh sách `files_modified` của chính plan chỉ cho phép đúng 8 file (không có file `lib/` thứ hai), và `sales-order/types.ts` đã có tiền lệ để hàm thuần `isFullyShipped` ngay trong `types.ts` — chọn theo tiền lệ đó để nhất quán trong cùng phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug tự gây bởi comment] Ba comment chứa nguyên văn chuỗi bị chính acceptance criteria của plan này cấm**
- **Found during:** Task 1 và Task 2, khi tự chạy lại đúng các lệnh `grep`/`node -e` liệt kê trong `<acceptance_criteria>` của plan trước khi commit
- **Issue:** Ba chỗ tự viết ra:
  1. `lib/negative-reasons.ts` — comment giải thích "file thuần, KHÔNG `\"use client\"`" chứa nguyên văn chuỗi `"use client"`, khiến `grep -l "use client" ...` báo dương tính giả (yêu cầu grep này không được in ra file nào).
  2. `schemas/issue.schema.ts` — comment "không truyền `p_nguon_nhap`" chứa nguyên văn chuỗi `p_nguon_nhap`, khiến `grep -c "p_nguon_nhap" ...` trả `1` thay vì `0` yêu cầu.
  3. `api/issue.api.ts` — comment giải thích hành vi hàm ghi sổ database chứa nguyên văn `ghi_so_chung_tu`, khiến `grep -c "ghi_so_chung_tu" ...` trả `1` thay vì `0` yêu cầu (grep này dùng để xác nhận `issue.api.ts` không tự gọi RPC ghi sổ lần thứ hai, không phải để cấm nhắc tên hàm trong comment — nhưng grep không phân biệt được, đúng như bài học đã ghi ở `04-06-SUMMARY.md`).
- **Fix:** Diễn đạt lại cả ba comment không chứa nguyên văn ba chuỗi bị cấm, giữ nguyên ý nghĩa cảnh báo (ví dụ "không gắn chỉ thị client component nào", "cố ý không truyền đối số đó", "Hàm ghi sổ ở tầng database đọc `ly_do_xuat_am`...").
- **Files modified:** `src/features/stock-out/lib/negative-reasons.ts`, `src/features/stock-out/schemas/issue.schema.ts`, `src/features/stock-out/api/issue.api.ts`
- **Verification:** Chạy lại đúng bốn lệnh grep/node-eval trong acceptance criteria của plan, tất cả trả kết quả đúng yêu cầu; `npm run check` vẫn xanh sau khi sửa.
- **Committed in:** `f0807a2`, `505df58` (sửa trước khi commit, không có commit riêng)

---

**Total deviations:** 1 nhóm auto-fix (Rule 1, ba chỗ cùng một dạng lỗi) — không đổi hợp đồng dữ liệu hay hành vi runtime, chỉ diễn đạt lại comment.
**Impact on plan:** Không có. Đây là lỗi tự phát sinh trong chính phiên viết code này (không kế thừa từ plan trước), phát hiện và sửa trước khi commit bất kỳ task nào.

## Issues Encountered

Không có vấn đề nào ngoài mục Deviations ở trên.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- Tám file của `src/features/stock-out/` và `src/features/returns/` sẵn sàng cho Wave 7–10 (04-08 trở đi: màn danh sách/chi tiết/dòng phiếu xuất, nút trả hàng trên chứng từ gốc) — component chỉ việc import, không phải đoán tên cột hay tự viết mapper.
- pgTAP: **324 ok / 0 not ok / 0 ERROR** trên toàn bộ 26 file `supabase/tests/*.sql`, chạy trực tiếp từng file bằng `psql -t -A` (không dùng `db:test:linked` vì Docker treo trên máy này) — không đổi so với sau 04-06, đúng như kỳ vọng vì plan này không chạm database.
- `npm run check` (typecheck + lint + build) xanh toàn bộ.
- Plan 04-05 (`features/documents` + refactor `stock-in`) checkpoint kiểm mắt trình duyệt (Task 3) **vẫn đang mở** — không phải việc của plan này, không chặn plan này (đã xác nhận theo `<execution_environment>` của phiên này). `04-05-SUMMARY.md` vẫn chưa tồn tại; người tiếp theo mở `http://localhost:3000/nhap-kho` để đóng checkpoint đó khi có trình duyệt.
- Chưa có màn hình `/xuat-kho` nào — plan này chỉ là lớp dữ liệu, chưa có component nào để kiểm mắt.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All eight created files verified present on disk; both task commit hashes (`f0807a2`, `505df58`) verified present in git history.
