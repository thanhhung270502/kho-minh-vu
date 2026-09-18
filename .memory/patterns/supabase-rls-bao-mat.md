# Pattern: RLS và bảo mật trên Supabase

Rút từ Phase 1. Mỗi mục là một lỗi **đã thật sự xảy ra**, không phải lý thuyết.

---

## 1. GRANT và RLS là hai lớp riêng biệt

Có GRANT mà không có policy → vẫn đọc ra **0 dòng**, không báo lỗi.

**Đã gặp:** `custom_access_token_hook` chạy dưới role `supabase_auth_admin`. Đã
`grant select on nguoi_dung to supabase_auth_admin`, nhưng RLS bật và mọi policy
đều `to authenticated`. Hook đọc ra 0 dòng, trả claims nguyên vẹn, **không lỗi gì**.
Đăng nhập thành công, token hợp lệ, chỉ thiếu `vai_tro` — RLS sau đó từ chối mọi thứ.

**Áp dụng:** mỗi khi bật RLS trên một bảng, liệt kê **mọi role** đọc bảng đó
(`authenticated`, `supabase_auth_admin`, `service_role`, cron chạy dưới `postgres`…),
không chỉ `authenticated`. Sửa ở migration `0023`.

**Phát hiện bằng:** `npm run verify:hook`. pgTAP **không bao giờ** bắt được vì nó
đặt thẳng `request.jwt.claims` và bỏ qua hook.

---

## 2. Quyền theo cột áp theo SQL role, không theo JWT claim

Quản lý và văn phòng cùng kết nối dưới role `authenticated` — chỉ khác claim.
Bỏ một cột khỏi `grant update (...)` là chặn **mọi** vai trò.

**Áp dụng:**
- Cột **không ai** được ghi (`gia_von`) → GRANT cột, loại khỏi danh sách.
- Cột **phân vai** (`gia_ban`: quản lý được, văn phòng không) → để trong GRANT,
  phân vai bằng trigger đọc `vai_tro_hien_tai()`.

---

## 3. Khóa cột phải phủ CẢ đường INSERT lẫn UPDATE

Chặn `update gia_von` mà quên `insert` thì xóa mã rồi tạo lại là lách được.
Giá trị bịa lúc tạo còn nguy hiểm hơn: thành `gia_von_cu` ở lần ghi sổ đầu, làm hỏng
bình quân gia quyền từ con số đầu, im lặng.

**Áp dụng:** mọi `revoke update` / `grant update (cột)` phải có cặp `revoke insert` /
`grant insert (cột)`. Mọi trigger chặn cột phải là `before insert or update`.

---

## 4. View mặc định chạy với quyền NGƯỜI TẠO

Không đặt `security_invoker = on` thì RLS trên bảng gốc **không áp dụng** khi đọc qua view.

**Đã gặp (mức ERROR):** thủ kho `select * from v_doi_chieu_ton` thấy tồn của cả hai kho.

**Áp dụng:** **mọi view mới** đều `alter view ... set (security_invoker = on);`

---

## 5. `search_path = ''` phải qualify cả TOÁN TỬ

Khóa `search_path` là đúng, nhưng phải schema-qualify **mọi thứ** — kể cả toán tử,
thứ dễ quên nhất vì trông không giống lời gọi hàm.

**Đã gặp:** `tim_san_pham` với `search_path = ''` → toán tử `%` của pg_trgm (ở schema
`extensions`) không phân giải → lỗi `42883`, tìm kiếm chết hoàn toàn. Lỗi chỉ lộ khi
**gọi** hàm, không lộ lúc tạo.

**Áp dụng:**
```sql
a operator(extensions.%) b        -- không phải: a % b
extensions.similarity(a, b)       -- không phải: similarity(a, b)
```

---

## 6. SECURITY DEFINER bỏ qua RLS → phải tự kiểm quyền bên trong

RPC ghi vào bảng client không có quyền (`kho_movement`) buộc phải `security definer`.
Đổi lại, RLS không bảo vệ nữa.

**Áp dụng:** thân hàm kiểm vai trò tường minh, ném `42501`:
```sql
if (select public.vai_tro_hien_tai()) = 'chi_xem' then
  raise exception '...' using errcode = '42501';
end if;
```
Hàm cho **job hệ thống** (cron, không có JWT) tách riêng, không kiểm vai trò, và
thu hồi quyền gọi của mọi client.

---

## 7. Supabase mặc định GRANT EXECUTE mọi hàm cho PUBLIC

`grant execute ... to authenticated` **không** thu hồi quyền mặc định của `anon`.
PostgREST phơi mọi hàm ra `/rest/v1/rpc/<tên>`.

**Áp dụng:** luôn viết cặp:
```sql
revoke all    on function public.ten_ham(...) from public, anon;
grant execute on function public.ten_ham(...) to authenticated;
```
Hàm trigger thu hồi sạch khỏi `public, anon, authenticated` — trigger không cần EXECUTE.

---

## Quy trình sau mỗi lần đổi DDL

1. `get_advisors(type: security)` — bảy cảnh báo còn lại đã được chấp nhận có lý do,
   ghi ở `supabase/README.md`. Cảnh báo **mới** ngoài danh sách thì phải xem.
2. Chạy thử hàm vừa đổi trên dữ liệu thật trong khối `DO` ném lỗi ở cuối để rollback.
3. `npm run db:test:linked` và `npm run verify:hook`.

---

## 6. REVOKE một cột KHÔNG gỡ được quyền đã cấp ở mức bảng

Phase 2 (D-16) cần giấu `san_pham.gia_von` khỏi thủ kho. Cách đầu tiên nghĩ ra —
`revoke select (gia_von) on san_pham from authenticated` — **không chặn được gì**:
Postgres coi quyền mức bảng và quyền mức cột là hai lớp riêng, revoke cột không
đụng tới grant bảng. Kiểm bằng `has_column_privilege` mới thấy vẫn `true`.

Cách đúng (migration `0029`):

```sql
revoke select on public.san_pham from anon, authenticated;
grant select (<liệt kê MỌI cột trừ gia_von>) on public.san_pham to authenticated;
```

Hệ quả phải nhớ khi viết code:

- `.select('*')` và `.select()` trống sau `insert`/`update` (PostgREST
  `return=representation`) **lỗi 42501 cho MỌI vai trò**, kể cả quản lý. Luôn liệt
  kê cột.
- **Cột mới thêm sau này phải tự `grant select (<cột>)`** — 0030 quên là màn danh
  mục chết. Khối `DO` tự kiểm cuối 0029 so `information_schema.columns` với
  `has_column_privilege` và ném lỗi ngay khi push nếu thiếu.
- Hàm SECURITY INVOKER trả `setof <bảng>` cũng vỡ theo (`tim_san_pham` phải đổi
  sang `returns table` liệt kê cột). Sau mỗi lần thu quyền cột, grep
  `select \*` và `setof public.<bảng>` trong toàn bộ migration.

## 7. Thu hồi quyền tức thời mà vẫn đọc claim từ JWT

Không thu hồi được một access token đã phát (xác nhận bởi chính Supabase). Thay vì
viết lại hàng chục policy, Phase 2 sửa **hai helper**: chúng vẫn đọc claim nhưng
đối chiếu với bảng trong cùng một lượt tra.

```sql
-- vai trò: claim phải khớp bảng VÀ người dùng phải đang hoạt động
select nd.vai_tro from public.nguoi_dung nd
where nd.id = auth.uid() and nd.dang_hoat_dong
  and nd.vai_tro::text = (auth.jwt() ->> 'vai_tro');

-- kho: GIAO của claim với bảng nguoi_dung_kho
```

- Hạ quyền, gỡ kho, vô hiệu hóa → **hiệu lực ngay câu lệnh kế tiếp**.
- Nâng quyền, thêm kho → chờ token làm mới (client gọi `refreshSession()` khi gặp
  42501, hoặc tối đa `jwt_expiry`).
- Chi phí vẫn là **một lần mỗi câu lệnh** vì policy bọc `(select helper())` →
  Postgres biến thành InitPlan. "Đọc bảng trong policy thì chậm" chỉ đúng khi
  KHÔNG bọc `select`.
- Đổi kiểu trả về của helper (`uuid` → `uuid[]`) phải DROP policy phụ thuộc trước,
  và mọi so sánh đổi thành `kho_id = any((select public.kho_hien_tai())::uuid[])`
  — thiếu `::uuid[]` thì Postgres hiểu `any(subquery)` và ném `uuid = uuid[]`.
