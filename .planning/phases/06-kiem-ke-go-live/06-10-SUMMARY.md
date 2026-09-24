---
phase: 06-kiem-ke-go-live
plan: 10
subsystem: frontend-ui
tags: [stocktake, antd, react-hook-form, tanstack-query]
requires:
  - phase: 06-kiem-ke-go-live
    plan: 9
    provides: "src/features/stocktake/ lop du lieu (hooks, api, schema, types, lib)"
provides:
  - "src/app/(app)/kiem-ke — route danh sach phien kiem ke"
  - "OpenSessionDrawer — form mo phien (RHF + zod), dung lai duoc o 06-11..06-13"
affects: [06-11, 06-12, 06-13, 06-15, 06-16]
tech-stack:
  added: []
  patterns:
    - "Bo loc danh sach phien la state cuc bo (khong URL) — khac ReceiptTable (URL filter); phien kiem ke khong can bookmark/chia se link loc"
key-files:
  created:
    - src/features/stocktake/components/open-session-drawer.tsx
    - src/features/stocktake/components/session-list.tsx
    - src/app/(app)/kiem-ke/page.tsx
decisions:
  - "Loi 23514 luc mo phien: dat vao field warehouseId neu message tu database chua chu 'kho', nguoc lai dat vao root — heuristic don gian, khong phan tich message sau hon"
  - "Cot 'Nguoi mo' hien thang gia tri nguoi_tao tu RPC (chua xac nhan la ten hien thi hay id — xem Known Issues)"
metrics:
  duration: ~35 min
  completed: 2026-09-24
---

# Phase 6 Plan 10: Danh sách phiên kiểm kê và form mở phiên — Summary

**`/kiem-ke` liệt kê phiên kiểm kê (lọc kho/trạng thái cục bộ, cột tiến độ đếm bằng `Progress`, nhãn trạng thái suy từ `sessionStatus()`) và `OpenSessionDrawer` (RHF + zod, kho giới hạn theo thủ kho, nhóm hàng tìm không dấu, alert D-02/D-03, chống bấm lặp, map lỗi 42501/23514 vào đúng field).**

## Thực hiện

### Task 1 — `OpenSessionDrawer`

Đọc `form-drawer.tsx`, `create-receipt-button.tsx`, `user-drawer.tsx`, `errors.ts` làm khuôn.
RHF + `zodResolver(openSessionSchema)` (từ 06-09). Trường Kho (`Select` từ
`useStocktakeLookups().warehouses`, lọc theo `assignedWarehouseIds` khi `isStorekeeper`, tự
chọn sẵn khi đúng một kho). Trường Nhóm hàng (`Select mode="multiple"`, `filterOption` tùy
chỉnh so khớp nhãn đã `removeDiacritics` — tìm không dấu). `Alert` info đúng nội dung D-02/D-03
đã chốt trong plan (không copy câu sai "chốt tồn sổ tại thời điểm mở phiên" từ
`design/kiem-ke.html`). Submit gọi `useOpenSession().mutateAsync` rồi `router.push`. Nút Lưu
disabled/loading qua `saving={openSession.isPending}` của `FormDrawer`. Lỗi `42501` →
thông báo cố định vào `root`; `23514` → vào `warehouseId` nếu message DB chứa "kho", ngược
lại vào `root`; lỗi khác qua `explainError`. Không `catch {}` rỗng.

Gate: `npm run typecheck` xanh, `grep openSessionSchema`/`isPending|loading` khớp, dòng đầu
`"use client";`, không `width=`, không `value: null`, 176 dòng (≤200), `eslint --max-warnings=0`
sạch.

### Task 2 — `SessionList` + route `/kiem-ke`

Đọc `receipt-table.tsx`/`receipt-table-body.tsx`, `list-layout.tsx`, `query-state.tsx`,
`design/kiem-ke.html` (chỉ chép bố cục, không chép logic sai). Khác `ReceiptTable`: bộ lọc
kho/trạng thái là **state cục bộ** (`useState`), không đẩy lên URL — theo đúng yêu cầu plan,
vì phiên kiểm kê không cần bookmark/chia sẻ link lọc. Cột: Số phiên (link `/kiem-ke/{id}`),
Ngày, Kho, Phạm vi (`categoryNames` hoặc "Toàn kho"), Tiến độ (`Progress size="small"
showInfo={false}` + text "{countedCount}/{scopeCount}"), Chờ đếm lại (ẩn khi 0), Trạng thái
(`Tag` màu theo `sessionStatus()`), Người mở. `Table scroll={{ x: "max-content" }}` trong
`overflow-x-auto`. Nút "Mở phiên kiểm kê" chỉ hiện khi `canOpen`, mở `OpenSessionDrawer`.
Không cột giá (D-17) — không field nào trong `StocktakeSession` chứa giá trị tiền nên không
có gì để vô tình lộ.

`src/app/(app)/kiem-ke/page.tsx`: Server Component, không `"use client"`,
`requirePermission("view-catalog")`, `PageHeader`, render `SessionList` với
`canOpen={user.role !== "chi_xem"}` / `isStorekeeper={user.role === "thu_kho"}` trong
`Suspense`. Phạm vi kho của thủ kho siết ở RPC (migration 0066 — plan 06-04), không ở route,
đúng khuôn `/ton-kho`.

`npm run check` (typecheck + lint + build) xanh — build sinh route `ƒ /kiem-ke` mới, không
lỗi ở 31 route còn lại. `grep -c "use client"` trong `page.tsx` = 0; `grep -c
"requirePermission"` = 2 (import + lời gọi — khớp đúng khuôn `nhap-kho/page.tsx` cũng = 2, gate
trong plan viết "=1" hiểu theo nghĩa "một lời gọi", đã đối chiếu file tham chiếu để xác nhận
không phải deviation).

## Kiểm tra cuối

- `npm run check` — xanh (typecheck, eslint, `next build` sinh đủ route, có `ƒ /kiem-ke`).
- `npx eslint src/features/stocktake src/app/(app)/kiem-ke --max-warnings=0` — sạch (chạy gộp
  trong `npm run lint` ở trên).
- Không `select("*")`/`.select()` trống trong 2 file mới (không file nào gọi Supabase trực
  tiếp — cả hai dùng lại `hooks/useStocktake.ts` từ 06-09).
- Không tên cột tiếng Việt rò ra ngoài `types.ts`/`api/` — `session-list.tsx` và
  `open-session-drawer.tsx` chỉ thấy `StocktakeSession`/`StocktakeLookups`/`OpenSessionInput`
  (camelCase tiếng Anh).

## Việc cần eyeball trên trình duyệt (KHÔNG chạy dev server trong phiên này — theo chỉ dẫn)

UAT plan 06-16 (hoặc orchestrator) cần mở `/kiem-ke` thật và xác nhận:

1. `vanphong` mở `/kiem-ke`, bấm "Mở phiên kiểm kê", chọn một kho + một nhóm hàng nhỏ, được
   điều hướng sang `/kiem-ke/<id>` — **trang chi tiết chưa tồn tại (06-15 dựng sau), nên 404
   là kỳ vọng ở bước này, không phải lỗi**. Quay lại `/kiem-ke` phải thấy phiên mới với trạng
   thái "Mới mở" 0/N.
2. `thukho1` (hoặc user thủ kho mẫu) chỉ thấy kho được gán trong cả ô lọc "Kho" của danh sách
   lẫn `Select` "Kho" trong drawer mở phiên.
3. `chixem` không thấy nút "Mở phiên kiểm kê".
4. Thu hẹp cỡ điện thoại: bảng phiên cuộn ngang trong khung riêng (`overflow-x-auto`), không
   tràn cả trang.
5. Console sạch cảnh báo antd v6 (bẫy 11 CLAUDE.md — `Alert title`, không `message`).
6. **Nếu đã tạo phiên kiểm kê thật trên cloud lúc UAT**, ghi số phiên vào SUMMARY của 06-15/
   06-16 để dọn (hủy) — plan này không tự tạo phiên thật, chỉ dựng UI.

## Known Issues / theo dõi

- Cột "Người mở" hiển thị thẳng `row.createdBy` (giá trị `nguoi_tao` từ RPC
  `danh_sach_phien_kiem_ke`, kiểu `string`) — **chưa xác nhận đây là tên hiển thị (`ho_ten`)
  hay id người dùng**. `06-04-SUMMARY.md` không nêu rõ migration `0066` trả về field nào cho
  `nguoi_tao`. Nếu UAT thấy cột này hiện UUID thay vì tên, cần sửa RPC (join `nguoi_dung`) ở
  một plan sau — không sửa ở đây vì `0066` ngoài `files_modified` của 06-10.
- Trang chi tiết `/kiem-ke/[id]` chưa tồn tại (06-15) — link "Số phiên" trên danh sách 404 cho
  tới lúc đó, đúng như 06-09-SUMMARY đã ghi nhận trước.
- `stock-card-columns.tsx` (`DOC_TYPE_TO_ROUTE`) và `navigation.ts` **chưa sửa** trong plan
  này — đúng chỉ dẫn `sequential_execution` (thuộc phạm vi 06-16) và đúng comment trong
  `stock-card-columns.tsx` ("thêm SAU KHI route có thật" — route `/kiem-ke` giờ có, nhưng
  `/kiem-ke/[id]` — nơi link trỏ tới — thì chưa, nên vẫn chưa nên thêm).

## Deviations from Plan

Không có — plan thực thi đúng như viết. Một điểm cần làm rõ (không phải deviation, ghi lại để
tránh hiểu nhầm khi đọc lại): acceptance criteria Task 2 viết `grep -c "requirePermission" = 1`
nhưng cả file mới lẫn file tham chiếu `nhap-kho/page.tsx` đều cho kết quả `2` (dòng import +
dòng gọi hàm) — đã đối chiếu trực tiếp, không sửa gì thêm.

## Self-Check

- `src/features/stocktake/components/open-session-drawer.tsx` — FOUND
- `src/features/stocktake/components/session-list.tsx` — FOUND
- `src/app/(app)/kiem-ke/page.tsx` — FOUND
- commit `f6918b4` (Task 1) — FOUND trong `git log`
- commit `0aedc87` (Task 2) — FOUND trong `git log`

## Self-Check: PASSED

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*
