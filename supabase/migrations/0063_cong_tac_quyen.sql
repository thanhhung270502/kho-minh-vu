-- =============================================================================
-- 0063 — D-13/D-14/D-15: hai công tắc quyền THEO TỪNG NGƯỜI trên `nguoi_dung`:
--   xem_lich_su_kiotviet (D-13, xem tab/màn Lịch sử KiotViet) và
--   duyet_kiem_ke (D-14, duyệt phiên kiểm kê). Cả hai không theo vai_tro cứng —
--   quản lý bật/tắt riêng cho từng người ở Cài đặt → Người dùng.
--
-- QUYẾT ĐỊNH KỸ THUẬT (06-RESEARCH.md §Data Model mục 3):
-- Hai helper đọc THẲNG bảng nguoi_dung theo auth.uid(), KHÔNG đọc/ghi JWT claim —
-- khác `vai_tro_hien_tai()`/`kho_hien_tai()` (0026, đọc claim rồi đối chiếu bảng,
-- vì hai hàm đó lọc THEO TỪNG DÒNG trên bảng lớn ton_kho/kho_movement/chung_tu,
-- join bảng người dùng mỗi dòng sẽ chậm). Ở đây hai bảng bị chặn (luu_tru_*) chỉ
-- đọc, không lọc theo dòng, và duyet_phien_kiem_ke() gọi MỘT LẦN mỗi thao tác
-- duyệt — chi phí đọc một dòng nguoi_dung theo khóa chính là không đáng kể. Đổi
-- lại: CẢ nâng quyền lẫn hạ quyền có hiệu lực NGAY câu lệnh kế tiếp, không cần
-- chờ JWT làm mới (né đúng cảnh báo bẫy 6 CLAUDE.md mà D-15 nhắc trước).
--
-- D-15: `vai_tro = 'quan_ly' or <cột>` trong cả hai helper — quản lý luôn có cả
-- hai quyền dù chính họ tắt cột của mình, không ai tự khóa được mình.
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD lúc viết migration này (project phonzyruoalimgaovljm,
-- đọc bằng pg_get_functiondef qua kết nối trực tiếp Session pooler — vì phiên thực thi
-- này CÓ kết nối mạng, khác tiền lệ 05-01/05-02 "máy không có DB"; script xác nhận
-- KHÔNG dùng MCP execute_sql vì công cụ đó không có sẵn trong môi trường này):
--
--   CREATE OR REPLACE FUNCTION public.luu_ho_so_nguoi_dung(p_id uuid, p_ho_ten text,
--   p_ten_dang_nhap text, p_vai_tro vai_tro, p_kho_ids uuid[], p_phai_doi_mat_khau boolean)
--    RETURNS void
--    LANGUAGE plpgsql
--    SET search_path TO ''
--   AS $function$
--   begin
--     if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
--       raise exception 'Chỉ quản lý được sửa tài khoản' using errcode = '42501';
--     end if;
--     if p_vai_tro = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
--       raise exception 'Thủ kho phải được gán ít nhất một kho' using errcode = '23514';
--     end if;
--     insert into public.nguoi_dung (id, ho_ten, ten_dang_nhap, vai_tro, phai_doi_mat_khau)
--     values (p_id, p_ho_ten, p_ten_dang_nhap, p_vai_tro, p_phai_doi_mat_khau)
--     on conflict (id) do update set
--       ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
--       vai_tro = excluded.vai_tro, phai_doi_mat_khau = excluded.phai_doi_mat_khau;
--     delete from public.nguoi_dung_kho
--     where nguoi_dung_id = p_id
--       and (p_vai_tro <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
--     if p_vai_tro = 'thu_kho' then
--       insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
--       select p_id, unnest(p_kho_ids) on conflict do nothing;
--     end if;
--   end $function$
--
-- KHỚP HOÀN TOÀN với supabase/migrations/0026_nguoi_dung_nhieu_kho.sql trong git (không
-- lệch cloud, khác tình huống 0059→0062). Cột nguoi_dung hiện có (information_schema,
-- cùng kết nối): id, ho_ten, vai_tro (default 'chi_xem'), kho_id, dang_hoat_dong
-- (default true), created_at, updated_at, phai_doi_mat_khau (default false),
-- ten_dang_nhap — chưa có xem_lich_su_kiotviet/duyet_kiem_ke.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hai cột công tắc — mặc định false, quản lý luôn override bằng vai_tro (D-15).
-- -----------------------------------------------------------------------------
alter table public.nguoi_dung
  add column xem_lich_su_kiotviet boolean not null default false,
  add column duyet_kiem_ke boolean not null default false;

comment on column public.nguoi_dung.xem_lich_su_kiotviet is
  'D-13: công tắc theo từng người, quản lý bật/tắt ở Cài đặt → Người dùng. Xem
   public.xem_duoc_lich_su_kiotviet() — quan_ly luôn true dù cột này false (D-15).';
comment on column public.nguoi_dung.duyet_kiem_ke is
  'D-14: công tắc theo từng người, quản lý bật/tắt. Xem
   public.duyet_duoc_kiem_ke() — quan_ly luôn true dù cột này false (D-15).';

-- -----------------------------------------------------------------------------
-- 2. Backfill có chủ đích (Claude's Discretion, xác nhận ở 06-CONTEXT.md
--    "Xác nhận sau khi lập kế hoạch"): giữ nguyên quyền văn phòng đang có theo
--    policy 0016 (hiện cho quan_ly + van_phong đọc luu_tru_*) để không ai mất
--    quyền tra cứu ngay ngày đổi migration — từ nay quản lý tắt được TỪNG người.
--    Không backfill duyet_kiem_ke (D-14 là quyền mới, mặc định đóng cho tất cả
--    trừ quan_ly).
-- -----------------------------------------------------------------------------
update public.nguoi_dung set xem_lich_su_kiotviet = true where vai_tro = 'van_phong';

-- -----------------------------------------------------------------------------
-- 3. Hai helper SECURITY DEFINER — đọc bảng, không đọc JWT claim (xem lý do ở
--    đầu file). set search_path = '' + qualify mọi object (bẫy 5 pattern RLS).
-- -----------------------------------------------------------------------------
create or replace function public.xem_duoc_lich_su_kiotviet()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select vai_tro = 'quan_ly' or xem_lich_su_kiotviet
     from public.nguoi_dung where id = (select auth.uid()) and dang_hoat_dong),
    false);
$$;
comment on function public.xem_duoc_lich_su_kiotviet() is
  'D-13. Đọc thẳng nguoi_dung theo auth.uid() (không qua JWT claim) nên cả bật lẫn
   tắt có hiệu lực NGAY câu lệnh kế tiếp, không cần chờ token mới. quan_ly luôn
   true (D-15). Người dùng bị vô hiệu hóa (dang_hoat_dong=false) luôn false.';

create or replace function public.duyet_duoc_kiem_ke()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select vai_tro = 'quan_ly' or duyet_kiem_ke
     from public.nguoi_dung where id = (select auth.uid()) and dang_hoat_dong),
    false);
$$;
comment on function public.duyet_duoc_kiem_ke() is
  'D-14. Cùng cơ chế xem_duoc_lich_su_kiotviet() — đọc bảng, có hiệu lực ngay,
   quan_ly luôn true (D-15).';

revoke all    on function public.xem_duoc_lich_su_kiotviet() from public, anon;
revoke all    on function public.duyet_duoc_kiem_ke()        from public, anon;
grant execute on function public.xem_duoc_lich_su_kiotviet() to authenticated;
grant execute on function public.duyet_duoc_kiem_ke()        to authenticated;

-- -----------------------------------------------------------------------------
-- 4. luu_ho_so_nguoi_dung: thêm 2 tham số cuối, default null = "giữ nguyên".
--    Lý do NULL mặc định: app production (src/features/settings/actions/user.actions.ts)
--    đang gọi 6 tham số đặt tên qua PostgREST. Sau khi đẩy migration này mà
--    frontend CHƯA deploy bản mới thì lời gọi cũ vẫn chạy nguyên — coalesce(p, cột
--    cũ) giữ giá trị hiện có thay vì reset về false (T-06-05, pgTAP A7).
--    Giữ nguyên KHÔNG security definer như 0026 — hàm chạy dưới RLS "quan ly sua
--    nguoi dung", tự kiểm vai_tro_hien_tai() = 'quan_ly' trong thân hàm.
-- -----------------------------------------------------------------------------
drop function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean);

create function public.luu_ho_so_nguoi_dung(
  p_id uuid, p_ho_ten text, p_ten_dang_nhap text, p_vai_tro public.vai_tro,
  p_kho_ids uuid[], p_phai_doi_mat_khau boolean,
  p_xem_lich_su_kiotviet boolean default null, p_duyet_kiem_ke boolean default null
) returns void language plpgsql set search_path = '' as $$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được sửa tài khoản' using errcode = '42501';
  end if;
  if p_vai_tro = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
    raise exception 'Thủ kho phải được gán ít nhất một kho' using errcode = '23514';
  end if;
  insert into public.nguoi_dung (
    id, ho_ten, ten_dang_nhap, vai_tro, phai_doi_mat_khau,
    xem_lich_su_kiotviet, duyet_kiem_ke
  )
  values (
    p_id, p_ho_ten, p_ten_dang_nhap, p_vai_tro, p_phai_doi_mat_khau,
    coalesce(p_xem_lich_su_kiotviet, false), coalesce(p_duyet_kiem_ke, false)
  )
  on conflict (id) do update set
    ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
    vai_tro = excluded.vai_tro, phai_doi_mat_khau = excluded.phai_doi_mat_khau,
    xem_lich_su_kiotviet = coalesce(p_xem_lich_su_kiotviet, public.nguoi_dung.xem_lich_su_kiotviet),
    duyet_kiem_ke = coalesce(p_duyet_kiem_ke, public.nguoi_dung.duyet_kiem_ke);
  -- Chỉ thủ kho gắn kho; vai trò khác thấy mọi kho nên xóa gán kho.
  delete from public.nguoi_dung_kho
  where nguoi_dung_id = p_id
    and (p_vai_tro <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
  if p_vai_tro = 'thu_kho' then
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select p_id, unnest(p_kho_ids) on conflict do nothing;
  end if;
end $$;
revoke all    on function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean, boolean, boolean) from public, anon;
grant execute on function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean, boolean, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Không đổi custom_access_token_hook, không thêm claim JWT (D-15 không cần —
--    helper đọc bảng, không có claim nào để làm mới).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (mẫu lấy từ 0026).
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(tablename, ', ') into v_thieu
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if v_thieu is not null then
    raise exception 'Còn bảng chưa bật RLS: %', v_thieu;
  end if;
end $$;
