---
phase: quick-261008-w3x
plan: 01
subsystem: testing
tags: [vitest, supabase, integration-test, github-actions]
requires: []
provides:
  - Vitest hai project (unit, integration)
  - Harness integration trên Supabase local với guard chặn cloud
  - CI GitHub Actions (unit + db), không secret
key-files:
  created:
    - vitest.config.ts
    - tests/integration/support/{local-guard,global-setup,session,setup}.ts
    - tests/integration/{local-guard,products-rls,stock-in-posting}.test.ts
    - .github/workflows/test.yml
    - 46 file src/**/*.test.ts và scripts/copy-kiotviet-images/parse-image-cell.test.ts
  modified: [package.json, package-lock.json, CLAUDE.md]
  deleted: [scripts/test-pure-functions.ts]
decisions:
  - Vitest 4.1.11 thay vì 5.0.3 (v5 đòi @types/node >= 22, repo đang ^20)
  - Tài khoản quản lý tạm bị khóa + dùng lại thay vì xóa
metrics:
  completed: 2026-10-08
---

# Quick 261008-w3x: Vitest unit + integration và CI

Vitest với project `unit` (592 assertion cũ chuyển thành 592 `expect`) và `integration` (chạy hàm
`api/*.api.ts` thật trên Supabase LOCAL, đăng nhập tài khoản tạm theo vai trò), kèm workflow CI không secret.

## Số liệu

- Assertion: trước 592 (`assert.*`: deepEqual 152, equal 379, ok 55, notEqual 4, throws 2) -> sau 592 `expect(`
  (46 file unit, 55 test). Tập lệnh cũ xanh trước khi xóa; mapping `equal->toBe`, `deepEqual->toStrictEqual`,
  `ok->toBeTruthy`, `notEqual->not.toBe`, `throws->toThrow`. Không assertion nào bị nới hay xóa.
- `npm run test:unit`: 46 file, 55 test, xanh.
- `npm run test:integration` (chạy 3 lần liên tiếp): 3 file, 15 test, xanh.
- `npm run check` (typecheck + lint + test:unit + build): exit 0.
- Thử phá guard với `TEST_SUPABASE_URL=https://example.supabase.co`: chết ở guard, thông báo có chữ LOCAL.

## Commits

- f5f700b chore(test): cài Vitest và chuyển test hàm thuần sang *.test.ts
- 61ca361 test(integration): harness Supabase local theo vai trò và test RLS, grant cột, ghi sổ phiếu nhập
- 742c9c5 ci(test): chạy unit và integration trên Supabase local bằng GitHub Actions
- 9ebab21 docs(claude): lệnh test mới

## Deviations

1. [Rule 3] Vitest 4.1.11, không phải 5.x: `npm i -D vitest` bản mới nhất báo ERESOLVE vì peer `@types/node ^22 || >=24`
   còn repo dùng `^20`. Chọn lùi bản vitest/coverage-v8 thay vì nâng @types/node (ngoài phạm vi ba gói được phép).
2. `include` của project unit có thêm `scripts/**/*.test.ts` (đã nêu trong plan) vì `parse-image-cell` nằm ngoài `src/`.
3. Tài khoản `itest.quanly` KHÔNG xóa được sau khi test ghi sổ phiếu: `chung_tu.nguoi_tao_id` (và `nhat_ky_sua`) giữ khóa ngoại,
   còn sổ cái append-only nên không gỡ chứng từ. Teardown xóa được `itest.thukho`, `itest.chixem`; với quản lý thì khóa tài khoản
   (ban + `dang_hoat_dong=false`), lần chạy sau dùng lại và đặt mật khẩu mới. Hệ quả: tiêu chí "0 dòng itest.% trong auth.users" chỉ đúng
   trên DB vừa reset (CI); trên local còn 1 dòng bị khóa (`itest.quanly@khominhvu.local`).
4. DB local lệch dữ liệu nền: chức vụ `THU_KHO` không còn (chỉ có CHI_XEM, QUAN_LY, NHAN_VIEN, QUAN_LY_KHO). global-setup tự tạo chức vụ
   tạm `ITEST_THU_KHO` (phạm vi thu_kho) khi thiếu và xóa ở teardown. Không chạy `supabase db reset`.
5. `setup.ts` mock thêm `@/lib/env` (phòng chuỗi import khác kéo NEXT_PUBLIC_*), đọc giá trị từ `inject`, không từ môi trường.
6. `stockStatus` bị import thừa ở hai file test do bộ sinh nhận nhầm khóa object; đã xóa tay (lint sạch).

## Mã lỗi quan sát được

- Chỉ xem: `createReceipt` bị từ chối với mã `42501` (RLS chặn insert `chung_tu`; lỗi đến từ `sinh_so_ct` hoặc insert, test chỉ khẳng định mã).
- Thủ kho: `fetchProductCost`, `select("*")` và `select("id, gia_von")` trên `san_pham` đều `42501`; liệt kê cột đã cấp quyền thì đọc được.
- Quản lý: tạo mã `ITEST-xxxxxxxx`, tạo + thêm dòng (7 x 1000) + `ghi_so_chung_tu` qua PostgREST, tồn K1 từ 0 lên 7.

## Ghi chú

- CLAUDE.md bẫy 8 còn ghi tên cũ `laLoiPostgrest`/`maLoi`; tên thật hiện là `isPostgrestError`/`errorCode` (chưa sửa theo plan).
- Workflow CI chưa chạy thật (chưa có PR): chỉ kiểm cú pháp bằng `prettier --check` (máy không có PyYAML).
- `npm run typecheck` lúc đầu đỏ do `.next/types` cũ (gitignored) còn tham chiếu route `nhap-kho` đã đổi tên; xóa thư mục sinh ra này rồi build lại là xanh.
- Vitest in cảnh báo `vitest.config.ts` ESM trong gói CommonJS và plugin vite-tsconfig-paths sắp thừa; vô hại, giữ đúng plan (không đổi config/package type).
- Không có stub nào.

## Self-Check: PASSED

Đã kiểm: 4 commit tồn tại, `vitest.config.ts`, `tests/integration/**`, `.github/workflows/test.yml` có mặt, `scripts/test-pure-functions.ts` đã xóa.
