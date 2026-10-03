---
phase: 17-doi-ten-gon-don-dat
verified: 2026-10-03T00:00:00Z
status: passed
score: 8/8 requirements verified
---

# Phase 17: Đổi tên, gọn Đơn đặt — Verification Report

**Phase Goal:** Giao diện nói đúng ngôn ngữ vận hành: "Đơn đặt"/"Duyệt đơn", "Hàng ngoài", bỏ Cần rà và Ngày giao dự kiến, phiếu lấy hàng đủ thông tin người in.
**Status:** passed (browser UAT approved by user 2026-10-03; see 17-06-SUMMARY)

## Requirements Coverage

All 8 IDs appear in plan frontmatter (01: TEN-01/02; 02: TEN-01/02; 03: TEN-03/04; 04: TEN-03/04/05; 05: DDAT-01/02/03; 06: all) and in REQUIREMENTS.md (all marked Complete). No orphans.

| ID | Status | Evidence |
|---|---|---|
| TEN-01 | SATISFIED | "Duyệt đơn" in src/shared/lib/navigation.ts, duyet-don pages; mobile 375px checked in UAT |
| TEN-02 | SATISFIED | src/app/(app)/don-dat and duyet-don exist, old dat-hang/hoa-don/xuat-kho dirs gone; next.config.ts redirects; curl: /dat-hang/moi -> 307 /don-dat/moi, /hoa-don?trang=2 -> /duyet-don?trang=2, /xuat-kho/abc/in -> /duyet-don/abc/in (single hop, query kept); no old paths remain in src |
| TEN-03 | SATISFIED | grep "Khách đặt" in src: 0 hits; UAT confirms "Đơn đặt" column/tabs |
| TEN-04 | SATISFIED | migration 0089_ten_hang_ngoai.sql updates cong_doan.ten; MUA_NGOAI code kept; "Mua ngoài" gone from UI strings (only an internal code comment); import matching via khop_danh_muc covers both names |
| TEN-05 | SATISFIED | grep "Cần rà", can_ra in src: 0 functional hits (only a lookup.api.ts comment and a historical audit-log label `can_ra_dvt` in product-detail.tsx, intentional); DB columns kept |
| DDAT-01 | SATISFIED | "Ngày giao"/ngay_giao_du_kien: no hits in src except none; DB column kept |
| DDAT-02 | SATISFIED | picking-print-template.tsx "Người nhận" (recipient name only, A3); UAT step 3 |
| DDAT-03 | SATISFIED | picking-print-template.tsx "Người đặt" and "In lúc" present; UAT step 3 |

## Spot-Checks

| Check | Result |
|---|---|
| npm run typecheck | pass |
| npx tsx scripts/test-pure-functions.ts | pass |
| curl redirects (3) | pass |
| 17-06 automated suite (check, excel-reader, route-permissions 267/267, pgTAP 754) | pass per SUMMARY (not re-run) |

## Anti-Patterns
None blocking. Remaining old-string matches are comments or historical audit labels.

## Notes (non-blocking)
- Migration 0089 is applied to LOCAL only; it must be pushed to cloud (`npm run db:push`) at deploy, otherwise the cloud still shows "Mua ngoài".
- Excel export and Ctrl+P preview were checked by the user manually, not programmatically.

_Verifier: Claude (gsd-verifier)_
