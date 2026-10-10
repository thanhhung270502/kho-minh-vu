---
status: partial
phase: 22-toi-uu-du-lieu-lon
source: [22-VERIFICATION.md]
started: 2026-10-09T18:00:00+07:00
updated: 2026-10-10T09:00:00+07:00
---

## Current Test

2. Đẩy migration lên cloud — chờ người dùng chọn thời điểm

## Tests

### 1. Duyệt SC6 đạt một phần — tim_kiem_toan_cuc theo số chứng từ vẫn Seq Scan chung_tu
expected: Người dùng chấp nhận chuyển phần tìm theo `so_ct` (126 ms quản lý / 308 ms thủ kho ở 5 năm) sang Wave 2, hoặc yêu cầu gap-closure ngay trong Phase 22. Bằng chứng: `bench/explain-after-5y.txt`, 22-07-SUMMARY.
result: pass — người dùng duyệt 10/10/2026: chuyển sang Wave 2 (đã thêm vào bảng Wave 2 của 22-AUDIT.md và Pending Todos trong STATE.md)

### 2. Duyệt đẩy migration 0124 + 0125 lên cloud
expected: Người dùng chọn thời điểm (ngoài giờ văn phòng) và project đích; hiện chỉ áp ở LOCAL.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
