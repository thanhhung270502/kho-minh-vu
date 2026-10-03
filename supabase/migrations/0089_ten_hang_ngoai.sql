-- =============================================================================
-- 0089 — Đổi tên hiển thị công đoạn "Mua ngoài" → "Hàng ngoài" (TEN-04, Phase 17).
--
-- Chỉ dữ liệu: mã MUA_NGOAI giữ nguyên vì code dùng nó như hằng số (gợi ý
-- công đoạn, import KiotViet, phân tích). Mọi màn và file xuất đọc
-- cong_doan.ten nên một UPDATE đổi được tất cả. Import Excel ghi "Mua ngoài"
-- vẫn khớp: khop_danh_muc (0034) so cả mã có dấu cách ("MUA NGOAI").
--
-- Điều kiện ten = 'Mua ngoài': nếu văn phòng đã tự đổi tên ở Danh mục phụ thì
-- giữ tên họ chọn. Chạy lại nhiều lần vô hại; không đụng schema nên không cần
-- sinh lại database.types.ts.
-- =============================================================================
update public.cong_doan
   set ten = 'Hàng ngoài'
 where ma = 'MUA_NGOAI'
   and ten = 'Mua ngoài';
