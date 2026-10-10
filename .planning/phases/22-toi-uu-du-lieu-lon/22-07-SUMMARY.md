---
phase: 22-toi-uu-du-lieu-lon
plan: 07
subsystem: testing
tags: [bench, explain, pgtap, integration, supabase-local, postgres]

requires:
  - phase: 22-04
    provides: baseline-99d / baseline-5y / explain-baseline-5y, types-hash-before
  - phase: 22-05
    provides: migration 0124 (index)
  - phase: 22-06
    provides: migration 0125 (điều kiện ngày dùng index), pgTAP 115
provides:
  - "after-5y (số đo sau migration, mức 5 năm) + explain-after-5y + compare-baseline-5y-vs-after-5y"
  - "Kết quả ba cổng EXPLAIN cứng và hai cổng mềm"
  - "check / pgTAP / integration xanh, type không đổi"
affects: []

key-files:
  created:
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/after-5y.json
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/after-5y.md
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/explain-after-5y.txt
    - .planning/phases/22-toi-uu-du-lieu-lon/bench/compare-baseline-5y-vs-after-5y.md
  modified: []

key-decisions:
  - "Không sửa migration/hàm để ép cổng mềm tim_kiem_so_ct — ghi gap có tài liệu (đúng D-21)"

requirements-completed: [P22-SC7]
requirements-partial: [P22-SC6]

completed: 2026-10-09
---

# Phase 22 Plan 07: Đo sau migration, cổng EXPLAIN và cổng kiểm đầy đủ Summary

**Ở mức 5 năm (1,0 triệu dòng sổ cái) ba cổng EXPLAIN cứng đều đạt (xóa dòng phiếu 56 ms -> 2,8 ms, trigger khóa ngoại 79,9 ms -> 0,46 ms; `tong_quan_chi_so` 2,7 s -> 170 ms), nhưng cổng mềm `tim_kiem_so_ct` KHÔNG dùng trigram nên `tim_kiem_toan_cuc` còn ~126 ms (quan_ly) / ~308 ms (thu_kho). `npm run check`, pgTAP (60 file, 1015 test) và integration (15 test) đều xanh.**

## SC6: ĐẠT MỘT PHẦN — tim_kiem_toan_cuc chưa dùng trigram, cần người dùng duyệt

`tim_kiem_toan_cuc` theo số phiếu (`chung_tu.so_ct`) vẫn Seq Scan toàn bộ `chung_tu` (183.095 dòng) trong EXPLAIN của chính hàm thật; chỉ nhánh `don_dat_hang.so_dh` dùng `idx_ddh_so_dh_trgm`. Theo quy tắc cổng đã chốt (D-21) đây là gap có tài liệu, không sửa migration/hàm để ép. Phase chưa nên đánh dấu hoàn thành cho tới khi người dùng duyệt hoặc đã thêm mục theo dõi cho Wave 2 (xem "Gap cho Wave 2").

## Task Commits

1. Task 1: `8ffca0b` docs(22): số đo và EXPLAIN sau Wave 1 ở mức 5 năm (4 file trong `bench/`)
2. Task 2: không sửa mã, không commit mã. Commit này (SUMMARY) là commit tài liệu duy nhất còn lại.

## Điều kiện vào và cách đo

- `ls supabase/migrations | tail -2` = 0124, 0125; `kho_movement` = 1.008.828 (>= 900.000), không phải seed lại.
- `vacuum analyze` 6 bảng lớn trước khi đo; `bench:run -- --label after-5y` (33/33 ca `ok`, 0 timeout/forbidden/skipped), `bench:explain -- after-5y` (7 ca), `bench:compare -- baseline-5y after-5y`.
- `after-5y.json`: `latestMigration` = `0125_dieu_kien_ngay_dung_index.sql`, `scale.kho_movement` = 1008828. Không phải chạy lại EXPLAIN lần hai (không cổng cứng nào sai).

## Cổng EXPLAIN (explain-after-5y.txt)

| Cổng | Loại | Ca | Kết quả |
|---|---|---|---|
| `idx_movement_chung_tu_dong`, không `Seq Scan on kho_movement ` | CỨNG | `xoa_dong_phieu_nhap` | ĐẠT. Trigger FK `time=0.457 ms` (trước 79,851 ms); Execution Time 0,538 ms (trước 79,930 ms) |
| `idx_ddh_ngay`, không `Seq Scan on don_dat_hang ` | CỨNG | `danh_sach_don_mac_dinh` | ĐẠT |
| `idx_movement_ngay`, không `Seq Scan on kho_movement ` | CỨNG | `nhap_xuat_theo_ky_thang` | ĐẠT |
| `idx_ddh_so_dh_trgm` | MỀM | `tim_kiem_so_dh` | ĐẠT. `Bitmap Index Scan on idx_ddh_so_dh_trgm` (0,316 ms, 10 dòng) |
| `idx_chung_tu_so_ct_trgm` | MỀM | `tim_kiem_so_ct` | KHÔNG ĐẠT (gap có tài liệu), xem dưới |

### Gap mềm: tim_kiem_so_ct

Nguyên văn nhánh `ct` trong kế hoạch thật của hàm (kw = `HD261006-04`, 5 dòng trả về, 109 ms tổng):

```
->  Subquery Scan on ct  (cost=60729.04..60729.06 rows=2 width=167) (actual time=106.431..106.435 rows=5 loops=1)
      ->  Sort  Sort Key: (CASE WHEN (lower(c.so_ct) = lower(t_1.kw)) THEN 0 ELSE 1 END), c.ngay_ct DESC, c.so_ct DESC
            ->  Nested Loop  (cost=0.00..60727.60 rows=18 width=171) (actual time=20.020..106.415 rows=10 loops=1)
                  Join Filter: (c.so_ct ~~* (('%'::text || t_1.kw) || '%'::text))
                  Rows Removed by Join Filter: 183085
                  ->  CTE Scan on tham_so t_1  (cost=0.00..0.03 rows=1 width=32) (actual time=0.000..0.001 rows=1 loops=1)
                        Filter: (length(kw) >= 2)
                  ->  Seq Scan on chung_tu c  (cost=0.00..60663.31 rows=3649 width=47) (actual time=0.140..22.966 rows=183095 loops=1)
                        Filter: ((((InitPlan 4).col1 = ANY ('{quan_ly,van_phong,chi_xem}'::public.vai_tro[])) OR (((InitPlan 5).col1 = 'thu_kho'::public.vai_tro) AND ((kho_id = ANY ((InitPlan 6).col1)) OR (kho_den_id = ANY ((InitPlan 7).col1)) OR public.phieu_co_dong_thuoc_kho_hien_tai(id)))) AND (loai_ct = ANY ('{NHAP,XUAT,TRA_NCC,TRA_KHACH,KIEM_KE}'::public.loai_ct[])))
```

Khối đầy đủ ở `bench/explain-after-5y.txt` (`=== CASE: tim_kiem_so_ct ===`). Ca `tim_kiem_so_dh` cũng có nhánh `ct` Seq Scan y hệt (kw `DH...` không khớp phiếu nào, vẫn quét 183.095 dòng, ~97 ms); chính nhánh này, không phải `don_dat_hang`, quyết định tổng thời gian của cả hai ca.

Khác biệt với EXPLAIN sớm ở 22-05 (planner chọn `idx_chung_tu_so_ct_trgm`, 4,1 ms): câu chạy tay ở 22-05 không có điều kiện phạm vi quyền. Trong kế hoạch thật, `chung_tu` bị lọc thêm bởi bộ lọc quyền (`vai_tro` và kho qua InitPlan, cộng `phieu_co_dong_thuoc_kho_hien_tai(id)`), phần này nằm trong `Filter` của Seq Scan. Đây là suy luận từ hình kế hoạch, chưa được kiểm bằng thí nghiệm riêng (không thử bỏ bộ lọc quyền vì ngoài phạm vi plan). Không sửa migration/hàm ở plan này.

## Before / after (ms; p50 / p95)

Nguồn: `baseline-99d.json`, `baseline-5y.json`, `after-5y.json`. Baseline 99d và 5y đo ở migration 0123; "sau" đo ở 0125, cùng dữ liệu 5 năm.

| Ca | Vai trò | 99d p50 | 99d p95 | 5y p50 | 5y p95 | sau p50 | sau p95 |
|---|---|---|---|---|---|---|---|
| tong_quan_chi_so | quan_ly | 255.1 | 277 | 2699.4 | 3729.2 | 169.9 | 177.2 |
| phan_tich_ton_kho.trang_1 | quan_ly | 58.2 | 59.6 | 649.1 | 691.9 | 530.5 | 555.9 |
| phan_tich_ton_kho.4_trang | quan_ly | 200.7 | 215 | 2434.7 | 2535.8 | 2279.3 | 2383.3 |
| hoat_dong_gan_day | quan_ly | 30.6 | 33 | 454.1 | 474.2 | 354 | 355.8 |
| bang_dem_kiem_ke | quan_ly | 7.9 | 8.4 | 8.5 | 9.8 | 7 | 8.7 |
| bang_dem_kiem_ke | thu_kho | 6.8 | 8.1 | 7.8 | 8.8 | 6.6 | 7.7 |
| tim_kiem_toan_cuc.so_ct | quan_ly | 17.6 | 19.2 | 231.3 | 253.1 | 125.9 | 126.7 |
| tim_kiem_toan_cuc.so_ct | thu_kho | 26.1 | 26.9 | 421.1 | 424.5 | 308.4 | 326.4 |
| tim_kiem_toan_cuc.so_dh | quan_ly | 16.8 | 18.1 | 226.8 | 237.2 | 122.5 | 125.9 |
| tim_kiem_toan_cuc.so_dh | thu_kho | 26.5 | 26.8 | 407.2 | 412.4 | 302.2 | 315.5 |
| phan_tich_theo_ky.mac_dinh | quan_ly | 146.3 | 158 | 566.8 | 583.4 | 549.9 | 579.3 |
| phan_tich_theo_ky.90_ngay | quan_ly | 173.8 | 177.7 | 675.3 | 824.2 | 500.6 | 507.2 |
| nhap_xuat_theo_ky.mac_dinh | quan_ly | 20.4 | 21.7 | 83.7 | 85.6 | 18.7 | 19.3 |
| nhap_xuat_theo_ngay.30 | quan_ly | 12.8 | 14.1 | 34.4 | 35 | 35.9 | 37.6 |
| nhap_xuat_theo_ngay.90 | quan_ly | 19.7 | 20.4 | 40 | 40.7 | 39.5 | 40 |
| bao_cao_xuat_am | quan_ly | 32.4 | 34.7 | 696.6 | 714.3 | 629.9 | 642.8 |
| danh_sach_doi_tac.o_chon_khach | quan_ly | 5.6 | 6.3 | 39.5 | 42.3 | 36.3 | 37.3 |
| danh_sach_doi_tac.o_chon_khach | thu_kho | 5.3 | 6.3 | 47.1 | 61.1 | 41.7 | 44.3 |
| danh_sach_doi_tac.trang_doi_tac | quan_ly | 5.6 | 5.8 | 61.3 | 68.2 | 56.2 | 58 |
| danh_sach_don.mac_dinh | quan_ly | 7.6 | 8 | 15 | 16.3 | 6.9 | 6.9 |
| danh_sach_don.mac_dinh | thu_kho | 6.9 | 9.1 | 12.9 | 13.8 | 5.2 | 6.5 |
| dem_don_theo_trang_thai.mac_dinh | quan_ly | 3.3 | 4.3 | 10.8 | 11.1 | 3.4 | 3.8 |
| dem_don_theo_trang_thai.mac_dinh | thu_kho | 4 | 4.4 | 9.3 | 9.9 | 2.8 | 3.1 |
| danh_sach_chung_tu.hoa_don | quan_ly | 5.3 | 6.1 | 8.7 | 9.1 | 6.9 | 7.5 |
| danh_sach_chung_tu.hoa_don | thu_kho | 5.5 | 7.4 | 7.5 | 8.1 | 6.3 | 7.9 |
| the_kho_san_pham | quan_ly | 11.3 | 13.2 | 109.2 | 130.4 | 101.4 | 113.8 |
| the_kho_san_pham | thu_kho | 11.4 | 11.8 | 105.2 | 106.8 | 99.4 | 100.9 |
| lich_su_giao_dich_doi_tac | quan_ly | 5.9 | 20 | 23.5 | 32.7 | 21.8 | 29.9 |
| tim_san_pham.1_ky_tu | quan_ly | 36.3 | 36.9 | 33.4 | 35.1 | 32.2 | 32.8 |
| tim_san_pham.1_ky_tu | thu_kho | 34.4 | 37.3 | 33.6 | 37.6 | 31.7 | 32.2 |
| tim_san_pham.5_ky_tu | quan_ly | 6.8 | 7.4 | 6.3 | 6.4 | 5.2 | 6.1 |
| tim_san_pham.5_ky_tu | thu_kho | 7.6 | 8.1 | 6 | 6.7 | 6 | 7 |
| xoa_dong_phieu_nhap | quan_ly | 6.8 | 9.4 | 56.1 | 60.6 | 2.8 | 12 |

Thời gian trigger khóa ngoại khi xóa một dòng phiếu (`Trigger for constraint kho_movement_chung_tu_dong_id_fkey`): **79,851 ms -> 0,457 ms**.

### Đánh giá mục tiêu < 100 ms của audit (báo cáo, không phải cổng chặn)

| Mục tiêu | p50 sau (5y) | Kết luận |
|---|---|---|
| `danh_sach_don.mac_dinh` | 6,9 (quan_ly) / 5,2 (thu_kho) | ĐẠT. Ghi chú audit: `count(*)` trên cả tập lọc vẫn là việc Wave 2 nhưng ở dữ liệu hiện tại chưa thành vấn đề |
| `xoa_dong_phieu_nhap` | 2,8 (p95 12) | ĐẠT |
| `tim_kiem_toan_cuc.so_ct` / `.so_dh` | quan_ly 125,9 / 122,5; thu_kho 308,4 / 302,2 | KHÔNG ĐẠT. Nguyên nhân: nhánh `chung_tu` vẫn Seq Scan (gap mềm ở trên); cải thiện so với 5y baseline chỉ 23-50% |

### Ghi chú phan_tich_theo_ky

`phan_tich_theo_ky` gần như không nhanh hơn ở Wave 1 (`mac_dinh` 566,8 -> 549,9; `90_ngay` 675,3 -> 500,6): tồn đầu kỳ vẫn cộng toàn bộ sổ cái từ ngày đầu (`m.ngay < p_den + 1` trải gần hết bảng), index ngày chỉ giúp khi kỳ ngắn ở quá khứ. Cải thiện thật là việc Wave 2/3 (chốt tồn theo tháng). Không phải hồi quy. Tương tự `phan_tich_ton_kho` (4 trang 2,3 s), `bao_cao_xuat_am` (630 ms), `hoat_dong_gan_day` (354 ms) và `the_kho_san_pham` (~100 ms) chưa được Wave 1 đụng tới đáng kể.

Thay đổi nhỏ không phải cải thiện: `nhap_xuat_theo_ngay.30` 34,4 -> 35,9 (+4%) nằm trong nhiễu đo (5 lượt).

## Kết quả ba cổng kiểm (Task 2)

| Cổng | Lệnh | Kết quả |
|---|---|---|
| check | `npm run check` | thoát 0. Unit Vitest: 49 file, 83 test đều qua; typecheck, lint, build xanh |
| type (D-16) | `supabase gen types ... \| shasum` so với `bench/types-hash-before.txt` | **trùng**: `2654efde436c53499e13ab335d34f13a8cb509f15f3dd7576145acad938d69b4`; `git diff --exit-code src/types/database.types.ts` sạch |
| pgTAP | `npm run db:test` (reset + toàn bộ migration từ đầu, gồm 0124/0125 áp sạch) | thoát 0. `Files=60, Tests=1015, Result: PASS`, không có `not ok`; `115_dieu_kien_ngay_dung_index_test.sql .. ok` |
| integration | `npm run test:integration` | thoát 0. 3 file, 15 test đều qua |

Không có cổng nào đỏ nên không sửa mã (migration 0124/0125, test 115, scripts/bench giữ nguyên). Chạy `db:test` đúng thứ tự: sau khi 4 file bench đã commit.

## Dữ liệu bench đã bị xóa và cách dựng lại

`npm run db:test` chạy `supabase db reset` nên DB local giờ sạch (`kho_movement` = 1 dòng sau reset, không còn dữ liệu BENCH). Wave 2 dựng lại bằng:

```bash
npm run seed:users                      # tài khoản quản lý (reset đã xóa)
npm run bench:seed -- --years 5         # ~15 phút tổng (22-04: 99 ngày 41 giây + mở rộng lên 5 năm 14 phút); chạy nền
```

Seed chạy tiếp được, không nhân đôi. Sau seed chạy `vacuum analyze` 6 bảng lớn trước khi đo. Hai tài khoản `bench.*@khominhvu.local` đã bị reset xóa; `bench:run` tự tạo lại qua `ensureBenchAccounts` (`scripts/bench/accounts.ts`), nhưng `seed:users` (tài khoản quản lý) vẫn phải chạy trước vì README yêu cầu.

## Ghi chú deploy cloud

- Migration 0124 và 0125 CHỈ mới áp ở LOCAL. Đẩy lên cloud phải hỏi người dùng và chạy ngoài giờ (header 0124 — D-15; index trên bảng 1 triệu dòng).
- `bench:*` không bao giờ chạy trên cloud (guard `local-env.ts` chặn host khác `127.0.0.1`).

## Gap cho Wave 2 (cần người dùng duyệt)

1. **`tim_kiem_toan_cuc` nhánh `chung_tu` Seq Scan** (ảnh hưởng cả hai ca so_ct/so_dh, 100-330 ms): cần điều tra vì sao planner bỏ `idx_chung_tu_so_ct_trgm` khi có bộ lọc quyền/`loai_ct`; hướng thử là tách bộ lọc quyền, hoặc chuyển điều kiện `loai_ct` vào chỉ mục trigram một phần. Chưa thử ở plan này theo quy tắc D-21.
2. `tong_quan_chi_so` đã xuống 170 ms; `phan_tich_ton_kho` 4 trang (2,3 s), `phan_tich_theo_ky` (~550 ms) và `bao_cao_xuat_am` (~630 ms) là những ca chậm nhất còn lại.

## Deviations from Plan

None - plan thực hiện đúng như viết. Không có Rule 1-3 nào phát sinh; cổng mềm không đạt được xử lý đúng quy tắc (ghi gap, không sửa).

## Known Stubs

None.

## Trạng thái cuối plan

- `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage hay commit (vẫn là thay đổi chưa commit trong working tree).
- DB local: migration 0125 mới nhất, dữ liệu bench đã bị xóa bởi `db:test`.
- Không `db:push`, không đụng cloud.

## Self-Check: PASSED
