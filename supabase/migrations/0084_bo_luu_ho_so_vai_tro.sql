-- =============================================================================
-- 0084 — Bỏ luu_ho_so_nguoi_dung (theo vai trò). Màn Người dùng chuyển sang
-- chọn chức vụ và gọi luu_nguoi_dung (0082). Không còn chỗ nào gán vai trò trực
-- tiếp từ giao diện — vai trò luôn suy từ phạm vi của chức vụ.
-- =============================================================================
drop function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean, boolean, boolean);
