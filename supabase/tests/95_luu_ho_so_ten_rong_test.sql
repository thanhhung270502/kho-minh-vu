-- =============================================================================
-- 0072 — luu_nguoi_dung với tài khoản chưa có tên đăng nhập.
--
-- Lỗi gốc (checklist 28/09, bước 9.6): Server Action gửi "" cho tài khoản có
-- ten_dang_nhap NULL → vi phạm ck_ten_dang_nhap, không sửa được kho/vai trò.
-- Dùng tài khoản mẫu thukho2 (seed:users không đặt tên đăng nhập); mọi thay
-- đổi nằm trong transaction và bị rollback ở cuối.
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

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

-- Fixture chạy bằng postgres: ép thukho2 về trạng thái "chưa có tên đăng nhập".
create temp table t_ns on commit drop as
select (select id from auth.users where email = 'thukho2@khominhvu.local') as nd,
       (select id from public.kho where ma = 'K1') as k1;
grant select on t_ns to authenticated;
update public.nguoi_dung set ten_dang_nhap = null where id = (select nd from t_ns);

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');

select lives_ok(
  $$ select public.luu_nguoi_dung(
       (select nd from t_ns), 'Thủ kho K1 + K2', '', (select id from public.chuc_vu where ma = 'THU_KHO'),
       array[(select k1 from t_ns)], false) $$,
  'Chuỗi rỗng cho tên đăng nhập không còn vi phạm ck_ten_dang_nhap'
);

select pg_temp.dang_xuat();
select is(
  (select ten_dang_nhap from public.nguoi_dung where id = (select nd from t_ns)),
  null,
  'Tên đăng nhập rỗng được ghi là NULL (chưa đặt), không phải chuỗi rỗng'
);
select is(
  (select array_agg(kho_id) from public.nguoi_dung_kho where nguoi_dung_id = (select nd from t_ns)),
  array[(select k1 from t_ns)],
  'Bỏ Kho 2 lưu được — chỉ còn Kho 1'
);

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select lives_ok(
  $$ select public.luu_nguoi_dung(
       (select nd from t_ns), 'Thủ kho K1 + K2', '   ', (select id from public.chuc_vu where ma = 'THU_KHO'),
       array[(select k1 from t_ns)], false) $$,
  'Toàn khoảng trắng cũng coi là chưa đặt'
);
select lives_ok(
  $$ select public.luu_nguoi_dung(
       (select nd from t_ns), 'Thủ kho K1 + K2', 'thukho2', (select id from public.chuc_vu where ma = 'THU_KHO'),
       array[(select k1 from t_ns)], false) $$,
  'Tên đăng nhập hợp lệ vẫn lưu như cũ'
);
select throws_ok(
  $$ select public.luu_nguoi_dung(
       (select nd from t_ns), 'Thủ kho K1 + K2', '', (select id from public.chuc_vu where ma = 'THU_KHO'), array[]::uuid[], false) $$,
  '23514',
  'Nhân viên giới hạn kho phải được gán ít nhất một kho',
  'Ràng buộc nghiệp vụ của RPC giữ nguyên câu tiếng Việt'
);

select pg_temp.dang_xuat();
select is(
  (select ten_dang_nhap from public.nguoi_dung where id = (select nd from t_ns)),
  'thukho2',
  'Tên hợp lệ ghi đúng giá trị'
);

select * from finish();
rollback;
