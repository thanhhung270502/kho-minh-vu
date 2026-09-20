-- =============================================================================
-- 0052 — Bước duyệt đơn đặt hàng ở tầng database (Phase 4, plan 04-02)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Cùng tình huống với 0051: version này đã
-- được áp lên cloud bởi một phiên làm việc khác, file nguồn không có trong repo.
-- Nội dung trích thẳng từ `pg_get_functiondef` và `pg_policies` của database
-- đang chạy.
--
-- Hai việc:
--   (a) Ba RPC của trục duyệt: xac_nhan_don / mo_khoa_don / dong_don_som
--   (b) Siết bốn policy ghi của don_dat_hang + don_dat_hang_dong
--
-- Vì sao (b) cần thiết: policy cũ ("… tru chi xem") chỉ loại `chi_xem`, nên
-- `thu_kho` vẫn INSERT thẳng vào `don_dat_hang` qua PostgREST được, bỏ qua nút
-- "Tạo đơn" trên giao diện. D-06 nói rõ thủ kho không tạo đơn, nên chốt chặn
-- phải nằm ở database chứ không chỉ ở nút bấm.
--
-- Quy ước `coalesce(vai_tro_hien_tai()::text, 'quan_ly')`: ngữ cảnh không có JWT
-- (migration, script, pgTAP) được đi qua — cùng quy ước đã dùng ở 0048.
-- =============================================================================

-- --- (a) Ba RPC của trục duyệt -----------------------------------------------

-- TAM → DA_XAC_NHAN. Sau bước này đơn khóa sửa (policy UPDATE đòi trang_thai='TAM').
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

-- DA_XAC_NHAN → TAM. D-07: chỉ quản lý mở khóa được, và mỗi lần mở khóa để lại
-- vết trong ghi_chu (trigger nhat_ky_sua ghi thêm bản ghi riêng).
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

-- DA_XAC_NHAN → HOAN_THANH bất kể còn thiếu bao nhiêu (D-05). Khách không lấy
-- nốt phần còn lại thì đóng tay, tránh đơn treo vĩnh viễn ở "chưa đủ".
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

revoke all    on function public.xac_nhan_don(uuid)         from public, anon;
grant execute on function public.xac_nhan_don(uuid)         to authenticated;
revoke all    on function public.mo_khoa_don(uuid, text)    from public, anon;
grant execute on function public.mo_khoa_don(uuid, text)    to authenticated;
revoke all    on function public.dong_don_som(uuid, text)   from public, anon;
grant execute on function public.dong_don_som(uuid, text)   to authenticated;

-- --- (b) Siết quyền ghi xuống quan_ly + van_phong -----------------------------
-- Policy đọc giữ nguyên `using (true)`: tờ phiếu đi lấy hàng vốn dành cho thủ
-- kho, chặn nằm ở chiều ghi chứ không ở chiều đọc.

drop policy if exists "tao don dat hang tru chi xem"      on public.don_dat_hang;
drop policy if exists "tao don dat hang"                  on public.don_dat_hang;
create policy "tao don dat hang" on public.don_dat_hang
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro]));

drop policy if exists "sua don dat hang" on public.don_dat_hang;
create policy "sua don dat hang" on public.don_dat_hang
  for update to authenticated
  using (
    trang_thai = 'TAM'::public.trang_thai_ddh
    and (select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro])
  )
  with check ((select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro]));

drop policy if exists "tao dong don dat hang tru chi xem" on public.don_dat_hang_dong;
drop policy if exists "tao dong don dat hang"             on public.don_dat_hang_dong;
create policy "tao dong don dat hang" on public.don_dat_hang_dong
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro])
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM'::public.trang_thai_ddh
    )
  );

drop policy if exists "sua dong don dat hang" on public.don_dat_hang_dong;
create policy "sua dong don dat hang" on public.don_dat_hang_dong
  for update to authenticated
  using (
    (select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro])
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM'::public.trang_thai_ddh
    )
  )
  with check ((select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro]));

drop policy if exists "xoa dong don dat hang khi tam" on public.don_dat_hang_dong;
create policy "xoa dong don dat hang khi tam" on public.don_dat_hang_dong
  for delete to authenticated
  using (
    (select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro])
    and exists (
      select 1 from public.don_dat_hang d
      where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM'::public.trang_thai_ddh
    )
  );

comment on function public.xac_nhan_don(uuid) is
  'TAM → DA_XAC_NHAN. Chỉ quản lý (D-06). Sau bước này policy UPDATE khóa sửa đơn.';
comment on function public.mo_khoa_don(uuid, text) is
  'DA_XAC_NHAN → TAM để sửa lại. Chỉ quản lý, bắt buộc lý do ≥ 5 ký tự (D-07).';
comment on function public.dong_don_som(uuid, text) is
  'DA_XAC_NHAN → HOAN_THANH khi khách không lấy nốt. Chỉ quản lý, bắt buộc lý do (D-05).';
