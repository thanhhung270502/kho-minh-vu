-- LOCAL ONLY — xóa sạch dữ liệu BENCH (Phase 22). Chạy được nhiều lần.
-- Tiền tố nhận diện: xem scripts/bench/README.md.
--
-- session_replication_role = replica tắt trigger chặn sửa/xóa sổ cái (kho_movement
-- append-only) và nhật ký — CHỈ chấp nhận được vì đây là dữ liệu thử trên máy local.
-- Replica cũng tắt luôn trigger khóa ngoại nên phần cuối kiểm mồ côi bằng tay.
--
-- KHÔNG xóa tài khoản bench.*@khominhvu.local (auth.users): nếu ai dùng nhầm tài khoản
-- đó lập phiếu thật thì chung_tu.nguoi_tao_id còn trỏ vào; plan 22-03 tự quản chúng.
\set ON_ERROR_STOP on

begin;
set local session_replication_role = replica;

create temp table b_sp on commit drop as
  select id from public.san_pham where ma_hang like 'BENCH-%';
create temp table b_dt on commit drop as
  select id from public.doi_tac where ma like 'BENCH-%' or ma = 'NBBENCH';
create temp table b_nv on commit drop as
  select id from public.nhan_vien_phu_trach where ten_viet_tat like 'BENCH-%';
create temp table b_ct on commit drop as
  select id from public.chung_tu
  where so_ct like 'BENCH-%'
     or doi_tac_id in (select id from b_dt)
     or id in (select chung_tu_id from public.chung_tu_dong where san_pham_id in (select id from b_sp));
create temp table b_dh on commit drop as
  select id from public.don_dat_hang
  where so_dh like 'BENCH-%'
     or doi_tac_id in (select id from b_dt);

select
  (select count(*) from b_sp) as san_pham,
  (select count(*) from b_dt) as doi_tac,
  (select count(*) from b_nv) as nhan_vien,
  (select count(*) from b_ct) as chung_tu,
  (select count(*) from b_dh) as don_dat_hang,
  (select count(*) from public.kho_movement
    where chung_tu_id in (select id from b_ct) or san_pham_id in (select id from b_sp)) as kho_movement;

delete from public.kho_movement
  where chung_tu_id in (select id from b_ct) or san_pham_id in (select id from b_sp);
delete from public.de_nghi_gop_ma
  where chung_tu_id in (select id from b_ct)
     or san_pham_id_a in (select id from b_sp)
     or san_pham_id_b in (select id from b_sp);
delete from public.chung_tu_nguoi_nhan where chung_tu_id in (select id from b_ct);
delete from public.chung_tu_dong
  where chung_tu_id in (select id from b_ct) or san_pham_id in (select id from b_sp);
delete from public.chung_tu where id in (select id from b_ct);
delete from public.don_dat_hang_nguoi_nhan where don_dat_hang_id in (select id from b_dh);
delete from public.don_dat_hang_dong
  where don_dat_hang_id in (select id from b_dh) or san_pham_id in (select id from b_sp);
delete from public.don_dat_hang where id in (select id from b_dh);
delete from public.nhat_ky_sua
  where ban_ghi_id in (
    select id from b_sp union all select id from b_dt union all select id from b_dh
    union all select id from b_nv union all select id from b_ct
  );
delete from public.ton_kho where san_pham_id in (select id from b_sp);
delete from public.hinh_anh where san_pham_id in (select id from b_sp);
delete from public.thanh_phan_combo
  where combo_id in (select id from b_sp) or thanh_phan_id in (select id from b_sp);
delete from public.san_pham where id in (select id from b_sp);
delete from public.anh_xa_ghi_chu_kiotviet where doi_tac_id in (select id from b_dt);
delete from public.doi_tac where id in (select id from b_dt);
delete from public.nhan_vien_phu_trach where id in (select id from b_nv);
delete from public.nhom_hang where ma like 'BENCH-%';

commit;

-- Kiểm mồ côi: mọi khóa ngoại trỏ tới 8 bảng bench. Phải đủ 0.
do $$
declare
  v_pair record;
  v_orphans bigint;
  v_total bigint := 0;
begin
  for v_pair in
    select * from (values
      ('nhom_hang', 'parent_id', 'nhom_hang'),
      ('san_pham', 'nhom_hang_id', 'nhom_hang'),
      ('don_dat_hang', 'doi_tac_id', 'doi_tac'),
      ('chung_tu', 'doi_tac_id', 'doi_tac'),
      ('anh_xa_ghi_chu_kiotviet', 'doi_tac_id', 'doi_tac'),
      ('don_dat_hang_dong', 'san_pham_id', 'san_pham'),
      ('chung_tu_dong', 'san_pham_id', 'san_pham'),
      ('kho_movement', 'san_pham_id', 'san_pham'),
      ('ton_kho', 'san_pham_id', 'san_pham'),
      ('de_nghi_gop_ma', 'san_pham_id_a', 'san_pham'),
      ('de_nghi_gop_ma', 'san_pham_id_b', 'san_pham'),
      ('hinh_anh', 'san_pham_id', 'san_pham'),
      ('thanh_phan_combo', 'combo_id', 'san_pham'),
      ('thanh_phan_combo', 'thanh_phan_id', 'san_pham'),
      ('don_dat_hang_dong', 'don_dat_hang_id', 'don_dat_hang'),
      ('chung_tu', 'don_dat_hang_id', 'don_dat_hang'),
      ('don_dat_hang_nguoi_nhan', 'don_dat_hang_id', 'don_dat_hang'),
      ('chung_tu', 'chung_tu_goc_id', 'chung_tu'),
      ('chung_tu_dong', 'chung_tu_id', 'chung_tu'),
      ('kho_movement', 'chung_tu_id', 'chung_tu'),
      ('de_nghi_gop_ma', 'chung_tu_id', 'chung_tu'),
      ('chung_tu_nguoi_nhan', 'chung_tu_id', 'chung_tu'),
      ('kho_movement', 'chung_tu_dong_id', 'chung_tu_dong'),
      ('don_dat_hang', 'nguoi_nhan_id', 'nhan_vien_phu_trach'),
      ('don_dat_hang_dong', 'nguoi_nhan_id', 'nhan_vien_phu_trach'),
      ('chung_tu', 'nguoi_nhan_id', 'nhan_vien_phu_trach'),
      ('chung_tu_dong', 'nguoi_nhan_id', 'nhan_vien_phu_trach'),
      ('don_dat_hang_nguoi_nhan', 'nguoi_nhan_id', 'nhan_vien_phu_trach'),
      ('chung_tu_nguoi_nhan', 'nguoi_nhan_id', 'nhan_vien_phu_trach')
    ) as t(bang, cot, cha)
  loop
    execute format(
      'select count(*) from public.%I x left join public.%I p on p.id = x.%I '
      'where x.%I is not null and p.id is null',
      v_pair.bang, v_pair.cha, v_pair.cot, v_pair.cot
    ) into v_orphans;
    if v_orphans > 0 then
      raise warning 'Dòng mồ côi: %.% -> % (% dòng)', v_pair.bang, v_pair.cot, v_pair.cha, v_orphans;
      v_total := v_total + v_orphans;
    end if;
  end loop;

  if v_total > 0 then
    raise exception 'Còn % dòng mồ côi sau khi dọn BENCH — xem cảnh báo ở trên.', v_total;
  end if;
  raise notice 'Dọn BENCH xong, không có dòng mồ côi.';
end $$;
