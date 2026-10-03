# Phase 18: Đơn nhiều người nhận - Research

**Researched:** 2026-10-03
**Domain:** Postgres schema + RPC (Supabase), Next.js 16 / antd v6 order-entry UI, in phiếu lấy hàng
**Confidence:** HIGH (data model, RPC inventory and TS call-sites read from the repo and from the live local DB); MEDIUM on UI ergonomics (needs browser UAT)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D1 — Quan hệ người nhận cấp đơn <-> cấp dòng**
- Gán người nhận cho một dòng mà người đó chưa có trong danh sách người nhận của đơn -> **tự động thêm** vào danh sách của đơn.
- Ngoài ra vẫn thêm được người nhận thẳng vào danh sách của đơn (không cần gắn dòng nào).
- Hệ quả: danh sách người nhận của đơn ⊇ mọi người nhận ở dòng. Bất biến này phải giữ ở database (RPC/trigger), không chỉ ở giao diện.

**D2 — Dòng để trống người nhận**
- Dòng không gán người nhận = **hàng chung**, giao cho toàn bộ người nhận của đơn.
- Không bắt buộc gán từng dòng — đơn một người nhận nhập nhanh như hiện nay (không thêm thao tác).

**D3 — Áp dụng cho cả hai chế độ đơn**
- **Cả Nội bộ lẫn Đối tác** đều có danh sách nhân viên nhận ở cấp đơn và người nhận theo dòng.
- Đơn Đối tác vẫn có đúng **một** đối tác (khách); danh sách người nhận là nhân viên phụ trách, đi kèm.
- Đơn Nội bộ phải có ít nhất một người nhận (như hiện nay); đơn Đối tác được phép không có nhân viên nhận nào.
- NNHAN-01 sửa câu chữ: "Tạo/sửa đơn (Nội bộ hoặc Đối tác) chọn được một hoặc nhiều người nhận…".

**D4 — Phiếu đi lấy hàng**
- **Một tờ chung**: đầu phiếu liệt kê mọi người nhận của đơn (tên đầy đủ, theo `recipientDisplayName` của Phase 17 — không tiền tố, không mã); đơn Đối tác thêm dòng đối tác.
- Bảng thêm cột **"Người nhận"** ở mỗi dòng; dòng chung để trống (hoặc ghi "Chung" — Claude chọn, giữ nhất quán với màn hình).
- Vẫn nhóm theo kho như hiện tại; vẫn có Người đặt + In lúc (Phase 17).

### Claude's Discretion
- Bỏ một người khỏi danh sách đơn khi người đó đang được gán ở dòng: chặn kèm thông báo rõ dòng nào đang dùng (khuyến nghị), hoặc tự gỡ khỏi các dòng — chọn một, ghi lý do.
- Mô hình dữ liệu: bảng nối người nhận <-> đơn + cột người nhận trên dòng đơn; tương tự cho chứng từ hóa đơn (NNHAN-05). Giữ hay bỏ cột `nguoi_nhan_id` cũ trên đơn/chứng từ (không xóa cột có dữ liệu thật — chuyển dữ liệu rồi thôi dùng, như Phase 17).
- Giao diện chọn nhiều người (Select mode multiple / tag), cột người nhận trên lưới nhập dòng (giữ luồng bàn phím của bẫy 14/15).
- Bộ lọc danh sách đơn theo người nhận: khớp ở cấp đơn hoặc cấp dòng (NNHAN-03) — với D1 thì lọc theo cấp đơn là đủ.

### Deferred Ideas (OUT OF SCOPE)
- Báo cáo / thống kê theo người nhận.
- In tách mỗi người nhận một tờ (đã chọn một tờ chung).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NNHAN-01 | Tạo/sửa đơn (Nội bộ hoặc Đối tác) chọn một hoặc nhiều người nhận; gán ở dòng tự thêm vào danh sách đơn | Bảng nối `don_dat_hang_nguoi_nhan`; RPC `tao_don` / `dat_nguoi_nhan_don`; trigger D1 trên `don_dat_hang_dong`; multi-select ở form tạo + đầu đơn |
| NNHAN-02 | Từng dòng gán người nhận riêng | Cột `don_dat_hang_dong.nguoi_nhan_id`; cột "Người nhận" trong lưới + Select ở hàng nhập; `dong_don` trả thêm người nhận |
| NNHAN-03 | Danh sách đơn hiện đủ người nhận; lọc theo một người | `danh_sach_don` trả mảng người nhận + tham số `p_nguoi_nhan_id`; cột Tag + StaffSelect trong `OrderFilterPanel`, URL `?nhan_vien=` |
| NNHAN-04 | Phiếu lấy hàng in người nhận của đơn và từng dòng | `picking-print-template.tsx`: đầu phiếu liệt kê, thêm cột "Người nhận", sửa colSpan |
| NNHAN-05 | Hoàn thành đơn sinh hóa đơn mang theo người nhận; xem lại ở Duyệt đơn | `chung_tu_nguoi_nhan` + `chung_tu_dong.nguoi_nhan_id`, chép trong `tao_phieu_xuat_tu_don` (hoan_thanh_don gọi nó, KHÔNG sửa hoan_thanh_don); RPC mới `nguoi_nhan_dong_chung_tu`; UI Duyệt đơn |
| NNHAN-06 | Đơn cũ một người nhận chuyển nguyên | Backfill trong migration + khối `do $$` tự kiểm; cột cũ giữ nguyên dữ liệu |
</phase_requirements>

## Summary

Hôm nay "người nhận" của đơn là **hai cột loại trừ nhau** trên `don_dat_hang` (`doi_tac_id` XOR `nguoi_nhan_id`, ép bằng `ck_ddh_mot_nguoi_nhan`, 0076:27-29), trỏ tới `nhan_vien_phu_trach` (0077). Hóa đơn (`chung_tu`) có cột `nguoi_nhan_id` tương tự (CHECK "không đồng thời với doi_tac_id", 0076:42-44). Đơn được tạo và sửa bằng **INSERT/UPDATE thẳng qua PostgREST** (`order.api.ts:77`, `:98`), không qua RPC; dòng đơn cũng vậy. D3 (đối tác kèm nhân viên) làm CHECK cũ không còn đúng, và D1 cần một bất biến "dòng ⊆ đơn" ở database.

Đề xuất: **bảng nối là nguồn sự thật duy nhất**. `don_dat_hang_nguoi_nhan` (đơn) và `chung_tu_nguoi_nhan` (hóa đơn), cộng cột `nguoi_nhan_id` mới trên `don_dat_hang_dong` và `chung_tu_dong`. Cột `nguoi_nhan_id` cũ ở `don_dat_hang`/`chung_tu` được **giữ nguyên dữ liệu nhưng ngừng đọc/ghi**; mọi RPC đang đọc nó phải đổi sang bảng nối (8 hàm SQL + 2 file pgTAP — liệt kê ở dưới, bỏ sót một hàm là phân tích tồn kho tính nhầm hàng nội bộ vào "bán"). "Nội bộ" từ nay nghĩa là `doi_tac_id IS NULL`. Client không còn ghi bảng nối trực tiếp: người nhận cấp đơn đi qua RPC `tao_don` / `dat_nguoi_nhan_don`; người nhận cấp dòng vẫn là UPDATE thường lên `don_dat_hang_dong` và một **trigger** tự thêm người đó vào danh sách đơn (D1) — giữ nguyên luồng nhập nhanh.

Có một rủi ro hợp nhất cần biết trước: nhánh `feature/quy-chuan-ma-d` (chưa merge) viết lại `hoan_thanh_don`, `ghi_so_chung_tu`, `dong_chung_tu` trong 0088_combo. Kế hoạch dưới đây **tránh viết lại ba hàm đó** và chỉ viết lại `tao_phieu_xuat_tu_don` (0088 không đụng), nên hai nhánh không giẫm nhau.

**Primary recommendation:** Migration 0090 (bảng nối + backfill + trigger bất bất biến + RPC ghi) và 0091 (đổi các RPC đọc sang bảng nối), pgTAP 108/109, regen type, rồi 4 plan UI song song file-disjoint, cuối cùng UAT trình duyệt trên Supabase local.

## Project Constraints (from CLAUDE.md)

- Năm nguyên tắc: tồn là kết quả; sổ cái append-only; một bảng chứng từ; hai trạng thái sống (NHAP_LIEU -> HOAN_THANH, hóa đơn đã ghi sổ khóa); `ma_hang` là khóa nghiệp vụ. **Ghi sổ atomic bằng Postgres RPC** — việc chép người nhận sang hóa đơn phải nằm TRONG `tao_phieu_xuat_tu_don` (chạy trong transaction của `hoan_thanh_don`).
- Code tiếng Anh, hiển thị tiếng Việt có dấu, **URL/tham số truy vấn tiếng Việt không dấu**, tên bảng/cột/RPC tiếng Việt; chỉ `api/` + `types.ts` được thấy snake_case (mapper). Component/hook không thấy `ma_hang`/`nguoi_nhan_id`.
- Type bảng/RPC sinh bằng `npm run db:types`, không sửa tay `database.types.ts`; cấm `any`, cấm `!`.
- Mọi màn đọc dữ liệu bọc `<QueryState>`; loading/error/empty/success; form disable khi submit, giữ dữ liệu khi lỗi.
- Component > ~200 dòng thì tách (`issue-header.tsx` 199 dòng, `issue-line-table.tsx` 191 dòng — sửa là vượt, phải tách).
- Bẫy áp dụng: **5** (cột mới không phải của `san_pham`/`kho_movement` nên không cần `grant select (cột)`, nhưng đừng `select("*")` hai bảng đó), **8** (lỗi PostgREST là object thường, dùng `isPostgrestError`/`errorCode` từ `@/shared/lib/errors`), **9** (hàm thuần để ở file không `"use client"`), **10** (`enabled: id !== ""`), **11** (antd v6), **14/15** (luồng bàn phím), **19** (khung trình duyệt ẩn), **20** (không bọc có điều kiện quanh input), **21** (`filterByLabel`), **22** (`DELETE` không `WHERE` bị chặn qua PostgREST).
- Không cài thư viện mới; không đổi build/lint/tsconfig/CSS layer; migration xóa/đổi cột trên DB thật phải hỏi — kế hoạch này **không xóa cột nào**.
- Quy tắc toàn cục `~/.claude/rules/project/DATABASE_RULES.md` (Kotlin: không FK, soft delete, `deleted_at`) **không áp dụng** cho dự án Supabase này — 0006/0076/0077 đã dùng FK và `don_dat_hang_dong` xóa cứng; theo tiền lệ của dự án (có FK, xóa cứng bảng nối). `uuid_generate_v4()` và TEXT giữ nguyên.
- `.claude/skills/`, `.agents/skills/`: không tồn tại.

## Hiện trạng người nhận (đọc từ repo + DB local)

### Bảng / cột / ràng buộc

| Bảng | Cột liên quan | Ràng buộc / index | Nguồn |
|---|---|---|---|
| `don_dat_hang` | `doi_tac_id uuid NULL`, `nguoi_nhan_id uuid NULL` (FK `nhan_vien_phu_trach(id)` từ 0077:76-79) | `ck_ddh_mot_nguoi_nhan CHECK (num_nonnulls(doi_tac_id, nguoi_nhan_id) = 1)` (0076:27-29); `idx_ddh_nguoi_nhan` partial (0076:31) | 0076, 0077 |
| `don_dat_hang_dong` | không có cột người nhận (id, don_dat_hang_id, san_pham_id, so_luong_dat, so_luong_da_xuat, don_gia, created_at) | | 0006 |
| `chung_tu` | `doi_tac_id NULL`, `nguoi_nhan_id NULL` (FK `nhan_vien_phu_trach`) | `ck_chung_tu_khong_hai_nguoi_nhan CHECK (doi_tac_id IS NULL OR nguoi_nhan_id IS NULL)` (0076:42-44); `idx_chung_tu_nguoi_nhan` | 0076, 0077 |
| `chung_tu_dong` | không có cột người nhận | | |
| `nhan_vien_phu_trach` | `id, ten_viet_tat (unique lower(btrim)), ten_day_du, dang_dung` | RLS: ai cũng đọc, `quan_ly`/`van_phong` thêm/sửa, **không có xóa** | 0077:18-51 |

Dữ liệu local: `don_dat_hang` 4 dòng (3 nội bộ), `chung_tu` 9 dòng có `nguoi_nhan_id`, `nhan_vien_phu_trach` 3 dòng. Cloud có thể nhiều hơn — backfill phải tổng quát.

### RLS và grant (đã truy vấn `pg_policies` trên DB local)

- `don_dat_hang`: `doc don dat hang` (SELECT true), `tao don dat hang` (INSERT, `co_quyen('tao_don')`), `sua don dat hang` (UPDATE using `trang_thai='TAM' AND co_quyen('tao_don')`) — 0083:96-103. Không có DELETE.
- `don_dat_hang_dong`: SELECT theo đơn cha; INSERT/UPDATE/DELETE chỉ khi `co_quyen('tao_don')` VÀ đơn cha `TAM` (0052:167-209, 0083:105-). **Đơn không phải TAM thì dòng bị khóa ở RLS** -> người nhận cấp dòng cũng bị khóa theo, không cần policy mới.
- `chung_tu` / `chung_tu_dong`: UPDATE/DELETE chỉ khi `chung_tu.trang_thai = 'NHAP_LIEU'` (policy "chi sua ..."); hóa đơn đã ghi sổ khóa bằng RLS.
- Table-level grants: `authenticated` có đủ quyền trên cả bốn bảng (mặc định Supabase) và RLS là lớp chặn. **Không có column-level grant** trên bốn bảng này (trap 5 chỉ áp cho `san_pham`, `kho_movement`) — cột mới thêm vào bốn bảng này đọc được bình thường.
- Trigger: `ghi_nhat_ky_don_dat_hang` (AFTER INSERT/UPDATE, hàm generic `ghi_nhat_ky_sua`, ghi từng cột đổi vào `nhat_ky_sua`); `set_updated_at_*`. `chung_tu_dong` không có trigger.

### Cách ghi hôm nay (plain table writes, không RPC)

- Tạo đơn: `sinh_so_dh` RPC rồi `from("don_dat_hang").insert({so_dh, doi_tac_id, nguoi_nhan_id})` (`order.api.ts:66-91`).
- Sửa người nhận: `updateOrderHeader` -> `toOrderUpdate` ghi CẢ HAI cột (`order.schema.ts:49-62`).
- Dòng: `addOrderLine` insert `{don_dat_hang_id, san_pham_id, so_luong_dat}`; `updateOrderLine` (`toOrderLineUpdate`), `deleteOrderLine` — đều plain.
- RPC trạng thái: `xac_nhan_don` (0052:46), `mo_khoa_don` (0052:81), `dong_don_som` (0052:120), `huy_don` (0078:186), `hoan_thanh_don` (0078:97). Không cái nào đụng người nhận trực tiếp.

### Mọi RPC đọc/ghi người nhận — định nghĩa MỚI NHẤT (đã đối chiếu `pg_proc` của DB local)

| RPC | Định nghĩa mới nhất | Dùng cột cũ thế nào | Việc phải làm |
|---|---|---|---|
| `danh_sach_don(…8 tham số)` | `0077_nhan_vien_phu_trach.sql:132` | trả `nguoi_nhan_id, ten_nguoi_nhan`; lọc `p_loai_nhan='NOI_BO'` = `nguoi_nhan_id is not null` (dòng 174); từ khóa khớp tên NVPT | drop + create: trả mảng, thêm `p_nguoi_nhan_id`, `NOI_BO` = `doi_tac_id is null` |
| `chi_tiet_don(uuid)` | `0078_hoan_thanh_don.sql:346` | trả `nguoi_nhan_id, ten_nguoi_nhan` | drop + create: trả mảng |
| `dong_don(uuid)` | `0054_rpc_don_dat_hang.sql:119` (không đổi sau đó) | không có | drop + create: thêm `nguoi_nhan_id, ten_nguoi_nhan` theo dòng |
| `tao_phieu_xuat_tu_don(uuid)` | `0076_don_noi_bo.sql:225` (0077 xác nhận "không phải sửa"; 0088 của nhánh quy-chuan-d KHÔNG định nghĩa lại) | chép `v_don.nguoi_nhan_id` vào `chung_tu` (dòng 282) | create or replace: bỏ chép cột cũ, chép bảng nối + `nguoi_nhan_id` từng dòng |
| `hoan_thanh_don` | `0078:97` (nhánh quy-chuan-d viết lại ở 0088_combo:526) | không đụng | **KHÔNG sửa** — gọi `tao_phieu_xuat_tu_don` nên tự hưởng |
| `chi_tiet_chung_tu(uuid)` | `0077:268` | trả `nguoi_nhan_id, ten_nguoi_nhan` (dòng 303-308) | drop + create: trả mảng (dùng chung cho nhập/trả — `DocumentDetail`) |
| `dong_chung_tu(uuid)` | `0051_chung_tu_rpc_mo_rong.sql:186` (nhánh quy-chuan-d viết lại 0088:160) | không có | **KHÔNG sửa** — thêm RPC mới `nguoi_nhan_dong_chung_tu` |
| `danh_sach_chung_tu(…)` | `0077:331` | cột `ten_doi_tac` = `coalesce(dt.ten, 'Nội bộ — ' \|\| nn.ten_day_du)` (dòng 405); từ khóa khớp tên NVPT | create or replace (giữ kiểu trả): ghép tên từ bảng nối |
| `the_kho_san_pham(uuid,uuid,int,int)` | `0077:427` | cột `doi_tac` = `'Nội bộ — ' \|\| nn.ten_day_du` (dòng 455) | create or replace: ghép tên từ bảng nối |
| `phan_tich_ton_kho(int,date,uuid)` | `0079_phan_tich_ton_kho.sql:77` | `dh.nguoi_nhan_id is null` (160), `ct.nguoi_nhan_id is null` (115, 128, 138, 169) = "chỉ đối tác" | create or replace: thay bằng `doi_tac_id is not null` (tương đương cũ) |
| `nhip_ban_theo_ngay(int,date)` | `0079:218` | `ct.nguoi_nhan_id is null` (dòng 247) | tương tự |
| `danh_sach_nguoi_nhan_noi_bo()` | `0077:98` | không (đọc `nhan_vien_phu_trach`) | giữ nguyên; picker dùng tiếp |

Lấy thân hàm để viết lại **từ DB local** (`select pg_get_functiondef('public.<tên>(<kiểu>)'::regprocedure)`), không gõ lại tay — `phan_tich_ton_kho` dài, dễ lệch.

Pgtap hiện đọc cột cũ: `supabase/tests/30_don_noi_bo_test.sql` (insert `nguoi_nhan_id` làm "marker nội bộ", kiểm `chi_tiet_don.ten_nguoi_nhan`, `chung_tu.nguoi_nhan_id`, "Nội bộ — …") và `98_phan_tich_ton_kho_test.sql:76,118`. Hai file này **sẽ đỏ** sau 0090/0091 và phải viết lại. 27/29/31 cần chạy lại để xác nhận (không grep thấy cột cũ, nhưng 31 gọi `hoan_thanh_don`).

### Mọi chỗ TS chạm người nhận

| File | Chạm gì | Thay đổi |
|---|---|---|
| `src/shared/lib/recipient.ts` | `Recipient` union, `toRecipient`, `formatRecipient`, `recipientDisplayName`, `RecipientChoice` | thêm kiểu `StaffRef`, `OrderRecipients`, hàm thuần (ghép tên, nhãn dòng, "đa người nhận") |
| `src/shared/api/internal-recipient.api.ts`, `shared/hooks/use-internal-recipients.ts` | danh sách NVPT đang dùng | giữ; dùng chung cho multi-select |
| `src/shared/components/staff-select.tsx` | Select đơn | giữ (lọc đơn, ô dòng); thêm `staff-multi-select.tsx` |
| `sales-order/schemas/order.schema.ts` | `recipientChoiceSchema`, `orderHeaderSchema`, `toOrderUpdate` (ghi hai cột), `orderLineSchema`, `toOrderLineUpdate`, `OrderFilter` (`recipientKind`), URL read/write, `toOrderListRpcArgs` | đổi schema người nhận; `toOrderLineUpdate` thêm `recipientId`; `OrderFilter.staffId` + `?nhan_vien=` |
| `sales-order/types.ts` | `OrderRow/OrderDetail.recipient: Recipient|null`, `OrderLine`, `toOrderRow/Detail/Line` | `partner` + `staff[]`; `OrderLine.recipientId/recipientName` |
| `sales-order/api/order.api.ts` | `createOrder`, `updateOrderHeader`, `addOrderLine`, `updateOrderLine` | `createOrder` -> RPC `tao_don`; thêm `setOrderRecipients` -> `dat_nguoi_nhan_don`; `updateOrderHeader` chỉ còn ghi chú |
| `sales-order/hooks/useOrders.ts` | `useCreateOrder`, `useUpdateOrderHeader`, … | thêm `useSetOrderRecipients`; đổi chữ ký |
| `sales-order/components/recipient-picker.tsx`, `order-recipient-field.tsx`, `new-order-form.tsx`, `order-header.tsx` | chọn một người | multi-select (xem UI) |
| `sales-order/components/order-line-columns.tsx`, `order-line-table.tsx`, `order-line-entry-row.tsx`, `order-detail.tsx` | lưới dòng | cột + Select người nhận |
| `sales-order/components/order-filter-panel.tsx`, `order-table-body.tsx` | lọc loại + cột | thêm lọc theo người; cột Tag |
| `sales-order/components/picking-print-template.tsx` | `recipientDisplayName(order.recipient)` | liệt kê + cột "Người nhận"; colSpan |
| `documents/types.ts` (`toDocumentDetail`, `toDocumentLine`), `documents/schemas/document.schema.ts` (`internalRecipientId`, `toDocumentUpdate`), `documents/api/document.api.ts` | hóa đơn đọc `nguoi_nhan_id` | đổi mapper; **xóa** `internalRecipientId` khỏi schema (hóa đơn từ đơn đã ghi sổ khóa, không sửa người nhận ở hóa đơn) |
| `stock-out/components/issue-header.tsx` (199 dòng), `issue-detail.tsx`, `issue-line-columns.tsx`, `issue-line-table.tsx` (191), `delivery-print-template.tsx` | nhánh `recipient.kind === "internal"` + `StaffSelect` sửa người nhận | hiển thị chỉ-đọc danh sách + cột dòng; tách file |
| `scripts/test-pure-functions.ts` (dòng ~91-94, 610-633, 685-741) | `toRecipient`, `formatRecipient`, `toOrderUpdate`, `readOrderFilterFromUrl`, issue/document mapper, `toDocumentUpdate` | cập nhật + thêm assert |
| `scripts/test-route-permissions.ts:166` | gọi `danh_sach_don` | tham số mới optional — không đổi |
| `src/features/settings/hooks/useStaff.ts` | invalidate `internalRecipientKeys` | không đổi |

## Standard Stack

Không thêm thư viện (CLAUDE.md "Không tự ý làm").

| Thành phần | Version (đã đọc từ package.json / node_modules) | Dùng cho |
|---|---|---|
| antd | 6.6.3 | `Select mode="multiple"`, `Tag`, `Table` |
| @tanstack/react-query | ^5.102.8 | mutation + invalidate |
| @supabase/supabase-js | ^2.116.0 | `.rpc()` |
| zod | ^4.6.2 | schema |
| Supabase CLI | có (`npx supabase`), Docker local `supabase_db_rnpqgbuypmecxiatuulz` đang chạy | pgTAP, type gen |

## Mô hình dữ liệu đề xuất

### Bảng mới

```sql
-- 0090 — người nhận nhiều-nhiều
create table public.don_dat_hang_nguoi_nhan (
  don_dat_hang_id uuid not null references public.don_dat_hang(id),
  nguoi_nhan_id   uuid not null references public.nhan_vien_phu_trach(id),
  thu_tu          integer not null,          -- thứ tự hiển thị, gán theo vị trí trong mảng RPC
  created_at      timestamptz not null default now(),
  primary key (don_dat_hang_id, nguoi_nhan_id)
);
create index idx_ddh_nguoi_nhan_theo_nguoi on public.don_dat_hang_nguoi_nhan (nguoi_nhan_id);  -- lọc NNHAN-03

create table public.chung_tu_nguoi_nhan (
  chung_tu_id   uuid not null references public.chung_tu(id),
  nguoi_nhan_id uuid not null references public.nhan_vien_phu_trach(id),
  thu_tu        integer not null,
  created_at    timestamptz not null default now(),
  primary key (chung_tu_id, nguoi_nhan_id)
);
create index idx_chung_tu_nguoi_nhan_theo_nguoi on public.chung_tu_nguoi_nhan (nguoi_nhan_id);

alter table public.don_dat_hang_dong add column nguoi_nhan_id uuid references public.nhan_vien_phu_trach(id);
alter table public.chung_tu_dong     add column nguoi_nhan_id uuid references public.nhan_vien_phu_trach(id);
create index idx_ddh_dong_nguoi_nhan on public.don_dat_hang_dong (nguoi_nhan_id) where nguoi_nhan_id is not null;
```

RLS + grant cho hai bảng nối: bật RLS; **chỉ policy SELECT** (`exists (select 1 from <cha> where id = …)`, khuôn "doc dong …"); **không** policy ghi; thêm `revoke insert, update, delete, truncate on … from anon, authenticated` (đai thứ hai). Ghi chỉ qua hàm `security definer`. Bài kiểm "không sót bảng chưa bật RLS" (`supabase/tests/30_rls_test.sql:186`) sẽ bắt nếu quên.

Kiểu cột "dòng" mới nằm ở `don_dat_hang_dong`/`chung_tu_dong` -> không cần `grant select (cột)`.

### Cột cũ `nguoi_nhan_id` trên `don_dat_hang` / `chung_tu` (khuyến nghị)

**Giữ nguyên dữ liệu, ngừng đọc/ghi, không NULL-hóa, không DROP.** Như Phase 17 (`ngay_giao_du_kien`). Hệ quả bắt buộc:
- **Drop `ck_ddh_mot_nguoi_nhan`** (đơn nội bộ mới có `doi_tac_id` NULL **và** `nguoi_nhan_id` NULL sẽ vi phạm `num_nonnulls = 1`). Đây là DROP *constraint*, không phải dữ liệu.
- `ck_chung_tu_khong_hai_nguoi_nhan` giữ nguyên (cả hai NULL vẫn hợp lệ).
- `COMMENT ON COLUMN` ghi rõ "ngừng dùng từ 0090 — nguồn sự thật là `don_dat_hang_nguoi_nhan`/`chung_tu_nguoi_nhan`". Test pgTAP cũ (30) cũng cần bỏ `fk_ok` giả định còn dùng.
- Định nghĩa "nội bộ": đơn `doi_tac_id IS NULL`; hóa đơn XUAT `doi_tac_id IS NULL` (đã xác minh: hóa đơn XUAT tạo tay luôn có đối tác — `create-issue-button.tsx` bắt chọn; local có 0 phiếu XUAT thiếu cả hai). Tương đương phép thử cũ `nguoi_nhan_id IS NULL` ⇔ đối tác, nên phân tích tồn kho không đổi nghĩa.

Phương án đã loại: *giữ cột cũ làm "người nhận đầu tiên" đồng bộ bằng trigger* — giữ được 8 hàm cũ chạy nguyên, nhưng là hai nguồn sự thật cho cùng một thông tin và vẫn buộc `ck_ddh_mot_nguoi_nhan`; ngược với nguyên tắc dự án ("ba nguồn sự thật có thể cãi nhau", 0076:5-6) và với CONTEXT "thôi dùng".

### Bất biến ở database

1. **D1 — dòng ⊆ đơn** (trigger, đúng cả khi ghi plain qua PostgREST):

```sql
create function public._tu_them_nguoi_nhan_don() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Khóa chia sẻ đơn cha: dat_nguoi_nhan_don giữ FOR UPDATE nên người bỏ người nhận
  -- và người gán dòng phải xếp hàng, không ai lọt khe (xem Concurrency).
  perform 1 from public.don_dat_hang where id = new.don_dat_hang_id for share;
  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  values (new.don_dat_hang_id, new.nguoi_nhan_id,
          coalesce((select max(thu_tu) from public.don_dat_hang_nguoi_nhan
                    where don_dat_hang_id = new.don_dat_hang_id), 0) + 1)
  on conflict (don_dat_hang_id, nguoi_nhan_id) do nothing;
  return new;
end $$;
create trigger tu_them_nguoi_nhan_don
  after insert or update of nguoi_nhan_id on public.don_dat_hang_dong
  for each row when (new.nguoi_nhan_id is not null)
  execute function public._tu_them_nguoi_nhan_don();
```

2. **Không bỏ người nhận còn dùng ở dòng** (chặn — xem mục dưới): kiểm trong `dat_nguoi_nhan_don` VÀ `BEFORE DELETE` trigger trên `don_dat_hang_nguoi_nhan` (lưới an toàn nếu sau này có đường xóa khác).
3. **D3 — đơn nội bộ phải ≥ 1 người nhận**: constraint trigger `DEFERRABLE INITIALLY DEFERRED` trên `don_dat_hang` (`AFTER INSERT OR UPDATE OF doi_tac_id`) và trên `don_dat_hang_nguoi_nhan` (`AFTER DELETE`): nếu `doi_tac_id IS NULL` mà không còn dòng bảng nối -> `raise exception … using errcode='23514'`. Deferred để RPC chèn đầu đơn rồi chèn người nhận trong cùng transaction. Hệ quả: insert tay `don_dat_hang` không kèm người nhận (đường cũ của client) sẽ bị từ chối lúc commit -> client buộc phải dùng `tao_don`.
4. **Hóa đơn bất biến**: `chung_tu_nguoi_nhan` không có policy/grant ghi; chỉ `tao_phieu_xuat_tu_don` (definer) chèn. `chung_tu_dong.nguoi_nhan_id` sau khi chép chỉ đổi được khi hóa đơn `NHAP_LIEU` theo policy hiện có (hóa đơn từ `hoan_thanh_don` ghi sổ ngay nên thực tế không bao giờ sửa được).

### RPC ghi mới (đều `security definer`, `set search_path = ''`, `revoke … from public, anon; grant execute … to authenticated`)

| RPC | Việc |
|---|---|
| `tao_don(p_doi_tac_id uuid default null, p_nguoi_nhan_ids uuid[] default '{}') returns uuid` | `co_quyen('tao_don')` (qua `sinh_so_dh`, 0053:39 đã kiểm); `doi_tac_id` null -> bắt buộc ≥ 1 người; nhân viên phải `dang_dung`; sinh số, insert đầu đơn, insert bảng nối theo thứ tự mảng; trả id. Một transaction. |
| `dat_nguoi_nhan_don(p_don_id uuid, p_doi_tac_id uuid, p_nguoi_nhan_ids uuid[]) returns void` | `for update` đơn; chỉ `TAM` + `co_quyen('tao_don')`; luật chế độ như trên; **chặn** nếu bỏ người còn gán ở dòng (message liệt kê mã hàng); đổi `doi_tac_id` nếu khác; đồng bộ bảng nối (xóa người bị bỏ — `delete … where don_dat_hang_id = p_don_id and nguoi_nhan_id <> all(…)` có `WHERE` rõ ràng, bẫy 22; chèn người mới; cập nhật `thu_tu`). Nhận **toàn bộ tập mong muốn** nên khớp tự nhiên với multi-select. |
| `nguoi_nhan_dong_chung_tu(p_id uuid) returns table (chung_tu_dong_id uuid, nguoi_nhan_id uuid, ten_nguoi_nhan text)` | Chỉ trả dòng hóa đơn có người nhận; đi qua `chi_tiet_chung_tu(p_id)` để thừa hưởng kiểm quyền/phạm vi kho như `dong_chung_tu` (0051:186-). Thêm mới thay vì sửa `dong_chung_tu` để **không đụng 0088 của quy-chuan-d**. |

Lỗi nghiệp vụ dùng `errcode '23514'` (client đã hiển thị `caught.message` cho mã này, `new-order-form.tsx:46-48`), thiếu quyền `42501`.

### Hình dạng RPC đọc (đã chốt để mapper TS đơn giản, kiểu sinh tự động có kiểu thật)

`danh_sach_don`, `chi_tiet_don`, `chi_tiet_chung_tu` trả **hai mảng song song cùng thứ tự `thu_tu`**: `nguoi_nhan_ids uuid[]`, `ten_nguoi_nhan text[]` (luôn `coalesce(…, '{}')`, tạo từ **một** subquery có `order by thu_tu` để hai mảng không bao giờ lệch nhau). Không dùng `jsonb` (kiểu sinh ra là `Json`, buộc phải parse + dễ dùng `any`). `dong_don` trả `nguoi_nhan_id uuid, ten_nguoi_nhan text` mỗi dòng. `danh_sach_don` thêm tham số `p_nguoi_nhan_id uuid default null` -> `exists (select 1 from don_dat_hang_nguoi_nhan where don_dat_hang_id = dh.id and nguoi_nhan_id = p_nguoi_nhan_id)`. Với D1 lọc ở cấp đơn là đủ (NNHAN-03 thỏa); không cần `OR` cấp dòng.

Phải `drop function` bản cũ của `danh_sach_don` trước khi tạo bản mới (tránh hai overload làm PostgREST mơ hồ — 0076:87 đã làm đúng như vậy); `dong_don`/`chi_tiet_don` gọi nhau theo tên trong thân plpgsql nên drop không kéo theo (ghi chú 0076:176-178).

### Backfill NNHAN-06 (trong 0090, TRƯỚC khi tạo constraint trigger và drop CHECK)

```sql
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select id, nguoi_nhan_id, 1 from public.don_dat_hang where nguoi_nhan_id is not null;

insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
select id, nguoi_nhan_id, 1 from public.chung_tu where nguoi_nhan_id is not null;

-- tự kiểm: dừng cả migration nếu có đơn/hóa đơn mất người nhận
do $$ … raise exception … $$;
```

Không `UPDATE` bảng đơn nên không sinh dòng nhật ký sửa thừa (cùng lập luận 0077:10-12). Dòng đơn cũ không có người nhận riêng = hàng chung, đúng D2.

### Chép sang hóa đơn (NNHAN-05) — trong `tao_phieu_xuat_tu_don` (thân 0076:225-301)

Chỉ đổi: (a) insert header **không** chép `v_don.nguoi_nhan_id` nữa; (b) thêm `insert into chung_tu_nguoi_nhan select v_ct.id, nguoi_nhan_id, thu_tu from don_dat_hang_nguoi_nhan where don_dat_hang_id = p_don_id;` (c) câu insert `chung_tu_dong` kèm `d.nguoi_nhan_id` (câu đó đã là `select … from don_dat_hang_dong d`, nên ánh xạ dòng đơn -> dòng hóa đơn miễn phí, không cần bảng liên kết). Dòng hóa đơn vẫn 1:1 với dòng đơn (combo của nhánh quy-chuan-d tách ở `ghi_so_chung_tu`, không ở bước này — 0088:7).

Hủy hóa đơn rồi hoàn thành lại: hóa đơn cũ giữ nguyên bản ghi người nhận của nó; hóa đơn mới chép lại từ đơn. Đúng nguyên tắc 4.

## Architecture Patterns

### Cấu trúc file (theo CLAUDE.md Bước 2)

```
supabase/migrations/0090_don_nhieu_nguoi_nhan.sql      # bảng, backfill, trigger, RPC ghi
supabase/migrations/0091_nguoi_nhan_rpc_doc.sql        # RPC đọc đổi nguồn
supabase/tests/108_don_nhieu_nguoi_nhan_test.sql       # bất biến + RPC ghi + backfill + RLS
supabase/tests/109_nguoi_nhan_rpc_doc_test.sql         # đọc, lọc, hóa đơn chép, phân tích tồn
src/shared/lib/recipient.ts                            # kiểu + hàm thuần (không "use client")
src/shared/components/staff-multi-select.tsx           # mới
src/features/sales-order/…                             # như bảng TS ở trên
```

### Pattern 1 — kiểu miền và mapper (chỗ duy nhất biết tên cột)

```ts
// shared/lib/recipient.ts — thuần, không "use client" (bẫy 9)
export type StaffRef = { id: string; name: string };
export type PartnerRef = { id: string; code: string | null; name: string | null };
export type OrderRecipients = { partner: PartnerRef | null; staff: StaffRef[] };

/** Ghép hai mảng song song của RPC; thiếu tên thì "?" chứ không bỏ người. */
export function toStaffRefs(ids: string[] | null, names: string[] | null): StaffRef[] {
  return (ids ?? []).map((id, i) => ({ id, name: names?.[i] ?? "?" }));
}
export const isMultiRecipient = (staff: StaffRef[], anyLineAssigned: boolean) =>
  staff.length >= 2 || anyLineAssigned;
export const COMMON_GOODS_LABEL = "Chung";
```

`Recipient`/`toRecipient`/`formatRecipient` còn dùng cho `formatRecipient` ở danh sách chứng từ (chuỗi "Nội bộ — …" vẫn do SQL ghép) — giữ lại hoặc thu hẹp, nhưng `recipientDisplayName` (Phase 17) giữ nguyên chữ ký (D4 tham chiếu nó) và dùng cho từng tên.

### Pattern 2 — ghi người nhận đơn là "đặt cả tập"

`OrderRecipientsField` giữ `Segmented` Nội bộ/Đối tác, và mỗi lần đổi gọi `useSetOrderRecipients` với `{ partnerId | null, staffIds }`. Giá trị `Select` luôn **lấy từ dữ liệu server** (controlled): lỗi chặn -> `message.error(err.message)` và ô tự về giá trị cũ. Chuyển chế độ chưa lưu gì tới khi đủ điều kiện (Nội bộ cần ≥ 1 người; đối tác cần chọn đối tác) — giữ lại cơ chế `pendingKind` hiện có (`order-recipient-field.tsx`).

### Pattern 3 — người nhận ở dòng: UPDATE thường, DB lo bất biến

`updateOrderLine(id, { recipientId })` -> `toOrderLineUpdate` ghi `nguoi_nhan_id` (`null` để xóa = hàng chung). Trigger D1 tự thêm vào đơn; `useRefreshOrder` đã invalidate cả `detail`, `lines` và `all` nên header thấy người mới. Phát hiện "đã tự thêm" ở client: so `order.staff` trước/sau (hoặc kiểm `staff` không chứa `recipientId` trước khi gọi) -> `message.info("Đã thêm <tên> vào người nhận của đơn.")`.

### Anti-Patterns

- **Ghi bảng nối từ client** hoặc để UI "tự thêm" người nhận đơn khi gán dòng — bất biến phải ở DB (D1).
- **Sửa `hoan_thanh_don` / `dong_chung_tu` / `ghi_so_chung_tu`** — nhánh `quy-chuan-ma-d` đã viết lại cả ba (0088_combo:160, 203, 526), sẽ xung đột khi hợp nhất.
- **Để cột cũ và bảng nối cùng sống** (mirror) — hai nguồn sự thật.
- **Đọc `ct.nguoi_nhan_id is null` làm "đối tác"** ở bất kỳ RPC nào còn sót.
- Cố "thông minh" gán lại dòng khi gỡ người nhận (xem mục kế).

## Don't Hand-Roll

| Vấn đề | Đừng làm | Dùng | Lý do |
|---|---|---|---|
| Danh sách nhân viên + tìm không dấu | Select tự viết | `useInternalRecipients` + `filterByLabel`/`labelMatches` (`shared/lib/text.ts`) | Bẫy 21 |
| Đảm bảo ⊆ ở client | useEffect đồng bộ | trigger D1 | Hai người sửa cùng lúc; ghi tay qua API |
| Bảng liên kết dòng đơn -> dòng hóa đơn | cột `don_dat_hang_dong_id` trên `chung_tu_dong` | `INSERT … SELECT` có `d.nguoi_nhan_id` ngay trong `tao_phieu_xuat_tu_don` | Dòng được sinh đúng từ select đó |
| Số đơn | ghép ở client | `sinh_so_dh` bên trong `tao_don` | Đã có (0053) |
| Hiển thị lỗi PostgREST | `instanceof PostgrestError` | `isPostgrestError`, `errorCode`, `explainError` (`@/shared/lib/errors`) | Bẫy 8 |
| Mảng người nhận dạng JSON | `jsonb` + parse | hai mảng `uuid[]`/`text[]` | Kiểu sinh tự động có kiểu thật |

## Xử lý bỏ người nhận đang gán ở dòng (Claude's Discretion — chọn: CHẶN)

**Khuyến nghị: chặn**, kèm thông báo nêu mã hàng đang dùng. Lý do: tự gỡ khỏi dòng làm dòng đó âm thầm thành "hàng chung" = giao cho TẤT CẢ người nhận (D2) — kho đi lấy hàng sai người mà không ai nhìn thấy thay đổi; chặn thì người nhập quyết định (gỡ ở dòng rồi bỏ khỏi đơn). Thông báo: `Không bỏ được "<tên>" khỏi đơn: đang gán cho dòng <mã1>, <mã2>. Gỡ người nhận ở các dòng đó trước.` Ở UI có thể kiểm trước từ `lines` để báo tức thì (và vô hiệu nút đóng tag), nhưng DB vẫn là bên quyết định.

## UI (antd 6.6.3)

- **Tạo đơn (`new-order-form.tsx`)**: giữ `Segmented` Nội bộ (mặc định)/Đối tác. Nội bộ: `StaffMultiSelect` (autoFocus). Đối tác: `PartnerSearchInput` (một đối tác) + `StaffMultiSelect` tùy chọn ("Nhân viên phụ trách"). Nút Tạo khóa tới khi đủ (Nội bộ ≥ 1 người; Đối tác có đối tác). Gọi `tao_don` một lần. Đơn một người nhận không thêm bước nào so với hôm nay.
- **Đầu đơn (`order-header.tsx` + viết lại `order-recipient-field.tsx`)**: `Descriptions` giữ; ô "Người nhận" thành multi-select (và ô đối tác khi chế độ đối tác). Chỉ đọc: Tag danh sách. Component `recipient-picker.tsx` đang lồng Segmented + một ô -> đổi thành picker nhận `kind`, `partnerId`, `staffIds`.
- **`StaffMultiSelect` (`shared/components/staff-multi-select.tsx`)**: `Select mode="multiple" showSearch allowClear maxTagCount="responsive" filterOption={filterByLabel}`; `options` = nhân viên `dang_dung` **cộng** những người đang ở đơn nhưng đã ngừng dùng (nếu không rc-select hiện uuid thô — bẫy hay gặp khi `dang_dung=false`).
- **Lưới dòng (`order-line-columns.tsx`, `order-line-table.tsx`, `order-line-entry-row.tsx`)**: quy tắc "chế độ đa người nhận" = đơn có ≥ 2 nhân viên **hoặc** có dòng đã gán. Chế độ đó mới hiện cột "Người nhận" (editable: `Select` nhỏ, `allowClear`, placeholder "Chung", `value` lấy từ dữ liệu server, options = **mọi** nhân viên đang dùng — chọn người ngoài đơn sẽ tự thêm, D1); và Select "Người nhận" ở hàng nhập. Chưa ở chế độ đó: không thêm cột, không thêm ô -> đơn một người nhập nhanh y như cũ (D2). Muốn gán dòng đầu tiên cho một người thứ hai: thêm người đó ở đầu đơn (đơn thành ≥ 2 người) rồi cột hiện.
- **Luồng bàn phím (bẫy 14/15/20)**: chuỗi giữ nguyên mã -> Enter -> số lượng -> Enter = lưu. Select người nhận của hàng nhập **nằm ngoài chuỗi Enter** (Tab tới được), giữ giá trị "dính" giữa các lần thêm dòng cho tới khi xóa/đổi đơn, luôn hiển thị tên đang chọn (không gán nhầm im lặng). Sau lưu vẫn `setTimeout(() => codeInput.current?.focus(), 0)` (bẫy 14b). **Không** bọc có điều kiện (`if … return <Tooltip>`) quanh input không kiểm soát (bẫy 20) — ẩn/hiện cả cụm bằng điều kiện render ở mức cột/ô nhưng không đổi cây của `InputNumber` số lượng; Select ở ô dòng dùng `value` controlled nên đổi cây không mất trạng thái gõ. Select người nhận không dùng `onPressEnter` của antd nhưng nếu thêm bắt Enter thì dùng `onKeyDownCapture` ở div bọc như `ProductSearchInput`.
- **Danh sách (`order-table-body.tsx`)**: cột "Người nhận": Tag cho từng nhân viên (đơn đối tác: tên đối tác + Tag nhân viên); `OrderFilterPanel`: giữ "Loại người nhận" (đổi nghĩa Nội bộ = không có đối tác), thêm `StaffSelect` "Người nhận" (đơn lẻ, `allowClear`) -> `?nhan_vien=<uuid>` (**không** dùng `?nguoi_nhan=` vì đã là loại: `doi_tac|noi_bo`). `countActiveOrderFilters` +1. Bẫy 10/21 ở `StaffSelect` đã được xử lý sẵn.
- **Phiếu lấy hàng (`picking-print-template.tsx`)**: đầu phiếu `Người nhận:` = tên các nhân viên nối `, ` (dùng `recipientDisplayName`-style: không tiền tố, không mã); đơn đối tác thêm dòng `Đối tác:`. Bảng thêm cột **"Người nhận"** (D4 nguyên văn: luôn có cột); ô để trống thì ghi "Chung" **chỉ khi đơn ≥ 2 nhân viên**, còn lại để trống (đơn một người toàn chữ "Chung" chỉ làm rối tờ giấy). **Phải sửa `colSpan`**: hàng nhóm kho 6 -> 7 (`picking-print-template.tsx` `colSpan={6}`), `tfoot` 4 -> 5. Cột "Người nhận" đặt trước "SL đặt" để cột "SL thực lấy" vẫn là ô ghi tay cuối cùng. Tên người nhận ở dòng sắp theo thứ tự hiện có (nhóm kho -> mã), không nhóm theo người (D4: một tờ chung).
- **Duyệt đơn (`stock-out`)**: `issue-detail.tsx`/`issue-header.tsx` bỏ nhánh sửa `StaffSelect` (`internalRecipientId`) — hóa đơn từ đơn đã ghi sổ, không sửa; hiển thị chỉ-đọc Tag danh sách + đối tác. Bảng dòng thêm cột "Người nhận" (nối `nguoi_nhan_dong_chung_tu` vào `lines` ở tầng `api`/hook, khuôn "nối thêm" của `issue.api.ts`), chỉ hiện khi có dòng gán. `issue-header.tsx` (199) và `issue-line-table.tsx` (191) sẽ vượt 200 dòng -> tách. `delivery-print-template.tsx`: in danh sách người nhận (tùy chọn, không thuộc NNHAN-04/05 nhưng cùng một dòng "Người nhận" đang in).
- **antd v6 (bẫy 11)**: `Alert` dùng `title` không `message`; `Select` không dùng `dropdownStyle`/`popupClassName` kiểu v5 (v6 là `styles.popup`/`classNames`); không `Tag bordered`; không `Drawer width`. Option "Tất cả" của Select lọc vẫn là `""` (không `null`). **Mở console một lần** trên màn mới trước khi báo xong.

## Concurrency / Realtime (tối thiểu)

- Không có realtime trên đơn; hai người sửa cùng đơn thấy nhau khi `invalidateQueries`/tải lại. Chỉ cần lo một khe ghi: A bỏ người X khỏi đơn trong khi B vừa gán X vào một dòng.
  - `dat_nguoi_nhan_don` lấy `SELECT … FOR UPDATE` trên `don_dat_hang`; trigger D1 lấy `FOR SHARE` cùng hàng -> hai bên xếp hàng. Nếu A xong trước: trigger của B chèn lại X (`on conflict do nothing` chạy sau commit của A nên chèn mới). Nếu B xong trước: A thấy dòng của B và từ chối bỏ X.
  - Không có ví dụ cần `npm run test:concurrency` mới; pgTAP không mô phỏng được hai transaction — ghi vào UAT: kiểm lại tay bằng hai tab nếu muốn, nhưng không chặn phase.
- Dòng đơn cùng `UPDATE` ở hai tab: giá trị cuối thắng; không cần khóa lạc quan thêm (đã là tiền lệ của số lượng).

## Common Pitfalls

### Pitfall 1: Sót một hàm đọc cột cũ
**Sai gì:** đơn nội bộ mới (cột cũ NULL) bị `phan_tich_ton_kho`/`nhip_ban_theo_ngay` tính vào "bán"; thẻ kho/danh sách chứng từ hiện "Nội bộ — " rỗng.
**Tránh:** sau 0091 chạy `select p.oid::regprocedure from pg_proc p where pronamespace='public'::regnamespace and prokind='f' and prosrc ilike '%nguoi_nhan_id%'` — chỉ được còn `tao_phieu_xuat_tu_don`-liên quan bảng mới và các hàm mới; đưa câu này vào pgTAP 109 (`is(count, 0)` cho danh sách cấm).

### Pitfall 2: `ck_ddh_mot_nguoi_nhan` còn sống
Đơn nội bộ mới vi phạm `num_nonnulls = 1`. Drop trong 0090 **sau** backfill.

### Pitfall 3: Constraint trigger hoãn không nổ trong pgTAP
pgTAP chạy trong `begin … rollback`, trigger `INITIALLY DEFERRED` không bao giờ nổ. Test phải `set constraints all immediate;` (hoặc gọi `set constraints <tên> immediate`) trước khi kiểm "đơn nội bộ không có người nhận bị từ chối".

### Pitfall 4: Xung đột hợp nhất với quy-chuan-ma-d
Chỉ viết lại `tao_phieu_xuat_tu_don` (0076:225, nhánh kia chỉ *gọi* nó ở 0088:559). Ngay trước khi viết 0090, chạy lại câu kiểm số migration/hàm trên mọi nhánh (xem Environment) và `git show feature/quy-chuan-ma-d:supabase/migrations/0088_combo.sql | grep -n "tao_phieu_xuat_tu_don"`; nếu nhánh đó đổi định nghĩa `tao_phieu_xuat_tu_don` thì lấy thân MỚI NHẤT làm gốc.

### Pitfall 5: Hai mảng người nhận lệch nhau
Dựng cả hai từ một subquery có `order by thu_tu`; `coalesce` thành `'{}'`. Mapper dùng `toStaffRefs` và không tin độ dài.

### Pitfall 6: Nhân viên đã ngừng dùng
Đơn cũ có thể trỏ nhân viên `dang_dung = false`. Options multi-select phải gộp người đang ở đơn; nếu không ô hiện uuid hoặc xóa mất người khi lưu (RPC nhận tập, thiếu tên = bị coi là bỏ). RPC `tao_don` chỉ cho thêm nhân viên đang dùng; `dat_nguoi_nhan_don` cho **giữ** người đã có dù ngừng dùng, chỉ chặn *thêm mới* người ngừng dùng.

### Pitfall 7: `tao_don` và quyền
`sinh_so_dh` ném `42501` nếu thiếu `tao_don`; giữ nguyên thông báo ở `new-order-form.tsx`. Hàm `security definer` bỏ qua RLS nên phải tự kiểm `co_quyen('tao_don')` và `trang_thai = 'TAM'` trong `dat_nguoi_nhan_don`.

### Pitfall 8: Giá trị Select dính ở hàng nhập
Người nhận "dính" qua các lần thêm dòng: phải reset khi đổi đơn (đổi `orderId`), khi người đó bị bỏ khỏi đơn, và hiển thị rõ để khỏi gán nhầm 470 dòng/ngày.

### Pitfall 9: Component vượt 200 dòng
`issue-header.tsx` (199), `issue-line-table.tsx` (191), `order-line-columns.tsx` (131 + cột mới), `order-detail.tsx` (134) — tách theo trách nhiệm ngay trong plan, không xin phép.

### Pitfall 10: Cloud/UAT trỏ nhầm
`.env.local` của dev **đang trỏ Supabase local** (kiểm 03/10 bởi orchestrator — memory cũ ghi cloud là lỗi thời); vẫn phải kiểm lại trước UAT. Cloud (memory: cloud rnpq có tới 0084, thiếu 0085-0089 và tất nhiên 0090/0091). Chạy UAT bằng `npm run dev` với biến môi trường ghi đè sang Supabase local (`npx supabase status` lấy URL/khóa; `npm run seed:users` trên local) — không push 0090/0091 lên cloud trong phase này nếu chưa được duyệt (xem Open Questions).

### Pitfall 11: `delete` không `WHERE`
`dat_nguoi_nhan_don` xóa tập con bảng nối — luôn có `where don_dat_hang_id = …` (bẫy 22; pgTAP gọi bằng `postgres` không thấy lỗi này, nên thử một lần qua supabase-js trong UAT).

## Code Examples

### `dat_nguoi_nhan_don` (khung, đã gồm chặn bỏ người đang dùng)

```sql
create function public.dat_nguoi_nhan_don(p_don_id uuid, p_doi_tac_id uuid, p_nguoi_nhan_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_don public.don_dat_hang;
  v_dang_dung text;
begin
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;
  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then raise exception 'Không tìm thấy đơn' using errcode = '23514'; end if;
  if v_don.trang_thai <> 'TAM' then
    raise exception 'Đơn % đã xác nhận, không sửa người nhận được', v_don.so_dh using errcode = '23514';
  end if;
  if p_doi_tac_id is null and coalesce(cardinality(p_nguoi_nhan_ids), 0) = 0 then
    raise exception 'Đơn nội bộ phải có ít nhất một người nhận' using errcode = '23514';
  end if;

  select string_agg(format('%s (%s)', nv.ten_day_du, ds.ma), '; ') into v_dang_dung
  from (select d.nguoi_nhan_id, string_agg(sp.ma_hang, ', ') as ma
        from public.don_dat_hang_dong d join public.san_pham sp on sp.id = d.san_pham_id
        where d.don_dat_hang_id = p_don_id and d.nguoi_nhan_id is not null
          and d.nguoi_nhan_id <> all (coalesce(p_nguoi_nhan_ids, '{}')) group by 1) ds
  join public.nhan_vien_phu_trach nv on nv.id = ds.nguoi_nhan_id;
  if v_dang_dung is not null then
    raise exception 'Không bỏ được khỏi đơn: % đang được gán ở dòng. Gỡ người nhận ở các dòng đó trước.', v_dang_dung
      using errcode = '23514';
  end if;
  -- … cập nhật doi_tac_id, delete … where don_dat_hang_id = p_don_id and nguoi_nhan_id <> all(…),
  --   insert … on conflict (don_dat_hang_id, nguoi_nhan_id) do update set thu_tu = excluded.thu_tu
end $$;
```
Chú ý: `san_pham` không có quyền SELECT mức bảng (bẫy 5) — hàm `security definer` đọc được `ma_hang` (như `tao_phieu_xuat_tu_don` đang làm); không áp dụng cho client.

### Gọi RPC từ lớp api (lỗi ném object thường, bẫy 8)

```ts
// features/sales-order/api/order.api.ts
export async function setOrderRecipients(
  orderId: string,
  input: { partnerId: string | null; staffIds: string[] },
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("dat_nguoi_nhan_don", {
    p_don_id: orderId,
    p_doi_tac_id: input.partnerId ?? undefined,
    p_nguoi_nhan_ids: input.staffIds,
  });
  if (error) throw error;
}
```

## State of the Art

| Cũ | Mới | Ảnh hưởng |
|---|---|---|
| `doi_tac_id` XOR `nguoi_nhan_id` (0076) | bảng nối nhiều-nhiều + `doi_tac_id` NULL = nội bộ | mọi RPC đọc phải đổi; CHECK bị bỏ |
| Tạo đơn = insert thẳng | `tao_don` RPC | bất biến "nội bộ ≥ 1 người" ở DB |
| Người nhận hóa đơn = cột chép từ đơn | bảng nối chép trong `tao_phieu_xuat_tu_don` | nhiều người, theo dòng |

**Ngừng dùng:** `don_dat_hang.nguoi_nhan_id`, `chung_tu.nguoi_nhan_id` (giữ dữ liệu); `ck_ddh_mot_nguoi_nhan` (bị drop); `internalRecipientId` trong `toDocumentUpdate`.

## Runtime State Inventory

(Đây là chuyển cấu trúc dữ liệu, không phải đổi tên; vẫn trả lời đủ năm mục.)

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | `don_dat_hang.nguoi_nhan_id` (local 3/4 đơn; cloud chưa biết), `chung_tu.nguoi_nhan_id` (local 9) | **Data migration** (backfill bảng nối trong 0090) + code edit (ngừng đọc/ghi). Dòng cũ = hàng chung. Không NULL-hóa cột cũ. |
| Live service config | Không có (không có n8n/dashboard ngoài). Cloud DB `rnpq…` thiếu 0085-0089 (+0090/0091) | Chưa push cloud; xem Open Questions |
| OS-registered state | None — kiểm tra: không cron/pm2 nào nhắc người nhận | None |
| Secrets/env vars | None — không khóa env nào chứa tên cột/RPC | None |
| Build artifacts | `src/types/database.types.ts` cũ sau migration (RPC đổi kiểu trả) | Regen bằng lệnh `--db-url` local ngay sau 0091 |

## Environment Availability

| Dependency | Cần cho | Có | Version | Fallback |
|---|---|---|---|---|
| Docker + Supabase local DB (`supabase_db_rnpqgbuypmecxiatuulz`, port 54322) | pgTAP, type gen, UAT | ✓ | — | — |
| `psql` | kiểm tay trên DB local | ✓ | PG15 client | `docker exec` |
| Node | script, build | ✓ | v24.19.0 | — |
| Supabase CLI (`npx supabase`) | `test db`, `gen types` | ✓ | có (nhắc cập nhật) | — |
| Trình duyệt thật cho UAT | verify UI (bẫy 11, 19) | giả định có (đã dùng ở Phase 17) | — | `document.startViewTransition = undefined` (bẫy 19) |

**Thiếu không có fallback:** không có.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | pgTAP (Supabase) cho DB; `tsx` assert script cho hàm thuần; `npm run check` cho kiểu/lint/build |
| Config file | pgTAP: `supabase/tests/*.sql` (helper chép đầu file, `00_helper.sql.inc`); script: `scripts/test-pure-functions.ts` |
| Quick run command | `npx tsx scripts/test-pure-functions.ts` ; pgTAP một file: `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/108_don_nhieu_nguoi_nhan_test.sql` |
| Full suite command | `npm run check && npx tsx scripts/test-pure-functions.ts && SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db && npm run test:concurrency` (+ `npx tsx scripts/test-route-permissions.ts` cần `npm run dev` chạy) |
| Type gen | `npx supabase gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --schema public > src/types/database.types.ts` |

Số pgTAP: 108 và 109 (105/106 thuộc quy-chuan, 107 của Phase 17). Số migration: 0090, 0091 — **chạy lại** lệnh kiểm tra mọi nhánh ngay trước khi tạo file.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| NNHAN-01 | `tao_don` tạo đơn Nội bộ với ≥ 1 người, đối tác + nhân viên; 0 người nội bộ bị từ chối (`set constraints all immediate`); `dat_nguoi_nhan_don` đặt cả tập, chặn bỏ người đang ở dòng; chỉ TAM; thiếu quyền `42501`; gán dòng tự thêm vào đơn (D1) | pgTAP | `supabase test db …/108_*.sql` | ❌ Wave 0 |
| NNHAN-02 | gán/xóa `nguoi_nhan_id` dòng; `dong_don` trả người nhận dòng; dòng đơn không-TAM bị RLS chặn | pgTAP + pure | 108 + `test-pure-functions.ts` (`toOrderLineUpdate`, `toOrderLine`) | ❌ Wave 0 |
| NNHAN-03 | `danh_sach_don` trả mảng người nhận đúng thứ tự; `p_nguoi_nhan_id` lọc; `p_loai_nhan` NOI_BO = `doi_tac_id is null`; từ khóa khớp tên nhân viên; URL `?nhan_vien=` đọc/ghi + `toOrderListRpcArgs` | pgTAP + pure | 109 + pure | ❌ Wave 0 |
| NNHAN-04 | Phiếu in: hàm thuần cho nhãn "Chung"/nối tên; (hiển thị) | pure + UAT trình duyệt | pure + checklist | ❌ Wave 0 / manual (in) |
| NNHAN-05 | `hoan_thanh_don` -> `chung_tu_nguoi_nhan` đủ người, `chung_tu_dong.nguoi_nhan_id` khớp dòng đơn; hóa đơn đã ghi sổ không bị client sửa người nhận (RLS); `nguoi_nhan_dong_chung_tu`; `chi_tiet_chung_tu` trả mảng; `danh_sach_chung_tu`/`the_kho_san_pham` ghép tên | pgTAP | 109 | ❌ Wave 0 |
| NNHAN-06 | Backfill: mọi đơn/hóa đơn có cột cũ có đúng một dòng bảng nối trùng người; tự kiểm trong migration; `phan_tich_ton_kho` vẫn loại đơn nội bộ (98 sửa) | pgTAP + migration | 108/109 + 98 | ❌ Wave 0 (98/30 phải sửa) |
| (hồi quy) | không hàm nào còn đọc cột cũ; 27/29/31 vẫn xanh; ma trận quyền route | pgTAP + script | full suite | ✅ 27/29/31/98 tồn tại (30, 98 sửa) |

### Sampling Rate
- **Per task commit:** `npx tsx scripts/test-pure-functions.ts` (TS) hoặc pgTAP một file (DB) + `npm run typecheck`
- **Per wave merge:** `npm run check` + pgTAP toàn bộ
- **Phase gate:** full suite xanh + UAT trình duyệt trước `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `supabase/tests/108_don_nhieu_nguoi_nhan_test.sql` — bất biến D1/D3, RPC ghi, backfill, RLS bảng nối, chặn bỏ người đang dùng
- [ ] `supabase/tests/109_nguoi_nhan_rpc_doc_test.sql` — RPC đọc, lọc, chép sang hóa đơn, phân tích tồn, kiểm "không còn hàm đọc cột cũ"
- [ ] Sửa `supabase/tests/30_don_noi_bo_test.sql` và `98_phan_tich_ton_kho_test.sql` (dùng bảng nối / `doi_tac_id` làm marker) — nếu không pgTAP đỏ ngay sau 0091
- [ ] Mở rộng `scripts/test-pure-functions.ts`: `toStaffRefs`, nhãn "Chung", `readOrderFilterFromUrl("nhan_vien")`, `toOrderListRpcArgs` có `p_nguoi_nhan_id`, `toOrderLineUpdate({recipientId})`, bỏ assert `toOrderUpdate` ghi hai cột / `toDocumentUpdate.internalRecipientId`
- [ ] Không cần cài framework mới

## Kế hoạch tách (đề xuất)

| Plan | Wave | Việc | File sở hữu (độc quyền) |
|---|---|---|---|
| 18-01 | 1 | Migration **0090**: bảng nối, cột dòng, backfill + tự kiểm, drop CHECK, trigger D1, constraint trigger, RPC `tao_don`/`dat_nguoi_nhan_don`, RLS/revoke; pgTAP **108** | `supabase/migrations/0090_*.sql`, `supabase/tests/108_*.sql` |
| 18-02 | 2 (sau 01) | Migration **0091**: đổi các RPC đọc (danh sách bảng ở trên) + `tao_phieu_xuat_tu_don` + `nguoi_nhan_dong_chung_tu`; pgTAP **109**; sửa 30 và 98; regen `database.types.ts` (chạy sau khi áp 0090+0091 lên DB local — **kế hoạch phải có bước áp migration local**, nghiên cứu này không chạy) | `supabase/migrations/0091_*.sql`, `supabase/tests/109_*.sql`, `30_*`, `98_*`, `src/types/database.types.ts` |
| 18-03 | 3 | Nền TS: `shared/lib/recipient.ts`, `staff-multi-select.tsx`, `sales-order/{types,schemas,api,hooks}`, `documents/{types,schemas,api}`, `scripts/test-pure-functions.ts` (TDD) | các file đó |
| 18-04 | 4 | UI tạo đơn + đầu đơn: `new-order-form.tsx`, `recipient-picker.tsx`, `order-recipient-field.tsx`, `order-header.tsx` | |
| 18-05 | 4 | Lưới dòng: `order-line-columns.tsx`, `order-line-table.tsx`, `order-line-entry-row.tsx`, `order-detail.tsx` | |
| 18-06 | 4 | Danh sách + lọc + phiếu lấy hàng: `order-table-body.tsx`, `order-filter-panel.tsx`, `picking-print-template.tsx` (+ `order-toolbar.tsx` nếu cần) | |
| 18-07 | 4 | Duyệt đơn / hóa đơn: `stock-out/**` (`issue-header`, `issue-detail`, `issue-line-*`, `delivery-print-template`, `api/issue.api.ts`), tách file > 200 dòng | |
| 18-08 | 5 | **Checkpoint trình duyệt (UAT)** trên Supabase local: tạo đơn Nội bộ/Đối tác nhiều người, gán/xóa dòng, thử bỏ người đang dùng, lọc, in phiếu (kiểm colSpan), hoàn thành đơn -> xem hóa đơn ở Duyệt đơn, đơn cũ hiện đúng; mở console (bẫy 11); khung ẩn (bẫy 19); thử `delete` qua supabase-js (bẫy 22) | tài liệu UAT |

Wave 4 bốn plan không trùng file. 18-04/05/06/07 phụ thuộc 18-03 (kiểu + mapper) nên không thể chạy cùng wave 3. 18-03 phụ thuộc 18-02 vì cần type sinh ra (kiểu trả mới của RPC). Nếu muốn song song hơn, 18-03 có thể bắt đầu từ chữ ký đã chốt ở mục "Hình dạng RPC đọc" và hoàn tất sau khi regen — nhưng rủi ro lệch kiểu cao hơn, khuyến nghị tuần tự.

## Open Questions

1. **Có đẩy 0090/0091 lên cloud trong phase này không?** (Memory: cloud `rnpq` thiếu 0085-0089; `.env.local` dev trỏ cloud.)
   - Đã biết: UAT cần DB có 0090/0091; local có đủ.
   - Chưa rõ: lịch deploy cloud, và nhánh `quy-chuan-ma-d` (0085-0088) sẽ hợp nhất trước hay sau.
   - Khuyến nghị: UAT trên local; **không** push cloud trong phase; ghi nhắc deploy như các phase trước. Nếu quy-chuan-d hợp nhất trước, rebase 0090/0091 lên số tiếp theo và kiểm lại `tao_phieu_xuat_tu_don`. Đây là câu hỏi triển khai, không chặn lập kế hoạch.
2. **Phiếu lấy hàng: ô trống ghi "Chung" hay để trống?** Đã chọn: "Chung" chỉ khi đơn ≥ 2 nhân viên (D4 cho Claude chọn). Báo cho người dùng khi UAT nếu muốn khác.
3. **Nhật ký sửa (`nhat_ky_sua`) cho thay đổi người nhận cấp đơn**: trigger generic chỉ thấy cột của `don_dat_hang`, bảng nối không được ghi nhật ký. Khuyến nghị bỏ qua (không có yêu cầu); nếu cần, `dat_nguoi_nhan_don` có thể ghi một dòng `truong = 'nguoi_nhan'` (CHECK `bang` đã cho `don_dat_hang`).

Không có câu nào thật sự cần người dùng trả lời trước khi lập kế hoạch.

## Sources

### Primary (HIGH confidence — đọc trực tiếp)
- Repo: `supabase/migrations/0006, 0016, 0051, 0052, 0053, 0054, 0076, 0077, 0078, 0079, 0082, 0083`; `src/features/sales-order/**`, `src/features/stock-out/**`, `src/features/documents/**`, `src/shared/lib/recipient.ts`, `src/shared/components/staff-select.tsx`, `scripts/test-pure-functions.ts`.
- DB local (`postgres@127.0.0.1:54322`, đọc-chỉ): `information_schema.columns`, `pg_policies`, `pg_trigger`, `pg_get_functiondef` của `dong_don`, `dong_chung_tu`, `xac_nhan_don`, `co_quyen`, `sinh_so_dh`, `ghi_nhat_ky_sua`, `_ghi_so_xuat`; danh sách hàm có `prosrc ilike '%nguoi_nhan%'` (danh_sach_chung_tu, tao_phieu_xuat_tu_don, the_kho_san_pham, danh_sach_don, chi_tiet_chung_tu, chi_tiet_don, phan_tich_ton_kho, nhip_ban_theo_ngay).
- `git show feature/quy-chuan-ma-d:supabase/migrations/0085-0088` (xác nhận 0088 viết lại `dong_chung_tu`, `ghi_so_chung_tu`, `hoan_thanh_don`; không viết lại `tao_phieu_xuat_tu_don`, `danh_sach_*`, `chi_tiet_*`); `package.json`, `node_modules/antd/package.json` (6.6.3).

### Secondary / Tertiary
- Không dùng nguồn web: phần lớn là hợp đồng nội bộ của dự án. Hành vi lock `FOR UPDATE` vs `FOR SHARE` và `INITIALLY DEFERRED` constraint trigger là Postgres tiêu chuẩn (kiến thức nền, MEDIUM) — **plan 18-01 phải kiểm bằng pgTAP/psql** thay vì tin; đặc biệt cần xác nhận trigger D1 chờ được khóa `FOR UPDATE` của `dat_nguoi_nhan_don` (thử bằng hai phiên `psql` trong UAT).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — không thêm thư viện, phiên bản đọc từ lockfile/node_modules
- Data model + RPC inventory: HIGH — đối chiếu file migration và `pg_proc` trên DB local
- Architecture (bảng nối, trigger, RPC): MEDIUM-HIGH — thiết kế phù hợp tiền lệ dự án; chi tiết khóa cần pgTAP/UAT xác nhận
- UI: MEDIUM — cần UAT trình duyệt (luồng bàn phím, in)
- Pitfalls: HIGH cho các bẫy trích từ CLAUDE.md và hiện trạng code; MEDIUM cho rủi ro hợp nhất (phụ thuộc thứ tự merge)

**Research date:** 2026-10-03
**Valid until:** 2026-10-17 (nhánh quy-chuan đang di chuyển; kiểm lại số migration và `tao_phieu_xuat_tu_don` ngay trước khi viết 0090)


## Resolved (orchestrator, 2026-10-03)

- `.env.local` đang trỏ `http://127.0.0.1:54321` (local) — UAT chạy thẳng `npm run dev`/dev server hiện có, không cần ghi đè biến. KHÔNG đẩy 0090/0091 lên cloud trong phase này.
- Ô "Người nhận" trống trên phiếu in: ghi "Chung" khi đơn có ≥ 2 nhân viên nhận, để trống khi chỉ có 1 — theo đề xuất; người dùng xác nhận ở UAT.
- Không ghi nhật ký sửa cho thay đổi người nhận (không có requirement).
- Bỏ người nhận đang dùng ở dòng: CHẶN kèm thông báo nêu mã hàng (không tự gỡ).
