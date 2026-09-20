-- =============================================================================
-- 0056 — tao_phieu_xuat_tu_don (D-10, XUAT-01)
-- Khuôn: supabase/tests/22_kho_theo_dong_test.sql
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

create or replace function pg_temp.sp_test_kho(p_ma text, p_kho_id uuid)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'),
          p_kho_id)
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang, kho_mac_dinh_id = excluded.kho_mac_dinh_id
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

-- ─── Dựng dữ liệu: sp_a ở K1, sp_b ở K2, sp_c KHÔNG có kho mặc định ─────────
create temp table t_pxd as
select pg_temp.sp_test_kho('PXD-ZQX-A', pg_temp.kho_id('K1')) as sp_a,
       pg_temp.sp_test_kho('PXD-ZQX-B', pg_temp.kho_id('K2')) as sp_b,
       pg_temp.kho_id('K1') as k1,
       pg_temp.kho_id('K2') as k2,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t_pxd to authenticated;

-- Mã chưa gán kho mặc định — dùng insert thẳng không qua helper (helper luôn set kho).
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('PXD-ZQX-C', 'Hàng test PXD-ZQX-C',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'))
on conflict (ma_hang) do update set ten_hang = excluded.ten_hang, kho_mac_dinh_id = null;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- ─── Đơn A: TAM, chưa xác nhận ──────────────────────────────────────────────
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-PXD-A', doi_tac_id from t_pxd;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PXD-A'), sp_a, 3 from t_pxd;

-- ─── 1: đơn TAM bị từ chối ──────────────────────────────────────────────────
select throws_ok(
  $$ select public.tao_phieu_xuat_tu_don((select id from public.don_dat_hang where so_dh = 'DH-PXD-A')) $$,
  '23514', null,
  'don TAM chua xac nhan khong tao duoc phieu xuat'
);

-- ─── Đơn B: TAM -> 2 dòng (hai kho khác nhau) -> DA_XAC_NHAN ───────────────
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-PXD-B', doi_tac_id from t_pxd;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'), sp_a, 10 from t_pxd;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'), sp_b, 5 from t_pxd;
update public.don_dat_hang set trang_thai = 'DA_XAC_NHAN' where so_dh = 'DH-PXD-B';

select public.tao_phieu_xuat_tu_don((select id from public.don_dat_hang where so_dh = 'DH-PXD-B'));

-- ─── 2-5: header phiếu xuất sinh ra đúng ────────────────────────────────────
select is(
  (select loai_ct from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B')),
  'XUAT'::public.loai_ct,
  'phieu sinh ra dung loai XUAT'
);
select is(
  (select trang_thai from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B')),
  'NHAP_LIEU'::public.trang_thai_ct,
  'phieu sinh ra o trang thai NHAP_LIEU, chua ghi so'
);
select is(
  (select don_dat_hang_id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B')),
  (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'),
  'phieu sinh ra tham chieu dung don goc'
);
select ok(
  (select so_ct from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B')) like 'PX%',
  'so_ct mang dung tien to PX cua loai XUAT'
);

-- ─── 6: đúng hai dòng ───────────────────────────────────────────────────────
select is(
  (select count(*) from public.chung_tu_dong
    where chung_tu_id = (select id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'))),
  2::bigint,
  'phieu xuat sinh ra co dung 2 dong'
);

-- ─── 7-8: so_luong dien san bang so_luong_dat ──────────────────────────────
select is(
  (select ctd.so_luong from public.chung_tu_dong ctd, t_pxd
    where ctd.chung_tu_id = (select id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'))
      and ctd.san_pham_id = t_pxd.sp_a),
  10::numeric(18,4),
  'dong sp_a dien san so_luong = so_luong_dat (10)'
);
select is(
  (select ctd.so_luong from public.chung_tu_dong ctd, t_pxd
    where ctd.chung_tu_id = (select id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'))
      and ctd.san_pham_id = t_pxd.sp_b),
  5::numeric(18,4),
  'dong sp_b dien san so_luong = so_luong_dat (5)'
);

-- ─── 9-10: kho tung dong lay dung kho_mac_dinh_id, hai ma hai kho khac nhau ─
select is(
  (select ctd.kho_id from public.chung_tu_dong ctd, t_pxd
    where ctd.chung_tu_id = (select id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'))
      and ctd.san_pham_id = t_pxd.sp_a),
  (select k1 from t_pxd),
  'dong sp_a lay dung kho_mac_dinh_id (K1)'
);
select is(
  (select ctd.kho_id from public.chung_tu_dong ctd, t_pxd
    where ctd.chung_tu_id = (select id from public.chung_tu where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B'))
      and ctd.san_pham_id = t_pxd.sp_b),
  (select k2 from t_pxd),
  'dong sp_b lay dung kho_mac_dinh_id (K2), khac kho cua sp_a'
);

-- ─── 11-12: ma thieu kho mac dinh chan truoc khi tao, khong de lai chung tu rac ─
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-PXD-THIEU', doi_tac_id from t_pxd;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PXD-THIEU'), sp_a, 1 from t_pxd;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PXD-THIEU'),
       (select id from public.san_pham where ma_hang = 'PXD-ZQX-C'), 2;
update public.don_dat_hang set trang_thai = 'DA_XAC_NHAN' where so_dh = 'DH-PXD-THIEU';

create temp table t_dem_truoc as select count(*) as n from public.chung_tu;
grant select on t_dem_truoc to authenticated;

select throws_like(
  $$ select public.tao_phieu_xuat_tu_don((select id from public.don_dat_hang where so_dh = 'DH-PXD-THIEU')) $$,
  '%PXD-ZQX-C%',
  'ma thieu kho mac dinh bi chan, thong bao neu dung ma hang'
);

select is(
  (select count(*) from public.chung_tu),
  (select n from t_dem_truoc),
  'khong co chung_tu nao duoc tao khi bi chan boi ma thieu kho mac dinh (atomic)'
);

-- ─── 13: thu_kho khong tao duoc phieu xuat ──────────────────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.tao_phieu_xuat_tu_don((select id from public.don_dat_hang where so_dh = 'DH-PXD-B')) $$,
  '42501', null,
  'thu_kho goi tao_phieu_xuat_tu_don bi tu choi 42501'
);

-- ─── 14: goi hai lan tren cung don sinh hai phieu khac so_ct (khong chan) ──
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select public.tao_phieu_xuat_tu_don((select id from public.don_dat_hang where so_dh = 'DH-PXD-B'));

select is(
  (select count(distinct so_ct) from public.chung_tu
    where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-PXD-B')),
  2::bigint,
  'goi lan hai tren cung don sinh phieu thu hai voi so_ct khac, khong bi chan'
);

select * from finish();
rollback;
