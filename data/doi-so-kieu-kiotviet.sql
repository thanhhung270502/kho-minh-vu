-- Chạy SAU migration 0092, một lần, trên phonzy (04/10/2026).
-- Trả chứng từ và đơn đã nạp về số KiotViet, đánh lại phiếu Điều chỉnh theo
-- quy tắc mới (DC + 6 số), rồi đặt bộ đếm liên tục (nam = 0) nối tiếp số cuối.
begin;

-- 1. Phiếu nhập + hóa đơn: số KiotViet đang nằm đầu ghi chú "Số KiotViet <số> · …"
update public.chung_tu
set so_ct = substring(ghi_chu from '^Số KiotViet (\S+)'),
    ghi_chu = nullif(regexp_replace(ghi_chu, '^Số KiotViet \S+( · )?', ''), '')
where ghi_chu ~ '^Số KiotViet \S+';

-- 2. Đơn đặt: ghi chú chỉ có "Số KiotViet <số>"
update public.don_dat_hang
set so_dh = substring(ghi_chu from '^Số KiotViet (\S+)'),
    ghi_chu = null
where ghi_chu ~ '^Số KiotViet \S+';

-- 3. Phiếu Điều chỉnh (tồn đầu kỳ, DC26-…) → DC000001… theo thứ tự tạo
with dc as (
  select id, row_number() over (order by created_at, so_ct) n
  from public.chung_tu where loai_ct = 'DIEU_CHINH'
)
update public.chung_tu ct set so_ct = 'DC' || lpad(dc.n::text, 6, '0') from dc where ct.id = dc.id;

-- 4. Đơn thử đã hủy DH26-000001 → DH000001 cho cùng dạng
update public.don_dat_hang set so_dh = 'DH' || lpad(substring(so_dh from '-(\d+)$')::int::text, 6, '0')
where so_dh ~ '^DH\d{2}-\d+$';

-- 5. Bộ đếm liên tục (nam = 0) = số lớn nhất đang có của từng loại
insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
select c.loai_ct, 0, c.nguon, max(substring(ct.so_ct from '^' || c.tien_to || '(\d+)$')::int)
from public.cau_hinh_so_ct c
join public.chung_tu ct on ct.loai_ct = c.loai_ct and ct.so_ct ~ ('^' || c.tien_to || '\d+$')
group by c.loai_ct, c.nguon
on conflict (loai_ct, nam, nguon) do update set so_hien_tai = excluded.so_hien_tai;

insert into public.chuoi_so_dh (nam, so_hien_tai)
select 0, max(substring(so_dh from '^DH(\d+)$')::int) from public.don_dat_hang where so_dh ~ '^DH\d+$'
on conflict (nam) do update set so_hien_tai = excluded.so_hien_tai;

-- Kiểm: không còn số kiểu cũ, bộ đếm đúng
select 'chung_tu sai dạng' k, count(*)::text v from public.chung_tu where so_ct !~ '^[A-Z]{2,3}\d{6}$'
union all select 'don sai dạng', count(*)::text from public.don_dat_hang where so_dh !~ '^DH\d{6}$'
union all select 'đếm ' || loai_ct || nguon, so_hien_tai::text from public.chuoi_so_ct where nam = 0
union all select 'đếm DH', so_hien_tai::text from public.chuoi_so_dh where nam = 0;

commit;
