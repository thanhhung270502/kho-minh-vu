---
phase: 6
slug: kiem-ke-go-live
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-24
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (Postgres) + tsx scripts + `npm run check` |
| **Config file** | `supabase/tests/*.sql`, helper `supabase/tests/00_helper.sql.inc` |
| **Quick run command** | pgTAP file mới của task (`psql "$DATABASE_URL" -f supabase/tests/<file>.sql` hoặc MCP `execute_sql` theo `.memory/patterns/pgtap-va-test.md`) + `npm run typecheck` |
| **Full suite command** | `npm run db:test:linked` + `npm run check` + `npx tsx scripts/test-route-permissions.ts` + `npx tsx scripts/test-pure-functions.ts` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** file pgTAP liên quan + `npm run typecheck`
- **After every plan wave:** full suite (đếm cả dòng ERROR, không chỉ `not ok` — `.memory/index.md`)
- **Before `/gsd:verify-work`:** full suite xanh + `npm run verify:hook` (Phase 6 thêm cột vào `nguoi_dung`)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*Planner điền Task ID theo plan thật; bảng dưới là hợp đồng theo yêu cầu.*

| Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| KKE-01 | Mở phiên tạo `chung_tu(loai_ct=KIEM_KE)` đúng kho + phạm vi nhóm | pgTAP | `supabase/tests/9X_kiem_ke_test.sql` | ❌ W0 | ⬜ pending |
| KKE-02 | Lưu số đếm chốt `so_luong_he_thong` = tồn TẠI LÚC LƯU (XUAT giữa mở phiên và lưu không làm sai) | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| KKE-02 | Client insert thẳng `chung_tu_dong` cho dòng KIEM_KE bị từ chối (42501) | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| KKE-03 | Danh sách "chưa đếm" đúng phạm vi kho/nhóm; lệch = đếm − tồn sổ đã chốt | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| KKE-04 | Duyệt sinh movement bằng lệch ĐÃ CHỐT (XUAT sau khi đếm, trước khi duyệt không làm đổi movement) | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| KKE-04 | Người không có công tắc "Duyệt kiểm kê" gọi RPC duyệt HOẶC `ghi_so_chung_tu` trực tiếp → 42501; `quan_ly` luôn được | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| DLIEU-06 | Mã chưa đếm được chấp nhận = 0 sinh dòng đảo tồn tạm | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| DLIEU-07 | RPC tra cứu lọc đúng loại/ngày/mã/số phiếu; tìm không dấu trên khách/NCC + ghi chú | pgTAP | `supabase/tests/9X_lich_su_kiotviet_test.sql` | ❌ W0 | ⬜ pending |
| DLIEU-07 | Công tắc tắt → RPC 42501 và SELECT thẳng `luu_tru_*` trả 0 dòng; `lich_su_giao_dich_doi_tac` (0033) cũng tôn trọng công tắc | pgTAP | cùng file | ❌ W0 | ⬜ pending |
| DLIEU-05 | Đóng — không cần (D-17), không có kiểm thử | — | — | — | n/a |
| Route | `/kiem-ke`, `/kiem-ke/[id]`, `/lich-su-kiotviet` đúng ma trận 4 vai trò × khách | script | `npx tsx scripts/test-route-permissions.ts` | ⚠️ thêm dòng | ⬜ pending |
| Excel | Đọc file số đếm (mã, số đếm), báo dòng lỗi, không nạp nửa vời | tsx | `npx tsx scripts/test-pure-functions.ts` hoặc script đọc Excel | ⚠️ thêm case | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/9X_kiem_ke_test.sql` — KKE-01..04, DLIEU-06
- [ ] `supabase/tests/9X_lich_su_kiotviet_test.sql` — DLIEU-07 + công tắc quyền
- [ ] Thêm route mới vào `scripts/test-route-permissions.ts` ngay trong plan tạo route (bẫy 12)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Màn đếm dùng được trên điện thoại (nút to, không tràn ngang, gõ mã → chọn → số → lưu liên tục) | KKE-02 | Cần trình duyệt thật cỡ 375px | resize_window mobile, đếm 5 mã liên tiếp chỉ bằng bàn phím; xem console không cảnh báo antd |
| Bảng lệch tô nổi dòng lệch lớn, trả về đếm lại, danh sách chưa đếm, duyệt | KKE-03, KKE-04 | Luồng nhiều bước trên UI | Mở phiên, đếm vài mã lệch, trả về đếm lại một dòng, duyệt; mở thẻ kho thấy movement KIEM_KE |
| File mẫu đếm không lộ tồn; import lại vào phiên | KKE-02, DLIEU-06 | Mở file Excel thật | Xuất file một nhóm, kiểm không có cột tồn; điền số, import, thấy số trong phiên |
| Tra cứu lịch sử + tab trong chi tiết mã hàng; công tắc quyền trong Cài đặt | DLIEU-07 | UI | Tắt công tắc cho văn phòng → không vào được; bật → vào ngay (không chờ token) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
