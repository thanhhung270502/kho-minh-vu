---
phase: 22-toi-uu-du-lieu-lon
plan: 02
subsystem: testing
tags: [bench, supabase-local, postgres, psql, plpgsql, seed]

requires:
  - phase: 22-01
    provides: guard LOCAL (readLocalSupabase, runPsql), catalog.sql, bench:clean
provides:
  - "`npm run bench:seed -- --days N | --years N` (mặc định 1826 ngày) sinh chứng từ theo ngày qua đường ghi sổ thật"
  - "scripts/bench/seed-args.ts: hàm thuần chọn ngày (parseSeedArgs, vnToday, seedDays, groupByMonth, horizonStart)"
  - "scripts/bench/seed/day.sql: pg_temp.bench_seed_day / snapshot+restore bộ đếm / bench_ensure_open_session"
  - "Phiên kiểm kê mở BENCH-KK-MO sau mỗi lần seed (22-03 đo bang_dem_kiem_ke)"
affects: [22-03, 22-04]

tech-stack:
  added: []
  patterns:
    - "Hàm sinh dữ liệu là pg_temp.* nạp bằng \\i — không để lại đối tượng nào trong DB"
    - "Lô một tháng một transaction; chụp bộ đếm chuoi_so_ct trước lô, trả lại sau lô (bẫy 16)"
    - "Đổi session_replication_role bằng `execute 'set local ...'` (set_config() bị Supabase từ chối)"

key-files:
  created:
    - scripts/bench/seed-args.ts
    - scripts/bench/seed-args.test.ts
    - scripts/bench/seed/day.sql
    - scripts/bench/seed.ts
  modified:
    - scripts/bench/seed/catalog.sql

key-decisions:
  - "Kho mặc định: mã n > 2000 chia hết 3 về K2, còn lại và combo về K1"
  - "K1 nhập bù trước các mã tồn thấp nhất (< 150) bằng lô 100-300 để tỷ lệ xuất âm giữ ~1%"
  - "KIEM_KE ghi sổ bằng ghi_so_chung_tu để bút toán giữ ngày lịch sử"

patterns-established:
  - "Mốc thời gian giả (ngay_ghi_so, updated_at, nhat_ky_sua.sua_luc) sửa trong MỘT khối replica ở cuối hàm, mọi UPDATE giới hạn BENCH + đúng ngày"

requirements-completed: [P22-SC1]

duration: ~1h
completed: 2026-10-09
---

# Phase 22 Plan 02: Bộ sinh chứng từ theo ngày (bench:seed) Summary

**`npm run bench:seed` sinh ~92 đơn → hóa đơn, ~8 phiếu nhập, hủy, xuất âm, trả khách, điều chỉnh, kiểm kê mỗi ngày qua `ghi_so_chung_tu`/`huy_chung_tu` thật, lô theo tháng, chạy lại thì bỏ qua ngày đã có và không làm trôi bộ đếm số chứng từ.**

## Accomplishments

- `seed-args.ts` + 13 ca test (TDD): tham số `--days/--years/--dry-run`, ngày hôm nay giờ VN, lịch ngày, gom theo tháng, mốc tồn đầu kỳ cố định theo 5 năm.
- `day.sql`: một ngày = NHAP 6-10 phiếu (6-9 dòng), 85-99 đơn → xác nhận → hóa đơn (tái hiện 4 bước `hoan_thanh_don` vì hàm đó không lùi ngày được), ~1% hóa đơn hủy, ~1% xuất âm có lý do `LECH_TON_CHO_KIEM_KE`, TRA_KHACH thứ Hai/Năm, DIEU_CHINH ngày 28, KIEM_KE ngày 1 các tháng 1/4/7/10. Không có `insert into public.kho_movement`.
- `seed.ts`: guard LOCAL trước mọi kết nối, nạp catalog, một file SQL tạm cho mỗi tháng (`synchronous_commit = off`, snapshot/restore bộ đếm), in tiến độ + ước lượng còn lại, `analyze` mỗi tháng, phiên kiểm kê mở, `vacuum analyze` cuối, bảng đếm 6 bảng lớn.

## Task Commits

1. Task 1 RED: `26eea89` test(bench): tham số sinh dữ liệu theo ngày
2. Task 1 GREEN: `ad4cd09` feat(bench): hàm thuần chọn ngày cho bench:seed
3. Task 2: `2f9e32f` feat(bench): bộ sinh chứng từ một ngày qua đường ghi sổ thật (kèm sửa `catalog.sql`)
4. Task 3: `ce98cf2` feat(bench): runner bench:seed theo lô tháng, chạy tiếp được

## Kết quả smoke (chạy thật)

**`npm run bench:seed -- --days 3`** (2026-10-07 → 2026-10-09):

| Ngày | Đơn `BENCH-DH` | Hóa đơn `BENCH-HD` (kể cả hủy) | `BENCH-PN` |
|---|---|---|---|
| 10-07 | 90 | 76 | 10 |
| 10-08 | 89 | 79 | 9 |
| 10-09 | 95 | 81 | 7 |

- Hóa đơn xuất âm có lý do: 2. Bút toán đảo của chứng từ BENCH: 20 dòng (3 hóa đơn hủy). TRA_KHACH 1, KIEM_KE (phiên mở) 1.
- Đối chiếu sổ cái = `ton_kho` cho mã BENCH: **0 dòng lệch**.
- md5 `chuoi_so_ct` trước = sau = `4c20e383936aecbf75c7e7048a8fde66` (cũng đúng sau 120 ngày và sau `bench:clean`).
- Chạy lại cùng tham số: `0 ngày mới, 3 ngày bỏ qua`, số dòng `kho_movement` không đổi (5.883).
- Mốc thời gian: `ngay_ghi_so = created_at + 3 phút`, đơn `updated_at = created_at + 25 phút`, `nhat_ky_sua` rải theo trạng thái.

**Chạy 120 ngày (xác nhận quy mô):** 65.819 dòng sổ cái, ~10,8 nghìn hóa đơn, 131 xuất âm (1,2%), 118 hủy (1,1%), 34 TRA_KHACH, 4 DIEU_CHINH, 2 KIEM_KE đã ghi sổ + 1 phiên mở, sổ cái = tồn (0 lệch), bộ đếm không trôi.

## Thời gian (ghi cho 22-04 chọn timeout)

- 120 ngày: **85 giây tổng** (≈ 0,7 giây/ngày; mỗi tháng 17-21 giây sau khi có `analyze` mỗi tháng).
- Lần đo đầu **chưa có analyze mỗi tháng**: 78s cho 19 ngày, 71s cho 31 ngày (planner còn thống kê bảng rỗng) — chậm gấp 3-4 lần. Đã thêm `analyze` sau mỗi lô.
- **Ước lượng 1826 ngày: ~25-40 phút** (0,7-1,2 giây/ngày, dự phòng cho bảng phình). Nên đặt timeout ≥ 90 phút và chạy nền.

## Trạng thái DB cuối plan

Đã chạy `npm run bench:clean`: 0 chứng từ / 0 mã / 0 đơn BENCH, `kho_movement` còn 1 dòng (dữ liệu không phải BENCH), `chuoi_so_ct` md5 như ban đầu. 22-03/22-04 bắt đầu từ trạng thái sạch (tài khoản `bench.*@khominhvu.local` nếu có vẫn giữ nguyên).

## Deviations from Plan

**1. [Rule 1 - Sai số trong plan] `horizonStart("2026-10-09", 99)` = `2021-10-09`, không phải `2021-10-07`**
- Plan ghi `2021-10-07` nhưng 1826 ngày trước 2026-10-09 chính xác là 2021-10-09 (5 năm có 1 năm nhuận). Test và code theo phép tính đúng.

**2. [Rule 3 - Chặn] `catalog.sql` thiếu `kho_mac_dinh_id`**
- `tao_phieu_xuat_tu_don` từ chối đơn có mã chưa có kho mặc định; catalog 22-01 không đặt. Sửa `scripts/bench/seed/catalog.sql`: mã `n > 2000` chia hết 3 → K2, còn lại và combo → K1, kèm `update` bù cho danh mục nạp bằng bản cũ. Không cần dọn lại dữ liệu. Commit `2f9e32f`.

**3. [Rule 3 - Chặn] `set_config('session_replication_role', ...)` bị Supabase từ chối**
- Lỗi `permission denied to set parameter` khi gọi qua `set_config()` trong hàm; `set local` chạy được (như `clean.sql`). Dùng `execute 'set local session_replication_role = replica'` / `= origin`. Tiêu chí kiểm đếm chuỗi `set_config(...)` trong plan đổi thành đếm `session_replication_role = replica|origin` (1 và 1; 5 UPDATE, 5 dòng `like 'BENCH-%'`, 5 dòng `= p_ngay` trong khối).

**4. [Rule 1 - Bug] KIEM_KE không đi qua `duyet_phien_kiem_ke`**
- Hàm đó ép `ngay_ct` về hôm nay, nên bút toán kiểm kê của mọi quý sẽ mang ngày lúc seed. Phiếu được đếm đủ mọi mã trong phạm vi (`luu_dong_kiem_ke`) rồi ghi sổ thẳng bằng `ghi_so_chung_tu` (dưới `postgres`, `auth.uid()` null nên được đi qua); `_ghi_so_kiem_ke` và trigger tồn vẫn chạy thật. Ghi chú trong `day.sql`.

**5. [Rule 2 - Tính đúng đắn] Nhập bù cho K1**
- Plan chỉ chọn mã nhập ngẫu nhiên; sau 18 ngày 14 mã sổ cái âm sâu (-162) và tỷ lệ xuất âm lên 5,5% rồi còn tăng. Thêm nhập bù: nửa số dòng phiếu K1 là các mã có tồn K1 thấp nhất (< 150) với lô 100-300. Sau 63 ngày xuất âm 1,0%, sau 120 ngày 1,2%. Mã K2 chỉ nhập trên phiếu K2 (dòng nhập `kho_id` = kho đầu phiếu như plan).

**6. [Rule 3] `analyze` mỗi tháng trong `seed.ts`**
- Không có trong plan; xem phần Thời gian. Không ảnh hưởng dữ liệu.

**7. [Chi tiết] Dòng đơn xuất âm dùng `greatest(tồn, 0) + 5`** (tồn âm làm `so_luong_dat` âm và vi phạm check). `seed.ts` lọc dòng JSON bằng `startsWith("{")` thay vì parse mọi dòng vì `-A -t` còn in kết quả `set_config`.

## Giới hạn đã biết

- Bút toán đảo (`ngay = now()`) và `kho_movement.created_at` mang thời điểm seed (sổ cái bất biến).
- Số liệu mỗi ngày tất định theo `setseed(ngày)` nhưng các mã nhập bù phụ thuộc tồn nên hai lần dựng không giống từng dòng.
- Hóa đơn 3 ngày gần nhất: 5% đơn dừng ở `TAM`, 10% ở `DA_XAC_NHAN` (chưa có hóa đơn).

## Known Stubs

None. `bench:run`, `bench:compare`, `bench:explain` vẫn do 22-03/22-04 tạo.

## Self-Check: PASSED

Các file `scripts/bench/{seed-args.ts,seed-args.test.ts,seed.ts,seed/day.sql}` tồn tại; commit `26eea89`, `ad4cd09`, `2f9e32f`, `ce98cf2` có trong `git log`; `npm run check` exit 0 (48 file, 75 test pass); `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage.
