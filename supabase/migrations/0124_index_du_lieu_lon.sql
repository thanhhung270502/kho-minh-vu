-- =============================================================================
-- 0124 — Index cho dữ liệu phình theo thời gian (Phase 22, Wave 1 của 22-AUDIT.md).
-- Chỉ thêm/bỏ index: không đổi dữ liệu, không đổi hàm, không đổi type.
--
-- KHÔNG dùng CREATE INDEX CONCURRENTLY: migration Supabase chạy trong transaction (D-15).
-- Deploy cloud: đo 09/10/2026 trên phonzy các bảng còn < 100k dòng (kho_movement 54.830,
-- chung_tu 9.845, chung_tu_dong 53.929) nên khóa SHARE lúc dựng index chỉ vài giây —
-- vẫn nên chạy ngoài giờ văn phòng. Khi bảng đã lên hàng triệu dòng: tách từng
-- index ra chạy CONCURRENTLY bằng tay rồi mới đánh dấu migration đã áp.
-- =============================================================================

-- 1. Khóa ngoại thiếu index. Xóa một dòng chung_tu_dong chạy câu kiểm khóa ngoại
--    trên kho_movement.chung_tu_dong_id — chưa có index là quét cả sổ cái (rủi ro #12).
create index if not exists idx_movement_chung_tu_dong
  on public.kho_movement (chung_tu_dong_id) where chung_tu_dong_id is not null;
create index if not exists idx_chung_tu_goc
  on public.chung_tu (chung_tu_goc_id) where chung_tu_goc_id is not null;
create index if not exists idx_de_nghi_gop_ma_chung_tu
  on public.de_nghi_gop_ma (chung_tu_id) where chung_tu_id is not null;

-- 2. Lọc theo ngày / thời điểm (dashboard, kỳ phân tích, hoạt động gần đây, đơn đặt).
create index if not exists idx_movement_ngay on public.kho_movement (ngay);
create index if not exists idx_chung_tu_created_at on public.chung_tu (created_at);
create index if not exists idx_chung_tu_ngay_ghi_so
  on public.chung_tu (ngay_ghi_so) where ngay_ghi_so is not null;
create index if not exists idx_ddh_ngay on public.don_dat_hang (ngay_dh desc, so_dh desc);
create index if not exists idx_nhat_ky_sua_bang_sua_luc on public.nhat_ky_sua (bang, sua_luc desc);

-- 3. danh_sach_chung_tu sắp theo ngay_ct desc, so_ct desc — index khớp đủ thứ tự,
--    thay idx_chung_tu_loai_ngay (cùng tiền tố, nên bỏ index cũ).
create index if not exists idx_chung_tu_loai_ngay_so on public.chung_tu (loai_ct, ngay_ct desc, so_ct desc);
drop index if exists public.idx_chung_tu_loai_ngay;

-- 4. Tìm theo số phiếu / số đơn (⌘K tim_kiem_toan_cuc, ô tìm danh sách): ilike '%x%'.
create index if not exists idx_chung_tu_so_ct_trgm on public.chung_tu using gin (so_ct extensions.gin_trgm_ops);
create index if not exists idx_ddh_so_dh_trgm on public.don_dat_hang using gin (so_dh extensions.gin_trgm_ops);

-- 5. Index chết: nguoi_nhan_id cấp đầu đơn/đầu phiếu thôi dùng từ 0090 (người nhận ở
--    bảng nối + cột trên dòng). Đã kiểm 09/10/2026: không hàm nào trong schema public đọc
--    cột này trên don_dat_hang / chung_tu (mọi tham chiếu là bảng nối hoặc bảng dòng),
--    không policy, không view, không chỗ nào trong src/ lọc theo cột đầu. Cột vẫn giữ
--    (dữ liệu cũ, khóa ngoại) — chỉ bỏ index.
drop index if exists public.idx_ddh_nguoi_nhan;
drop index if exists public.idx_chung_tu_nguoi_nhan;
