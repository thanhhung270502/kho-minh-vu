-- =============================================================================
-- 0140 — nhập Excel đơn đặt / hóa đơn: tên ở cột "Nhân viên nhận" không khớp nhân viên nào
-- thì vẫn nhận mặc định NB001 (chỉ cảnh báo), không báo "Cần Mã khách hàng hoặc tên Nhân viên nhận".
-- Tài khoản / mã / nhân viên / phiếu thử tiền tố zq140 / ZQ140-; mọi thứ rollback ở cuối.
-- =============================================================================
begin;
select plan(7);

create or replace function pg_temp.dang_nhap_id(p_id uuid)
returns void language plpgsql as $helper$
declare v_nd public.nguoi_dung; v_kho jsonb;
begin
  -- Đọc hồ sơ bằng postgres: nếu vẫn mang vai tài khoản trước, RLS nguoi_dung giấu dòng
  -- của tài khoản mới và claim vai_tro thành rỗng.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
  select * into v_nd from public.nguoi_dung where id = p_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = p_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', v_kho
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

-- Một phiếu nhập mới: một dòng hàng, cột "Nhân viên nhận" ghi p_nv (không có Mã khách hàng).
create or replace function pg_temp.phieu(p_so text, p_nv text)
returns jsonb language sql as $h$
  select jsonb_build_array(jsonb_build_object(
    'so', p_so, 'dong_dau', 2, 'ngay', '2026-10-15', 'ma_kho', 'K1',
    'nhan_vien', jsonb_build_array(p_nv),
    'dong', jsonb_build_array(jsonb_build_object(
      'dong', 2, 'ma_hang', 'ZQ140-SP', 'so_luong', 1, 'nhan_vien', p_nv))))
$h$;

-- ─── Dữ liệu nền (postgres) ─────────────────────────────────────────────────
create temp table t as select gen_random_uuid() as u, gen_random_uuid() as nv;
grant select on t to authenticated;

insert into auth.users (id, email, aud, role)
select u, 'zq140@test.local', 'authenticated', 'authenticated' from t;
insert into public.nguoi_dung (id, ho_ten, vai_tro, chuc_vu_id)
select u, 'ZQ140 Văn phòng', 'van_phong', (select id from public.chuc_vu where ma = 'NHAN_VIEN') from t;
insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select u, x.q from t, lateral (values ('tao_don'), ('xac_nhan_don')) x(q);

-- CI chạy trên DB rỗng: NB001 chỉ có sẵn trên DB thật.
insert into public.doi_tac (ma, ten, loai)
values ('NB001', 'Nội bộ', 'KHACH')
on conflict (ma) do update set dang_hoat_dong = true;

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
values ('ZQ140-SP', 'Hàng zq140', (select id from public.don_vi_tinh where ma = 'CAI'),
        (select id from public.cong_doan where ma = 'MUA_NGOAI'));

insert into public.nhan_vien_phu_trach (id, ten_viet_tat, ten_day_du)
select nv, 'ZQ140NV', 'ZQ140 Nhân viên thật' from t;

select pg_temp.dang_nhap_id((select u from t));

-- ─── 1. Kiểm tra: tên không khớp chỉ cảnh báo ───────────────────────────────
select is(
  public.nhap_chung_tu_excel('DON_DAT', 'moi', pg_temp.phieu('ZQ140-DD1', 'ZQ140LA'), true) -> 'loi',
  '[]'::jsonb, 'đơn đặt: tên nhân viên không khớp → không lỗi (nhận NB001)');
select ok(
  public.nhap_chung_tu_excel('DON_DAT', 'moi', pg_temp.phieu('ZQ140-DD1', 'ZQ140LA'), true) -> 'canh_bao'
    @> jsonb_build_array(jsonb_build_object('dong', 2, 'so', 'ZQ140-DD1',
         'loi', 'Không có nhân viên tên "ZQ140LA" — bỏ qua tên này')),
  'đơn đặt: tên không khớp vẫn ra cảnh báo');
select ok(
  not (public.nhap_chung_tu_excel('HOA_DON', 'moi', pg_temp.phieu('ZQ140-HD1', 'ZQ140LA'), true) -> 'loi'
    @> jsonb_build_array(jsonb_build_object('dong', 2, 'so', 'ZQ140-HD1',
         'loi', 'Cần Mã khách hàng hoặc tên Nhân viên nhận'))),
  'hóa đơn: tên nhân viên không khớp → không báo "Cần Mã khách hàng…"');

-- ─── 2. Ghi thật: tên không khớp → NB001; tên khớp → người nhận, không NB001 ──
select is(
  public.nhap_chung_tu_excel('DON_DAT', 'moi', pg_temp.phieu('ZQ140-DD1', 'ZQ140LA'), false) ->> 'committed',
  'true', 'đơn đặt tên không khớp: ghi được');
select is(
  (select dt.ma from public.don_dat_hang dh join public.doi_tac dt on dt.id = dh.doi_tac_id
   where dh.so_dh = 'ZQ140-DD1'),
  'NB001', 'đơn đặt tên không khớp: đối tác là NB001');

select public.nhap_chung_tu_excel('DON_DAT', 'moi', pg_temp.phieu('ZQ140-DD2', 'zq140nv'), false);
select is(
  (select doi_tac_id from public.don_dat_hang where so_dh = 'ZQ140-DD2'),
  null::uuid, 'đơn đặt tên khớp (không phân biệt hoa thường): không gắn NB001');
select is(
  (select array_agg(x.nguoi_nhan_id) from public.don_dat_hang_nguoi_nhan x
   join public.don_dat_hang dh on dh.id = x.don_dat_hang_id where dh.so_dh = 'ZQ140-DD2'),
  array[(select nv from t)], 'đơn đặt tên khớp: người nhận là nhân viên đó');

select * from finish();
rollback;
