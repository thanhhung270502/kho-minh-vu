---
phase: 22-toi-uu-du-lieu-lon
plan: 04
subsystem: testing
tags: [bench, baseline, explain, auto_explain, supabase-local, postgres]

requires:
  - phase: 22-02
    provides: bench:seed (99 ngày, 5 năm, chạy tiếp được)
  - phase: 22-03
    provides: bench:run, bench:compare
provides:
  - "`npm run bench:explain -- <nhãn>` ghi EXPLAIN thật của câu lồng trong 7 ca RPC vào bench/explain-<nhãn>.txt"
  - "Baseline 99 ngày và 5 năm đo khi DB còn ở migration 0123 (cổng D-12)"
  - "EXPLAIN trước migration: xóa dòng phiếu quét tuần tự kho_movement"
  - "types-hash-before.txt (dấu vân tay type trước migration, D-16)"
  - "DB local giữ nguyên dữ liệu 5 năm cho 22-05..22-07"
affects: [22-05, 22-06, 22-07]

key-files:
  created:
    - scripts/bench/explain.sh
    - scripts/bench/explain.sql
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/types-hash-before.txt
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/baseline-99d.json
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/baseline-99d.md
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/seed-5y.log
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/baseline-5y.json
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/baseline-5y.md
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/explain-baseline-5y.txt
  modified: []

key-decisions:
  - "Giữ nguyên kết quả đo; không chỉnh gì để 'ra đúng' audit"

requirements-completed: [P22-SC3, P22-SC6]

completed: 2026-10-09
---

# Phase 22 Plan 04: Baseline 99 ngày + 5 năm và EXPLAIN trước migration Summary

**Có số đo 33 cặp ca x vai trò ở hai mức quy mô và EXPLAIN thật cho 7 ca, tất cả khi DB còn ở migration 0123: `tong_quan_chi_so` 2,7 s p50 và `phan_tich_ton_kho` 4 trang 2,4 s ở 5 năm, còn xóa một dòng phiếu nháp phải quét tuần tự 1 triệu dòng `kho_movement` (80 ms trong trigger khóa ngoại).**

## Cổng D-12 (kiểm đầu plan)

- `ls supabase/migrations | tail -1` = `0123_thu_quyen_them_dong_don_anon.sql`; không có 0124/0125 (vẫn đúng ở cuối plan).
- Các index sẽ thêm ở 22-05 (`idx_movement_chung_tu_dong`, `idx_movement_ngay`, `idx_ddh_ngay`, `idx_chung_tu_goc`, `idx_chung_tu_created_at`, `idx_chung_tu_ngay_ghi_so`, `idx_de_nghi_gop_ma_chung_tu`...) đều chưa có trong DB; chỉ `idx_chung_tu_loai_ngay` (sẽ bị thay) đang có.
- Trước khi đo, hai file baseline và `explain-baseline-5y.txt` đã commit (`14dea8b`, `55e4341`), không có file `0124_*`.

## Task Commits

1. Task 1: `cb5b08e` feat(bench): bench:explain ghi kế hoạch thật của câu trong RPC; `chore(bench): sửa chú thích explain.sh` (bỏ chữ `config.toml` trong chú thích để khớp tiêu chí grep)
2. Task 2: `14dea8b` docs(22): baseline hiệu năng mức 99 ngày
3. Task 3: `55e4341` docs(22): baseline hiệu năng mức 5 năm và EXPLAIN trước migration

## Quy mô và thời gian seed

| Bảng | 99 ngày | 5 năm |
|---|---|---|
| kho_movement | 58.754 | 1.008.828 |
| chung_tu | 9.916 | 183.153 (BENCH: 183.152) |
| chung_tu_dong | 56.934 | 974.079 |
| don_dat_hang | 9.138 | 168.018 |
| don_dat_hang_dong | 46.690 | 858.833 |
| nhat_ky_sua | 40.040 | 678.944 |

- Seed 99 ngày (sau `bench:clean`): **41 giây**. Mở rộng lên 5 năm: **1.727 ngày mới, 99 ngày bỏ qua, 14 phút** (một lần chạy liên tục ở nền, thoát 0; không phải chạy lại). Tổng ~15 phút, nhanh hơn ước lượng 25-40 phút của 22-02 (~0,5 s/ngày).
- Đối chiếu sổ cái với `ton_kho` cho mã BENCH ở 5 năm: **0 dòng lệch**. `don_dat_hang` BENCH 168.018 (≥ 150.000), `chung_tu` BENCH 183.152 (≥ 165.000), `kho_movement` 1.008.828 (≥ 900.000).
- `analyze` chạy trên 6 bảng lớn trước khi đo 5 năm.
- Đo: 99 ngày 10 s tổng, 5 năm 65 s tổng (5 lượt + 1 lượt làm nóng mỗi ca).

## Trạng thái ca đo

- Baseline 99 ngày: 33/33 `ok`, **0 `skipped`** (fixture `bang_dem_kiem_ke`, `the_kho_san_pham`, `lich_su_giao_dich_doi_tac`, `tim_kiem_toan_cuc.*` đều có).
- Baseline 5 năm: 33/33 `ok`. **Không có ca nào `timeout` (57014, ngưỡng 8 s), `forbidden` (42501) hay `skipped`.** Ca chậm nhất là `tong_quan_chi_so` p95 3,7 s, còn cách ngưỡng 8 s.
- `tim_kiem_toan_cuc.so_ct/so_dh` trả 5 dòng ở 5 năm (fixture today-3 phủ được). `bao_cao_xuat_am` trả 0 dòng ở 5 năm (xuất âm của kỳ mặc định không có dòng nào; vẫn đo được chi phí quét, 697 ms).
- `scale.latestMigration` của cả hai file JSON = `0123_thu_quyen_them_dong_don_anon.sql`.

## 10 ca chậm nhất ở 5 năm (xếp theo p95; ms)

| # | Ca | Vai trò | p50 99d | p95 99d | p50 5y | p95 5y |
|---|---|---|---|---|---|---|
| 1 | tong_quan_chi_so | quan_ly | 255,1 | 277,0 | 2699,4 | 3729,2 |
| 2 | phan_tich_ton_kho.4_trang | quan_ly | 200,7 | 215,0 | 2434,7 | 2535,8 |
| 3 | phan_tich_theo_ky.90_ngay | quan_ly | 173,8 | 177,7 | 675,3 | 824,2 |
| 4 | bao_cao_xuat_am | quan_ly | 32,4 | 34,7 | 696,6 | 714,3 |
| 5 | phan_tich_ton_kho.trang_1 | quan_ly | 58,2 | 59,6 | 649,1 | 691,9 |
| 6 | phan_tich_theo_ky.mac_dinh | quan_ly | 146,3 | 158,0 | 566,8 | 583,4 |
| 7 | hoat_dong_gan_day | quan_ly | 30,6 | 33,0 | 454,1 | 474,2 |
| 8 | tim_kiem_toan_cuc.so_ct | thu_kho | 26,1 | 26,9 | 421,1 | 424,5 |
| 9 | tim_kiem_toan_cuc.so_dh | thu_kho | 26,5 | 26,8 | 407,2 | 412,4 |
| 10 | tim_kiem_toan_cuc.so_ct | quan_ly | 17,6 | 19,2 | 231,3 | 253,1 |

Các ca còn lại (p95 5 năm): `the_kho_san_pham` 107-130, `nhap_xuat_theo_ky.mac_dinh` 86, `danh_sach_doi_tac.*` 42-68, `xoa_dong_phieu_nhap` 61, `nhap_xuat_theo_ngay.90/30` 41/35, `tim_san_pham.*` 7-38 (không đổi theo quy mô), `lich_su_giao_dich_doi_tac` 33, `danh_sach_don.mac_dinh` 14-16, `dem_don_theo_trang_thai` 10-11, `bang_dem_kiem_ke` 9-10, `danh_sach_chung_tu.hoa_don` 8-9. Hai file `baseline-99d.md` và `baseline-5y.md` có đủ bảng p50/p95/max/số dòng.

Nhận xét: tăng quy mô 17 lần làm `tong_quan_chi_so` chậm 10,5 lần, `bao_cao_xuat_am` 20 lần, `tim_kiem_toan_cuc` ~13-16 lần; ba danh sách có phân trang theo ngày (`danh_sach_don`, `danh_sach_chung_tu`, `dem_don_*`) chỉ nhích vài ms.

## EXPLAIN trước migration (explain-baseline-5y.txt, 7 ca)

- **`xoa_dong_phieu_nhap`: ĐÚNG như audit rủi ro #12.** Câu kiểm khóa ngoại `SELECT 1 FROM ONLY kho_movement x WHERE $1 = chung_tu_dong_id FOR KEY SHARE OF x` chạy **`Seq Scan on kho_movement x (cost=0.00..30004.35 ...)`**; dòng `Trigger for constraint kho_movement_chung_tu_dong_id_fkey: time=79.851 calls=1`, Execution Time 79,9 ms cho xóa một dòng. Câu tương đương chạy tay: 54,5 ms, cũng Seq Scan.
- `danh_sach_don_mac_dinh`: Parallel Seq Scan trên `don_dat_hang` (~6,6 ms/worker) vì chưa có index ngày; tổng 21 ms.
- `tim_kiem_so_ct` / `tim_kiem_so_dh`: Seq Scan toàn bộ `chung_tu` (183.094 dòng) và `don_dat_hang` (168.018 dòng) cho `ILIKE`; 214 ms và 194 ms.
- `nhap_xuat_theo_ky_thang`: Parallel Seq Scan `kho_movement` (92 ms tổng).
- `phan_tich_theo_ky_thang`: Parallel Seq Scan `kho_movement` đọc 333.159 dòng mỗi worker (626 ms).
- `tong_quan_chi_so`: 2372 ms; Seq Scan `kho_movement` lặp 30 vòng (16.814 dòng/vòng) và Seq Scan `chung_tu` lặp 14 vòng.
- `explain-baseline-5y.txt` có 7 dòng `=== CASE:`, 0 `ERROR`.

## Deviations from Plan

**1. [Ghi chú] Chạy seed 5 năm bằng `nohup` nền + vòng chờ có trần 9,5 phút** thay vì `run_in_background` hay nhiều lần chạy foreground: máy không có `timeout`/`gtimeout`, nên bị kill giữa tháng dễ để lại `psql` mồ côi tranh bộ đếm với lần chạy sau. Seed chạy trọn một lần (14 phút), không cần chạy lại.

**2. [Ghi chú] Chú thích `explain.sh`** nhắc `config.toml` làm grep tiêu chí "không đọc config.toml" khớp nhầm; đã diễn đạt lại (commit `chore(bench)`). Không đổi hành vi.

**3. [Ghi chú] `nhat_ky_sua` 40.040 → 40.042 → 678.944 → 678.946** giữa các lần liệt kê: mỗi lần `bench:run` tự ghi 2 dòng nhật ký (ca xóa dòng phiếu nháp). Không ảnh hưởng đo.

Không phát sinh Rule 1-3 khác.

## Known Stubs

None.

## Trạng thái cuối plan

- DB local giữ dữ liệu 5 năm (không chạy `bench:clean`, `db reset`, `db:test`); migration mới nhất vẫn 0123; không áp migration nào.
- Hai tài khoản `bench.*@khominhvu.local` còn nguyên.
- `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage hay commit.

## Self-Check: PASSED

Các file `scripts/bench/{explain.sh,explain.sql}` và 7 file trong `.planning/phases/22-toi-uu-du-lieu-lon/bench/` tồn tại; commit `cb5b08e`, `14dea8b`, `55e4341` có trong `git log`.
