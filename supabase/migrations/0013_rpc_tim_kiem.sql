-- =============================================================================
-- 0013 — Tìm sản phẩm không dấu, ưu tiên mã phát sinh gần đây
--
-- Ô tìm mã hàng là chỗ tiết kiệm thời gian lớn nhất của cả hệ thống:
-- 3.266 mã nhưng chỉ 1.223 mã luân chuyển trong 10 ngày, nên thứ tự ưu tiên
-- quan trọng ngang việc tìm đúng.
-- =============================================================================

create or replace function public.tim_san_pham(
  p_tu_khoa text,
  p_gioi_han int default 20
)
returns setof public.san_pham
language sql
stable
as $$
  select sp.*
  from public.san_pham sp
  where sp.dang_kinh_doanh
    -- Biểu thức này phải khớp TỪNG KÝ TỰ với biểu thức index ở 0005.
    -- Sai thứ tự cột, thiếu coalesce, hay thiếu dấu cách đều làm planner
    -- không nhận ra và chuyển sang Seq Scan.
    --
    -- % là toán tử trigram similarity (ngưỡng mặc định 0.3), dùng được index
    -- GIN. KHÔNG thay bằng ILIKE '%...%' — ILIKE không dùng được index này.
    and public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
        % public.f_unaccent(p_tu_khoa)
  order by
    -- Mã vừa phát sinh quan trọng hơn mã khớp sát chữ.
    -- nulls last đẩy 2.043 mã chưa từng luân chuyển xuống cuối.
    sp.lan_phat_sinh_cuoi desc nulls last,
    similarity(
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')),
      public.f_unaccent(p_tu_khoa)
    ) desc
  limit p_gioi_han;
$$;

-- SECURITY INVOKER (mặc định) là cố ý: hàm này phải tôn trọng RLS trên san_pham,
-- khác với ghi_so_chung_tu vốn cần DEFINER để ghi vào bảng client không có quyền.
grant execute on function public.tim_san_pham(text, int) to authenticated;
