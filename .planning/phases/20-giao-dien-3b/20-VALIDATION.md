---
phase: 20
slug: giao-dien-3b
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Nguồn: 20-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (DB) · `node:assert` qua `tsx` (hàm thuần) · HTTP script (quyền route) · `npm run check` · UAT trình duyệt |
| **Config file** | `supabase/tests/*.sql` (file mới đánh số từ 110); `scripts/test-pure-functions.ts`; `scripts/test-route-permissions.ts` |
| **Quick run command** | `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/<file>.sql` · `npx tsx scripts/test-pure-functions.ts` · `npm run typecheck` |
| **Full suite command** | `npm run check` + `npm run db:test` (reset local) + `npx tsx scripts/test-route-permissions.ts` (cần `npm run dev`) |
| **Estimated runtime** | ~180 seconds (full) · ~20 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** pgTAP của file vừa đổi + `npm run typecheck`
- **After every plan wave:** `npm run check` + pgTAP cả wave + `npx tsx scripts/test-pure-functions.ts`
- **Before `/gsd:verify-work`:** `npm run db:test` xanh + `test-route-permissions.ts` xanh + UAT trình duyệt
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| UI3B-02 | `tim_kiem_toan_cuc`: mã khớp tuyệt đối trước, so_ct, số đơn, đối tác; không dấu; RLS kho; không chọn `gia_von` | pgTAP | `…supabase test db supabase/tests/110_tim_kiem_toan_cuc_test.sql` | ❌ W0 | ⬜ pending |
| UI3B-03 | `tong_quan_chi_so` (42501 khi thiếu `xem_dashboard`; `gia_tri_ton` null khi không có quyền giá vốn; `tong_sl_ton`, `cho_ghi_so`); `nhap_xuat_theo_ngay` 7/30/90, ngày trống = 0, tham số sai → 22023 | pgTAP | `…111_tong_quan_3b_test.sql` | ❌ W0 | ⬜ pending |
| UI3B-04 | `ton_theo_nhom.tong_so_luong` khớp `ton_kho`; `khong_luan_chuyen` loại tồn ≤ 0 và ngừng KD | pgTAP | `…93_ton_theo_nhom_test.sql` (sửa) + `…111…` | ✅ sửa / ❌ W0 | ⬜ pending |
| UI3B-05 | `dem_don_theo_trang_thai` khớp chéo `danh_sach_don`; preset ngày + % tiến độ (hàm thuần) | pgTAP + tsx | `…113_don_dat_dem_cong_don_test.sql`; `npx tsx scripts/test-pure-functions.ts` | ❌ W0 | ⬜ pending |
| UI3B-05 | `/api/don-dat/xuat-excel`: khách 401, 4 vai trò 200 | HTTP | `npx tsx scripts/test-route-permissions.ts` | ✅ thêm dòng | ⬜ pending |
| UI3B-06 | `them_dong_don`: mới → insert; cùng mã + cùng người nhận → cộng dồn; khác người nhận → tách; null+null → cộng dồn; đơn không TAM → lỗi; không quyền → chặn | pgTAP | `…113…` | ❌ W0 | ⬜ pending |
| UI3B-07 | Giá trị tồn theo kho chỉ qua `gia_von_san_pham` (42501 với thủ kho/chỉ xem) | pgTAP | `…90_gia_von_test.sql` | ✅ | ⬜ pending |
| UI3B-01..07 | typecheck + lint + build | static | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/110_tim_kiem_toan_cuc_test.sql` — UI3B-02
- [ ] `supabase/tests/111_tong_quan_3b_test.sql` — UI3B-03, UI3B-04
- [ ] `supabase/tests/113_don_dat_dem_cong_don_test.sql` — UI3B-05, UI3B-06
- [ ] Cập nhật `supabase/tests/93_ton_theo_nhom_test.sql` — cột `tong_so_luong`
- [ ] Mở rộng `scripts/test-pure-functions.ts` — date presets, tiến độ %, href tìm kiếm, mapper KPI
- [ ] Thêm `/api/don-dat/xuat-excel` vào `scripts/test-route-permissions.ts`

*Test viết cùng plan tạo RPC (TDD trong plan DB), không tách plan Wave 0 riêng.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Design system 3b đúng trên mọi màn, mobile 375px giữ tab đáy | UI3B-01 | Thị giác | `npm run dev`, mở từng route ở 1440/1024/375, đo computed style token, xem console (bẫy 11, 19) |
| ⌘K / Ctrl+K mở palette, ↑↓ Enter mở chi tiết, Esc đóng | UI3B-02 | Focus/bàn phím (bẫy 13) | Kiểm `event.key` thật trước khi kết luận; thử 3 loại kết quả |
| Tổng quan: KPI + sparkline, chuyển 7N/30N/90N, CTA "Cần xử lý" dẫn đúng màn | UI3B-03, 04 | Thị giác + điều hướng | Đăng nhập quản lý và thủ kho; thủ kho thấy "Tổng SL tồn" |
| Chi tiết đơn: Enter→Enter nhập dòng, gõ lại mã cộng dồn, aside Thông tin đơn | UI3B-06 | Luồng bàn phím (bẫy 14) | Tạo đơn nháp, thêm cùng mã 2 lần cùng/khác người nhận |
| Chi tiết hàng: badge, Ngừng/Mở lại KD, ảnh aside, cột Giá trị ẩn với thủ kho | UI3B-07 | Thị giác + quyền | Đăng nhập quản lý và thủ kho |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
