# Pattern: pgTAP và kiểm chứng database

Rút từ Phase 1. Lần chạy thật đầu tiên bắt được 4 lỗi **trong test** và 1 false pass.

---

## 1. Assert theo mã lỗi thì phải chắc chỉ có MỘT đường dẫn tới mã đó

**Đã gặp (false pass):** assertion "chỉ xem không tạo được chứng từ" đọc bảng tạm
`t_id` thuộc sở hữu `postgres`. Dưới role `authenticated`, đọc bảng tạm ném `42501`
— **trùng mã với "RLS từ chối"**. Test xanh vì lý do sai. Nếu RLS hỏng hoàn toàn,
test vẫn xanh.

**Áp dụng:** mọi bảng tạm dùng dưới role khác:
```sql
create temp table t_id as ...;
grant select on t_id to authenticated;
```
Sau khi grant mà vẫn `42501` thì mới đúng là policy chặn.

---

## 2. Test đếm tổng không được giả định bảng rỗng

**Đã gặp:** `tim_san_pham('bd') = 2` xanh trên DB rỗng, ra `20` khi có 3.266 mã thật
(`bd` khớp 37 mã thật, chạm giới hạn).

**Áp dụng:**
- Assertion đếm tổng chỉ dùng từ khóa **không thể khớp dữ liệu thật** (đã kiểm: `zqx`).
- Mọi truy vấn khác kiểm **có mặt**: `exists (select 1 from ... where ma_hang = 'X')`.
- **Chạy lại toàn bộ pgTAP sau khi nạp dữ liệu thật** — bắt đúng loại lỗi này.

---

## 3. Hai lớp chặn cho ra hai mã lỗi khác nhau — đó là bằng chứng tốt

Sổ cái chặn sửa/xóa bằng REVOKE (lớp 1) và trigger (lớp 2):
- `service_role` → **42501**: REVOKE chặn trước khi trigger kịp chạy
- `postgres` (chủ bảng) → **23514**: REVOKE không áp dụng, trigger chặn

Test cả hai role. Nếu ai bỏ REVOKE, assertion `service_role` đổi thành 23514 và lộ ra.

---

## 4. Race condition KHÔNG test được trong pgTAP

pgTAP chạy mọi thứ trong một transaction. Hai INSERT tuần tự trong cùng transaction
vốn đã tuần tự — không bắt được lỗi thứ tự khóa.

**Áp dụng:** `scripts/test-dong-thoi.sh` — hai tiến trình `psql`, transaction chồng nhau.
Kỳ vọng đúng với thứ tự khóa đúng: giá vốn `166.6667`. Sai thứ tự sẽ ra `150` hoặc `175`.

Dọn dữ liệu sổ cái (append-only) bằng `set session_replication_role = replica` —
chỉ trong phiên, phiên chết tự khôi phục. **Không** dùng `ALTER TABLE ... DISABLE TRIGGER`
(toàn cục, nằm lại nếu script chết).

Cần `DATABASE_URL` là **Session pooler** cổng 5432. Direct connection của Supabase là
IPv6-only; Transaction pooler (6543) không giữ khóa giữa các câu lệnh.

---

## 5. Helper pgTAP để ở `.inc`, không `.sql`

Mọi file `.sql` trong `supabase/tests/` bị runner chạy như một test — thiếu `plan()` là fail.
Bản gốc ở `00_helper.sql.inc`, chép vào đầu mỗi file test. Hàm helper tạo trong `pg_temp`.

---

## 6. Kiểm logic trên database thật mà không để lại gì

Sổ cái không xóa được, nên dữ liệu test trên cloud là vĩnh viễn — trừ khi:
```sql
do $test$
begin
  -- dựng dữ liệu, chạy, gom kết quả vào biến kq
  raise exception '>>> %: %', case when ok then 'TAT CA DUNG' else 'CO LOI' end, kq;
end $test$;
```
Ném lỗi ở cuối → rollback toàn bộ, kết quả nằm trong thông báo lỗi.

---

## 7. `apply_migration` qua MCP ghi version dạng timestamp

Không theo tên file local. Lần `db:push` sau sẽ chạy lại → lỗi vì object đã tồn tại.

**Áp dụng:** ưu tiên `npm run db:push` (ghi đúng version). Nếu buộc phải dùng MCP,
sửa ngay:
```sql
update supabase_migrations.schema_migrations
set version = '0023', name = 'ten_migration'
where version = '<timestamp>';
```
Kiểm bằng `npx supabase db push --dry-run` → phải báo "up to date".

---

## Bộ lệnh kiểm chứng đầy đủ

```bash
npm run db:test:linked    # 79 assertion — cần Docker daemon (pg_prove chạy trong container)
npm run test:dong-thoi    # race condition giá vốn + đánh số
npm run verify:hook       # hook thật sự bơm claim khi đăng nhập
npm run check             # typecheck + lint + build
```
