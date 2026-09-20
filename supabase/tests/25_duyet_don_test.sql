-- =============================================================================
-- 0052 — RPC duyệt đơn + vá lỗ quyền ghi đơn (D-06/D-07)
-- Khuôn: supabase/tests/22_kho_theo_dong_test.sql
-- =============================================================================
begin;
select plan(15);

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

-- ─── Dựng một đối tác + một đơn TAM dùng chung cho mọi assert ───────────────
select pg_temp.dang_xuat();

create temp table t_ddh as
select (select id from public.doi_tac limit 1) as doi_tac_id,
       pg_temp.sp_test('DDH-ZQX-A') as sp_a;
grant select on t_ddh to authenticated;

-- =============================================================================
-- 1-4: Lỗ quyền vừa vá — thu_kho và chi_xem KHÔNG insert được don_dat_hang,
-- van_phong và quan_ly insert được. throws_ok so mã lỗi 42501 (RLS từ chối
-- INSERT ném lỗi, khác UPDATE vốn bị lọc im lặng).
-- =============================================================================
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ insert into public.don_dat_hang (so_dh, doi_tac_id)
     values ('DH-TEST-THUKHO', (select doi_tac_id from t_ddh)) $$,
  '42501', null,
  'thukho1 insert don_dat_hang bi tu choi 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$ insert into public.don_dat_hang (so_dh, doi_tac_id)
     values ('DH-TEST-CHIXEM', (select doi_tac_id from t_ddh)) $$,
  '42501', null,
  'chi_xem insert don_dat_hang bi tu choi 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-TEST-VANPHONG', doi_tac_id from t_ddh;
select ok(
  (select count(*) = 1 from public.don_dat_hang where so_dh = 'DH-TEST-VANPHONG'),
  'van_phong insert don_dat_hang thanh cong'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-TEST-QUANLY', doi_tac_id from t_ddh;
select ok(
  (select count(*) = 1 from public.don_dat_hang where so_dh = 'DH-TEST-QUANLY'),
  'quan_ly insert don_dat_hang thanh cong'
);

-- Đơn dùng cho phần còn lại của bài test: đơn của văn phòng (đang TAM).
create temp table t_don as
select id as don_id from public.don_dat_hang where so_dh = 'DH-TEST-VANPHONG';
grant select on t_don to authenticated;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select don_id from t_don), sp_a, 10 from t_ddh;

-- =============================================================================
-- 5-6: don_dat_hang_dong insert khi don TAM — thu_kho 42501, van_phong thanh cong
-- (dòng của van_phong ở trên đã chứng minh van_phong; thêm một dòng nữa).
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  format($$ insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
     values (%L, %L, 5) $$, (select don_id from t_don), (select sp_a from t_ddh)),
  '42501', null,
  'thukho1 insert don_dat_hang_dong vao don TAM bi tu choi 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(
  (select count(*) = 1 from public.don_dat_hang_dong where don_dat_hang_id = (select don_id from t_don)),
  'van_phong da insert duoc dong don dat hang (tu buoc dung du lieu o tren)'
);

-- =============================================================================
-- 7-9: xac_nhan_don — van_phong 42501, quan_ly thanh cong, goi lan hai 23514
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  format($$ select public.xac_nhan_don(%L) $$, (select don_id from t_don)),
  '42501', null,
  'van_phong goi xac_nhan_don bi tu choi 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select public.xac_nhan_don((select don_id from t_don));
select is(
  (select trang_thai from public.don_dat_hang where id = (select don_id from t_don)),
  'DA_XAC_NHAN'::public.trang_thai_ddh,
  'quan_ly xac_nhan_don chuyen TAM -> DA_XAC_NHAN'
);

select throws_ok(
  format($$ select public.xac_nhan_don(%L) $$, (select don_id from t_don)),
  '23514', null,
  'xac_nhan_don lan hai tren cung don bi 23514'
);

-- =============================================================================
-- 10-11: don DA_XAC_NHAN khong sua duoc bang PATCH thang, sua duoc sau mo_khoa_don
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.don_dat_hang set ghi_chu = 'thu sua khi da xac nhan'
where id = (select don_id from t_don);
select is(
  (select ghi_chu from public.don_dat_hang where id = (select don_id from t_don)),
  null,
  'van_phong update don DA_XAC_NHAN bi RLS loc, 0 dong bi sua'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select public.mo_khoa_don((select don_id from t_don), 'mo khoa de sua lai so luong');

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.don_dat_hang set ghi_chu = 'da sua duoc sau khi mo khoa'
where id = (select don_id from t_don);
select is(
  (select ghi_chu from public.don_dat_hang where id = (select don_id from t_don)),
  'da sua duoc sau khi mo khoa',
  'van_phong sua duoc don sau khi quan_ly mo_khoa_don'
);

-- =============================================================================
-- 12: mo_khoa_don voi ly do qua ngan -> 23514
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select public.xac_nhan_don((select don_id from t_don));
select throws_ok(
  format($$ select public.mo_khoa_don(%L, 'abc') $$, (select don_id from t_don)),
  '23514', null,
  'mo_khoa_don voi ly do 3 ky tu bi 23514'
);

-- =============================================================================
-- 13: dong_don_som tren don DA_XAC_NHAN chua giao du -> HOAN_THANH
-- =============================================================================
select public.dong_don_som((select don_id from t_don), 'khach khong lay not phan con lai');
select is(
  (select trang_thai from public.don_dat_hang where id = (select don_id from t_don)),
  'HOAN_THANH'::public.trang_thai_ddh,
  'dong_don_som dong don DA_XAC_NHAN thanh HOAN_THANH bat ke con thieu'
);

-- =============================================================================
-- 14-15: nhat_ky_sua co dong voi bang='don_dat_hang', truong='trang_thai'.
-- KHONG dung order by cot thoi gian: trong mot transaction now() khong doi.
-- nhat_ky_sua bi REVOKE ALL khoi anon/authenticated (0027) - doc truc tiep
-- phai o ngu canh khong JWT (dang_xuat), dung khuon 70_nhat_ky_sua_test.sql.
-- =============================================================================
select pg_temp.dang_xuat();
select ok(
  exists (
    select 1 from public.nhat_ky_sua
    where bang = 'don_dat_hang' and truong = 'trang_thai'
      and ban_ghi_id = (select don_id from t_don)
      and gia_tri_moi = to_jsonb('DA_XAC_NHAN'::text)
  ),
  'trigger ghi nhat ky bat duoc lan chuyen sang DA_XAC_NHAN'
);

select ok(
  exists (
    select 1 from public.nhat_ky_sua
    where bang = 'don_dat_hang' and truong = 'trang_thai'
      and ban_ghi_id = (select don_id from t_don)
      and gia_tri_moi = to_jsonb('HOAN_THANH'::text)
  ),
  'trigger ghi nhat ky bat duoc lan dong som thanh HOAN_THANH'
);

select * from finish();
rollback;
