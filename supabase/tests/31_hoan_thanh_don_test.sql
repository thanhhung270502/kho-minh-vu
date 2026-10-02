-- =============================================================================
-- 0078 — Hoàn thành đơn = tạo + ghi sổ hóa đơn trong MỘT transaction; một đơn
-- tối đa một hóa đơn chưa hủy; hủy đơn; hủy hóa đơn đưa đơn về Đã xác nhận.
-- Khuôn: supabase/tests/29_phieu_xuat_tu_don_test.sql
-- =============================================================================
begin;
select plan(25);

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

create or replace function pg_temp.sp_test_kho(p_ma text, p_kho_id uuid)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'),
          p_kho_id)
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang, kho_mac_dinh_id = excluded.kho_mac_dinh_id
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

create or replace function pg_temp.don(p_so text)
returns uuid language sql stable as $helper$
  select id from public.don_dat_hang where so_dh = p_so;
$helper$;

create or replace function pg_temp.so_hoa_don(p_so text)
returns bigint language sql stable as $helper$
  select count(*) from public.chung_tu
  where loai_ct = 'XUAT' and don_dat_hang_id = pg_temp.don(p_so);
$helper$;

-- ─── Dữ liệu: mã mới ở K1, tồn 0 — mọi lần xuất đều là xuất âm ──────────────
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
values ('HTD-ZQX-A', 'Hàng test hoàn thành đơn',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'),
        (select id from public.kho where ma = 'K1'))
on conflict (ma_hang) do update set kho_mac_dinh_id = excluded.kho_mac_dinh_id;

create temp table t_htd as
select (select id from public.san_pham where ma_hang = 'HTD-ZQX-A') as sp,
       (select id from public.kho where ma = 'K1') as k1,
       (select id from public.doi_tac limit 1) as doi_tac_id;
grant select on t_htd to authenticated;

insert into public.don_dat_hang (so_dh, doi_tac_id)
select so, doi_tac_id from t_htd, unnest(array['DH-HTD-0','DH-HTD-1','DH-HTD-2','DH-HTD-3']) so;
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select pg_temp.don(so), sp, 3 from t_htd, unnest(array['DH-HTD-0','DH-HTD-1','DH-HTD-2','DH-HTD-3']) so;
select public.xac_nhan_don(pg_temp.don('DH-HTD-1'));
select public.xac_nhan_don(pg_temp.don('DH-HTD-3'));

create temp table t_ton as
select coalesce((select so_luong from public.ton_kho
                 where kho_id = (select k1 from t_htd) and san_pham_id = (select sp from t_htd)), 0) as truoc;
grant select on t_ton to authenticated;

-- ─── 1–3: hàm có, client không gọi thẳng được bước tạo phiếu ────────────────
select has_function('public', 'hoan_thanh_don', array['uuid','text','text'], 'có hoan_thanh_don');
select has_function('public', 'huy_don', array['uuid','text'], 'có huy_don');
select ok(
  not has_function_privilege('authenticated', 'public.tao_phieu_xuat_tu_don(uuid)', 'execute'),
  'client không gọi thẳng tao_phieu_xuat_tu_don — chỉ đi qua hoan_thanh_don'
);

-- ─── 4–5: điều kiện trạng thái và quyền ─────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-0')) $$,
  '23514', null, 'Đơn tạm chưa xác nhận không hoàn thành được'
);
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1'), 'LECH_TON_CHO_KIEM_KE') $$,
  '42501', null, 'Thủ kho không bấm Hoàn thành'
);
select pg_temp.dang_xuat();

-- ─── 6–9: xuất âm thiếu lý do — từ chối, KHÔNG để lại gì ────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_like(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1')) $$,
  '%HTD-ZQX-A (tồn %lý do xuất âm%',
  'Xuất âm mà không chọn lý do bị từ chối, báo bằng mã hàng'
);
select throws_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1'), 'BAY_BA') $$,
  '22023', null, 'Mã lý do lạ bị từ chối'
);
select pg_temp.dang_xuat();
select is(pg_temp.so_hoa_don('DH-HTD-1'), 0::bigint, 'Lỗi giữa chừng: không còn hóa đơn nháp nào');
select is((select trang_thai::text from public.don_dat_hang where id = pg_temp.don('DH-HTD-1')),
  'DA_XAC_NHAN', 'Lỗi giữa chừng: đơn vẫn Đã xác nhận');

-- ─── 10–14: hoàn thành có lý do ─────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1'), 'LECH_TON_CHO_KIEM_KE') $$,
  'Văn phòng hoàn thành đơn kèm lý do xuất âm'
);
select pg_temp.dang_xuat();
select is(
  (select count(*) from public.chung_tu
    where don_dat_hang_id = pg_temp.don('DH-HTD-1') and loai_ct = 'XUAT'
      and trang_thai = 'HOAN_THANH' and ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE'),
  1::bigint, 'Đúng một hóa đơn đã ghi sổ, mang lý do xuất âm'
);
select is((select trang_thai::text from public.don_dat_hang where id = pg_temp.don('DH-HTD-1')),
  'HOAN_THANH', 'Đơn chuyển Hoàn thành');
select is(
  (select so_luong from public.ton_kho where kho_id = (select k1 from t_htd) and san_pham_id = (select sp from t_htd)),
  (select truoc - 3 from t_ton), 'Tồn giảm đúng số đặt'
);
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select hoa_don_id from public.chi_tiet_don(pg_temp.don('DH-HTD-1'))),
  (select id from public.chung_tu where don_dat_hang_id = pg_temp.don('DH-HTD-1') and loai_ct = 'XUAT'),
  'chi_tiet_don trả id hóa đơn của đơn'
);
select pg_temp.dang_xuat();

-- ─── 15–16: không có hóa đơn thứ hai ────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1'), 'LECH_TON_CHO_KIEM_KE') $$,
  '23514', null, 'Bấm Hoàn thành lần hai bị từ chối'
);
select pg_temp.dang_xuat();
select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id)
     select 'ZQX-HTD-HAI', 'XUAT', k1, doi_tac_id, pg_temp.don('DH-HTD-1') from t_htd $$,
  '23505', null, 'Database chặn hóa đơn thứ hai cho cùng một đơn'
);

-- ─── 17–19: hủy hóa đơn đưa đơn về Đã xác nhận, hoàn thành lại được ─────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select public.huy_chung_tu(
  (select id from public.chung_tu where don_dat_hang_id = pg_temp.don('DH-HTD-1') and loai_ct = 'XUAT'),
  'Giao nhầm, làm lại');
select pg_temp.dang_xuat();
select is((select trang_thai::text from public.don_dat_hang where id = pg_temp.don('DH-HTD-1')),
  'DA_XAC_NHAN', 'Hủy hóa đơn: đơn quay về Đã xác nhận');
select is(
  (select so_luong from public.ton_kho where kho_id = (select k1 from t_htd) and san_pham_id = (select sp from t_htd)),
  (select truoc from t_ton), 'Hủy hóa đơn: tồn quay về số cũ'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-1'), 'LECH_TON_CHO_KIEM_KE') $$,
  'Sau khi hủy hóa đơn, đơn hoàn thành lại được (hóa đơn đã hủy không chặn)'
);
select pg_temp.dang_xuat();

-- ─── 20–25: hủy đơn ─────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ select public.huy_don(pg_temp.don('DH-HTD-2'), 'Khách đổi ý không lấy') $$,
  '42501', null, 'Văn phòng không hủy được đơn'
);
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select throws_ok(
  $$ select public.huy_don(pg_temp.don('DH-HTD-2'), 'ko') $$,
  '23514', null, 'Lý do hủy quá ngắn bị từ chối'
);
select lives_ok(
  $$ select public.huy_don(pg_temp.don('DH-HTD-2'), 'Khách đổi ý không lấy') $$,
  'Quản lý hủy đơn tạm'
);
select lives_ok(
  $$ select public.huy_don(pg_temp.don('DH-HTD-3'), 'Khách đổi ý không lấy') $$,
  'Quản lý hủy đơn đã xác nhận'
);
select throws_ok(
  $$ select public.huy_don(pg_temp.don('DH-HTD-1'), 'Không được hủy đơn đã giao') $$,
  '23514', null, 'Đơn đã hoàn thành không hủy được — hủy hóa đơn trước'
);
select throws_ok(
  $$ select public.hoan_thanh_don(pg_temp.don('DH-HTD-3'), 'LECH_TON_CHO_KIEM_KE') $$,
  '23514', null, 'Đơn đã hủy không hoàn thành được'
);
select pg_temp.dang_xuat();

select * from finish();
rollback;
