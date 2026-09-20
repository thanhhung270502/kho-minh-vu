---
phase: 04-don-dat-hang-phieu-xuat
plan: 02
subsystem: database
tags: [postgres, rls, security-definer, pgtap, supabase]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 01
    provides: "trang_thai_ddh chỉ mang trục duyệt (TAM|DA_XAC_NHAN|HOAN_THANH|DA_HUY), _cap_nhat_tien_do_ddh tự đóng HOAN_THANH đúng lúc"
provides:
  - "Ba RPC duyệt đơn: xac_nhan_don/mo_khoa_don/dong_don_som (D-05/D-06/D-07), SECURITY DEFINER, chỉ quan_ly gọi được"
  - "Bốn policy ghi trên don_dat_hang/don_dat_hang_dong siết từ <> 'chi_xem' xuống in ('quan_ly','van_phong') — vá lỗ quyền thu_kho insert thẳng qua PostgREST"
  - "Policy for delete còn thiếu trên don_dat_hang_dong (đòi cha đang TAM)"
  - "Trigger ghi_nhat_ky_don_dat_hang — mọi lần đổi trạng thái đơn để lại dòng trong nhat_ky_sua"
  - "Bảng chuoi_so_dh + hàm sinh_so_dh (D-06): cấp số đơn dạng DH{YY}-{6 chữ số}, atomic, chỉ quan_ly/van_phong cấp được"
affects: [04-03, 04-04, 04-05, 04-06, 04-07, "mọi plan sau của Phase 4 dùng ba RPC duyệt đơn + sinh_so_dh + policy ghi mới"]

tech-stack:
  added: []
  patterns:
    - "Kiểm vai trò trong RPC SECURITY DEFINER dùng \"not in (...)\" hoặc \"!=\" thay vì toán tử so sánh <>, để tránh tái lập đúng hình dạng vị từ lỏng lẻo đang bị thay"
    - "coalesce((select vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly') — ngữ cảnh không JWT được coi như quan_ly, giữ migration/script/pgTAP không bị chặn"
    - "insert ... on conflict (nam) do update set ... returning — chép nguyên kỹ thuật atomic của sinh_so_ct cho bộ đếm riêng, không dùng lại bảng chuoi_so_ct vì nó khóa theo enum loai_ct"
    - "Đối chiếu pg_policies TRÊN DATABASE THẬT trước khi sửa policy, không suy từ file migration cũ trong repo (bài học Phase 3)"

key-files:
  created:
    - supabase/migrations/0052_rpc_duyet_don.sql
    - supabase/migrations/0053_sinh_so_dh.sql
    - supabase/tests/25_duyet_don_test.sql
    - supabase/tests/26_so_dh_test.sql
  modified:
    - supabase/tests/23_don_dat_hang_test.sql
    - src/types/database.types.ts

key-decisions:
  - "D-06/D-07 (04-CONTEXT.md): siết bốn policy ghi don_dat_hang/don_dat_hang_dong xuống in('quan_ly','van_phong'), vá lỗ quyền thu_kho insert thẳng qua PostgREST bỏ qua sinh_so_dh"
  - "Không dùng toán tử so sánh <> ở bất kỳ đâu trong 0052/0053 — dùng not in (...)/!= — để không tái lập hình dạng vị từ lỏng lẻo đang bị thay, đúng ý đồ verify của kế hoạch"
  - "[Rule 3 - blocking] Mở rộng CHECK nhat_ky_sua.bang thêm 'don_dat_hang': constraint cũ (0027) chỉ cho 3 bảng, gắn trigger generic vào don_dat_hang mà không mở rộng sẽ làm MỌI update/insert trên don_dat_hang vỡ ngay từ RPC đầu tiên"
  - "Bảng chuoi_so_dh tách riêng khỏi chuoi_so_ct — chuoi_so_ct khóa theo (loai_ct, nam, nguon) với loai_ct là enum bảy loại chứng từ, thêm giá trị giả cho đơn đặt hàng sẽ ô nhiễm mọi nhánh switch theo bảy loại đó"

requirements-completed: [DDH-01, DDH-03]

duration: 19min
completed: 2026-09-20
---

# Phase 4 Plan 02: RPC duyệt đơn + bộ cấp số đơn Summary

**Ba RPC duyệt đơn (xac_nhan_don/mo_khoa_don/dong_don_som) chỉ quản lý gọi được, vá lỗ quyền khiến thủ kho từng insert thẳng vào don_dat_hang qua PostgREST bỏ qua sinh_so_dh, và bộ cấp số đơn atomic tách riêng khỏi chuoi_so_ct.**

## Performance

- **Duration:** ~19 phút
- **Started:** 2026-09-20T03:15:30Z
- **Completed:** 2026-09-20T03:34:06Z
- **Tasks:** 3/3
- **Files modified:** 6 (2 migration mới, 2 file pgTAP mới, 1 file pgTAP sửa, 1 file kiểu TypeScript sinh lại)

## Accomplishments

- `xac_nhan_don`/`mo_khoa_don`/`dong_don_som` đúng D-05/D-06/D-07: chỉ `quan_ly` gọi được (ngữ cảnh không JWT được coi như `quan_ly` để không làm đỏ migration/script/pgTAP), khóa dòng bằng `for update`, kiểm trạng thái nguồn trước khi chuyển.
- **Vá lỗ quyền thật đang mở**: bốn policy ghi trên `don_dat_hang`/`don_dat_hang_dong` trước 0052 chỉ loại vai trò `chi_xem` — nghĩa là `thu_kho` từng insert thẳng vào hai bảng đơn qua PostgREST được, bỏ qua nút "Tạo đơn" và bỏ qua luôn `sinh_so_dh`. Siết xuống đúng `in ('quan_ly','van_phong')`, xác nhận bằng transaction rollback tay: `thukho1` insert `don_dat_hang` → `42501` thật.
- Thêm policy `for delete` còn thiếu trên `don_dat_hang_dong` (trước đó xóa một dòng đơn đang bất khả thi).
- Trigger `ghi_nhat_ky_don_dat_hang` dùng lại hàm generic `ghi_nhat_ky_sua()` của Phase 2 — mọi lần đổi trạng thái đơn (xác nhận/mở khóa/đóng sớm) để lại dòng `nhat_ky_sua`.
- `chuoi_so_dh` + `sinh_so_dh`: chép nguyên kỹ thuật atomic (`insert ... on conflict ... returning` trong một câu lệnh) của `sinh_so_ct`, tách bảng riêng vì `chuoi_so_ct` khóa theo enum `loai_ct` không có giá trị cho đơn đặt hàng. Chỉ `quan_ly`/`van_phong` cấp số được.

## Task Commits

1. **Task 1: RPC duyệt đơn, siết quyền ghi đơn, trigger nhật ký** - `c8ba47d` (feat)
2. **Task 2: Bộ cấp số đơn không trùng khi hai người tạo cùng lúc** - `f385a52` (feat)
3. **Task 3: Đẩy migration, sinh lại kiểu, chạy toàn bộ pgTAP + sửa test bị vô hiệu bởi policy mới** - `2718c99` (fix)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `supabase/migrations/0052_rpc_duyet_don.sql` - Ba RPC duyệt đơn, siết bốn policy ghi don_dat_hang/don_dat_hang_dong, policy for delete mới, trigger nhật ký, mở rộng CHECK của nhat_ky_sua.bang
- `supabase/migrations/0053_sinh_so_dh.sql` - Bảng `chuoi_so_dh` + hàm `sinh_so_dh`
- `supabase/tests/25_duyet_don_test.sql` - 15 assert: lỗ quyền vừa vá, ba RPC, policy update/insert/delete theo trạng thái, trigger nhật ký
- `supabase/tests/26_so_dh_test.sql` - 8 assert: hai lần gọi liên tiếp khác nhau, định dạng số, quyền theo vai trò, ngữ cảnh không JWT
- `supabase/tests/23_don_dat_hang_test.sql` - Sửa hai fixture (đơn A, đơn B) từ "tạo thẳng DA_XAC_NHAN" sang "tạo TAM → insert dòng → UPDATE sang DA_XAC_NHAN" cho khớp policy insert mới của 0052
- `src/types/database.types.ts` - Sinh lại: thêm `xac_nhan_don`/`mo_khoa_don`/`dong_don_som`/`sinh_so_dh` vào khối `Functions`, bảng `chuoi_so_dh`

## Đối chiếu policy cũ (BƯỚC 0 — nguyên văn từ `pg_policies` trên database thật, 20/09)

```
             polname              | polcmd |                                using_expr                                |                                check_expr
-----------------------------------+--------+--------------------------------------------------------------------------+--------------------------------------------------------------------------
 tao don dat hang tru chi xem      | a      |                                                                          | (vai_tro_hien_tai() <> 'chi_xem')
 doc don dat hang                  | r      | true                                                                     |
 sua don dat hang                  | w      | (vai_tro_hien_tai() <> 'chi_xem')                                        | (vai_tro_hien_tai() <> 'chi_xem')
 tao dong don dat hang tru chi xem | a      |                                                                          | (vai_tro_hien_tai() <> 'chi_xem')
 doc dong don dat hang             | r      | (EXISTS (SELECT 1 FROM don_dat_hang d WHERE d.id = don_dat_hang_dong.don_dat_hang_id)) |
 sua dong don dat hang             | w      | (vai_tro_hien_tai() <> 'chi_xem')                                        | (vai_tro_hien_tai() <> 'chi_xem')
```

Kết luận đối chiếu: nội dung khớp hệt file `0016_rls_chung_tu.sql` trong repo — không có phân kỳ giữa file và database thật lần này (khác Phase 3, nơi `kho_hien_tai()` đã đổi kiểu mà file cũ trong repo không phản ánh).

**Tên policy cũ → mới:**

| Tên cũ | Tên mới | Đổi gì |
|---|---|---|
| `tao don dat hang tru chi xem` | `tao don dat hang` | vị từ `<> 'chi_xem'` → `in ('quan_ly','van_phong')` |
| `tao dong don dat hang tru chi xem` | `tao dong don dat hang` | vị từ `<> 'chi_xem'` → `in ('quan_ly','van_phong')` + đòi cha đang `TAM` |
| `sua don dat hang` | `sua don dat hang` (giữ tên) | using thêm điều kiện `trang_thai = 'TAM'`, vị từ vai trò → `in ('quan_ly','van_phong')` |
| `sua dong don dat hang` | `sua dong don dat hang` (giữ tên) | vị từ vai trò → `in ('quan_ly','van_phong')` + đòi cha đang `TAM` |
| *(không có)* | `xoa dong don dat hang khi tam` | policy `for delete` mới — trước đây không tồn tại |

**Kiểm chiều hỏi giữa hai policy đơn (mục (e) của migration 0052):** policy của `don_dat_hang_dong` hỏi ngược lên `don_dat_hang` (qua `exists`), nhưng ba policy của `don_dat_hang` (đọc/tạo/sửa) không hỏi ngược lại `don_dat_hang_dong` — một chiều duy nhất, không có vòng đệ quy, không cần cắt bằng hàm `SECURITY DEFINER` kiểu 0042.

## Kết quả ba lệnh kiểm tay (transaction + rollback, sau khi push)

| Lệnh | Vai trò | Kết quả mong đợi | Kết quả thật |
|---|---|---|---|
| `update don_dat_hang set ghi_chu=... where trang_thai='DA_XAC_NHAN'` | `vanphong` | 0 dòng bị sửa | **0 dòng** — đúng |
| `select xac_nhan_don(id_don_DA_XAC_NHAN)` | `vanphong` | `42501` | **`ERROR: Chỉ quản lý được xác nhận đơn`** (42501) — đúng |
| `insert into don_dat_hang (so_dh, doi_tac_id) values (...)` | `thukho1` | `42501` | **`ERROR: new row violates row-level security policy for table "don_dat_hang"`** (42501) — đúng |
| `select sinh_so_dh(2091::smallint)` | `thukho1` | `42501` | **`ERROR: Tài khoản không có quyền cấp số đơn`** (42501) — đúng |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `nhat_ky_sua.bang` CHECK constraint không cho phép `'don_dat_hang'`**
- **Found during:** Task 1, viết trigger `ghi_nhat_ky_don_dat_hang`
- **Issue:** `0027_nhat_ky_sua.sql` tạo `nhat_ky_sua` với `check (bang in ('san_pham', 'doi_tac', 'nguoi_dung'))`. Gắn trigger generic `ghi_nhat_ky_sua()` vào `don_dat_hang` mà không mở rộng constraint này sẽ khiến MỌI insert/update trên `don_dat_hang` vỡ ngay ở lần ghi đầu tiên (chính constraint đó ném `23514`), chặn đứng cả ba RPC.
- **Fix:** `alter table nhat_ky_sua drop constraint ...` rồi `add constraint ... check (bang in (..., 'don_dat_hang'))` trong chính `0052`, ngay trước khi tạo trigger.
- **Files modified:** `supabase/migrations/0052_rpc_duyet_don.sql`
- **Verification:** pgTAP 25 assert 14-15 (nhật ký bắt được lần chuyển `DA_XAC_NHAN` và `HOAN_THANH`) xanh.
- **Committed in:** `c8ba47d`

**2. [Rule 1 - Bug do policy mới của chính plan này] Test 23 (Plan 04-01) dựng fixture "tạo thẳng đơn `DA_XAC_NHAN`" — vỡ vì policy insert dòng mới đòi cha đang `TAM`**
- **Found during:** Task 3, chạy lại toàn bộ pgTAP sau khi push
- **Issue:** `23_don_dat_hang_test.sql` (viết ở Plan 04-01, trước khi có 0052) tạo `don_dat_hang` với `trang_thai = 'DA_XAC_NHAN'` ngay từ câu `insert`, rồi insert dòng vào `don_dat_hang_dong`. Policy `"tao dong don dat hang"` mới của 0052 đòi cha đang `TAM` lúc insert dòng — insert dòng vỡ với `42501`, kéo cả transaction pgTAP vào trạng thái aborted, làm rớt hết các assert còn lại của file.
- **Fix:** Đổi hai fixture (đơn A, đơn B) sang khuôn `TAM → insert dòng → UPDATE sang DA_XAC_NHAN`. `UPDATE` hợp lệ vì policy `"sua don dat hang"` chỉ kiểm trạng thái HIỆN TẠI (`TAM`) trong `using`, không chặn giá trị đích trong `with check` (chỉ kiểm vai trò).
- **Files modified:** `supabase/tests/23_don_dat_hang_test.sql`
- **Verification:** `23_don_dat_hang_test.sql` chạy lại 9/9 assert xanh, không đổi ý nghĩa test (vẫn kiểm đúng ba kịch bản DDH-02/DDH-03 của Plan 04-01).
- **Committed in:** `2718c99`

**3. [Rule 1 - Bug tự viết trong plan này] Test 25/26 chuyển vai trò liên tiếp không qua `dang_xuat()` — không đọc được `auth.users`/`nhat_ky_sua`**
- **Found during:** Task 3, chạy lần đầu
- **Issue:** Sau khi `dang_nhap_nhu()` gọi lần đầu, `role` GUC còn ở `authenticated`. Gọi tiếp `dang_nhap_nhu()` cho vai trò khác trong khi `role` vẫn là `authenticated` khiến câu `select ... from auth.users` bên trong hàm chạy DƯỚI quyền `authenticated` (không có SELECT trên `auth.users`) → `permission denied for table users`, cascade abort transaction. Tương tự, đọc trực tiếp `nhat_ky_sua` (REVOKE ALL khỏi `authenticated` từ 0027) khi đang ở vai trò `quan_ly` cũng vỡ.
- **Fix:** Thêm `select pg_temp.dang_xuat();` trước MỌI lần chuyển sang vai trò khác (đúng quy ước đã dùng nhất quán ở `80_cau_hinh_so_ct_test.sql`/`70_nhat_ky_sua_test.sql`), và trước khi đọc `nhat_ky_sua` trực tiếp ở cuối test 25.
- **Files modified:** `supabase/tests/25_duyet_don_test.sql`, `supabase/tests/26_so_dh_test.sql`
- **Verification:** Toàn bộ pgTAP 269 ok / 0 not ok / 0 ERROR sau fix.
- **Committed in:** `2718c99`

---

**Total deviations:** 3 auto-fixed (1 Rule 3 - blocking issue phát hiện khi viết migration; 2 Rule 1 - bug, một do policy mới của chính plan này làm hỏng fixture cũ, một do tự viết sai quy ước dang_xuat trong test mới)
**Impact on plan:** Không có scope creep — cả ba đều là sửa đúng phạm vi file đang chạm trong chính plan này (0052, hoặc test 23/25/26), không đụng migration/test không liên quan.

## Issues Encountered

Không có vấn đề môi trường mới. `npm run db:test:linked` KHÔNG được chạy (theo đúng cảnh báo Docker Desktop treo trên máy này) — dùng fallback `psql "$DATABASE_URL" -f <file>` cho toàn bộ 22 file `supabase/tests/*.sql`, đếm `ok`/`not ok`/`ERROR` bằng `grep`.

## User Setup Required

None — không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- Ba RPC duyệt đơn + bộ cấp số đơn đã sẵn sàng cho mọi màn hình đơn ở Wave 4-5 (04-06 trở đi): nút "Xác nhận đơn" gọi `xac_nhan_don`, nút "Mở khóa" gọi `mo_khoa_don`, nút "Đóng sớm" gọi `dong_don_som`, nút "Tạo đơn" gọi `sinh_so_dh` trước khi insert.
- Số hiệu migration cuối cùng sau plan này: **0053**. Plan tiếp theo (04-03) bắt đầu từ **0054**.
- Tổng pgTAP hiện tại: **269 assert** (246 trước plan này + 15 test 25 + 8 test 26), toàn bộ xanh.
- `npm run check` (typecheck + lint + build) xanh toàn bộ.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commit hashes (`c8ba47d`, `f385a52`, `2718c99`) verified present in git history.
