-- =============================================================================
-- 0076 — Đơn đặt hàng / phiếu xuất có người nhận nội bộ (nguoi_nhan_id)
-- Khuôn: supabase/tests/29_phieu_xuat_tu_don_test.sql
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

-- ─── Dữ liệu: người nhận = tài khoản quản lý, thukho2 bị ngưng hoạt động ────
create temp table t_nb as
select (select id from auth.users where email = 'quanly@khominhvu.local') as nguoi_nhan,
       (select nd.ho_ten from public.nguoi_dung nd
          join auth.users u on u.id = nd.id
         where u.email = 'quanly@khominhvu.local') as ten_nguoi_nhan,
       (select id from auth.users where email = 'thukho2@khominhvu.local') as nguoi_nghi,
       (select id from public.doi_tac limit 1) as doi_tac_id,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t_nb to authenticated;

update public.nguoi_dung set dang_hoat_dong = false where id = (select nguoi_nghi from t_nb);

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
values ('NB-ZQX-A', 'Hàng test nội bộ',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'),
        (select k1 from t_nb))
on conflict (ma_hang) do update set kho_mac_dinh_id = excluded.kho_mac_dinh_id;

-- ─── 1–3: cột ───────────────────────────────────────────────────────────────
select has_column('public', 'don_dat_hang', 'nguoi_nhan_id', 'don_dat_hang có nguoi_nhan_id');
select has_column('public', 'chung_tu', 'nguoi_nhan_id', 'chung_tu có nguoi_nhan_id');
select col_is_null('public', 'don_dat_hang', 'doi_tac_id', 'doi_tac_id được để null (đơn nội bộ)');

-- ─── 4–6: đúng một người nhận ───────────────────────────────────────────────
select throws_ok(
  $$ insert into public.don_dat_hang (so_dh, doi_tac_id, nguoi_nhan_id)
     select 'ZQX-NB-HAI', doi_tac_id, nguoi_nhan from t_nb $$,
  '23514', null, 'Đơn có cả đối tác lẫn người nhận nội bộ bị từ chối'
);
select throws_ok(
  $$ insert into public.don_dat_hang (so_dh) values ('ZQX-NB-KHONG') $$,
  '23514', null, 'Đơn không có người nhận nào bị từ chối'
);
select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, nguoi_nhan_id)
     select 'ZQX-NB-CT', 'XUAT', k1, doi_tac_id, nguoi_nhan from t_nb $$,
  '23514', null, 'Phiếu có cả đối tác lẫn người nhận nội bộ bị từ chối'
);

-- ─── 7–10: danh sách nhân viên ──────────────────────────────────────────────
select has_function('public', 'danh_sach_nguoi_nhan_noi_bo', array[]::text[],
  'danh_sach_nguoi_nhan_noi_bo() tồn tại');
select ok(
  not has_function_privilege('anon', 'public.danh_sach_nguoi_nhan_noi_bo()', 'execute'),
  'anon không gọi được'
);

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(
  exists (select 1 from public.danh_sach_nguoi_nhan_noi_bo() n, t_nb
          where n.id = t_nb.nguoi_nhan and n.ho_ten = t_nb.ten_nguoi_nhan),
  'Văn phòng thấy tài khoản khác (dù RLS nguoi_dung chỉ cho đọc chính mình)'
);
select ok(
  not exists (select 1 from public.danh_sach_nguoi_nhan_noi_bo() n, t_nb
              where n.id = t_nb.nguoi_nghi),
  'Tài khoản ngưng hoạt động không nằm trong danh sách'
);

-- ─── 11: văn phòng tạo đơn nội bộ qua RLS ───────────────────────────────────
select lives_ok(
  $$ insert into public.don_dat_hang (so_dh, nguoi_nhan_id)
     select 'ZQX-NB-01', nguoi_nhan from t_nb $$,
  'Văn phòng tạo được đơn nội bộ'
);
select pg_temp.dang_xuat();

create temp table t_don as
select id from public.don_dat_hang where so_dh = 'ZQX-NB-01';
grant select on t_don to authenticated;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from t_don), (select id from public.san_pham where ma_hang = 'NB-ZQX-A'), 3;

-- ─── 12–14: RPC đọc đơn ─────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ten_nguoi_nhan from public.chi_tiet_don((select id from t_don))),
  (select ten_nguoi_nhan from t_nb),
  'chi_tiet_don trả tên người nhận nội bộ'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_tu_khoa => (select ten_nguoi_nhan from t_nb))
          where id = (select id from t_don)),
  'danh_sach_don tìm được đơn theo tên nhân viên nhận'
);
select ok(
  not exists (select 1 from public.danh_sach_don(p_loai_nhan => 'NOI_BO', p_kich_thuoc => 200)
              where nguoi_nhan_id is null),
  'Lọc NOI_BO chỉ trả đơn nội bộ'
);
select pg_temp.dang_xuat();

-- ─── 15–18: phiếu xuất sinh từ đơn mang người nhận, hiện trên thẻ kho ──────
select public.xac_nhan_don((select id from t_don));
create temp table t_px as
select (public.tao_phieu_xuat_tu_don((select id from t_don))).id as id;
grant select on t_px to authenticated;

select is(
  (select nguoi_nhan_id from public.chung_tu where id = (select id from t_px)),
  (select nguoi_nhan from t_nb),
  'tao_phieu_xuat_tu_don chép người nhận nội bộ sang phiếu xuất'
);

update public.chung_tu set ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE' where id = (select id from t_px);
select public.ghi_so_chung_tu((select id from t_px));

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ten_nguoi_nhan from public.chi_tiet_chung_tu((select id from t_px))),
  (select ten_nguoi_nhan from t_nb),
  'chi_tiet_chung_tu trả tên người nhận nội bộ'
);
select is(
  (select ten_doi_tac from public.danh_sach_chung_tu(p_loai_ct => 'XUAT', p_tu_khoa => (select so_ct from public.chung_tu where id = (select id from t_px)))
    where id = (select id from t_px)),
  'Nội bộ — ' || (select ten_nguoi_nhan from t_nb),
  'danh_sach_chung_tu hiện "Nội bộ — <tên>"'
);
select is(
  (select doi_tac from public.the_kho_san_pham((select id from public.san_pham where ma_hang = 'NB-ZQX-A'))
    where chung_tu_id = (select id from t_px) limit 1),
  'Nội bộ — ' || (select ten_nguoi_nhan from t_nb),
  'Thẻ kho hiện "Nội bộ — <tên>"'
);
select pg_temp.dang_xuat();

select * from finish();
rollback;
