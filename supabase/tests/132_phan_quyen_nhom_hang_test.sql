-- =============================================================================
-- 0132 — phân quyền theo nhóm hàng: người bị giới hạn chỉ thấy mã / tồn / sổ cái của
-- nhóm được giao; không có dòng = xem tất cả; Admin luôn tất cả; RPC đặt nhóm.
-- Tự tạo tài khoản thử (tiền tố zq132) trong transaction — không phụ thuộc seed:users,
-- chạy được cả trên DB là bản sao production. Đếm tồn/sổ cái so TƯƠNG ĐỐI (bẫy 16).
-- =============================================================================
begin;
select plan(28);

create or replace function pg_temp.dang_nhap_id(p_id uuid)
returns void language plpgsql as $helper$
declare v_nd public.nguoi_dung; v_kho jsonb;
begin
  select * into v_nd from public.nguoi_dung where id = p_id;
  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = p_id;
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', p_id::text, 'role', 'authenticated',
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

-- ─── Dữ liệu nền (postgres) ─────────────────────────────────────────────────
create temp table t as
select gen_random_uuid() as u_nv,   -- nhân viên sẽ bị giới hạn
       gen_random_uuid() as u_tu,   -- nhân viên không giới hạn, không có quyền phân quyền
       gen_random_uuid() as u_pq,   -- nhân viên có quyền phan_quyen
       (select u.id from auth.users u join public.nguoi_dung nd on nd.id = u.id
        where nd.vai_tro = 'quan_ly' and nd.dang_hoat_dong limit 1) as u_admin,
       gen_random_uuid() as nhom_a,
       gen_random_uuid() as nhom_b,
       -- nhóm thật có nhiều dòng tồn nhất để thử RLS ton_kho / kho_movement
       (select sp.nhom_hang_id from public.ton_kho tk join public.san_pham sp on sp.id = tk.san_pham_id
        where sp.nhom_hang_id is not null group by 1 order by count(*) desc limit 1) as nhom_g;
grant select on t to authenticated;

insert into auth.users (id, email, aud, role)
select x.id, x.email, 'authenticated', 'authenticated'
from t, lateral (values (t.u_nv, 'zq132-nv@test.local'), (t.u_tu, 'zq132-tu@test.local'),
                        (t.u_pq, 'zq132-pq@test.local')) x(id, email);
insert into public.nguoi_dung (id, ho_ten, vai_tro, chuc_vu_id)
select x.id, x.ten, 'van_phong', (select id from public.chuc_vu where ma = 'NHAN_VIEN')
from t, lateral (values (t.u_nv, 'ZQ132 Nhân viên'), (t.u_tu, 'ZQ132 Tự do'),
                        (t.u_pq, 'ZQ132 Phân quyền')) x(id, ten);
insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
select u_nv, 'tao_ma_hang' from t union all
select u_nv, 'xem_ton_kho' from t union all
select u_pq, 'phan_quyen' from t;

insert into public.nhom_hang (id, ma, ten)
select nhom_a, 'ZQ132-A', 'ZQ132 nhóm A' from t union all
select nhom_b, 'ZQ132-B', 'ZQ132 nhóm B' from t;

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id)
select x.ma, x.ten, (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI'), x.nhom
from t, lateral (values ('ZQ132-SPA', 'Hàng zq132 nhóm A', t.nhom_a),
                        ('ZQ132-SPB', 'Hàng zq132 nhóm B', t.nhom_b),
                        ('ZQ132-SP0', 'Hàng zq132 chưa có nhóm', null::uuid)) x(ma, ten, nhom);

create temp table t_dem as
select (select count(*) from public.san_pham) as tong_sp,
       (select id from public.san_pham where ma_hang = 'ZQ132-SPA') as sp_a,
       (select id from public.san_pham where ma_hang = 'ZQ132-SPB') as sp_b,
       (select count(*) from public.ton_kho tk join public.san_pham sp on sp.id = tk.san_pham_id
        where sp.nhom_hang_id = (select nhom_g from t)) as ton_g,
       (select count(*) from public.kho_movement mv join public.san_pham sp on sp.id = mv.san_pham_id
        where sp.nhom_hang_id = (select nhom_g from t)) as so_cai_g;
grant select on t_dem to authenticated;

-- ─── 1. Cấu trúc ────────────────────────────────────────────────────────────
select has_table('public', 'nguoi_dung_nhom_hang', 'có bảng nguoi_dung_nhom_hang');
select ok((select relrowsecurity from pg_class where oid = 'public.nguoi_dung_nhom_hang'::regclass),
  'nguoi_dung_nhom_hang đã bật RLS');

-- ─── 2. Không có dòng = xem tất cả ──────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_tu from t));
select is(public.nhom_hang_duoc_xem(), null::uuid[], 'không giới hạn: nhom_hang_duoc_xem() = null');
select is((select count(*) from public.san_pham), (select tong_sp from t_dem),
  'không giới hạn: thấy mọi mã hàng');

-- ─── 3. Giới hạn nhóm A ─────────────────────────────────────────────────────
select pg_temp.dang_xuat();
insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids)
select u_nv, array[nhom_a] from t;

select pg_temp.dang_nhap_id((select u_nv from t));
select is((select array_agg(ma_hang) from public.san_pham where ma_hang like 'ZQ132-%'),
  array['ZQ132-SPA'], 'giới hạn A: chỉ thấy mã nhóm A, không thấy nhóm B và mã chưa có nhóm');
select is((select count(*) from public.san_pham), 1::bigint, 'giới hạn A: toàn bảng chỉ còn 1 mã');
select ok(public.xem_duoc_nhom((select nhom_a from t)), 'xem_duoc_nhom(A) = true');
select ok(not public.xem_duoc_nhom((select nhom_b from t)), 'xem_duoc_nhom(B) = false');
select ok(not public.xem_duoc_nhom(null), 'xem_duoc_nhom(null) = false khi bị giới hạn');
select ok(public.xem_duoc_san_pham((select sp_a from t_dem)), 'xem_duoc_san_pham(mã A) = true');
select ok(not public.xem_duoc_san_pham((select sp_b from t_dem)), 'xem_duoc_san_pham(mã B) = false');
select throws_ok(
  $$ insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id)
     values ('ZQ132-SPX', 'Lén thêm vào B', (select id from public.don_vi_tinh where ma = 'CAI'),
             (select id from public.cong_doan where ma = 'MUA_NGOAI'), (select nhom_b from t)) $$,
  '42501', null, 'có quyền tạo mã nhưng không thêm được mã vào nhóm ngoài phạm vi');

-- ─── 4. Tồn kho và sổ cái theo nhóm ─────────────────────────────────────────
select pg_temp.dang_xuat();
update public.nguoi_dung_nhom_hang set nhom_hang_ids = array[(select nhom_g from t)]
where nguoi_dung_id = (select u_nv from t);

select pg_temp.dang_nhap_id((select u_nv from t));
select is((select count(*) from public.ton_kho), (select ton_g from t_dem),
  'tồn kho: chỉ thấy dòng tồn của nhóm được giao');
select is((select count(*) from public.kho_movement), (select so_cai_g from t_dem),
  'sổ cái: chỉ thấy biến động của nhóm được giao');

-- ─── 5. Admin luôn tất cả ───────────────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_admin from t));
select is(public.nhom_hang_duoc_xem(), null::uuid[], 'Admin: không bị giới hạn');
select is((select count(*) from public.san_pham), (select tong_sp from t_dem), 'Admin: thấy mọi mã');

-- ─── 6. RPC dat_nhom_hang_nguoi_dung ────────────────────────────────────────
select pg_temp.dang_nhap_id((select u_tu from t));
select throws_ok(
  $$ select public.dat_nhom_hang_nguoi_dung((select u_nv from t), array[(select nhom_a from t)]) $$,
  '42501', null, 'không có quyền Phân quyền thì không đặt được nhóm');

select pg_temp.dang_nhap_id((select u_pq from t));
select is(
  public.dat_nhom_hang_nguoi_dung((select u_nv from t),
    array[(select nhom_b from t), (select nhom_b from t), (select nhom_a from t)]),
  (select array_agg(x order by x) from t, unnest(array[t.nhom_a, t.nhom_b]) x),
  'đặt nhóm: bỏ trùng, sắp xếp, trả về mảng đã lưu');
select throws_ok(
  $$ select public.dat_nhom_hang_nguoi_dung((select u_nv from t), '{}'::uuid[]) $$,
  '23514', null, 'mảng rỗng bị từ chối — phải chọn ít nhất một nhóm');
select throws_ok(
  $$ select public.dat_nhom_hang_nguoi_dung((select u_nv from t), array[gen_random_uuid()]) $$,
  '22023', null, 'nhóm không tồn tại bị từ chối');
select throws_ok(
  $$ select public.dat_nhom_hang_nguoi_dung((select u_admin from t), array[(select nhom_a from t)]) $$,
  '23514', null, 'không giới hạn được tài khoản Admin');
select throws_ok(
  $$ select public.dat_nhom_hang_nguoi_dung((select u_pq from t), null) $$,
  '42501', null, 'không tự đổi nhóm hàng của chính mình');
select is(public.dat_nhom_hang_nguoi_dung((select u_nv from t), null), null::uuid[],
  'null = bỏ giới hạn');

select pg_temp.dang_xuat();
select is((select count(*) from public.nguoi_dung_nhom_hang where nguoi_dung_id = (select u_nv from t)),
  0::bigint, 'bỏ giới hạn thì xóa dòng');

select pg_temp.dang_nhap_id((select u_nv from t));
select is(public.nhom_hang_duoc_xem(), null::uuid[], 'bỏ giới hạn có hiệu lực ngay, không cần token mới');

-- ─── 7. RLS của chính bảng nguoi_dung_nhom_hang ─────────────────────────────
select pg_temp.dang_xuat();
insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids)
select u_nv, array[nhom_a] from t;

select pg_temp.dang_nhap_id((select u_tu from t));
select is((select count(*) from public.nguoi_dung_nhom_hang), 0::bigint,
  'người thường không đọc được phạm vi của người khác');

select pg_temp.dang_nhap_id((select u_nv from t));
select is((select count(*) from public.nguoi_dung_nhom_hang), 1::bigint, 'đọc được phạm vi của chính mình');
select throws_ok(
  $$ update public.nguoi_dung_nhom_hang set nhom_hang_ids = array[(select nhom_b from t)] $$,
  '42501', null, 'không tự sửa thẳng bảng để mở thêm nhóm');

select * from finish();
rollback;
