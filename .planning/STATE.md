---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 04-10-PLAN.md
last_updated: "2026-09-20T05:50:18.241Z"
last_activity: 2026-09-20
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 64
  completed_plans: 31
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.
**Current focus:** Phase 04 — don-dat-hang-phieu-xuat

## Current Position

Phase: 04 (don-dat-hang-phieu-xuat) — EXECUTING
Plan: 9 of 15 có SUMMARY.md (04-01, 04-02, 04-03, 04-04, 04-06, 04-07, 04-08, 04-10 done);
04-05 và 04-09 CHƯA có SUMMARY.md (cả hai đang mở checkpoint kiểm mắt, xem ghi chú dưới)

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: CLAUDE.md và `src/shared/components/app-shell.tsx` còn mô tả phạm vi cũ (theo dõi sản xuất 5 xưởng) — phải viết lại khi Phase 2 chạm vào app shell.
- [Phase 04] 04-05-PLAN.md Task 3 (checkpoint:human-verify, kiem mat man /nhap-kho) van dang mo - chua ai chay 6 buoc, chua co 04-05-SUMMARY.md. Khong chan 04-06/04-07 nhung phai dong truoc khi coi Wave 5 xong.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260919-dm4 | Design system theo giao diện KiotViet: token + top-nav shell + bố cục trang danh sách | 2026-09-19 | 39da902 | [260919-dm4-update-design-system-theo-giao-dien-kiot](./quick/260919-dm4-update-design-system-theo-giao-dien-kiot/) |

## Session Continuity

Last session: 2026-09-20T05:50:18.238Z
Stopped at: Completed 04-10-PLAN.md
Last activity: 2026-09-20
Resume file: None
