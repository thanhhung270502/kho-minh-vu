---
quick: 260919-dm4
requirements: [DS-01, DS-02, DS-03]
tags: [ui, antd, tailwind, design-system]
completed: 2026-09-19
---

# Quick 260919-dm4: Update design system theo giao diện KiotViet — Summary

**Đổi token màu/bo góc sang bảng KiotViet (#1652F0), dựng lại shell thành top-nav pill +
tab đáy mobile, và bố cục lại /danh-muc + /doi-tac thành panel lọc trái + bảng phải +
hàng tổng cộng — 3 commit, không thêm thư viện mới.**

## Kết quả `npm run check`

Chạy 5 lần trong lúc thực thi (sau mỗi lần sửa và trước mỗi commit). Lần cuối cùng
(sau khi cả 3 task đã xong):

```
> kiotviet@0.1.0 check
> npm run typecheck && npm run lint && npm run build

> kiotviet@0.1.0 typecheck
> tsc --noEmit
(không có lỗi)

> kiotviet@0.1.0 lint
> eslint
(không có lỗi)

> kiotviet@0.1.0 build
> next build
✓ Compiled successfully
  Finished TypeScript ...
✓ Generating static pages using 10 workers (20/20)
  Finalizing page optimization ...
(build ra đủ 20 route, không có route nào lỗi)
```

Tất cả 3 lần chạy `npm run check` trước 3 commit đều **xanh tuyệt đối** — không có
lỗi typecheck, không có lỗi lint, build thành công cho toàn bộ 20 route.

## Ba commit

| # | Hash | Commit message |
|---|------|-----------------|
| 1 | `4006200` | `feat(ui): rút token thiết kế theo bảng màu KiotViet` |
| 2 | `cd4222d` | `feat(ui): đổi shell sang thanh điều hướng ngang và tab đáy cho mobile` |
| 3 | `39da902` | `feat(ui): dựng lại bố cục trang danh sách theo giao diện KiotViet` |

### Commit 1 — `4006200` (Task 1, DS-01)

File đã sửa/tạo:
- `src/providers/antd-theme.ts` (sửa) — `colorPrimary/colorLink/colorInfo = #1652F0`,
  nền `#F0F2F5`, bo góc 8/12/6, token Table/Layout/Modal/Tag/Button theo bảng màu.
- `src/app/globals.css` (sửa) — chỉ đụng khối `@theme`: đủ 10 bậc
  `--color-brand-50..900`, thêm biến nền/chữ/viền dùng chung, `--shadow-the`,
  `--radius-the`, thêm `background` cho `body`. **Không đụng** dòng `@layer` và
  `@import "tailwindcss"`.
- `src/shared/lib/mau-thiet-ke.ts` (tạo mới) — `MAU_BIEU_DO`, `MAU_NGU_NGHIA`, file
  thuần, không `"use client"`, không import antd.

### Commit 2 — `cd4222d` (Task 2, DS-02)

File đã sửa/tạo:
- `src/shared/lib/dieu-huong.ts` (tạo mới) — `MUC_DIEU_HUONG`, `timMucDangMo`,
  `locTheoQuyen` (gọi thẳng `coQuyen`, không đổi luật), `tachMucMobile`, `soCotTabDay`.
  File thuần.
- `src/shared/components/icon-dieu-huong.tsx` (tạo mới) — map `MaIcon` sang icon antd.
- `src/shared/components/top-nav.tsx` (tạo mới) — thanh pill xanh, chỉ hiện ≥992px.
- `src/shared/components/thanh-tab-day.tsx` (tạo mới) — thanh tab cố định đáy <992px,
  mục "Khác" mở `Drawer` `placement="bottom"` `size="default"`.
- `src/shared/components/app-shell.tsx` (sửa) — bỏ hẳn `Sider`/nút thu gọn, dựng lại
  quanh `TopNav` + `ThanhTabDay`; đồng thời giải quyết luôn blocker STATE.md
  ("app-shell.tsx còn mô tả phạm vi cũ 5 xưởng") — đã xác nhận không còn từ
  "xưởng"/"sản xuất" trong `src/shared/components/`.

### Commit 3 — `39da902` (Task 3, DS-03)

File đã sửa/tạo/xoá:
- `src/shared/components/bo-cuc-danh-sach.tsx` (tạo mới) — panel trái 264px + bảng
  phải, ngăn kéo `Drawer` `size="large"` cho mobile.
- `src/shared/components/hang-tong-cong.tsx` (tạo mới) — dựng hàng tổng cộng từ chính
  mảng cột truyền cho `Table`.
- `src/features/danh-muc/schemas/bo-loc.schema.ts` (sửa) — thêm `demDieuKien`.
- `src/features/danh-muc/types.ts` (sửa) — thêm `QuyenDanhMuc` (chuyển từ
  `bang-san-pham.tsx` sang, xem mục Deviations).
- `src/features/danh-muc/components/thanh-cong-cu-san-pham.tsx` (tạo mới) — ô tìm.
- `src/features/danh-muc/components/panel-loc-san-pham.tsx` (tạo mới, thế chỗ
  `thanh-loc-san-pham.tsx` đã xoá) — 5 `Select` xếp dọc + nút Xóa bộ lọc.
- `src/features/danh-muc/components/hanh-dong-can-ra.tsx` (tạo mới, NGOÀI plan) —
  tách cụm Badge "Cần rà" + `NutExcel`.
- `src/features/danh-muc/components/alert-can-ra.tsx` (tạo mới, NGOÀI plan) — tách
  `Alert` cảnh báo cần rà.
- `src/features/danh-muc/components/modals-san-pham.tsx` (tạo mới, NGOÀI plan) — gom
  3 modal/ngăn kéo (`GoiYCongDoan`, `NhapExcel`, `NganKeoSanPham`).
- `src/features/danh-muc/components/noi-dung-bang-san-pham.tsx` (tạo mới, NGOÀI plan)
  — tách `<Table>` + `HangTongCong` + ghi chú tồn 0.
- `src/features/danh-muc/components/bang-san-pham.tsx` (sửa) — ghép
  `BoCucDanhSach` + các component trên; còn **199 dòng**.
- `src/features/danh-muc/components/cot-san-pham.tsx` (sửa nhẹ) — thêm
  `className: "tabular-nums"` cho Tồn/Giá bán/Giá vốn.
- `src/features/danh-muc/components/thanh-loc-san-pham.tsx` — **đã xoá**.
- `src/features/doi-tac/types.ts` (sửa) — thêm `demDieuKienDoiTac`.
- `src/features/doi-tac/components/thanh-cong-cu-doi-tac.tsx` (tạo mới) — đổi
  `Input.Search` → `Input` + `prefix={<SearchOutlined/>}`.
- `src/features/doi-tac/components/panel-loc-doi-tac.tsx` (tạo mới) — `Segmented`
  loại đối tác (`block vertical`) + `Select` trạng thái + nút Xóa bộ lọc.
- `src/features/doi-tac/components/bang-doi-tac.tsx` (sửa) — ghép `BoCucDanhSach`,
  `Tag bordered={false}` cho cả Loại và Trạng thái.
- `src/features/doi-tac/components/thanh-loc-doi-tac.tsx` — **đã xoá**.

## Giả định đã đặt (theo yêu cầu plan phải ghi lại)

1. **Tag "Trạng thái" đối tác đổi sang trung tính không viền** — theo đúng chỉ dẫn
   trong plan (mục 9–13, đánh dấu "Giả định"), bỏ màu xanh lá cho "Đang dùng", chỉ còn
   phân biệt bằng chữ "Đang dùng" / "Ngừng", `bordered={false}`.
2. **Hàng tổng cộng chỉ cộng số liệu của trang đang xem** (không phải toàn bộ kết quả
   lọc) — nói rõ bằng `Tooltip` "Cộng các dòng đang hiển thị trên trang này", đúng như
   plan yêu cầu, không bịa là tổng toàn kho.
3. **`Segmented` loại đối tác dùng cả `block` lẫn `vertical`** — plan chỉ viết "dùng
   `block` xếp dọc"; đã kiểm `node_modules/antd/es/segmented/index.d.ts` xác nhận antd
   v6.6.3 có prop `vertical` riêng để xếp dọc thật sự (`block` một mình chỉ kéo full
   width theo chiều ngang). Dùng cả hai để khớp đúng ý "xếp dọc, chiếm hết bề rộng
   panel".

## Chỗ lệch khỏi plan (và vì sao)

1. **`globals.css` dùng hex chữ hoa** (`#1652F0`...) thay vì chữ thường như tôi viết
   lần đầu — script `grep -c "1652F0"` của chính plan phân biệt hoa/thường. Sửa lại
   toàn bộ khối `@theme` sang chữ hoa cho khớp `<bang_mau_da_chot>` đã cho (bảng đó
   vốn đã viết hoa) và để verify script của plan chạy đúng. Không ảnh hưởng hành vi.
2. **Đổi chữ trong 2 dòng comment** ở `mau-thiet-ke.ts` và `dieu-huong.ts` — bản đầu
   viết `// KHÔNG "use client"` và `// không import antd`, nhưng verify script của
   plan dùng `grep -q "use client"` / `grep -q "antd"` trên TOÀN NỘI DUNG file (kể cả
   comment), nên câu giải thích "không có X" lại tự làm script báo dương tính giả.
   Đổi câu chữ (không nêu literal các cụm đó) — file vẫn đúng luật (file thuần, không
   `"use client"`, không import antd), chỉ đổi cách diễn đạt trong comment.
3. **Tách thêm 4 file NGOÀI danh sách `files_modified`** của Task 3
   (`hanh-dong-can-ra.tsx`, `alert-can-ra.tsx`, `modals-san-pham.tsx`,
   `noi-dung-bang-san-pham.tsx`) — sau khi ghép `BoCucDanhSach` + `PanelLocSanPham` +
   `ThanhCongCuSanPham` + `NoiDungBangSanPham` vào `bang-san-pham.tsx`, file này vẫn
   ở mức 286 dòng, vượt ràng buộc "~200 dòng" (`rang_buoc_bat_buoc` #9). Plan tự cho
   phép việc này ở cuối action Task 3: *"Kiểm tra 200 dòng: file nào chạm ngưỡng thì
   tách tiếp theo trách nhiệm."* Đã tách theo đúng trách nhiệm (hành động phụ / cảnh
   báo / modal / nội dung bảng) và đưa `bang-san-pham.tsx` xuống còn 199 dòng.
4. **`QuyenDanhMuc` chuyển từ `bang-san-pham.tsx` sang `features/danh-muc/types.ts`**
   — hệ quả trực tiếp của mục 3: `modals-san-pham.tsx` cần type này nhưng import
   ngược lại từ `bang-san-pham.tsx` sẽ tạo vòng phụ thuộc (dù chỉ là type-only, vẫn
   rủi ro không đáng). Đã `export type { QuyenDanhMuc }` lại từ `bang-san-pham.tsx`
   nên import cũ (nếu có nơi nào dùng) không bị phá — đã kiểm, chỉ có
   `bang-san-pham.tsx` tự dùng, không nơi nào khác import type này.

## Đã kiểm nhưng KHÔNG sửa (out of scope, phát hiện phụ)

Hai script verify của plan báo "dương tính giả" trên các file **không nằm trong phạm
vi 3 task** này (không đụng tới theo đúng SCOPE BOUNDARY):
- `src/features/danh-muc/components/nut-excel.tsx:58` — có DÒNG COMMENT nhắc tới
  `Dropdown.Button` (giải thích lý do KHÔNG dùng nó), khiến `grep -rn "Dropdown.Button"`
  khớp dù không có JSX nào dùng thật. Đã xác nhận không có `<Dropdown.Button>` thật
  trong toàn bộ `src/`.
- `src/features/doi-tac/components/ra-ghi-chu.tsx:232` — dùng `<Input.Search>` thật,
  nhưng file này không nằm trong `files_modified` của Task 3 (nó thuộc màn "Ra ghi
  chú công nợ", không phải thanh công cụ danh sách). `Input.Search` vẫn tồn tại
  trong antd v6.6.3 (đã kiểm `node_modules/antd/es/input/Search.d.ts`), không phải
  API đã bị bỏ — không phải lỗi bẫy 11.

## Còn nợ / chưa làm được

1. **Không mở được trình duyệt thật để xem Console** — môi trường thực thi hiện tại
   không có công cụ trình duyệt/Playwright. Đã làm thay bằng 2 việc:
   - Chạy `npm run dev` + `curl` đủ 5 route (`/`, `/danh-muc`, `/doi-tac`, `/cai-dat`,
     `/dang-nhap`) — tất cả redirect/render đúng (307 khi chưa đăng nhập, 200 khi
     đã đăng nhập qua các vai trò của script).
   - Chạy `npx tsx scripts/kiem-tra-quyen-route.ts` (đăng nhập thật 4 vai trò, load
     nhiều route) — **50/50 ô đúng**, và soát log server (`/tmp/dev-dm4-3.log`) suốt
     các lần render đó bằng `grep -in "warning|deprecated|error"` — **không thấy dòng
     nào** ngoài log request bình thường. Đây là tín hiệu gián tiếp (SSR + server
     log), **không thay thế hoàn toàn** việc mở DevTools Console thật ở trình duyệt
     như bước `<manual>` của Task 2 và Task 3 yêu cầu — đặc biệt các phần chỉ render
     khi tương tác (mở `Drawer` "Khác", mở ngăn kéo "Bộ lọc" trên mobile) chưa được
     test bằng runtime browser thật.
   - **Đề nghị người dùng tự làm trước khi coi DS-02/DS-03 đã xác minh đầy đủ:** mở
     `npm run dev`, đăng nhập, mở Console ở cả 1280px và 390px trên `/`, `/danh-muc`,
     `/doi-tac`, `/cai-dat`; bấm nút "Khác" ở tab đáy; bấm "Bộ lọc (n)" trên mobile;
     đăng nhập bằng tài khoản thủ kho để xác nhận không thấy "Cài đặt" ở cả pill lẫn
     tab đáy.
2. **Dashboard dùng `MAU_BIEU_DO`/`MAU_NGU_NGHIA`** — đúng như plan đã nói trước, chưa
   có màn hình nào dùng hai hằng số này (Phase 5 chưa tới). Card KPI viền trái màu
   cũng chưa có màn hình nào áp dụng.

## Tự kiểm tra (self-check)

```
FOUND: src/providers/antd-theme.ts
FOUND: src/app/globals.css
FOUND: src/shared/lib/mau-thiet-ke.ts
FOUND: src/shared/lib/dieu-huong.ts
FOUND: src/shared/components/icon-dieu-huong.tsx
FOUND: src/shared/components/top-nav.tsx
FOUND: src/shared/components/thanh-tab-day.tsx
FOUND: src/shared/components/app-shell.tsx
FOUND: src/shared/components/bo-cuc-danh-sach.tsx
FOUND: src/shared/components/hang-tong-cong.tsx
FOUND: src/features/danh-muc/components/bang-san-pham.tsx (199 dòng)
FOUND: src/features/doi-tac/components/bang-doi-tac.tsx (184 dòng)
MISSING (đã xoá đúng kế hoạch): src/features/danh-muc/components/thanh-loc-san-pham.tsx
MISSING (đã xoá đúng kế hoạch): src/features/doi-tac/components/thanh-loc-doi-tac.tsx
FOUND commit 4006200
FOUND commit cd4222d
FOUND commit 39da902
```

## Self-Check: PASSED
