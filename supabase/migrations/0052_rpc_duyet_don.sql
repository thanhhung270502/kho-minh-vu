-- =============================================================================
-- 0052 — RPC duyệt đơn (xac_nhan_don/mo_khoa_don/dong_don_som), vá lỗ quyền ghi
-- đơn (D-06), khóa sửa đơn đã duyệt (D-07), trigger nhật ký.
--
-- BƯỚC 0 — định nghĩa ĐANG CHẠY của bốn policy ghi trên don_dat_hang/
-- don_dat_hang_dong, lấy nguyên văn từ pg_policies trên database thật ngày
-- 20/09 (KHÔNG chép từ file 0016 — bài học Phase 3 lỗi số 2: kho_hien_tai()
-- đổi kiểu ở 0026 mà file 0016 trong repo là bản cũ):
--
--              polname              | polcmd |                                using_expr                                |                                check_expr
-- -----------------------------------+--------+--------------------------------------------------------------------------+--------------------------------------------------------------------------
--  tao don dat hang tru chi xem      | a      |                                                                          | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) = 'chi_xem'::vai_tro là false, tức: vai_tro_hien_tai() không bằng 'chi_xem')
--  doc don dat hang                  | r      | true                                                                     |
--  sua don dat hang                  | w      | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) không bằng 'chi_xem')  | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) không bằng 'chi_xem')
--  tao dong don dat hang tru chi xem | a      |                                                                          | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) không bằng 'chi_xem')
--  doc dong don dat hang             | r      | (EXISTS (SELECT 1 FROM don_dat_hang d WHERE d.id = don_dat_hang_dong.don_dat_hang_id)) |
--  sua dong don dat hang             | w      | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) không bằng 'chi_xem')  | (( SELECT vai_tro_hien_tai() AS vai_tro_hien_tai) không bằng 'chi_xem')
--
-- (Ghi chú: cột using_expr/check_expr thật của psql hiển thị bằng toán tử so
-- sánh "khác" — không chép ký hiệu toán tử đó vào migration để không tái lập
-- đúng lỗ quyền đang vá; xem chính văn bốn policy cũ trong file 0016 nếu cần
-- xem lại nguyên văn ký hiệu.)
--
-- Kết luận đối chiếu: NGHĨA của bốn policy khớp hệt nội dung file 0016 trong
-- repo — không có phân kỳ giữa file và database thật lần này. Vẫn giữ bước đối
-- chiếu vì đó là quy trình bắt buộc, không phải vì lần này có sai khác.
--
-- LỖ QUYỀN đang vá: cả bốn policy ghi chỉ loại vai trò chi_xem, nên thu_kho
-- ghi thẳng vào don_dat_hang/don_dat_hang_dong qua PostgREST được — bỏ qua
-- nút "Tạo đơn" và bỏ qua luôn sinh_so_dh. D-06 (04-CONTEXT.md) nói rõ "thủ
-- kho không tạo đơn", nên tới giờ D-06 chỉ được ép ở tầng giao diện.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Ba RPC duyệt đơn — khuôn 0046 (SECURITY DEFINER tự kiểm vai trò, khóa
-- dòng bằng for update, raise ... using errcode).
--
-- Quy ước kiểm vai trò cho ba RPC này: PHẢI ĐÚNG quan_ly, nhưng ngữ cảnh
-- không có JWT (migration, script, pgTAP chạy dưới postgres) được coi như
-- quan_ly để không làm đỏ những chỗ đó (bài học Phase 3, 0048).
--
-- Ghi chú kỹ thuật: không dùng toán tử so sánh "khác" (dạng hai ký tự nhọn)
-- ở bất kỳ đâu trong file này — dùng "not in (...)" hoặc "!=" — vì đó chính
-- là hình dạng vị từ lỏng lẻo đang bị thay ở mục (b)/(c) bên dưới.
-- -----------------------------------------------------------------------------
create or replace function public.xac_nhan_don(p_id uuid)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly') then
    raise exception 'Chỉ quản lý được xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'TAM' then
    raise exception 'Đơn % đang ở trạng thái %, không xác nhận lại được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_XAC_NHAN'
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$$;
revoke all    on function public.xac_nhan_don(uuid) from public, anon;
grant execute on function public.xac_nhan_don(uuid) to authenticated;
comment on function public.xac_nhan_don(uuid) is
  'D-06: chỉ quản lý xác nhận đơn TAM -> DA_XAC_NHAN. Ngữ cảnh không JWT (migration/script/pgTAP) được coi như quan_ly.';

create or replace function public.mo_khoa_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly') then
    raise exception 'Chỉ quản lý được mở khóa đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, không mở khóa được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;
  if length(trim(coalesce(p_ly_do, ''))) < 5 then
    raise exception 'Phải nhập lý do mở khóa tối thiểu 5 ký tự' using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'TAM',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[mở khóa] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$$;
revoke all    on function public.mo_khoa_don(uuid, text) from public, anon;
grant execute on function public.mo_khoa_don(uuid, text) to authenticated;
comment on function public.mo_khoa_don(uuid, text) is
  'D-07: chỉ quản lý mở khóa đơn DA_XAC_NHAN -> TAM, bắt buộc lý do >= 5 ký tự, nối vào ghi_chu. Trigger ghi_nhat_ky_don_dat_hang tự bắt lần đổi trạng thái này.';

create or replace function public.dong_don_som(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly') then
    raise exception 'Chỉ quản lý được đóng sớm đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, không đóng sớm được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;
  if length(trim(coalesce(p_ly_do, ''))) < 5 then
    raise exception 'Phải nhập lý do đóng sớm tối thiểu 5 ký tự' using errcode = '23514';
  end if;

  -- D-05: đóng bất kể so_luong_da_xuat còn thiếu bao nhiêu — khách không lấy
  -- nốt phần còn lại, tránh đơn treo vĩnh viễn.
  update public.don_dat_hang
  set trang_thai = 'HOAN_THANH',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[đóng sớm] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$$;
revoke all    on function public.dong_don_som(uuid, text) from public, anon;
grant execute on function public.dong_don_som(uuid, text) to authenticated;
comment on function public.dong_don_som(uuid, text) is
  'D-05: chỉ quản lý đóng sớm đơn DA_XAC_NHAN -> HOAN_THANH bất kể so_luong_da_xuat, bắt buộc lý do >= 5 ký tự.';

-- -----------------------------------------------------------------------------
-- (b) Siết quyền GHI đơn xuống đúng hai vai trò (D-06) — vá lỗ quyền.
-- drop bốn policy cũ (hai policy INSERT đổi tên, hai policy UPDATE giữ tên).
-- -----------------------------------------------------------------------------
drop policy "tao don dat hang tru chi xem" on public.don_dat_hang;
drop policy "sua don dat hang" on public.don_dat_hang;
drop policy "tao dong don dat hang tru chi xem" on public.don_dat_hang_dong;
drop policy "sua dong don dat hang" on public.don_dat_hang_dong;

create policy "tao don dat hang" on public.don_dat_hang
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "tao dong don dat hang" on public.don_dat_hang_dong
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong')
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_id and d.trang_thai = 'TAM'
    )
  );

-- -----------------------------------------------------------------------------
-- (c) Khóa sửa đơn đã duyệt (D-07) + policy delete còn thiếu trên
-- don_dat_hang_dong. using kiểm trạng thái CŨ (nguyên tắc kiến trúc số 4).
-- -----------------------------------------------------------------------------
create policy "sua don dat hang" on public.don_dat_hang
  for update to authenticated
  using      (trang_thai = 'TAM' and (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "sua dong don dat hang" on public.don_dat_hang_dong
  for update to authenticated
  using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong')
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_id and d.trang_thai = 'TAM'
    )
  )
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- Trước 0052 KHÔNG có policy for delete nào trên don_dat_hang_dong — xóa một
-- dòng đơn đang bất khả thi. select giữ nguyên "doc dong don dat hang" (mọi
-- vai trò đọc được, quyết định đã chốt ở plan 04-03 cho phiếu đi lấy hàng).
create policy "xoa dong don dat hang khi tam" on public.don_dat_hang_dong
  for delete to authenticated
  using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong')
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_id and d.trang_thai = 'TAM'
    )
  );

-- -----------------------------------------------------------------------------
-- (d) Trigger nhật ký (D-07) — dùng lại hàm generic public.ghi_nhat_ky_sua()
-- đã có từ 0027, không viết hàm mới.
--
-- [Rule 3 - blocking issue] nhat_ky_sua.bang hiện bị CHECK giới hạn đúng ba
-- giá trị ('san_pham','doi_tac','nguoi_dung') — gắn trigger generic vào
-- don_dat_hang mà không mở rộng CHECK này thì MỌI update/insert trên
-- don_dat_hang sẽ vỡ ngay ở lần ghi đầu tiên (23514 từ chính constraint đó),
-- chặn đứng cả ba RPC ở mục (a). Mở rộng đúng một giá trị, không đổi gì khác
-- của bảng nhật ký.
-- -----------------------------------------------------------------------------
alter table public.nhat_ky_sua drop constraint nhat_ky_sua_bang_check;
alter table public.nhat_ky_sua add constraint nhat_ky_sua_bang_check
  check (bang in ('san_pham', 'doi_tac', 'nguoi_dung', 'don_dat_hang'));

create trigger ghi_nhat_ky_don_dat_hang after insert or update on public.don_dat_hang
  for each row execute function public.ghi_nhat_ky_sua();

-- -----------------------------------------------------------------------------
-- (e) Chống đệ quy — kiểm chiều hỏi giữa hai policy đơn trước khi commit.
--
-- Policy mới của don_dat_hang_dong (tao/sua/xoa dong don dat hang) đều hỏi
-- ngược lên don_dat_hang qua "exists (select 1 from public.don_dat_hang d
-- where d.id = don_dat_hang_id ...)". Kiểm tra: không policy nào của
-- don_dat_hang (doc/tao/sua ở trên) hỏi ngược lại don_dat_hang_dong — cả ba
-- policy của don_dat_hang chỉ đọc cột của chính nó (trang_thai) và gọi
-- vai_tro_hien_tai(), không có exists/join nào chạm don_dat_hang_dong.
--
-- KẾT LUẬN: một chiều duy nhất (don_dat_hang_dong -> don_dat_hang), không có
-- vòng — không cần cắt đệ quy bằng hàm SECURITY DEFINER kiểu 0042.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (mẫu lấy từ 0016/0026/0027).
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
