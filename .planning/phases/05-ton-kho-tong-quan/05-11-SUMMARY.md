---
phase: 05-ton-kho-tong-quan
plan: 11
subsystem: ui
tags: [navigation, route-permissions, uat]

requires:
  - phase: 05-ton-kho-tong-quan (plan 07, 08, 09, 10)
    provides: màn /ton-kho, thẻ kho lũy kế, /ton-kho/dinh-muc, /ton-kho/nap-tam
provides:
  - "Mục menu Tồn kho (icon ContainerOutlined), ô Tồn ở thanh tab đáy"
  - "Lối vào /ton-kho/dinh-muc và /ton-kho/nap-tam từ PageHeader của /ton-kho"
  - "Ma trận quyền route 120/120 ô (thêm 15 ô ba route + 5 phép thử POST /api/ton-kho/nap-tam)"
affects: [Phase 6 (kiểm kê — thay số tạm [NAP_TON_TAM] bằng số đếm thật)]

tech-stack:
  added: []
  patterns:
    - "Route chỉ có POST kiểm bằng FormData rỗng: vai trò được phép dừng ở 400 (qua cửa quyền, chưa chạm RPC), vai trò khác 403, khách 401"

key-files:
  created: []
  modified:
    - src/shared/lib/navigation.ts
    - src/shared/components/nav-icons.tsx
    - src/app/(app)/ton-kho/page.tsx
    - scripts/test-route-permissions.ts

key-decisions:
  - "Thanh tab đáy: Tồn lấy ô 4 của Đặt hàng (Đặt hàng → Khác); Xuất 2, Nhập 3 giữ nguyên vị trí đã quen từ UAT Phase 4. Plan viết trước khi 04-15 sắp lại tab đáy nên số thứ tự trong plan không còn khớp — giữ mục đích (bước 8 UAT)"
  - "Menu máy tính: Tồn kho sau Xuất kho, không chen giữa Nhập và Đặt hàng"
  - "/ton-kho/dinh-muc và /ton-kho/nap-tam không có mục menu — lối vào là link ở actions của PageHeader (khuôn /doi-tac → Rà ghi chú KiotViet), ẩn theo quyền edit-catalog / load-provisional-stock"

requirements-completed: [TON-01, TON-02, TQAN-02]

completed: 2026-09-21
---

# Plan 05-11 — Menu, ma trận quyền, UAT Phase 5

## Task 1 — menu (`ce7fe36`)

`NavIconId` có thêm `"inventory"`, và `NAV_ICONS.inventory = <ContainerOutlined />`. Menu
máy tính gồm: Tổng quan · Nhập kho · Đặt hàng · Xuất kho · **Tồn kho** · Danh mục · Đối
tác · Cài đặt. Thanh tab đáy gồm Tổng quan(1) · Xuất(2) · Nhập(3) · **Tồn(4)**; Đặt hàng (5)
chuyển vào "Khác". `/ton-kho` có thêm link "Duyệt định mức tồn" (quản lý, văn phòng) và
"Nạp tồn tạm" (chỉ quản lý).

## Task 2 — ma trận quyền và các bộ kiểm (`6e9cff2`)

| Bộ kiểm | Kết quả |
|---|---|
| `npx tsx scripts/test-route-permissions.ts` (dev server) | **120/120 ô đúng**: 15 ô mới cho `/ton-kho`, `/ton-kho/dinh-muc`, `/ton-kho/nap-tam`; 5 phép thử POST `/api/ton-kho/nap-tam` (quản lý 400, văn phòng/thủ kho/chỉ xem 403, khách 401) |
| `npm run check` | xanh (typecheck, lint, build) |
| `npm run verify:hook` | ✓, cả 5 tài khoản mẫu nhận đúng `vai_tro`/`kho_id` |
| `npx tsx scripts/test-pure-functions.ts` | ✓ tất cả assert đạt |
| `npx tsx scripts/test-excel-reader.ts` | **không chạy được**: cần `data/kiotviet/DanhSachSanPham*.xlsx`, mà file thật chưa có trong repo |
| pgTAP | 380/380, chạy qua MCP ở plan 05-05. Từ đó tới nay không có migration mới |
| Log dev server | không có lỗi |

Việc Phase 4 còn nợ mà plan dự đoán (thiếu dòng ma trận cho `/dat-hang`, `/xuat-kho`,
`/tra-hang`) **thực ra đã có**: `/dat-hang` và `/xuat-kho` là dòng tĩnh, còn các route chi tiết
`/tra-hang/[id]` thì được thêm lúc chạy, bằng id thật.

## Task 3 — UAT

Người dùng xác nhận nguyên văn: **"đạt"**. Khi được hỏi lại, họ khẳng định chữ "đạt" là cho
cả 10 mục UAT (9 mục của plan, cộng mục kiểm bản sửa import Excel `c51391d`).

**Ghi chú bằng chứng. Người dùng đã chấp nhận, nhưng ghi lại để không ai hiểu nhầm.** Lúc
2026-09-21 15:01 UTC, database `kho-vu-tru` (database duy nhất của app) CHƯA có dấu vết
của các bước ghi dữ liệu:

- **Bước 1–2:** không có chứng từ `DIEU_CHINH` nào mang tiền tố `[NAP_TON_TAM]`, và
  `ton_kho` có 0 dòng khác 0. Tức là **chưa nạp tồn tạm**, nên không có số liệu "đã nạp /
  bỏ qua / lỗi / so_ct" để ghi.
- **Bước 5:** 0 mã có `ton_toi_thieu > 0`, 0 dòng `nhat_ky_sua` nguồn `dinh_muc`.
- **Bước 6:** danh sách dưới định mức chắc chắn rỗng vì chưa có định mức.
- **Bước 7:** `thukho1` không đăng nhập lần nào sau 12:21 UTC (lần đó là script ma trận quyền).
- Hoạt động của `quanly` sau khi nhận danh sách UAT: tạo phiếu nhập `PNM26-000004`
  (vẫn `NHAP_LIEU`) và một đơn đặt hàng, đổi trạng thái 2 lần.

**Việc còn phải làm trước go-live (vận hành, không phải lỗi code):** quản lý nạp tồn tạm
một lần ở `/ton-kho/nap-tam` bằng file KiotViet thật, và duyệt định mức ở
`/ton-kho/dinh-muc`. Chưa làm hai việc này thì màn tồn kho hiện toàn số 0 và cảnh báo
"sắp hết" không bao giờ kêu.

## Việc sửa ngoài phạm vi trong lúc chạy Phase 5 (đã commit)

- `2222851`: thủ kho thấy cột 0 giả của kho không được phân. Giờ phạm vi lấy từ
  `kho_hien_tai()`.
- `c51391d`: client nhập Excel danh mục / giá vốn đầu kỳ đọc `ketQua` sau khi route đổi sang
  `result` ở `9ec9b1f`. Lỗi đã lên production.
- `55d0b29`: `Statistic valueStyle` → `styles.content` (antd v6).
