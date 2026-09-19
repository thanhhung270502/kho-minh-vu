# Phase 4: Đơn đặt hàng & Phiếu xuất — Bản đồ khuôn mẫu (PATTERNS)

**Lập:** 2026-09-20
**File phân tích:** 22 WU (04-WORK-UNITS.md), không có 04-RESEARCH.md
**Analog tìm được:** 22/22 WU có ít nhất một analog trực tiếp trong `src/features/stock-in/`; 6 file không có analog thật (liệt kê ở mục "Không có analog")

**Đọc trước khi dùng file này:** mục **"Sáu chỗ CONTEXT.md nói sai hoặc không chính xác"** ở cuối
— đây là những chỗ tài liệu bàn bạc (04-CONTEXT.md) mô tả sai tên file/hàm thật trong
codebase. Không copy nguyên văn tên từ CONTEXT.md, dùng tên trong file này.

---

## File Classification

| WU | File mới/sửa | Vai trò | Luồng dữ liệu | Analog gần nhất | Mức khớp |
|---|---|---|---|---|---|
| WU-1 | `supabase/migrations/0050_trang_thai_don_duyet.sql` | migration | transform (enum + hàm) | `0041_kho_theo_dong.sql` (đổi cột + `create or replace function`) + `0011_rpc_ghi_so.sql` dòng 139-176 | role-match |
| WU-1 | `supabase/tests/23_don_dat_hang_test.sql` | test | pgTAP | `supabase/tests/22_kho_theo_dong_test.sql` | exact |
| WU-2 | `supabase/migrations/0051_rpc_duyet_don.sql` | migration (RPC ghi) | request-response, event-driven | `0046_chi_quan_ly_huy_nhap.sql` (RPC gate theo vai trò trên chính bảng chứng từ) | exact |
| WU-2 | `supabase/tests/24_duyet_don_test.sql` | test | pgTAP | `22_kho_theo_dong_test.sql` | exact |
| WU-3 | `supabase/migrations/0052_sinh_so_dh.sql` | migration (bộ đếm) | transform | `0047_sinh_so_ct_definer.sql` + `0048_sinh_so_ct_cho_phep_script.sql` (kỹ thuật `insert … on conflict do update … returning`) | role-match — **không literal reuse được, xem mục cảnh báo** |
| WU-3 | `supabase/tests/25_so_dh_test.sql` | test | pgTAP | `supabase/tests/80_cau_hinh_so_ct_test.sql` (test bộ đếm đồng thời) | role-match |
| WU-4 | `supabase/migrations/0053_de_nghi_gop_ma.sql` | migration (bảng + 2 RPC) | CRUD, ghi lại đề xuất | `0033_ra_ghi_chu_lich_su.sql` (bảng `anh_xa_ghi_chu_kiotviet` + RPC `quyet_ghi_chu` — "ghi lại quyết định, không tự hành động") | exact |
| WU-4 | `supabase/tests/26_goi_y_ma_trung_test.sql` | test | pgTAP | `22_kho_theo_dong_test.sql` | exact |
| WU-5 | `supabase/migrations/0054_rpc_don_dat_hang.sql` | migration (RPC đọc) | request-response, phân trang server | `0045_rpc_chung_tu.sql` (`danh_sach_chung_tu`/`chi_tiet_chung_tu`/`dong_chung_tu`) | exact |
| WU-5 | `supabase/tests/27_rpc_don_test.sql` | test | pgTAP | `supabase/tests/21_danh_sach_chung_tu_test.sql` | exact |
| WU-6 | `supabase/migrations/0055_tao_phieu_xuat_tu_don.sql` | migration (RPC ghi, atomic) | event-driven, CRUD | `ghi_so_chung_tu` trong `0011_rpc_ghi_so.sql` (khóa `for update`, vòng lặp dòng, `SECURITY DEFINER`) + `sinh_so_ct` để cấp số | role-match |
| WU-6 | `supabase/tests/28_phieu_xuat_tu_don_test.sql` | test | pgTAP | `22_kho_theo_dong_test.sql` | exact |
| WU-7 | `supabase/migrations/0056_tao_phieu_tra.sql` | migration (RPC ghi, atomic) | event-driven, CRUD | cùng khuôn WU-6 + ràng buộc `ck_tra_hang_co_goc` đã có ở `0007_chung_tu.sql` dòng 40-42 | role-match |
| WU-7 | `supabase/tests/29_phieu_tra_test.sql` | test | pgTAP | `22_kho_theo_dong_test.sql` | exact |
| WU-8 | `src/features/documents/types.ts` | type + mapper | transform | `src/features/stock-in/types.ts` (gần như copy nguyên — đã đặt tên `Document*` sẵn) | exact |
| WU-8 | `src/features/documents/api/document.api.ts` | data layer | CRUD, request-response | `src/features/stock-in/api/receipt.api.ts` (các hàm `fetchReceipts/fetchReceiptDetail/fetchReceiptLines`) | exact |
| WU-8 | `src/features/documents/api/document.keys.ts` | query key | — | `src/features/stock-in/api/receipt.keys.ts` | exact |
| WU-9 | `src/features/sales-order/types.ts` | type + mapper | transform | `src/features/stock-in/types.ts` (phần `DocumentRow/Detail/Line` KHÔNG áp dụng — đơn dùng RPC riêng ở WU-5, xem ghi chú) | role-match |
| WU-9 | `src/features/sales-order/schemas/order.schema.ts` | schema + bộ lọc URL | transform | `src/features/stock-in/schemas/receipt.schema.ts` | exact |
| WU-9 | `src/features/sales-order/api/order.keys.ts` | query key | — | `src/features/stock-in/api/receipt.keys.ts` | exact |
| WU-10 | `src/features/sales-order/api/order.api.ts` | data layer | CRUD, request-response | `src/features/stock-in/api/receipt.api.ts` | role-match |
| WU-10 | `src/features/sales-order/hooks/useOrders.ts` | hook TanStack Query | — | `src/features/stock-in/hooks/useReceipts.ts` | exact |
| WU-11 | `src/features/stock-out/types.ts` | type + mapper | transform | `src/features/documents/types.ts` (WU-8) — mỏng trên đó, thêm field riêng chiều xuất | exact (sau khi WU-8 xong) |
| WU-11 | `src/features/stock-out/api/stock-out.api.ts` | data layer | CRUD | `src/features/stock-in/api/receipt.api.ts` (đặc biệt `postReceipt`/`voidReceipt`) | exact |
| WU-11 | `src/features/stock-out/hooks/useStockOut.ts` | hook | — | `src/features/stock-in/hooks/useReceipts.ts` | exact |
| WU-12 | `src/app/(app)/dat-hang/page.tsx` | route (Server Component) | request-response | `src/app/(app)/nhap-kho/page.tsx` | exact |
| WU-12 | `src/features/sales-order/components/order-table.tsx` | component (danh sách) | request-response | `src/features/stock-in/components/receipt-table.tsx` | exact |
| WU-12 | `src/features/sales-order/components/order-filter-panel.tsx` | component | — | `src/features/stock-in/components/receipt-filter-panel.tsx` | exact |
| WU-12 | (ẩn trong order-table) bảng | component | — | `src/features/stock-in/components/receipt-table-body.tsx` | exact — **đây KHÔNG phải bảng gõ bàn phím, xem mục sửa sai** |
| WU-13 | `src/app/(app)/dat-hang/[id]/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/[id]/page.tsx` | exact |
| WU-13 | `src/features/sales-order/components/order-header.tsx` | component | — | `src/features/stock-in/components/receipt-header.tsx` (khuôn `Descriptions` sửa-tại-chỗ) | role-match |
| WU-13 | `src/features/sales-order/components/partner-search-input.tsx` | component | request-response | **KHÔNG PHẢI** `receipt-header.tsx`'s Select nạp toàn bộ NCC — analog đúng là `CustomerSelect` trong `src/features/partners/components/note-actions.tsx` dòng 33-63 (tìm server-side theo từ khóa) + `savePartner(null, input)`/`suggestPartnerCode()` trong `src/features/partners/api/partner.api.ts` dòng 96-124 (tạo tại chỗ) | role-match |
| WU-14 | `src/features/sales-order/components/order-line-table.tsx` | component (bàn phím) | event-driven | `src/features/stock-in/components/receipt-line-table.tsx` | exact — trừ cột đơn giá |
| WU-14 | `src/features/sales-order/components/order-table-body.tsx` | component | — | phần `<Table>` bên trong `receipt-line-table.tsx` (KHÔNG phải `receipt-table-body.tsx` — xem mục sửa sai) | role-match |
| WU-15 | `src/features/sales-order/components/approve-order-button.tsx` | component | request-response | `src/features/stock-in/components/post-receipt-button.tsx` (khuôn confirm → RPC → bắt lỗi theo mã) | role-match |
| WU-15 | `src/features/sales-order/components/unlock-order-dialog.tsx` | component | request-response | `src/features/stock-in/components/void-receipt-dialog.tsx` (Modal + ô lý do + bắt lỗi 42501/23514) | exact |
| WU-16 | `src/app/(app)/dat-hang/[id]/in/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/[id]/in/page.tsx` | exact |
| WU-16 | `src/features/sales-order/components/picking-print-template.tsx` | component (in) | transform | `src/features/stock-in/components/receipt-print-template.tsx` | role-match — cần thêm nhóm theo kho, KHÔNG có analog cho dòng tiêu đề nhóm |
| WU-17 | `src/app/(app)/xuat-kho/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/page.tsx` | exact |
| WU-17 | `src/features/stock-out/components/issue-table.tsx` | component | request-response | `src/features/stock-in/components/receipt-table.tsx` | exact |
| WU-17 | `src/features/stock-out/components/issue-filter-panel.tsx` | component | — | `src/features/stock-in/components/receipt-filter-panel.tsx` | exact |
| WU-18 | `src/app/(app)/xuat-kho/[id]/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/[id]/page.tsx` | exact |
| WU-18 | `src/features/stock-out/components/issue-line-table.tsx` | component (bàn phím) | event-driven | `src/features/stock-in/components/receipt-line-table.tsx` | exact |
| WU-18 | `src/features/stock-out/components/create-issue-button.tsx` | component | request-response | `src/features/stock-in/components/create-receipt-button.tsx` — **chỉ khớp nhánh "tạo mới không cần đơn"**; nhánh "từ đơn" không có analog | role-match |
| WU-19 | `src/features/stock-out/components/post-issue-button.tsx` | component | request-response | `src/features/stock-in/components/post-receipt-button.tsx` + `posting-summary.tsx` | exact |
| WU-19 | `src/features/stock-out/components/negative-stock-panel.tsx` | component | — | KHÔNG có analog UI trực tiếp; gần nhất là ô lý do bắt buộc trong `void-receipt-dialog.tsx` dòng 91-97 | partial |
| WU-19 | `src/features/stock-out/components/similar-code-hint.tsx` | component | request-response | `src/features/partners/components/note-actions.tsx` (khuôn "gợi ý + nút ghi lại đề xuất, không tự hành động", đặc biệt panel `MERGE` dòng 190-203) | role-match |
| WU-20 | `src/app/(app)/xuat-kho/[id]/in/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/[id]/in/page.tsx` | exact |
| WU-20 | `src/features/stock-out/components/delivery-print-template.tsx` | component (in) | transform | `src/features/stock-in/components/receipt-print-template.tsx` | role-match |
| WU-21 | `src/app/(app)/tra-hang/[id]/page.tsx` | route | request-response | `src/app/(app)/nhap-kho/[id]/page.tsx` | role-match |
| WU-21 | `src/features/returns/components/return-button.tsx` | component | request-response | không có nút "tạo từ chứng từ gốc" trong stock-in; gần nhất về hình dạng nút+RPC là `create-receipt-button.tsx` | partial |
| WU-21 | `src/features/returns/components/return-line-table.tsx` | component | event-driven | `src/features/stock-in/components/receipt-line-table.tsx` | role-match |
| WU-22 | `src/shared/lib/navigation.ts` | pure lib (KHÔNG phải `app-shell.tsx`) | — | mảng `NAV_ITEMS` đã có, chỉ thêm phần tử | exact — **xem mục sửa sai** |
| WU-22 | `src/proxy.ts` | middleware | — | KHÔNG cần sửa cho phân quyền route — xem mục sửa sai | — |
| WU-22 | `scripts/test-route-permissions.ts` | test (HTTP thật) | request-response | chính file này, mảng `MA_TRAN` + hàm `layIdPhieuNhap()` dòng 89-115 | exact |

---

## Pattern Assignments

### Wave 1 — Migration nền

#### WU-1 `0050_trang_thai_don_duyet.sql` — đổi trục enum `trang_thai_ddh`

**Analog kỹ thuật đổi cột:** `supabase/migrations/0041_kho_theo_dong.sql` (đổi bằng `alter table … add column` +
`create or replace function` chép nguyên văn hàm cũ, chỉ sửa đúng một chỗ, có comment chỉ rõ dòng nào đổi).

**Analog hàm cần sửa — `_cap_nhat_tien_do_ddh`** (`supabase/migrations/0011_rpc_ghi_so.sql` dòng 139-176):
```sql
create or replace function public._cap_nhat_tien_do_ddh(p_ddh_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_con_thieu integer;
  v_da_xuat integer;
begin
  update public.don_dat_hang_dong d
  set so_luong_da_xuat = coalesce((
    select sum(ctd.so_luong)
    from public.chung_tu_dong ctd
    join public.chung_tu ct on ct.id = ctd.chung_tu_id
    where ct.don_dat_hang_id = p_ddh_id
      and ct.loai_ct = 'XUAT'
      and ct.trang_thai = 'HOAN_THANH'
      and ctd.san_pham_id = d.san_pham_id
  ), 0)
  where d.don_dat_hang_id = p_ddh_id;

  select count(*) into v_con_thieu from public.don_dat_hang_dong
  where don_dat_hang_id = p_ddh_id and so_luong_da_xuat < so_luong_dat;
  select count(*) into v_da_xuat from public.don_dat_hang_dong
  where don_dat_hang_id = p_ddh_id and so_luong_da_xuat > 0;

  update public.don_dat_hang
  set trang_thai = case
        when v_con_thieu = 0 then 'DA_XUAT_DU'::public.trang_thai_ddh
        when v_da_xuat > 0   then 'DA_XUAT_MOT_PHAN'::public.trang_thai_ddh
        else 'MOI'::public.trang_thai_ddh
      end
  where id = p_ddh_id and trang_thai <> 'DA_HUY';
end; $$;
```
Sửa thành (D-04, D-05): phần đầu (cập nhật `so_luong_da_xuat`) **giữ nguyên**; phần
`update … set trang_thai = case …` đổi còn:
```sql
  update public.don_dat_hang
  set trang_thai = 'HOAN_THANH'::public.trang_thai_ddh
  where id = p_ddh_id
    and trang_thai = 'DA_XAC_NHAN'   -- chỉ tự đóng đơn đã duyệt, không đụng đơn TAM hay đã hủy
    and v_con_thieu = 0;
```
Đơn `TAM` không tự chuyển trạng thái ở đây — chuyển `TAM → DA_XAC_NHAN` là việc của RPC
`xac_nhan_don` (WU-2), không phải của `_cap_nhat_tien_do_ddh`.

**Thứ tự bắt buộc trong migration** (vì `don_dat_hang` đang 0 dòng nhưng type vẫn có phụ
thuộc: cột, default, partial index, và literal trong hàm):
```sql
-- 1. Bỏ default và index phụ thuộc kiểu cũ TRƯỚC khi đổi kiểu.
alter table public.don_dat_hang alter column trang_thai drop default;
drop index if exists public.idx_ddh_trang_thai;

-- 2. Đổi tên kiểu cũ, tạo kiểu mới, ALTER COLUMN bằng USING.
--    0 dòng nên USING không cần map giá trị thật — nhưng vẫn phải ép kiểu qua text
--    vì hai enum không có phép cast ngầm định.
alter type public.trang_thai_ddh rename to trang_thai_ddh_old;
create type public.trang_thai_ddh as enum ('TAM','DA_XAC_NHAN','HOAN_THANH','DA_HUY');
alter table public.don_dat_hang
  alter column trang_thai type public.trang_thai_ddh
  using (case trang_thai::text
           when 'MOI' then 'TAM' when 'DA_XUAT_MOT_PHAN' then 'DA_XAC_NHAN'
           when 'DA_XUAT_DU' then 'HOAN_THANH' else trang_thai::text end)::public.trang_thai_ddh;
alter table public.don_dat_hang alter column trang_thai set default 'TAM';
drop type public.trang_thai_ddh_old;

-- 3. Dựng lại partial index với trạng thái sống mới.
create index idx_ddh_trang_thai on public.don_dat_hang (trang_thai)
  where trang_thai in ('TAM','DA_XAC_NHAN');

-- 4. RỒI MỚI create or replace function _cap_nhat_tien_do_ddh — làm trước bước 2
--    sẽ lỗi "invalid input value for enum" vì literal 'DA_XUAT_DU' không còn tồn tại.
```

**Test pgTAP** — dùng khuôn `supabase/tests/22_kho_theo_dong_test.sql` (xem trích ở mục
"Shared Patterns → khuôn pgTAP" bên dưới): `begin; select plan(n);` → copy khối helper từ
`00_helper.sql.inc` → dựng dữ liệu bằng `pg_temp.sp_test()` → `select is(...)` → `select *
from finish(); rollback;`.

⚠️ Migration này sửa hàm 225 assert cũ đã phụ thuộc gián tiếp (mọi test gọi
`ghi_so_chung_tu` trên chứng từ XUAT có `don_dat_hang_id`) — chạy lại **toàn bộ** bộ
pgTAP sau khi push, đúng như 04-CONTEXT.md đã cảnh báo.

---

#### WU-2 `0051_rpc_duyet_don.sql` — `xac_nhan_don` / `mo_khoa_don` / `dong_don_som`

**Analog:** `supabase/migrations/0046_chi_quan_ly_huy_nhap.sql` — khuôn "RPC
`SECURITY DEFINER` tự kiểm vai trò bằng `vai_tro_hien_tai()`, khóa dòng bằng `for update`,
`raise exception … using errcode = '42501'` khi sai vai trò":
```sql
create or replace function public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
returns public.chung_tu
language plpgsql security definer set search_path = '' as $$
declare v_ct public.chung_tu;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;
  ...
  if v_ct.loai_ct = 'NHAP' and v_ct.trang_thai = 'HOAN_THANH'
     and (select public.vai_tro_hien_tai()) <> 'quan_ly' then
    raise exception 'Chỉ quản lý được hủy phiếu nhập đã ghi sổ' using errcode = '42501';
  end if;
  ...
end; $$;
```
Áp dụng cho `xac_nhan_don(p_id uuid)`:
```sql
create or replace function public.xac_nhan_don(p_id uuid)
returns public.don_dat_hang
language plpgsql security definer set search_path = '' as $$
declare v_don public.don_dat_hang;
begin
  if (select public.vai_tro_hien_tai()) <> 'quan_ly' then
    raise exception 'Chỉ quản lý được xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai <> 'TAM' then
    raise exception 'Đơn % đang ở trạng thái %, không xác nhận lại được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_XAC_NHAN'
  where id = p_id
  returning * into v_don;
  return v_don;
end; $$;

revoke all    on function public.xac_nhan_don(uuid) from public, anon;
grant execute on function public.xac_nhan_don(uuid) to authenticated;
```
`mo_khoa_don` (chỉ `quan_ly`, `DA_XAC_NHAN → TAM`) và `dong_don_som` (chỉ `quan_ly`,
`DA_XAC_NHAN → HOAN_THANH` bất kể `so_luong_da_xuat`) theo đúng khuôn trên, đổi điều kiện
trạng thái nguồn/đích.

**D-07 — ghi `nhat_ky_sua`:** trigger generic đã có từ Phase 2 (0027) tự bắt UPDATE trên
bảng có khai báo — kiểm tra `don_dat_hang` đã gắn trigger đó chưa; nếu chưa, thêm
`create trigger ghi_nhat_ky_sua_don_dat_hang after update on public.don_dat_hang for each
row execute function public.ghi_nhat_ky_sua()` (tên hàm/trigger thật lấy từ `0027_nhat_ky_sua.sql`
— đọc file đó trước khi viết, không đoán tên cột `nhat_ky_sua` cần).

**Policy sửa `don_dat_hang` cho văn phòng khi `TAM`:** theo khuôn policy trong
`0041_kho_theo_dong.sql` dòng 126-146 (drop rồi tạo lại, lấy định nghĩa từ `pg_policies`
đang chạy chứ không suy đoán) và `0028_cau_hinh_so_ct.sql` dòng 50-57 (khuôn
`for update using (...) with check (...)` theo vai trò).

---

#### WU-3 `0052_sinh_so_dh.sql` — sinh `so_dh` không trùng

**⚠️ KHÔNG literal reuse `sinh_so_ct` được.** `cau_hinh_so_ct`/`chuoi_so_ct` có PK
`(loai_ct, nam, nguon)` với `loai_ct public.loai_ct` — enum bảy giá trị chứng từ, không có
giá trị nào cho "đơn đặt hàng". Thêm giá trị enum giả (vd `'DON_DAT_HANG'`) vào `loai_ct` sẽ
làm ô nhiễm mọi chỗ đang switch theo bảy loại chứng từ thật (case trong `ghi_so_chung_tu`,
label hiển thị `RECEIPT_SOURCE_LABELS`-style ở tầng UI). **Cách đúng: bảng đếm riêng, dùng
NGUYÊN VẸN kỹ thuật atomic của `sinh_so_ct`.**

**Analog kỹ thuật** (`supabase/migrations/0048_sinh_so_ct_cho_phep_script.sql` dòng 11-67):
```sql
insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
values (p_loai, v_nam, v_nguon, 1)
on conflict (loai_ct, nam, nguon)
do update set so_hien_tai = public.chuoi_so_ct.so_hien_tai + 1
returning so_hien_tai into v_so;
```
Đây là kỹ thuật chống trùng khi hai người tạo cùng lúc: MỘT câu lệnh vừa tạo dòng đếm nếu
chưa có, vừa tăng nếu đã có, vừa trả giá trị mới trong cùng statement — không có khoảng hở
đọc-rồi-ghi. Copy y nguyên cho bảng mới:
```sql
create table public.chuoi_so_dh (
  nam smallint not null,
  so_hien_tai integer not null default 0,
  primary key (nam)
);

create or replace function public.sinh_so_dh(p_nam smallint default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
begin
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được cấp số đơn' using errcode = '42501';
  end if;

  insert into public.chuoi_so_dh (nam, so_hien_tai) values (v_nam, 1)
  on conflict (nam) do update set so_hien_tai = public.chuoi_so_dh.so_hien_tai + 1
  returning so_hien_tai into v_so;

  return format('DH%s-%s', to_char(v_nam % 100, 'FM00'), lpad(v_so::text, 6, '0'));
end; $$;
revoke all    on function public.sinh_so_dh(smallint) from public, anon;
grant execute on function public.sinh_so_dh(smallint) to authenticated;
```
Giữ đúng quy ước "chỉ chặn `chi_xem`, không chặn null" từ `0048` (dòng 28-35) — chặn cả
`null` sẽ làm đỏ pgTAP/migration/script nạp dữ liệu chạy dưới `postgres`.

⚠️ **Bẫy 16** — test không được assert `so_dh = 'DH26-000001'` (neo vào bộ đếm sống). Dùng
năm 2091-2093 hoặc so sánh tương đối (số sau > số trước), theo đúng cảnh báo đã có trong
WORK-UNITS.md. Analog test bộ đếm đồng thời: `supabase/tests/80_cau_hinh_so_ct_test.sql`.

---

#### WU-4 `0053_de_nghi_gop_ma.sql` — bảng đề nghị gộp + gợi ý mã trùng

**Analog bảng "ghi lại quyết định, không tự hành động":**
`supabase/migrations/0033_ra_ghi_chu_lich_su.sql` dòng 25-50 (`anh_xa_ghi_chu_kiotviet`) —
PK là giá trị nghiệp vụ, RLS chỉ SELECT cho `quan_ly`/`van_phong`, INSERT/UPDATE/DELETE bị
`revoke` hết và chỉ đi qua RPC `SECURITY DEFINER`:
```sql
create table public.de_nghi_gop_ma (
  id uuid primary key default uuid_generate_v4(),
  san_pham_id_a uuid not null references public.san_pham(id),
  san_pham_id_b uuid not null references public.san_pham(id),
  nguoi_de_nghi_id uuid references public.nguoi_dung(id),
  chung_tu_id uuid references public.chung_tu(id),
  trang_thai text not null default 'CHO_XU_LY' check (trang_thai in ('CHO_XU_LY','DA_XU_LY','TU_CHOI')),
  created_at timestamptz not null default now()
);
alter table public.de_nghi_gop_ma enable row level security;
create policy "doc de nghi gop ma" on public.de_nghi_gop_ma
  for select to authenticated using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
revoke insert, update, delete on public.de_nghi_gop_ma from anon, authenticated;
```
RPC `ghi_de_nghi_gop_ma` theo đúng khuôn `quyet_ghi_chu` (0033 dòng 96-142): kiểm vai trò,
`insert … returning * into v_row`.

**Analog `goi_y_ma_trung`:** dùng lại `word_similarity` như `tim_san_pham` đã dùng (xem
`src/features/stock-in/api/product-search.api.ts` gọi `tim_san_pham` — hàm RPC đó nằm
ngoài phạm vi migration của Phase 3/4, đọc định nghĩa hiện tại trong database trước khi
viết `goi_y_ma_trung` để tái dùng đúng ngưỡng similarity và cách unaccent
(`public.f_unaccent`, thấy dùng ở `0033` dòng 77 và `0045` dòng 77).

---

### Wave 2 — RPC đọc và ghi

#### WU-5 `0054_rpc_don_dat_hang.sql`

**Analog gần như 1:1:** `supabase/migrations/0045_rpc_chung_tu.sql` — ba hàm
`danh_sach_chung_tu`/`chi_tiet_chung_tu`/`dong_chung_tu`, cùng khuôn:
- `stable security definer set search_path = ''`
- CTE `loc` lọc điều kiện `where (p_x is null or …)`, CTE `dem` đếm tổng, trả kèm
  `tong_so_dong` ở MỌI dòng (giao diện khỏi gọi thêm một lượt đếm riêng)
- `chi_tiet_don`/`dong_don` gọi lại nhau để không lặp logic phân quyền (`dong_chung_tu`
  dòng 161: `if not exists (select 1 from public.chi_tiet_chung_tu(p_id)) then return;`)

**Khác biệt phải xử lý:** `danh_sach_chung_tu` lọc phạm vi kho cho `thu_kho` (dòng 63-70)
— D-06 nói **thủ kho không tạo đơn và không thao tác đơn**, nên `danh_sach_don`/`chi_tiet_don`
có thể KHÔNG cần nhánh lọc theo `kho_hien_tai()` cho `thu_kho`, hoặc đơn giản là chặn
`thu_kho` đọc thẳng (tùy quyết định phân quyền ở bước lập kế hoạch — RLS/permission
matrix hiện tại `view-catalog` cho cả 4 vai trò xem, nên cân nhắc có permission riêng
`view-orders` không lộ cho `thu_kho`, hoặc để `thu_kho` xem read-only cũng không sai
nghiệp vụ). Đây là điểm cần chốt ở bước plan, không suy đoán.

**"Còn lại" tính khi đọc (D-04):** không lưu cột riêng — `chi_tiet_don`/`dong_don` trả cả
`so_luong_dat` và `so_luong_da_xuat`, phép trừ làm ở tầng `types.ts` (`toOrderLine`), đúng
khuôn "tính khi render, không giữ state" đã note trong `receipt-line-table.tsx` dòng 207.

---

#### WU-6 `0055_tao_phieu_xuat_tu_don.sql`

**Analog khung transaction + khóa dòng:** `ghi_so_chung_tu` (`0011_rpc_ghi_so.sql` dòng
181-262) — `select … for update`, kiểm trạng thái nguồn, vòng lặp `chung_tu_dong`, KHÔNG
bọc trong `exception when others` (giữ tính atomic — lỗi ở dòng n phải rollback cả n-1
dòng trước, để transaction ngầm định của RPC tự lo, đúng comment gốc dòng 243-245).

**Analog cấp số ngay khi tạo:** cách gọi `sinh_so_ct` trong
`src/features/stock-in/api/receipt.api.ts` dòng 69-93 (`createReceipt`) — nhưng ở đây
việc cấp số + copy dòng + set `so_luong = so_luong_dat` phải nằm chung MỘT RPC (D-10 yêu
cầu "điền sẵn mọi dòng = số đặt", và kho từng dòng phải resolve `san_pham.kho_mac_dinh_id`
ngay lúc tạo — hai bước này không được tách ra client vì giữa hai round-trip có thể có
người khác sửa đơn):
```sql
create or replace function public.tao_phieu_xuat_tu_don(p_don_id uuid)
returns public.chung_tu
language plpgsql security definer set search_path = '' as $$
declare
  v_don public.don_dat_hang;
  v_so_ct text;
  v_ct public.chung_tu;
  v_dong public.don_dat_hang_dong;
  v_kho_mac_dinh uuid;
begin
  if (select public.vai_tro_hien_tai()) not in ('quan_ly','van_phong') then
    raise exception 'Tài khoản không có quyền tạo phiếu xuất' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_don_id using errcode = '23514';
  end if;
  if v_don.trang_thai <> 'DA_XAC_NHAN' then
    raise exception 'Đơn % chưa được xác nhận, không tạo phiếu xuất được', v_don.so_dh
      using errcode = '23514';
  end if;

  v_so_ct := public.sinh_so_ct('XUAT');

  -- D-13: 4/3266 mã thiếu kho_mac_dinh_id — chặn TỪNG dòng thiếu, không đoán kho.
  if exists (
    select 1 from public.don_dat_hang_dong d
    join public.san_pham sp on sp.id = d.san_pham_id
    where d.don_dat_hang_id = p_don_id and sp.kho_mac_dinh_id is null
  ) then
    raise exception 'Có mã hàng chưa gán kho mặc định — sửa ở Danh mục trước khi tạo phiếu xuất'
      using errcode = '23514';
  end if;

  insert into public.chung_tu (so_ct, loai_ct, doi_tac_id, don_dat_hang_id, kho_id)
  select v_so_ct, 'XUAT', v_don.doi_tac_id, v_don.id,
         (select sp.kho_mac_dinh_id from public.don_dat_hang_dong d
          join public.san_pham sp on sp.id = d.san_pham_id
          where d.don_dat_hang_id = p_don_id limit 1)
  returning * into v_ct;

  for v_dong in select * from public.don_dat_hang_dong where don_dat_hang_id = p_don_id loop
    select sp.kho_mac_dinh_id into v_kho_mac_dinh from public.san_pham sp where sp.id = v_dong.san_pham_id;
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
    values (v_ct.id, v_dong.san_pham_id, v_dong.so_luong_dat, 0, 0, v_kho_mac_dinh);
  end loop;

  return v_ct;
end; $$;
revoke all    on function public.tao_phieu_xuat_tu_don(uuid) from public, anon;
grant execute on function public.tao_phieu_xuat_tu_don(uuid) to authenticated;
```
(Khung minh họa — điều chỉnh cột `kho_id` header theo quyết định thật của plan; điểm cốt
lõi cần giữ là **một RPC, một transaction, cấp số bên trong**, không phải bốn lệnh rời từ
client.)

---

#### WU-7 `0056_tao_phieu_tra.sql`

Cùng khung WU-6. Ràng buộc `ck_tra_hang_co_goc` (`0007_chung_tu.sql` dòng 40-42) đã ép
`chung_tu_goc_id is not null` cho `TRA_NCC`/`TRA_KHACH` — RPC chỉ cần set đúng cột đó khi
insert, ràng buộc tự chặn phần còn lại. Copy dòng từ chứng từ gốc (`chung_tu_dong where
chung_tu_id = p_goc_id`) sang chứng từ trả mới, để văn phòng sửa số trả trước khi ghi sổ
(ghi sổ dùng lại nguyên `_ghi_so_tra_khach`/`_ghi_so_tra_ncc` đã có, không viết lại).

---

### Wave 3 — Lớp dữ liệu client

#### WU-8 nâng `documents` dùng chung

`src/features/stock-in/types.ts` **đã đặt tên tổng quát `Document*`** (không phải
`Receipt*`) — đây là refactor "rút lên", không phải viết mới. Copy nguyên khối
`DocumentRow`/`DocumentDetail`/`DocumentLine` + ba hàm `toDocumentRow`/`toDocumentDetail`/
`toDocumentLine` (types.ts dòng 13-150) sang `src/features/documents/types.ts`, và ba hàm
đọc trong `receipt.api.ts` dòng 22-56 (`fetchReceipts`→`fetchDocuments`,
`fetchReceiptDetail`→`fetchDocumentDetail`, `fetchReceiptLines`→`fetchDocumentLines`) sang
`document.api.ts`. `RECEIPT_SOURCE_LABELS`/`RECEIPT_SOURCE_COLORS` ở lại `stock-in` (chỉ
NHẬP mới có `nguon_nhap`); `DOC_STATUS_LABELS`/`DOC_STATUS_COLORS` chuyển sang
`documents` (dùng chung mọi loại chứng từ).

**Việc bắt buộc sau khi rút:** `src/features/stock-in/*` phải import lại từ
`@/features/documents` thay vì định nghĩa cục bộ — `npm run check` sẽ không tự bắt được
lỗi quên xoá bản cũ (import trùng tên vẫn compile), phải tự rà bằng mắt theo Bước 7 của
CLAUDE.md, cộng thêm mở màn `/nhap-kho` kiểm mắt như 04-CONTEXT.md yêu cầu.

---

#### WU-9 + WU-10 `features/sales-order`

**Analog schema + bộ lọc URL:** `src/features/stock-in/schemas/receipt.schema.ts` toàn
bộ — đặc biệt `readReceiptFilterFromUrl`/`writeReceiptFilterToUrl` (dòng 113-147, dùng
tham số URL tiếng Việt không dấu: `trang_thai`, `ncc`→đổi thành `doi_tac`, `kho`, `trang`)
và `toReceiptListRpcArgs` (dòng 149-164, map filter → tham số RPC `p_*`).

**Khác biệt bắt buộc so với receipt.schema.ts:**
- KHÔNG có `unitPrice` trong `documentLineSchema` — DDH-01 nói rõ "không để giá trên đơn"
- Thêm field `deliveryDate` (`ngay_giao_du_kien`), bỏ `source`/`warehouseId` bắt buộc ở
  header (đơn không có kho — kho chỉ xuất hiện khi tạo phiếu xuất từ đơn, D-13)
- Bộ lọc thêm `status: TAM | DA_XAC_NHAN | HOAN_THANH | DA_HUY` thay vì `DocStatus` của
  `chung_tu` (`NHAP_LIEU | HOAN_THANH | DA_HUY`) — **đây là type khác, không tái dùng
  `DocStatus`**

**Analog api + hook:** `receipt.api.ts` + `useReceipts.ts` toàn bộ khuôn (mọi mutation gọi
`onSuccess: refresh` để invalidate đúng key). Riêng RPC đọc gọi `danh_sach_don`/`chi_tiet_don`
(WU-5) thay vì `danh_sach_chung_tu`/`chi_tiet_chung_tu` — args khác nhau, PHẢI viết
`toOrderListRpcArgs` riêng, không map qua `toReceiptListRpcArgs`.

⚠️ **Bẫy 10** áp dụng y nguyên: `useOrderDetail(id)` phải có `enabled: id !== ""`
(xem `useReceiptDetail` — `useReceipts.ts` dòng 38-45).

---

#### WU-11 `features/stock-out`

Mỏng trên `documents` (sau WU-8): `types.ts` chỉ thêm phần riêng của XUAT — `reason`
(`ly_do_xuat_am`/`ghi_chu_ly_do`), field "đã xuất/còn lại" khi phiếu gắn với đơn. `api/`
chỉ thêm tham số `p_ly_do_xuat_am`/`p_ghi_chu_ly_do` vào lệnh gọi tương đương
`postReceipt`:
```ts
// analog: src/features/stock-in/api/receipt.api.ts dòng 162-167
export async function postIssue(id: string, reason?: { code: string; note: string | null }): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("ghi_so_chung_tu", {
    p_chung_tu_id: id,
  });
  if (error) throw error;
}
```
Lưu ý: `ghi_so_chung_tu` hiện tại đọc `ly_do_xuat_am`/`ghi_chu_ly_do` từ **header** đã lưu
trước đó (`chung_tu.ly_do_xuat_am`), không nhận tham số — nghĩa là lý do phải được
`update` vào `chung_tu` (giống `updateReceiptHeader`) TRƯỚC khi gọi `postReceipt`, không
truyền qua RPC ghi sổ. Giữ đúng thứ tự này khi viết `stock-out.api.ts`.

---

### Wave 4 — Giao diện đơn đặt hàng

#### WU-12 — màn danh sách đơn

Copy nguyên khuôn bốn file: `receipt-table.tsx` (điều phối `ListLayout` + `QueryState` +
đọc/ghi URL) → `order-table.tsx`; `receipt-table-body.tsx` (cấu hình cột + `Table` +
`pagination`) → phần bảng trong `order-table.tsx`; `receipt-filter-panel.tsx` →
`order-filter-panel.tsx`; `nhap-kho/page.tsx` → `dat-hang/page.tsx`.

**Cột khác biệt:** thay "Nguồn" (`RECEIPT_SOURCE_*`) bằng "Người nhận" (`partnerName` —
đã có sẵn trong `DocumentRow`/tương đương `OrderRow`), thêm cột "Tiến độ" render
`${soLuongDaXuat}/${soLuongDat}` tính từ tổng các dòng — hoặc để ở trang chi tiết nếu
danh sách chỉ cần trạng thái đơn.

---

#### WU-13 — đầu đơn: ô tìm người nhận

**Analog Descriptions sửa-tại-chỗ:** `receipt-header.tsx` toàn bộ khuôn (`editable =
trạng thái cho phép && canEdit`, `save(field, values)` gọi mutation rồi hiện "đã lưu"
2 giây — dòng 34-56).

**⚠️ SAI nếu copy `Select` NCC của `receipt-header.tsx` dòng 112-124 cho ô người nhận.**
Select đó nạp TOÀN BỘ NCC qua `usePartners({...DEFAULT_PARTNER_FILTER, kind: "NCC"})` —
hợp lý vì NCC chỉ có ~25 dòng. `doi_tac` phía KHÁCH sẽ phình nhanh sau khi WU-0 rà xong
17+ tên (rồi 123 tên còn lại), nên phải tìm server-side theo từ khóa, không nạp hết.

**Analog ĐÚNG — tìm server-side + tạo mới tại chỗ:**
`src/features/partners/components/note-actions.tsx` dòng 33-63 (`CustomerSelect`):
```tsx
function CustomerSelect({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  const [query, setQuery] = useState("");
  const customers = useCustomerSearch(query);
  return (
    <Select
      showSearch allowClear className="w-full"
      placeholder="Gõ tên khách để tìm"
      value={value} filterOption={false} loading={customers.isFetching}
      onSearch={setQuery}
      onChange={(selected) => onChange(selected ?? undefined)}
      options={(customers.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
      notFoundContent={customers.isFetching ? "Đang tìm…" : "Không thấy khách nào khớp"}
    />
  );
}
```
`useCustomerSearch` gọi RPC `danh_sach_doi_tac` (xem
`src/features/partners/api/note-review.api.ts` dòng 140) — dùng lại đúng RPC này cho
`partner-search-input.tsx`, lọc `kind` theo KHÁCH nếu cần.

**Tạo đối tác mới tại chỗ (D-03 "nút thêm đối tác mới"):** dùng
`suggestPartnerCode("KHACH")` + `savePartner(null, input)` từ
`src/features/partners/api/partner.api.ts` dòng 96-124, theo khuôn modal của
`create-receipt-button.tsx` (form nhỏ, `onOk` gọi mutation, `router.push` hoặc
`onSelect` sau khi có id). `partnerSchema` (`src/features/partners/schemas/partner.schema.ts`
dòng 8-33) đã validate mã/tên/điện thoại — tái dùng, không viết schema mới cho việc tạo
đối tác.

---

#### WU-14 — bảng dòng đơn gõ bàn phím

**Analog gần như nguyên vẹn:** `receipt-line-table.tsx` toàn bộ — luồng
`ProductSearchInput` → Enter (bắt ở `onKeyDownCapture`, pha capture, xem bẫy 14) → focus
ô số lượng → Enter lưu dòng → `setTimeout(..., 0)` focus lại ô mã. Xoá cột "Đơn giá" và
"Thành tiền" (DDH-01: không có giá trên đơn). Thêm cột "Đã xuất / Còn lại" — RENDER khi có
`orderLine.shippedQuantity > 0`, tính `remaining = quantity - shippedQuantity` ngay trong
`render`, không lưu state (đúng khuôn dòng 207 của `receipt-line-table.tsx`).

⚠️ **Bẫy 15** áp dụng y nguyên trong `ProductSearchInput` dùng lại từ stock-in — ưu tiên
mã khớp tuyệt đối (dòng 44-49 của `product-search-input.tsx`), KHÔNG viết lại.

---

### Wave 5 — Duyệt và in đơn

#### WU-15 — nút xác nhận / mở khóa / đóng sớm

**Analog khuôn confirm → RPC → map lỗi theo mã:** `post-receipt-button.tsx` toàn bộ
(dòng 37-64: `modal.confirm` với `content` là tóm tắt, `onOk` async, bắt riêng `23514`
(hiện nguyên văn message RPC) và `42501` (thông báo tiếng Việt cố định), fallback
`explainError`). `approve-order-button.tsx` dùng lại cấu trúc này gọi `xac_nhan_don`.

`unlock-order-dialog.tsx` copy nguyên `void-receipt-dialog.tsx` — Modal có ô lý do bắt
buộc ≥ 5 ký tự, `close()` chặn khi đang pending, bắt lỗi `42501`/`23514` riêng.

---

#### WU-16 — mẫu in phiếu đi lấy hàng

**Analog khung in:** `receipt-print-template.tsx` toàn bộ CSS `@page`/`@media print`
(dòng 28-36: `thead { display: table-header-group }` để đầu bảng lặp sang trang,
`tr { break-inside: avoid }`), và `receipt-print-page.tsx` (route chi tiết riêng cho
in — KHÔNG ẩn/hiện bằng CSS trên trang chi tiết, lý do đã ghi ở comment
`nhap-kho/[id]/in/page.tsx` dòng 11-14: trang chi tiết có ô nhập liệu, in ra sẽ dính khung
nhập).

**KHÔNG có analog cho:** xếp theo kho + dòng tiêu đề nhóm mỗi kho (Claude's Discretion,
04-CONTEXT.md). Tự viết: sort `lines` theo `(warehouseName, productCode)`, `reduce` thành
mảng xen kẽ `{ kind: "group"; warehouseName } | { kind: "line"; line }`, render `<tr>`
nhóm với `colSpan` đầy đủ trước mỗi cụm kho. Thêm cột trống cuối bảng (D-09: "cột trống để
kho ghi tay số thực lấy") — chỉ thêm `<th>`/`<td>` rỗng, không render giá trị.

---

### Wave 6 — Giao diện phiếu xuất

#### WU-17 — copy gần như 1:1 từ `receipt-table`/`receipt-filter-panel`

Đổi `p_loai_ct: "NHAP"` (`toReceiptListRpcArgs` dòng 153) thành `"XUAT"`. Cột "Nguồn"
(chỉ NHẬP có) đổi thành cột "Đơn gốc" (`donDatHangSoDh`, link sang `/dat-hang/{id}` nếu
có) — phiếu xuất có thể tạo không cần đơn (XUAT-02), cột này nullable.

#### WU-18 — tạo phiếu xuất: từ đơn + tạo mới

Nhánh "tạo mới không cần đơn" copy `create-receipt-button.tsx` nguyên khuôn Modal (chọn
đối tác + kho, gọi RPC cấp số qua `createReceipt`-style function, `router.push`). Nhánh
"từ đơn" KHÔNG có analog trực tiếp — gọi RPC `tao_phieu_xuat_tu_don` (WU-6) rồi
`router.push(`/xuat-kho/${id}`)`; giao diện chỉ cần một nút trên trang chi tiết đơn
(`order-header.tsx` hoặc `approve-order-button.tsx` khu vực actions) khi
`trang_thai = 'DA_XAC_NHAN'`, theo đúng khuôn `Space wrap` actions trong
`receipt-detail.tsx` dòng 58-78.

`issue-line-table.tsx` = `receipt-line-table.tsx` với "kho sửa được từng dòng" (D-13) đã
CÓ SẴN pattern (`hasMultipleWarehouses` + cột Select kho, dòng 126-150) — dùng lại y
nguyên, không viết mới.

#### WU-19 — ghi sổ với cảnh báo xuất âm

**Analog `post-issue-button.tsx`:** `post-receipt-button.tsx` + `posting-summary.tsx`
nguyên khuôn. Khác biệt bắt buộc: chặn ghi sổ nếu **chưa chọn lý do xuất âm** khi có dòng
vượt tồn — kiểm tra này lặp lại phía client (giống kiểm `linesMissingPrice` dòng 23-35 của
`post-receipt-button.tsx`) NHƯNG chặn thật nằm ở `ghi_so_chung_tu` (`0011` dòng 219-230,
đã có sẵn — "XUAT-04 đã chặn ở database, giao diện chỉ cần thu thập lý do" đúng như
CONTEXT.md ghi).

**`negative-stock-panel.tsx`:** không có analog UI cho "danh sách lý do cố định + ô ghi
chú tự do". Gần nhất là ô lý do tự do bắt buộc trong `void-receipt-dialog.tsx` dòng 91-97
(`Input.TextArea` + validate độ dài trước khi cho submit) — thêm `Radio.Group` bốn lựa
chọn phía trên, theo khuôn `Radio.Group optionType="button"` đã dùng ở
`create-receipt-button.tsx` dòng 130-141 cho chọn nguồn nhập.

**`similar-code-hint.tsx`:** analog đúng nhất là khuôn "gợi ý + ghi lại đề xuất, không tự
hành động" của `note-actions.tsx` — cụ thể panel `MERGE` (dòng 190-203): `CustomerSelect`
để chọn mã đích + nút gọi mutation ghi quyết định, KHÔNG có hiệu ứng dữ liệu nào khác
ngoài một dòng ghi lại. Áp dụng: hiện `Alert` khi `goi_y_ma_trung` trả kết quả, nút
"Đề nghị gộp hai mã" gọi `ghi_de_nghi_gop_ma` (WU-4) rồi `message.success`, không chặn
luồng ghi sổ.

---

### Wave 7 — In, trả hàng, tích hợp

#### WU-20 — mẫu in giao hàng cho khách

Cùng khung `receipt-print-template.tsx`/`receipt-print-page.tsx` như WU-16, nhưng
**KHÔNG cần D-09** (mẫu này không phải giấy đi lấy hàng) — mục đích khác (XUAT-06: giao
cho khách), nên cân nhắc lại việc ẩn giá. 04-CONTEXT.md không chốt rõ mẫu này có hiện giá
hay không (đơn không có giá theo D-01, nhưng phiếu xuất tạo độc lập — XUAT-02 — có thể có
đơn giá thật ở `chung_tu_dong.don_gia`). **Cần quyết định ở bước plan**, không suy đoán.

#### WU-21 — trả hàng

`return-button.tsx` đặt trên `receipt-detail.tsx`/`issue-detail.tsx` (khu vực actions,
cùng vị trí nút "In phiếu"/"Hủy phiếu" — dòng 58-78 của `receipt-detail.tsx`), chỉ hiện
khi `status === 'HOAN_THANH'`. Gọi RPC `tao_phieu_tra` (WU-7) rồi điều hướng sang
`/tra-hang/{id}`. `return-line-table.tsx` = `receipt-line-table.tsx` với dòng đã có sẵn
(bê từ chứng từ gốc), chỉ số lượng sửa được — không có `ProductSearchInput` để thêm dòng
mới (trả hàng không thêm mã ngoài chứng từ gốc).

#### WU-22 — tích hợp

**⚠️ File đúng cần sửa để thêm mục nav là `src/shared/lib/navigation.ts`
(mảng `NAV_ITEMS`), KHÔNG PHẢI `src/shared/components/app-shell.tsx`.**
`app-shell.tsx` chỉ tiêu thụ `NAV_ITEMS` qua `filterByPermission(user.role, NAV_ITEMS)`
(app-shell.tsx dòng 28) — sửa nav ở component sẽ không có tác dụng nếu `NAV_ITEMS` không
đổi, và ngược lại sửa đúng `navigation.ts` thì mọi nơi tiêu thụ (`app-shell.tsx`,
`bottom-tab-bar.tsx`) tự động cập nhật. Thêm phần tử theo khuôn dòng 29-37 của
`navigation.ts`:
```ts
{
  href: "/dat-hang", label: "Đặt hàng", shortLabel: "Đặt hàng",
  icon: "sales-order" /* thêm giá trị mới vào NavIconId + nav-icons.tsx */,
  permission: "view-catalog", mobilePriority: 2,
},
{
  href: "/xuat-kho", label: "Xuất kho", shortLabel: "Xuất",
  icon: "stock-out", permission: "view-catalog", mobilePriority: 3,
},
```
(Điều chỉnh `mobilePriority` cho tối đa 4 ô chính — hiện đã có 4 mục priority 1-4, thêm 2
mục mới sẽ đẩy "Danh mục"/"Đối tác" ra "Khác" nếu không tính lại, xem `splitMobileItems`
dòng 83-96 của cùng file.)

**`src/proxy.ts` không cần sửa cho phân quyền route mới.** File này CHỈ xử lý phiên đăng
nhập (redirect `/dang-nhap` khi chưa đăng nhập, redirect ngược khi đã đăng nhập mà vào
`/dang-nhap`) — không có logic theo route hay theo vai trò. Chặn quyền thật nằm ở
`requirePermission()` gọi trong TỪNG `page.tsx` (`src/features/auth/api/current-user.server.ts`
dòng 42-49) — mỗi route mới (`dat-hang`, `xuat-kho`, `tra-hang`, và các route `[id]`/`[id]/in`)
phải tự gọi `await requirePermission("view-catalog")` (hoặc quyền phù hợp) trong
Server Component của nó, đúng khuôn `nhap-kho/page.tsx` dòng 12 và
`nhap-kho/[id]/page.tsx` dòng 17.

**`scripts/test-route-permissions.ts`:** thêm dòng vào mảng `MA_TRAN` cho MỌI route tĩnh
mới (`/dat-hang`, `/xuat-kho`) theo mẫu `AI_CUNG_XEM` (dòng 27-34, 41). Route có `[id]`
cần một hàm `layIdPhieuXuat()`/`layIdDon()` theo khuôn `layIdPhieuNhap()` (dòng 89-115) —
đăng nhập bằng tài khoản `quan_ly`, gọi RPC `danh_sach_don`/`danh_sach_chung_tu` với
`p_kich_thuoc: 1` để lấy một id thật, KHÔNG hard-code uuid. Nếu chưa có dữ liệu thật (đơn
0 dòng cho tới khi WU-0 xong), in cảnh báo và bỏ qua hai dòng đó thay vì giả vờ đã kiểm —
đúng khuôn dòng 164-172 (`if (idPhieu) {...} else { console.warn(...) }`).

⚠️ **Bẫy 12** — thiếu dù chỉ một route (kể cả route redirect) thì script vẫn báo xanh
trong khi trang đó crash. `/tra-hang/[id]` PHẢI có dòng riêng dù chỉ có một route dạng
này (không có `/tra-hang` danh sách).

---

## Shared Patterns

### Bốn trạng thái bắt buộc — `QueryState`
**Nguồn:** `src/shared/components/query-state.tsx` (81 dòng, đọc toàn bộ ở trên).
**Áp dụng cho:** mọi component đọc dữ liệu ở Wave 4, 6, 7 (`order-table.tsx`,
`issue-table.tsx`, `order-line-table.tsx`, v.v.) — bọc `query` bằng `<QueryState>`, không
render thẳng từ `query.data`.

### Bố cục danh sách — `ListLayout`
**Nguồn:** `src/shared/components/list-layout.tsx`. Panel lọc trái cố định ≥992px, sập
vào `Drawer` dưới 992px. Dùng cho `order-table.tsx`, `issue-table.tsx` giống hệt
`receipt-table.tsx` dòng 55-73.

### Lỗi — `explainError` / `isPostgrestError` / `errorCode`
**Nguồn:** `src/shared/lib/errors.ts`.
```ts
export function isPostgrestError(error: unknown): error is PostgrestErrorShape { ... }
export function errorCode(error: unknown): string | null { ... }
export function explainError(error: unknown): ExplainedError { ... }
```
Khuôn dùng trong mọi mutation UI (xem `post-receipt-button.tsx` dòng 51-58,
`void-receipt-dialog.tsx` dòng 39-48): so `errorCode(error) === "42501"` cho lỗi quyền,
`isPostgrestError(error) && error.code === "23514"` để hiện NGUYÊN VĂN message RPC (RPC đã
soạn sẵn câu tiếng Việt), fallback `explainError`.

### Điều hướng — `NAV_ITEMS` + `filterByPermission`
**Nguồn:** `src/shared/lib/navigation.ts` (file thuần, không `"use client"`, để cả Server
Component (`app-shell.tsx` gián tiếp qua props) và các nơi khác import được — đúng bẫy 9).

### Chặn quyền route — `requirePermission()`, KHÔNG phải `proxy.ts`
**Nguồn:** `src/features/auth/api/current-user.server.ts`. Mọi `page.tsx` Server Component
gọi `await requirePermission("view-catalog")` (hoặc quyền khác) ở đầu hàm — redirect
`/dang-nhap` nếu chưa đăng nhập, `/khong-du-quyen` nếu sai vai trò.

### Cache sau khi ghi sổ/hủy phải invalidate cả danh mục
**Nguồn:** `useReceipts.ts` dòng 110-127 (`useRefreshAfterPosting`) — ghi sổ/hủy đổi TỒN
và GIÁ VỐN, phải `invalidateQueries({ queryKey: productKeys.all })` chứ không chỉ cache
phiếu. Áp dụng y nguyên cho `usePostIssue`/`useVoidIssue` ở `stock-out`, và cho
`useApproveOrder` KHÔNG cần (duyệt đơn không đụng tồn).

### Khuôn pgTAP
**Nguồn:** `supabase/tests/00_helper.sql.inc` (58 dòng) + `supabase/tests/22_kho_theo_dong_test.sql`.
```sql
begin;
select plan(6);
-- chép nguyên khối 00_helper.sql.inc vào đây (dang_nhap_nhu / dang_xuat / sp_test / kho_id)
create temp table t_xxx as select ...;
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
-- dựng dữ liệu, gọi hàm cần test
select is(actual, expected, 'mô tả assert bằng tiếng Việt');
select * from finish();
rollback;
```
Toàn bộ file test nằm trong MỘT transaction `begin; ... rollback;` — không để lại dữ liệu
thử trên database thật.

### Mapper — ranh giới DUY NHẤT chạm tên cột tiếng Việt
**Nguồn:** `types.ts` (`toDocumentRow`/`toDocumentDetail`/`toDocumentLine`) +
`schema.ts` (`toDocumentUpdate`/`toDocumentLineUpdate`, `toReceiptListRpcArgs`). Component
và hook KHÔNG BAO GIỜ thấy `ma_hang`, `so_luong_dat`, `doi_tac_id` — chỉ thấy
`productCode`, `orderedQuantity`, `partnerId`.

---

## Không có analog

| File | Vai trò | Lý do không có analog |
|---|---|---|
| `de_nghi_gop_ma` (bảng + RPC) | migration | Chưa có bảng "đề xuất chờ xử lý" nào tương tự ngoài `anh_xa_ghi_chu_kiotviet` (dùng làm khuôn kỹ thuật, nhưng mục đích nghiệp vụ khác hẳn — một cái là quyết định cuối, một cái là đề xuất chờ) |
| `negative-stock-panel.tsx` | component | Chưa có UI "danh sách lý do cố định + ghi chú tự do" nào trong codebase — `void-receipt-dialog.tsx` chỉ có ô tự do, không có danh sách cố định |
| `picking-print-template.tsx` — phần nhóm theo kho | component | Không có mẫu in nào từng nhóm dòng theo cột kèm dòng tiêu đề nhóm; `receipt-print-template.tsx` chỉ có bảng phẳng |
| `create-issue-button.tsx` — nhánh "tạo từ đơn" | component | `create-receipt-button.tsx` chỉ có nhánh "tạo mới", chưa có màn nào gọi một RPC rồi router.push ngay theo kiểu "sinh từ nguồn khác" |
| `return-button.tsx` | component | Chưa có nút nào trên chứng từ ĐÃ GHI SỔ sinh ra một chứng từ khác — mọi nút hành động hiện tại (`PostReceiptButton`, `VoidReceiptDialog`) chỉ đổi trạng thái của CHÍNH chứng từ đang xem |
| `approve-order-button.tsx` / `unlock-order-dialog.tsx` — khái niệm "duyệt" | component | Chưa có luồng hai trạng thái sống (`TAM`→`DA_XAC_NHAN`) nào trong UI hiện tại — mọi chứng từ hiện chỉ có `NHAP_LIEU`→`HOAN_THANH` (một chiều, qua ghi sổ) |

Với các dòng trên, dùng khuôn CẤU TRÚC gần nhất đã trích ở Pattern Assignments (confirm
→ RPC → bắt lỗi; record-only proposal) làm điểm khởi đầu, không chờ có analog y hệt.

---

## Sáu chỗ CONTEXT.md nói sai hoặc không chính xác

Đây là các chỗ 04-CONTEXT.md (và phần "Reusable Assets" trong đó) mô tả khác với thực tế
trong codebase. Dùng tên/đường dẫn trong PATTERNS.md này, không dùng tên trong CONTEXT.md:

1. **`BoCucDanhSach` không tồn tại.** Tên thật là `ListLayout`, file
   `src/shared/components/list-layout.tsx`.
2. **`laLoiPostgrest()` và `maLoi()` không tồn tại.** Tên thật trong
   `src/shared/lib/errors.ts` là `isPostgrestError()` và `errorCode()`.
3. **`receipt-table-body.tsx` KHÔNG PHẢI bảng gõ bàn phím.** Nó là bảng DANH SÁCH phiếu
   (cột số phiếu, ngày, đối tác, trạng thái — dùng `<Link>` sang trang chi tiết). Bảng gõ
   bàn phím DUY NHẤT là `receipt-line-table.tsx`. Đừng gộp hai file này lại khi tìm
   analog cho `order-table-body.tsx` (WU-14) — analog đúng là phần `<Table>` NẰM TRONG
   `receipt-line-table.tsx`, không phải file `receipt-table-body.tsx`.
4. **Chặn quyền route KHÔNG nằm ở `src/proxy.ts`.** `proxy.ts` chỉ lo phiên đăng nhập
   (redirect `/dang-nhap`). Chặn theo vai trò nằm ở `requirePermission()` gọi trong từng
   `page.tsx`. `scripts/test-route-permissions.ts` dòng 5-6 tự ghi rõ điều này:
   *"Vì sao cần: permissions.ts chỉ ẩn/hiện nút. Thứ chặn thật là requirePermission()
   trong Server Component VÀ proxy.ts"* — nhưng đọc kỹ `proxy.ts` thì thấy nó không có
   role check nào, chỉ có auth check. Câu comment trong script hơi gây hiểu lầm; thực tế
   100% role-gating nằm ở `requirePermission()`.
5. **Route mới không sửa `app-shell.tsx`.** Sửa `src/shared/lib/navigation.ts`
   (mảng `NAV_ITEMS`) — `app-shell.tsx` chỉ tiêu thụ mảng đó.
6. **`sinh_so_ct`/`chuoi_so_ct` không dùng lại được nguyên trạng cho `so_dh`.** Hai bảng
   này khóa theo `loai_ct` (enum bảy giá trị chứng từ). `don_dat_hang` không phải một
   `loai_ct`. Phải viết bảng đếm + hàm RIÊNG (`chuoi_so_dh`/`sinh_so_dh`), sao chép Y
   NGUYÊN kỹ thuật `insert … on conflict do update … returning` — xem WU-3 ở trên.

## Một khoảng trống quyền cần chốt ở bước plan (không phải lỗi CONTEXT.md, nhưng chưa ai nói)

`0046_chi_quan_ly_huy_nhap.sql` CHỈ siết quyền hủy cho `loai_ct = 'NHAP'` khi đã
`HOAN_THANH` (dòng 36-39: `if v_ct.loai_ct = 'NHAP' and v_ct.trang_thai = 'HOAN_THANH' and
vai_tro <> 'quan_ly' then raise exception`). Với `loai_ct = 'XUAT'` đã `HOAN_THANH`,
`huy_chung_tu` hiện KHÔNG chặn `van_phong` — bất kỳ ai không phải `chi_xem` đều hủy được
phiếu xuất đã ghi sổ. 04-CONTEXT.md (D-06, D-15) không nói rõ ai được hủy phiếu xuất đã
ghi sổ. Bước plan cần quyết định: giữ nguyên (văn phòng tự hủy được, khác với NHẬP), hay
thêm một khối kiểm tương tự cho `XUAT` trong một migration mới của Phase 4 (không sửa
`0046` — theo đúng nguyên tắc "chỉ thêm migration mới, không sửa migration đã chạy").

---

## Metadata

**Phạm vi tìm analog:** `src/features/stock-in/` (19 file, đọc toàn bộ), `src/features/partners/`
(note-actions.tsx, note-review.tsx, partner.api.ts, partner.schema.ts), `src/shared/`
(list-layout.tsx, query-state.tsx, errors.ts, permissions.ts, navigation.ts),
`src/features/auth/api/current-user.server.ts`, `src/proxy.ts`,
`scripts/test-route-permissions.ts`, 11 file migration
(`0002, 0006, 0007, 0011, 0028, 0033, 0041, 0045, 0046, 0047, 0048`),
2 file pgTAP (`00_helper.sql.inc`, `22_kho_theo_dong_test.sql`).
**File scan:** ~40 file đọc trực tiếp, đủ để phủ toàn bộ 22 WU với ít nhất một analog cấu
trúc mỗi WU.
**Ngày lập:** 2026-09-20
