-- =============================================================================
-- 0048 — sinh_so_ct: chỉ chặn chi_xem, không chặn ngữ cảnh không có JWT
--
-- 0047 kiểm `vai_tro_hien_tai() in ('', 'chi_xem')` nên chặn luôn migration,
-- script nạp dữ liệu và pgTAP (chạy dưới postgres, không có JWT claims) —
-- 34 assert ở test 20 và 80 chết vì "Vai trò này không được cấp số chứng từ".
--
-- Quy ước sẵn có của dự án (ghi_so_chung_tu, huy_chung_tu): chỉ chặn 'chi_xem'.
-- =============================================================================

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
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  -- CHỈ chặn 'chi_xem', KHÔNG chặn null: vai_tro_hien_tai() trả null khi chạy
  -- ngoài ngữ cảnh JWT (migration, script nạp dữ liệu, pgTAP dựng dữ liệu dưới
  -- postgres). Chặn null làm đỏ 34 assert ở test 20 và 80 — cùng quy ước với
  -- ghi_so_chung_tu và huy_chung_tu.
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được cấp số chứng từ' using errcode = '42501';
  end if;

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
$$;;;

revoke all    on function public.sinh_so_ct(public.loai_ct, smallint, text) from public, anon;
grant execute on function public.sinh_so_ct(public.loai_ct, smallint, text) to authenticated;
