---
phase: 22-toi-uu-du-lieu-lon
plan: 05
subsystem: database
tags: [postgres, index, pg_trgm, migration, supabase-local]

requires:
  - phase: 22-04
    provides: baseline 99 ngày / 5 năm, EXPLAIN trước migration, types-hash-before.txt
provides:
  - "Migration 0124: 11 index mới, bỏ 3 index (1 thay thế + 2 chết), đã áp ở LOCAL"
  - "Bằng chứng D-14 cho việc bỏ idx_ddh_nguoi_nhan / idx_chung_tu_nguoi_nhan"
  - "EXPLAIN sớm cho tim_kiem_toan_cuc: planner chọn trigram cho cả so_ct và so_dh"
affects: [22-06, 22-07]

key-files:
  created:
    - supabase/migrations/0124_index_du_lieu_lon.sql
  modified: []

key-decisions:
  - "Bỏ cả hai index nguoi_nhan_id cấp đầu đơn/đầu phiếu: không còn chỗ đọc/lọc"
  - "Không dùng CONCURRENTLY (D-15); ghi chú khóa SHARE cho lần deploy cloud trong header migration"

requirements-completed: [P22-SC4]

completed: 2026-10-09
---

# Phase 22 Plan 05: Migration 0124 index cho dữ liệu lớn Summary

**Migration 0124 thêm 11 index (khóa ngoại, lọc ngày, danh sách chứng từ, trigram số phiếu/số đơn) và bỏ 3 index; áp trên DB local 1,0 triệu dòng `kho_movement`: xóa dòng phiếu chuyển từ Seq Scan sang Index Scan và `tim_kiem_toan_cuc` dùng GIN trigram (~3-4 ms thay vì ~200 ms).**

## Commits

| Task | Commit | Nội dung |
|---|---|---|
| 1 + 2 | `1df3b31` | perf(db): index cho sổ cái, chứng từ, đơn đặt khi dữ liệu phình (0124) |

Task 1 (bằng chứng + viết file) và Task 2 (áp + kiểm) cùng đụng một file nên gộp một commit sau khi đã áp và kiểm xanh (đúng thông điệp commit plan quy định); không commit migration chưa kiểm.

## Bằng chứng D-14 (09/10/2026, DB local migration 0123)

**Hàm trong schema `public` có nhắc `<bí danh>.nguoi_nhan_id`** — mỗi bí danh đã đối chiếu với câu `from/join/insert/update` trong `pg_get_functiondef`:

| Hàm | Bí danh | Trỏ bảng | Đầu đơn/phiếu? |
|---|---|---|---|
| `_chan_bo_nguoi_nhan_dang_dung` | `d`, `old` | `don_dat_hang_dong`, dòng của bảng nối | không |
| `_tu_them_nguoi_nhan_don` | `new` | `don_dat_hang_dong` (trigger) | không |
| `chi_tiet_chung_tu`, `danh_sach_chung_tu`, `the_kho_san_pham`, `xuat_excel_chung_tu` | `ctn` | `chung_tu_nguoi_nhan` | không |
| `chi_tiet_don`, `danh_sach_don`, `dem_don_theo_trang_thai`, `hoat_dong_gan_day`, `tao_phieu_xuat_tu_don`, `xuat_excel_don_dat` | `ddn` | `don_dat_hang_nguoi_nhan` | không |
| `chi_tiet_chung_tu`, `chi_tiet_don`, `danh_sach_don` | `nn` | subquery gom từ bảng nối (`nn.nguoi_nhan_ids`) | không |
| `dat_nguoi_nhan_don` | `d`, `ds`, `x` | `don_dat_hang_dong`, subquery trên dòng, `don_dat_hang_nguoi_nhan` | không |
| `dong_don`, `them_dong_don`, `xuat_excel_don_dat` (dòng) | `d`, `dd` | `don_dat_hang_dong` | không |
| `nguoi_nhan_dong_chung_tu`, `xuat_excel_chung_tu` (dòng) | `ctd`, `d` | `chung_tu_dong` | không |
| `nhap_chung_tu_excel` | `d`, `dd`, `dl`, `x` | bảng tạm `_xl_dong`, `don_dat_hang_dong`, `chung_tu_dong`, bảng nối | không |
| `tao_don`, `tao_phieu_xuat_tu_don` | (không bí danh) | chỉ INSERT vào bảng nối / `chung_tu_nguoi_nhan` | không |

- Policy RLS nhắc `nguoi_nhan_id`: **0**. View nhắc `nguoi_nhan_id`: **0**.
- Ràng buộc/trigger trên hai bảng đầu: chỉ `ck_chung_tu_khong_hai_nguoi_nhan` (CHECK, không dùng index), hai FK `*_nguoi_nhan_id_fkey` (chỉ kiểm khi xóa `nhan_vien_phu_trach`, bảng này không có policy DELETE) và trigger `kiem_don_noi_bo_co_nguoi_nhan`, hàm của nó đọc bảng nối `don_dat_hang_nguoi_nhan`, không đọc cột đầu đơn.
- Dữ liệu: `don_dat_hang.nguoi_nhan_id` và `chung_tu.nguoi_nhan_id` không NULL = 0 / 0 dòng ở local. Chưa kiểm cloud; cột và dữ liệu cũ (nếu có) vẫn giữ nguyên, chỉ bỏ index.
- Frontend `src/` (loại `database.types.ts`): mọi chỗ `nguoi_nhan_id` là bảng dòng (`don_dat_hang_dong`: `order.schema.ts:87,101`, `types.ts:132`), dòng chứng từ/bảng nối (`documents/types.ts:200`), tham số RPC `p_nguoi_nhan_id(s)` hoặc test. Không có `.from("don_dat_hang")` / `.from("chung_tu")` nào lọc hay chọn cột đầu.
- Ngoài app: `scripts/bench/clean.sql` liệt kê cột đầu khi dọn tham chiếu `nhan_vien_phu_trach` (công cụ bench, không phải đường nóng).
- **Kết luận: KHÔNG còn chỗ đọc/lọc cột đầu đơn/đầu phiếu, bỏ cả `idx_ddh_nguoi_nhan` và `idx_chung_tu_nguoi_nhan`.** Cột giữ nguyên.

## Kết quả áp ở local

- `npx supabase migration up --local`: applied `0124_index_du_lieu_lon.sql`, không báo lệch lịch sử.
- 11/11 index mới có trong `pg_indexes`; 0/3 index cũ (`idx_chung_tu_loai_ngay`, `idx_ddh_nguoi_nhan`, `idx_chung_tu_nguoi_nhan`) còn lại.
- `kho_movement` vẫn **1.008.828** dòng (dữ liệu 5 năm còn nguyên; không `db reset`, `db:test`, `bench:clean`, `db:push`).
- `vacuum analyze` chạy trên 5 bảng liên quan.
- D-16: hash type sinh từ local = `2654efde…d69b4` = `bench/types-hash-before.txt`; `git diff --exit-code src/types/database.types.ts` thoát 0.
- `npm run check` thoát 0.

## EXPLAIN nhanh sau migration

**Xóa dòng phiếu (kiểm khóa ngoại), D-21:**

```
LockRows  (cost=0.45..8.48 rows=1 width=10)
  ->  Index Scan using idx_movement_chung_tu_dong on kho_movement x  (cost=0.42..8.44 rows=1 width=10)
        Index Cond: (chung_tu_dong_id = (InitPlan 1).col1)
```

Trước (22-04): `Seq Scan on kho_movement x (cost=0.00..30004.35 ...)`, trigger khóa ngoại 79,9 ms. Cost hạ từ ~30.000 xuống ~8.

**Bước 4b, cổng MỀM cho 22-07 — hình câu `tim_kiem_toan_cuc` (CTE `tham_so` một dòng được tham chiếu hai lần nên bị materialize, từ khóa không biết lúc lập kế hoạch, ORDER BY … LIMIT 5): planner CHỌN trigram ở cả hai bảng.**

`chung_tu.so_ct` (kw = `HD<today-3>-04`, loại phiếu như hàm thật):

```
Limit (actual time=3.057..3.064 rows=5)
  -> Sort  Sort Key: (CASE WHEN lower(c.so_ct)=lower(t.kw) THEN 0 ELSE 1 END), c.ngay_ct DESC, c.so_ct DESC
     -> Nested Loop (actual rows=10)
        -> CTE Scan on tham_so t  Filter: (length(kw) >= 2)
        -> Bitmap Heap Scan on chung_tu c (rows=916 est, actual rows=10)
             Recheck Cond: (so_ct ~~* (('%'::text || t.kw) || '%'::text))
             Filter: (loai_ct = ANY ('{NHAP,XUAT,TRA_NCC,TRA_KHACH,KIEM_KE}'))
             -> Bitmap Index Scan on idx_chung_tu_so_ct_trgm  (actual time=2.295..2.296 rows=10)
Planning Time: 2.309 ms   Execution Time: 4.088 ms
```

`don_dat_hang.so_dh` (kw = `DH<today-3>-04`):

```
Limit (actual time=2.040..2.042 rows=5)
  -> Sort  Sort Key: (CASE WHEN lower(d.so_dh)=lower(t.kw) THEN 0 ELSE 1 END), d.ngay_dh DESC, d.so_dh DESC
     -> Nested Loop (actual rows=10)
        -> Bitmap Heap Scan on don_dat_hang d (rows=840 est, actual rows=10)
             Recheck Cond: (so_dh ~~* (('%'::text || t.kw) || '%'::text))
             -> Bitmap Index Scan on idx_ddh_so_dh_trgm  (actual time=1.482..1.482 rows=10)
Planning Time: 2.041 ms   Execution Time: 2.747 ms
```

Trước (22-04, Seq Scan toàn bảng): 214 ms (`so_ct`) và 194 ms (`so_dh`); nay 4,1 ms và 2,7 ms. Ước lượng hàng (916 / 840) cao hơn thực (10) vì từ khóa chưa biết lúc lập kế hoạch, nhưng không làm planner bỏ index. Gate mềm: ĐẠT, không có gap.

## Deviations from Plan

**1. [Ghi chú] Gộp Task 1 và Task 2 thành một commit** `1df3b31` (cả hai chỉ đụng một file migration; commit sau khi áp và kiểm xanh). Không phát sinh Rule 1-3.

## Lưu ý deploy cloud

- Chưa đẩy lên bất kỳ project cloud nào. Khi deploy: header migration có ghi chú khóa SHARE và cách tách `CREATE INDEX CONCURRENTLY` khi bảng đã lớn. Hỏi người dùng trước (xem memory về trạng thái cloud rnpq/phonzy).
- `bench:run` sau migration (so với baseline-5y) thuộc plan 22-06/22-07.

## Known Stubs

None.

## Trạng thái cuối plan

- DB local: migration mới nhất 0124, dữ liệu 5 năm giữ nguyên cho 22-06/22-07.
- `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage hay commit.

## Self-Check: PASSED

`supabase/migrations/0124_index_du_lieu_lon.sql` tồn tại; commit `1df3b31` có trong `git log`; 11 index có trong DB local.
