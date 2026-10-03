---
phase: 17-doi-ten-gon-don-dat
plan: 06
subsystem: verification
tags: [uat, routes, redirects, print, catalog]
requires: ["17-01", "17-02", "17-03", "17-04", "17-05"]
provides:
  - "Bộ kiểm tự động xanh trên DB local đã dọn về schema của nhánh"
  - "UAT 10 bước Phase 17 — người dùng xác nhận đạt 03/10/2026"
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified: []
key-decisions:
  - "Nhãn tab đáy 'Duyệt đơn' vừa 375px — không rút thành 'Duyệt'"
  - "DB local dọn về schema nhánh (gỡ 0085–0088 của quy chuẩn) bằng backup → db reset → nạp lại dữ liệu"
requirements-completed: [TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, DDAT-01, DDAT-02, DDAT-03]
duration: 40min
completed: 2026-10-03
---

# Phase 17 Plan 06: Cổng cuối Summary

Toàn bộ bộ kiểm tự động xanh và 10 bước kiểm trên trình duyệt đạt; người dùng xác nhận "đạt".

## Task 1 — Bộ kiểm tự động

| Lệnh | Kết quả |
|---|---|
| `npm run check` | exit 0 |
| `npx tsx scripts/test-pure-functions.ts` | tất cả assert đạt |
| `npx tsx scripts/test-excel-reader.ts` | đạt |
| `npx tsx scripts/test-route-permissions.ts` | 267/267 ô đúng |
| `supabase test db` | 49 file / 754 test PASS (sau khi dọn DB local — xem Deviations) |

Quét chuỗi cũ trong `src`: chỉ còn comment giải thích ở `picking-print-template.tsx:22` ("bỏ ngày giao dự kiến") — chấp nhận.

Redirect (curl, một bước, giữ query):
- `/xuat-kho/abc/in?x=1` → 307 `/duyet-don/abc/in?x=1`
- `/hoa-don?trang=2` → 307 `/duyet-don?trang=2`
- `/dat-hang/moi` → 307 `/don-dat/moi`
- Chưa đăng nhập `/dat-hang/<id>?x=1` → 2 bước → `/dang-nhap?tiep_tuc=%2Fdon-dat%2F<id>%3Fx%3D1`

Nhãn mobile 375px: `"Duyệt đơn"` không bị cắt (`scrollWidth ≤ clientWidth`) → giữ nguyên `shortLabel`.

Dữ liệu mẫu dùng khi kiểm: đơn `DH26-000002` (`92763555-4d24-4abb-8762-2909c01760e2`, hoàn thành, người nhận nội bộ), đơn `DH26-000001` (`bd125214-…`, đối tác), hóa đơn `65b32f2a-ddf6-44e8-baff-9f8a8bd901eb`.

## Task 2 — Kiểm trên trình duyệt (Quản lý demo, Supabase local)

| # | Kết quả |
|---|---|
| 1 | Menu nhóm Đơn hàng: "Đơn đặt" → `/don-dat`, "Duyệt đơn" → `/duyet-don` |
| 2 | `/don-dat` tiêu đề "Đơn đặt", bảng không có cột Ngày giao; dialog "Tạo đơn đặt" không có ô ngày giao |
| 3 | Phiếu in: "Người nhận: Thủ kho K1" (không "Nội bộ —"), đối tác "Khách lẻ" (không mã); "Người đặt: …"; "In lúc: 20:07 03/10/2026"; không Ngày giao |
| 4 | `/duyet-don/<id>` có "← Duyệt đơn"; nút "Tạo hóa đơn" giữ tên (A1) |
| 5–6 | Link cũ chuyển thẳng; chưa đăng nhập giữ `tiep_tuc` = đường mới |
| 7 | Danh mục: không Cần rà / ĐVT mâu thuẫn; có Danh mục phụ + Xuất Excel; cột "Đơn đặt"; công đoạn "Hàng ngoài"; `?can_ra=1` bị bỏ qua; tab chi tiết ghi "Hàng ngoài", "Đơn đặt" |
| 8 | Phân tích › đề nghị nhập: cột "Đơn đặt" |
| 9 | 375px: "Duyệt đơn" đủ chữ |
| 10 | Console: không lỗi của Phase 17, không cảnh báo antd |

Bản xem trước Ctrl+P và file Excel xuất ra: người dùng tự kiểm, xác nhận "đạt".

## Deviations

- **DB local mang schema nhánh quy chuẩn (0085–0088)** — 0086 xóa `loai_hang`/`dong_xe` nên 4 file pgTAP (61, 70, 100, 102) đỏ và Danh mục gọi hai bảng đó bị 404. Không do Phase 17. Theo yêu cầu người dùng đã dọn: backup toàn bộ (`~/Desktop/kiotviet_local_before_reset_20261003.dump`) → nạp vào DB phụ, gọt cột/bảng/dòng chỉ có ở quy chuẩn → `supabase db reset --local` → nạp lại dữ liệu với `session_replication_role = replica`. 54/54 bảng khớp số dòng. Bỏ khỏi DB chạy (còn trong backup): 7.559 dòng nhật ký nguồn `quy_chuan`, 690 dòng `ma_hoa`, 2 thành phần combo, các cột hãng xe/dòng xe/linh kiện/mô tả.
- Quay lại nhánh quy chuẩn: `migration up --local` sẽ đòi `--include-all` (DB đã ghi 0089 mà nhánh đó chưa có file) — hoặc merge `main` vào nhánh đó trước.

## Self-Check: PASSED
