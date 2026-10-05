-- Gắn nhân viên nhận cho đơn / hóa đơn KiotViet của NB001 (Bộ phận điều phối đơn).
--
-- File hóa đơn KiotViet ghi mọi dòng là khách NB001 kèm cột "Nhân viên nhận"; lần
-- nạp lịch sử (scripts/import-lich-su-excel.ts) chỉ cất tên đó vào ghi chú dòng
-- "Nhân viên nhận: NGỌC". Script này dựng lại người nhận từ ghi chú:
--   * dòng ghi đúng MỘT nhân viên  → chung_tu_dong.nguoi_nhan_id
--   * mọi tên nhân viên xuất hiện trong ghi chú (tách theo "-") → người nhận của
--     hóa đơn (chung_tu_nguoi_nhan) và của đơn đặt sinh ra nó (don_dat_hang_nguoi_nhan)
--   * dòng đơn đặt nhận nhân viên của dòng hóa đơn cùng mã hàng (khi chỉ có một)
-- Giữ nguyên đối tác NB001 và giữ nguyên ghi chú dòng (ghi chú tự do như "BÁN LẺ",
-- "DIỄM - 30 CUỒN KEO NON" vẫn còn để đọc). Chạy lại nhiều lần an toàn.

begin;

update public.doi_tac set ten = 'BỘ PHẬN ĐIỀU PHỐI ĐƠN'
where ma = 'NB001' and ten <> 'BỘ PHẬN ĐIỀU PHỐI ĐƠN';

create temp table _ghi_chu_nv on commit drop as
select d.id as dong_id, d.chung_tu_id, d.san_pham_id, d.created_at,
       upper(trim(substring(d.ghi_chu from '^Nhân viên nhận: (.*)$'))) as ten
from public.chung_tu_dong d
join public.chung_tu ct on ct.id = d.chung_tu_id
join public.doi_tac dt on dt.id = ct.doi_tac_id and dt.ma = 'NB001'
where d.ghi_chu like 'Nhân viên nhận: %';

-- Dòng ghi đúng một nhân viên.
update public.chung_tu_dong d
set nguoi_nhan_id = nv.id
from _ghi_chu_nv g
join public.nhan_vien_phu_trach nv on upper(nv.ten_viet_tat) = g.ten
where d.id = g.dong_id and d.nguoi_nhan_id is null;

-- Người nhận của hóa đơn: mọi phần của ghi chú (tách "-") trùng tên nhân viên,
-- theo thứ tự xuất hiện đầu tiên.
insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
select x.chung_tu_id, x.nguoi_nhan_id,
       row_number() over (partition by x.chung_tu_id order by x.dau, x.nguoi_nhan_id)::int
from (
  select g.chung_tu_id, nv.id as nguoi_nhan_id, min(g.created_at) as dau
  from _ghi_chu_nv g
  cross join lateral regexp_split_to_table(g.ten, '\s*-\s*') as phan(ten)
  join public.nhan_vien_phu_trach nv on upper(nv.ten_viet_tat) = trim(phan.ten)
  group by g.chung_tu_id, nv.id
) x
where not exists (select 1 from public.chung_tu_nguoi_nhan c where c.chung_tu_id = x.chung_tu_id)
on conflict do nothing;

-- Đơn đặt sinh ra hóa đơn đó nhận cùng người nhận.
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select ct.don_dat_hang_id, ctn.nguoi_nhan_id, min(ctn.thu_tu)
from public.chung_tu_nguoi_nhan ctn
join public.chung_tu ct on ct.id = ctn.chung_tu_id
join public.doi_tac dt on dt.id = ct.doi_tac_id and dt.ma = 'NB001'
where ct.don_dat_hang_id is not null
  and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = ct.don_dat_hang_id)
group by ct.don_dat_hang_id, ctn.nguoi_nhan_id
on conflict do nothing;

-- Dòng đơn đặt: nhân viên của dòng hóa đơn cùng mã hàng, khi mã đó chỉ một người nhận.
update public.don_dat_hang_dong dd
set nguoi_nhan_id = x.nguoi_nhan_id
from (
  select ct.don_dat_hang_id, d.san_pham_id, min(d.nguoi_nhan_id::text)::uuid as nguoi_nhan_id
  from public.chung_tu_dong d
  join public.chung_tu ct on ct.id = d.chung_tu_id
  join public.doi_tac dt on dt.id = ct.doi_tac_id and dt.ma = 'NB001'
  where ct.don_dat_hang_id is not null and d.nguoi_nhan_id is not null
  group by ct.don_dat_hang_id, d.san_pham_id
  having count(distinct d.nguoi_nhan_id) = 1
) x
where dd.don_dat_hang_id = x.don_dat_hang_id and dd.san_pham_id = x.san_pham_id
  and dd.nguoi_nhan_id is null;

commit;
