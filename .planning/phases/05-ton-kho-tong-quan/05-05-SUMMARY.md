---
phase: 05-ton-kho-tong-quan
plan: 05
subsystem: database
tags: [supabase, migration, pgtap, types, deploy]

# Dependency graph
requires:
  - phase: 05-ton-kho-tong-quan (plan 01-04)
    provides: bốn migration 0058-0061 và bốn file pgTAP 32-35
provides:
  - "0058-0061 nằm trên database cloud, md5 khớp file trong repo"
  - "Hotfix 0062_sua_the_kho_cot_mo_ho — 0059 làm gãy thẻ kho trên production, bắt được nhờ pgTAP 33"
  - "src/types/database.types.ts sinh lại: danh_sach_ton_kho, de_xuat_dinh_muc, dat_dinh_muc, nap_ton_tam, cột ton_luy_ke"
  - "Toàn bộ pgTAP xanh: 30 file, 380/380 assertion (Phase 5 thêm 56)"
affects: [05-06 → 05-11 (lớp dữ liệu + UI gọi bốn RPC mới), Phase 6]

tech-stack:
  added: []
  patterns:
    - "Đẩy migration qua MCP execute_sql + insert tay vào supabase_migrations.schema_migrations, kiểm bằng md5 — khi máy không có supabase CLI đăng nhập"
    - "Chạy pgTAP qua MCP: thay finish() bằng coalesce(string_agg(finish(true)), 'DAT') để bắt cả trường hợp chạy thiếu assertion"

key-files:
  created:
    - supabase/migrations/0062_sua_the_kho_cot_mo_ho.sql
  modified:
    - src/types/database.types.ts
    - supabase/tests/34_dinh_muc_test.sql

key-decisions:
  - "Không sửa 0059 tại chỗ (đã áp lên cloud) — sửa bằng migration mới 0062 create or replace, giữ nguyên kiểu trả về nên không cần drop"
  - "Test 34 sửa ở TEST, không sửa quyền bảng: nhat_ky_sua cố ý không cấp SELECT cho authenticated (0027, chỉ đọc qua RPC lich_su_sua)"
  - "Không đụng dữ liệu UAT cũ còn trên cloud (UAT-ZQX-001, tài khoản test.uat vô hiệu hóa) — có từ 2026-09-18, không phải do plan này"

patterns-established:
  - "Mọi SELECT cuối trong hàm plpgsql RETURNS TABLE phải gắn tiền tố bảng cho cột — tên cột OUT cũng là biến, tên trơn ném 42702 lúc chạy, grep và typecheck không bắt được"

requirements-completed: [TON-01, TON-02, TQAN-02]

duration: dài (chạy tay 30 file pgTAP qua MCP)
completed: 2026-09-21
---

# Plan 05-05 — Đẩy schema, sinh kiểu, chạy toàn bộ pgTAP

**Bốn migration Phase 5 đã sống trên cloud; pgTAP bắt được 0059 làm gãy thẻ kho production và
đã vá bằng 0062; toàn dự án 380/380 assertion xanh.**

## Lệch so với plan: không có `supabase` CLI

Plan viết cho `npm run db:push` / `db:types` / `db:test:linked`. Máy này không có CLI đăng nhập
và `.env.local` không có mật khẩu DB (người dùng tự điền — không lấy secret thay người dùng).
Thay bằng MCP Supabase, cùng database `phonzyruoalimgaovljm`:

| Việc trong plan | Làm thực tế |
|---|---|
| `db:push` | Gửi nguyên nội dung file qua `execute_sql`, cùng transaction `insert into supabase_migrations.schema_migrations (version, name, statements)`, rồi so `md5(statements[1])` với md5 file đã chuẩn hóa LF |
| `db:types` | MCP `generate_typescript_types`, ghi nguyên trường `types` vào file — không sửa tay |
| `db:test:linked` | Gửi từng file test qua `execute_sql`, dòng `finish()` đổi thành `coalesce((select string_agg(f,' \| ') from finish(true) f), 'DAT')` |

Cách đếm kết quả đã tính cả dòng `ERROR`, đúng như Task 2 yêu cầu. Một file chỉ tính là
ĐẠT khi thỏa hai điều kiện: `execute_sql` không trả lỗi (tức mọi `ERROR` đều làm cả lệnh
thất bại), VÀ `ket_qua = 'DAT'`. Điều kiện thứ hai cần thiết vì `finish(true)` ném lỗi khi
có assert đỏ, nhưng lại KHÔNG ném khi số assert chạy ít hơn `plan(n)`; khi đó nó chỉ trả
dòng "Looks like you planned…". `string_agg` bắt được dòng đó (đã đính chính ở
05-00-SUMMARY).

## Trạng thái migration trên cloud

Trước plan này: remote có tới `0057_tao_phieu_tra`, không có migration lạ nào ≥ 0058.
Sau plan này (MCP `list_migrations`):

```
… 0056 tao_phieu_xuat_tu_don · 0057 tao_phieu_tra
0058 rpc_ton_kho · 0059 the_kho_ton_luy_ke · 0060 de_xuat_dinh_muc · 0061 nap_ton_tam
0062 sua_the_kho_cot_mo_ho
```

md5 thân migration trên cloud khớp file trong git: 0058 `74f10b98…`, 0059 `f964acbe…`,
0060 `61b50db7…`, 0061 `5b431c55…`, 0062 `35fe0ffe…`.

## Sự cố: 0059 làm gãy thẻ kho trên production (đã vá)

pgTAP 33 lần chạy đầu báo `42702 column reference "nguon" is ambiguous`. Nguyên nhân:
câu SELECT cuối của `the_kho_san_pham` bản 0059 dùng tên cột trơn, mà các tên đó trùng
với biến OUT của `RETURNS TABLE`. Lỗi nổ ở **mọi** lần gọi, nên từ lúc đẩy 0059 cho tới
lúc đẩy 0062, tab "Thẻ kho" ở trang chi tiết mã hàng lỗi với mọi người dùng. Plan 05-02
chỉ kiểm được bằng grep vì bản làm việc không có database, mà grep thì không bắt được lỗi
phân giải tên.

Cách sửa: `0062_sua_the_kho_cot_mo_ho.sql`, `create or replace`, chỉ gắn tiền tố `v.` cho
SELECT/ORDER BY cuối. Phần còn lại của thân hàm giữ nguyên từng ký tự. Commit `b92c195`.
Sau khi sửa, test 33 đạt 9/9 và test 42 (thẻ kho Phase 3) đạt 7/7.

## Sửa test 34

Test 34 đọc `nhat_ky_sua` khi vẫn đăng nhập là văn phòng, nên nhận 42501 trước cả
assertion 8. Bảng này **cố ý** không cấp SELECT cho `authenticated` (0027). Sửa bằng cách
dời `dang_xuat()` lên trước assertion đó, giống cách 25 và 91 đang làm. Hàm không sai.
Commit `8f60488`.

## Kết quả pgTAP

| File | plan | Kết quả |
|---|---|---|
| 10 ton_kho | 18 | ĐẠT |
| 20 chung_tu | 20 | ĐẠT |
| 21 danh_sach_chung_tu | 8 | ĐẠT |
| 22 kho_theo_dong | 6 | ĐẠT |
| 23 don_dat_hang | 9 | ĐẠT |
| 24 chung_tu_mo_rong | 12 | ĐẠT |
| 25 duyet_don | 15 | ĐẠT |
| 26 so_dh | 8 | ĐẠT |
| 27 rpc_don | 13 | ĐẠT |
| 28 goi_y_ma_trung | 10 | ĐẠT |
| 29 phieu_xuat_tu_don | 14 | ĐẠT |
| 30 rls | 26 | ĐẠT (gồm "mọi bảng public đều bật RLS") |
| 31 phieu_tra | 18 | ĐẠT |
| **32 danh_sach_ton_kho** | 10 | ĐẠT |
| **33 the_kho_luy_ke** | 9 | ĐẠT (sau 0062) |
| **34 dinh_muc** | 16 | ĐẠT (sau khi sửa test) |
| **35 nap_ton_tam** | 21 | ĐẠT |
| 40 tim_kiem | 14 | ĐẠT |
| 41 danh_sach_san_pham | 16 | ĐẠT |
| 42 the_kho | 7 | ĐẠT |
| 50 doi_chieu | 12 | ĐẠT (sổ cái và tồn trên toàn DB thật: 0 dòng lệch) |
| 51 doi_tac_ghi_chu | 17 | ĐẠT |
| 60 kho_mac_dinh | 10 | ĐẠT |
| 61 import_danh_muc | 14 | ĐẠT |
| 62 ra_hang_loat | 8 | ĐẠT |
| 63 danh_muc_phu | 6 | ĐẠT |
| 70 nhat_ky_sua | 12 | ĐẠT |
| 80 cau_hinh_so_ct | 14 | ĐẠT |
| 90 gia_von | 11 | ĐẠT |
| 91 gia_von_dau_ky | 6 | ĐẠT (ràng buộc nguồn 0060 vẫn nhận `gia_von_dau_ky`) |

**Tổng số assertion: trước Phase 5 là 324; sau Phase 5 là 380.** Mọi file đều `rollback`.
Đã kiểm lại trên cloud: không còn mã hàng, chứng từ, đơn, nhóm, đối tác hay dòng lưu trữ
KiotViet nào mang tiền tố test. `chuoi_so_ct` các năm 2091–2093 trống.

Bản 30 file đã chuyển đổi nằm ở thư mục scratchpad của phiên (không commit). Nội dung khớp
`supabase/tests/` trừ đúng dòng `finish`.

## Smoke test trên dữ liệu thật (phiên quản lý, không phải service role)

- `danh_sach_ton_kho(p_kich_thuoc := 1)` trả 1 dòng, `tong_so_dong = 3266` (đủ danh mục).
- `the_kho_san_pham(<mã có nhiều biến động nhất>)` trả 4 dòng; cả 4 dòng đều có
  `ton_luy_ke`, không lỗi 42501/42702.
- `de_xuat_dinh_muc` chạy trên toàn danh mục, trả đủ ba nguồn `theo_ma`,
  `trung_binh_nhom`, `khong_du_lieu`.

## Kiểu và build

`src/types/database.types.ts` +63/−0. `npm run check` (typecheck → lint → build) xanh.

## Chưa làm / để lại

- **Chưa mở tab Thẻ kho trên trình duyệt.** Mở được thì phải đăng nhập bằng mật khẩu,
  mà việc đó để người dùng tự làm. Việc này dồn sang UAT 05-11. Tầng RPC đã chứng minh
  hàm chạy được bằng phiên người dùng.
- Dữ liệu UAT cũ trên cloud (`UAT-ZQX-001`, tài khoản `test.uat@khominhvu.local` đang vô
  hiệu hóa): có từ ngày 18/09, không phải do plan này tạo, để nguyên chờ người dùng quyết.
