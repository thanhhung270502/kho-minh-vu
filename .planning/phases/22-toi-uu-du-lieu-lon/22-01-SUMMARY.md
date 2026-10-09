---
phase: 22-toi-uu-du-lieu-lon
plan: 01
subsystem: testing
tags: [bench, supabase-local, postgres, psql, vitest]

requires:
  - phase: 21
    provides: schema, ghi_so_chung_tu, combo (0088) và các trigger sổ cái mà danh mục BENCH đi qua
provides:
  - Guard LOCAL dùng chung cho mọi script bench (readLocalSupabase, assertLocalDbUrl, runPsql)
  - 5 lệnh npm bench:seed|clean|run|compare|explain đã khai báo sẵn
  - Danh mục thử BENCH (3.310 mã, 90 nhóm, 56 đối tác, 8 nhân viên) nạp idempotent, tồn đầu kỳ qua ghi sổ
  - bench:clean xóa sạch dữ liệu BENCH và tự kiểm mồ côi trên 29 khóa ngoại
affects: [22-02, 22-03, 22-04]

tech-stack:
  added: []
  patterns:
    - "Script bench lấy cấu hình từ `supabase status`, không đọc .env.local; host ngoài 127.0.0.1/localhost bị chặn trước khi kết nối"
    - "Dữ liệu thử đi qua ghi_so_chung_tu thật; chỉ phần dọn mới dùng session_replication_role = replica"

key-files:
  created:
    - scripts/bench/local-env.ts
    - scripts/bench/local-env.test.ts
    - scripts/bench/seed/catalog.sql
    - scripts/bench/clean.sql
    - scripts/bench/clean.ts
    - scripts/bench/README.md
  modified:
    - package.json

key-decisions:
  - "Tồn đầu kỳ dùng phiếu NHAP (không phải DIEU_CHINH) để trigger bình quân cho giá vốn khác 0"
  - "Giả lập JWT quản lý chỉ quanh các INSERT san_pham (trigger chan_sua_gia_san_pham), xóa ngay sau đó"
  - "bench:clean không xóa tài khoản bench.*@khominhvu.local; 22-03 tự quản"

patterns-established:
  - "Bảng tiền tố BENCH-* (scripts/bench/README.md) là hợp đồng giữa 22-01..22-04"

requirements-completed: [P22-SC1]

duration: resume + verify
completed: 2026-10-09
---

# Phase 22 Plan 01: Nền bench (guard LOCAL, danh mục BENCH, bench:clean) Summary

**Guard Supabase LOCAL có test, 5 lệnh bench:*, danh mục BENCH 3.310 mã nạp idempotent với tồn đầu kỳ qua `ghi_so_chung_tu`, và `bench:clean` dọn sạch kèm kiểm mồ côi trên 29 khóa ngoại.**

## Performance

- **Tasks:** 3/3
- **Files:** 7 (6 tạo mới, `package.json` sửa)
- Lần chạy ban đầu bị ngắt giữa chừng; lượt này chạy lại toàn bộ kiểm chứng (xem Deviations).

## Accomplishments

- `scripts/bench/local-env.ts`: `parseStatusEnv`, `assertLocalDbUrl` (so khớp hostname chính xác, từ chối `127.0.0.1.evil.com`, pooler cloud, sai giao thức), `readLocalSupabase`, `findPsql`, `runPsql` (bỏ `PGTZ`/`PGOPTIONS`, có `args`).
- `catalog.sql`: 90 nhóm, 3.300 mã thường + 10 combo (20 thành phần), 25 NCC + 30 khách + `NBBENCH`, 8 nhân viên, hai phiếu `BENCH-PN-DAU-K1/K2` ghi sổ thật. Chạy lại không nhân đôi.
- `clean.sql` + `clean.ts`: xóa theo bảng tạm, `session_replication_role = replica`, rồi kiểm mồ côi 29 cặp khóa ngoại (đối chiếu đủ với `pg_constraint`).
- `README.md` 46 dòng: lệnh, bảng tiền tố, cảnh báo `db:test`.

## Task Commits

1. Task 1 RED: `1da4cb9` test(22-01): guard Supabase LOCAL cho script đo hiệu năng
2. Task 1 GREEN: `aa416c3` feat(22-01): guard LOCAL dùng chung và lệnh bench:*
3. Task 2: `5c165fd` feat(22-01): danh mục thử BENCH và tồn đầu kỳ qua ghi sổ
4. Task 3: các file `clean.sql`, `clean.ts`, `README.md` nằm trong `ea7efe6` (xem Deviations)

## Kết quả kiểm chứng (chạy thật lượt này)

- `npx vitest run --project unit scripts/bench/local-env.test.ts`: 7 pass, 0 fail.
- `catalog.sql` chạy hai lần: `ma = 3310`, `doi_tac = 56`, `dong_so_cai_dau_ky = 4400` cả hai lần; `nhom_hang BENCH-NH-% = 90`; `nhan_vien BENCH-% = 8`; hai phiếu đầu kỳ `HOAN_THANH`; 10 combo `COMBO` với 20 dòng `thanh_phan_combo`.
- Đối chiếu sổ cái và tồn: 0 dòng lệch trên 4.400 cặp (sản phẩm, kho). Không có `insert into public.kho_movement` trong catalog.sql. Chỉ 10 mã giá vốn 0 (đúng là 10 combo).
- Dữ liệu không-BENCH (san_pham, chung_tu, kho_movement) trước nạp = trước dọn = sau dọn = `1 | 1 | 1`.
- `npm run bench:clean` lần 1 xóa 3310 sản phẩm / 56 đối tác / 8 nhân viên / 2 chứng từ / 4400 dòng sổ cái, thoát 0, báo không mồ côi. Lần 2 xóa 0 dòng, thoát 0.
- Tổng dòng BENCH còn lại (sản phẩm, chứng từ, đối tác, đơn đặt) = 0; nhóm và nhân viên BENCH = 0.
- `npm run check` (typecheck + lint + test:unit + build): exit 0, 47 file test, 62 test pass.
- Guard: `grep "env.local\|NEXT_PUBLIC" scripts/bench/local-env.ts` không có dòng code nào.

## Deviations from Plan

**1. [Gián đoạn tiến trình] Executor bị ngắt, nhánh được người dùng rebase lên origin/main**
- Task 1 và 2 đã commit trước khi ngắt (hash trên là hash sau rebase). Task 3 đã viết xong nhưng chưa kịp commit.
- Người dùng đã commit ba file Task 3 (`scripts/bench/clean.sql`, `clean.ts`, `README.md`) bên trong commit không liên quan `ea7efe6` ("add daily synchronization phase…", cùng ROADMAP/STATE/config). Không viết lại lịch sử; coi Task 3 là đã có mặt. Không có commit `feat(22-01)` riêng cho Task 3.
- Lượt resume không phát hiện lỗi nên không có commit `fix(22-01)`.

**2. [Ghi chú] README 46 dòng** (giới hạn ≤ 70), đủ nội dung yêu cầu.

Không còn sai lệch nào khác; mọi tiêu chí chấp nhận đều đạt.

## Issues Encountered

- Phiên bản vitest/vite in cảnh báo về `vitest.config.ts` (CommonJS/ESM) và plugin `vite-tsconfig-paths`; có sẵn từ trước, ngoài phạm vi.

## Known Stubs

None. `bench:seed`, `bench:run`, `bench:compare`, `bench:explain` đã khai báo trong package.json nhưng file đích (`seed.ts`, `run.ts`, `compare.ts`, `explain.sh`) do 22-02, 22-03, 22-04 tạo theo kế hoạch; chạy trước đó sẽ báo lỗi thiếu file.

## Next Phase Readiness

DB local đang không còn dữ liệu BENCH (22-02 nạp lại từ đầu). Tiền tố BENCH-* là hợp đồng cho 22-02/03/04. Cần `npm run seed:users` trước khi nạp danh mục (catalog.sql đòi có tài khoản quản lý).

## Self-Check: PASSED

Các file `scripts/bench/{local-env.ts,local-env.test.ts,clean.sql,clean.ts,README.md,seed/catalog.sql}` tồn tại; commit `1da4cb9`, `aa416c3`, `5c165fd`, `ea7efe6` có trong `git log`.
