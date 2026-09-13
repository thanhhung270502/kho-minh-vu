-- =============================================================================
-- D-20 — Nhật ký sửa append-only cho san_pham / doi_tac / nguoi_dung.
-- Mã test dùng tiền tố NKS-ZQX- (không khớp dữ liệu thật, an toàn cho assertion đếm).
--
-- Bảng nhat_ky_sua bị REVOKE ALL khỏi anon/authenticated (đọc duy nhất qua RPC
-- lich_su_sua) — mọi lần đọc trực tiếp để KIỂM TRA kết quả trong file này phải
-- chạy dưới role postgres (chủ bảng, không bị REVOKE ràng buộc), không phải
-- dưới authenticated. Chỉ các bước UPDATE thật (để trigger bắt) và bước kiểm
-- REVOKE (assertion H) mới cần đang ở role authenticated.
-- =============================================================================
begin;
select plan(12);

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

-- ─── 1. Tạo mới sinh một dòng _tao_moi (dưới postgres) ─────────────────────
select pg_temp.sp_test('NKS-ZQX-001');
select is(
  (select count(*) from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong = '_tao_moi'),
  1::bigint,
  'tạo mới sinh một dòng _tao_moi'
);

-- ─── Ghi (as vanphong) rồi quay lại postgres để kiểm ────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.san_pham set ten_hang = 'Tên mới', ghi_chu = 'gc' where ma_hang = 'NKS-ZQX-001';
select pg_temp.dang_xuat();

-- ─── 2. Sửa hai trường sinh hai dòng ────────────────────────────────────────
select is(
  (select count(*) from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong in ('ten_hang', 'ghi_chu')),
  2::bigint,
  'sửa hai trường sinh hai dòng'
);

-- ─── 3. Lưu giá trị cũ ──────────────────────────────────────────────────────
select is(
  (select gia_tri_cu #>> '{}' from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong = 'ten_hang'),
  'Hàng test NKS-ZQX-001',
  'lưu giá trị cũ'
);

-- ─── 4. Ghi đúng người sửa ──────────────────────────────────────────────────
select is(
  (select nguoi_sua_id from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong = 'ten_hang'),
  (select id from auth.users where email = 'vanphong@khominhvu.local'),
  'ghi đúng người sửa'
);

-- ─── 5. Nguồn mặc định là form khi có người dùng ────────────────────────────
select is(
  (select nguon from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong = 'ten_hang'),
  'form',
  'nguồn mặc định là form khi có người dùng'
);

-- ─── Ghi lại (không đổi giá trị), rồi quay lại postgres để kiểm ─────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
update public.san_pham set ten_hang = 'Tên mới' where ma_hang = 'NKS-ZQX-001';
select pg_temp.dang_xuat();

-- ─── 6. Update không đổi giá trị không sinh nhật ký mới ────────────────────
-- Tổng lũy kế tới đây: 1 (_tao_moi) + 2 (ten_hang, ghi_chu) = 3, không đổi.
select is(
  (select count(*) from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')),
  3::bigint,
  'update không đổi giá trị nào không sinh thêm nhật ký'
);

-- ─── Ghi với nguồn import, rồi kiểm ngay lớp REVOKE trong khi vẫn authenticated ──
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select set_config('app.nguon_sua', 'import', true);
update public.san_pham set ghi_chu = 'gc2' where ma_hang = 'NKS-ZQX-001';

-- ─── 8. authenticated không sửa được nhật ký (REVOKE — lớp 1) ──────────────
-- Kiểm trong lúc CÒN authenticated — đúng đối tượng cần chứng minh.
select throws_ok(
  $$update public.nhat_ky_sua set nguon = 'x'$$,
  '42501',
  null,
  'authenticated không sửa được nhật ký'
);
select pg_temp.dang_xuat();

-- ─── 7. app.nguon_sua ghi đúng nguồn (kiểm dưới postgres) ──────────────────
-- Không sắp theo sua_luc: cả file chạy trong một transaction nên now() không
-- đổi giữa các insert (transaction timestamp), "order by sua_luc desc" không
-- phân biệt được hai dòng cùng truong — kiểm theo đúng giá trị mới ('gc2') thay vì "mới nhất".
select ok(
  exists (
    select 1 from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong = 'ghi_chu'
      and nguon = 'import'
      and gia_tri_moi = to_jsonb('gc2'::text)
  ),
  'nguồn ghi vào nhật ký theo app.nguon_sua'
);

-- ─── 9. Kể cả postgres cũng không xóa được (trigger — lớp 2) ───────────────
select throws_ok(
  $$delete from public.nhat_ky_sua$$,
  '23514',
  null,
  'kể cả postgres không xóa được nhật ký'
);

-- ─── 10. Thủ kho không đọc được lịch sử sửa ─────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok(
  format(
    $$select * from public.lich_su_sua('san_pham', %L::uuid)$$,
    (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
  ),
  '42501',
  null,
  'thủ kho không đọc được lịch sử sửa'
);
select pg_temp.dang_xuat();

-- ─── 11. Quản lý đọc được lịch sử kèm tên người sửa ────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select ok(
  (select count(*) from public.lich_su_sua(
    'san_pham', (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
  )) >= 4
  and (select ho_ten_nguoi_sua from public.lich_su_sua(
    'san_pham', (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
  ) where truong = 'ten_hang' limit 1) is not null,
  'quản lý đọc được lịch sử kèm tên người sửa (ho_ten_nguoi_sua không null)'
);
select pg_temp.dang_xuat();

-- ─── 12. gia_von / lan_phat_sinh_cuoi / updated_at không bao giờ vào nhật ký ──
update public.san_pham set gia_von = 5, lan_phat_sinh_cuoi = now()
  where ma_hang = 'NKS-ZQX-001';
select is(
  (select count(*) from public.nhat_ky_sua
    where ban_ghi_id = (select id from public.san_pham where ma_hang = 'NKS-ZQX-001')
      and truong in ('gia_von', 'lan_phat_sinh_cuoi', 'updated_at')),
  0::bigint,
  'gia_von/lan_phat_sinh_cuoi/updated_at không bao giờ vào nhật ký'
);

select * from finish();
rollback;
