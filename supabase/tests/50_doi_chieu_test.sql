-- =============================================================================
-- DATA-09 — Đối chiếu tồn kho với sổ cái
--
-- KHÔNG test cron.schedule ở đây: việc đăng ký lịch phụ thuộc hạ tầng và là
-- hạng mục kiểm thủ công trên cloud (xem 01-VALIDATION.md). Bản thân hàm thì
-- test được 100%.
--
-- PHỤ THUỘC: `npm run seed:users` đã chạy — file này cần JWT thật của tài khoản
-- quản lý vì doi_chieu_ton() kiểm vai trò từ migration 0020.
-- =============================================================================
begin;
select plan(12);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  perform set_config('request.jwt.claims', json_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', coalesce(v_nd.kho_id::text, '')
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


create temp table t_id as
select pg_temp.sp_test('DC-001') as sp1,
       pg_temp.sp_test('DC-002') as sp2,
       pg_temp.kho_id('K1')      as k1,
       pg_temp.kho_id('K2')      as k2;

-- Bảng tạm thuộc sở hữu postgres. Không GRANT thì mọi truy vấn đọc nó dưới
-- role authenticated sẽ ném 42501 — TRÙNG mã lỗi với "RLS từ chối", nên
-- assertion throws_ok('42501') có thể xanh vì lý do SAI. Đây là false pass
-- thật sự đã xảy ra ở 30_rls_test.sql lần chạy trước.
grant select on t_id to authenticated;

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp1, 10, 100 from t_id;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp2, 7, 100 from t_id;

-- doi_chieu_ton() kiểm vai trò (migration 0020) nên phải đăng nhập mới gọi được.
-- Hàm là SECURITY DEFINER nên vẫn thấy toàn bộ dữ liệu, không bị RLS cắt.
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select count(*) from public.doi_chieu_ton()),
  0::bigint,
  'trên dữ liệu do trigger sinh ra, không có chênh lệch nào'
);
select pg_temp.dang_xuat();

-- Cố ý làm lệch. Chạy dưới postgres vì client đã bị REVOKE trên ton_kho.
update public.ton_kho tk set so_luong = tk.so_luong + 5
from t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.sp1;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select count(*) from public.doi_chieu_ton()),
  1::bigint,
  'phát hiện đúng một dòng lệch'
);
select is(
  (select chenh_lech from public.doi_chieu_ton() limit 1),
  5::numeric(18,4),
  'báo đúng độ lệch'
);
select is(
  (select d.san_pham_id from public.doi_chieu_ton() d limit 1),
  (select sp1 from t_id),
  'chỉ đúng sản phẩm bị lệch'
);
select pg_temp.dang_xuat();

update public.ton_kho tk set so_luong = tk.so_luong - 3
from t_id where tk.kho_id = t_id.k2 and tk.san_pham_id = t_id.sp2;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select count(*) from public.doi_chieu_ton()),
  2::bigint,
  'bắt được lệch cả hai chiều'
);
select is(
  (select chenh_lech from public.doi_chieu_ton() limit 1),
  5::numeric(18,4),
  'sắp theo độ lớn tuyệt đối giảm dần — lệch nặng nhất lên đầu'
);
select pg_temp.dang_xuat();

-- Nhánh full outer join: dòng ton_kho không có movement nào tương ứng.
insert into public.ton_kho (kho_id, san_pham_id, so_luong)
select k2, sp1, 99 from t_id;

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is(
  (select count(*) from public.doi_chieu_ton()),
  3::bigint,
  'bắt được cả dòng ton_kho không có movement nào (nhánh full outer join)'
);
select pg_temp.dang_xuat();

-- Cổng vai trò thêm ở migration 0020: đối chiếu tồn là công cụ của quản lý.
-- Hàm là SECURITY DEFINER nên bỏ qua RLS — không kiểm vai trò tường minh thì
-- thủ kho gọi được sẽ thấy chênh lệch của MỌI kho.
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  'select public.doi_chieu_ton()',
  '42501', null,
  'thủ kho KHÔNG gọi được doi_chieu_ton'
);
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  'select public.doi_chieu_ton()',
  '42501', null,
  'chỉ xem KHÔNG gọi được doi_chieu_ton'
);
select pg_temp.dang_xuat();

-- Hàm cho job hệ thống: KHÔNG kiểm vai trò (cron chạy dưới postgres, không có
-- JWT) và phải GHI LẠI kết quả — nếu chỉ chạy rồi vứt đi thì không ai thấy lệch.
select is(
  public._doi_chieu_ton_he_thong(),
  3,
  'hàm hệ thống chạy được không cần JWT và trả đúng số dòng lệch'
);
select is(
  (select so_dong_lech from public.nhat_ky_doi_chieu order by chay_luc desc limit 1),
  3,
  'kết quả được GHI vào nhat_ky_doi_chieu, không bị vứt đi'
);
select isnt(
  (select chi_tiet from public.nhat_ky_doi_chieu order by chay_luc desc limit 1),
  null,
  'nhật ký lưu cả chi tiết từng dòng lệch để truy vết'
);

select * from finish();
rollback;
