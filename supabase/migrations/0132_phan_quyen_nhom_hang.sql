-- 0132: Phân quyền theo NHÓM HÀNG — nền database (PR 1/4, 13/10/2026).
--
-- Thu mua phụ trách nhóm nào chỉ thấy hàng nhóm đó (giống "Nhóm hàng được phép truy cập"
-- của KiotViet). Trục phạm vi thứ ba, cạnh vai trò và kho.
--
-- Mô hình: một dòng / người trong nguoi_dung_nhom_hang.
--   · KHÔNG có dòng  → xem tất cả nhóm (mặc định của mọi tài khoản hiện có).
--   · CÓ dòng        → chỉ các nhóm trong nhom_hang_ids. Mã hàng chưa gán nhóm cũng bị ẩn.
-- Không dùng "mảng rỗng = tất cả": xóa nhóm cuối cùng của một người sẽ vô tình mở hết.
-- Admin (vai_tro quan_ly) luôn xem tất cả.
--
-- Đọc thẳng bảng, không qua JWT → bật/tắt có hiệu lực ngay (như co_quyen, CLAUDE.md bẫy 6).
--
-- PR này chỉ chặn ĐỌC TRỰC TIẾP bảng (RLS san_pham / ton_kho / kho_movement). Các hàm
-- SECURITY DEFINER bỏ qua RLS — danh sách sản phẩm, tìm mã, tồn kho, thẻ kho, đơn đặt,
-- phiếu nhập… sẽ gọi xem_duoc_nhom / xem_duoc_san_pham ở PR 3/4.

-- --- 1. Bảng ------------------------------------------------------------------
create table public.nguoi_dung_nhom_hang (
  nguoi_dung_id uuid primary key,
  nhom_hang_ids uuid[] not null,
  nguoi_cap_nhat_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.nguoi_dung_nhom_hang is
  '0132: có dòng = tài khoản chỉ xem các nhóm trong nhom_hang_ids; không có dòng = xem tất cả. Ghi qua RPC dat_nhom_hang_nguoi_dung.';

create trigger set_updated_at_nguoi_dung_nhom_hang
  before update on public.nguoi_dung_nhom_hang
  for each row execute function public.update_updated_at();

alter table public.nguoi_dung_nhom_hang enable row level security;
create policy "xem nhom hang nguoi dung" on public.nguoi_dung_nhom_hang
  for select to authenticated using (
    nguoi_dung_id = (select auth.uid())
    or (select public.co_quyen('phan_quyen'))
    or (select public.co_quyen('tao_tai_khoan'))
  );
-- Ghi chỉ qua RPC: thu hết quyền mặc định Supabase cấp cho bảng mới, cấp lại mỗi SELECT.
revoke all on public.nguoi_dung_nhom_hang from anon, authenticated;
grant select on public.nguoi_dung_nhom_hang to authenticated;

-- --- 2. Hàm phạm vi ------------------------------------------------------------
-- null = không giới hạn. Mảng (có thể rỗng) = chỉ các nhóm này.
create or replace function public.nhom_hang_duoc_xem()
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_vai public.vai_tro;
  v_nhom uuid[];
begin
  -- service_role / postgres (script, cron) không đi qua phạm vi người dùng.
  if v_uid is null then
    return null;
  end if;

  select nd.vai_tro into v_vai
  from public.nguoi_dung nd
  where nd.id = v_uid and nd.dang_hoat_dong;
  if v_vai is null then
    return '{}';
  end if;
  if v_vai = 'quan_ly' then
    return null;
  end if;

  select g.nhom_hang_ids into v_nhom
  from public.nguoi_dung_nhom_hang g
  where g.nguoi_dung_id = v_uid;
  return v_nhom;
end;
$$;
comment on function public.nhom_hang_duoc_xem() is
  '0132: nhóm hàng người gọi được xem — null = tất cả (Admin, tài khoản không giới hạn, service_role); mảng = chỉ các nhóm đó; tài khoản bị khóa = rỗng.';

create or replace function public.xem_duoc_nhom(p_nhom_hang_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- coalesce: null = any(...) ra NULL, mà `if not NULL` không chặn — luôn trả true/false.
  select v is null or coalesce(p_nhom_hang_id = any(v), false)
  from (select public.nhom_hang_duoc_xem() as v) x;
$$;
comment on function public.xem_duoc_nhom(uuid) is
  '0132: người gọi có được xem nhóm hàng này không. Nhóm null (mã chưa gán nhóm) chỉ người không giới hạn mới thấy.';

create or replace function public.xem_duoc_san_pham(p_san_pham_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select v is null
    or exists (select 1 from public.san_pham sp
               where sp.id = p_san_pham_id and sp.nhom_hang_id = any(v))
  from (select public.nhom_hang_duoc_xem() as v) x;
$$;
comment on function public.xem_duoc_san_pham(uuid) is
  '0132: người gọi có được xem mã hàng này không (theo nhóm của mã). Dùng trong hàm SECURITY DEFINER.';

revoke all on function public.nhom_hang_duoc_xem() from public, anon;
revoke all on function public.xem_duoc_nhom(uuid) from public, anon;
revoke all on function public.xem_duoc_san_pham(uuid) from public, anon;
grant execute on function public.nhom_hang_duoc_xem() to authenticated, service_role;
grant execute on function public.xem_duoc_nhom(uuid) to authenticated, service_role;
grant execute on function public.xem_duoc_san_pham(uuid) to authenticated, service_role;

-- --- 3. RPC đặt nhóm hàng cho một tài khoản ------------------------------------
-- p_nhom_hang_ids null = bỏ giới hạn (xem tất cả). Mảng = chỉ các nhóm này (ít nhất một).
create or replace function public.dat_nhom_hang_nguoi_dung(p_id uuid, p_nhom_hang_ids uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_la_admin boolean := coalesce((select public.vai_tro_hien_tai())::text, '') = 'quan_ly';
  v_dich_vai public.vai_tro := (select vai_tro from public.nguoi_dung where id = p_id);
  v_nhom uuid[];
begin
  if not v_la_admin and not public.co_quyen('phan_quyen') then
    raise exception 'Tài khoản chưa có quyền Phân quyền' using errcode = '42501';
  end if;
  if v_dich_vai is null then
    raise exception 'Không tìm thấy tài khoản' using errcode = '23514';
  end if;
  if v_dich_vai = 'quan_ly' then
    raise exception 'Tài khoản Quản lý/Admin luôn xem mọi nhóm hàng — không cần giới hạn' using errcode = '23514';
  end if;
  -- Người được phân quyền (không phải Admin) mà tự sửa được phạm vi của mình thì tự mở được hết.
  if not v_la_admin and p_id = v_uid then
    raise exception 'Không tự đổi nhóm hàng của chính mình — nhờ Quản lý/Admin' using errcode = '42501';
  end if;

  if p_nhom_hang_ids is null then
    delete from public.nguoi_dung_nhom_hang where nguoi_dung_id = p_id;
    return null;
  end if;

  select coalesce(array_agg(distinct x order by x), '{}') into v_nhom
  from unnest(p_nhom_hang_ids) x where x is not null;
  if cardinality(v_nhom) = 0 then
    raise exception 'Chọn ít nhất một nhóm hàng, hoặc chọn "Tất cả nhóm hàng"' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(v_nhom) x
             where not exists (select 1 from public.nhom_hang nh where nh.id = x)) then
    raise exception 'Có nhóm hàng không tồn tại — tải lại trang rồi chọn lại' using errcode = '22023';
  end if;

  insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids, nguoi_cap_nhat_id)
  values (p_id, v_nhom, v_uid)
  on conflict (nguoi_dung_id) do update
    set nhom_hang_ids = excluded.nhom_hang_ids,
        nguoi_cap_nhat_id = excluded.nguoi_cap_nhat_id;
  return v_nhom;
end;
$$;
comment on function public.dat_nhom_hang_nguoi_dung(uuid, uuid[]) is
  '0132: Admin / quyền phan_quyen đặt nhóm hàng được xem cho một tài khoản. null = tất cả; mảng ≥ 1 nhóm. Không áp cho Admin, không tự đặt cho mình.';
revoke all on function public.dat_nhom_hang_nguoi_dung(uuid, uuid[]) from public, anon;
grant execute on function public.dat_nhom_hang_nguoi_dung(uuid, uuid[]) to authenticated;

-- --- 4. RLS các bảng hàng hóa --------------------------------------------------
-- Mẫu (select …) bọc hàm để Postgres tính một lần mỗi câu lệnh (initplan), không theo dòng.
drop policy "moi vai tro doc san pham" on public.san_pham;
create policy "doc san pham theo nhom hang" on public.san_pham
  for select to authenticated using (
    (select public.nhom_hang_duoc_xem()) is null
    or nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[])
  );

drop policy "them san pham" on public.san_pham;
create policy "them san pham" on public.san_pham
  for insert to authenticated with check (
    (select public.co_quyen('tao_ma_hang'))
    and ((select public.nhom_hang_duoc_xem()) is null
         or nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[]))
  );

drop policy "sua san pham" on public.san_pham;
create policy "sua san pham" on public.san_pham
  for update to authenticated
  using (
    (select public.co_quyen('tao_ma_hang'))
    and ((select public.nhom_hang_duoc_xem()) is null
         or nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[]))
  )
  with check (
    (select public.co_quyen('tao_ma_hang'))
    and ((select public.nhom_hang_duoc_xem()) is null
         or nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[]))
  );

drop policy "doc ton kho theo pham vi" on public.ton_kho;
create policy "doc ton kho theo pham vi" on public.ton_kho
  for select to authenticated using (
    (select public.co_quyen('xem_ton_kho'))
    and (
      (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
      or ((select public.vai_tro_hien_tai()) = 'thu_kho'
          and kho_id = any((select public.kho_hien_tai())::uuid[]))
    )
    -- 0132: chỉ mã thuộc nhóm hàng được xem
    and ((select public.nhom_hang_duoc_xem()) is null
         or san_pham_id in (select sp.id from public.san_pham sp
                            where sp.nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[])))
  );

drop policy "doc so cai theo pham vi" on public.kho_movement;
create policy "doc so cai theo pham vi" on public.kho_movement
  for select to authenticated using (
    (select public.co_quyen('xem_ton_kho'))
    and (
      (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
      or ((select public.vai_tro_hien_tai()) = 'thu_kho'
          and kho_id = any((select public.kho_hien_tai())::uuid[]))
    )
    -- 0132: chỉ mã thuộc nhóm hàng được xem
    and ((select public.nhom_hang_duoc_xem()) is null
         or san_pham_id in (select sp.id from public.san_pham sp
                            where sp.nhom_hang_id = any((select public.nhom_hang_duoc_xem())::uuid[])))
  );
