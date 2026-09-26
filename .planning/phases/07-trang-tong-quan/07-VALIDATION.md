---
phase: 7
slug: trang-tong-quan
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-26
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (database) · `npx tsx` scripts · `npm run check` (typecheck + lint + build) |
| **Config file** | `supabase/tests/*.sql` |
| **Quick run command** | `psql "$DATABASE_URL" -f supabase/tests/<file>.sql` |
| **Full suite command** | `npm run db:test:linked && npm run check` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** chạy file pgTAP vừa viết, hoặc `npm run typecheck` với task TypeScript
- **After every plan wave:** `npm run db:test:linked` + `npm run check`
- **Before `/gsd:verify-work`:** full suite xanh + `npx tsx scripts/test-route-permissions.ts` đủ ô
- **Max feedback latency:** 120 seconds
- Đếm assert phải đếm cả dòng ERROR (file chết giữa chừng không sinh `not ok`)

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| TQAN-06 | `bao_cao_xuat_am` trả đúng dòng gây âm (phá hòa `created_at,id`), loại phiếu hủy/bút toán đảo, XUAT + TRA_NCC, D-15 hai dòng | pgTAP | `psql -f supabase/tests/<n>_bao_cao_xuat_am_test.sql` | ❌ W1 | ⬜ pending |
| TQAN-01 | `ton_theo_nhom` khớp số dòng `danh_sach_ton_kho` cùng điều kiện (nhóm/công đoạn × trạng thái × kho) | pgTAP đối chiếu chéo | `psql -f supabase/tests/<n>_ton_theo_nhom_test.sql` | ❌ W1 | ⬜ pending |
| TQAN-07 | `nhip_ban` đếm phiếu/dòng/mã hôm nay và hôm qua, trừ phiếu hủy | pgTAP | `psql -f supabase/tests/<n>_nhip_ban_test.sql` | ❌ W1 | ⬜ pending |
| D-12 | Ba RPC raise `42501` với văn phòng/thủ kho/chỉ xem | pgTAP | trong ba file trên | ❌ W1 | ⬜ pending |
| D-11 | `/` redirect: văn phòng → `/xuat-kho`, thủ kho & chỉ xem → `/ton-kho`, quản lý 200 | route script | `npx tsx scripts/test-route-permissions.ts` | ✅ (sửa dòng `/`) | ⬜ pending |
| All TS | không `any`, build xanh | static | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Ba file pgTAP mới — viết trong chính WU tạo RPC (Wave 1), test trước rồi mới migration
- [ ] Helper `pg_temp.dang_nhap_nhu()` / `dang_xuat()` — copy từ `supabase/tests/33_the_kho_luy_ke_test.sql`
- [ ] Không neo vào bộ đếm sống — dữ liệu test tự tạo, dùng ngày giả định (năm 2091–2093)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bấm số trên dashboard mở `/ton-kho` với số dòng bằng số đếm | TQAN-01 / D-08 | cần dữ liệu thật + trình duyệt | Đăng nhập quản lý, bấm "âm" của một nhóm, so số dòng |
| Không cảnh báo antd v6 trong console | tất cả | chỉ hiện lúc chạy (bẫy 11) | Mở `/`, đọc console |
| Trạng thái rỗng xuất âm hiện "tin tốt" | TQAN-06 / D-04 | nội dung hiển thị | Chọn một ngày không có xuất âm |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
