-- =============================================================================
-- 0029 — D-16: ẩn giá vốn khỏi SELECT trực tiếp, chỉ đọc qua RPC theo vai trò
--
-- SỬA SAI TRONG RESEARCH (đã kiểm trên cloud trước khi viết file này):
-- `authenticated` đang có SELECT cấp Ở MỨC BẢNG trên san_pham và kho_movement
-- (kiểm bằng information_schema.role_table_grants). REVOKE một cột KHÔNG gỡ
-- được quyền cấp ở mức bảng — "the table-level grant is unaffected by a
-- column-level operation" (Postgres docs GRANT). Vì vậy phải REVOKE SELECT
-- Ở MỨC BẢNG rồi GRANT lại từng cột trừ cột giá — đúng mẫu 0015 đã làm cho
-- INSERT/UPDATE (gia_ban/gia_von).
--
-- KIỂM KÊ TRƯỚC KHI VIẾT (Bước 0, ghi lại kết quả cho SUMMARY):
--   - san_pham có 20 cột (kể cả kho_mac_dinh_id thêm ở 0025); kho_movement có 10.
--   - Duy nhất `tim_san_pham` (0022) là hàm SECURITY INVOKER đọc `sp.*` (ngầm
--     chọn cả gia_von) — mọi hàm khác đọc san_pham.gia_von /
--     kho_movement.gia_von_tai_thoi_diem đều là SECURITY DEFINER
--     (_ghi_so_*/ghi_so_chung_tu/huy_chung_tu ở 0011-0012, nap_danh_muc_kiotviet
--     ở 0024-0025, ghi_nhat_ky_sua ở 0027) nên chạy dưới quyền owner, không bị
--     ảnh hưởng bởi REVOKE cột.
--   - v_doi_chieu_ton (security_invoker=on, 0020) chỉ đọc kho_id/san_pham_id/
--     so_luong của kho_movement — không đụng gia_von_tai_thoi_diem, không vỡ.
--     Bản thân doi_chieu_ton() cũng là SECURITY DEFINER nên bên trong nó,
--     "invoker" của view chính là owner hàm — không phụ thuộc quyền cột của
--     authenticated.
--   - `select 1 from san_pham` / `count(*) from san_pham` KHÔNG cần bất kỳ
--     quyền cột nào (đã verify bằng transaction rollback trên cloud) — chỉ
--     truy vấn có tham chiếu CỘT CỤ THỂ mới bị kiểm quyền cột. Vì vậy các test
--     pgTAP hiện có dùng `select 1 from ...`/`count(*)` không cần sửa.
--
-- HỆ QUẢ PHẢI BIẾT CHO MỌI PLAN GIAO DIỆN SAU:
--   `.from('san_pham').select('*')` và `.select()` trống sau insert/update
--   (return=representation) lỗi 42501 cho MỌI vai trò. Luôn liệt kê cột tường
--   minh, không có `gia_von`. Cột mới thêm vào san_pham/kho_movement sau này
--   phải tự `grant select (<cột>)` — khối tự kiểm cuối file bắt lỗi quên.
-- =============================================================================

-- san_pham: thu quyền đọc mức bảng, cấp lại từng cột TRỪ gia_von.
revoke select on public.san_pham from anon, authenticated;
grant select (
  id, ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id, quy_doi,
  gia_ban, ton_toi_thieu, ton_toi_da, hinh_anh_url, vi_tri_ke, dang_kinh_doanh,
  ghi_chu, lan_phat_sinh_cuoi, created_at, updated_at, kho_mac_dinh_id
) on public.san_pham to authenticated;

-- kho_movement: tương tự, trừ gia_von_tai_thoi_diem.
revoke select on public.kho_movement from anon, authenticated;
grant select (
  id, ngay, kho_id, san_pham_id, so_luong, chung_tu_id, chung_tu_dong_id,
  la_but_toan_dao, created_at
) on public.kho_movement to authenticated;

-- -----------------------------------------------------------------------------
-- Đường duy nhất để đọc giá vốn: RPC SECURITY DEFINER tự kiểm vai trò.
-- -----------------------------------------------------------------------------
create or replace function public.co_quyen_xem_gia_von()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.vai_tro_hien_tai())::text in ('quan_ly','van_phong'), false);
$$;
revoke all    on function public.co_quyen_xem_gia_von() from public, anon;
grant execute on function public.co_quyen_xem_gia_von() to authenticated;

create or replace function public.gia_von_san_pham(p_ids uuid[])
returns table (san_pham_id uuid, gia_von numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.co_quyen_xem_gia_von()) then
    raise exception 'Chỉ quản lý và văn phòng xem được giá vốn' using errcode = '42501';
  end if;
  return query select sp.id, sp.gia_von from public.san_pham sp where sp.id = any(p_ids);
end
$$;
revoke all    on function public.gia_von_san_pham(uuid[]) from public, anon;
grant execute on function public.gia_von_san_pham(uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- tim_san_pham (0022): đổi kiểu trả về từ `setof san_pham` (ngầm chọn cả
-- gia_von) sang danh sách cột tường minh. Đổi kiểu trả về bắt buộc DROP rồi
-- tạo lại — CREATE OR REPLACE không cho đổi kiểu trả về.
--
-- Mệnh đề where/order by GIỮ NGUYÊN TỪNG KÝ TỰ so với 0022 — đây không phải
-- lần sửa logic tìm kiếm, chỉ sửa danh sách cột trả về.
-- -----------------------------------------------------------------------------
drop function public.tim_san_pham(text, int);

create function public.tim_san_pham(
  p_tu_khoa text,
  p_gioi_han int default 20
)
returns table (
  id uuid, ma_hang text, ten_hang text, barcode text, nhom_hang_id uuid, dvt_id uuid,
  cong_doan_id uuid, quy_doi numeric, gia_ban numeric, dang_kinh_doanh boolean,
  kho_mac_dinh_id uuid, lan_phat_sinh_cuoi timestamptz
)
language sql
stable
set search_path = ''
as $$
  select sp.id, sp.ma_hang, sp.ten_hang, sp.barcode, sp.nhom_hang_id, sp.dvt_id,
         sp.cong_doan_id, sp.quy_doi, sp.gia_ban, sp.dang_kinh_doanh,
         sp.kho_mac_dinh_id, sp.lan_phat_sinh_cuoi
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
  'Tìm theo mã và tên, không phân biệt dấu. Hai nhánh: ILIKE cho chuỗi con (ca dùng chính) và word_similarity cho gõ sai. Cả hai dùng index idx_san_pham_tim_kiem. Xếp mã phát sinh gần đây lên trước. Không trả gia_von (0029) — trả danh sách cột tường minh, không phải setof san_pham.';

-- -----------------------------------------------------------------------------
-- Tự kiểm: authenticated có SELECT trên mọi cột san_pham/kho_movement TRỪ hai
-- cột giá vốn. Thêm cột mới mà quên grant sẽ làm push hỏng ngay ở đây.
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(c.column_name, ', ') into v_thieu
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'san_pham' and c.column_name <> 'gia_von'
    and not has_column_privilege('authenticated', 'public.san_pham', c.column_name, 'SELECT');
  if v_thieu is not null then
    raise exception 'authenticated thiếu quyền SELECT cột san_pham: %', v_thieu;
  end if;

  select string_agg(c.column_name, ', ') into v_thieu
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'kho_movement'
    and c.column_name <> 'gia_von_tai_thoi_diem'
    and not has_column_privilege('authenticated', 'public.kho_movement', c.column_name, 'SELECT');
  if v_thieu is not null then
    raise exception 'authenticated thiếu quyền SELECT cột kho_movement: %', v_thieu;
  end if;

  if has_column_privilege('authenticated', 'public.san_pham', 'gia_von', 'SELECT')
     or has_column_privilege('authenticated', 'public.kho_movement', 'gia_von_tai_thoi_diem', 'SELECT') then
    raise exception 'authenticated vẫn đọc được cột giá vốn';
  end if;
end $$;
