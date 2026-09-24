---
phase: 06-kiem-ke-go-live
plan: 15
subsystem: frontend-ui
tags: [stocktake, antd, tanstack-query, react-hook-form, routing]
requires:
  - phase: 06-kiem-ke-go-live
    plan: 6
    provides: "canApproveStocktake tren CurrentUser"
  - phase: 06-kiem-ke-go-live
    plan: 10
    provides: "src/app/(app)/kiem-ke (danh sach), useStocktakeSession"
  - phase: 06-kiem-ke-go-live
    plan: 11
    provides: "CountMobile, CountDeskTable"
  - phase: 06-kiem-ke-go-live
    plan: 12
    provides: "DiscrepancyTable, UncountedPanel (kem ApproveSessionButton)"
  - phase: 06-kiem-ke-go-live
    plan: 14
    provides: "CountExcelImport"
provides:
  - "SessionHeader — dau phien kiem ke: kho/pham vi/tien do/trang thai, nut huy phien (KKE-01)"
  - "SessionDetail — Tabs Dem/Bang lech va duyet/Nhap Excel, ghep du 5 component cua 06-10..06-14 (KKE-01..04, DLIEU-06)"
  - "route /kiem-ke/[id] — trang chi tiet phien kiem ke that su"
  - "the kho: link phieu KIEM_KE, bo hien thi KiotViet cu (D-11)"
affects: [06-16]
tech-stack:
  added: []
  patterns:
    - "Tab dang chon giu tren URL (?tab=) qua useSearchParams/router.replace — khuon history-screen.tsx, ap dung cho Tabs thay vi bo loc"
    - "Modal huy phien dung RHF (Controller + zodResolver) thay vi useState thuong nhu void-receipt-dialog.tsx — theo dung yeu cau plan, khac khuon Phase 4"
key-files:
  created:
    - src/features/stocktake/components/session-header.tsx
    - src/features/stocktake/components/session-detail.tsx
    - src/app/(app)/kiem-ke/[id]/page.tsx
  modified:
    - src/features/products/components/stock-card-columns.tsx
    - src/features/products/components/stock-card.tsx
    - src/features/products/types.ts
decisions:
  - "SessionHeader tu chua toan bo logic Modal huy phien (khong tach void-session-dialog.tsx rieng) — van duoi 200 dong, giu files_modified dung nhu plan liet ke"
  - "Mac dinh Segmented Dem: Grid.useBreakpoint().md quyet dinh Bang hay Dien thoai luc mount; sau do nguoi dung tu chon, khong dong bo lai theo resize (giu don gian, dung useState khoi tao mot lan)"
  - "stock-card.tsx: bo han cau chu thich ve KiotViet thay vi thay bang cau moi — component khong nhan prop quyen xem lich su KiotViet nen theo dung chi dan plan 'neu khong biet quyen thi bo han, khong them cau'"
metrics:
  duration: ~45 min
  completed: 2026-09-24
---

# Phase 6 Plan 15: Trang chi tiết phiên kiểm kê — Summary

**`/kiem-ke/[id]` ghép `SessionHeader` (đầu phiên + hủy phiên) và `SessionDetail` (Tabs Đếm/Bảng lệch & duyệt/Nhập Excel, tab giữ trên URL) từ 5 component đã dựng ở 06-10..06-14; thẻ kho link được phiếu kiểm kê và bỏ hẳn hiển thị KiotViet cũ (D-11).**

## Thực hiện

### Task 1 — `session-header.tsx` + `session-detail.tsx` + route `/kiem-ke/[id]`

Đọc `nhap-kho/[id]/page.tsx`, `receipt-detail.tsx`, `receipt-header.tsx`, `void-receipt-dialog.tsx`
làm khuôn trang chi tiết. Đọc lại props thật của 5 component từ 06-10 (`useStocktakeSession`),
06-11 (`CountMobile`/`CountDeskTable`), 06-12 (`DiscrepancyTable`/`UncountedPanel` — nút duyệt đã
nằm sẵn trong `UncountedPanel`), 06-14 (`CountExcelImport`) — tất cả khớp đúng chữ ký nêu trong
`<interfaces>` của plan, không phải sửa gì ở các file đó.

`session-header.tsx`: `Descriptions` (kho/phạm vi/ngày mở/người mở/trạng thái/tiến độ `Progress`),
`Alert` success khi `HOAN_THANH` ("Đã duyệt lúc … — tồn đã về đúng số đếm; phiếu không sửa được"),
`Alert` warning khi `DA_HUY`. Nút "Hủy phiên" hiện khi `canVoid && state === "NHAP_LIEU"`, mở
`Modal` chứa form RHF (`Controller` + `zodResolver(voidSessionSchema)`) — khác `void-receipt-dialog.tsx`
dùng `useState` thường, đúng yêu cầu plan "form RHF". Lỗi `42501` → `errors.root`; `23514` →
`errors.reason` (nguyên văn message database); thành công → `router.push("/kiem-ke")`.

`session-detail.tsx`: `useStocktakeSession(sessionId)` bọc `QueryState`, `isEmpty` khi `null` →
trạng thái rỗng đúng câu plan yêu cầu + link về `/kiem-ke`. `editable = canCount && state ===
"NHAP_LIEU"`. `Tabs` ba mục:
- "Đếm": `Segmented` Điện thoại/Bảng, mặc định theo `Grid.useBreakpoint().md` lúc mount (khuôn
  `form-drawer.tsx` dùng `Grid.useBreakpoint()`).
- "Bảng lệch & duyệt": `UncountedPanel` trên (đã tự chứa `ApproveSessionButton`), `DiscrepancyTable`
  dưới — đúng thứ tự D-07 (danh sách chưa đếm phải thấy trước khi bấm duyệt).
- "Nhập Excel": `CountExcelImport`.

Tab đang chọn giữ trên URL `?tab=lech|excel` (mặc định `dem` không ghi vào URL, khuôn
`history-screen.tsx` — `useSearchParams`/`router.replace({ scroll: false })`).

`src/app/(app)/kiem-ke/[id]/page.tsx`: Server Component, không `"use client"`, UUID sai →
`notFound()`, `requirePermission("view-catalog")`, `canCount={user.role !== "chi_xem"}`,
`canApprove={user.canApproveStocktake}` (quyền theo người D-14, không qua `hasPermission`).

Gate: `npm run check` xanh, `grep -c "canApproveStocktake"` = 1, `grep -c "notFound"` = 2,
không `"use client"` trong page, `wc -l` cả ba file ≤ 200 (193/137/28).

### Task 2 — Thẻ kho: link phiếu kiểm kê, dọn hiển thị KiotViet cũ

Đọc lại toàn bộ `stock-card-columns.tsx`, `stock-card.tsx`, `types.ts` quanh `StockCardRow`,
và migration `0064_lich_su_kiotviet.sql` phần `the_kho_san_pham` — xác nhận hai nhánh union đọc
`luu_tru_nhap_kiotviet`/`luu_tru_hoa_don_kiotviet` (nguồn `KIOTVIET_NHAP`/`KIOTVIET_BAN`) đã bị
bỏ hẳn ở 0064; `la_he_thong` giờ luôn `true` nên `ton_luy_ke` (→ `runningBalance`) không còn bao
giờ `null` trong thực tế.

`stock-card-columns.tsx`: thêm `KIEM_KE: "/kiem-ke"` vào `DOC_TYPE_TO_ROUTE`, sửa comment (chỉ còn
`CHUYEN_KHO`, `DIEU_CHINH` chưa có route). Xóa `KIOTVIET_NHAP`/`KIOTVIET_BAN` khỏi `SOURCE_LABELS`.
Sửa comment dòng "Số phiếu" không còn nhắc KiotViet riêng (chung cho mọi loại thiếu documentId/route).

`stock-card.tsx`: xóa `Alert` "Dữ liệu KiotViet cũ không gắn kho…" và câu chú thích dấu "—" ở cột
Tồn lũy kế; xóa import `Alert` không còn dùng. **Không thêm câu thay thế** — component không nhận
prop quyền xem lịch sử KiotViet (`canViewKiotVietHistory` chỉ có ở `getCurrentUser()`, không truyền
xuống `StockCard`) nên theo đúng chỉ dẫn plan "nếu component không biết quyền thì bỏ hẳn, không
thêm câu" thay vì viết một câu có thể gây hiểu nhầm cho người không có công tắc.

`types.ts`: sửa comment stale trên `runningBalance` (không đổi field/logic) — comment cũ nhắc
"dòng lưu trữ KiotViet (KIOTVIET_NHAP/KIOTVIET_BAN)" đã không còn tồn tại từ 0064; comment mới nói
đúng hiện trạng (luôn có giá trị với dòng hệ thống hiện tại, kiểu vẫn `| null` vì RPC dùng CASE).

Gate: `GATE-OK` (đủ ba điều kiện), `grep -c "Dữ liệu KiotViet cũ không gắn kho"` = 0.

## Kiểm tra cuối

- `npm run check` (typecheck + lint + build) — xanh cả hai task, build sinh route mới
  `ƒ /kiem-ke/[id]`, 33 route tổng cộng (32 trước đó + 1), không lỗi ở route khác.
- `npx eslint src/features/stocktake "src/app/(app)/kiem-ke" --max-warnings=0` — sạch.
- Không `select("*")`/`.select()` trống — cả hai component mới chỉ dùng lại hook đã có
  (`useStocktakeSession`, `useVoidSession`) từ `hooks/useStocktake.ts` (06-09), không gọi
  Supabase trực tiếp.
- Không tên cột tiếng Việt rò ra ngoài `types.ts`/`api/` — `session-header.tsx`/`session-detail.tsx`
  chỉ thấy `StocktakeSession`/`VoidSessionInput` (camelCase tiếng Anh).

## Việc cần eyeball trên trình duyệt (KHÔNG chạy dev server trong phiên này — theo chỉ dẫn)

UAT 06-16 cần mở `/kiem-ke/<id>` thật (dùng phiên đã tạo ở UAT 06-10, hoặc mở phiên mới với một
nhóm hàng nhỏ) và xác nhận:

1. Cỡ 375px (điện thoại): tab "Đếm" mặc định hiện `CountMobile` (theo `Grid.useBreakpoint().md`
   false). Gõ mã không dấu → Enter chọn (ưu tiên khớp tuyệt đối, bẫy 15) → gõ số → Enter lưu →
   con trỏ quay về ô mã — lặp lại 3 mã liên tiếp chỉ bằng bàn phím, không tràn ngang.
2. Cỡ máy tính: tab "Đếm" mặc định `CountDeskTable`. Gõ số dòng 1, Enter → lưu và nhảy xuống ô số
   dòng 2 trong danh sách đang lọc.
3. Bấm `Segmented` đổi Điện thoại ↔ Bảng — cả hai màn đọc chung một `useCountSheet`, đổi qua lại
   không mất dữ liệu vừa gõ dở (nếu có).
4. Tab "Bảng lệch & duyệt": `UncountedPanel` hiện trước `DiscrepancyTable`. Với tài khoản KHÔNG có
   quyền `duyet_kiem_ke` (và không phải `quan_ly`): nút "Duyệt phiên" disable kèm Tooltip đúng câu
   "Cần quyền...". `DiscrepancyTable` thấy đúng số lệch, "Tồn KiotViet tạm" chỉ hiện nếu phiên có
   nạp tồn tạm trước đó.
5. Tab "Nhập Excel": chọn nhóm hàng → tải file mẫu → mở file, đúng 4 cột (Mã hàng, Tên hàng, ĐVT,
   Số đếm), không có cột tồn nào.
6. Đổi tab, F5 lại trang — tab vẫn giữ đúng (kiểm tra `?tab=lech` hoặc `?tab=excel` trên URL, tab
   "Đếm" mặc định không có query param).
7. Bấm "Hủy phiên" (chỉ với tài khoản `canApprove`, phiên còn `NHAP_LIEU`) — Modal RHF, bỏ trống lý
   do bấm "Hủy phiếu" phải hiện lỗi field ngay (không gọi RPC), nhập đủ 3 ký tự trở lên → thành
   công → điều hướng về `/kiem-ke`. **Thử để không để rác trên cloud** — nếu tạo phiên thật để
   test, hủy nó lại trước khi kết thúc UAT.
8. Phiên đã `HOAN_THANH`: `Alert` success "Đã duyệt lúc…", không còn nút "Hủy phiên", mọi tab đều
   chỉ đọc (`editable=false` truyền xuống đúng cả 5 component con).
9. Console không cảnh báo antd v6 (bẫy 11) trong suốt luồng trên.
10. **Nếu trang trắng không có request nào**: kiểm `document.hidden` trước (bẫy 19 CLAUDE.md —
    khung trình duyệt ẩn khiến Suspense treo mãi ở `<!--$~-->`), không phải lỗi ứng dụng.
11. Mở một mã hàng có phiếu `KIEM_KE` (chỉ có sau khi đã duyệt phiên thật) → tab Thẻ kho: dòng
    KIEM_KE bấm được số phiếu, mở đúng `/kiem-ke/<id>`; không còn dòng nguồn "KiotViet · nhập"/
    "KiotViet · bán" nào trong cột Nguồn — vì 0064 đã bỏ nhánh đó khỏi RPC, chỉ còn "Hệ thống".

Ghi lại kết quả từng bước vào SUMMARY của 06-16 (UAT).

## Known Issues / theo dõi

- Không có blocker mới. `06-10-SUMMARY.md` từng ghi "cột Người mở chưa xác nhận là tên hiển thị
  hay id" — `session-header.tsx` hiển thị thẳng `session.createdBy` (giá trị `nguoi_tao` từ RPC),
  cùng vấn đề chưa xác nhận, cần UAT kiểm cùng lúc với danh sách phiên.
- `SessionDetail` không tự cuộn lên đầu khi đổi tab bằng URL back/forward của trình duyệt — chấp
  nhận được vì `router.replace({ scroll: false })` giữ đúng khuôn `history-screen.tsx`.

## Deviations from Plan

None - plan thực thi đúng như viết (kể cả quyết định không tách `void-session-dialog.tsx` riêng —
`session-header.tsx` vẫn dưới 200 dòng nên giữ đúng danh sách `files_modified` gốc của plan).

## Self-Check

- `src/features/stocktake/components/session-header.tsx` — FOUND
- `src/features/stocktake/components/session-detail.tsx` — FOUND
- `src/app/(app)/kiem-ke/[id]/page.tsx` — FOUND
- `src/features/products/components/stock-card-columns.tsx` — modified, FOUND
- `src/features/products/components/stock-card.tsx` — modified, FOUND
- `src/features/products/types.ts` — modified, FOUND
- commit `d5ab091` (Task 1) — FOUND trong `git log`
- commit `323fefd` (Task 2) — FOUND trong `git log`

## Self-Check: PASSED

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*
