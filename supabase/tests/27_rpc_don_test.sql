-- =============================================================================
-- 0054 — RPC đọc cho màn đơn đặt hàng (danh_sach_don / chi_tiet_don / dong_don)
-- Khuôn: supabase/tests/21_danh_sach_chung_tu_test.sql
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

-- ─── Dựng dữ liệu: hai mã (mã sp1 KHÔNG gán kho mặc định), một kho, một NCC ──
create temp table t_rpc as
select pg_temp.sp_test('DDH-RPC-ZQX-A') as sp1,
       pg_temp.sp_test('DDH-RPC-ZQX-B') as sp2,
       pg_temp.kho_id('K1') as k1,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t_rpc to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- Đơn A: TAM, không dòng.
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-RPC-A', doi_tac_id from t_rpc;

-- Đơn B: TAM -> insert dòng -> DA_XAC_NHAN (policy insert dòng của 0052 đòi
-- cha đang TAM; using của "sua don dat hang" chỉ kiểm trạng thái HIỆN TẠI).
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-RPC-B', doi_tac_id from t_rpc;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-RPC-B'), sp1, 10 from t_rpc;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-RPC-B'), sp2, 5 from t_rpc;

update public.don_dat_hang set trang_thai = 'DA_XAC_NHAN' where so_dh = 'DH-RPC-B';

-- Đơn C: TAM -> DA_HUY ngay (using chỉ đòi trạng thái HIỆN TẠI là TAM, cho
-- phép đích là bất kỳ giá trị nào — dùng để dựng đơn ở trạng thái thứ ba).
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-RPC-C', doi_tac_id from t_rpc;
update public.don_dat_hang set trang_thai = 'DA_HUY' where so_dh = 'DH-RPC-C';

-- Ghi sổ một phiếu xuất MỘT PHẦN cho đơn B: 4/10 của sp1, chưa đụng sp2.
-- ly_do_xuat_am = 'khac' bỏ qua khối kiểm tồn (không phải mục tiêu test này).
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, don_dat_hang_id, ly_do_xuat_am)
select 'XU-RPC-B', 'XUAT', current_date, k1, doi_tac_id,
       (select id from public.don_dat_hang where so_dh = 'DH-RPC-B'), 'khac'
from t_rpc;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'XU-RPC-B'), sp1, 4, 0, 0 from t_rpc;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-RPC-B'));

-- ─── 1: lọc theo trạng thái ─────────────────────────────────────────────────
select is(
  (select count(*) from public.danh_sach_don(p_trang_thai => 'TAM') d where d.so_dh like 'DH-RPC-%'),
  1::bigint,
  'loc theo trang thai TAM chi tra dung don A trong bo ba vua tao'
);

-- ─── 2–3: phân trang + tong_so_dong là tổng thật ───────────────────────────
select is(
  (select count(*) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-', p_kich_thuoc => 1)),
  1::bigint,
  'p_kich_thuoc = 1 chi tra dung 1 dong'
);

select is(
  (select max(d.tong_so_dong) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-', p_kich_thuoc => 1) d),
  3::bigint,
  'tong_so_dong la tong THAT (3 don), khong phai so dong tra ve trong trang'
);

-- ─── 4: tìm theo một phần so_dh ─────────────────────────────────────────────
select is(
  (select so_dh from public.danh_sach_don(p_tu_khoa => 'DH-RPC-B')),
  'DH-RPC-B',
  'tu khoa mot phan so_dh tim dung don B'
);

-- ─── 5: chi_tiet_don tổng đúng ──────────────────────────────────────────────
select is(
  (select tong_so_luong_dat from public.chi_tiet_don(
    (select id from public.don_dat_hang where so_dh = 'DH-RPC-B'))),
  15::numeric,
  'chi_tiet_don tra tong_so_luong_dat bang tong hai dong (10+5)'
);

-- ─── 6–8: dong_don trả đúng số dòng, tiến độ, và kho_mac_dinh_id null ──────
select is(
  (select count(*) from public.dong_don(
    (select id from public.don_dat_hang where so_dh = 'DH-RPC-B'))),
  2::bigint,
  'dong_don tra dung 2 dong cua don B'
);

select is(
  (select dg.so_luong_da_xuat from public.dong_don(
    (select id from public.don_dat_hang where so_dh = 'DH-RPC-B')) dg, t_rpc
   where dg.san_pham_id = t_rpc.sp1),
  4::numeric,
  'dong_don tra dung so_luong_da_xuat = 4 sau khi ghi so mot phan'
);

select is(
  (select dg.kho_mac_dinh_id from public.dong_don(
    (select id from public.don_dat_hang where so_dh = 'DH-RPC-B')) dg, t_rpc
   where dg.san_pham_id = t_rpc.sp1),
  null::uuid,
  'dong_don tra kho_mac_dinh_id null cho ma chua gan kho mac dinh'
);

-- ─── 9: id không tồn tại không ném lỗi ──────────────────────────────────────
select is(
  (select count(*) from public.dong_don('00000000-0000-0000-0000-000000000000'::uuid)),
  0::bigint,
  'dong_don voi id khong ton tai tra 0 dong, khong nem loi'
);

-- ─── 10–13: cả bốn vai trò đọc đơn đều thấy, không lọc theo kho ────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select ok(
  (select count(*) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-')) = 3,
  'quan_ly thay ca ba don'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(
  (select count(*) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-')) = 3,
  'van_phong thay ca ba don'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select ok(
  (select count(*) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-')) = 3,
  'thu_kho thay ca ba don, khong bi loc theo kho'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select ok(
  (select count(*) from public.danh_sach_don(p_tu_khoa => 'DH-RPC-')) = 3,
  'chi_xem thay ca ba don'
);

select * from finish();
rollback;
