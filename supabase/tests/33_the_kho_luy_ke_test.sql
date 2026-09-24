-- =============================================================================
-- TON-02 (D-03) — tồn lũy kế tại thời điểm trong the_kho_san_pham (migration 0059)
-- =============================================================================
begin;
select plan(9);

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


create temp table t_lk as
select pg_temp.sp_test('LK-ZQX-001') as sp,
       pg_temp.kho_id('K1')          as k1,
       pg_temp.kho_id('K2')          as k2;
grant select on t_lk to authenticated;

-- M1: K1, 2026-07-02 08:00, nhập +10 — dòng SỚM NHẤT.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at)
select k1, sp, 10, 1000,
       '2026-07-02 00:00:00+07'::timestamptz, '2026-07-02 08:00:00+07'::timestamptz
from t_lk;

-- M2: K1, CÙNG NGÀY 2026-07-02 với M1 (ngay giống hệt), xuất -4, created_at MUỘN HƠN
-- (15:00 > 08:00) — bắt buộc để kiểm thứ tự phá hòa dùng created_at, không phải id.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at)
select k1, sp, -4, 1000,
       '2026-07-02 00:00:00+07'::timestamptz, '2026-07-02 15:00:00+07'::timestamptz
from t_lk;

-- M3: K2, 2026-07-03 09:00, nhập +6 — dòng MỚI NHẤT toàn công ty.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at)
select k2, sp, 6, 1000,
       '2026-07-03 00:00:00+07'::timestamptz, '2026-07-03 09:00:00+07'::timestamptz
from t_lk;

-- Dòng KiotViet cũ, ngày sớm nhất trong lô (2026-07-01) — phải KHÔNG cộng vào lũy kế.
insert into public.luu_tru_hoa_don_kiotviet (ma_hoa_don, ngay, ma_hang, so_luong, ghi_chu)
values ('HD-LK-ZQX', '2026-07-01T09:00:00+07:00', 'LK-ZQX-001', 3, 'KV-CU');

-- --- Quản lý: thấy cả HE_THONG lẫn KiotViet cũ ------------------------------
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

-- Assertion 1 (phần a): M1 (nhập +10, sớm nhất) — lũy kế = chính nó = 10.
select is(
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk)) where so_luong_nhap = 10),
  10::numeric,
  'M1 (nhập +10 lúc 08:00) lũy kế = 10 — dòng sớm nhất trong ngày'
);

-- Assertion 1 (phần b): M2 (xuất -4, CÙNG NGÀY với M1 nhưng created_at muộn hơn)
-- — lũy kế = 10 - 4 = 6. Nếu thứ tự phá hòa sai (vd. dựa vào id ngẫu nhiên thay vì
-- created_at) thì có thể ra 10 + hiệu ứng khác hoặc âm.
select is(
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk)) where so_luong_xuat = 4),
  6::numeric,
  'M2 (xuất -4 lúc 15:00, cùng ngày với M1) lũy kế = 6 — xếp theo created_at vì ngay bằng nhau'
);

-- Assertion 2: dòng mới nhất (M3, không lọc kho) — lũy kế = tổng cả ba biến động hệ
-- thống = 10 - 4 + 6 = 12.
select is(
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk)) limit 1),
  12::numeric,
  'dòng mới nhất (M3, không lọc kho) lũy kế = tổng cả ba biến động HE_THONG = 12'
);

-- Assertion 3 — BẤT BIẾN với ton_kho: khi lọc p_kho_id := k1, lũy kế của dòng đầu
-- tiên trả về (M2, mới nhất trong phạm vi K1) phải bằng đúng so_luong hiện tại
-- trong ton_kho của (k1, sp).
select is(
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk), (select k1 from t_lk)) limit 1),
  (select so_luong from public.ton_kho where kho_id = (select k1 from t_lk) and san_pham_id = (select sp from t_lk)),
  'bất biến: lũy kế dòng đầu tiên khi lọc theo K1 khớp đúng ton_kho hiện tại của K1'
);

-- Assertion 4: D-11 (06-02) — the_kho_san_pham không còn dòng nguồn KIOTVIET nào.
select is(
  (select count(*) from public.the_kho_san_pham((select sp from t_lk)) where nguon like 'KIOTVIET%'),
  0::bigint,
  'D-11: thẻ kho không trộn lịch sử KiotViet — không còn dòng nguồn KIOTVIET nào'
);

-- Assertion 5 — LŨY KẾ KHÔNG BỊ PHÂN TRANG CẮT: gọi với p_kich_thuoc := 1,
-- p_trang := 2 (bỏ 1 dòng, lấy 1 dòng — đúng vị trí của M2 trong thứ tự desc toàn
-- tập: M3, M2, M1, KiotViet). So với lũy kế của CHÍNH dòng đó khi gọi một trang đủ lớn.
select is(
  (select ton_luy_ke from public.the_kho_san_pham(p_san_pham_id := (select sp from t_lk), p_trang := 2, p_kich_thuoc := 1)),
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk)) where so_luong_xuat = 4),
  'lũy kế không bị phân trang cắt — dòng đầu trang 2 (kích thước 1) khớp lũy kế tính trên toàn tập'
);

-- Assertion 6 (phần a): 14 cột cũ vẫn còn — dòng nhập M1 không lấn sang cột xuất.
select ok(
  (select so_luong_xuat is null from public.the_kho_san_pham((select sp from t_lk)) where so_luong_nhap = 10),
  'dòng nhập M1 vẫn có so_luong_xuat null — 14 cột cũ chưa bị đảo thứ tự'
);

-- Assertion 6 (phần b): dòng xuất M2 không lấn sang cột nhập.
select ok(
  (select so_luong_nhap is null from public.the_kho_san_pham((select sp from t_lk)) where so_luong_xuat = 4),
  'dòng xuất M2 vẫn có so_luong_nhap null — 14 cột cũ chưa bị đảo thứ tự'
);

-- --- Thủ kho K1: lũy kế chỉ cộng biến động K1, không dính K2 ----------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

-- Assertion 7: thủ kho K1 chỉ thấy biến động kho mình (không thấy dòng KiotViet
-- cũ, không thấy M3 của K2). Dòng mới nhất trong phạm vi của họ là M2, lũy kế = 6.
select is(
  (select ton_luy_ke from public.the_kho_san_pham((select sp from t_lk)) limit 1),
  6::numeric,
  'thủ kho K1: lũy kế dòng mới nhất chỉ cộng biến động K1 (10-4=6), không dính 6 đơn vị của K2'
);

select * from finish();
rollback;
