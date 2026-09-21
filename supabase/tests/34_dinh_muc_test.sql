-- =============================================================================
-- TQAN-02 (D-04) — Đề xuất & duyệt định mức tồn tối thiểu (migration 0060)
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


-- Hai nhóm test: NH-DM-ZQX (A có lịch sử, B cùng nhóm không có lịch sử) và
-- NH-DM-ZQX2 (C — cả nhóm không mã nào từng bán).
insert into public.nhom_hang (ma, ten) values ('NH-DM-ZQX', 'Nhóm test định mức ZQX');
insert into public.nhom_hang (ma, ten) values ('NH-DM-ZQX2', 'Nhóm test định mức ZQX 2 — không mã nào từng bán');

create temp table t_dm as
select pg_temp.sp_test('DM-ZQX-A') as a,
       pg_temp.sp_test('DM-ZQX-B') as b,
       pg_temp.sp_test('DM-ZQX-C') as c,
       (select id from public.nhom_hang where ma = 'NH-DM-ZQX')  as nhom1,
       (select id from public.nhom_hang where ma = 'NH-DM-ZQX2') as nhom2;
grant select on t_dm to authenticated;

-- Tạo mã hàng ở câu lệnh riêng rồi mới UPDATE — gọi sp_test() trong WHERE của
-- chính câu UPDATE thì dòng vừa chèn nằm ngoài snapshot, update 0 dòng im lặng
-- (bẫy đã gặp ở 63_danh_muc_phu_test.sql).
update public.san_pham set nhom_hang_id = (select nhom1 from t_dm)
 where id in ((select a from t_dm), (select b from t_dm));
update public.san_pham set nhom_hang_id = (select nhom2 from t_dm)
 where id = (select c from t_dm);

-- DM-ZQX-A: ba hóa đơn khác nhau (so_lan_ban = 3), tổng số lượng 5+3+2 = 10.
-- Ngày nằm TRONG khung 03/09→12/09/2026 đã có sẵn trong luu_tru_hoa_don_kiotviet
-- thật, để không kéo giãn cửa sổ chung khi chạy trên dữ liệu thật.
insert into public.luu_tru_hoa_don_kiotviet (ma_hoa_don, ngay, ma_hang, so_luong, ghi_chu) values
  ('HD-DM-ZQX-1', '2026-09-05T09:00:00+07:00', 'DM-ZQX-A', 5, 'test 05-03'),
  ('HD-DM-ZQX-2', '2026-09-06T10:00:00+07:00', 'DM-ZQX-A', 3, 'test 05-03'),
  ('HD-DM-ZQX-3', '2026-09-07T11:00:00+07:00', 'DM-ZQX-A', 2, 'test 05-03');

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

-- 1. DM-ZQX-A: theo_ma, so_lan_ban đúng số hóa đơn, tong_da_ban đúng tổng số lượng.
select is(
  (select nguon_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  'theo_ma',
  'DM-ZQX-A có lịch sử bán riêng → nguon_de_xuat = theo_ma'
);

select is(
  (select so_lan_ban from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  3,
  'so_lan_ban của A đúng bằng 3 hóa đơn đã chèn'
);

select is(
  (select tong_da_ban from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  10::numeric,
  'tong_da_ban của A đúng bằng tổng số lượng ba hóa đơn (5+3+2)'
);

-- 2. so_ngay_du_lieu của A > 0 và bằng nhau ở MỌI dòng theo_ma (cửa sổ chung,
-- không tính riêng từng mã).
select ok(
  (select so_ngay_du_lieu from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A') > 0,
  'so_ngay_du_lieu của A lớn hơn 0'
);

select is(
  (select count(distinct so_ngay_du_lieu)
     from public.de_xuat_dinh_muc(p_nguon := 'theo_ma', p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)),
  1::bigint,
  'so_ngay_du_lieu bằng nhau ở MỌI dòng theo_ma — cửa sổ tính trên toàn bộ lưu trữ, không tính riêng từng mã'
);

-- 3. dinh_muc_de_xuat của A không vượt quá tong_da_ban (chốt chặn giá trị vô lý).
select ok(
  (select dinh_muc_de_xuat <= tong_da_ban
     from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  'dinh_muc_de_xuat của A không vượt quá tong_da_ban'
);

-- 4. DM-ZQX-B: trung_binh_nhom, bằng đúng đề xuất của A (nhóm chỉ có một mã có
-- lịch sử).
select is(
  (select nguon_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-B'),
  'trung_binh_nhom',
  'DM-ZQX-B không có lịch sử riêng → nguon_de_xuat = trung_binh_nhom'
);

select is(
  (select dinh_muc_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-B'),
  (select dinh_muc_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  'định mức đề xuất của B bằng đúng của A — nhóm NH-DM-ZQX chỉ có một mã có lịch sử'
);

-- 5. DM-ZQX-C: khong_du_lieu, đề xuất 0 — thà nói thẳng không biết còn hơn bịa số.
select is(
  (select nguon_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-C'),
  'khong_du_lieu',
  'DM-ZQX-C thuộc nhóm không mã nào từng bán → nguon_de_xuat = khong_du_lieu'
);

select is(
  (select dinh_muc_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-C'),
  0::numeric,
  'DM-ZQX-C đề xuất 0'
);

-- 6. Trước khi duyệt: ton_toi_thieu của A vẫn là giá trị cũ (0, mặc định của
-- san_pham) — de_xuat_dinh_muc chỉ đọc, không ghi gì.
select is(
  (select ton_toi_thieu from public.san_pham where id = (select a from t_dm)),
  0::numeric,
  'trước khi duyệt, ton_toi_thieu của A vẫn là 0 — de_xuat_dinh_muc chỉ đọc, không ghi'
);

-- 7. Văn phòng duyệt: dat_dinh_muc trả 1, ton_toi_thieu của A bằng đúng đề xuất
-- (server tự tính lại, không nhận số từ client).
select is(
  public.dat_dinh_muc(array[(select a from t_dm)]),
  1,
  'dat_dinh_muc(array[A]) áp dụng đúng 1 mã'
);

select is(
  (select ton_toi_thieu from public.san_pham where id = (select a from t_dm)),
  (select dinh_muc_de_xuat from public.de_xuat_dinh_muc(p_chi_khac_hien_tai := false, p_kich_thuoc := 5000)
     where ma_hang = 'DM-ZQX-A'),
  'sau khi duyệt, ton_toi_thieu của A bằng đúng dinh_muc_de_xuat — server tự tính lại, không nhận số từ client'
);

-- 8. Nhật ký: đúng một dòng ghi ton_toi_thieu với nguon = dinh_muc cho A.
-- Về postgres trước khi đọc: nhat_ky_sua không cấp SELECT cho authenticated
-- (0027 — client chỉ đọc qua RPC lich_su_sua), như 25_duyet_don và 91_gia_von_dau_ky.
select pg_temp.dang_xuat();
select is(
  (select count(*) from public.nhat_ky_sua
     where bang = 'san_pham' and ban_ghi_id = (select a from t_dm)
       and truong = 'ton_toi_thieu' and nguon = 'dinh_muc'),
  1::bigint,
  'đúng một dòng nhat_ky_sua ghi ton_toi_thieu với nguon = dinh_muc cho A'
);

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

-- 9. Thủ kho không duyệt được định mức.
select throws_ok(
  $$select public.dat_dinh_muc(array[uuid_generate_v4()])$$,
  '42501', null,
  'thủ kho gọi dat_dinh_muc bị chặn 42501'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

-- 10. Chỉ xem không duyệt được định mức.
select throws_ok(
  $$select public.dat_dinh_muc(array[uuid_generate_v4()])$$,
  '42501', null,
  'chỉ xem gọi dat_dinh_muc bị chặn 42501'
);

select * from finish();
rollback;
