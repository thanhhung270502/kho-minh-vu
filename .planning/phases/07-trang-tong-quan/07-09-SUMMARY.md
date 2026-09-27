---
phase: 07-trang-tong-quan
plan: 09
subsystem: ui
tags: [nextjs, dashboard, route-guard, checkpoint]
requires: [07-04, 07-07, 07-08]
provides: ["Trang / cho quản lý", "điều hướng theo vai trò ở /", "dòng / trong ma trận quyền route"]
key-files:
  created: [src/features/dashboard/components/dashboard-view.tsx]
  modified: ["src/app/(app)/page.tsx", scripts/test-route-permissions.ts]
key-decisions:
  - "Route guard viết trực tiếp trong page.tsx bằng getCurrentUser() + homePathForRole(), không dùng helper chặn quyền chung (nó đẩy sang /khong-du-quyen, sai D-11)"
requirements-completed: [TQAN-01, TQAN-06, TQAN-07]
duration: 60min
completed: 2026-09-27
---

# 07-09: Ghép trang tổng quan, điều hướng theo vai trò

## Tasks

| Task | Commit |
|---|---|
| 1. DashboardView + page.tsx điều hướng theo vai trò | f2fc4b5 |
| 2. Dòng `/` trong ma trận quyền route | 05230d7 |
| 3. Checkpoint kiểm trình duyệt | orchestrator làm, xem dưới |

## Checkpoint (27/09)

Tiền đề: người dùng yêu cầu bật khối `phonzyruoalimgaovljm` trong `.env.local`; orchestrator đảo comment hai khối
(không gõ lại secret), bản sao lưu ở scratchpad.

Trên trình duyệt, đăng nhập `quanly`:

| Kiểm | Kết quả |
|---|---|
| Chưa đăng nhập vào `/` → `/dang-nhap?tiep_tuc=%2F`, đăng nhập xong về `/` | ✓ |
| Thứ tự: Nhịp bán → Xuất âm → Tồn theo nhóm/công đoạn | ✓ |
| Nhịp bán 0/0/0 "Bằng hôm qua", chốt 27/09/2026 (chưa go-live) | ✓ |
| Xuất âm rỗng: "Hôm nay không có lần xuất âm nào." | ✓ |
| Tồn theo nhóm: 90 nhóm số thật | ✓ |
| D-08: "ĐẦU ĐÈN - 46" cột Âm = 1 → `/ton-kho?nhom=…&ton=am` đúng 1 mã | ✓ |
| Console: không cảnh báo antd, không lỗi React (chỉ cảnh báo preload font của Next dev) | ✓ |

`npx tsx scripts/test-route-permissions.ts`: **150/150 ô đúng**, gồm dòng `/` (quanly 200, vanphong → /xuat-kho,
thukho1/chixem → /ton-kho, khách → đăng nhập).

Lần chạy đầu báo 14 ô lệch (route `/in` 404, `/dat-hang/[id]` lần biên dịch đầu). Nguyên nhân: cache Turbopack
cũ trong `.next/dev` — Next trả 404 mặc định, tiêu đề trang không phải của route. Xóa `.next/dev`, khởi động lại
→ 150/150. Không liên quan code Phase 7 (không file nào dưới các route đó bị sửa).

## Chưa kiểm bằng mắt

Khung trình duyệt bị ẩn giữa chừng (bẫy 19 — trang không bắn request) nên chưa bấm tay: bộ lọc kho, tab "Theo công
đoạn", nút "Làm mới". Phần logic đã phủ tự động: pgTAP 93 đối chiếu lọc K1 và tab công đoạn với
`danh_sach_ton_kho`; `buildInventoryDrilldownUrl` có test hàm thuần; hook làm mới là `invalidateQueries(dashboardKeys.all)`.
→ Đưa vào UAT (`/spartan:phase verify 7`).

## Phát hiện ngoài phạm vi

- Thanh tab đáy điện thoại: sau khi ẩn "Tổng quan", ô thứ 4 của văn phòng/thủ kho/chỉ xem tự lấp bằng "Đặt hàng"
  (`mobilePriority` chưa xét lại) — ghi từ 07-04.
- Cloud có migration 0068_hinh_anh chưa có trong repo.
