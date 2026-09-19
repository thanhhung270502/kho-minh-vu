-- =============================================================================
-- 0043 — Số phiếu riêng cho hàng nhập từ nhà máy (Phase 3, NHAP-07, D-10)
--
-- Nhà máy Vũ Trụ L.An là một NHÀ CUNG CẤP, không phải một loại chứng từ. Vì vậy
-- KHÔNG thêm giá trị vào enum `loai_ct` (sẽ kéo theo sửa 7 nhánh `case` trong
-- 0011, mọi policy liệt kê loại, và màn Cài đặt). Thay vào đó: thêm cột nguồn
-- nhập, và cho chuỗi số chạy theo cặp (loại, nguồn).
--
-- `nguon` dùng chuỗi rỗng '' cho dòng gốc thay vì NULL: khóa chính không nhận
-- NULL, và '' cho phép giữ nguyên bảy dòng cấu hình đang chạy.
-- =============================================================================

create type public.nguon_nhap as enum ('NCC', 'NHA_MAY');

alter table public.chung_tu add column nguon_nhap public.nguon_nhap;
comment on column public.chung_tu.nguon_nhap is
  'Chỉ có nghĩa với loai_ct = NHAP. NULL cho các loại khác.';

-- --- Chuỗi số và cấu hình chạy theo cặp (loại, nguồn) ------------------------
alter table public.cau_hinh_so_ct add column nguon text not null default '';
alter table public.cau_hinh_so_ct drop constraint cau_hinh_so_ct_pkey;
alter table public.cau_hinh_so_ct add primary key (loai_ct, nguon);

alter table public.chuoi_so_ct add column nguon text not null default '';
alter table public.chuoi_so_ct drop constraint chuoi_so_ct_pkey;
alter table public.chuoi_so_ct add primary key (loai_ct, nam, nguon);

insert into public.cau_hinh_so_ct (loai_ct, nguon, tien_to, so_chu_so)
values ('NHAP', 'NHA_MAY', 'PNM', 6)
on conflict (loai_ct, nguon) do nothing;

-- --- sinh_so_ct nhận thêm nguồn ----------------------------------------------
-- DROP trước rồi CREATE: thêm tham số có default sẽ tạo hàm MỚI chứ không thay
-- hàm cũ, và hai hàm cùng tên khác số tham số làm lời gọi hai tham số thành
-- ambiguous. Phải bỏ hẳn bản cũ.
drop function if exists public.sinh_so_ct(public.loai_ct, smallint);

create or replace function public.sinh_so_ct(
  p_loai public.loai_ct,
  p_nam smallint default null,
  p_nguon text default ''
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
  v_nguon text := coalesce(p_nguon, '');
  v_tien_to text;
  v_so_chu_so smallint;
begin
  select tien_to, so_chu_so into v_tien_to, v_so_chu_so
  from public.cau_hinh_so_ct where loai_ct = p_loai and nguon = v_nguon;

  -- Nguồn lạ thì rơi về cấu hình gốc của loại, không ném lỗi giữa lúc lập phiếu.
  if v_tien_to is null then
    v_nguon := '';
    select tien_to, so_chu_so into v_tien_to, v_so_chu_so
    from public.cau_hinh_so_ct where loai_ct = p_loai and nguon = '';
  end if;

  if v_tien_to is null then
    raise exception 'Chưa cấu hình đánh số cho loại chứng từ %', p_loai using errcode = '23514';
  end if;

  insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
  values (p_loai, v_nam, v_nguon, 1)
  on conflict (loai_ct, nam, nguon)
  do update set so_hien_tai = public.chuoi_so_ct.so_hien_tai + 1
  returning so_hien_tai into v_so;

  if length(v_so::text) > v_so_chu_so then
    raise exception 'Số chứng từ % đã vượt % chữ số — tăng số chữ số trong Cài đặt', p_loai, v_so_chu_so
      using errcode = '23514';
  end if;

  return format('%s%s-%s', v_tien_to, to_char(v_nam % 100, 'FM00'), lpad(v_so::text, v_so_chu_so, '0'));
end;
$$;

revoke all    on function public.sinh_so_ct(public.loai_ct, smallint, text) from public, anon;
grant execute on function public.sinh_so_ct(public.loai_ct, smallint, text) to authenticated;

-- --- RPC đọc cho màn Cài đặt: thêm cột nguồn, giữ nguyên bảy dòng cũ ---------
drop function if exists public.danh_sach_cau_hinh_so_ct();

create or replace function public.danh_sach_cau_hinh_so_ct()
returns table (
  loai_ct public.loai_ct, nguon text, tien_to text, so_chu_so smallint,
  so_hien_tai integer, vi_du text
)
language sql stable set search_path = '' as $$
  select c.loai_ct, c.nguon, c.tien_to, c.so_chu_so, coalesce(s.so_hien_tai, 0),
         format('%s%s-%s', c.tien_to, to_char(extract(year from current_date)::int % 100, 'FM00'),
                lpad((coalesce(s.so_hien_tai, 0) + 1)::text, c.so_chu_so, '0'))
  from public.cau_hinh_so_ct c
  left join public.chuoi_so_ct s
    on s.loai_ct = c.loai_ct and s.nguon = c.nguon
   and s.nam = extract(year from current_date)::smallint
  order by c.loai_ct, c.nguon;
$$;

revoke all    on function public.danh_sach_cau_hinh_so_ct() from public, anon;
grant execute on function public.danh_sach_cau_hinh_so_ct() to authenticated;
