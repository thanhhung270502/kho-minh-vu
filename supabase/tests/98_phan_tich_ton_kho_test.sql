-- =============================================================================
-- 0079 — Phân tích tồn kho: phan_tich_ton_kho, nhip_ban_theo_ngay,
-- cau_hinh_phan_tich (Phase 13, PTICH-01/06).
--
-- Dữ liệu đặt ở THÁNG 01/1990 (bẫy 16: không neo vào dữ liệu đang sống). Năm
-- 1990 sớm hơn mọi hóa đơn thật, nên hóa đơn test 05/01/1990 là "hóa đơn đầu
-- tiên" khi p_ngay = 30/01/1990 — kiểm được nhánh chia theo số ngày thật.
--
-- Mã PT-ZQX-A, kỳ 30 ngày tính tới 30/01/1990:
--   tồn: nạp 100; hóa đơn 05/01 (10) + 28/01 (5); hóa đơn NỘI BỘ 28/01 (7);
--        hóa đơn 29/01 (9) rồi HỦY; khách trả 29/01 (2) cho hóa đơn 28/01.
--        -> tồn = 100 - 10 - 5 - 7 + 2 = 80
--   bán trong kỳ (0101: hóa đơn giao qua nhân viên nhận CŨNG là bán, trừ trả
--   hàng) = 10 + 5 + 7 - 2 = 20
--   số ngày thật = 30/01 - 05/01 + 1 = 26 (< 30) -> bán TB = 20/26 = 0,7692
--   khách đặt = đơn tạm 4 + đơn đã xác nhận 3 (đơn nội bộ 6 không tính) = 7
--   khả dụng = 73 -> còn 73 / 0,7692 = 94,90 ngày -> hết dự kiến 30/01/1990 + 94
-- Kỳ 7 ngày (24/01–30/01): bán = 5 + 7 - 2 = 10, chia 7.
-- =============================================================================
begin;
select plan(24);

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

create or replace function pg_temp.sp(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.san_pham where ma_hang = p_ma;
$helper$;

-- Hóa đơn ghi sổ thẳng (không qua đơn): chèn rồi ghi_so_chung_tu.
create or replace function pg_temp.hoa_don(p_so text, p_ngay date, p_ma text, p_sl numeric, p_noi_bo boolean)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, ly_do_xuat_am)
  values (p_so, 'XUAT', p_ngay, (select id from public.kho where ma = 'K1'),
          case when p_noi_bo then null else (select id from public.doi_tac order by ma limit 1) end,
          'LECH_TON_CHO_KIEM_KE')
  returning id into v_id;
  -- 0090: người nhận nội bộ nằm ở bảng nối, không còn ở cột chung_tu.nguoi_nhan_id.
  if p_noi_bo then
    insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
    values (v_id, (select id from public.nhan_vien_phu_trach order by ten_day_du limit 1), 1);
  end if;
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  values (v_id, pg_temp.sp(p_ma), p_sl, 0, 0, (select id from public.kho where ma = 'K1'));
  perform public.ghi_so_chung_tu(v_id);
  return v_id;
end $helper$;

-- ─── Dữ liệu ────────────────────────────────────────────────────────────────
insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du) values ('ZQX-PT', 'Nhân viên ZQX phân tích')
on conflict do nothing;

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
select m, 'Hàng test phân tích ' || m,
       (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'SON'),
       (select id from public.kho where ma = 'K1')
from unnest(array['PT-ZQX-A', 'PT-ZQX-B']) m
on conflict (ma_hang) do nothing;

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
values ((select id from public.kho where ma = 'K1'), pg_temp.sp('PT-ZQX-A'), 100, 0);

select pg_temp.hoa_don('ZQX-PT-1', date '1990-01-05', 'PT-ZQX-A', 10, false);
create temp table t_hd28 as select pg_temp.hoa_don('ZQX-PT-2', date '1990-01-28', 'PT-ZQX-A', 5, false) as id;
select pg_temp.hoa_don('ZQX-PT-3', date '1990-01-28', 'PT-ZQX-A', 7, true);
select public.huy_chung_tu(pg_temp.hoa_don('ZQX-PT-4', date '1990-01-29', 'PT-ZQX-A', 9, false), 'Test hủy');

-- Khách trả 2 cho hóa đơn 28/01.
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, chung_tu_goc_id)
values ('ZQX-PT-TRA', 'TRA_KHACH', date '1990-01-29', (select id from public.kho where ma = 'K1'),
        (select id from public.doi_tac order by ma limit 1), (select id from t_hd28));
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
values ((select id from public.chung_tu where so_ct = 'ZQX-PT-TRA'), pg_temp.sp('PT-ZQX-A'), 2, 0, 0,
        (select id from public.kho where ma = 'K1'));
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'ZQX-PT-TRA'));

-- Đơn mở: tạm 4 + đã xác nhận 3 (đối tác), tạm nội bộ 6 (không tính).
insert into public.don_dat_hang (so_dh, doi_tac_id, trang_thai)
values ('DH-PT-TAM', (select id from public.doi_tac order by ma limit 1), 'TAM'),
       ('DH-PT-XN',  (select id from public.doi_tac order by ma limit 1), 'DA_XAC_NHAN'),
       ('DH-PT-NB',  null, 'TAM');
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select id, (select id from public.nhan_vien_phu_trach where ten_viet_tat = 'ZQX-PT'), 1
from public.don_dat_hang where so_dh = 'DH-PT-NB';
insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat)
select d.id, pg_temp.sp('PT-ZQX-A'), q
from (values ('DH-PT-TAM', 4), ('DH-PT-XN', 3), ('DH-PT-NB', 6)) v(so, q)
join public.don_dat_hang d on d.so_dh = v.so;

create temp table t_kq as select * from public.phan_tich_ton_kho(30, date '1990-01-30', pg_temp.sp('PT-ZQX-A'));
create temp table t_kq7 as select * from public.phan_tich_ton_kho(7, date '1990-01-30', pg_temp.sp('PT-ZQX-A'));
create temp table t_kqb as select * from public.phan_tich_ton_kho(30, date '1990-01-30', pg_temp.sp('PT-ZQX-B'));
create temp table t_nb as select * from public.nhip_ban_theo_ngay(30, date '1990-01-30');

-- ─── 1–2: hàm có ────────────────────────────────────────────────────────────
select has_function('public', 'phan_tich_ton_kho', array['integer','date','uuid'], 'có phan_tich_ton_kho');
select has_function('public', 'nhip_ban_theo_ngay', array['integer','date'], 'có nhip_ban_theo_ngay');

-- ─── 3–11: công thức kỳ 30 ngày ─────────────────────────────────────────────
select is((select ton from t_kq), 80::numeric, 'Tồn = 100 - 10 - 5 - 7 + 2');
select is((select ban_trong_ky from t_kq), 20::numeric, 'Bán trong kỳ: gồm hóa đơn nội bộ (0101), bỏ hóa đơn hủy, trừ trả hàng');
select is((select so_ngay_thuc from t_kq), 26, 'Dữ liệu ngắn hơn kỳ: chia theo số ngày thật (26)');
select is((select ban_tb_ngay from t_kq), 0.7692::numeric, 'Bán TB/ngày = 20 / 26');
select is((select khach_dat from t_kq), 7::numeric, 'Khách đặt: đơn tạm + đã xác nhận, không tính nội bộ');
select is((select ton_kha_dung from t_kq), 73::numeric, 'Khả dụng = tồn - khách đặt');
select is((select so_ngay_con from t_kq), 94.90::numeric, 'Còn hàng 73 / 0,7692 = 94,90 ngày');
select is((select ngay_het_du_kien from t_kq), date '1990-01-30' + 94, 'Ngày hết dự kiến = ngày tính + 94');
select is((select cong_doan_ma from t_kq), 'SON', 'Trả mã công đoạn (loại hoàn thiện)');

-- ─── 12–14: kỳ 7 ngày ───────────────────────────────────────────────────────
select is((select ban_trong_ky from t_kq7), 10::numeric, 'Kỳ 7 ngày: hai hóa đơn 28/01 (đối tác + nội bộ) trừ trả hàng');
select is((select so_ngay_thuc from t_kq7), 7, 'Kỳ 7 ngày đủ dữ liệu: chia 7');
select is((select ban_nua_dau + ban_nua_sau from t_kq7), 10::numeric, 'Nửa đầu + nửa sau = bán trong kỳ');

-- ─── 15–16: mã không bán ────────────────────────────────────────────────────
select is((select ban_trong_ky from t_kqb), 0::numeric, 'Mã không bán: bán = 0');
select ok((select so_ngay_con is null and ngay_het_du_kien is null from t_kqb), 'Mã không bán: không có số ngày còn hàng');

-- ─── 17–18: nhịp bán theo ngày ──────────────────────────────────────────────
select is((select count(*) from t_nb), 30::bigint, 'Nhịp bán: đủ 30 ngày, ngày trống vẫn có dòng');
select ok(
  exists (select 1 from t_nb where ngay = date '1990-01-28' and so_hoa_don = 2 and so_luong = 12),
  'Nhịp bán 28/01: 2 hóa đơn (đối tác 5 + nội bộ 7, 0101) = 12 cái'
);

-- ─── 19–20: quyền xem ───────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ select * from public.phan_tich_ton_kho(30) $$, '42501', null, 'Thủ kho không xem phân tích');
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok($$ select * from public.nhip_ban_theo_ngay(30) $$, '42501', null, 'Chỉ xem không xem nhịp bán');
select pg_temp.dang_xuat();

-- ─── 21–24: cấu hình ngưỡng ─────────────────────────────────────────────────
select is(
  (select row(nguong_do, nguong_vang, so_ngay_du_tru)::text from public.cau_hinh_phan_tich),
  '(7,14,30)', 'Cấu hình mặc định: đỏ 7, vàng 14, Y 30'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.cau_hinh_phan_tich set nguong_do = 3;
select pg_temp.dang_xuat();
select is((select nguong_do from public.cau_hinh_phan_tich), 7, 'Văn phòng không đổi được ngưỡng (RLS)');
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select lives_ok($$ update public.cau_hinh_phan_tich set nguong_do = 5 $$, 'Quản lý đổi được ngưỡng');
select throws_ok($$ update public.cau_hinh_phan_tich set nguong_vang = 4 $$, '23514', null, 'Ngưỡng vàng phải lớn hơn ngưỡng đỏ');
select pg_temp.dang_xuat();

select * from finish();
rollback;
