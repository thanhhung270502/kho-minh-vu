-- =============================================================================
-- 0021 — Sửa tim_san_pham hỏng sau khi khóa search_path ở 0020
--
-- LỖI: migration 0020 thêm `set search_path = ''` vào tim_san_pham để vá cảnh
-- báo bảo mật. Nhưng toán tử `%` (trigram similarity) và hàm `similarity()`
-- thuộc extension pg_trgm nằm ở schema `extensions` — với search_path rỗng,
-- Postgres không phân giải được chúng:
--
--   ERROR 42883: operator does not exist: text % text
--
-- Tìm kiếm hỏng hoàn toàn, và lỗi chỉ lộ ra khi GỌI hàm chứ không phải lúc
-- tạo hàm — `create function` với language sql chỉ kiểm cú pháp ở lần chạy đầu.
--
-- CÁCH SỬA: chỉ định schema tường minh cho cả toán tử, không chỉ cho hàm.
-- Cú pháp qualify toán tử là `operator(schema.toantu)`.
--
-- Giữ nguyên `search_path = ''` thay vì nới thành `'extensions'`: qualify tường
-- minh chặt hơn và không phụ thuộc thứ tự schema.
--
-- BÀI HỌC: khóa search_path an toàn hơn, nhưng phải qualify MỌI thứ — kể cả
-- toán tử, thứ dễ quên nhất vì trông không giống lời gọi hàm.
-- =============================================================================

create or replace function public.tim_san_pham(
  p_tu_khoa text,
  p_gioi_han int default 20
)
returns setof public.san_pham
language sql
stable
set search_path = ''
as $$
  select sp.*
  from public.san_pham sp
  where sp.dang_kinh_doanh
    -- Biểu thức này phải khớp TỪNG KÝ TỰ với biểu thức index ở 0005,
    -- nếu không planner bỏ index và chuyển sang Seq Scan.
    and public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
        operator(extensions.%) public.f_unaccent(p_tu_khoa)
  order by
    -- Mã vừa phát sinh quan trọng hơn mã khớp sát chữ.
    -- nulls last đẩy các mã chưa từng luân chuyển xuống cuối.
    sp.lan_phat_sinh_cuoi desc nulls last,
    extensions.similarity(
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')),
      public.f_unaccent(p_tu_khoa)
    ) desc
  limit p_gioi_han;
$$;

revoke all    on function public.tim_san_pham(text, int) from public, anon;
grant execute on function public.tim_san_pham(text, int) to authenticated;
