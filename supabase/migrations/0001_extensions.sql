-- =============================================================================
-- 0001 — Extension và hàm dùng chung
--
-- Quy ước tên file migration cho TOÀN DỰ ÁN: NNNN_ten_khong_dau.sql
-- Bốn chữ số, tăng dần. Supabase CLI parse phần số làm version để sắp thứ tự.
-- KHÔNG dùng `supabase migration new` (sinh timestamp 14 chữ số) để tránh trộn
-- hai kiểu đánh số trong cùng thư mục.
-- =============================================================================

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists unaccent    with schema extensions;
create extension if not exists pg_trgm     with schema extensions;
create extension if not exists pgcrypto    with schema extensions;

-- KHÔNG tạo pg_cron ở đây. Nó không đáng tin trên stack local và cần cấu hình
-- shared_preload_libraries. Xử lý riêng ở 0015 với nhánh dự phòng.

-- -----------------------------------------------------------------------------
-- f_unaccent — bỏ dấu tiếng Việt, dùng được trong biểu thức index.
--
-- BẮT BUỘC dùng dạng 2 tham số. Dạng 1 tham số `unaccent(text)` phụ thuộc
-- search_path để tìm dictionary mặc định, nên đánh dấu nó IMMUTABLE là nói dối:
-- đổi search_path có thể cho kết quả khác, và index dựng trên đó sẽ sai âm thầm.
-- Chỉ định thẳng dictionary bằng regdictionary thì hàm mới thật sự bất biến.
-- -----------------------------------------------------------------------------
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

comment on function public.f_unaccent(text) is
  'Bỏ dấu tiếng Việt. IMMUTABLE nên dùng được trong biểu thức index (xem 0005).';

-- -----------------------------------------------------------------------------
-- update_updated_at — trigger dùng chung cho mọi bảng có cột updated_at.
-- Định nghĩa một lần ở đây, không lặp lại trong từng migration.
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
