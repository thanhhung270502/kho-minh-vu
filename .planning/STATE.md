---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 04-03-PLAN.md
last_updated: "2026-09-20T03:52:24.226Z"
last_activity: 2026-09-20
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 64
  completed_plans: 26
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.
**Current focus:** Phase 04 — don-dat-hang-phieu-xuat

## Current Position

Phase: 04 (don-dat-hang-phieu-xuat) — EXECUTING
Plan: 3 of 15 complete (04-01, 04-02, 04-03 done; 04-04 next)

_Sửa lại 2026-09-20: vị trí trước đó ghi nhầm "Phase 02 Plan 7/21" — Phase 02 thực
tế đã xong toàn bộ 21/21 plan (xem .planning/phases/02-khung-ung-dung/*-SUMMARY.md),
Phase 03 cũng đã xong (03-SUMMARY.md). Con số này trôi từ phiên trước, không phải do
plan 04-01 gây ra — sửa lại cho khớp thực tế khi thực thi 04-01._

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 02 P01 | 30 | 3 tasks | 11 files |
| Phase 02 P02 | 25 | 1 tasks | 2 files |
| Phase 02 P03 | 15 | 1 tasks | 2 files |
| Phase 02 P04 | 25 | 1 tasks | 2 files |
| Phase 02 P05 | 55min | 3 tasks | 25 files |
| Phase 04 P01 | 46min | 3 tasks | 5 files |
| Phase 04 P02 | 19min | 3 tasks | 6 files |
| Phase 04 P03 | 24min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: RLS bốn vai trò (AUTH-03..06) gộp vào Phase 1 (Nền dữ liệu) thay vì Phase 2, vì đó là hành vi kiểm chứng bằng pgTAP ở tầng database, không cần giao diện.
- [Roadmap]: Cài đặt (CDAT-01..04) gộp vào Phase 2 vì quản lý dữ liệu nền (nhóm hàng, ĐVT, công đoạn, quy tắc đánh số) mà Danh mục và các chứng từ ở phase sau cần dùng ngay.
- [Roadmap]: DLIEU-05/06/07 (giá vốn khởi đầu, tồn đầu kỳ, lưu trữ chứng từ cũ) dồn vào Phase 6 vì đều là hoạt động chốt số liệu một lần ngay trước go-live, không phải năng lực màn hình.
- [Phase 02]: kho_id = any((select kho_hien_tai())) cần ép kiểu ::uuid[] — Postgres phân giải any((select ...)) thành ANY(subquery), không phải ANY(array)
- [Phase 02]: Tổng pgTAP toàn dự án là 98, không phải 97 (plan(26) thay vì plan(25) ở 30_rls_test.sql)
- [Phase 02]: Trigger generic ghi_nhat_ky_sua bắt mọi sửa qua to_jsonb(old)/to_jsonb(new) trừ mảng cột loại trừ — thay vì trigger riêng từng bảng
- [Phase 02]: pgTAP trong một transaction: now() không đổi giữa các insert — không dùng order by cot_thoi_gian desc để phân biệt bản ghi mới nhất, kiểm theo nội dung cụ thể
- [Phase 02]: Cấu hình đánh số chứng từ (cau_hinh_so_ct) sửa được tiền tố/số chữ số theo loại; trigger chặn giảm số chữ số dưới độ dài số đang chạy năm nay
- [Phase 02]: Không nhúng mẫu DO raise-exception-để-rollback (pgtap-va-test.md mục 6) vào file migration — migration cần commit khi đúng, khác ngữ cảnh script kiểm tra độc lập
- [Phase 02]: D-16 chọn REVOKE SELECT mức bảng + GRANT lại theo cột (Phương án A) thay vì view CASE WHEN — bàn giao đã có SELECT mức bảng cho authenticated/anon nên REVOKE riêng một cột không đủ, phải revoke bảng rồi grant cột (khác REVOKE UPDATE/INSERT ở 0015 vốn đã revoke mức bảng từ đầu). Giá vốn chỉ đọc qua RPC gia_von_san_pham, kể cả quản lý.
- [Phase 02]: select 1 from bang / count(*) from bang không cần quyền cột nào trong Postgres — chỉ câu lệnh tham chiếu cột cụ thể mới bị kiểm quyền cột. Xác nhận bằng transaction rollback trên cloud trước khi sửa test, tránh sửa nhầm assertion không cần sửa.
- [Phase 02]: proxy.ts chép cookie phiên đã refresh sang response redirect (chuyenHuong helper) để tránh mất phiên
- [Phase 02]: (app)/layout.tsx signOut() + redirect ?loi=vo-hieu-hoa khi hồ sơ nguoi_dung thiếu/bị khóa, tránh vòng lặp qua proxy
- [Phase 04]: ghi_so_chung_tu goi _cap_nhat_tien_do_ddh TRUOC khi update trang_thai='HOAN_THANH' - bug thuc tu 0011, sua trong 0051 bang cach chuyen xuong SAU
- [Phase 04]: db:test:linked bi Docker treo tren may nay - fallback chay psql truc tiep tung file supabase/tests/*.sql (pgtap da bat tren cloud)
- [Phase 04]: bon policy ghi don_dat_hang/don_dat_hang_dong siet tu <> chi_xem xuong in(quan_ly,van_phong) - va lo thu_kho insert thang qua PostgREST bo qua sinh_so_dh
- [Phase 04]: chuoi_so_dh tach rieng khoi chuoi_so_ct - chuoi_so_ct khoa theo enum loai_ct (bay loai chung tu), don dat hang khong phai mot loai_ct
- [Phase 04]: danh_sach_don/chi_tiet_don/dong_don doc ca bon vai tro, khong loc theo kho - chan that o chieu ghi cua 0052
- [Phase 04]: de_nghi_gop_ma chi ghi lai de nghi gop ma, khong dung ton_kho/kho_movement/san_pham - gop that la phase rieng

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: CLAUDE.md và `src/shared/components/app-shell.tsx` còn mô tả phạm vi cũ (theo dõi sản xuất 5 xưởng) — phải viết lại khi Phase 2 chạm vào app shell.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260919-dm4 | Design system theo giao diện KiotViet: token + top-nav shell + bố cục trang danh sách | 2026-09-19 | 39da902 | [260919-dm4-update-design-system-theo-giao-dien-kiot](./quick/260919-dm4-update-design-system-theo-giao-dien-kiot/) |

## Session Continuity

Last session: 2026-09-20T03:52:24.224Z
Stopped at: Completed 04-03-PLAN.md
Last activity: 2026-09-20
Resume file: None
