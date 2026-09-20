-- =============================================================================
-- 0053 — Bộ cấp số đơn đặt hàng (Phase 4, plan 04-02 Task 2)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Version này đã được áp lên cloud bởi một
-- phiên làm việc khác, file nguồn không có trong repo. Trích từ `pg_get_functiondef`.
--
-- Vì sao KHÔNG dùng lại `chuoi_so_ct`/`sinh_so_ct`: bộ đếm đó khóa theo cặp
-- (loai_ct, năm) với `loai_ct` là enum chứng từ. Đơn đặt hàng KHÔNG phải một
-- `loai_ct` — nó là bảng riêng. Nên sao chép kỹ thuật chống trùng, không sao
-- chép bộ đếm.
-- =============================================================================

create table if not exists public.chuoi_so_dh (
  nam smallint primary key,
  so_hien_tai integer not null default 0
);

comment on table public.chuoi_so_dh is
  'Bộ đếm số đơn đặt hàng theo năm. Chỉ ghi qua sinh_so_dh (SECURITY DEFINER).';

alter table public.chuoi_so_dh enable row level security;

-- Không cấp quyền ghi trực tiếp cho client: mọi lần tăng đi qua sinh_so_dh.
revoke insert, update, delete on public.chuoi_so_dh from anon, authenticated;

drop policy if exists "doc chuoi so dh" on public.chuoi_so_dh;
create policy "doc chuoi so dh" on public.chuoi_so_dh
  for select to authenticated using (true);

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

comment on function public.sinh_so_dh(smallint) is
  'Cấp số đơn dạng DH{YY}-{000001}, chống trùng bằng insert..on conflict do update..returning trong MỘT câu lệnh. Chỉ quản lý và văn phòng (D-06); ngữ cảnh không có JWT (migration/script/pgTAP) được đi qua theo quy ước 0048.';

revoke all    on function public.sinh_so_dh(smallint) from public, anon;
grant execute on function public.sinh_so_dh(smallint) to authenticated;
