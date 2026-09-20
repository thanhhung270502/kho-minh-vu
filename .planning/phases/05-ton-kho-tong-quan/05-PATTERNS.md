# Phase 5: Tồn kho & Tổng quan — Bản đồ khuôn mẫu (PATTERNS)

**Lập:** 2026-09-20
**File phân tích:** 11 WU (05-WORK-UNITS.md), không có 05-RESEARCH.md (bỏ qua có chủ đích)
**Analog tìm được:** 11/11 WU có ít nhất một analog trực tiếp; ba phát hiện lớn làm ĐỔI HẲN phạm vi file
của WU-8, WU-9, WU-10 so với mô tả trong 05-WORK-UNITS.md (xem mục **"Đính chính"** ở cuối — đọc mục
đó TRƯỚC khi lập kế hoạch, đừng chỉ copy tên file từ WORK-UNITS.md).

**Cảnh báo phải nhắc lại (theo yêu cầu của điều phối):** file migration trong repo là bản ĐÃ ÁP DỤNG lên
cloud, không phải bản đề xuất — nhưng một số file (`0011`, `0033`, `0051`-`0057`) từng lệch giữa repo và
database thật vì một phiên khác áp migration mà không commit. Các file `0029`, `0030`, `0031`, `0044`,
`0056` mà PATTERNS.md này trích dẫn đều tự ghi chú "DỰNG LẠI TỪ DATABASE" ở đầu file — nghĩa là chúng đã
được xác minh khớp `pg_get_functiondef` tại thời điểm dựng lại (18–20/09/2026). Vẫn nên chạy
`pg_get_functiondef`/`pg_policies` trên cloud trước khi SỬA bất kỳ hàm nào trong số này, đừng tin nguyên
văn repo là còn khớp tại thời điểm thực thi Phase 5.

---

## File Classification

| WU | File mới/sửa | Vai trò | Luồng dữ liệu | Analog gần nhất | Mức khớp |
|---|---|---|---|---|---|
| WU-1 | `supabase/migrations/0058_rpc_ton_kho.sql` | migration (RPC đọc) | request-response, phân trang server | `0030_danh_sach_san_pham.sql` (`danh_sach_san_pham`) | role-match — khuôn lọc/phân trang khớp, kỹ thuật PIVOT kho→cột không có analog |
| WU-1 | `supabase/tests/32_ton_kho_test.sql` (đề nghị đổi tên, xem Đính chính #7) | test | pgTAP | `supabase/tests/41_danh_sach_san_pham_test.sql` + `00_helper.sql.inc` | exact |
| WU-2 | `supabase/migrations/0059_the_kho_ton_luy_ke.sql` | migration (đổi kiểu trả về hàm đã có người gọi) | transform | `0029_an_gia_von.sql` dòng 92-133 (`drop function` → `create` khi đổi kiểu trả về) áp lên chính `0031_the_kho_san_pham.sql` | role-match |
| WU-2 | `supabase/tests/33_the_kho_luy_ke_test.sql` | test | pgTAP | `supabase/tests/42_the_kho_test.sql` | exact |
| WU-3 | `supabase/migrations/0060_de_xuat_dinh_muc.sql` | migration (2 RPC: đề xuất + ghi) | request-response, CRUD có kiểm soát | `0035_ra_hang_loat.sql` (`goi_y_cong_doan_theo_duoi` + `ap_dung_goi_y_cong_doan`) | exact — mạnh hơn hẳn analog mà 05-WORK-UNITS.md tự gợi ý |
| WU-3 | `supabase/tests/34_dinh_muc_test.sql` | test | pgTAP | `supabase/tests/62_ra_hang_loat_test.sql` | exact |
| WU-4 | `supabase/migrations/0061_nap_ton_tam.sql` | migration (RPC ghi, atomic, có chế độ xem trước) | event-driven, CRUD | `0044_gia_von_dau_ky.sql` (`dat_gia_von_dau_ky` — preview/commit + bỏ qua mã đã có dữ liệu thật) GHÉP với `0056_tao_phieu_xuat_tu_don.sql` (dựng một chứng từ atomic) | role-match — phải ghép hai khuôn, không có analog dựng sẵn cả hai |
| WU-4 | `supabase/tests/35_nap_ton_tam_test.sql` | test | pgTAP | `supabase/tests/91_gia_von_dau_ky_test.sql` | exact |
| WU-5 | `src/features/inventory/types.ts` | type + mapper | transform | `src/features/products/types.ts` (đặc biệt khối `StockCardRow`/`toStockCardRow` dòng 52-67, 209-226) | exact |
| WU-5 | `src/features/inventory/schemas/inventory.schema.ts` | schema + bộ lọc URL | transform | `src/features/products/schemas/filter.schema.ts` (toàn bộ — đặc biệt `readFilterFromUrl`/`writeFilterToUrl`/`toListRpcArgs`) | exact |
| WU-5 | `src/features/inventory/api/inventory.keys.ts` | query key | — | `src/features/products/api/product.keys.ts` | exact |
| WU-6 | `src/features/inventory/api/inventory.api.ts` | data layer | request-response | `src/features/products/api/product.api.ts` (`fetchProducts` dòng 30-44) | exact |
| WU-6 | `src/features/inventory/hooks/useInventory.ts` | hook TanStack Query | — | `src/features/products/hooks/useProducts.ts` (`useProducts` dòng 27-34, `keepPreviousData`) | exact |
| WU-7 | `src/app/(app)/ton-kho/page.tsx` | route (Server Component) | request-response | `src/app/(app)/danh-muc/page.tsx` | exact |
| WU-7 | `src/features/inventory/components/stock-table.tsx` | component (danh sách) | request-response | `src/features/products/components/product-table.tsx` | exact |
| WU-7 | `src/features/inventory/components/stock-filter-panel.tsx` | component | — | `src/features/products/components/product-filter-panel.tsx` | exact |
| WU-8 | **KHÔNG có file mới** — sửa `src/features/products/types.ts`, `src/features/products/api/product.api.ts`, `src/features/products/components/stock-card.tsx` | mở rộng component đã có | request-response | chính ba file này (đã tồn tại, đã gắn vào `product-detail.tsx`) | exact — xem Đính chính #1, đây là sửa sai lớn nhất so với WORK-UNITS.md |
| WU-9 | `src/app/(app)/ton-kho/dinh-muc/page.tsx` | route | request-response | `src/app/(app)/danh-muc/page.tsx` (khung `PageHeader` + `Suspense`) | role-match |
| WU-9 | `src/features/inventory/components/reorder-level-table.tsx` | component (đề xuất + duyệt hàng loạt) | event-driven | `src/features/products/components/stage-suggestions.tsx` + RPC cặp `goi_y_cong_doan_theo_duoi`/`ap_dung_goi_y_cong_doan` | exact — analog mạnh nhất toàn bộ bản đồ này |
| WU-10 | `src/app/(app)/ton-kho/duoi-dinh-muc/page.tsx` | route | request-response | **`danh_sach_san_pham` đã có `p_trang_thai_ton = 'duoi_dinh_muc'` sẵn** — xem Đính chính #2 | exact, có thể không cần code mới |
| WU-10 | `src/app/api/ton-kho/nap-tam/route.ts` | route handler (upload Excel) | file-I/O, request-response | `src/app/api/danh-muc/gia-von-dau-ky/route.ts` | exact |
| WU-10 | `src/features/inventory/components/provisional-stock-preview.tsx` | component (xem trước 3 bước) | request-response | `src/features/products/components/cost-import.tsx` | exact |
| WU-11 | `src/shared/lib/navigation.ts` (sửa, không phải file mới) | pure lib | — | mảng `NAV_ITEMS` đã có, thêm phần tử theo khuôn dòng 20-63 | exact |
| WU-11 | `src/app/(app)/ton-kho/**/page.tsx` | route | — | `requirePermission()` gọi trong `danh-muc/page.tsx` dòng 12 | exact |
| WU-11 | `scripts/test-route-permissions.ts` | test (HTTP thật) | request-response | mảng `MA_TRAN` dòng 36-52 | exact — xem Đính chính #8 (mảng này hiện THIẾU cả route Phase 4) |

---

## Pattern Assignments

### Wave 1 — Nền database

#### WU-1 `0058_rpc_ton_kho.sql` — `danh_sach_ton_kho`

**Analog khuôn lọc/phân trang/quyền:** `danh_sach_san_pham` (`0030_danh_sach_san_pham.sql` dòng 48-121).
Ba khối bắt buộc chép lại nguyên xi:

```sql
-- Khối 1: preamble vai trò + phạm vi kho (dòng 54-60 của 0030)
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
```

```sql
-- Khối 2: CTE lọc + đếm tổng kèm mỗi dòng (dòng 66-100, rút gọn)
return query
with loc as (
  select sp.*, ...
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  where (v_tk is null or ...)
    and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
    and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
)
select ..., count(*) over ()
from loc l
...
limit v_kt offset (v_tr - 1) * v_kt;
```

**Không có analog — kỹ thuật PIVOT kho→cột (D-01: "kho là cột, không phải dòng"):** không RPC nào trong
codebase từng biến giá trị hàng thành cột động. Với đúng 2 kho cố định (không cần pivot động), cách đơn
giản nhất là aggregate có điều kiện ngay trong CTE tồn, theo đúng khuôn `ton as (...)` mà `0030` và `0031`
đã dùng để gộp `ton_kho` theo `san_pham_id`:

```sql
with ton as (
  select tk.san_pham_id,
         sum(tk.so_luong) filter (where tk.kho_id = (select id from public.kho where ma = 'K1')) as ton_k1,
         sum(tk.so_luong) filter (where tk.kho_id = (select id from public.kho where ma = 'K2')) as ton_k2,
         sum(tk.so_luong) as tong_ton
  from public.ton_kho tk
  where v_vai_tro <> 'thu_kho' or tk.kho_id = any((select public.kho_hien_tai())::uuid[])
  group by tk.san_pham_id
)
```
Đừng hard-code mã kho `'K1'`/`'K2'` bằng literal string trong hàm — join động qua bảng `kho` (2 dòng,
đọc một lần) rồi `crosstab`-thủ-công bằng `filter (where kho_id = k.id)` cho từng kho đọc được, tương tự
trên nhưng lấy id kho từ một subquery `select id, ma from public.kho order by ma` thay vì gõ tay UUID.

**Bẫy phải tránh — `kho_hien_tai()` trả về mảng, KHÔNG được thiếu cast:** hàm này (định nghĩa lại ở
`0026_nguoi_dung_nhieu_kho.sql` dòng 92-101, thay cho bản cũ trong `0016`) tự ghi rõ trong comment
(dòng 105):

> *"Trong policy LUÔN viết `kho_id = any((select public.kho_hien_tai())::uuid[])` — Postgres phân giải
> "any((select ...))" thành dạng ANY(subquery) (so từng DÒNG, không so mảng) nếu thiếu cast `::uuid[]`,
> ném lỗi 42883 "uuid = uuid[]"."*

`0030`/`0031` đều viết `v_kho uuid[] := (select public.kho_hien_tai())` rồi so `= any(v_kho)` (không cast
lại vì đã ép kiểu ngay lúc gán biến) — copy đúng hai bước này, không viết `kho_id = any(public.kho_hien_tai())`
trực tiếp trong mệnh đề `where`.

**Vì sao cần RPC mới dù `ton_kho` không bị thu quyền cột:** khác với `san_pham`/`kho_movement`,
`ton_kho` KHÔNG có `revoke select` cột (đã kiểm — không có dòng nào trong `0029`/`0016`/`0026` thu quyền
cột của `ton_kho`; `product.api.ts` dòng 79-83 gọi thẳng `.from("ton_kho").select("kho_id, so_luong, ...")`
không qua RPC). Lý do WU-1 vẫn cần RPC không phải vì `ton_kho` bị chặn, mà vì (a) phải PIVOT theo kho,
(b) phải lọc/tìm trên `san_pham` (có cột bị chặn), (c) phải phân trang + đếm tổng ở server cho 3.266 dòng.

---

#### WU-2 `0059_the_kho_ton_luy_ke.sql` — thêm cột tồn lũy kế vào `the_kho_san_pham`

**Analog kỹ thuật đổi kiểu trả về:** `0029_an_gia_von.sql` dòng 92 (`drop function
public.tim_san_pham(text, int);` rồi `create function` lại) — `create or replace function` KHÔNG cho đổi
danh sách cột trả về, phải `drop` trước. `the_kho_san_pham` (`0031_the_kho_san_pham.sql` dòng 10) hiện trả
`RETURNS TABLE(nguon text, ..., tong_so_dong bigint)` — thêm một cột `ton_luy_ke numeric` bắt buộc
`drop function public.the_kho_san_pham(uuid, uuid, int, int);` trước khi `create`.

**Kỹ thuật cửa sổ (window function) — KHÔNG có analog trong codebase.** Grep toàn bộ migration không tìm
thấy `sum(...) over (...)` nào ngoài `count(*) over ()` dùng để đếm tổng trang. Đây là lần đầu cần
running-balance thật. Ba điểm phải làm đúng, không ai đã làm mẫu:

1. **Tính lũy kế theo thứ tự THỜI GIAN TĂNG DẦN** (`order by ngay asc` bên trong `over(...)`), RỒI mới sắp
   lại `desc` ở `order by` cuối cùng của câu lệnh — hai `ORDER BY` độc lập nhau, không mâu thuẫn:
   ```sql
   , voi_luy_ke as (
     select t.*,
       sum(coalesce(t.so_luong_nhap,0) - coalesce(t.so_luong_xuat,0))
         over (order by t.ngay asc, t.chung_tu_id asc rows unbounded preceding) as ton_luy_ke
     from tat_ca t
   )
   select ... from voi_luy_ke order by ngay desc limit v_kt offset ...
   ```
2. **Phải cộng CẢ dòng `KIOTVIET_NHAP`/`KIOTVIET_BAN`** vào lũy kế, không chỉ `HE_THONG` — vì `ton_kho`
   bắt đầu từ 0 và các dòng KiotViet là lịch sử TRƯỚC go-live; bỏ chúng ra sẽ làm lũy kế sai ngay từ mốc
   đầu tiên. Đây đúng là lý do D-03 đưa ra ("Chi tiết: tồn tại thời điểm đó — chưa có") — comment gốc của
   `0031` dòng 78 ("Không cộng vào tồn") chỉ nói `ton_kho` (bảng tổng hợp) không cộng dòng KiotViet, KHÔNG
   có nghĩa cột lũy kế mới cũng phải bỏ qua chúng.
3. **Lũy kế phải tính trên TOÀN BỘ tập dữ liệu trước khi phân trang**, không tính trên từng trang — nếu
   `limit`/`offset` chạy trước cửa sổ, dòng đầu của trang 2 sẽ có lũy kế sai (bắt đầu lại từ dòng đó thay
   vì cộng dồn từ dòng 1). Đặt `voi_luy_ke` như một CTE bọc TRỌN `tat_ca` (dòng 32-65 hiện tại của 0031),
   rồi mới `limit`/`offset` ở lớp ngoài cùng, đúng thứ tự UNION → CTE lũy kế → sắp lại → phân trang.
4. **Lọc theo kho (`p_kho_id`) làm thay đổi Ý NGHĨA của lũy kế**: lũy kế của "một kho" khác lũy kế của
   "tất cả kho" (khác cả tổng lẫn thứ tự dòng khớp). Tính cửa sổ SAU khi đã áp `where (p_kho_id is null or
   m.kho_id = p_kho_id)` (như `0031` đã lọc ở dòng 52) để lũy kế luôn khớp đúng phạm vi đang xem — không
   tính lũy kế toàn công ty rồi lọc hiển thị sau, sẽ ra số sai.

**Giữ nguyên 14 cột cũ đúng thứ tự** (yêu cầu của WORK-UNITS.md) — copy nguyên văn `RETURNS TABLE(...)`
của `0031` dòng 11, chỉ thêm `ton_luy_ke numeric` vào cuối danh sách, và cấp lại quyền y hệt dòng 75-76.

---

#### WU-3 `0060_de_xuat_dinh_muc.sql` — `de_xuat_dinh_muc` + `dat_dinh_muc`

**Analog mạnh nhất toàn bộ Phase 5 — cặp "gợi ý đọc + áp dụng ghi" đã có sẵn khuôn hoàn chỉnh:**
`0035_ra_hang_loat.sql` (đọc trích ở trên trong quá trình phân tích) —

```sql
-- Hàm ĐỀ XUẤT: SQL thuần, STABLE, không kiểm quyền (chỉ đọc)
CREATE OR REPLACE FUNCTION public.goi_y_cong_doan_theo_duoi()
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, ten_nhom_hang text,
               cong_doan_de_xuat_id uuid, ma_cong_doan_de_xuat text, ten_cong_doan_de_xuat text)
 LANGUAGE sql STABLE SET search_path TO ''
AS $function$
  select sp.id, sp.ma_hang, sp.ten_hang, nh.ten, cd2.id, cd2.ma, cd2.ten
  from public.san_pham sp
  join public.cong_doan cd on cd.id = sp.cong_doan_id and cd.ma = 'MUA_NGOAI'
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  join public.cong_doan cd2 on cd2.ma = public.cong_doan_theo_duoi(sp.ma_hang)
  order by cd2.ma, sp.ma_hang;
$function$;

-- Hàm ÁP DỤNG: kiểm vai trò, giới hạn 1000 id/lần, ghi nguồn tường minh
CREATE OR REPLACE FUNCTION public.ap_dung_goi_y_cong_doan(p_ids uuid[])
 RETURNS integer LANGUAGE plpgsql SET search_path TO ''
AS $function$
declare v_so int;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng sửa được danh mục' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  perform set_config('app.nguon_sua', 'goi_y_duoi', true);
  update public.san_pham sp set cong_doan_id = cd2.id
  from public.cong_doan cd, public.cong_doan cd2
  where sp.id = any(p_ids) and cd.id = sp.cong_doan_id and cd.ma = 'MUA_NGOAI'
    and cd2.ma = public.cong_doan_theo_duoi(sp.ma_hang);
  get diagnostics v_so = row_count;
  return v_so;
end $function$;
```

Áp đúng khuôn này cho `de_xuat_dinh_muc()`/`dat_dinh_muc(p_ids uuid[])`, với hai khác biệt bắt buộc theo
D-04:

1. **`de_xuat_dinh_muc()` phải trả kèm CĂN CỨ** (số ngày dữ liệu, số lần bán, suy theo mã hay theo nhóm) —
   không chỉ trả con số đề xuất như `goi_y_cong_doan_theo_duoi` trả thẳng id công đoạn. WU-9 (màn duyệt)
   cần các cột này để hiện độ tin cậy; thêm vào `RETURNS TABLE`:
   ```sql
   RETURNS TABLE (
     id uuid, ma_hang text, ten_hang text, ten_nhom_hang text,
     dinh_muc_hien_tai numeric, dinh_muc_de_xuat numeric,
     nguon_de_xuat text,        -- 'theo_ma' | 'trung_binh_nhom' (giữ tiếng Việt — hợp đồng UI)
     so_ngay_du_lieu integer, so_lan_ban integer
   )
   ```
2. **Nguồn dữ liệu là bảng lưu trữ TEXT ngày, không phải bảng nghiệp vụ** — `luu_tru_hoa_don_kiotviet`
   (`0010_luu_tru_kiotviet.sql` dòng 30-43) có cột `ngay text` ("giữ nguyên dạng chuỗi của nguồn, không ép
   kiểu" — comment dòng 15 áp dụng chung cho cả hai bảng lưu trữ) và KHÔNG có cột nhóm hàng. Phải:
   - cast tường minh `l.ngay::date` / `l.ngay::timestamptz`, đúng cách `the_kho_san_pham` đã làm ở
     `0031` dòng 54, 60 (`l.ngay::timestamptz`) — không tự ép kiểu ngầm định;
   - `join public.san_pham sp on sp.ma_hang = l.ma_hang` để lấy `nhom_hang_id` cho nhánh "trung bình
     nhóm" (2.043 mã không có lịch sử riêng, theo D-04).
3. **`dat_dinh_muc(jsonb)` ghi `san_pham.ton_toi_thieu`**, không phải `cong_doan_id` — nhớ bẫy 5 của
   CLAUDE.md: cột này ĐÃ được `grant select`/`grant update` tường minh ở `0029` dòng 39-43 (`ton_toi_thieu`
   nằm trong danh sách cột được cấp), nên UPDATE trực tiếp từ RPC không bị 42501 — nhưng vẫn phải liệt kê
   cột tường minh, không dùng `update ... returning *`.

**Test:** khuôn `supabase/tests/62_ra_hang_loat_test.sql` (helper giống hệt `00_helper.sql.inc`, dữ liệu
dựng bằng `pg_temp.sp_test()`), thêm dữ liệu giả vào `luu_tru_hoa_don_kiotviet` với `ma_hang` trùng mã
test, ngày nằm trong khung ISO string y hệt cách `42_the_kho_test.sql` dòng 64 đã chèn
(`'2026-09-11T09:00:00+07:00'`).

---

#### WU-4 `0061_nap_ton_tam.sql` — `nap_ton_tam(jsonb, boolean)`

**Không có analog dựng sẵn cả hai nửa việc cần làm — phải ghép hai khuôn đã có, KHÔNG viết theo
`_ghi_so_dieu_chinh` một mình** như 05-WORK-UNITS.md gợi ý (dòng 34, 43): `_ghi_so_dieu_chinh` chỉ ghi MỘT
`kho_movement` cho MỘT dòng chứng từ đã tồn tại — nó không tự tạo chứng từ, không có khái niệm "xem trước",
và bị `revoke all ... from authenticated` (`0011` dòng 270) nên client không gọi trực tiếp được, chỉ
`ghi_so_chung_tu` mới gọi nó. `nap_ton_tam` cần dựng MỘT chứng từ DIEU_CHINH với N dòng rồi TỰ gọi
`ghi_so_chung_tu` — đây là việc của khuôn "dựng chứng từ atomic", không phải khuôn "ghi một dòng sổ".

**Nửa 1 — khuôn "xem trước / bỏ qua mã đã có dữ liệu thật / jsonb vào-ra":**
`0044_gia_von_dau_ky.sql` (`dat_gia_von_dau_ky`, trích đầy đủ ở trên). Ba điểm áp dụng cho `nap_ton_tam`:

- Tham số `p_chi_kiem_tra boolean default true` giữ nguyên tên và mặc định — khớp quy ước đã có (đọc
  route handler `gia-von-dau-ky/route.ts` dòng 75: `che_do === "nap" ? "nap" : "kiem_tra"` map thẳng
  sang `p_chi_kiem_tra: cheDo !== "nap"`).
- **Điều kiện "bỏ qua"** của D-05 khác `dat_gia_von_dau_ky` (`gia_von <> 0` → bỏ qua): với tồn tạm, điều
  kiện bỏ qua đúng là **mã đã có `kho_movement` thật** (đã qua UAT/Phase 3/4, tức không còn ở tồn 0 gốc),
  KHÔNG phải `ton_kho.so_luong <> 0` — vì D-05 muốn nạp CHỒNG lên tồn hiện có 0, và một mã có tồn = 0 vì
  "đã xuất hết thật" khác hẳn một mã tồn = 0 vì "chưa từng có chứng từ nào". Kiểm bằng
  `not exists (select 1 from public.kho_movement km where km.san_pham_id = v_sp.id)`.
- Trả về đúng hình dạng ba nhóm `dat`/`bo_qua`/`loi` (đổi tên nếu muốn nhưng GIỮ CẤU TRÚC ba nhóm — UI
  `cost-import.tsx` đã có sẵn ba `<Statistic>` cho đúng hình này, xem Wave 3).

**Nửa 2 — khuôn "dựng một chứng từ atomic rồi tự ghi sổ":** `0056_tao_phieu_xuat_tu_don.sql` toàn bộ
(trích đầy đủ ở trên) — chặn sớm trước khi tạo gì (không để lại chứng từ mồ côi), `insert` header rồi
`insert` N dòng bằng một câu `insert ... select`, KHÔNG bọc `exception when others`. Khung cho
`nap_ton_tam`:

```sql
create or replace function public.nap_ton_tam(p_du_lieu jsonb, p_chi_kiem_tra boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_kho_id uuid;   -- kho áp dụng số tạm — quyết định ở bước plan: một kho mặc định hay theo dòng?
  v_ct public.chung_tu;
  v_dat jsonb := '[]'::jsonb; v_bo_qua jsonb := '[]'::jsonb; v_loi jsonb := '[]'::jsonb;
  v_dong jsonb; v_ma text; v_so_luong numeric; v_sp public.san_pham;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng nạp được tồn tạm' using errcode = '42501';
  end if;

  -- Vòng 1: PHÂN LOẠI, không ghi gì — giống dat_gia_von_dau_ky vòng lặp v_dong.
  for v_dong in select * from jsonb_array_elements(coalesce(p_du_lieu, '[]'::jsonb)) loop
    v_ma := nullif(trim(coalesce(v_dong->>'ma_hang', '')), '');
    v_so_luong := nullif(v_dong->>'so_luong', '')::numeric;
    select * into v_sp from public.san_pham where ma_hang = v_ma;
    if v_sp.id is null then v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Không có mã này'); continue; end if;
    if exists (select 1 from public.kho_movement km where km.san_pham_id = v_sp.id) then
      v_bo_qua := v_bo_qua || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã đã có chứng từ thật, không nạp đè'); continue;
    end if;
    v_dat := v_dat || jsonb_build_object('san_pham_id', v_sp.id, 'ma_hang', v_ma, 'so_luong', v_so_luong);
  end loop;

  if p_chi_kiem_tra then
    return jsonb_build_object('da_nap', false, 'dat', jsonb_array_length(v_dat),
      'bo_qua', jsonb_array_length(v_bo_qua), 'so_loi', jsonb_array_length(v_loi),
      'chi_tiet_dat', v_dat, 'chi_tiet_bo_qua', v_bo_qua, 'loi', v_loi);
  end if;

  -- Vòng 2: DỰNG CHỨNG TỪ THẬT — chỉ chạy khi p_chi_kiem_tra = false, đúng khuôn tao_phieu_xuat_tu_don.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, ghi_chu)
  values (public.sinh_so_ct('DIEU_CHINH'::public.loai_ct), 'DIEU_CHINH', v_kho_id,
          'Số tạm nạp từ KiotViet, CHƯA đếm thực tế — kiểm kê Phase 6 sẽ đè lên số này (D-05).')
  returning * into v_ct;

  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
  select v_ct.id, (d->>'san_pham_id')::uuid, (d->>'so_luong')::numeric, 0, 0
  from jsonb_array_elements(v_dat) d;

  perform public.ghi_so_chung_tu(v_ct.id);   -- TỰ ghi sổ trong cùng transaction — không trả về NHAP_LIEU.

  return jsonb_build_object('da_nap', true, 'dat', jsonb_array_length(v_dat),
    'bo_qua', jsonb_array_length(v_bo_qua), 'so_loi', jsonb_array_length(v_loi),
    'chung_tu_id', v_ct.id, 'so_ct', v_ct.so_ct);
end; $$;
```
(Khung minh họa — quyết định thật về `v_kho_id` khi 2 kho tồn tại phải chốt ở bước plan: nạp vào MỘT kho
cố định, hay đọc `p_du_lieu` có `kho_id`/`kho_ma` theo dòng? File danh mục KiotViet không phân theo kho
theo README — cần xác nhận nguồn dữ liệu trước khi viết migration thật.)

**Ghi chú chứng từ PHẢI nói rõ "số tạm, chưa đếm thực tế"** — đúng yêu cầu D-05, và câu chữ nên đủ để
Phase 6 grep ra được (constraint "Claude's Discretion" của 05-CONTEXT.md: *"Cách đánh dấu chứng từ nạp tạm
sao cho truy ngược được và Phase 6 nhận ra nó"*) — gợi ý: chuỗi cố định `'[NAP_TON_TAM]'` ở đầu `ghi_chu`
để Phase 6 lọc bằng `ghi_chu like '[NAP_TON_TAM]%'` thay vì so khớp câu tiếng Việt dài dễ gõ sai.

---

### Wave 2 — Lớp dữ liệu client

#### WU-5 + WU-6 `features/inventory`

**Analog type + mapper:** `src/features/products/types.ts` dòng 52-67 (`StockCardRow`) và dòng 209-226
(`toStockCardRow`) — khuôn mapper Việt→Anh chuẩn của dự án:
```ts
type StockCardRowDb = Fn["the_kho_san_pham"]["Returns"][number];
export type StockCardRow = { documentId: string; docNo: string; ...; totalRows: number };
export function toStockCardRow(row: StockCardRowDb): StockCardRow {
  return { documentId: row.chung_tu_id, docNo: row.so_ct, ... totalRows: Number(row.tong_so_dong) };
}
```
Áp cho `InventoryRow` (dựa trên `Fn["danh_sach_ton_kho"]["Returns"][number]`), nhớ `Number(...)` mọi cột
`numeric` — Postgres trả `numeric` qua PostgREST dưới dạng CHUỖI, không phải number, và mọi mapper hiện có
(`toStockCardRow`, `toProductRow`) đều bọc `Number()` quanh các cột này.

**Analog schema + URL filter:** `src/features/products/schemas/filter.schema.ts` toàn bộ — đặc biệt
`readFilterFromUrl`/`writeFilterToUrl` (dòng 96-158, tham số URL tiếng Việt không dấu: `nhom`, `cong_doan`,
`dvt`, `ton`, `trang`, `kich_thuoc`) và `toListRpcArgs` (dòng 162-184, map filter → tham số `p_*`).
`STOCK_STATUSES`/`STOCK_STATUS_OPTIONS` (dòng 9-15 của filter.schema.ts, dòng 21-26 của
product-filter-panel.tsx) ĐÃ CÓ SẴN `duoi_dinh_muc` — xem Đính chính #2, không cần định nghĩa lại giá trị
này cho màn tồn kho nếu tái dùng đúng RPC.

**Analog api + hook:** `product.api.ts` dòng 30-44 (`fetchProducts`) + `useProducts.ts` dòng 27-34
(`useProducts`, `keepPreviousData` để đổi trang không nháy trắng). Với `InventoryRow` không có khái niệm
"một bản ghi theo id" như `useProductDetail`, nên KHÔNG cần lặp lại bẫy 10 (`enabled: id !== ""`) cho danh
sách tồn kho — bẫy đó chỉ áp dụng cho hook đọc MỘT sản phẩm (thẻ kho, chi tiết), vẫn phải áp dụng nếu WU-6
thêm hook nào đọc theo `productId`.

---

### Wave 3 — Giao diện

#### WU-7 — màn tồn kho `/ton-kho`

Copy nguyên khuôn ba file: `product-table.tsx` (điều phối `ListLayout` + `QueryState` + đọc/ghi URL, dòng
41-216) → `stock-table.tsx`; `product-filter-panel.tsx` (nhóm hàng/công đoạn/tồn, dòng 43-144) →
`stock-filter-panel.tsx` (bớt "Đơn vị tính"/"Kinh doanh" nếu không cần, thêm "Kho" theo D-01 nếu muốn lọc
xem riêng một kho dù bảng đã hiện cả hai cột); `danh-muc/page.tsx` (dòng 1-33, `PageHeader` + `Suspense`
vì bảng dùng `useSearchParams()`) → `ton-kho/page.tsx`.

**Cột khác biệt theo D-01/D-02:** thay một cột `tongTon` bằng ba cột `stockK1`/`stockK2`/`stockTotal`
(không dùng cấu trúc nested — mỗi kho một `dataIndex` phẳng để dễ style số âm); **KHÔNG có cột giá trị
tồn** (D-02) — không import `formatNumber` cho phép nhân với giá vốn ở màn này dù `formatNumber` (từ
`product-columns.tsx`) vẫn dùng được cho định dạng số lượng thuần.

---

#### WU-8 — **KHÔNG viết file mới, mở rộng `features/products`** (xem Đính chính #1)

`stock-card.tsx` (đọc toàn bộ ở trên) đã là bảng thẻ kho hoàn chỉnh: bộ lọc kho, cột Nhập/Xuất màu, cột
"Giá vốn lúc đó" ẩn theo `canViewCost`, cột "Bút toán đảo", phân trang server. Việc DUY NHẤT của WU-8:

1. Thêm `runningBalance: number` vào `StockCardRow` (`types.ts` dòng 52-67) và map trong `toStockCardRow`
   (dòng 209-226): `runningBalance: Number(row.ton_luy_ke)`.
2. Thêm một cột trong mảng `columns` của `stock-card.tsx` (chèn trước cột "Bút toán đảo", dòng 90):
   ```tsx
   {
     title: "Tồn lũy kế",
     dataIndex: "runningBalance",
     width: 110,
     align: "right",
     render: formatNumber,
   },
   ```
3. **Link mở đúng chứng từ sinh ra dòng đó (TON-02)** — `StockCardRow.documentId` (map từ `chung_tu_id`,
   dòng 211) đã có sẵn; chỉ cần bọc cột "Số phiếu" (dòng 51: `{ title: "Số phiếu", dataIndex: "docNo",
   width: 140 }`) bằng `<Link href={`/nhap-kho/${row.documentId}`}>` (hoặc `/xuat-kho`, `/tra-hang` theo
   `row.docType` — map `docType` sang route đúng như Phase 4's `RECEIPT_SOURCE_LABELS`-style bảng tra cứu,
   KHÔNG có sẵn hàm này, tự viết bảng nhỏ `DOC_TYPE_TO_ROUTE: Record<string, string>`). Dòng KiotViet cũ
   (`documentId` là `null` vì `chung_tu_id` null ở `0031` dòng 54, 60) không có link — kiểm `row.documentId`
   trước khi bọc `<Link>`.
4. **KHÔNG động vào** `app/(app)/danh-muc/[id]/page.tsx` — file này chỉ gọi `requirePermission` rồi render
   `<ProductDetailView>` (đọc ở trên, dòng 1-30), không tham chiếu `StockCard` trực tiếp. Nơi thật sự lắp
   `<StockCard>` là `product-detail.tsx` dòng 202-214 (bên trong `<Tabs>`, key `"stock-card"`) — file đó
   KHÔNG cần sửa gì cả vì props (`productId`, `canViewCost`) không đổi.

---

#### WU-9 — màn duyệt đề xuất định mức `/ton-kho/dinh-muc`

**Analog cấu trúc mạnh nhất bản đồ này:** `stage-suggestions.tsx` (đọc toàn bộ ở trên). Khuôn cần giữ
nguyên: nhóm theo một tiêu chí bằng `Collapse` (ở đây nhóm theo `nguon_de_xuat` thay vì `suggestedStageName`,
dòng 45-53), `Set<string>` các dòng BỊ BỎ CHỌN thay vì đang chọn (dòng 43, để mặc định chọn hết trừ dòng
đáng ngờ), `rowSelection` với `preserveSelectedRowKeys: true` (dòng 153-159, giữ lựa chọn khi cuộn qua
nhóm khác), nút hành động ghi rõ số lượng: `okText={`Áp dụng cho ${selectedIds.length} mã đã chọn`}`
(dòng 123).

**Khác biệt bắt buộc theo yêu cầu "phải hiện rõ căn cứ" (⚠️ cảnh báo WU-9 trong WORK-UNITS.md):**
`stage-suggestions.tsx` không có khái niệm "độ tin cậy" trên từng dòng — `needsManualCheck()` (dòng 27-35)
chỉ đánh dấu bằng từ khóa tên hàng, MỘT quy tắc tĩnh áp cho mọi dòng. Màn định mức cần một CỘT hiện
`soNgayDuLieu`/`soLanBan`/`nguonDeXuat` (theo RPC ở WU-3), và tô màu/badge khác nhau cho `theo_ma` (đáng
tin hơn) so với `trung_binh_nhom` (theo D-04, phải "hiện rõ căn cứ… để người duyệt biết con số nào đáng
tin"). Không có analog UI cho việc HIỆN độ tin cậy dạng số — tự viết cột mới, không cố nhét vào khuôn
`Tag`/`Tooltip` sẵn có của `needsManualCheck`.

**Vì sao là trang riêng (`/ton-kho/dinh-muc`), không phải Modal như `stage-suggestions.tsx`:**
`StageSuggestions` mở trong `Modal` từ nút trên `/danh-muc` (qua `ProductModals`, không đọc ở đây) vì đó
là việc phụ trong một luồng CRUD khác. WU-9 là một MÀN riêng theo đúng file list của WORK-UNITS.md
(`app/(app)/ton-kho/dinh-muc/page.tsx`) — dùng khung trang của `danh-muc/page.tsx` (`PageHeader` +
`Suspense`) làm vỏ, rồi nhúng bảng kiểu `stage-suggestions.tsx` TRỰC TIẾP vào thân trang (không bọc
`Modal`), bỏ `open`/`onClose` props.

---

#### WU-10 — màn dưới định mức + nạp tồn tạm

**Phát hiện quan trọng nhất của WU này (xem Đính chính #2): `duoi-dinh-muc/page.tsx` có thể KHÔNG cần
component mới.** `danh_sach_san_pham` (`0030` dòng 101-105) đã có sẵn:
```sql
and (p_trang_thai_ton is null
     or (p_trang_thai_ton = 'con_hang'     and l.tong > 0)
     or (p_trang_thai_ton = 'het_hang'     and l.tong = 0)
     or (p_trang_thai_ton = 'am'           and l.tong < 0)
     or (p_trang_thai_ton = 'duoi_dinh_muc' and l.tong < l.ton_toi_thieu))
```
và `product-filter-panel.tsx` dòng 21-26 đã có option `{ value: "duoi_dinh_muc", label: "Dưới định mức" }`
sẵn trong `Select` "Tồn". Nghĩa là NGƯỜI DÙNG BẤM ĐƯỢC bộ lọc này ngay hôm nay tại `/danh-muc`, chỉ là
kết quả rỗng vì `ton_toi_thieu` đang là 0 cho toàn bộ 3.266 mã (đúng số đo trong 05-CONTEXT.md) — WU-3 chạy
xong (định mức được duyệt) là bộ lọc có dữ liệu ngay, KHÔNG CẦN sửa gì ở tầng RPC/API. Cách làm rẻ nhất
cho `/ton-kho/duoi-dinh-muc`: route Server Component chỉ redirect hoặc render `<ProductTable>` (từ
`products` feature) với `filter` khởi tạo `{ ...DEFAULT_PRODUCT_FILTER, stockStatus: "duoi_dinh_muc" }` —
so với viết `stock-table.tsx` (WU-7) một biến thể riêng. Cân nhắc ở bước plan: dùng lại `ProductTable`
thẳng (import từ `features/products`, không phải `features/inventory`), hay chỉ đặt link
`/danh-muc?ton=duoi_dinh_muc` ngay trong `NAV_ITEMS`/dashboard mà bỏ hẳn route `/ton-kho/duoi-dinh-muc`.
WORK-UNITS.md giả định cần file mới `provisional-stock-preview.tsx` GHÉP CHUNG route này với việc "xem
trước nạp tồn tạm" — nhưng đó là hai việc khác nhau (một cái là DANH SÁCH lọc, một cái là UPLOAD FILE), nên
tách hai khối dưới đây.

**Analog route handler upload:** `src/app/api/danh-muc/gia-von-dau-ky/route.ts` toàn bộ (đọc ở trên) —
copy khuôn `requireManager()`-style guard (đổi thành quản lý+văn phòng theo D-04's "hệ đề xuất — người
duyệt" áp dụng tương tự cho D-05?, xác nhận lại vai trò được phép ở bước plan), đọc `formData()`, validate
đuôi `.xlsx`/kích thước, `readFirstSheet` từ `@/shared/lib/excel-cell` (KHÔNG phải `o-excel.ts` — xem
Đính chính #3), gọi RPC `nap_ton_tam` với `p_chi_kiem_tra: cheDo !== "nap"`.

**Cột "tồn" của KiotViet CHƯA được `read-catalog-file.server.ts` đọc** (Phase 2 cố ý bỏ qua, theo
05-CONTEXT.md "specifics"). `parseKiotVietRow` (`read-catalog-file.server.ts` dòng 73-99) không có
`readNumber(o["ton_hien_tai"])` hay tương đương. WU-10 phải tự thêm việc đọc cột này — HOẶC thêm một field
vào `parseKiotVietRow`/`ImportRowPayload` nếu muốn tái dùng `readCatalogFile`, HOẶC viết một hàm đọc RIÊNG
trong `features/inventory/lib/` chỉ lấy hai cột (`ma_hang`, cột tồn — tên cột thật cần xem trong file
KiotViet khi có, README nói cột tồn nằm trong file `DanhSachSanPham_KV…`) bằng `readFirstSheet` +
`readString`/`readNumber` trực tiếp từ `@/shared/lib/excel-cell`, đúng khuôn route `gia-von-dau-ky` (chỉ
đọc 2 cột `ma_hang`/`gia_von`, dòng 89-100) — KHÔNG cần cả bộ máy `nhan_dang`/`parseTemplateRow` của
`read-catalog-file.server.ts` vì tồn tạm không phải là nghiệp vụ "nhập danh mục".

**Analog UI xem trước 3 bước:** `cost-import.tsx` toàn bộ (đọc ở trên) — `useReducer` với `step: 0|1|2`,
`Upload.Dragger` tự submit `"kiem_tra"` ngay khi chọn file (dòng 122-124), `Statistic` ba số
(`applied`/`skipped`/`errorCount`, dòng 220-232), hai `<Table>` con cho "Bỏ qua" và "Lỗi" (dòng 234-274),
nút "Đóng" ở bước 2. Đổi tên miền: `applied→sẽ nạp`, `skipped→đã có chứng từ thật`, giữ cấu trúc
`result.skippedRows`/`result.errors` y hệt (`CostImportResult`, xem `src/features/products/lib/
cost-template.ts` nếu cần đọc thêm shape `toCostImportResult`).

**Bẫy 7 áp dụng nguyên vẹn:** giữ CẢ HAI đường đọc (`readViaStream`/`readViaWorkbook`) trong
`readFirstSheet` — không viết reader riêng cho file tồn tạm, luôn đi qua `readFirstSheet` đã có.

---

### Wave 4 — Tích hợp

#### WU-11

**`src/shared/lib/navigation.ts`:** thêm phần tử theo khuôn dòng 20-63 (đã trích ở trên) — `icon` cần một
giá trị `NavIconId` mới (hiện chỉ có `"dashboard" | "stock-in" | "catalog" | "partners" | "settings"`,
dòng 6), phải thêm case tương ứng ở `nav-icons.tsx` (chưa đọc — file client theo comment dòng 1-3 của
`navigation.ts`, đọc trước khi thêm icon mới). `permission: "view-catalog"` cho `/ton-kho` (mọi vai trò
xem, giống `/danh-muc`); `/ton-kho/dinh-muc` cân nhắc permission RIÊNG hay tái dùng `"edit-catalog"` (đã
đúng = `["quan_ly","van_phong"]`, khớp D-04) — khuyến nghị TÁI DÙNG `"edit-catalog"`, không cần thêm giá
trị `Permission` mới trong `permissions.ts` (đọc ở trên, dòng 8-27).

**`scripts/test-route-permissions.ts`:** thêm dòng vào `MA_TRAN` (dòng 36-52) theo mẫu `AI_CUNG_XEM`
(dòng 27-34) cho `/ton-kho` và `/ton-kho/duoi-dinh-muc`; dòng RIÊNG với `edit-catalog`-style kỳ vọng
(`thukho1: "quyen", chixem: "quyen"`, xem mẫu `/doi-tac/ra-ghi-chu` dòng 44 hoặc `/cai-dat/nhom-hang`
dòng 46) cho `/ton-kho/dinh-muc`.

⚠️ **Mảng `MA_TRAN` hiện tại (đọc trực tiếp file, dòng 36-52) CHƯA có bất kỳ dòng nào cho route Phase 4**
(`/dat-hang`, `/xuat-kho`, `/tra-hang`) — xác nhận đúng cảnh báo "chặn #1" của 05-CONTEXT.md rằng giao diện
Phase 4 chưa xong. WU-11 chỉ cần thêm dòng của CHÍNH Phase 5, không phải việc của WU-11 để bổ khuyết phần
thiếu của Phase 4 — nhưng đừng ngạc nhiên nếu bộ kiểm toàn cục (`npm run check` + script này) vẫn báo thiếu
route Phase 4 khi chạy "toàn bộ bộ kiểm" ở cuối 05-WORK-UNITS.md.

---

## Shared Patterns

### Bốn trạng thái bắt buộc — `QueryState`
**Nguồn:** `src/shared/components/query-state.tsx` (81 dòng, đọc toàn bộ ở trên).
**Áp dụng cho:** `stock-table.tsx`, `reorder-level-table.tsx`, `stock-card.tsx` (đã dùng), mọi bảng mới.

### Bố cục danh sách — `ListLayout`
**Nguồn:** `src/shared/components/list-layout.tsx` (đọc toàn bộ ở trên). Panel lọc trái cố định ≥992px,
sập vào `Drawer` dưới 992px. Dùng cho `stock-table.tsx` giống hệt `product-table.tsx` dòng 108-193.

### Lỗi — `explainError` / `isPostgrestError` / `errorCode`
**Nguồn:** `src/shared/lib/errors.ts` (đọc toàn bộ ở trên, tên hàm ĐÚNG — CLAUDE.md bẫy 8 còn ghi tên cũ
`laLoiPostgrest`/`maLoi`, đừng dùng tên đó). Dùng `errorCode(error) === "42501"` cho lỗi quyền duyệt định
mức, `isPostgrestError(error) && error.code === "23514"` để hiện nguyên văn message RPC (ví dụ lỗi từ
`nap_ton_tam` khi mã đã có chứng từ thật).

### Mapper — ranh giới DUY NHẤT chạm tên cột tiếng Việt
**Nguồn:** `types.ts` của từng feature (`toStockCardRow`, `toProductRow`, và `InventoryRow` mới ở
`features/inventory/types.ts`). Component và hook KHÔNG BAO GIỜ thấy `ton_toi_thieu`, `so_luong_nhap`,
`gia_von_tai_thoi_diem` — chỉ thấy `minStock`, `quantityIn`, `costPriceAtTime`.

### Khuôn pgTAP
**Nguồn:** `supabase/tests/00_helper.sql.inc` (58 dòng, đọc toàn bộ ở trên).
```sql
begin;
select plan(n);
-- chép nguyên khối 00_helper.sql.inc (dang_nhap_nhu / dang_xuat / sp_test / kho_id)
create temp table t_xxx as select pg_temp.sp_test('MA-TEST') as sp, pg_temp.kho_id('K1') as k1;
grant select on t_xxx to authenticated;   -- BẮT BUỘC, xem comment 10_ton_kho_test.sql dòng 57-60
-- dựng dữ liệu, gọi hàm cần test
select is(actual, expected, 'mô tả assert bằng tiếng Việt');
select * from finish();
rollback;
```
Số test đã dùng: 10, 20, 21, 22, 23, 30, 40, 41, 42, 50, 51, 60, 61, 62, 63, 70, 80, 90, 91. Phase 5 dùng
32-35 (còn trống, không đụng 30/40) — theo đúng đề xuất của 05-WORK-UNITS.md.

### Excel phía server — `readFirstSheet` (KHÔNG phải `o-excel.ts`)
**Nguồn thật:** `src/shared/lib/excel-cell.ts` (đọc toàn bộ ở trên). Xem Đính chính #3 — tên file trong
CLAUDE.md/05-CONTEXT.md sai. Giữ CẢ HAI đường đọc (`readViaStream` chính, `readViaWorkbook` dự phòng) —
`readFirstSheet` (dòng 219-230) đã tự thử stream trước rồi workbook, không cần gọi tay từng hàm.

### RPC đọc — khuôn `stable security definer` tự áp phạm vi kho
**Nguồn:** `danh_sach_san_pham` (0030), `the_kho_san_pham` (0031), `danh_sach_don` (0054). Preamble bốn
dòng luôn giống nhau (`v_vai_tro`, `v_kho`, kẹp `p_kich_thuoc`/`p_trang`, chặn `v_vai_tro is null`), CTE
lọc rồi CTE/khối đếm `count(*) over ()` kèm mỗi dòng.

### RPC "gợi ý rồi duyệt hàng loạt"
**Nguồn:** `goi_y_cong_doan_theo_duoi` + `ap_dung_goi_y_cong_doan` (0035) và cặp UI
`stage-suggestions.tsx` + `useStageSuggestions`/`useApplyStageSuggestions` (`useProducts.ts` dòng 74-80,
124-131). Khuôn CHUẨN cho mọi tính năng "hệ đề xuất — người duyệt" (D-04 dùng đúng khuôn này).

---

## No Analog Found (một phần)

| File/việc | Vai trò | Lý do không có analog đầy đủ |
|---|---|---|
| Kỹ thuật PIVOT kho→cột trong `danh_sach_ton_kho` | migration | Chưa RPC nào từng biến giá trị hàng (`kho_id`) thành cột động; gần nhất là `filter (where ...)` thủ công theo từng kho biết trước (2 kho cố định nên khả thi, xem WU-1) |
| Cửa sổ (window function) tính tồn lũy kế trong `the_kho_san_pham` | migration | Grep toàn bộ migration chỉ thấy `count(*) over ()`; chưa hàm nào dùng `sum(...) over (order by ...)` — bốn điểm rủi ro (thứ tự, gộp nguồn KiotViet, tính trước phân trang, theo phạm vi kho) không có tiền lệ để soi |
| RPC vừa "xem trước" vừa "dựng chứng từ atomic" trong một hàm (`nap_ton_tam`) | migration | `dat_gia_von_dau_ky` có preview nhưng ghi thẳng cột, không tạo chứng từ; `tao_phieu_xuat_tu_don` tạo chứng từ atomic nhưng không có chế độ xem trước — WU-4 phải ghép hai khuôn, chưa ai ghép trước |
| Cột "độ tin cậy đề xuất" (số ngày/số lần bán) trên bảng duyệt | component | `stage-suggestions.tsx` chỉ có cờ nhị phân (`needsManualCheck`), không có thang đo liên tục nào từng hiển thị trên bảng duyệt |

---

## Đính chính

Đây là những chỗ 05-CONTEXT.md, 05-WORK-UNITS.md, hoặc chính CLAUDE.md mô tả khác với thực tế trong
codebase. Dùng tên/đường dẫn/kết luận trong PATTERNS.md này khi lập kế hoạch, không copy nguyên văn từ các
file đó.

1. **WU-8 không cần file mới — đây là sửa sai LỚN NHẤT.** 05-WORK-UNITS.md liệt kê WU-8 tạo
   `features/inventory/components/stock-card-table.tsx` và sửa `app/(app)/danh-muc/[id]/page.tsx`. Thực
   tế: thẻ kho (TON-02) ĐÃ tồn tại đầy đủ, chạy được, tại `src/features/products/components/stock-card.tsx`
   + `hooks/useProducts.ts` (`useStockCard`) + `api/product.api.ts` (`fetchStockCard`) + `types.ts`
   (`StockCardRow`/`toStockCardRow`), và đã gắn vào tab "Thẻ kho" trong
   `src/features/products/components/product-detail.tsx` (dòng 202-214) — không phải trong `page.tsx`.
   05-CONTEXT.md's "code_context" bảng "Đã có sẵn" CÓ nói đúng `the_kho_san_pham` dùng cho TON-02 (dòng
   138), nhưng KHÔNG nói rõ toàn bộ tầng UI cũng đã có sẵn, khiến WORK-UNITS.md suy ra cần viết lại từ đầu
   trong `features/inventory`. Làm theo WORK-UNITS.md nguyên văn sẽ tạo một component trùng lặp không bao
   giờ được render (vì `page.tsx` không gọi tới nó) và để lại `stock-card.tsx` cũ chạy song song không có
   cột lũy kế. WU-8 đúng là: sửa 3 file trong `features/products/`, không tạo file nào, không đụng
   `page.tsx`.

2. **`danh_sach_san_pham` đã có sẵn bộ lọc `duoi_dinh_muc` — WU-10 có thể không cần code mới cho phần
   "màn dưới định mức".** `0030_danh_sach_san_pham.sql` dòng 105 và
   `src/features/products/schemas/filter.schema.ts` dòng 9-14 + `product-filter-panel.tsx` dòng 21-26 đã
   nối trọn vẹn: người dùng có quyền `view-catalog` mở `/danh-muc?ton=duoi_dinh_muc` HÔM NAY là lọc được
   (chỉ đang rỗng vì `ton_toi_thieu` = 0 toàn bộ). 05-CONTEXT.md/05-WORK-UNITS.md không nhắc tới việc này,
   có thể vì không tra `product-filter-panel.tsx`. Quyết định thật (dùng thẳng `/danh-muc` đã lọc sẵn, hay
   dựng route riêng `/ton-kho/duoi-dinh-muc` vì lý do điều hướng/nhãn khác) cần chốt ở bước plan — đừng
   mặc định phải viết `stock-table.tsx` một bản sao riêng cho màn này.

3. **File Excel reader tên là `src/shared/lib/excel-cell.ts`, KHÔNG PHẢI `src/shared/lib/o-excel.ts`.**
   Cả CLAUDE.md (bẫy 7: *"`src/shared/lib/o-excel.ts` dùng `node:stream`"*) và 05-CONTEXT.md bảng
   "code_context" (dòng "Đọc Excel phía server | `src/shared/lib/o-excel.ts`") đều trỏ tới một file KHÔNG
   TỒN TẠI trong repo hiện tại. Thậm chí `src/features/products/lib/read-catalog-file.server.ts` — file
   TIÊU THỤ reader đó — vẫn còn một dòng comment (dòng 6-7) ghi *"Hàng rào thật là `node:stream` bên trong
   `o-excel.ts`"*, tức là chính codebase có một tham chiếu sót lại từ lần đổi tên file trước đây. Tên/API
   thật: `readFirstSheet`/`readString`/`readNumber`/`readExcelDate` xuất từ `@/shared/lib/excel-cell`. Bẫy
   7 (giữ cả hai đường đọc stream+thường) vẫn đúng về NỘI DUNG, chỉ sai đường dẫn.

4. **`_ghi_so_dieu_chinh` một mình không đủ cho D-05** — xem WU-4 ở trên. 05-WORK-UNITS.md dòng 34, 43 chỉ
   trỏ tới `0011_rpc_ghi_so.sql`, nhưng hàm đó không tạo chứng từ và không có chế độ xem trước. Analog
   đúng và mạnh hơn hẳn là ghép `0044_gia_von_dau_ky.sql` (preview + bỏ qua mã đã có dữ liệu thật) với
   `0056_tao_phieu_xuat_tu_don.sql` (dựng chứng từ atomic rồi tự gọi `ghi_so_chung_tu`).

5. **Analog cho WU-9 mạnh hơn nhiều so với gợi ý ngầm định của 05-CONTEXT.md/WORK-UNITS.md.** Không tài
   liệu nào trỏ tới `0035_ra_hang_loat.sql`/`stage-suggestions.tsx`, nhưng cặp
   `goi_y_cong_doan_theo_duoi`/`ap_dung_goi_y_cong_doan` + `StageSuggestions` component chính là khuôn
   "hệ đề xuất — người duyệt" mà D-04 mô tả, đã chạy production-ready trong Phase 2. Dùng khuôn này làm
   điểm khởi đầu thay vì tự nghĩ cấu trúc RPC/UI mới.

6. **`kho_hien_tai()` đã đổi chữ ký ở migration 0026, không còn là bản trong 0016.** `0016_rls_chung_tu.sql`
   dòng 16-23 định nghĩa policy `ton_kho` với `kho_id = (select public.kho_hien_tai())` (so bằng, ngụ ý
   scalar) — bản NÀY ĐÃ BỊ THAY bởi `0026_nguoi_dung_nhieu_kho.sql` dòng 88-112 (`drop function`, tạo lại
   trả `uuid[]`, `drop policy`/`create policy` lại với `= any(...)`). Không phải lỗi tài liệu nào, chỉ là
   lịch sử migration nối tiếp bình thường — nhưng nếu đọc riêng lẻ `0016` (không đọc tới `0026`) sẽ suy ra
   chữ ký SAI cho `kho_hien_tai()`. Luôn dùng bản `0026` (uuid[], cast `::uuid[]` bắt buộc trong mọi RPC
   mới) làm chuẩn.

7. **Tên file test đề xuất trong WORK-UNITS.md (`tests/32_ton_kho_test.sql`) trùng Ý NGHĨA nhưng KHÔNG
   trùng SỐ với file đã có `tests/10_ton_kho_test.sql`.** Không phải lỗi (số 10 và 32 không đụng nhau,
   không có collision file), nhưng dễ gây nhầm khi tìm bằng tên: `10_ton_kho_test.sql` kiểm cơ chế
   trigger/bình quân gia quyền của sổ cái (DATA-02/03/04, không liên quan RPC), còn file mới của WU-1 kiểm
   RPC đọc `danh_sach_ton_kho`. Khuyến nghị đặt tên `32_danh_sach_ton_kho_test.sql` để phân biệt khi grep.

8. **`scripts/test-route-permissions.ts`'s `MA_TRAN` hiện KHÔNG có dòng nào cho `/nhap-kho/[id]` dạng
   generic** — chỉ được thêm ĐỘNG lúc chạy (`layIdPhieuNhap()`, dòng 90-115) nếu tìm được phiếu thật, và
   HOÀN TOÀN CHƯA có dòng nào (kể cả động) cho `/dat-hang`, `/xuat-kho`, `/tra-hang` của Phase 4. Đây là
   bằng chứng thêm cho "chặn #1" của 05-CONTEXT.md (giao diện Phase 4 chưa xong) — không phải việc WU-11
   của Phase 5 phải sửa, nhưng "chạy toàn bộ bộ kiểm" ở cuối 05-WORK-UNITS.md sẽ không phủ được route
   Phase 4 cho tới khi phase đó có UI thật.

---

## Metadata

**Phạm vi tìm analog:** `src/features/products/` (đọc gần như toàn bộ — 12 file: `types.ts`, `api/
product.api.ts`, `api/product.keys.ts`, `api/excel-import.api.ts`, `hooks/useProducts.ts`, `schemas/
filter.schema.ts`, `components/stock-card.tsx`, `product-detail.tsx`, `product-table.tsx`,
`product-filter-panel.tsx`, `stage-suggestions.tsx`, `cost-import.tsx`, `excel-import.tsx`,
`import-preview.tsx`), `src/shared/` (`list-layout.tsx`, `query-state.tsx`, `errors.ts`, `permissions.ts`,
`navigation.ts`, `excel-cell.ts`), `src/features/products/lib/read-catalog-file.server.ts`,
`src/app/api/danh-muc/{nhap-excel,gia-von-dau-ky}/route.ts`, `scripts/test-route-permissions.ts`,
14 file migration (`0008, 0010, 0011, 0016, 0026, 0029, 0030, 0031, 0035, 0044, 0054, 0056`), 5 file pgTAP
(`00_helper.sql.inc`, `10_ton_kho_test.sql`, `42_the_kho_test.sql`, `62_ra_hang_loat_test.sql`,
`91_gia_von_dau_ky_test.sql`).
**File scan:** ~35 file đọc trực tiếp, đủ để phủ toàn bộ 11 WU với ít nhất một analog cấu trúc mỗi WU; ba
WU (8, 9, 10) có phát hiện làm đổi phạm vi file so với 05-WORK-UNITS.md — xem "Đính chính".
**Ngày lập:** 2026-09-20
