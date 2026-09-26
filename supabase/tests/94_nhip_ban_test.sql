-- =============================================================================
-- TQAN-07 (D-09, D-10, D-12) — nhip_ban(p_ngay): nhịp bán hôm nay so với hôm
-- qua, thẻ hẹp thay cho biểu đồ 30 ngày (TQAN-04 đã dời).
--
-- Fixture gán THẲNG vào chung_tu/chung_tu_dong (không qua ghi_so_chung_tu) —
-- nhip_ban chỉ đọc hai bảng này, không đọc kho_movement, nên không cần đúng sổ
-- cái, chỉ cần đúng loai_ct/trang_thai/ngay_ct. Năm 2092, mã NB-ZQX-001..003,
-- so_ct 'ZQX-NB-…' — không ai chạm tới, đếm tuyệt đối an toàn (bài học
-- .memory/index.md: pgTAP không neo vào bộ đếm sống).
--
-- RED: chưa có hàm nhip_ban nên mọi lệnh gọi phải lỗi "does not exist".
-- =============================================================================
begin;
select plan(14);

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
-- Fixture: tám chứng từ.
--   2092-03-15: P1 XUAT HOAN_THANH 3 dòng (001,002,002); P2 XUAT HOAN_THANH 1
--     dòng (003); P3 XUAT DA_HUY 2 dòng; P4 XUAT NHAP_LIEU 1 dòng; P5 NHAP
--     HOAN_THANH 2 dòng; P6 TRA_NCC HOAN_THANH 1 dòng (chung_tu_goc_id = P5).
--   2092-03-14: P7 XUAT HOAN_THANH 1 dòng (001).
--   2092-03-13: P8 XUAT HOAN_THANH 5 dòng (ngoài khung, không được lọt vào).
-- ---------------------------------------------------------------------------
create temp table t_nb as
select
  pg_temp.kho_id('K1')          as k1,
  pg_temp.sp_test('NB-ZQX-001') as sp1,
  pg_temp.sp_test('NB-ZQX-002') as sp2,
  pg_temp.sp_test('NB-ZQX-003') as sp3,
  uuid_generate_v4() as p1,
  uuid_generate_v4() as p2,
  uuid_generate_v4() as p3,
  uuid_generate_v4() as p4,
  uuid_generate_v4() as p5,
  uuid_generate_v4() as p6,
  uuid_generate_v4() as p7,
  uuid_generate_v4() as p8;
grant select on t_nb to authenticated;

-- Dòng đầu của union ép kiểu tường minh: chuỗi trơn trong union all bị suy ra
-- là text, mà text -> enum/date không có cast ngầm khi insert (42804).
insert into public.chung_tu (id, so_ct, loai_ct, ngay_ct, kho_id, trang_thai)
select p1, 'ZQX-NB-P1', 'XUAT'::public.loai_ct, '2092-03-15'::date, k1, 'HOAN_THANH'::public.trang_thai_ct from t_nb
union all select p2, 'ZQX-NB-P2', 'XUAT', '2092-03-15', k1, 'HOAN_THANH' from t_nb
union all select p3, 'ZQX-NB-P3', 'XUAT', '2092-03-15', k1, 'DA_HUY'     from t_nb
union all select p4, 'ZQX-NB-P4', 'XUAT', '2092-03-15', k1, 'NHAP_LIEU'  from t_nb
union all select p5, 'ZQX-NB-P5', 'NHAP', '2092-03-15', k1, 'HOAN_THANH' from t_nb
union all select p7, 'ZQX-NB-P7', 'XUAT', '2092-03-14', k1, 'HOAN_THANH' from t_nb
union all select p8, 'ZQX-NB-P8', 'XUAT', '2092-03-13', k1, 'HOAN_THANH' from t_nb;

-- P6 là TRA_NCC, bắt buộc có chung_tu_goc_id (ràng buộc ck_tra_hang_co_goc).
insert into public.chung_tu (id, so_ct, loai_ct, ngay_ct, kho_id, trang_thai, chung_tu_goc_id)
select p6, 'ZQX-NB-P6', 'TRA_NCC', '2092-03-15', k1, 'HOAN_THANH', p5 from t_nb;

insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select p1, sp1, -1 from t_nb
union all select p1, sp2, -1 from t_nb
union all select p1, sp2, -1 from t_nb
union all select p2, sp3, -1 from t_nb
union all select p3, sp1, -1 from t_nb
union all select p3, sp2, -1 from t_nb
union all select p4, sp1, -1 from t_nb
union all select p5, sp1,  1 from t_nb
union all select p5, sp2,  1 from t_nb
union all select p6, sp1, -1 from t_nb
union all select p7, sp1, -1 from t_nb
union all select p8, sp1, -1 from t_nb
union all select p8, sp2, -1 from t_nb
union all select p8, sp3, -1 from t_nb
union all select p8, sp1, -1 from t_nb
union all select p8, sp2, -1 from t_nb;

-- ---------------------------------------------------------------------------
-- Dưới quản lý (D-12).
-- ---------------------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

-- 1. Đúng 2 dòng.
select is(
  (select count(*) from public.nhip_ban('2092-03-15')),
  2::bigint,
  'nhip_ban trả đúng 2 dòng (hôm đó + hôm trước)'
);

-- 2-4. Dòng ngay = 2092-03-15: P1 (3 dòng: 001,002,002) + P2 (1 dòng: 003) —
-- P3 (DA_HUY), P4 (NHAP_LIEU), P5 (NHAP), P6 (TRA_NCC) đều không tính (D-10).
select is(
  (select so_phieu from public.nhip_ban('2092-03-15') where ngay = '2092-03-15'),
  2::bigint,
  'D-10: so_phieu 2092-03-15 = 2 (chỉ P1, P2 -- XUAT đã ghi sổ)'
);
select is(
  (select so_dong from public.nhip_ban('2092-03-15') where ngay = '2092-03-15'),
  4::bigint,
  'so_dong 2092-03-15 = 4 (3 dòng P1 + 1 dòng P2)'
);
select is(
  (select so_ma from public.nhip_ban('2092-03-15') where ngay = '2092-03-15'),
  3::bigint,
  'so_ma 2092-03-15 = 3 (001, 002, 003 -- distinct)'
);

-- 5-7. Dòng ngay = 2092-03-14: chỉ P7.
select is(
  (select so_phieu from public.nhip_ban('2092-03-15') where ngay = '2092-03-14'),
  1::bigint,
  'D-09: so_phieu 2092-03-14 = 1 (P7)'
);
select is(
  (select so_dong from public.nhip_ban('2092-03-15') where ngay = '2092-03-14'),
  1::bigint,
  'so_dong 2092-03-14 = 1'
);
select is(
  (select so_ma from public.nhip_ban('2092-03-15') where ngay = '2092-03-14'),
  1::bigint,
  'so_ma 2092-03-14 = 1'
);

-- 8-9. Ngày không có phiếu nào (2092-03-17, 2092-03-16) vẫn có dòng, ba số 0.
select is(
  (select count(*) from public.nhip_ban('2092-03-17')),
  2::bigint,
  'ngày trống vẫn có đúng 2 dòng -- giao diện không phải tự bù'
);
select is(
  (select coalesce(sum(so_phieu + so_dong + so_ma), -1) from public.nhip_ban('2092-03-17')),
  0::numeric,
  'ngày trống -- cả hai dòng đều ba số 0 (coalesce, không null)'
);

-- 10-11. nhip_ban() không tham số: không lỗi, dòng đầu (ngay = p_ngay mặc
-- định, order by ngay desc) là hôm nay theo giờ Việt Nam.
select lives_ok(
  $$select * from public.nhip_ban()$$,
  'nhip_ban() không tham số không lỗi -- mặc định p_ngay hôm nay giờ VN'
);
select is(
  (select ngay from public.nhip_ban() order by ngay desc limit 1),
  (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  'D-09: dòng đầu của nhip_ban() không tham số là hôm nay giờ Việt Nam'
);

-- ---------------------------------------------------------------------------
-- 12-14. D-12: văn phòng / thủ kho / chỉ xem gọi thẳng RPC đều bị chặn 42501.
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$select * from public.nhip_ban('2092-03-15')$$,
  '42501', null,
  'D-12: văn phòng gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$select * from public.nhip_ban('2092-03-15')$$,
  '42501', null,
  'D-12: thủ kho gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$select * from public.nhip_ban('2092-03-15')$$,
  '42501', null,
  'D-12: chỉ xem gọi thẳng RPC bị chặn 42501'
);

select * from finish();
rollback;
