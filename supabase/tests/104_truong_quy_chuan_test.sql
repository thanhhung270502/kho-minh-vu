-- =============================================================================
-- Quy chuẩn mã (B) — trường quy chuẩn của mã hàng: loại hàng Hàng hóa/Combo,
-- hãng/dòng/linh kiện lưu MÃ, công đoạn đủ 21 loại xử lý, ghi chú tự sinh.
-- =============================================================================
begin;
select plan(14);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung; v_kho jsonb;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = v_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', v_kho
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

create or replace function pg_temp.sp_test(p_ma text)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

-- Bộ mã hóa tối thiểu (rollback cuối file trả lại bộ thật nếu có).
delete from public.ma_hoa;
insert into public.ma_hoa (loai, ma, ten, ma_hang, thu_tu) values
  ('hang', 'H', 'HONDA', null, 1),
  ('dong', 'A', 'Air Blade', 'H', 1),
  ('linh_kien', '75', 'Mặt nạ', null, 1),
  ('xu_ly', 'CB', 'carbon', null, 1),
  ('mau', 'ĐOB', 'đỏ bóng', null, 1);

create or replace function pg_temp.sp(p_ma text) returns uuid language sql as $h$
  select id from public.san_pham where ma_hang = p_ma;
$h$;

-- ─── 1. Cột mới + loại hàng ────────────────────────────────────────────────
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('QCB-ZQX-01', 'Thử quy chuẩn 01',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'CARBON'));
select is((select loai_hang from public.san_pham where ma_hang = 'QCB-ZQX-01'), 'HANG_HOA', 'loại hàng mặc định Hàng hóa');
select throws_ok($$ update public.san_pham set loai_hang = 'KHAC' where ma_hang = 'QCB-ZQX-01' $$, '23514', null,
  'loại hàng chỉ nhận HANG_HOA / COMBO');
select hasnt_table('public', 'dong_xe', 'bỏ danh mục dòng xe tự do của Phase 15');
select hasnt_column('public', 'san_pham', 'loai_hang_id', 'bỏ cột loai_hang_id của Phase 15');

-- ─── 2. Ghi chú tự sinh ────────────────────────────────────────────────────
select is((select ghi_chu from public.san_pham where ma_hang = 'QCB-ZQX-01'),
  'Thiếu: Hãng xe, Dòng xe, Linh kiện', 'thiếu cả ba trường quy chuẩn');
update public.san_pham set hang_xe = 'H', dong_xe = 'A', linh_kien = '75' where ma_hang = 'QCB-ZQX-01';
select is((select ghi_chu from public.san_pham where ma_hang = 'QCB-ZQX-01'), null, 'đủ quy chuẩn: ghi chú trống');
update public.san_pham set cong_doan_id = (select id from public.cong_doan where ma = 'MUA_NGOAI') where ma_hang = 'QCB-ZQX-01';
select is((select ghi_chu from public.san_pham where ma_hang = 'QCB-ZQX-01'), 'Thiếu: Xử lý theo quy chuẩn',
  'công đoạn ngoài quy chuẩn (Mua ngoài) tính là thiếu xử lý');
update public.san_pham set ghi_chu = 'gõ tay' where ma_hang = 'QCB-ZQX-01';
select is((select ghi_chu from public.san_pham where ma_hang = 'QCB-ZQX-01'), 'Thiếu: Xử lý theo quy chuẩn',
  'ghi chú không sửa tay được — luôn tự sinh');

-- ─── 3. Tên hãng/dòng/linh kiện tra từ bộ mã hóa ───────────────────────────
update public.san_pham set cong_doan_id = (select id from public.cong_doan where ma = 'CARBON') where ma_hang = 'QCB-ZQX-01';
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select row(ten_hang_xe, ten_dong_xe, ten_linh_kien, ma_xu_ly)::text from public.chi_tiet_san_pham(pg_temp.sp('QCB-ZQX-01'))),
  row('HONDA', 'Air Blade', 'Mặt nạ', 'CB')::text, 'chi tiết trả tên từ bộ mã hóa + mã xử lý quy chuẩn');
select pg_temp.dang_xuat();

-- ─── 4. Xử lý = công đoạn đủ 21 loại ───────────────────────────────────────
select is((select count(*)::int from public.cong_doan where ma_quy_chuan is not null), 21, 'đủ 21 loại xử lý quy chuẩn');
select is((select ma_quy_chuan from public.cong_doan where ma = 'XI_MA'), 'X', 'Xi mạ nối mã quy chuẩn X');
select is((select count(*)::int from public.cong_doan where ma in ('EP', 'MUA_NGOAI') and ma_quy_chuan is null), 2,
  'Ép, Mua ngoài giữ — ngoài quy chuẩn');

-- Đồng bộ có loại xử lý mới → công đoạn tự thêm.
select public.dong_bo_ma_hoa(jsonb_build_array(
  jsonb_build_object('loai', 'hang', 'ma', 'H', 'ten', 'HONDA', 'thu_tu', 1),
  jsonb_build_object('loai', 'dong', 'ma', 'A', 'ten', 'Air Blade', 'ma_hang', 'H', 'thu_tu', 1),
  jsonb_build_object('loai', 'linh_kien', 'ma', '75', 'ten', 'Mặt nạ', 'thu_tu', 1),
  jsonb_build_object('loai', 'xu_ly', 'ma', 'CB', 'ten', 'carbon', 'thu_tu', 1),
  jsonb_build_object('loai', 'xu_ly', 'ma', 'ZQX', 'ten', 'xử lý thử', 'thu_tu', 2),
  jsonb_build_object('loai', 'mau', 'ma', 'ĐOB', 'ten', 'đỏ bóng', 'thu_tu', 1)), 'pgtap');
select is((select ten from public.cong_doan where ma_quy_chuan = 'ZQX'), 'xử lý thử', 'sheet có xử lý mới → công đoạn tự thêm');

-- ─── 5. Nhập Excel ghi Mô tả, không bị trigger ghi chú đè ─────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select public.nhap_ma_hang_moi(jsonb_build_array(jsonb_build_object(
  'dong', 2, 'ma_hang', 'QCB-ZQX-02', 'ten_hang', 'Thử quy chuẩn 02', 'mo_ta', 'Mô tả từ file',
  'loai_hang', 'COMBO', 'dvt_id', (select id from public.don_vi_tinh where ma = 'CAI'))), null, false);
select pg_temp.dang_xuat();
select is((select row(mo_ta, loai_hang)::text from public.san_pham where ma_hang = 'QCB-ZQX-02'),
  row('Mô tả từ file', 'COMBO')::text, 'nhập mã mới: Mô tả vào mo_ta, loại hàng Combo');

select * from finish();
rollback;
