-- =============================================================================
-- CDAT-02, CDAT-03 — Danh mục phụ: xóa được thật, mã hệ thống khóa cứng
--
-- 0015 chỉ có policy INSERT/UPDATE cho nhom_hang/don_vi_tinh/cong_doan nên
-- `delete` trước 0040 âm thầm xóa 0 dòng. Và mã công đoạn/ĐVT được code dùng
-- như hằng số (cong_doan_theo_duoi, la_can_ra, cong_doan_khi_tao_moi) — đổi mã
-- là hỏng rà dữ liệu, im lặng.
-- =============================================================================
begin;
select plan(6);


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

-- ─── 1–2: xóa ĐVT thường được, ĐVT hệ thống không ───────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

insert into public.don_vi_tinh (ma, ten) values ('ZQX', 'Zqx test');
delete from public.don_vi_tinh where ma = 'ZQX';

select is(
  (select count(*) from public.don_vi_tinh where ma = 'ZQX'),
  0::bigint,
  'văn phòng xóa được ĐVT chưa dùng'
);

select throws_ok(
  $$delete from public.don_vi_tinh where ma = 'CAI'$$,
  '23514', null,
  'không xóa được ĐVT hệ thống'
);

-- ─── 3–4: mã công đoạn hệ thống khóa, tên vẫn sửa được ──────────────────────
select throws_ok(
  $$update public.cong_doan set ma = 'MUA' where ma = 'MUA_NGOAI'$$,
  '23514', null,
  'không đổi mã công đoạn hệ thống'
);

select lives_ok(
  $$update public.cong_doan set ten = 'Mua ngoài (hàng hãng)' where ma = 'MUA_NGOAI'$$,
  'đổi TÊN công đoạn hệ thống vẫn được'
);

-- ─── 5–6: nhóm hàng đang dùng, và thủ kho không xóa được ────────────────────
select pg_temp.dang_xuat();

insert into public.nhom_hang (ma, ten) values ('NH-ZQX', 'Nhóm test ZQX');

-- Tạo mã hàng ở CÂU LỆNH RIÊNG: gọi sp_test() trong WHERE của UPDATE thì dòng
-- vừa chèn nằm ngoài snapshot của chính câu lệnh đó → update 0 dòng, im lặng.
create temp table t_dmp as select pg_temp.sp_test('DMP-ZQX-1') as sp;

update public.san_pham
   set nhom_hang_id = (select id from public.nhom_hang where ma = 'NH-ZQX')
 where id = (select sp from t_dmp);

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  $$delete from public.nhom_hang where ma = 'NH-ZQX'$$,
  '23503', null,
  'xóa nhóm đang có mã hàng dùng bị khóa ngoại chặn'
);

select pg_temp.dang_xuat();

-- Nhóm TRỐNG: nếu thủ kho xóa được thì không thể đổ cho khóa ngoại.
insert into public.nhom_hang (ma, ten) values ('NH-ZQX2', 'Nhóm test ZQX 2');

select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

delete from public.nhom_hang where ma = 'NH-ZQX2';

select is(
  (select count(*) from public.nhom_hang where ma = 'NH-ZQX2'),
  1::bigint,
  'thủ kho không xóa được nhóm hàng trống (policy lọc sạch, 0 dòng)'
);

select * from finish();
rollback;
