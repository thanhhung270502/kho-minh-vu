-- =============================================================================
-- UI3B-02 — tim_kiem_toan_cuc: một nguồn dữ liệu cho ô tìm ⌘K, gộp bốn loại
-- (mã hàng · chứng từ · đơn đặt · đối tác).
--
-- SECURITY INVOKER có chủ đích: RLS của chung_tu tự lọc phạm vi kho của người
-- gọi, không chép lại logic phạm vi ở đây. CHUYEN_KHO và DIEU_CHINH bị bỏ vì
-- chưa có trang chi tiết (D-07). Chỉ đọc các cột được cấp SELECT trên san_pham
-- (0029) — không đụng gia_von. Biểu thức tìm khớp nguyên văn index trigram
-- idx_san_pham_tim_kiem / idx_doi_tac_tim_kiem.
-- =============================================================================
drop function if exists public.tim_kiem_toan_cuc(text, integer);

create function public.tim_kiem_toan_cuc(p_tu_khoa text, p_gioi_han integer default 5)
returns table (
  loai text, id uuid, nhan text, phu text,
  loai_ct text, trang_thai text, xep_hang integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tham_so as (
    select nullif(trim(coalesce(p_tu_khoa, '')), '') as kw,
           least(greatest(coalesce(p_gioi_han, 5), 1), 10) as gh
  ),
  sp as (
    select 'san_pham'::text as loai, s.id as id, s.ma_hang as nhan,
           (s.ten_hang || case when s.dang_kinh_doanh then '' else ' (ngừng KD)' end) as phu,
           null::text as loai_ct, null::text as trang_thai,
           (case when lower(s.ma_hang) = lower(t.kw) then 0
                 when lower(s.ma_hang) like lower(t.kw) || '%' then 1
                 else 2 end) as xep_hang
    from public.san_pham s, tham_so t
    where length(t.kw) >= 2
      and public.f_unaccent(coalesce(s.ma_hang, '') || ' ' || coalesce(s.ten_hang, ''))
          ilike '%' || public.f_unaccent(t.kw) || '%'
    order by 7, s.ma_hang
    limit (select gh from tham_so)
  ),
  ct as (
    select 'chung_tu'::text as loai, c.id as id, c.so_ct as nhan,
           to_char(c.ngay_ct, 'DD/MM/YYYY') as phu,
           c.loai_ct::text as loai_ct, c.trang_thai::text as trang_thai,
           (case when lower(c.so_ct) = lower(t.kw) then 0 else 1 end) as xep_hang
    from public.chung_tu c, tham_so t
    where length(t.kw) >= 2
      and c.loai_ct in ('NHAP', 'XUAT', 'TRA_NCC', 'TRA_KHACH', 'KIEM_KE')
      and c.so_ct ilike '%' || t.kw || '%'
    order by 7, c.ngay_ct desc, c.so_ct desc
    limit (select gh from tham_so)
  ),
  dh as (
    select 'don_dat'::text as loai, d.id as id, d.so_dh as nhan,
           to_char(d.ngay_dh, 'DD/MM/YYYY') as phu,
           null::text as loai_ct, d.trang_thai::text as trang_thai,
           (case when lower(d.so_dh) = lower(t.kw) then 0 else 1 end) as xep_hang
    from public.don_dat_hang d, tham_so t
    where length(t.kw) >= 2
      and d.so_dh ilike '%' || t.kw || '%'
    order by 7, d.ngay_dh desc, d.so_dh desc
    limit (select gh from tham_so)
  ),
  dt as (
    select 'doi_tac'::text as loai, p.id as id, p.ten as nhan,
           concat_ws(' · ', p.ma, p.dien_thoai) as phu,
           null::text as loai_ct, null::text as trang_thai,
           (case when lower(p.ma) = lower(t.kw) then 0 else 1 end) as xep_hang
    from public.doi_tac p, tham_so t
    where length(t.kw) >= 2
      and public.f_unaccent(coalesce(p.ma, '') || ' ' || coalesce(p.ten, '') || ' ' || coalesce(p.dien_thoai, ''))
          ilike '%' || public.f_unaccent(t.kw) || '%'
    order by 7, p.ten
    limit (select gh from tham_so)
  )
  select * from sp
  union all select * from ct
  union all select * from dh
  union all select * from dt
$$;

revoke all on function public.tim_kiem_toan_cuc(text, integer) from public, anon;
grant execute on function public.tim_kiem_toan_cuc(text, integer) to authenticated;

comment on function public.tim_kiem_toan_cuc(text, integer) is
  'UI3B-02: tìm gộp mã hàng/chứng từ/đơn đặt/đối tác cho ⌘K. INVOKER để RLS lọc kho; bỏ CHUYEN_KHO, DIEU_CHINH (D-07).';
