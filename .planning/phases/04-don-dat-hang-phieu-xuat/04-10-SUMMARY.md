---
phase: 04-don-dat-hang-phieu-xuat
plan: 10
subsystem: ui
tags: [nextjs, antd, tanstack-query, supabase, stock-out]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 07
    provides: "src/features/stock-out/ (issueKeys/issue.api/useIssues/schemas/issue.schema, negative-reasons, types), issueKeys.list, toIssueListRpcArgs (p_loai_ct XUAT)"
  - phase: 04-don-dat-hang-phieu-xuat plan 08
    provides: "src/shared/components/partner-search-input.tsx, khuôn order-table.tsx/order-filter-panel.tsx/create-order-button.tsx dùng làm mẫu cho màn xuất"
provides:
  - "Route /xuat-kho — chặn quyền bằng requirePermission(\"view-catalog\"), thêm vào ma trận scripts/test-route-permissions.ts (75/75 ô đúng)"
  - "src/features/stock-out/components/{issue-table,issue-table-body,issue-filter-panel,issue-toolbar,create-issue-button}.tsx — màn danh sách phiếu xuất + đường tạo phiếu không cần đơn (XUAT-02)"
  - "issue.api.ts: fetchIssues() nối thêm đơn gốc (orderId/orderNo) bằng hai lượt đọc riêng, không sửa RPC danh_sach_chung_tu dùng chung với stock-in/returns"
affects: ["04-11 (chi tiết phiếu xuất — mở /xuat-kho/{id} do CreateIssueButton điều hướng tới)", "04-12 (tạo phiếu xuất từ đơn — đường chính, dùng chung IssueRow/issueKeys)", "04-15 (route /xuat-kho đã có sẵn trong ma trận quyền)"]

tech-stack:
  added: []
  patterns:
    - "IssueRow mở rộng DocumentRow thêm orderId/orderNo (KHÔNG còn là alias thuần) — danh_sach_chung_tu không trả đơn gốc vì dùng chung với stock-in/returns; issue.api.ts tự nối bằng hai lượt đọc (chung_tu.don_dat_hang_id rồi don_dat_hang.so_dh) thay vì sửa RPC chung chỉ để phục vụ một cột của một màn"
    - "issue-table.tsx dựng hai lượt trong cùng plan: Task 1 dùng Button disabled làm placeholder (canCreate vẫn được dùng, không unused), Task 2 thay bằng CreateIssueButton thật — lặp lại đúng khuôn order-table.tsx của 04-08"
    - "CreateIssueButton tự quản lý state Modal của chính nó (không nhận open/onClose từ ngoài) — theo khuôn create-order-button.tsx (mới hơn), không theo khuôn create-receipt-button.tsx (cũ, nhận open/onClose từ issue-table)"

key-files:
  created:
    - src/app/(app)/xuat-kho/page.tsx
    - src/features/stock-out/components/issue-table.tsx
    - src/features/stock-out/components/issue-table-body.tsx
    - src/features/stock-out/components/issue-filter-panel.tsx
    - src/features/stock-out/components/issue-toolbar.tsx
    - src/features/stock-out/components/create-issue-button.tsx
  modified:
    - src/features/stock-out/types.ts
    - src/features/stock-out/api/issue.api.ts
    - scripts/test-route-permissions.ts

key-decisions:
  - "IssueRow không còn là alias 1:1 của DocumentRow — mở rộng thêm orderId/orderNo ở tầng stock-out/types.ts, vì danh_sach_chung_tu (RPC dùng chung ba màn nhập/xuất/trả) không có hai cột này. Sửa RPC chung (yêu cầu drop+recreate function trên database thật, phải chạy db:push lên cloud) được cân nhắc rồi bỏ vì rủi ro cao hơn lợi ích của một cột hiển thị; giải pháp hai lượt đọc client-side dùng đúng hai bảng (chung_tu, don_dat_hang) đã có sẵn policy SELECT cho phạm vi hiện tại (0016), không cần migration nào"
  - "Không có route /xuat-kho/[id] trong plan này — CreateIssueButton điều hướng router.push tới đó nhưng route chỉ được 04-11 tạo. Đây là thứ tự y hệt 04-08 (CreateOrderButton trỏ /dat-hang/{id} trước khi 04-09 dựng trang chi tiết), không phải lỗi"
  - "Route /xuat-kho thêm vào ma trận quyền ngay trong plan này (giống 04-08 đã làm sớm với /dat-hang) — cùng kỳ vọng AI_CUNG_XEM với /nhap-kho và /dat-hang"

requirements-completed: [XUAT-01, XUAT-02]

duration: ~40min
completed: 2026-09-20
---

# Phase 4 Plan 10: Màn danh sách phiếu xuất & tạo phiếu không cần đơn Summary

**Route `/xuat-kho` nhân bản khuôn `/dat-hang` (04-08), cộng lớp nối "Đơn gốc" ở `issue.api.ts` bằng hai lượt đọc riêng vì RPC danh sách chứng từ dùng chung ba chiều nhập/xuất/trả không mang theo cột đơn gốc.**

## Performance

- **Duration:** ~40 phút
- **Tasks:** 2/2 (cộng 1 việc phát sinh: thêm route vào ma trận quyền)
- **Files modified:** 9 (6 tạo mới, 3 sửa)

## Accomplishments

- `/xuat-kho` (Server Component) chặn quyền bằng `requirePermission("view-catalog")`, bọc `<IssueTable>` trong `Suspense`.
- `IssueTable` điều phối `ListLayout` + `QueryState`, đọc/ghi bộ lọc trên URL (`q`, `trang_thai`, `doi_tac`, `kho`, `tu_ngay`, `den_ngay`, `trang` — đã có sẵn từ 04-07), đủ bốn trạng thái loading/error/empty/success.
- `IssueTableBody` hiện chín cột: Số phiếu, Ngày, Người nhận, **Đơn gốc** (link `/dat-hang/{orderId}` khi có, "—" khi không), Kho, Số dòng, Tổng số lượng, Trạng thái, Người tạo — **không có cột Nguồn** (chỉ NHẬP mới có nguồn nhập) và **không có cột tiền** (phiếu xuất không mang giá bán).
- `IssueFilterPanel`: trạng thái (`Select` với option "Tất cả" dùng `value: ""`, đúng bẫy 11), người nhận (`PartnerSearchInput`), kho (`Select` từ `useLookups`), khoảng ngày — **không có bộ lọc nguồn nhập**.
- `issue.api.ts`: `fetchIssues()` gọi `fetchDocuments` như cũ rồi nối thêm `orderId`/`orderNo` bằng hàm `attachOrderNo()` mới — đọc `chung_tu.don_dat_hang_id` theo lô id trang hiện tại, rồi đọc `don_dat_hang.so_dh` theo các order id thu được. Không sửa RPC `danh_sach_chung_tu` (dùng chung với `stock-in`/`returns`), không cần migration.
- `stock-out/types.ts`: `IssueRow` đổi từ alias thuần `DocumentRow` sang `DocumentRow & { orderId, orderNo }` — chỉ ảnh hưởng nội bộ `stock-out` (hai chỗ dùng duy nhất: `issue.api.ts` và `useIssues.ts`), không phá vỡ `DocumentRow` dùng chung.
- `CreateIssueButton` (XUAT-02): `Modal` chọn người nhận + kho xuất + ngày phiếu (mặc định hôm nay, không bắt buộc gõ lại vì `chung_tu.ngay_ct` đã có default `current_date`), không có ô số phiếu (server cấp qua `sinh_so_ct`). Dòng phụ chú dưới ô kho: "Kho từng dòng sửa được sau khi mở phiếu" (D-13). Bắt lỗi riêng `42501` và `23514`, còn lại qua `explainError`. Tạo xong `router.push("/xuat-kho/{id}")`. Cắm vào cả toolbar và trạng thái rỗng của `QueryState`.
- Thêm `/xuat-kho` vào `scripts/test-route-permissions.ts` — chạy `npx tsx scripts/test-route-permissions.ts` cho **75/75 ô đúng** (70 trước đó + 5 ô mới).

## Task Commits

1. **Task 1: Màn danh sách phiếu xuất** - `517025a` (feat)
2. **Task 2: Nút tạo phiếu xuất không cần đơn** - `13f54b0` (feat)
3. **Việc phát sinh: thêm `/xuat-kho` vào ma trận quyền route** - `e5913c0` (chore)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `src/app/(app)/xuat-kho/page.tsx` - Route danh sách phiếu xuất
- `src/features/stock-out/components/issue-table.tsx` - Điều phối `ListLayout`/`QueryState`/URL
- `src/features/stock-out/components/issue-table-body.tsx` - Bảng chín cột, có "Đơn gốc", không cột Nguồn/tiền
- `src/features/stock-out/components/issue-filter-panel.tsx` - Panel lọc (trạng thái/người nhận/kho/khoảng ngày)
- `src/features/stock-out/components/issue-toolbar.tsx` - Ô tìm `q` debounce + chỗ cắm nút tạo
- `src/features/stock-out/components/create-issue-button.tsx` - Tạo phiếu không cần đơn, cấp số server, chuyển trang
- `src/features/stock-out/types.ts` - `IssueRow` mở rộng thêm `orderId`/`orderNo`
- `src/features/stock-out/api/issue.api.ts` - `fetchIssues()` nối đơn gốc qua `attachOrderNo()`
- `scripts/test-route-permissions.ts` - Thêm dòng `/xuat-kho` vào `MA_TRAN`

## Decisions Made

Xem `key-decisions` ở frontmatter. Quyết định đáng chú ý nhất: cột "Đơn gốc" trên bảng danh sách cần dữ liệu mà RPC `danh_sach_chung_tu` không trả (RPC đó dùng chung cho cả ba chiều nhập/xuất/trả — không mang `don_dat_hang_id`/`so_dh`). Sửa RPC là thay đổi chữ ký hàm trên database thật (phải `DROP FUNCTION` + `CREATE` lại, chạy `db:push` lên cloud) — CLAUDE.md yêu cầu hỏi trước với loại migration này trên dữ liệu sản xuất thật. Vì có đường thay thế an toàn hơn (hai bảng `chung_tu`/`don_dat_hang` đã cho phép SELECT theo đúng phạm vi hiện tại từ policy 0016, không cần quyền mới), tôi chọn nối dữ liệu ở tầng `api/` của `stock-out` — không đụng migration, không đụng RPC dùng chung, không cần hỏi trước.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, phát hiện trước khi viết code] `IssueRow` không mang `orderId`/`orderNo` như plan giả định**
- **Found during:** Đọc `src/features/stock-out/types.ts` và migration `0045_rpc_chung_tu.sql` trước khi viết `issue-table-body.tsx`, theo đúng `<read_first>` của Task 1.
- **Issue:** Plan viết "cột Đơn gốc (`orderNo`, render `<Link>` khi có)" như thể trường này đã có sẵn trên `IssueRow` (giống `IssueDetail` đã có `orderId`/`orderNo`). Kiểm tra thực tế: `danh_sach_chung_tu` (0045) chỉ trả `id, so_ct, ngay_ct, loai_ct, nguon_nhap, trang_thai, doi_tac_id, ten_doi_tac, ten_kho, so_dong, tong_so_luong, tong_tien, ho_ten_nguoi_tao, ngay_ghi_so, tong_so_dong` — không có đơn gốc. Nếu code thẳng theo giả định của plan, `npm run check` sẽ báo lỗi kiểu ngay (property không tồn tại), chặn cả Task 1.
- **Fix:** Mở rộng `IssueRow` (`DocumentRow & { orderId, orderNo }`) và thêm `attachOrderNo()` trong `issue.api.ts` để nối dữ liệu bằng hai lượt đọc riêng (`chung_tu` rồi `don_dat_hang`), không sửa RPC chung. Xem `key-decisions` để biết vì sao chọn hướng này thay vì sửa migration.
- **Files modified:** `src/features/stock-out/types.ts`, `src/features/stock-out/api/issue.api.ts`
- **Verification:** `npm run check` xanh toàn bộ; `npx tsx scripts/test-route-permissions.ts` → 75/75; cột "Đơn gốc" trong `issue-table-body.tsx` dùng đúng `row.orderNo`/`row.orderId` không báo lỗi kiểu.
- **Committed in:** `517025a`

**2. [Rule 1 - Lỗi lint tự gây] Dấu ngoặc kép thẳng trong JSX của `create-issue-button.tsx`**
- **Found during:** Task 2, `npm run check` báo `react/no-unescaped-entities` ở dòng chú thích dưới `Modal`.
- **Issue:** Viết `"Tạo phiếu xuất"` bằng dấu ngoặc kép thẳng trong JSX text — ESLint cấm ký tự `"` chưa escape trong JSX.
- **Fix:** Đổi sang dấu ngoặc kép kiểu Việt "" (`“…”`), không cần escape.
- **Files modified:** `src/features/stock-out/components/create-issue-button.tsx`
- **Verification:** `npm run check` xanh sau khi sửa.
- **Committed in:** `13f54b0` (sửa trước khi commit, không có commit riêng)

---

**Total deviations:** 2 (1 Rule 3 phát hiện trước khi code nhờ đọc kỹ `<read_first>`, 1 Rule 1 lỗi lint tự gây). Không có deviation nào cần hỏi người dùng (Rule 4) — phương án thay thế cho gap dữ liệu "Đơn gốc" không đụng migration/database thật.

## Issues Encountered

Không có vấn đề nào ngoài mục Deviations ở trên.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào cần làm tay.

## Chưa làm / Cần người kiểm bằng mắt

- **Agent không có trình duyệt trong phiên này.** Đã xác nhận bằng: `npm run check` xanh (typecheck + lint + build, build liệt kê đúng `/xuat-kho` trong danh sách route), và `npx tsx scripts/test-route-permissions.ts` (75/75 ô đúng — dùng cookie phiên thật của bốn vai trò, GET thật qua HTTP, không phải giả định). **Chưa ai mở `/xuat-kho` bằng mắt.**
- **Route `/xuat-kho/{id}` (trang chi tiết) CHƯA tồn tại** — plan 04-11 mới tạo. Bấm "Tạo phiếu xuất" ở trạng thái hiện tại của repo sẽ tạo phiếu thật trên database (cấp số qua `sinh_so_ct`, insert vào `chung_tu`) rồi `router.push` sang một route 404. Đây là thứ tự có chủ đích, giống hệt 04-08 (`CreateOrderButton` trỏ `/dat-hang/{id}` trước khi 04-09 dựng trang chi tiết) — **không phải lỗi của plan này**, nhưng người kiểm cần biết trước khi bấm thử, kẻo tưởng phiếu tạo xong bị lỗi.
- **Chưa tạo phiếu xuất thật nào để kiểm cột "Đơn gốc" có link** — `chung_tu` với `loai_ct='XUAT'` đo 20/09 vẫn 0 dòng, và `don_dat_hang` cũng 0 dòng nên chưa có phiếu nào gắn đơn để nhìn thấy link thật. Logic nối dữ liệu (`attachOrderNo`) đã qua kiểm tra kiểu tĩnh và đúng tên cột theo `database.types.ts`, nhưng chưa chạy qua dữ liệu thật vì chưa có dữ liệu.
- Nợ treo từ 04-05 (checkpoint kiểm mắt `/nhap-kho`) và từ 04-09 (checkpoint kiểm mắt `/dat-hang/[id]`, Task 4) không đổi, không phải việc của plan này.

## Cần người kiểm — chính xác nên mở gì

1. Mở `http://localhost:3000/xuat-kho` (đăng nhập vai trò `van_phong` hoặc `quan_ly`) — phải thấy trạng thái rỗng "Chưa có phiếu xuất nào." kèm nút "Tạo phiếu đầu tiên", panel lọc bên trái (hoặc nút "Bộ lọc" nếu màn hẹp dưới 992px), ô tìm phía trên bảng.
2. Bấm nút tạo phiếu, chọn người nhận (gõ tên bất kỳ — danh sách gần như trống, bấm "+ Thêm đối tác mới" nếu cần), chọn kho, bấm "Tạo phiếu" — kỳ vọng: modal đóng, rồi **trang hiện lỗi 404** (route `/xuat-kho/[id]` chưa có, xem mục "Chưa làm" ở trên) — đây là hành vi kỳ vọng, không phải lỗi. Việc cần kiểm ở bước này: phiếu đã thật sự được tạo (mở lại `/xuat-kho`, phiếu vừa tạo phải xuất hiện trong danh sách với đúng người nhận, kho, trạng thái "Đang nhập liệu").
3. Thử bộ lọc trạng thái/người nhận/kho/khoảng ngày — xác nhận URL đổi theo (ví dụ `?trang_thai=NHAP_LIEU`), tải lại trang giữ nguyên bộ lọc.
4. Thu nhỏ cửa sổ dưới 992px — panel lọc phải sập vào nút "Bộ lọc" mở drawer đáy, không tràn ngang.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All six created files verified present on disk; all three commit hashes (`517025a`, `13f54b0`, `e5913c0`) verified present in git history.
