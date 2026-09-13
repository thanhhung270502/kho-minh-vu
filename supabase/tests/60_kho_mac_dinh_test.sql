-- =============================================================================
-- Gap UAT Phase 1, bài 3 — kho mặc định của sản phẩm
--
-- Cột "Vị trí" của KiotViet chứa TÊN KHO (Kho 1 / Kho 2), không phải vị trí kệ.
-- Import ban đầu nạp nó vào san_pham.vi_tri_ke. Migration 0025 chuyển sang cột
-- kho_mac_dinh_id và dọn vi_tri_ke.
-- =============================================================================
begin;
select plan(10);

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

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

-- ─── Cấu trúc ──────────────────────────────────────────────────────────
select has_column('public', 'san_pham', 'kho_mac_dinh_id',
  'san_pham có cột kho_mac_dinh_id');

select fk_ok('public', 'san_pham', 'kho_mac_dinh_id', 'public', 'kho', 'id',
  'kho_mac_dinh_id là khóa ngoại tới kho(id)');

-- ─── Bất biến: không còn tên kho nào nằm trong cột vị trí kệ ───────────
-- Đây chính là lỗi UAT. Assertion này đỏ nếu ai đó nạp lại "Vị trí" vào vi_tri_ke.
select is(
  (select count(*) from public.san_pham sp
    where sp.vi_tri_ke in (select ten from public.kho)),
  0::bigint,
  'không sản phẩm nào còn tên kho trong cột vi_tri_ke'
);

-- ─── RPC nạp danh mục đổi tên kho thành khóa ngoại ─────────────────────
select lives_ok(
  $$ select public.nap_danh_muc_kiotviet(jsonb_build_object('san_pham', jsonb_build_array(
       jsonb_build_object('ma_hang','KMD-TEST-1','ten_hang','Hàng test kho 2',
                          'ma_dvt','CAI','ma_cong_doan','MUA_NGOAI','ten_kho_mac_dinh','Kho 2'),
       jsonb_build_object('ma_hang','KMD-TEST-2','ten_hang','Hàng test kho lạ',
                          'ma_dvt','CAI','ma_cong_doan','MUA_NGOAI','ten_kho_mac_dinh','Kho không có')
     ))) $$,
  'RPC nạp nhận trường ten_kho_mac_dinh'
);

select is(
  (select kho_mac_dinh_id from public.san_pham where ma_hang = 'KMD-TEST-1'),
  pg_temp.kho_id('K2'),
  'tên kho "Kho 2" được đổi thành id của kho K2'
);

select is(
  (select kho_mac_dinh_id from public.san_pham where ma_hang = 'KMD-TEST-2'),
  null::uuid,
  'tên kho không tồn tại cho kho_mac_dinh_id NULL, không làm hỏng cả lô nạp'
);

select is(
  (select vi_tri_ke from public.san_pham where ma_hang = 'KMD-TEST-1'),
  null::text,
  'RPC không còn ghi tên kho vào vi_tri_ke'
);

-- ─── Phân quyền: kho mặc định là dữ liệu danh mục ──────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select lives_ok(
  format('update public.san_pham set kho_mac_dinh_id = %L where ma_hang = %L',
         pg_temp.kho_id('K1'), 'KMD-TEST-1'),
  'văn phòng sửa được kho mặc định'
);
select pg_temp.dang_xuat();

-- RLS lọc dòng chứ không ném lỗi: update của chỉ xem chạy được nhưng chạm 0 dòng.
-- Điều cần chứng minh là GIÁ TRỊ không đổi, không phải "có lỗi hay không".
select pg_temp.dang_nhap_nhu('chixem@khominhvu.local');
select lives_ok(
  format('update public.san_pham set kho_mac_dinh_id = %L where ma_hang = %L',
         pg_temp.kho_id('K2'), 'KMD-TEST-1'),
  'lệnh update của chỉ xem chạy không lỗi (RLS lọc hết dòng)'
);
select pg_temp.dang_xuat();

select is(
  (select kho_mac_dinh_id from public.san_pham where ma_hang = 'KMD-TEST-1'),
  pg_temp.kho_id('K1'),
  'chỉ xem không đổi được kho mặc định — vẫn là K1 văn phòng vừa đặt'
);

select * from finish();
rollback;
