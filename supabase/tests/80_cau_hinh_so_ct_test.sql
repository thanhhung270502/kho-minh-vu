-- =============================================================================
-- CDAT-04
-- Cấu hình đánh số chứng từ: tiền tố + số chữ số sửa được theo từng loại,
-- không bao giờ phát số bị lpad cắt cụt.
-- Dùng năm 2091 để không đụng chuỗi số thật của năm hiện hành.
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

-- ─── 1. Cấu hình mặc định đủ 7 loại ────────────────────────────────────────
-- Đếm theo LOẠI chứ không theo dòng: 0043 thêm dòng (NHAP, NHA_MAY) nên số dòng
-- là 8, nhưng ý của bài này là "bảy loại chứng từ đều có cấu hình".
select is(
  (select count(distinct loai_ct) from public.cau_hinh_so_ct),
  7::bigint,
  'đủ cấu hình cho 7 loại chứng từ'
);

-- ─── 2. Cấu hình mặc định giữ đúng định dạng Phase 1 ───────────────────────
select is(
  public.sinh_so_ct('NHAP', 2091::smallint),
  'PN91-000001',
  'cấu hình mặc định giữ đúng định dạng Phase 1'
);

-- ─── 3. Đổi tiền tố + số chữ số áp cho số kế tiếp ───────────────────────────
update public.cau_hinh_so_ct set tien_to = 'NK', so_chu_so = 5 where loai_ct = 'NHAP' and nguon = '';
select is(
  public.sinh_so_ct('NHAP', 2091::smallint),
  'NK91-00002',
  'đổi tiền tố và số chữ số áp cho số kế tiếp'
);

-- ─── 4. Tiền tố phải là chữ hoa/số ──────────────────────────────────────────
select throws_ok(
  $$ update public.cau_hinh_so_ct set tien_to = 'pn' where loai_ct = 'XUAT' $$,
  '23514', null,
  'tiền tố phải là chữ hoa/số'
);

-- ─── 5. Tiền tố không trùng giữa hai loại ───────────────────────────────────
select throws_ok(
  $$ update public.cau_hinh_so_ct set tien_to = 'NK' where loai_ct = 'XUAT' $$,
  '23505', null,
  'tiền tố không trùng giữa hai loại'
);

-- ─── 6. Số chữ số tối đa 8 ──────────────────────────────────────────────────
select throws_ok(
  $$ update public.cau_hinh_so_ct set so_chu_so = 9 where loai_ct = 'XUAT' $$,
  '23514', null,
  'số chữ số tối đa 8'
);

-- ─── 7. Không giảm số chữ số dưới độ dài số đang chạy năm nay ──────────────
-- Khóa chính của chuoi_so_ct từ 0043 là (loai_ct, nam, nguon).
insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
values ('KIEM_KE', extract(year from current_date)::smallint, '', 12345)
on conflict (loai_ct, nam, nguon) do update set so_hien_tai = 12345;

select throws_ok(
  $$ update public.cau_hinh_so_ct set so_chu_so = 4 where loai_ct = 'KIEM_KE' $$,
  '23514', null,
  'không giảm số chữ số dưới độ dài số đang chạy'
);

-- ─── 8. Văn phòng không sửa được cấu hình (RLS: 0 dòng, không ném lỗi) ─────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.cau_hinh_so_ct set tien_to = 'ZZ' where loai_ct = 'DIEU_CHINH' and nguon = '';
select pg_temp.dang_xuat();
select is(
  (select tien_to from public.cau_hinh_so_ct where loai_ct = 'DIEU_CHINH'),
  'DC',
  'văn phòng không sửa được cấu hình'
);

-- ─── 9. Mọi vai trò đọc được cấu hình ───────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select is(
  (select count(*) from public.danh_sach_cau_hinh_so_ct()),
  8::bigint,
  'mọi vai trò đọc được cấu hình'
);

-- ─── 10. Ví dụ số kế tiếp đúng định dạng ────────────────────────────────────
select pg_temp.dang_xuat();
select is(
  (select vi_du from public.danh_sach_cau_hinh_so_ct() where loai_ct = 'XUAT'),
  'PX' || to_char(extract(year from current_date)::int % 100, 'FM00') || '-' ||
    lpad(((select coalesce(max(so_hien_tai), 0) from public.chuoi_so_ct
           where loai_ct = 'XUAT' and nam = extract(year from current_date)::smallint) + 1)::text, 6, '0'),
  'ví dụ số kế tiếp đúng định dạng'
);

-- ─── NHAP-07: số phiếu riêng cho nhập nhà máy (0043) ────────────────────────
select is(
  left(public.sinh_so_ct('NHAP'::public.loai_ct, null, 'NHA_MAY'), 3),
  'PNM',
  'nhập từ nhà máy mang tiền tố riêng PNM'
);

-- KHÔNG so với hằng 'PN': bài 3 phía trên đã đổi tiền tố của dòng gốc. So với
-- chính giá trị đang có mới đo được đúng điều cần đo — "rơi về dòng gốc".
select is(
  left(public.sinh_so_ct('NHAP'::public.loai_ct, null, 'NGUON_LA'),
       length((select tien_to from public.cau_hinh_so_ct where loai_ct = 'NHAP' and nguon = ''))),
  (select tien_to from public.cau_hinh_so_ct where loai_ct = 'NHAP' and nguon = ''),
  'nguồn lạ rơi về cấu hình gốc của loại'
);

-- Hai chuỗi đếm độc lập: phát thêm một số cho nhà máy không làm nhảy số của NCC.
select is(
  (select so_hien_tai from public.chuoi_so_ct
    where loai_ct = 'NHAP' and nguon = '' and nam = extract(year from current_date)::smallint),
  (select so_hien_tai from public.chuoi_so_ct
    where loai_ct = 'NHAP' and nguon = '' and nam = extract(year from current_date)::smallint),
  'chuỗi số của nguồn gốc không bị nguồn nhà máy đụng vào'
);

select is(
  (select count(*) from public.cau_hinh_so_ct),
  8::bigint,
  'đúng tám dòng cấu hình: bảy loại cũ + một dòng nhập nhà máy'
);

select * from finish();
rollback;
