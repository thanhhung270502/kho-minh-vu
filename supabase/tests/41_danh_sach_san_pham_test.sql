-- =============================================================================
-- DMUC-01 · DMUC-02 · DMUC-03 — RPC danh sách sản phẩm (phân trang, lọc, tìm)
--
-- PHỤ THUỘC: `npm run seed:users` đã chạy (quanly, vanphong, thukho1).
-- Mọi truy vấn lọc theo tiền tố DS-ZQX để không phụ thuộc 3.266 mã thật.
-- =============================================================================
begin;
select plan(16);

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


-- --- Dữ liệu dựng dưới quyền postgres ---------------------------------------
create temp table t_ds as
select pg_temp.sp_test('DS-ZQX-001')    as sp1,   -- MUA_NGOAI, không nhóm, không đuôi → Cần rà
       pg_temp.sp_test('DS-ZQX-002-CB') as sp2,   -- đuôi -CB → không Cần rà
       pg_temp.sp_test('DS-ZQX-003')    as sp3,   -- đổi sang CARBON bên dưới
       pg_temp.sp_test('DS-ZQX-004')    as sp4,   -- ngừng kinh doanh
       pg_temp.kho_id('K1')             as k1,
       pg_temp.kho_id('K2')             as k2;

-- Bảng tạm thuộc postgres: không GRANT thì đọc dưới authenticated ném 42501 —
-- trùng mã lỗi với "RLS từ chối" nên assertion có thể xanh vì lý do SAI.
grant select on t_ds to authenticated;

update public.san_pham
   set cong_doan_id = (select id from public.cong_doan where ma = 'CARBON'),
       ton_toi_thieu = 100
 where ma_hang = 'DS-ZQX-003';
update public.san_pham set dang_kinh_doanh = false where ma_hang = 'DS-ZQX-004';

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp3, 7, 100 from t_ds;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp3, 5, 100 from t_ds;
-- 002 tồn âm mà chưa đặt định mức: không được lọt vào "dưới định mức" (0067).
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp2, -2, 100 from t_ds;

-- --- Quản lý ----------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_dang_kinh_doanh => null)),
  4::bigint,
  'không lọc trạng thái kinh doanh thì ra đủ 4 mã'
);

select is(
  (select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX')),
  3::bigint,
  'mặc định chỉ lấy mã đang kinh doanh'
);

select is(
  (select distinct tong_so_dong from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_kich_thuoc => 2)),
  3::bigint,
  'tổng số dòng đếm trên toàn bộ kết quả, không phải trên trang'
);

select is(
  (select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_kich_thuoc => 2)),
  2::bigint,
  'trang chỉ trả đúng kích thước yêu cầu'
);

select is(
  (select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_trang => 99)),
  0::bigint,
  'trang vượt quá dữ liệu trả 0 dòng — giao diện tự lùi về trang 1'
);

select ok(
  exists (select 1 from public.danh_sach_san_pham(p_tu_khoa => 'ds zqx 003') where ma_hang = 'DS-ZQX-003'),
  'gõ không dấu, có dấu cách vẫn tìm ra mã'
);

select is(
  (select string_agg(ma_hang, ',') from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_can_ra => true)),
  'DS-ZQX-001',
  'Cần rà chỉ gồm mã mua ngoài chưa rõ công đoạn'
);

select public.xac_nhan_da_ra(array[(select sp1 from t_ds)]);

select is(
  (select count(*) from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_can_ra => true)),
  0::bigint,
  'xác nhận đã rà thì mã rời danh sách Cần rà'
);

select is(
  (select string_agg(ma_hang, ',') from public.danh_sach_san_pham(
     p_tu_khoa => 'DS-ZQX',
     p_cong_doan_id => (select id from public.cong_doan where ma = 'CARBON'))),
  'DS-ZQX-003',
  'lọc theo công đoạn'
);

select is(
  (select string_agg(ma_hang, ',') from public.danh_sach_san_pham(
     p_tu_khoa => 'DS-ZQX', p_trang_thai_ton => 'duoi_dinh_muc')),
  'DS-ZQX-003',
  'lọc dưới định mức so tồn cộng dồn với tồn tối thiểu — mã tồn âm chưa đặt định mức (002) không lọt'
);

select ok(
  (select gia_von is not null from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX-003')
    where ma_hang = 'DS-ZQX-003'),
  'quản lý thấy giá vốn'
);

select lives_ok(
  $$select * from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX', p_sap_xep => 'ma_hang; drop table x', p_huong => 'desc')$$,
  'tham số sắp xếp lạ bị bỏ qua, không nối chuỗi vào SQL'
);

-- --- Thủ kho K1 -------------------------------------------------------------
-- Về postgres trước khi đổi tài khoản: helper đọc auth.users, mà role
-- authenticated không có quyền đọc bảng đó (bài học plan 02-01).
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select tong_ton from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX-003')
    where ma_hang = 'DS-ZQX-003'),
  7::numeric,
  'thủ kho chỉ cộng tồn của kho được phân'
);

select ok(
  (select gia_von is null from public.danh_sach_san_pham(p_tu_khoa => 'DS-ZQX-003')
    where ma_hang = 'DS-ZQX-003'),
  'thủ kho không nhận giá vốn'
);

select throws_ok(
  $$select public.xac_nhan_da_ra(array[uuid_generate_v4()])$$,
  '42501', null,
  'thủ kho không xác nhận đã rà được'
);

-- --- Không đăng nhập --------------------------------------------------------
select pg_temp.dang_xuat();

select throws_ok(
  $$select * from public.danh_sach_san_pham()$$,
  '42501', null,
  'không có phiên đăng nhập hợp lệ thì bị từ chối'
);

select * from finish();
rollback;
