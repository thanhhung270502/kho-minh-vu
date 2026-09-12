# Phase 1: Nền dữ liệu — Summary

**Ngày:** 2026-09-12
**Trạng thái:** Đã chạy thật trên Supabase cloud `kho-vu-tru` (ap-southeast-1).
23 migration áp xong, logic lõi và phân quyền đã kiểm chứng bằng dữ liệu thật.
Còn lại: bộ pgTAP đầy đủ (cần Docker) và nạp dữ liệu KiotViet (cần file export).

---

## Đã viết

| Hạng mục | Số lượng |
|---|---|
| Migration | 19 file, 1.617 dòng SQL |
| Test pgTAP | 5 file, 67 assertion |
| Script TypeScript | 9 file, 1.206 dòng |
| Tài liệu vận hành | `supabase/README.md`, 199 dòng |

**16 bảng** (13 nghiệp vụ + `chuoi_so_ct` + 2 bảng lưu trữ KiotViet),
5 enum, 1 view, 6 RPC công khai, 8 hàm nội bộ.

---

## Trạng thái thật của 17 yêu cầu

Không yêu cầu nào được tính là **xong** vì chưa chạy trên database thật.
Cột "Kiểm chứng bằng" là việc phải làm sau khi có project Supabase.

| Yêu cầu | Code | Kiểm chứng bằng |
|---|---|---|
| DATA-01 schema 16 bảng | ✅ | `npm run db:push` |
| DATA-02 sổ cái bất biến | ✅ | `10_ton_kho_test.sql` |
| DATA-03 tồn tự cập nhật | ✅ | `10_ton_kho_test.sql` |
| DATA-04 giá vốn bình quân | ✅ | `10_ton_kho_test.sql` + test đồng thời **chưa viết** |
| DATA-05 ghi sổ atomic | ✅ | `20_chung_tu_test.sql` |
| DATA-06 bút toán đảo | ✅ | `20_chung_tu_test.sql` |
| DATA-07 tìm không dấu | ✅ | `40_tim_kiem_test.sql` |
| DATA-08 đánh số không trùng | ✅ | `20_chung_tu_test.sql` + test đồng thời **chưa viết** |
| DATA-09 đối chiếu tồn | ✅ | `50_doi_chieu_test.sql` |
| DATA-10 bộ test pgTAP | ✅ | `npm run db:test:linked` |
| AUTH-03 vai trò trong JWT | ✅ | `npm run verify:hook` — **bắt buộc bật hook trên Dashboard trước** |
| AUTH-04 thủ kho theo kho | ✅ | `30_rls_test.sql` |
| AUTH-05 không sửa giá | ✅ | `30_rls_test.sql` |
| AUTH-06 chỉ xem không ghi | ✅ | `30_rls_test.sql` |
| DLIEU-01 nạp danh mục | ✅ script | cần 4 file export thật |
| DLIEU-02 tách ĐVT/công đoạn | ✅ script | cần 4 file export thật |
| DLIEU-03 gán công đoạn còn lại | ✅ script báo cáo | cần 4 file export thật |

---

## Nợ lại, ghi rõ để không quên

1. **Test đồng thời 2 kết nối chưa viết.** Plan 01-10 Task 3 và 01-11 Task 3 yêu
   cầu test race condition cho trigger giá vốn và cho `sinh_so_ct`. Chưa viết vì
   cần một database đang chạy để chọn giữa `dblink` và script Node hai client.
   **Đây là lỗ hổng kiểm chứng thật:** lỗi thứ tự khóa trong trigger giá vốn chỉ
   lộ dưới đồng thời, test một-transaction sẽ xanh trong khi sản xuất lệch tiền.
2. **`src/types/database.types.ts` vẫn là stub rỗng.** Phase 2 không bắt đầu được
   cho tới khi chạy `npm run db:types`.
3. **Không có SUMMARY riêng cho từng plan.** Phase này thực thi liền mạch chứ
   không theo wave vì không có database để verify giữa các wave.

---

## Lệch khỏi plan, có lý do

| Lệch | Vì sao |
|---|---|
| `0014a/b/c` → `0014/0015/0016` | Supabase CLI cần `<số>_<tên>.sql`; chữ cái ngay sau phần số không khớp regex |
| Dữ liệu nền (kho, ĐVT, công đoạn) vào migration `0018` thay vì `seed.sql` | `supabase db push` lên cloud KHÔNG chạy `seed.sql`, mà đây là dữ liệu tham chiếu ứng dụng cần ở mọi môi trường |
| `scripts/seed-users.ts` thành đường CHÍNH thay vì dự phòng | Hệ quả của việc trên — trên cloud không có đường nào khác tạo được tài khoản |
| Helper pgTAP để ở `.inc`, chép vào từng file test | Mọi file `.sql` trong `supabase/tests/` đều bị runner chạy như một test và fail nếu thiếu `plan()` |
| Thêm migration `0019_nap_danh_muc.sql` | Cần một RPC nhận jsonb để toàn bộ upsert nằm trong một transaction — `supabase-js` không mở transaction nhiều lệnh được |
| Thực thi liền mạch thay vì theo 12 wave | Wave tồn tại để verify sau mỗi bước; không có database thì không verify được, chia wave thành hình thức |

---

## Quyết định mới phát sinh

- **`jwt_expiry = 3600`** (Open Question 1 của RESEARCH.md đã có đáp án): claim cũ
  sống tối đa 1 giờ sau khi đổi vai trò. Phase 2 (CDAT-01) phải gọi
  `auth.admin.signOut(userId, 'others')` sau khi đổi vai trò.
- **Văn phòng tạo mã hàng phải để `gia_ban = 0`**, quản lý cập nhật giá sau.
  Hệ quả của việc bịt đường INSERT. Sửa ở một chỗ: nhánh `tg_op = 'INSERT'` của
  `chan_sua_gia_khong_du_quyen` trong `0015_rls_danh_muc.sql`. **Cần người dùng
  xác nhận** — nếu vận hành thấy vướng thì đây là ma sát thừa.
- **Hạ tầng đổi từ local sang cloud** giữa chừng: máy hết đĩa (441/460 GB).
  Kéo theo mọi thay đổi ở bảng "Lệch khỏi plan" bên trên.

---

## Chặn ngoài tầm kiểm soát

1. **Chưa có project Supabase.** Org `vutru-productionplanning` ở gói free, đã
   dùng hết 2 project (`PO DB`, `tinhgianoibo`). Người dùng sẽ tự tạo.
2. **Đĩa còn 1.9 GB / 460 GB (100%).** `npm install` chưa chạy được an toàn.
3. **Chưa có 4 file export KiotViet** trong `data/kiotviet/`.

---

## Chạy thật tìm ra 5 lỗi mà đọc code không thấy

Đây là phần đáng giá nhất của việc thực thi. Không lỗi nào trong số này lộ ra
khi đọc lại code — tất cả chỉ hiện khi Postgres thật sự chạy.

| # | Lỗi | Mức | Phát hiện bằng |
|---|---|---|---|
| 1 | View `v_doi_chieu_ton` chạy quyền người tạo → thủ kho đọc thẳng view thấy tồn cả hai kho, lách AUTH-04 | **ERROR** | Security Advisor |
| 2 | `search_path=''` làm `tim_san_pham` không phân giải được toán tử `%` của pg_trgm → 42883, tìm kiếm chết | Chặn | Chạy thử |
| 3 | Toán tử `%` đo độ giống toàn chuỗi → gõ "bac dan" trả 0 kết quả, hỏng đúng ca dùng chính | Chặn | Chạy thử |
| 4 | Job cron gọi `doi_chieu_ton()` rồi vứt kết quả — phát hiện lệch xong không ai thấy | Thiết kế | Đọc lại job thật |
| 5 | Hook không đọc được `nguoi_dung` vì RLS bật mà policy chỉ `to authenticated`, thiếu `supabase_auth_admin` | Chặn | `verify:hook` |

**Lỗi 5 đáng chú ý nhất:** hook KHÔNG báo lỗi. Nó chạy, query trả 0 dòng vì RLS,
`vai_tro` = NULL, trả claims nguyên vẹn. Đăng nhập thành công, token hợp lệ, chỉ
thiếu claim — và RLS sau đó từ chối mọi thứ. pgTAP không bao giờ bắt được vì nó
đặt thẳng `request.jwt.claims`. Đúng lý do `scripts/verify-hook.ts` tồn tại.

**Lỗi 2 do chính bản vá của lỗi 1 gây ra** — vá bảo mật xong thì tính năng chết.

## Đã kiểm chứng trên database thật

| Hạng mục | Kết quả |
|---|---|
| Schema | 17 bảng, 5 enum, 38 policy, 54 index, 18 trigger, **0 bảng thiếu RLS** |
| Giá vốn bình quân | 100 → **150** → (xuất không đổi) → **300** sau khi tồn về 0 |
| Sổ cái bất biến | UPDATE/DELETE bị chặn `23514` **kể cả dưới role postgres** |
| Đánh số chứng từ | `PN26-000001` → `PN26-000002`, `PX26-000001` độc lập theo loại |
| Tìm kiếm | 9/9 ca: không dấu, có dấu, theo mã, gõ 2 ký tự, gõ sai chính tả |
| Phân quyền | 11/11 ca: AUTH-04 (4), AUTH-05 (4), AUTH-06 (3) |
| Auth hook | 4/4 tài khoản nhận đúng `vai_tro`, thủ kho nhận đúng `kho_id` |
| TypeScript | `database.types.ts` 1.158 dòng; typecheck + lint + build xanh |

Mọi dữ liệu test chạy trong khối rollback — database chỉ còn dữ liệu nền và
4 tài khoản mẫu.

## Còn lại

1. **Bộ pgTAP đầy đủ** — `npm run db:test:linked` cần Docker daemon đang chạy
   (CLI chạy `pg_prove` trong container). Phần giá trị nhất của nó đã kiểm bằng
   SQL trực tiếp ở trên.
2. **Test đồng thời 2 kết nối** — chưa viết. Lỗi thứ tự khóa trong trigger giá
   vốn chỉ lộ dưới tải thật.
3. **DLIEU-01..03** — cần 4 file export KiotViet trong `data/kiotviet/`.

---

*Bước tiếp theo: người dùng làm 6 bước trong `supabase/README.md`, rồi
`/spartan:phase verify 1`.*
