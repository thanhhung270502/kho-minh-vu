-- Xóa sạch dấu vết load test. Chạy được nhiều lần.
\set ON_ERROR_STOP on
begin;
set local session_replication_role = replica;

create temp table lt_sp on commit drop as
  select id from public.san_pham where ma_hang like 'LOADTEST-%';
create temp table lt_dt on commit drop as
  select id from public.doi_tac where ma = 'LOADTEST-KH';
create temp table lt_ct on commit drop as
  select id from public.chung_tu
  where doi_tac_id in (select id from lt_dt)
     or id in (select chung_tu_id from public.chung_tu_dong
               where san_pham_id in (select id from lt_sp));

select (select count(*) from lt_ct) as so_phieu_xoa,
       (select count(*) from public.kho_movement where san_pham_id in (select id from lt_sp)) as so_movement_xoa;

delete from public.kho_movement where san_pham_id in (select id from lt_sp)
                                   or chung_tu_id in (select id from lt_ct);
delete from public.ton_kho where san_pham_id in (select id from lt_sp);
delete from public.chung_tu_dong where chung_tu_id in (select id from lt_ct);
delete from public.chung_tu where id in (select id from lt_ct);
delete from public.nhat_ky_sua where ban_ghi_id in (select id from lt_sp union all select id from lt_dt union all select id from lt_ct);
delete from public.san_pham where id in (select id from lt_sp);
delete from public.doi_tac where id in (select id from lt_dt);

-- Trả bộ đếm số phiếu XUAT về như trước test (không lủng số PX của năm).
-- greatest(): nếu có ai lập phiếu xuất thật trong lúc test thì không lùi qua số đó.
update public.chuoi_so_ct c set so_hien_tai = greatest(s.v, coalesce((
  select max(right(ct.so_ct, 6)::int) from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.so_ct like '%' || to_char(now(), 'YY') || '-%'), 0))
from public._loadtest_state s
where s.k = 'xuat_counter' and c.loai_ct = 'XUAT'
  and c.nam = extract(year from now())::smallint;
commit;

drop table if exists public._loadtest_state;
