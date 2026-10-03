-- =============================================================================
-- Quy chuẩn mã (A) — đánh dấu trường chọn tay, lọc quy chuẩn ở danh sách, và
-- điền quy chuẩn hàng loạt: CHỈ lấp ô trống, không đụng ô chọn tay.
-- =============================================================================
begin;
select plan(13);

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

create or replace function pg_temp.sp(p_ma text) returns uuid language sql as $h$
  select id from public.san_pham where ma_hang = p_ma;
$h$;
create or replace function pg_temp.them(p_ma text, p_cong_doan text) returns void language sql as $h$
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values (p_ma, 'Thử ' || p_ma, (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = p_cong_doan));
$h$;

-- QCA-1: trống hết, công đoạn Mua ngoài (ngoài quy chuẩn → coi là trống)
-- QCA-2: đã có hãng H (giữ), dòng chọn tay = trống nhưng KHÔNG được điền
-- QCA-3: công đoạn Sơn (trong quy chuẩn) → không đổi xử lý
select pg_temp.them('QCA-ZQX-1', 'MUA_NGOAI');
select pg_temp.them('QCA-ZQX-2', 'MUA_NGOAI');
select pg_temp.them('QCA-ZQX-3', 'SON');
update public.san_pham set hang_xe = 'H', truong_chon_tay = array['dong_xe'] where ma_hang = 'QCA-ZQX-2';

select throws_ok($$ update public.san_pham set truong_chon_tay = array['gia_ban'] where ma_hang = 'QCA-ZQX-1' $$,
  '23514', null, 'truong_chon_tay chỉ nhận 4 trường quy chuẩn');

-- ─── 1. Quyền ──────────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ select public.dien_quy_chuan('[]'::jsonb) $$, '42501', null, 'thủ kho không điền hàng loạt được');
select pg_temp.dang_xuat();

-- ─── 2. Điền: chỉ ô trống, không đụng chọn tay ─────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
create temp table t_kq as select public.dien_quy_chuan(jsonb_build_array(
  jsonb_build_object('id', pg_temp.sp('QCA-ZQX-1'), 'hang_xe', 'Y', 'dong_xe', 'E', 'linh_kien', '75', 'ma_xu_ly', 'CB'),
  jsonb_build_object('id', pg_temp.sp('QCA-ZQX-2'), 'hang_xe', 'Y', 'dong_xe', 'E', 'linh_kien', '75', 'ma_xu_ly', 'CB'),
  jsonb_build_object('id', pg_temp.sp('QCA-ZQX-3'), 'hang_xe', 'H', 'linh_kien', '12', 'ma_xu_ly', 'CB')
)) as kq;
select pg_temp.dang_xuat();

select is((select (kq->>'so_ma_doi')::int from t_kq), 3, 'ba mã có ít nhất một ô được điền');
select is(
  (select row(hang_xe, dong_xe, linh_kien, cd.ma_quy_chuan)::text from public.san_pham sp
   join public.cong_doan cd on cd.id = sp.cong_doan_id where ma_hang = 'QCA-ZQX-1'),
  row('Y', 'E', '75', 'CB')::text, 'mã trống hết: điền đủ 4 ô, Mua ngoài → carbon');
select is((select hang_xe from public.san_pham where ma_hang = 'QCA-ZQX-2'), 'H', 'hãng đã có: giữ nguyên, không ghi đè');
select is((select dong_xe from public.san_pham where ma_hang = 'QCA-ZQX-2'), null, 'dòng xe đánh dấu chọn tay: không điền');
select is((select linh_kien from public.san_pham where ma_hang = 'QCA-ZQX-2'), '75', 'ô trống còn lại vẫn điền');
select is(
  (select cd.ma from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id where ma_hang = 'QCA-ZQX-3'),
  'SON', 'xử lý đã trong quy chuẩn (Sơn): không đổi');
select is((select nguon from public.nhat_ky_sua where ban_ghi_id = pg_temp.sp('QCA-ZQX-1') and truong = 'hang_xe' limit 1),
  'quy_chuan', 'nhật ký sửa ghi nguồn quy_chuan');

-- ─── 3. Lọc quy chuẩn ở danh sách ──────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select ok(
  'QCA-ZQX-1' in (select ma_hang from public.danh_sach_san_pham(p_tu_khoa := 'QCA-ZQX', p_quy_chuan := 'du', p_kich_thuoc := 50)),
  'đủ quy chuẩn: QCA-1 có trong lọc "đủ"');
select ok(
  'QCA-ZQX-2' in (select ma_hang from public.danh_sach_san_pham(p_tu_khoa := 'QCA-ZQX', p_quy_chuan := 'chon_tay', p_kich_thuoc := 50)),
  'có trường chọn tay: QCA-2 có trong lọc "chọn tay"');
select ok(
  'QCA-ZQX-1' not in (select ma_hang from public.danh_sach_san_pham(p_tu_khoa := 'QCA-ZQX', p_quy_chuan := 'thieu', p_kich_thuoc := 50)),
  'mã đủ không nằm trong lọc "thiếu"');
select is(
  (select row(hang_xe, dong_xe, linh_kien, loai_hang)::text from public.danh_sach_san_pham(p_tu_khoa := 'QCA-ZQX-1', p_kich_thuoc := 5) limit 1),
  row('Y', 'E', '75', 'HANG_HOA')::text, 'danh sách trả cột quy chuẩn');
select pg_temp.dang_xuat();

select * from finish();
rollback;
