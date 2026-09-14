---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 02-05-PLAN.md
last_updated: "2026-09-14T06:51:13.401Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 36
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-12)

**Core value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.
**Current focus:** Phase 02 — khung-ung-dung

## Current Position

Phase: 02 (khung-ung-dung) — EXECUTING
Plan: 6 of 21

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: CLAUDE.md và `src/shared/components/app-shell.tsx` còn mô tả phạm vi cũ (theo dõi sản xuất 5 xưởng) — phải viết lại khi Phase 2 chạm vào app shell.

## Session Continuity

Last session: 2026-09-14T06:50:58.590Z
Stopped at: Completed 02-05-PLAN.md
Resume file: None
