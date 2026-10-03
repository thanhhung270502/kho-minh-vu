---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Phản hồi vận hành đợt 2
status: executing
stopped_at: Completed 18-06-PLAN.md
last_updated: "2026-10-03T15:11:55.683Z"
last_activity: 2026-10-03 — Phase 17 Đổi tên & gọn đơn đặt hoàn thành (6/6 plan, verification passed)
progress:
  total_phases: 10
  completed_phases: 6
  total_plans: 128
  completed_plans: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-03)

**Core value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.
**Current focus:** Milestone v1.2 — Phase 17 xong; kế tiếp Phase 18 Đơn nhiều người nhận

## Current Position

Phase: 18 (Đơn nhiều người nhận) — đang thực thi
Plan: 6/8 xong (18-01 mô hình DB, 18-02 RPC đọc 0091, 18-03 hợp đồng TS, 18-04 UI tạo đơn + đầu đơn, 18-05 lưới dòng, 18-06 danh sách/lọc/phiếu lấy hàng)
Status: Executing — kế tiếp 18-07
Last activity: 2026-10-03 — Phase 17 Đổi tên & gọn đơn đặt hoàn thành (6/6 plan, verification passed)

### Phase 17 — đã xong (03/10/2026)

Branch `feature/phase-17-doi-ten` tách từ `main` (chưa push, chưa merge). TEN-01..05, DDAT-01..03 xong.
Kiểm: `npm run check`, test hàm thuần, test đọc Excel, ma trận quyền route 267/267, pgTAP 49 file / 754
test, UAT trình duyệt 10 bước (người dùng xác nhận "đạt").

Hệ quả cần nhớ:

- Route mới `/don-dat`, `/duyet-don`; `/dat-hang/*`, `/hoa-don/*`, `/xuat-kho/*` chuyển hướng một bước trong `next.config.ts`.
- "Duyệt đơn" chỉ là tên màn; chứng từ vẫn gọi "hóa đơn" (A1).
- Migration `0089_ten_hang_ngoai.sql` (dữ liệu) **mới áp ở local** — deploy cloud phải đẩy cùng các migration chưa lên.
- Phiếu lấy hàng: `recipientDisplayName` (chỉ tên), Người đặt, In lúc — Phase 18 sẽ sửa tiếp phần người nhận.
- DB local đã dọn về schema nhánh (gỡ 0085–0088 quy chuẩn, giữ dữ liệu; backup `~/Desktop/kiotviet_local_before_reset_20261003.dump`).
  Quay lại nhánh quy chuẩn cần `migration up --include-all` hoặc merge `main` vào trước.

- **Phase 19 phải xem lại phạm vi**: 0086 (quy chuẩn) xóa bảng `dong_xe`/`loai_hang`, thay bằng cột text trên `san_pham`.

### Milestone v1.2 — bối cảnh lúc mở (03/10/2026)

- Nguồn: phản hồi vận hành 03/10/2026 trên Notion Task board; 3 task bỏ khỏi milestone
  (Đối tác chỉ còn NCC, kiểm tra chịu tải, Phân tích theo kỳ) — vẫn để "Chưa xử lý" trên Notion.

- Branch Phase 10–16 đã merge vào `main` và push. Song song đang làm Quy chuẩn mã hàng trên
  `feature/quy-chuan-ma-b` (ngoài GSD, migration tới 0086) — phải merge trước phase "dòng xe dùng chung".

- v1.1 vẫn chưa `/gsd:complete-milestone`.

### Phase 16 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/16-*`. Branch
`feature/phase-16-chuc-vu` **tách từ `feature/phase-15-import-v2`** (chưa push, chưa merge — merge
10 → 11 → 12 → 13 → 14 → 15 → 16 theo thứ tự): `b3f0e42`, `61d1539`, `226c44f`, `cb4e8a7`.
QUYEN-01..04 xong; kiểm trên Supabase local (`npm run check`, pgTAP 48 file / 748 test, test hàm
thuần, test đọc Excel, ma trận quyền route 220/220, `npm run test:concurrency`, `npm run verify:hook`)
và xem trên trình duyệt.

Hệ quả cần nhớ:

- Mô hình quyền: chức vụ mang **phạm vi** (enum vai_tro: kho, quản trị — theo token, bẫy 6) +
  **9 quyền nghiệp vụ** (`co_quyen()` đọc DB, có hiệu lực ngay). Giao diện dùng `allows(user, …)`
  gộp cả hai (`src/shared/lib/permissions.ts`); `getCurrentUser()` trả `permissions`.

- Quyền nghiệp vụ mới phải đi qua `co_quyen` — đã ghi vào CLAUDE.md bẫy 6.
- `seed:users` ghi `chuc_vu_id` → cần 0082 trước. `luu_ho_so_nguoi_dung` đã bỏ (0084), dùng `luu_nguoi_dung`.
- Còn lỗ `coalesce(vai_tro, 'quan_ly')` ở `huy_duoc_don`, `tao_phieu_tra`, `dat_dinh_muc`,
  `nap_ton_tam`, `tao_phieu_xuat_tu_don`, `xem_duoc_phan_tich`, `sinh_so_ct` — đã tạo việc riêng.

- **`0082`–`0084` mới áp ở local.**

### Việc còn lại của milestone v1.1

- Đẩy migration 0076–0084 lên cloud: xử lý lệch lịch sử migration từ 0072 trước; 0078 dừng nếu dữ
  liệu thật có đơn mang 2 hóa đơn chưa hủy (xem ghi chú Phase 12); chạy lại `npm run seed:users`
  sau 0082 nếu dùng tài khoản mẫu trên cloud.

- Merge 7 branch theo thứ tự 10 → 16 (hoặc mở PR chồng nhau), rồi `/gsd:complete-milestone`.
- Việc treo: "Sửa xuất Excel danh mục bị cắt ở 1.000 mã", vá lỗ coalesce ở RPC ngoài 9 quyền,
  trang xem phiếu điều chỉnh (thẻ kho chưa bấm mở được phiếu DC).

### Phase 15 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/15-*`. Branch
`feature/phase-15-import-v2` **tách từ `feature/phase-14-panel`** (chưa push, chưa merge — merge
10 → 11 → 12 → 13 → 14 → 15 theo thứ tự): `a5c4eac`, `a819032`, `3ebc455`, `b5a5889`. IMP-01..05
xong; kiểm trên Supabase local (`npm run check`, pgTAP 46 file / 719 test, test hàm thuần, test đọc
Excel, ma trận quyền route 205/205, `npm run test:concurrency`) và chạy trọn luồng trên trình duyệt.

Hệ quả cho các phase sau:

- Hai đường Excel song song: "Nhập mã hàng mới" (file 4 cột → `nhap_ma_hang_moi`, chỉ tạo mã) và
  "Cập nhật từ Excel" (mẫu 12 cột / file KiotViet → `nhap_danh_muc`, giữ nguyên).

- Câu lỗi trùng danh mục được chép ở `products/lib/new-product-import.ts` (`CATALOG_REASONS`) —
  đổi câu trong 0081 thì đổi luôn ở đó.

- Chưa có trang xem phiếu DIEU_CHINH: thẻ kho hiện số phiếu nhưng không bấm mở được.
- Phase 16 (chức vụ & quyền) nhớ: quyền nhập mã mới đang là `edit-catalog` + kiểm vai trò trong RPC.
- DB local còn dữ liệu thử ZZT-01/02, phiếu DC26-000001, dòng xe "Wave Alpha".
- **`0081` mới áp ở local.**

### Phase 14 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/14-*`. Branch
`feature/phase-14-panel` **tách từ `feature/phase-13-phan-tich`** (chưa push, chưa merge — merge
10 → 11 → 12 → 13 → 14 theo thứ tự): `37efacc`, `7af573b`, `df98528`. PANEL-01..03 xong; kiểm trên
Supabase local (`npm run check`, pgTAP 45 file / 702 test, test hàm thuần, test đọc Excel, ma trận
quyền route 195/195) và xem trên trình duyệt 1440px + 375px.

Hệ quả cho các phase sau:

- Panel chi tiết dùng chung: `src/shared/components/detail-panel.tsx` + slot `detailPanel` của
  `ListLayout`; mã đang chọn ở `?chon=<uuid>` (`src/shared/lib/selected-id.ts`, bấm vào phần tử
  tương tác hoặc `data-no-row-click` không mở panel). Bảng khác muốn panel thì dùng lại y vậy.

- Thủ kho / chỉ xem KHÔNG thấy khách đặt + dự kiến hết hàng (route chỉ ghép `ProductForecast`
  khi có `view-analysis`). Phase 16 đổi quyền thì nhớ chỗ này.

- `/doi-tac/[id]` đã gỡ, redirect sang `/doi-tac?chon=<id>` trong `next.config.ts`.
- Lịch sử giao dịch đối tác chỉ còn phiếu hệ thống đã ghi sổ — bỏ hẳn nhánh KiotViet.
- **`0080` mới áp ở local.**

### Phase 13 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/13-*`. Branch
`feature/phase-13-phan-tich` **tách từ `feature/phase-12-hoa-don`** (chưa push, chưa merge — merge
10 → 11 → 12 → 13 theo thứ tự): `e8c8462`, `2956ef1`, `223de74`, `30f9515`. PTICH-01..07 xong;
kiểm trên Supabase local (`npm run check`, pgTAP 44 file / 696 test, test hàm thuần, test đọc Excel,
ma trận quyền route 190/190, `npm run test:concurrency`) và xem trang với dữ liệu thử `DEMO-PT`
(đã xóa, DB về đúng trạng thái trước).

Hệ quả cho các phase sau:

- **Phase 14 (panel mã hàng)** dùng lại `phan_tich_ton_kho(p_so_ngay, p_ngay, p_san_pham_id)` cho
  "Khách đặt" + "Dự kiến hết hàng" — cùng con số với trang Phân tích. Lưu ý quyền: RPC chỉ cho
  quản lý + văn phòng (`xem_duoc_phan_tich`); thủ kho / chỉ xem mở panel sẽ nhận 42501 — Phase 14
  phải quyết ẩn trường đó hay nới quyền riêng cho trường hợp một mã.

- **PostgREST cắt mọi request ở 1.000 dòng** (`max_rows`, supabase/config.toml). Màn cần toàn danh
  mục dùng `src/shared/lib/fetch-all-pages.ts`. Nghi nút xuất Excel danh mục đang bị cắt ở 1.000 mã
  — đã tạo việc riêng "Sửa xuất Excel danh mục bị cắt ở 1.000 mã", chưa làm.

- CSV có BOM dùng chung ở `src/shared/lib/csv.ts`.
- Hàm quyền mỏng `xem_duoc_phan_tich()` chờ Phase 16. Đổi ngưỡng: RLS chỉ quản lý.
- `0079` mới áp ở local.

### Phase 12 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/12-*`. Branch
`feature/phase-12-hoa-don` **tách từ `feature/phase-11-nhan-vien`** (chưa push, chưa merge — merge
10 → 11 → 12 theo thứ tự): `e8c1457`, `a32f71d`, `b0e62b5`, `855592d` (+ `ea25386` CLAUDE.md bẫy 11).
DON-01..06 xong; kiểm trên Supabase local (`npm run check`, pgTAP 43 file / 672 test, test hàm thuần,
test đọc Excel, ma trận quyền route 185/185, `npm run test:concurrency` 3 phần) và chạy trọn luồng
trên trình duyệt.

Hệ quả cho các phase sau:

- "Bán" = hóa đơn (XUAT) HOAN_THANH; đơn HOAN_THANH có đúng một hóa đơn chưa hủy (unique index
  `uq_chung_tu_hoa_don_cua_don`). Phase 13 tính ADU / khách đặt dựa trên mô hình này: khách đặt
  = dòng của đơn DA_XAC_NHAN (và TAM nếu muốn), không còn "đã xuất một phần".

- Client không gọi thẳng `tao_phieu_xuat_tu_don` nữa — chỉ qua `hoan_thanh_don`.
- Hàm quyền mỏng `hoan_thanh_duoc_don()` / `huy_duoc_don()` → Phase 16 thay ruột bằng quyền theo
  chức vụ (Hoàn thành, Hủy). `xac_nhan_don` / `mo_khoa_don` / `dong_don_som` vẫn kiểm vai trò
  trực tiếp — Phase 16 nên gói tương tự.

- **`0078` mới áp ở local.** Đẩy lên cloud: xử lý lệch migration từ 0072 trước; 0078 dừng nếu dữ
  liệu thật có đơn mang 2 hóa đơn chưa hủy (hủy hóa đơn thừa bằng tay). Phiếu nháp cũ gắn đơn bị
  migration hủy.

- Lỗ hổng memory "đơn → phiếu xuất" (01/10) đã đóng.
- Còn treo: ghi chú Notion "Không hiện" dưới mục tạo đơn — chờ người dùng làm rõ.

### Phase 11 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không có thư mục `.planning/phases/11-*`. Branch
`feature/phase-11-nhan-vien` **tách từ `feature/phase-10-don-dep`** (chưa push, chưa merge —
merge Phase 10 trước): `c15464c`, `4382a70`, `112f849`, `f2f53e2`. NVPT-01..04 xong; kiểm trên
Supabase local (`npm run check`, pgTAP 42 file / 647 test, test hàm thuần, test đọc Excel, ma
trận quyền route 180/180).

Hệ quả cho các phase sau:

- Người nhận nội bộ = `nhan_vien_phu_trach` (migration `0077`, giữ tên cột `nguoi_nhan_id`).
  `danh_sach_nguoi_nhan_noi_bo()` trả `id, ten_viet_tat, ten_day_du`. Phase 12 dựng trên đây.

- **`0077` mới áp ở local.** Cloud còn lệch lịch sử migration từ 0072 và nhiều khả năng chưa
  có 0076 — phải xử lý chỗ lệch rồi mới `db:push`, hỏi người dùng trước.

- Nhóm hàng / ĐVT / Công đoạn rời Cài đặt → modal "Danh mục phụ" ở Danh sách hàng hóa (route
  ghép qua prop `extraActions`); URL cũ chuyển về `/danh-muc`. Phase 15 (import v2) dùng lại
  `LookupSelect` / `QuickLookupModal` trong `features/products` cho dropdown từng dòng.

- Văn phòng vào `/cai-dat` mở tab Nhân viên phụ trách (tab duy nhất của vai trò này).
- `product-drawer.tsx` ~420 dòng (vượt ~200 từ trước) — nên tách khi đụng lại.
- Sinh type từ local: `npm run db:types:local` hỏng ở máy này; dùng
  `npx supabase gen types typescript --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres --schema public`.

### Phase 10 — đã xong (02/10/2026)

Làm theo `/spartan:quickplan`, không qua `/gsd:execute-phase` nên **không có thư mục
`.planning/phases/10-*` hay PLAN/SUMMARY**. Code nằm trên branch `feature/phase-10-don-dep`
(chưa push, chưa merge vào `main`): `643550f`, `d43643f`, `514ddd4`, `a5b72ed`, `255080d`.
GON-01..07 xong; kiểm trên Supabase local (`npm run check`, test hàm thuần, test đọc Excel,
ma trận quyền route 165/165).

Hệ quả cho các phase sau:

- Route xuất đổi `/xuat-kho` → `/hoa-don` (redirect trong `next.config.ts`). Phase 12 dựng trên `/hoa-don`.
- `/ton-kho` và `/ton-kho/nap-tam` đã gỡ; `/ton-kho/dinh-muc` tạm giữ, vào bằng nút "Định mức"
  ở Danh sách hàng hóa → Phase 13 chuyển vào `/phan-tich`, thêm mục "Phân tích" vào menu.

- Quyền UI `view-cost`, `edit-sale-price`, `load-provisional-stock` đã bỏ khỏi `permissions.ts`.
- **Nạp tồn tạm từ KiotViet không còn giao diện** — ghi chú v1.0 bên dưới ("nạp tồn tạm là
  việc vận hành bắt buộc trước go-live") phải chốt lại: tồn đầu kỳ đi bằng kiểm kê (KKE-04 /
  DLIEU-06), hoặc chạy RPC `nap_ton_tam` bằng script nếu vẫn cần.

Kế tiếp (sau Phase 16): milestone v1.1 xong — xem "Việc còn lại của milestone v1.1" ở trên.
Migration kế tiếp là `0085`.

### Việc v1.0 còn treo (giữ nguyên, chạy song song)

Phase: 8
tự động, đang chờ checkpoint)
Plan: Not started
phiên + danh sách phiên kiểm kê, route /kiem-ke; xem 06-10-SUMMARY.md)
trả lời "đạt" (cả 10 mục), NHƯNG lúc 15:01 UTC database chưa có nạp tồn tạm (0 DIEU_CHINH,
ton_kho 0 dòng khác 0), chưa duyệt định mức nào — xem 05-11-SUMMARY.md. Nạp tồn tạm + duyệt
định mức là việc vận hành bắt buộc trước go-live.
Ngoài phạm vi đã sửa trong lúc chạy: `c51391d` (client nhập Excel/giá vốn đầu kỳ đọc
`ketQua` sau khi route đổi sang `result` ở 9ec9b1f — lỗi đã lên production),
`55d0b29` (Statistic valueStyle), `2222851` (thủ kho thấy cột 0 giả của kho khác).
04-05, 04-09, 04-11, 04-12, 04-13, 04-14, 04-15 CHƯA có SUMMARY.md (đều đang mở
checkpoint kiểm mắt, xem ghi chú dưới — 04-15 Task 1-3 đã xong và có commit
thật, chỉ còn Task 4 chờ người dùng)

_Sửa lại 2026-09-20: vị trí trước đó ghi nhầm "Phase 02 Plan 7/21" — Phase 02 thực
tế đã xong toàn bộ 21/21 plan (xem .planning/phases/02-khung-ung-dung/*-SUMMARY.md),
Phase 03 cũng đã xong (03-SUMMARY.md). Con số này trôi từ phiên trước, không phải do
plan 04-01 gây ra — sửa lại cho khớp thực tế khi thực thi 04-01._

_Ghi lại 2026-09-20 khi thực thi 04-06: `04-05-PLAN.md` có `autonomous: false` —
Task 1/2 (rút lớp `features/documents`, nối lại `stock-in`) đã có commit thật
(`819ef7e`, `7a6044f`), nhưng Task 3 là `checkpoint:human-verify` (mở `/nhap-kho`
trên trình duyệt, sáu bước kiểm mắt) vẫn CHƯA có ai trả lời — nên plan 04-05 chưa
đóng, chưa có `04-05-SUMMARY.md`. Plan 04-06 (`src/features/sales-order/`) không
phụ thuộc kết quả checkpoint đó nên được thực thi trước, độc lập. **Việc còn treo:**
mở `http://localhost:3000/nhap-kho`, làm đúng sáu bước ở `04-05-PLAN.md` Task 3,
rồi mới coi Wave 5 của Phase 4 là xong hẳn. `04-07` trở đi (giao diện đơn) dùng
lớp dữ liệu của `04-06`, không bị chặn bởi checkpoint này._

_Ghi lại 2026-09-20 khi thực thi 04-07: câu trên đoán sai — `04-07-PLAN.md` không
phải giao diện đơn, mà là lớp dữ liệu (`src/features/stock-out/` +
`src/features/returns/`) cho phiếu xuất và phiếu trả, mỏng trên `features/documents`
của `04-05`. Tám file mới, chưa có component nào. Cũng độc lập với checkpoint
`04-05` còn mở (chỉ dùng code đã commit của 04-05, không phụ thuộc bước kiểm mắt).
`postIssue` lưu `ly_do_xuat_am` vào đầu phiếu TRƯỚC khi gọi ghi sổ (thứ tự bắt buộc,
sai thì ghi sổ trả 23514 dù đã chọn lý do). pgTAP vẫn 324/0/0 — plan này không đụng
migration. Việc treo của `04-05` vẫn y nguyên, chưa ai đóng._

_Ghi lại 2026-09-20 khi thực thi 04-08: plan UI đầu tiên của Phase 4 — route
`/dat-hang` (danh sách đơn, bộ lọc trên URL) + `PartnerSearchInput` dùng chung ở
`shared/components/` (tìm người nhận server-side, tạo đối tác mới tại chỗ) +
`CreateOrderButton` (cấp số qua `sinh_so_dh`, chuyển sang `/dat-hang/{id}`). Đã
thêm `/dat-hang` vào `scripts/test-route-permissions.ts` luôn (70/70 ô đúng),
sớm hơn dự kiến của `04-CONTEXT.md` (vốn để dành 04-15) — 04-15 không cần làm
lại route này nữa. **Chưa kiểm bằng mắt trên trình duyệt** — agent không có
trình duyệt, chỉ xác nhận `npm run check` xanh, build liệt kê đúng route, và
một lượt GET có cookie phiên thật trả 200 không có error boundary. Người dùng
cần tự mở `/dat-hang` một lần trước khi coi Wave 7 là xong hẳn. Việc treo của
`04-05` vẫn y nguyên, không liên quan tới plan này._

_Ghi lại 2026-09-20 khi thực thi 04-09 (CHƯA XONG — checkpoint đang mở): Task
1–3 đã có commit thật (`6ad2f78` route + khung trang, `d555b16` đầu đơn sửa tại
chỗ, `fafd21b` bảng dòng gõ bàn phím) cộng `7da1d77` (thêm `/dat-hang/[id]` vào
`scripts/test-route-permissions.ts`, dùng `danh_sach_don` để lấy id thật — hiện
`don_dat_hang` vẫn 0 dòng nên script tự bỏ qua dòng đó, không giả vờ đã kiểm;
70/70 ô còn lại vẫn đúng). `npm run check` xanh toàn bộ. `order-line-table.tsx`
vượt 200 dòng nên tách thành ba file: `order-line-table.tsx` (điều phối +
hook), `order-line-columns.tsx` (cấu hình cột thuần), `order-line-entry-row.tsx`
(hàng nhập liệu bàn phím) — không đổi hành vi, chỉ tách theo trách nhiệm.
**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng.** Agent
không có trình duyệt, không được tự đánh giá thay. Người dùng cần tự mở
`http://localhost:3000/dat-hang`, tạo một đơn thử, rồi làm đúng bảy bước ở
`04-09-PLAN.md` Task 4 (gõ mã → Enter → số lượng → Enter → dòng lưu, con trỏ
quay về ô mã; gõ mã đầy đủ Enter ngay phải chọn đúng mã đó — bẫy 15; sửa ngày
giao dự kiến rồi tải lại trang; thu cửa sổ dưới 992px). **Chưa có
`04-09-SUMMARY.md`, `STATE.md` chưa tăng bộ đếm plan hoàn thành** — chỉ đóng
khi người dùng trả lời "đạt" hoặc mọi bước lệch đã sửa xong._

_Ghi lại 2026-09-20 khi thực thi 04-10 (XONG — cả hai task autonomous, không có
checkpoint): route `/xuat-kho` (danh sách phiếu xuất, khuôn 1:1 `/dat-hang` của
04-08) + `CreateIssueButton` (XUAT-02, tạo phiếu không cần đơn, cấp số qua
`sinh_so_ct`). **Phát hiện trước khi code (đọc kỹ migration 0045 theo
`<read_first>`):** RPC `danh_sach_chung_tu` dùng chung ba chiều nhập/xuất/trả
KHÔNG trả `don_dat_hang_id`/`so_dh`, nên cột "Đơn gốc" mà plan yêu cầu không có
sẵn trên `IssueRow` như văn bản plan ngầm giả định. Thay vì sửa chữ ký RPC
(đòi `DROP FUNCTION` + `db:push` lên database thật — loại migration CLAUDE.md
yêu cầu hỏi trước), `IssueRow` được mở rộng thêm `orderId`/`orderNo` và
`issue.api.ts` tự nối bằng hai lượt đọc riêng (`chung_tu.don_dat_hang_id` rồi
`don_dat_hang.so_dh` — cả hai bảng đã có policy SELECT theo phạm vi từ 0016,
không cần quyền mới, không cần migration). Thêm `/xuat-kho` vào
`scripts/test-route-permissions.ts` ngay trong plan này (giống 04-08 làm sớm
với `/dat-hang`) — **75/70 → 75/75 ô đúng**. `npm run check` xanh toàn bộ.
**Chưa kiểm bằng mắt trên trình duyệt** — agent không có trình duyệt. **Lưu ý
cho người kiểm:** `CreateIssueButton` điều hướng `router.push("/xuat-kho/{id}")`
nhưng route đó (trang chi tiết phiếu xuất) CHƯA tồn tại — 04-11 mới tạo, đúng
thứ tự như `CreateOrderButton`/`04-09` trước đó. Bấm "Tạo phiếu xuất" lúc này
sẽ tạo phiếu thật trên database rồi văng 404 — không phải lỗi, nhưng người kiểm
cần biết trước. Việc treo của `04-05` và `04-09` vẫn y nguyên, không liên quan
tới plan này._

_Ghi lại 2026-09-20 khi thực thi 04-11 (CHƯA XONG — checkpoint đang mở): Task
1–3 đã có commit thật (`37f9933` route `/xuat-kho/[id]` + khung trang chi tiết,
`c9f6817` đầu phiếu sửa tại chỗ, `35c5001` bảng dòng gõ bàn phím + kho từng
dòng + tô màu vượt tồn) cộng `de23759` (thêm `/xuat-kho/[id]` vào
`scripts/test-route-permissions.ts`, dùng `layIdPhieuXuat()` lấy id thật —
**80/80 ô đúng**, route mới được kiểm qua cả 4 vai trò thật). `npm run check`
xanh toàn bộ.

**Hai deviation Rule 1/3 đáng chú ý:** (1) `issue-line-table.tsx` vượt 200
dòng, tách thành ba file giống khuôn `order-line-table` của 04-09
(`issue-line-table` điều phối, `issue-line-columns` cấu hình cột thuần,
`issue-line-entry-row` hàng nhập liệu bàn phím). (2) Acceptance criteria của
Task 3 cấm chuỗi `unitPrice` xuất hiện trong `issue-line-table.tsx`, nhưng
`chung_tu_dong` (dùng chung với `stock-in`) vẫn đòi trường giá ở tầng
database — chuyển việc ép `unitPrice = 0` vào `useAddIssueLine`/
`useUpdateIssueLine` trong `hooks/useIssues.ts` (không nằm trong
`files_modified` của plan, nhưng cần thiết để bảng dòng phía UI không phải
biết tới khái niệm giá cả).

**Đã tự tạo một phiếu xuất thật để kiểm chứng ngoài `npm run check`** (agent
không có trình duyệt): `PX26-000001` (id `3866e4c0-8481-42b4-b6a1-d2760ed5cc90`,
trạng thái `NHAP_LIEU`, kho "Kho 1", đối tác "LÂM CHIÊU THÁI"), một dòng mã
`LGPCX` số lượng 999999 trong khi tồn kho đó = 0 — cố ý để có sẵn kịch bản
"vượt tồn" cho người kiểm Task 4 khỏi phải tự gõ số lớn. Đã xác nhận qua
`curl` với cookie phiên thật (4 vai trò + khách) rằng route trả đúng
200/404/chuyển hướng, không có "Application error", `<title>` đúng
"Phiếu xuất · Kho Minh Vũ". **Chưa xác nhận bằng mắt** hành vi bàn phím, tô
màu, Tooltip, hay responsive dưới 992px — đó là đúng phạm vi checkpoint Task 4.

**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng.** Agent
không có trình duyệt, không được tự đánh giá thay. Người dùng cần tự mở
`http://localhost:3000/xuat-kho/3866e4c0-8481-42b4-b6a1-d2760ed5cc90` (phiếu
đã tạo sẵn ở trên) hoặc tạo phiếu mới từ `/xuat-kho`, rồi làm đúng bảy bước ở
`04-11-PLAN.md` Task 4. **Chưa có `04-11-SUMMARY.md`, STATE.md chưa tăng bộ
đếm plan hoàn thành** — chỉ đóng khi người dùng trả lời "đạt" hoặc mọi bước
lệch đã sửa xong, theo đúng tiền lệ của `04-05`/`04-09`._

_Ghi lại 2026-09-20 khi thực thi 04-12 (CHƯA XONG — checkpoint đang mở): Task
1-3 đã có commit thật (`e89d5bf` nút xác nhận/mở khóa/đóng sớm +
`order-status-dialog.tsx`, `e65653f` nút "Tạo phiếu xuất" gọi
`tao_phieu_xuat_tu_don`, `0e6068a` mẫu in phiếu đi lấy hàng + route
`/dat-hang/[id]/in` + hàm thuần `group-lines-by-warehouse.ts`). `npm run
check` xanh toàn bộ ở cả ba lần commit riêng. Thêm `/dat-hang/[id]/in` vào
`scripts/test-route-permissions.ts` (cùng quyền xem với `/dat-hang/[id]`,
T-04-61 chấp nhận thu_kho/chi_xem mở thẳng tờ đi lấy hàng) — **90/90 ô đúng**
sau khi tạo dữ liệu thử.

**Đã tự tạo một đơn thật để kiểm chứng ngoài `npm run check`** (agent không có
trình duyệt): `DH26-000001` (id `7edccba7-17da-411d-a287-fec641e6e25a`,
trạng thái `TAM`, đối tác "Khách lẻ"), bốn dòng trải trên **hai kho khác
nhau** (`LGPCX` số 5 + `HSP-20A-I` số 3 tại Kho 1; `VITAL165` số 7 +
`VITAL164` số 2 tại Kho 2) — đúng kịch bản "ít nhất 4 dòng, hai kho khác
nhau" mà bước 1 của checkpoint Task 4 cần, để người kiểm khỏi phải tự gõ đơn
mới. Đã xác nhận qua gọi HTTP với cookie phiên thật (`quan_ly`) rằng cả
`/dat-hang/{id}` và `/dat-hang/{id}/in` trả 200, không có "Application
error", `<title>` đúng "Đơn đặt hàng · Kho Minh Vũ" và "In phiếu đi lấy hàng
· Kho Minh Vũ". **Chưa xác nhận bằng mắt** thứ tự nhóm theo kho khi in
(Ctrl+P), hành vi nút ẩn/hiện theo vai trò, modal lý do mở khóa/đóng sớm, hay
luồng "Tạo phiếu xuất" — đó là đúng phạm vi checkpoint Task 4.

**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng.** Agent
không có trình duyệt, không được tự đánh giá thay. Người dùng cần tự đăng
xuất/đăng nhập lần lượt `vanphong@khominhvu.local` rồi
`quanly@khominhvu.local`, mở `http://localhost:3000/dat-hang/7edccba7-17da-411d-a287-fec641e6e25a`
(đơn đã tạo sẵn ở trên), rồi làm đúng tám bước ở `04-12-PLAN.md` Task 4.
**Chưa có `04-12-SUMMARY.md`, STATE.md chưa tăng bộ đếm plan hoàn thành** —
đúng tiền lệ của `04-05`/`04-09`/`04-11`: không tạo SUMMARY.md khi checkpoint
còn mở, để `state update-progress`/`roadmap update-plan-progress` (đếm theo
số file SUMMARY.md có trên đĩa) không báo nhầm phase đã tiến thêm một plan.
Chỉ đóng khi người dùng trả lời "đạt" hoặc mọi bước lệch đã sửa xong._

_Ghi lại 2026-09-20 khi thực thi 04-13 (CHƯA XONG — checkpoint đang mở): Task
1-3 đã có commit thật (`efff155` gợi ý mã gần giống + nút đề nghị gộp
`similar-code-hint.tsx` (D-14), `f96db09` khối chọn lý do xuất âm
`negative-stock-panel.tsx` (D-11), `8aea54d` nút ghi sổ + hủy phiếu xuất +
nâng `PostingSummary` lên `shared/components/`). Thứ tự commit đảo Task 2
trước Task 1 so với thứ tự trong PLAN — `negative-stock-panel.tsx` (Task 1)
import thẳng `SimilarCodeHint` (Task 2) nên phải có file đó trước để mỗi
commit tự build được độc lập; nội dung từng task không đổi so với đặc tả.
`npm run check` xanh toàn bộ ở cả ba lần commit riêng, `scripts/test-route-permissions.ts`
vẫn **90/90 ô đúng** sau khi tạo dữ liệu thử (không có route mới ở plan này).

**Hai deviation ngoài `files_modified` của plan, cả hai đều Rule 1/3 (cần
thiết để hoàn thành task, không đổi hợp đồng đã có):**

1. `hooks/useIssues.ts` thêm `useClearNegativeReason` (nút "Bỏ chọn lý do"
   của Task 1 cần, plan không liệt kê hook mới nhưng mô tả hành vi đòi hỏi nó).

2. `api/issue.api.ts` đổi `proposeMerge` từ trả `Promise<void>` sang
   `Promise<{ id, createdAt }>` — cần `createdAt` để giao diện phân biệt "vừa
   ghi" (hiện thông báo thành công) với "đã ghi từ trước" (hiện thông báo
   thông tin) khi bấm lại đúng cặp mã lần hai, đúng yêu cầu bước 4 của
   checkpoint. So sánh bằng ngưỡng 5 giây kể từ `created_at` — không có cách
   nào khác phân biệt hai trường hợp từ giá trị RPC trả về (unique index có
   điều kiện của 0055 chủ ý trả cùng một dòng cho cả hai lần gọi).

**Đã nâng `PostingSummary` từ `features/stock-in/components/` lên
`shared/components/posting-summary.tsx`** (lần dùng thứ hai, đủ điều kiện
theo CLAUDE.md) — component giữ khung chung (`docNo`, `headline`, `children`,
cảnh báo), mỗi chiều chứng từ tự soạn nội dung con: `stock-in` giữ nguyên
"tồn sẽ tăng ở kho nào", `stock-out` thêm mới "nhắc lại từng dòng vượt tồn +
lý do xuất âm + tiến độ đơn liên quan". `post-receipt-button.tsx` đã đổi
import, file cũ `features/stock-in/components/posting-summary.tsx` đã xóa —
`grep -rln "PostingSummary" src/` chỉ còn hai chỗ (component dùng chung +
nơi gọi mới của stock-in; stock-out gọi trực tiếp `post-issue-button.tsx`).

**Đã tự tạo dữ liệu thử để kiểm chứng ngoài `npm run check`** (agent không có
trình duyệt): hai mã `PX-UAT-A` (tồn 0) / `PX-UAT-B` ("Nhông xích 428" /
"Nhong xich 428 loai 2" — tên gần giống đúng kịch bản D-14), nhập kho
`PX-UAT-B` 50 cái ở Kho 1 qua một phiếu nhập thật đã ghi sổ (`PN26-000002`,
id `a813aa2f-f451-4e17-8dfa-1a1852b627c7` — đi qua đúng luồng ghi sổ, không
ghi thẳng vào `ton_kho`, giữ nguyên tắc kiến trúc số 1). Đã tạo sẵn một phiếu
xuất `PX26-000002` (id `f04caf4c-6190-4395-8eaa-b69ac8b59282`, trạng thái
`NHAP_LIEU`, kho "Kho 1", đối tác "Khách lẻ", một dòng `PX-UAT-A` số lượng 10
trong khi tồn 0) — đúng kịch bản bước 1-8 của checkpoint Task 4, người kiểm
mở thẳng phiếu này thay vì phải tự tạo. Đã xác nhận qua cookie phiên thật
(`van_phong` và `quan_ly`) rằng `/xuat-kho/f04caf4c-6190-4395-8eaa-b69ac8b59282`
trả 200, không có "Application error", `<title>` đúng "Phiếu xuất · Kho Minh
Vũ". **Chưa xác nhận bằng mắt** khối lý do xuất âm, gợi ý mã gần giống, hộp
tóm tắt trước khi ghi sổ, hay luồng hủy phiếu — đó là đúng phạm vi checkpoint
Task 4.

**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng.** Agent
không có trình duyệt, không được tự đánh giá thay. Người dùng cần đăng nhập
`vanphong@khominhvu.local`, mở
`http://localhost:3000/xuat-kho/f04caf4c-6190-4395-8eaa-b69ac8b59282` (phiếu
đã tạo sẵn ở trên), rồi làm đúng mười một bước ở `04-13-PLAN.md` Task 4 (bấm
"Đề nghị gộp hai mã" với gợi ý `PX-UAT-B`, chọn lý do "Mã bị tách", ghi sổ,
kiểm tồn `PX-UAT-A` xuống −10, đăng nhập `quanly@khominhvu.local` hủy phiếu
rồi kiểm tồn về 0). **Chưa có `04-13-SUMMARY.md`, STATE.md chưa tăng bộ đếm
plan hoàn thành** — đúng tiền lệ của `04-05`/`04-09`/`04-11`/`04-12`: không
tạo SUMMARY.md khi checkpoint còn mở. Chỉ đóng khi người dùng trả lời "đạt"
hoặc mọi bước lệch đã sửa xong. Dọn dẹp cuối: đánh dấu `PX-UAT-A`/`PX-UAT-B`
ngừng kinh doanh sau khi kiểm xong, như đã làm với `PN-UAT-A`/`PN-UAT-B` ở
Phase 3._

_Ghi lại 2026-09-20 khi thực thi 04-14 (CHƯA XONG — checkpoint đang mở): Task
1-3 đã có commit thật (`42ad963` mẫu in phiếu giao hàng + route
`/xuat-kho/[id]/in`, `c2ef88f` nút trả hàng + nâng cấp hạ tầng dùng chung,
`1232834` trang chi tiết phiếu trả `/tra-hang/[id]`) cộng `3f16905` (thêm hai
route mới vào `scripts/test-route-permissions.ts` ngay ở plan này, giống tiền
lệ `04-08`/`04-10` — **100/100 ô đúng**). `npm run check` xanh toàn bộ ở cả
bốn lần commit riêng.

**Deviation Rule 1/3 lớn nhất — nâng bốn thứ từ `features/stock-out` lên
`features/documents/` thay vì chép lại cho `features/returns`:**
`PostIssueButton`→`PostDocumentButton`, `VoidIssueDialog`→`VoidDocumentDialog`,
`negative-stock-panel.tsx`, và `lib/negative-reasons.ts` (+ `negativeReasonSchema`
từ `issue.schema.ts`, + `exceedsStock` từ `stock-out/types.ts`). Lý do bắt
buộc, không phải tùy chọn: plan 04-14 tự nêu hai lựa chọn ("dùng lại nếu đủ
tổng quát, hoặc nâng lên `features/documents/components/`") nhưng
`usePostIssue`/`useVoidIssue` cũ gắn cứng vào `issueKeys` (cache riêng của
`stock-out`) nên không thể tái dùng thẳng cho phiếu trả mà không làm sai cache
— và CLAUDE.md cấm "feature import trực tiếp từ thư mục nội bộ của feature
khác", nên chỉ còn đường nâng lên. Hàm ghi sổ/hủy/lý do xuất âm giờ tổng quát
theo `document.docType` (`lib/doc-type-labels.ts`: `DOC_TYPE_ACTION_LABEL`,
`DOC_TYPE_STOCK_VERB`, `documentCanGoNegative()` — chỉ `XUAT`/`TRA_NCC` mới
hỏi lý do xuất âm, `TRA_KHACH` làm tồn TĂNG nên không bao giờ cần). `stock-out`
(`hooks/useIssues.ts`, `api/issue.api.ts`, `types.ts`, `schemas/issue.schema.ts`)
đổi sang gọi/re-export từ `features/documents`, hành vi giữ nguyên y hệt
trước — xác nhận bằng `npm run check` xanh và `grep -rln "PostIssueButton"`
trả rỗng (không còn định nghĩa cũ nào sót lại).

**Một đơn giản hóa nhỏ ngoài `files_modified`:** `issue-detail.tsx` bỏ khối
"Từ chứng từ {so_ct_goc}" (dành cho trường hợp view này lỡ tải một chứng từ
`TRA_*`) — comment gốc của 04-11 để ngỏ khả năng dùng chung view này cho màn
phiếu trả, nhưng 04-14 đã dựng `ReturnDetailView` riêng (`features/returns`)
nên nhánh đó không còn đường nào gọi tới, giữ lại chỉ là code chết.

**Đã tự tạo MỘT phiếu trả thật qua RPC (không phải migration)** để có id thật
cho `scripts/test-route-permissions.ts`: gọi
`tao_phieu_tra('a813aa2f-f451-4e17-8dfa-1a1852b627c7')` (chứng từ gốc
`PN26-000002`, đã `HOAN_THANH` từ trước) → sinh `TN26-000002` (`TRA_NCC`, id
`2fbb4d99-d765-4baf-bc14-7d8c885d8e5a`, trạng thái `NHAP_LIEU`, 1 dòng số
lượng 50 bê từ dòng gốc). **Chưa ghi sổ, chưa kiểm bằng mắt** — chỉ dùng để
route-permission script có route thật để gọi, KHÔNG phải dữ liệu thử của
checkpoint Task 4 (checkpoint tự tạo `TRA-UAT-A` riêng theo kịch bản của nó).
Người kiểm cần biết `TN26-000002` tồn tại trên database khi rà danh sách
chứng từ, tránh nhầm với dữ liệu tự tạo.

**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng.** Agent
không có trình duyệt, không được tự đánh giá thay. Người dùng cần tạo mã thử
`TRA-UAT-A` (nhập kho 100 cái ở Kho 1), đăng nhập `vanphong@khominhvu.local`,
mở DevTools Console, rồi làm đúng mười một bước ở `04-14-PLAN.md` Task 4 (in
phiếu giao hàng bản nháp/đã ghi sổ, "Khách trả hàng" tồn tăng, "Trả hàng NCC"
tồn giảm kèm lý do xuất âm khi vượt tồn, hủy phiếu trả bằng `quan_ly`, nút trả
hàng ẩn khi chứng từ gốc chưa ghi sổ). **Chưa có `04-14-SUMMARY.md`, STATE.md
chưa tăng bộ đếm plan hoàn thành** — chỉ đóng khi người dùng trả lời "đạt"
hoặc mọi bước lệch đã sửa xong, theo đúng tiền lệ của `04-05`/`04-09`/`04-11`/
`04-12`/`04-13`. Dọn dẹp cuối cùng ghi vào SUMMARY: `TRA-UAT-A` và `TN26-000002`._

_Ghi lại 2026-09-20 khi thực thi 04-15 (CHƯA XONG — checkpoint đang mở, plan
CUỐI của Phase 4): Task 1-3 đã có commit thật (`2fc5ecd` thêm "Đặt hàng"/"Xuất
kho" vào `NAV_ITEMS` + icon `ShoppingCartOutlined`/`ExportOutlined` (không cài
thư viện mới) + tính lại `mobilePriority` (`/` 1, `/xuat-kho` 2, `/nhap-kho` 3,
`/dat-hang` 4 — kho làm phiếu xuất nhiều nhất, `/danh-muc`/`/doi-tac` chuyển
vào "Khác"), `c2388bc` sửa comment sai "requirePermission() ... VÀ proxy.ts"
(proxy.ts không có kiểm tra vai trò nào) + xác nhận **100/100 ô đúng** —
bảy route Phase 4 đã được thêm sẵn từ 04-08/04-10/04-11/04-12/04-14, plan này
chỉ còn việc dọn câu comment, `ebe987e` sửa `REQUIREMENTS.md`: DDH-03 viết lại
theo trục duyệt `TAM → DA_XAC_NHAN → HOAN_THANH` (D-04), đánh dấu xong
XUAT-06/XUAT-07. **`ROADMAP.md` không cần sửa** — mục Phase 4 đã có sẵn
"15 plans" + đủ danh sách 15 wave từ lần chạy `roadmap update-plan-progress`
trước đó (khớp đúng 8 plan có SUMMARY.md hiện tại), không còn `TBD`.

**Phát hiện ngoài phạm vi, đã ghi vào
`.planning/phases/04-don-dat-hang-phieu-xuat/deferred-items.md` thay vì tự
sửa** (SCOPE BOUNDARY — không phải route do Phase 4 tạo): đối chiếu
`find "src/app/(app)" -name "page.tsx"` với `MA_TRAN` phát hiện năm route từ
Phase 2 (`/cai-dat/cong-doan`, `/cai-dat/don-vi-tinh`, `/cai-dat/kho`,
`/danh-muc/[id]`, `/doi-tac/[id]`) chưa có dòng riêng trong ma trận quyền.
`/khong-du-quyen` không phải gap — trang không gọi `requirePermission()`.

**Bộ kiểm cuối chạy thật, số liệu thật** (dev server đã chạy sẵn ở cổng 3000):
`npm run check` exit 0 (typecheck + lint + build); pgTAP chạy trực tiếp bằng
`psql "$DATABASE_URL" -f <file>` cho cả 25 file `supabase/tests/*.sql` (Docker
treo trên máy này, không dùng `npm run db:test:linked`) — **324 ok / 0 not ok /
0 ERROR**; `npm run verify:hook` ✓ 5/5 tài khoản; `npx tsx
scripts/test-pure-functions.ts` ✓; `npx tsx scripts/test-excel-reader.ts` ✓;
`npx tsx scripts/test-route-permissions.ts` ✓ **100/100 ô đúng** (không có
route nào bị bỏ qua vì thiếu dữ liệu — đơn, phiếu xuất, phiếu trả đều đã có
dữ liệu thật từ các plan trước).

**Task 4 là `checkpoint:human-verify` (gate="blocking") — CHƯA đóng, và đây
cũng là checkpoint CUỐI của Phase 4.** Agent không có trình duyệt, không được
tự đánh giá thay. Người dùng cần làm đúng tám bước ở `04-15-PLAN.md` Task 4
(kiểm menu "Đặt hàng"/"Xuất kho" theo vai trò, thanh tab đáy 375px 4 ô + "Khác",
`findActiveHref` đúng ở `/dat-hang/{id}/in`, quyết định dữ liệu thử còn lại
trên database thật, và báo trạng thái ba việc WU-0 — rà 17 tên lớn thành đối
tác, gán `kho_mac_dinh_id` cho 4 mã còn thiếu, xóa 3 bản ghi rác UAT Phase 2).
**Chưa có `04-15-SUMMARY.md`, STATE.md chưa tăng bộ đếm plan hoàn thành, Phase
4 CHƯA được coi là xong** — ngoài checkpoint của chính 04-15, sáu checkpoint
của `04-05`/`04-09`/`04-11`/`04-12`/`04-13`/`04-14` cũng vẫn đang mở, chưa ai
trả lời. Chỉ đóng khi người dùng trả lời "đạt" cho từng plan hoặc mọi bước
lệch đã sửa xong._

_Ghi lại 2026-09-21 khi thực thi 05-01 (XONG — cả hai task autonomous, không có
checkpoint, plan ĐẦU của Phase 5): migration `0058_rpc_ton_kho.sql` (RPC
`public.danh_sach_ton_kho` — 10 tham số, 15 cột trả về, pivot tồn theo kho vào
`ton_theo_kho jsonb` thay vì cột cố định, chép khuôn preamble/CTE/phân trang
của `danh_sach_san_pham` 0030, thủ kho tự giới hạn phạm vi kho ngay trong CTE
`ton`, không có cột giá vốn/giá trị tồn theo D-02) + pgTAP
`32_danh_sach_ton_kho_test.sql` (10 assertion: pivot jsonb, lọc `p_kho_id`,
lọc `p_trang_thai_ton = 'duoi_dinh_muc'` cho TQAN-02, tìm không dấu,
`tong_so_dong` nhất quán, phạm vi kho thủ kho, lỗi `42501` khi chưa đăng nhập).
Cả hai gate tự động của plan (`grep` kiểm cấu trúc SQL) đều `GATE-OK` ngay lần
chạy đầu; `npm run typecheck`/`npm run lint` vẫn xanh (plan này không đụng
file TypeScript nào). **CHƯA chạy SQL trên bất kỳ database nào** — máy này
không có `.env.local`, Supabase CLI chưa đăng nhập, nên không `db:push` được.
Đẩy migration 0058 lên cloud và chạy pgTAP 32 thật là việc của **plan 05-05**
(ràng buộc: chỉ một plan được đẩy schema trong Phase 5). Không có deviation,
không có checkpoint, không có auth gate._

_Ghi lại 2026-09-21 khi thực thi 05-02 (XONG — cả ba task autonomous, không có
checkpoint): Task 1 dán nguyên văn `pg_get_functiondef` của `the_kho_san_pham`
đọc từ cloud (phiên điều phối đọc hộ lúc 09:24 UTC, ghi vào 05-LIVE-DEFS.md vì
máy thực thi này không có kết nối database) vào header migration `0059` —
KHỚP HOÀN TOÀN với `0031_the_kho_san_pham.sql` trong repo, không phải dừng plan.
Task 2 `drop`+`create` lại hàm với cột thứ 15 `ton_luy_ke numeric`: window
function `sum(...) filter (where la_he_thong) over (order by sx_ngay asc,
sx_phu asc, sx_id asc rows unbounded preceding)` — kỹ thuật running-balance
đầu tiên trong dự án (05-PATTERNS.md xác nhận không có analog `sum(...) over`
nào khác ngoài `count(*) over ()`). **Chỉ dòng HE_THONG được cộng vào lũy kế,
dòng KiotViet trả null** — cố ý đi ngược khuyến nghị WU-2 điểm 2 của
05-PATTERNS.md, vì `<design_decisions>` của chính 05-02-PLAN.md giải thích: D-05
(plan 05-04, chưa chạy) sẽ nạp tồn KiotViet bằng MỘT chứng từ `DIEU_CHINH` đã
bao gồm hiệu ứng ròng của toàn bộ lịch sử đó, cộng thêm từng dòng sẽ đếm hai
lần. Thứ tự phá hòa `(ngay, created_at/nap_luc, id)` dùng ở CẢ cửa sổ (asc) lẫn
`order by` ngoài cùng (desc, đủ cả ba khóa) — bản cloud chỉ `order by ngay
desc`, đúng lỗi migration này sửa vì ~92 phiếu xuất/ngày khiến nhiều dòng cùng
ngày chứng từ hòa nhau. Lũy kế tính SAU khi áp `p_kho_id`, TRƯỚC `limit`/
`offset` — không bị phân trang cắt. Task 3 viết pgTAP
`33_the_kho_luy_ke_test.sql` (9 assertion: phá hòa cùng ngày theo `created_at`,
tổng lũy kế toàn công ty, bất biến với `ton_kho` khi lọc kho, dòng KiotViet
null, không bị phân trang cắt, 14 cột cũ chưa đảo, phạm vi kho thủ kho). Cả ba
gate tự động (`grep` kiểm cấu trúc SQL) đều `GATE-OK` ngay lần chạy đầu;
`npm run check` (typecheck+lint+build) xanh toàn bộ. **CHƯA chạy SQL trên bất
kỳ database nào** — đẩy migration 0059 và chạy pgTAP 33 thật là việc của
**plan 05-05**. Không sửa `0031_the_kho_san_pham.sql` (file lịch sử). **Không
đánh dấu TON-02 hoàn thành trong REQUIREMENTS.md** dù frontmatter plan liệt kê
— theo chỉ định của orchestrator, chưa có màn hình nào (WU-8, thẻ kho UI, plan
khác của Wave 3) hiển thị cột `ton_luy_ke` này. Không có deviation, không có
checkpoint, không có auth gate._

_Ghi lại 2026-09-24 khi thực thi 06-13 (XONG — cả hai task autonomous, không có
checkpoint, wave 4, phụ thuộc 06-05): `count-template.server.ts`
(`STOCKTAKE_TEMPLATE_COLUMNS` 4 cột — Mã hàng/Tên hàng/ĐVT/Số đếm, KHÔNG cột số
liệu hệ thống nào, D-08) + `buildCountTemplate` (sheet dữ liệu tên theo nhóm
hàng/"Toàn kho" + sheet "Hướng dẫn") và `read-count-file.server.ts`
(`readCountFile` — ô trống = chưa đếm D-07, giữ chuỗi khi `so_dem` không đọc
được thành số để RPC `nhap_so_dem_kiem_ke` tự báo đúng lỗi thay vì lặng lẽ
biến gõ nhầm thành "chưa đếm"). Route `GET /api/kiem-ke/mau-excel` (lấy đầu
phiên qua `danh_sach_phien_kiem_ke`, dữ liệu qua `bang_dem_kiem_ke`, tên file
`dem-<so_ct>-<nhóm|toàn-kho>.xlsx`) và `POST /api/kiem-ke/nhap-excel` (chặn
`chi_xem` ở route trước khi gọi RPC, `che_do=nap` mới ghi, mặc định xem
trước, 23514 trả 409 kèm NGUYÊN VĂN câu lỗi database thay vì câu chung của
`explainError`, giữ khóa `result` như `nap-tam` — bài học hồi quy `c51391d`).
Thêm 4 case quay vòng vào `scripts/test-excel-reader.ts` (đọc lại mẫu rỗng,
điền số nguyên/định dạng VN/để trống, quay vòng 1.200 dòng, thiếu cột báo
lỗi). `npm run check` (typecheck+lint+build) xanh toàn bộ, hai route đã lên
danh sách route của `next build`. **`npx tsx scripts/test-excel-reader.ts`
đầy đủ KHÔNG chạy hết được trong môi trường thực thi này** — thiếu
`data/kiotviet/DanhSachSanPham*.xlsx` (dữ liệu thật, có chủ đích không
commit); 4 case mới đã xác minh PASS qua script độc lập tạm thời (xóa ngay
sau khi xác nhận), nhưng người vận hành cần chạy lại toàn bộ script trên máy
có sẵn file dữ liệu thật trước khi coi Task 1 là "đã kiểm hết". Không có
deviation, không có checkpoint, không có auth gate. Xem
`06-13-SUMMARY.md#Cần-mở-trình-duyệt-kiểm-tra` cho danh sách việc UAT (06-16)
cần làm bằng mắt._

_Ghi lại 2026-09-24 khi thực thi 06-08 (XONG — cả hai task autonomous, không có
checkpoint, wave 5, phụ thuộc 06-06/06-07): `history-filter-panel.tsx` (Select
loại, DatePicker.RangePicker, Input mã hàng/số phiếu, nút Xóa lọc) +
`history-screen.tsx` (ô tìm riêng debounce ngoài panel, ListLayout +
HistoryTable + VoucherDrawer, Alert banner nói rõ đây là tra cứu không phải sổ
kho) + route `/lich-su-kiotviet` (Server Component thuần, `requireKiotVietHistoryAccess()`,
Suspense quanh HistoryScreen) — Task 1. `product-history-tab.tsx` (Segmented lọc
loại, dùng lại HistoryTable/VoucherDrawer với `hideProductColumns`) + thêm prop
`kiotVietHistoryTab` vào `product-detail.tsx` (KHÔNG import feature
`kiotviet-history` trực tiếp — route `danh-muc/[id]/page.tsx` ghép, truyền theo
`user.canViewKiotVietHistory`, không qua `hasPermission()`) — Task 2.

**Một deviation Rule 1 (bug) phát hiện qua TDD RED trước khi viết code:**
`readDate` trong `history-filter.schema.ts` (viết ở 06-07) chỉ kiểm khuôn số
bằng regex, không kiểm ngày có thật — `"2026-13-45"` (tháng 13) lọt qua bộ lọc.
Sửa bằng cách dựng lại `Date` rồi so ngược ba phần năm/tháng/ngày. `npm run
check` (typecheck+lint+build) xanh toàn bộ, route `/lich-su-kiotviet` đã lên
danh sách route của `next build`; `npx tsx scripts/test-pure-functions.ts`
xanh với 10 case mới cho bộ lọc lịch sử KiotViet. **CHƯA kiểm bằng mắt trên
trình duyệt** — agent không khởi động `npm run dev` theo ràng buộc của phiên
thực thi này; danh sách việc cần UAT (06-16) xem
`06-08-SUMMARY.md#User-Setup-Required`. **Chưa thêm `/lich-su-kiotviet` vào
`scripts/test-route-permissions.ts` và `src/shared/lib/navigation.ts`** — đúng
phạm vi plan, để dành cho `06-16` (plan cuối làm cùng mọi route mới của phase,
theo tiền lệ `05-11`). Không có auth gate._

_Ghi lại 2026-09-24 khi thực thi 06-12 (XONG — cả hai task autonomous, không có
checkpoint, wave 5, phụ thuộc 06-09): `discrepancy-table.tsx` + `discrepancy-columns.tsx`
(bảng lệch, chỉ dòng đã đếm, tô nền đỏ nhạt dòng lệch lớn qua `isLargeDiscrepancy`
đã có từ 06-09, bộ lọc 4 trạng thái, cột "Tồn KiotViet tạm" chỉ hiện khi có dữ
liệu, nút "Trả về đếm lại"/"Bỏ yêu cầu" không chặn gì theo mức lệch — D-16) —
Task 1. `uncounted-panel.tsx` + `approve-session-button.tsx` (danh sách mã chưa
đếm hiện TRƯỚC nút duyệt, mặc định chọn hết = chấp nhận 0, bỏ chọn = trả về đếm
bù — D-07; nút duyệt disable theo `canApprove`/blockers, `Modal.confirm` tóm tắt
hậu quả, phân biệt lỗi 42501/23514 đúng khuôn `post-document-button.tsx`) — Task 2.

**Một deviation Rule 3 (blocking, tự vi phạm gate của chính plan) lặp lại đúng
kiểu lỗi đã gặp ở 06-11:** comment giải thích "không cột tiền/giá vốn (D-17)"
tự chứa chuỗi bị chính gate cấm (`giá vốn`) — sửa lại câu chữ, không đổi hành vi.

`npm run check` (typecheck+lint+build) xanh toàn bộ, `npx eslint` sạch cả bốn
file mới, cả bốn file dưới 200 dòng. Không `select("*")`/`.select()` trống,
không tên cột tiếng Việt rò ra ngoài `types.ts`/`api/`. **CHƯA kiểm bằng mắt
trên trình duyệt** — ba component này chưa được ghép vào trang chi tiết
`/kiem-ke/[id]` (việc của 06-15), UAT thật sự chỉ làm được sau đó (xem
`06-12-SUMMARY.md#User-Setup-Required`). Không có auth gate._

_Ghi lại 2026-09-24 khi thực thi 06-14 (XONG — cả hai task autonomous, không có
checkpoint, wave 5, phụ thuộc 06-09/06-13): `count-import.api.ts` +
`useCountImport.ts` (`useReducer` ba bước idle/checked/loaded khuôn
`useProvisionalStockFlow`, gọi route `/api/kiem-ke/nhap-excel` của 06-13, zod
schema coi mọi trường chi tiết của `nhap_so_dem_kiem_ke` là optional vì ba
nhánh trả về của RPC — kiểm tra/nạp còn lỗi/nạp thành công — không nhánh nào có
đủ cùng một bộ khóa, xác nhận bằng đọc trực tiếp `0065_kiem_ke_dem.sql`) — Task

1. `count-excel-import.tsx` (chọn nhóm từ `useCountSheet` đang có → tải file

mẫu → kéo file đã điền → bốn `Statistic` + khóa nút "Nạp số đếm" khi còn lỗi,
`!editable` chỉ hiện khối tải mẫu) + `count-import-result.tsx` (tách khối kết
quả khuôn `provisional-stock-issues.tsx`, cả hai file dưới 200 dòng) — Task 2.
Không có deviation — plan đã tự dự liệu trước việc tách file kết quả.
`npm run check` xanh toàn bộ, `npx eslint` sạch, gate `grep -c "Upload.Dragger"`
và `errorCount > 0` đều đạt. **CHƯA kiểm bằng mắt trên trình duyệt** —
`CountExcelImport` chưa được ghép vào trang chi tiết `/kiem-ke/[id]` (việc của
06-15), UAT thật sự chỉ làm được sau đó (xem
`06-14-SUMMARY.md#Cần-mở-trình-duyệt-kiểm-tra`). Không có auth gate._

_Song song: Phase 09 (quan-ly-hinh-anh) đang thực thi ở phiên khác — theo nhánh origin, plan 6/13 lúc merge 27/09._

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7 | 9 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 02 P01 | 30 | 3 tasks | 11 files |
| Phase 02 P02 | 25 | 1 tasks | 2 files |
| Phase 02 P03 | 15 | 1 tasks | 2 files |
| Phase 02 P04 | 25 | 1 tasks | 2 files |
| Phase 02 P05 | 55min | 3 tasks | 25 files |
| Phase 04 P01 | 46min | 3 tasks | 5 files |
| Phase 04 P02 | 19min | 3 tasks | 6 files |
| Phase 04 P03 | 24min | 3 tasks | 5 files |
| Phase 04 P04 | 19min | 3 tasks | 5 files |
| Phase 04 P06 | 28min | 2 tasks | 6 files |
| Phase 04 P07 | 35min | 2 tasks | 8 files |
| Phase 04 P08 | 45min | 3 tasks | 8 files |
| Phase 04 P10 | 40min | 2 tasks | 9 files |
| Phase 05 P01 | 12min | 2 tasks | 2 files |
| Phase 05 P02 | 15min | 3 tasks | 2 files |
| Phase 05 P03 | 12min | 3 tasks | 2 files |
| Phase 05 P04 | 25min | 3 tasks | 2 files |
| Phase 05 P05 | — | 2 tasks | 3 files |
| Phase 05 P06 | 10min | 3 tasks | 6 files |
| Phase 05 P08 | 6min | 2 tasks | 3 files |
| Phase 05 P07 | 9min | 3 tasks | 5 files |
| Phase 05 P09 | 10min | 2 tasks | 4 files |
| Phase 05 P10 | 17min | 3 tasks | 9 files |
| Phase 06 P01 | 45min | 2 tasks | 2 files |
| Phase 06 P03 | 70min | 2 tasks | 2 files |
| Phase 06 P02 | 55min | 2 tasks | 4 files |
| Phase 06 P04 | 65min | 2 tasks | 2 files |
| Phase 06 P06 | 35min | - tasks | - files |
| Phase 06 P06 | 35min | 2 tasks | 7 files |
| Phase 06 P13 | 55min | 2 tasks | 5 files |
| Phase 06 P08 | 45min | 2 tasks | 8 files |
| Phase 06 P10 | 35min | 2 tasks | 3 files |
| Phase 06 P11 | 30min | 2 tasks | 3 files |
| Phase 06 P14 | 40 | 2 tasks | 4 files |
| Phase 06 P15 | 45 | 2 tasks | 6 files |
| Phase 07 P01 | 35min | 2 tasks | 2 files |
| Phase 07 P02 | ~30min | 2 tasks | 2 files |
| Phase 07 P03 | 20min | 2 tasks | 2 files |
| Phase 07 P04 | 25min | 2 tasks | 6 files |
| Phase 07 P06 | 35m | 2 tasks | 4 files |
| Phase 07 P07 | 30min | 2 tasks | 3 files |
| Phase 09 P05 | 35min | 2 tasks | 1 files |
| Phase 17 P01 | 15min | 3 tasks | 12 files |
| Phase 17 P02 | 5min | 2 tasks | 22 files |
| Phase 17 P03 | 10min | 2 tasks | 6 files |
| Phase 17 P04 | 15min | 3 tasks | 17 files |
| Phase 17 P05 | 10min | 2 tasks | 10 files |
| Phase 18 P01 | 25min | 2 tasks | 3 files |
| Phase 18 P02 | 30min | 2 tasks | 4 files |
| Phase 18 P03 | 20min | 3 tasks | 10 files |
| Phase 18 P06 | 8min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: RLS bốn vai trò (AUTH-03..06) gộp vào Phase 1 (Nền dữ liệu) thay vì Phase 2, vì đó là hành vi kiểm chứng bằng pgTAP ở tầng database, không cần giao diện.
- [Roadmap]: Cài đặt (CDAT-01..04) gộp vào Phase 2 vì quản lý dữ liệu nền (nhóm hàng, ĐVT, công đoạn, quy tắc đánh số) mà Danh mục và các chứng từ ở phase sau cần dùng ngay.
- [Roadmap]: DLIEU-05/06/07 (giá vốn khởi đầu, tồn đầu kỳ, lưu trữ chứng từ cũ) dồn vào Phase 6 vì đều là hoạt động chốt số liệu một lần ngay trước go-live, không phải năng lực màn hình.
- [Phase 02]: kho_id = any((select kho_hien_tai())) cần ép kiểu ::uuid[] — Postgres phân giải any((select ...)) thành ANY(subquery), không phải ANY(array)
- [Phase 02]: Tổng pgTAP toàn dự án là 98, không phải 97 (plan(26) thay vì plan(25) ở 30_rls_test.sql)
- [Phase 02]: Trigger generic ghi_nhat_ky_sua bắt mọi sửa qua to_jsonb(old)/to_jsonb(new) trừ mảng cột loại trừ — thay vì trigger riêng từng bảng
- [Phase 02]: pgTAP trong một transaction: now() không đổi giữa các insert — không dùng order by cot_thoi_gian desc để phân biệt bản ghi mới nhất, kiểm theo nội dung cụ thể
- [Phase 02]: Cấu hình đánh số chứng từ (cau_hinh_so_ct) sửa được tiền tố/số chữ số theo loại; trigger chặn giảm số chữ số dưới độ dài số đang chạy năm nay
- [Phase 02]: Không nhúng mẫu DO raise-exception-để-rollback (pgtap-va-test.md mục 6) vào file migration — migration cần commit khi đúng, khác ngữ cảnh script kiểm tra độc lập
- [Phase 02]: D-16 chọn REVOKE SELECT mức bảng + GRANT lại theo cột (Phương án A) thay vì view CASE WHEN — bàn giao đã có SELECT mức bảng cho authenticated/anon nên REVOKE riêng một cột không đủ, phải revoke bảng rồi grant cột (khác REVOKE UPDATE/INSERT ở 0015 vốn đã revoke mức bảng từ đầu). Giá vốn chỉ đọc qua RPC gia_von_san_pham, kể cả quản lý.
- [Phase 02]: select 1 from bang / count(*) from bang không cần quyền cột nào trong Postgres — chỉ câu lệnh tham chiếu cột cụ thể mới bị kiểm quyền cột. Xác nhận bằng transaction rollback trên cloud trước khi sửa test, tránh sửa nhầm assertion không cần sửa.
- [Phase 02]: proxy.ts chép cookie phiên đã refresh sang response redirect (chuyenHuong helper) để tránh mất phiên
- [Phase 02]: (app)/layout.tsx signOut() + redirect ?loi=vo-hieu-hoa khi hồ sơ nguoi_dung thiếu/bị khóa, tránh vòng lặp qua proxy
- [Phase 04]: ghi_so_chung_tu goi _cap_nhat_tien_do_ddh TRUOC khi update trang_thai='HOAN_THANH' - bug thuc tu 0011, sua trong 0051 bang cach chuyen xuong SAU
- [Phase 04]: db:test:linked bi Docker treo tren may nay - fallback chay psql truc tiep tung file supabase/tests/*.sql (pgtap da bat tren cloud)
- [Phase 04]: bon policy ghi don_dat_hang/don_dat_hang_dong siet tu <> chi_xem xuong in(quan_ly,van_phong) - va lo thu_kho insert thang qua PostgREST bo qua sinh_so_dh
- [Phase 04]: chuoi_so_dh tach rieng khoi chuoi_so_ct - chuoi_so_ct khoa theo enum loai_ct (bay loai chung tu), don dat hang khong phai mot loai_ct
- [Phase 04]: danh_sach_don/chi_tiet_don/dong_don doc ca bon vai tro, khong loc theo kho - chan that o chieu ghi cua 0052
- [Phase 04]: de_nghi_gop_ma chi ghi lai de nghi gop ma, khong dung ton_kho/kho_movement/san_pham - gop that la phase rieng
- [Phase 04]: tao_phieu_xuat_tu_don: chan ma thieu kho_mac_dinh_id TRUOC insert dau tien, khong doan kho, khong de lai chung tu rac
- [Phase 04]: tao_phieu_tra khong nhan tham so chon loai — TRA_KHACH/TRA_NCC suy 100% tu loai_ct cua chung tu goc, giu nguyen kho_id cua DONG GOC (khong phai kho dau phieu)
- [Phase 04]: orderKeys tach rieng khoi documentKeys - don dat hang khong phai chung tu (loai_ct), namespace ["orders", ...] rieng
- [Phase 04]: addOrderLine khong truyen don_gia trong payload insert - cot don_dat_hang_dong.don_gia giu mac dinh 0 o tang database
- [Phase 04]: postIssue goi saveNegativeReason TRUOC postDocument - ham ghi so database doc ly_do_xuat_am tu dau phieu da luu, khong nhan qua tham so
- [Phase 04]: exceedsStock dat trong stock-out/types.ts, khong tach file lib rieng - theo tien le isFullyShipped cua sales-order/types.ts
- [Phase 04]: PartnerSearchInput.onChange nhận string|undefined (không chỉ string) để order-filter-panel xóa được lựa chọn người nhận riêng lẻ
- [Phase 04]: Thêm /dat-hang vào scripts/test-route-permissions.ts ngay ở plan 04-08 (sớm hơn dự kiến 04-15) vì success criteria của lượt thực thi yêu cầu script phải chạy qua — 70/70 ô đúng
- [Phase 04]: order-line-table.tsx (04-09) vuot 200 dong, tach thanh order-line-table (dieu phoi) + order-line-columns (cot thuan) + order-line-entry-row (hang nhap lieu ban phim) - onKeyDownCapture that su nam trong ProductSearchInput dung chung (04-05), khong lap lai o file dieu phoi
- [Phase 04]: IssueRow (04-10) mo rong DocumentRow them orderId/orderNo thay vi sua chu ky RPC danh_sach_chung_tu (dung chung nhap/xuat/tra) - issue.api.ts tu noi du lieu bang hai luot doc rieng (chung_tu -> don_dat_hang), tranh migration DROP+CREATE function tren database that
- [Phase 04]: group-lines-by-warehouse.ts (04-12) la ham thuan rieng, khong dat trong types.ts/order-status.ts - gom dong theo (ten kho, ma hang) roi tra mang xen ke {kind:"group"}|{kind:"line"}, ma thieu kho mac dinh gom vao nhom "Chua gan kho" o CUOI (khong xen giua cac kho da co ten) vi don da xac nhan van co the chua ma thieu kho mac dinh - RPC chi chan luc tao phieu xuat (0056), khong chan luc them dong vao don
- [Phase 04]: order-actions.tsx (04-12) goi ca hai hook useUnlockOrder/useCloseOrderEarly khong dieu kien trong OrderStatusDialog du chi mot cai dung theo mode - giu dung Rules of Hooks, don gian hon viec dieu kien hoa hook theo prop mode co the doi
- [Phase 04]: PostingSummary (04-13) nang tu features/stock-in len shared/components voi khung chung (docNo/headline/children/canh bao), moi chieu chung tu tu soan noi dung con - dung lan thu hai du dieu kien theo CLAUDE.md
- [Phase 04]: proposeMerge (04-13) tra ve { id, createdAt } thay vi void - giao dien so sanh createdAt voi nguong 5 giay de phan biet "vua ghi" voi "da ghi truoc do" khi bam lai dung mot cap ma, vi RPC ghi_de_nghi_gop_ma co y tra cung mot dong cho ca hai lan goi (unique index co dieu kien 0055)
- [Phase 04]: negative-stock-panel.tsx (04-13) khoi tao state tu prop bang lazy initializer thay vi useEffect+setState - react-hooks/purity/set-state-in-effect chan pattern dong bo state tu prop trong effect; component chi mount sau khi phieu da tai xong (QueryState) nen khong can dong bo lai
- [Phase 05]: danh_sach_ton_kho (0058) tra ton_theo_kho jsonb (khoa kho_id::text) thay vi cot kho co dinh, pivot dung o giao dien
- [Phase 05]: p_dang_kinh_doanh phai co nhanh is null or - loc Tat ca (null) tra 0 dong neu viet thang sp.dang_kinh_doanh = p_dang_kinh_doanh
- [Phase 05]: the_kho_san_pham ton_luy_ke chi cong dong HE_THONG, dong KiotViet tra null - D-05 nap tam qua DIEU_CHINH da bao hieu ung rong, cong them se dem hai lan
- [Phase 05]: thu tu pha hoa (ngay, created_at/nap_luc, id) bat buoc o CA cua so tinh luy ke (asc) LAN order by ngoai cung (desc) - chi ngay khong du vi bien dong cung ngay chung tu hoa nhau
- [Phase 05]: de_xuat_dinh_muc cua so du lieu (max-min+1 ngay) tinh tren TOAN BO luu_tru_hoa_don_kiotviet trong mot CTE dung chung moi dong - khong tinh rieng tung ma, tranh thoi toc do ban cua ma it du lieu
- [Phase 05]: dat_dinh_muc chi nhan uuid[] - gia tri ghi vao ton_toi_thieu doc lai tu chinh de_xuat_dinh_muc(null,false,1,5000) ngay trong cau UPDATE, khong tin tham so client
- [Phase 05]: nhat_ky_sua_nguon_check drop/add voi danh sach doc truc tiep tu cloud (05-LIVE-DEFS.md) cong dung mot gia tri moi dinh_muc - khong go lai theo tri nho hay theo file 0044 cu trong repo
- [Phase 05]: _ghi_so_dieu_chinh va theo kho tung dong (coalesce(p_dong.kho_id, p_ct.kho_id)) thay vi luon p_ct.kho_id — Quyet dinh nguoi dung 2026-09-21 sau khi Task 1 cua 05-04 fire dieu kien dung da cai san; an toan vi 0 chung tu DIEU_CHINH ton tai luc va, tuong thich nguoc
- [Phase 05]: 0059 lam gay the_kho_san_pham tren production (42702 cot mo ho voi bien OUT cua RETURNS TABLE) — va bang 0062 create or replace gan tien to v., khong sua 0059 da ap. Bai hoc: SELECT cuoi trong ham RETURNS TABLE luon gan tien to bang
- [Phase 05]: Deploy khong CLI: migration qua MCP execute_sql + insert schema_migrations, kiem md5; pgTAP qua MCP voi finish(true) boc string_agg -> 'DAT'. pgTAP toan du an 380/380 (324 truoc Phase 5)
- [Phase 05]: nap_ton_tam: dieu kien bo qua la DA CO kho_movement that, khong phai ton_kho.so_luong khac 0 — Ma ton 0 vi da xuat het that khac ma ton 0 vi chua tung co chung tu nao; day cung la dieu kien lam lan chay thu hai vo hai (idempotent)
- [Phase 05]: nap_ton_tam chi vai tro quan_ly (hep hon D-04 quan_ly+van_phong) — Viec mot lan, hau qua trai khap moi bao cao ton - nen hep, noi ra sau de hon siet lai
- [Phase 05]: features/inventory khai lai STOCK_STATUSES/TradingStatus thay vi import tu features/products (cam import noi bo feature khac) — comment tro sang products de hai ben di cung nhau
- [Phase 05]: InventoryRow.stockByWarehouse la Record<kho_id, number> thu hep tu unknown (ton_theo_kho la Json); kho khong co khoa thi giao dien doc ?? 0; nhom/cong doan/DVT go string | null vi RPC lay qua LEFT JOIN
- [Phase 05]: nguon_de_xuat la roi ve khong_du_lieu bang type guard — tha noi khong biet con hon gan nhan theo lich su ban cho so khong ro nguon
- [Phase 05]: useApplyReorderLevels invalidate inventoryKeys.all + [products] + [audit-log, san_pham]; REORDER_SUGGESTION_PAGE_SIZE = 200 (duoi gioi han 1000 id/lan cua dat_dinh_muc)
- [Phase 05]: StockCardRow.runningBalance la number | null, map ton_luy_ke === null ? null : Number(...) — kieu sinh ghi number nhung dong KiotViet tra null, Number(null) ra 0 se hien "0" sai
- [Phase 05]: DOC_TYPE_TO_ROUTE (stock-card-columns.tsx) co NHAP/XUAT/TRA_KHACH/TRA_NCC — chi loai co [id]/page.tsx that; TRA_* dung chung /tra-hang; CHUYEN_KHO/KIEM_KE/DIEU_CHINH chua co route nen hien chu thuong, them vao map khi co trang
- [Phase 05]: Mang cot the kho tach ra buildStockCardColumns({ canViewCost }) vi stock-card.tsx len 210 dong — theo dieu khoan du phong cua 05-08, khuon buildXColumns san co
- [Phase 05]: /ton-kho dung cot kho dong tu useLookups().warehouses (stockByWarehouse[kho.id] ?? 0); dang loc mot kho thi chi giu cot kho do vi RPC chi cong ton kho duoc loc; scroll.x = tong width cac cot
- [Phase 05]: O tim man ton kho tach stock-toolbar.tsx (ngoai files_modified 05-07) — khong dung lai ProductToolbar vi thuoc thu muc noi bo feature products; khong import formatNumber tu product-columns cung ly do
- [Phase 05]: danh_sach_ton_kho LEFT JOIN nen rong-khong-loc = danh muc khong co ma dang kinh doanh; goi y nap ton tam la dong ghi chu duoi bang khi ca trang ton 0, link /ton-kho/nap-tam chi hien voi quan_ly (canLoadProvisionalStock = user.role === quan_ly, doi sang hasPermission khi 05-10 them load-provisional-stock)
- [Phase 05]: overflow-x-auto + scroll.x o /ton-kho la muc toi thieu CLAUDE.md cho moi bang, KHONG phai TON-05 (man ton tren dien thoai) — TON-05 van o Phase 6, chua lam
- [Phase 05]: /ton-kho/dinh-muc: nut duyet chi phu cac trang nguoi duyet DA MO (viewedPages theo so trang) — trang chua mo khong bao gio bi duyet mu; mac dinh chon het tru khong_du_lieu (dong nay chi hien khi ma dang co dinh muc va de xuat 0, duyet la xoa ve 0)
- [Phase 05]: Canh bao du lieu man duyet lay so_ngay_du_lieu that; ky 03/09-12/09/2026 va 1.223/3.266 ma la ARCHIVE_SNAPSHOT go cung (RPC khong tra), chi in khi so_ngay_du_lieu con bang 10
- [Phase 05]: Nut duyet dinh muc disabled ca khi bang dang tai lai (isFetching) — sau khi duyet trang 1 cu con hien toi luc refetch ve; loi 42501 noi ve quyen (va tai lai trang neu vai tro vua doi), 23514 hien nguyen van RPC
- [Phase 05]: reorder-data-warning.tsx tach ngoai files_modified 05-09 (bang 256 dong sau khi da tach cot) — theo gioi han ~200 dong cua CLAUDE.md
- [Phase 05]: /api/ton-kho/nap-tam chan ca file khi co ma hang lap (422) — RPC nap_ton_tam khong gop dong trung, nap ca hai dong se cong doi ton
- [Phase 05]: Man nap ton tam goi route qua api/provisional-stock.api.ts (zod parse { result } + mapper, khuon excel-import.api.ts) thay vi fetch trong component nhu cost-import.tsx; luong ba buoc o hooks/useProvisionalStockFlow.ts de component con ~200 dong
- [Phase 05]: Permission load-provisional-stock = [quan_ly]; /ton-kho doi canLoadProvisionalStock sang hasPermission cung quyen nay
- [Phase 05]: Hoi quy tu 9ec9b1f (nhap-excel / gia-von-dau-ky tra { result }, client con doc ketQua) ghi vao deferred-items.md — ngoai pham vi 05-10, chua sua
- [Phase ?]: [Phase 06]: Cong tac quyen theo nguoi doc THANG bang nguoi_dung theo auth.uid() (khong qua JWT claim) - ca bat lan tat co hieu luc NGAY, khac vai_tro_hien_tai()/kho_hien_tai()
- [Phase ?]: [Phase 06]: luu_ho_so_nguoi_dung them 2 tham so cuoi default null + coalesce(., cot cu) - loi goi 6 tham so cu cua app dang chay khong reset cong tac ve false
- [Phase ?]: [Phase 06]: Backfill xem_lich_su_kiotviet=true cho van_phong hien co, KHONG backfill duyet_kiem_ke (quyen moi, dong mac dinh)
- [Phase 06]: 0065: _pham_vi_kiem_ke xet nhom hang + co ton, con luu_dong_kiem_ke/nhap_so_dem_kiem_ke chi xet nhom hang khi validate mot ma - dem duoc ma lac kho
- [Phase 06]: 0065: upsert luu_dong_kiem_ke dung ON CONFLICT tren unique index partial (khong SELECT-roi-quyet) - for update tren header da tuan tu hoa du
- [Phase 06]: 0065: nhap_so_dem_kiem_ke goi luu_dong_kiem_ke cho MOI dong sach (dat lan cap_nhat) - dam bao 3 duong nhap so dem di chung mot duong ghi
- [Phase 06]: the_kho_san_pham bo han hai nhanh union doc luu_tru_* (D-11) thay vi chi them dieu kien cong tac - dong KiotViet khong co kho_movement that nen khong tinh duoc ton luy ke dung; lich su KiotViet tu nay chi xem qua tra_cuu_lich_su_kiotviet
- [Phase 06]: Cua thu ba phat hien ngoai nghien cuu: the_kho_san_pham (0062) cung doc luu_tru_* theo vai tro cung, khong co trong 06-RESEARCH.md - grep toan bo migrations theo ten bang moi tin la du
- [Phase ?]: [Phase 06]: co transaction-local kho_minh_vu.duyet_kiem_ke chan ghi_so_chung_tu goi thang cho KIEM_KE - chi duyet_phien_kiem_ke dat co duoc, PostgREST khong goi duoc set_config
- [Phase ?]: [Phase 06]: (fn()).* voi ham VOLATILE tra composite bi Postgres goi lai MOT LAN MOI COT - xac nhan bang thuc nghiem, luon dung select * from fn(...) cho RPC ghi so
- [Phase ?]: resetPassword truyen lai gia tri CU cua hai cong tac quyen (doc tu previous) thay vi dua vao coalesce(null, cot_cu) ngam dinh cua RPC
- [Phase ?]: Tach nhom 2 Checkbox quyen theo nguoi ra UserSpecialPermissions rieng vi UserDrawer da 274 dong truoc khi them
- [Phase 06]: 0066 bang_dem_kiem_ke tra ten_nhom tren moi dong khi loc theo p_nhom_hang_id - route mau-excel lay ten nhom tu dong dau ket qua, khong truy van them bang nhom_hang
- [Phase 06]: nhap-excel route: loi 23514 cua nhap_so_dem_kiem_ke tra 409 kem NGUYEN VAN error.message (khong qua cau chung cua explainError) - nguoi dung can doc dung ly do nghiep vu (vi du "Phien da duyet, khong nhap so dem duoc")
- [Phase 06]: scripts/test-excel-reader.ts can data/kiotviet/DanhSachSanPham*.xlsx that (khong commit) - moi truong thuc thi 06-13 thieu file nay, 4 case moi da xac minh PASS qua script doc lap tam thoi, can chay lai script day du tren may co du lieu that
- [Phase 06]: 06-08: sua bug readDate (06-07) chi kiem khuon so khong kiem ngay co that; doi ten tab key 'kiotviet-history' -> 'lich-su-kiotviet' de tranh trung chuoi voi comment import feature
- [Phase 06]: 06-10: Bo loc danh sach phien kiem ke la state cuc bo (khong URL) — khac ReceiptTable, phien kiem ke khong can bookmark/chia se link loc
- [Phase 06]: count-desk-columns.tsx xuat countInputDomId() dung chung — focus dong ke qua id DOM thay vi useRef (React Compiler cam truyen ref vao ham goi luc render)
- [Phase ?]: Zod schema cua nhap_so_dem_kiem_ke coi moi truong chi tiet la optional - ba nhanh tra ve khong nhanh nao co du cung mot bo khoa
- [Phase ?]: count-import-result.tsx tach khoi count-excel-import.tsx tu dau, khuon provisional-stock-issues.tsx, giu ca hai file duoi 200 dong
- [Phase ?]: 07-01: D-15/A1 - mot ma bi hai dong phieu day am cung ngay -> hai dong bao cao rieng
- [Phase ?]: 07-01: D-16/A4 - nguoi_lap = chung_tu.nguoi_tao_id, khong phai nguoi_duyet_id
- [Phase 07]: 07-02: RPC ton_theo_nhom co dinh dang_kinh_doanh=true (D-17), khong loc theo kho cua thu kho, doi chieu cheo pgTAP voi danh_sach_ton_kho tren toan bo du lieu that (D-08)
- [Phase 07-03]: nhip_ban khong doc don_dat_hang, chi dem XUAT HOAN_THANH theo chung_tu.ngay_ct (D-10) — Don dat hang chua xuat khong tinh vao nhip ban, khop dung D-09/D-10
- [Phase 07]: 07-04: menu Tong quan chi hien voi quan_ly qua quyen view-dashboard moi; ba vai tro con lai ve home theo homePathForRole (D-11)
- [Phase 07]: 07-06: toSalesPace tu sap theo ngay giam dan roi tach today/yesterday theo vi tri, nem Error neu RPC khong tra du hai dong
- [Phase 07]: 07-06: StockByGroupRow.key = nhom_id ?? __none__ vi kieu sinh tu dong ghi string khong null nhung SQL (0070) van co the tra null luc chay that
- [Phase 07]: 07-06: fetchNegativeStockReport chi nhan p_ngay - RPC bao_cao_xuat_am (0069) khong co tham so p_kho_id
- [Phase 07]: 07-07: ngay chot SalesPaceCard hien trong noi dung, khong dung Card.extra, tranh doc query.data ngoai QueryState children
- [Phase 09]: CLI supabase mat quyen Management API tren may nay - dung psql DATABASE_URL de day migration 0068 + chay pgTAP, gen types --db-url thay --project-id
- [Phase 17]: Tên nhóm menu Đơn hàng giữ; shortLabel Duyệt đơn giữ, kiểm 375px ở 17-06
- [Phase 17]: A3: phiếu lấy hàng chỉ in tên người nhận (recipientDisplayName); DDAT-01 ngừng đọc/gửi ngay_giao_du_kien, giữ cột DB

### Roadmap Evolution

- Phase 9 added (2026-09-26): Quản lý hình ảnh — ảnh mã hàng lưu Google Drive qua Apps Script, lớp lưu trữ trừu tượng (`noi_luu`/`khoa_luu`, hiển thị qua `/anh/<id>` có cache) để sau chuyển cloud không đổi giao diện

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: CLAUDE.md và `src/shared/components/app-shell.tsx` còn mô tả phạm vi cũ (theo dõi sản xuất 5 xưởng) — phải viết lại khi Phase 2 chạm vào app shell.
- [Phase 04] 04-05-PLAN.md Task 3 (checkpoint:human-verify, kiem mat man /nhap-kho) van dang mo - chua ai chay 6 buoc, chua co 04-05-SUMMARY.md. Khong chan 04-06/04-07 nhung phai dong truoc khi coi Wave 5 xong.
- ~~[Phase 6, 06-01] .env.local trỏ sai project~~ — ĐÃ SỬA 27/09: người dùng yêu cầu, khối phonzyruoalimgaovljm đã bật.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260919-dm4 | Design system theo giao diện KiotViet: token + top-nav shell + bố cục trang danh sách | 2026-09-19 | 39da902 | [260919-dm4-update-design-system-theo-giao-dien-kiot](./quick/260919-dm4-update-design-system-theo-giao-dien-kiot/) |
| 260921-v15 | Bản demo UI/UX tĩnh (HTML/CSS/JS) cho toàn bộ hệ thống trong design/ | 2026-09-21 | eba487a | [260921-v15-ban-demo-ui-ux-tinh-html-css-js-trong-th](./quick/260921-v15-ban-demo-ui-ux-tinh-html-css-js-trong-th/) |
| 260928-q4u | Sửa 3 lỗi từ checklist kiểm thử: lưu người dùng chưa có tên đăng nhập, thứ tự thẻ kho, lý do xuất âm trên thẻ kho | 2026-09-28 | be1a918 | [260928-q4u-sua-3-loi-checklist-luu-nguoi-dung-the-k](./quick/260928-q4u-sua-3-loi-checklist-luu-nguoi-dung-the-k/) |
| 260928-sn5 | Phiếu xuất: mở phiếu đang nhập liệu thì con trỏ nằm sẵn ở ô mã hàng (checklist 5.2) | 2026-09-28 | 319f736 | [260928-sn5-phieu-xuat-tu-focus-o-ma-hang](./quick/260928-sn5-phieu-xuat-tu-focus-o-ma-hang/) |
| 260928-t0j | Seed tài khoản demo đúng quyền, tự focus ô mã ở phiếu nhập/đơn hàng, migration ten_danh_muc | 2026-09-28 | 0d93f8b | [260928-t0j-seed-quyen-focus-o-ma-ten-danh-muc](./quick/260928-t0j-seed-quyen-focus-o-ma-ten-danh-muc/) |

## Session Continuity

Last session: 2026-10-03T15:11:55.680Z
Stopped at: Completed 18-06-PLAN.md
Last activity: 2026-10-03
Resume file: None
