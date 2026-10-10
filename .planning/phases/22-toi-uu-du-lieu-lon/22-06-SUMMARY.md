---
phase: 22-toi-uu-du-lieu-lon
plan: 06
subsystem: database
tags: [postgres, index, plpgsql, pgtap, migration, supabase-local]

requires:
  - phase: 22-05
    provides: idx_movement_ngay (0124) và DB local 5 năm (1,0 triệu dòng kho_movement)
provides:
  - "Migration 0125: tong_quan_chi_so, phan_tich_theo_ky, nhap_xuat_theo_ky so sánh cột ngày trực tiếp với hằng quy đổi giờ VN, đã áp ở LOCAL"
  - "pgTAP 115: 31 assert chứng minh hàm cũ (_cu) và hàm mới cho kết quả trùng khớp, kèm 3 ca đối chứng _sai"
affects: [22-07]

key-files:
  created:
    - supabase/tests/115_dieu_kien_ngay_dung_index_test.sql
    - supabase/migrations/0125_dieu_kien_ngay_dung_index.sql
  modified: []

key-decisions:
  - "Chỉ đổi WHERE; thân hàm còn lại chép nguyên văn từ pg_get_functiondef của bản đang chạy"
  - "hoat_dong_gan_day và the_kho_san_pham không đổi: không có điều kiện ngày bọc hàm quanh cột (ghi lý do trong header migration)"

requirements-completed: [P22-SC5]

completed: 2026-10-09
---

# Phase 22 Plan 06: Điều kiện ngày dùng được index (0125) Summary

**Ba RPC dashboard/phân tích đổi `(m.ngay at time zone VN)::date <op> d` thành so sánh `m.ngay` với hằng `(d::timestamp at time zone VN)`, được pgTAP 115 chứng minh trùng khớp bản cũ ở mọi ranh giới nửa đêm giờ VN; EXPLAIN chọn `Index Only Scan using idx_movement_ngay`.**

## Commits

| Task | Commit | Nội dung |
|---|---|---|
| 1 | `df4215a` | test(db): pgTAP 115 so khớp hàm cũ/mới, chạy XANH trên hàm cũ trước khi viết migration |
| 2 | `f927646` | perf(db): migration 0125 viết lại điều kiện ngày |

## Task 1: pgTAP 115 (xanh trên hàm cũ)

- 31/31 assert xanh trước khi có 0125: 3 giá trị tuyệt đối (5 / 10 / 48), 4 `tong_quan_chi_so`, 6 `phan_tich_theo_ky`, 15 `nhap_xuat_theo_ky`, 3 đối chứng.
- Fixture mốc 2093, 12 movement ở các ranh giới: đúng 00:00 VN, 23:59:59 VN, 17:00 UTC, 16:59:59.999999 UTC, bút toán đảo, phiếu hủy, movement không chứng từ; 3 phiếu chờ ghi sổ với `created_at` sát nửa đêm VN. Không neo bộ đếm số chứng từ (bẫy 16).
- Ca đối chứng `nhap_xuat_theo_ky_sai`, `phan_tich_theo_ky_sai`, `tong_quan_chi_so_sai` (bản `_cu` chỉ sửa điều kiện ngày cho sai) đều cho kết quả KHÁC `_cu` (`results_ne` / `isnt` pass) cho cả ba hàm, nên bộ dữ liệu bắt được lỗi lệch một ngày.
- Header có cảnh báo: khi Wave 2 đổi thuật toán ba hàm thì phải gỡ/chụp lại các bản `_cu`/`_sai`.
- Chạy: `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/115_...sql` (không reset, ~13-17 giây trên dữ liệu 5 năm).

## Task 2: Migration 0125

Đổi đúng các điều kiện:

| Hàm | Trước | Sau |
|---|---|---|
| `tong_quan_chi_so` | `(m.ngay at tz)::date > v_t_truoc` | `m.ngay >= ((v_t_truoc + 1)::timestamp at time zone VN)` |
| `tong_quan_chi_so` (LATERAL) | `(m.ngay at tz)::date > s.t::date` | `m.ngay >= ((s.t::date + 1)::timestamp at time zone VN)` |
| `tong_quan_chi_so` (xu hướng chờ ghi sổ) | `(ct.created_at at tz)::date = s.t::date` | `ct.created_at >= (s.t::date::timestamp at tz) and < ((s.t::date + 1)::timestamp at tz)` |
| `phan_tich_theo_ky` | `(m.ngay at tz)::date <= p_den` | `m.ngay < ((p_den + 1)::timestamp at time zone VN)` |
| `nhap_xuat_theo_ky` | `(m.ngay at tz)::date between p_tu and p_den` | `m.ngay >= (p_tu::timestamp at tz) and m.ngay < ((p_den + 1)::timestamp at tz)` |

Giữ nguyên: điều kiện trên `san_pham.created_at`, `min((ct.created_at ...)::date)`, các biểu thức `ky`/`ngay` trong SELECT, `mv.ngay between v_tu_truoc and p_tu - 1` (lọc trên cột đã tính trong CTE, không phải cột sổ cái).

Kiểm sau khi áp (`npx supabase migration up --local`):

- pg_proc: cả 3 hàm `prosecdef = t`, `provolatile = s`, `proconfig = {search_path=""}`, `anon` không execute, `authenticated` execute (comment sẵn có của `tong_quan_chi_so` / `phan_tich_theo_ky` còn nguyên).
- pgTAP 115: 31/31 xanh trên hàm MỚI; pgTAP 111 (`tong_quan_3b`): 35/35 xanh.
- EXPLAIN: `Index Only Scan using idx_movement_ngay`, `Index Cond: ngay >= '2026-09-30 17:00:00+00' and ngay < '2026-10-09 17:00:00+00'`.
- `kho_movement` vẫn 1.008.828 dòng. Hash type sinh từ local = `bench/types-hash-before.txt`; `git diff` `src/types/database.types.ts` sạch. `npm run check` thoát 0.

## Deviations from Plan

**1. [Ghi chú] Header test chép thêm `dang_nhap_nhu` / `dang_xuat`** ngoài `sp_test` / `kho_id` mà plan nêu: ba hàm kiểm quyền qua `co_quyen` / `xem_duoc_phan_tich` nên test phải đăng nhập `quanly@khominhvu.local`. Lần chạy đầu thiếu helper này nên văng lỗi, đã bổ sung trước khi commit.

Không phát sinh Rule 1-3 nào khác.

## Lưu ý

- Chưa đẩy lên cloud. Migration 0125 chỉ ở local (cùng 0124).
- `bench:run` so với baseline-5y thuộc 22-07; DB local giữ nguyên dữ liệu 5 năm cho plan đó.
- Không `db reset`, `db:test`, `bench:clean`, `db:push`, `--linked`.
- `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage hay commit.

## Known Stubs

None.

## Self-Check: PASSED

Hai file tồn tại; commit `df4215a` và `f927646` có trong `git log`; pgTAP 115 xanh trước và sau 0125.
