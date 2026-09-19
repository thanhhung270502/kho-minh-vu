-- =============================================================================
-- D-02 — Giá vốn đầu kỳ: cửa hợp lệ duy nhất để đặt gia_von từ ngoài
--
-- Ba lớp chặn phải đứng vững: vai trò, "chỉ khi đang 0", và nhật ký.
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

create temp table t_gv as select pg_temp.sp_test('GV-ZQX-1') as sp;
grant select on t_gv to authenticated;

-- ─── 1–2: quản lý đặt được, đặt lần hai bị bỏ qua ───────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select public.dat_gia_von_dau_ky('[{"ma_hang":"GV-ZQX-1","gia_von":12500}]'::jsonb, false);

-- Đọc giá vốn qua RPC, KHÔNG select thẳng cột: 0029 đã thu quyền đọc cột
-- gia_von của authenticated (bẫy 5 trong CLAUDE.md).
select is(
  (select gv.gia_von from t_gv, public.gia_von_san_pham(array[t_gv.sp]) gv),
  12500::numeric(18,4),
  'quản lý đặt được giá vốn cho mã đang có giá vốn 0'
);

select is(
  (public.dat_gia_von_dau_ky('[{"ma_hang":"GV-ZQX-1","gia_von":999}]'::jsonb, false) ->> 'bo_qua')::int,
  1,
  'mã đã có giá vốn thì BỎ QUA, không đè'
);

select is(
  (select gv.gia_von from t_gv, public.gia_von_san_pham(array[t_gv.sp]) gv),
  12500::numeric(18,4),
  'giá vốn giữ nguyên sau lần đặt thứ hai'
);

-- ─── 3: ghi nhật ký tường minh (trigger 0027 bỏ qua cột gia_von) ────────────
-- nhat_ky_sua bật RLS mà KHÔNG có policy (cố ý) — client chỉ đọc qua RPC
-- lich_su_sua. Đọc thẳng bảng phải về vai postgres.
select pg_temp.dang_xuat();

select is(
  (select count(*) from public.nhat_ky_sua nk, t_gv
    where nk.ban_ghi_id = t_gv.sp and nk.truong = 'gia_von' and nk.nguon = 'gia_von_dau_ky'),
  1::bigint,
  'mỗi lần đặt ghi đúng một dòng nhật ký nguồn gia_von_dau_ky'
);

-- ─── 4–5: vai trò khác bị chặn ──────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$ select public.dat_gia_von_dau_ky('[{"ma_hang":"GV-ZQX-1","gia_von":1}]'::jsonb, false) $$,
  '42501', null,
  'văn phòng không đặt được giá vốn đầu kỳ'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$ select public.dat_gia_von_dau_ky('[{"ma_hang":"GV-ZQX-1","gia_von":1}]'::jsonb, true) $$,
  '42501', null,
  'thủ kho không xem trước được, kể cả chế độ chỉ kiểm tra'
);

select * from finish();
rollback;
