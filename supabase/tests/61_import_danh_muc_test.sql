-- =============================================================================
-- DMUC-06 — Import danh mục: kiểm tra trước, nạp all-or-nothing (D-24..D-26)
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


create temp table t_im as select pg_temp.sp_test('IM-ZQX-001') as sp1;
grant select on t_im to authenticated;

update public.san_pham
   set ghi_chu = 'giữ',
       cong_doan_id = (select id from public.cong_doan where ma = 'CARBON')
 where ma_hang = 'IM-ZQX-001';

create temp table t_payload (ten text primary key, du_lieu jsonb);
grant select on t_payload to authenticated;
insert into t_payload values
 ('sach', '[{"dong":2,"ma_hang":"IM-ZQX-002","ten_hang":"Mới","dvt":"cái","cong_doan":"carbon"},
            {"dong":3,"ma_hang":"IM-ZQX-001","ten_hang":"Tên sửa"}]'::jsonb),
 ('loi',  '[{"dong":2,"ma_hang":"IM-ZQX-003","ten_hang":"A","dvt":"Thùng","cong_doan":"carbon"},
            {"dong":3,"ma_hang":"IM-ZQX-004"},
            {"dong":4,"ma_hang":"IM-ZQX-001","quy_doi":0}]'::jsonb),
 ('trung','[{"dong":2,"ma_hang":"IM-ZQX-005","ten_hang":"A","dvt":"cái","cong_doan":"carbon"},
            {"dong":3,"ma_hang":"IM-ZQX-005","ten_hang":"B","dvt":"cái","cong_doan":"carbon"}]'::jsonb),
 ('gia',  '[{"dong":2,"ma_hang":"IM-ZQX-001","gia_ban":50000}]'::jsonb),
 ('kv',   '[{"dong":2,"ma_hang":"IM-ZQX-001","cong_doan":null,"cong_doan_khi_tao_moi":"MUA_NGOAI"},
            {"dong":3,"ma_hang":"IM-ZQX-006","ten_hang":"KV mới","dvt":"CAI","cong_doan":null,"cong_doan_khi_tao_moi":"MUA_NGOAI"}]'::jsonb);

-- --- Văn phòng: chế độ kiểm tra không ghi gì --------------------------------
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select is(
  (select (public.nhap_danh_muc((select du_lieu from t_payload where ten='sach'), true)->>'them')),
  '1',
  'chế độ kiểm tra đếm đúng số mã sẽ thêm'
);

select is(
  (select count(*) from public.san_pham where ma_hang = 'IM-ZQX-002'),
  0::bigint,
  'chế độ kiểm tra không ghi gì vào database'
);

select is(
  (select jsonb_array_length(public.nhap_danh_muc((select du_lieu from t_payload where ten='loi'), false)->'loi')),
  3,
  'ba dòng lỗi được gom đủ, không dừng ở lỗi đầu'
);

select ok(
  (select public.nhap_danh_muc((select du_lieu from t_payload where ten='loi'), false)->'loi'
          @> '[{"dong":2,"cot":"dvt"}]'::jsonb),
  'lỗi chỉ đúng dòng và cột trong file'
);

select is(
  (select ten_hang from public.san_pham where ma_hang = 'IM-ZQX-001'),
  'Hàng test IM-ZQX-001',
  'có lỗi thì không nạp dòng nào — không nạp nửa vời'
);

select is(
  (select count(*) from jsonb_array_elements(
     public.nhap_danh_muc((select du_lieu from t_payload where ten='trung'), true)->'loi') e
   where e->>'cot' = 'ma_hang'),
  2::bigint,
  'mã hàng lặp trong cùng file báo lỗi cả hai dòng'
);

select is(
  (select public.nhap_danh_muc((select du_lieu from t_payload where ten='sach'), false)->>'da_nap'),
  'true',
  'file sạch thì nạp'
);

select is(
  (select cd.ma from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
    where sp.ma_hang = 'IM-ZQX-002'),
  'CARBON',
  'mã mới nhận công đoạn khớp theo tên không dấu, không phân biệt hoa thường'
);

select is(
  (select ghi_chu from public.san_pham where ma_hang = 'IM-ZQX-001'),
  'giữ',
  'ô trống trong file giữ nguyên giá trị cũ'
);

select is(
  (select public.nhap_danh_muc((select du_lieu from t_payload where ten='gia'), false)->>'da_nap'),
  'false',
  'văn phòng đặt giá bán bị chặn thành lỗi dòng, không ném exception giữa chừng'
);

-- --- File KiotViet không ghi đè công đoạn đã rà ------------------------------
select is(
  (select public.nhap_danh_muc((select du_lieu from t_payload where ten='kv'), false)->>'da_nap'),
  'true',
  'file KiotViet nạp được'
);

select is(
  (select cd.ma from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
    where sp.ma_hang = 'IM-ZQX-001'),
  'CARBON',
  'file KiotViet KHÔNG ghi đè công đoạn đã rà của mã có sẵn'
);

select is(
  (select cd.ma from public.san_pham sp join public.cong_doan cd on cd.id = sp.cong_doan_id
    where sp.ma_hang = 'IM-ZQX-006'),
  'MUA_NGOAI',
  'mã mới từ file KiotViet nhận công đoạn mặc định'
);

-- --- Thủ kho ----------------------------------------------------------------
select pg_temp.dang_xuat();
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select throws_ok(
  $$select public.nhap_danh_muc('[]'::jsonb, true)$$,
  '42501', null,
  'thủ kho không import được'
);

select * from finish();
rollback;
