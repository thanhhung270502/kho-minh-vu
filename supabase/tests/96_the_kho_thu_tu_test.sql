-- =============================================================================
-- 0073 — thẻ kho xếp theo (ngày nghiệp vụ, giờ ghi sổ thật).
--
-- Lỗi gốc (checklist 28/09, bước 6.2): kho_movement.ngay của phiếu thường là
-- ngay_ct (00:00), của bút toán đảo là now(). Xếp theo `ngay` làm bút toán đảo
-- hủy phiếu hôm nay luôn rơi xuống sau mọi phiếu cùng ngày → tồn lũy kế giữa
-- chừng ra số chưa từng có, giờ hiện "07:00" giả.
--
-- Kịch bản dựng lại đúng thứ tự thật trong ngày 2091-03-10 (giờ VN):
--   09:00 PN1 +10 (lũy kế 10) · 09:05 PN2 +10 (20) · 09:10 hủy PN2 −10 (10)
--   09:20 PX1 −4 (6) · 09:30 PX2 −9 (−3) · 09:40 TK1 +3 (0)
-- Ngày 2091-03-09 có PN0 ghi lùi (ghi sổ lúc 2091-03-10 10:00) — vẫn phải đứng
-- trước mọi dòng ngày 10 vì ngày nghiệp vụ sớm hơn.
-- =============================================================================
begin;
select plan(7);

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

create temp table t_tt as
select (select id from public.kho where ma = 'K1') as k1,
       pg_temp.sp_test('TT-ZQX-001')               as sp;
grant select on t_tt to authenticated;

-- Phiếu thường: ngay = 00:00 UTC của ngày chứng từ (đúng như ghi_so_chung_tu ghi
-- ngay_ct), created_at = lúc ghi sổ. Bút toán đảo: ngay = created_at = now() lúc hủy.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, ngay, created_at, la_but_toan_dao)
select k1, sp, v.sl, 1000, v.ngay::timestamptz, v.tao::timestamptz, v.dao
from t_tt, (values
  ( 5, '2091-03-09 00:00:00+00', '2091-03-10 10:00:00+07', false),  -- PN0 ghi lùi ngày 09
  (10, '2091-03-10 00:00:00+00', '2091-03-10 09:00:00+07', false),  -- PN1
  (10, '2091-03-10 00:00:00+00', '2091-03-10 09:05:00+07', false),  -- PN2
  (-10,'2091-03-10 09:10:00+07', '2091-03-10 09:10:00+07', true),   -- hủy PN2
  (-4, '2091-03-10 00:00:00+00', '2091-03-10 09:20:00+07', false),  -- PX1
  (-9, '2091-03-10 00:00:00+00', '2091-03-10 09:30:00+07', false),  -- PX2
  ( 3, '2091-03-10 00:00:00+00', '2091-03-10 09:40:00+07', false)   -- TK1
) as v(sl, ngay, tao, dao);

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

create temp table t_the_kho as
select row_number() over () as stt, t.*
from public.the_kho_san_pham((select sp from t_tt)) t;

select is(
  (select array_agg(coalesce(so_luong_nhap, 0) - coalesce(so_luong_xuat, 0) order by stt desc) from t_the_kho),
  array[5, 10, 10, -10, -4, -9, 3]::numeric[],
  'Thứ tự cũ → mới: PN0 (ngày 09) rồi ngày 10 theo giờ ghi sổ, bút toán đảo đứng ngay sau PN2'
);
select is(
  (select array_agg(ton_luy_ke order by stt desc) from t_the_kho),
  array[5, 15, 25, 15, 11, 2, 5]::numeric[],
  'Tồn lũy kế đi đúng thời gian thực: mốc âm của PX2 không bị che'
);
select is(
  (select ton_luy_ke from t_the_kho where stt = 1),
  5::numeric,
  'Dòng mới nhất vẫn bằng tổng biến động'
);
select is(
  (select la_but_toan_dao from t_the_kho where stt = 4),
  true,
  'Bút toán đảo nằm giữa ngày, không bị đẩy xuống cuối'
);
select is(
  (select ngay from t_the_kho where so_luong_xuat = 4),
  '2091-03-10 09:20:00+07'::timestamptz,
  'Cột ngày = ngày chứng từ + giờ ghi sổ thật (không còn 07:00 giả)'
);
select is(
  (select ngay from t_the_kho where so_luong_nhap = 5),
  '2091-03-09 10:00:00+07'::timestamptz,
  'Phiếu ghi lùi giữ ngày chứng từ, lấy giờ ghi sổ'
);
select is(
  (select ngay from t_the_kho where la_but_toan_dao),
  '2091-03-10 09:10:00+07'::timestamptz,
  'Bút toán đảo giữ nguyên thời điểm thật'
);

select * from finish();
rollback;
