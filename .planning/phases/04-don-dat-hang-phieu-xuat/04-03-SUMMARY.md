---
phase: 04-don-dat-hang-phieu-xuat
plan: 03
subsystem: database
tags: [postgres, pgtap, rls, security-definer, word-similarity, supabase]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 01
    provides: "trang_thai_ddh chỉ mang trục duyệt (TAM|DA_XAC_NHAN|HOAN_THANH|DA_HUY)"
  - phase: 04-don-dat-hang-phieu-xuat plan 02
    provides: "Ba RPC duyệt đơn, bốn policy ghi don_dat_hang/don_dat_hang_dong siết xuống in('quan_ly','van_phong'), sinh_so_dh"
provides:
  - "danh_sach_don/chi_tiet_don/dong_don: hợp đồng đọc đơn cho tầng client Wave 5 trở đi — lọc + phân trang ở server, tong_so_dong đi kèm mỗi dòng"
  - "de_nghi_gop_ma + ghi_de_nghi_gop_ma: ghi lại đề nghị gộp mã (D-14), không có tác dụng phụ lên ton_kho/kho_movement/san_pham"
  - "goi_y_ma_trung: gợi ý mã tên gần giống đang còn tồn, dùng chung cách so khớp (ILIKE + word_similarity) với tim_san_pham"
affects: [04-04, 04-05, 04-06, 04-07, "mọi plan giao diện sau của Phase 4 dùng năm RPC này để dựng màn đơn/gợi ý gộp mã"]

tech-stack:
  added: []
  patterns:
    - "RPC đọc đơn không lọc theo kho (khác RPC đọc chứng từ 0045) — quyết định có chủ đích: policy đọc don_dat_hang từ 0016 đã là using(true), chặn thật nằm ở chiều ghi (0052)"
    - "dong_don gọi lại chi_tiet_don(p_id) để thừa hưởng logic kiểm quyền, đúng khuôn dong_chung_tu gọi chi_tiet_chung_tu ở 0045 — không lặp logic ở hai nơi"
    - "Bảng 'ghi lại quyết định, không tự hành động': RLS chỉ SELECT theo vai trò + ghi chỉ qua RPC SECURITY DEFINER, insert ... on conflict (partial unique index) do nothing rồi đọc lại dòng đang chờ — chép nguyên khuôn anh_xa_ghi_chu_kiotviet/quyet_ghi_chu (0033)"
    - "goi_y_ma_trung dùng CTE 'nguon' để tính chuỗi so khớp một lần, tránh lặp subquery ba lần trong where/order by (language sql không có declare)"

key-files:
  created:
    - supabase/migrations/0054_rpc_don_dat_hang.sql
    - supabase/migrations/0055_de_nghi_gop_ma.sql
    - supabase/tests/27_rpc_don_test.sql
    - supabase/tests/28_goi_y_ma_trung_test.sql
  modified:
    - src/types/database.types.ts

key-decisions:
  - "Cả bốn vai trò đọc đơn đặt hàng, không lọc theo kho (chốt sẵn trong 04-03-PLAN.md, không phải quyết định mới của lần thực thi này) — pgTAP 27 khẳng định lại bằng bốn assert theo bốn vai trò"
  - "goi_y_ma_trung không kiểm vai trò bên trong (mọi vai trò xác thực gọi được) — chỉ ghi_de_nghi_gop_ma và SELECT trên de_nghi_gop_ma mới giới hạn quan_ly/van_phong, đúng đúng phạm vi plan yêu cầu"
  - "Dùng 'GOP-ZQX-' làm tiền tố mã test (không dùng 'GOP-TEST-' như ví dụ minh họa trong 04-CONTEXT.md) để nhất quán với quy ước '-ZQX-' đã dùng xuyên suốt các file pgTAP trước (DS-ZQX, KD-ZQX, DDH-ZQX), tránh nhầm với dữ liệu UAT thật '-UAT-' còn sót trên database"

requirements-completed: [DDH-01, DDH-02]

duration: 24min
completed: 2026-09-20
---

# Phase 4 Plan 03: RPC đơn đặt hàng + đề nghị gộp mã Summary

**Ba RPC đọc đơn (danh_sach_don/chi_tiet_don/dong_don) không lọc theo kho và không có cột giá, cộng bảng de_nghi_gop_ma + hai RPC (ghi_de_nghi_gop_ma/goi_y_ma_trung) chỉ ghi lại đề nghị gộp mã trùng mà tuyệt đối không đụng tồn hay sổ cái.**

## Performance

- **Duration:** ~24 phút
- **Started:** 2026-09-20T03:26:xxZ (ước tính từ commit đầu tiên của session)
- **Completed:** 2026-09-20T03:50:56Z
- **Tasks:** 3/3
- **Files modified:** 5 (2 migration mới, 2 file pgTAP mới, 1 file kiểu TypeScript sinh lại)

## Accomplishments

- `danh_sach_don`/`chi_tiet_don`/`dong_don` đúng khuôn `danh_sach_chung_tu`/`chi_tiet_chung_tu`/`dong_chung_tu` của 0045: lọc + phân trang ở server, `tong_so_dong` là tổng đơn khớp bộ lọc TRƯỚC phân trang, kèm theo mọi trang.
- `dong_don` không trả cột đơn giá (đơn không để giá, chốt 19/09 câu 7) và không trả cột "còn lại" (D-04 — phép trừ `so_luong_dat - so_luong_da_xuat` để dành cho mapper client). `kho_mac_dinh_id` trả `null` cho 4 mã còn thiếu, đúng ý đồ Claude's Discretion trong 04-CONTEXT.md.
- `de_nghi_gop_ma` + `ghi_de_nghi_gop_ma`: bấm "Đề nghị gộp hai mã" hai lần chỉ tạo đúng một dòng `CHO_XU_LY` (unique index có điều kiện + `on conflict do nothing`), chặn gộp một mã với chính nó (`23514`), chặn `chi_xem` (`42501`), và pgTAP 28 khẳng định rõ ràng: sau khi gọi hàm này, số dòng `kho_movement` và tồn của cả hai mã không đổi — đúng ranh giới "Phase 4 chỉ phát hiện + ghi lại, không gộp thật".
- `goi_y_ma_trung`: dùng lại chính xác cách so khớp (`ILIKE` chuỗi con + `word_similarity`) và ngưỡng mặc định của `tim_san_pham` (0022/0029), chỉ trả mã đang còn tồn (`tk.so_luong > 0`), không trả chính mã đang xét, và là `SECURITY DEFINER` nhưng không trả bất kỳ cột giá vốn nào.

## Task Commits

1. **Task 1: RPC đọc đơn đặt hàng — danh sách, chi tiết, dòng** - `9ea1834` (feat)
2. **Task 2: Bảng đề nghị gộp mã và RPC gợi ý mã tên gần giống còn tồn** - `6371ff1` (feat)
3. **Task 3: Đẩy migration, sinh lại kiểu, chạy toàn bộ pgTAP** - `fbccc86` (feat)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `supabase/migrations/0054_rpc_don_dat_hang.sql` - Ba RPC đọc đơn: `danh_sach_don`, `chi_tiet_don`, `dong_don`
- `supabase/migrations/0055_de_nghi_gop_ma.sql` - Bảng `de_nghi_gop_ma` (RLS + unique index có điều kiện), RPC `ghi_de_nghi_gop_ma`, RPC `goi_y_ma_trung`
- `supabase/tests/27_rpc_don_test.sql` - 13 assert: lọc trạng thái, phân trang + tổng thật, tìm theo từ khóa, tổng số lượng đặt, tiến độ giao một phần, `kho_mac_dinh_id` null, id không tồn tại, bốn vai trò đều đọc được
- `supabase/tests/28_goi_y_ma_trung_test.sql` - 10 assert: gợi ý đúng kho có tồn, kho không tồn thì không gợi ý, không tự gợi ý chính nó, ghi đề nghị hai lần vẫn một dòng, gộp chính nó bị `23514`, không tác dụng phụ (kho_movement + tồn hai mã không đổi), `chi_xem` bị `42501`, `thu_kho` không đọc được bảng đề nghị
- `src/types/database.types.ts` - Sinh lại: thêm `danh_sach_don`/`chi_tiet_don`/`dong_don`/`ghi_de_nghi_gop_ma`/`goi_y_ma_trung` vào khối `Functions`, bảng `de_nghi_gop_ma`

## Chữ ký đầy đủ của năm RPC mới (để tầng client khỏi đoán)

**`public.danh_sach_don(p_trang_thai trang_thai_ddh default null, p_doi_tac_id uuid default null, p_tu_ngay date default null, p_den_ngay date default null, p_tu_khoa text default null, p_trang integer default 1, p_kich_thuoc integer default 50)`**
returns table: `id uuid, so_dh text, ngay_dh date, trang_thai trang_thai_ddh, ngay_giao_du_kien date, doi_tac_id uuid, ten_doi_tac text, so_dong bigint, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text, ghi_chu text, created_at timestamptz, tong_so_dong bigint`

**`public.chi_tiet_don(p_id uuid)`**
returns table: `id uuid, so_dh text, ngay_dh date, trang_thai trang_thai_ddh, ngay_giao_du_kien date, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text, ghi_chu text, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text, created_at timestamptz`

**`public.dong_don(p_id uuid)`**
returns table: `id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text, so_luong_dat numeric, so_luong_da_xuat numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, created_at timestamptz` — KHÔNG có cột đơn giá, KHÔNG có cột "còn lại".

**`public.ghi_de_nghi_gop_ma(p_san_pham_id_a uuid, p_san_pham_id_b uuid, p_chung_tu_id uuid default null, p_ghi_chu text default null)`**
returns `de_nghi_gop_ma` (một dòng đầy đủ). Chỉ `quan_ly`/`van_phong` gọi được. Gọi lại cho cùng cặp đang `CHO_XU_LY` trả về đúng dòng đã có, không tạo dòng mới.

**`public.goi_y_ma_trung(p_san_pham_id uuid, p_kho_id uuid, p_gioi_han int default 5)`**
returns table: `san_pham_id uuid, ma_hang text, ten_hang text, kho_id uuid, ten_kho text, ton numeric, do_giong real` — mọi vai trò xác thực gọi được, chỉ trả mã đang còn tồn, sắp theo độ giống giảm dần rồi tồn giảm dần.

## Số assert trước/sau

- Trước plan này (sau 04-02): **269 ok / 0 not ok / 0 ERROR**
- Sau plan này: **292 ok / 0 not ok / 0 ERROR** (269 + 13 của test 27 + 10 của test 28)

## Decisions Made

- Xem mục `key-decisions` ở frontmatter — không có quyết định kiến trúc mới ngoài những gì đã chốt sẵn trong `04-03-PLAN.md` (plan này chủ yếu thực thi đúng đặc tả, không phát sinh vấn đề cần quyết định thêm).

## Deviations from Plan

None - plan executed exactly as written. Không có auto-fix nào thuộc Rule 1-3, không có checkpoint kiến trúc nào cần hỏi (Rule 4).

## Issues Encountered

- Lần đầu chạy verify tự động của Task 1/Task 2 báo lỗi giả ("dang select * tren san_pham", "don khong duoc co gia") — nguyên nhân là chính COMMENT trong migration nhắc tới chuỗi `sp.*` và `don_gia` để giải thích lý do KHÔNG dùng chúng, và regex verify khớp luôn vào comment. Sửa bằng cách diễn đạt lại comment không chứa nguyên văn hai chuỗi cấm, giữ nguyên ý nghĩa. Không phải lỗi logic SQL, chỉ là cách viết comment vô tình khớp regex kiểm tra.
- `npm run db:test:linked` KHÔNG được chạy (theo đúng cảnh báo Docker Desktop treo trên máy này) — dùng fallback `psql "$DATABASE_URL" -X -q -f <file>` cho toàn bộ 22 file `supabase/tests/*.sql`, đếm `ok`/`not ok`/`ERROR` bằng `grep -cE`.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- Năm RPC (`danh_sach_don`, `chi_tiet_don`, `dong_don`, `ghi_de_nghi_gop_ma`, `goi_y_ma_trung`) sẵn sàng cho tầng client Wave 5 trở đi (04-04 trở đi): màn danh sách/chi tiết đơn gọi ba RPC đầu, cảnh báo xuất âm trong màn xuất kho gọi `goi_y_ma_trung` rồi `ghi_de_nghi_gop_ma` khi người dùng bấm "Đề nghị gộp hai mã".
- Số hiệu migration cuối cùng sau plan này: **0055**. Plan tiếp theo (04-04) bắt đầu từ **0056**.
- Tổng pgTAP hiện tại: **292 assert**, toàn bộ xanh.
- `npm run check` (typecheck + lint + build) xanh toàn bộ.
- Bảng đề nghị gộp mã (`de_nghi_gop_ma`) hiện có 0 dòng thật trên database (chỉ pgTAP tạo dữ liệu trong transaction rồi rollback) — sẵn sàng nhận đề nghị đầu tiên khi màn xuất kho (plan sau) hoàn thiện.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All created files verified present on disk; all three task commit hashes (`9ea1834`, `6371ff1`, `fbccc86`) verified present in git history.
