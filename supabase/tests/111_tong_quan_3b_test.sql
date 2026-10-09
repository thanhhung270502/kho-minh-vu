-- =============================================================================
-- UI3B-03/04 — tong_quan_chi_so, nhap_xuat_theo_ngay, khong_luan_chuyen (0093).
--
-- Fixture mã 'ZQX-111-*', so_ct 'ZQX-111-*'; ngày chứng từ năm 2092 (không ai
-- chạm tới — bài học bẫy 16). Số phụ thuộc dữ liệu sống thì so tương đối với
-- truy vấn thô chạy bằng vai postgres trong cùng test.
-- =============================================================================
begin;
select plan(35);

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

-- 0117: quyền theo người (nguoi_dung_quyen), không còn theo chức vụ.
create or replace function pg_temp.dat_quyen(p_email text, p_quyen text, p_bat boolean)
returns void language plpgsql as $h$
begin
  if p_bat then
    insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
    select id, p_quyen from auth.users where email = p_email on conflict do nothing;
  else
    delete from public.nguoi_dung_quyen
    where quyen = p_quyen and nguoi_dung_id = (select id from auth.users where email = p_email);
  end if;
end $h$;

-- ---------------------------------------------------------------------------
-- Fixture tồn: A (tồn 5, đang KD), B (tồn 5, ngừng KD), C (tồn 0), D (tồn 5,
-- vừa phát sinh). Tồn dựng bằng kho_movement (trigger 0008 cộng dồn ton_kho).
-- ---------------------------------------------------------------------------
create temp table t_fx as
select
  pg_temp.kho_id('K1')            as k1,
  pg_temp.kho_id('K2')            as k2,
  pg_temp.sp_test('ZQX-111-A')    as spa,
  pg_temp.sp_test('ZQX-111-B')    as spb,
  pg_temp.sp_test('ZQX-111-C')    as spc,
  pg_temp.sp_test('ZQX-111-D')    as spd;
grant select on t_fx to authenticated;

update public.san_pham set dang_kinh_doanh = false
where id = (select spb from t_fx);

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at)
select k1, spa, 5, 1000, '2026-01-01 08:00:00+07'::timestamptz, '2026-01-01 08:00:00+07'::timestamptz from t_fx
union all select k1, spb, 5, 1000, '2026-01-01 08:01:00+07'::timestamptz, '2026-01-01 08:01:00+07'::timestamptz from t_fx
union all select k1, spd, 5, 1000, '2026-01-01 08:02:00+07'::timestamptz, '2026-01-01 08:02:00+07'::timestamptz from t_fx;

-- Trigger đặt lại lan_phat_sinh_cuoi = now(); ghi đè SAU khi chèn.
update public.san_pham set lan_phat_sinh_cuoi = '1990-01-01 00:00:00+07'::timestamptz
where id in ((select spa from t_fx), (select spb from t_fx), (select spc from t_fx));
update public.san_pham set lan_phat_sinh_cuoi = now() where id = (select spd from t_fx);

-- Số thô (vai postgres, trước khi đăng nhập).
create temp table t_raw as
select
  (select coalesce(sum(greatest(d.tong, 0) * sp.gia_von), 0)
     from (select san_pham_id, sum(so_luong) as tong from public.ton_kho group by san_pham_id) d
     join public.san_pham sp on sp.id = d.san_pham_id) as gia_tri,
  (select coalesce(sum(greatest(d.tong, 0)), 0)
     from (select san_pham_id, sum(so_luong) as tong from public.ton_kho group by san_pham_id) d) as sl,
  (select count(*) from public.san_pham where dang_kinh_doanh) as ma_kd;
grant select on t_raw to authenticated;

create temp table t_truoc (cho bigint, nhap bigint, xuat bigint);
grant all on t_truoc to authenticated;

-- ---------------------------------------------------------------------------
-- Quản lý: số liệu KPI
-- ---------------------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

insert into t_truoc select cho_ghi_so, cho_ghi_so_nhap, cho_ghi_so_xuat from public.tong_quan_chi_so();

select is((select xem_gia_von from public.tong_quan_chi_so()), true, 'quản lý: xem_gia_von = true');
select is((select gia_tri_ton from public.tong_quan_chi_so()), (select gia_tri from t_raw),
  'quản lý: gia_tri_ton = sum(max(tồn,0) * gia_von) thô');
select is((select tong_sl_ton from public.tong_quan_chi_so()), (select sl from t_raw),
  'tong_sl_ton = sum(max(tồn,0)) thô');
select is((select ma_kinh_doanh from public.tong_quan_chi_so()), (select ma_kd from t_raw),
  'ma_kinh_doanh = số mã đang KD thô');
select is((select xu_huong_ton[30] from public.tong_quan_chi_so()), (select gia_tri_ton from public.tong_quan_chi_so()),
  'điểm cuối xu_huong_ton = gia_tri_ton');
select is((select array_length(xu_huong_ton, 1) from public.tong_quan_chi_so()), 30, 'xu_huong_ton có 30 điểm');
select is((select array_length(xu_huong_ma_kd, 1) from public.tong_quan_chi_so()), 30, 'xu_huong_ma_kd có 30 điểm');
select is((select array_length(xu_huong_cho_ghi_so, 1) from public.tong_quan_chi_so()), 14, 'xu_huong_cho_ghi_so có 14 điểm');
select isnt((select gia_tri_ton_thang_truoc from public.tong_quan_chi_so()), null::numeric,
  'quản lý: gia_tri_ton_thang_truoc có giá trị');

-- ---------------------------------------------------------------------------
-- Phiếu chờ ghi sổ (D-06): chèn 4 phiếu NHAP_LIEU, chỉ NHAP + XUAT được đếm.
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();

insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, kho_den_id, trang_thai, created_at)
select 'ZQX-111-CHO-NHAP', 'NHAP'::public.loai_ct, '2092-03-01'::date, k1, null::uuid, 'NHAP_LIEU'::public.trang_thai_ct, now() - interval '400 days' from t_fx
union all select 'ZQX-111-CHO-XUAT', 'XUAT', '2092-03-01', k1, null, 'NHAP_LIEU', now() from t_fx
union all select 'ZQX-111-CHO-KK', 'KIEM_KE', '2092-03-01', k1, null, 'NHAP_LIEU', now() from t_fx
union all select 'ZQX-111-CHO-CK', 'CHUYEN_KHO', '2092-03-01', k1, k2, 'NHAP_LIEU', now() from t_fx;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is((select cho_ghi_so from public.tong_quan_chi_so()) - (select cho from t_truoc), 2::bigint,
  'D-06: cho_ghi_so tăng 2 (NHAP + XUAT), KIEM_KE/CHUYEN_KHO không đếm');
select is((select cho_ghi_so_nhap from public.tong_quan_chi_so()) - (select nhap from t_truoc), 1::bigint,
  'cho_ghi_so_nhap tăng 1');
select is((select cho_ghi_so_xuat from public.tong_quan_chi_so()) - (select xuat from t_truoc), 1::bigint,
  'cho_ghi_so_xuat tăng 1');
select cmp_ok((select cho_ghi_so_cu_nhat_ngay from public.tong_quan_chi_so()), '>=', 400,
  'cho_ghi_so_cu_nhat_ngay >= 400 (phiếu nhập cũ 400 ngày)');

-- ---------------------------------------------------------------------------
-- 42501 cho người không có xem_dashboard
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok($$select * from public.tong_quan_chi_so()$$, '42501', null, 'chi_xem: tong_quan_chi_so bị chặn 42501');
select throws_ok($$select * from public.nhap_xuat_theo_ngay(7)$$, '42501', null, 'chi_xem: nhap_xuat_theo_ngay bị chặn 42501');
select throws_ok($$select * from public.khong_luan_chuyen()$$, '42501', null, 'chi_xem: khong_luan_chuyen bị chặn 42501');

-- ---------------------------------------------------------------------------
-- Thủ kho được bật xem_dashboard nhưng KHÔNG có quyền giá vốn (D-04)
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dat_quyen('thukho1@khominhvu.local', 'xem_dashboard', true);
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is((select xem_gia_von from public.tong_quan_chi_so()), false, 'thủ kho: xem_gia_von = false');
select is((select gia_tri_ton from public.tong_quan_chi_so()), null::numeric, 'thủ kho: gia_tri_ton is null');
select is((select gia_tri_ton_thang_truoc from public.tong_quan_chi_so()), null::numeric,
  'thủ kho: gia_tri_ton_thang_truoc is null');
select is((select tong_sl_ton from public.tong_quan_chi_so()), (select sl from t_raw),
  'thủ kho: vẫn có tong_sl_ton');

-- ---------------------------------------------------------------------------
-- Fixture 2092 cho nhap_xuat_theo_ngay + khớp nhip_ban
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();

create temp table t_ct as
select uuid_generate_v4() as n1, uuid_generate_v4() as n2, uuid_generate_v4() as x1,
       uuid_generate_v4() as x2, uuid_generate_v4() as x3, uuid_generate_v4() as x4,
       uuid_generate_v4() as x5;

-- n1,n2: NHAP HOAN_THANH 03-09; x1: XUAT HOAN_THANH 03-10 (có dòng); x2: XUAT
-- NHAP_LIEU 03-10; x3: XUAT HOAN_THANH 02-01; x4: XUAT HOAN_THANH 03-10 KHÔNG
-- có dòng nào (nhip_ban bỏ qua vì inner join dòng); x5: XUAT HOAN_THANH 03-10
-- bị hủy (DA_HUY).
insert into public.chung_tu (id, so_ct, loai_ct, ngay_ct, kho_id, trang_thai)
select n1, 'ZQX-111-N1', 'NHAP'::public.loai_ct, '2092-03-09'::date, k.k1, 'HOAN_THANH'::public.trang_thai_ct from t_ct, t_fx k
union all select n2, 'ZQX-111-N2', 'NHAP', '2092-03-09', k.k1, 'HOAN_THANH' from t_ct, t_fx k
union all select x1, 'ZQX-111-X1', 'XUAT', '2092-03-10', k.k1, 'HOAN_THANH' from t_ct, t_fx k
union all select x2, 'ZQX-111-X2', 'XUAT', '2092-03-10', k.k1, 'NHAP_LIEU' from t_ct, t_fx k
union all select x3, 'ZQX-111-X3', 'XUAT', '2092-02-01', k.k1, 'HOAN_THANH' from t_ct, t_fx k
union all select x4, 'ZQX-111-X4', 'XUAT', '2092-03-10', k.k1, 'HOAN_THANH' from t_ct, t_fx k
union all select x5, 'ZQX-111-X5', 'XUAT', '2092-03-10', k.k1, 'DA_HUY' from t_ct, t_fx k;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select n1, spa, 3 from t_ct, t_fx
union all select n2, spa, 4 from t_ct, t_fx
union all select x1, spa, -2 from t_ct, t_fx
union all select x2, spa, -1 from t_ct, t_fx
union all select x3, spa, -1 from t_ct, t_fx
union all select x5, spa, -1 from t_ct, t_fx;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is((select count(*) from public.nhap_xuat_theo_ngay(7, '2092-03-10')), 7::bigint, '(7) trả 7 dòng');
select is((select so_phieu_nhap from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-09'), 2::bigint,
  '2092-03-09: so_phieu_nhap = 2');
select is((select sl_nhap from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-09'), 7::numeric,
  '2092-03-09: sl_nhap = 7');
select is((select so_phieu_xuat from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-10'), 1::bigint,
  '2092-03-10: so_phieu_xuat = 1 (không đếm NHAP_LIEU, DA_HUY, phiếu rỗng)');
select is((select sl_xuat from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-10'), 2::numeric,
  '2092-03-10: sl_xuat = 2 (giá trị tuyệt đối)');
select is((select so_phieu_nhap + so_phieu_xuat from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-05'), 0::bigint,
  '2092-03-05: ngày trống vẫn có dòng 0');
select is((select count(*) from public.nhap_xuat_theo_ngay(30, '2092-03-10')), 30::bigint, '(30) trả 30 dòng');
select is((select count(*) from public.nhap_xuat_theo_ngay(90, '2092-03-10')), 90::bigint, '(90) trả 90 dòng');
select is((select sum(so_phieu_xuat) from public.nhap_xuat_theo_ngay(90, '2092-03-10')), 2::numeric,
  '(90): tổng so_phieu_xuat = 2 (03-10 và 02-01)');
select throws_ok($$select * from public.nhap_xuat_theo_ngay(15, '2092-03-10')$$, '22023', null, '(15) bị từ chối 22023');

-- Khớp KPI Phiếu xuất hôm nay (nhip_ban) với sparkline (plan 20-10).
select is(
  (select so_phieu_xuat from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-10'),
  (select so_phieu from public.nhip_ban('2092-03-10') where ngay = '2092-03-10'),
  'khớp nguồn: 2092-03-10 nhap_xuat_theo_ngay = nhip_ban');
select is(
  (select so_phieu_xuat from public.nhap_xuat_theo_ngay(7, '2092-03-10') where ngay = '2092-03-09'),
  (select so_phieu from public.nhip_ban('2092-03-10') where ngay = '2092-03-09'),
  'khớp nguồn: 2092-03-09 nhap_xuat_theo_ngay = nhip_ban (= 0)');

-- ---------------------------------------------------------------------------
-- khong_luan_chuyen
-- ---------------------------------------------------------------------------
select is((select so_ngay from public.khong_luan_chuyen(30, 100, '2092-03-10') where ma_hang = 'ZQX-111-A'),
  ('2092-03-10'::date - '1990-01-01'::date)::integer,
  'ZQX-111-A có mặt, so_ngay = p_ngay - 1990-01-01');
select is((select count(*) from public.khong_luan_chuyen(30, 100, '2092-03-10') where ma_hang in ('ZQX-111-B', 'ZQX-111-C')), 0::bigint,
  'ngừng KD (B) và tồn 0 (C) không có');
select is((select count(*) from public.khong_luan_chuyen(30, 100, current_date) where ma_hang = 'ZQX-111-D'), 0::bigint,
  'mã vừa phát sinh (D) không có');

select * from finish();
rollback;
