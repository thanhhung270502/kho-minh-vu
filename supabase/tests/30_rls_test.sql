-- =============================================================================
-- AUTH-03 · AUTH-04 · AUTH-05 · AUTH-06
-- Phân quyền bốn vai trò, kiểm bằng JWT của tài khoản mẫu thật.
--
-- PHỤ THUỘC: `npm run seed:users` đã chạy. Không có 4 tài khoản thì file này
-- báo lỗi rõ ràng ngay ở assertion đầu chứ không âm thầm xanh.
-- =============================================================================
begin;
select plan(17);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  perform set_config('request.jwt.claims', json_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', coalesce(v_nd.kho_id::text, '')
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

-- Chạy EXPLAIN và trả toàn bộ kế hoạch dưới dạng một chuỗi, để assert được.
create or replace function pg_temp.ke_hoach(p_sql text)
returns text language plpgsql as $helper$
declare r text; ket_qua text := '';
begin
  for r in execute 'explain (format text) ' || p_sql loop
    ket_qua := ket_qua || r || E'\n';
  end loop;
  return ket_qua;
end $helper$;


create temp table t_id as
select pg_temp.sp_test('RLS-001') as sp,
       pg_temp.kho_id('K1')       as k1,
       pg_temp.kho_id('K2')       as k2;

-- Bảng tạm thuộc sở hữu postgres. Không GRANT thì mọi truy vấn đọc nó dưới
-- role authenticated sẽ ném 42501 — TRÙNG mã lỗi với "RLS từ chối", nên
-- assertion throws_ok('42501') có thể xanh vì lý do SAI. Đây là false pass
-- thật sự đã xảy ra ở 30_rls_test.sql lần chạy trước.
grant select on t_id to authenticated;

-- Dựng tồn ở CẢ HAI kho, dưới quyền postgres.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k1, sp, 10, 100 from t_id;
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select k2, sp, 20, 100 from t_id;

-- ─── AUTH-04: thủ kho chỉ thấy kho mình ──────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');

select isnt_empty(
  'select 1 from public.ton_kho tk where tk.kho_id = (select public.kho_hien_tai())',
  'thủ kho đọc được tồn kho của mình'
);
select is_empty(
  'select 1 from public.ton_kho tk where tk.kho_id <> (select public.kho_hien_tai())',
  'thủ kho KHÔNG đọc được tồn của kho khác'
);
select is_empty(
  'select 1 from public.kho_movement mv where mv.kho_id <> (select public.kho_hien_tai())',
  'thủ kho KHÔNG đọc được sổ cái của kho khác'
);
select isnt_empty(
  'select 1 from public.san_pham limit 1',
  'thủ kho vẫn tra được danh mục hàng hóa — cần để nhập phiếu'
);
select pg_temp.dang_xuat();

-- ─── AUTH-05: văn phòng không sửa giá ────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');

select throws_ok(
  'update public.san_pham set gia_von = 999 where ma_hang = ''RLS-001''',
  '42501', null,
  'văn phòng KHÔNG sửa được gia_von — chặn ở tầng quyền theo cột'
);
select throws_ok(
  'update public.san_pham set gia_ban = 999 where ma_hang = ''RLS-001''',
  '42501', null,
  'văn phòng KHÔNG sửa được gia_ban — chặn bởi trigger phân vai'
);
select lives_ok(
  'update public.san_pham set ten_hang = ''Tên mới'' where ma_hang = ''RLS-001''',
  'văn phòng vẫn sửa được các cột danh mục khác'
);

-- Đường INSERT phải khóa y như đường UPDATE, nếu không thì xóa rồi tạo lại là
-- lách được toàn bộ AUTH-05.
select throws_ok(
  'insert into public.san_pham (ma_hang, ten_hang, gia_von) values (''RLS-X1'', ''X'', 500)',
  '42501', null,
  'văn phòng KHÔNG đặt được gia_von lúc TẠO MÃ MỚI'
);
select throws_ok(
  'insert into public.san_pham (ma_hang, ten_hang, gia_ban) values (''RLS-X2'', ''X'', 500)',
  '42501', null,
  'văn phòng KHÔNG đặt được gia_ban lúc tạo mã mới'
);
select lives_ok(
  'insert into public.san_pham (ma_hang, ten_hang) values (''RLS-X3'', ''X'')',
  'văn phòng tạo được mã mới khi không kèm giá — luồng làm việc bình thường'
);
select pg_temp.dang_xuat();

-- ─── quản lý sửa được giá bán ────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select lives_ok(
  'update public.san_pham set gia_ban = 555 where ma_hang = ''RLS-001''',
  'quản lý sửa được giá bán'
);
select throws_ok(
  'update public.san_pham set gia_von = 555 where ma_hang = ''RLS-001''',
  '42501', null,
  'KỂ CẢ quản lý cũng không ghi được gia_von — chỉ trigger giá vốn ghi cột đó'
);
select pg_temp.dang_xuat();

-- ─── AUTH-06: chỉ xem không tạo được gì ──────────────────────────────────
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');

select isnt_empty(
  'select 1 from public.ton_kho limit 1',
  'chỉ xem vẫn đọc được tồn kho'
);
select throws_ok(
  'insert into public.chung_tu (so_ct, loai_ct, kho_id) select ''X-1'', ''NHAP'', k1 from t_id',
  '42501', null,
  'chỉ xem KHÔNG tạo được chứng từ'
);
select pg_temp.dang_xuat();

-- ─── AUTH-03: policy đọc claim, KHÔNG truy vấn bảng theo dòng ────────────
-- Nếu EXPLAIN chứa nguoi_dung nghĩa là policy đang join bảng mỗi dòng thay vì
-- đọc JWT claim — đúng thứ quyết định D-15 muốn tránh.
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select doesnt_match(
  pg_temp.ke_hoach('select * from public.ton_kho'),
  'nguoi_dung',
  'policy ton_kho không truy vấn bảng nguoi_dung — đọc vai trò từ JWT claim'
);
select matches(
  pg_temp.ke_hoach('select * from public.ton_kho'),
  'InitPlan|ton_kho',
  'kế hoạch truy vấn ton_kho đọc được (EXPLAIN chạy dưới vai trò thủ kho)'
);
select pg_temp.dang_xuat();

-- ─── Không sót bảng nào chưa bật RLS ─────────────────────────────────────
select is(
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity = false),
  0::bigint,
  'mọi bảng trong schema public đều đã bật RLS'
);

select * from finish();
rollback;
