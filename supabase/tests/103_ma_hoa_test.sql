-- =============================================================================
-- Quy chuẩn mã (C) — dong_bo_ma_hoa: thay toàn bộ bộ mã hóa trong một lần;
-- dữ liệu hỏng / bị cắt thì GIỮ NGUYÊN từ điển và ghi nhật ký lỗi.
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

create or replace function pg_temp.ban_ghi(p_so_linh_kien int, p_co_mau boolean default true)
returns jsonb language sql as $h$
  select jsonb_build_array(
    jsonb_build_object('loai', 'hang', 'ma', 'H', 'ten', 'HONDA', 'thu_tu', 1),
    jsonb_build_object('loai', 'dong', 'ma', 'A', 'ten', 'Air Blade', 'ma_hang', 'H', 'thu_tu', 1),
    jsonb_build_object('loai', 'dong', 'ma', 'S', 'ten', 'SH', 'ma_hang', 'H', 'thu_tu', 2),
    jsonb_build_object('loai', 'xu_ly', 'ma', 'CB', 'ten', 'carbon', 'thu_tu', 1)
  )
  || coalesce((select jsonb_agg(jsonb_build_object('loai', 'linh_kien', 'ma', lpad(g::text, 2, '0'), 'ten', 'Linh kiện ' || g, 'thu_tu', g))
               from generate_series(1, p_so_linh_kien) g), '[]'::jsonb)
  || case when p_co_mau then jsonb_build_array(jsonb_build_object('loai', 'mau', 'ma', 'ĐOB', 'ten', 'đỏ bóng', 'thu_tu', 1))
          else '[]'::jsonb end;
$h$;

-- Dọn bộ mã hóa thật nếu DB local đã đồng bộ (rollback ở cuối trả lại).
delete from public.ma_hoa;
create temp table t_kq (buoc int, kq jsonb);

-- ─── 1. Lần đầu: nạp đủ ────────────────────────────────────────────────────
insert into t_kq select 1, public.dong_bo_ma_hoa(pg_temp.ban_ghi(4), 'pgtap');
select is((select kq->>'thanh_cong' from t_kq where buoc = 1), 'true', 'đồng bộ hợp lệ: thành công');
select is((select count(*)::int from public.ma_hoa), 9, 'đủ 9 mục: 1 hãng, 2 dòng, 1 xử lý, 4 linh kiện, 1 màu');
select is((select ten from public.ma_hoa where loai = 'dong' and ma_hang = 'H' and ma = 'S'), 'SH', 'dòng lưu kèm mã hãng của nó');

-- ─── 2. Thiếu hẳn một loại → không đụng từ điển ────────────────────────────
insert into t_kq select 2, public.dong_bo_ma_hoa(pg_temp.ban_ghi(4, false), 'pgtap');
select is((select kq->>'thanh_cong' from t_kq where buoc = 2), 'false', 'thiếu loại màu: từ chối');
select ok((select kq->>'loi' from t_kq where buoc = 2) like '%màu%', 'lỗi nói rõ loại thiếu');
select is((select count(*)::int from public.ma_hoa where loai = 'mau'), 1, 'từ điển giữ nguyên khi lỗi');

-- ─── 3. Bị cắt bất thường (linh kiện 4 → 1, giảm hơn nửa) → từ chối ───────
insert into t_kq select 3, public.dong_bo_ma_hoa(pg_temp.ban_ghi(1), 'pgtap');
select is((select kq->>'thanh_cong' from t_kq where buoc = 3), 'false', 'linh kiện giảm quá nửa: từ chối');
select is((select count(*)::int from public.ma_hoa where loai = 'linh_kien'), 4, 'linh kiện giữ nguyên');

-- ─── 4. Trùng mã trong cùng loại → báo lỗi gọn, không văng exception ──────
insert into t_kq select 4, public.dong_bo_ma_hoa(pg_temp.ban_ghi(4) || jsonb_build_array(
  jsonb_build_object('loai', 'xu_ly', 'ma', 'cb', 'ten', 'carbon trùng', 'thu_tu', 9)), 'pgtap');
select is((select kq->>'thanh_cong' from t_kq where buoc = 4), 'false', 'trùng mã (không phân biệt hoa thường): từ chối');

-- ─── 5. Nhật ký ghi cả lần lỗi ─────────────────────────────────────────────
select is(
  (select string_agg(trang_thai, ',' order by bat_dau) from public.ma_hoa_dong_bo where nguon = 'pgtap'),
  'thanh_cong,loi,loi,loi', 'nhật ký ghi đủ 4 lần, kể cả lần lỗi');

-- ─── 6. Quyền ──────────────────────────────────────────────────────────────
select pg_temp.dang_nhap_nhu('thukho1@khominhvu.local');
select throws_ok($$ select public.dong_bo_ma_hoa(pg_temp.ban_ghi(4), 'pgtap') $$, '42501', null, 'thủ kho không đồng bộ được');
select is((select count(*)::int from public.ma_hoa where loai = 'hang'), 1, 'mọi vai trò đọc được bộ mã hóa');
select throws_ok($$ delete from public.ma_hoa $$, '42501', null, 'không ai sửa thẳng bảng — chỉ qua RPC');
select pg_temp.dang_xuat();

select pg_temp.dang_nhap_nhu('quanly@khominhvu.local');
select is((public.dong_bo_ma_hoa(pg_temp.ban_ghi(5), 'pgtap'))->>'thanh_cong', 'true', 'quản lý đồng bộ tay được');
select pg_temp.dang_xuat();

select * from finish();
rollback;
