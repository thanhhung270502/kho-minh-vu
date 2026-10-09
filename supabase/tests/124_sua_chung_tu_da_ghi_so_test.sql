-- =============================================================================
-- 0124 — Sửa hóa đơn / phiếu nhập đã ghi sổ: đảo sổ, phiếu cũ đổi số "<số>-S<n>",
-- bản nháp giữ số cũ; ghi sổ bản sửa thì dòng đơn đặt (đơn Hoàn thành) theo hóa đơn.
-- Khuôn: supabase/tests/31_hoan_thanh_don_test.sql
-- =============================================================================
begin;
select plan(14);

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

create or replace function pg_temp.ton()
returns numeric language sql stable as $helper$
  select coalesce(sum(so_luong), 0) from public.ton_kho
  where san_pham_id = (select id from public.san_pham where ma_hang = 'SUA-ZQX-A');
$helper$;

create or replace function pg_temp.ct(p_so text)
returns uuid language sql stable as $helper$
  select id from public.chung_tu where so_ct = p_so;
$helper$;

-- ─── Dữ liệu: mã mới ở K1; phiếu nhập 10, đơn 3 -> hóa đơn 3 ──────────────────
insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
values ('SUA-ZQX-A', 'Hàng test sửa phiếu',
        (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'),
        (select id from public.kho where ma = 'K1'))
on conflict (ma_hang) do update set kho_mac_dinh_id = excluded.kho_mac_dinh_id;

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
values ('PN-SUA-1', 'NHAP', (select id from public.kho where ma = 'K1'), (select id from public.doi_tac limit 1));
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
values (pg_temp.ct('PN-SUA-1'), (select id from public.san_pham where ma_hang = 'SUA-ZQX-A'), 10, 0, 0,
        (select id from public.kho where ma = 'K1'));
select public.ghi_so_chung_tu(pg_temp.ct('PN-SUA-1'));

insert into public.don_dat_hang (so_dh, doi_tac_id)
values ('DH-SUA-1', (select id from public.doi_tac limit 1));
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
values ((select id from public.don_dat_hang where so_dh = 'DH-SUA-1'),
        (select id from public.san_pham where ma_hang = 'SUA-ZQX-A'), 3);
select public.xac_nhan_don((select id from public.don_dat_hang where so_dh = 'DH-SUA-1'));
select public.hoan_thanh_don((select id from public.don_dat_hang where so_dh = 'DH-SUA-1'));

create temp table t_sua as
select id as hd, so_ct, pg_temp.ton() as ton_truoc
from public.chung_tu
where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-SUA-1') and loai_ct = 'XUAT';
grant select on t_sua to authenticated;

-- ─── 1–3: điều kiện ───────────────────────────────────────────────────────────
select has_function('public', 'mo_sua_chung_tu', array['uuid','text'], 'có mo_sua_chung_tu');
select throws_ok(
  $$ select public.mo_sua_chung_tu((select hd from t_sua), '  ') $$,
  '23514', null, 'Thiếu lý do bị từ chối'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$ select public.mo_sua_chung_tu(pg_temp.ct('PN-SUA-1'), 'sửa số') $$,
  '42501', null, 'Phiếu nhập đã ghi sổ: chỉ quản lý được sửa'
);
select pg_temp.dang_xuat();

-- ─── 4–8: mở sửa hóa đơn ──────────────────────────────────────────────────────
create temp table t_moi as
select public.mo_sua_chung_tu((select hd from t_sua), 'giao thêm 1') as id;

select is((select so_ct || '/' || trang_thai from public.chung_tu where id = (select hd from t_sua)),
  (select so_ct from t_sua) || '-S1/DA_HUY', 'Phiếu cũ đổi số -S1 và thành Đã hủy');
select is((select so_ct || '/' || trang_thai from public.chung_tu where id = (select id from t_moi)),
  (select so_ct from t_sua) || '/NHAP_LIEU', 'Bản sửa mang lại số cũ, ở trạng thái nháp');
select is((select ban_sua_cua_id from public.chung_tu where id = (select id from t_moi)),
  (select hd from t_sua), 'Bản sửa trỏ về phiếu cũ');
select is(pg_temp.ton(), (select ton_truoc from t_sua) + 3, 'Mở sửa đã đảo sổ: tồn trả lại 3');
select is((select count(*) from public.chung_tu_dong where chung_tu_id = (select id from t_moi)),
  1::bigint, 'Dòng được chép sang bản sửa');

-- ─── 9–12: sửa số lượng rồi ghi sổ lại ───────────────────────────────────────
update public.chung_tu_dong set so_luong = 4 where chung_tu_id = (select id from t_moi);
select lives_ok($$ select public.ghi_so_chung_tu((select id from t_moi)) $$, 'Ghi sổ bản sửa');
select is(pg_temp.ton(), (select ton_truoc from t_sua) - 1, 'Tồn theo số mới: xuất 4 thay vì 3');
select is((select so_luong_dat || '/' || so_luong_da_xuat from public.don_dat_hang_dong
           where don_dat_hang_id = (select id from public.don_dat_hang where so_dh = 'DH-SUA-1')),
  '4.0000/4.0000', 'Dòng đơn Hoàn thành chép lại theo hóa đơn');
select is((select trang_thai::text from public.don_dat_hang where so_dh = 'DH-SUA-1'),
  'HOAN_THANH', 'Đơn vẫn Hoàn thành');

-- ─── 13–14: sửa lần hai -> -S2; hủy sau sửa không đảo trùng ──────────────────
create temp table t_moi2 as
select public.mo_sua_chung_tu((select id from t_moi), 'lần hai') as id;
select is((select so_ct from public.chung_tu where id = (select id from t_moi)),
  (select so_ct from t_sua) || '-S2', 'Lần sửa thứ hai đổi số -S2');
select is(pg_temp.ton(), (select ton_truoc from t_sua) + 3, 'Đảo lần hai chỉ đảo bản đã ghi sổ (4), không đảo trùng');

select * from finish();
rollback;
