-- =============================================================================
-- 0088 — Combo: ghi sổ trừ tồn theo mã thành phần, hủy phiếu trả lại đúng
-- (Quy chuẩn mã, phần D). Chốt chặn hồi quy cho phần ghi sổ.
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

create or replace function pg_temp.sp(p_ma text, p_loai text default 'HANG_HOA')
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, loai_hang)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'), p_loai)
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.ton(p_sp uuid, p_kho uuid)
returns numeric language sql stable as $helper$
  select coalesce((select so_luong from public.ton_kho where san_pham_id = p_sp and kho_id = p_kho), 0);
$helper$;

-- Lập phiếu một dòng (chưa ghi sổ), trả id.
create or replace function pg_temp.phieu(p_so text, p_loai text, p_sp uuid, p_sl numeric, p_kho uuid)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
  values (p_so, p_loai::public.loai_ct, p_kho, (select id from public.doi_tac where ma = 'NCC-COMBO'))
  returning id into v_id;
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
  values (v_id, p_sp, p_sl, 1000);
  return v_id;
end $helper$;

insert into public.doi_tac (ma, ten, loai)
values ('NCC-COMBO', 'Đối tác test combo', 'CA_HAI') on conflict (ma) do nothing;

create temp table t as
select pg_temp.sp('CB-TP1') as tp1,
       pg_temp.sp('CB-TP2') as tp2,
       pg_temp.sp('CB-BO', 'COMBO') as bo,
       pg_temp.sp('CB-RONG', 'COMBO') as rong,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t to authenticated;

-- Nhập tồn thành phần: TP1 = 10, TP2 = 10.
select public.ghi_so_chung_tu(pg_temp.phieu('CB-PN1', 'NHAP', tp1, 10, k1)) from t;
select public.ghi_so_chung_tu(pg_temp.phieu('CB-PN2', 'NHAP', tp2, 10, k1)) from t;

-- ─── Khai thành phần ───────────────────────────────────────────────────────
select is(
  (select public.luu_thanh_phan_combo(bo, jsonb_build_array(
     jsonb_build_object('thanh_phan_id', tp1, 'so_luong', 1),
     jsonb_build_object('thanh_phan_id', tp2, 'so_luong', 2))) from t),
  2, 'lưu 2 thành phần cho combo (1 TP1 + 2 TP2)'
);
select throws_ok(
  $$ select public.luu_thanh_phan_combo(tp1, '[]'::jsonb) from t $$,
  '23514', null, 'mã Hàng hóa không khai thành phần được'
);
select throws_ok(
  $$ select public.luu_thanh_phan_combo(bo, jsonb_build_array(jsonb_build_object('thanh_phan_id', rong, 'so_luong', 1))) from t $$,
  '23514', null, 'không lồng combo trong combo'
);
select throws_ok(
  $$ select public.luu_thanh_phan_combo(bo, jsonb_build_array(jsonb_build_object('thanh_phan_id', bo, 'so_luong', 1))) from t $$,
  '23514', null, 'combo không chứa chính nó'
);
select throws_ok(
  $$ select public.luu_thanh_phan_combo(bo, jsonb_build_array(jsonb_build_object('thanh_phan_id', tp1, 'so_luong', 0))) from t $$,
  '23514', null, 'số lượng phải > 0'
);
select throws_ok(
  $$ select public.luu_thanh_phan_combo(bo, jsonb_build_array(
       jsonb_build_object('thanh_phan_id', tp1, 'so_luong', 1),
       jsonb_build_object('thanh_phan_id', tp1, 'so_luong', 2))) from t $$,
  '23514', null, 'không khai trùng một mã thành phần'
);
select is((select count(*) from public.thanh_phan_combo where combo_id = (select bo from t)), 2::bigint,
  'lần lưu lỗi không làm mất thành phần đã có');

-- Quyền: thủ kho không có "Tạo mã hàng"; không ai ghi thẳng bảng.
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.luu_thanh_phan_combo((select bo from t), '[]'::jsonb) $$,
  '42501', null, 'thủ kho không khai thành phần được'
);
select throws_ok(
  $$ insert into public.thanh_phan_combo (combo_id, thanh_phan_id, so_luong) select bo, tp1, 1 from t $$,
  '42501', null, 'không ghi thẳng bảng thành phần'
);
select pg_temp.dang_xuat();

-- ─── Tồn khả dụng trên dòng phiếu ─────────────────────────────────────────
create temp table px as select pg_temp.phieu('CB-PX1', 'XUAT', bo, 3, k1) as id from t;
grant select on px to authenticated;
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select ton_hien_tai from public.dong_chung_tu((select id from px))),
  5::numeric, 'combo hiện tồn khả dụng = min(10/1, 10/2) = 5 bộ'
);
select pg_temp.dang_xuat();

-- ─── Ghi sổ xuất combo ───────────────────────────────────────────────────
select lives_ok($$ select public.ghi_so_chung_tu((select id from px)) $$, 'ghi sổ phiếu xuất 3 bộ combo');
select is((select pg_temp.ton(tp1, k1) from t), 7::numeric, 'TP1 giảm 3 (3 x 1)');
select is((select pg_temp.ton(tp2, k1) from t), 4::numeric, 'TP2 giảm 6 (3 x 2)');
select is((select pg_temp.ton(bo, k1) from t), 0::numeric, 'combo không có tồn riêng');
select is(
  (select count(*) from public.kho_movement m
    where m.chung_tu_id = (select id from px)
      and m.chung_tu_dong_id = (select d.id from public.chung_tu_dong d where d.chung_tu_id = (select id from px))),
  2::bigint, 'hai bút toán thành phần cùng trỏ về dòng combo'
);

-- ─── Hủy phiếu trả lại đúng ──────────────────────────────────────────────
select lives_ok($$ select public.huy_chung_tu((select id from px), 'test hủy combo') $$, 'hủy phiếu xuất combo');
select is((select pg_temp.ton(tp1, k1) + pg_temp.ton(tp2, k1) from t), 20::numeric, 'hủy trả lại đủ TP1 = 10, TP2 = 10');

-- ─── Khách trả combo cộng tồn thành phần ──────────────────────────────────
-- Phiếu trả phải có chứng từ gốc (ck_tra_hang_co_goc): xuất 1 bộ rồi khách trả lại.
create temp table goc as select pg_temp.phieu('CB-PX4', 'XUAT', bo, 1, k1) as id from t;
select public.ghi_so_chung_tu((select id from goc));
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, chung_tu_goc_id)
select 'CB-TK1', 'TRA_KHACH', k1, (select id from public.doi_tac where ma = 'NCC-COMBO'), (select id from goc) from t;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'CB-TK1'), bo, 1, 1000 from t;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'CB-TK1'));
select is((select array[pg_temp.ton(tp1, k1), pg_temp.ton(tp2, k1)] from t), array[10, 10]::numeric[],
  'xuất 1 bộ rồi khách trả 1 bộ: TP1, TP2 về lại 10');

-- ─── Xuất âm combo phải có lý do ─────────────────────────────────────────
select throws_ok(
  $$ select public.ghi_so_chung_tu(pg_temp.phieu('CB-PX2', 'XUAT', bo, 7, k1)) from t $$,
  '23514', null, 'xuất 7 bộ cần 14 TP2 (đang 6) → chặn khi chưa chọn lý do'
);

-- ─── Hoàn thành đơn có combo: kiểm xuất âm theo thành phần ──────────────────
-- Combo tồn 0 nhưng thành phần đủ (TP1 = 10, TP2 = 10) → không đòi lý do xuất âm.
-- Phiếu xuất từ đơn lấy kho mặc định của mã — combo trừ thành phần ở kho đó.
update public.san_pham set kho_mac_dinh_id = (select k1 from t) where id = (select bo from t);
insert into public.don_dat_hang (so_dh, doi_tac_id)
values ('CB-DH1', (select id from public.doi_tac where ma = 'NCC-COMBO'));
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select (select id from public.don_dat_hang where so_dh = 'CB-DH1'), bo, 2 from t;
select public.xac_nhan_don((select id from public.don_dat_hang where so_dh = 'CB-DH1'));
select lives_ok(
  $$ select public.hoan_thanh_don((select id from public.don_dat_hang where so_dh = 'CB-DH1')) $$,
  'hoàn thành đơn 2 bộ combo không cần lý do xuất âm khi thành phần đủ'
);
select is((select array[pg_temp.ton(tp1, k1), pg_temp.ton(tp2, k1)] from t), array[8, 6]::numeric[],
  'hoàn thành đơn trừ TP1 2, TP2 4');

-- ─── Chặn combo ở phiếu không tách ─────────────────────────────────────────
select throws_ok(
  $$ select public.ghi_so_chung_tu(pg_temp.phieu('CB-PN3', 'NHAP', bo, 1, k1)) from t $$,
  '23514', null, 'phiếu nhập không nhận dòng combo'
);
select throws_ok(
  $$ select public.ghi_so_chung_tu(pg_temp.phieu('CB-PX3', 'XUAT', rong, 1, k1)) from t $$,
  '23514', null, 'combo chưa khai thành phần không ghi sổ được'
);

-- ─── Đổi Loại hàng ──────────────────────────────────────────────────────────
select throws_ok(
  $$ update public.san_pham set loai_hang = 'COMBO' where id = (select tp1 from t) $$,
  '23514', null, 'mã đang tồn không đổi sang Combo được'
);
select throws_ok(
  $$ update public.san_pham set loai_hang = 'HANG_HOA' where id = (select bo from t) $$,
  '23514', null, 'combo còn thành phần không đổi về Hàng hóa được'
);
select lives_ok(
  $$ update public.san_pham set loai_hang = 'HANG_HOA' where id = (select rong from t) $$,
  'combo rỗng đổi về Hàng hóa được'
);

select * from finish();
rollback;
