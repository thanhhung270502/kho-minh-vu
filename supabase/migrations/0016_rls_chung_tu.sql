-- =============================================================================
-- 0014c — RLS cho chứng từ, đơn đặt hàng, sổ cái, tồn kho, và ba bảng phụ
-- =============================================================================

alter table public.don_dat_hang             enable row level security;
alter table public.don_dat_hang_dong        enable row level security;
alter table public.chung_tu                 enable row level security;
alter table public.chung_tu_dong            enable row level security;
alter table public.kho_movement             enable row level security;
alter table public.ton_kho                  enable row level security;
alter table public.chuoi_so_ct              enable row level security;
alter table public.luu_tru_nhap_kiotviet    enable row level security;
alter table public.luu_tru_hoa_don_kiotviet enable row level security;

-- --- AUTH-04: thủ kho chỉ thấy kho mình ----------------------------------
create policy "doc ton kho theo pham vi" on public.ton_kho
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or (
      (select public.vai_tro_hien_tai()) = 'thu_kho'
      and kho_id = (select public.kho_hien_tai())
    )
  );

create policy "doc so cai theo pham vi" on public.kho_movement
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or (
      (select public.vai_tro_hien_tai()) = 'thu_kho'
      and kho_id = (select public.kho_hien_tai())
    )
  );

-- Thủ kho thấy cả chứng từ có kho_den_id là kho mình (hàng chuyển đến).
create policy "doc chung tu theo pham vi" on public.chung_tu
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or (
      (select public.vai_tro_hien_tai()) = 'thu_kho'
      and (kho_id = (select public.kho_hien_tai()) or kho_den_id = (select public.kho_hien_tai()))
    )
  );

-- Dòng không có kho_id riêng: dựa vào exists lên bảng cha. An toàn vì RLS trên
-- chung_tu đã lọc — dòng cha bị ẩn thì exists trả false.
create policy "doc dong chung tu theo cha" on public.chung_tu_dong
  for select to authenticated using (
    exists (select 1 from public.chung_tu ct where ct.id = chung_tu_id)
  );

create policy "doc don dat hang" on public.don_dat_hang
  for select to authenticated using (true);
create policy "doc dong don dat hang" on public.don_dat_hang_dong
  for select to authenticated using (
    exists (select 1 from public.don_dat_hang d where d.id = don_dat_hang_id)
  );

-- --- AUTH-06: chỉ xem không tạo được gì ----------------------------------
create policy "tao chung tu tru chi xem" on public.chung_tu
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');
create policy "tao dong chung tu tru chi xem" on public.chung_tu_dong
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');
create policy "tao don dat hang tru chi xem" on public.don_dat_hang
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');
create policy "tao dong don dat hang tru chi xem" on public.don_dat_hang_dong
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

-- --- Nguyên tắc kiến trúc số 4: HOAN_THANH thì khóa ----------------------
-- using kiểm trạng thái CŨ, with check kiểm dòng MỚI.
create policy "chi sua chung tu dang nhap lieu" on public.chung_tu
  for update to authenticated
  using      (trang_thai = 'NHAP_LIEU' and (select public.vai_tro_hien_tai()) <> 'chi_xem')
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

create policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong
  for update to authenticated
  using (
    exists (select 1 from public.chung_tu ct
            where ct.id = chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem'
  )
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

create policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong
  for delete to authenticated
  using (
    exists (select 1 from public.chung_tu ct
            where ct.id = chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem'
  );

create policy "sua don dat hang" on public.don_dat_hang
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) <> 'chi_xem')
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');
create policy "sua dong don dat hang" on public.don_dat_hang_dong
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) <> 'chi_xem')
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

-- --- Sổ cái và tồn kho: KHÔNG policy ghi nào cho client -------------------
-- Chúng chỉ được ghi bởi trigger và RPC chạy SECURITY DEFINER.
-- RLS bật + không có policy ghi = client không ghi được, đúng ý đồ.
revoke insert                 on public.kho_movement from authenticated, anon;
revoke insert, update, delete on public.ton_kho      from authenticated, anon, service_role;

-- --- Ba bảng phụ ---------------------------------------------------------
-- chuoi_so_ct: ai cũng đọc được số hiện tại; ghi chỉ qua sinh_so_ct().
create policy "doc chuoi so ct" on public.chuoi_so_ct
  for select to authenticated using (true);

-- Lịch sử KiotViet là dữ liệu tra cứu của quản lý và văn phòng.
create policy "doc luu tru nhap" on public.luu_tru_nhap_kiotviet
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "doc luu tru hoa don" on public.luu_tru_hoa_don_kiotviet
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- Không policy ghi nào cho ba bảng trên: chuoi_so_ct do sinh_so_ct() ghi,
-- hai bảng lưu trữ do script import chạy bằng service_role ghi.

-- --- Tự kiểm: không sót bảng nào -----------------------------------------
-- Làm db reset hỏng NGAY nếu quên bật RLS cho một bảng mới. Rẻ hơn nhiều so với
-- phát hiện lúc chạy thật.
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
