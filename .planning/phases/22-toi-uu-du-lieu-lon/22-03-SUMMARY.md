---
phase: 22-toi-uu-du-lieu-lon
plan: 03
subsystem: testing
tags: [bench, supabase-js, postgrest, rls, vitest]

requires:
  - phase: 22-01
    provides: guard LOCAL (readLocalSupabase, BENCH_DIR), tiền tố BENCH-*, bench:clean
  - phase: 22-02
    provides: bench:seed, fixture BENCH-0001 / NBBENCH / BENCH-KK-MO, vnToday
provides:
  - "`npm run bench:run -- --label <nhãn> [--iterations 5] [--only ids] [--force] [--fast-fail]` đo 23 ca RPC (33 cặp ca x vai trò) qua PostgREST thật"
  - "`npm run bench:compare -- <a> <b>` in và lưu bảng so sánh p50/p95 trước/sau"
  - "scripts/bench/stats.ts: summarize, renderRunMarkdown, compareRuns, renderCompareMarkdown, kiểu BenchRun/BenchCaseResult"
  - "scripts/bench/accounts.ts: ensureBenchAccounts (bench.quanly / bench.thukho)"
  - "scripts/bench/cases.ts: buildCases (danh mục ca theo bảng rủi ro §4 của 22-AUDIT)"
affects: [22-04]

tech-stack:
  added: []
  patterns:
    - "Ca đo tái dùng hàm thuần của src (import qua alias @/ chạy được dưới tsx), không chép tham số"
    - "Lỗi PostgREST là object thường: runner đọc `.code` (57014 timeout, 42501 forbidden), không instanceof"
    - "Thiếu fixture BENCH thì ca ra `skipped` thay vì làm chết cả lượt đo"

key-files:
  created:
    - scripts/bench/stats.ts
    - scripts/bench/stats.test.ts
    - scripts/bench/compare.ts
    - scripts/bench/accounts.ts
    - scripts/bench/cases.ts
    - scripts/bench/run.ts
  modified: []

key-decisions:
  - "Timeout (57014) được giữ làm số đo (8 giây); lỗi nhanh (42501, sai tham số) không đưa vào mẫu"
  - "Tài khoản bench không bao giờ bị xóa; mật khẩu đặt lại ngẫu nhiên mỗi lần chạy"
  - "Số dòng một ca = độ dài mảng trả về của lượt đo cuối (jsonb một giá trị tính 1)"

patterns-established:
  - "bench/<nhãn>.json là hợp đồng giữa bench:run và bench:compare (BenchRun)"

requirements-completed: [P22-SC2]

duration: ~25 phút
completed: 2026-10-09
---

# Phase 22 Plan 03: Bộ đo hiệu năng RPC (bench:run, bench:compare) Summary

**`bench:run` gọi 23 ca RPC qua supabase-js (PostgREST, RLS, statement_timeout 8s) bằng tài khoản quản lý và thủ kho, đo 1 lượt làm nóng + N lượt, ghi p50/p95/max ra JSON và markdown; `bench:compare` đặt hai lần đo cạnh nhau với phần trăm chênh.**

## Accomplishments

- `stats.ts` + 8 test (TDD): nearest-rank p50/p95, mean làm tròn 1 chữ số, ghép ca theo `id|vai trò`, hiển thị `timeout (8s)` và `—`, bảng quy mô trong cả hai bản markdown.
- `accounts.ts`: `bench.quanly@khominhvu.local` (QUAN_LY) và `bench.thukho@khominhvu.local` (THU_KHO, kho K1, quyền `nhap_kho`); không có `deleteUser`.
- `cases.ts`: đủ 16 RPC của bảng rủi ro §4, trong đó `phan_tich_ton_kho` đo cả một trang lẫn vòng `fetchAllPages`, và ca xóa một dòng `chung_tu_dong` (có WHERE, bẫy 22) trên phiếu NHAP nháp, dọn bằng `huy_chung_tu`.
- `run.ts`: guard LOCAL trước mọi client, đăng nhập `signInWithPassword`, đếm quy mô 6 bảng lớn (head count, không `select("*")`), ghi `bench/<nhãn>.json|md`, từ chối nhãn trùng nếu không có `--force`.

## Ca dùng hàm thật của frontend và ca chép tham số

Import hàm thuần của `src` qua alias `@/` chạy được dưới tsx nên không phải chép chỗ nào ngoài literal vốn nằm trong hàm gọi API:

| Dùng hàm thật | Chép literal, ghi chú `file:dòng` trong code |
|---|---|
| `danh_sach_don.mac_dinh` (`readOrderFilterFromUrl` + `toOrderListRpcArgs`), `dem_don_theo_trang_thai.mac_dinh` (`toOrderStatusCountRpcArgs`), `danh_sach_chung_tu.hoa_don` (`readIssueFilterFromUrl` + `toIssueListRpcArgs`), `phan_tich_theo_ky.*` và `nhap_xuat_theo_ky.mac_dinh` (`defaultPeriodFilter`, `periodRange`, `seriesStep`), `phan_tich_ton_kho.4_trang` (`fetchAllPages`) | `tong_quan_chi_so`, `phan_tich_ton_kho` (kỳ 30 = `CURRENT_PACE_DAYS`), `hoat_dong_gan_day` (20), `bang_dem_kiem_ke`, `tim_kiem_toan_cuc` (5), `nhap_xuat_theo_ngay` (30/90), `bao_cao_xuat_am`, `danh_sach_doi_tac` (customer-lookup:13, partner.api:23), `the_kho_san_pham` (product.api:63), `lich_su_giao_dich_doi_tac` (partner.api:99), `tim_san_pham` (product-search:17), xóa dòng (document.api:120) |

Các hàm `fetchXxx` trong `*.api.ts` không import được (kéo `getSupabaseBrowserClient`, phụ thuộc trình duyệt) nên phần gọi RPC được viết lại bằng đúng tên tham số của chúng.

## Task Commits

1. Task 1 RED: `0df796f` test(bench): thống kê p50/p95 và so sánh hai lần đo
2. Task 1 GREEN: `1922230` feat(bench): bench:compare và thống kê p50/p95
3. Task 2: `d63c484` feat(bench): tài khoản đo và danh mục ca RPC theo tham số frontend
4. Task 3: `0b981a1` feat(bench): đo RPC qua PostgREST bằng tài khoản quản lý và thủ kho (bench:run)

## Kết quả kiểm chứng (chạy thật)

- `npx vitest run --project unit scripts/bench/stats.test.ts`: 8 pass; trước khi có `stats.ts` thì fail vì thiếu module (RED).
- Smoke 1, DB không có BENCH (`--iterations 2`): 33 cặp ca x vai trò; `tong_quan_chi_so|quan_ly` = `ok`; các ca cần fixture (`bang_dem_kiem_ke`, `the_kho_san_pham`, `lich_su_giao_dich_doi_tac`, `xoa_dong_phieu_nhap`) ra `skipped`; log nêu fixture thiếu.
- Smoke 2, sau `bench:seed --days 3` (5 giây): cả 33 cặp `ok`, gồm `xoa_dong_phieu_nhap` (xóa qua PostgREST không dính `pg_safeupdate`), `bang_dem_kiem_ke` 36 dòng cho cả hai vai trò, `danh_sach_don` 50 dòng, `the_kho_san_pham` 39 dòng. Số đo trên 3 ngày dữ liệu đều vài ms, không có ý nghĩa baseline.
- `bench:compare smoke smoke` sinh `compare-smoke-22-03-vs-smoke-22-03.md` (Δ 0%); `bench:compare smoke nope` báo `Không thấy .../nope.json — chạy npm run bench:run -- --label nope trước` và thoát 1.
- Các file smoke và file compare đã xóa, không có trong commit nào.
- `npm run check` (typecheck + lint + test:unit + build) xanh; `grep 'select("\*")' scripts/bench/*.ts` không có kết quả; `accounts.ts` không chứa `deleteUser`.

## Trạng thái DB cuối plan

Đã chạy `npm run bench:clean` sau smoke 2: 0 chứng từ và 0 mã hàng BENCH, báo không mồ côi. Hai tài khoản `bench.*@khominhvu.local` còn lại (đúng như thiết kế). 22-04 bắt đầu từ DB sạch.

## Deviations from Plan

**1. [Ghi chú] Số ca**: plan ghi "≥ 25 phần tử cases"; thực tế 23 ca khai báo, 33 cặp ca x vai trò (JSON `cases.length = 33`).

**2. [Thêm ngoài plan, nhỏ] Tham số `--fast-fail`**: đã có trong mô tả bước 4 của plan nhưng không nằm trong dòng cú pháp; có cài.

**3. [Ghi chú] Smoke bổ sung bằng seed 3 ngày**: plan chỉ yêu cầu smoke trên DB hiện tại. Làm thêm để chứng minh các ca phụ thuộc fixture chạy được, rồi `bench:clean`. Không ảnh hưởng 22-04.

Không có sai lệch nào khác; không phát sinh Rule 1-3.

## Giới hạn đã biết

- `tim_kiem_toan_cuc.so_ct` / `.so_dh` tìm mảnh số `HD/DH<YYMMDD của hôm nay − 3>-04`: chỉ có kết quả khi bộ seed phủ ngày đó (seed 3 ngày thì ra 0 dòng; 5 năm thì có). Vẫn đo được đường tìm, nhưng nên kiểm cột "Số dòng" khi đọc baseline.
- Nhánh timeout (57014) và forbidden (42501) chưa được kích hoạt thật trong smoke vì mọi ca đều chạy vài ms; phân loại dựa trên `.code` như đã mô tả ở bẫy 8. Sẽ thấy lần đầu ở baseline 5 năm nếu có ca vượt 8 giây.
- Chưa tính thời gian truyền mạng của trình duyệt; đây là thời gian client Node tới PostgREST local.

## Known Stubs

None. `bench:explain` vẫn do 22-04 tạo (`scripts/bench/explain.sh`).

## Self-Check: PASSED

Các file `scripts/bench/{stats.ts,stats.test.ts,compare.ts,accounts.ts,cases.ts,run.ts}` tồn tại; commit `0df796f`, `1922230`, `d63c484`, `0b981a1` có trong `git log`; `.planning/STATE.md` và `.planning/ROADMAP.md` không được stage.
