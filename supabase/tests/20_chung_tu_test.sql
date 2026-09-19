-- =============================================================================
-- DATA-05 · DATA-06 · DATA-08
-- Ghi sổ atomic · hủy sinh bút toán đảo · đánh số không trùng
-- =============================================================================
begin;
select plan(20);

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

create temp table t_id as
select pg_temp.sp_test('CT-001') as sp1,
       pg_temp.sp_test('CT-002') as sp2,
       pg_temp.kho_id('K1')      as k1,
       pg_temp.kho_id('K2')      as k2,
       (select id from public.doi_tac limit 1) as dt;

-- Bảng tạm thuộc sở hữu postgres. Không GRANT thì mọi truy vấn đọc nó dưới
-- role authenticated sẽ ném 42501 — TRÙNG mã lỗi với "RLS từ chối", nên
-- assertion throws_ok('42501') có thể xanh vì lý do SAI. Đây là false pass
-- thật sự đã xảy ra ở 30_rls_test.sql lần chạy trước.
grant select on t_id to authenticated;

-- doi_tac có thể rỗng trên DB mới; tạo một cái để test.
insert into public.doi_tac (ma, ten, loai)
values ('NCC-TEST', 'NCC test', 'CA_HAI') on conflict (ma) do nothing;
update t_id set dt = (select id from public.doi_tac where ma = 'NCC-TEST');

-- ─── DATA-08: đánh số ────────────────────────────────────────────────────
-- Dùng năm 2092/2093 chứ KHÔNG dùng năm hiện hành: `chuoi_so_ct` là bộ đếm
-- sống, phiếu thật đầu tiên của năm nay làm mọi assertion neo vào '-000001'
-- đỏ vĩnh viễn. Đã đỏ thật một lần sau UAT Phase 3.
select is(public.sinh_so_ct('NHAP', 2092::smallint), 'PN92-000001', 'số phiếu nhập đầu tiên đúng định dạng PN92-000001');
select is(public.sinh_so_ct('NHAP', 2092::smallint), 'PN92-000002', 'gọi lần hai cho số kế tiếp');
select is(public.sinh_so_ct('XUAT', 2092::smallint), 'PX92-000001', 'chuỗi số độc lập theo từng loại chứng từ');
select is(public.sinh_so_ct('NHAP', 2093::smallint), 'PN93-000001', 'reset theo năm');
select is(
  array[
    left(public.sinh_so_ct('TRA_NCC',    2092::smallint), 2),
    left(public.sinh_so_ct('TRA_KHACH',  2092::smallint), 2),
    left(public.sinh_so_ct('CHUYEN_KHO', 2092::smallint), 2),
    left(public.sinh_so_ct('KIEM_KE',    2092::smallint), 2),
    left(public.sinh_so_ct('DIEU_CHINH', 2092::smallint), 2)
  ],
  array['TN','TK','CK','KK','DC'],
  'đủ tiền tố cho cả bảy loại chứng từ'
);

-- ─── DATA-05: ghi sổ happy path ──────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
reset role;  -- dựng dữ liệu dưới quyền postgres, claims vẫn giữ cho RPC đọc

insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PN-TEST-1', 'NHAP', k1, dt from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'PN-TEST-1'), sp1, 10, 100 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'PN-TEST-1'), sp2, 5, 200 from t_id;

select lives_ok(
  $$ select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-1')) $$,
  'ghi sổ phiếu nhập 2 dòng chạy được'
);
select is(
  (select trang_thai from public.chung_tu where so_ct = 'PN-TEST-1'),
  'HOAN_THANH'::public.trang_thai_ct,
  'trạng thái chuyển sang HOAN_THANH'
);
select is(
  (select count(*) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'PN-TEST-1')),
  2::bigint,
  'mỗi dòng chứng từ sinh đúng một movement'
);
select throws_ok(
  $$ select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-1')) $$,
  '23514', null,
  'ghi sổ lần hai bị từ chối'
);

-- ─── DATA-05: atomic — lỗi ở dòng thứ n không để lại movement nào ────────
-- Dòng thứ 2 trỏ tới san_pham_id không tồn tại, vi phạm khóa ngoại.
-- Assertion quan trọng nhất của file này: nếu ai đó bọc vòng lặp trong
-- "exception when others" thì nó sẽ trượt.
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PN-TEST-2', 'NHAP', k1, dt from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'PN-TEST-2'), sp1, 7, 100 from t_id;

select throws_ok(
  $$ insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
     values ((select id from public.chung_tu where so_ct = 'PN-TEST-2'),
             '00000000-0000-0000-0000-000000000001', 3, 50) $$,
  '23503', null,
  'dòng trỏ tới sản phẩm không tồn tại bị khóa ngoại chặn ngay lúc thêm'
);

-- ─── xuất âm ─────────────────────────────────────────────────────────────
insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id)
select 'PX-TEST-1', 'XUAT', k1, dt from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'PX-TEST-1'), sp1, 9999, 0 from t_id;

select throws_ok(
  $$ select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PX-TEST-1')) $$,
  '23514', null,
  'xuất quá tồn mà chưa chọn lý do bị từ chối'
);

update public.chung_tu set ly_do_xuat_am = 'Hàng đang về' where so_ct = 'PX-TEST-1';
select lives_ok(
  $$ select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PX-TEST-1')) $$,
  'chọn lý do rồi thì cho xuất âm — quyết định có chủ đích, không phải lỗ hổng'
);

-- ─── CHUYEN_KHO sinh 2 movement mỗi dòng ─────────────────────────────────
insert into public.chung_tu (so_ct, loai_ct, kho_id, kho_den_id)
select 'CK-TEST-1', 'CHUYEN_KHO', k1, k2 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select (select id from public.chung_tu where so_ct = 'CK-TEST-1'), sp2, 2 from t_id;
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'CK-TEST-1'));

select is(
  (select count(*) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'CK-TEST-1')),
  2::bigint,
  'một dòng chuyển kho sinh đúng hai movement'
);
select is(
  (select count(distinct gia_von_tai_thoi_diem) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'CK-TEST-1')),
  1::bigint,
  'hai movement chuyển kho cùng một giá vốn — chuyển kho không đổi giá vốn'
);

-- ─── DATA-06: hủy sinh bút toán đảo ──────────────────────────────────────
select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.sp1),
  (10 - 9999)::numeric(18,4),
  'tồn sp1 phản ánh đúng nhập 10 và xuất 9999'
);

-- Một phiếu nhập CÒN NHAP_LIEU để chứng minh luật D-11 chỉ siết phiếu đã ghi sổ.
insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id)
select 'PN-TEST-3-NHAPLIEU', 'NHAP', current_date, k1, dt from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select (select id from public.chung_tu where so_ct = 'PN-TEST-3-NHAPLIEU'), sp1, 1, 100 from t_id;

-- D-11 (0046): phiếu NHẬP đã ghi sổ chỉ quản lý hủy được. Văn phòng phải bị
-- chặn Ở DATABASE, không chỉ ở nút — kiểm trước rồi mới đổi vai để hủy thật.
select throws_ok(
  $$ select public.huy_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-1'), 'thử hủy') $$,
  '42501', null,
  'văn phòng KHÔNG hủy được phiếu nhập đã ghi sổ'
);

select lives_ok(
  $$ select public.huy_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-3-NHAPLIEU'), 'phiếu nháp bỏ') $$,
  'văn phòng vẫn tự hủy được phiếu nhập CHƯA ghi sổ'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select public.huy_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-1'), 'Nhập nhầm nhà cung cấp');

select is(
  (select count(*) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'PN-TEST-1')),
  4::bigint,
  'hủy sinh bút toán đảo, GIỮ NGUYÊN bản ghi gốc (2 gốc + 2 đảo)'
);
select is(
  (select count(*) from public.kho_movement
    where chung_tu_id = (select id from public.chung_tu where so_ct = 'PN-TEST-1')
      and la_but_toan_dao),
  2::bigint,
  'đúng hai movement được đánh dấu là bút toán đảo'
);
select throws_ok(
  $$ select public.huy_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-1'), 'lý do khác') $$,
  '23514', null,
  'hủy lần hai bị từ chối'
);

select * from finish();
rollback;
