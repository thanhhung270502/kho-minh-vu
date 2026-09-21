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

**Áp dụng:** `scripts/test-concurrency.sh` — hai tiến trình `psql`, transaction chồng nhau.
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

## 8. `now()` là hằng số suốt một transaction pgTAP — đừng ORDER BY nó để tìm "dòng mới nhất"

**Đã gặp:** test nhật ký sửa (Phase 2) chèn hai dòng cùng `truong` ở hai câu UPDATE
khác nhau trong cùng file, rồi `order by sua_luc desc limit 1` để lấy dòng mới nhất
— sai ngẫu nhiên vì `now()` trả về giờ BẮT ĐẦU TRANSACTION, giống hệt nhau cho mọi
dòng chèn trong cùng file `begin; ... rollback;`. Không có thứ tự để `ORDER BY` phân biệt.

**Áp dụng:** không dùng cột timestamp mặc định `now()` để suy luận "mới nhất" trong
pgTAP. Kiểm bằng NỘI DUNG cụ thể của dòng cần tìm (`exists (... and cot = 'gia_tri_vua_ghi')`)
thay vì thứ tự thời gian.

---

## 9. `finish(true)` KHÔNG ném lỗi khi chạy thiếu assertion

**Đã gặp (Phase 5, 05-00):** ghi nhận nhầm rằng `finish(true)` ném lỗi mọi khi file
không đạt. Thực tế nó ném khi có assert đỏ, nhưng khi số assert chạy **ít hơn**
`plan(n)` thì chỉ trả về một dòng `# Looks like you planned N tests but ran M`, và lệnh
vẫn thành công.

**Áp dụng (chạy pgTAP qua MCP `execute_sql`, không cần Docker/CLI):** thay dòng cuối
`select * from finish();` bằng
```sql
select coalesce((select string_agg(f, ' | ') from finish(true) f), 'DAT') as ket_qua;
```
File chỉ ĐẠT khi lệnh không lỗi **và** `ket_qua = 'DAT'`. Mỗi file một lần gọi, giữ
nguyên `begin; … rollback;`.

---

## 10. Hàm plpgsql `RETURNS TABLE`: tên cột trơn ở SELECT cuối → 42702 lúc CHẠY

**Đã gặp (Phase 5, 0059 → hotfix 0062):** `the_kho_san_pham` viết `select nguon, ngay, …
from voi_luy_ke`. Mỗi tên cột trong `RETURNS TABLE(...)` cũng là biến OUT, nên
Postgres báo `column reference "nguon" is ambiguous` ở **mọi** lần gọi. Tab Thẻ kho gãy
trên production cho tới khi có hotfix. `create function` vẫn thành công, grep không
thấy gì bất thường, typecheck vẫn xanh. Chỉ khi GỌI hàm mới lộ ra.

**Áp dụng:**
- SELECT/ORDER BY cuối trong hàm `RETURNS TABLE` luôn gắn tiền tố bảng: `v.nguon`.
- Plan nào sửa một hàm thì phải **gọi thật** hàm đó trên database ngay sau khi đẩy lên
  (pgTAP hoặc một câu gọi). Chỉ `create or replace` thành công thì chưa đủ để coi là xong.

---

## 11. Bảng cố ý không cấp SELECT cho client: đọc dưới `dang_xuat()`

`nhat_ky_sua` (0027) không cấp SELECT cho `authenticated`; client chỉ đọc qua RPC
`lich_su_sua`. Test mà đọc thẳng bảng này lúc còn `dang_nhap_nhu(...)` sẽ nhận 42501
trước cả assertion (đã gặp ở 34_dinh_muc). Hãy về `postgres` trước khi đọc, như
`25_duyet_don` và `91_gia_von_dau_ky` đang làm. Đừng "sửa" bằng cách cấp quyền.

---

## 12. Đẩy migration không cần CLI: MCP `execute_sql` + md5

Máy không có `supabase login` / mật khẩu DB thì trong MỘT lệnh `execute_sql` gửi:
nguyên văn file migration, rồi dòng `-- @@ghi-lich-su@@`, rồi
```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('00NN', 'ten', array[left(current_query(), strpos(current_query(), '-- @@ghi-lich-su@@') - 1)]);
```
Cả khối chạy trong một transaction ngầm. Sau đó so `md5(statements[1])` với md5 của
file đã chuẩn hóa LF: khớp thì history trên cloud đúng từng ký tự với git. Đừng dùng
`apply_migration`, vì nó ghi version bằng timestamp (mục 7).

## Bộ lệnh kiểm chứng đầy đủ

```bash
npm run db:test:linked    # 79 assertion — cần Docker daemon (pg_prove chạy trong container)
npm run test:dong-thoi    # race condition giá vốn + đánh số
npm run verify:hook       # hook thật sự bơm claim khi đăng nhập
npm run check             # typecheck + lint + build
```
