-- =============================================================================
-- DMUC-04 — Rà hàng loạt: gán nhiều mã, gợi ý công đoạn theo đuôi mã (D-18)
-- =============================================================================
begin;
select plan(8);

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


create temp table t_hl as
select pg_temp.sp_test('HL-ZQX-1-CB')  as cb,
       pg_temp.sp_test('HL-ZQX-2-X')   as x,
       pg_temp.sp_test('HL-ZQX-3-SĐM') as sdm,
       pg_temp.sp_test('HL-ZQX-4-N')   as n,
       pg_temp.sp_test('HL-ZQX-5')     as khong_duoi,
       pg_temp.sp_test('HL-ZQX-6-CB')  as da_co_cong_doan,
       (select id from public.nhom_hang order by ma limit 1) as nhom;
grant select on t_hl to authenticated;

-- HL-ZQX-6-CB có đuôi -CB nhưng KHÔNG còn là mua ngoài → không nằm trong gợi ý.
update public.san_pham set cong_doan_id = (select id from public.cong_doan where ma = 'SON')
 where ma_hang = 'HL-ZQX-6-CB';

select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(
  (select count(*) from public.goi_y_cong_doan_theo_duoi() where ma_hang like 'HL-ZQX-%'),
  4::bigint,
  'gợi ý đúng 4 mã mua ngoài có đuôi -CB/-X/-S…/-N'
);

select is(
  (select ma_cong_doan_de_xuat from public.goi_y_cong_doan_theo_duoi() where ma_hang = 'HL-ZQX-3-SĐM'),
  'SON',
  'đuôi -SĐM vẫn suy ra công đoạn Sơn'
);

select is(
  public.ap_dung_goi_y_cong_doan(array[(select cb from t_hl), (select khong_duoi from t_hl), (select da_co_cong_doan from t_hl)]),
  1,
  'chỉ đổi mã còn mua ngoài và có đuôi hợp lệ'
);

select is(
  (select cd.ma from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
    where sp.ma_hang = 'HL-ZQX-1-CB'),
  'CARBON',
  'áp dụng gợi ý gán đúng công đoạn theo đuôi mã'
);

select is(
  public.gan_hang_loat(array[(select x from t_hl), (select n from t_hl)],
                       jsonb_build_object('nhom_hang_id', (select nhom from t_hl)), 'hang_loat'),
  2,
  'gán hàng loạt cập nhật đúng số mã đã chọn'
);

select is(
  (select count(*) from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
    where sp.ma_hang in ('HL-ZQX-2-X','HL-ZQX-4-N') and cd.ma = 'MUA_NGOAI'),
  2::bigint,
  'gán nhóm hàng không đụng tới công đoạn'
);

select throws_ok(
  $$select public.gan_hang_loat(array[uuid_generate_v4()], '{"gia_von": 1}'::jsonb, 'hang_loat')$$,
  '23514', null,
  'không gán hàng loạt được trường ngoài danh sách cho phép'
);

select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select public.gan_hang_loat(array[uuid_generate_v4()], '{"dang_kinh_doanh": false}'::jsonb, 'hang_loat')$$,
  '42501', null,
  'thủ kho không gán hàng loạt được'
);

select * from finish();
rollback;
