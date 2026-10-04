-- =============================================================================
-- 0092 — Đánh số chứng từ theo kiểu KiotViet (04/10/2026)
--
-- Người dùng chốt: số phiếu đi tiếp dãy số đang dùng trên KiotViet — tiền tố +
-- 6 chữ số, KHÔNG có năm, không về 1 khi sang năm: PN000802, HD008878,
-- DH008908. Hóa đơn (XUAT) đổi tiền tố PX → HD cho khớp KiotViet.
--
-- 1. cau_hinh_so_ct.theo_nam: true = dạng cũ {tiền tố}{YY}-{số} đếm lại mỗi
--    năm; false = {tiền tố}{số} đếm liên tục. Đếm liên tục dùng dòng
--    chuoi_so_ct có nam = 0 — giữ nguyên khóa chính, không đụng dòng đếm cũ.
-- 2. sinh_so_dh: DH{6 số}, đếm liên tục ở chuoi_so_dh.nam = 0.
-- 3. danh_sach_cau_hinh_so_ct trả thêm theo_nam, ví dụ theo đúng quy tắc.
--
-- Không đổi số của chứng từ đã có — dữ liệu từng môi trường tự xử lý.
-- =============================================================================

alter table public.cau_hinh_so_ct add column theo_nam boolean not null default true;

update public.cau_hinh_so_ct set theo_nam = false;
update public.cau_hinh_so_ct set tien_to = 'HD' where loai_ct = 'XUAT' and nguon = '';

-- --- sinh_so_ct ---------------------------------------------------------------
create or replace function public.sinh_so_ct(
  p_loai public.loai_ct,
  p_nam smallint default null,
  p_nguon text default ''
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
  v_nguon text := coalesce(p_nguon, '');
  v_tien_to text;
  v_so_chu_so smallint;
  v_theo_nam boolean;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH (giữ như 0048).
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được cấp số chứng từ' using errcode = '42501';
  end if;

  select tien_to, so_chu_so, theo_nam into v_tien_to, v_so_chu_so, v_theo_nam
  from public.cau_hinh_so_ct where loai_ct = p_loai and nguon = v_nguon;

  if v_tien_to is null then
    v_nguon := '';
    select tien_to, so_chu_so, theo_nam into v_tien_to, v_so_chu_so, v_theo_nam
    from public.cau_hinh_so_ct where loai_ct = p_loai and nguon = '';
  end if;

  if v_tien_to is null then
    raise exception 'Chưa cấu hình đánh số cho loại chứng từ %', p_loai using errcode = '23514';
  end if;

  -- Đếm liên tục (không theo năm) nằm ở dòng nam = 0.
  if not v_theo_nam then
    v_nam := 0;
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

  if not v_theo_nam then
    return v_tien_to || lpad(v_so::text, v_so_chu_so, '0');
  end if;
  return format('%s%s-%s', v_tien_to, to_char(v_nam % 100, 'FM00'), lpad(v_so::text, v_so_chu_so, '0'));
end;
$$;

-- --- sinh_so_dh ---------------------------------------------------------------
-- p_nam giữ trong chữ ký cho các nơi đang gọi; số đơn không còn theo năm.
create or replace function public.sinh_so_dh(p_nam smallint default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so integer;
begin
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  insert into public.chuoi_so_dh (nam, so_hien_tai)
  values (0, 1)
  on conflict (nam)
  do update set so_hien_tai = public.chuoi_so_dh.so_hien_tai + 1
  returning so_hien_tai into v_so;

  -- Dạng DH{6 chữ số}, nối tiếp dãy số đơn KiotViet (DH008907 → DH008908).
  return 'DH' || lpad(v_so::text, 6, '0');
end;
$$;

-- --- danh_sach_cau_hinh_so_ct -------------------------------------------------
drop function public.danh_sach_cau_hinh_so_ct();
create function public.danh_sach_cau_hinh_so_ct()
returns table (
  loai_ct public.loai_ct, nguon text, tien_to text, so_chu_so smallint,
  theo_nam boolean, so_hien_tai integer, vi_du text
)
language sql stable set search_path = '' as $$
  select c.loai_ct, c.nguon, c.tien_to, c.so_chu_so, c.theo_nam, coalesce(s.so_hien_tai, 0),
         case when c.theo_nam
           then format('%s%s-%s', c.tien_to, to_char(extract(year from current_date)::int % 100, 'FM00'),
                       lpad((coalesce(s.so_hien_tai, 0) + 1)::text, c.so_chu_so, '0'))
           else c.tien_to || lpad((coalesce(s.so_hien_tai, 0) + 1)::text, c.so_chu_so, '0')
         end
  from public.cau_hinh_so_ct c
  left join public.chuoi_so_ct s
    on s.loai_ct = c.loai_ct and s.nguon = c.nguon
   and s.nam = case when c.theo_nam then extract(year from current_date)::smallint else 0 end
  order by c.loai_ct, c.nguon;
$$;
revoke all    on function public.danh_sach_cau_hinh_so_ct() from public, anon;
grant execute on function public.danh_sach_cau_hinh_so_ct() to authenticated;
