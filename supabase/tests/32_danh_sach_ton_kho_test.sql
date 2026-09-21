-- =============================================================================
-- TON-01 · TQAN-02 — RPC danh_sach_ton_kho (pivot tồn theo kho, phạm vi thủ
-- kho, bộ lọc dưới định mức)
--
-- PHỤ THUỘC: `npm run seed:users` đã chạy (quanly, thukho1 — thukho1 gắn K1,
-- xem tiền lệ 41_danh_sach_san_pham_test.sql "thủ kho chỉ cộng tồn của kho
-- được phân").
-- Mọi truy vấn lọc theo tiền tố TON-ZQX để không phụ thuộc 3.266 mã thật.
-- =============================================================================
begin;
select plan(10);

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
create temp table t_tk as
select pg_temp.sp_test('TON-ZQX-001') as sp1,   -- 7@K1 + 3@K2 = 10, ton_toi_thieu mặc định 0
       pg_temp.sp_test('TON-ZQX-002') as sp2,   -- 1@K2, ton_toi_thieu = 5 → dưới định mức
       pg_temp.kho_id('K1')           as k1,
       pg_temp.kho_id('K2')           as k2;

-- Bảng tạm thuộc postgres: không GRANT thì đọc dưới authenticated ném 42501 —
-- trùng mã lỗi với "RLS từ chối" nên assertion có thể xanh vì lý do SAI.
grant select on t_tk to authenticated;

update public.san_pham set ton_toi_thieu = 5 where ma_hang = 'TON-ZQX-002';

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp1, 7, 100 from t_tk;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp1, 3, 100 from t_tk;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp2, 1, 100 from t_tk;

-- --- Quản lý ----------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select tong_ton from public.danh_sach_ton_kho(p_tu_khoa => 'TON-ZQX-001')
    where ma_hang = 'TON-ZQX-001'),
  10::numeric,
  'quản lý không lọc kho: mã 001 tổng tồn của cả hai kho là 10'
);

select is(
  (select count(*) from jsonb_object_keys(
     (select ton_theo_kho from public.danh_sach_ton_kho(p_tu_khoa => 'TON-ZQX-001')
       where ma_hang = 'TON-ZQX-001')
   )),
  2::bigint,
  'ton_theo_kho của mã 001 có đúng hai khóa (K1 và K2)'
);

select is(
  (
    select (dtk.ton_theo_kho ->> t.k1::text)::numeric
    from public.danh_sach_ton_kho(p_tu_khoa => 'TON-ZQX-001') dtk, t_tk t
    where dtk.ma_hang = 'TON-ZQX-001'
  ),
  7::numeric,
  'giá trị tồn ở khóa kho K1 của mã 001 bằng 7'
);

select is(
  (
    select tong_ton from public.danh_sach_ton_kho(
      p_tu_khoa => 'TON-ZQX-001', p_kho_id => (select k2 from t_tk))
    where ma_hang = 'TON-ZQX-001'
  ),
  3::numeric,
  'lọc p_kho_id := K2: tong_ton của mã 001 chỉ còn 3'
);

select is(
  (
    select count(*) from jsonb_object_keys(
      (select ton_theo_kho from public.danh_sach_ton_kho(
         p_tu_khoa => 'TON-ZQX-001', p_kho_id => (select k2 from t_tk))
        where ma_hang = 'TON-ZQX-001')
    )
  ),
  1::bigint,
  'lọc p_kho_id := K2: ton_theo_kho chỉ còn một khóa'
);

select is(
  (select string_agg(ma_hang, ',' order by ma_hang) from public.danh_sach_ton_kho(
     p_tu_khoa => 'TON-ZQX', p_trang_thai_ton => 'duoi_dinh_muc')),
  'TON-ZQX-002',
  'lọc dưới định mức chỉ trả về mã 002, không trả về mã 001'
);

select ok(
  exists (
    select 1 from public.danh_sach_ton_kho(p_tu_khoa => 'hang test ton-zqx-001')
    where ma_hang = 'TON-ZQX-001'
  ),
  'gõ không dấu (hang test) khớp được tên hàng có dấu (Hàng test)'
);

select is(
  (select distinct tong_so_dong from public.danh_sach_ton_kho(
     p_tu_khoa => 'TON-ZQX', p_kich_thuoc => 1)),
  2::bigint,
  'tong_so_dong đếm trên toàn bộ kết quả lọc (2 mã), không phải trên trang hiện tại (kích thước 1)'
);

-- --- Thủ kho K1 -------------------------------------------------------------
-- Về postgres trước khi đổi tài khoản: helper đọc auth.users, mà role
-- authenticated không có quyền đọc bảng đó (bài học plan 02-01).
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select is(
  (select count(*) from jsonb_object_keys(
     (select ton_theo_kho from public.danh_sach_ton_kho(p_tu_khoa => 'TON-ZQX-001')
       where ma_hang = 'TON-ZQX-001')
   )),
  1::bigint,
  'thủ kho chỉ thấy tồn của kho được phân: ton_theo_kho đúng một khóa, không dựa vào RLS'
);

-- --- Không đăng nhập --------------------------------------------------------
select pg_temp.dang_xuat();

select throws_ok(
  $$select * from public.danh_sach_ton_kho()$$,
  '42501', null,
  'không có phiên đăng nhập hợp lệ thì bị từ chối'
);

select * from finish();
rollback;
