-- =============================================================================
-- 0055 — goi_y_ma_trung + ghi_de_nghi_gop_ma (D-14)
-- Khuôn: supabase/tests/22_kho_theo_dong_test.sql
-- =============================================================================
begin;
select plan(10);

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

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

-- ─── Dựng hai mã tên gần giống — mã B sẽ có tồn ở K1, không có tồn ở K2 ─────
create temp table t_gop as
with a as (
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values ('GOP-ZQX-A', 'Nhông xích 428',
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id
),
b as (
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values ('GOP-ZQX-B', 'Nhong xich 428 loai 2',
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id
)
select (select id from a) as sp_a, (select id from b) as sp_b,
       pg_temp.kho_id('K1') as k1, pg_temp.kho_id('K2') as k2,
       (select id from public.doi_tac where ma = 'NCC000001') as ncc;
grant select on t_gop to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- Ghi sổ một phiếu nhập cho mã B ở K1 để nó có tồn.
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id)
select 'PN-GOP-ZQX', 'NHAP', current_date, k1, ncc from t_gop;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien)
select (select id from public.chung_tu where so_ct = 'PN-GOP-ZQX'), sp_b, 20, 1000, 20000 from t_gop;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-GOP-ZQX'));

-- Chụp lại trạng thái TRƯỚC khi gọi ghi_de_nghi_gop_ma — dùng cho assert
-- "không tác dụng phụ" ở cuối bài test.
create temp table t_gop_truoc as
select
  (select count(*) from public.kho_movement) as so_dong_km,
  coalesce((select tk.so_luong from public.ton_kho tk, t_gop where tk.san_pham_id = t_gop.sp_a and tk.kho_id = t_gop.k1), 0) as ton_a,
  coalesce((select tk.so_luong from public.ton_kho tk, t_gop where tk.san_pham_id = t_gop.sp_b and tk.kho_id = t_gop.k1), 0) as ton_b;
grant select on t_gop_truoc to authenticated;

-- ─── 1: gợi ý ở đúng kho có tồn ──────────────────────────────────────────────
select ok(
  exists (
    select 1 from public.goi_y_ma_trung((select sp_a from t_gop), (select k1 from t_gop)) g, t_gop
    where g.san_pham_id = t_gop.sp_b and g.ton > 0
  ),
  'goi_y_ma_trung(A, K1) tra ma B con ton > 0'
);

-- ─── 2: kho không có tồn thì không gợi ý ───────────────────────────────────
select is(
  (select count(*) from public.goi_y_ma_trung((select sp_a from t_gop), (select k2 from t_gop))),
  0::bigint,
  'goi_y_ma_trung(A, K2) tra 0 dong vi ma B khong co ton o K2'
);

-- ─── 3: không tự gợi ý chính nó ─────────────────────────────────────────────
select is(
  (select count(*) from public.goi_y_ma_trung((select sp_a from t_gop), null::uuid) g, t_gop
   where g.san_pham_id = t_gop.sp_a),
  0::bigint,
  'goi_y_ma_trung khong tra chinh p_san_pham_id'
);

-- ─── 4: ghi đề nghị hai lần chỉ tạo đúng một dòng CHO_XU_LY ────────────────
select public.ghi_de_nghi_gop_ma((select sp_a from t_gop), (select sp_b from t_gop));
select public.ghi_de_nghi_gop_ma((select sp_a from t_gop), (select sp_b from t_gop));

select is(
  (select count(*) from public.de_nghi_gop_ma, t_gop
   where least(san_pham_id_a, san_pham_id_b) = least(t_gop.sp_a, t_gop.sp_b)
     and greatest(san_pham_id_a, san_pham_id_b) = greatest(t_gop.sp_a, t_gop.sp_b)
     and trang_thai = 'CHO_XU_LY'),
  1::bigint,
  'ghi_de_nghi_gop_ma goi hai lan van chi co 1 dong CHO_XU_LY'
);

-- ─── 5: gộp một mã với chính nó bị chặn ─────────────────────────────────────
select throws_ok(
  format($$ select public.ghi_de_nghi_gop_ma(%L, %L) $$, (select sp_a from t_gop), (select sp_a from t_gop)),
  '23514', null,
  'ghi_de_nghi_gop_ma voi hai ma giong nhau bi 23514'
);

-- ─── 6–8: không tác dụng phụ lên kho_movement / tồn ────────────────────────
select is(
  (select count(*) from public.kho_movement),
  (select so_dong_km from t_gop_truoc),
  'ghi_de_nghi_gop_ma khong them dong kho_movement nao'
);

select is(
  coalesce((select tk.so_luong from public.ton_kho tk, t_gop where tk.san_pham_id = t_gop.sp_a and tk.kho_id = t_gop.k1), 0),
  (select ton_a from t_gop_truoc),
  'ton ma A khong doi sau ghi_de_nghi_gop_ma'
);

select is(
  coalesce((select tk.so_luong from public.ton_kho tk, t_gop where tk.san_pham_id = t_gop.sp_b and tk.kho_id = t_gop.k1), 0),
  (select ton_b from t_gop_truoc),
  'ton ma B khong doi sau ghi_de_nghi_gop_ma'
);

-- ─── 9: chi_xem không đề nghị được ──────────────────────────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  format($$ select public.ghi_de_nghi_gop_ma(%L, %L) $$, (select sp_a from t_gop), (select sp_b from t_gop)),
  '42501', null,
  'chi_xem goi ghi_de_nghi_gop_ma bi tu choi 42501'
);

-- ─── 10: thu_kho không đọc được bảng đề nghị (RLS lọc) ─────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is(
  (select count(*) from public.de_nghi_gop_ma),
  0::bigint,
  'thu_kho khong doc duoc de_nghi_gop_ma, RLS loc het'
);

select * from finish();
rollback;
