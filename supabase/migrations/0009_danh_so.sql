-- =============================================================================
-- 0009 — Đánh số chứng từ, an toàn với gọi đồng thời
-- =============================================================================

create table public.chuoi_so_ct (
  loai_ct public.loai_ct not null,
  nam smallint not null,
  so_hien_tai integer not null default 0,
  primary key (loai_ct, nam)
);

create or replace function public.sinh_so_ct(
  p_loai public.loai_ct,
  p_nam smallint default null
)
returns text
language plpgsql
as $$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
  v_tien_to text;
begin
  -- MỘT câu lệnh duy nhất: vừa tạo dòng đếm nếu chưa có, vừa tăng nếu đã có,
  -- vừa trả giá trị mới. Không có khoảng hở giữa đọc và ghi.
  --
  -- Hai transaction gọi đồng thời tự serialize trên khóa dòng (loai_ct, nam):
  -- transaction thứ hai đợi tới khi thứ nhất commit hoặc rollback.
  --
  -- KHÔNG dùng SELECT MAX(so)+1 — race condition kinh điển.
  -- KHÔNG dùng Postgres sequence — sequence không reset theo năm được.
  insert into public.chuoi_so_ct (loai_ct, nam, so_hien_tai)
  values (p_loai, v_nam, 1)
  on conflict (loai_ct, nam)
  do update set so_hien_tai = public.chuoi_so_ct.so_hien_tai + 1
  returning so_hien_tai into v_so;

  -- Phủ đủ 7 giá trị enum, không có nhánh else: thêm loại chứng từ mới mà quên
  -- cập nhật đây thì hàm trả NULL âm thầm.
  v_tien_to := case p_loai
    when 'NHAP'       then 'PN'
    when 'XUAT'       then 'PX'
    when 'TRA_NCC'    then 'TN'
    when 'TRA_KHACH'  then 'TK'
    when 'CHUYEN_KHO' then 'CK'
    when 'KIEM_KE'    then 'KK'
    when 'DIEU_CHINH' then 'DC'
  end;

  -- Reset theo năm, KHÔNG tách theo kho: số PN26-000001 dùng chung cả hai kho.
  return format('%s%s-%s', v_tien_to, to_char(v_nam % 100, 'FM00'), lpad(v_so::text, 6, '0'));
end;
$$;

grant execute on function public.sinh_so_ct(public.loai_ct, smallint) to authenticated;
