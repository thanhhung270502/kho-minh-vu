-- =============================================================================
-- D-05 — Kho theo TỪNG DÒNG của phiếu nhập
--
-- Một chuyến hàng có thể chia về cả hai kho. Cột chung_tu_dong.kho_id là
-- NULLABLE có chủ đích: dòng không chọn kho rơi về chung_tu.kho_id, nên mọi
-- chứng từ cũ và mọi test Phase 1 giữ nguyên hành vi.
-- =============================================================================
begin;
select plan(6);

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

-- ─── Dựng phiếu nhập: header Kho 1, dòng A không chọn kho, dòng B chọn Kho 2 ──
create temp table t_kd as
select pg_temp.sp_test('KD-ZQX-A') as sp_a,
       pg_temp.sp_test('KD-ZQX-B') as sp_b,
       pg_temp.kho_id('K1')        as k1,
       pg_temp.kho_id('K2')        as k2,
       (select id from public.doi_tac where ma = 'NCC000001') as ncc;
grant select on t_kd to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id)
select 'PN-KD-ZQX', 'NHAP', current_date, k1, ncc from t_kd;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PN-KD-ZQX'), sp_a, 10, 1000, 10000, null from t_kd;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
select (select id from public.chung_tu where so_ct = 'PN-KD-ZQX'), sp_b, 5, 2000, 10000, k2 from t_kd;

select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-KD-ZQX'));

-- ─── 1–3: hàng đi đúng kho ──────────────────────────────────────────────────
select is(
  (select tk.so_luong from public.ton_kho tk, t_kd where tk.kho_id = t_kd.k1 and tk.san_pham_id = t_kd.sp_a),
  10::numeric(18,4),
  'dòng KHÔNG chọn kho rơi về kho của phiếu (Kho 1)'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t_kd where tk.kho_id = t_kd.k2 and tk.san_pham_id = t_kd.sp_b),
  5::numeric(18,4),
  'dòng chọn Kho 2 đi vào đúng Kho 2'
);

select is(
  (select coalesce(sum(tk.so_luong), 0) from public.ton_kho tk, t_kd
    where tk.kho_id = t_kd.k1 and tk.san_pham_id = t_kd.sp_b),
  0::numeric,
  'hàng của dòng chọn Kho 2 KHÔNG lọt sang kho của phiếu'
);

-- ─── 4–5: sổ cái ghi đúng ───────────────────────────────────────────────────
select is(
  (select count(*) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'PN-KD-ZQX')),
  2::bigint,
  'mỗi dòng đúng một movement, không nhân đôi'
);

select is(
  (select mv.kho_id from public.kho_movement mv, t_kd
    where mv.chung_tu_id = (select id from public.chung_tu where so_ct = 'PN-KD-ZQX')
      and mv.san_pham_id = t_kd.sp_b),
  (select k2 from t_kd),
  'movement của dòng B mang kho_id của DÒNG, không phải của phiếu'
);

-- ─── 6: thủ kho CHỈ có Kho 2 phải thấy phiếu dù header là Kho 1 ─────────────
-- Seed không có thủ kho nào CHỈ có Kho 2 (thukho1 = K1, thukho2 = K1+K2), nên
-- "thấy phiếu nhờ DÒNG" sẽ pass sai lý do nếu dùng thukho2. Gán lại thukho1 chỉ
-- còn K2 ngay trong transaction — cả file rollback nên dữ liệu thật không đổi.
select pg_temp.dang_xuat();

delete from public.nguoi_dung_kho
where nguoi_dung_id = (select id from auth.users where email = 'thukho1@khominhvu.local');

insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
select (select id from auth.users where email = 'thukho1@khominhvu.local'), pg_temp.kho_id('K2');

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select count(*) from public.chung_tu where so_ct = 'PN-KD-ZQX'),
  1::bigint,
  'thủ kho chỉ có Kho 2 vẫn thấy phiếu vì có dòng thuộc kho mình (header Kho 1)'
);

select * from finish();
rollback;
