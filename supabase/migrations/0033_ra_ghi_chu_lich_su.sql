-- =============================================================================
-- 0033 — Rà ghi chú KiotViet thành khách/sale + lịch sử giao dịch (DLIEU-04, DTAC-03)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.chuan_hoa_ghi_chu(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select nullif(upper(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g')), '');
$function$;

revoke all    on function public.chuan_hoa_ghi_chu(text) from public, anon;
grant execute on function public.chuan_hoa_ghi_chu(text) to authenticated;

create index if not exists idx_luu_tru_hoa_don_ghi_chu_chuan
  on public.luu_tru_hoa_don_kiotviet (public.chuan_hoa_ghi_chu(ghi_chu));

create table if not exists public.anh_xa_ghi_chu_kiotviet (
  gia_tri text primary key,
  loai text not null check (loai in ('KHACH','SALE','KHACH_VA_SALE','BO_QUA')),
  doi_tac_id uuid references public.doi_tac(id),
  ten_sale text,
  nguoi_quyet_id uuid references public.nguoi_dung(id),
  quyet_luc timestamptz not null default now(),
  constraint ck_anh_xa_khach check ((loai in ('KHACH','KHACH_VA_SALE')) = (doi_tac_id is not null)),
  constraint ck_anh_xa_sale  check ((loai in ('SALE','KHACH_VA_SALE')) = (nullif(trim(coalesce(ten_sale,'')),'') is not null))
);

create index if not exists idx_anh_xa_doi_tac on public.anh_xa_ghi_chu_kiotviet (doi_tac_id)
  where doi_tac_id is not null;

alter table public.anh_xa_ghi_chu_kiotviet enable row level security;

drop policy if exists "doc anh xa ghi chu" on public.anh_xa_ghi_chu_kiotviet;
create policy "doc anh xa ghi chu" on public.anh_xa_ghi_chu_kiotviet
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- Ghi chỉ qua RPC quyet_ghi_chu / bo_quyet_ghi_chu (SECURITY DEFINER).
revoke insert, update, delete on public.anh_xa_ghi_chu_kiotviet from anon, authenticated;

comment on table public.anh_xa_ghi_chu_kiotviet is
  'Quyết định rà ghi chú hóa đơn KiotViet (DLIEU-04). Khóa là giá trị ghi chú đã chuẩn hóa bằng chuan_hoa_ghi_chu. Chỉ ghi được qua RPC quyet_ghi_chu / bo_quyet_ghi_chu.';

CREATE OR REPLACE FUNCTION public.danh_sach_ghi_chu_kiotviet(p_trang_thai text DEFAULT 'chua_ra'::text, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(gia_tri text, so_hoa_don bigint, so_dong bigint, ngay_dau timestamp with time zone, ngay_cuoi timestamp with time zone, hoa_don_mau text[], loai text, doi_tac_id uuid, ten_doi_tac text, ten_sale text, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_kich_thuoc int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng rà được ghi chú KiotViet' using errcode = '42501';
  end if;

  return query
  with g as (
    select public.chuan_hoa_ghi_chu(h.ghi_chu)  as gia_tri,
           count(distinct h.ma_hoa_don)          as so_hoa_don,
           count(*)                              as so_dong,
           min(h.ngay::timestamptz)              as ngay_dau,
           max(h.ngay::timestamptz)              as ngay_cuoi,
           (array_agg(distinct h.ma_hoa_don))[1:3] as hoa_don_mau
    from public.luu_tru_hoa_don_kiotviet h
    where public.chuan_hoa_ghi_chu(h.ghi_chu) is not null
    group by 1
  )
  select g.gia_tri, g.so_hoa_don, g.so_dong, g.ngay_dau, g.ngay_cuoi, g.hoa_don_mau,
         a.loai, a.doi_tac_id, d.ten, a.ten_sale, count(*) over ()
  from g
  left join public.anh_xa_ghi_chu_kiotviet a on a.gia_tri = g.gia_tri
  left join public.doi_tac d on d.id = a.doi_tac_id
  where (p_trang_thai is null
         or (p_trang_thai = 'chua_ra' and a.gia_tri is null)
         or (p_trang_thai = 'da_ra'   and a.gia_tri is not null))
    and (nullif(trim(coalesce(p_tu_khoa,'')),'') is null
         or public.f_unaccent(g.gia_tri) ilike '%' || public.f_unaccent(trim(p_tu_khoa)) || '%')
  order by g.so_hoa_don desc, g.gia_tri
  limit v_kich_thuoc
  offset (greatest(coalesce(p_trang,1),1) - 1) * v_kich_thuoc;
end $function$;

revoke all    on function public.danh_sach_ghi_chu_kiotviet(text, text, int, int) from public, anon;
grant execute on function public.danh_sach_ghi_chu_kiotviet(text, text, int, int) to authenticated;

CREATE OR REPLACE FUNCTION public.quyet_ghi_chu(p_gia_tri text, p_loai text, p_doi_tac_id uuid DEFAULT NULL::uuid, p_tao_khach jsonb DEFAULT NULL::jsonb, p_ten_sale text DEFAULT NULL::text)
 RETURNS anh_xa_ghi_chu_kiotviet
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_gia_tri   text := public.chuan_hoa_ghi_chu(p_gia_tri);
  v_doi_tac_id uuid := p_doi_tac_id;
  v_ten       text;
  v_ma        text;
  v_row       public.anh_xa_ghi_chu_kiotviet;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng quyết được ghi chú KiotViet' using errcode = '42501';
  end if;
  if v_gia_tri is null then
    raise exception 'Giá trị ghi chú rỗng' using errcode = '23514';
  end if;

  perform set_config('app.nguon_sua', 'ra_ghi_chu', true);

  if p_tao_khach is not null and p_loai in ('KHACH','KHACH_VA_SALE') then
    v_ten := nullif(trim(coalesce(p_tao_khach->>'ten', '')), '');
    if v_ten is null then
      raise exception 'Nhập tên khách' using errcode = '23514';
    end if;
    v_ma := coalesce(nullif(p_tao_khach->>'ma', ''), public.sinh_ma_doi_tac('KHACH'));
    insert into public.doi_tac (ma, ten, loai, dien_thoai, dia_chi)
    values (v_ma, v_ten, 'KHACH',
            nullif(trim(coalesce(p_tao_khach->>'dien_thoai', '')), ''),
            nullif(trim(coalesce(p_tao_khach->>'dia_chi', '')), ''))
    returning id into v_doi_tac_id;
  end if;

  insert into public.anh_xa_ghi_chu_kiotviet (gia_tri, loai, doi_tac_id, ten_sale, nguoi_quyet_id)
  values (v_gia_tri, p_loai, v_doi_tac_id, nullif(trim(coalesce(p_ten_sale, '')), ''), auth.uid())
  on conflict (gia_tri) do update set
    loai = excluded.loai,
    doi_tac_id = excluded.doi_tac_id,
    ten_sale = excluded.ten_sale,
    nguoi_quyet_id = excluded.nguoi_quyet_id,
    quyet_luc = now()
  returning * into v_row;

  return v_row;
end $function$;

revoke all    on function public.quyet_ghi_chu(text, text, uuid, jsonb, text) from public, anon;
grant execute on function public.quyet_ghi_chu(text, text, uuid, jsonb, text) to authenticated;

CREATE OR REPLACE FUNCTION public.bo_quyet_ghi_chu(p_gia_tri text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng bỏ được quyết định rà ghi chú' using errcode = '42501';
  end if;
  delete from public.anh_xa_ghi_chu_kiotviet
  where gia_tri = public.chuan_hoa_ghi_chu(p_gia_tri);
end $function$;

revoke all    on function public.bo_quyet_ghi_chu(text) from public, anon;
grant execute on function public.bo_quyet_ghi_chu(text) to authenticated;

CREATE OR REPLACE FUNCTION public.lich_su_giao_dich_doi_tac(p_doi_tac_id uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(nguon text, ma_phieu text, chung_tu_id uuid, loai text, ngay timestamp with time zone, so_dong bigint, tong_so_luong numeric, ghi_chu text, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_vai_tro    text   := (select public.vai_tro_hien_tai())::text;
  v_kho        uuid[] := coalesce((select public.kho_hien_tai()), '{}'::uuid[]);
  v_xem_kv     boolean;
  v_kich_thuoc int    := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
begin
  if v_vai_tro is null then
    raise exception 'Hết phiên hoặc tài khoản không còn hiệu lực' using errcode = '42501';
  end if;
  v_xem_kv := v_vai_tro in ('quan_ly','van_phong');

  return query
  with dt as (
    select d.id, d.ma, d.loai from public.doi_tac d where d.id = p_doi_tac_id
  ),
  tat_ca as (
    select 'HE_THONG'::text as nguon, ct.so_ct as ma_phieu, ct.id as chung_tu_id,
           ct.loai_ct::text as loai,
           coalesce(ct.ngay_ghi_so, ct.ngay_ct::timestamptz) as ngay,
           (select count(*) from public.chung_tu_dong cd where cd.chung_tu_id = ct.id) as so_dong,
           ct.tong_so_luong, ct.ghi_chu
    from public.chung_tu ct
    where ct.doi_tac_id = p_doi_tac_id
      and (v_vai_tro <> 'thu_kho'
           or ct.kho_id = any(v_kho)
           or ct.kho_den_id = any(v_kho))

    union all

    select 'KIOTVIET_NHAP'::text, l.ma_phieu, null::uuid, 'NHAP'::text,
           min(l.ngay::timestamptz), count(*), sum(l.so_luong), max(l.ghi_chu)
    from public.luu_tru_nhap_kiotviet l, dt
    where v_xem_kv and dt.loai in ('NCC','CA_HAI')
      and (l.nha_cung_cap like dt.ma || ' %'
           or (dt.ma = 'NCC900001' and l.nha_cung_cap like '0317415317 %'))
    group by l.ma_phieu

    union all

    select 'KIOTVIET_BAN'::text, h.ma_hoa_don, null::uuid, 'XUAT'::text,
           min(h.ngay::timestamptz), count(*), sum(h.so_luong), max(h.ghi_chu)
    from public.luu_tru_hoa_don_kiotviet h, dt
    where v_xem_kv and dt.loai in ('KHACH','CA_HAI')
      and ((dt.ma = 'KHACHLE' and public.chuan_hoa_ghi_chu(h.ghi_chu) is null)
           or public.chuan_hoa_ghi_chu(h.ghi_chu) in (
                select a.gia_tri from public.anh_xa_ghi_chu_kiotviet a
                where a.doi_tac_id = p_doi_tac_id
                  and a.loai in ('KHACH','KHACH_VA_SALE')))
    group by h.ma_hoa_don
  )
  select t.nguon, t.ma_phieu, t.chung_tu_id, t.loai, t.ngay, t.so_dong,
         t.tong_so_luong, t.ghi_chu, count(*) over ()
  from tat_ca t
  order by t.ngay desc nulls last
  limit v_kich_thuoc
  offset (greatest(coalesce(p_trang,1),1) - 1) * v_kich_thuoc;
end $function$;

revoke all    on function public.lich_su_giao_dich_doi_tac(uuid, int, int) from public, anon;
grant execute on function public.lich_su_giao_dich_doi_tac(uuid, int, int) to authenticated;

