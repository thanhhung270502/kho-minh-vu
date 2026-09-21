-- =============================================================================
-- 0060 — Đề xuất & duyệt định mức tồn tối thiểu (TQAN-02, D-04)
--
-- Đau thứ hai người dùng tự nêu: "hết hàng mới biết". Bộ lọc "dưới định mức" đã
-- có sẵn ở danh_sach_san_pham (0030, p_trang_thai_ton = 'duoi_dinh_muc') nhưng
-- luôn rỗng vì 0/3.266 mã có ton_toi_thieu > 0. Không ai ngồi gõ 3.266 dòng, nên
-- hệ tự đề xuất định mức từ lịch sử bán KiotViet (luu_tru_hoa_don_kiotviet, hiện
-- 10 ngày 03/09→12/09/2026, chạm 1.223/3.266 mã) rồi để người duyệt bấm áp dụng —
-- đúng khuôn "hệ đề xuất — người duyệt" đã có ở 0035 (goi_y_cong_doan_theo_duoi /
-- ap_dung_goi_y_cong_doan).
--
-- de_xuat_dinh_muc: CHỈ ĐỌC, không ghi gì — trả kèm căn cứ (so_ngay_du_lieu,
-- so_lan_ban, nguon_de_xuat) để người duyệt biết con số nào đáng tin (D-04).
-- dat_dinh_muc: CHỈ GHI, nhận uuid[] — con số tính lại từ chính de_xuat_dinh_muc
-- ngay ở server, client không có đường đẩy một ton_toi_thieu tùy ý vào danh mục.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dat_dinh_muc ghi vào san_pham.ton_toi_thieu → trigger nhật ký 0027 chèn một
-- dòng nhat_ky_sua với nguon = 'dinh_muc'. Giá trị này chưa nằm trong ràng buộc
-- nhat_ky_sua_nguon_check → phải drop/add với DANH SÁCH ĐẦY ĐỦ (tiền lệ 0044).
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD, đọc từ cloud lúc 2026-09-21 09:24 UTC (database
-- kho-vu-tru, phonzyruoalimgaovljm) qua Supabase MCP của phiên điều phối, bằng:
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'nhat_ky_sua_nguon_check';
-- Migration mới nhất trên database lúc đọc: 0057 (khớp repo, không trôi).
--
-- NGUYÊN VĂN pg_get_constraintdef ĐỌC ĐƯỢC (chưa sửa gì, dán y nguyên):
--
-- CHECK ((nguon = ANY (ARRAY['form'::text, 'sua_o'::text, 'hang_loat'::text, 'goi_y_duoi'::text, 'import'::text, 'ra_ghi_chu'::text, 'cai_dat'::text, 'script'::text, 'gia_von_dau_ky'::text])))
--
-- Chín giá trị, khớp hoàn toàn với 0044 trong repo — Phase 4 không thêm giá trị
-- nào (xác nhận trong 05-LIVE-DEFS.md, mục "Cho plan 05-03"). Danh sách dưới đây
-- lấy nguyên từ đó, cộng đúng một giá trị mới 'dinh_muc'.
-- -----------------------------------------------------------------------------

alter table public.nhat_ky_sua drop constraint nhat_ky_sua_nguon_check;
alter table public.nhat_ky_sua add constraint nhat_ky_sua_nguon_check
  check (nguon in (
    'form', 'sua_o', 'hang_loat', 'goi_y_duoi', 'import', 'ra_ghi_chu', 'cai_dat',
    'script', 'gia_von_dau_ky', 'dinh_muc'
  ));
