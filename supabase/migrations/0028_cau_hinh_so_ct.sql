-- =============================================================================
-- CDAT-04 · D-08
-- Cấu hình đánh số chứng từ: tiền tố + số chữ số sửa được theo từng loại,
-- chỉ quản lý sửa, mọi vai trò đọc. Đổi giữa năm: số mới dùng định dạng mới,
-- số đã phát giữ nguyên. Không bao giờ phát số bị lpad cắt cụt.
-- =============================================================================

create table public.cau_hinh_so_ct (
  loai_ct public.loai_ct primary key,
  tien_to text not null constraint ck_tien_to check (tien_to ~ '^[A-Z0-9]{1,5}$'),
  so_chu_so smallint not null default 6 constraint ck_so_chu_so check (so_chu_so between 3 and 8),
  updated_at timestamptz not null default now(),
  constraint uq_cau_hinh_tien_to unique (tien_to)
);

comment on table public.cau_hinh_so_ct is
  'Cấu hình tiền tố + số chữ số đánh số chứng từ theo từng loại (CDAT-04). '
  'Đổi chỉ ảnh hưởng số phát SAU; số đã phát giữ nguyên vì sinh_so_ct đọc '
  'cấu hình tại thời điểm gọi, không viết lại chuoi_so_ct.';

-- Giữ đúng bảy tiền tố hard-code cũ của 0009 để không đổi hành vi số đã phát.
insert into public.cau_hinh_so_ct (loai_ct, tien_to) values
  ('NHAP', 'PN'), ('XUAT', 'PX'), ('TRA_NCC', 'TN'), ('TRA_KHACH', 'TK'),
  ('CHUYEN_KHO', 'CK'), ('KIEM_KE', 'KK'), ('DIEU_CHINH', 'DC')
on conflict (loai_ct) do nothing;

create trigger set_updated_at_cau_hinh_so_ct before update on public.cau_hinh_so_ct
  for each row execute function public.update_updated_at();

-- lpad CẮT CỤT chuỗi dài hơn độ rộng thay vì báo lỗi — giảm so_chu_so khi số
-- đang chạy năm nay đã dài hơn sẽ âm thầm phát ra số TRÙNG số cũ. Chặn ngay
-- lúc sửa cấu hình, không đợi tới lúc sinh_so_ct phát số trùng.
create or replace function public.kiem_so_chu_so_cau_hinh()
returns trigger language plpgsql set search_path = '' as $$
declare v_dai int;
begin
  select coalesce(max(length(so_hien_tai::text)), 0) into v_dai
  from public.chuoi_so_ct
  where loai_ct = new.loai_ct and nam = extract(year from current_date)::smallint;
  if new.so_chu_so < v_dai then
    raise exception 'Số chứng từ % năm nay đã tới % chữ số, không giảm xuống % được', new.loai_ct, v_dai, new.so_chu_so
      using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.kiem_so_chu_so_cau_hinh() from public, anon, authenticated;
create trigger kiem_so_chu_so before update on public.cau_hinh_so_ct
  for each row execute function public.kiem_so_chu_so_cau_hinh();

alter table public.cau_hinh_so_ct enable row level security;
create policy "doc cau hinh so ct" on public.cau_hinh_so_ct for select to authenticated using (true);
create policy "quan ly sua cau hinh so ct" on public.cau_hinh_so_ct for update to authenticated
  using ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');
revoke insert, delete on public.cau_hinh_so_ct from anon, authenticated;
revoke update on public.cau_hinh_so_ct from anon, authenticated;
grant update (tien_to, so_chu_so) on public.cau_hinh_so_ct to authenticated;

-- =============================================================================
-- sinh_so_ct đọc tiền tố + số chữ số từ cau_hinh_so_ct thay vì hard-code.
-- 0020 đã thêm `set search_path = ''` cho hàm này bằng ALTER FUNCTION; giữ
-- nguyên qua create or replace bằng cách khai lại `set search_path = ''` ở
-- đây — mọi tham chiếu trong thân hàm đã qualify public. nên không đổi hành vi.
-- =============================================================================
create or replace function public.sinh_so_ct(
  p_loai public.loai_ct,
  p_nam smallint default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
  v_tien_to text;
  v_so_chu_so smallint;
begin
  select tien_to, so_chu_so into v_tien_to, v_so_chu_so
  from public.cau_hinh_so_ct where loai_ct = p_loai;
  if v_tien_to is null then
    raise exception 'Chưa cấu hình đánh số cho loại chứng từ %', p_loai using errcode = '23514';
  end if;

  -- MỘT câu lệnh duy nhất: vừa tạo dòng đếm nếu chưa có, vừa tăng nếu đã có,
  -- vừa trả giá trị mới. Không có khoảng hở giữa đọc và ghi (xem 0009).
  insert into public.chuoi_so_ct (loai_ct, nam, so_hien_tai)
  values (p_loai, v_nam, 1)
  on conflict (loai_ct, nam)
  do update set so_hien_tai = public.chuoi_so_ct.so_hien_tai + 1
  returning so_hien_tai into v_so;

  -- lpad CẮT CỤT chuỗi dài hơn độ rộng → phát số trùng. Chặn cứng.
  if length(v_so::text) > v_so_chu_so then
    raise exception 'Số chứng từ % đã vượt % chữ số — tăng số chữ số trong Cài đặt', p_loai, v_so_chu_so
      using errcode = '23514';
  end if;

  -- Reset theo năm, KHÔNG tách theo kho: số PN26-000001 dùng chung cả hai kho.
  return format('%s%s-%s', v_tien_to, to_char(v_nam % 100, 'FM00'), lpad(v_so::text, v_so_chu_so, '0'));
end;
$$;
revoke all    on function public.sinh_so_ct(public.loai_ct, smallint) from public, anon;
grant execute on function public.sinh_so_ct(public.loai_ct, smallint) to authenticated;

-- RPC đọc cho màn Cài đặt: cấu hình hiện tại + ví dụ số kế tiếp mỗi loại.
create or replace function public.danh_sach_cau_hinh_so_ct()
returns table (loai_ct public.loai_ct, tien_to text, so_chu_so smallint, so_hien_tai integer, vi_du text)
language sql stable set search_path = '' as $$
  select c.loai_ct, c.tien_to, c.so_chu_so, coalesce(s.so_hien_tai, 0),
         format('%s%s-%s', c.tien_to, to_char(extract(year from current_date)::int % 100, 'FM00'),
                lpad((coalesce(s.so_hien_tai, 0) + 1)::text, c.so_chu_so, '0'))
  from public.cau_hinh_so_ct c
  left join public.chuoi_so_ct s on s.loai_ct = c.loai_ct and s.nam = extract(year from current_date)::smallint
  order by c.loai_ct;
$$;
revoke all    on function public.danh_sach_cau_hinh_so_ct() from public, anon;
grant execute on function public.danh_sach_cau_hinh_so_ct() to authenticated;

-- ─── Tự kiểm ngay trong transaction migration, KHÔNG ghi dữ liệu thử ───────
-- Đây là một phần vĩnh viễn của migration (không rollback), nên chỉ đọc —
-- không gọi sinh_so_ct() ở đây vì nó sẽ để lại dòng chuoi_so_ct thật.
-- Sai bất kỳ điều kiện nào thì raise exception làm rớt cả migration, đúng ý:
-- migration lỗi thì không nên commit.
do $test$
declare v_dem bigint;
begin
  select count(*) into v_dem from public.cau_hinh_so_ct;
  if v_dem <> 7 then
    raise exception 'Kỳ vọng 7 cấu hình cau_hinh_so_ct, có %', v_dem;
  end if;

  select count(*) into v_dem from public.danh_sach_cau_hinh_so_ct();
  if v_dem <> 7 then
    raise exception 'danh_sach_cau_hinh_so_ct kỳ vọng 7 dòng, có %', v_dem;
  end if;
end $test$;
