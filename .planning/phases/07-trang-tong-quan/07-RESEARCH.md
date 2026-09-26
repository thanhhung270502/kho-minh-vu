# Phase 7: Trang tổng quan - Research

**Researched:** 2026-09-26
**Domain:** Postgres/Supabase RPC design (running-balance analytics, group aggregation matching an existing filtered list), Next.js role-gated route, Ant Design v6 dashboard cards/tabs
**Confidence:** HIGH (schema/RPC facts are read directly from live migrations 0001-0067; UI patterns read directly from existing components). MEDIUM on exact running-balance query shape and performance projection (no query plan run against real data in this session).

## Summary

Phase 7 replaces the `NotImplemented` stub at `/` with a manager-only dashboard covering
three narrow, already-scoped blocks (D-13 order: nhịp bán → xuất âm → tồn theo nhóm/công
đoạn). All three blocks can be built as **read-only `SECURITY DEFINER` RPCs** that copy
proven patterns already in the codebase — there is nothing architecturally new here, which
is good, but three details are easy to get subtly wrong and must be locked down before
planning:

1. **"Mã bị âm" (D-01) is not a stored fact anywhere.** `kho_movement` has no running-balance
   column. The only place a "tồn sau" is ever computed is transiently inside the
   `ghi_so_chung_tu` PL/pgSQL loop (to decide whether to demand a lý do), and it is never
   persisted. The report must **recompute** the running balance per `(kho_id, san_pham_id)`
   using the exact window-function technique already shipped in migration `0059`/`0062`
   (`the_kho_san_pham` cumulative column), ordered by `(created_at, id)` — not by `ngay`,
   which ties at midnight for every row of the same `ngay_ct`. This is a proven, already-
   validated pattern in this codebase, not a new invention.
2. **"Dưới định mức" changed definition on 2026-09-24 (migration `0067`).** It is no longer
   `tổng tồn < ton_toi_thieu`; it is now `ton_toi_thieu > 0 AND tổng tồn < ton_toi_thieu`
   (mã chưa đặt định mức, default 0, is never "dưới định mức" even if âm). Any dashboard
   counts for `duoi_dinh_muc` MUST copy this exact condition or D-08's "bấm số → khớp đúng
   số dòng ở /ton-kho" will fail on day one.
3. **`/ton-kho` defaults to `p_dang_kinh_doanh = true`** (chỉ mã đang kinh doanh). The
   dashboard's tồn-theo-nhóm/công-đoạn RPC must default the same way, and the drill-down
   link must NOT set `?kinh_doanh=` (so it falls back to the same default) — otherwise the
   dashboard count and the `/ton-kho` row count will disagree the moment there is any
   ngừng-kinh-doanh mã in a group.

No new tables, no new columns, no schema migration risk beyond three new `SECURITY DEFINER`
functions + revoke/grant + pgTAP. Frontend is entirely new (`src/features/dashboard/`) but
every UI primitive it needs (`QueryState`, `PageHeader`, `Statistic`, `Tabs`, URL-filter
builder pattern) already exists and is used elsewhere in the codebase.

**Primary recommendation:** Three separate RPCs (`bao_cao_xuat_am`, `ton_theo_nhom`,
`nhip_ban`), each `SECURITY DEFINER`, each re-checking `vai_tro_hien_tai() = 'quan_ly'`
inline (D-12), all in one migration `0068_trang_tong_quan.sql`. `ton_theo_nhom` takes a
`p_theo` discriminator (`'nhom'` | `'cong_doan'`) rather than being two functions, because
both tabs share an identical filter/aggregation shape and only the grouping column differs
— duplicating the whole CTE twice is a real drift risk given how easily `/ton-kho`'s status
definitions already drifted once (0067).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Xác định mã/dòng bị xuất âm (running balance) | Database (RPC, `SECURITY DEFINER`) | — | Cần đọc toàn bộ lịch sử `kho_movement` với window function; không thể tính đúng ở client, và tính ở API/backend tier không tồn tại trong stack này (không có server nào ngoài Postgres RPC + Next.js) |
| Đếm mã theo nhóm/công đoạn theo trạng thái tồn | Database (RPC) | — | Phải khớp tuyệt đối định nghĩa trạng thái của `danh_sach_ton_kho` (0058/0067); trùng lặp logic ở hai tầng là nguồn lệch số |
| Đếm phiếu/dòng/mã xuất hôm nay-hôm qua | Database (RPC) | — | Đơn giản, một lượt quét theo index `idx_chung_tu_loai_ngay` |
| Vai trò → điều hướng trang chủ | Frontend Server (Next.js Server Component `page.tsx`) | Database (RPC tự kiểm lại, D-12) | UI ẩn/hiện là tiện lợi, chặn thật ở RPC — đúng nguyên tắc "RLS/database, không phải giao diện" đã quán triệt toàn dự án |
| Bấm số → mở `/ton-kho` lọc sẵn | Browser / Client | — | Chỉ là dựng `URLSearchParams` giống hệt `writeInventoryFilterToUrl`, không có logic nghiệp vụ mới |
| Hiển thị thẻ/bảng, "Làm mới" thủ công | Browser / Client (React + TanStack Query) | — | `refetch()` gọi lại ba query, không polling/không Realtime (D-14) |

## Standard Stack

Không thêm thư viện nào. Toàn bộ dựng trên stack đã chốt:

| Layer | Dùng gì | Ghi chú |
|---|---|---|
| Data | Postgres RPC (`plpgsql`, `SECURITY DEFINER`, `SET search_path = ''`) | Khuôn có sẵn từ 0058/0059/0060 |
| Data access | `supabase.rpc(...)` qua `getSupabaseBrowserClient()` | Khuôn `inventory.api.ts` |
| Server state | TanStack Query v5 (`useQuery`, `keepPreviousData` không cần ở đây vì không phân trang) | Khuôn `useInventory.ts` |
| UI | antd v6: `Card`, `Statistic`, `Tabs`, `Table`, `DatePicker`, `Button`, `Select` | `Statistic` dùng `styles={{ content }}` (bẫy 11), không `valueStyle` |
| Layout | `PageHeader`, `QueryState` | `src/shared/components/*` |
| Charts | Recharts đã cài | **Không dùng ở phase này** — D-04/D-07/D-09 đều chọn bảng/thẻ, không biểu đồ |

### Package Legitimacy Audit

Không có package mới nào được cài trong phase này. Bảng kiểm bỏ qua theo quy tắc "chỉ bắt
buộc khi có cài package ngoài".

## Architecture Patterns

### System Architecture Diagram

```
Trình duyệt (quản lý đăng nhập)
        │
        ▼
  GET /  (Next.js Server Component page.tsx)
        │
        ├─ getCurrentUser() ─────────────────────────────► bảng nguoi_dung (đọc vai_tro thật,
        │                                                   không đọc claim — khớp pattern
        │                                                   getCurrentUser() hiện có)
        │
        ├─ role !== 'quan_ly' → redirect(homePathForRole(role))
        │     văn_phong → /xuat-kho · thủ_kho → /ton-kho · chỉ_xem → /ton-kho
        │
        └─ role === 'quan_ly' → render <DashboardView/> (Client Component)
                │
                ├─ useQuery(nhip_ban)        ──► RPC nhip_ban(p_ngay?)
                ├─ useQuery(bao_cao_xuat_am) ──► RPC bao_cao_xuat_am(p_ngay, p_kho_id?)
                └─ useQuery(ton_theo_nhom)   ──► RPC ton_theo_nhom(p_theo, p_kho_id?)
                        │                              │
                        │                              ▼
                        │                    mỗi RPC tự kiểm lại
                        │                    vai_tro_hien_tai() = 'quan_ly'
                        │                    (D-12 — chặn cả ở RPC, không chỉ route)
                        ▼
                Bấm số trong "Tồn theo nhóm" hoặc mở phiếu trong bảng xuất âm
                        │
                        ▼
                router.push(`/ton-kho?nhom=...&ton=...`)  hoặc  `/xuat-kho/{id}`
                (không dựng bảng chi tiết mới — D-08)
```

### Recommended Project Structure

```
src/features/dashboard/
├── types.ts                        # mapper RPC → domain tiếng Anh (SalesPace, NegativeStockLine, StockByGroupRow)
├── api/
│   ├── dashboard.api.ts            # ba hàm fetch, gọi ba RPC
│   └── dashboard.keys.ts           # dashboardKeys.salesPace / negativeStock(date, kho) / stockByGroup(theo, kho)
├── hooks/
│   └── useDashboard.ts             # ba useQuery + hook refetch-all cho nút Làm mới
├── lib/
│   ├── home-path.ts                # homePathForRole() — hàm thuần, KHÔNG "use client" (bẫy 9)
│   └── stock-drilldown.ts          # buildInventoryDrilldownUrl() — tái dùng khuôn writeInventoryFilterToUrl
└── components/
    ├── dashboard-view.tsx          # ghép ba khối theo D-13, nút Làm mới
    ├── sales-pace-card.tsx
    ├── negative-stock-section.tsx
    ├── negative-stock-table.tsx
    └── stock-by-group-section.tsx
```

`src/app/(app)/page.tsx` trở thành Server Component mỏng: đọc `getCurrentUser()`, redirect
theo vai trò, hoặc render `<DashboardView/>` (Client Component vì dùng antd + hook).

### Pattern 1: Running balance để tìm dòng làm tồn âm (D-01)

Không có cột lũy kế sẵn trên `kho_movement`. Dùng lại đúng kỹ thuật đã kiểm chứng ở
`the_kho_san_pham` (0059/0062) — window function `sum(...) over (partition by ... order by
created_at, id rows unbounded preceding)`. Khác với 0059 (lũy kế theo MỘT mã, không phân
theo kho), báo cáo xuất âm cần lũy kế theo **(kho_id, san_pham_id)** vì tồn được theo dõi
riêng từng kho (`ton_kho` PK là `(kho_id, san_pham_id)`).

Thứ tự `(created_at, id)` là bắt buộc — **không dùng `ngay`**: `ngay` được gán từ
`p_ct.ngay_ct` (kiểu `date`) ép sang `timestamptz`, nên mọi dòng cùng ngày chứng từ rơi
đúng nửa đêm và hòa nhau (bài học đã ghi trong `05-LIVE-DEFS.md` và sửa ở 0059). `created_at`
tăng chặt vì mỗi insert `kho_movement` chạy trong một transaction giữ khóa dòng
`san_pham` (bước 1 của trigger `cap_nhat_ton_va_gia_von`, xem `0008_so_cai_ton_kho.sql`) —
đây chính là thứ tự nhân quả thật của tồn kho, không phải suy diễn.

```sql
-- Nguồn: supabase/migrations/0059_the_kho_ton_luy_ke.sql (kỹ thuật lũy kế đã dùng),
-- supabase/migrations/0008_so_cai_ton_kho.sql (kho_movement, thứ tự khóa),
-- supabase/migrations/0007_chung_tu.sql (ly_do_xuat_am ở đầu phiếu)
with ung_vien as (
  -- Chỉ những dòng CÓ THỂ đưa tồn xuống âm: XUAT/TRA_NCC, đã ghi sổ, không phải
  -- bút toán đảo, đúng ngày báo cáo (D-02, D-03).
  select m.id
  from public.kho_movement m
  join public.chung_tu ct on ct.id = m.chung_tu_id
  where ct.ngay_ct = p_ngay
    and ct.loai_ct in ('XUAT', 'TRA_NCC')
    and ct.trang_thai = 'HOAN_THANH'          -- phiếu đã hủy không tính (D-03)
    and m.la_but_toan_dao = false
    and (p_kho_id is null or m.kho_id = p_kho_id)
),
cap as (
  -- Chỉ tính lũy kế cho các cặp (kho, mã) THẬT SỰ có dòng ứng viên hôm đó —
  -- tránh window function quét toàn bộ 3.266 mã × 2 kho.
  select distinct m.kho_id, m.san_pham_id
  from public.kho_movement m
  join ung_vien uv on uv.id = m.id
),
luy_ke as (
  select
    m.id, m.kho_id, m.san_pham_id, m.chung_tu_id, m.chung_tu_dong_id, m.so_luong,
    sum(m.so_luong) over (
      partition by m.kho_id, m.san_pham_id
      order by m.created_at, m.id
      rows unbounded preceding
    ) as ton_sau
  from public.kho_movement m
  join cap c on c.kho_id = m.kho_id and c.san_pham_id = m.san_pham_id
)
select l.kho_id, l.san_pham_id, l.ton_sau, l.chung_tu_id, l.chung_tu_dong_id
from luy_ke l
join ung_vien uv on uv.id = l.id
where l.ton_sau < 0
order by l.ton_sau asc;
```

Sau đó join `chung_tu` (so_ct, ly_do_xuat_am, ghi_chu_ly_do, nguoi_tao_id → `nguoi_dung.ho_ten`),
`san_pham` (ma_hang, ten_hang), `kho` (ten). D-04 cần **dải thẻ đếm theo lý do** — đếm số
DÒNG (không phải số phiếu) group by `ly_do_xuat_am`, hiển thị nhãn qua
`negativeReasonLabel()` phía client (giữ nguyên chuỗi lạ, đúng D-04).

**Điểm cần Claude's Discretion quyết khi lập kế hoạch (ghi rõ trong PLAN, không tự âm thầm
chọn):** D-01 nói "mỗi dòng = một mã hàng bị một dòng phiếu đưa tồn xuống dưới 0" — không rõ
nếu CÙNG một mã bị hai dòng phiếu khác nhau đẩy âm thêm trong CÙNG một ngày (ví dụ tồn đã âm
từ dòng 1, dòng 2 của phiếu khác đẩy âm sâu hơn) thì hiện MẤY dòng. Cách đọc tự nhiên nhất —
và cách duy nhất khớp với "số phiếu (bấm mở phiếu)" số ít trên mỗi dòng — là **mỗi dòng phiếu
gây âm là MỘT dòng báo cáo riêng**, kể cả trùng mã. `[ASSUMED]` — nên xác nhận lại với người
dùng nếu tình huống này từng xảy ra trong dữ liệu thật trước khi coi là hành vi cuối cùng.

### Pattern 2: Đếm mã theo nhóm/công đoạn khớp `/ton-kho` (D-05, D-06, D-08)

Sao chép NGUYÊN VĂN hai CTE `ton` và `loc` của `danh_sach_ton_kho` bản mới nhất (0067, không
phải 0058 — 0067 đã sửa điều kiện `duoi_dinh_muc`), chỉ đổi phần cuối từ trả từng dòng sản
phẩm sang `group by` cột nhóm hoặc công đoạn và đếm bằng `count(*) filter (where ...)`:

```sql
-- Khuôn CHÉP TỪ supabase/migrations/0067_duoi_dinh_muc_bo_ma_chua_dat.sql
-- (hàm danh_sach_ton_kho, khối thứ hai trong file đó — bản ĐANG CHẠY)
with ton as (
  select tk.san_pham_id,
         sum(tk.so_luong) as tong
  from public.ton_kho tk
  where (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
    and (p_kho_id is null or tk.kho_id = p_kho_id)
  group by tk.san_pham_id
), loc as (
  select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
         coalesce(ton.tong, 0) as tong
  from public.san_pham sp
  left join ton on ton.san_pham_id = sp.id
  where (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
)
select
  case when p_theo = 'nhom' then l.nhom_hang_id else l.cong_doan_id end as nhom_id,
  count(*)                                                      as tong_ma,
  count(*) filter (where l.tong > 0)                             as con_hang,
  count(*) filter (where l.tong = 0)                             as het_hang,
  count(*) filter (where l.tong < 0)                             as am,
  -- PHẢI khớp 0067: chưa đặt định mức KHÔNG BAO GIỜ tính là dưới định mức.
  count(*) filter (where l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu) as duoi_dinh_muc
from loc l
group by 1;
```

`p_dang_kinh_doanh` mặc định `true` — **đúng mặc định của `/ton-kho`** (xem
`DEFAULT_INVENTORY_FILTER.tradingStatus = "active"` → `toInventoryRpcArgs` gửi
`p_dang_kinh_doanh: true`). Nếu dashboard mặc định khác, hai số sẽ lệch ngay khi có mã ngừng
kinh doanh trong nhóm. `Claude's Discretion` của CONTEXT không nhắc tới trading status —
nghiên cứu này khuyến nghị **giữ mặc định "đang kinh doanh"**, khớp toàn bộ hệ thống, không
thêm bộ lọc kinh doanh riêng cho dashboard (giữ đơn giản, đúng D-05 "bức tranh nền").

Drill-down URL (D-08) build bằng cách tái dùng logic của `writeInventoryFilterToUrl` — có
thể export thêm một helper nhỏ trong `inventory.schema.ts` hoặc viết
`buildInventoryDrilldownUrl({ categoryId?, stageId?, warehouseId?, stockStatus })` ngay
trong `features/dashboard/lib/stock-drilldown.ts` gọi `writeInventoryFilterToUrl` với
`DEFAULT_INVENTORY_FILTER` làm nền — **không tự ghép chuỗi query tay**, để không lệch khỏi
nguồn sự thật của bộ lọc khi nó đổi sau này. `inventory.schema.ts` đã export
`writeInventoryFilterToUrl`, không cần sửa file đó.

### Pattern 3: Nhịp bán hôm nay/hôm qua (D-09, D-10)

Đơn giản nhất trong ba khối — không cần window function:

```sql
-- p_ngay mặc định (now() at time zone 'Asia/Ho_Chi_Minh')::date, giống cách
-- 0066_kiem_ke_duyet.sql đã tính "hôm nay theo giờ Việt Nam".
select
  ct.ngay_ct,
  count(distinct ct.id)              as so_phieu,
  count(cd.id)                       as so_dong,
  count(distinct cd.san_pham_id)     as so_ma
from public.chung_tu ct
join public.chung_tu_dong cd on cd.chung_tu_id = ct.id
where ct.loai_ct = 'XUAT'
  and ct.trang_thai = 'HOAN_THANH'      -- trừ phiếu đã hủy (D-10)
  and ct.ngay_ct in (p_ngay, p_ngay - 1)
group by ct.ngay_ct;
```

Index `idx_chung_tu_loai_ngay (loai_ct, ngay_ct desc)` (0007) phủ đúng điều kiện lọc.
Đơn đặt hàng chưa xuất không tính vì chỉ đọc `chung_tu`, không đọc `don_dat_hang` — khớp D-10.

### "Hôm nay theo giờ Việt Nam" — không có helper dùng chung, nhưng có tiền lệ rõ

Không có hàm SQL `hom_nay_vn()` dùng chung trong repo. Tiền lệ trực tiếp:
- `0066_kiem_ke_duyet.sql:332`: `set ngay_ct = (now() at time zone 'Asia/Ho_Chi_Minh')::date`
- `0064_lich_su_kiotviet.sql:115-116`: `(t.ngay at time zone 'Asia/Ho_Chi_Minh')::date >= p_tu_ngay`

Vì `chung_tu.ngay_ct` đã là kiểu `date` thuần (không phải `timestamptz`), so sánh
`ct.ngay_ct = p_ngay` không cần ép timezone — chỉ cần **mặc định tham số** `p_ngay` bằng
`(now() at time zone 'Asia/Ho_Chi_Minh')::date` khi client không truyền. Frontend (DatePicker
D-02) gửi lên một `date` string bình thường, không cần xử lý timezone ở JS.

### Anti-Patterns to Avoid

- **Không tự tính "dưới định mức" bằng `< ton_toi_thieu` đơn thuần** — đã sai một lần
  (0067), sửa lại sẽ lệch khỏi `/ton-kho` lần nữa.
- **Không dùng `m.ngay` để sắp thứ tự lũy kế** — hòa nhau ở nửa đêm, sai kết quả âm/dương.
- **Không tính lũy kế trên TOÀN BỘ `kho_movement`** không lọc trước theo `cap` — quét hàng
  trăm nghìn dòng cho một trang tải khi mở mỗi lần là lãng phí không cần thiết.
- **Không thêm cột hay bảng mới** — mọi dữ liệu cần thiết đã có trong `kho_movement`,
  `chung_tu`, `ton_kho`, `san_pham`.
- **Không dùng `requirePermission()` cho route `/`** — nó redirect về `/khong-du-quyen`,
  trong khi D-11 yêu cầu redirect có điều kiện theo vai trò (3 đích khác nhau). Cần một
  guard riêng trong `features/dashboard/lib` hoặc trực tiếp trong `page.tsx`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lọc trạng thái tồn (con_hang/het_hang/am/duoi_dinh_muc) | Điều kiện SQL mới tự nghĩ | Sao chép nguyên văn điều kiện của `danh_sach_ton_kho` (0067) | Đã có một lần lệch định nghĩa (0067) gây UAT fail — sao chép, không viết lại |
| Xây URL lọc `/ton-kho` | Ghép chuỗi `?nhom=...&ton=...` tay | `writeInventoryFilterToUrl` (đã export) | Bộ lọc `/ton-kho` có logic mặc định tinh vi (bỏ qua tham số bằng default) — ghép tay dễ tạo URL khác hành vi |
| "Hôm nay theo giờ VN" | Hàm JS `new Date()` ở client rồi gửi lên | Mặc định tham số RPC bằng `(now() at time zone 'Asia/Ho_Chi_Minh')::date` | `ngay_ct` là cột `date` server-side; tính ở client dễ lệch múi giờ trình duyệt người dùng |
| Đếm dòng gây âm | Aggregate lại từ bảng `ton_kho` (chỉ có số dư hiện tại) | Window function trên `kho_movement` | `ton_kho` không giữ lịch sử, không trả lời được "dòng NÀO gây âm lúc nào" |

**Key insight:** Phase này không cần bất kỳ pattern mới nào — rủi ro duy nhất là COPY SAI
(dùng bản `danh_sach_ton_kho` cũ 0058 thay vì bản đã vá 0067, hoặc dùng `ngay` thay vì
`created_at`). Plan nên trích dẫn rõ số migration nguồn cho từng đoạn sao chép.

## Common Pitfalls

### Pitfall 1: Sao chép nhầm bản `danh_sach_ton_kho` cũ (trước 0067)
**What goes wrong:** Đếm "dưới định mức" tính cả mã tồn âm chưa đặt định mức, số đếm dashboard
cao hơn số dòng thật ở `/ton-kho` khi bấm vào.
**Why it happens:** File 0058 và 0067 đều định nghĩa hàm `danh_sach_ton_kho` cùng tên; đọc
nhầm file cũ trong lúc lướt migration theo thứ tự bảng chữ cái/số.
**How to avoid:** Luôn lấy định nghĩa từ file migration SỐ LỚN NHẤT sửa hàm đó (ở đây là
0067), hoặc đọc trực tiếp từ cloud bằng `pg_get_functiondef` trước khi viết migration mới
(tiền lệ `05-LIVE-DEFS.md`).
**Warning signs:** pgTAP so số đếm dashboard với số dòng `danh_sach_ton_kho` filter tương
ứng không khớp.

### Pitfall 2: Dùng `ngay` (timestamptz) thay vì join `chung_tu.ngay_ct` (date) để lọc ngày báo cáo
**What goes wrong:** Lọc theo `m.ngay::date` mà không ép timezone sẽ lấy nhầm ngày UTC thay
vì ngày Việt Nam đã chốt khi ghi sổ (nhất là các phiếu ghi sổ gần nửa đêm giờ VN, tức giữa
trưa/chiều UTC — thực ra ít lệch vì UTC+7 khiến giữa đêm VN vẫn là chiều UTC hôm trước, RỦI
RO THẬT xảy ra khi ghi sổ 17h-24h giờ VN).
**How to avoid:** Luôn lọc bằng `chung_tu.ngay_ct` (đã là `date`, đã được ấn định đúng lúc
ghi sổ theo giờ VN ở một số luồng như kiểm kê) thay vì tính lại từ `kho_movement.ngay`.
**Warning signs:** Số phiếu xuất "hôm nay" đổi khi test chạy gần nửa đêm.

### Pitfall 3: Window function quét toàn bảng `kho_movement`
**What goes wrong:** RPC báo cáo xuất âm chậm dần theo thời gian nếu tính lũy kế trên MỌI
`(kho_id, san_pham_id)` thay vì chỉ những cặp có dòng ứng viên hôm đó.
**How to avoid:** Luôn lọc bằng CTE `cap` (distinct kho_id, san_pham_id của ứng viên) TRƯỚC
khi áp window function — xem Pattern 1.
**Warning signs:** `EXPLAIN ANALYZE` cho thấy `Seq Scan` toàn bảng `kho_movement` thay vì
lọc theo index trước.

### Pitfall 4: Dùng `requirePermission()` cho route `/`
**What goes wrong:** Văn phòng/thủ kho/chỉ xem bị đẩy tới `/khong-du-quyen` thay vì
`/xuat-kho` hoặc `/ton-kho` như D-11 yêu cầu.
**How to avoid:** Viết guard riêng (`requireManagerOrRedirect` hoặc logic trực tiếp trong
`page.tsx`) gọi `getCurrentUser()` rồi tự `redirect(homePathForRole(role))`.
**Warning signs:** `scripts/test-route-permissions.ts` báo `/` không khớp kỳ vọng
`→/xuat-kho`/`→/ton-kho`.

### Pitfall 5: antd v6 — `Statistic`/`Alert`/`Tabs` prop đã đổi (bẫy 11 CLAUDE.md)
**What goes wrong:** `<Statistic valueStyle=...>` hoặc `<Alert message=...>` build xanh
nhưng cảnh báo lúc chạy, style không áp dụng.
**How to avoid:** `Statistic` dùng `styles={{ content: {...} }}` (xem
`count-import-result.tsx`), `Alert` dùng `title` không phải `message`.
**Warning signs:** Mở console trình duyệt sau khi dựng UI mới (bắt buộc theo CLAUDE.md).

## Code Examples

### RPC role guard (D-12) — khuôn từ `de_xuat_dinh_muc` (0060)

```sql
-- Nguồn: supabase/migrations/0060_de_xuat_dinh_muc.sql:187-188
if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
  raise exception 'Chỉ quản lý xem được trang tổng quan' using errcode = '42501';
end if;
```

### Grant/revoke khuôn chuẩn của mọi RPC mới trong repo

```sql
-- Nguồn: supabase/migrations/0058_rpc_ton_kho.sql:128-129
revoke all    on function public.ten_ham(...) from public, anon;
grant execute on function public.ten_ham(...) to authenticated;
```

### Feature API layer khuôn (`inventory.api.ts`)

```typescript
// Nguồn: src/features/inventory/api/inventory.api.ts
export async function fetchNegativeStockReport(
  date: string,
  warehouseId: string | null,
): Promise<NegativeStockLine[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("bao_cao_xuat_am", {
    p_ngay: date,
    p_kho_id: warehouseId ?? undefined,
  });
  if (error) throw error;
  return (data ?? []).map(toNegativeStockLine);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `danh_sach_ton_kho` lọc `duoi_dinh_muc` bằng `tong < ton_toi_thieu` | Thêm điều kiện `ton_toi_thieu > 0` | Migration 0067, 2026-09-26 (UAT bài 7) | Mọi RPC/UI đếm "dưới định mức" phải dùng bản mới, kể cả dashboard |
| `_ghi_so_dieu_chinh` ghi `kho_id` đầu phiếu | Ghi `coalesce(dòng.kho_id, đầu phiếu.kho_id)` | Migration 0061 | Không ảnh hưởng Phase 7 (không đụng `DIEU_CHINH`), chỉ liên quan nếu sau này mở rộng báo cáo sang kiểm kê |
| `the_kho_san_pham` không có lũy kế | Thêm cột `ton_luy_ke` bằng window function | Migration 0059, sửa lại ở 0062 | Kỹ thuật lũy kế đã kiểm chứng — tái dùng trực tiếp cho D-01 |

**Deprecated/outdated:** Không có gì trong phạm vi phase này bị deprecated.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Mỗi dòng phiếu (chứng_từ_dòng) làm tồn (kho, mã) rơi xuống dưới 0 là MỘT dòng báo cáo riêng, kể cả khi cùng mã bị nhiều dòng phiếu khác nhau đẩy âm thêm trong cùng ngày | Pattern 1 (D-01) | Nếu người dùng thực ra muốn gộp theo mã (một dòng/mã/ngày, lấy dòng đầu tiên hoặc dòng âm sâu nhất), bảng chi tiết sẽ hiện nhiều dòng hơn kỳ vọng — sai không nghiêm trọng (dữ liệu vẫn đúng, chỉ là mức độ gộp), dễ sửa sau khi UAT |
| A2 | Dashboard mặc định lọc "đang kinh doanh" (`p_dang_kinh_doanh = true`) cho khối tồn theo nhóm/công đoạn, khớp mặc định của `/ton-kho`, không có bộ lọc kinh doanh riêng | Pattern 2 (D-05/D-06) | Nếu sai, số đếm tồn theo nhóm và số dòng `/ton-kho` khi bấm vào sẽ lệch ngay khi có mã ngừng kinh doanh trong nhóm đó — vi phạm trực tiếp D-08 |
| A3 | Một RPC `ton_theo_nhom(p_theo)` dùng chung cho cả hai tab (nhóm/công đoạn) thay vì hai RPC riêng | Summary, Pattern 2 | Rủi ro thấp — nếu planner thấy khó dùng (ví dụ cần trả thêm cột màu chỉ công đoạn có), có thể tách thành hai hàm mà không ảnh hưởng tới định nghĩa trạng thái tồn |
| A4 | `nguoi_dung.ho_ten` là cột đúng cho "người lập" trên báo cáo xuất âm (không phải `nguoi_duyet_id` — người GHI SỔ, không phải người TẠO phiếu) | Pattern 1 (D-01) | D-01 nói "người lập" — nên join `chung_tu.nguoi_tao_id → nguoi_dung.ho_ten`, không phải `nguoi_duyet_id` (người bấm ghi sổ, có thể khác người tạo phiếu nháp). Nếu nhầm cột, báo cáo quy sai trách nhiệm |

**Nếu người dùng xác nhận ngược với A1/A2/A4 khi review PLAN, sửa ngay trong PLAN trước khi
viết migration — đây là chỗ rẻ nhất để sửa.**

## Open Questions (RESOLVED)

1. **A1 ở trên — gộp theo mã hay giữ theo từng dòng phiếu trong cùng một ngày?** — RESOLVED: D-15 (hai dòng báo cáo)
   - What we know: D-01 nói "theo mã bị âm, không theo phiếu" nhưng cũng liệt kê "số phiếu"
     số ít trên mỗi dòng.
   - What's unclear: Trường hợp hiếm (một mã bị âm bởi ≥ 2 phiếu khác nhau cùng ngày).
   - Recommendation: Implement theo A1 (một dòng/sự kiện), viết pgTAP phủ đúng kịch bản
     "2 phiếu, cùng mã, cùng ngày, cả hai đều đẩy âm" để hành vi rõ ràng và có thể xem lại.

2. **`nguoi_duyet_id` có nên hiện thêm bên cạnh `nguoi_tao_id` không?** — RESOLVED: D-16 (chỉ người tạo phiếu)
   - What we know: `chi_tiet_chung_tu` (0051) đã trả cả hai cột.
   - What's unclear: D-01 chỉ nói "người lập" — không rõ có cần "người ghi sổ" nếu khác nhau.
   - Recommendation: Chỉ hiện `nguoi_tao_id` theo đúng chữ D-01; không thêm cột thừa.

## Environment Availability

Không có phụ thuộc bên ngoài mới nào (không thư viện, không dịch vụ, không CLI). Bỏ qua
mục này theo điều kiện skip.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pgTAP (database), `npx tsx` cho script TypeScript thuần |
| Config file | `supabase/tests/*.sql`, chạy qua `npm run db:test:linked` hoặc `psql "$DATABASE_URL" -f <file>` (Docker có thể treo — xem tiền lệ 04-15) |
| Quick run command | `psql "$DATABASE_URL" -f supabase/tests/9X_trang_tong_quan_test.sql` |
| Full suite command | `npm run db:test:linked` (chạy toàn bộ `supabase/tests/*.sql` trên cloud) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TQAN-06 | `bao_cao_xuat_am` trả đúng dòng gây âm, phá hòa `created_at,id`, loại phiếu đã hủy, ép vai trò quan_ly | pgTAP | `psql -f supabase/tests/92_bao_cao_xuat_am_test.sql` | ❌ Wave 1 (mới) |
| TQAN-01 | `ton_theo_nhom` khớp CHÍNH XÁC số dòng của `danh_sach_ton_kho` khi lọc theo cùng điều kiện | pgTAP + đối chiếu chéo | `psql -f supabase/tests/93_ton_theo_nhom_test.sql` | ❌ Wave 1 (mới) |
| TQAN-07 | `nhip_ban` đếm đúng phiếu/dòng/mã hôm nay và hôm qua, trừ phiếu đã hủy | pgTAP | `psql -f supabase/tests/94_nhip_ban_test.sql` | ❌ Wave 1 (mới) |
| D-11/D-12 | Route `/` redirect đúng theo vai trò; RPC tự chặn vai trò khác `quan_ly` | Route script + pgTAP | `npx tsx scripts/test-route-permissions.ts` (thêm dòng `/` với kỳ vọng `→/xuat-kho`/`→/ton-kho`) + pgTAP `42501` case trong cả ba file trên | ❌ Wave 3/5 (sửa script có sẵn) |
| D-08 | Bấm số trên dashboard mở đúng `/ton-kho?...` khớp số dòng | Kiểm mắt (checkpoint:human-verify) | Mở trình duyệt, đối chiếu số đếm với số dòng trả về | N/A — thủ công |
| Toàn bộ TypeScript mới | Không `any`, build xanh | `npm run check` | `npm run check` | Có sẵn |

### Sampling Rate

- **Per task commit:** chạy trực tiếp file pgTAP vừa viết bằng `psql "$DATABASE_URL" -f <file>` (như tiền lệ 04-15 khi Docker treo) hoặc `npm run db:test:linked` nếu Docker chạy được.
- **Per wave merge:** `npm run db:test:linked` (toàn bộ suite) + `npm run check`.
- **Phase gate:** Full suite pgTAP xanh + `scripts/test-route-permissions.ts` đủ ô + kiểm mắt D-08 trước khi coi Phase 7 xong.

### Wave 0 Gaps

- [ ] `supabase/tests/92_bao_cao_xuat_am_test.sql` — chưa tồn tại, cần viết mới (Wave 1, WU-1)
- [ ] `supabase/tests/93_ton_theo_nhom_test.sql` — chưa tồn tại (Wave 1, WU-2)
- [ ] `supabase/tests/94_nhip_ban_test.sql` — chưa tồn tại (Wave 1, WU-3)
- [ ] Helper `pg_temp.dang_nhap_nhu(email)` / `pg_temp.dang_xuat()` đã có sẵn khuôn trong
      `supabase/tests/33_the_kho_luy_ke_test.sql` — copy nguyên văn, không viết lại
- [ ] `scripts/test-route-permissions.ts` — sửa dòng `/` hiện có (đang kỳ vọng "200" cho mọi
      vai trò) thành kỳ vọng đúng D-11 (Wave 3, WU-7)

**pgTAP không neo vào bộ đếm sống** (bài học ghi ở `.memory/index.md`): dùng năm giả định
(2091-2093) hoặc dữ liệu test tự tạo trong transaction rollback, không giả định số phiếu
`PN26-xxxxxx` cụ thể nào đang tồn tại.

## Security Domain

`security_enforcement` không bị tắt trong `.planning/config.json` (không tìm thấy key này —
coi như mặc định bật).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Có (gián tiếp) | Supabase Auth, `getUser()` không phải `getSession()` — đã có sẵn ở `getCurrentUser()` |
| V3 Session Management | Có (gián tiếp) | Cookie session của Supabase SSR, không thay đổi ở phase này |
| V4 Access Control | **Có — trọng tâm phase này** | D-11/D-12: route guard theo vai trò VÀ RPC tự kiểm `vai_tro_hien_tai() = 'quan_ly'` — không dựa vào ẩn/hiện UI |
| V5 Input Validation | Có | `p_ngay` (date), `p_kho_id` (uuid), `p_theo` (enum text 'nhom'|'cong_doan') — validate ở SQL bằng kiểu tham số + `case`/`if` tường minh, không nối chuỗi SQL động |
| V6 Cryptography | Không áp dụng | Phase không xử lý dữ liệu mật/mã hóa |

### Known Threat Patterns for stack này

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bỏ qua chặn ở route, gõ thẳng RPC qua Supabase client | Elevation of Privilege | RPC tự raise `42501` nếu `vai_tro_hien_tai() <> 'quan_ly'` (D-12) — không dựa vào Next.js route guard |
| SQL injection qua `p_theo` nếu dựng câu `group by` bằng nối chuỗi | Tampering | Dùng `case when p_theo = 'nhom' then ... else ... end`, KHÔNG `execute format(...)` với input người dùng |
| Rò dữ liệu `gia_von` qua báo cáo mới | Information Disclosure | Không RPC nào trong phase này SELECT `san_pham.gia_von` — giữ nguyên D-02/D-17 (không dùng giá) |

## Sources

### Primary (HIGH confidence — đọc trực tiếp từ migration/code trong repo)
- `supabase/migrations/0007_chung_tu.sql` — bảng `chung_tu`/`chung_tu_dong`, `ly_do_xuat_am`, index xuất âm
- `supabase/migrations/0008_so_cai_ton_kho.sql` — `kho_movement` (append-only, không cột lũy kế), trigger `cap_nhat_ton_va_gia_von`, thứ tự khóa
- `supabase/migrations/0011_rpc_ghi_so.sql`, `0012_rpc_huy.sql`, `0046_chi_quan_ly_huy_nhap.sql`, `0051_chung_tu_rpc_mo_rong.sql` — `ghi_so_chung_tu` (chặn xuất âm, thứ tự loop), `huy_chung_tu` (bút toán đảo, `la_but_toan_dao`)
- `supabase/migrations/0058_rpc_ton_kho.sql`, `0067_duoi_dinh_muc_bo_ma_chua_dat.sql` — `danh_sach_ton_kho` bản đang chạy, định nghĩa trạng thái tồn chính xác
- `supabase/migrations/0059_the_kho_ton_luy_ke.sql`, `0062_sua_the_kho_cot_mo_ho.sql` — kỹ thuật window function lũy kế đã kiểm chứng
- `supabase/migrations/0060_de_xuat_dinh_muc.sql` — khuôn kiểm vai trò trong RPC
- `supabase/migrations/0064_lich_su_kiotviet.sql`, `0066_kiem_ke_duyet.sql` — tiền lệ `at time zone 'Asia/Ho_Chi_Minh'`
- `src/features/inventory/schemas/inventory.schema.ts`, `src/features/inventory/api/inventory.api.ts` — bộ lọc/URL/mặc định `/ton-kho`
- `src/features/documents/lib/negative-reasons.ts` — 4 lý do xuất âm, `negativeReasonLabel()`
- `src/shared/lib/permissions.ts`, `src/features/auth/api/current-user.server.ts` — cơ chế chặn quyền hiện có, xác nhận `requirePermission()` không phù hợp D-11
- `scripts/test-route-permissions.ts` — cấu trúc ma trận, dòng `/` hiện tại cần sửa
- `src/shared/components/query-state.tsx`, `src/features/stocktake/components/count-import-result.tsx` — khuôn `QueryState`/`Statistic` v6
- `design/bao-cao.html` — mockup bố cục cũ (4 tab, trước khi descope 26/09) — dùng tham khảo phong cách thẻ/bảng/nút Xuất Excel, KHÔNG phải đặc tả (đã lỗi thời so với `07-CONTEXT.md`)
- `.planning/phases/05-ton-kho-tong-quan/05-LIVE-DEFS.md` — bài học phá hòa `created_at,id`

### Secondary (MEDIUM confidence)
- Không có — mọi claim kỹ thuật đều xác minh trực tiếp từ mã nguồn/migration trong phiên này.

### Tertiary (LOW confidence)
- Ước tính hiệu năng window function (Pitfall 3) — chưa chạy `EXPLAIN ANALYZE` thật trên
  dữ liệu production; suy luận từ khối lượng đã biết (~92 phiếu/ngày, ~470 dòng/ngày) và từ
  việc kỹ thuật tương tự (0059) đã chạy ổn trên toàn bộ thẻ kho.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — không thêm gì mới, mọi thứ đã dùng trong repo
- Architecture (RPC shape, running balance, status definitions): HIGH — đọc trực tiếp định nghĩa đang chạy (0067 là bản mới nhất, không phải suy đoán)
- Pitfalls: HIGH — cả 5 pitfall đều bắt nguồn từ sự cố/bài học đã xảy ra thật trong dự án (0067 UAT fail, 05-LIVE-DEFS phá hòa, bẫy 9/11 CLAUDE.md)
- Open questions (A1, A4): MEDIUM — cách đọc hợp lý nhất từ văn bản D-01 nhưng chưa hỏi lại người dùng

**Research date:** 2026-09-26
**Valid until:** 30 ngày, HOẶC ngay khi có migration mới sửa `danh_sach_ton_kho` /
`ghi_so_chung_tu` / `huy_chung_tu` sau ngày nghiên cứu này (đọc lại bản mới nhất trước khi
lập kế hoạch nếu số migration đang chạy đã vượt 0067).
