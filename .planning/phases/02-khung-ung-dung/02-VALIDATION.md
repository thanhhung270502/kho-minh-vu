---
phase: 2
slug: khung-ung-dung
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-13
---

# Phase 2 — Validation Strategy

> Hợp đồng kiểm chứng cho Phase 2. Nguồn: `02-RESEARCH.md` §Validation Architecture.
> Logic nhạy cảm (quyền, giá vốn, đánh số, phân trang, import) nằm ở RPC Postgres → pgTAP.
> Giao diện không có test runner JS (không cài Vitest — CLAUDE.md cấm tự cài thư viện) →
> `npm run check` + script `tsx` kiểm hàm thuần + UAT thủ công.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP trên cloud linked project (`supabase test db --linked`, cần Docker daemon cho pg_prove) |
| **Config file** | Không có — `supabase/config.toml` mặc định |
| **Quick run command** | `npm run db:push && npx supabase test db --linked supabase/tests/<file>` (một file) · `npm run check` (TS) |
| **Full suite command** | `npm run db:test:linked && npm run verify:hook && npm run check` |
| **Estimated runtime** | ~60–120 giây (pgTAP cloud) + ~60 giây (`next build`) |

Không có Supabase local (đĩa không đủ từ Phase 1) — mọi migration áp thẳng lên `kho-vu-tru`
bằng `npm run db:push`. Không bao giờ `db reset` trên cloud.

---

## Sampling Rate

- **Sau mỗi task database:** `npm run db:push` rồi chạy file pgTAP của task đó.
- **Sau mỗi task TypeScript:** `npm run typecheck` (task cuối của plan: `npm run check`).
- **Sau mỗi wave:** full suite (toàn bộ pgTAP 89 cũ + mới, `verify:hook`, `check`).
- **Trước `/spartan:phase verify 2`:** full suite xanh + UAT thủ công mục dưới.
- **Max feedback latency:** 120 giây.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CDAT-01 | pgTAP | `npx supabase test db --linked supabase/tests/30_rls_test.sql` | ✅ | ✅ |
| 02-01-02 | 01 | 1 | CDAT-01 | pgTAP | `npm run db:test:linked` (helper mới trong mọi file) | ✅ | ✅ |
| 02-01-03 | 01 | 1 | CDAT-01 | script | `npm run seed:users && npm run verify:hook` | ✅ | ✅ |
| 02-02-01 | 02 | 2 | DMUC-04, DTAC-02 | pgTAP | `npx supabase test db --linked supabase/tests/70_nhat_ky_sua_test.sql` | ✅ | ✅ |
| 02-03-01 | 03 | 1 | CDAT-04 | pgTAP | `npx supabase test db --linked supabase/tests/80_cau_hinh_so_ct_test.sql` + `20_chung_tu_test.sql` | ✅ | ✅ |
| 02-04-01 | 04 | 1 | DMUC-05 (D-16) | pgTAP | `npx supabase test db --linked supabase/tests/90_gia_von_test.sql` + `40_tim_kiem_test.sql` | ✅ | ✅ |
| 02-05-01 | 05 | 1 | AUTH-02 | tsx | `npx tsx scripts/kiem-tra-ham-thuan.ts` | ✅ | ✅ |
| 02-05-02 | 05 | 1 | AUTH-01, AUTH-07 | build | `npm run check` | ✅ | ✅ |
| 02-06-01 | 06 | 2 | DMUC-01..03 | pgTAP | `npx supabase test db --linked supabase/tests/41_danh_sach_san_pham_test.sql` | ✅ | ✅ |
| 02-06-02 | 06 | 2 | DMUC-05 | pgTAP | `npx supabase test db --linked supabase/tests/42_the_kho_test.sql` | ✅ | ✅ |
| 02-07-01 | 07 | 3 | DLIEU-04, DTAC-01, DTAC-03 | pgTAP | `npx supabase test db --linked supabase/tests/51_doi_tac_ghi_chu_test.sql` | ✅ | ✅ |
| 02-08-01 | 08 | 3 | DMUC-06 | pgTAP | `npx supabase test db --linked supabase/tests/61_import_danh_muc_test.sql` | ✅ | ✅ |
| 02-08-02 | 08 | 3 | DMUC-04 | pgTAP | `npx supabase test db --linked supabase/tests/62_ra_hang_loat_test.sql` | ✅ | ✅ |
| 02-09-01 | 09 | 4 | tất cả DB | full | `npm run db:test:linked && npm run verify:hook` | ✅ | ✅ |
| 02-09-02 | 09 | 4 | — | build | `npm run db:types && npm run check` | ✅ | ✅ |
| 02-10-xx | 10 | 5 | AUTH-01, CDAT-01 | build + script | `npm run check` + `npx tsx scripts/kiem-tra-tai-khoan.ts` | ✅ | ✅ |
| 02-11-xx | 11 | 5 | DMUC-01..05 | build | `npm run check` | ✅ | ✅ |
| 02-12-xx | 12 | 5 | DMUC-06, DMUC-07 | tsx (file KiotViet thật) | `npx tsx scripts/kiem-tra-doc-excel.ts` | ✅ | ✅ |
| 02-13..21 | 13–21 | 5–9 | UI | build | `npm run check` | ✅ | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Chốt ngày 2026-09-18 (hết plan 21).** Toàn bộ dòng trên đã xanh. Bằng chứng:

```
pgTAP trên cloud — 15 file, 199 assert, 0 lỗi
  10:18  20:18  30:26  40:14  41:16  42:7  50:12  51:17
  60:10  61:14  62:8   63:6   70:12  80:10 90:11
npm run verify:hook                      ✓ 4/4 tài khoản có vai_tro (+kho_id)
npx tsx scripts/kiem-tra-ham-thuan.ts    ✓
npx tsx scripts/kiem-tra-doc-excel.ts    ✓ (file KiotViet thật 3.266 dòng)
npx tsx scripts/kiem-tra-quyen-route.ts  ✓ 45/45 ô đúng (9 route × 5 vai trò)
npm run check                            exit 0
```

Bộ kiểm bổ sung so với bản nháp: `63_danh_muc_phu_test.sql` (plan 15) và
`scripts/kiem-tra-quyen-route.ts` (plan 21).

---

## Wave 0 Requirements

Không có wave 0 riêng: mỗi plan database tự viết file pgTAP **trước** migration (đỏ → xanh).

- [ ] `supabase/tests/70_nhat_ky_sua_test.sql` — plan 02
- [ ] `supabase/tests/80_cau_hinh_so_ct_test.sql` — plan 03
- [ ] `supabase/tests/90_gia_von_test.sql` — plan 04
- [ ] `supabase/tests/41_danh_sach_san_pham_test.sql`, `42_the_kho_test.sql` — plan 06
- [ ] `supabase/tests/51_doi_tac_ghi_chu_test.sql` — plan 07
- [ ] `supabase/tests/61_import_danh_muc_test.sql`, `62_ra_hang_loat_test.sql` — plan 08
- [ ] `scripts/kiem-tra-ham-thuan.ts` — plan 05 (assert bằng `node:assert`, không thư viện mới)
- [ ] `scripts/kiem-tra-doc-excel.ts` — plan 12 (chạy trên `data/kiotviet/DanhSachSanPham*.xlsx` thật)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Đăng nhập bằng tên, F5 vẫn giữ phiên | AUTH-01 | Không có Playwright | Đăng nhập `vanphong` → F5 → vẫn ở trang, header hiện "Văn phòng demo" |
| Chặn route + quay lại đúng trang | AUTH-02 | Không có Playwright | Cửa sổ ẩn danh mở `/danh-muc?nhom=...` → bị đẩy về `/dang-nhap?tiep_tuc=...` → đăng nhập → về đúng URL cũ. Thử `tiep_tuc=//evil.com` → về `/` |
| Đăng xuất từ mọi trang | AUTH-07 | UI | Từ `/danh-muc/[id]` và `/cai-dat/so-chung-tu` bấm Đăng xuất → về `/dang-nhap`, Back không vào lại được |
| Đổi mật khẩu lần đầu | AUTH-01 (D-03) | UI + Auth | Quản lý tạo tài khoản mới → đăng nhập bằng mật khẩu tạm → mọi route đẩy về `/doi-mat-khau` → đổi xong vào được app |
| Hiệu lực vô hiệu hóa / đổi vai trò | CDAT-01 (D-05) | Cần hai phiên thật | Tab A đăng nhập `thukho2`. Tab B (quản lý) bỏ K2 khỏi `thukho2` → tab A thao tác kế tiếp không còn thấy tồn K2. Vô hiệu hóa → tab A thao tác kế tiếp nhận thông báo "Tài khoản đã bị vô hiệu hóa" |
| Import file KiotViet thật | DMUC-06 | File thật, UI | Tải `data/kiotviet/DanhSachSanPham_*.xlsx` → xem trước 0 thêm, N sửa hoặc 0 thay đổi, không lỗi styles |
| Export đúng bộ lọc + cột giá vốn theo quyền | DMUC-07 | Mở file | Lọc công đoạn CARBON → Xuất → mở file đếm dòng = số trên bảng. Văn phòng có cột Giá vốn, thủ kho không |
| Văn phòng thật thao tác dữ liệu thật | Office Hours | Người thật | Tìm 5 mã quen, gán công đoạn cho một nhóm mã "Cần rà", rà 10 giá trị ghi chú — ghi thời gian và chỗ vướng |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (`npm run check` ở mọi task TS)
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
