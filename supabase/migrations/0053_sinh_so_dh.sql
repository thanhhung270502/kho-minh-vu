-- =============================================================================
-- 0053 — Bộ cấp số đơn đặt hàng (so_dh), an toàn với gọi đồng thời.
--
-- KHÔNG dùng lại chuoi_so_ct/sinh_so_ct: cau_hinh_so_ct/chuoi_so_ct khóa theo
-- loai_ct — enum bảy giá trị chứng từ (0028). Đơn đặt hàng không phải một
-- loai_ct, và thêm một giá trị enum giả sẽ làm ô nhiễm mọi chỗ đang phân
-- nhánh theo đúng bảy loại chứng từ thật (case trong ghi_so_chung_tu, nhãn
-- hiển thị ở tầng UI). Chép NGUYÊN VẸN kỹ thuật atomic của sinh_so_ct
-- (0047/0048), không chép bảng.
-- =============================================================================

create table public.chuoi_so_dh (
  nam smallint not null primary key,
  so_hien_tai integer not null default 0
);
alter table public.chuoi_so_dh enable row level security;

-- Không policy ghi nào — client chỉ chạm qua RPC SECURITY DEFINER bên dưới.
-- Cho đọc số hiện tại (màn Cài đặt sau này có thể muốn hiện số kế tiếp), cùng
-- khuôn "doc chuoi so ct" ở 0016.
create policy "doc chuoi so dh" on public.chuoi_so_dh
  for select to authenticated using (true);
revoke insert, update, delete on public.chuoi_so_dh from anon, authenticated;

comment on table public.chuoi_so_dh is
  'Bộ đếm số đơn đặt hàng theo năm, tách riêng khỏi chuoi_so_ct vì bảng đó khóa theo loai_ct (enum bảy loại chứng từ) — đơn đặt hàng không phải một loai_ct. Ghi duy nhất qua sinh_so_dh().';

-- -----------------------------------------------------------------------------
-- sinh_so_dh: MỘT câu lệnh insert ... on conflict ... returning, không đọc-
-- rồi-ghi — đúng kỹ thuật chống trùng số khi hai người tạo cùng lúc của
-- sinh_so_ct (0009/0047/0048).
--
-- Quy ước 0048: CHỈ chặn 'chi_xem', KHÔNG chặn null (ngữ cảnh không JWT —
-- migration, script nạp dữ liệu, pgTAP chạy dưới postgres). D-06 (04-CONTEXT)
-- nói thủ kho không tạo đơn, và cấp số rồi bỏ đó cũng là tiêu số, nên siết
-- thêm xuống chỉ hai vai trò quan_ly/van_phong (khác sinh_so_ct chỉ chặn
-- chi_xem) — dùng "not in (...)" thay vì toán tử so sánh "khác" hai ký tự.
-- -----------------------------------------------------------------------------
create or replace function public.sinh_so_dh(p_nam smallint default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly','van_phong') then
    raise exception 'Tài khoản không có quyền cấp số đơn' using errcode = '42501';
  end if;

  -- MỘT câu lệnh duy nhất: vừa tạo dòng đếm nếu chưa có, vừa tăng nếu đã có,
  -- vừa trả giá trị mới. Không có khoảng hở đọc-rồi-ghi.
  insert into public.chuoi_so_dh (nam, so_hien_tai)
  values (v_nam, 1)
  on conflict (nam)
  do update set so_hien_tai = public.chuoi_so_dh.so_hien_tai + 1
  returning so_hien_tai into v_so;

  -- Dạng DH{YY}-{6 chữ số}, cùng hình dạng số chứng từ hiện có (PN26-000001...).
  return format('DH%s-%s', to_char(v_nam % 100, 'FM00'), lpad(v_so::text, 6, '0'));
end;
$$;
revoke all    on function public.sinh_so_dh(smallint) from public, anon;
grant execute on function public.sinh_so_dh(smallint) to authenticated;
comment on function public.sinh_so_dh(smallint) is
  'Cấp số đơn đặt hàng dạng DH{YY}-{6 chữ số}, atomic (insert ... on conflict ... returning). Không dùng chuoi_so_ct vì bảng đó khóa theo enum loai_ct và đơn đặt hàng không phải một loai_ct. Chỉ quan_ly/van_phong cấp được số (D-06); ngữ cảnh không JWT được coi như quan_ly.';

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS.
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(tablename, ', ') into v_thieu
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if v_thieu is not null then
    raise exception 'Còn bảng chưa bật RLS: %', v_thieu;
  end if;
end $$;
