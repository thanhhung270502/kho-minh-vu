# Phase 20: Giao diện 3b và tính năng còn thiếu - Research

**Researched:** 2026-10-04
**Domain:** Next.js 16 + antd v6 design-system swap, Supabase RPC (Postgres) cho dashboard/tìm kiếm/đơn đặt
**Confidence:** HIGH (SQL, code hiện trạng đọc trực tiếp từ repo) / MEDIUM (token antd pill, hiệu năng RPC chưa đo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Tổng quan: theo design, giữ phần cũ.** Dựng đủ widget design; "Nhịp bán hôm nay" và bảng "Xuất âm" chọn ngày KHÔNG bỏ — đặt xuống dưới các widget mới (hoặc gộp hợp lý: KPI Phiếu xuất hôm nay dùng chung nguồn `nhip_ban`), không mất thông tin đang dùng.
- **D-02 Header: chỉ làm ô tìm kiếm ⌘K.** Ô "Tất cả kho ▼" trong design KHÔNG làm. Bộ lọc kho theo từng trang giữ như hiện tại.
- **D-03 Trùng mã ở đơn đặt: cộng dồn khi cùng mã VÀ cùng người nhận dòng.** Khác người nhận (Phase 18) vẫn tách dòng. Dòng "hàng chung" (người nhận null) trùng mã cũng cộng dồn với dòng null.
- **D-04 KPI Giá trị tồn:** người có quyền xem giá vốn (`co_quyen_xem_gia_von()`) thấy giá trị (đ); người không có quyền thấy **"Tổng SL tồn"** ở cùng ô — lưới vẫn 4 KPI, không lộ giá vốn ra client.

### Claude's Discretion
- Cách gói RPC mới (một RPC tổng hợp dashboard hay nhiều RPC nhỏ), miễn kiểm quyền `xem_dashboard` ở database.
- Sparkline: vẽ bằng Recharts hoặc SVG thuần — chọn cái nhẹ hơn, không thêm thư viện.
- ⌘K: dùng antd Modal + danh sách tự dựng; không cài thư viện command palette.
- Thứ tự cột thẻ kho: có thể giữ cột hiện có (Nguồn, Kho là cột bổ sung có ích) — chỉ đổi nhãn nếu rõ hơn.

### Deferred Ideas (OUT OF SCOPE)
- Chọn kho toàn cục ở header (D-02). Đổi luồng duyệt/ghi sổ. Đổi schema nghiệp vụ ngoài phần ghi rõ. Nhật ký đơn / stepper tiến trình của khung 5b (không có trong CONTEXT). Tối thiểu theo kho (không thêm schema).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI3B-01 | Design system 3b toàn app, header 2 tầng, pill, mobile giữ tab đáy | Mục "Design-system swap" — token antd/Tailwind, Manrope, TopNav 2 tầng |
| UI3B-02 | Tìm kiếm toàn cục ⌘K, RLS | RPC `tim_kiem_toan_cuc` (0092, security invoker) + mục "⌘K palette" |
| UI3B-03 | 4 KPI + biểu đồ Nhập–Xuất 7/30/90N | RPC `tong_quan_chi_so`, `nhap_xuat_theo_ngay` (0093) |
| UI3B-04 | Tồn theo nhóm + SL, Cần xử lý, Không luân chuyển, giữ Nhịp bán/Xuất âm | mở rộng `ton_theo_nhom`, RPC `khong_luan_chuyen`, tái dùng hook cũ |
| UI3B-05 | Danh sách đơn: số đếm, preset ngày, Tiến độ, Xuất Excel | RPC `dem_don_theo_trang_thai` (0094), route `/api/don-dat/xuat-excel` |
| UI3B-06 | Chi tiết đơn 2 cột; cộng dồn trùng mã | RPC `them_dong_don` (0094) + layout aside |
| UI3B-07 | Chi tiết hàng: badge, Ngừng/Mở lại KD, bảng Tồn theo kho, ảnh aside | Không cần SQL mới — `gia_von_san_pham`, `gan_hang_loat`, `ton_kho` |
</phase_requirements>

## Summary

Phần lớn phase là việc giao diện trên dữ liệu đã có. SQL mới gói gọn trong **3 migration (0092–0094)**: tìm kiếm toàn cục (invoker), bộ RPC Tổng quan (definer + `co_quyen('xem_dashboard')`), và hai RPC cho đơn đặt (đếm theo trạng thái, upsert dòng). Không cần schema/bảng mới, không cần thêm thư viện (Recharts 3.10.1, antd 6.6.3, TanStack Query 5.102.8, Next 16.3.4 đã có; Manrope có subset `vietnamese` trong `next/font/google` — đã xác minh trong `font-data.json`).

Ba phát hiện ảnh hưởng trực tiếp tới kế hoạch: (1) **không có lịch sử giá vốn** — `san_pham.gia_von` là một giá trị hiện tại toàn công ty, nên "giá trị tồn tháng trước" và sparkline giá trị chỉ dựng lại được bằng *tồn lùi theo sổ cái × giá vốn hiện tại* (xấp xỉ, phải ghi rõ trong UI/comment); (2) `danh_sach_don` **cắt cứng 200 dòng/trang** (`least(..., 200)`) nên Xuất Excel phải lặp trang bằng `fetchAllPages` chứ không gọi một lần 5000 như danh mục; (3) `lan_phat_sinh_cuoi` bị trigger sổ cái đặt lại ở MỌI bút toán (kể cả nạp tồn tạm/kiểm kê), nên "Không luân chuyển > 30 ngày" sẽ trống cho tới 30 ngày sau lần nạp/kiểm kê gần nhất.

**Primary recommendation:** Làm DB trước (0092–0094 + pgTAP 110–113, chạy local), rồi token/vỏ app (một lần, toàn app), rồi từng màn (Tổng quan → Đơn đặt → Chi tiết đơn → Chi tiết hàng → ⌘K). Mỗi plan ≤ 3–5 file; không plan nào vừa đổi token vừa đổi màn.

## Project Constraints (from CLAUDE.md)

- Code tiếng Anh, hiển thị tiếng Việt có dấu; URL/route/query param tiếng Việt không dấu; **tên bảng/cột/RPC tiếng Việt chỉ chạm ở `api/` + `types.ts`** (mapper). Component/hook không thấy snake_case.
- Tuần tự 7 bước; liệt kê file trước khi code; route mỏng (`app/` chỉ metadata + PageHeader + gọi component feature), feature dày; component > ~200 dòng thì tách.
- Không `any`, không `@ts-ignore`, không `console.log`; kiểu bảng suy ra từ `database.types.ts` — **chạy `npm run db:types` sau mỗi migration** (không sửa tay).
- Mọi màn đọc dữ liệu bọc `<QueryState>` (loading/error+Thử lại/empty/success). Không `useEffect+useState` lấy dữ liệu server. Mutation `invalidateQueries` đúng key. Query key tập trung ở `api/*.keys.ts`.
- supabase-js không tự throw: `if (error) throw error`. Hết phiên/403 qua `explainError()`.
- Ghi sổ/ghi nhiều lệnh phải atomic bằng Postgres RPC, không Server Action nhiều lệnh. Phân quyền ở RLS/RPC, không ở giao diện. Quyền nghiệp vụ mới đi qua `co_quyen()`.
- Không thêm thư viện, không đổi build/lint/tsconfig/**thứ tự CSS layer**, không migration phá cột trên DB thật — **hỏi trước**. Migration mới chỉ áp local; áp cloud phải hỏi.
- Bẫy áp dụng trực tiếp: **1** (file import antd phải `"use client"`), **2** (layer antd/Tailwind — giữ cặp `@layer` + `<AntdRegistry layer>`; class Tailwind đè được antd không cần `!`), **5** (cấm `select("*")` trên `san_pham`/`kho_movement`; cột mới phải `grant select (cột)`), **9** (hàm thuần để ở `lib/*.ts` không `"use client"`), **10** (hook đọc 1 bản ghi có `enabled`), **11** (prop antd v6 — mở console), **12** (thêm route/API vào `test-route-permissions.ts`), **13** (phím giả lập `Return` không có `event.key`), **14** (rc-select tranh focus, `setTimeout 0`), **15** (ưu tiên khớp tuyệt đối), **16** (pgTAP không neo bộ đếm sống), **19/20/21** (Suspense ẩn khi tab ẩn, bọc điều kiện làm mất focus, `Select showSearch` dùng `filterByLabel`).
- Test: pgTAP đặt thẳng `request.jwt.claims` (bỏ qua hook JWT). `.env.local` hiện `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` (local; CONTEXT ghi "cloud rnpq" — lệch, kiểm lại trước khi UAT).

## Standard Stack

### Core (đã có, không cài thêm)
| Library | Version (verified `node_modules`) | Purpose | Ghi chú |
|---|---|---|---|
| next | 16.3.4 | App Router, `next/font/google` | Manrope: weights 200–800 + variable, subsets có `vietnamese` |
| antd | 6.6.3 | Modal (⌘K), Table, Segmented, DatePicker | token theo `ThemeConfig` |
| @tanstack/react-query | 5.102.8 | hook dữ liệu, `keepPreviousData` | |
| recharts | 3.10.1 | Biểu đồ Nhập–Xuất (cột đôi) | đã dùng ở `features/analytics` |
| exceljs | (có sẵn) | Xuất Excel đơn | pattern `read-catalog-file.server.ts` |
| dayjs | (có sẵn, antd kéo theo) | preset ngày | dùng đúng múi giờ VN |

### Alternatives Considered
| Thay vì | Có thể dùng | Đánh đổi |
|---|---|---|
| Recharts cho cột đôi 90 ngày | SVG thuần | SVG nhẹ hơn nhưng phải tự viết trục/tooltip; Recharts đã trong bundle `/phan-tich` — dùng Recharts cho biểu đồ chính |
| Recharts cho sparkline | SVG `<polyline>` | **Dùng SVG thuần** (~25 dòng, 4 sparkline × 30 điểm, không ResponsiveContainer) |
| cmdk/kbar | antd Modal tự dựng | Đã chốt: không cài |

**Installation:** không có. **Version verification:** đọc từ `node_modules/*/package.json` ngày 2026-10-04.

## Architecture Patterns

### SQL — danh sách migration và quyết định (số tiếp theo là 0092; repo nhảy 0084 → 0089, không có 0085–0088)

#### 0092 `tim_kiem_toan_cuc(p_tu_khoa text, p_gioi_han int default 5)` — SECURITY INVOKER
- `returns table (loai text, id uuid, nhan text, phu text, trang_thai text, xep_hang int)`; `loai` ∈ `'san_pham' | 'chung_tu' | 'don_dat' | 'doi_tac'`. `language sql/plpgsql stable`, `set search_path = ''`; `revoke all ... from public, anon; grant execute ... to authenticated`.
- **Vì sao invoker:** `san_pham` chỉ cho SELECT từng cột (0029) nhưng `id, ma_hang, ten_hang, dang_kinh_doanh` đều được cấp → invoker chạy được và **RLS tự lọc**: `chung_tu` theo kho của thủ kho (policy 0016 "doc chung tu theo pham vi"), `don_dat_hang` đọc `using (true)`, `doi_tac` đọc `using (true)`. Definer sẽ phải tự chép lại phạm vi kho — dễ sai (UI3B-02 yêu cầu "tôn trọng RLS").
- **Cấm** `sp.*` và `gia_von` (bẫy 5; chính `tim_san_pham` 0029 đã phải DROP/CREATE vì `sp.*`).
- Bốn nhánh `union all`, mỗi nhánh `limit p_gioi_han`:
  - Mã hàng: lấy ĐÚNG biểu thức `tim_san_pham` (0022/0029): `public.f_unaccent(coalesce(ma_hang,'')||' '||coalesce(ten_hang,'')) ilike '%'||public.f_unaccent(kw)||'%'` (index `idx_san_pham_tim_kiem` gin trigram). Không dùng `where sp.dang_kinh_doanh` cứng — để mã ngừng KD vẫn tìm được, hiển thị `phu` = tên + "(ngừng KD)". `xep_hang`: khớp tuyệt đối `lower(ma_hang)=lower(kw)` = 0, bắt đầu bằng = 1, còn lại = 2 (bẫy 15: tuyệt đối trước `lan_phat_sinh_cuoi`).
  - Chứng từ: `ct.so_ct ilike '%'||kw||'%'` (so_ct có unique btree; ~vài chục nghìn dòng/năm nên quét tuần tự vẫn rẻ; chỉ thêm gin trigram nếu đo chậm). `phu` = `loai_ct` + ngày + trạng thái. Loại trừ không gì (cả DA_HUY — có nhãn).
  - Đơn đặt: `dh.so_dh ilike '%'||kw||'%'`.
  - Đối tác: biểu thức khớp index `idx_doi_tac_tim_kiem` (0032): `f_unaccent(coalesce(ma,'')||' '||coalesce(ten,'')||' '||coalesce(dien_thoai,''))` — **phải đúng nguyên văn biểu thức** thì mới dùng được index.
- Từ khóa rỗng/ < 2 ký tự → trả rỗng (không quét). `p_gioi_han` kẹp `least(greatest(...,1),10)`.
- **Map `href` ở client** (`features/global-search/lib/hrefs.ts`, file thuần): `san_pham → /danh-muc/{id}`; `don_dat → /don-dat/{id}`; `doi_tac → /doi-tac?q={ten}` (không có trang chi tiết đối tác; param `q` — xem `partner.api.ts`); `chung_tu` theo `loai_ct`: `NHAP → /nhap-kho/{id}`, `XUAT → /duyet-don/{id}`, `TRA_NCC|TRA_KHACH → /tra-hang/{id}`, `KIEM_KE → /kiem-ke/{id}`. **CHUYEN_KHO/DIEU_CHINH chưa thấy route chi tiết riêng** → planner kiểm `nhap-kho/[id]`/`duyet-don/[id]` có phục vụ được không; nếu không thì RPC không trả hai loại này.
- Trả `phu`/`trang_thai` thô (enum) — nhãn tiếng Việt map ở client.

#### 0093 Tổng quan — 3 RPC mới + 1 sửa (tất cả SECURITY DEFINER, `set search_path = ''`)
Dòng đầu mỗi hàm: `if not public.co_quyen('xem_dashboard') then raise exception '...' using errcode='42501'` (đúng mẫu `bao_cao_xuat_am` 0083). Nhận `p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date` để pgTAP tái lập được. Tên cột OUT **không trùng** tên cột bảng (bài học 0059→0062: lỗi 42702 lúc GỌI hàm) — dùng tiền tố `d_`/`k_` trong CTE và `v.` ở select cuối.

1. **`tong_quan_chi_so(p_ngay)`** — trả 1 dòng:
   - `xem_gia_von boolean` = `public.co_quyen_xem_gia_von()` (vai trò `quan_ly`/`van_phong`, 0029 — KHÔNG phải `co_quyen`).
   - `gia_tri_ton numeric` (null nếu `not xem_gia_von`), `tong_sl_ton numeric`, `gia_tri_ton_thang_truoc numeric` (null nếu không quyền), `tong_sl_ton_thang_truoc numeric`.
   - `ma_kinh_doanh bigint` = `count(*) from san_pham where dang_kinh_doanh`; `ma_moi_thang bigint` = cùng điều kiện và `created_at >= date_trunc('month', p_ngay)` (đủ cột `created_at` được cấp).
   - `phieu_xuat_tb_ngay numeric` = số phiếu XUAT `HOAN_THANH` trong 30 ngày trước `p_ngay` (không tính hôm nay) / 30 (chia theo ngày lịch, kể cả ngày 0 phiếu). Số "hôm nay" và "hôm qua" lấy từ `nhip_ban` (D-01) — hook `useSalesPace` có sẵn, **không** lặp lại trong RPC mới.
   - `cho_ghi_so bigint` = `count(*) from chung_tu where trang_thai='NHAP_LIEU' and loai_ct <> 'KIEM_KE'`; `cho_ghi_so_cu_nhat_ngay int` = `p_ngay - min(created_at at time zone 'Asia/Ho_Chi_Minh')::date`. (Planner: xác nhận phiếu KIEM_KE nháp có nằm ở `chung_tu` không — 0066 duyệt kiểm kê; loại trừ nếu là phiên riêng.)
   - Sparkline: `xu_huong_ton numeric[]` (30 điểm, từ cũ → mới), `xu_huong_ma_kd int[]`, `xu_huong_cho_ghi_so int[]` (số phiếu nháp tạo mỗi ngày, 14–30 ngày). Mảng thay vì nhiều dòng → một round-trip. Sparkline "Phiếu xuất" lấy từ `nhap_xuat_theo_ngay(30)`.
   - **Công thức Giá trị tồn** (định nghĩa chung cho UI và test): `Σ_p greatest(Σ_k ton_kho.so_luong, 0) × san_pham.gia_von` trên MỌI mã (kể cả ngừng KD — hàng vẫn nằm trong kho). Tổng SL tồn cùng cách `greatest(...,0)` (tồn âm không trừ đi). Ghi định nghĩa này vào `comment on function`.
   - **Tháng trước / sparkline (xấp xỉ)**: `qty_T(p) = qty_now(p) − Σ kho_movement.so_luong có ngay > cuối ngày T` rồi nhân `gia_von` HIỆN TẠI. Chi tiết: CTE `luu_chuyen` = `kho_movement m join san_pham sp` nhóm theo `(m.ngay at time zone 'Asia/Ho_Chi_Minh')::date`, tổng `so_luong` (và `so_luong*sp.gia_von` khi có quyền); rồi cộng lùi bằng window `sum(...) over (order by ngay desc rows unbounded preceding)`. ~15k dòng sổ cái/tháng → rẻ (index `idx_movement_san_pham_ngay`). **Lưu ý `greatest(...,0)` theo từng mã không cộng lùi tuyến tính được** — để sparkline đơn giản, dùng tổng có dấu (`Σ so_luong×gia_von`, không kẹp 0) CHO CHUỖI LÙI, và ghi chú rằng đó là xấp xỉ; nhãn UI "so với tháng trước (theo giá vốn hiện tại)". Quyết định chốt trong plan: delta% = `(now − T)/T`, ẩn delta nếu T ≤ 0.
   - Dùng `kho_movement.ngay` (thời điểm ghi sổ) cho tồn, còn Nhập–Xuất dùng `chung_tu.ngay_ct` (ngày chứng từ, như `nhip_ban`). Hai mốc có thể lệch khi phiếu lùi ngày — chấp nhận, ghi chú.

2. **`nhap_xuat_theo_ngay(p_so_ngay int, p_ngay date)`** — `p_so_ngay in (7,30,90)` else `22023`. `generate_series(p_ngay - (p_so_ngay-1), p_ngay, '1 day')` LEFT JOIN đếm → trả `(ngay date, so_phieu_nhap bigint, so_phieu_xuat bigint, sl_nhap numeric, sl_xuat numeric)`, ngày trống vẫn có dòng 0. Chỉ `loai_ct in ('NHAP','XUAT')`, `trang_thai='HOAN_THANH'` (khớp `nhip_ban`). Biểu đồ vẽ **số phiếu** (khớp KPI "Phiếu xuất"); SL trả kèm để tooltip. Index `idx_chung_tu_loai_ngay`. Tối đa 90 dòng < `max_rows` 1000.

3. **`khong_luan_chuyen(p_so_ngay int default 30, p_gioi_han int default 10)`** → `(san_pham_id uuid, ma_hang text, ten_hang text, so_ngay int, ton numeric)`: `dang_kinh_doanh` + tồn tổng `> 0` + (`lan_phat_sinh_cuoi is null or < p_ngay − p_so_ngay`). `so_ngay` = ngày kể từ `lan_phat_sinh_cuoi` (null → dùng `created_at`). Sắp `so_ngay desc`. **Rủi ro đã xác minh:** trigger `cap_nhat_ton_va_gia_von` (0008, bước 4) đặt `lan_phat_sinh_cuoi = now()` cho MỌI bút toán, gồm nạp tồn tạm (0061) và kiểm kê — danh sách sẽ rỗng cho tới 30 ngày sau lần đó. Làm theo CONTEXT (dùng `lan_phat_sinh_cuoi`); nêu rõ trong comment; phương án thay thế (last XUAT trong `kho_movement`) ghi ở Open Questions.

4. **Mở rộng `ton_theo_nhom`** — thêm `tong_so_luong numeric` (= `sum(greatest(g.tong,0))` mỗi nhóm; tỷ trọng % tính ở client = nhóm/tổng). OUT-parameter đổi nên **bắt buộc `drop function public.ton_theo_nhom(text, uuid)` rồi `create`**, thêm cột CUỐI danh sách để mapper cũ không vỡ; chép nguyên văn thân 0070 (giữ comment "định nghĩa chép từ 0067"), thêm lại `revoke/grant`. Cập nhật `supabase/tests/93_ton_theo_nhom_test.sql` (kiểm không còn đoạn so khớp cả dòng; thêm assert tổng SL = tổng từ `ton_kho`) và `toStockByGroupRow` trong `features/dashboard/types.ts`. Quyền vẫn là `vai_tro_hien_tai() = 'quan_ly'` ở 0070 — **0083 đã đổi sang `co_quyen('xem_dashboard')`**; bản drop/create phải lấy thân từ `pg_get_functiondef` của bản đang chạy (cách 0083 đã làm), không chép tay từ 0070.

**"Cần xử lý" không cần RPC riêng** — ghép client từ nguồn đã có để khỏi nhân đôi định nghĩa: dưới định mức = `Σ duoi_dinh_muc` và tồn âm = `Σ am` của `ton_theo_nhom('nhom', null)` (dữ liệu đã tải cho thẻ Tồn theo nhóm); xuất âm hôm nay = `bao_cao_xuat_am(hôm nay)`.length (hook `useNegativeStockReport`); phiếu chờ ghi sổ = `cho_ghi_so` từ `tong_quan_chi_so`. CTA: `buildCatalogDrilldownUrl`/`?ton=duoi_dinh_muc|am` (đã có ở `lib/stock-drilldown.ts`), `/nhap-kho` (lọc nháp), phiếu xuất âm → bảng Xuất âm trên cùng trang. "Tồn âm theo kho" chỉ làm nếu muốn tách (gọi `ton_theo_nhom` có `p_kho_id` từng kho) — mặc định gộp mọi kho.

#### 0094 Đơn đặt — 2 RPC
1. **`dem_don_theo_trang_thai(p_doi_tac_id, p_tu_ngay, p_den_ngay, p_tu_khoa, p_loai_nhan, p_nguoi_nhan_id)`** → `(trang_thai public.trang_thai_ddh, so_don bigint)` — SECURITY DEFINER giống `danh_sach_don` 0091 (`vai_tro_hien_tai() is null` → 42501; `don_dat_hang` đọc `using(true)`). Sao nguyên văn khối CTE `loc` của 0091 **trừ điều kiện `p_trang_thai`**; `group by trang_thai`. Trạng thái không có đơn vẫn phải trả 0 (left join từ `unnest(enum_range(null::public.trang_thai_ddh))`). Bốn giá trị enum hiện tại: `TAM, DA_XAC_NHAN, HOAN_THANH, DA_HUY` (0050). pgTAP **đối chiếu chéo**: với mỗi trạng thái, `so_don` = `tong_so_dong` của `danh_sach_don(p_trang_thai => s, ...)` cùng bộ lọc (mẫu test 93). Số "Tất cả" = tổng bốn trạng thái.
2. **`them_dong_don(p_don_id uuid, p_san_pham_id uuid, p_so_luong numeric, p_nguoi_nhan_id uuid default null)`** → `(id uuid, da_cong_don boolean, so_luong_dat numeric)` — **SECURITY INVOKER** để policy 0083 ("tao dong don dat hang": `co_quyen('tao_don')` + đơn đang `TAM`) vẫn là chốt chặn thật; không viết lại phân quyền.
   - Hiện trạng: `addOrderLine` ghi thẳng `from("don_dat_hang_dong").insert()` (`order.api.ts:112`); không có unique/upsert; trigger `_tu_them_nguoi_nhan_don` (0090) khóa `don_dat_hang … for update` khi dòng có người nhận.
   - Thân: `perform 1 from public.don_dat_hang where id = p_don_id and trang_thai='TAM' for update;` (điểm tuần tự hóa — hai lần gõ cùng mã đồng thời xếp hàng; policy update đơn `TAM` + `tao_don` áp dụng nên người không quyền không khóa được) → nếu không thấy hàng ném lỗi nghiệp vụ → `select id from don_dat_hang_dong where don_dat_hang_id=p_don_id and san_pham_id=p_san_pham_id and nguoi_nhan_id is not distinct from p_nguoi_nhan_id` (**`is not distinct from`** để dòng "hàng chung" null cộng dồn với null — D-03) → có thì `update … set so_luong_dat = so_luong_dat + p_so_luong` (bảng có `check (so_luong_dat > 0)`), không thì `insert` (không truyền `don_gia`). Nếu có >1 dòng trùng sẵn (dữ liệu cũ) cộng vào dòng đầu theo `created_at, id`.
   - **Không dùng unique index** để ép: dữ liệu hiện hữu có thể đã trùng mã → `create unique index` sẽ thất bại trên DB thật. Không kiểm "đã có dòng chưa" ở client rồi gọi update (race + hai lệnh rời — vi phạm CLAUDE.md "ghi atomic bằng RPC").
   - Client: thay `addOrderLine` bằng `rpc("them_dong_don")`; `use-order-line-actions.addLine` đọc `da_cong_don` để `message.info("Đã cộng thêm N vào dòng …")`. Sửa số lượng tại chỗ (`updateOrderLine`) và đổi người nhận dòng (`editRecipient`) giữ nguyên — đổi người nhận có thể tạo trùng, **ngoài phạm vi** (ghi vào Open Questions).

#### Chi tiết hàng hóa — không SQL mới
- Tồn theo kho: `fetchStockByWarehouse` (`product.api.ts:78`) đọc `ton_kho` + `kho(ten)`; bổ sung `ton_toi_thieu` từ chi tiết sản phẩm (đã có `product.minStock`). Giá trị = `quantity × gia_von`: gọi `rpc("gia_von_san_pham", { p_ids: [id] })` — hàm ném 42501 nếu không phải `quan_ly`/`van_phong` (0029). Gate ở client bằng `hasPermission(role, "view-analysis")` (CÙNG tập vai trò `quan_ly`,`van_phong`; chưa có `view-cost` trong `permissions.ts`) **cộng** `enabled` của query (bẫy 10) và `explainError` nếu 42501 — client không bao giờ nhận giá vốn khi không có quyền, vì RPC là chốt thật. Hiện **chưa có chỗ nào ở `src/` gọi `gia_von_san_pham`** (đã grep).
- Ngừng/Mở lại KD: `useBulkAssign()` → `rpc("gan_hang_loat", { ids:[id], change:{isActive}, source:"sua_o" })` — copy logic từ `product-row-actions.tsx:26-34`; quyền thật là `co_quyen('tao_ma_hang')` (0083). Sau thành công phải `invalidate` cả `productDetail` lẫn danh sách (hook đã làm).

### Recommended Project Structure
```
supabase/migrations/0092_tim_kiem_toan_cuc.sql
supabase/migrations/0093_tong_quan_3b.sql
supabase/migrations/0094_don_dat_dem_va_cong_don.sql
supabase/tests/110_tim_kiem_toan_cuc_test.sql
supabase/tests/111_tong_quan_3b_test.sql
supabase/tests/112_ton_theo_nhom_tong_sl_test.sql   # hoặc sửa 93
supabase/tests/113_don_dat_dem_cong_don_test.sql
src/features/global-search/{api,hooks,components,lib}/   # mới (feature riêng; shell import qua entry)
src/features/dashboard/components/{kpi-strip,sparkline,flow-chart,attention-panel,idle-products-card}.tsx
src/features/sales-order/components/{order-status-list,date-presets,order-progress,order-aside}.tsx
src/app/api/don-dat/xuat-excel/route.ts
src/features/sales-order/lib/order-workbook.server.ts
```
Số file test: thư mục dùng số tăng (… 107, 108, 109) → tiếp tục **110+**; không có `100_`/`101_` trùng nhau ngoài `30_*` (hai file cùng số 30 đã tồn tại → tên khác nhau là đủ).

### Pattern: Design-system swap (không sửa từng file)

**Tokens hiện tại (1A) → 3b** — chỉ đổi giá trị, giữ tên biến (cách quick 261004-f2l):

| Nơi | 1A hiện tại | 3b |
|---|---|---|
| `layout.tsx` font | `Be_Vietnam_Pro` weights 400–700 | `Manrope({ subsets:["latin","vietnamese"], weight:["400","500","600","700","800"], variable:"--font-app-sans", display:"swap" })`; `JetBrains_Mono` giữ |
| `antd-theme.ts` `colorBgLayout` | `#FAFAFA` | `#FFFFFF` (trang trắng); `Layout.bodyBg` cũng `#FFFFFF`; mặt phụ `#F5F5F5` dùng cho ô tìm/segmented/panel |
| `colorBorderSecondary` / `colorBorder` / `colorSplit` | `#EBEBEB` / `#E5E5E5` / `#F3F3F3` | thẻ `#EDEDED` / input `#E5E5E5` / kẻ `#F3F3F3` |
| `borderRadius` / `LG` / `SM` | 8 / 12 / 7 | input 10 → `borderRadius: 10`; `borderRadiusLG: 16` (thẻ, Modal, Card) |
| `Button` | `borderRadius: 9`, `fontWeight: 500` | `borderRadius: 9999, borderRadiusLG: 9999, borderRadiusSM: 9999`, `fontWeight: 600` |
| `Segmented` | `trackBg #FFF`, selected đen | track `#F5F5F5`, selected `#FFFFFF` chữ đen + `boxShadow`? (design: nền trắng chữ đen bóng nhẹ, bo 9/7) — `trackBg:"#F5F5F5", itemSelectedBg:"#FFFFFF", itemSelectedColor:INK, borderRadius:9, borderRadiusSM:7` |
| `Tag` | `borderRadiusSM: 6`, nền `#F3F3F3` | chip viên thuốc: `borderRadiusSM: 9999` |
| `globals.css` `--radius-the` | 12px | 16px; thêm `--color-nen-phu: #F5F5F5`, đổi `--color-nen-trang/-tong` → `#FFFFFF`, `--color-vien` → `#EDEDED`; `--color-canh-bao*`/`nguy-hiem` theo oklch design (`oklch(0.6 0.15 60)`, `oklch(0.55 0.2 27)`); `BADGE.pending` nền `oklch(0.97 0.035 75)` chữ `oklch(0.45 0.12 55)` |
| Trạng thái đơn | `StatusDot` badge/dot | `DA_XAC_NHAN`: nền `#F3F3F1` chữ `#404040` chấm xám; **`HOAN_THANH`: nền đen chữ trắng** → thêm tông/biến thể `solid` vào `status-dot.tsx` + `status-tone.ts`; `ORDER_STATUS_TONES` map lại (không đổi tông của chứng từ khác) |

**Token antd đã kiểm** (`node_modules/antd/es/button/style/token.d.ts`, `segmented/style/index.d.ts`): `Button` có `fontWeight`, `paddingInline*`, `defaultBorderColor`, `defaultHoverBorderColor`, `defaultShadow/primaryShadow/dangerShadow`…, **không có token bo góc riêng** — bo góc nút đi theo token alias `borderRadius/borderRadiusLG/borderRadiusSM` mà `components.Button` ghi đè được (theme hiện tại đã đặt `Button.borderRadius: 9` và build xanh; CSS nút đọc `borderRadius`, `borderRadiusSM`, `borderRadiusLG` — `button/style/index.js` dòng 136/181/192). `Segmented` có `trackBg, itemSelectedBg, itemSelectedColor, itemColor, itemHoverBg, trackPadding`. **MEDIUM:** `9999` làm nút ô vuông icon-only (`shape` mặc định) thành tròn — kiểm trực quan ở icon button; nếu ô tìm bảng/Select dùng `Button` kèm `Input.Search addonAfter` bị méo thì chỉ đặt pill cho `Button` ngoài `Space.Compact`.

Bẫy khi đổi token: (a) antd seed đen → giữ các bậc nhạt tường minh (`colorPrimaryBg*`, `colorInfoBg*`) như fix 26c13d7; (b) Be Vietnam Pro weight 700 → Manrope 800 cho tiêu đề (30px/−0.04em) — đặt ở `PageHeader`, không rải class; (c) chữ hoa tiêu đề cột bảng (`globals.css` `@layer components`) giữ; (d) `html lang="vi"` nên dấu hiển thị đúng với subset `vietnamese`; (e) nền trang trắng khiến thẻ (viền `#EDEDED`) mất tương phản — kiểm màn Danh mục/Nhập kho (nền cũ `#FAFAFA` chứa panel).

**Vỏ app 2 tầng** (`top-nav.tsx` 131 dòng, `nav-pill.tsx` 94, `use-nav-overflow.ts` 57, `app-shell.tsx` 41):
- Tầng 1 (60px): logo tròn "MV" 28px + "Kho Minh Vũ" 800 · `<GlobalSearchTrigger>` giữa (440×38, `bg-nen-phu`, `rounded-[10px]`, gợi ý `⌘ K`) · `AccountMenu` phải. Trên mobile ô tìm thu thành nút icon.
- Tầng 2 (~44px, `hidden lg:block`, `border-b border-vien`): **chuyển `containerRef`/`measureRef` của `useNavOverflow` xuống hàng này** (full width nên "Khác" hiếm khi cần, nhưng giữ). Mục tab: bỏ icon trong tab (design không có; icon giữ ở dropdown và thanh đáy), `PILL_CLASS` → `border-b-2 px-3 py-3 text-[13.5px]`; `pillTone(active)` → active `border-chu-chinh text-chu-chinh font-bold`, khác `border-transparent text-chu-phu font-semibold hover:text-chu-chinh`. Nhóm (Đơn hàng, Hàng hóa) vẫn `DropdownPill` + `▼`.
- **Đồng bộ hằng số** `ITEM_GAP`/`NAV_CHROME` trong `use-nav-overflow.ts` với class mới (comment ở đầu file nói rõ phải sửa cùng lúc) — nếu bỏ `gap-0.5`, đặt `ITEM_GAP = 0` và `NAV_CHROME = 0`; hàng đo ẩn dùng cùng `PILL_CLASS` nên tự khớp.
- `BottomTabBar`, `splitMobileItems`, `NAV_ITEMS` **không đổi** (UI3B-01 giữ mobile).
- `AppShell`: `Content` giữ `px-4 lg:px-6`; nội dung các trang tối đa-rộng theo design (không ép container).
- Header sticky nay cao ~104px: **antd `Table sticky` ở 6 file** (`order-table-body`, `product-table-body`, `receipt-table-body`, `issue-table-body`, `session-list`, `preview-table`) không đặt `offsetHeader` → tiêu đề cột đã bị header 60px che từ trước. Mặc định **không mở rộng phạm vi**; nếu muốn vá, thêm `HEADER_HEIGHT` hằng số dùng chung rồi `sticky={{ offsetHeader: HEADER_HEIGHT }}` (quyết định cho planner, 1 plan nhỏ cuối phase).

### Pattern: ⌘K palette (antd Modal, không thư viện)
- File mới trong `features/global-search/`: `useGlobalSearch.ts` (TanStack Query, `enabled: debounced.length >= 2`, `keepPreviousData`, `staleTime: 30_000`), `global-search-modal.tsx`, `lib/hrefs.ts` (thuần), `api/global-search.api.ts` (rpc `tim_kiem_toan_cuc` → mapper miền: `{kind, id, label, hint, status}`).
- **Debounce:** không có `useDebounce` trong repo (đã grep) → viết hook nhỏ `useDebouncedValue(value, 200)` ở `src/shared/hooks/` (hàm `useEffect+setTimeout` cho **giá trị UI**, không phải dữ liệu server — không vi phạm luật "không useEffect lấy dữ liệu").
- **Mở bằng phím:** `useEffect` gắn `keydown` trên `window`: `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"` → `e.preventDefault()` (chặn thanh địa chỉ Firefox/Chrome) → mở. Gắn ở client component trong `AppShell`/TopNav (đã client). Bẫy 13: công cụ kiểm thử có thể gửi `key === ""` — dùng `e.code === "KeyK"` làm nhánh dự phòng, và **đo `event.key` thật trước khi kết luận lỗi**.
- **Điều khiển bàn phím trong Modal:** một `<Input autoFocus>` + danh sách `role="listbox"` tự dựng; `activeIndex` state; `ArrowDown/ArrowUp` đổi chỉ số (wrap), `Enter` mở `activeIndex` (mặc định mục khớp tuyệt đối trước — bẫy 15 — rồi mục đầu), `Esc` do Modal tự đóng. Bắt phím ở `onKeyDown` của div bọc (không dùng `Select`/rc-select ⇒ **không dính bẫy 14** tranh focus; nếu sau này dùng `AutoComplete` thì bắt ở `onKeyDownCapture`). `afterOpenChange(open)` để focus input (antd Modal render nội dung lười — `autoFocus` đôi khi trượt; `destroyOnHidden` để reset ô tìm). **antd v6:** `destroyOnClose` đã đổi thành `destroyOnHidden`; `maskClosable` → `mask={{ closable }}` (bẫy 11); `centered={false}` với `style={{ top: 80 }}`.
- **Chọn kết quả:** `router.push(href)` rồi đóng modal; **cuộn `activeIndex` vào khung nhìn** (`scrollIntoView({ block:"nearest" })`). Nhóm kết quả theo `loai` với tiêu đề nhóm ("Mã hàng", "Phiếu", "Đơn đặt", "Đối tác").
- Trạng thái: rỗng (chưa gõ: gợi ý phím), loading (skeleton 3 dòng), không kết quả, lỗi + "Thử lại" (dùng `QueryState` hoặc bản gọn) — vẫn đủ bốn trạng thái theo CLAUDE.md.
- Xác thực: RLS lọc ở RPC; `chi_xem` vẫn tìm được (đọc). Không route mới → không thêm vào ma trận quyền route; ngoại lệ nếu thêm API.
- Bẫy 19: khi tab trình duyệt ẩn Suspense có thể trắng — nếu UAT bằng công cụ trình duyệt, kiểm `document.hidden`.

### Pattern: Xuất Excel đơn (UI3B-05)
Sao mẫu `src/app/api/danh-muc/xuat-excel/route.ts`: `getCurrentUser()` → 401 JSON `{title, action}`; `createSupabaseServerClient()` (mỗi request); đọc bộ lọc từ URL (`/don-dat?q=&trang_thai=&nguoi_nhan=&nhan_vien=&doi_tac=&tu_ngay=&den_ngay=` — thêm `readOrderFilterFromUrl` thuần nếu chưa có hàm tương đương trong `order.schema.ts`); gọi `danh_sach_don` **theo trang 200** (RPC kẹp `least(…,200)`) bằng `fetchAllPages(..., 200)` (đã có `src/shared/lib/fetch-all-pages.ts`, file thuần) với `MAX_EXPORT_ROWS = 2000` → vượt thì 422 `{title, action: "lọc hẹp lại"}`. `export const runtime = "nodejs"`; tên file `don-dat-YYYYMMDD-HHmm.xlsx` theo giờ VN (copy `tenFile()`); builder exceljs mới `order-workbook.server.ts`: Số đơn · Ngày đơn · Loại (Nội bộ/Đối tác) · Người nhận · SL đặt · SL đã xuất · Tiến độ % · Trạng thái (nhãn VN) · Người tạo · Ghi chú. Nút "Xuất Excel" ở đầu trang chỉ là `<a href="/api/don-dat/xuat-excel?…" download>` (như `excel-button.tsx`). Thêm 1 dòng vào ma trận `scripts/test-route-permissions.ts` cho `/api/don-dat/xuat-excel` (khách 401; còn lại 200) — đúng chỗ dòng 94/96 làm cho `mau-excel`.

### Pattern: Danh sách đơn đặt
- **Số đếm**: hook `useOrderStatusCounts(filterSansStatus)` — key `orderKeys.statusCounts(filter)` **không chứa `status`/`page`**, nên đổi trạng thái không refetch; `keepPreviousData` để số không nháy.
- **Preset ngày**: client-only, `lib/date-presets.ts` (thuần, trả `{fromDate,toDate}` dạng `YYYY-MM-DD`): 7N = hôm nay−6…hôm nay; 30N = −29…hôm nay; Tháng = đầu tháng…hôm nay; Tùy = mở RangePicker. Tính theo múi giờ VN (Vercel chạy UTC — dùng `Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Ho_Chi_Minh"})` như `tenFile()`); highlight preset nào khớp bộ lọc hiện tại bằng so sánh chuỗi. Hàm thuần → thêm assert vào `scripts/test-pure-functions.ts`.
- **Tiến độ**: dữ liệu có sẵn (`tong_so_luong_da_xuat` / `tong_so_luong_dat`) — thanh `div` 2 lớp, không `Progress` của antd (nặng, khó tùy). Đơn không có dòng → "—".
- Panel lọc dùng danh sách trạng thái dạng nút (chấm màu theo `ORDER_STATUS_TONES` + số đếm) thay `Select` (bẫy 4/11: không còn option `null`). Loại người nhận dạng `Segmented` với nhãn hệ thống "Đối tác" (không "Khách").
- Số kết quả "8 đơn" = `tong_so_dong` của dòng đầu (`danh_sach_don` đã trả `tong_so_dong`).

### Anti-Patterns to Avoid
- Tính giá trị tồn ở JS từ `ton_kho` + `gia_von` — `gia_von` bị thu quyền cột; chỉ RPC definer đọc được.
- Hai RPC cùng định nghĩa "dưới định mức"/"tồn âm" (drift) — dùng lại `ton_theo_nhom`.
- Cộng dồn dòng đơn bằng "select rồi update" ở client (race, hai lệnh).
- Bọc điều kiện quanh `InputNumber`/ô nhập (bẫy 20) khi dựng hàng nhập dòng trong layout mới — luôn bọc wrapper và chỉ đổi prop.
- Dùng `select("*")`/`select()` trống trên `san_pham`/`kho_movement` ở bất kỳ truy vấn mới nào (bẫy 5).
- Đổi tên biến Tailwind (`brand-*`, `trung-tinh-*`, `nen-the`…) — mọi class cũ vỡ; chỉ đổi giá trị.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Lọc không dấu phía DB | `lower()`/`translate()` | `public.f_unaccent()` + ILIKE (0001/0022) | khớp index GIN trigram |
| Lọc không dấu `Select` client | `optionFilterProp` | `filterByLabel` (`@/shared/lib/text`) — bẫy 21 | |
| Kiểm quyền dashboard | JS role check | `co_quyen('xem_dashboard')` (0083) | phân quyền ở DB, hiệu lực ngay |
| Quyền xem giá vốn | claim JWT | `co_quyen_xem_gia_von()` / `gia_von_san_pham` | giá vốn bị thu ở 0029 |
| Phân trang lấy hết | vòng for tự viết | `fetchAllPages` | đã có, đã test |
| Drill-down URL danh mục | ghép chuỗi | `buildCatalogDrilldownUrl` / `writeFilterToUrl` | luật của `stock-drilldown.ts` |
| Đổi lỗi thành thông báo | `message.error(e.message)` | `explainError` + `laLoiPostgrest`/`maLoi` (bẫy 8: lỗi PostgREST không phải `instanceof`) | |
| Trạng thái chip | Tag màu | `StatusDot` (mở rộng biến thể `solid`) | một nguồn tông |
| Command palette | thư viện | antd Modal + danh sách tự dựng | đã chốt |

**Key insight:** mọi thứ "khó" (quyền, định nghĩa trạng thái tồn, giá vốn, lọc đơn) đã có một nguồn sự thật trong DB; phase này chỉ nên **gọi lại** chứ không định nghĩa lại.

## Common Pitfalls

### P1: Tên cột OUT trùng tên cột bảng → 42702 chỉ lộ lúc GỌI
**Làm sai:** `returns table (ngay date, …)` rồi `select ngay …` trong thân. **Tránh:** tiền tố `d_` trong CTE, `v.` ở select cuối (mẫu `nhip_ban` 0071). **Dấu hiệu:** pgTAP gọi hàm lỗi `column reference "ngay" is ambiguous`. Hàm nào cũng phải có ít nhất một test GỌI thật.

### P2: pgTAP neo vào dữ liệu sống / "hôm nay"
Các RPC Tổng quan phụ thuộc ngày hiện tại và tồn thật. **Tránh:** mọi RPC nhận `p_ngay`; fixture dùng năm không ai chạm (2091–2093, mã `ZQX-…`, `so_ct 'ZQX-…'`, như test 94); với số tuyệt đối phụ thuộc dữ liệu thật (Giá trị tồn, mã KD) thì **so tương đối** (đếm trước/sau khi chèn fixture, hoặc đối chiếu với truy vấn thô trong cùng test) — bẫy 16.

### P3: Nhầm hai hàm kiểm giá vốn / hai kiểu quyền
`co_quyen_xem_gia_von()` theo **vai trò** (`quan_ly`,`van_phong`), còn `xem_dashboard` theo **chức vụ** (`co_quyen`). Người có `xem_dashboard` nhưng là thủ kho phải thấy "Tổng SL tồn" (D-04) — test cả hai nhánh (`xem_gia_von=false` ⇒ `gia_tri_ton is null`).

### P4: `danh_sach_don` trần 200 dòng/trang; PostgREST `max_rows` 1000
Xuất Excel phải lặp trang. Bất kỳ RPC trả tập dòng nào mới phải có `ORDER BY` ổn định nếu phân trang.

### P5: Đổi `ton_theo_nhom` làm vỡ test 93 và mapper
Phải DROP/CREATE (đổi cột trả về), lấy thân từ `pg_get_functiondef` (0083 đã đổi quyền). Cập nhật `types.ts` mapper + test 93 trong cùng plan; chạy `npm run db:types` sau migration.

### P6: Cuộn/ẩn khi gõ ⌘K trong ô nhập khác
Phím tắt toàn cục không được kích hoạt khi người dùng đang gõ trong `input/textarea` **ngoại trừ** chính tổ hợp ⌘K (vì ⌘K có modifier nên an toàn); nhưng **không** gắn phím đơn (`/`) toàn cục — sẽ nuốt ký tự khi nhập mã hàng (luồng nhập kho gõ liên tục).

### P7: Sparkline/Recharts và SSR
`ResponsiveContainer` cần cha có chiều cao xác định; file có Recharts phải `"use client"` (bẫy 1/9). Sparkline SVG thuần để tránh đo kích thước; đặt `viewBox="0 0 80 28" preserveAspectRatio="none"`.

### P8: Mã KD "+N tháng này" sai nếu import hàng loạt
`created_at` của 3.266 mã nạp một ngày → tháng go-live sẽ hiện "+3266". Giới hạn: tính `created_at >= date_trunc('month', p_ngay)` và đặt `greatest(…)`? Không — chỉ **ghi chú** và cho UI ẩn "+N" khi N > 50% tổng (hoặc để như vậy cho tới tháng sau). Báo planner khi UAT trên DB local đã nạp.

### P9: Nền trắng + thẻ viền mảnh làm mất phân tầng
Các trang đang dựa vào nền `#FAFAFA` (panel lọc, hàng nhập dòng `bg-nen-tong`). Sau khi đổi `--color-nen-tong` về trắng, hàng nhập dòng cần `bg-nen-phu` (`#F5F5F5`) hoặc viền rõ hơn.

### P10: Header 2 tầng + `useNavOverflow`
Đổi `containerRef` sang hàng tầng 2 mà quên đổi `ITEM_GAP`/`NAV_CHROME` ⇒ "Khác" xuất hiện sớm hoặc chữ xuống dòng. Kiểm ở 1024/1280/1440px.

## Code Examples

### RPC Tổng quan — khung (mẫu 0071 + 0083)
```sql
-- Source: supabase/migrations/0071_nhip_ban.sql, 0083_quyen_chuc_vu.sql (mẫu quyền)
create or replace function public.nhap_xuat_theo_ngay(
  p_so_ngay int,
  p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date
)
returns table (ngay date, so_phieu_nhap bigint, so_phieu_xuat bigint, sl_nhap numeric, sl_xuat numeric)
language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay not in (7, 30, 90) then
    raise exception 'p_so_ngay chỉ nhận 7, 30 hoặc 90' using errcode = '22023';
  end if;
  return query
  select v.ngay, v.so_phieu_nhap, v.so_phieu_xuat, v.sl_nhap, v.sl_xuat
  from (
    with khung as (
      select g::date as d_ngay
      from generate_series(p_ngay - (p_so_ngay - 1), p_ngay, interval '1 day') g
    ), dem as (
      select ct.ngay_ct as d_ngay,
             count(*) filter (where ct.loai_ct = 'NHAP') as d_nhap,
             count(*) filter (where ct.loai_ct = 'XUAT') as d_xuat,
             coalesce(sum(ct.tong_so_luong) filter (where ct.loai_ct = 'NHAP'), 0) as d_sl_nhap,
             coalesce(sum(ct.tong_so_luong) filter (where ct.loai_ct = 'XUAT'), 0) as d_sl_xuat
      from public.chung_tu ct
      where ct.loai_ct in ('NHAP', 'XUAT') and ct.trang_thai = 'HOAN_THANH'
        and ct.ngay_ct between p_ngay - (p_so_ngay - 1) and p_ngay
      group by ct.ngay_ct
    )
    select k.d_ngay as ngay, coalesce(d.d_nhap, 0) as so_phieu_nhap, coalesce(d.d_xuat, 0) as so_phieu_xuat,
           coalesce(d.d_sl_nhap, 0) as sl_nhap, coalesce(d.d_sl_xuat, 0) as sl_xuat
    from khung k left join dem d on d.d_ngay = k.d_ngay
  ) v
  order by v.ngay asc;
end;
$function$;
revoke all on function public.nhap_xuat_theo_ngay(int, date) from public, anon;
grant execute on function public.nhap_xuat_theo_ngay(int, date) to authenticated;
```
(`chung_tu.tong_so_luong` có sẵn ở 0007; nếu planner muốn SL theo dòng thì join `chung_tu_dong` như `nhip_ban`.)

### Giá trị tồn có kiểm quyền giá vốn
```sql
-- Source: định nghĩa chốt trong research; gia_von chỉ đọc được trong hàm definer (0029)
with ton as (
  select tk.san_pham_id, greatest(sum(tk.so_luong), 0) as ton_duong
  from public.ton_kho tk group by tk.san_pham_id
)
select sum(t.ton_duong) as tong_sl_ton,
       case when public.co_quyen_xem_gia_von() then sum(t.ton_duong * sp.gia_von) end as gia_tri_ton
from ton t join public.san_pham sp on sp.id = t.san_pham_id;
```

### Cộng dồn dòng đơn (atomic, invoker)
```sql
-- Source: mẫu từ 0090 (_tu_them_nguoi_nhan_don khóa đơn FOR UPDATE)
create or replace function public.them_dong_don(
  p_don_id uuid, p_san_pham_id uuid, p_so_luong numeric, p_nguoi_nhan_id uuid default null)
returns table (id uuid, da_cong_don boolean, so_luong_dat numeric)
language plpgsql security invoker set search_path to '' as $$
declare v_dong uuid;
begin
  if p_so_luong is null or p_so_luong <= 0 then
    raise exception 'Số lượng phải lớn hơn 0' using errcode = '22023';
  end if;
  perform 1 from public.don_dat_hang d where d.id = p_don_id and d.trang_thai = 'TAM' for update;
  if not found then
    raise exception 'Đơn không còn ở trạng thái nháp hoặc bạn không có quyền sửa' using errcode = '42501';
  end if;
  select dd.id into v_dong from public.don_dat_hang_dong dd
   where dd.don_dat_hang_id = p_don_id and dd.san_pham_id = p_san_pham_id
     and dd.nguoi_nhan_id is not distinct from p_nguoi_nhan_id
   order by dd.created_at, dd.id limit 1 for update;
  if v_dong is not null then
    return query update public.don_dat_hang_dong dd set so_luong_dat = dd.so_luong_dat + p_so_luong
                 where dd.id = v_dong returning dd.id, true, dd.so_luong_dat;
  else
    return query insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id)
                 values (p_don_id, p_san_pham_id, p_so_luong, p_nguoi_nhan_id)
                 returning don_dat_hang_dong.id, false, don_dat_hang_dong.so_luong_dat;
  end if;
end $$;
```
(Tên OUT `id`, `so_luong_dat` trùng cột — lúc viết thật phải đổi tên OUT hoặc tiền tố đầy đủ; đây là minh họa. Policy "sua dong don dat hang" cần `co_quyen('tao_don')` + đơn `TAM` nên `update` bằng invoker đã bị chặn đúng chỗ.)

### SVG sparkline thuần
```tsx
// Source: tự dựng — không thêm thư viện (Claude's Discretion)
export function Sparkline({ values, tone = "#0A0A0A" }: { values: number[]; tone?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 80},${26 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg width={80} height={28} viewBox="0 0 80 28" aria-hidden>
      <polyline points={pts} fill="none" stroke={tone} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
```

### Phím tắt ⌘K (bẫy 13)
```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const isK = e.key?.toLowerCase() === "k" || e.code === "KeyK";
    if ((e.metaKey || e.ctrlKey) && isK) { e.preventDefault(); setOpen(true); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

## State of the Art

| Cũ | Hiện tại | Ghi chú |
|---|---|---|
| antd v5 `destroyOnClose`, `maskClosable`, `Drawer width` | v6 `destroyOnHidden`, `mask={{closable}}`, `size` | bẫy 11 — mở console sau khi làm UI |
| Be Vietnam Pro 400–700 (1A) | Manrope 400–800 (3b) | subset `vietnamese` có |
| `middleware.ts` | `proxy.ts` | bẫy 3 — không đổi |

## Runtime State Inventory
Không áp dụng — đây là đổi giá trị token + thêm tính năng, không đổi tên/di chuyển chuỗi. Dữ liệu lưu: không có; cấu hình dịch vụ: không; OS: không; secrets: không (không biến môi trường mới → không cập nhật `.env.example`); build artifacts: `src/types/database.types.ts` phải sinh lại (`npm run db:types`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node | npm scripts, tsx | ✓ | v24.19.0 | — |
| Docker + Supabase local (`supabase_db_rnpqgbuypmecxiatuulz`) | pgTAP, migration thử | ✓ (container đang chạy) | — | — |
| Supabase CLI (`npx supabase`) | `db:test`, `db:types` | ✓ | (có cảnh báo nên cập nhật) | — |
| Cloud Supabase | áp migration | không dùng | — | **hỏi người dùng** trước khi áp; cloud lệch lịch sử 0072–0075 (memory) |

Lưu ý chạy test local một file: `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/<file>.sql` (env có `SUPABASE_PROJECT_ID` khác → CLI tìm nhầm container). **Không** dùng `npm run db:test` nếu chỉ chạy một file (nó `db reset`, xóa dữ liệu local). pgTAP cần tài khoản mẫu: `npm run seed:users`.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | pgTAP (DB) · `node:assert` qua `tsx` (hàm thuần) · HTTP script (quyền route) · `npm run check` · UAT trình duyệt |
| Config | `supabase/tests/*.sql` (số tăng dần, mới từ **110**); `scripts/test-pure-functions.ts`; `scripts/test-route-permissions.ts` |
| Quick run | `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/<file>.sql` · `npx tsx scripts/test-pure-functions.ts` · `npm run typecheck` |
| Full suite | `npm run check` + `npm run db:test` (reset local) + `npx tsx scripts/test-route-permissions.ts` (cần `npm run dev`) |

### Phase Requirements → Test Map
| Req | Behavior | Type | Command | File |
|---|---|---|---|---|
| UI3B-02 | `tim_kiem_toan_cuc`: khớp mã (tuyệt đối trước), so_ct, so_dh, đối tác; không dấu; thủ kho không thấy chứng từ kho khác; `chi_xem` đọc được; không lộ `gia_von` (hàm không chọn cột đó) | pgTAP | `…supabase test db supabase/tests/110_tim_kiem_toan_cuc_test.sql` | ❌ Wave 0 |
| UI3B-03 | `tong_quan_chi_so`: 42501 khi không `xem_dashboard`; `gia_tri_ton is null` khi vai trò không có giá vốn; `tong_sl_ton` khớp `sum(greatest(...))` truy vấn thô; `cho_ghi_so`/`cu_nhat_ngay` đúng fixture 2092; `nhap_xuat_theo_ngay`: 7/30/90 trả đúng số dòng, ngày trống = 0, `p_so_ngay=15` → 22023, chỉ HOAN_THANH | pgTAP | `…111_tong_quan_3b_test.sql` | ❌ Wave 0 |
| UI3B-04 | `ton_theo_nhom` có `tong_so_luong` khớp `ton_kho`; `khong_luan_chuyen` dùng `lan_phat_sinh_cuoi` đặt tay trong fixture, loại mã tồn ≤ 0 và ngừng KD | pgTAP | `…93_ton_theo_nhom_test.sql` (sửa) + `…111…` | ✅ sửa / ❌ |
| UI3B-05 | `dem_don_theo_trang_thai` khớp chéo `danh_sach_don.tong_so_dong` với cùng bộ lọc (4 trạng thái, có/không lọc loại/ngày/người nhận); preset ngày + tiến độ % hàm thuần | pgTAP + tsx | `…113_don_dat_dem_cong_don_test.sql`; `npx tsx scripts/test-pure-functions.ts` | ❌ Wave 0 |
| UI3B-05 | `/api/don-dat/xuat-excel` khách 401, 4 vai trò 200 | HTTP | `npx tsx scripts/test-route-permissions.ts` | ✅ thêm dòng |
| UI3B-06 | `them_dong_don`: mã mới → insert; cùng mã+cùng người nhận → cộng dồn; khác người nhận → tách; null + null → cộng dồn; đơn không `TAM` → lỗi; vai trò không `tao_don` → bị RLS chặn; hai lần gọi nối tiếp cho tổng đúng; (tùy) test 2 kết nối kiểu `test:concurrency` | pgTAP | `…113…` | ❌ Wave 0 |
| UI3B-07 | `gia_von_san_pham` 42501 với thủ kho/chỉ xem (đã có ở test 90) — thêm assertion bảng tồn theo kho không đọc `gia_von` trực tiếp | pgTAP | `…90_gia_von_test.sql` | ✅ |
| UI3B-01..07 | UI: 4 trạng thái, console sạch, mobile 375px, ⌘K, bàn phím luồng nhập dòng | Thủ công (browser) | `npm run dev` rồi mở từng màn; kiểm console (bẫy 11, 13, 19) | manual-only: giao diện/focus không tự động hóa được |
| All | typecheck + lint + build | static | `npm run check` | ✅ |

Mọi test pgTAP viết `begin; select plan(N); … select * from finish(); rollback;` với helper `pg_temp.dang_nhap_nhu('<email>')` (sao khối đầu `94_nhip_ban_test.sql`; email tài khoản mẫu lấy từ `scripts/` seed).

### Sampling Rate
- **Mỗi commit:** pgTAP của file vừa đổi + `npm run typecheck`.
- **Mỗi wave:** `npm run check` + pgTAP của cả wave + `npx tsx scripts/test-pure-functions.ts`.
- **Phase gate:** `npm run db:test` (local, reset) xanh + `test-route-permissions.ts` xanh + UAT trình duyệt trước `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/110_tim_kiem_toan_cuc_test.sql`, `111_tong_quan_3b_test.sql`, `113_don_dat_dem_cong_don_test.sql` (+ cập nhật `93_ton_theo_nhom_test.sql`)
- [ ] Mở rộng `scripts/test-pure-functions.ts`: `date-presets`, `order-progress`, `hrefs` của tìm kiếm toàn cục, mapper `toStockByGroupRow`/KPI
- [ ] Thêm dòng `/api/don-dat/xuat-excel` vào `scripts/test-route-permissions.ts` (và `/` đã có)
- [ ] `npm run db:types` sau mỗi migration

## Risks & Recommended Plan Split (waves)

**Rủi ro chính:** (R1) giá trị tồn quá khứ là xấp xỉ — phải nói rõ trên UI; (R2) `lan_phat_sinh_cuoi` bị reset bởi nạp tồn/kiểm kê; (R3) `ton_theo_nhom` drop/create phá test 93 và mapper nếu quên; (R4) đổi token toàn app dễ lệch trực quan nhiều màn — chỉ kiểm bằng mắt; (R5) tab trình duyệt ẩn khiến UAT thấy trắng (bẫy 19); (R6) cloud lệch migration — chỉ áp local; (R7) nút pill 9999 làm méo `Input.Search`/`Space.Compact`; (R8) sticky header 104px che tiêu đề bảng (có từ trước).

| Wave | Plan | File chính (≤3–5) | Phụ thuộc |
|---|---|---|---|
| **1 — DB** (song song được) | 20-01 Tìm kiếm toàn cục SQL + pgTAP 110 | `0092`, `110_*.sql` | — |
| | 20-02 RPC Tổng quan (+ sửa `ton_theo_nhom`) + pgTAP 111/93 | `0093`, `111_*.sql`, `93_*.sql` | — |
| | 20-03 RPC đơn đặt (đếm + cộng dồn) + pgTAP 113 | `0094`, `113_*.sql` | — |
| | 20-04 `db:types` + api/types/keys/mapper cho 3 feature | `database.types.ts` (sinh), `dashboard.api.ts/types.ts`, `order.api.ts`, `global-search.api.ts` | 20-01..03 |
| **2 — Shell/token** | 20-05 Token 3b (font Manrope, `antd-theme.ts`, `globals.css`, `status-dot`/`status-tone`) | 4–5 file | — |
| | 20-06 Header 2 tầng + underline tabs + `useNavOverflow` | `top-nav.tsx`, `nav-pill.tsx`, `use-nav-overflow.ts`, `app-shell.tsx`, `account-menu.tsx` | 20-05 |
| | 20-07 ⌘K palette | `features/global-search/*` (4–5 file) + gắn vào `top-nav.tsx` | 20-04, 20-06 |
| **3 — Màn hình** (song song theo màn) | 20-08 Tổng quan: KPI strip + Sparkline + Nhập–Xuất | `dashboard-view.tsx`, `kpi-strip.tsx`, `sparkline.tsx`, `flow-chart.tsx`, hooks | 20-04, 20-05 |
| | 20-09 Tổng quan: Tồn theo nhóm (SL/%) + Cần xử lý + Không luân chuyển + bố cục `1fr 300px` giữ Nhịp bán/Xuất âm | `stock-by-group-*.tsx`, `attention-panel.tsx`, `idle-products-card.tsx` | 20-08 |
| | 20-10 Danh sách đơn: đếm, preset, Tiến độ, Xuất Excel | `order-filter-panel.tsx`, `order-table-body.tsx`, `order-toolbar.tsx`, `date-presets.ts`, `route.ts` + `order-workbook.server.ts` | 20-04, 20-05 |
| | 20-11 Chi tiết đơn 2 cột + cộng dồn | `order-detail.tsx`, `order-header.tsx`→aside, `order-line-table.tsx`, `use-order-line-actions.ts`, `order-actions.tsx` | 20-04, 20-05 |
| | 20-12 Chi tiết hàng: badge, Ngừng/Mở lại KD, bảng Tồn theo kho, ảnh aside | `product-detail.tsx`, `warehouse-stock.tsx`, `product-image-gallery.tsx` (qua `imagesSection`), `app/(app)/danh-muc/[id]/page.tsx` | 20-05 |
| **4 — Chốt** | 20-13 Pure-function tests + `test-route-permissions` + UAT trình duyệt (desktop 1440/1024, mobile 375) + (tùy) vá `offsetHeader` | scripts + `20-UAT.md` | tất cả |

Luật tách từng plan: không plan nào vừa sửa token vừa sửa màn; plan Tổng quan cắt đôi để mỗi plan không vượt ~200 dòng/component và ≤ 5 file. Hình ảnh: `ProductImageGallery` là feature riêng (`features/images`); layout aside ghép ở **route** (`imagesSection`) — không cho `products` import `images` (luật `src/features/README.md`); cần thêm prop/biến thể "aside" cho gallery thay vì sao chép.

## Open Questions

1. **"Không luân chuyển > 30 ngày" nên đo bằng `lan_phat_sinh_cuoi` hay bằng lần XUAT cuối?**
   - Biết: `lan_phat_sinh_cuoi` bị đặt lại ở mọi bút toán (0008 bước 4), gồm nạp tồn tạm/kiểm kê.
   - Chưa rõ: người dùng muốn "không bán" hay "không có biến động".
   - Khuyến nghị: làm theo CONTEXT (`lan_phat_sinh_cuoi`), ghi caveat trong comment hàm; nếu UAT thấy danh sách rỗng bất thường, đổi sang `max(kho_movement.ngay)` lọc `ct.loai_ct='XUAT'`.
2. **Mã hạch toán KIEM_KE nháp có nằm trong "Phiếu chờ ghi sổ" không?** — kiểm `chung_tu` có dòng `loai_ct='KIEM_KE' and trang_thai='NHAP_LIEU'` (0065/0066); khuyến nghị loại trừ vì duyệt kiểm kê là luồng khác.
3. **Chứng từ CHUYEN_KHO/DIEU_CHINH mở trang nào từ ⌘K?** — chưa thấy route chi tiết riêng; khuyến nghị bỏ khỏi kết quả nếu không có trang.
4. **Đổi người nhận dòng đơn (`editRecipient`) có thể tạo dòng trùng mã+người nhận.** D-03 chỉ nói gõ lại mã; khuyến nghị để ngoài phạm vi (ghi nhận), không chặn.
5. **Sticky header 104px che tiêu đề bảng** (sẵn có từ 60px) — vá trong phase này hay để sau? Khuyến nghị: để sau trừ khi thấy ở UAT.
6. **Biểu đồ Nhập–Xuất vẽ số phiếu hay số lượng?** Khuyến nghị số phiếu (khớp KPI); SL ở tooltip.
7. **`.env.local` đang trỏ local (127.0.0.1) hay cloud rnpq?** CONTEXT nói cloud; file thật hiện local. Xác nhận trước UAT.

## Sources

### Primary (HIGH)
- Repo: `supabase/migrations/0007, 0008, 0015, 0016, 0022, 0029, 0032, 0050, 0054, 0070, 0071, 0082, 0083, 0090, 0091`; `supabase/tests/94_nhip_ban_test.sql` (mẫu pgTAP); `src/providers/antd-theme.ts`; `src/app/globals.css`; `src/app/layout.tsx`; `src/shared/components/{app-shell,top-nav,nav-pill,use-nav-overflow,status-dot}.tsx`; `src/shared/lib/{navigation,permissions,status-tone,fetch-all-pages,text}.ts`; `src/features/{dashboard,sales-order,products}/**`; `src/app/api/danh-muc/xuat-excel/route.ts`; `scripts/test-route-permissions.ts`; `.planning/quick/261004-f2l-*/SUMMARY`; `CLAUDE.md`.
- `node_modules/antd/es/button/style/token.d.ts`, `button/style/index.js`, `segmented/style/index.d.ts` — token có thật (antd 6.6.3).
- `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` — Manrope subsets gồm `vietnamese`, weights 200–800.

### Secondary (MEDIUM)
- Hiệu năng RPC (khối lượng sổ cái ~15k dòng/tháng) suy từ `CLAUDE.md` (92 phiếu/ngày × 5,1 dòng) — chưa đo.
- `Button` bo `9999` qua alias token `borderRadius*` — suy từ CSS + theme hiện chạy; cần xác nhận bằng mắt.

### Tertiary (LOW)
- Không có (không dùng WebSearch — toàn bộ từ mã nguồn).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version đọc từ `node_modules`, không thêm thư viện.
- SQL/permission: HIGH — đọc migration thật; công thức giá trị tồn tháng trước là xấp xỉ có chủ đích (đã ghi).
- Architecture/design mechanics: MEDIUM — token pill và 2-tầng nav cần xác nhận trực quan.
- Pitfalls: HIGH — phần lớn trích từ CLAUDE.md và mã đã đọc.

**Research date:** 2026-10-04
**Valid until:** 2026-11-03 (ổn định; hết hạn sớm nếu migration 0085+ hoặc antd nâng bản)
