-- =============================================================================
-- 0057 — tao_phieu_tra (D-15, XUAT-09)
-- Khuôn: supabase/tests/22_kho_theo_dong_test.sql
-- =============================================================================
begin;
select plan(18);

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

-- ─── Dựng dữ liệu ────────────────────────────────────────────────────────────
create temp table t_pt as
select pg_temp.sp_test('PT-ZQX-XUAT') as sp_x,
       pg_temp.sp_test('PT-ZQX-NHAP') as sp_n,
       pg_temp.kho_id('K1') as k1,
       pg_temp.kho_id('K2') as k2,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t_pt to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- =============================================================================
-- Kịch bản XUAT -> TRA_KHACH
-- Bootstrap tồn sp_x tại K2 bằng một phiếu NHẬP trước, rồi xuất sp_x TỪ K2
-- bằng dòng ghi đè kho (header phiếu xuất là K1, dòng chọn K2) — đúng D-13.
-- =============================================================================
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PT-BOOT-NHAP', 'NHAP', k2, doi_tac_id from t_pt;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'PT-BOOT-NHAP'), sp_x, 20, 100, 2000 from t_pt;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PT-BOOT-NHAP'));

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PT-GOC-XUAT', 'XUAT', k1, doi_tac_id from t_pt;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'), sp_x, 8, 0, 0, k2 from t_pt;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'));

select public.tao_phieu_tra((select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'));

-- ─── 1-5: header + dòng của TRA_KHACH sinh ra đúng ─────────────────────────
select is(
  (select loai_ct from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')),
  'TRA_KHACH'::public.loai_ct,
  'tu phieu XUAT sinh dung loai TRA_KHACH'
);
select is(
  (select count(*) from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')),
  1::bigint,
  'dung mot chung tu TRA_KHACH duoc tao, gan dung chung_tu_goc_id ve phieu XUAT goc'
);
select is(
  (select trang_thai from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')),
  'NHAP_LIEU'::public.trang_thai_ct,
  'TRA_KHACH sinh ra o trang thai NHAP_LIEU, chua ghi so'
);
select is(
  (select count(*) from public.chung_tu_dong
    where chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'))),
  1::bigint,
  'TRA_KHACH be nguyen so dong cua phieu goc (1 dong)'
);
select is(
  (select ctd.so_luong from public.chung_tu_dong ctd
    where ctd.chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'))),
  8::numeric(18,4),
  'dong TRA_KHACH giu nguyen so_luong cua dong goc (8)'
);

-- ─── 6: dòng TRA_KHACH giữ nguyên kho_id của DÒNG GỐC (K2), khác header (K1) ─
select is(
  (select ctd.kho_id from public.chung_tu_dong ctd
    where ctd.chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'))),
  (select k2 from t_pt),
  'dong TRA_KHACH giu nguyen kho_id cua dong goc (K2), khong phai kho dau phieu (K1)'
);

-- ─── 7-8: ghi sổ TRA_KHACH sau khi sửa còn một nửa -> tồn tăng đúng ở kho của dòng ──
update public.chung_tu_dong
set so_luong = 4
where chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'));

select public.ghi_so_chung_tu((select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')));

select is(
  (select tk.so_luong from public.ton_kho tk, t_pt where tk.kho_id = t_pt.k2 and tk.san_pham_id = t_pt.sp_x),
  16::numeric(18,4),
  'ghi so TRA_KHACH (4/8) lam ton sp_x tai K2 tang dung 4: 20 - 8 + 4 = 16'
);
select is(
  (select mv.kho_id from public.kho_movement mv
    where mv.chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'))),
  (select k2 from t_pt),
  'movement cua TRA_KHACH mang kho_id cua DONG (K2), khong phai header (K1)'
);

-- =============================================================================
-- Kịch bản NHAP -> TRA_NCC
-- =============================================================================
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PT-GOC-NHAP', 'NHAP', k1, doi_tac_id from t_pt;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP'), sp_n, 15, 50, 750 from t_pt;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PT-GOC-NHAP'));

select public.tao_phieu_tra((select id from public.chung_tu where so_ct = 'PT-GOC-NHAP'));

-- ─── 9-13: header + dòng của TRA_NCC sinh ra đúng ──────────────────────────
select is(
  (select loai_ct from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP')),
  'TRA_NCC'::public.loai_ct,
  'tu phieu NHAP sinh dung loai TRA_NCC'
);
select is(
  (select count(*) from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP')),
  1::bigint,
  'dung mot chung tu TRA_NCC duoc tao, gan dung chung_tu_goc_id ve phieu NHAP goc'
);
select is(
  (select trang_thai from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP')),
  'NHAP_LIEU'::public.trang_thai_ct,
  'TRA_NCC sinh ra o trang thai NHAP_LIEU, chua ghi so'
);
select is(
  (select count(*) from public.chung_tu_dong
    where chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP'))),
  1::bigint,
  'TRA_NCC be nguyen so dong cua phieu goc (1 dong)'
);
select is(
  (select ctd.so_luong from public.chung_tu_dong ctd
    where ctd.chung_tu_id = (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP'))),
  15::numeric(18,4),
  'dong TRA_NCC giu nguyen so_luong cua dong goc (15)'
);

-- ─── 14: ghi sổ TRA_NCC -> tồn giảm đúng bằng số trả ────────────────────────
select public.ghi_so_chung_tu((select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-NHAP')));

select is(
  (select tk.so_luong from public.ton_kho tk, t_pt where tk.kho_id = t_pt.k1 and tk.san_pham_id = t_pt.sp_n),
  0::numeric(18,4),
  'ghi so TRA_NCC lam ton sp_n tai K1 giam dung 15: 15 - 15 = 0'
);

-- ─── 15: chứng từ gốc còn NHAP_LIEU bị từ chối ─────────────────────────────
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PT-GOC-NHAPLIEU', 'NHAP', k1, doi_tac_id from t_pt;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'PT-GOC-NHAPLIEU'), sp_n, 1, 10, 10 from t_pt;

select throws_ok(
  $$ select public.tao_phieu_tra((select id from public.chung_tu where so_ct = 'PT-GOC-NHAPLIEU')) $$,
  '23514', null,
  'chung tu goc chua ghi so (con NHAP_LIEU) bi tu choi'
);

-- ─── 16: tạo phiếu trả từ một phiếu trả khác bị từ chối ────────────────────
select throws_ok(
  format($$ select public.tao_phieu_tra(%L) $$,
    (select id from public.chung_tu where chung_tu_goc_id = (select id from public.chung_tu where so_ct = 'PT-GOC-XUAT'))),
  '23514', null,
  'tao_phieu_tra tren mot phieu TRA_KHACH (khong phai NHAP/XUAT) bi tu choi'
);

-- ─── 17-18: thu_kho va chi_xem khong tao duoc phieu tra ─────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.tao_phieu_tra((select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')) $$,
  '42501', null,
  'thu_kho goi tao_phieu_tra bi tu choi 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$ select public.tao_phieu_tra((select id from public.chung_tu where so_ct = 'PT-GOC-XUAT')) $$,
  '42501', null,
  'chi_xem goi tao_phieu_tra bi tu choi 42501'
);

select * from finish();
rollback;
