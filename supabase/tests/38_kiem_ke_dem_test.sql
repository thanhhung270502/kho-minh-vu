-- =============================================================================
-- KKE-01/02, D-02/D-03/D-05/D-08 — mở phiên kiểm kê, chốt tồn sổ TỪNG DÒNG tại
-- lúc lưu (D-03), khóa mọi đường ghi thẳng chung_tu_dong của KIEM_KE, và nhập
-- số đếm hàng loạt (Excel/nhieu_dong) không nạp nửa vời.
--
-- KHÔNG đụng _ghi_so_kiem_ke (0011) — công thức lệch = so_luong - so_luong_he_thong
-- đã đúng D-03 từ Phase 1. Việc thật là ghi so_luong_he_thong đúng LÚC LƯU.
-- =============================================================================
begin;
select plan(41);

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

-- ─── Dữ liệu, dưới quyền postgres (bypass RLS) ──────────────────────────────
-- N1/N2: hai nhóm hàng test. A, B: nhóm N1, kho mặc định K1 — A có tồn ban đầu
-- 10, B có tồn 5 (một phiếu NHAP đã ghi sổ). C: nhóm N2, kho mặc định K1 (ngoài
-- phạm vi phiên chỉ nhắm N1). D: nhóm N1, kho mặc định K2 (không nằm ở K1
-- nhưng vẫn đếm được vì nhap_so_dem_kiem_ke chỉ xét nhóm, không xét kho). E:
-- nhóm N1, kho mặc định K1, CHƯA từng có chứng từ nào — không có dòng ton_kho.
do $$
begin
  insert into public.nhom_hang (ma, ten) values ('ZQX-N1', 'Nhóm test ZQX 1')
    on conflict (ma) do update set ten = excluded.ten;
  insert into public.nhom_hang (ma, ten) values ('ZQX-N2', 'Nhóm test ZQX 2')
    on conflict (ma) do update set ten = excluded.ten;
end $$;

create temp table t_id as
select
  pg_temp.sp_test('KK-ZQX-A') as a,
  pg_temp.sp_test('KK-ZQX-B') as b,
  pg_temp.sp_test('KK-ZQX-C') as c,
  pg_temp.sp_test('KK-ZQX-D') as d,
  pg_temp.sp_test('KK-ZQX-E') as e,
  pg_temp.kho_id('K1')        as k1,
  pg_temp.kho_id('K2')        as k2,
  (select id from public.nhom_hang where ma = 'ZQX-N1') as n1,
  (select id from public.nhom_hang where ma = 'ZQX-N2') as n2;
grant select on t_id to authenticated;

update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.a;
update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.b;
update public.san_pham sp set nhom_hang_id = t_id.n2, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.c;
update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k2 from t_id where sp.id = t_id.d;
update public.san_pham sp set nhom_hang_id = t_id.n1, kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.e;

-- Một phiếu NHAP thật, đã ghi sổ: tồn K1 của A = 10, B = 5.
insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PN-ZQX-KK01', 'NHAP', t_id.k1 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select ct.id, t_id.a, 10, 1000 from public.chung_tu ct, t_id where ct.so_ct = 'PN-ZQX-KK01'
union all
select ct.id, t_id.b, 5, 1000 from public.chung_tu ct, t_id where ct.so_ct = 'PN-ZQX-KK01';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-ZQX-KK01'));

-- =============================================================================
-- C1 — mo_phien_kiem_ke: phạm vi N1, dưới vanphong.
-- =============================================================================
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

create temp table t_p1 as
select (public.mo_phien_kiem_ke(
  p_kho_id := (select k1 from t_id),
  p_nhom_hang_ids := array[(select n1 from t_id)]
)).*;
grant select on t_p1 to authenticated;

select is((select loai_ct::text from t_p1), 'KIEM_KE', 'C1: loai_ct = KIEM_KE');
select is((select trang_thai::text from t_p1), 'NHAP_LIEU', 'C1: trang_thai = NHAP_LIEU');
select is((select kho_id from t_p1), (select k1 from t_id), 'C1: kho_id = K1');
select is((select pham_vi_nhom_hang from t_p1), array[(select n1 from t_id)], 'C1: pham_vi_nhom_hang = {N1}');
select ok((select so_ct from t_p1) like 'KK%', 'C1: so_ct bắt đầu bằng KK');

-- =============================================================================
-- C2 — nhóm hàng null / mảng rỗng đều là "toàn kho" (pham_vi_nhom_hang null).
-- =============================================================================
select is(
  (public.mo_phien_kiem_ke(p_kho_id := (select k1 from t_id), p_nhom_hang_ids := null)).pham_vi_nhom_hang,
  null::uuid[],
  'C2: p_nhom_hang_ids null -> pham_vi_nhom_hang null (toàn kho)'
);
select is(
  (public.mo_phien_kiem_ke(p_kho_id := (select k1 from t_id), p_nhom_hang_ids := '{}'::uuid[])).pham_vi_nhom_hang,
  null::uuid[],
  'C2: p_nhom_hang_ids rỗng -> pham_vi_nhom_hang null (toàn kho)'
);

select pg_temp.dang_xuat();

-- =============================================================================
-- C3 — chặn theo vai trò/kho.
-- =============================================================================
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  $$ select public.mo_phien_kiem_ke(p_kho_id := (select k2 from t_id)) $$,
  '42501', null,
  'C3: thủ kho không được phân kho K2 -> 42501'
);
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select throws_ok(
  $$ select public.mo_phien_kiem_ke(p_kho_id := (select k1 from t_id)) $$,
  '42501', null,
  'C3: chỉ xem không mở được phiên -> 42501'
);
select pg_temp.dang_xuat();

-- =============================================================================
-- C4 — D-03 cốt lõi: XUAT 3 A giữa lúc phiên mở, rồi lưu đếm -> chốt tồn sổ
-- TẠI LÚC LƯU (7), không phải lúc mở phiên (10).
-- =============================================================================
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PX-ZQX-KK01', 'XUAT', t_id.k1 from t_id;
update public.chung_tu set ly_do_xuat_am = 'Không áp dụng' where so_ct = 'PX-ZQX-KK01';
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong)
select ct.id, t_id.a, 3 from public.chung_tu ct, t_id where ct.so_ct = 'PX-ZQX-KK01';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PX-ZQX-KK01'));
-- Tồn A tại K1 giờ = 7.

create temp table t_dong_a as
select (public.luu_dong_kiem_ke((select id from t_p1), (select a from t_id), 6)).*;
grant select on t_dong_a to authenticated;

select is((select so_luong from t_dong_a), 6::numeric(18,4), 'C4: so_luong = 6');
select is((select so_luong_he_thong from t_dong_a), 7::numeric(18,4), 'C4: so_luong_he_thong = 7 (chốt LÚC LƯU, không phải lúc mở phiên)');
select ok((select dem_luc from t_dong_a) is not null, 'C4: dem_luc not null');
select is(
  (select nguoi_dem_id from t_dong_a),
  (select id from auth.users where email = 'vanphong@khominhvu.local'),
  'C4: nguoi_dem_id = người đang đếm'
);
select is((select kho_id from t_dong_a), (select k1 from t_id), 'C4: kho_id = K1');

-- =============================================================================
-- C5 — đếm lại: NHAP thêm 2 A (tồn 9), lưu lại -> VẪN một dòng, chốt lại tại
-- lúc sửa.
-- =============================================================================
insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PN-ZQX-KK02', 'NHAP', t_id.k1 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select ct.id, t_id.a, 2, 1000 from public.chung_tu ct, t_id where ct.so_ct = 'PN-ZQX-KK02';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-ZQX-KK02'));
-- Tồn A tại K1 giờ = 9.

select public.luu_dong_kiem_ke((select id from t_p1), (select a from t_id), 8);

select is(
  (select count(*)::int from public.chung_tu_dong
    where chung_tu_id = (select id from t_p1) and san_pham_id = (select a from t_id)),
  1,
  'C5: vẫn đúng MỘT dòng cho mã A sau khi đếm lại'
);
select is(
  (select so_luong from public.chung_tu_dong
    where chung_tu_id = (select id from t_p1) and san_pham_id = (select a from t_id)),
  8::numeric(18,4),
  'C5: so_luong = 8 sau khi đếm lại'
);
select is(
  (select so_luong_he_thong from public.chung_tu_dong
    where chung_tu_id = (select id from t_p1) and san_pham_id = (select a from t_id)),
  9::numeric(18,4),
  'C5: so_luong_he_thong chốt lại = 9 tại lúc sửa'
);

-- =============================================================================
-- C6 — mã chưa từng có chứng từ nào (không có dòng ton_kho tại K1) -> chốt
-- so_luong_he_thong = 0, KHÔNG null.
-- =============================================================================
select public.luu_dong_kiem_ke((select id from t_p1), (select e from t_id), 5);
select is(
  (select so_luong_he_thong from public.chung_tu_dong
    where chung_tu_id = (select id from t_p1) and san_pham_id = (select e from t_id)),
  0::numeric(18,4),
  'C6: mã chưa từng có ton_kho -> so_luong_he_thong = 0 (không null)'
);

-- =============================================================================
-- C7 — ràng buộc nghiệp vụ.
-- =============================================================================
select throws_ok(
  format('select public.luu_dong_kiem_ke(%L::uuid, %L::uuid, 1)', (select id from t_p1), (select c from t_id)),
  '23514', null,
  'C7: mã C thuộc N2, ngoài phạm vi phiên -> 23514'
);
select throws_ok(
  format('select public.luu_dong_kiem_ke(%L::uuid, %L::uuid, -1)', (select id from t_p1), (select a from t_id)),
  '23514', null,
  'C7: số đếm âm -> 23514'
);
select throws_ok(
  format('select public.luu_dong_kiem_ke(%L::uuid, %L::uuid, null)', (select id from t_p1), (select a from t_id)),
  '23514', null,
  'C7: số đếm null -> 23514'
);

-- =============================================================================
-- C8 — client KHÔNG ghi thẳng được chung_tu_dong/chung_tu của phiên KIEM_KE.
-- =============================================================================
select throws_ok(
  format(
    'insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong) values (%L::uuid, %L::uuid, 5)',
    (select id from t_p1), (select b from t_id)
  ),
  '42501', null,
  'C8: insert thẳng chung_tu_dong của phiên KIEM_KE -> 42501'
);

update public.chung_tu_dong set so_luong = 99 where chung_tu_id = (select id from t_p1);
select pg_temp.dang_xuat();
select is(
  (select count(*)::int from public.chung_tu_dong where chung_tu_id = (select id from t_p1) and so_luong = 99),
  0,
  'C8: update thẳng so_luong của dòng KIEM_KE bị RLS lọc, 0 dòng bị đổi'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

create temp table t_dem_truoc_xoa as
select count(*)::int as n from public.chung_tu_dong where chung_tu_id = (select id from t_p1);
grant select on t_dem_truoc_xoa to authenticated;

delete from public.chung_tu_dong where chung_tu_id = (select id from t_p1);
select pg_temp.dang_xuat();
select is(
  (select count(*)::int from public.chung_tu_dong where chung_tu_id = (select id from t_p1)),
  (select n from t_dem_truoc_xoa),
  'C8: delete thẳng dòng KIEM_KE bị RLS lọc, 0 dòng bị xóa'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

update public.chung_tu set kho_id = (select k2 from t_id) where id = (select id from t_p1);
select pg_temp.dang_xuat();
select is(
  (select kho_id from public.chung_tu where id = (select id from t_p1)),
  (select k1 from t_id),
  'C8: update kho_id của header KIEM_KE bị RLS lọc, không đổi'
);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  format(
    'insert into public.chung_tu (so_ct, loai_ct, kho_id) values (%L, %L, %L::uuid)',
    'ZQX-KK-THANG', 'KIEM_KE', (select k1 from t_id)
  ),
  '42501', null,
  'C8: insert thẳng header KIEM_KE -> 42501'
);

-- =============================================================================
-- C9 — không phá luồng cũ: insert dòng vào phiếu NHAP còn NHAP_LIEU vẫn được.
-- =============================================================================
select pg_temp.dang_xuat();
insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PN-ZQX-KK03', 'NHAP', t_id.k1 from t_id;
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select lives_ok(
  format(
    'insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia) values ((select id from public.chung_tu where so_ct = %L), %L::uuid, 1, 100)',
    'PN-ZQX-KK03', (select a from t_id)
  ),
  'C9: insert dòng vào phiếu NHAP còn NHAP_LIEU vẫn hoạt động bình thường'
);

-- =============================================================================
-- C10 — xoa_dong_kiem_ke: xóa được khi NHAP_LIEU; 23514 khi phiên đã ghi sổ.
-- =============================================================================
select public.xoa_dong_kiem_ke((
  select id from public.chung_tu_dong
  where chung_tu_id = (select id from t_p1) and san_pham_id = (select a from t_id)
));
select is(
  (select count(*)::int from public.chung_tu_dong
    where chung_tu_id = (select id from t_p1) and san_pham_id = (select a from t_id)),
  0,
  'C10: xoa_dong_kiem_ke xóa đúng dòng mã A'
);

select pg_temp.dang_xuat();
update public.chung_tu set trang_thai = 'HOAN_THANH' where id = (select id from t_p1);
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  format(
    'select public.xoa_dong_kiem_ke((select id from public.chung_tu_dong where chung_tu_id = %L::uuid and san_pham_id = %L::uuid))',
    (select id from t_p1), (select b from t_id)
  ),
  '23514', null,
  'C10: phiên đã HOAN_THANH -> xoa_dong_kiem_ke báo 23514'
);
select pg_temp.dang_xuat();

-- =============================================================================
-- C11-C13 — nhap_so_dem_kiem_ke: xem trước, không nạp nửa vời, ghi thật.
-- Phiên P2 mới, cùng phạm vi N1.
-- =============================================================================
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

create temp table t_p2 as
select (public.mo_phien_kiem_ke(
  p_kho_id := (select k1 from t_id),
  p_nhom_hang_ids := array[(select n1 from t_id)]
)).*;
grant select on t_p2 to authenticated;

-- Dòng A đã có sẵn trong P2 (để bài kiểm C11 thấy nhánh cập_nhật).
select public.luu_dong_kiem_ke((select id from t_p2), (select a from t_id), 3);

create temp table t_du_lieu_loi as
select jsonb_build_array(
  jsonb_build_object('ma_hang', 'KK-ZQX-A', 'so_dem', 4),
  jsonb_build_object('ma_hang', 'KK-ZQX-B', 'so_dem', 5),
  jsonb_build_object('ma_hang', 'KK-ZQX-E', 'so_dem', ''),
  jsonb_build_object('ma_hang', 'KK-ZQX-KHONGCO', 'so_dem', 1),
  jsonb_build_object('ma_hang', 'KK-ZQX-C', 'so_dem', 1),
  jsonb_build_object('ma_hang', 'KK-ZQX-D', 'so_dem', 'abc'),
  jsonb_build_object('ma_hang', 'KK-ZQX-B', 'so_dem', 5)
) as du_lieu;
grant select on t_du_lieu_loi to authenticated;

create temp table t_xem_truoc as
select public.nhap_so_dem_kiem_ke(
  (select id from t_p2), (select du_lieu from t_du_lieu_loi), true
) as kq;
grant select on t_xem_truoc to authenticated;

select is((select (kq->>'cap_nhat')::int from t_xem_truoc), 1, 'C11: cap_nhat = 1 (mã A đã có dòng)');
select is((select (kq->>'dat')::int from t_xem_truoc), 1, 'C11: dat = 1 (mã B, lần đầu)');
select is((select (kq->>'bo_qua')::int from t_xem_truoc), 1, 'C11: bo_qua = 1 (mã E, ô Số đếm trống)');
select is(
  (select (kq->>'so_loi')::int from t_xem_truoc), 4,
  'C11: so_loi = 4 (không tồn tại, C ngoài phạm vi, D số không hợp lệ, B lặp)'
);
select is(
  (select count(*)::int from public.chung_tu_dong where chung_tu_id = (select id from t_p2)),
  1,
  'C11: xem trước KHÔNG ghi gì — P2 vẫn chỉ một dòng (A đã lưu trước đó)'
);

-- C12: nạp thật với dữ liệu CÓ lỗi -> không ghi gì.
create temp table t_nap_loi as
select public.nhap_so_dem_kiem_ke(
  (select id from t_p2), (select du_lieu from t_du_lieu_loi), false
) as kq;
grant select on t_nap_loi to authenticated;

select is((select (kq->>'da_nap')::boolean from t_nap_loi), false, 'C12: da_nap = false khi dữ liệu có lỗi');
select is(
  (select count(*)::int from public.chung_tu_dong where chung_tu_id = (select id from t_p2)),
  1,
  'C12: KHÔNG nạp nửa vời — vẫn chỉ một dòng như trước'
);

-- C13: nạp thật với dữ liệu sạch.
create temp table t_du_lieu_sach as
select jsonb_build_array(
  jsonb_build_object('ma_hang', 'KK-ZQX-A', 'so_dem', 4),
  jsonb_build_object('ma_hang', 'KK-ZQX-B', 'so_dem', 5)
) as du_lieu;
grant select on t_du_lieu_sach to authenticated;

create temp table t_nap_sach as
select public.nhap_so_dem_kiem_ke(
  (select id from t_p2), (select du_lieu from t_du_lieu_sach), false
) as kq;
grant select on t_nap_sach to authenticated;

select is((select (kq->>'da_nap')::boolean from t_nap_sach), true, 'C13: da_nap = true khi dữ liệu sạch');
select is(
  (select so_luong from public.chung_tu_dong
    where chung_tu_id = (select id from t_p2) and san_pham_id = (select a from t_id)),
  4::numeric(18,4),
  'C13: dòng A so_luong = 4 sau khi nạp'
);
select is(
  (select so_luong_he_thong from public.chung_tu_dong
    where chung_tu_id = (select id from t_p2) and san_pham_id = (select b from t_id)),
  5::numeric(18,4),
  'C13: dòng B có so_luong_he_thong = 5 (chốt lúc nạp)'
);

select pg_temp.dang_xuat();

-- =============================================================================
-- C14 — unique index một mã một dòng trong phiên.
-- =============================================================================
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'chung_tu_dong'
      and indexname = 'uq_ct_dong_kiem_ke_ma'
  ),
  'C14: unique index uq_ct_dong_kiem_ke_ma tồn tại'
);

-- =============================================================================
-- C15 — anon không có quyền execute luu_dong_kiem_ke.
-- =============================================================================
select is(
  has_function_privilege('anon', 'public.luu_dong_kiem_ke(uuid,uuid,numeric)', 'execute'),
  false,
  'C15: anon không có quyền execute luu_dong_kiem_ke'
);

select * from finish();
rollback;
