-- =============================================================================
-- 0080 — Tổng giao dịch của đối tác (Phase 14, PANEL-02/03).
-- tong_giao_dich = số chứng từ ĐÃ GHI SỔ của đối tác; tab Lịch sử giao dịch chỉ
-- còn phiếu đã ghi sổ của hệ mới (Phase 10 đã gỡ lịch sử KiotViet khỏi giao diện)
-- nên tổng khớp đúng số dòng của tab.
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

create or replace function pg_temp.sp_test_kho(p_ma text, p_kho_id uuid)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id, kho_mac_dinh_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'),
          p_kho_id)
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang, kho_mac_dinh_id = excluded.kho_mac_dinh_id
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;

create or replace function pg_temp.phieu(p_so text, p_dt uuid)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, ly_do_xuat_am)
  values (p_so, 'XUAT', (select id from public.kho where ma = 'K1'), p_dt, 'LECH_TON_CHO_KIEM_KE')
  returning id into v_id;
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  values (v_id, (select id from public.san_pham order by ma_hang limit 1), 1, 0, 0, (select id from public.kho where ma = 'K1'));
  return v_id;
end $helper$;

-- ─── Dữ liệu: một khách mới, 1 phiếu đã ghi sổ, 1 nháp, 1 đã hủy ─────────────
insert into public.doi_tac (ma, ten, loai) values ('ZQX-GD-01', 'Khách test tổng giao dịch', 'KHACH');
create temp table t_dt as select id from public.doi_tac where ma = 'ZQX-GD-01';
grant select on t_dt to authenticated;

select public.ghi_so_chung_tu(pg_temp.phieu('ZQX-GD-A', (select id from t_dt)));
select pg_temp.phieu('ZQX-GD-B', (select id from t_dt));
select public.huy_chung_tu((public.ghi_so_chung_tu(pg_temp.phieu('ZQX-GD-C', (select id from t_dt)))).id, 'Test hủy');

-- ─── 1–3: tổng giao dịch ở danh sách ────────────────────────────────────────
select pg_temp.dang_nhap_nhu('vanphong@khominhvu.local');
select has_function('public', 'danh_sach_doi_tac', array['text','loai_doi_tac','boolean','integer','integer'],
  'danh_sach_doi_tac giữ nguyên tham số');
select is(
  (select tong_giao_dich from public.danh_sach_doi_tac('ZQX-GD-01', null, null) where ma = 'ZQX-GD-01'),
  1::bigint, 'Tổng giao dịch chỉ đếm phiếu đã ghi sổ (bỏ nháp, bỏ đã hủy)'
);
select is(
  (select tong_giao_dich from public.danh_sach_doi_tac(null, 'NCC', null, 1, 500) order by tong_giao_dich limit 1),
  0::bigint, 'Đối tác chưa có giao dịch: 0, không phải null'
);

-- ─── 4–6: tab lịch sử khớp tổng ─────────────────────────────────────────────
select is(
  (select count(*) from public.lich_su_giao_dich_doi_tac((select id from t_dt))),
  1::bigint, 'Lịch sử chỉ còn phiếu đã ghi sổ — khớp tổng giao dịch'
);
select is(
  (select ma_phieu from public.lich_su_giao_dich_doi_tac((select id from t_dt))),
  'ZQX-GD-A', 'Đúng phiếu đã ghi sổ'
);
select ok(
  not exists (select 1 from public.lich_su_giao_dich_doi_tac((select id from public.doi_tac where ma = 'KHACHLE'), 1, 500)
              where nguon <> 'HE_THONG'),
  'Không còn dòng lịch sử KiotViet (Phase 10 gỡ khỏi giao diện)'
);
select pg_temp.dang_xuat();

select * from finish();
rollback;
