-- =============================================================================
-- 0094 — dem_don_theo_trang_thai (số đếm panel lọc) + them_dong_don (cộng dồn D-03)
-- Không neo vào số đơn sống (bẫy 16): fixture ở năm 2093, đối chiếu chéo
-- bằng danh_sach_don cùng bộ lọc.
-- =============================================================================
begin;
select plan(27);

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

insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du)
values ('ZQX113-A', 'Nhân viên ZQX113 An');

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
select m, 'Hàng test cộng dồn ' || m,
       (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI')
from (values ('ZQX-113-P1'), ('ZQX-113-P2')) v(m)
on conflict (ma_hang) do nothing;

create temp table t113 as
select (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX113-A') as nv_a,
       (select id from public.san_pham where ma_hang = 'ZQX-113-P1') as p1;
grant select on t113 to authenticated;

create temp table t113_don (id uuid, nhom text);
grant select, insert on t113_don to authenticated;
create temp table t113_r (dong_id uuid, da_cong_don boolean, so_luong_moi numeric);
grant select, insert, delete on t113_r to authenticated;

-- Fixture: 3 đơn nội bộ cho NV-A (2 TAM + 1 sẽ thành DA_XAC_NHAN) + 1 đơn TAM để cộng dồn
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into t113_don select public.tao_don(null, array[(select nv_a from t113)]), 'tam1';
insert into t113_don select public.tao_don(null, array[(select nv_a from t113)]), 'tam2';
insert into t113_don select public.tao_don(null, array[(select nv_a from t113)]), 'xn';
insert into t113_don select public.tao_don(null, array[(select nv_a from t113)]), 'cong';
select pg_temp.dang_xuat();

update public.don_dat_hang set ngay_dh = '2093-06-15'
where id in (select id from t113_don);
update public.don_dat_hang set trang_thai = 'DA_XAC_NHAN'
where id = (select id from t113_don where nhom = 'xn');

-- ─── Đếm ────────────────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is((select count(*)::int from public.dem_don_theo_trang_thai()), 4,
  'dem_don_theo_trang_thai trả đúng 4 dòng');
select is((select count(distinct trang_thai)::int from public.dem_don_theo_trang_thai()), 4,
  'mỗi trạng thái đúng một dòng');

select is(
  (select array_agg(so_don order by trang_thai) from public.dem_don_theo_trang_thai()),
  (select array_agg(coalesce((select tong_so_dong from public.danh_sach_don(p_trang_thai => array[s], p_kich_thuoc => 1) limit 1), 0) order by s)
   from unnest(enum_range(null::public.trang_thai_ddh)) s),
  'khớp chéo danh_sach_don: không lọc');
select is(
  (select array_agg(so_don order by trang_thai) from public.dem_don_theo_trang_thai(p_loai_nhan => 'NOI_BO')),
  (select array_agg(coalesce((select tong_so_dong from public.danh_sach_don(p_trang_thai => array[s], p_loai_nhan => 'NOI_BO', p_kich_thuoc => 1) limit 1), 0) order by s)
   from unnest(enum_range(null::public.trang_thai_ddh)) s),
  'khớp chéo danh_sach_don: NOI_BO');
select is(
  (select array_agg(so_don order by trang_thai)
   from public.dem_don_theo_trang_thai(p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31')),
  (select array_agg(coalesce((select tong_so_dong from public.danh_sach_don(p_trang_thai => array[s], p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31', p_kich_thuoc => 1) limit 1), 0) order by s)
   from unnest(enum_range(null::public.trang_thai_ddh)) s),
  'khớp chéo danh_sach_don: khoảng ngày 2093');
select is(
  (select array_agg(so_don order by trang_thai)
   from public.dem_don_theo_trang_thai(p_nguoi_nhan_id => (select nv_a from t113))),
  (select array_agg(coalesce((select tong_so_dong from public.danh_sach_don(p_trang_thai => array[s], p_nguoi_nhan_id => (select nv_a from t113), p_kich_thuoc => 1) limit 1), 0) order by s)
   from unnest(enum_range(null::public.trang_thai_ddh)) s),
  'khớp chéo danh_sach_don: người nhận');

select is((select so_don from public.dem_don_theo_trang_thai(p_nguoi_nhan_id => (select nv_a from t113),
  p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31') where trang_thai = 'TAM'), 3::bigint,
  'fixture 2093: TAM = 3 (tam1, tam2, cong)');
select is((select so_don from public.dem_don_theo_trang_thai(p_nguoi_nhan_id => (select nv_a from t113),
  p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31') where trang_thai = 'DA_XAC_NHAN'), 1::bigint,
  'fixture 2093: DA_XAC_NHAN = 1');
select is((select so_don from public.dem_don_theo_trang_thai(p_nguoi_nhan_id => (select nv_a from t113),
  p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31') where trang_thai = 'HOAN_THANH'), 0::bigint,
  'fixture 2093: HOAN_THANH = 0');
select is((select so_don from public.dem_don_theo_trang_thai(p_nguoi_nhan_id => (select nv_a from t113),
  p_tu_ngay => '2093-01-01', p_den_ngay => '2093-12-31') where trang_thai = 'DA_HUY'), 0::bigint,
  'fixture 2093: DA_HUY = 0');

select throws_ok($$select * from public.dem_don_theo_trang_thai(p_loai_nhan => 'X')$$, '22023', null,
  'loại nhận lạ → 22023');
select pg_temp.dang_xuat();
select throws_ok($$select * from public.dem_don_theo_trang_thai()$$, '42501', null,
  'chưa đăng nhập → 42501');

-- ─── Cộng dồn ───────────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into t113_r select * from public.them_dong_don(
  (select id from t113_don where nhom = 'cong'), (select p1 from t113), 2);
select is((select da_cong_don from t113_r), false, 'mã mới → thêm dòng');
select is((select so_luong_moi from t113_r), 2::numeric, 'mã mới: số lượng 2');

delete from t113_r;
insert into t113_r select * from public.them_dong_don(
  (select id from t113_don where nhom = 'cong'), (select p1 from t113), 3);
select is((select da_cong_don from t113_r), true, 'cùng mã + người nhận null → cộng dồn');
select is((select so_luong_moi from t113_r), 5::numeric, 'cộng dồn 2 + 3 = 5');
select is((select count(*)::int from public.don_dat_hang_dong
  where don_dat_hang_id = (select id from t113_don where nhom = 'cong') and san_pham_id = (select p1 from t113)),
  1, 'vẫn một dòng P1');

delete from t113_r;
insert into t113_r select * from public.them_dong_don(
  (select id from t113_don where nhom = 'cong'), (select p1 from t113), 4, (select nv_a from t113));
select is((select da_cong_don from t113_r), false, 'khác người nhận dòng → tách dòng');
delete from t113_r;
insert into t113_r select * from public.them_dong_don(
  (select id from t113_don where nhom = 'cong'), (select p1 from t113), 1, (select nv_a from t113));
select is((select da_cong_don from t113_r), true, 'cùng mã + cùng NV-A → cộng dồn');
select is((select so_luong_moi from t113_r), 5::numeric, 'NV-A: 4 + 1 = 5');
select is((select count(*)::int from public.don_dat_hang_dong
  where don_dat_hang_id = (select id from t113_don where nhom = 'cong') and san_pham_id = (select p1 from t113)),
  2, 'tổng 2 dòng P1 (null và NV-A)');

select throws_ok(format($$select * from public.them_dong_don(%L, %L, 0)$$,
  (select id from t113_don where nhom = 'cong'), (select p1 from t113)), '22023', null,
  'số lượng 0 → 22023');
select throws_ok(format($$select * from public.them_dong_don(%L, %L, 1)$$,
  (select id from t113_don where nhom = 'xn'), (select p1 from t113)), '42501', null,
  'đơn đã xác nhận → 42501');
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(format($$select * from public.them_dong_don(%L, %L, 1)$$,
  (select id from t113_don where nhom = 'tam1'), (select p1 from t113)), '42501', null,
  'chixem không có quyền tao_don → 42501');
select pg_temp.dang_xuat();
select is((select count(*)::int from public.don_dat_hang_dong
  where don_dat_hang_id = (select id from t113_don where nhom = 'tam1')), 0,
  'chixem không thêm được dòng nào');

select ok(not has_function_privilege('anon',
  'public.dem_don_theo_trang_thai(uuid,date,date,text,text,uuid)', 'execute'),
  'anon không gọi được dem_don_theo_trang_thai');
select ok(not has_function_privilege('anon',
  'public.them_dong_don(uuid,uuid,numeric,uuid,text)', 'execute'),
  'anon không gọi được them_dong_don');

select * from finish();
rollback;
