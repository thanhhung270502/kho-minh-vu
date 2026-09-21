-- =============================================================================
-- D-05/TON-01 — nap_ton_tam: xem trước không ghi, bỏ qua mã đã có chứng từ
-- thật, một chứng từ hai dòng hai kho (vá _ghi_so_dieu_chinh 2026-09-21),
-- idempotent, chặn vai trò.
-- =============================================================================
begin;
select plan(21);

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

-- ─── Dữ liệu: ba mã, dưới quyền postgres (bypass RLS) ───────────────────────
-- NT-ZQX-A: có kho_mac_dinh_id (K1), chưa có biến động nào — đủ điều kiện nạp.
-- NT-ZQX-B: có kho_mac_dinh_id (K1), ĐÃ có một chứng từ NHAP thật đã ghi sổ —
--   phải bị BỎ QUA dù so_luong khác 0.
-- NT-ZQX-C: KHÔNG có kho_mac_dinh_id — báo lỗi khi chưa chọn p_kho_mac_dinh,
--   chuyển sang nhóm dat khi có p_kho_mac_dinh (assertion 6).
create temp table t_id as
select pg_temp.sp_test('NT-ZQX-A') as a,
       pg_temp.sp_test('NT-ZQX-B') as b,
       pg_temp.sp_test('NT-ZQX-C') as c,
       pg_temp.kho_id('K1')        as k1,
       pg_temp.kho_id('K2')        as k2;
grant select on t_id to authenticated;

update public.san_pham sp set kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.a;
update public.san_pham sp set kho_mac_dinh_id = t_id.k1 from t_id where sp.id = t_id.b;

-- NT-ZQX-B: một chứng từ NHAP thật, đã ghi sổ qua đúng đường ghi sổ chuẩn —
-- không insert thẳng kho_movement.
insert into public.chung_tu (so_ct, loai_ct, kho_id)
select 'PN-TEST-NTZQXB', 'NHAP', t_id.k1 from t_id;
insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia)
select ct.id, t_id.b, 999, 1000
from public.chung_tu ct, t_id
where ct.so_ct = 'PN-TEST-NTZQXB';
select public.ghi_so_chung_tu((select id from public.chung_tu where so_ct = 'PN-TEST-NTZQXB'));

create temp table t_baseline as
select count(*)::int as so_dc from public.chung_tu where loai_ct = 'DIEU_CHINH';
grant select on t_baseline to authenticated;

-- ─── 1–4: xem trước (quan_ly, không truyền p_kho_mac_dinh) ─────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (public.nap_ton_tam(
    p_du_lieu := jsonb_build_array(
      jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
      jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
      jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
    ),
    p_kho_mac_dinh := null,
    p_chi_kiem_tra := true
  ) ->> 'da_nap')::boolean,
  false,
  'xem trước: da_nap = false, không ghi gì'
);

select is(
  (public.nap_ton_tam(
    p_du_lieu := jsonb_build_array(
      jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
      jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
      jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
    ),
    p_kho_mac_dinh := null,
    p_chi_kiem_tra := true
  ) ->> 'dat')::int,
  1,
  'xem trước: chỉ NT-ZQX-A đủ điều kiện nạp (B đã có chứng từ thật, C thiếu kho)'
);

select ok(
  (
    (public.nap_ton_tam(
      p_du_lieu := jsonb_build_array(
        jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
        jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
        jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
      ),
      p_kho_mac_dinh := null,
      p_chi_kiem_tra := true
    ) ->> 'bo_qua')::int
  ) >= 1,
  'xem trước: NT-ZQX-B bị bỏ qua vì đã có chứng từ thật, không nạp đè'
);

select ok(
  (
    (public.nap_ton_tam(
      p_du_lieu := jsonb_build_array(
        jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
        jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
        jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
      ),
      p_kho_mac_dinh := null,
      p_chi_kiem_tra := true
    ) ->> 'so_loi')::int
  ) >= 1,
  'xem trước: NT-ZQX-C báo lỗi vì thiếu kho mặc định và chưa chọn p_kho_mac_dinh'
);

select pg_temp.dang_xuat();

select is(
  (select count(*)::int from public.chung_tu where loai_ct = 'DIEU_CHINH')
    - (select so_dc from t_baseline),
  0,
  'xem trước KHÔNG sinh thêm chứng từ DIEU_CHINH nào'
);

-- ─── 5: xem trước có p_kho_mac_dinh — NT-ZQX-C chuyển từ loi sang dat ───────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select is(
  (public.nap_ton_tam(
    p_du_lieu := jsonb_build_array(
      jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
      jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
      jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
    ),
    p_kho_mac_dinh := (select k2 from t_id),
    p_chi_kiem_tra := true
  ) ->> 'dat')::int,
  2,
  'truyền p_kho_mac_dinh := K2 thì NT-ZQX-C chuyển từ nhóm loi sang nhóm dat'
);

-- ─── 6–13: ghi thật — một chứng từ, hai dòng, hai kho khác nhau ────────────
-- NT-ZQX-A đi kho_mac_dinh_id của chính nó (K1, ưu tiên hơn p_kho_mac_dinh).
-- NT-ZQX-C không có kho_mac_dinh_id nên đi p_kho_mac_dinh (K2). Đây chính là
-- bất biến mà việc vá _ghi_so_dieu_chinh (đầu file 0061) phải giữ đúng.
create temp table t_ghi as
select public.nap_ton_tam(
  p_du_lieu := jsonb_build_array(
    jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
    jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
    jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
  ),
  p_kho_mac_dinh := (select k2 from t_id),
  p_chi_kiem_tra := false
) as kq;

select is((select kq ->> 'da_nap' from t_ghi)::boolean, true, 'ghi thật: da_nap = true');
select ok((select kq ->> 'chung_tu_id' from t_ghi) is not null, 'ghi thật: trả về chung_tu_id');
-- Không assert so_ct cụ thể — chuoi_so_ct là bộ đếm sống (Bẫy 16 CLAUDE.md).
select ok((select kq ->> 'so_ct' from t_ghi) is not null, 'ghi thật: trả về so_ct, không assert số hiệu cụ thể');

select is(
  (select trang_thai::text from public.chung_tu
    where id = (select (kq ->> 'chung_tu_id')::uuid from t_ghi)),
  'HOAN_THANH',
  'chứng từ tự ghi sổ, không để ở NHAP_LIEU'
);

select ok(
  starts_with(
    (select ghi_chu from public.chung_tu where id = (select (kq ->> 'chung_tu_id')::uuid from t_ghi)),
    '[NAP_TON_TAM]'
  ),
  'ghi_chu bắt đầu bằng tiền tố cố định [NAP_TON_TAM]'
);

select is(
  (select km.kho_id from public.kho_movement km, t_id
    where km.san_pham_id = t_id.a
      and km.chung_tu_id = (select (kq ->> 'chung_tu_id')::uuid from t_ghi)),
  (select k1 from t_id),
  'dòng NT-ZQX-A ghi đúng kho mặc định của chính nó (K1)'
);

select is(
  (select km.kho_id from public.kho_movement km, t_id
    where km.san_pham_id = t_id.c
      and km.chung_tu_id = (select (kq ->> 'chung_tu_id')::uuid from t_ghi)),
  (select k2 from t_id),
  'dòng NT-ZQX-C ghi đúng kho được chọn khi nạp (K2) — không rơi về kho đầu phiếu'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k1 and tk.san_pham_id = t_id.a),
  15::numeric(18,4),
  'ton_kho của NT-ZQX-A tại K1 tăng đúng số đã nạp — đi qua trigger, không ghi tay'
);

select is(
  (select tk.so_luong from public.ton_kho tk, t_id where tk.kho_id = t_id.k2 and tk.san_pham_id = t_id.c),
  8::numeric(18,4),
  'ton_kho của NT-ZQX-C tại K2 tăng đúng số đã nạp'
);

-- ─── 14–15: idempotent — gọi thật lần hai không sinh thêm chứng từ ─────────
select is(
  (public.nap_ton_tam(
    p_du_lieu := jsonb_build_array(
      jsonb_build_object('ma_hang', 'NT-ZQX-A', 'so_luong', 15),
      jsonb_build_object('ma_hang', 'NT-ZQX-B', 'so_luong', 20),
      jsonb_build_object('ma_hang', 'NT-ZQX-C', 'so_luong', 8)
    ),
    p_kho_mac_dinh := (select k2 from t_id),
    p_chi_kiem_tra := false
  ) ->> 'da_nap')::boolean,
  false,
  'gọi thật lần hai với cùng dữ liệu: mọi mã đã có chứng từ thật, da_nap = false'
);

select is(
  (select count(*)::int from public.chung_tu where loai_ct = 'DIEU_CHINH')
    - (select so_dc from t_baseline),
  1,
  'gọi thật lần hai KHÔNG sinh thêm chứng từ DIEU_CHINH — vẫn đúng một chứng từ'
);

-- ─── 16–19: chặn vai trò ────────────────────────────────────────────────────
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$ select public.nap_ton_tam(p_du_lieu := '[]'::jsonb, p_chi_kiem_tra := true) $$,
  '42501', null,
  'văn phòng không xem trước được'
);
select throws_ok(
  $$ select public.nap_ton_tam(p_du_lieu := '[]'::jsonb, p_chi_kiem_tra := false) $$,
  '42501', null,
  'văn phòng không nạp được tồn tạm'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$ select public.nap_ton_tam(p_du_lieu := '[]'::jsonb, p_chi_kiem_tra := true) $$,
  '42501', null,
  'thủ kho không xem trước được'
);
select throws_ok(
  $$ select public.nap_ton_tam(p_du_lieu := '[]'::jsonb, p_chi_kiem_tra := false) $$,
  '42501', null,
  'thủ kho không nạp được tồn tạm'
);

select * from finish();
rollback;
