---
phase: 06-kiem-ke-go-live
plan: 16
subsystem: ui
tags: [navigation, route-permissions, uat]
requires: [06-06, 06-08, 06-10, 06-15]
key-files:
  modified:
    - src/shared/lib/navigation.ts
    - src/shared/components/nav-icons.tsx
    - src/shared/components/app-shell.tsx
    - scripts/test-pure-functions.ts
    - scripts/test-route-permissions.ts
completed: 2026-09-25
---

# Phase 6 Plan 16: Menu, ma trận quyền route, UAT — Summary

**Menu Kiểm kê + Lịch sử KiotViet lọc theo công tắc; ma trận quyền route 145/145; UAT người dùng trả lời "đạt" — nhưng luồng kiểm kê chưa để lại dấu vết trên database thật (ghi rõ dưới đây).**

## Commits

- `9c544d0` — menu Kiểm kê + Lịch sử KiotViet, lọc theo công tắc
- `b7a4c58` — ma trận quyền route + phép thử POST hai endpoint Excel

## Kiểm tự động

| Kiểm | Kết quả |
|---|---|
| `npm run check` | xanh, 38 route |
| `npx tsx scripts/test-pure-functions.ts` | xanh (thêm 6 case `filterNavItems`/`splitMobileItems`) |
| `npm run verify:hook` | 5/5 tài khoản |
| `npx tsx scripts/test-route-permissions.ts` | **145/145 ô đúng** (orchestrator chạy, dev server trỏ `kho-vu-tru`); `/kiem-ke/[id]` kiểm bằng uuid không tồn tại vì chưa có phiên nào |
| pgTAP | không chạy lại — 06-16 không đổi SQL; 34/34 file xanh ở 06-05 |
| `test-excel-reader.ts` | **không chạy trọn** — thiếu `data/kiotviet/*.xlsx` trên máy này; 4 case mới đã chạy riêng ở 06-13 |
| DLIEU-05 (D-17) | `git diff 209502d..HEAD` trên 0044 / cost-import / gia-von-dau-ky rỗng — không đụng giá vốn |

## UAT (Task 3, checkpoint blocking)

- Người dùng trả lời: **"đạt"** (25/09).
- Kiểm chứng trên database `kho-vu-tru` ngay sau đó: **0 chứng từ `KIEM_KE`** (kể cả `DA_HUY`) và **0 `DIEU_CHINH`**.
  Nghĩa là mục 3–6 (mở phiên thử, đếm ba đường, D-03 chốt theo dòng, bảng lệch + hủy phiên) KHÔNG để lại dấu vết
  trên database thật, và mục 7 (đầu kỳ: nạp tồn tạm → đếm → duyệt) chưa làm.
- Người dùng được hỏi lại và chọn **đóng plan** với ghi chú này.
- Ba câu hỏi mở đã được trả lời trước (24/09, 06-CONTEXT): giữ công tắc xem cho văn phòng; bỏ dòng KiotViet khỏi thẻ kho;
  ngưỡng lệch lớn ≥5 cái hoặc ≥10%.

## Deviations

- Executor 06-16 khởi động `npm run dev` (trỏ project sai `rnpq…` qua `.env.local`) rồi báo đã dừng, nhưng tiến trình
  còn sống giữ cổng 3000. Orchestrator dừng nó (PID 12196/23204/4288) và chạy dev server qua script bọc nạp khối
  biến `kho-vu-tru`, không sửa `.env.local`.

## Việc còn mở trước go-live

1. Chạy luồng kiểm kê thật (mục 3–6) trên `kho-vu-tru` ít nhất một lần — pgTAP phủ logic DB, nhưng màn đếm điện thoại,
   import Excel và bảng lệch chưa có bằng chứng chạy trên dữ liệu thật.
2. Bước đầu kỳ (D-01, D-06): nạp tồn tạm → mở phiên toàn kho → đếm sát ngày chuyển → nhập → duyệt.
3. `.env.local` vẫn bật khối `rnpqgbuypmecxiatuulz`.
4. Chạy lại `test-excel-reader.ts` trên máy có file KiotViet thật.
