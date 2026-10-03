---
phase: 17-doi-ten-gon-don-dat
plan: 01
subsystem: routing
tags: [nextjs, redirects, navigation, route-permissions]
requires: []
provides:
  - "Route /don-dat, /duyet-don (+ /moi, /[id], /[id]/in) thay /dat-hang, /hoa-don"
  - "6 redirect 307 giữ đường con + query; /xuat-kho đi thẳng /duyet-don"
  - "Menu Đơn đặt / Duyệt đơn; trang chủ văn phòng /duyet-don"
affects: [17-02]
tech-stack:
  added: []
  patterns: ["redirect next.config chạy trước proxy → tiep_tuc dựng bằng đường mới"]
key-files:
  created: []
  modified:
    - next.config.ts
    - src/shared/lib/navigation.ts
    - src/features/dashboard/lib/home-path.ts
    - scripts/test-pure-functions.ts
    - scripts/test-route-permissions.ts
    - scripts/load-test/load.mjs
key-decisions:
  - "Tên nhóm menu 'Đơn hàng' giữ; chỉ đổi tên màn (A1)"
  - "shortLabel 'Duyệt đơn' giữ nguyên, kiểm cắt chữ 375px ở 17-06"
requirements-completed: [TEN-01, TEN-02]
duration: 15min
completed: 2026-10-03
---

# Phase 17 Plan 01: Đổi URL và menu Summary

Đổi `/dat-hang` → `/don-dat`, `/hoa-don` → `/duyet-don` bằng git mv, 6 redirect 307 thẳng (kể cả `/xuat-kho`), menu "Đơn đặt"/"Duyệt đơn", ma trận quyền route 267/267 xanh.

## Tasks
1. Dời route + redirect + tiêu đề trang — `bd22239`
2. Menu + home-path + test hàm thuần (RED rồi GREEN) — `7bfa9de`
3. Ma trận route + `kiemChuyenHuongDayDu` (query, tiep_tuc) + load test — `6b20721`

## Deviations from Plan
None - plan executed exactly as written. Link literal trong `src/features/**` để plan 17-02; hiện vẫn chạy nhờ redirect.

## Verification
- `npm run check` xanh; test-pure-functions xanh; test-route-permissions 267/267 (Supabase local)
- `curl -sI /xuat-kho/abc/in?x=1` → `/duyet-don/abc/in?x=1` một bước

## Known Stubs
None.

## Self-Check: PASSED
