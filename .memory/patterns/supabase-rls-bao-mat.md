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
