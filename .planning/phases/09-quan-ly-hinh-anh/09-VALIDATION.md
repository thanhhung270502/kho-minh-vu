---
phase: 9
slug: quan-ly-hinh-anh
status: draft
nyquist_compliant: true
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
| **Full suite command** | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-route-permissions.ts` + `psql "$DATABASE_URL" -f supabase/tests/43_hinh_anh_test.sql` |
| **Estimated runtime** | ~120 seconds (build chiếm phần lớn) |

---

## Sampling Rate

- **After every task commit:** Run `npm run check` (+ `npx tsx scripts/test-pure-functions.ts` nếu task đụng hàm thuần)
- **After every plan wave:** Run full suite (pgTAP mới của phase 9 + ma trận quyền route)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-T1 | 01 | 1 | ANH-01/02/03/04 | pgTAP (viết RED) | grep cấu trúc `supabase/tests/43_hinh_anh_test.sql` | ❌ W0 (tạo ở task này) | ⬜ pending |
| 09-01-T2 | 01 | 1 | ANH-01/02/04/05 | tĩnh (migration) | grep `0068_hinh_anh.sql` (drop+create, 7× search_path, không enum) | ❌ W0 | ⬜ pending |
| 09-02-T1 | 02 | 1 | ANH-05 | parse JS + manifest | `node -e "new Function(...Code.gs)"` + JSON manifest | ❌ W0 | ⬜ pending |
| 09-02-T2 | 02 | 1 | ANH-05 | tĩnh (tài liệu) | grep `apps-script/README.md` | ❌ W0 | ⬜ pending |
| 09-03-T1 | 03 | 1 | ANH-01 | hàm thuần | `npx tsx scripts/test-pure-functions.ts` | ✅ (thêm case) | ⬜ pending |
| 09-03-T2 | 03 | 1 | ANH-01 | typecheck | `npm run typecheck` + grep `blob.type !== "image/webp"` | ❌ W0 | ⬜ pending |
| 09-04-T1 | 04 | 1 | ANH-05 | unit (fetch giả) | `npx tsx scripts/test-image-storage.ts` | ❌ W0 (tạo ở task này) | ⬜ pending |
| 09-04-T2 | 04 | 1 | ANH-05 | typecheck + grep tĩnh | `npm run typecheck` + grep ANH-05 rỗng | ✅ | ⬜ pending |
| 09-05-T1 | 05 | 2 | ANH-01..05 | đẩy DB + kiểu | grep `database.types.ts` (hinh_anh, 5 RPC, p_co_anh, không GDRIVE) + typecheck | ✅ | ⬜ pending |
| 09-05-T2 | 05 | 2 | ANH-01/02/03/04 | pgTAP trên cloud | `psql "$DATABASE_URL" -f supabase/tests/43_hinh_anh_test.sql` (+41, toàn bộ) | ✅ | ⬜ pending |
| 09-06-T1 | 06 | 3 | ANH-03 | typecheck | `npm run typecheck` | ❌ W0 | ⬜ pending |
| 09-06-T2 | 06 | 3 | ANH-03/05 | build + grep header + curl 401 | `npm run check` + grep `private, max-age=31536000, immutable` | ❌ W0 | ⬜ pending |
| 09-07-T1 | 07 | 3 | ANH-01/02/03 | typecheck | `npm run typecheck` | ❌ W0 | ⬜ pending |
| 09-07-T2 | 07 | 3 | ANH-01/02 | typecheck + lint | `npm run typecheck && npm run lint` | ❌ W0 | ⬜ pending |
| 09-08-T1 | 08 | 3 | ANH-04 | hàm thuần | `npx tsx scripts/test-pure-functions.ts` (anh=co\|chua, p_co_anh) | ✅ (thêm case) | ⬜ pending |
| 09-08-T2 | 08 | 3 | ANH-04 | build | `npm run check` | ✅ | ⬜ pending |
| 09-09-T1 | 09 | 4 | ANH-01 | typecheck + grep | `npm run typecheck` + grep isWebp/storage.remove | ❌ W0 | ⬜ pending |
| 09-09-T2 | 09 | 4 | ANH-02/03 | ma trận quyền route | `npx tsx scripts/test-route-permissions.ts` (cần `npm run dev`) | ✅ (thêm kiemAnh) | ⬜ pending |
| 09-10-T1 | 10 | 4 | ANH-01 | build + lint | `npm run typecheck && npm run lint` | ❌ W0 | ⬜ pending |
| 09-10-T2 | 10 | 4 | ANH-02/03 | build | `npm run check` | ❌ W0 | ⬜ pending |
| 09-11-T1 | 11 | 4 | ANH-04 | typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 09-11-T2 | 11 | 4 | ANH-03/04 | build | `npm run check` | ❌ W0 | ⬜ pending |
| 09-12-T1 | 12 | 4 | ANH-06 | hàm thuần | `npx tsx scripts/test-pure-functions.ts` (parseImageCell, buildCopyPlan) | ✅ (thêm case) | ⬜ pending |
| 09-12-T2 | 12 | 4 | ANH-06 | dry-run hai lần | `npm run import:kiotviet-images` ×2 cùng kết quả | ❌ W0 | ⬜ pending |
| 09-13-T1 | 13 | 5 | ANH-05 | checkpoint:human-action | grep `.env.local` có APPS_SCRIPT_URL/SECRET | — | ⬜ pending |
| 09-13-T2 | 13 | 5 | ANH-03/05/06 | hệ thật | `npm run check` + grep ANH-05 + curl Apps Script + `--ghi --gioi-han 20` + ma trận quyền + Server-Timing | ✅ | ⬜ pending |
| 09-13-T3 | 13 | 5 | ANH-01..04 | checkpoint:human-verify | UAT trình duyệt 10 bước | — | ⬜ pending |
| 09-13-T4 | 13 | 5 | ANH-06 | chạy thật | `npm run import:kiotviet-images` sau `--ghi` báo 0 ảnh mới | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Kiểm tĩnh ANH-05 (chạy ở 09-04, 09-06, 09-09, 09-13):
`grep -rlnE "APPS_SCRIPT|DriveApp|GDRIVE" src/ | grep -v "features/images/lib/storage" | grep -v "src/lib/env-server.ts"` phải rỗng.

---

## Wave 0 Requirements

- [ ] `supabase/migrations/0068_hinh_anh.sql` — bảng `hinh_anh`, RLS, RPC, `p_co_anh` (09-01)
- [ ] `supabase/tests/43_hinh_anh_test.sql` — pgTAP cho ANH-01/02/03/04 (09-01)
- [ ] `apps-script/` — project Apps Script (09-02)
- [ ] `scripts/test-image-storage.ts` — test lớp storage bằng fetch giả (09-04)
- [ ] thêm `/anh/[id]` + `/api/anh/tai-len` + `/api/anh/xoa` vào `scripts/test-route-permissions.ts` (09-09)
- [ ] `sharp@0.35.4` devDependency (D-22) cho script chép ảnh KiotViet (09-12)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
