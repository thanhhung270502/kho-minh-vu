# Phase 7: Trang tổng quan — Work Units

Mỗi WU: tối đa 3 file, tối đa nửa ngày, một commit. Tên file là gợi ý, planner chốt lại.

## Wave 1 — Database (song song được)

| WU | Việc | File | Quyết định |
|---|---|---|---|
| WU-1 | RPC báo cáo xuất âm theo mã: ngày (giờ VN), kho tùy chọn, XUAT + TRA_NCC đã ghi sổ, không hủy; kiểm vai trò quản lý | migration `bao_cao_xuat_am` + pgTAP | D-01..D-04, D-12 |
| WU-2 | RPC tồn theo nhóm / công đoạn: đếm mã tổng/còn/hết/âm/dưới định mức, gộp kho hoặc lọc kho; định nghĩa trạng thái khớp `/ton-kho` | migration `ton_theo_nhom` + pgTAP | D-05, D-06, D-08, D-12 |
| WU-3 | RPC nhịp bán: hôm nay và hôm qua — số phiếu XUAT, số dòng, số mã khác nhau | migration `nhip_ban` + pgTAP | D-09, D-10, D-12 |

## Wave 2 — [BLOCKING] đẩy lên cloud

| WU | Việc | File |
|---|---|---|
| WU-4 | `npm run db:push`, `npm run db:types`, `npm run db:test:linked` | `src/types/database.types.ts` |

## Wave 3 — Lớp dữ liệu & điều hướng (song song được)

| WU | Việc | File | Quyết định |
|---|---|---|---|
| WU-5 | Feature `dashboard`: mapper tiếng Anh, hàm gọi RPC, query key | `features/dashboard/types.ts`, `api/dashboard.api.ts`, `api/dashboard.keys.ts` | D-14 |
| WU-6 | Hooks TanStack Query cho ba khối (kho/ngày là tham số) | `features/dashboard/hooks/useDashboard.ts` | D-02, D-06 |
| WU-7 | Trang chủ theo vai trò: hàm thuần `homePathForRole` + redirect ở `/` + thêm `/` vào ma trận quyền | `features/dashboard/lib/home-path.ts`, `app/(app)/page.tsx`, `scripts/test-route-permissions.ts` | D-11, D-12 |

## Wave 4 — Giao diện (song song được)

| WU | Việc | File | Quyết định |
|---|---|---|---|
| WU-8 | Thẻ nhịp bán hôm nay/hôm qua | `components/sales-pace-card.tsx` | D-09 |
| WU-9 | Khối xuất âm: thẻ đếm theo lý do + bảng chi tiết + chọn ngày + trạng thái rỗng | `components/negative-stock-section.tsx`, `components/negative-stock-table.tsx` | D-01..D-04 |
| WU-10 | Khối tồn theo nhóm: hai tab, lọc kho, số bấm được → `/ton-kho` lọc sẵn | `components/stock-by-group-section.tsx`, `lib/stock-drilldown.ts` | D-05..D-08 |

## Wave 5 — Ghép & kiểm

| WU | Việc | File | Quyết định |
|---|---|---|---|
| WU-11 | Ghép ba khối vào `dashboard-view.tsx` theo thứ tự D-13, nút Làm mới; mở trình duyệt, xem console; đối chiếu một số đếm với số dòng `/ton-kho` | `components/dashboard-view.tsx`, `app/(app)/page.tsx` | D-13, D-14 |

**Tổng:** 11 WU, 5 wave.
