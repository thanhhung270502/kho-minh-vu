-- =============================================================================
-- 0076 + 0077 — Đơn đặt hàng / phiếu xuất có người nhận nội bộ (nguoi_nhan_id)
-- 0077 đổi đích: người nhận nội bộ là NHÂN VIÊN PHỤ TRÁCH (bảng riêng, có tên
-- viết tắt + tên đầy đủ), không còn là tài khoản đăng nhập nguoi_dung.
-- Khuôn: supabase/tests/29_phieu_xuat_tu_don_test.sql
-- 0090: CHECK một-người-nhận của đơn đã bỏ (xem 108)
-- 0091: RPC đọc/chép người nhận qua bảng nối (xem 109); phần dưới tạo đơn bằng tao_don
-- =============================================================================
begin;
select plan(26);

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

-- ─── Dữ liệu: một nhân viên đang dùng, một nhân viên đã ngừng ──────────────
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du)
values ('ZQX-A', 'Nhân viên ZQX An');
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du, dang_dung)
values ('ZQX-N', 'Nhân viên ZQX Nghỉ', false);

create temp table t_nb as
select (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX-A') as nguoi_nhan,
       'Nhân viên ZQX An'::text as ten_nguoi_nhan,
       (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX-N') as nguoi_nghi,
       (select id from public.doi_tac limit 1) as doi_tac_id,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t_nb to authenticated;

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
values ('NB-ZQX-A', 'Hàng test nội bộ',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'),
        (select k1 from t_nb))
on conflict (ma_hang) do update set kho_mac_dinh_id = excluded.kho_mac_dinh_id;

-- ─── 1–7: cột và bảng ───────────────────────────────────────────────────────
select has_column('public', 'don_dat_hang', 'nguoi_nhan_id', 'don_dat_hang có nguoi_nhan_id');
select has_column('public', 'chung_tu', 'nguoi_nhan_id', 'chung_tu có nguoi_nhan_id');
select col_is_null('public', 'don_dat_hang', 'doi_tac_id', 'doi_tac_id được để null (đơn nội bộ)');
select has_table('public', 'nhan_vien_phu_trach', 'có bảng nhan_vien_phu_trach');
select col_not_null('public', 'nhan_vien_phu_trach', 'ten_viet_tat', 'tên viết tắt bắt buộc');
select col_not_null('public', 'nhan_vien_phu_trach', 'ten_day_du', 'tên đầy đủ bắt buộc');
select col_not_null('public', 'nhan_vien_phu_trach', 'dang_dung', 'cờ đang dùng bắt buộc');

-- ─── 8–9: người nhận nội bộ trỏ vào nhân viên phụ trách, không vào tài khoản ─
select fk_ok('public', 'don_dat_hang', 'nguoi_nhan_id', 'public', 'nhan_vien_phu_trach', 'id',
  'don_dat_hang.nguoi_nhan_id → nhan_vien_phu_trach');
select fk_ok('public', 'chung_tu', 'nguoi_nhan_id', 'public', 'nhan_vien_phu_trach', 'id',
  'chung_tu.nguoi_nhan_id → nhan_vien_phu_trach');

-- ─── 10–12: đúng một người nhận ─────────────────────────────────────────────
select is(
  (select count(*)::int from pg_constraint where conname = 'ck_ddh_mot_nguoi_nhan'), 0,
  '0090: đơn bỏ CHECK một-người-nhận — đối tác kèm nhân viên hợp lệ (D3)'
);
select ok(
  exists (select 1 from pg_trigger where tgname = 'kiem_don_noi_bo_co_nguoi_nhan' and tgdeferrable),
  '0090: đơn nội bộ rỗng bị chặn bằng constraint trigger hoãn (chứng minh ở 108)'
);
select throws_ok(
  $$ insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, nguoi_nhan_id)
     select 'ZQX-NB-CT', 'XUAT', k1, doi_tac_id, nguoi_nhan from t_nb $$,
  '23514', null, 'Phiếu có cả đối tác lẫn người nhận nội bộ bị từ chối'
);

-- ─── 13–18: danh sách nhân viên và quyền ghi ────────────────────────────────
select has_function('public', 'danh_sach_nguoi_nhan_noi_bo', array[]::text[],
  'danh_sach_nguoi_nhan_noi_bo() tồn tại');
select ok(
  not has_function_privilege('anon', 'public.danh_sach_nguoi_nhan_noi_bo()', 'execute'),
  'anon không gọi được'
);

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select ok(
  exists (select 1 from public.danh_sach_nguoi_nhan_noi_bo() n, t_nb
          where n.id = t_nb.nguoi_nhan and n.ten_day_du = t_nb.ten_nguoi_nhan
            and n.ten_viet_tat = 'ZQX-A'),
  'Danh sách trả nhân viên đang dùng kèm tên viết tắt và tên đầy đủ'
);
select ok(
  not exists (select 1 from public.danh_sach_nguoi_nhan_noi_bo() n, t_nb
              where n.id = t_nb.nguoi_nghi),
  'Nhân viên đã ngừng dùng không nằm trong danh sách'
);
-- 0117: Tạo nhân viên chỉ còn Admin.
select throws_ok(
  $$ insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values ('ZQX-VP', 'Văn phòng thêm') $$,
  '42501', null,
  'Văn phòng không thêm được nhân viên phụ trách (0117: chỉ Admin)'
);
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values ('ZQX-TK', 'Thủ kho thêm') $$,
  '42501', null, 'Thủ kho không thêm được nhân viên phụ trách'
);

-- ─── 19: văn phòng tạo đơn nội bộ qua RLS ───────────────────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  $$ select public.tao_don(null, array[(select nguoi_nhan from t_nb)]) $$,
  'Văn phòng tạo được đơn nội bộ (tao_don)'
);
select pg_temp.dang_xuat();
create temp table t_don as
select d.id from public.don_dat_hang d
join public.don_dat_hang_nguoi_nhan ddn on ddn.don_dat_hang_id = d.id
where ddn.nguoi_nhan_id = (select nguoi_nhan from t_nb) and d.doi_tac_id is null
order by d.created_at desc limit 1;
grant select on t_don to authenticated;

insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from t_don), (select id from public.san_pham where ma_hang = 'NB-ZQX-A'), 3;

-- ─── 20–22: RPC đọc đơn ─────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ten_nguoi_nhan from public.chi_tiet_don((select id from t_don))),
  array[(select ten_nguoi_nhan from t_nb)],
  'chi_tiet_don trả tên người nhận nội bộ'
);
select ok(
  exists (select 1 from public.danh_sach_don(p_tu_khoa => (select ten_nguoi_nhan from t_nb))
          where id = (select id from t_don)),
  'danh_sach_don tìm được đơn theo tên nhân viên nhận'
);
select ok(
  not exists (select 1 from public.danh_sach_don(p_loai_nhan => 'NOI_BO', p_kich_thuoc => 200)
              where doi_tac_id is not null),
  'Lọc NOI_BO chỉ trả đơn nội bộ'
);
select pg_temp.dang_xuat();

-- ─── 23–26: phiếu xuất sinh từ đơn mang người nhận, hiện trên thẻ kho ──────
select public.xac_nhan_don((select id from t_don));
create temp table t_px as
select (public.tao_phieu_xuat_tu_don((select id from t_don))).id as id;
grant select on t_px to authenticated;

select is(
  (select array_agg(ctn.nguoi_nhan_id order by ctn.thu_tu) from public.chung_tu_nguoi_nhan ctn
   where ctn.chung_tu_id = (select id from t_px)),
  array[(select nguoi_nhan from t_nb)],
  'tao_phieu_xuat_tu_don chép người nhận nội bộ sang phiếu xuất (bảng nối)'
);

update public.chung_tu set ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE' where id = (select id from t_px);
select public.ghi_so_chung_tu((select id from t_px));

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ten_nguoi_nhan from public.chi_tiet_chung_tu((select id from t_px))),
  array[(select ten_nguoi_nhan from t_nb)],
  'chi_tiet_chung_tu trả tên người nhận nội bộ'
);
select is(
  (select ten_doi_tac from public.danh_sach_chung_tu(p_loai_ct => 'XUAT', p_tu_khoa => (select so_ct from public.chung_tu where id = (select id from t_px)))
    where id = (select id from t_px)),
  (select ten_nguoi_nhan from t_nb),
  'danh_sach_chung_tu hiện tên nhân viên, không tiền tố (0108)'
);
select is(
  (select doi_tac from public.the_kho_san_pham((select id from public.san_pham where ma_hang = 'NB-ZQX-A'))
    where chung_tu_id = (select id from t_px) limit 1),
  (select ten_nguoi_nhan from t_nb),
  'Thẻ kho hiện tên nhân viên, không tiền tố (0108)'
);
select pg_temp.dang_xuat();

select * from finish();
rollback;
