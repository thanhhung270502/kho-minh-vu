# Phase 4: Đơn đặt hàng & Phiếu xuất — Work Units

**Decomposed:** 2026-09-20
**Nguồn:** `04-CONTEXT.md` (D-01..D-15 + mục `<open_items>`)

Mỗi WU: tối đa 3 file, tối đa nửa ngày, một commit.
Migration tiếp theo bắt đầu từ **0050** (0049 là cuối của Phase 3).
Tên file/thư mục tiếng Anh, URL tiếng Việt không dấu, tên bảng/cột/RPC giữ tiếng Việt.

**Phạm vi:** DDH-01..04, XUAT-01, 02, 04, 05, 06, 07, 09.
**Ngoài phạm vi đợt này:** XUAT-03 (barcode), XUAT-08 (mobile).

---

## WU-0 — Việc của người dùng, không phải của code

| Việc | Vì sao chặn |
|---|---|
| Chạy `/doi-tac/ra-ghi-chu`, duyệt **17 tên ≥10 hóa đơn** thành đối tác | `doi_tac` chỉ có 1 khách ("Khách lẻ"); `don_dat_hang.doi_tac_id` NOT NULL → **không tạo được đơn nào** để UAT |
| Đặt `kho_mac_dinh_id` cho **4 mã** còn thiếu | Thêm dòng vào phiếu sẽ bị chặn ở đúng 4 mã đó |
| Mở màn phiếu nhập trên trình duyệt kiểm bằng mắt | Nợ UAT Phase 3; Phase 4 nhân bản đúng cơ chế đó — lỗi chưa phát hiện sẽ bị nhân đôi |

Làm xong WU-0 thì Wave 6–7 mới UAT được. Wave 1–5 không chặn.

---

## Wave 1 — Nền database (4 WU, chạy song song được)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-1** | Đổi `trang_thai_ddh` sang trục duyệt `TAM \| DA_XAC_NHAN \| HOAN_THANH \| DA_HUY`; sửa `_cap_nhat_tien_do_ddh` chỉ cập nhật `so_luong_da_xuat` rồi tự đóng `HOAN_THANH` khi mọi dòng đủ; sửa partial index `idx_ddh_trang_thai` | `0050_trang_thai_don_duyet.sql`, `tests/23_don_dat_hang_test.sql` | D-04, D-05, DDH-03 |
| **WU-2** | RPC `xac_nhan_don` / `mo_khoa_don` / `dong_don_som` — chỉ `quan_ly`, `SECURITY DEFINER`, ghi `nhat_ky_sua`; policy `don_dat_hang` cho văn phòng sửa khi `TAM` | `0051_rpc_duyet_don.sql`, `tests/24_duyet_don_test.sql` | D-06, D-07 |
| **WU-3** | Sinh `so_dh` không trùng khi hai người tạo cùng lúc (theo khuôn `sinh_so_ct`/`chuoi_so_ct`) | `0052_sinh_so_dh.sql`, `tests/25_so_dh_test.sql` | DDH-01 |
| **WU-4** | Bảng `de_nghi_gop_ma` + RPC `ghi_de_nghi_gop_ma`; RPC `goi_y_ma_trung(p_san_pham_id, p_kho_id)` trả mã tên gần giống đang còn tồn (dùng lại `word_similarity` của `tim_san_pham`) | `0053_de_nghi_gop_ma.sql`, `tests/26_goi_y_ma_trung_test.sql` | D-14 |

⚠️ **WU-1 sửa hàm đã test từ Phase 1** (`_cap_nhat_tien_do_ddh`, migration 0011 dòng 139).
Chạy lại **toàn bộ** pgTAP (225 assert) sau khi push, không chỉ file của WU.

⚠️ **Bẫy 16** — test đánh số không neo vào bộ đếm sống. WU-3 phải dùng năm 2091–2093
hoặc so tương đối, không assert `so_dh = 'DH26-000001'`.

⚠️ **Bẫy 5** — cột mới trên `san_pham`/`kho_movement` phải kèm `grant select (<cột>)`
trong chính migration đó. WU-4 không thêm cột vào hai bảng này thì không dính.

---

## Wave 2 — RPC đọc và ghi (3 WU, sau Wave 1)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-5** | `danh_sach_don` (lọc + phân trang server), `chi_tiet_don` (header + dòng + đã xuất/còn lại tính khi đọc), `dong_don` | `0054_rpc_don_dat_hang.sql`, `tests/27_rpc_don_test.sql` | DDH-01, DDH-02 |
| **WU-6** | RPC `tao_phieu_xuat_tu_don(p_don_id)` — atomic, bê dòng sang, **điền sẵn số lượng = số đặt**, kho từng dòng lấy từ `san_pham.kho_mac_dinh_id`, cấp số phiếu ngay | `0055_tao_phieu_xuat_tu_don.sql`, `tests/28_phieu_xuat_tu_don_test.sql` | DDH-04, XUAT-01, D-10, D-13 |
| **WU-7** | RPC `tao_phieu_tra(p_goc_id, p_loai)` — sinh `TRA_KHACH` từ phiếu xuất đã ghi sổ, `TRA_NCC` từ phiếu nhập đã ghi sổ; bê dòng sang để sửa số trả | `0056_tao_phieu_tra.sql`, `tests/29_phieu_tra_test.sql` | XUAT-09, D-15 |

**Đã có sẵn, KHÔNG viết lại:** `ghi_so_chung_tu`, `huy_chung_tu`, `_ghi_so_xuat`,
`_ghi_so_tra_khach`, `_ghi_so_tra_ncc`, ép `ly_do_xuat_am`, `ck_tra_hang_co_goc`,
`danh_sach_chung_tu` / `chi_tiet_chung_tu` / `dong_chung_tu`.

---

## Wave 3 — Lớp dữ liệu client (4 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-8** | Nâng lớp chứng từ dùng chung lên `features/documents/` (rút từ `stock-in` — nay đã có 2 feature dùng, đủ điều kiện của CLAUDE.md) | `features/documents/types.ts`, `features/documents/api/document.api.ts`, `features/documents/api/document.keys.ts` | — |
| **WU-9** | `features/sales-order`: kiểu dữ liệu + zod schema + query key | `features/sales-order/types.ts`, `schemas/order.schema.ts`, `api/order.keys.ts` | DDH-01..04 |
| **WU-10** | `features/sales-order`: hàm gọi Supabase + hook TanStack Query | `features/sales-order/api/order.api.ts`, `hooks/useOrders.ts` | DDH-01..04 |
| **WU-11** | `features/stock-out`: mỏng trên `documents`, thêm phần riêng của chiều xuất (lý do xuất âm, gợi ý mã trùng) | `features/stock-out/types.ts`, `api/stock-out.api.ts`, `hooks/useStockOut.ts` | XUAT-01..07 |

⚠️ **WU-8 sửa file ngoài phạm vi feature đang làm** (`src/features/stock-in/`).
Đây là refactor có chủ đích, phải nêu rõ trong plan và chạy lại `npm run check` +
mở màn phiếu nhập kiểm mắt sau khi rút.

⚠️ **Bẫy 10** — hook đọc một bản ghi phải có `enabled: id !== ""`.
⚠️ **Bẫy 8** — bắt lỗi bằng `maLoi(e)` / `laLoiPostgrest(e)`, không `instanceof PostgrestError`.

---

## Wave 4 — Giao diện đơn đặt hàng (3 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-12** | Màn danh sách đơn: bộ lọc trên URL, bảng theo khuôn `BoCucDanhSach`, trạng thái rỗng, 4 trạng thái của `QueryState` | `app/(app)/dat-hang/page.tsx`, `features/sales-order/components/order-table.tsx`, `components/order-filter-panel.tsx` | DDH-01 |
| **WU-13** | Đầu đơn: **một ô tìm người nhận** trên `doi_tac`, gõ ra tên chưa có thì tạo đối tác tại chỗ; ngày giao dự kiến; ghi chú | `app/(app)/dat-hang/[id]/page.tsx`, `features/sales-order/components/order-header.tsx`, `components/partner-search-input.tsx` | DDH-01, D-03 |
| **WU-14** | Bảng dòng đơn gõ bàn phím: mã → Enter → số lượng → Enter sang dòng mới. **Không có cột đơn giá.** Hiện "đã xuất / còn lại" khi đơn đã có phiếu xuất | `features/sales-order/components/order-line-table.tsx`, `components/order-table-body.tsx` | DDH-01, DDH-02, XUAT-07 |

⚠️ **Bẫy 14** — bắt Enter ở `onKeyDownCapture` của div bọc ngoài (rc-select tự focus lại),
và `setTimeout(..., 0)` khi chuyển focus sau khi mutation resolve.
⚠️ **Bẫy 15** — "Enter chọn kết quả đầu tiên" phải tìm mã khớp tuyệt đối trước.
⚠️ **Bẫy 11** — antd v6 bỏ prop của v5; mở console một lần trước khi báo xong.

---

## Wave 5 — Duyệt và in đơn (2 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-15** | Nút xác nhận / mở khóa / đóng sớm theo vai trò; đơn `DA_XAC_NHAN` khóa sửa ở giao diện (database đã chặn); hiện người duyệt và thời điểm | `features/sales-order/components/approve-order-button.tsx`, `components/unlock-order-dialog.tsx` | D-05, D-06, D-07 |
| **WU-16** | Mẫu in phiếu đi lấy hàng: không giá, **cột trống ghi tay số thực lấy**, xếp theo kho rồi mã hàng, mỗi kho một dòng tiêu đề nhóm, đầu bảng lặp sang trang | `app/(app)/dat-hang/[id]/in/page.tsx`, `features/sales-order/components/picking-print-template.tsx` | D-08, D-09, Claude's Discretion |

---

## Wave 6 — Giao diện phiếu xuất (3 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-17** | Màn danh sách phiếu xuất (dùng lại `documents` + khuôn `BoCucDanhSach`) | `app/(app)/xuat-kho/page.tsx`, `features/stock-out/components/issue-table.tsx`, `components/issue-filter-panel.tsx` | XUAT-01 |
| **WU-18** | Tạo phiếu xuất: từ đơn (gọi `tao_phieu_xuat_tu_don`, **chỉ sửa dòng lệch**) và tạo mới không cần đơn; kho sửa được từng dòng | `app/(app)/xuat-kho/[id]/page.tsx`, `features/stock-out/components/issue-line-table.tsx`, `components/create-issue-button.tsx` | XUAT-01, XUAT-02, XUAT-07, D-10, D-13 |
| **WU-19** | Ghi sổ: dòng đổi màu ngay khi vượt tồn + hộp tóm tắt trước khi ghi sổ; **bắt chọn lý do xuất âm** (4 mục cố định + ghi chú); hiện gợi ý mã gần giống còn tồn kèm nút "Đề nghị gộp hai mã" | `features/stock-out/components/post-issue-button.tsx`, `components/negative-stock-panel.tsx`, `components/similar-code-hint.tsx` | XUAT-04, XUAT-05, D-11, D-12, D-14 |

---

## Wave 7 — In, trả hàng, tích hợp (3 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-20** | Mẫu in phiếu giao hàng cho khách (khác mẫu đi lấy hàng của WU-16) | `app/(app)/xuat-kho/[id]/in/page.tsx`, `features/stock-out/components/delivery-print-template.tsx` | XUAT-06 |
| **WU-21** | Trả hàng: nút trên chứng từ gốc đã ghi sổ → màn phiếu trả với dòng bê sang, sửa số trả rồi ghi sổ | `app/(app)/tra-hang/[id]/page.tsx`, `features/returns/components/return-button.tsx`, `components/return-line-table.tsx` | XUAT-09, D-15 |
| **WU-22** | Tích hợp cuối: menu trái, chặn route trong `src/proxy.ts`, **thêm mọi route mới vào ma trận quyền** (65 ô → ~85), chạy toàn bộ bộ kiểm | `shared/components/app-shell.tsx`, `src/proxy.ts`, `scripts/test-route-permissions.ts` | — |

⚠️ **Bẫy 12** — ma trận quyền route phải liệt kê **mọi route thật**, kể cả route chỉ
redirect. Thiếu một dòng thì script vẫn báo xanh trong khi trang đó crash.

---

## Tổng kết phân rã

| Wave | Số WU | Chặn bởi |
|---|---|---|
| 1 — Nền database | 4 | — (song song được) |
| 2 — RPC đọc/ghi | 3 | Wave 1 |
| 3 — Lớp dữ liệu client | 4 | Wave 2 |
| 4 — Giao diện đơn | 3 | Wave 3 |
| 5 — Duyệt + in đơn | 2 | Wave 4 |
| 6 — Giao diện phiếu xuất | 3 | Wave 3 (+ Wave 5 để UAT trọn luồng) |
| 7 — In, trả hàng, tích hợp | 3 | Wave 6 |
| **Tổng** | **22** | |

**Lưu ý về kích thước:** 22 WU lớn hơn Phase 3 (13 WU) vì đợt này có hai loại chứng
từ mới cộng đơn đặt hàng cộng trả hàng. Nếu cần cắt để giữ nhịp tuần, chỗ cắt sạch
nhất là **Wave 7 WU-21 (trả hàng)** — database đã chạy được, chỉ thiếu giao diện, nên
hoãn không để lại nợ kỹ thuật. Người dùng đã chọn làm luôn ở bước bàn bạc, nên mặc
định là giữ.

**Bộ kiểm phải xanh trước khi khép phase:**
`npm run check` · pgTAP (225 + assert mới) · `verify:hook` · hàm thuần · đọc Excel ·
quyền route · **và mở từng màn mới trên trình duyệt xem console** (bẫy 11: `npm run check`
xanh không chứng minh giao diện chạy — cả 5 lỗi UAT Phase 2 đều lọt qua check).
