-- =============================================================================
-- TQAN-06 — bao_cao_xuat_am(p_ngay): mỗi dòng phiếu XUAT/TRA_NCC đã ghi sổ làm
-- tồn (kho, mã) rơi xuống dưới 0 (D-01, D-03, D-15), lũy kế theo created_at của
-- kho_movement (không theo ngay — bài học 05-LIVE-DEFS.md), người lập =
-- nguoi_tao_id (D-16), chặn vai trò khác quan_ly (D-12).
--
-- Dữ liệu tự dựng năm 2091 (không đụng dữ liệu thật, không neo bộ đếm sống —
-- .memory/index.md). RED: chưa có hàm bao_cao_xuat_am nên toàn bộ assertion
-- gọi hàm phải lỗi "function does not exist" — pgTAP báo not ok, đúng ý đồ TDD.
-- =============================================================================
begin;
select plan(18);

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

-- ---------------------------------------------------------------------------
-- Dữ liệu: hai mã A/B, hai kho K1/K2, người tạo phiếu = văn phòng.
-- ---------------------------------------------------------------------------
create temp table t_xa as
select
  pg_temp.sp_test('XA-ZQX-001') as a,
  pg_temp.sp_test('XA-ZQX-002') as b,
  pg_temp.kho_id('K1')          as k1,
  pg_temp.kho_id('K2')          as k2,
  (select id from auth.users where email = 'vanphong@khominhvu.local') as vp;
grant select on t_xa to authenticated;

create temp table t_ct as
select
  uuid_generate_v4() as n1, uuid_generate_v4() as x1, uuid_generate_v4() as x2,
  uuid_generate_v4() as x3, uuid_generate_v4() as x4, uuid_generate_v4() as x5,
  uuid_generate_v4() as x6, uuid_generate_v4() as t1;

create temp table t_cd as
select
  uuid_generate_v4() as n1, uuid_generate_v4() as x1, uuid_generate_v4() as x2,
  uuid_generate_v4() as x3, uuid_generate_v4() as x4, uuid_generate_v4() as x5,
  uuid_generate_v4() as x6, uuid_generate_v4() as t1;

-- Chứng từ: N1 nhập (nền), X6 xuất ngày 05-09, X1..X5 + T1 xuất/trả ngày 05-10.
-- T1 (TRA_NCC) bắt buộc chung_tu_goc_id (ck_tra_hang_co_goc) -> trỏ về N1.
-- Dòng đầu của union ép kiểu tường minh: chuỗi trơn trong union all bị suy ra
-- là text, mà text -> enum/date không có cast ngầm khi insert (42804).
insert into public.chung_tu (id, so_ct, loai_ct, ngay_ct, kho_id, trang_thai, ly_do_xuat_am, ghi_chu_ly_do, nguoi_tao_id, chung_tu_goc_id)
select t_ct.n1, 'ZQX-XA-N1', 'NHAP'::public.loai_ct, '2091-05-09'::date, t_xa.k1, 'HOAN_THANH'::public.trang_thai_ct, null::text,                    null::text,       t_xa.vp, null::uuid from t_ct, t_xa
union all
select t_ct.x6, 'ZQX-XA-X6', 'XUAT',    '2091-05-09', t_xa.k1, 'HOAN_THANH', 'KHAC',                  null,             t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.x1, 'ZQX-XA-X1', 'XUAT',    '2091-05-10', t_xa.k1, 'HOAN_THANH', 'MA_BI_TACH',            null,             t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.x2, 'ZQX-XA-X2', 'XUAT',    '2091-05-10', t_xa.k1, 'HOAN_THANH', 'HANG_VE_CHUA_NHAP',     'ZQX ghi chú',    t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.x3, 'ZQX-XA-X3', 'XUAT',    '2091-05-10', t_xa.k1, 'HOAN_THANH', 'KHAC',                  null,             t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.x4, 'ZQX-XA-X4', 'XUAT',    '2091-05-10', t_xa.k2, 'HOAN_THANH', 'LY_DO_TU_DO_ZQX',       null,             t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.x5, 'ZQX-XA-X5', 'XUAT',    '2091-05-10', t_xa.k1, 'DA_HUY',     'KHAC',                  null,             t_xa.vp, null   from t_ct, t_xa
union all
select t_ct.t1, 'ZQX-XA-T1', 'TRA_NCC', '2091-05-10', t_xa.k2, 'HOAN_THANH', 'LECH_TON_CHO_KIEM_KE',  null,             t_xa.vp, t_ct.n1 from t_ct, t_xa;

insert into public.chung_tu_dong (id, chung_tu_id, san_pham_id, so_luong)
select t_cd.n1, t_ct.n1, t_xa.a,  5 from t_cd, t_ct, t_xa
union all
select t_cd.x6, t_ct.x6, t_xa.b, -1 from t_cd, t_ct, t_xa
union all
select t_cd.x1, t_ct.x1, t_xa.a, -3 from t_cd, t_ct, t_xa
union all
select t_cd.x2, t_ct.x2, t_xa.a, -4 from t_cd, t_ct, t_xa
union all
select t_cd.x3, t_ct.x3, t_xa.a, -1 from t_cd, t_ct, t_xa
union all
select t_cd.x4, t_ct.x4, t_xa.b, -2 from t_cd, t_ct, t_xa
union all
select t_cd.x5, t_ct.x5, t_xa.b, -10 from t_cd, t_ct, t_xa
union all
select t_cd.t1, t_ct.t1, t_xa.a, -1 from t_cd, t_ct, t_xa;

-- Sổ cái: created_at đặt tay tăng dần theo đúng thứ tự nhân quả thật (D-01).
-- X5 bị hủy (DA_HUY) NHƯNG movement gốc + bút toán đảo (la_but_toan_dao=true)
-- vẫn nằm trong sổ cái append-only — ung_vien phải loại nó vì trang_thai.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id, la_but_toan_dao, ngay, created_at)
select t_xa.k1, t_xa.a,  5, 0, t_ct.n1, t_cd.n1, false, '2091-05-09 00:00:00+07'::timestamptz, '2091-05-09 08:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.b, -1, 0, t_ct.x6, t_cd.x6, false, '2091-05-09 00:00:00+07'::timestamptz, '2091-05-09 16:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.a, -3, 0, t_ct.x1, t_cd.x1, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 09:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.a, -4, 0, t_ct.x2, t_cd.x2, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 10:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.a, -1, 0, t_ct.x3, t_cd.x3, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 11:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k2, t_xa.b, -2, 0, t_ct.x4, t_cd.x4, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 12:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.b, -10, 0, t_ct.x5, t_cd.x5, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 13:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k1, t_xa.b,  10, 0, t_ct.x5, t_cd.x5, true,  '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 14:00:00+07'::timestamptz from t_xa, t_ct, t_cd
union all
select t_xa.k2, t_xa.a, -1, 0, t_ct.t1, t_cd.t1, false, '2091-05-10 00:00:00+07'::timestamptz, '2091-05-10 15:00:00+07'::timestamptz from t_xa, t_ct, t_cd;

-- ---------------------------------------------------------------------------
-- Dưới quản lý: đủ 4 dòng ngày 05-10 (X2,X3,X4,T1), X1/X5 vắng mặt, số đúng.
-- ---------------------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (select count(*) from public.bao_cao_xuat_am('2091-05-10') where so_ct like 'ZQX-XA-%'),
  4::bigint,
  'D-01/D-03: ngày 2091-05-10 chỉ có 4 dòng gây âm (X2, X3, X4, T1)'
);

select is(
  (select count(*) from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X1'),
  0::bigint,
  'D-01: X1 (xuất -3, tồn về 2, còn dương) không xuất hiện — bắt sai thứ tự lũy kế'
);

select is(
  (select ton_sau from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X2'),
  -2::numeric,
  'D-01: X2 (mã A, K1) tồn sau = -2 (5 - 3 - 4)'
);

select is(
  (select ton_sau from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X3'),
  -3::numeric,
  'D-15: X3 (mã A, K1) tồn sau = -3 — mã A có HAI dòng báo cáo trong cùng ngày (X2 và X3)'
);

select is(
  (select ton_sau from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X4'),
  -2::numeric,
  'D-01: X4 (mã B, K2) tồn sau = -2 — lũy kế riêng theo (kho, mã), không lẫn K1'
);

select is(
  (select ton_sau from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-T1'),
  -1::numeric,
  'D-01/D-03: T1 (TRA_NCC, mã A, K2) tồn sau = -1'
);

select is(
  (select so_luong_xuat from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X2'),
  4::numeric,
  'so_luong_xuat trả số DƯƠNG (4), không phải -4 như trong kho_movement'
);

select is(
  (select count(*) from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X5'),
  0::bigint,
  'D-03: X5 đã DA_HUY — bút toán đảo và movement gốc đều không được tính'
);

select is(
  (select loai_ct from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-T1'),
  'TRA_NCC',
  'D-03: TRA_NCC cũng vào báo cáo, không chỉ XUAT'
);

select is(
  (select ten_kho from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-T1'),
  (select ten from public.kho where id = (select k2 from t_xa)),
  'T1 hiện đúng tên kho K2 (khác kho K1 của các dòng XUAT còn lại)'
);

select is(
  (select ly_do_xuat_am from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X4'),
  'LY_DO_TU_DO_ZQX',
  'D-04: chuỗi lý do tự do (không nằm trong 4 mã cố định) trả về NGUYÊN VĂN'
);

select is(
  (select ghi_chu_ly_do from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X2'),
  'ZQX ghi chú',
  'ghi_chu_ly_do đi kèm lý do, trả về nguyên văn'
);

select is(
  (select nguoi_lap from public.bao_cao_xuat_am('2091-05-10') where so_ct = 'ZQX-XA-X2'),
  (select ho_ten from public.nguoi_dung where id = (select vp from t_xa)),
  'D-16: nguoi_lap = ho_ten của nguoi_tao_id (người TẠO phiếu), không phải người ghi sổ'
);

select is(
  (select count(*) from public.bao_cao_xuat_am('2091-05-09') where so_ct like 'ZQX-XA-%'),
  1::bigint,
  'D-02: ngày 2091-05-09 chỉ có đúng 1 dòng ZQX (X6) — mỗi ngày tính riêng'
);

select lives_ok(
  $$select * from public.bao_cao_xuat_am()$$,
  'D-02: gọi không tham số dưới quản lý không lỗi — mặc định hôm nay giờ Việt Nam'
);

-- ---------------------------------------------------------------------------
-- D-12: văn phòng / thủ kho / chỉ xem gọi thẳng RPC đều bị chặn 42501.
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$select * from public.bao_cao_xuat_am('2091-05-10')$$,
  '42501', null,
  'D-12: văn phòng gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$select * from public.bao_cao_xuat_am('2091-05-10')$$,
  '42501', null,
  'D-12: thủ kho gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$select * from public.bao_cao_xuat_am('2091-05-10')$$,
  '42501', null,
  'D-12: chỉ xem gọi thẳng RPC bị chặn 42501'
);

select * from finish();
rollback;
