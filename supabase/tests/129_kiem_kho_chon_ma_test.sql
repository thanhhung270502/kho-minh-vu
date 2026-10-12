-- =============================================================================
-- 0129 — Kiểm kho chọn theo mã: phiên chỉ gồm đúng các mã đã chọn, chặn đếm mã
-- ngoài danh sách, không trộn nhóm + mã, và RPC lấy nhanh mã đang âm của kho.
-- Khuôn: supabase/tests/102_quyen_chuc_vu_test.sql
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

-- ─── Dữ liệu: A, B được chọn; C ngoài danh sách. A âm -3, C dương 5 ở K1 ──────
create temp table t_k as
select pg_temp.sp_test('Q129-A') as a,
       pg_temp.sp_test('Q129-B') as b,
       pg_temp.sp_test('Q129-C') as c,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t_k to authenticated;

insert into public.ton_kho (kho_id, san_pham_id, so_luong)
select k1, a, -3 from t_k
union all select k1, c, 5 from t_k
on conflict (kho_id, san_pham_id) do update set so_luong = excluded.so_luong;

create temp table t_phien (id uuid);
grant select, insert on t_phien to authenticated;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

-- ─── 1-4: mở phiên theo mã (A chọn hai lần) ─────────────────────────────────
insert into t_phien
select id from public.mo_phien_kiem_ke((select k1 from t_k), null, 'test 0129',
  array[(select a from t_k), (select b from t_k), (select a from t_k)]);

-- array_agg(distinct) không giữ thứ tự chọn — so như tập hợp.
select ok(
  (select cardinality(pham_vi_san_pham) = 2
          and pham_vi_san_pham @> array[(select a from t_k), (select b from t_k)]
   from public.chung_tu where id = (select id from t_phien)),
  'lưu đúng các mã đã chọn, bỏ trùng');
select set_eq(
  format($$ select san_pham_id from public._pham_vi_kiem_ke(%L) $$, (select id from t_phien)),
  format($$ values (%L::uuid), (%L::uuid) $$, (select a from t_k), (select b from t_k)),
  'phạm vi phiên = đúng các mã đã chọn, không kéo thêm mã theo kho mặc định / tồn');
select is((select so_ma_chon from public.danh_sach_phien_kiem_ke(p_chung_tu_id => (select id from t_phien))),
  2, 'danh sách phiên trả so_ma_chon = 2');
select is((select so_trong_pham_vi from public.danh_sach_phien_kiem_ke(p_chung_tu_id => (select id from t_phien))),
  2::bigint, 'tiến độ đếm tính trên đúng 2 mã');

-- ─── 5-7: chặn đếm mã ngoài danh sách ───────────────────────────────────────
select lives_ok(
  format($$ select public.luu_dong_kiem_ke(%L, %L, 4) $$, (select id from t_phien), (select a from t_k)),
  'lưu số đếm cho mã trong danh sách');
select throws_ok(
  format($$ select public.luu_dong_kiem_ke(%L, %L, 4) $$, (select id from t_phien), (select c from t_k)),
  '23514', null, 'lưu số đếm cho mã ngoài danh sách bị từ chối');
select is(
  (public.nhap_so_dem_kiem_ke((select id from t_phien),
     jsonb_build_array(jsonb_build_object('ma_hang', 'Q129-C', 'so_dem', 1)), true) ->> 'so_loi')::int,
  1, 'nạp Excel: mã ngoài danh sách vào danh sách lỗi');

-- ─── 8-9: không trộn nhóm + mã; mã không tồn tại ────────────────────────────
select throws_ok(
  format($$ select public.mo_phien_kiem_ke(%L, array[(select id from public.nhom_hang limit 1)], null, array[%L::uuid]) $$,
    (select k1 from t_k), (select a from t_k)),
  '23514', null, 'chọn cả nhóm và mã bị từ chối');
select throws_ok(
  format($$ select public.mo_phien_kiem_ke(%L, null, null, array[%L::uuid]) $$,
    (select k1 from t_k), uuid_generate_v4()),
  '23514', null, 'mã không tồn tại bị từ chối');

-- ─── 10-11: mã đang âm của kho ──────────────────────────────────────────────
select ok(
  exists (select 1 from public.ma_ton_am_theo_kho((select k1 from t_k)) where san_pham_id = (select a from t_k) and ton = -3),
  'ma_ton_am_theo_kho trả mã đang âm kèm số tồn');
select ok(
  not exists (select 1 from public.ma_ton_am_theo_kho((select k1 from t_k)) where san_pham_id = (select c from t_k)),
  'ma_ton_am_theo_kho không trả mã tồn dương');

-- ─── 12: cùng cửa quyền Kiểm kho ────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  format($$ select * from public.ma_ton_am_theo_kho(%L) $$, (select k1 from t_k)),
  '42501', null, 'không có quyền Kiểm kho thì không lấy được danh sách mã âm');

select * from finish();
rollback;
