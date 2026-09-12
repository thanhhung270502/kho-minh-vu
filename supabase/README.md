# Database — Kho Minh Vũ

Tài liệu vận hành database. Đọc file này trước khi chạy bất kỳ lệnh `db:*` nào.

---

## ⚠️ Hai việc phải làm trước khi chạy được bất cứ thứ gì

### 1. Giải phóng dung lượng đĩa

Tại thời điểm viết, máy còn **1.9 GB trống trên 460 GB (100% capacity)**.
`npm install` cho dự án Next.js 16 cần khoảng 500–700 MB và sẽ để đĩa ở mức
nguy hiểm, hoặc hỏng giữa chừng.

Cần tối thiểu **5 GB trống**. Docker đang giữ ~31 GB có thể thu hồi
(`docker system df` để xem), nhưng 21.6 GB trong đó nằm ở 126 volume ẩn danh —
kiểm tra kỹ trước khi xóa, có thể là dữ liệu dự án khác.

### 2. Tạo project Supabase

Org `vutru-productionplanning` đang ở gói free và đã dùng hết 2 project
(`PO DB`, `tinhgianoibo`). Muốn tạo project thứ ba phải tạm dừng một project
hiện có hoặc nâng lên gói Pro.

---

## Thiết lập lần đầu

### Bước 1 — Cài phụ thuộc

```bash
npm install
```

### Bước 2 — Điền .env.local

```bash
cp .env.example .env.local
```

Mở `.env.local` và điền năm giá trị, lấy từ Supabase Dashboard:

| Biến | Lấy ở đâu |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → Project API keys → **anon / public** |
| `SUPABASE_PROJECT_ID` | Phần giữa `https://` và `.supabase.co` trong URL ở trên |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → **Database password** (bấm Reset nếu quên) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → Project API keys → **service_role** → Reveal |

**Về `service_role`:** khóa này bỏ qua toàn bộ RLS. Nó chỉ được dùng bởi hai
script trong `scripts/`, không bao giờ import vào `src/`. Đặt nó vào một biến
`NEXT_PUBLIC_*` là mất sạch quyền kiểm soát database.

### Bước 3 — Liên kết và đẩy schema

```bash
npx supabase login      # mở trình duyệt, chỉ cần làm một lần
npm run db:link         # liên kết thư mục này với project
npm run db:push         # áp 19 migration lên database
```

`db:push` chỉ áp những migration chưa chạy. Chạy lại nhiều lần là an toàn.

### Bước 4 — Bật custom access token hook *(bắt buộc, CLI không làm thay được)*

Dashboard → **Authentication** → **Hooks** → **Customize Access Token (JWT) Claims**
→ chọn `public.custom_access_token_hook` → **Enable**.

Không có bước này thì JWT thiếu `vai_tro` và `kho_id`, RLS sẽ từ chối mọi thứ.

### Bước 5 — Tạo tài khoản mẫu và kiểm chứng

```bash
npm run seed:users      # tạo 4 tài khoản, mỗi vai trò một cái
npm run verify:hook     # xác nhận hook thật sự bơm claim vào JWT
```

`verify:hook` phải in ✓ cho cả bốn dòng. Nếu báo thiếu claim → quay lại bước 4.

### Bước 6 — Sinh kiểu TypeScript

```bash
npm run db:types        # ghi đè src/types/database.types.ts
npm run check           # typecheck + lint + build
```

---

## Vòng đời lệnh

| Việc | Lệnh |
|---|---|
| Áp migration mới lên cloud | `npm run db:push` |
| Xem khác biệt schema | `npm run db:diff` |
| Sinh lại kiểu TypeScript | `npm run db:types` |
| Chạy pgTAP trên cloud | `npm run db:test:linked` |
| Tạo lại 4 tài khoản mẫu | `npm run seed:users` |
| Kiểm hook chạy thật | `npm run verify:hook` |
| Thử nạp dữ liệu KiotViet | `npm run import:kiotviet -- --mau` |
| *(nếu chuyển về local)* dựng lại DB + seed | `npm run db:reset` |

**`npm run db:reset` trên project đã liên kết sẽ XOÁ SẠCH database rồi dựng lại.**
Chỉ dùng khi biết chắc mình đang làm gì. Trên cloud hãy dùng `db:push`.

---

## Cảnh báo advisor đã xem xét và chấp nhận

Chạy `get_advisors(type: security)` sau mỗi lần đổi DDL. Lần quét đầu bắt được
1 ERROR và 19 WARN — đã vá ở migration `0020`. Bảy cảnh báo còn lại là **cố ý**:

| Hàm | Vì sao giữ nguyên |
|---|---|
| `ghi_so_chung_tu`, `huy_chung_tu` | SECURITY DEFINER là **bắt buộc**: client không được GRANT INSERT trên `kho_movement`, nên hàm phải mượn quyền của owner. Quyền nghiệp vụ kiểm tường minh bên trong hàm (`vai_tro_hien_tai() = 'chi_xem'` → 42501). |
| `doi_chieu_ton` | Như trên, kèm kiểm vai trò chỉ cho `quan_ly`/`van_phong`. |
| `vai_tro_hien_tai`, `kho_hien_tai` | RLS policy cần `authenticated` gọi được. Chúng chỉ đọc JWT của **chính người gọi**, không lộ gì của người khác. |
| `rls_auto_enable` | **Hàm nền tảng của Supabase**, không phải của dự án. Event trigger tự bật RLS cho bảng mới. Gọi ngoài ngữ cảnh event trigger sẽ lỗi ngay. Không đụng vào. |

Advisor không biết ý đồ nên vẫn cảnh báo. Cảnh báo **mới** ngoài danh sách này
thì phải xem xét, đừng bỏ qua cả cụm.

### Hai lỗi thật đã vá, ghi lại để không lặp

1. **View chạy với quyền người tạo (ERROR).** `v_doi_chieu_ton` mặc định chạy
   dưới quyền owner nên RLS **không** áp dụng — thủ kho truy vấn thẳng view sẽ
   thấy tồn cả hai kho, lách đúng AUTH-04. Vá bằng `security_invoker = on`.
   **Mọi view mới đều phải đặt option này.**
2. **Khóa `search_path` làm hỏng tìm kiếm.** Thêm `set search_path = ''` vào
   `tim_san_pham` khiến toán tử `%` và `similarity()` của pg_trgm (ở schema
   `extensions`) không phân giải được → lỗi 42883, tìm kiếm chết. Khóa
   search_path thì phải qualify **mọi thứ**, kể cả **toán tử**:
   `a operator(extensions.%) b`. Đây là chỗ dễ quên nhất vì toán tử trông không
   giống lời gọi hàm.

---

## Quy ước tên migration

`NNNN_ten_khong_dau.sql` — bốn chữ số, tăng dần. Khóa cho **toàn dự án**.
Phase 2 tiếp tục từ `0020`.

Không dùng `supabase migration new` (sinh timestamp 14 chữ số) để tránh trộn hai
kiểu đánh số. Và không đặt chữ cái ngay sau phần số (`0014a_...`) — Supabase CLI
cần dấu gạch dưới ngay sau chữ số cuối.

---

## Ba mục phải kiểm thủ công

`npm run db:test` xanh **không** phủ ba mục này:

| Hành vi | Vì sao thủ công | Cách kiểm |
|---|---|---|
| Hook bơm `vai_tro`/`kho_id` vào JWT | pgTAP đặt thẳng `request.jwt.claims` nên **bỏ qua hook hoàn toàn**. Test xanh không chứng minh hook chạy. | `npm run verify:hook` |
| Job `cron.schedule` hằng đêm | pg_cron không đáng tin trên stack local; migration 0017 bọc trong `exception` nên không bao giờ làm hỏng `db reset`. | Trên cloud: `select * from cron.job;` |
| Claim cũ sống sót sau khi đổi vai trò | Phụ thuộc TTL của GoTrue, không quan sát được trong một transaction pgTAP. | Đổi `vai_tro`, gọi API bằng token cũ, xác nhận vẫn dùng vai trò cũ tới lần refresh kế tiếp. |

---

## Đổi vai trò và TTL token

`jwt_expiry = 3600` (1 giờ, giá trị mặc định trong `config.toml`).

Hook chỉ chạy khi **cấp mới** access token — lúc đăng nhập hoặc lúc refresh.
Đổi `nguoi_dung.vai_tro` **không** làm token đang sống đổi theo: người dùng vẫn
thao tác được theo vai trò cũ tối đa 1 giờ.

Màn Cài đặt ở Phase 2 (CDAT-01) phải gọi
`supabase.auth.admin.signOut(userId, 'others')` ngay sau khi đổi vai trò.

---

## Giá vốn khi hủy phiếu nhập

Bút toán đảo của một phiếu **nhập** có `so_luong` âm, nên trigger giá vốn **không**
tính lại (nó chỉ tính khi `so_luong > 0`). Nghĩa là `san_pham.gia_von` không tự
quay về số trước khi nhập.

Đây là hành vi **đúng** của bình quân gia quyền di động: giá vốn là trung bình
lịch sử, không phải giá trị hoàn tác được. Đừng "sửa" thành hoàn tác.

---

## Kiểm tra index tìm kiếm

```sql
set local enable_seqscan = off;   -- ép planner thể hiện index có dùng được không
explain analyze
select * from public.san_pham
where public.f_unaccent(coalesce(ma_hang,'') || ' ' || coalesce(ten_hang,''))
      % public.f_unaccent('bac dan');
```

Phải thấy `Bitmap Index Scan on idx_san_pham_tim_kiem`. Nếu thấy `Seq Scan`,
nguyên nhân gần như luôn là biểu thức trong `WHERE` không khớp **từng ký tự**
với biểu thức index ở migration 0005 (sai thứ tự cột, thiếu `coalesce`, thiếu
dấu cách).

`set local enable_seqscan = off` là cần thiết khi bảng còn ít dòng: Postgres sẽ
chọn Seq Scan vì rẻ hơn, và ta không phân biệt được "index không dùng được" với
"index dùng được nhưng planner chọn cách khác".

---

## Đối chiếu tồn hằng đêm

```sql
select * from public.doi_chieu_ton();   -- rỗng = mọi thứ khớp
select * from cron.job;                 -- chỉ có ý nghĩa trên cloud
```

`cron.job` rỗng ở local **không** phải lỗi — pg_cron trên Docker CLI stack có
known issue (supabase/cli#158, #1591).

---

## Khi lên cloud cần làm gì bằng tay

CLI không làm được những việc sau:

- [ ] Bật **custom access token hook** (bước 4 ở trên) — bắt buộc
- [ ] Đăng ký `cron.schedule('doi-chieu-ton-hang-dem', '0 1 * * *', ...)` nếu migration 0017 báo notice bỏ qua
- [ ] Tạo tài khoản thật cho người dùng (4 tài khoản mẫu chỉ để test)
- [ ] Bật extension `pgtap` nếu muốn chạy `npm run db:test:linked`

**Không chạy `seed.sql` trên cloud.** Nó chứa tài khoản demo với mật khẩu rác.
Dữ liệu tham chiếu thật (kho, ĐVT, công đoạn) nằm ở migration `0018_du_lieu_nen.sql`
nên `db:push` đã lo.
