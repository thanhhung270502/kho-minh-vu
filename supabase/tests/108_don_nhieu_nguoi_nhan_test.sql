-- =============================================================================
-- 0090 — Đơn nhiều người nhận: bảng nối, bất biến D1/D3, chặn bỏ người đang
-- dùng, RPC tao_don / dat_nguoi_nhan_don, backfill, RLS + quyền bảng nối.
-- Khuôn: supabase/tests/30_don_noi_bo_test.sql
-- =============================================================================
begin;
select plan(41);

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

-- ─── Dữ liệu: bốn nhân viên đang dùng, một đã ngừng, hai mã hàng ───────────
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values
  ('ZQX18-A', 'Nhân viên ZQX18 An'),
  ('ZQX18-B', 'Nhân viên ZQX18 Bình'),
  ('ZQX18-C', 'Nhân viên ZQX18 Cúc'),
  ('ZQX18-D', 'Nhân viên ZQX18 Dũng');
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du, dang_dung)
values ('ZQX18-N', 'Nhân viên ZQX18 Nghỉ', false);

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
select m, 'Hàng test người nhận ' || m,
       (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI')
from (values ('NN18-ZQX-A'), ('NN18-ZQX-B')) v(m)
on conflict (ma_hang) do nothing;

create temp table t18 as
select (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX18-A') as a,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX18-B') as b,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX18-C') as c,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX18-D') as d,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX18-N') as n,
       (select id from public.san_pham where ma_hang = 'NN18-ZQX-A') as sp_a,
       (select id from public.san_pham where ma_hang = 'NN18-ZQX-B') as sp_b,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t18 to authenticated;

create temp table t18_don (id uuid);
grant select, insert on t18_don to authenticated;
create temp table t18_dt (id uuid);
grant select, insert on t18_dt to authenticated;
create temp table t18_trong (id uuid);
grant select, insert on t18_trong to authenticated;

-- ─── 1–10: cấu trúc, RLS, quyền ─────────────────────────────────────────────
select has_table('public', 'don_dat_hang_nguoi_nhan', 'có bảng nối đơn ↔ người nhận');
select has_table('public', 'chung_tu_nguoi_nhan', 'có bảng nối hóa đơn ↔ người nhận');
select has_column('public', 'don_dat_hang_dong', 'nguoi_nhan_id', 'dòng đơn có nguoi_nhan_id');
select has_column('public', 'chung_tu_dong', 'nguoi_nhan_id', 'dòng chứng từ có nguoi_nhan_id');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where relname in ('don_dat_hang_nguoi_nhan', 'chung_tu_nguoi_nhan')),
  'RLS bật ở cả hai bảng nối'
);
select ok(
  not has_table_privilege('authenticated', 'public.don_dat_hang_nguoi_nhan', 'insert'),
  'authenticated không có quyền insert don_dat_hang_nguoi_nhan'
);
select ok(
  not has_table_privilege('authenticated', 'public.chung_tu_nguoi_nhan', 'insert'),
  'authenticated không có quyền insert chung_tu_nguoi_nhan'
);
select ok(
  not has_function_privilege('anon', 'public.tao_don(uuid,uuid[])', 'execute'),
  'anon không gọi được tao_don'
);
select ok(
  not has_function_privilege('anon', 'public.dat_nguoi_nhan_don(uuid,uuid,uuid[])', 'execute'),
  'anon không gọi được dat_nguoi_nhan_don'
);
select is(
  (select count(*)::int from pg_constraint where conname = 'ck_ddh_mot_nguoi_nhan'), 0,
  'ck_ddh_mot_nguoi_nhan đã bỏ'
);

-- ─── 11–12: backfill không mất người nào ────────────────────────────────────
select is(
  (select count(*)::int from public.don_dat_hang d
   where d.nguoi_nhan_id is not null
     and not exists (select 1 from public.don_dat_hang_nguoi_nhan x
                     where x.don_dat_hang_id = d.id and x.nguoi_nhan_id = d.nguoi_nhan_id)),
  0, 'Mọi đơn cũ có nguoi_nhan_id đều được chép sang bảng nối'
);
select is(
  (select count(*)::int from public.chung_tu c
   where c.nguoi_nhan_id is not null
     and not exists (select 1 from public.chung_tu_nguoi_nhan x
                     where x.chung_tu_id = c.id and x.nguoi_nhan_id = c.nguoi_nhan_id)),
  0, 'Mọi hóa đơn cũ có nguoi_nhan_id đều được chép sang bảng nối'
);

-- ─── 13–15: tao_don nội bộ, thứ tự giữ nguyên ───────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into t18_don select public.tao_don(null, array[(select a from t18), (select b from t18)]);
select pg_temp.dang_xuat();

select is(
  (select thu_tu from public.don_dat_hang_nguoi_nhan
   where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select a from t18)),
  1, 'tao_don: người đầu tiên có thu_tu 1'
);
select is(
  (select thu_tu from public.don_dat_hang_nguoi_nhan
   where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select b from t18)),
  2, 'tao_don: người thứ hai có thu_tu 2'
);
select ok(
  (select doi_tac_id is null from public.don_dat_hang where id = (select id from t18_don)),
  'tao_don nội bộ: doi_tac_id NULL'
);

-- ─── 16–17: từ chối ─────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
-- 0097: đơn tạm được tạo trống người nhận. 0098: bấm lại thì dùng lại đơn trống đó.
insert into t18_trong select public.tao_don(null, '{}');
select is(
  public.tao_don(null, '{}'), (select id from t18_trong),
  'tao_don trống: lần bấm sau dùng lại đơn tạm trống, không cấp số mới'
);
select throws_ok(
  $$ select public.tao_don(null, array[(select n from t18)]) $$,
  '23514', null, 'tao_don không nhận nhân viên đã ngừng dùng'
);

-- ─── 18–20: đơn đối tác ─────────────────────────────────────────────────────
select lives_ok(
  $$ select public.tao_don((select doi_tac_id from t18), '{}') $$,
  'tao_don đối tác không nhân viên nào hợp lệ'
);
select lives_ok(
  $$ insert into t18_dt select public.tao_don((select doi_tac_id from t18), array[(select a from t18)]) $$,
  'tao_don đối tác kèm một nhân viên hợp lệ'
);
select is(
  (select count(*)::int from public.don_dat_hang_nguoi_nhan where don_dat_hang_id = (select id from t18_dt)),
  1, 'Đơn đối tác kèm nhân viên có 1 dòng bảng nối'
);

-- ─── 21–22: quyền ───────────────────────────────────────────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$ select public.tao_don(null, array[(select a from t18)]) $$,
  '42501', null, 'Chức vụ không có quyền Tạo đơn bị từ chối (42501)'
);
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
     select (select id from t18_don), d, 9 from t18 $$,
  '42501', null, 'Client không ghi thẳng được bảng nối'
);

-- ─── 23–25: D1 — dòng tự thêm người vào đơn ─────────────────────────────────
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id)
select (select id from t18_don), sp_a, 1, c from t18;
select is(
  (select thu_tu from public.don_dat_hang_nguoi_nhan
   where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select c from t18)),
  3, 'D1: gán dòng cho C tự thêm C vào đơn (thu_tu 3)'
);
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from t18_don), sp_b, 1 from t18;
select is(
  (select count(*)::int from public.don_dat_hang_nguoi_nhan where don_dat_hang_id = (select id from t18_don)),
  3, 'D2: dòng không gán người nhận không thêm ai'
);
update public.don_dat_hang_dong set nguoi_nhan_id = (select d from t18)
where don_dat_hang_id = (select id from t18_don) and san_pham_id = (select sp_b from t18);
select ok(
  exists (select 1 from public.don_dat_hang_nguoi_nhan
          where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select d from t18)),
  'D1: đổi người nhận của dòng sang D tự thêm D vào đơn'
);

-- ─── 26–27: chặn bỏ người còn gán ở dòng ────────────────────────────────────
select throws_like(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), null,
       array[(select a from t18), (select b from t18), (select d from t18)]) $$,
  '%NN18-ZQX-A%', 'Bỏ C khi C còn ở dòng: thông báo nêu mã hàng'
);
select throws_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), null,
       array[(select a from t18), (select b from t18), (select d from t18)]) $$,
  '23514', null, 'Bỏ C khi C còn ở dòng bị từ chối (23514)'
);

-- ─── 28–32: đặt lại tập người nhận ──────────────────────────────────────────
select lives_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), null,
       array[(select b from t18), (select a from t18), (select c from t18), (select d from t18)]) $$,
  'dat_nguoi_nhan_don đặt lại thứ tự'
);
select is(
  (select thu_tu from public.don_dat_hang_nguoi_nhan
   where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select b from t18)),
  1, 'B đứng đầu sau khi đặt lại thứ tự'
);
update public.don_dat_hang_dong set nguoi_nhan_id = null
where don_dat_hang_id = (select id from t18_don);
select lives_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), null,
       array[(select b from t18), (select a from t18)]) $$,
  'Bỏ C, D khi không còn dòng nào gán họ'
);
select is(
  (select count(*)::int from public.don_dat_hang_nguoi_nhan where don_dat_hang_id = (select id from t18_don)),
  2, 'Bảng nối còn đúng 2 người'
);
select lives_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_trong), null, '{}') $$,
  'Đơn tạm đặt người nhận rỗng được (0097 — chọn sau trong trang đơn)'
);

-- ─── 33–35: người đã ngừng dùng ─────────────────────────────────────────────
select pg_temp.dang_xuat();
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select (select id from t18_don), n, 9 from t18;
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), null,
       array[(select b from t18), (select a from t18), (select n from t18)]) $$,
  'Người cũ đã ngừng dùng được giữ khi lưu lại cùng tập'
);
select ok(
  exists (select 1 from public.don_dat_hang_nguoi_nhan
          where don_dat_hang_id = (select id from t18_don) and nguoi_nhan_id = (select n from t18)),
  'Người đã ngừng dùng vẫn còn trong đơn'
);
select throws_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_dt), (select doi_tac_id from t18),
       array[(select a from t18), (select n from t18)]) $$,
  '23514', null, 'Thêm MỚI người đã ngừng dùng bị từ chối'
);

-- ─── 36–37: chuyển nội bộ → đối tác ─────────────────────────────────────────
select lives_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), (select doi_tac_id from t18),
       array[(select a from t18)]) $$,
  'Chuyển đơn nội bộ sang đối tác'
);
select is(
  (select doi_tac_id from public.don_dat_hang where id = (select id from t18_don)),
  (select doi_tac_id from t18), 'Đơn đã mang đối tác'
);

-- ─── 38–39: đơn đã xác nhận không sửa được ──────────────────────────────────
select pg_temp.dang_xuat();
update public.don_dat_hang set trang_thai = 'DA_XAC_NHAN' where id = (select id from t18_don);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ select public.dat_nguoi_nhan_don((select id from t18_don), (select doi_tac_id from t18),
       array[(select a from t18), (select b from t18)]) $$,
  '23514', null, 'dat_nguoi_nhan_don từ chối đơn không còn TAM'
);
with u as (
  update public.don_dat_hang_dong set nguoi_nhan_id = (select a from t18)
  where don_dat_hang_id = (select id from t18_don) returning 1
)
select is((select count(*)::int from u), 0, 'RLS: không sửa được dòng của đơn đã xác nhận');

-- ─── 40: trigger chặn xóa thẳng người còn ở dòng ────────────────────────────
select pg_temp.dang_xuat();
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id)
select (select id from t18_dt), sp_a, 1, a from t18;
select throws_ok(
  $$ delete from public.don_dat_hang_nguoi_nhan
     where don_dat_hang_id = (select id from t18_dt) and nguoi_nhan_id = (select a from t18) $$,
  '23514', null, 'Xóa thẳng người còn gán ở dòng bị trigger chặn'
);

-- ─── 41: D3 — constraint trigger hoãn (đặt cuối để không kéo sự kiện khác) ──
create function pg_temp.don_noi_bo_rong() returns void language plpgsql as $h$
begin
  insert into public.don_dat_hang (so_dh, trang_thai) values ('ZQX18-RONG', 'DA_XAC_NHAN');
  set constraints public.kiem_don_noi_bo_co_nguoi_nhan immediate;
end $h$;
select throws_ok(
  'select pg_temp.don_noi_bo_rong()',
  '23514', 'Chọn người nhận (nhân viên hoặc khách hàng) trước khi xác nhận đơn', 'D3: đơn nội bộ đã xác nhận mà rỗng không commit được'
);
set constraints all deferred;

select * from finish();
rollback;
