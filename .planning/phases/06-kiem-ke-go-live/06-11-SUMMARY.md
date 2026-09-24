---
phase: 06-kiem-ke-go-live
plan: 11
subsystem: frontend-ui
tags: [stocktake, antd, tanstack-query, keyboard-entry]
requires:
  - phase: 06-kiem-ke-go-live
    plan: 9
    provides: "src/features/stocktake/ lop du lieu (hooks, api, schema, types, lib)"
provides:
  - "CountMobile — man dem dien thoai (KKE-02)"
  - "CountDeskTable — bang dem van phong, dung id DOM de focus dong ke (KKE-02)"
affects: [06-15, 06-16]
tech-stack:
  added: []
  patterns:
    - "Focus dong ke trong bang go ban phim dung id DOM + document.getElementById, khong dung useRef xuyen qua ham dung cot — React Compiler (eslint-plugin-react-hooks moi) cam truyen ref vao bat ky ham nao duoc goi luc render"
key-files:
  created:
    - src/features/stocktake/components/count-mobile.tsx
    - src/features/stocktake/components/count-desk-table.tsx
    - src/features/stocktake/components/count-desk-columns.tsx
decisions:
  - "count-desk-columns.tsx xuat ham countInputDomId(productId) dung chung giua hai file — id DOM la hop dong duy nhat de focus dong ke, thay cho Map<string, InputNumberRef> qua useRef (bi React Compiler chan)"
  - "count-mobile.tsx khong hien DVT khi ma khong nam trong pham vi phien (ProductSearchResult khong mang ten DVT) — chi hien khi tim thay dong khop trong bang dem hien tai"
metrics:
  duration: ~30 min
  completed: 2026-09-24
---

# Phase 6 Plan 11: Hai đường nhập số đếm (điện thoại + văn phòng) — Summary

**`CountMobile` (thẻ mã to, `InputNumber size="large"`, Enter lưu, đếm mù) và `CountDeskTable` (bảng gõ bàn phím dày, lọc nhóm hàng + trạng thái, đếm mù) — cùng ghi qua `useSaveCount` → RPC `luu_dong_kiem_ke`. Không quét mã vạch (KKE-02 chốt 24/09).**

## Thực hiện

### Task 1 — `count-mobile.tsx`

Đọc `product-search-input.tsx`, `issue-line-entry-row.tsx`/`issue-line-table.tsx` (khuôn nhịp
bàn phím bẫy 14a/14b), `design/kiem-ke.html` (chỉ chép bố cục thẻ + ô số, bỏ hẳn khối quét mã
`kv-scan-box`).

Bố cục một cột: dòng tiến độ "Đã đếm {n}/{tổng}" từ `useCountSheet(sessionId)` (không truyền
`categoryId` → RPC coi là toàn kho, không phải chuỗi rỗng); `ProductSearchInput` (Enter đã bắt
sẵn ở `onKeyDownCapture` bên trong, bẫy 14a không cần lặp lại); khi đã chọn mã hiện `Card` với
mã (đậm, font-mono), tên, ĐVT (lấy từ dòng khớp trong bảng đếm hiện tại — `ProductSearchResult`
không mang tên ĐVT, mã ngoài phạm vi phiên thì không hiện ĐVT, database tự quyết 23514 nếu mã
ngoài nhóm); `Tag` đỏ "Cần đếm lại" khi `needsRecount`; câu cảnh báo ghi đè khi mã đã có dòng
đếm (D-03). `InputNumber size="large" inputMode="decimal"`, Enter = lưu. Nút "Lưu" `size="large"
block` cao 48px (`h-12`). Lưu: `countQuantitySchema.safeParse` → `useSaveCount().mutateAsync` →
thành công `message.success` + xóa mã đang chọn + `setTimeout(focus, 0)` (bẫy 14b); lỗi 23514
hiện nguyên văn message database dưới ô số, 42501 hiện "Bạn không được đếm phiên này", còn lại
`explainError`; số đã gõ giữ nguyên khi lỗi.

Gate lần đầu phát hiện comment giải thích "Không quét mã vạch" tự vi phạm chính acceptance
criteria cấm chuỗi "quét/scan/barcode" — sửa lại câu comment không dùng từ "quét" (Rule 3, tự
chặn bởi chính gate của plan, sửa ngay trong task).

`npm run typecheck` xanh, gate `GATE-OK`, `grep -ci "barcode|quét|scan"` = 0, `wc -l` = 166
(≤200), `eslint --max-warnings=0` sạch.

### Task 2 — `count-desk-columns.tsx` + `count-desk-table.tsx`

Đọc `issue-line-table.tsx`/`issue-line-columns.tsx`, `order-line-table.tsx` (bảng gõ bàn phím
dày), `query-state.tsx`.

`count-desk-columns.tsx`: `buildCountDeskColumns({...})` trả cột Mã/Tên/ĐVT/Nhóm/Số đếm
(`InputNumber`, Enter/blur → `onCommit`)/Đếm lúc/Người đếm/Trạng thái (`Tag` "Cần đếm lại" đỏ,
"Chưa đếm" xám)/thao tác "Xóa số đếm" (`Popconfirm`, chỉ khi có `lineId` và `editable`). Không
cột tồn sổ/tồn KiotViet/lệch (đếm mù, D-08).

`count-desk-table.tsx`: `Select` nhóm hàng (chỉ nhóm có trong sheet hiện tại), `Input` lọc
không dấu (`removeDiacritics`, tính khi render), `Segmented` 4 trạng thái. `useCountSheet`
bọc `QueryState`. Phân trang client 100 dòng/trang, `scroll={{ x: "max-content" }}`.

**Deviation Rule 1 (bug phát hiện qua `npm run lint`, không phải qua chạy code):**
Bản đầu tiên dùng `useRef<Record<string, InputNumberRef | null>>({})` truyền cho
`buildCountDeskColumns` để lưu tham chiếu từng ô số, phục vụ `focusNext()` nhảy dòng kế sau khi
lưu (đúng khuôn bẫy 14b của `issue-line-table.tsx`). `eslint-plugin-react-hooks` bản mới (React
Compiler rule `react-hooks/refs`) báo lỗi build-breaking: *"Passing a ref to a function may read
its value during render"* — quy tắc mới cấm truyền một `useRef` (hoặc closure đóng nó) vào BẤT
KỲ hàm nào được gọi trong thân render (ở đây là gọi `buildCountDeskColumns(...)` để tính
`columns`), khác với khuôn cũ của `issue-line-table.tsx` (ref chỉ được truyền qua JSX prop
`quantityInputRef={quantityInput}`, không qua lời gọi hàm thuần). Sửa bằng cách bỏ hẳn
`useRef`, dùng `id` DOM ổn định `countInputDomId(productId)` gắn trên từng `InputNumber` +
`document.getElementById(...).focus()` trong `focusNext()` — không còn `useRef` nào trong hai
file, build/lint xanh. Đây là mẫu "focus dòng kế" MỚI cho bảng nhiều dòng động (khác khuôn ref
đơn của `issue-line-table.tsx`/`order-line-table.tsx`, nơi chỉ có MỘT ô nhập liệu cố định, không
phải N ô theo từng dòng bảng).

`npm run check` (typecheck + lint + build) xanh toàn bộ, route `/kiem-ke` vẫn build đúng như
06-10 (plan này không tạo route mới, chỉ thêm component).

## Kiểm tra cuối

- `npm run check` — xanh (typecheck, eslint, `next build` — 32 route như trước, không lỗi).
- `grep -ci "bookQuantity\|kiotVietStock\|currentStock"` (mobile) và
  `grep -ci "bookQuantity\|kiotVietStock\|discrepancy"` (desk) = 0 cả hai — đếm mù đúng D-08.
- `wc -l`: `count-mobile.tsx` 166, `count-desk-table.tsx` 169, `count-desk-columns.tsx` 114 —
  cả ba dưới 200 dòng.
- Không `select("*")`/`.select()` trống — cả ba file chỉ dùng lại hook từ `useStocktake.ts`
  (06-09), không gọi Supabase trực tiếp.
- Không tên cột tiếng Việt rò ra ngoài `types.ts`/`api/` — cả ba file chỉ thấy `CountSheetRow`/
  `ProductSearchResult` (camelCase tiếng Anh).

## Việc cần eyeball trên trình duyệt (KHÔNG chạy dev server trong phiên này)

Hai component này CHƯA được ghép vào trang chi tiết `/kiem-ke/[id]` (việc của 06-15) nên
KHÔNG kiểm được bằng cách mở URL ở plan này. UAT (06-16, sau khi 06-15 ghép xong) cần:

1. Trên điện thoại thật hoặc DevTools responsive: gõ vài ký tự mã không dấu → Enter chọn (ưu
   tiên mã khớp tuyệt đối, bẫy 15) → gõ số → Enter lưu → con trỏ quay về ô mã, lặp liên tục
   không cần chạm chuột. Xác nhận nút "Lưu" đủ to để bấm bằng ngón tay cái.
2. Trên máy tính: gõ số ở một dòng bất kỳ trong `CountDeskTable`, Enter → lưu và con trỏ nhảy
   xuống ô số của dòng kế TRONG DANH SÁCH ĐANG LỌC (không phải dòng kế trong toàn bộ sheet nếu
   đang lọc theo nhóm/trạng thái/tìm kiếm) — đây là hành vi cố ý, cần xác nhận đúng ý người
   dùng khi UAT.
3. Lưu lại một mã đã có dòng đếm (ghi đè) — cả hai màn phải hiện đúng cảnh báo D-03.
4. Dòng bị `dat_dem_lai` đặt true tô `Tag` đỏ "Cần đếm lại" trên cả hai màn (D-16).
5. Console sạch cảnh báo antd v6 (bẫy 11) và không có lỗi `react-hooks/refs` nào khác lọt qua
   (đã xử lý ở plan này, nhưng các plan sau thêm bảng gõ bàn phím dòng động khác cần biết mẫu
   `id` DOM này thay vì `useRef` mảng).

## Known Issues / theo dõi

- `discrepancy-table.tsx` (bảng lệch, 06-12) sẽ là nơi thực sự phản chiếu `bookQuantity`/
  `discrepancy`/`kiotVietStock` — hai màn đếm ở plan này chủ ý không đọc các field đó dù
  `CountSheetRow` (06-09) đã có sẵn trên kiểu dữ liệu.
- Mẫu "focus dòng kế qua id DOM" (`countInputDomId`) là mẫu MỚI, khác khuôn `useRef` đơn của
  Phase 3/4 — nếu plan sau cần thêm bảng nhiều dòng có nhảy focus tương tự, nên tái dùng đúng
  kỹ thuật này (không quay lại `useRef<Record<...>>`) để tránh lỗi `react-hooks/refs` lặp lại.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking] Sửa comment tự vi phạm gate cấm từ "quét" trong `count-mobile.tsx`**
- Found during: Task 1, chạy gate `grep -ci "barcode|quét|scan"`.
- Issue: Comment giải thích lý do không quét mã vạch lại chứa đúng từ "quét" mà gate cấm.
- Fix: Viết lại câu comment không dùng từ "quét"/"scan"/"barcode", giữ nguyên ý nghĩa.
- Files: `src/features/stocktake/components/count-mobile.tsx`.
- Commit: `e775d3e`.

**2. [Rule 1 - bug] Bỏ `useRef` map tham chiếu ô số, chuyển sang id DOM trong bảng đếm văn phòng**
- Found during: Task 2, `npm run lint` báo lỗi build-breaking `react-hooks/refs`.
- Issue: Truyền `useRef` (đóng gói trong closure `registerInputRef`) vào hàm thuần
  `buildCountDeskColumns(...)` gọi trong thân render — React Compiler cấm mọi cách truyền ref
  vào lời gọi hàm không phải JSX prop trực tiếp.
- Fix: Thêm `countInputDomId(productId)` (xuất từ `count-desk-columns.tsx`), gắn làm `id` của
  từng `InputNumber`, `focusNext()` dùng `document.getElementById(...)`.
- Files: `src/features/stocktake/components/count-desk-columns.tsx`,
  `src/features/stocktake/components/count-desk-table.tsx`.
- Commit: `fe4f898`.

## Self-Check

- `src/features/stocktake/components/count-mobile.tsx` — FOUND
- `src/features/stocktake/components/count-desk-table.tsx` — FOUND
- `src/features/stocktake/components/count-desk-columns.tsx` — FOUND
- commit `e775d3e` (Task 1) — FOUND trong `git log`
- commit `fe4f898` (Task 2) — FOUND trong `git log`

## Self-Check: PASSED

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*
