-- =============================================================================
-- XUAT-04/XUAT-05 — RPC chứng từ mở rộng cho chiều xuất (Phase 4)
-- =============================================================================
begin;
select plan(12);

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

create temp table t24 as
select pg_temp.sp_test('M24-HDR') as sp_hdr,
       pg_temp.sp_test('M24-TON') as sp_ton,
       pg_temp.sp_test('M24-HUY') as sp_huy,
       pg_temp.sp_test('M24-XD')  as sp_x,
       pg_temp.sp_test('M24-TD')  as sp_y,
       pg_temp.kho_id('K1')       as k1,
       pg_temp.kho_id('K2')       as k2,
       (select id from public.doi_tac where ma = 'NCC000001') as ncc;
grant select on t24 to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- ═══ A. chi_tiet_chung_tu: so_dh và so_ct_goc ═══════════════════════════════

insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
select 'DH-M24-A', ncc, 'DA_XAC_NHAN' from t24;

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id, ly_do_xuat_am, ghi_chu_ly_do)
select 'XU-M24-A', 'XUAT', k1, ncc, (select id from public.don_dat_hang where so_dh = 'DH-M24-A'),
       'khac', 'pgTAP test' from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-M24-A'), sp_hdr, 1 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-A'));

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'XU-M24-B', 'XUAT', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-M24-B'), sp_hdr, 1 from t24;

select is(
  (select so_dh from public.chi_tiet_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-A'))),
  'DH-M24-A',
  'chi_tiet_chung_tu trả so_dh đúng khi phiếu gắn đơn'
);

select is(
  (select so_dh from public.chi_tiet_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-B'))),
  null::text,
  'chi_tiet_chung_tu trả so_dh null khi phiếu không gắn đơn'
);

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, chung_tu_goc_id)
select 'TC-M24-A', 'TRA_KHACH', k1, ncc, (select id from public.chung_tu where so_ct = 'XU-M24-A') from t24;

select is(
  (select so_ct_goc from public.chi_tiet_chung_tu((select id from public.chung_tu where so_ct = 'TC-M24-A'))),
  'XU-M24-A',
  'chi_tiet_chung_tu trả so_ct_goc đúng với phiếu TRA_KHACH trỏ về phiếu xuất gốc'
);

-- ═══ B. dong_chung_tu: ton_hien_tai theo kho của DÒNG ═══════════════════════

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'NH-M24-TON', 'NHAP', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'NH-M24-TON'), sp_ton, 20, 1000, 20000, k2 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'NH-M24-TON'));

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'XU-M24-TON', 'XUAT', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, kho_id)
select (select id from public.chung_tu where so_ct = 'XU-M24-TON'), sp_ton, 5, k2 from t24;

select is(
  (select dg.ton_hien_tai from public.dong_chung_tu(
      (select id from public.chung_tu where so_ct = 'XU-M24-TON')) dg, t24
    where dg.san_pham_id = t24.sp_ton),
  20::numeric,
  'dong_chung_tu trả ton_hien_tai theo kho của DÒNG (K2), không phải kho đầu phiếu (K1, đang 0)'
);

-- ═══ C. huy_chung_tu: siết quyền cho XUAT đã ghi sổ ═════════════════════════

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, ly_do_xuat_am, ghi_chu_ly_do)
select 'XU-M24-HUY', 'XUAT', k1, ncc, 'khac', 'pgTAP test' from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-M24-HUY'), sp_huy, 1 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-HUY'));

select throws_ok(
  $$select public.huy_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-HUY'), 'van phong tu huy')$$,
  '42501',
  'Chỉ quản lý được hủy chứng từ đã ghi sổ',
  'van_phong bị chặn 42501 khi hủy phiếu XUAT đã ghi sổ'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select (public.huy_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-HUY'), 'quan ly huy')).trang_thai::text),
  'DA_HUY',
  'quan_ly hủy được chính phiếu XUAT đã ghi sổ đó'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- ═══ D. Kho theo dòng chiều XUAT: ghi sổ phải trừ đúng kho của DÒNG ═════════

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'NH-M24-XD', 'NHAP', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'NH-M24-XD'), sp_x, 30, 1000, 30000, null from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'NH-M24-XD'), sp_x, 30, 1000, 30000, k2 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'NH-M24-XD'));

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'XU-M24-KD', 'XUAT', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, kho_id)
select (select id from public.chung_tu where so_ct = 'XU-M24-KD'), sp_x, 12, k2 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-KD'));

select is(
  (select mv.kho_id from public.kho_movement mv, t24
    where mv.chung_tu_id = (select id from public.chung_tu where so_ct = 'XU-M24-KD')
      and mv.san_pham_id = t24.sp_x),
  (select k2 from t24),
  '_ghi_so_xuat ghi kho_movement vào kho của DÒNG (K2), không phải kho đầu phiếu (K1)'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t24 where tk.kho_id = t24.k2 and tk.san_pham_id = t24.sp_x),
  18::numeric(18,4),
  'ton_kho K2 giảm đúng 12 sau khi xuất theo dòng chọn K2'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t24 where tk.kho_id = t24.k1 and tk.san_pham_id = t24.sp_x),
  30::numeric(18,4),
  'ton_kho K1 KHÔNG đổi vì dòng xuất thuộc K2, không phải K1'
);

-- ═══ E. Kho theo dòng chiều TRA_KHACH: tồn phải TĂNG đúng kho của DÒNG ══════

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'NH-M24-TD', 'NHAP', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'NH-M24-TD'), sp_y, 10, 1000, 10000, null from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'NH-M24-TD'), sp_y, 10, 1000, 10000, k2 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'NH-M24-TD'));

-- Chứng từ gốc bắt buộc cho TRA_KHACH (ck_tra_hang_co_goc) — xuất 1 ở K1 để lại tồn K1 = 9.
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'XU-M24-GOC2', 'XUAT', k1, ncc from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'XU-M24-GOC2'), sp_y, 1 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'XU-M24-GOC2'));

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, chung_tu_goc_id)
select 'TC-M24-KD', 'TRA_KHACH', k1, ncc, (select id from public.chung_tu where so_ct = 'XU-M24-GOC2') from t24;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, kho_id)
select (select id from public.chung_tu where so_ct = 'TC-M24-KD'), sp_y, 7, k2 from t24;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'TC-M24-KD'));

select is(
  (select mv.kho_id from public.kho_movement mv, t24
    where mv.chung_tu_id = (select id from public.chung_tu where so_ct = 'TC-M24-KD')
      and mv.san_pham_id = t24.sp_y),
  (select k2 from t24),
  '_ghi_so_tra_khach ghi kho_movement vào kho của DÒNG (K2), không phải kho đầu phiếu (K1)'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t24 where tk.kho_id = t24.k2 and tk.san_pham_id = t24.sp_y),
  17::numeric(18,4),
  'ton_kho K2 TĂNG đúng 7 sau khi khách trả hàng vào dòng chọn K2'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t24 where tk.kho_id = t24.k1 and tk.san_pham_id = t24.sp_y),
  9::numeric(18,4),
  'ton_kho K1 chỉ đổi vì phiếu xuất gốc (10-1=9), KHÔNG bị đụng bởi dòng trả hàng thuộc K2'
);

select * from finish();
rollback;
