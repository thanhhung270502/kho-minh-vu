-- =============================================================================
-- 0022 — Sửa tìm kiếm: gõ vài ký tự phải ra kết quả
--
-- LỖI: toán tử `%` của pg_trgm đo độ giống TOÀN CHUỖI. Gõ "bac dan" (7 ký tự)
-- tìm trong "SMOKE-001 Bac dan kiem thu" (26 ký tự) cho similarity ~0.2, dưới
-- ngưỡng mặc định 0.3, nên trả về RỖNG. Tìm cả cụm thì ra.
--
-- Nhưng cách người ta dùng ô tìm mã là gõ vài ký tự, không gõ cả tên. Tài liệu
-- thiết kế gọi ô này là "chỗ tiết kiệm thời gian lớn nhất của cả hệ thống" —
-- hỏng đúng ở ca dùng chính.
--
-- ĐÍNH CHÍNH comment ở migration 0013: câu "KHÔNG thay bằng ILIKE vì ILIKE
-- không dùng được index này" là SAI. gin_trgm_ops tăng tốc được cả LIKE/ILIKE
-- (pg_trgm docs: "a GIN index can be used for very fast searches with LIKE and
-- ILIKE"). Đó chính là toán tử đúng cho tìm chuỗi con.
--
-- CÁCH SỬA — hai nhánh, cả hai đều dùng được index GIN:
--   1. ILIKE '%tu khoa%'  → khớp chuỗi con, ca dùng chính
--   2. <% (word_similarity) → chịu được gõ sai chính tả
--
-- Sắp xếp vẫn ưu tiên mã phát sinh gần đây trước, rồi tới độ khớp.
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
    and coalesce(trim(p_tu_khoa), '') <> ''
    and (
      -- Nhánh 1: chuỗi con. Index GIN trigram tăng tốc được ILIKE.
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
        ilike '%' || public.f_unaccent(p_tu_khoa) || '%'
      -- Nhánh 2: gần đúng, chịu được gõ sai. word_similarity so từ khóa với
      -- đoạn khớp nhất trong chuỗi đích, không so với toàn chuỗi như `%`.
      or public.f_unaccent(p_tu_khoa)
         operator(extensions.<%)
         public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
    )
  order by
    sp.lan_phat_sinh_cuoi desc nulls last,
    extensions.word_similarity(
      public.f_unaccent(p_tu_khoa),
      public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
    ) desc
  limit p_gioi_han;
$$;

revoke all    on function public.tim_san_pham(text, int) from public, anon;
grant execute on function public.tim_san_pham(text, int) to authenticated;

comment on function public.tim_san_pham(text, int) is
  'Tìm theo mã và tên, không phân biệt dấu. Hai nhánh: ILIKE cho chuỗi con (ca dùng chính) và word_similarity cho gõ sai. Cả hai dùng index idx_san_pham_tim_kiem. Xếp mã phát sinh gần đây lên trước.';
