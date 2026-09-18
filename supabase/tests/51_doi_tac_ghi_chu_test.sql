-- =============================================================================
-- DTAC-01 · DTAC-02 · DTAC-03 · DLIEU-04 — Đối tác, rà ghi chú, lịch sử giao dịch
-- =============================================================================
begin;
select plan(17);

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


insert into public.doi_tac (ma, ten, loai, dien_thoai) values
  ('DT-ZQX-1', 'Cửa hàng Zqx Tiến', 'KHACH', '0909000111'),
  ('DT-ZQX-2', 'Zqx Cả Hai',        'CA_HAI', null);

insert into public.luu_tru_hoa_don_kiotviet (ma_hoa_don, ngay, khach_hang, ma_hang, so_luong, ghi_chu) values
  ('HD-ZQX-1', '2026-09-10T08:00:00+07:00', 'NB001', 'X', 1, '  zqx  Tiến '),
  ('HD-ZQX-1', '2026-09-10T08:00:00+07:00', 'NB001', 'Y', 2, '  zqx  Tiến '),
  ('HD-ZQX-2', '2026-09-11T08:00:00+07:00', 'NB001', 'X', 3, 'ZQX TIẾN'),
  ('HD-ZQX-3', '2026-09-11T09:00:00+07:00', 'NB001', 'X', 1, 'ZQX SALE-A');

insert into public.luu_tru_nhap_kiotviet (ma_phieu, ngay, nha_cung_cap, ma_hang, so_luong) values
  ('PN-ZQX-1', '2026-09-09T08:00:00+07:00', 'DT-ZQX-2 Zqx Cả Hai', 'X', 5),
  ('PN-ZQX-2', '2026-09-09T09:00:00+07:00', 'DT-ZQX-2X Khác',      'X', 5);

select ok(
  exists (select 1 from public.doi_tac where ma = 'KHACHLE' and loai = 'KHACH'),
  'có sẵn đối tác Khách lẻ cho hóa đơn không ghi tên'
);

select matches(public.sinh_ma_doi_tac('KHACH'), '^KH[0-9]{6}$', 'mã khách tự sinh đúng định dạng KH######');

select ok(
  public.sinh_ma_doi_tac('NCC') !~ '^NCC9',
  'sinh mã NCC bỏ qua dải đặc biệt 900000 (NCC900001 là mã số thuế đổi ở Phase 1)'
);

-- --- Văn phòng --------------------------------------------------------------
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(
  (select count(*) from public.danh_sach_doi_tac(p_tu_khoa => 'zqx tien')),
  1::bigint,
  'tìm đối tác không dấu theo tên'
);

select is(
  (select count(*) from public.danh_sach_doi_tac(p_tu_khoa => '0909000111')),
  1::bigint,
  'tìm đối tác theo số điện thoại'
);

select ok(
  exists (select 1 from public.danh_sach_doi_tac(p_tu_khoa => 'zqx', p_loai => 'NCC') where ma = 'DT-ZQX-2'),
  'đối tác CA_HAI hiện cả khi lọc nhà cung cấp'
);

select is(
  (select so_hoa_don from public.danh_sach_ghi_chu_kiotviet(p_tu_khoa => 'zqx tien')),
  2::bigint,
  'hai cách viết của cùng một tên gộp thành một giá trị, đếm theo hóa đơn'
);

select lives_ok(
  $$select public.quyet_ghi_chu('ZQX TIẾN', 'KHACH', p_tao_khach => jsonb_build_object('ten', 'Zqx Tiến Mới'))$$,
  'quyết một giá trị ghi chú thành khách mới'
);

select ok(
  exists (select 1 from public.doi_tac where ten = 'Zqx Tiến Mới' and loai = 'KHACH' and ma ~ '^KH[0-9]{6}$'),
  'khách mới được tạo kèm mã tự sinh'
);

select is(
  (select loai from public.anh_xa_ghi_chu_kiotviet where gia_tri = 'ZQX TIẾN'),
  'KHACH',
  'ánh xạ ghi chú lưu lại quyết định'
);

select throws_ok(
  $$select public.quyet_ghi_chu('ZQX SALE-A', 'KHACH_VA_SALE', p_ten_sale => 'A')$$,
  '23514', null,
  'khách + sale mà thiếu khách thì bị từ chối'
);

select lives_ok(
  $$select public.quyet_ghi_chu('ZQX SALE-A', 'SALE', p_ten_sale => 'A')$$,
  'quyết một giá trị là sale'
);

select is(
  (select count(*) from public.danh_sach_ghi_chu_kiotviet(p_trang_thai => 'chua_ra', p_tu_khoa => 'zqx')),
  0::bigint,
  'giá trị đã quyết rời danh sách chưa rà'
);

select is(
  (select count(*) from public.lich_su_giao_dich_doi_tac(
      (select id from public.doi_tac where ten = 'Zqx Tiến Mới')) where nguon = 'KIOTVIET_BAN'),
  2::bigint,
  'lịch sử khách gom hóa đơn KiotViet cũ theo mã hóa đơn'
);

select is(
  (select count(*) from public.lich_su_giao_dich_doi_tac(
      (select id from public.doi_tac where ma = 'DT-ZQX-2')) where nguon = 'KIOTVIET_NHAP'),
  1::bigint,
  'NCC khớp tiền tố mã kèm khoảng trắng, không khớp mã dài hơn'
);

select lives_ok(
  $$select public.bo_quyet_ghi_chu('ZQX SALE-A')$$,
  'hủy được quyết định rà ghi chú'
);

-- --- Thủ kho ----------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select * from public.danh_sach_ghi_chu_kiotviet()$$,
  '42501', null,
  'thủ kho không rà ghi chú được'
);

select * from finish();
rollback;
