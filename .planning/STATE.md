---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to verify
stopped_at: Hoan thanh 06-06-PLAN.md
last_updated: "2026-09-24T15:08:40.732Z"
last_activity: 2026-09-24
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 92
  completed_plans: 49
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.
**Current focus:** Phase 6 — Kiểm kê & Go-live

## Current Position

Phase: 6 (Kiểm kê & Go-live) — EXECUTING
tự động, đang chờ checkpoint)
Plan: 7 of 16
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

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: CLAUDE.md và `src/shared/components/app-shell.tsx` còn mô tả phạm vi cũ (theo dõi sản xuất 5 xưởng) — phải viết lại khi Phase 2 chạm vào app shell.
- [Phase 04] 04-05-PLAN.md Task 3 (checkpoint:human-verify, kiem mat man /nhap-kho) van dang mo - chua ai chay 6 buoc, chua co 04-05-SUMMARY.md. Khong chan 04-06/04-07 nhung phai dong truoc khi coi Wave 5 xong.
- [Phase 6, 06-01] .env.local co hai khoi cau hinh Supabase: khoi dung (phonzyruoalimgaovljm, that, co du lieu, dang bi COMMENT) va khoi active sai (rnpqgbuypmecxiatuulz, host pooler khong resolve duoc). npm run dev/db:push/seed:users se dung sai project cho toi khi nguoi dung tu sua .env.local (CLAUDE.md cam AI tu doi file cau hinh).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260919-dm4 | Design system theo giao diện KiotViet: token + top-nav shell + bố cục trang danh sách | 2026-09-19 | 39da902 | [260919-dm4-update-design-system-theo-giao-dien-kiot](./quick/260919-dm4-update-design-system-theo-giao-dien-kiot/) |
| 260921-v15 | Bản demo UI/UX tĩnh (HTML/CSS/JS) cho toàn bộ hệ thống trong design/ | 2026-09-21 | eba487a | [260921-v15-ban-demo-ui-ux-tinh-html-css-js-trong-th](./quick/260921-v15-ban-demo-ui-ux-tinh-html-css-js-trong-th/) |

## Session Continuity

Last session: 2026-09-24T15:08:40.700Z
Stopped at: Hoan thanh 06-06-PLAN.md
Last activity: 2026-09-24
Resume file: None
