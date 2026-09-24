# Phase 6: Kiểm kê & Go-live — Bản đồ khuôn mẫu (PATTERNS)

**Lập:** 2026-09-24
**Nguồn:** `06-CONTEXT.md`, `06-RESEARCH.md` (đã có §Data Model/§Code Examples viết sẵn phần
lớn SQL — PATTERNS.md này KHÔNG lặp lại nguyên văn SQL đó, chỉ trỏ tới analog THẬT trong
codebase đã đọc trực tiếp, xác nhận dòng/số hiệu còn khớp tại 2026-09-24) + đọc trực tiếp
9 file migration, 10 file TypeScript/TSX.

**Phát hiện quan trọng nhất khi lập bản đồ này:** `0061_nap_ton_tam.sql` (D-06 của Phase 5)
đã dựng đúng khuôn "xem trước → dựng MỘT chứng từ atomic → tự gọi `ghi_so_chung_tu`" mà
06-RESEARCH.md mô tả (dưới cái tên `dat_gia_von_dau_ky` + `tao_phieu_xuat_tu_don` ghép lại)
— nhưng giờ đã có một BẢN THẬT ĐÃ CHẠY ghép sẵn hai khuôn đó, KHÔNG cần tự ghép lại từ hai
file gốc nữa. Đây là analog GẦN NHẤT cho `nap_ton_tam`... à không, cho các RPC MỚI của
Phase 6 (`luu_dong_kiem_ke`, `duyet_phien_kiem_ke`) — copy cấu trúc file `0061` (kiểm quyền
tường minh SECURITY DEFINER, vòng lặp phân loại không ghi, `p_chi_kiem_tra` cho xem trước,
ghi chú `[NHÃN]` để lọc bằng `like`) thay vì quay lại đọc riêng `0044`/`0056`.

Phát hiện thứ hai: **`ghi_chu like '[NAP_TON_TAM]%'`** đã là quy ước THẬT trong database —
`chua_dem_kiem_ke`/UI danh sách "chưa đếm" của Phase 6 có thể lọc đúng chuỗi này để biết
dòng nào đến từ tồn tạm KiotViet (D-06), không cần suy đoán.

Phát hiện thứ ba: **Phase 5 (WU-8) đã hoàn thành thẻ kho + cột tồn lũy kế + link chứng từ**
— `stock-card-columns.tsx` đã có `DOC_TYPE_TO_ROUTE`, cột `runningBalance`. File này ĐÃ ghi
sẵn comment "Chưa có route: CHUYEN_KHO, KIEM_KE, DIEU_CHINH — route đến cùng giao diện
Phase 4/6 của chúng; lúc đó thêm vào đây" — Phase 6 phải quay lại thêm `KIEM_KE: "/kiem-ke"`
vào bảng đó khi route `/kiem-ke/[id]` có thật, nếu không link "Số phiếu" của dòng kiểm kê
trên thẻ kho vẫn hiện chữ thường, không bấm được.

---

## File Classification

| File mới/sửa | Vai trò | Luồng dữ liệu | Analog gần nhất | Mức khớp |
|---|---|---|---|---|
| `supabase/migrations/00XX_kiem_ke_rpc.sql` — `luu_dong_kiem_ke` | migration (RPC ghi, upsert đọc-rồi-quyết) | event-driven, CRUD có kiểm soát | `0061_nap_ton_tam.sql` (`nap_ton_tam`, vòng lặp phân loại + `for update` khóa dòng cha) | role-match — không có analog ghi MỘT dòng lặp lại nhiều lần (upsert theo khóa hỗn hợp), nhưng khung quyền+transaction giống hệt |
| `supabase/migrations/00XX_kiem_ke_rpc.sql` — `chua_dem_kiem_ke` | migration (RPC đọc, LEFT JOIN phủ định) | request-response | `danh_sach_ton_kho` kiểu WU-1 Phase 5 (chưa build — dùng khuôn `danh_sach_san_pham`, `0030`, preamble vai trò+kho) | role-match |
| `supabase/migrations/00XX_kiem_ke_rpc.sql` — `duyet_phien_kiem_ke` | migration (RPC ghi, wrapper kiểm quyền rồi gọi RPC có sẵn) | event-driven | `nap_ton_tam` (0061, TASK 2 — dựng dòng "chấp nhận 0" rồi tự `perform ghi_so_chung_tu`) | exact — cùng hình: kiểm quyền tường minh → vòng lặp ghi dòng phụ → gọi hàm điều phối có sẵn |
| `supabase/migrations/00XX_kiem_ke_rpc.sql` — sửa `ghi_so_chung_tu` (0011) | migration (thêm 1 nhánh kiểm quyền) | — | Chính nó — dòng 205 `if (select vai_tro_hien_tai()) = 'chi_xem' then raise...` (0011) | exact — thêm đúng khuôn if-raise cùng dạng, cạnh nhánh có sẵn |
| `supabase/migrations/00XX_kiem_ke_rpc.sql` — policy chặn ghi trực tiếp `chung_tu_dong` loại KIEM_KE | migration (sửa 2 policy RLS) | — | `0016_rls_chung_tu.sql` dòng 62 (`"tao dong chung tu tru chi xem"`), dòng 79 (`"chi sua dong cua chung tu nhap lieu"`) | exact |
| `supabase/migrations/00XX_cong_tac_quyen.sql` — cột `nguoi_dung` + 2 helper | migration (ALTER TABLE + 2 hàm SQL STABLE) | — | `0026_nguoi_dung_nhieu_kho.sql` (`vai_tro_hien_tai`/`kho_hien_tai` — đổi hướng đọc bảng thay vì JWT) + `0003_nguoi_dung_kho.sql` (cột gốc trên `nguoi_dung`) | role-match |
| `supabase/migrations/00XX_cong_tac_quyen.sql` — sửa `luu_ho_so_nguoi_dung` (0026) | migration (thêm 2 tham số) | — | Chính nó — `luu_ho_so_nguoi_dung(p_id, p_ho_ten, p_ten_dang_nhap, p_vai_tro, p_kho_ids, p_phai_doi_mat_khau)` (0026) | exact |
| `supabase/migrations/00XX_lich_su_kiotviet_rpc.sql` — `tra_cuu_lich_su_kiotviet` | migration (RPC đọc, phân trang, unaccent) | request-response | `danh_sach_ghi_chu_kiotviet` (`0033_ra_ghi_chu_lich_su.sql` dòng 52) | exact |
| `supabase/migrations/00XX_lich_su_kiotviet_rpc.sql` — sửa policy đọc `luu_tru_*` (0016) | migration (2 policy SELECT) | — | `0016_rls_chung_tu.sql` dòng 117, 120 (`"doc luu tru nhap"`, `"doc luu tru hoa don"`) | exact |
| `supabase/migrations/00XX_lich_su_kiotviet_rpc.sql` — sửa `lich_su_giao_dich_doi_tac` (0033) | migration (đổi 1 dòng gate quyền) | — | Chính nó — dòng 179 `v_xem_kv := v_vai_tro in ('quan_ly','van_phong');` (`0033_ra_ghi_chu_lich_su.sql`) | exact |
| `supabase/tests/9X_kiem_ke_test.sql` | test | pgTAP | `supabase/tests/91_gia_von_dau_ky_test.sql` (khuôn preview/commit + idempotent) + `00_helper.sql.inc` | exact |
| `supabase/tests/9X_lich_su_kiotviet_test.sql` | test | pgTAP | `supabase/tests/00_helper.sql.inc` + cách `42_the_kho_test.sql` chèn dòng `luu_tru_*` ISO string | exact |
| `src/features/stocktake/types.ts` | type + mapper | transform | `src/features/products/types.ts` (`StockCardRow`/`toStockCardRow`) | exact |
| `src/features/stocktake/schemas/stocktake.schema.ts` | schema + form | transform | `src/features/products/schemas/filter.schema.ts` (URL filter) + `src/features/settings/schemas/user.schema.ts` (schema có/không id) | role-match |
| `src/features/stocktake/api/stocktake.api.ts` | data layer | request-response, event-driven | `src/features/products/api/product.api.ts` (`fetchProducts`, RPC gọi thẳng qua `.rpc()`) + `src/features/settings/actions/user.actions.ts` (Server Action gọi RPC ghi) | role-match |
| `src/features/stocktake/api/stocktake.keys.ts` | query key | — | `src/features/products/api/product.keys.ts` | exact |
| `src/features/stocktake/hooks/useStocktake.ts` | hook TanStack Query | — | `src/features/products/hooks/useProducts.ts` (`useProducts`, `keepPreviousData`) | exact |
| `src/features/stocktake/components/count-mobile.tsx` | component (đếm điện thoại, ô tìm + nhập số) | event-driven | `tim_san_pham` + khuôn nhịp bàn phím phiếu xuất (bẫy 14 CLAUDE.md) — chưa đọc file cụ thể, xem ghi chú dưới | role-match — cần đọc `src/features/stock-out/components/*` ở bước plan để lấy đúng khuôn focus/Enter |
| `src/features/stocktake/components/count-desk-table.tsx` | component (bảng dày văn phòng) | request-response | Bảng dòng chứng từ trong `stock-out`/`stock-in` (chưa đọc — xem ghi chú dưới) | role-match |
| `src/features/stocktake/components/count-excel-import.tsx` | component (import 3 bước) | file-I/O | `src/features/products/components/cost-import.tsx` (`useReducer` step 0/1/2, `Upload.Dragger`, `Statistic` ba số) | exact |
| `src/features/stocktake/components/discrepancy-table.tsx` | component (bảng lệch + chưa đếm, tô nổi) | request-response | `src/features/products/components/stage-suggestions.tsx` (khuôn "hệ đề xuất — người duyệt", `rowSelection` + `Tag`) | role-match |
| `src/features/stocktake/components/approve-session-button.tsx` | component (nút duyệt, disable theo quyền) | event-driven | Nút "Ghi sổ" trên `chung_tu` đã có (chưa đọc file cụ thể — tìm trong `stock-in`/`stock-out` ở bước plan) + logic disable-theo-cột-per-user kiểu `UserDrawer` Checkbox (xem dưới) | role-match |
| `src/features/kiotviet-history/types.ts` | type + mapper | transform | `src/features/products/types.ts` | exact |
| `src/features/kiotviet-history/api/kiotviet-history.api.ts` | data layer | request-response | `src/features/products/api/product.api.ts` (`fetchProducts` — gọi RPC phân trang qua `.rpc()`, đọc `tong_so_dong`) | exact |
| `src/features/kiotviet-history/hooks/useKiotVietHistory.ts` | hook | — | `useProducts.ts` (`useProducts`) | exact |
| `src/features/kiotviet-history/components/history-filter-panel.tsx` | component | — | `src/features/products/components/product-filter-panel.tsx` | role-match |
| `src/features/kiotviet-history/components/history-table.tsx` | component | request-response | `src/features/products/components/stock-card.tsx` (bảng phân trang server + `QueryState`) | exact |
| `src/features/kiotviet-history/components/product-history-tab.tsx` | component (tab nhúng vào chi tiết mã hàng) | request-response | `src/features/products/components/product-detail.tsx` dòng 202-231 (nhánh `...(permissions.canViewHistory ? [{key:"audit-log",...}] : [])` trong `Tabs items`) | exact |
| `src/app/(app)/kiem-ke/page.tsx`, `kiem-ke/[id]/page.tsx` | route (Server Component) | request-response | `src/app/(app)/danh-muc/page.tsx` (`PageHeader`+`Suspense`) và `danh-muc/[id]/page.tsx` (`requirePermission` + build props permissions) | exact |
| `src/app/(app)/lich-su-kiotviet/page.tsx` | route | request-response | `src/app/(app)/danh-muc/page.tsx` | exact |
| `src/app/api/kiem-ke/mau-excel/route.ts` | route handler (xuất Excel) | file-I/O | `src/app/api/danh-muc/gia-von-dau-ky/route.ts` (đọc `formData`) — cho CHIỀU XUẤT cần tìm route export khác (chưa đọc — kiểm `src/app/api/danh-muc/*` có route GET xuất file mẫu danh mục) | role-match |
| `src/app/api/kiem-ke/nhap-excel/route.ts` | route handler (nhập Excel) | file-I/O, request-response | `src/app/api/danh-muc/gia-von-dau-ky/route.ts` toàn bộ | exact |
| `src/features/auth/api/current-user.server.ts` — sửa `CurrentUser` | type + data layer | request-response | Chính nó (đọc toàn bộ ở dưới) | exact |
| `src/features/settings/components/user-drawer.tsx` — thêm 2 Checkbox | component (form sửa) | request-response | Chính nó (đọc toàn bộ ở dưới, khuôn `Checkbox` disable theo điều kiện chưa có — xem `role === 'quan_ly'` ở MO_TA_VAI_TRO) | role-match |
| `src/features/settings/actions/user.actions.ts` — sửa `updateUser`/`createUser` | Server Action | event-driven | Chính nó — 2 lệnh gọi `session.supabase.rpc("luu_ho_so_nguoi_dung", {...})` (dòng 140, 181, 255) | exact |
| `src/features/products/components/stock-card-columns.tsx` — sửa `DOC_TYPE_TO_ROUTE` | component (sửa 1 dòng bảng tra cứu) | — | Chính nó, dòng 17-23 | exact |
| `src/shared/lib/navigation.ts` — thêm `/kiem-ke`, `/lich-su-kiotviet` | pure lib | — | Mảng `NAV_ITEMS` (dòng 43+), kiểu `NavItem`/`NavIconId` (dòng 10-30) | exact |
| `scripts/test-route-permissions.ts` — thêm dòng `MA_TRAN` | test (HTTP thật) | request-response | Mảng `MA_TRAN` dòng 38+, đặc biệt dòng 51-55 (mẫu route Phase 5 vừa thêm, quyền theo cột riêng không theo `PERMISSION_MATRIX`) | exact |

---

## Pattern Assignments

### `luu_dong_kiem_ke(chung_tu_id, san_pham_id, so_luong)`

**Analog:** `0061_nap_ton_tam.sql` — không phải để copy công thức (mục đích RPC khác hẳn:
một cái upsert một dòng lặp lại N lần, một cái phân loại N dòng rồi tạo chứng từ một lần),
mà để copy ĐÚNG khung an toàn:

```sql
-- Khuôn kiểm quyền tường minh ngay đầu hàm SECURITY DEFINER (0061 dòng 128-133)
if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') <> 'quan_ly' then
  raise exception 'Chỉ quản lý nạp được tồn tạm' using errcode = '42501';
end if;
```
Với `luu_dong_kiem_ke`, đổi điều kiện thành chặn `chi_xem` (không phải hẹp còn mỗi
`quan_ly` — D-04 cho phép "ai cũng mở phiên/nhập số đếm theo quyền hiện có"), đúng khuôn
dòng 205 của `ghi_so_chung_tu` (0011): `if (select vai_tro_hien_tai()) = 'chi_xem' then
raise exception ... using errcode = '42501'; end if;`.

**Khóa dòng cha trước khi đọc/ghi** — `for update` đã dùng ở `ghi_so_chung_tu` (0011 dòng
191: `select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;`) — áp
y hệt vào `luu_dong_kiem_ke` để hai người lưu cùng một mã trong cùng phiên không tạo hai
dòng trùng (đây là khóa DUY NHẤT áp cho race condition ở D-03, vì `chung_tu_dong` không có
unique constraint — xem `05-PATTERNS.md` §Pattern 1).

**Ghi chú comment hàm** nên nêu rõ theo khuôn `0061` dòng 264-265 (comment SQL đính kèm
migration, không chỉ comment code) — giải thích D-03 ngay trong `comment on function`, để
`pg_get_functiondef` tương lai không cần đọc lại CONTEXT.md.

---

### `duyet_phien_kiem_ke(chung_tu_id, chap_nhan_khong_dem[])`

**Analog exact:** `0061_nap_ton_tam.sql` TASK 2 (dòng 223-258) — "dựng dòng phụ rồi tự gọi
`ghi_so_chung_tu` trong cùng transaction, KHÔNG bọc `exception when others`":

```sql
-- 0061 dòng 242-246 — khuôn ĐÚNG cho duyet_phien_kiem_ke gọi ghi_so_chung_tu
-- Ghi sổ TỰ ĐỘNG trong cùng transaction — không trả về chứng từ còn ở
-- NHAP_LIEU. KHÔNG bọc exception when others: lỗi ở dòng thứ n phải
-- rollback cả n-1 dòng trước (nguyên tắc kiến trúc số 4), để transaction
-- ngầm định của RPC tự lo việc đó.
perform public.ghi_so_chung_tu(v_ct.id);
```

**Bắt buộc kèm sửa `ghi_so_chung_tu` (0011)** — xem "Security Domain" của 06-RESEARCH.md:
một user có quyền ghi sổ thường (không `chi_xem`, không `duyet_duoc_kiem_ke()`) vẫn gọi
thẳng được `ghi_so_chung_tu(phien_id)` vì hàm này `grant execute ... to authenticated` cho
MỌI loại chứng từ (0011 dòng 273-274). Thêm đúng MỘT nhánh, ngay cạnh nhánh `chi_xem` có
sẵn (dòng 205 của `0011`, trích ở trên):

```sql
if v_ct.loai_ct = 'KIEM_KE' and not (select public.duyet_duoc_kiem_ke()) then
  raise exception 'Không có quyền duyệt kiểm kê' using errcode = '42501';
end if;
```
Vị trí chèn: ngay sau khối `if (select public.vai_tro_hien_tai()) = 'chi_xem' then ...`
(0011 dòng 205-207), trước vòng `for v_dong in ...` (dòng 216).

---

### Cột `nguoi_dung.xem_lich_su_kiotviet` / `duyet_kiem_ke` + 2 helper

**Analog cơ chế "đọc bảng trực tiếp thay vì JWT claim":** `0026_nguoi_dung_nhieu_kho.sql`
— đã đọc comment gốc dòng 105 (trích trong `05-PATTERNS.md`): *"Trong policy LUÔN viết
`kho_id = any((select public.kho_hien_tai())::uuid[])`"*. Hai helper mới (`xem_duoc_lich_su_kiotviet`,
`duyet_duoc_kiem_ke`) đi HƯỚNG NGƯỢC LẠI có chủ đích (đọc bảng, không JWT) — xem lý do đầy
đủ ở §Data Model mục 3 của `06-RESEARCH.md`, không lặp lại ở đây.

**Analog frontend đọc quyền per-user (không qua `PERMISSION_MATRIX`):**
`src/features/auth/api/current-user.server.ts` (đọc toàn bộ, 49 dòng) — `CurrentUser` hiện
có 4 field (`id`, `fullName`, `role`, `mustChangePassword`), lấy từ MỘT `select` duy nhất
trên `nguoi_dung` (dòng 25-29: `.select("id, ho_ten, vai_tro, dang_hoat_dong,
phai_doi_mat_khau")`). Thêm 2 field mới chỉ cần nối vào CHUỖI SELECT ĐÃ CÓ, không thêm
round-trip:

```ts
// src/features/auth/api/current-user.server.ts — sửa nguyên khối này
export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  canViewKiotVietHistory: boolean; // vai_tro === 'quan_ly' || xem_lich_su_kiotviet
  canApproveStocktake: boolean;    // vai_tro === 'quan_ly' || duyet_kiem_ke
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // ...
  const { data, error } = await supabase
    .from("nguoi_dung")
    .select(
      "id, ho_ten, vai_tro, dang_hoat_dong, phai_doi_mat_khau, xem_lich_su_kiotviet, duyet_kiem_ke",
    )
    .eq("id", user.id)
    .maybeSingle();
  // ...
  return {
    id: data.id,
    fullName: data.ho_ten,
    role: data.vai_tro,
    mustChangePassword: data.phai_doi_mat_khau,
    canViewKiotVietHistory: data.vai_tro === "quan_ly" || data.xem_lich_su_kiotviet,
    canApproveStocktake: data.vai_tro === "quan_ly" || data.duyet_kiem_ke,
  };
}
```
**KHÔNG thêm hai field này vào `PERMISSION_MATRIX`** (`src/shared/lib/permissions.ts`,
đọc toàn bộ 44 dòng) — file đó chủ đích chỉ ánh xạ `Role → Permission` tĩnh; công tắc theo
từng người phải nằm trên `CurrentUser`, đọc trực tiếp từ `user.canViewKiotVietHistory`/
`user.canApproveStocktake` ở nơi cần, không gọi `hasPermission()`.

---

### `UserDrawer` — thêm hai `Checkbox`

**Analog:** `src/features/settings/components/user-drawer.tsx` (đọc dòng 1-100+) —
`MO_TA_VAI_TRO` (dòng 28-33) đã map `Role → string` mô tả quyền; hai checkbox mới đặt cạnh
`Radio` chọn `role` (chưa đọc hết file — phần JSX form nằm sau dòng 100, xem ở bước plan),
disable khi `role === 'quan_ly'` theo đúng lý do D-15 (quản lý luôn có quyền, tô tick sẵn
không cho tắt, tránh hiểu lầm "tắt được nhưng vô tác dụng" — giống cách `MO_TA_VAI_TRO`
diễn giải quyền theo vai trò tĩnh).

**`UserFormValues` (dòng 35-41) cần thêm 2 field** (`viewKiotVietHistory: boolean`,
`approveStocktake: boolean`), và `onSave` (dòng 99+, gọi `updateUser`/`createUser`) phải
truyền thêm 2 tham số xuống `p_xem_lich_su_kiotviet`/`p_duyet_kiem_ke` trong lệnh
`session.supabase.rpc("luu_ho_so_nguoi_dung", {...})` của
`src/features/settings/actions/user.actions.ts` — copy đúng khuôn 3 lệnh gọi RPC đã có
(dòng 140-147 tạo mới, dòng 181-188 sửa, dòng 255-262 reset mật khẩu), thêm 2 key vào cả
BA lệnh gọi (nếu chỉ sửa 1-2 lệnh, các đường còn lại sẽ ghi giá trị `NULL`/mặc định sai).

---

### `tra_cuu_lich_su_kiotviet(...)`

**Analog exact:** `danh_sach_ghi_chu_kiotviet` (`0033_ra_ghi_chu_lich_su.sql` dòng 52-95,
chưa đọc toàn văn ở phiên này nhưng đã xác nhận tồn tại và cùng khuôn `STABLE SECURITY
DEFINER`, `count(*) over ()`, tham số `p_trang`/`p_kich_thuoc`) — dùng làm khuôn phân trang;
06-RESEARCH.md §Data Model mục 2 đã viết đủ SQL, không lặp lại.

**Sửa `lich_su_giao_dich_doi_tac` (0033, ĐÃ CHẠY THẬT) — xác nhận đúng dòng cần đổi:**

```sql
-- Nguyên văn ĐANG CHẠY (0033_ra_ghi_chu_lich_su.sql, trong hàm lich_su_giao_dich_doi_tac)
  v_xem_kv := v_vai_tro in ('quan_ly','van_phong');
```
Đổi thành:
```sql
  v_xem_kv := (select public.xem_duoc_lich_su_kiotviet());
```
Biến `v_vai_tro` (khai `text`, không phải enum `vai_tro` — dòng khai báo:
`v_vai_tro text := (select public.vai_tro_hien_tai())::text;`) vẫn cần giữ cho nhánh lọc
kho thủ kho (`ct.kho_id = any(v_kho) ...`) — KHÔNG xóa biến này, chỉ đổi dòng gán `v_xem_kv`.

**Sửa policy đọc hai bảng lưu trữ (0016):**
```sql
-- Nguyên văn dòng 117, 120 của 0016_rls_chung_tu.sql (chưa đọc toàn văn điều kiện USING,
-- suy từ tên policy + comment dòng 124 "chuoi_so_ct do sinh_so_ct() ghi") — bước plan phải
-- đọc trọn khối USING hiện tại trước khi DROP/CREATE lại với điều kiện gọi helper mới.
create policy "doc luu tru nhap" on public.luu_tru_nhap_kiotviet ...
create policy "doc luu tru hoa don" on public.luu_tru_hoa_don_kiotviet ...
```
⚠️ File này KHÔNG đọc trọn văn điều kiện USING của hai policy đó trong phiên lập bản đồ —
planner PHẢI `SELECT * FROM pg_policies WHERE tablename IN ('luu_tru_nhap_kiotviet',
'luu_tru_hoa_don_kiotviet')` (hoặc đọc trọn `0016` dòng 105-130) trước khi viết
`DROP POLICY`/`CREATE POLICY` mới, để không đoán sai điều kiện gốc.

---

### Màn đếm mobile/desktop — `tim_san_pham` + nhịp bàn phím

**Chưa xác nhận file cụ thể của Phase 3/4 chứa khuôn "gõ mã → Enter → chọn → focus ô kế"**
(bẫy 14 CLAUDE.md, "Tranh chấp focus với rc-select"). 06-RESEARCH.md trỏ chung tới "khuôn
đã dùng ở phiếu nhập/xuất Phase 3" nhưng không nêu tên file — đây là việc bước PLAN phải
làm trước khi viết `count-mobile.tsx`/`count-desk-table.tsx`:

```bash
# Lệnh gợi ý cho bước plan — tìm đúng file chứa RPC tim_san_pham + xử lý Enter
grep -rl "tim_san_pham" src/features/stock-in src/features/stock-out 2>/dev/null
grep -rln "onKeyDownCapture" src/features
```
`tim_san_pham()` RPC bản thân đã ổn định (không đổi ở Phase 6) — chỉ thiếu xác nhận
component React nào gọi nó đúng khuôn bẫy 14/15 để copy y hệt.

---

### `count-excel-import.tsx` — khuôn 3 bước `cost-import.tsx`

**Analog exact:** `src/features/products/components/cost-import.tsx` (đọc toàn bộ ở
`05-PATTERNS.md`, không đọc lại ở đây) — `useReducer` step 0/1/2, `Upload.Dragger` tự submit
chế độ xem trước ngay khi chọn file, `Statistic` ba số. Với D-08, đổi tên miền:
`dat → sẽ nạp`, `bo_qua → mã đã có dòng đếm/không hợp lệ`, `loi → lỗi đọc file`. Response
shape từ `luu_dong_kiem_ke`/hàm gộp phải giữ cấu trúc `dat`/`bo_qua`/`loi` giống `nap_ton_tam`
(0061 dòng 197-205) để tái dùng nguyên UI.

**File mẫu KHÔNG lộ tồn (D-08)** — dùng khuôn `src/features/products/lib/excel-template.ts`
(`TEMPLATE_COLUMNS`, đọc dòng 1-40) nhưng bỏ hẳn cột `exportOnly` chứa tồn:

```typescript
// Khuôn từ excel-template.ts (ColumnKey/TemplateColumn), KHÔNG có cột tồn (D-08)
export const STOCKTAKE_TEMPLATE_COLUMNS = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 40 },
  { key: "dvt", title: "ĐVT", width: 10 },
  { key: "so_dem", title: "Số đếm", width: 12 }, // để trống khi xuất
] as const;
```

**Xuất mỗi nhóm một file riêng (không multi-sheet)** — dùng nguyên `readFirstSheet` từ
`@/shared/lib/excel-cell` không sửa gì (xem Pitfall 4/Pattern 3 của `06-RESEARCH.md`).

---

### `discrepancy-table.tsx` — khuôn "hệ đề xuất — người duyệt"

**Analog:** `src/features/products/components/stage-suggestions.tsx` (đọc toàn bộ ở
`05-PATTERNS.md`) — `Set<string>` các dòng BỊ BỎ CHỌN, `rowSelection` với
`preserveSelectedRowKeys: true`, nút hành động ghi rõ số lượng. Khác biệt bắt buộc theo
D-16: thêm cột tô nổi bằng hàm `isLargeDiscrepancy` (06-RESEARCH.md §Pattern 4, hằng số
ngưỡng ≥5 tuyệt đối HOẶC ≥10% — **A1 trong Assumptions Log, CHƯA xác nhận với người
dùng, gắn UAT hỏi lại**), và banner riêng cho danh sách "chưa đếm" (D-07) — dùng `Alert`
kiểu cảnh báo giống `stock-card.tsx` dòng 48-55 (`<Alert type="info" showIcon
title="..." />`).

---

### Tab "Lịch sử KiotViet" trong chi tiết mã hàng (D-11)

**Analog exact:** `src/features/products/components/product-detail.tsx` dòng 202-231 —
nhánh có điều kiện trong mảng `items` của `<Tabs>`:

```tsx
// product-detail.tsx dòng 202-231 — khuôn CHÍNH XÁC cho tab lịch sử KiotViet
<Tabs
  className="mt-4"
  items={[
    { key: "stock-card", label: "Thẻ kho", children: <StockCard ... /> },
    ...(permissions.canViewHistory
      ? [{ key: "audit-log", label: "Lịch sử sửa", children: <AuditLog ... /> }]
      : []),
  ]}
/>
```
Thêm một nhánh thứ ba theo đúng mẫu, gate bằng `canViewKiotVietHistory` (field MỚI trên
`CurrentUser`, không phải `ProductDetailPermissions.canViewHistory` — đây là quyền per-user,
không phải quyền theo vai trò `edit-catalog`):

```tsx
...(permissions.canViewKiotVietHistory
  ? [{
      key: "kiotviet-history",
      label: "Lịch sử KiotViet",
      children: <ProductHistoryTab productCode={product.code} />,
    }]
  : []),
```

**`ProductDetailPermissions` (dòng 17-21) phải thêm field mới:**
```ts
export type ProductDetailPermissions = {
  canEdit: boolean;
  canViewCost: boolean;
  canEditSalePrice: boolean;
  canViewHistory: boolean;
  canViewKiotVietHistory: boolean; // MỚI — theo D-13, không theo Permission/Role
};
```

**`src/app/(app)/danh-muc/[id]/page.tsx` (đọc toàn bộ, 31 dòng) phải sửa cách build props:**
hiện TẤT CẢ 4 field build bằng `hasPermission(user.role, "...")` (dòng 23-26) — field mới
KHÔNG đi qua `hasPermission()` vì không nằm trong `PERMISSION_MATRIX`, phải lấy thẳng từ
`user.canViewKiotVietHistory` (field mới trên `CurrentUser`, `user` là kết quả
`requirePermission("view-catalog")` dòng 17):

```tsx
// danh-muc/[id]/page.tsx — sửa nguyên khối permissions={{...}}
<ProductDetailView
  id={id}
  permissions={{
    canEdit: hasPermission(user.role, "edit-catalog"),
    canViewCost: hasPermission(user.role, "view-cost"),
    canEditSalePrice: hasPermission(user.role, "edit-sale-price"),
    canViewHistory: hasPermission(user.role, "edit-catalog"),
    canViewKiotVietHistory: user.canViewKiotVietHistory, // KHÔNG qua hasPermission()
  }}
/>
```

---

### Link "Số phiếu" trên thẻ kho → route `/kiem-ke/[id]` (theo dõi từ Phase 5)

**Sửa `stock-card-columns.tsx` dòng 17-23** — thêm nhãn `KIEM_KE` vào bảng tra cứu (đúng
comment sẵn có trong file: *"Chưa có route: CHUYEN_KHO, KIEM_KE, DIEU_CHINH — route đến
cùng giao diện Phase 4/6 của chúng; lúc đó thêm vào đây"*):

```typescript
const DOC_TYPE_TO_ROUTE: Record<string, string> = {
  NHAP: "/nhap-kho",
  XUAT: "/xuat-kho",
  TRA_KHACH: "/tra-hang",
  TRA_NCC: "/tra-hang",
  KIEM_KE: "/kiem-ke", // MỚI — Phase 6, route /kiem-ke/[id] đã tồn tại
};
```
Chỉ thêm SAU KHI route `/kiem-ke/[id]/page.tsx` đã tồn tại thật — thêm sớm hơn sẽ tạo link
404. `DIEU_CHINH` KHÔNG có route chi tiết theo kế hoạch hiện tại (chứng từ nạp tồn tạm/kiểm
kê đầu kỳ không cần trang riêng) — để nguyên chưa map, không phải lỗi sót.

---

### Route mới + ma trận quyền (WU cuối cùng, bắt buộc cùng plan tạo route)

**`src/shared/lib/navigation.ts`** — thêm 2 phần tử theo khuôn dòng 43+ (`NAV_ITEMS`), cần
thêm `NavIconId` mới vào union (dòng 10-18) và case tương ứng ở `nav-icons.tsx` (file client,
chưa đọc — đọc trước khi thêm icon). `/kiem-ke`: `permission: "view-catalog"` (ai cũng mở
được, nút duyệt disable theo `canApproveStocktake` ở tầng component, giống cách `/ton-kho`
đã làm ở Phase 5 — "phạm vi kho của thủ kho siết trong RPC, không ở route"). `/lich-su-kiotviet`:
KHÔNG thể gate bằng `Permission` tĩnh (đây là công tắc per-user D-13) — nav item vẫn cần một
giá trị `Permission` hợp lệ cho field bắt buộc của `NavItem` (dùng `"view-catalog"` để mọi
vai trò THẤY mục nav, nhưng trang `page.tsx` tự `redirect`/chặn theo `user.canViewKiotVietHistory`
thay vì dựa `requirePermission()` — cần một hàm `requireStocktakeApproval`-kiểu tương tự
`requirePermission` nhưng đọc field per-user thay vì `Permission`, viết mới trong
`current-user.server.ts`).

**`scripts/test-route-permissions.ts`** — thêm dòng vào `MA_TRAN` (dòng 38+) theo đúng mẫu
dòng 51 (route `/ton-kho`, `ky_vong: AI_CUNG_XEM`) cho `/kiem-ke`, và mẫu dòng 53
(`/ton-kho/dinh-muc`, quyền hẹp `quan_ly`+`van_phong`) — NHƯNG route kiểm kê/lịch sử KiotViet
không theo `PERMISSION_MATRIX` nên `ky_vong` phải phản ánh ĐÚNG NGƯỜI DÙNG MẪU nào có bật
công tắc trong dữ liệu seed (`scripts/seed-users.ts`/tương đương — chưa đọc, xác nhận ở bước
plan xem 4 user mẫu hiện có bật `xem_lich_su_kiotviet`/`duyet_kiem_ke` hay không, nếu chưa
phải thêm bước seed công tắc trước khi script này chạy đúng).

⚠️ Nhắc lại cảnh báo đã có trong `05-PATTERNS.md` Đính chính #8: `MA_TRAN` hiện CHƯA phủ hết
route Phase 4 — không phải việc Phase 6 phải sửa, nhưng đừng ngạc nhiên khi chạy toàn bộ
script vẫn thiếu vài route cũ.

---

## Shared Patterns

### RPC ghi — kiểm quyền tường minh trong SECURITY DEFINER
**Nguồn:** `ghi_so_chung_tu` (0011 dòng 205-207, chặn `chi_xem`), `nap_ton_tam` (0061 dòng
128-133, chặn khác `quan_ly`). **Áp dụng cho:** `luu_dong_kiem_ke`, `duyet_phien_kiem_ke`,
`tra_cuu_lich_su_kiotviet`, `xem_duoc_lich_su_kiotviet`, `duyet_duoc_kiem_ke`.

### RPC ghi atomic — dựng chứng từ rồi tự gọi `ghi_so_chung_tu`, KHÔNG bọc `exception when others`
**Nguồn:** `nap_ton_tam` (0061 dòng 223-258, comment dòng 242-245 giải thích lý do). **Áp
dụng cho:** `duyet_phien_kiem_ke`.

### Cột `nguoi_dung` — quyền per-user đọc trực tiếp từ bảng, KHÔNG qua JWT claim
**Nguồn:** `getCurrentUser()`/`getAdminSession()` (đã đọc trực tiếp — cả hai đều `SELECT`
từ `nguoi_dung` mỗi request, không đọc claim). **Áp dụng cho:** hai helper SQL mới +
`CurrentUser.canViewKiotVietHistory`/`canApproveStocktake`.

### Server Action quản trị — tự kiểm `vai_tro === 'quan_ly'` bằng bảng, không tin JWT
**Nguồn:** `getAdminSession()` (`user.actions.ts` dòng 37-57). **Áp dụng cho:** mọi Server
Action Phase 6 chạm `nguoi_dung` (bật/tắt 2 công tắc).

### Mapper — ranh giới DUY NHẤT chạm tên cột tiếng Việt
**Nguồn:** `types.ts` của từng feature. **Áp dụng cho:** `stocktake/types.ts`,
`kiotviet-history/types.ts` — component/hook không bao giờ thấy `so_luong_he_thong`,
`pham_vi_nhom_hang`, `nha_cung_cap`; chỉ thấy `systemQuantity`, `categoryScope`,
`supplierName`.

### `QueryState` bốn trạng thái + `ListLayout`
**Nguồn:** `src/shared/components/query-state.tsx`, `list-layout.tsx` (đã trích đủ ở
`05-PATTERNS.md`). **Áp dụng cho:** mọi bảng mới của hai feature Phase 6.

### Lỗi — `explainError`/`isPostgrestError`/`errorCode`
**Nguồn:** `src/shared/lib/errors.ts`. **Áp dụng cho:** mọi Server Action/hook mutation mới
— dùng `errorCode(error) === "42501"` để phân biệt lỗi quyền (duyệt kiểm kê, xem lịch sử)
với lỗi `23514` (ràng buộc nghiệp vụ, ví dụ "phiên đã duyệt, không sửa số đếm được").

### Excel phía server — `readFirstSheet` từ `@/shared/lib/excel-cell` (KHÔNG phải `o-excel.ts`)
**Nguồn:** đã xác nhận tên file đúng trong `05-PATTERNS.md` Đính chính #3. **Áp dụng cho:**
`count-excel-import.tsx`, `app/api/kiem-ke/nhap-excel/route.ts`.

---

## No Analog Found (một phần)

| File/việc | Vai trò | Lý do không có analog đầy đủ |
|---|---|---|
| Trạng thái phiên kiểm kê tính từ tiến độ đếm (không lưu DB) | RPC + component | Chưa tính năng nào trong dự án hiện "nhãn trạng thái" hoàn toàn suy ra từ tỉ lệ tiến độ (đã đếm/tổng) thay vì cột trạng thái lưu sẵn — gần nhất là `NHAP_LIEU`/`HOAN_THANH` của `chung_tu`, nhưng đó LÀ cột lưu, không phải suy ra |
| Nút duyệt disable theo field per-user (`canApproveStocktake`) thay vì theo `Permission`/`Role` | component | Mọi nút disable-theo-quyền hiện có (`ProductDrawer`, `UserDrawer`) đều dựa `hasPermission(role, permission)`; đây là lần đầu disable theo MỘT CỘT boolean per-user, không theo bảng `PERMISSION_MATRIX` |
| RPC upsert một dòng lặp lại nhiều lần trong một phiên (khóa theo `chung_tu_id + san_pham_id`) | migration | Mọi RPC ghi hiện có tạo dòng MỚI (insert-only) hoặc sửa MỘT dòng đã biết `id`; `luu_dong_kiem_ke` là RPC ĐẦU TIÊN phải tự tìm-rồi-quyết insert/update theo khóa hỗn hợp (không phải PK) mỗi lần gọi |
| Nhịp bàn phím "gõ mã → Enter → chọn → focus ô kế" cho màn đếm | component | Chưa xác định được file Phase 3/4 cụ thể chứa khuôn này trong phiên lập bản đồ — cần tìm ở bước plan (xem mục "Màn đếm mobile/desktop" ở trên) |

---

## Metadata

**Phạm vi tìm analog:** `supabase/migrations/` (đọc trực tiếp 6 file: `0011`, `0016`,
`0026`, `0033`, `0061`, và grep `0044`/`0056`/`0035` đã có trong `05-PATTERNS.md`),
`src/features/products/` (7 file: `types.ts` — qua 05-PATTERNS, `product-detail.tsx`,
`stock-card.tsx`, `stock-card-columns.tsx`, `excel-template.ts`, `cost-import.tsx` — qua
05-PATTERNS), `src/features/auth/api/current-user.server.ts`,
`src/features/settings/{components/user-drawer.tsx,actions/user.actions.ts}`,
`src/shared/lib/{permissions.ts,navigation.ts}`, `scripts/test-route-permissions.ts`,
`src/app/(app)/danh-muc/[id]/page.tsx`.

**File chưa đọc, cần đọc ở bước plan trước khi viết code thật:**
- File Phase 3/4 chứa khuôn nhịp bàn phím màn đếm (`tim_san_pham` + Enter/focus) —
  `src/features/stock-in/`, `src/features/stock-out/`.
- Toàn văn điều kiện `USING`/`WITH CHECK` của policy `"doc luu tru nhap"`/`"doc luu tru hoa
  don"` (0016 dòng 117-124) trước khi DROP/CREATE lại.
- `nav-icons.tsx` (icon client-side) trước khi thêm `NavIconId` mới.
- Route export Excel mẫu danh mục hiện có (nếu có) trong `src/app/api/danh-muc/` — làm khuôn
  cho chiều XUẤT của `app/api/kiem-ke/mau-excel/route.ts` (đã có khuôn NHẬP từ
  `gia-von-dau-ky/route.ts`, còn thiếu khuôn XUẤT).
- `scripts/seed-users.ts`(hoặc tương đương) để biết 4 user mẫu có sẵn cột
  `xem_lich_su_kiotviet`/`duyet_kiem_ke` = gì, phục vụ viết đúng `ky_vong` trong
  `test-route-permissions.ts`.

**Ngày lập:** 2026-09-24
