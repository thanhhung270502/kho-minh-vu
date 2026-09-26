-- =============================================================================
-- TQAN-01 — ton_theo_nhom(p_theo, p_kho_id): đếm mã theo nhóm hàng / công đoạn
-- theo trạng thái tồn, KHỚP TUYỆT ĐỐI bộ lọc `/ton-kho` (danh_sach_ton_kho, 0067)
-- để trang tổng quan bấm một con số là mở đúng danh sách đó (D-08).
--
-- Chốt chặn chính là đối chiếu chéo: mọi (nhom/cong_doan, trạng thái, kho) so
-- trực tiếp với danh_sach_ton_kho, không giả định số liệu cố định của dữ liệu
-- thật — chỉ dữ liệu FIXTURE riêng (nhóm 'ZQX-NHOM-93') mới kiểm bằng số cụ
-- thể. RED: chưa có hàm ton_theo_nhom nên mọi lệnh gọi phải lỗi "does not
-- exist" — pgTAP báo not ok, đúng ý đồ TDD.
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
-- Fixture: nhóm hàng + công đoạn test riêng, sáu mã TN-ZQX-001..006 gán cả
-- hai. Tồn dựng bằng chèn kho_movement (trigger 0008 tự cộng dồn vào
-- ton_kho) — KHÔNG insert thẳng ton_kho.
--   001: K1 +5, ton_toi_thieu 0 -> còn hàng.
--   002: không movement -> hết hàng.
--   003: K1 -2, ton_toi_thieu 0 -> âm, KHÔNG dưới định mức (định nghĩa 0067).
--   004: K1 +1, ton_toi_thieu 3 -> còn hàng + dưới định mức.
--   005: K1 +4, K2 -4 -> gộp = 0 (hết hàng); riêng K1 = còn hàng; riêng K2 = âm.
--   006: K1 +9 nhưng dang_kinh_doanh = false -> không được đếm (D-17).
-- ---------------------------------------------------------------------------
insert into public.nhom_hang (ma, ten)
values ('ZQX-NHOM-93', 'Nhóm test 93 (đối chiếu ton_theo_nhom)')
on conflict (ma) do update set ten = excluded.ten;

insert into public.cong_doan (ma, ten)
values ('ZQX_CD_93', 'Công đoạn test 93 (đối chiếu ton_theo_nhom)')
on conflict (ma) do update set ten = excluded.ten;

create temp table t_tn as
select
  (select id from public.nhom_hang where ma = 'ZQX-NHOM-93') as nhom_id,
  (select id from public.cong_doan where ma = 'ZQX_CD_93')   as cd_id,
  pg_temp.kho_id('K1')          as k1,
  pg_temp.kho_id('K2')          as k2,
  pg_temp.sp_test('TN-ZQX-001') as sp1,
  pg_temp.sp_test('TN-ZQX-002') as sp2,
  pg_temp.sp_test('TN-ZQX-003') as sp3,
  pg_temp.sp_test('TN-ZQX-004') as sp4,
  pg_temp.sp_test('TN-ZQX-005') as sp5,
  pg_temp.sp_test('TN-ZQX-006') as sp6;
grant select on t_tn to authenticated;

update public.san_pham sp set
  nhom_hang_id = t_tn.nhom_id,
  cong_doan_id = t_tn.cd_id,
  ton_toi_thieu = case sp.id when t_tn.sp4 then 3 else 0 end,
  dang_kinh_doanh = case sp.id when t_tn.sp6 then false else true end
from t_tn
where sp.id in (t_tn.sp1, t_tn.sp2, t_tn.sp3, t_tn.sp4, t_tn.sp5, t_tn.sp6);

insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at)
select t_tn.k1, t_tn.sp1,  5, 1000, '2026-01-01 08:00:00+07'::timestamptz, '2026-01-01 08:00:00+07'::timestamptz from t_tn
union all
select t_tn.k1, t_tn.sp3, -2, 1000, '2026-01-01 08:01:00+07'::timestamptz, '2026-01-01 08:01:00+07'::timestamptz from t_tn
union all
select t_tn.k1, t_tn.sp4,  1, 1000, '2026-01-01 08:02:00+07'::timestamptz, '2026-01-01 08:02:00+07'::timestamptz from t_tn
union all
select t_tn.k1, t_tn.sp5,  4, 1000, '2026-01-01 08:03:00+07'::timestamptz, '2026-01-01 08:03:00+07'::timestamptz from t_tn
union all
select t_tn.k2, t_tn.sp5, -4, 1000, '2026-01-01 08:04:00+07'::timestamptz, '2026-01-01 08:04:00+07'::timestamptz from t_tn
union all
select t_tn.k1, t_tn.sp6,  9, 1000, '2026-01-01 08:05:00+07'::timestamptz, '2026-01-01 08:05:00+07'::timestamptz from t_tn;

-- ---------------------------------------------------------------------------
-- Dưới quản lý (D-12 — chỉ vai trò này gọi được).
-- ---------------------------------------------------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

-- 1. ton_theo_nhom('nhom') — dòng của nhóm test: 5 mã đang kinh doanh
-- (001-005; 006 bị loại vì dang_kinh_doanh=false, D-17).
select is(
  (select tong_ma from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  5::bigint,
  'D-05/D-17: nhóm test có 5 mã đang kinh doanh (006 bị loại)'
);
select is(
  (select con_hang from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  2::bigint,
  'D-05: con_hang = 2 (001 tong=5, 005 gộp K1+K2=0 KHÔNG tính -- xem het_hang)'
);
select is(
  (select het_hang from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  2::bigint,
  'D-05: het_hang = 2 (002 không movement, 005 gộp K1+4/K2-4 = 0)'
);
select is(
  (select am from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  1::bigint,
  'D-05: am = 1 (003 tong=-2)'
);
select is(
  (select duoi_dinh_muc from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  1::bigint,
  'D-05: duoi_dinh_muc = 1 (004: ton_toi_thieu 3 > 0, tong 1 < 3) -- 003 âm nhưng ton_toi_thieu 0 KHÔNG tính (0067)'
);
select is(
  (select ten_nhom from public.ton_theo_nhom('nhom') where nhom_id = (select nhom_id from t_tn)),
  (select ten from public.nhom_hang where id = (select nhom_id from t_tn)),
  'ten_nhom trả đúng tên nhóm test'
);

-- 2. ton_theo_nhom('cong_doan') — cùng năm con số cho công đoạn test (cùng
-- sáu mã, chỉ khác cột gán nhóm).
select is(
  (select tong_ma from public.ton_theo_nhom('cong_doan') where nhom_id = (select cd_id from t_tn)),
  5::bigint,
  'D-05/D-17: công đoạn test có 5 mã đang kinh doanh'
);
select is(
  (select con_hang from public.ton_theo_nhom('cong_doan') where nhom_id = (select cd_id from t_tn)),
  2::bigint,
  'D-05: công đoạn test con_hang = 2'
);
select is(
  (select het_hang from public.ton_theo_nhom('cong_doan') where nhom_id = (select cd_id from t_tn)),
  2::bigint,
  'D-05: công đoạn test het_hang = 2'
);
select is(
  (select am from public.ton_theo_nhom('cong_doan') where nhom_id = (select cd_id from t_tn)),
  1::bigint,
  'D-05: công đoạn test am = 1'
);
select is(
  (select duoi_dinh_muc from public.ton_theo_nhom('cong_doan') where nhom_id = (select cd_id from t_tn)),
  1::bigint,
  'D-05: công đoạn test duoi_dinh_muc = 1'
);

-- 3. ton_theo_nhom('nhom', K1) — chỉ tồn kho K1 (D-06).
select is(
  (select con_hang from public.ton_theo_nhom('nhom', (select k1 from t_tn)) where nhom_id = (select nhom_id from t_tn)),
  3::bigint,
  'D-06: lọc K1 -- con_hang = 3 (001 +5, 004 +1, 005 +4 -- đều dương riêng ở K1)'
);
select is(
  (select het_hang from public.ton_theo_nhom('nhom', (select k1 from t_tn)) where nhom_id = (select nhom_id from t_tn)),
  1::bigint,
  'D-06: lọc K1 -- het_hang = 1 (002 không có movement ở K1)'
);
select is(
  (select am from public.ton_theo_nhom('nhom', (select k1 from t_tn)) where nhom_id = (select nhom_id from t_tn)),
  1::bigint,
  'D-06: lọc K1 -- am = 1 (003 -2 ở K1)'
);

-- 4. ton_theo_nhom('nhom', K2) — chỉ tồn kho K2.
select is(
  (select am from public.ton_theo_nhom('nhom', (select k2 from t_tn)) where nhom_id = (select nhom_id from t_tn)),
  1::bigint,
  'D-06: lọc K2 -- am = 1 (005 -4 ở K2)'
);
select is(
  (select het_hang from public.ton_theo_nhom('nhom', (select k2 from t_tn)) where nhom_id = (select nhom_id from t_tn)),
  4::bigint,
  'D-06: lọc K2 -- het_hang = 4 (001,002,003,004 không có movement ở K2)'
);

-- ---------------------------------------------------------------------------
-- 5-8. Đối chiếu chéo TOÀN BỘ với danh_sach_ton_kho (D-08) -- đúng bất kể dữ
-- liệu thật có gì, không neo vào số liệu cố định của 3.266 mã thật.
-- ---------------------------------------------------------------------------

-- 5. Mọi nhóm thật: 5 cột của ton_theo_nhom('nhom') phải khớp count(*) tương
-- ứng của danh_sach_ton_kho lọc cùng nhóm + cùng trạng thái (mặc định
-- p_dang_kinh_doanh=true ở cả hai phía -- D-17).
select is(
  (
    select count(*)
    from public.ton_theo_nhom('nhom') t
    where t.nhom_id is not null
      and (
        t.tong_ma <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_trang_thai_ton := null, p_kich_thuoc := 5000))
        or t.con_hang <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_trang_thai_ton := 'con_hang', p_kich_thuoc := 5000))
        or t.het_hang <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_trang_thai_ton := 'het_hang', p_kich_thuoc := 5000))
        or t.am <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_trang_thai_ton := 'am', p_kich_thuoc := 5000))
        or t.duoi_dinh_muc <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_trang_thai_ton := 'duoi_dinh_muc', p_kich_thuoc := 5000))
      )
  ),
  0::bigint,
  'D-08: mọi nhóm thật (kể cả nhóm test) khớp tuyệt đối với danh_sach_ton_kho lọc theo nhóm + trạng thái'
);

-- 6. Như 5, cho 'cong_doan' với p_cong_doan_id.
select is(
  (
    select count(*)
    from public.ton_theo_nhom('cong_doan') t
    where t.nhom_id is not null
      and (
        t.tong_ma <> (select count(*) from public.danh_sach_ton_kho(p_cong_doan_id := t.nhom_id, p_trang_thai_ton := null, p_kich_thuoc := 5000))
        or t.con_hang <> (select count(*) from public.danh_sach_ton_kho(p_cong_doan_id := t.nhom_id, p_trang_thai_ton := 'con_hang', p_kich_thuoc := 5000))
        or t.het_hang <> (select count(*) from public.danh_sach_ton_kho(p_cong_doan_id := t.nhom_id, p_trang_thai_ton := 'het_hang', p_kich_thuoc := 5000))
        or t.am <> (select count(*) from public.danh_sach_ton_kho(p_cong_doan_id := t.nhom_id, p_trang_thai_ton := 'am', p_kich_thuoc := 5000))
        or t.duoi_dinh_muc <> (select count(*) from public.danh_sach_ton_kho(p_cong_doan_id := t.nhom_id, p_trang_thai_ton := 'duoi_dinh_muc', p_kich_thuoc := 5000))
      )
  ),
  0::bigint,
  'D-08: mọi công đoạn thật khớp tuyệt đối với danh_sach_ton_kho lọc theo công đoạn + trạng thái'
);

-- 7. Như 5, kèm p_kho_id ở cả hai phía (D-06 + D-08 cộng lại).
select is(
  (
    select count(*)
    from public.ton_theo_nhom('nhom', (select k1 from t_tn)) t
    where t.nhom_id is not null
      and (
        t.tong_ma <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_kho_id := (select k1 from t_tn), p_trang_thai_ton := null, p_kich_thuoc := 5000))
        or t.con_hang <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_kho_id := (select k1 from t_tn), p_trang_thai_ton := 'con_hang', p_kich_thuoc := 5000))
        or t.het_hang <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_kho_id := (select k1 from t_tn), p_trang_thai_ton := 'het_hang', p_kich_thuoc := 5000))
        or t.am <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_kho_id := (select k1 from t_tn), p_trang_thai_ton := 'am', p_kich_thuoc := 5000))
        or t.duoi_dinh_muc <> (select count(*) from public.danh_sach_ton_kho(p_nhom_hang_id := t.nhom_id, p_kho_id := (select k1 from t_tn), p_trang_thai_ton := 'duoi_dinh_muc', p_kich_thuoc := 5000))
      )
  ),
  0::bigint,
  'D-06/D-08: lọc theo K1 vẫn khớp tuyệt đối với danh_sach_ton_kho ở mọi nhóm thật'
);

-- 8. Tổng tong_ma mọi dòng (kể cả nhom_id null) = tổng số mã đang kinh doanh
-- (tong_so_dong của danh_sach_ton_kho, không phụ thuộc p_kich_thuoc).
select is(
  (select coalesce(sum(tong_ma), 0)::bigint from public.ton_theo_nhom('nhom')),
  (select tong_so_dong from public.danh_sach_ton_kho(p_kich_thuoc := 1)),
  'D-08: tổng tong_ma mọi dòng (kể cả chưa có nhóm) = tong_so_dong của danh_sach_ton_kho'
);

-- ---------------------------------------------------------------------------
-- 9. p_theo ngoài whitelist bị từ chối.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select * from public.ton_theo_nhom('khac')$$,
  '22023', null,
  'p_theo ngoài nhom/cong_doan bị từ chối 22023'
);

-- ---------------------------------------------------------------------------
-- 10-12. D-12: văn phòng / thủ kho / chỉ xem gọi thẳng RPC đều bị chặn 42501.
-- ---------------------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select throws_ok(
  $$select * from public.ton_theo_nhom('nhom')$$,
  '42501', null,
  'D-12: văn phòng gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$select * from public.ton_theo_nhom('nhom')$$,
  '42501', null,
  'D-12: thủ kho gọi thẳng RPC bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$select * from public.ton_theo_nhom('nhom')$$,
  '42501', null,
  'D-12: chỉ xem gọi thẳng RPC bị chặn 42501'
);

select * from finish();
rollback;
