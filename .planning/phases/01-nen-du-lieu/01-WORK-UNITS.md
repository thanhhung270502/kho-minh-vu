# Phase 1: Nền dữ liệu - Work Units

**Đầu vào cho `/spartan:phase plan 1`.** Đây là phân rã đề xuất, không phải plan cuối —
planner có quyền gộp/tách nếu thấy lý do rõ ràng.

Quy tắc: mỗi WU tối đa 3 file, tối đa nửa ngày, đúng một commit.
Wave N+1 phụ thuộc đầu ra của Wave N. WU trong cùng wave chạy song song được.

Đánh số migration tăng dần theo thứ tự wave — thứ tự file quyết định thứ tự chạy.

---

## Wave 1 — Nền tảng Postgres

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-01** | Khởi tạo Supabase local: `config.toml`, bật `uuid-ossp` / `unaccent` / `pg_trgm` / `pg_cron`, hàm dùng chung `update_updated_at()` và wrapper `f_unaccent()` IMMUTABLE | `supabase/config.toml`, `supabase/migrations/0001_extensions.sql`, `package.json` | DATA-01 |
| **WU-02** | Kiểu enum: `loai_ct`, `trang_thai_ct`, `vai_tro`, `loai_doi_tac`, `trang_thai_ddh` | `supabase/migrations/0002_enums.sql` | DATA-01 |

## Wave 2 — Danh mục nền

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-03** | Bảng `nguoi_dung` (nối `auth.users`, giữ `vai_tro` + `kho_id`) và `kho` | `supabase/migrations/0003_nguoi_dung_kho.sql` | DATA-01 |
| **WU-04** | Bảng `nhom_hang` (tự tham chiếu `parent_id`), `don_vi_tinh`, `cong_doan`, `doi_tac` | `supabase/migrations/0004_danh_muc.sql` | DATA-01 |

## Wave 3 — Sản phẩm & chứng từ

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-05** | Bảng `san_pham` + unique index `ma_hang` + GIN index trgm trên `f_unaccent(ma_hang \|\| ten_hang)` + cột `lan_phat_sinh_cuoi` | `supabase/migrations/0005_san_pham.sql` | DATA-01, DATA-07 |
| **WU-06** | Bảng `don_dat_hang` + `don_dat_hang_dong` | `supabase/migrations/0006_don_dat_hang.sql` | DATA-01 |
| **WU-07** | Bảng `chung_tu` + `chung_tu_dong`, kèm `ly_do_xuat_am` ở header và `so_luong_he_thong` ở dòng (cho kiểm kê) | `supabase/migrations/0007_chung_tu.sql` | DATA-01 |

## Wave 4 — Sổ cái & tồn kho

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-08** | `kho_movement` (append-only) + `ton_kho` + trigger cập nhật tồn và giá vốn bình quân + REVOKE và trigger chặn UPDATE/DELETE | `supabase/migrations/0008_so_cai_ton_kho.sql` | DATA-02, DATA-03, DATA-04 |
| **WU-09** | Bảng đếm `chuoi_so_ct` + hàm `sinh_so_ct(loai, nam)` dùng `UPDATE ... RETURNING` | `supabase/migrations/0009_danh_so.sql` | DATA-08 |
| **WU-10** | Bảng lưu trữ chứng từ KiotViet cũ (`luu_tru_nhap_kiotviet`, `luu_tru_hoa_don_kiotviet`) | `supabase/migrations/0010_luu_tru_kiotviet.sql` | DLIEU-07 *(chuẩn bị cho Phase 6)* |

## Wave 5 — Logic nghiệp vụ

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-11** | RPC `ghi_so_chung_tu()` — một transaction, xử lý đủ 7 loại chứng từ, chặn xuất âm khi thiếu lý do, cập nhật tiến độ đơn đặt hàng. SQLSTATE theo D-23 | `supabase/migrations/0011_rpc_ghi_so.sql` | DATA-05 |
| **WU-12** | RPC `huy_chung_tu()` — sinh bút toán đảo, giữ nguyên bản ghi gốc | `supabase/migrations/0012_rpc_huy.sql` | DATA-06 |
| **WU-13** | RPC `tim_san_pham()` — unaccent + trgm, xếp mã phát sinh gần đây lên trước | `supabase/migrations/0013_rpc_tim_kiem.sql` | DATA-07 |
| **WU-14** | Custom access token hook + helper RLS bọc `(select ...)` + policy bốn vai trò trên mọi bảng | `supabase/migrations/0014_rls.sql` | AUTH-03, AUTH-04, AUTH-05, AUTH-06 |
| **WU-15** | View `v_doi_chieu_ton` + hàm `doi_chieu_ton()` + job `pg_cron` hằng đêm | `supabase/migrations/0015_doi_chieu.sql` | DATA-09 |

## Wave 6 — Kiểm chứng

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-16** | Seed: 4 tài khoản mẫu + kho + ĐVT + công đoạn cơ bản | `supabase/seed.sql` | DATA-01 |
| **WU-17** | pgTAP: trigger tồn kho, công thức giá vốn, chặn sửa/xóa sổ cái | `supabase/tests/ton_kho_test.sql` | DATA-10 |
| **WU-18** | pgTAP: ghi sổ atomic, hủy đảo, đánh số khi hai phiên tạo cùng lúc | `supabase/tests/chung_tu_test.sql` | DATA-10 |
| **WU-19** | pgTAP: bốn vai trò RLS bằng JWT thật của 4 tài khoản seed | `supabase/tests/rls_test.sql` | DATA-10 |

## Wave 7 — Chuyển dữ liệu

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-20** | Script import: đọc Excel, validate từng dòng, `--dry-run` in báo cáo lỗi, không ghi gì | `scripts/import-kiotviet/doc-va-kiem-tra.ts`, `scripts/import-kiotviet/index.ts` | DLIEU-01 |
| **WU-21** | Script import: ghi thật trong một transaction, upsert idempotent, tách ĐVT thành `dvt` + `cong_doan` | `scripts/import-kiotviet/nap-du-lieu.ts`, `scripts/import-kiotviet/tach-dvt-cong-doan.ts` | DLIEU-02, DLIEU-03 |
| **WU-22** | Sinh lại `database.types.ts`, chạy `npm run check` cho sạch | `src/types/database.types.ts` | DATA-01 |

---

## Phụ thuộc bên ngoài

**WU-20 và WU-21 chạy được trên dữ liệu thật chỉ khi bốn file export đã nằm trong
`data/kiotviet/`.** Xem `data/kiotviet/README.md`. Nếu tới lúc thực thi mà chưa có file,
hai WU đó vẫn viết và test được trên dữ liệu mẫu, nhưng DLIEU-01..03 chưa tính là xong.

## Bao phủ yêu cầu

| Yêu cầu | WU |
|---|---|
| DATA-01 | WU-01..07, WU-16, WU-22 |
| DATA-02, DATA-03, DATA-04 | WU-08 |
| DATA-05 | WU-11 |
| DATA-06 | WU-12 |
| DATA-07 | WU-05, WU-13 |
| DATA-08 | WU-09 |
| DATA-09 | WU-15 |
| DATA-10 | WU-17, WU-18, WU-19 |
| AUTH-03..06 | WU-14 |
| DLIEU-01 | WU-20 |
| DLIEU-02, DLIEU-03 | WU-21 |
| DLIEU-07 *(Phase 6)* | WU-10 chuẩn bị sẵn bảng |

17/17 yêu cầu của Phase 1 đều có WU phụ trách.
