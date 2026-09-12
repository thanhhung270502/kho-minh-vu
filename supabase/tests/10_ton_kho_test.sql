-- =============================================================================
-- DATA-02 · DATA-03 · DATA-04
-- Sổ cái bất biến · tồn tự cập nhật · giá vốn bình quân gia quyền di động
-- =============================================================================
begin;
select plan(17);

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

-- Dữ liệu cố định trong transaction này, không dựa vào thứ tự seed.
create temp table t_id as
select pg_temp.sp_test('TEST-001') as sp,
       pg_temp.kho_id('K1')        as k1,
       pg_temp.kho_id('K2')        as k2;

-- ─── nhập lần 1: 10 @ 100 ────────────────────────────────────────────────
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 10, 100 from t_id;

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.sp),
  10::numeric(18,4),
  'insert movement làm ton_kho cập nhật ngay, ứng dụng không phải gọi thêm lệnh'
);
select is(
  (select s.gia_von from public.san_pham s, t_id where s.id = t_id.sp),
  100.0000::numeric(18,4),
  'nhập lần đầu 10@100 cho giá vốn 100'
);
select isnt(
  (select s.lan_phat_sinh_cuoi from public.san_pham s, t_id where s.id = t_id.sp),
  null,
  'lan_phat_sinh_cuoi được trigger cập nhật — nguồn cho thứ tự ưu tiên khi tìm kiếm'
);

-- ─── nhập lần 2: 10 @ 200 → bình quân 150 ────────────────────────────────
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 10, 200 from t_id;

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.sp),
  20::numeric(18,4),
  'tồn cộng dồn đúng sau hai lần nhập'
);
select is(
  (select s.gia_von from public.san_pham s, t_id where s.id = t_id.sp),
  150.0000::numeric(18,4),
  'giá vốn bình quân = (10*100 + 10*200) / 20 = 150'
);

-- ─── xuất 5: tồn giảm, giá vốn KHÔNG đổi ─────────────────────────────────
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, -5, 150 from t_id;

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.sp),
  15::numeric(18,4),
  'xuất 5 làm tồn còn 15'
);
select is(
  (select s.gia_von from public.san_pham s, t_id where s.id = t_id.sp),
  150.0000::numeric(18,4),
  'xuất KHÔNG làm đổi giá vốn — bình quân chỉ tính lại khi nhập'
);

-- ─── giá vốn là TOÀN CÔNG TY, không theo kho ─────────────────────────────
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp, 15, 150 from t_id;

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k2 and tk.san_pham_id = t_id.sp),
  15::numeric(18,4),
  'kho thứ hai có dòng ton_kho riêng'
);
select is(
  (select count(*) from public.ton_kho tk, t_id where tk.san_pham_id = t_id.sp),
  2::bigint,
  'một sản phẩm ở hai kho cho đúng hai dòng ton_kho'
);
select is(
  (select count(distinct s.gia_von) from public.san_pham s, t_id where s.id = t_id.sp),
  1::bigint,
  'giá vốn vẫn là MỘT giá duy nhất cho cả hai kho'
);

-- ─── nhánh chia 0 ────────────────────────────────────────────────────────
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, -15, 150 from t_id;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp, -15, 150 from t_id;

select is(
  (select coalesce(sum(tk.so_luong),0) from public.ton_kho tk, t_id where tk.san_pham_id = t_id.sp),
  0::numeric(18,4),
  'tồn toàn công ty về 0'
);

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 10, 300 from t_id;

select is(
  (select s.gia_von from public.san_pham s, t_id where s.id = t_id.sp),
  300.0000::numeric(18,4),
  'nhập lại từ tồn 0 cho giá vốn đúng bằng giá nhập, không văng lỗi chia 0'
);

-- ─── DATA-02: sổ cái bất biến ────────────────────────────────────────────
-- Chạy dưới role mặc định của test runner (postgres = CHỦ SỞ HỮU BẢNG).
-- Đây chính là trường hợp REVOKE KHÔNG chặn được — chỉ trigger chặn nổi.
-- Hai assertion này trượt nghĩa là lớp trigger đã mất, sổ cái hết bất biến.
select throws_ok(
  'update public.kho_movement set so_luong = 999',
  '23514', null,
  'UPDATE sổ cái bị chặn kể cả với chủ sở hữu bảng'
);
select throws_ok(
  'delete from public.kho_movement',
  '23514', null,
  'DELETE sổ cái bị chặn kể cả với chủ sở hữu bảng'
);

set local role service_role;
select throws_ok(
  'update public.kho_movement set so_luong = 999',
  '23514', null,
  'UPDATE sổ cái bị chặn với service_role (role có BYPASSRLS)'
);
reset role;

select is(
  (select count(*) from pg_trigger
    where tgrelid = 'public.kho_movement'::regclass and tgname = 'chan_sua_xoa_kho_movement'),
  1::bigint,
  'trigger chặn sửa/xóa tồn tại trên kho_movement'
);

select is(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'ton_kho' and column_name like 'gia_von%'),
  0::bigint,
  'ton_kho KHÔNG có cột giá vốn — giá vốn sống ở san_pham, tính toàn công ty'
);

select * from finish();
rollback;
