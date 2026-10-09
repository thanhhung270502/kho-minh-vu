---
phase: 22-toi-uu-du-lieu-lon
verified: 2026-10-09T12:00:00Z
status: human_needed
score: 6/7 must-haves verified (SC6 đạt một phần)
re_verification: false
gaps:
  - truth: "SC6: EXPLAIN xác nhận tim_kiem_toan_cuc (số phiếu) dùng index"
    status: partial
    reason: "Nhánh chung_tu (so_ct) của tim_kiem_toan_cuc vẫn Seq Scan 183.095 dòng trong kế hoạch thật của hàm; chỉ nhánh don_dat_hang.so_dh dùng idx_ddh_so_dh_trgm. Plan 22-07 xếp đây là cổng MỀM (D-21): ghi gap, không sửa để ép. Index idx_chung_tu_so_ct_trgm có tồn tại nhưng planner không chọn khi có bộ lọc quyền/loai_ct."
    artifacts:
      - path: ".planning/phases/22-toi-uu-du-lieu-lon/bench/explain-after-5y.txt"
        issue: "=== CASE: tim_kiem_so_ct === và tim_kiem_so_dh: Seq Scan on chung_tu c (rows=183095)"
    missing:
      - "Điều tra vì sao planner bỏ idx_chung_tu_so_ct_trgm khi có bộ lọc quyền (phieu_co_dong_thuoc_kho_hien_tai, kho_id) và loai_ct; hướng thử: tách bộ lọc quyền, hoặc index trigram một phần theo loai_ct (việc Wave 2)"
human_verification:
  - test: "Người dùng duyệt gap SC6 (chấp nhận đưa vào Wave 2) hoặc yêu cầu đóng gap trước khi đóng phase"
    expected: "Quyết định rõ: (a) chấp nhận Phase 22 = Wave 0 + Wave 1 với gap tim_kiem_toan_cuc được ghi vào Wave 2, hoặc (b) mở plan đóng gap"
    why_human: "Plan 22-07 quy định phase không được đánh dấu hoàn thành khi cổng mềm không đạt cho tới khi người dùng duyệt. Đây là quyết định phạm vi, không kiểm được bằng máy."
  - test: "Lên lịch và duyệt việc áp 0124/0125 lên cloud (ngoài giờ văn phòng)"
    expected: "Migration chỉ mới áp ở LOCAL; cloud rnpq hiện tới 0084 (memory), phonzy có version cũ. Không phải điều kiện của phase nhưng phải được người dùng chủ động làm."
    why_human: "Đụng database thật, cần quyết định của người dùng"
---

# Phase 22: Tối ưu truy vấn khi dữ liệu phình theo thời gian — Báo cáo xác minh

**Mục tiêu phase:** Có thước đo hiệu năng ở quy mô 5 năm (~1 triệu dòng sổ cái), và mọi đường đọc theo ngày / theo số phiếu / xóa dòng phiếu đi qua index thay vì quét cả bảng — không đổi dữ liệu, không đổi kết quả trả về của RPC nào.
**Xác minh:** 2026-10-09
**Trạng thái:** human_needed (6/7 tiêu chí đạt; SC6 đạt một phần, cần người dùng duyệt)
**Xác minh lại:** Không, lần đầu

Lưu ý phạm vi: DB local đã bị `npm run db:test` reset ở cuối 22-07 nên dữ liệu 5 năm không còn. Các khẳng định phụ thuộc dữ liệu lớn được kiểm từ file bằng chứng đã commit (`bench/*.json`, `explain-*.txt`); phần còn lại kiểm trực tiếp trên mã và DB local.

## Mức đạt từng tiêu chí

| # | Tiêu chí (ROADMAP) | Trạng thái | Bằng chứng |
|---|---|---|---|
| SC1 | Script sinh dữ liệu 5 năm trên LOCAL, ghi qua RPC ghi sổ, đánh dấu dọn được, chạy lại không nhân đôi | ĐẠT | `scripts/bench/local-env.ts` chặn host khác 127.0.0.1/localhost (so khớp hostname chính xác, có test `local-env.test.ts`), không đọc `.env.local` (grep không thấy). `seed/day.sql` gọi `ghi_so_chung_tu`/`huy_chung_tu`/`duyet_phien_kiem_ke` (10 chỗ), không có `insert into kho_movement` trong `seed/*.sql`. `clean.sql`/`clean.ts` có. `seed-5y.log`: "1.727 ngày mới, 99 ngày bỏ qua" (tức chạy tiếp, không nhân đôi). Tiền tố BENCH để dọn. |
| SC2 | Benchmark gọi RPC qua supabase-js bằng quản lý và thủ kho, in p50/p95, lưu để so | ĐẠT | `run.ts` `signInWithPassword` cho `quan_ly` và `thu_kho`, `stats.ts` tính p50/p95 (có `stats.test.ts`), `compare.ts`. 5 lệnh `bench:*` có trong `package.json`. Mỗi `.json` có 33 ca, cả ba đều 33/33 `ok`. Timeout 8 s là của vai trò authenticated (0100). |
| SC3 | Baseline ở hai mức TRƯỚC migration index | ĐẠT | `baseline-99d.json` (kho_movement 58.754) và `baseline-5y.json` (1.008.828), cả hai `latestMigration` = 0123. `explain-baseline-5y.txt` cho thấy `Seq Scan on kho_movement x` 79,5 ms và `Trigger ... fkey time=79.851`. |
| SC4 | Một migration thêm index FK, ngày, thứ tự danh sách, trigram; bỏ index chết | ĐẠT | `0124_index_du_lieu_lon.sql`: đủ 3 FK (`idx_movement_chung_tu_dong`, `idx_chung_tu_goc`, `idx_de_nghi_gop_ma_chung_tu`), ngày (`idx_movement_ngay`, `idx_chung_tu_created_at`, `idx_chung_tu_ngay_ghi_so`, `idx_ddh_ngay`, `idx_nhat_ky_sua_bang_sua_luc`), `idx_chung_tu_loai_ngay_so` thay `idx_chung_tu_loai_ngay`, trigram `so_ct`/`so_dh`, bỏ `idx_ddh_nguoi_nhan`, `idx_chung_tu_nguoi_nhan` kèm lý do kiểm. Đối chiếu DB local: 11 index mới có mặt, 3 index bỏ đã vắng. Không dữ liệu/hàm đổi. |
| SC5 | RPC lọc theo ngày viết lại không bọc `at time zone` quanh cột; pgTAP chứng minh trùng khớp | ĐẠT | `0125`: diff -i -w với `0093` cho `tong_quan_chi_so` chỉ đổi 3 điều kiện WHERE (chữ ký, cột trả về, stable, security definer, search_path giữ nguyên; revoke/grant lặp lại). `phan_tich_theo_ky`, `nhap_xuat_theo_ky` đổi sang `m.ngay >= (...) and m.ngay < ((p_den + 1)...)`. pgTAP 115 (31 test) tôi chạy lại trên DB local trong transaction rollback: 31 ok, 0 not ok, không để lại dữ liệu `ZQX-115`. Có ca ranh giới đúng 00:00 VN, 23:59:59 VN, 17:00 UTC, 16:59:59.999999 UTC, và đối chứng `_sai` cho cả 3 hàm (`results_ne`/`isnt`). |
| SC6 | EXPLAIN xác nhận xóa dòng phiếu, `danh_sach_don`, `tim_kiem_toan_cuc` (số phiếu/số đơn) dùng index; benchmark sau ghi cạnh baseline | ĐẠT MỘT PHẦN | Xem bảng dưới. Số đo sau nằm trong `after-5y.*`, `compare-*.md` và bảng 99d/5y/sau trong 22-07-SUMMARY. |
| SC7 | `npm run check`, pgTAP local, `npm run test:integration` xanh | ĐẠT | `npm run check` tôi chạy lại: thoát 0, 49 file / 83 test unit qua, typecheck + lint + build xanh. pgTAP đầy đủ (60 file, 1015 test PASS) và integration (3 file, 15 test) được ghi trong 22-07-SUMMARY; không chạy lại được vì `db:test` reset DB (bị cấm), nên đây là bằng chứng gián tiếp từ SUMMARY, riêng pgTAP 115 đã tự kiểm. Type DB trùng hash `2654efde...` (`types-hash-before.txt`), `src/types/database.types.ts` không đổi. |

### Chi tiết SC6 (nguồn: `bench/explain-after-5y.txt`)

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Xóa dòng phiếu | ĐẠT (cứng) | `Index Scan using idx_movement_chung_tu_dong`; trigger FK 79,851 ms thành 0,457 ms; p50 `xoa_dong_phieu_nhap` 56,1 thành 2,8 ms |
| `danh_sach_don` | ĐẠT (cứng) | `Bitmap Index Scan on idx_ddh_ngay`, không Seq Scan trên `don_dat_hang`; p50 15,0 thành 6,9 ms |
| `nhap_xuat_theo_ky` (cổng cứng bổ sung) | ĐẠT | `Bitmap Index Scan on idx_movement_ngay`, không Seq Scan trên `kho_movement`; 83,7 thành 18,7 ms |
| `tim_kiem_toan_cuc` theo số đơn (`so_dh`) | ĐẠT (mềm) | `Bitmap Index Scan on idx_ddh_so_dh_trgm` |
| `tim_kiem_toan_cuc` theo số phiếu (`so_ct`) | KHÔNG ĐẠT (mềm, gap có tài liệu) | `Seq Scan on chung_tu c ... rows=183095`; tổng 126 ms (quản lý) / 308 ms (thủ kho), mục tiêu < 100 ms của audit không đạt |

Nhận xét: ROADMAP viết SC6 không phân cứng/mềm; phân loại cứng/mềm là quyết định D-21 trong CONTEXT/PLAN. Về chữ SC6 của ROADMAP thì tiêu chí chưa đạt trọn. Nguyên nhân (planner bỏ trigram khi có bộ lọc quyền) là suy luận từ hình kế hoạch trong SUMMARY, chưa được thí nghiệm kiểm chứng.

## Artifacts và wiring

| Artifact | Trạng thái | Chi tiết |
|---|---|---|
| `scripts/bench/{local-env,clean,seed,run,compare,stats,cases,accounts,seed-args}.ts`, `explain.sh/.sql`, `seed/{catalog,day}.sql`, `clean.sql`, `README.md` | VERIFIED | Tồn tại, nội dung thật (3.478 dòng), nối với `package.json`; unit test của bench nằm trong 83 test xanh |
| `supabase/migrations/0124_index_du_lieu_lon.sql` | VERIFIED | Áp trên DB local (max version 0125), index có mặt |
| `supabase/migrations/0125_dieu_kien_ngay_dung_index.sql` | VERIFIED | Dùng được index trong kế hoạch thật (`idx_movement_ngay` ở `tong_quan_chi_so`, `nhap_xuat_theo_ky`; `idx_chung_tu_created_at` thay Seq Scan 14 vòng) |
| `supabase/tests/115_dieu_kien_ngay_dung_index_test.sql` | VERIFIED | 31/31 ok |
| `bench/{baseline-99d,baseline-5y,after-5y}.{json,md}`, `explain-{baseline,after}-5y.txt`, `compare-*.md`, `types-hash-before.txt`, `seed-5y.log` | VERIFIED | Đủ, nhất quán số liệu (kho_movement 1.008.828 ở 5y trước/sau; migration 0123 vs 0125) |

Key links: `clean.ts` -> `readLocalSupabase` (guard) OK; `seed/day.sql` -> RPC ghi sổ OK; `cases.ts` dùng hàm thuần của `src` (theo 22-03); `idx_movement_chung_tu_dong` <- FK check xác nhận qua EXPLAIN. Data-flow (Level 4) không áp dụng: phase này là script và migration, không có component hiển thị.

## Spot-check hành vi

| Hành vi | Cách kiểm | Kết quả |
|---|---|---|
| pgTAP 115 | `psql < 115_*.sql` trên local (transaction rollback) | 31 ok / 0 not ok, PASS |
| `npm run check` | chạy lại | thoát 0 |
| Index 0124 có trên DB | truy vấn `pg_indexes` | 11/11 có, 3 bỏ vắng |
| Benchmark đo lại | không chạy được (dữ liệu 5 năm đã bị reset) | Dùng bằng chứng đã commit |

## Chống hồi quy / cảnh báo (không chặn)

- Cải thiện thực ở Wave 1: `tong_quan_chi_so` 2,7 s -> 170 ms; xóa dòng phiếu 56 -> 2,8 ms; `danh_sach_don` 15 -> 6,9 ms; `nhap_xuat_theo_ky` 84 -> 19 ms.
- Chưa được Wave 1 đụng tới đáng kể (SUMMARY ghi trung thực, không phải hồi quy): `phan_tich_ton_kho` 4 trang 2,3 s, `phan_tich_theo_ky` ~550 ms (tồn đầu kỳ cộng cả sổ cái), `bao_cao_xuat_am` ~630 ms, `hoat_dong_gan_day` 354 ms. Thuộc Wave 2/3 trong `22-AUDIT.md`. Mục tiêu "đường đọc theo ngày đi qua index" chỉ đúng cho phần lọc theo kỳ ngắn; phần cộng dồn từ đầu sổ cái vẫn quét rộng, đúng như SUMMARY thừa nhận.
- `nhap_xuat_theo_ngay.30` +4% (34,4 -> 35,9), nằm trong nhiễu đo.
- Migration 0124/0125 chỉ mới ở LOCAL. Chưa áp cloud; khi áp cần hỏi người dùng và chạy ngoài giờ (header 0124).
- Dữ liệu bench đã mất, dựng lại bằng `npm run seed:users` rồi `npm run bench:seed -- --years 5` (~15 phút).
- Test 115 chứa bản chụp `_cu`/`_sai` của hàm; Wave 2 sửa ba hàm này phải gỡ hoặc chụp lại (đã ghi trong header test).

## Anti-pattern

Không thấy TODO/stub/placeholder chặn mục tiêu trong các file của phase. Không có thay đổi mã nguồn app (`src/`) trong phase này.

## Tóm tắt

Phase đạt gần trọn mục tiêu: thước đo 5 năm có và tái lập được, mọi đường xóa dòng phiếu, danh sách đơn, lọc ngày theo kỳ đều qua index, kết quả RPC giữ nguyên (pgTAP trùng khớp, type không đổi), cổng kiểm xanh. Khoảng trống duy nhất là SC6 ở `tim_kiem_toan_cuc` theo số phiếu (`chung_tu.so_ct`): index trigram có nhưng planner vẫn Seq Scan 183k dòng vì bộ lọc quyền, nên ô tìm ⌘K còn 126-308 ms ở quy mô 5 năm. Theo plan 22-07 phase chưa được đánh dấu hoàn thành cho tới khi người dùng duyệt gap này (đưa vào Wave 2 hoặc yêu cầu đóng ngay).

---

_Xác minh: 2026-10-09_
_Người xác minh: Claude (gsd-verifier)_
