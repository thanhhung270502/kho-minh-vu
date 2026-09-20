---
phase: 04-don-dat-hang-phieu-xuat
plan: 04
subsystem: database
tags: [postgres, pgtap, security-definer, supabase, rpc]

# Dependency graph
requires:
  - phase: 04-don-dat-hang-phieu-xuat plan 01
    provides: "trang_thai_ddh chỉ mang trục duyệt (TAM|DA_XAC_NHAN|HOAN_THANH|DA_HUY), _cap_nhat_tien_do_ddh tự đóng HOAN_THANH, kho theo dòng cho _ghi_so_xuat/_ghi_so_tra_ncc/_ghi_so_tra_khach"
  - phase: 04-don-dat-hang-phieu-xuat plan 02
    provides: "Ba RPC duyệt đơn (xac_nhan_don/mo_khoa_don/dong_don_som), bốn policy ghi don_dat_hang siết xuống in('quan_ly','van_phong')"
provides:
  - "tao_phieu_xuat_tu_don(uuid): sinh phiếu XUAT từ đơn DA_XAC_NHAN trong một transaction — cấp số, resolve kho_mac_dinh_id từng dòng, điền sẵn so_luong = so_luong_dat (D-10, XUAT-01)"
  - "tao_phieu_tra(uuid): sinh TRA_KHACH (từ XUAT đã ghi sổ) hoặc TRA_NCC (từ NHAP đã ghi sổ), loại suy từ chứng từ gốc, giữ nguyên kho_id của DÒNG GỐC (D-15, XUAT-09)"
  - "Tầng database Phase 4 khép lại ở migration 0057 — tám migration liên tiếp 0050-0057"
affects: ["mọi plan giao diện của Phase 4 (05 trở đi) dùng hai RPC này cho nút 'Tạo phiếu xuất' trên đơn và nút trả hàng trên chứng từ gốc"]

tech-stack:
  added: []
  patterns:
    - "Sinh chứng từ từ nguồn (đơn/chứng từ gốc) dùng đúng khung ghi_so_chung_tu: for update khóa dòng nguồn, kiểm trạng thái, KHÔNG dùng khối bắt-mọi-lỗi để giữ atomic"
    - "Chặn điều kiện nghiệp vụ (mã thiếu kho mặc định) TRƯỚC insert đầu tiên — không để lại chứng từ rác khi transaction rollback do lỗi ở bước sau"
    - "Loại chứng từ trả suy từ chứng từ gốc bằng case-expression, không nhận tham số chọn loại — bớt một đường client truyền sai"
    - "throws_like/throws_matching (pgTAP) để assert nội dung thông báo lỗi động (chứa mã hàng cụ thể) mà không neo vào chuỗi cố định"

key-files:
  created:
    - supabase/migrations/0056_tao_phieu_xuat_tu_don.sql
    - supabase/migrations/0057_tao_phieu_tra.sql
    - supabase/tests/29_phieu_xuat_tu_don_test.sql
    - supabase/tests/31_phieu_tra_test.sql
  modified:
    - src/types/database.types.ts

key-decisions:
  - "Không dùng cụm chữ 'exception when others' trong bất kỳ comment nào của 0056/0057 (kể cả để giải thích lý do KHÔNG dùng) — quy verify tự động của chính plan này khớp regex vào comment, đã vấp ở 04-03; diễn đạt lại bằng 'khối bắt-mọi-lỗi'"
  - "Header kho_id của phiếu xuất sinh từ đơn lấy kho_mac_dinh_id của DÒNG ĐẦU TIÊN (order by created_at, id limit 1) — chung_tu.kho_id NOT NULL bắt buộc có giá trị dù mỗi dòng thật sự đi kho riêng qua chung_tu_dong.kho_id"
  - "tao_phieu_tra không nhận tham số chọn loại — loại TRA_KHACH/TRA_NCC suy 100% từ chung_tu.loai_ct của chứng từ gốc bằng case-expression, đúng đặc tả kế hoạch giảm một đường sai của client"

requirements-completed: [DDH-04, XUAT-01, XUAT-09]

duration: 19min
completed: 2026-09-20
---

# Phase 4 Plan 04: RPC sinh phiếu xuất từ đơn + phiếu trả hàng Summary

**Hai RPC "sinh chứng từ từ nguồn" atomic — `tao_phieu_xuat_tu_don` biến đơn đã xác nhận thành phiếu xuất điền sẵn số lượng trong một transaction, `tao_phieu_tra` sinh TRA_KHACH/TRA_NCC từ chứng từ gốc đã ghi sổ — khép tầng database của Phase 4 tại migration 0057.**

## Performance

- **Duration:** ~19 phút
- **Started:** 2026-09-20T03:52:54Z
- **Completed:** 2026-09-20T04:11:00Z
- **Tasks:** 3/3
- **Files modified:** 5 (2 migration mới, 2 file pgTAP mới, 1 file kiểu TypeScript sinh lại)

## Accomplishments

- `tao_phieu_xuat_tu_don(uuid)`: một lượt gọi duy nhất biến đơn `DA_XAC_NHAN` thành phiếu `XUAT` có số (`sinh_so_ct`), đủ dòng, `so_luong` điền sẵn bằng `so_luong_dat` (D-10, đường đạt mốc dưới 20 giây một phiếu — XUAT-01), kho từng dòng lấy từ `san_pham.kho_mac_dinh_id`. Mã thiếu kho mặc định chặn TRƯỚC bất kỳ insert nào, liệt kê đúng mã hàng cụ thể, không để lại chứng từ rác.
- `tao_phieu_tra(uuid)`: loại phiếu trả (`TRA_KHACH`/`TRA_NCC`) suy 100% từ `loai_ct` của chứng từ gốc, không nhận tham số. Chỉ tạo được từ chứng từ `HOAN_THANH`. Bê dòng giữ nguyên `kho_id` của DÒNG GỐC (không phải kho đầu phiếu) để văn phòng sửa số trả đúng đúng kho đã lấy hàng ra. Ghi sổ dùng lại nguyên `_ghi_so_tra_khach`/`_ghi_so_tra_ncc` đã có từ 0011/0051 — không viết lại hàm ghi sổ nào.
- Cả hai RPC theo đúng khung `ghi_so_chung_tu`: `for update` khóa dòng nguồn, kiểm quyền tường minh (`quan_ly`/`van_phong`, ngữ cảnh không JWT coi như `quan_ly`), không dùng khối bắt-mọi-lỗi để giữ tính atomic.
- Kiểm tay trọn vòng trên database thật (transaction + rollback, mã `PX-UAT-*`): đơn 2 dòng → `tao_phieu_xuat_tu_don` → 2 dòng phiếu xuất đúng số lượng → `ghi_so_chung_tu` → `so_luong_da_xuat` cập nhật đúng từng dòng → đơn tự đóng `HOAN_THANH`.

## Task Commits

1. **Task 1: RPC tạo phiếu xuất từ đơn đã xác nhận** - `44fca80` (feat)
2. **Task 2: RPC tạo phiếu trả hàng từ chứng từ gốc** - `b93e8f0` (feat)
3. **Task 3: Đẩy migration, sinh lại kiểu, chạy toàn bộ pgTAP** - `fe317c9` (chore)

**Plan metadata:** (commit này, sau khi self-check)

## Files Created/Modified

- `supabase/migrations/0056_tao_phieu_xuat_tu_don.sql` - RPC `tao_phieu_xuat_tu_don`: cấp số, chặn mã thiếu kho mặc định, bê dòng điền sẵn số lượng, một transaction
- `supabase/migrations/0057_tao_phieu_tra.sql` - RPC `tao_phieu_tra`: suy loại trả từ chứng từ gốc, bê dòng giữ kho của dòng gốc
- `supabase/tests/29_phieu_xuat_tu_don_test.sql` - 14 assert: đơn TAM bị chặn, header/dòng đúng, kho từng dòng đúng và khác nhau, mã thiếu kho chặn atomic (đếm chung_tu trước/sau bằng nhau), thu_kho 42501, gọi hai lần sinh hai so_ct khác nhau
- `supabase/tests/31_phieu_tra_test.sql` - 18 assert: TRA_KHACH và TRA_NCC sinh đúng loại/chung_tu_goc_id/dòng, kho dòng trả giữ nguyên kho dòng gốc (khác header), ghi sổ TRA_KHACH tăng tồn đúng kho dòng, ghi sổ TRA_NCC giảm tồn, chặn gốc chưa ghi sổ, chặn tạo phiếu trả từ phiếu trả, 42501 cho thu_kho/chi_xem
- `src/types/database.types.ts` - Sinh lại: thêm `tao_phieu_xuat_tu_don`/`tao_phieu_tra` vào khối `Functions`

## Bảng tám migration của Phase 4 (0050-0057)

| Migration | Nội dung |
|---|---|
| `0050_trang_thai_don_duyet.sql` | Đổi trục enum `trang_thai_ddh` sang duyệt (`TAM\|DA_XAC_NHAN\|HOAN_THANH\|DA_HUY`), viết lại `_cap_nhat_tien_do_ddh` |
| `0051_chung_tu_rpc_mo_rong.sql` | Mở rộng `chi_tiet_chung_tu`/`dong_chung_tu`, vá kho theo dòng cho `_ghi_so_xuat`/`_ghi_so_tra_ncc`/`_ghi_so_tra_khach`, siết quyền `huy_chung_tu`, sửa bug thứ tự gọi trong `ghi_so_chung_tu` |
| `0052_rpc_duyet_don.sql` | Ba RPC duyệt đơn (`xac_nhan_don`/`mo_khoa_don`/`dong_don_som`), siết bốn policy ghi `don_dat_hang`/`don_dat_hang_dong`, trigger nhật ký |
| `0053_sinh_so_dh.sql` | Bảng `chuoi_so_dh` + hàm `sinh_so_dh` — cấp số đơn atomic, tách riêng khỏi `chuoi_so_ct` |
| `0054_rpc_don_dat_hang.sql` | Ba RPC đọc đơn: `danh_sach_don`/`chi_tiet_don`/`dong_don` |
| `0055_de_nghi_gop_ma.sql` | Bảng `de_nghi_gop_ma`, RPC `ghi_de_nghi_gop_ma`/`goi_y_ma_trung` (D-14, chỉ ghi lại đề nghị, không gộp thật) |
| `0056_tao_phieu_xuat_tu_don.sql` | RPC `tao_phieu_xuat_tu_don` — sinh phiếu xuất từ đơn đã xác nhận (plan này) |
| `0057_tao_phieu_tra.sql` | RPC `tao_phieu_tra` — sinh phiếu trả từ chứng từ gốc đã ghi sổ (plan này) |

## Chữ ký hai RPC mới

**`public.tao_phieu_xuat_tu_don(p_don_id uuid)`** returns `public.chung_tu` — chỉ `quan_ly`/`van_phong`. Đòi `p_don_id` ở trạng thái `DA_XAC_NHAN`, có ít nhất một dòng, và mọi mã hàng trong đơn đã có `kho_mac_dinh_id`. Kết quả: phiếu `XUAT` mới, `trang_thai = 'NHAP_LIEU'`, mỗi dòng `so_luong = so_luong_dat`, `don_gia/thanh_tien = 0`, `kho_id` dòng = `kho_mac_dinh_id` của mã đó.

**`public.tao_phieu_tra(p_goc_id uuid)`** returns `public.chung_tu` — chỉ `quan_ly`/`van_phong`. Đòi chứng từ gốc `p_goc_id` ở trạng thái `HOAN_THANH` và `loai_ct in ('NHAP','XUAT')`. Kết quả: phiếu `TRA_NCC` (nếu gốc `NHAP`) hoặc `TRA_KHACH` (nếu gốc `XUAT`), `chung_tu_goc_id = p_goc_id`, mỗi dòng bê nguyên `san_pham_id`/`so_luong`/`don_gia`/`thanh_tien`/`kho_id` từ dòng gốc.

## Số assert trước/sau

- Trước plan này (sau 04-03): **292 ok / 0 not ok / 0 ERROR**
- Sau plan này: **324 ok / 0 not ok / 0 ERROR** (292 + 14 của test 29 + 18 của test 31), đếm trên TOÀN BỘ 26 file `supabase/tests/*.sql`, chạy từng file một bằng `psql` trực tiếp (không qua `db:test:linked`/Docker)

## Kiểm tay trọn vòng nghiệp vụ (transaction + rollback, mã PX-UAT-*)

1. Bootstrap tồn 2 mã `PX-UAT-A`/`PX-UAT-B` (50 mỗi mã tại K1) bằng một phiếu NHẬP ghi sổ.
2. Tạo đơn `DH-UAT-1` TAM → 2 dòng (A đặt 4, B đặt 6) → `DA_XAC_NHAN`.
3. `tao_phieu_xuat_tu_don` → phiếu `PX26-000001`, đúng 2 dòng.
4. `ghi_so_chung_tu` → phiếu chuyển `HOAN_THANH`.
5. Đọc `don_dat_hang_dong`: `so_luong_da_xuat` = 4 và 6 — đúng bằng `so_luong_dat`.
6. Đọc `don_dat_hang.trang_thai` = `HOAN_THANH` — đơn tự đóng đúng lúc.
7. `rollback` — xác nhận bằng ba câu đếm riêng: `san_pham`/`don_dat_hang`/`chung_tu` mang mã `PX-UAT-%`/`DH-UAT-1` đều = 0 sau rollback, không có dữ liệu thử nào lọt vào `kho-vu-tru`.

## Decisions Made

Xem mục `key-decisions` ở frontmatter. Điểm đáng chú ý nhất: viết migration mà KHÔNG được dùng cụm "exception when others" ngay cả trong comment giải thích lý do không dùng nó — vì `04-04-PLAN.md` verify bằng chính regex đó, và 04-03 đã từng vấp lỗi giả tương tự với comment nhắc `sp.*`/`don_gia`. Đã tránh bằng cách diễn đạt "khối bắt-mọi-lỗi" xuyên suốt cả hai migration.

## Deviations from Plan

None - plan executed exactly as written. Không có auto-fix Rule 1-3, không có checkpoint kiến trúc nào cần hỏi (Rule 4).

## Issues Encountered

- Lần đầu kiểm tay trọn vòng dùng cú pháp `\gset ct_` kèm alias cột `as ct_id` khiến biến bị đặt tên kép thành `ct_ct_id` — sửa bằng cách bỏ alias cột, chỉ giữ prefix `\gset ct_` trên cột `id` gốc. Không phải lỗi SQL/migration, chỉ là lỗi cú pháp script kiểm tra tay của chính phiên này; phát hiện và sửa ngay trong cùng bước, không ảnh hưởng migration hay pgTAP.
- `dong_don(uuid)` đòi ngữ cảnh JWT (`vai_tro_hien_tai()` không null) nên gọi trực tiếp bằng `psql` (không JWT claims) ném `42501 Chưa đăng nhập` — khác quy ước "ngữ cảnh không JWT coi như quan_ly" của `tao_phieu_xuat_tu_don`/`ghi_so_chung_tu`. Đây là hành vi ĐÚNG của `dong_don` (RPC đọc, không phải RPC ghi sổ/migration-safe), không phải lỗi — chuyển bước kiểm tay sang đọc trực tiếp `don_dat_hang_dong` thay vì qua RPC đó.
- `npm run db:test:linked` KHÔNG được chạy (đúng cảnh báo Docker Desktop treo trên máy này) — dùng fallback `psql "$DATABASE_URL" -X -q -f <file>` cho toàn bộ 26 file `supabase/tests/*.sql`, đếm `ok`/`not ok`/`ERROR` bằng `grep -cE`, xác nhận từng file riêng lẻ đạt đúng plan count trước khi cộng tổng.

## User Setup Required

None - không có cấu hình dịch vụ ngoài nào cần làm tay.

## Next Phase Readiness

- Tầng database của Phase 4 hoàn tất tại migration **0057**. Không còn migration nào trong phase này — plan 04-05 trở đi (giao diện) không cần thêm bảng/RPC mới trừ khi phát sinh yêu cầu ngoài dự kiến.
- Hai RPC `tao_phieu_xuat_tu_don`/`tao_phieu_tra` sẵn sàng cho tầng client: nút "Tạo phiếu xuất" trên trang chi tiết đơn gọi RPC đầu; nút "Khách trả hàng"/"Trả NCC" trên trang chi tiết chứng từ gọi RPC sau.
- Tổng pgTAP hiện tại: **324 assert**, toàn bộ xanh, trên đúng 26 file test.
- `npm run check` (typecheck + lint + build) xanh toàn bộ.
- Nợ UAT trình duyệt vẫn còn nguyên (ghi trong 04-CONTEXT.md mục open_items #4) — tầng database đã đủ để dựng giao diện nhưng chưa ai mở màn hình phiếu xuất/đơn bằng mắt.

---
*Phase: 04-don-dat-hang-phieu-xuat*
*Completed: 2026-09-20*

## Self-Check: PASSED

All created/modified files verified present on disk (0056, 0057, test 29, test 31, this SUMMARY, database.types.ts); all three task commit hashes (`44fca80`, `b93e8f0`, `fe317c9`) verified present in git history.
