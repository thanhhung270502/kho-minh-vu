-- =============================================================================
-- Phase 15 (IMP-03/04/05) — nhap_ma_hang_moi: dòng lỗi bị bỏ qua, dòng hợp lệ
-- vẫn nhập; tồn trong file vào sổ bằng MỘT phiếu DIEU_CHINH đã ghi sổ.
-- Mã thử tiền tố NMM-ZQX- để không đụng dữ liệu thật.
-- =============================================================================
begin;
select plan(17);

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

-- ─── Dữ liệu nền (postgres) ─────────────────────────────────────────────────
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('NMM-ZQX-CU', 'Nhông xích Zqx cũ',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'));
insert into public.loai_hang (ma, ten) values ('NMM_ZQX_LH', 'Loại thử Zqx');
insert into public.dong_xe (ma, ten) values ('NMM_ZQX_DX', 'Dòng xe thử Zqx');

create temp table t_ref as
select (select id from public.kho where ma = 'K2') as k2,
       (select id from public.don_vi_tinh where ma = 'CAI') as dvt,
       (select id from public.loai_hang where ma = 'NMM_ZQX_LH') as lh,
       (select id from public.dong_xe where ma = 'NMM_ZQX_DX') as dx,
       (select count(*) from public.chung_tu where loai_ct = 'DIEU_CHINH')::int as so_dc;
grant select on t_ref to authenticated;

-- Dòng 2: hợp lệ, tồn 12 · dòng 3: hợp lệ, tồn 0 · dòng 4+5: trùng mã trong file
-- dòng 6: trùng mã danh mục · dòng 7: trùng TÊN danh mục (khác dấu/hoa)
-- dòng 8+9: trùng tên trong file · dòng 10: thiếu ĐVT
create temp table t_file as
select jsonb_build_array(
  jsonb_build_object('dong', 2, 'ma_hang', 'NMM-ZQX-01', 'ten_hang', 'Bố thắng Zqx 01', 'ton_kho', 12,
    'dvt_id', t_ref.dvt, 'loai_hang_id', t_ref.lh, 'dong_xe_id', t_ref.dx,
    'duoc_ban_truc_tiep', false, 'dang_kinh_doanh', true, 'vi_tri_ke', 'A-01', 'ghi_chu', 'Mô tả 01'),
  jsonb_build_object('dong', 3, 'ma_hang', 'NMM-ZQX-02', 'ten_hang', 'Bố thắng Zqx 02', 'ton_kho', 0, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 4, 'ma_hang', 'NMM-ZQX-03', 'ten_hang', 'Hàng Zqx 03a', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 5, 'ma_hang', 'nmm-zqx-03', 'ten_hang', 'Hàng Zqx 03b', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 6, 'ma_hang', 'NMM-ZQX-CU', 'ten_hang', 'Hàng Zqx khác', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 7, 'ma_hang', 'NMM-ZQX-04', 'ten_hang', '  nhong xich ZQX cu ', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 8, 'ma_hang', 'NMM-ZQX-05', 'ten_hang', 'Trùng tên Zqx', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 9, 'ma_hang', 'NMM-ZQX-06', 'ten_hang', 'trung ten zqx', 'ton_kho', 1, 'dvt_id', t_ref.dvt),
  jsonb_build_object('dong', 10, 'ma_hang', 'NMM-ZQX-07', 'ten_hang', 'Thiếu ĐVT Zqx', 'ton_kho', 1)
) as dong
from t_ref;
grant select on t_file to authenticated;

-- ─── 1. Thủ kho bị chặn ────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.nhap_ma_hang_moi((select dong from t_file), (select k2 from t_ref), false) $$,
  '42501', null, 'thủ kho không được nhập mã hàng');
select pg_temp.dang_xuat();

-- ─── 2. Chế độ kiểm tra: báo lỗi, không ghi gì ──────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
create temp table t_kt as
select public.nhap_ma_hang_moi((select dong from t_file), (select k2 from t_ref), true) as kq;

select is((select (kq->>'them')::int from t_kt), 2, 'kiểm tra: 2 dòng hợp lệ');
select is((select jsonb_array_length(kq->'loi') from t_kt), 7, 'kiểm tra: 7 dòng lỗi');
select is((select count(*)::int from public.san_pham where ma_hang like 'NMM-ZQX-0%'), 0,
  'kiểm tra không tạo mã nào');

-- ─── 3. Nạp thật ───────────────────────────────────────────────────────────
create temp table t_nap as
select public.nhap_ma_hang_moi((select dong from t_file), (select k2 from t_ref), false) as kq;

select is((select (kq->>'them')::int from t_nap), 2, 'nạp: thêm đúng 2 mã hợp lệ');
select set_eq(
  $$ select ma_hang from public.san_pham where ma_hang like 'NMM-ZQX-0%' $$,
  array['NMM-ZQX-01', 'NMM-ZQX-02'], 'chỉ dòng hợp lệ được tạo — dòng lỗi không chặn cả file');
select set_eq(
  $$ select (e->>'dong')::int from t_nap, jsonb_array_elements(kq->'loi') e $$,
  array[4, 5, 6, 7, 8, 9, 10], 'đủ 7 dòng lỗi, trùng trong file đánh dấu cả hai dòng');
select ok(
  (select bool_and(e->>'ly_do' <> '') from t_nap, jsonb_array_elements(kq->'loi') e),
  'mỗi dòng lỗi có lý do');

select is(
  (select row(loai_hang_id, dong_xe_id, duoc_ban_truc_tiep, vi_tri_ke, ghi_chu, kho_mac_dinh_id)::text
   from public.san_pham where ma_hang = 'NMM-ZQX-01'),
  (select row(lh, dx, false, 'A-01'::text, 'Mô tả 01'::text, k2)::text from t_ref),
  'mã mới mang đủ loại hàng, dòng xe, bán trực tiếp, vị trí, ghi chú, kho mặc định');
select is(
  (select row(duoc_ban_truc_tiep, dang_kinh_doanh, cd.ma)::text
   from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
   where ma_hang = 'NMM-ZQX-02'),
  row(true, true, 'MUA_NGOAI'::text)::text,
  'mặc định: bán trực tiếp, đang kinh doanh, công đoạn MUA_NGOAI');

-- ─── 4. Tồn vào sổ bằng đúng một phiếu DIEU_CHINH ───────────────────────────
select is(
  (select count(*)::int from public.chung_tu where loai_ct = 'DIEU_CHINH') - (select so_dc from t_ref),
  1, 'tạo đúng một phiếu điều chỉnh');
select is(
  (select row(ct.loai_ct, ct.trang_thai, ct.kho_id)::text
   from public.chung_tu ct where ct.id = (select (kq->>'chung_tu_id')::uuid from t_nap)),
  (select row('DIEU_CHINH'::public.loai_ct, 'HOAN_THANH'::public.trang_thai_ct, k2)::text from t_ref),
  'phiếu đã ghi sổ, vào kho đã chọn');
select is(
  (select count(*)::int from public.chung_tu_dong
   where chung_tu_id = (select (kq->>'chung_tu_id')::uuid from t_nap)),
  1, 'mã tồn 0 không có dòng trong phiếu');
select is(
  (select tk.so_luong::numeric from public.ton_kho tk
   join public.san_pham sp on sp.id = tk.san_pham_id
   where sp.ma_hang = 'NMM-ZQX-01' and tk.kho_id = (select k2 from t_ref)),
  12::numeric, 'tồn kho = tồn trong file');
select is(
  (select count(*)::int from public.kho_movement km
   join public.san_pham sp on sp.id = km.san_pham_id
   where sp.ma_hang = 'NMM-ZQX-01'
     and km.chung_tu_id = (select (kq->>'chung_tu_id')::uuid from t_nap)),
  1, 'thẻ kho truy về đúng phiếu điều chỉnh');

-- ─── 5. Không có tồn → không tạo phiếu ─────────────────────────────────────
create temp table t_khong_ton as
select public.nhap_ma_hang_moi(jsonb_build_array(
  jsonb_build_object('dong', 2, 'ma_hang', 'NMM-ZQX-08', 'ten_hang', 'Không tồn Zqx', 'dvt_id', (select dvt from t_ref))
), (select k2 from t_ref), false) as kq;
select ok((select kq->'chung_tu_id' = 'null'::jsonb from t_khong_ton), 'không có tồn: không tạo phiếu');

-- ─── 6. Có tồn mà không chọn kho → lỗi dòng, không đoán kho ────────────────
create temp table t_khong_kho as
select public.nhap_ma_hang_moi(jsonb_build_array(
  jsonb_build_object('dong', 2, 'ma_hang', 'NMM-ZQX-09', 'ten_hang', 'Không kho Zqx', 'ton_kho', 3, 'dvt_id', (select dvt from t_ref))
), null, false) as kq;
select is((select (kq->>'them')::int from t_khong_kho), 0, 'có tồn mà chưa chọn kho: dòng bị bỏ qua');

select * from finish();
rollback;
