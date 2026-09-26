---
phase: 9
slug: quan-ly-hinh-anh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-26
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (database) + script `tsx` tự chứa case (hàm thuần, quyền route) — dự án không dùng Jest/Vitest |
| **Config file** | none — mỗi script `tsx` tự chứa case |
| **Quick run command** | `npm run check && npx tsx scripts/test-pure-functions.ts` |
| **Full suite command** | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-route-permissions.ts` + `psql "$DATABASE_URL" -f supabase/tests/<file mới phase 9>.sql` |
| **Estimated runtime** | ~120 seconds (build chiếm phần lớn) |

---

## Sampling Rate

- **After every task commit:** Run `npm run check` (+ `npx tsx scripts/test-pure-functions.ts` nếu task đụng hàm thuần)
- **After every plan wave:** Run full suite (pgTAP mới của phase 9 + ma trận quyền route)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

*Planner điền theo task ID thật sau khi tạo PLAN.md. Khung theo yêu cầu:*

| Requirement | Test Type | Automated Command | File Exists | Status |
|-------------|-----------|-------------------|-------------|--------|
| ANH-01 | pgTAP (RLS ghi theo vai trò) | `psql "$DATABASE_URL" -f supabase/tests/<NN>_hinh_anh.sql` | ❌ W0 | ⬜ pending |
| ANH-02 | pgTAP (một ảnh chính, xóa mềm tự thăng ảnh kế) | cùng file trên | ❌ W0 | ⬜ pending |
| ANH-03 | ma trận quyền route (`/anh/<id>` chưa đăng nhập bị chặn) + pgTAP đọc | `npx tsx scripts/test-route-permissions.ts` | ✅ (thêm dòng) | ⬜ pending |
| ANH-04 | pgTAP `danh_sach_san_pham(p_co_anh)` + hàm thuần bộ lọc URL `anh=co|chua` | `psql … ` + `npx tsx scripts/test-pure-functions.ts` | ✅ (thêm case) | ⬜ pending |
| ANH-05 | kiểm tĩnh: ngoài lớp storage không chỗ nào biết Drive | `grep -rlnE "APPS_SCRIPT|DriveApp|GDRIVE" src/ \| grep -v "features/images/lib/storage"` rỗng (trừ env-server) | N/A | ⬜ pending |
| ANH-06 | script chạy lại lần hai báo 0 ảnh mới; `--dry-run` không ghi | `npm run <lệnh chép ảnh> -- --dry-run` hai lần | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/migrations/0068_*.sql` — bảng `hinh_anh`, RLS, RPC, `p_co_anh`
- [ ] `supabase/tests/<NN>_hinh_anh.sql` — pgTAP cho ANH-01/02/04
- [ ] `apps-script/` — project Apps Script (chưa tồn tại)
- [ ] thêm `/anh/[id]` + route upload vào `scripts/test-route-permissions.ts`
- [ ] `sharp` devDependency (D-22) cho script chép ảnh KiotViet

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload từ camera điện thoại / file máy tính, ảnh hiện ngay | ANH-01 | cần Apps Script đã deploy + trình duyệt thật | mở chi tiết mã → thêm ảnh → thấy trong thư viện; xem console không lỗi |
| Phóng to tại chỗ, đặt ảnh chính, xóa ảnh | ANH-02, ANH-03 | tương tác giao diện | bấm thumbnail, đổi ảnh chính, xóa → thumbnail bảng danh mục đổi theo |
| Ô xám khi chưa có ảnh ở bảng danh mục | ANH-04 | hiển thị | lọc "Chưa có ảnh", nhìn cột thumbnail |
| Lần xem thứ hai không gọi Apps Script | ANH-03 | cần đo request/log | DevTools Network: lần hai trả từ cache trình duyệt; log server không có lượt gọi Apps Script |
| Chép ảnh KiotViet thật (1.094 mã) | ANH-06 | chạy trên Drive thật, tốn thời gian | chạy thử lô nhỏ (`--gioi-han 20`) trước, rồi toàn bộ; đối chiếu báo cáo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
