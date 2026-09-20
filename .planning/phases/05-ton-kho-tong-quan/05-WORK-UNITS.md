# Phase 5: Tồn kho & Tổng quan — Work Units

**Decomposed:** 2026-09-20
**Nguồn:** `05-CONTEXT.md` (D-01..D-05)

Mỗi WU: tối đa 3 file, tối đa nửa ngày, một commit.
Migration tiếp theo bắt đầu từ **0058** (database thật đang ở 0057).
Tên file/thư mục tiếng Anh, URL tiếng Việt không dấu, tên bảng/cột/RPC giữ tiếng Việt.

**Phạm vi:** TON-01, TON-02, TQAN-02, cộng việc nạp tồn tạm (D-05).
**Ngoài phạm vi:** TON-03, TON-04, TON-05, TQAN-01, TQAN-03, TQAN-04, TQAN-05, TQAN-06.

---

## WU-0 — Chặn, không phải việc code

| Việc | Vì sao chặn |
|---|---|
| Hoàn tất giao diện Phase 4 | Phase 5 đọc dữ liệu Phase 4 sinh ra; không có phiếu xuất thì thẻ kho trống |
| Trang bị bản làm việc: `npm install` + tạo `.env.local` từ `.env.example` | Không có `node_modules`/khóa thì không chạy được `npm run check`, `db:push`, `db:types`, `db:test:linked` |
| Sinh lại `src/types/database.types.ts` | File hiện tại chưa biết RPC nào của Phase 4; lớp dữ liệu Phase 5 sẽ gõ sai kiểu |
| Đặt file `DanhSachSanPham_KV…` vào `data/kiotviet/` | WU-4 và WU-10 không có gì để nạp |
| Xác minh ai đã đẩy 0050–0057 lên database | Hai phiên cùng ghi một database sẽ đè nhau |

---

## Wave 1 — Nền database (4 WU, chạy song song được, trừ phần push)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-1** | RPC `danh_sach_ton_kho` — **một dòng mỗi mã, kho là cột**; lọc nhóm hàng/công đoạn/từ khóa gõ không dấu; phân trang server kèm `tong_so_dong`; tự áp phạm vi kho của `thu_kho` | `0058_rpc_ton_kho.sql`, `tests/32_ton_kho_test.sql` | TON-01, D-01, D-02 |
| **WU-2** | Mở rộng `the_kho_san_pham` thêm cột **tồn lũy kế tại thời điểm** (window sum theo `ngay, id`), giữ nguyên 14 cột cũ đúng thứ tự | `0059_the_kho_ton_luy_ke.sql`, `tests/33_the_kho_luy_ke_test.sql` | TON-02, D-03 |
| **WU-3** | RPC `de_xuat_dinh_muc` (suy từ `luu_tru_hoa_don_kiotviet`, mã không có lịch sử lấy trung bình nhóm) + RPC `dat_dinh_muc(jsonb)` ghi `san_pham.ton_toi_thieu`, chỉ quản lý/văn phòng | `0060_de_xuat_dinh_muc.sql`, `tests/34_dinh_muc_test.sql` | TQAN-02, D-04 |
| **WU-4** | RPC `nap_ton_tam(jsonb)` — sinh **một** chứng từ `DIEU_CHINH` đưa tồn từ 0 lên số KiotViet, atomic, ghi chú nói rõ là số tạm chưa đếm | `0061_nap_ton_tam.sql`, `tests/35_nap_ton_tam_test.sql` | D-05 |

⚠️ **WU-2 sửa hàm đã có người gọi** (`the_kho_san_pham` đang dùng ở trang chi tiết mã
hàng của Phase 2). Đổi kiểu trả về nên phải `drop` rồi `create` lại, và **cấp lại quyền**
— `create or replace` không đổi được kiểu trả về (tiền lệ 0029, 0051).

⚠️ **WU-3 ghi vào `san_pham`** — nhớ bẫy 5: mọi truy vấn phải liệt kê cột, cấm `select *`
và cấm `.select()` trống sau `update`, nếu không PostgREST trả 42501.

⚠️ **WU-4 phải đi qua `ghi_so_chung_tu`**, không được `insert` thẳng vào `kho_movement`
cũng không được `update ton_kho` — nguyên tắc kiến trúc số 1 và số 2.

⚠️ Bốn WU đều có migration. **Chỉ một database cloud dùng chung** nên phần
`npm run db:push` phải chạy tuần tự, không song song.

---

## Wave 2 — Lớp dữ liệu client (2 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-5** | `features/inventory`: kiểu dữ liệu + zod schema + query key + bộ lọc trên URL | `features/inventory/types.ts`, `schemas/inventory.schema.ts`, `api/inventory.keys.ts` | TON-01, TON-02 |
| **WU-6** | `features/inventory`: hàm gọi Supabase + hook TanStack Query | `features/inventory/api/inventory.api.ts`, `hooks/useInventory.ts` | TON-01, TON-02, TQAN-02 |

⚠️ **Bẫy 10** — hook đọc một bản ghi phải có `enabled: id !== ""`.
⚠️ **Bẫy 8** — bắt lỗi bằng `errorCode(e)` / `isPostgrestError(e)`, KHÔNG
`instanceof PostgrestError`. (CLAUDE.md còn ghi tên cũ `laLoiPostgrest`/`maLoi`.)

---

## Wave 3 — Giao diện (4 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-7** | Màn tồn kho `/ton-kho`: bảng mã × kho theo khuôn `ListLayout`, bộ lọc trên URL, 4 trạng thái của `QueryState`, **không có cột giá trị** | `app/(app)/ton-kho/page.tsx`, `features/inventory/components/stock-table.tsx`, `components/stock-filter-panel.tsx` | TON-01, D-01, D-02 |
| **WU-8** | **Mở rộng thẻ kho ĐÃ CÓ** — thêm cột tồn lũy kế và link mở chứng từ. Không dựng component mới | `features/products/components/stock-card.tsx`, `features/products/types.ts`, `features/products/api/product.api.ts` | TON-02, D-03 |
| **WU-9** | Màn duyệt đề xuất định mức: bảng đề xuất kèm **căn cứ** (bao nhiêu ngày, bao nhiêu lần bán, theo mã hay theo nhóm), chọn dòng để duyệt | `app/(app)/ton-kho/dinh-muc/page.tsx`, `features/inventory/components/reorder-level-table.tsx` | TQAN-02, D-04 |
| **WU-10** | Nạp tồn tạm: route đọc file danh mục KiotViet + màn xem trước rồi mới ghi. **Không dựng màn "dưới định mức" mới** — `/danh-muc?ton=duoi_dinh_muc` đã lọc được, chỉ cần một lối vào từ màn tồn kho | `app/api/ton-kho/nap-tam/route.ts`, `features/inventory/components/provisional-stock-preview.tsx` | D-05 |

⚠️ **WU-9 phải hiện rõ chất lượng dữ liệu**: lịch sử chỉ 10 ngày (03/09→12/09), phủ
1.223/3.266 mã. Người duyệt cần biết con số nào dựa trên dữ liệu thật của mã đó, con số
nào chỉ là trung bình nhóm. Không hiện thì duyệt mù.

⚠️ **Bẫy 11** — antd v6 bỏ prop của v5, chỉ cảnh báo lúc chạy còn build vẫn xanh.
Mở console một lần trên từng màn mới trước khi báo xong.

⚠️ **Bẫy 7** — đọc Excel chỉ ở server, giữ cả hai đường reader. **Đường dẫn trong bẫy 7
của CLAUDE.md SAI**: file thật là `src/shared/lib/excel-cell.ts` (`readFirstSheet`), không
phải `o-excel.ts`.

---

## Wave 4 — Tích hợp (1 WU)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-11** | Menu trái (`NAV_ITEMS`), chặn quyền bằng `requirePermission()` trong từng `page.tsx`, **thêm mọi route mới vào ma trận quyền**, chạy toàn bộ bộ kiểm | `shared/lib/navigation.ts`, `app/(app)/ton-kho/**/page.tsx`, `scripts/test-route-permissions.ts` | — |

⚠️ **Bẫy 12** — ma trận quyền phải liệt kê **mọi route thật**, kể cả route chỉ redirect.
Thiếu một dòng thì script vẫn báo xanh trong khi trang đó crash.

---

## Tổng kết phân rã

| Wave | Số WU | Chặn bởi |
|---|---|---|
| 1 — Nền database | 4 | WU-0 (phần trang bị máy) |
| 2 — Lớp dữ liệu client | 2 | Wave 1 |
| 3 — Giao diện | 4 | Wave 2 |
| 4 — Tích hợp | 1 | Wave 3 |
| **Tổng** | **11** | |

**Bộ kiểm phải xanh trước khi khép phase:**
`npm run check` · pgTAP (225 + assert của Phase 4 + assert mới) · `verify:hook` ·
hàm thuần · đọc Excel · quyền route · **và mở từng màn mới trên trình duyệt xem console**.

**Đường UAT thật:** chạy WU-4 (nạp tồn tạm) trước, rồi mới mở màn tồn kho — nếu không
thì màn nào cũng trắng, vì `ton_kho` hiện có **0 dòng khác 0**.
