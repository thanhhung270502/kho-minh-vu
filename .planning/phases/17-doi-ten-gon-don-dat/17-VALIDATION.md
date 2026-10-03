---
phase: 17
slug: doi-ten-gon-don-dat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-03
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx assert scripts (hàm thuần, đọc Excel, ma trận quyền route) + pgTAP + `npm run check` + kiểm trên trình duyệt |
| **Config file** | none — scripts chạy bằng `npx tsx`; pgTAP ở `supabase/tests/*.sql` |
| **Quick run command** | `npm run typecheck && npx tsx scripts/test-pure-functions.ts` |
| **Full suite command** | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-excel-reader.ts && npx tsx scripts/test-route-permissions.ts && SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db` (route matrix cần dev server) |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** `npm run check` + ma trận quyền route (W1) / pgTAP (khi có migration)
- **Before `/gsd:verify-work`:** full suite xanh + kiểm trên trình duyệt
- **Max feedback latency:** 60 seconds (quick run)

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| TEN-01 | Nhãn/href menu, thứ tự nhóm, thanh tab 4 mục | unit | `npx tsx scripts/test-pure-functions.ts` | ✅ edit | ⬜ pending |
| TEN-02 | Route mới chặn quyền như cũ; link cũ → mới giữ đường con; `/xuat-kho` đi thẳng | integration | `npx tsx scripts/test-route-permissions.ts` | ✅ edit | ⬜ pending |
| TEN-02 | Giữ query; chưa đăng nhập → `tiep_tuc` = đường mới | integration | kiểm Location đầy đủ trong cùng script | ❌ W0 | ⬜ pending |
| TEN-03 | "Đơn đặt" ở header CSV | unit | test-pure (assert header CSV) | ❌ W0 | ⬜ pending |
| TEN-04 | `cong_doan.ten` = "Hàng ngoài"; tên cũ + mới đều khớp khi import | pgTAP | `supabase test db` → `107_ten_hang_ngoai_test.sql` | ❌ W0 | ⬜ pending |
| TEN-05 | `?can_ra=1` bị bỏ qua; RPC args không còn `p_can_ra` | unit | test-pure (`readFilterFromUrl`) | ✅ edit | ⬜ pending |
| DDAT-01 | Không còn trường Ngày giao; insert không gửi cột | typecheck | `npm run check` | ✅ | ⬜ pending |
| DDAT-02 | Người nhận trên phiếu in chỉ có tên | unit | test-pure (`recipientDisplayName`) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/107_ten_hang_ngoai_test.sql` — TEN-04
- [ ] helper kiểm `Location` đầy đủ trong `scripts/test-route-permissions.ts` — TEN-02 (query + tiep_tuc)
- [ ] assert `recipientDisplayName`, header CSV "Đơn đặt", `can_ra` trên URL bị bỏ qua trong `scripts/test-pure-functions.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Thanh tab dưới hiện "Đơn đặt"/"Duyệt đơn" không bị cắt ở 375px | TEN-01 | hiển thị | resize_window mobile, chụp màn |
| Cột "Đơn đặt" ở bảng + tab chi tiết mã | TEN-03 | hiển thị | mở `/danh-muc`, bấm dòng |
| File xuất / preview import ghi "Hàng ngoài" | TEN-04 | file Excel | xuất từ Danh sách hàng hóa, mở ô công đoạn |
| Không còn ô Ngày giao ở tạo/sửa/danh sách/chi tiết/in | DDAT-01 | hiển thị | `/don-dat`, dialog tạo, chi tiết, `/in` |
| Phiếu lấy hàng có "Người đặt" + "In lúc HH:mm DD/MM/YYYY" | DDAT-03 | in ấn | mở `/don-dat/<id>/in` |
| Console sạch (bẫy 11, 19) | tất cả | runtime | đọc console mọi màn đã đổi |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
