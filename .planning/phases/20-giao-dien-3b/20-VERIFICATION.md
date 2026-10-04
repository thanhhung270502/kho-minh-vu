---
phase: 20-giao-dien-3b
verified: 2026-10-04T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 20: Giao diện 3b — Verification Report

**Goal:** Toàn app mang design system 3b; bốn màn (Tổng quan, Đơn đặt list+chi tiết, Chi tiết hàng hóa) có đủ tính năng design thể hiện.
**Status:** passed (browser UAT đã được người dùng xác nhận "đạt")

## Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Design system 3b toàn app, mobile giữ tab đáy | VERIFIED | Manrope trong `src/app/layout.tsx`; header 2 tầng ở `(app)/layout.tsx`; UAT bước 1 (1440/1024/375) |
| 2 | Ô tìm toàn cục ⌘K, Enter mở chi tiết, tôn trọng RLS | VERIFIED (một phần chỉ qua test DB) | `features/global-search/*` (metaKey/ctrlKey), gắn vào `(app)/layout.tsx`; RPC `tim_kiem_toan_cuc` SECURITY INVOKER (0092) nên RLS áp dụng; pgTAP 110. UAT chưa thử số phiếu/đối tác/cô lập kho bằng thukho1 |
| 3 | Tổng quan: 4 KPI + xu hướng, Nhập–Xuất 7/30/90N, Tồn theo nhóm, Cần xử lý, Không luân chuyển, Nhịp bán/Xuất âm còn | VERIFIED | 0093: `tong_quan_chi_so`, `nhap_xuat_theo_ngay`, `khong_luan_chuyen`, `ton_theo_nhom`, đều `co_quyen('xem_dashboard')` ở dòng đầu; gia_tri_ton null khi không có `co_quyen_xem_gia_von()`; nối qua `dashboard.api.ts`; pgTAP 111/93; UAT bước 3 |
| 4 | Danh sách đơn: đếm trạng thái, preset ngày, Tiến độ, Xuất Excel | VERIFIED | `dem_don_theo_trang_thai` (0094) gọi ở `order.api.ts`; component `order-status-filter`, `date-range-filter`, `order-progress-bar`, `order-excel-button`; route `/api/don-dat/xuat-excel` có trong ma trận quyền; UAT bước 5 |
| 5 | Chi tiết đơn hai cột, cộng dồn khi gõ lại mã | VERIFIED | `order-aside.tsx`, `order-detail.tsx`; RPC `them_dong_don` (invoker + `co_quyen('tao_don')`) nối ở `order.api.ts`; pgTAP 113; UAT bước 6 |
| 6 | Chi tiết hàng: badge + Ngừng/Mở lại KD, bảng Tồn theo kho (Giá trị theo quyền), ảnh ở aside | VERIFIED | `product-detail-header.tsx` (chip + nút), `warehouse-stock-table.tsx` nhận `canViewCost`, `product-image-aside.tsx`, ghép trong `product-detail.tsx`; UAT bước 7 |

## Requirements Coverage

| ID | Plans | Status |
|---|---|---|
| UI3B-01 | 20-04, 07, 16 | SATISFIED |
| UI3B-02 | 20-01, 09, 16 | SATISFIED |
| UI3B-03 | 20-02, 09-class dashboard plans, 16 | SATISFIED |
| UI3B-04 | 20-02, 16 | SATISFIED |
| UI3B-05 | 20-03, order list plans, 16 | SATISFIED |
| UI3B-06 | 20-03, order detail plan, 16 | SATISFIED |
| UI3B-07 | 20-05, 08, 16 | SATISFIED |

Cả 7 ID đều xuất hiện trong frontmatter PLAN và khớp REQUIREMENTS.md. Không có ID mồ côi. Lưu ý: REQUIREMENTS.md vẫn đánh `[ ]`/"Pending" cho UI3B-01..07, cần cập nhật khi đóng phase.

## Anti-patterns / Project rules
- Không `select("*")`/`.select()` trống trên `san_pham`/`kho_movement` trong các feature đã quét (chỉ có comment cảnh báo ở `product.api.ts`).
- Giá vốn không lộ khi thiếu quyền: tính trong RPC DB, null khi không `co_quyen_xem_gia_von()`; UI bảng tồn theo cờ `canViewCost`.
- Không phát hiện TODO/stub blocker.

## Spot-checks
npm run check, pgTAP 54 file/904 test, test-pure-functions: PASS (do orchestrator chạy). Ma trận route 8/272 lệch, giống hệt trên main, không thuộc phase này.

## Ghi chú không chặn (theo SUMMARY 20-16)
- "Ghi sổ →" ở panel Cần xử lý chỉ mở phiếu NHẬP dù đếm cả phiếu xuất chờ ghi sổ (người dùng chấp nhận).
- "Không luân chuyển" đo theo `lan_phat_sinh_cuoi` (D-05), rỗng trên dữ liệu local.
- Migration 0092–0094 mới ở local; deploy cloud phải hỏi người dùng.
- Tìm theo số phiếu/số đơn/đối tác và cô lập kho với thukho1 chưa được thử tay (có pgTAP phủ).

---
_Verifier: Claude (gsd-verifier)_
