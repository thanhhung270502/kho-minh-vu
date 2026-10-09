# Phase 22: Tối ưu truy vấn khi dữ liệu phình — Context

**Gathered:** 2026-10-09
**Status:** Ready for planning
**Source:** Audit hiệu năng trong phiên làm việc (đo trên project phonzy + 2 agent quét code) — `22-AUDIT.md`. Người dùng duyệt: "tạo phase GSD và làm Wave 0 + Wave 1".

<domain>
## Phase Boundary

Phase này giao **Wave 0** (thước đo) và **Wave 1** (index + điều kiện ngày dùng được index) của `22-AUDIT.md`.
KHÔNG đổi dữ liệu, KHÔNG đổi chữ ký hay kết quả trả về của bất kỳ RPC nào, KHÔNG đổi giao diện.

Wave 2 (viết lại 6 RPC nóng), Wave 3 (bảng tổng hợp), Wave 4 (đường ghi, vệ sinh) là phase sau.

</domain>

<decisions>
## Implementation Decisions

### Wave 0 — Sinh dữ liệu quy mô lớn (LOCAL ONLY)
- D-01: Chỉ chạy trên Supabase LOCAL. Lấy cấu hình từ `supabase status` (như `npm run test:integration`), KHÔNG đọc `.env.local` (file này đổi qua lại local↔cloud). Guard chặn mọi host khác `127.0.0.1`/`localhost` TRƯỚC khi kết nối — tái dùng hoặc làm giống guard của `tests/integration/support` + `tests/integration/local-guard.test.ts`.
- D-02: Local DB hiện gần như trống (1 mã hàng, 1 chứng từ, 2 kho, 6 người dùng). Script phải tự dựng: ~3.300 mã hàng (nhiều nhóm hàng, có vài combo), ~30 đối tác (NCC + khách, gồm đối tác nội bộ mã `NB…`), nhân viên phụ trách, rồi chứng từ.
- D-03: Nhịp nghiệp vụ mô phỏng theo số đo thật trên phonzy (99 ngày): ~92 hóa đơn XUAT/ngày × ~5,1 dòng; ~8 phiếu NHAP/ngày × ~7,6 dòng; ~1% phiếu bị hủy (bút toán đảo); một số dòng xuất âm có lý do; đơn đặt đi 1:1 với hóa đơn XUAT (đơn → dòng đơn → hóa đơn có `don_dat_hang_id`), mỗi đơn có `nhat_ky_sua` sinh tự nhiên qua trigger. Có vài phiếu TRA_KHACH và KIEM_KE/DIEU_CHINH để các nhánh RPC đều có dữ liệu.
- D-04: Quy mô có tham số (số năm, mặc định 5 → ~1 triệu dòng `kho_movement`); có mức nhỏ (vd 99 ngày) để đo "hiện tại". Ngày chứng từ trải lùi từ hôm nay về quá khứ.
- D-05: Ghi sổ PHẢI đi qua đường ghi sổ thật (`ghi_so_chung_tu` / `hoan_thanh_don` / `huy_chung_tu`) để trigger tồn kho + giá vốn + nhật ký chạy đúng — không INSERT thẳng vào `kho_movement`. Được phép chạy phía server (SQL/plpgsql qua psql với vai trò postgres) thay vì gọi HTTP từng phiếu, miễn là gọi đúng các hàm đó. Commit theo lô (vd mỗi tháng) để không giữ một transaction khổng lồ và có tiến độ.
- D-06: Đánh dấu dữ liệu sinh ra để dọn được (tiền tố số phiếu/mã riêng, hoặc ghi chú), có lệnh dọn; chạy lại không nhân đôi (idempotent hoặc từ chối khi đã có).
- D-07: Nhanh là được nhưng không bắt buộc dưới vài phút — chấp nhận chạy nền vài chục phút cho mức 5 năm. In tiến độ.

### Wave 0 — Benchmark
- D-08: Script benchmark gọi RPC qua supabase-js (PostgREST thật, có RLS, có `statement_timeout` của vai trò authenticated), đăng nhập bằng tài khoản quản lý VÀ thủ kho (tài khoản kiểm thử local — xem `scripts/test-accounts.ts`, `npm run seed:users`).
- D-09: Danh sách RPC đo = bảng rủi ro §4 của `22-AUDIT.md`: `tong_quan_chi_so`, `phan_tich_ton_kho` (đo cả kiểu gọi 4 trang như `fetchAllPages`), `hoat_dong_gan_day`, `bang_dem_kiem_ke`, `tim_kiem_toan_cuc`, `phan_tich_theo_ky`, `nhap_xuat_theo_ky`, `nhap_xuat_theo_ngay`, `bao_cao_xuat_am`, `danh_sach_doi_tac`, `danh_sach_don`, `dem_don_theo_trang_thai`, `danh_sach_chung_tu`, `the_kho_san_pham`, `lich_su_giao_dich_doi_tac`, `tim_san_pham` (từ khóa 1 ký tự và ≥3 ký tự), và thao tác xóa một dòng phiếu nháp (`chung_tu_dong`). Tham số dùng đúng như frontend đang gọi (đọc `src/features/*/api/*.ts`).
- D-10: Mỗi RPC chạy lượt làm nóng + N lần (vd 5), in p50/p95/max; lưu JSON + bảng markdown vào thư mục phase (`.planning/phases/22-toi-uu-du-lieu-lon/bench/<nhãn>.json|md`) để so trước/sau. Có lệnh so sánh hai lần chạy.
- D-11: Thêm npm script cho cả seed và bench (tên tiếng Anh/kebab, vd `bench:seed`, `bench:run`, `bench:clean`).
- D-12: Baseline phải đo ở hai mức (hiện tại ~99 ngày và 5 năm) TRƯỚC khi áp migration Wave 1. Kết quả đo sau migration ghi vào SUMMARY cạnh baseline.

### Wave 1 — Index (một migration, số tiếp theo sau 0123 → 0124)
- D-13: Index cần thêm (tên cuối cùng planner chốt theo quy ước `idx_<bảng>_<cột>`):
  - Khóa ngoại thiếu index: `kho_movement(chung_tu_dong_id) where chung_tu_dong_id is not null`, `chung_tu(chung_tu_goc_id) where … is not null`, `de_nghi_gop_ma(chung_tu_id)`.
  - Lọc ngày: `kho_movement(ngay)`, `chung_tu(created_at)`, `chung_tu(ngay_ghi_so) where ngay_ghi_so is not null`, `don_dat_hang(ngay_dh desc, so_dh desc)`, `nhat_ky_sua(bang, sua_luc desc)`.
  - Danh sách chứng từ: `chung_tu(loai_ct, ngay_ct desc, so_ct desc)` thay cho `idx_chung_tu_loai_ngay`.
  - Trigram: `chung_tu using gin (so_ct extensions.gin_trgm_ops)`, `don_dat_hang using gin (so_dh extensions.gin_trgm_ops)`.
- D-14: Bỏ index chết `idx_ddh_nguoi_nhan`, `idx_chung_tu_nguoi_nhan` (cột `nguoi_nhan_id` ngừng dùng từ 0090) — CHỈ sau khi grep migrations + `src/` chứng minh không còn chỗ đọc/lọc theo cột đó; nếu còn thì giữ và ghi lý do.
- D-15: Migration Supabase chạy trong transaction nên KHÔNG dùng `create index concurrently`. Bảng hiện nhỏ (<100k dòng) nên khóa ngắn chấp nhận được — ghi comment trong migration về điều này cho lần deploy cloud.
- D-16: Index không đổi type → không cần `db:types`, nhưng vẫn kiểm `git diff src/types/database.types.ts` rỗng sau khi sinh lại từ local.

### Wave 1 — Điều kiện ngày dùng được index
- D-17: Viết lại điều kiện lọc ngày trong các RPC lọc `kho_movement.ngay` / `chung_tu.created_at` bằng cách bọc `at time zone`/cast quanh cột: tối thiểu `tong_quan_chi_so`, `phan_tich_theo_ky`, `nhap_xuat_theo_ky`, `hoat_dong_gan_day` (phần điều kiện ngày), `the_kho_san_pham` (nếu có). Dạng đích: so sánh trực tiếp cột với hằng đã quy đổi, vd `m.ngay < ((p_den + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')`.
- D-18: CHỈ đổi điều kiện WHERE/JOIN cho dùng được index. KHÔNG đổi cấu trúc thuật toán (LATERAL 30 ngày, quét cả lịch sử cho tồn đầu kỳ… là việc của Wave 2). KHÔNG đổi chữ ký hàm, tên cột trả về, thứ tự sắp xếp.
- D-19: Ngữ nghĩa phải giữ y nguyên. Trước khi viết lại phải đọc cách `kho_movement.ngay` được gán (ghi sổ thường vs bút toán đảo `now()`), kiểu cột (`timestamptz`?), và cách mỗi hàm quy đổi ngày giờ Việt Nam. pgTAP mới chứng minh kết quả hàm cũ = hàm mới trên cùng bộ dữ liệu, gồm: movement đúng 00:00 giờ VN, 23:59:59 giờ VN, 17:00 UTC (ranh giới ngày VN), bút toán đảo, kỳ một ngày và kỳ nhiều tháng. Cách làm gợi ý: trong test (transaction tự rollback) tạo bản sao hàm cũ `_cu`, so `except` hai chiều.
- D-20: Mỗi hàm `create or replace` lại trong migration phải giữ nguyên `security definer`/`invoker`, `set search_path = ''`, `stable`, và các `grant`/`revoke` như bản mới nhất hiện có (latest definition — nhiều hàm được định nghĩa lại ở 0083/0088/0093/0098/0101/0108/0116).

### Kiểm chứng
- D-21: `EXPLAIN` (chạy trên local có dữ liệu 5 năm) xác nhận: xóa một dòng `chung_tu_dong` không còn Seq Scan `kho_movement`; `danh_sach_don` mặc định dùng index ngày; `tim_kiem_toan_cuc` với số phiếu dùng index trigram. Lưu đầu ra EXPLAIN vào thư mục `bench/`.
- D-22: `npm run check`, `npm run db:test` (pgTAP local — LƯU Ý `db:test` chạy `supabase db reset` sẽ XÓA dữ liệu seed; chạy pgTAP sau khi đã đo xong, hoặc dùng `supabase test db` không reset) và `npm run test:integration` phải xanh.
- D-23: Bẫy pgTAP 16: test không neo vào bộ đếm số chứng từ đang sống.

### Claude's Discretion
- Ngôn ngữ cài đặt seed (SQL thuần chạy qua psql, hay tsx gọi psql/pg) — chọn cái nhanh và đơn giản nhất; dự án chưa có thư viện `pg` thì KHÔNG tự cài (CLAUDE.md "Không tự ý làm: cài thư viện mới — hỏi trước"); có thể dùng `psql` CLI (đã có `/opt/homebrew/opt/postgresql@15/bin/psql`) hoặc `docker exec` vào container `supabase_db_*`.
- Phân rã plan và wave.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/22-toi-uu-du-lieu-lon/22-AUDIT.md` — số đo thật, bảng rủi ro §4, Wave 0/1 §5
- `CLAUDE.md` — năm nguyên tắc kiến trúc, quy ước đặt tên, bẫy 5 (grant cột `san_pham`/`kho_movement`), bẫy 16 (pgTAP và bộ đếm), bẫy 22 (`pg_safeupdate`: DELETE/UPDATE phải có WHERE khi qua PostgREST)
- `supabase/README.md` — chạy DB local, pgTAP
- `scripts/load-test/` (setup.sql, load.mjs, run.sh, cleanup.sql) — tiền lệ sinh/dọn dữ liệu LOADTEST
- `scripts/test-accounts.ts`, `scripts/seed-users.ts` — tài khoản kiểm thử
- `tests/integration/support/`, `tests/integration/local-guard.test.ts` — cách lấy cấu hình từ `supabase status` + guard chặn host lạ
- Định nghĩa mới nhất của các hàm bị viết lại: `tong_quan_chi_so` (0093), `phan_tich_theo_ky`/`nhap_xuat_theo_ky` (0101), `hoat_dong_gan_day` (0116), `the_kho_san_pham` (0108); đường ghi sổ `ghi_so_chung_tu` (0088), `huy_chung_tu` (0083), `hoan_thanh_don` (0098), trigger `cap_nhat_ton_va_gia_von` (0008)
- `supabase/tests/` — 60 file pgTAP hiện có (quy ước đặt tên số thứ tự)

</canonical_refs>

<specifics>
## Specific Ideas

- Số đo baseline trên phonzy (99 ngày, pg_stat_statements): `tong_quan_chi_so` TB 1,1s / max 2,8s; `phan_tich_theo_ky` TB 0,76s; `phan_tich_ton_kho` TB 0,24s ×4 trang, max 2,9s; `hoat_dong_gan_day` TB 0,31s; `tim_san_pham` 6ms (≥3 ký tự, kết nối ấm) vs 239ms (1 ký tự).
- FK `kho_movement.chung_tu_dong_id` không index ⇒ mỗi DELETE dòng phiếu quét cả sổ cái — kiểm EXPLAIN trước/sau là bằng chứng chính của Wave 1.

</specifics>

<deferred>
## Deferred Ideas

- Wave 2: viết lại `tong_quan_chi_so` (bỏ LATERAL 30 ngày), `phan_tich_ton_kho` trả jsonb 1 lần, `hoat_dong_gan_day` nhận mốc dưới, `bang_dem_kiem_ke` gom CTE, `danh_sach_doi_tac` bỏ đếm ở ô chọn khách, frontend tắt refetchOnWindowFocus cho dashboard.
- Wave 3: `san_pham.ngay_ban_cuoi`, `ton_kho_chot_thang`, bảng tổng hợp theo ngày — chờ quyết định thẻ kho theo `ngay` hay `created_at`.
- Wave 4: WHEN trên trigger `san_pham`, `_cap_nhat_tien_do_ddh` chỉ ghi dòng đổi, thứ tự khóa khi ghi sổ, retention log job, RLS thủ kho.
- `tim_san_pham` từ khóa <3 ký tự (tìm tiền tố mã + cột sinh sẵn không dấu) — đổi hành vi tìm kiếm nên để phase sau.
- Đo lại trên production `rnpq` (MCP hiện không truy cập được).

</deferred>

---

*Phase: 22-toi-uu-du-lieu-lon*
*Context gathered: 2026-10-09 từ audit hiệu năng*
