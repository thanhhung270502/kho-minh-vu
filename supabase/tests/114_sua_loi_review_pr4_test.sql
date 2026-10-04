-- =============================================================================
-- 0098 — Sửa lỗi review PR #4: giá vốn khi nhập không giá, kiểm kê bỏ combo,
-- đổi sang combo theo từng kho, khóa công thức combo đã bán, kiểm xuất âm theo
-- tổng mã thành phần, phân tích tồn tính phần bán qua combo, lọc "Nội bộ".
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

create or replace function pg_temp.sp(p_ma text, p_loai text default 'HANG_HOA')
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, loai_hang, kho_mac_dinh_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'), p_loai,
          (select id from public.kho where ma = 'K1'))
  returning id into v_id;
  return v_id;
end $helper$;

-- Phiếu một dòng (chưa ghi sổ). Đơn giá truyền vào để thử nhánh "không giá".
create or replace function pg_temp.phieu(p_so text, p_loai text, p_sp uuid, p_sl numeric, p_kho uuid,
                                         p_gia numeric default 1000)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
  values (p_so, p_loai::public.loai_ct, p_kho, (select id from public.doi_tac where ma = 'NCC-PR4'))
  returning id into v_id;
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
  values (v_id, p_sp, p_sl, p_gia);
  return v_id;
end $helper$;

insert into public.doi_tac (ma, ten, loai)
values ('NCC-PR4', 'Đối tác test PR4', 'CA_HAI') on conflict (ma) do nothing;

create temp table t as
select pg_temp.sp('PR4-GV') as gv,
       pg_temp.sp('PR4-TP') as tp,
       pg_temp.sp('PR4-BO', 'COMBO') as bo,
       pg_temp.sp('PR4-LECH') as lech,
       (select id from public.kho where ma = 'K1') as k1,
       (select id from public.kho where ma = 'K2') as k2;
grant select on t to authenticated;

-- ─── 1–2: nhập đơn giá 0 không kéo giá vốn về 0 ──────────────────────────────
select public.ghi_so_chung_tu(pg_temp.phieu('PR4-PN1', 'NHAP', gv, 10, k1, 1000)) from t;
select public.ghi_so_chung_tu(pg_temp.phieu('PR4-PN2', 'NHAP', gv, 10, k1, 0)) from t;
select is((select gia_von from public.san_pham where id = (select gv from t)), 1000::numeric,
  'nhập đơn giá 0 giữ nguyên giá vốn bình quân');
select is(
  (select m.gia_von_tai_thoi_diem from public.kho_movement m
   join public.chung_tu ct on ct.id = m.chung_tu_id where ct.so_ct = 'PR4-PN2'),
  1000::numeric, 'bút toán nhập không giá ghi giá vốn hiện tại');

-- ─── 3: kiểm kê bỏ combo khỏi phạm vi ────────────────────────────────────────
select public.luu_thanh_phan_combo(bo, jsonb_build_array(jsonb_build_object('thanh_phan_id', tp, 'so_luong', 1))) from t;
insert into public.chung_tu (so_ct, loai_ct, kho_id) select 'PR4-KK', 'KIEM_KE', k1 from t;
select ok(
  not exists (select 1 from public._pham_vi_kiem_ke((select id from public.chung_tu where so_ct = 'PR4-KK'))
              where san_pham_id = (select bo from t))
  and exists (select 1 from public._pham_vi_kiem_ke((select id from public.chung_tu where so_ct = 'PR4-KK'))
              where san_pham_id = (select tp from t)),
  'phạm vi kiểm kê có mã thành phần, không có combo');

-- ─── 4: đổi sang combo đòi hết tồn ở TỪNG kho ────────────────────────────────
select public.ghi_so_chung_tu(pg_temp.phieu('PR4-PN3', 'NHAP', lech, 5, k1)) from t;
select pg_temp.phieu('PR4-XK1', 'XUAT', lech, 5, k2) from t;
update public.chung_tu set ly_do_xuat_am = 'KHAC', ghi_chu_ly_do = 'test' where so_ct = 'PR4-XK1';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PR4-XK1'));
select throws_ok(
  $$ update public.san_pham set loai_hang = 'COMBO' where id = (select lech from t) $$,
  '23514', null, 'K1 +5 / K2 −5 (tổng 0) vẫn không đổi sang combo được');

-- ─── 5–6: combo đã bán thì khóa công thức ─────────────────────────────────────
select public.ghi_so_chung_tu(pg_temp.phieu('PR4-PN4', 'NHAP', tp, 20, k1)) from t;
select public.ghi_so_chung_tu(pg_temp.phieu('PR4-HD1', 'XUAT', bo, 2, k1)) from t;
select throws_like(
  $$ select public.luu_thanh_phan_combo(bo, jsonb_build_array(jsonb_build_object('thanh_phan_id', gv, 'so_luong', 1))) from t $$,
  '%đã có chứng từ ghi sổ%', 'không đổi thành phần combo đã có hóa đơn ghi sổ');
select is((select count(*) from public.thanh_phan_combo where combo_id = (select bo from t)), 1::bigint,
  'thành phần cũ còn nguyên');

-- ─── 7: phân tích tồn kho tính phần bán qua combo ─────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ban_trong_ky from public.phan_tich_ton_kho(30, (select ngay_ct from public.chung_tu where so_ct = 'PR4-HD1'), (select tp from t))),
  2::numeric, 'thành phần được tính 2 cái bán qua combo');
select is(
  (select ban_trong_ky from public.phan_tich_ton_kho(30, (select ngay_ct from public.chung_tu where so_ct = 'PR4-HD1'), (select bo from t))),
  2::numeric, 'combo vẫn giữ số bán của chính nó');
select pg_temp.dang_xuat();

-- ─── 8: hoàn thành đơn kiểm xuất âm theo TỔNG mã thành phần ───────────────────
-- Tồn TP còn 18. Dòng combo 10 + dòng TP 10: từng dòng không âm, cả phiếu âm.
insert into public.don_dat_hang (so_dh, doi_tac_id)
select 'DH-PR4-1', id from public.doi_tac where ma = 'NCC-PR4';
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'DH-PR4-1'), x, 10
from t, unnest(array[bo, tp]) x;
select public.xac_nhan_don((select id from public.don_dat_hang where so_dh = 'DH-PR4-1'));
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select throws_like(
  $$ select public.hoan_thanh_don((select id from public.don_dat_hang where so_dh = 'DH-PR4-1')) $$,
  '%PR4-TP (tồn 18, xuất 20)%', 'xuất âm báo theo tổng mã thành phần, nêu mã hàng');

-- ─── 9–10: lọc "Nội bộ" bỏ đơn tạm chưa chọn người nhận ───────────────────────
select pg_temp.dang_xuat();
create temp table t_trong (id uuid);
grant select, insert on t_trong to authenticated;
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
insert into t_trong select public.tao_don(null, '{}');
select ok(
  not exists (select 1 from public.danh_sach_don(p_loai_nhan := 'NOI_BO', p_kich_thuoc := 1000)
              where id = (select id from t_trong)),
  'đơn tạm trống không nằm trong lọc Nội bộ');
select ok(
  exists (select 1 from public.danh_sach_don(p_kich_thuoc := 1000) where id = (select id from t_trong)),
  'đơn tạm trống vẫn có trong danh sách chung');
select pg_temp.dang_xuat();

select * from finish();
rollback;
