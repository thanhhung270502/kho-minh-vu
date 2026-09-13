-- =============================================================================
-- D-16 · DMUC-05 — Ẩn giá vốn khỏi SELECT trực tiếp, chỉ đọc qua RPC theo vai trò
--
-- authenticated không còn quyền SELECT mức bảng trên san_pham/kho_movement sau
-- 0029 — REVOKE mức bảng rồi GRANT lại từng cột trừ gia_von/gia_von_tai_thoi_diem.
-- Giá vốn chỉ lộ ra qua RPC gia_von_san_pham (SECURITY DEFINER, tự kiểm vai trò).
-- =============================================================================
begin;
select plan(11);

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

-- ─── Dựng dữ liệu dưới quyền postgres ────────────────────────────────────
create temp table t_id as
select pg_temp.sp_test('GV-ZQX-001') as sp,
       pg_temp.kho_id('K1')          as k1;
grant select on t_id to authenticated;

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 5, 12345 from t_id;

-- Giá vốn thật sau trigger, tra dưới quyền postgres — dùng làm giá trị kỳ
-- vọng thay vì hard-code lại công thức bình quân gia quyền trong test.
create temp table t_ky_vong as
select s.gia_von as gia_von_that
from public.san_pham s, t_id
where s.id = t_id.sp;
grant select on t_ky_vong to authenticated;

-- ─── Thủ kho: không đọc được giá vốn, vẫn đọc được mọi thứ khác ─────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select gia_von from public.san_pham limit 1$$,
  '42501', null,
  'thủ kho không SELECT được gia_von'
);
select throws_ok(
  $$select gia_von_tai_thoi_diem from public.kho_movement limit 1$$,
  '42501', null,
  'thủ kho không SELECT được gia_von_tai_thoi_diem'
);
select lives_ok(
  $$select id, ma_hang, ten_hang, gia_ban, kho_mac_dinh_id from public.san_pham limit 1$$,
  'thủ kho vẫn đọc các cột khác'
);
select is(
  (select count(*) from public.kho_movement where san_pham_id = (select sp from t_id)),
  1::bigint,
  'thủ kho vẫn đọc số lượng movement kho mình'
);
select throws_ok(
  $$select * from public.gia_von_san_pham(array[(select sp from t_id)])$$,
  '42501', null,
  'thủ kho gọi RPC giá vốn bị từ chối'
);
select lives_ok(
  $$select * from public.tim_san_pham('GV-ZQX')$$,
  'tìm sản phẩm vẫn chạy cho thủ kho'
);
select pg_temp.dang_xuat();

-- ─── Quản lý: kể cả select * cũng bị từ chối — giá vốn chỉ qua RPC ──────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select throws_ok(
  $$select * from public.san_pham limit 1$$,
  '42501', null,
  'kể cả quản lý không select * trực tiếp — giá vốn chỉ qua RPC'
);
select is(
  (select gia_von from public.gia_von_san_pham(array[(select sp from t_id)])),
  (select gia_von_that from t_ky_vong),
  'quản lý đọc giá vốn qua RPC'
);
select pg_temp.dang_xuat();

-- ─── Văn phòng: đọc được giá vốn qua RPC ────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select lives_ok(
  $$select * from public.gia_von_san_pham(array[(select sp from t_id)])$$,
  'văn phòng đọc giá vốn qua RPC'
);
select pg_temp.dang_xuat();

-- ─── Chỉ xem: RPC giá vốn cũng bị từ chối ────────────────────────────────
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

select throws_ok(
  $$select * from public.gia_von_san_pham(array[(select sp from t_id)])$$,
  '42501', null,
  'chỉ xem gọi RPC giá vốn bị từ chối'
);
select pg_temp.dang_xuat();

-- ─── tim_san_pham không còn trả nguyên hàng san_pham ────────────────────
select ok(
  not exists (
    select 1 from pg_proc p
    where p.proname = 'tim_san_pham' and p.prorettype = 'public.san_pham'::regtype
  ),
  'tim_san_pham không còn trả nguyên hàng san_pham'
);

select * from finish();
rollback;
