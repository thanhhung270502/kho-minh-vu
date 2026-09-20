-- =============================================================================
-- 0053 — sinh_so_dh: bộ cấp số đơn đặt hàng, an toàn với gọi đồng thời.
-- Dùng năm 2091 để không neo vào bộ đếm số thật đang chạy của năm hiện hành
-- (bẫy 16 — CLAUDE.md).
-- Khuôn: supabase/tests/80_cau_hinh_so_ct_test.sql
-- =============================================================================
begin;
select plan(8);

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

-- ─── 1-2: hai lần gọi liên tiếp năm 2091 trả hai chuỗi khác nhau, tăng dần ──
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

create temp table t_so_dh as
select public.sinh_so_dh(2091::smallint) as lan_1,
       public.sinh_so_dh(2091::smallint) as lan_2;

select isnt(
  (select lan_1 from t_so_dh),
  (select lan_2 from t_so_dh),
  'goi sinh_so_dh(2091) hai lan lien tiep tra hai chuoi khac nhau'
);

select ok(
  (select split_part(lan_2, '-', 2)::int from t_so_dh)
  > (select split_part(lan_1, '-', 2)::int from t_so_dh),
  'so phan duoi lan sau lon hon lan truoc'
);

-- ─── 3: chuỗi trả về khớp dạng DH91-000001 ───────────────────────────────────
select matches(
  (select lan_1 from t_so_dh),
  '^DH91-\d{6}$',
  'so dh khop dinh dang DH{YY}-{6 chu so}'
);

-- ─── 4: năm hiện tại — chỉ so sánh tương đối, KHÔNG assert gia tri cu the ──
create temp table t_so_nam_nay as
select public.sinh_so_dh() as lan_1, public.sinh_so_dh() as lan_2;

select isnt(
  (select lan_1 from t_so_nam_nay),
  (select lan_2 from t_so_nam_nay),
  'nam hien tai: hai lan goi sinh_so_dh() tra hai ket qua khac nhau'
);

-- ─── 5-7: quyen theo vai tro (D-06) ─────────────────────────────────────────
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$ select public.sinh_so_dh(2091::smallint) $$,
  '42501', null,
  'chi_xem goi sinh_so_dh bi tu choi 42501'
);

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.sinh_so_dh(2091::smallint) $$,
  '42501', null,
  'thukho1 goi sinh_so_dh bi tu choi 42501 - D-06 ep o tang database'
);

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  $$ select public.sinh_so_dh(2091::smallint) $$,
  'van_phong goi sinh_so_dh khong nem loi'
);

-- ─── 8: ngu canh khong co JWT (script/migration) van goi duoc ───────────────
select pg_temp.dang_xuat();
select lives_ok(
  $$ select public.sinh_so_dh(2091::smallint) $$,
  'ngu canh khong JWT (postgres) goi sinh_so_dh khong nem loi'
);

select * from finish();
rollback;
