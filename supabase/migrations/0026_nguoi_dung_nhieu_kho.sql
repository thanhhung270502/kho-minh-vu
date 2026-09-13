-- =============================================================================
-- 0026 — D-06: một người dùng gắn nhiều kho. D-05: đổi vai trò/kho/vô hiệu hóa
-- có hiệu lực ngay ở tầng database (không đợi token hết hạn).
--
-- QUYẾT ĐỊNH KỸ THUẬT (research §Câu hỏi 1 + kiểm chứng trên cloud):
-- Không thu hồi được access token đã phát — auth.admin.signOut nhận JWT, không
-- nhận userId. Vì vậy hai helper RLS vẫn đọc claim (AUTH-03, tránh join bảng
-- theo dòng) nhưng ĐỐI CHIẾU với bảng nguoi_dung trong cùng một lượt tra: claim
-- vai_tro phải khớp cột vai_tro và dang_hoat_dong = true; kho trả về là GIAO
-- của claim với nguoi_dung_kho. Hệ quả: hạ quyền/gỡ kho/vô hiệu hóa có hiệu
-- lực ngay câu lệnh kế tiếp; nâng quyền/thêm kho có hiệu lực sau khi token làm
-- mới (tối đa jwt_expiry = 3600s, hoặc ngay khi client gọi refreshSession()).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng nối + backfill TRONG CÙNG migration — không có khoảng hở RLS rỗng.
-- -----------------------------------------------------------------------------
create table public.nguoi_dung_kho (
  nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
  kho_id uuid not null references public.kho(id),
  created_at timestamptz not null default now(),
  primary key (nguoi_dung_id, kho_id)
);
create index idx_nguoi_dung_kho_theo_kho on public.nguoi_dung_kho (kho_id);

insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
select id, kho_id from public.nguoi_dung where kho_id is not null
on conflict do nothing;

comment on column public.nguoi_dung.kho_id is
  'KHÔNG CÒN ĐỌC từ 0026. Kho của người dùng nằm ở nguoi_dung_kho. Giữ cột tới khi người dùng đồng ý xóa (02-CONTEXT D-06).';

-- -----------------------------------------------------------------------------
-- 2. Cột mới cho Phase 2: đăng nhập bằng tên đăng nhập (D-01), bắt đổi mật
--    khẩu lần đầu (D-03).
-- -----------------------------------------------------------------------------
alter table public.nguoi_dung add column phai_doi_mat_khau boolean not null default false;
alter table public.nguoi_dung add column ten_dang_nhap text;

update public.nguoi_dung nd set ten_dang_nhap = split_part(u.email, '@', 1)
from auth.users u where u.id = nd.id and nd.ten_dang_nhap is null;

alter table public.nguoi_dung add constraint uq_nguoi_dung_ten_dang_nhap unique (ten_dang_nhap);
alter table public.nguoi_dung add constraint ck_ten_dang_nhap
  check (ten_dang_nhap is null or ten_dang_nhap ~ '^[a-z0-9._-]{3,32}$');

-- -----------------------------------------------------------------------------
-- 3. RLS bảng nối.
-- -----------------------------------------------------------------------------
alter table public.nguoi_dung_kho enable row level security;

create policy "xem kho cua nguoi dung" on public.nguoi_dung_kho
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) = 'quan_ly' or nguoi_dung_id = (select auth.uid())
  );
create policy "quan ly gan kho" on public.nguoi_dung_kho
  for all to authenticated
  using ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');

-- Bài học 0023: hook chạy dưới supabase_auth_admin, cần CẢ grant LẪN policy.
grant select on public.nguoi_dung_kho to supabase_auth_admin;
create policy "auth admin doc kho nguoi dung" on public.nguoi_dung_kho
  for select to supabase_auth_admin using (true);

-- -----------------------------------------------------------------------------
-- 4. Helper vai trò: claim PHẢI khớp bảng và người dùng PHẢI đang hoạt động.
--    Thay thân hàm (chữ ký giữ nguyên) — policy gọi vai_tro_hien_tai() ở mục 3
--    phía trên dùng bản CŨ lúc tạo, hợp lệ vì create or replace không đổi OID.
-- -----------------------------------------------------------------------------
create or replace function public.vai_tro_hien_tai()
returns public.vai_tro language sql stable security definer set search_path = ''
as $$
  select nd.vai_tro
  from public.nguoi_dung nd
  where nd.id = auth.uid()
    and nd.dang_hoat_dong
    and nd.vai_tro::text = (auth.jwt() ->> 'vai_tro');
$$;

-- -----------------------------------------------------------------------------
-- 5. Helper kho đổi kiểu trả về uuid -> uuid[]: phải DROP policy phụ thuộc,
--    DROP hàm, rồi tạo lại theo đúng chữ ký mới.
-- -----------------------------------------------------------------------------
drop policy "doc ton kho theo pham vi" on public.ton_kho;
drop policy "doc so cai theo pham vi" on public.kho_movement;
drop policy "doc chung tu theo pham vi" on public.chung_tu;
drop function public.kho_hien_tai();

-- Giao của claim với bảng nối. `?` trên jsonb khớp cả phần tử mảng lẫn chuỗi
-- scalar, nên token cũ còn claim kho_id dạng chuỗi vẫn chạy đúng tới lúc hết hạn.
create function public.kho_hien_tai()
returns uuid[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(ndk.kho_id), '{}'::uuid[])
  from public.nguoi_dung_kho ndk
  join public.nguoi_dung nd on nd.id = ndk.nguoi_dung_id
  where ndk.nguoi_dung_id = auth.uid()
    and nd.dang_hoat_dong
    and (auth.jwt() -> 'kho_id') ? ndk.kho_id::text;
$$;
revoke all    on function public.kho_hien_tai() from public, anon;
grant execute on function public.kho_hien_tai() to authenticated;
comment on function public.kho_hien_tai() is
  'Mảng kho người dùng được phân = claim kho_id GIAO bảng nguoi_dung_kho, rỗng nếu người dùng bị vô hiệu hóa. Trong policy LUÔN viết kho_id = any((select public.kho_hien_tai())::uuid[]) — Postgres phân giải "any((select ...))" thành dạng ANY(subquery) (so từng DÒNG, không so mảng) nếu thiếu cast ::uuid[], ném lỗi 42883 "uuid = uuid[]".';

create policy "doc ton kho theo pham vi" on public.ton_kho
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or ((select public.vai_tro_hien_tai()) = 'thu_kho'
        and kho_id = any((select public.kho_hien_tai())::uuid[]))
  );
create policy "doc so cai theo pham vi" on public.kho_movement
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or ((select public.vai_tro_hien_tai()) = 'thu_kho'
        and kho_id = any((select public.kho_hien_tai())::uuid[]))
  );
create policy "doc chung tu theo pham vi" on public.chung_tu
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or ((select public.vai_tro_hien_tai()) = 'thu_kho'
        and (kho_id = any((select public.kho_hien_tai())::uuid[])
             or kho_den_id = any((select public.kho_hien_tai())::uuid[])))
  );

-- -----------------------------------------------------------------------------
-- 6. Hook: kho_id thành mảng.
-- -----------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  v_vai_tro public.vai_tro;
  v_hoat_dong boolean;
  v_kho jsonb;
begin
  select vai_tro, dang_hoat_dong into v_vai_tro, v_hoat_dong
  from public.nguoi_dung where id = (event->>'user_id')::uuid;

  select coalesce(jsonb_agg(kho_id), '[]'::jsonb) into v_kho
  from public.nguoi_dung_kho where nguoi_dung_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if v_vai_tro is not null and coalesce(v_hoat_dong, false) then
    claims := jsonb_set(claims, '{vai_tro}', to_jsonb(v_vai_tro));
    claims := jsonb_set(claims, '{kho_id}', v_kho);
  end if;
  return jsonb_build_object('claims', claims);
end;
$$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- -----------------------------------------------------------------------------
-- 7. RPC hồ sơ người dùng — một transaction cho nguoi_dung + nguoi_dung_kho.
--    SECURITY INVOKER: RLS "quan ly sua nguoi dung" và "quan ly gan kho" tự
--    chặn người khác, và trigger nhật ký (plan 02) ghi đúng auth.uid() của
--    quản lý đang thao tác.
-- -----------------------------------------------------------------------------
create or replace function public.luu_ho_so_nguoi_dung(
  p_id uuid, p_ho_ten text, p_ten_dang_nhap text, p_vai_tro public.vai_tro,
  p_kho_ids uuid[], p_phai_doi_mat_khau boolean
) returns void language plpgsql set search_path = '' as $$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được sửa tài khoản' using errcode = '42501';
  end if;
  if p_vai_tro = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
    raise exception 'Thủ kho phải được gán ít nhất một kho' using errcode = '23514';
  end if;
  insert into public.nguoi_dung (id, ho_ten, ten_dang_nhap, vai_tro, phai_doi_mat_khau)
  values (p_id, p_ho_ten, p_ten_dang_nhap, p_vai_tro, p_phai_doi_mat_khau)
  on conflict (id) do update set
    ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
    vai_tro = excluded.vai_tro, phai_doi_mat_khau = excluded.phai_doi_mat_khau;
  -- Chỉ thủ kho gắn kho; vai trò khác thấy mọi kho nên xóa gán kho.
  delete from public.nguoi_dung_kho
  where nguoi_dung_id = p_id
    and (p_vai_tro <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
  if p_vai_tro = 'thu_kho' then
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select p_id, unnest(p_kho_ids) on conflict do nothing;
  end if;
end $$;
revoke all    on function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean) from public, anon;
grant execute on function public.luu_ho_so_nguoi_dung(uuid, text, text, public.vai_tro, uuid[], boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Người dùng tự gỡ cờ sau khi đổi mật khẩu (RLS không cho họ sửa nguoi_dung).
-- -----------------------------------------------------------------------------
create or replace function public.da_doi_mat_khau()
returns void language sql security definer set search_path = '' as $$
  update public.nguoi_dung set phai_doi_mat_khau = false where id = (select auth.uid());
$$;
revoke all    on function public.da_doi_mat_khau() from public, anon;
grant execute on function public.da_doi_mat_khau() to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Thu hồi phiên: chặn LÀM MỚI token. Access token đang cầm vẫn hợp lệ tới
--    hết hạn — lớp chặn tức thời là helper ở mục 4-5.
-- -----------------------------------------------------------------------------
create or replace function public.thu_hoi_phien_nguoi_dung(p_nguoi_dung_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_so integer;
begin
  delete from auth.sessions where user_id = p_nguoi_dung_id;
  get diagnostics v_so = row_count;
  return v_so;
end $$;
revoke all    on function public.thu_hoi_phien_nguoi_dung(uuid) from public, anon, authenticated;
grant execute on function public.thu_hoi_phien_nguoi_dung(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (mẫu lấy từ 0016).
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
