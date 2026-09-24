-- =============================================================================
-- DLIEU-07 — tra_cuu_lich_su_kiotviet: lọc theo loại/khoảng ngày/số phiếu/mã hàng,
-- tìm tự do không dấu, múi giờ Việt Nam, và BA CỬA quyền (policy 0016, RPC mới,
-- lich_su_giao_dich_doi_tac 0033) đều đọc công tắc xem_lich_su_kiotviet (D-13).
--
-- Mọi mã hàng/mã phiếu dùng tiền tố LSKV-ZQX (không thể khớp 3.266 mã thật —
-- pgtap-va-test.md mục 2), mọi ngày test dùng năm 2091 (không đụng 5.326 dòng
-- lưu trữ thật, mục "pgTAP không neo vào bộ đếm sống" .memory/index.md).
-- =============================================================================
begin;
select plan(22);

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

-- ─── Dữ liệu lưu trữ test, dưới postgres (bypass RLS, hai bảng không có policy ghi) ──
-- PN-ZQX-MULTI: một phiếu, hai dòng (B2 — mở lại nguyên phiếu).
insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-MULTI', '2026-09-10T08:00:00+07:00', 'NCC001 X',      'LSKV-ZQX-A', 10),
  ('PN-ZQX-MULTI', '2026-09-10T08:00:00+07:00', 'NCC001 X',      'LSKV-ZQX-B', 5);
-- PN-ZQX-NCCP: nha_cung_cap khớp tiền tố mã đối tác test (B7/B8 — ba cửa).
insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-NCCP', '2026-09-11T08:00:00+07:00', 'NCCZQXP test',  'LSKV-ZQX-NCCP', 4);
-- PN-ZQX-NCC: tìm tự do theo nhà cung cấp (B4).
insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-NCC', '2026-09-12T08:00:00+07:00', 'ZQX NCC TEST',  'LSKV-ZQX-C', 7);
-- Khoảng ngày Việt Nam (B5): 23:30 VN của 2091-03-01 vẫn thuộc ngày đó; 00:30 VN
-- của 2091-03-02 đã sang ngày khác.
insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-D', '2091-03-01T23:30:00+07:00', 'NCC001 X', 'LSKV-ZQX-D', 1),
  ('PN-ZQX-E', '2091-03-02T00:30:00+07:00', 'NCC001 X', 'LSKV-ZQX-E', 1);
-- Tổng hợp theo mã (B6): 2 dòng nhập (10+20=30), tong_so_dong tính cả 2 dòng xuất bên dưới.
insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-SUM1', '2026-09-13T08:00:00+07:00', 'NCC001 X', 'LSKV-ZQX-SUM', 10),
  ('PN-ZQX-SUM2', '2026-09-13T09:00:00+07:00', 'NCC001 X', 'LSKV-ZQX-SUM', 20);

-- Hóa đơn: tìm tự do theo ghi chú không dấu (B4), và 2 dòng xuất cho B6.
insert into public.luu_tru_hoa_don_kiotviet (ma_hoa_don, ngay, khach_hang, ma_hang, so_luong, ghi_chu) values
  ('HD-ZQX-F', '2026-09-14T08:00:00+07:00', 'NB001', 'LSKV-ZQX-F', 3, 'KHÁCH QUỲNH ZQX'),
  ('HD-ZQX-SUM1', '2026-09-13T10:00:00+07:00', 'NB001', 'LSKV-ZQX-SUM', 5, null),
  ('HD-ZQX-SUM2', '2026-09-13T11:00:00+07:00', 'NB001', 'LSKV-ZQX-SUM', 7, null);

-- Đối tác test cho ba cửa (B7/B8): NCC có ma khớp tiền tố nha_cung_cap ở trên.
insert into public.doi_tac (ma, ten, loai) values ('NCCZQXP', 'NCC test ZQX P', 'NCC');

create temp table t_dt as select id as dt_id from public.doi_tac where ma = 'NCCZQXP';
grant select on t_dt to authenticated;

create temp table t_sp as select pg_temp.sp_test('LSKV-ZQX-A') as a;
grant select on t_sp to authenticated;

-- =============================================================================
-- B1 (1-3): p_loai lọc đúng nguồn; giá trị khác NHAP/XUAT bị từ chối.
-- =============================================================================
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select ok(
  (select bool_and(nguon = 'NHAP') from public.tra_cuu_lich_su_kiotviet(
    p_loai := 'NHAP', p_tu_khoa := 'LSKV-ZQX')),
  'B1a: p_loai=NHAP chỉ trả nguồn NHAP trên tập dữ liệu test'
);

select ok(
  (select bool_and(nguon = 'XUAT') from public.tra_cuu_lich_su_kiotviet(
    p_loai := 'XUAT', p_tu_khoa := 'LSKV-ZQX')),
  'B1b: p_loai=XUAT chỉ trả nguồn XUAT trên tập dữ liệu test'
);

select throws_ok(
  $$ select * from public.tra_cuu_lich_su_kiotviet(p_loai := 'BAD') $$,
  '23514', null,
  'B1c: p_loai khác NHAP/XUAT bị từ chối 23514'
);

-- =============================================================================
-- B2 (4): p_so_phieu khớp tuyệt đối trả đủ mọi dòng của phiếu đó (D-10).
-- =============================================================================
select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(p_so_phieu := 'PN-ZQX-MULTI')),
  2::bigint,
  'B2: p_so_phieu mở lại nguyên phiếu — cả hai dòng của PN-ZQX-MULTI'
);

-- =============================================================================
-- B3 (5-6): p_ma_hang khớp tuyệt đối; p_san_pham_id suy ra đúng ma_hang.
-- =============================================================================
select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-A')),
  1::bigint,
  'B3a: p_ma_hang khớp tuyệt đối chỉ trả dòng LSKV-ZQX-A'
);

select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(p_san_pham_id := (select a from t_sp))),
  1::bigint,
  'B3b: p_san_pham_id suy ra ma_hang của sản phẩm rồi lọc đúng dòng đó'
);

-- =============================================================================
-- B4 (7-8): tìm tự do không dấu khớp ghi_chu lẫn nha_cung_cap.
-- =============================================================================
select ok(
  exists(select 1 from public.tra_cuu_lich_su_kiotviet(p_tu_khoa := 'quynh') where ma_hang = 'LSKV-ZQX-F'),
  'B4a: tìm ''quynh'' không dấu khớp ghi_chu ''KHÁCH QUỲNH ZQX'''
);

select ok(
  exists(select 1 from public.tra_cuu_lich_su_kiotviet(p_tu_khoa := 'zqx ncc') where ma_hang = 'LSKV-ZQX-C'),
  'B4b: tìm ''zqx ncc'' khớp nha_cung_cap ''ZQX NCC TEST'''
);

-- =============================================================================
-- B5 (9-10): khoảng ngày lọc theo NGÀY GIỜ VIỆT NAM, không theo UTC máy chủ.
-- =============================================================================
select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(
    p_ma_hang := 'LSKV-ZQX-D', p_tu_ngay := '2091-03-01'::date, p_den_ngay := '2091-03-01'::date)),
  1::bigint,
  'B5a: dòng 23:30 giờ VN ngày 2091-03-01 NẰM TRONG khoảng lọc cùng ngày'
);

select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(
    p_ma_hang := 'LSKV-ZQX-E', p_tu_ngay := '2091-03-01'::date, p_den_ngay := '2091-03-01'::date)),
  0::bigint,
  'B5b: dòng 00:30 giờ VN ngày 2091-03-02 KHÔNG nằm trong khoảng lọc 2091-03-01'
);

-- =============================================================================
-- B6 (11-13): tong_so_dong/tong_nhap/tong_xuat tính trên toàn tập khớp, không
-- bị p_kich_thuoc := 1 cắt mất.
-- =============================================================================
select is(
  (select tong_so_dong from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-SUM', p_kich_thuoc := 1)),
  4::bigint,
  'B6a: tong_so_dong = 4 (2 dòng nhập + 2 dòng xuất) dù p_kich_thuoc := 1'
);

select is(
  (select tong_nhap from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-SUM', p_kich_thuoc := 1)),
  30::numeric,
  'B6b: tong_nhap = 10 + 20 = 30 trên toàn tập khớp'
);

select is(
  (select tong_xuat from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-SUM', p_kich_thuoc := 1)),
  12::numeric,
  'B6c: tong_xuat = 5 + 7 = 12 trên toàn tập khớp'
);

-- =============================================================================
-- B7 (14-16): công tắc TẮT cho vanphong — cả ba cửa đều khóa.
-- =============================================================================
select pg_temp.dang_xuat();
update public.nguoi_dung set xem_lich_su_kiotviet = false
where id = (select id from auth.users where email = 'vanphong@khominhvu.local');

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$ select * from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-A') $$,
  '42501', null,
  'B7a: cửa 1 (RPC) — vanphong công tắc tắt bị 42501'
);

select is(
  (select count(*) from public.luu_tru_nhap_kiotviet),
  0::bigint,
  'B7b: cửa 2 (RLS policy) — vanphong công tắc tắt đọc thẳng bảng ra 0 dòng'
);

select is(
  (select count(*) from public.lich_su_giao_dich_doi_tac((select dt_id from t_dt)) where nguon = 'KIOTVIET_NHAP'),
  0::bigint,
  'B7c: cửa 3 (lich_su_giao_dich_doi_tac) — vanphong công tắc tắt không thấy dòng KIOTVIET_NHAP'
);

-- =============================================================================
-- B8 (17-19): bật lại — cả ba cửa trả dữ liệu ngay trong cùng transaction.
-- =============================================================================
select pg_temp.dang_xuat();
update public.nguoi_dung set xem_lich_su_kiotviet = true
where id = (select id from auth.users where email = 'vanphong@khominhvu.local');

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(
  (select count(*) from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-NCCP')),
  1::bigint,
  'B8a: cửa 1 (RPC) — bật lại công tắc, vanphong đọc lại được ngay trong cùng transaction'
);

select ok(
  (select count(*) from public.luu_tru_nhap_kiotviet) > 0,
  'B8b: cửa 2 (RLS policy) — bật lại công tắc, vanphong đọc thẳng bảng ra dữ liệu'
);

select is(
  (select count(*) from public.lich_su_giao_dich_doi_tac((select dt_id from t_dt)) where nguon = 'KIOTVIET_NHAP'),
  1::bigint,
  'B8c: cửa 3 (lich_su_giao_dich_doi_tac) — bật lại công tắc, thấy đúng 1 dòng KIOTVIET_NHAP'
);

-- =============================================================================
-- B9 (20-21): chixem (mặc định tắt) bị chặn; quan_ly LUÔN qua dù tự tắt cột (D-15).
-- =============================================================================
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

select throws_ok(
  $$ select * from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-A') $$,
  '42501', null,
  'B9a: chixem (công tắc mặc định tắt) bị 42501'
);

select pg_temp.dang_xuat();
update public.nguoi_dung set xem_lich_su_kiotviet = false
where id = (select id from auth.users where email = 'quanly@khominhvu.local');

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select lives_ok(
  $$ select * from public.tra_cuu_lich_su_kiotviet(p_ma_hang := 'LSKV-ZQX-A') $$,
  'B9b: quan_ly vẫn đọc được dù tự tắt cột xem_lich_su_kiotviet (D-15, không tự khóa được mình)'
);

-- =============================================================================
-- B10 (22): the_kho_san_pham KHÔNG trộn lịch sử KiotViet (D-11), kể cả dưới quan_ly.
-- =============================================================================
select is(
  (select count(*) from public.the_kho_san_pham((select a from t_sp)) where nguon like 'KIOTVIET%'),
  0::bigint,
  'B10: D-11 — the_kho_san_pham không còn dòng nguồn KIOTVIET nào, kể cả dưới quan_ly'
);

select * from finish();
rollback;
