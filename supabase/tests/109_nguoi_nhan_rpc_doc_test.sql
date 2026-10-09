-- =============================================================================
-- 0091 — RPC đọc người nhận từ bảng nối: danh_sach_don (hai mảng, lọc theo người
-- nhận, loại nội bộ = doi_tac_id IS NULL), chi_tiet_don, dong_don,
-- chi_tiet_chung_tu, nguoi_nhan_dong_chung_tu; hoan_thanh_don chép người nhận
-- đơn + dòng sang hóa đơn; không còn hàm nào đọc cột nguoi_nhan_id cũ.
-- Khuôn: supabase/tests/108_don_nhieu_nguoi_nhan_test.sql
-- =============================================================================
begin;
select plan(32);

-- 0117: hoàn thành đơn đi theo quyền Xác nhận/duyệt đơn — bật cho văn phòng trong
-- transaction này để văn phòng làm được luồng hoàn thành.
insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select id, 'xac_nhan_don' from auth.users where email = 'vanphong@khominhvu.local'
on conflict do nothing;

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

-- ─── Dữ liệu: ba nhân viên, hai mã hàng ở K1 ───────────────────────────────
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values
  ('ZQX19-A', 'Nhân viên ZQX19 An'),
  ('ZQX19-B', 'Nhân viên ZQX19 Bình'),
  ('ZQX19-C', 'Nhân viên ZQX19 Cúc');

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
select m, 'Hàng test người nhận ' || m,
       (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI'),
       (select id from public.kho where ma = 'K1')
from (values ('NN19-ZQX-A'), ('NN19-ZQX-B')) v(m)
on conflict (ma_hang) do update set kho_mac_dinh_id = excluded.kho_mac_dinh_id;

create temp table t19 as
select (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX19-A') as a,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX19-B') as b,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX19-C') as c,
       'Nhân viên ZQX19 An'::text as ten_a,
       'Nhân viên ZQX19 Bình'::text as ten_b,
       (select id from public.san_pham where ma_hang = 'NN19-ZQX-A') as sp_a,
       (select id from public.san_pham where ma_hang = 'NN19-ZQX-B') as sp_b,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t19 to authenticated;

-- n = nội bộ {A,B}; d = đối tác + {B}; e = đối tác không nhân viên; g = đối tác + {A}, C vào qua dòng
create temp table t19_don (ten text, id uuid);
grant select, insert on t19_don to authenticated;

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into t19_don select 'n', public.tao_don(null, array[(select a from t19), (select b from t19)]);
insert into t19_don select 'd', public.tao_don((select doi_tac_id from t19), array[(select b from t19)]);
insert into t19_don select 'e', public.tao_don((select doi_tac_id from t19), '{}');
insert into t19_don select 'g', public.tao_don((select doi_tac_id from t19), array[(select a from t19)]);
select pg_temp.dang_xuat();

create or replace function pg_temp.don(p text) returns uuid language sql stable as $helper$
  select id from t19_don where ten = p;
$helper$;

-- Dòng: n có một dòng gán A và một dòng chung; d một dòng chung; g một dòng gán C (D1: C tự vào đơn).
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id) values
  (pg_temp.don('n'), (select sp_a from t19), 2, (select a from t19)),
  (pg_temp.don('n'), (select sp_b from t19), 3, null),
  (pg_temp.don('d'), (select sp_a from t19), 1, null),
  (pg_temp.don('g'), (select sp_a from t19), 1, (select c from t19));

-- Đơn cũ: mô phỏng backfill 0090 (cột cũ + một hàng bảng nối).
insert into public.don_dat_hang (so_dh, nguoi_nhan_id) values ('ZQX19-CU', (select a from t19));
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select id, nguoi_nhan_id, 1 from public.don_dat_hang where so_dh = 'ZQX19-CU';

-- ─── 1–3: hàm, quyền, không còn overload cũ ─────────────────────────────────
select has_function('public', 'nguoi_nhan_dong_chung_tu', array['uuid'], 'có nguoi_nhan_dong_chung_tu');
select ok(
  not has_function_privilege('anon', 'public.nguoi_nhan_dong_chung_tu(uuid)', 'execute'),
  'anon không gọi được nguoi_nhan_dong_chung_tu'
);
select is(
  (select count(*)::int from pg_proc where pronamespace = 'public'::regnamespace and proname = 'danh_sach_don'),
  1, 'danh_sach_don chỉ còn một overload'
);

-- ─── 4–12: danh_sach_don ────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select nguoi_nhan_ids from public.danh_sach_don(p_kich_thuoc => 200) where id = pg_temp.don('n')),
  array[(select a from t19), (select b from t19)],
  'danh_sach_don trả đủ người nhận của đơn theo thứ tự'
);
select is(
  (select ten_nguoi_nhan from public.danh_sach_don(p_kich_thuoc => 200) where id = pg_temp.don('n')),
  array[(select ten_a from t19), (select ten_b from t19)],
  'Mảng tên song song với mảng id'
);
select is(
  (select nguoi_nhan_ids from public.danh_sach_don(p_kich_thuoc => 200) where id = pg_temp.don('e')),
  '{}'::uuid[], 'Đơn đối tác không nhân viên trả mảng rỗng'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_nguoi_nhan_id => (select b from t19), p_kich_thuoc => 200) where id = pg_temp.don('n'))
  and exists (select 1 from public.danh_sach_don(p_nguoi_nhan_id => (select b from t19), p_kich_thuoc => 200) where id = pg_temp.don('d'))
  and not exists (select 1 from public.danh_sach_don(p_nguoi_nhan_id => (select b from t19), p_kich_thuoc => 200) where id in (pg_temp.don('e'), pg_temp.don('g'))),
  'Lọc theo người nhận B: ra đơn có B, không ra đơn chỉ có người khác'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_nguoi_nhan_id => (select c from t19), p_kich_thuoc => 200) where id = pg_temp.don('g')),
  'Người chỉ được thêm qua dòng (D1) cũng lọc ra đơn'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_loai_nhan => 'NOI_BO', p_kich_thuoc => 200) where id = pg_temp.don('n'))
  and not exists (select 1 from public.danh_sach_don(p_loai_nhan => 'NOI_BO', p_kich_thuoc => 200) where id in (pg_temp.don('d'), pg_temp.don('e'), pg_temp.don('g'))),
  'NOI_BO = doi_tac_id IS NULL: ra đơn tạo mới bằng tao_don, không ra đơn đối tác'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_loai_nhan => 'DOI_TAC', p_kich_thuoc => 200) where id = pg_temp.don('d'))
  and not exists (select 1 from public.danh_sach_don(p_loai_nhan => 'DOI_TAC', p_kich_thuoc => 200) where id = pg_temp.don('n')),
  'DOI_TAC ra đơn đối tác kèm nhân viên, không ra đơn nội bộ'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_tu_khoa => (select ten_b from t19), p_kich_thuoc => 200) where id = pg_temp.don('n'))
  and not exists (select 1 from public.danh_sach_don(p_tu_khoa => (select ten_b from t19), p_kich_thuoc => 200) where id = pg_temp.don('e')),
  'Từ khóa tên nhân viên tìm được đơn có người đó'
);
select is(
  (select tong_so_dong from public.danh_sach_don(p_nguoi_nhan_id => (select c from t19), p_kich_thuoc => 200) limit 1),
  1::bigint, 'Lọc theo người nhận: tổng số dòng đếm đúng'
);

-- ─── 13–17: chi_tiet_don, dong_don, đơn cũ ──────────────────────────────────
select is(
  (select nguoi_nhan_ids from public.chi_tiet_don(pg_temp.don('n'))),
  array[(select a from t19), (select b from t19)], 'chi_tiet_don trả mảng id người nhận'
);
select is(
  (select ten_nguoi_nhan from public.chi_tiet_don(pg_temp.don('n'))),
  array[(select ten_a from t19), (select ten_b from t19)], 'chi_tiet_don trả mảng tên người nhận'
);
select is(
  (select ten_nguoi_nhan from public.dong_don(pg_temp.don('n')) where san_pham_id = (select sp_a from t19)),
  (select ten_a from t19), 'dong_don: dòng đã gán trả tên người nhận'
);
select is(
  (select nguoi_nhan_id from public.dong_don(pg_temp.don('n')) where san_pham_id = (select sp_b from t19)),
  null::uuid, 'dong_don: dòng chung trả NULL'
);
select is(
  (select nguoi_nhan_ids from public.chi_tiet_don((select id from public.don_dat_hang where so_dh = 'ZQX19-CU'))),
  array[(select a from t19)], 'Đơn cũ (backfill) hiện đúng người nhận qua bảng nối'
);
select pg_temp.dang_xuat();

-- ─── Hoàn thành đơn nội bộ n và đơn đối tác d ───────────────────────────────
select public.xac_nhan_don(pg_temp.don('n'));
select public.xac_nhan_don(pg_temp.don('d'));
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select public.hoan_thanh_don(pg_temp.don('n'), 'LECH_TON_CHO_KIEM_KE');
select public.hoan_thanh_don(pg_temp.don('d'), 'LECH_TON_CHO_KIEM_KE');
select pg_temp.dang_xuat();

create temp table t19_hd as
select (select id from public.chung_tu where don_dat_hang_id = pg_temp.don('n') and loai_ct = 'XUAT') as n,
       (select id from public.chung_tu where don_dat_hang_id = pg_temp.don('d') and loai_ct = 'XUAT') as d;
grant select on t19_hd to authenticated;

-- ─── 18–22: hóa đơn mang người nhận của đơn và của dòng ────────────────────
select is(
  (select array_agg(nguoi_nhan_id order by thu_tu) from public.chung_tu_nguoi_nhan where chung_tu_id = (select n from t19_hd)),
  array[(select a from t19), (select b from t19)], 'Hóa đơn chép người nhận của đơn, đúng thứ tự'
);
select is(
  (select nguoi_nhan_id from public.chung_tu where id = (select n from t19_hd)),
  null::uuid, 'Cột chung_tu.nguoi_nhan_id cũ không còn được ghi'
);
select is(
  (select doi_tac_id from public.chung_tu where id = (select n from t19_hd)),
  null::uuid, 'Hóa đơn nội bộ không có đối tác'
);
select is(
  (select nguoi_nhan_id from public.chung_tu_dong where chung_tu_id = (select n from t19_hd) and san_pham_id = (select sp_a from t19)),
  (select a from t19), 'Dòng hóa đơn mang người nhận của dòng đơn'
);
select is(
  (select nguoi_nhan_id from public.chung_tu_dong where chung_tu_id = (select n from t19_hd) and san_pham_id = (select sp_b from t19)),
  null::uuid, 'Dòng chung vẫn là NULL'
);

-- ─── 23–28: đọc lại hóa đơn ─────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select nguoi_nhan_ids from public.chi_tiet_chung_tu((select n from t19_hd))),
  array[(select a from t19), (select b from t19)], 'chi_tiet_chung_tu trả mảng id'
);
select is(
  (select ten_nguoi_nhan from public.chi_tiet_chung_tu((select n from t19_hd))),
  array[(select ten_a from t19), (select ten_b from t19)], 'chi_tiet_chung_tu trả mảng tên'
);
select is(
  (select count(*)::int from public.nguoi_nhan_dong_chung_tu((select n from t19_hd))),
  1, 'nguoi_nhan_dong_chung_tu chỉ trả dòng đã gán'
);
select is(
  (select ten_nguoi_nhan from public.nguoi_nhan_dong_chung_tu((select n from t19_hd))
   where nguoi_nhan_id = (select a from t19)),
  (select ten_a from t19), 'nguoi_nhan_dong_chung_tu trả đúng người và tên của dòng'
);
select is(
  (select ten_doi_tac from public.danh_sach_chung_tu(p_loai_ct => 'XUAT', p_tu_khoa => (select so_ct from public.chung_tu where id = (select n from t19_hd)))
   where id = (select n from t19_hd)),
  (select ten_a from t19) || ', ' || (select ten_b from t19),
  'danh_sach_chung_tu hiện "<tên A>, <tên B>", không tiền tố (0108)'
);
select is(
  (select doi_tac from public.the_kho_san_pham((select sp_a from t19)) where chung_tu_id = (select n from t19_hd) limit 1),
  (select ten_a from t19) || ', ' || (select ten_b from t19),
  'Thẻ kho hiện cùng chuỗi'
);
select pg_temp.dang_xuat();

create or replace function pg_temp.go_nguoi_nhan_dong(p_ct uuid)
returns integer language plpgsql as $helper$
declare v integer;
begin
  update public.chung_tu_dong set nguoi_nhan_id = null where chung_tu_id = p_ct;
  get diagnostics v = row_count;
  return v;
end $helper$;

-- ─── 29–30: hóa đơn đã ghi sổ bị khóa ───────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select is(
  pg_temp.go_nguoi_nhan_dong((select n from t19_hd)),
  0, 'Văn phòng không sửa được người nhận dòng của hóa đơn đã ghi sổ'
);
select throws_ok(
  $$ insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
     select (select d from t19_hd), (select c from t19), 9 $$,
  '42501', null, 'Client không ghi thẳng bảng nối của hóa đơn'
);
select pg_temp.dang_xuat();

-- ─── 31: đơn đối tác kèm nhân viên ──────────────────────────────────────────
select ok(
  (select doi_tac_id is not null from public.chung_tu where id = (select d from t19_hd))
  and (select array_agg(nguoi_nhan_id) from public.chung_tu_nguoi_nhan where chung_tu_id = (select d from t19_hd))
      = array[(select b from t19)],
  'Hóa đơn của đơn đối tác kèm nhân viên có cả đối tác lẫn người nhận'
);

-- ─── 32: không hàm nào còn đọc cột cũ ───────────────────────────────────────
select is(
  (select count(*)::int from pg_proc
   where pronamespace = 'public'::regnamespace
     and prosrc ~ '\m(dh|ct|goc|v_don|v_ct)\.nguoi_nhan_id'),
  0, 'Không còn hàm public nào đọc cột nguoi_nhan_id cũ của đơn/hóa đơn'
);

select * from finish();
rollback;
