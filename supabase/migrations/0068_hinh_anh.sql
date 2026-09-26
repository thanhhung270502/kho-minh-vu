-- =============================================================================
-- 0068 — Bảng hinh_anh + RPC ảnh mã hàng (Phase 9, ANH-01..05)
--
-- D-02: chỉ quan_ly/van_phong thêm, đặt ảnh chính, xóa ảnh — chặn ở database,
--   không chỉ ở giao diện. Mọi vai trò đọc được ảnh còn sống.
-- D-04: bảng chỉ lưu noi_luu + khoa_luu + khoa_luu_thumb (fileId Drive), KHÔNG
--   lưu URL — Drive để private, đọc duy nhất qua Route Handler /anh/<id>.
-- D-18: danh_sach_san_pham nhận thêm p_co_anh (true/false/null) để lọc bảng
--   danh mục theo "có ảnh / chưa có ảnh".
-- D-20: mỗi mã có tối đa MỘT ảnh chính còn sống; ảnh đầu tiên tự thành chính;
--   xóa ảnh chính thì ảnh kế tiếp (thu_tu, created_at) lên thay.
-- D-21: xóa là xóa mềm (xoa_luc) — ảnh đã xóa vô hình với mọi vai trò qua RLS.
--
-- Vì sao dùng SECURITY DEFINER thay vì RLS cho phần ghi: policy SELECT của
-- bảng này lọc `xoa_luc is null`. Nếu có policy UPDATE dùng chung điều kiện
-- đó, câu UPDATE xóa mềm (đổi xoa_luc từ null sang now()) sẽ bị Postgres từ
-- chối với "new row violates row-level security policy" — dòng SAU khi cập
-- nhật không còn thỏa `xoa_luc is null` của chính policy đang chặn nó. Mọi
-- đường ghi (thêm, đặt ảnh chính, xóa) đi qua RPC SECURITY DEFINER tự kiểm
-- vai trò bên trong (supabase-rls-bao-mat.md mục 6), không có policy
-- INSERT/UPDATE/DELETE nào trên bảng.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng
-- -----------------------------------------------------------------------------
create table public.hinh_anh (
  id uuid primary key default uuid_generate_v4(),
  san_pham_id uuid not null references public.san_pham(id),
  noi_luu text not null check (noi_luu in ('GDRIVE','SUPABASE','R2')),
  khoa_luu text not null check (length(khoa_luu) > 0),
  khoa_luu_thumb text not null check (length(khoa_luu_thumb) > 0),
  la_anh_chinh boolean not null default false,
  thu_tu integer not null default 0,
  -- Chỉ dùng để nhận ra ảnh đã chép từ KiotViet (idempotent cho script ANH-06),
  -- KHÔNG phải đường đọc ảnh — đọc luôn qua lay_khoa_anh()/khoa_luu.
  nguon_url text,
  nguoi_tao_id uuid references public.nguoi_dung(id),
  xoa_luc timestamptz,
  nguoi_xoa_id uuid references public.nguoi_dung(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_hinh_anh_chinh_con_song check (not (la_anh_chinh and xoa_luc is not null))
);

-- Tối đa một ảnh chính còn sống cho mỗi mã — lớp chặn cuối cùng, độc lập với
-- logic ứng dụng trong _chen_anh/dat_anh_chinh.
create unique index idx_hinh_anh_chinh_unique on public.hinh_anh (san_pham_id)
  where la_anh_chinh and xoa_luc is null;

-- Bao gồm cả dòng đã xóa mềm: người dùng xóa ảnh chép từ KiotViet rồi chạy lại
-- script ANH-06 sẽ KHÔNG chép lại (đúng ý "idempotent", không phải lỗi).
create unique index idx_hinh_anh_nguon_url_unique on public.hinh_anh (san_pham_id, nguon_url)
  where nguon_url is not null;

create index idx_hinh_anh_san_pham on public.hinh_anh (san_pham_id, thu_tu) where xoa_luc is null;

create trigger set_updated_at_hinh_anh before update on public.hinh_anh
  for each row execute function public.update_updated_at();

comment on table public.hinh_anh is
  'Ảnh mã hàng (Phase 9). noi_luu/khoa_luu/khoa_luu_thumb trỏ tới file trên Drive (D-04) — không lưu URL. Ghi duy nhất qua RPC SECURITY DEFINER (them_anh/nap_anh_kiotviet/dat_anh_chinh/xoa_anh); đọc khóa lưu duy nhất qua lay_khoa_anh(). Xóa mềm bằng xoa_luc (D-21).';

-- -----------------------------------------------------------------------------
-- 2. Quyền + RLS — chỉ đọc qua policy, mọi ghi đi qua RPC bên dưới
-- -----------------------------------------------------------------------------
alter table public.hinh_anh enable row level security;

revoke all on public.hinh_anh from anon, authenticated;
grant select (id, san_pham_id, la_anh_chinh, thu_tu, created_at) on public.hinh_anh to authenticated;

create policy "moi vai tro doc hinh anh con song" on public.hinh_anh
  for select to authenticated
  using (xoa_luc is null and (select public.vai_tro_hien_tai()) is not null);

-- Không có policy INSERT/UPDATE/DELETE — mọi ghi đi qua RPC security definer.

-- -----------------------------------------------------------------------------
-- 3. Hàm nội bộ dùng chung giữa them_anh và nap_anh_kiotviet
-- -----------------------------------------------------------------------------
create or replace function public._chen_anh(
  p_id uuid,
  p_san_pham_id uuid,
  p_noi_luu text,
  p_khoa_luu text,
  p_khoa_luu_thumb text,
  p_nguon_url text,
  p_nguoi_tao_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chinh boolean;
  v_thu_tu integer;
begin
  -- Khóa theo mã hàng: hai lượt thêm ảnh đồng thời cho cùng một mã không được
  -- cùng thấy "chưa có ảnh chính" (T-09-03).
  perform pg_advisory_xact_lock(hashtextextended('hinh_anh:' || p_san_pham_id::text, 0));

  if not exists (select 1 from public.san_pham sp where sp.id = p_san_pham_id) then
    raise exception 'Mã hàng không tồn tại' using errcode = 'P0002';
  end if;

  v_chinh := not exists (
    select 1 from public.hinh_anh h
    where h.san_pham_id = p_san_pham_id and h.la_anh_chinh and h.xoa_luc is null
  );

  select coalesce(max(h.thu_tu) + 1, 0) into v_thu_tu
  from public.hinh_anh h
  where h.san_pham_id = p_san_pham_id;

  insert into public.hinh_anh (
    id, san_pham_id, noi_luu, khoa_luu, khoa_luu_thumb,
    la_anh_chinh, thu_tu, nguon_url, nguoi_tao_id
  ) values (
    p_id, p_san_pham_id, p_noi_luu, p_khoa_luu, p_khoa_luu_thumb,
    v_chinh, v_thu_tu, p_nguon_url, p_nguoi_tao_id
  );

  return v_chinh;
end;
$$;

revoke all on function public._chen_anh(uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. them_anh — đường ghi bình thường (người dùng tải ảnh qua giao diện)
-- -----------------------------------------------------------------------------
create or replace function public.them_anh(
  p_id uuid,
  p_san_pham_id uuid,
  p_noi_luu text,
  p_khoa_luu text,
  p_khoa_luu_thumb text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.vai_tro_hien_tai()) is null
     or (select public.vai_tro_hien_tai()) not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng được thêm ảnh' using errcode = '42501';
  end if;

  return public._chen_anh(p_id, p_san_pham_id, p_noi_luu, p_khoa_luu, p_khoa_luu_thumb, null, (select auth.uid()));
end;
$$;

revoke all    on function public.them_anh(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.them_anh(uuid, uuid, text, text, text) to authenticated;
comment on function public.them_anh(uuid, uuid, text, text, text) is
  'Thêm một ảnh cho mã hàng (D-02, D-20). Ảnh đầu tiên còn sống của mã tự thành ảnh chính. Chỉ quan_ly/van_phong.';

-- -----------------------------------------------------------------------------
-- 5. nap_anh_kiotviet — script chép ảnh KiotViet một lần (job hệ thống)
-- -----------------------------------------------------------------------------
create or replace function public.nap_anh_kiotviet(
  p_id uuid,
  p_san_pham_id uuid,
  p_noi_luu text,
  p_khoa_luu text,
  p_khoa_luu_thumb text,
  p_nguon_url text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_nguon_url is null or length(trim(p_nguon_url)) = 0 then
    raise exception 'Thiếu URL nguồn KiotViet' using errcode = '22023';
  end if;

  return public._chen_anh(p_id, p_san_pham_id, p_noi_luu, p_khoa_luu, p_khoa_luu_thumb, p_nguon_url, null);
end;
$$;

-- Job hệ thống (script dòng lệnh chạy tay, ANH-06) — KHÔNG kiểm vai trò vì
-- không có JWT; thay vào đó chỉ service_role được gọi (khuôn nap_danh_muc_kiotviet, 0019).
revoke all    on function public.nap_anh_kiotviet(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.nap_anh_kiotviet(uuid, uuid, text, text, text, text) to service_role;
comment on function public.nap_anh_kiotviet(uuid, uuid, text, text, text, text) is
  'Chép ảnh có sẵn trên KiotViet sang Drive (D-11..D-14). Idempotent theo (san_pham_id, nguon_url) qua idx_hinh_anh_nguon_url_unique — chạy lại script không chép trùng. Chỉ service_role, client không gọi được.';

-- -----------------------------------------------------------------------------
-- 6. dat_anh_chinh
-- -----------------------------------------------------------------------------
create or replace function public.dat_anh_chinh(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sp uuid;
begin
  if (select public.vai_tro_hien_tai()) is null
     or (select public.vai_tro_hien_tai()) not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng được đổi ảnh chính' using errcode = '42501';
  end if;

  select h.san_pham_id into v_sp from public.hinh_anh h where h.id = p_id and h.xoa_luc is null;
  if v_sp is null then
    raise exception 'Ảnh không tồn tại hoặc đã bị xóa' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('hinh_anh:' || v_sp::text, 0));

  -- HAI câu UPDATE tách rời, theo đúng thứ tự này. Unique index của la_anh_chinh
  -- KHÔNG deferrable và Postgres kiểm ràng buộc theo TỪNG DÒNG được ghi, nên gộp
  -- thành một câu `set la_anh_chinh = (id = p_id)` sẽ vỡ 23505 tùy thứ tự quét
  -- dòng của planner (nếu dòng mới thành true được ghi trước khi dòng cũ thành
  -- false) — phải tắt ảnh chính cũ trước, bật ảnh chính mới sau.
  update public.hinh_anh h
     set la_anh_chinh = false
   where h.san_pham_id = v_sp and h.la_anh_chinh and h.xoa_luc is null and h.id <> p_id;

  update public.hinh_anh h
     set la_anh_chinh = true
   where h.id = p_id;
end;
$$;

revoke all    on function public.dat_anh_chinh(uuid) from public, anon;
grant execute on function public.dat_anh_chinh(uuid) to authenticated;
comment on function public.dat_anh_chinh(uuid) is
  'Đặt một ảnh còn sống của mã hàng làm ảnh chính (D-20). Chỉ quan_ly/van_phong.';

-- -----------------------------------------------------------------------------
-- 7. xoa_anh — xóa mềm, trả khóa lưu để route dọn file trên Drive
-- -----------------------------------------------------------------------------
create or replace function public.xoa_anh(p_id uuid)
returns table (noi_luu text, khoa_luu text, khoa_luu_thumb text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sp uuid;
  v_la_chinh boolean;
  v_noi_luu text;
  v_khoa_luu text;
  v_khoa_luu_thumb text;
  v_ke_tiep uuid;
begin
  if (select public.vai_tro_hien_tai()) is null
     or (select public.vai_tro_hien_tai()) not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng được xóa ảnh' using errcode = '42501';
  end if;

  select h.san_pham_id, h.la_anh_chinh, h.noi_luu, h.khoa_luu, h.khoa_luu_thumb
    into v_sp, v_la_chinh, v_noi_luu, v_khoa_luu, v_khoa_luu_thumb
  from public.hinh_anh h
  where h.id = p_id and h.xoa_luc is null;

  if v_sp is null then
    raise exception 'Ảnh không tồn tại hoặc đã bị xóa' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('hinh_anh:' || v_sp::text, 0));

  update public.hinh_anh h
     set xoa_luc = now(), nguoi_xoa_id = (select auth.uid()), la_anh_chinh = false
   where h.id = p_id;

  if v_la_chinh then
    select h.id into v_ke_tiep
    from public.hinh_anh h
    where h.san_pham_id = v_sp and h.xoa_luc is null
    order by h.thu_tu, h.created_at, h.id
    limit 1;

    if v_ke_tiep is not null then
      update public.hinh_anh h set la_anh_chinh = true where h.id = v_ke_tiep;
    end if;
  end if;

  return query select v_noi_luu, v_khoa_luu, v_khoa_luu_thumb;
end;
$$;

revoke all    on function public.xoa_anh(uuid) from public, anon;
grant execute on function public.xoa_anh(uuid) to authenticated;
comment on function public.xoa_anh(uuid) is
  'Xóa mềm một ảnh (D-21) và chuyển ảnh chính sang ảnh kế tiếp nếu cần (D-20). Trả noi_luu/khoa_luu/khoa_luu_thumb để Route Handler chuyển file gốc vào thùng rác Drive. Chỉ quan_ly/van_phong.';

-- -----------------------------------------------------------------------------
-- 8. lay_khoa_anh — đường duy nhất đọc khoa_luu, dùng cho Route Handler /anh/<id>
-- -----------------------------------------------------------------------------
create or replace function public.lay_khoa_anh(p_id uuid)
returns table (noi_luu text, khoa_luu text, khoa_luu_thumb text)
language sql
stable
security definer
set search_path = ''
as $$
  select h.noi_luu, h.khoa_luu, h.khoa_luu_thumb
  from public.hinh_anh h
  where h.id = p_id and h.xoa_luc is null and (select public.vai_tro_hien_tai()) is not null;
$$;

revoke all    on function public.lay_khoa_anh(uuid) from public, anon;
grant execute on function public.lay_khoa_anh(uuid) to authenticated;
comment on function public.lay_khoa_anh(uuid) is
  'Trả khóa lưu (fileId Drive) của một ảnh còn sống, cho người đã đăng nhập. Chỉ Route Handler /anh/<id> gọi — khóa là fileId private, không phải URL công khai.';

-- -----------------------------------------------------------------------------
-- 9. danh_sach_san_pham + p_co_anh (D-18)
--
-- KHÔNG dùng create or replace để thêm tham số: Postgres coi danh sách tham số
-- khác là hàm MỚI (overload), PostgREST sẽ báo PGRST203 "Could not choose the
-- best candidate function" khi có hai overload cùng tên. Phải drop hàm cũ rồi
-- create hàm mới với chữ ký 12 kiểu.
-- -----------------------------------------------------------------------------
drop function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int);

create function public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_co_anh boolean default null)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 set search_path = ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with ton as (
    select tk.san_pham_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho)
    group by tk.san_pham_id
  ), loc as (
    select sp.*,
           nh.ten as ten_nhom, dv.ten as ten_dv,
           cd.ma as ma_cd, cd.ten as ten_cd, cd.mau_hien_thi,
           coalesce(ton.so_luong, 0) as tong,
           public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra) as cr
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join public.don_vi_tinh dv on dv.id = sp.dvt_id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
    left join ton on ton.san_pham_id = sp.id
    where (v_tk is null
           or public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
                ilike '%' || public.f_unaccent(v_tk) || '%'
           or public.f_unaccent(v_tk) operator(extensions.<%)
                public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
      and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
      and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
      and (p_dvt_id is null or sp.dvt_id = p_dvt_id)
      and (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
      and (p_co_anh is null
           or p_co_anh = exists (select 1 from public.hinh_anh h
                                 where h.san_pham_id = sp.id and h.xoa_luc is null))
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom, l.dvt_id, l.ten_dv,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi, l.quy_doi, l.gia_ban,
         case when v_xem_gv then l.gia_von end,
         l.ton_toi_thieu, l.ton_toi_da, l.kho_mac_dinh_id, l.dang_kinh_doanh,
         l.tong, l.cr, l.can_ra_dvt, l.updated_at,
         count(*) over ()
  from loc l
  where (p_can_ra is null or l.cr = p_can_ra)
    and (p_trang_thai_ton is null
         or (p_trang_thai_ton = 'con_hang'     and l.tong > 0)
         or (p_trang_thai_ton = 'het_hang'     and l.tong = 0)
         or (p_trang_thai_ton = 'am'           and l.tong < 0)
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm
         -- (0067, UAT 05 bài 7).
         or (p_trang_thai_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
  order by
    case when p_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when p_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when p_sap_xep = 'ten_hang'   and p_huong = 'asc'  then l.ten_hang end asc,
    case when p_sap_xep = 'ten_hang'   and p_huong = 'desc' then l.ten_hang end desc,
    case when p_sap_xep = 'tong_ton'   and p_huong = 'asc'  then l.tong end asc,
    case when p_sap_xep = 'tong_ton'   and p_huong = 'desc' then l.tong end desc,
    case when p_sap_xep = 'updated_at' and p_huong = 'asc'  then l.updated_at end asc,
    case when p_sap_xep = 'updated_at' and p_huong = 'desc' then l.updated_at end desc,
    case when p_sap_xep = 'ma_hang'    and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

revoke all    on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int, boolean) from public, anon;
grant execute on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int, boolean) to authenticated;
comment on function public.danh_sach_san_pham(text, uuid, uuid, uuid, text, boolean, boolean, text, text, int, int, boolean) is
  'Bảng danh mục server-side (D-11): lọc, sắp xếp, phân trang và tổng số dòng đều ở database. gia_von chỉ trả cho quản lý/văn phòng (D-16); tong_ton của thủ kho chỉ cộng kho được phân. Trang vượt quá dữ liệu trả 0 dòng — giao diện tự lùi về trang 1. p_co_anh: true = có ảnh còn sống, false = chưa có ảnh, null = không lọc (0068, D-18).';

-- -----------------------------------------------------------------------------
-- 10. Tự kiểm cuối file
-- -----------------------------------------------------------------------------
do $$
declare
  v_so_overload int;
  v_thieu_search_path text;
  v_anon_them_anh boolean;
begin
  select count(*) into v_so_overload
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'danh_sach_san_pham' and n.nspname = 'public';

  if v_so_overload <> 1 then
    raise exception 'danh_sach_san_pham phải có đúng 1 overload, hiện có %', v_so_overload;
  end if;

  select string_agg(p.proname, ', ') into v_thieu_search_path
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('_chen_anh', 'them_anh', 'nap_anh_kiotviet', 'dat_anh_chinh',
                       'xoa_anh', 'lay_khoa_anh', 'danh_sach_san_pham')
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
    );

  if v_thieu_search_path is not null then
    raise exception 'Hàm chưa khóa search_path: %', v_thieu_search_path;
  end if;

  select has_function_privilege('anon', 'public.them_anh(uuid,uuid,text,text,text)', 'execute')
    into v_anon_them_anh;

  if v_anon_them_anh then
    raise exception 'anon không được có quyền EXECUTE trên them_anh';
  end if;
end $$;
