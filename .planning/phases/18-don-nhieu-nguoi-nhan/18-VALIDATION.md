---
phase: 18
slug: don-nhieu-nguoi-nhan
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-03
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (DB) + tsx assert script (hàm thuần) + `npm run check` + kiểm trên trình duyệt |
| **Config file** | `supabase/tests/*.sql`; `scripts/test-pure-functions.ts` |
| **Quick run command** | `npm run typecheck && npx tsx scripts/test-pure-functions.ts` (TS) · `SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db supabase/tests/<file>.sql` (DB) |
| **Full suite command** | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-route-permissions.ts && SUPABASE_PROJECT_ID=rnpqgbuypmecxiatuulz npx supabase test db && npm run test:concurrency` |
| **Type gen** | `npx supabase gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --schema public` → `src/types/database.types.ts` |
| **Estimated runtime** | ~240 seconds |

---

## Sampling Rate

- **After every task commit:** quick run command phù hợp (TS hoặc pgTAP một file)
- **After every plan wave:** `npm run check` + pgTAP toàn bộ
- **Before `/gsd:verify-work`:** full suite xanh + UAT trình duyệt
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| NNHAN-01 | `tao_don`/`dat_nguoi_nhan_don`: nhiều người, cả Nội bộ & Đối tác; Nội bộ 0 người bị từ chối; gán dòng tự thêm người vào đơn (D1); chặn bỏ người đang ở dòng; chỉ TAM; thiếu quyền 42501 | pgTAP | `supabase test db supabase/tests/108_don_nhieu_nguoi_nhan_test.sql` | ❌ W0 | ⬜ pending |
| NNHAN-02 | Gán/xóa người nhận dòng; `dong_don` trả người nhận dòng; mapper dòng | pgTAP + unit | 108 + `test-pure-functions.ts` | ❌ W0 | ⬜ pending |
| NNHAN-03 | `danh_sach_don` trả mảng người nhận; lọc `p_nguoi_nhan_id`; URL `?nhan_vien=` | pgTAP + unit | 109 + `test-pure-functions.ts` | ❌ W0 | ⬜ pending |
| NNHAN-04 | Nhãn "Chung" / nối tên người nhận trên phiếu in | unit + manual | `test-pure-functions.ts` + UAT | ❌ W0 | ⬜ pending |
| NNHAN-05 | Hoàn thành đơn → `chung_tu_nguoi_nhan` + `chung_tu_dong.nguoi_nhan_id` khớp; hóa đơn đã ghi sổ không sửa được người nhận | pgTAP | 109 | ❌ W0 | ⬜ pending |
| NNHAN-06 | Backfill cột cũ → bảng nối, không mất người; phân tích tồn vẫn loại đơn nội bộ | pgTAP | 108/109 + `98_phan_tich_ton_kho_test.sql` (sửa) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/108_don_nhieu_nguoi_nhan_test.sql` — bất biến D1/D3, RPC ghi, backfill, RLS bảng nối, chặn bỏ người đang dùng
- [ ] `supabase/tests/109_nguoi_nhan_rpc_doc_test.sql` — RPC đọc, lọc, chép sang hóa đơn, phân tích tồn
- [ ] Sửa `supabase/tests/30_don_noi_bo_test.sql`, `98_phan_tich_ton_kho_test.sql`
- [ ] Mở rộng `scripts/test-pure-functions.ts` (mapper người nhận, nhãn "Chung", `?nhan_vien=`, RPC args)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tạo/sửa đơn Nội bộ & Đối tác nhiều người nhận; luồng bàn phím lưới dòng không chậm hơn khi 1 người | NNHAN-01/02 | tương tác | `/don-dat` tạo đơn, gõ dòng bằng bàn phím |
| Bỏ người đang dùng ở dòng → thông báo nêu mã hàng | NNHAN-01 | thông báo UI | đầu đơn, bỏ tag |
| Phiếu in một tờ có cột Người nhận, colSpan đúng | NNHAN-04 | in ấn | `/don-dat/<id>/in`, Ctrl+P |
| Hóa đơn ở Duyệt đơn hiện người nhận đơn + dòng | NNHAN-05 | hiển thị | hoàn thành đơn → `/duyet-don/<id>` |
| Console sạch (bẫy 11, 19) | tất cả | runtime | đọc console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
