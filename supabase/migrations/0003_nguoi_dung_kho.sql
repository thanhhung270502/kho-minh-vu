-- =============================================================================
-- 0003 — nguoi_dung, kho, và hai helper đọc quyền từ JWT
-- =============================================================================

create table public.kho (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  dia_chi text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PK CHÍNH LÀ auth.users.id, không sinh uuid mới: một tài khoản Supabase Auth
-- tương ứng đúng một dòng nguoi_dung.
--
-- `on delete cascade` ở đây là ngoại lệ duy nhất của dự án. Xóa tài khoản Auth
-- mà để lại dòng nguoi_dung mồ côi sẽ làm custom_access_token_hook trả claim
-- rỗng cho user id đó nếu id bị cấp lại.
create table public.nguoi_dung (
  id uuid primary key references auth.users(id) on delete cascade,
  ho_ten text not null,
  vai_tro public.vai_tro not null default 'chi_xem',
  -- Nullable có chủ đích: quan_ly và van_phong không gắn kho cố định.
  -- Ràng buộc "thu_kho phải có kho" kiểm ở màn Cài đặt (Phase 2), không ép bằng
  -- CHECK vì sẽ chặn việc tạo tài khoản trước rồi gán kho sau.
  kho_id uuid references public.kho(id),
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_nguoi_dung_kho on public.nguoi_dung (kho_id) where kho_id is not null;

create trigger set_updated_at_kho
  before update on public.kho
  for each row execute function public.update_updated_at();

create trigger set_updated_at_nguoi_dung
  before update on public.nguoi_dung
  for each row execute function public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Helper đọc quyền từ JWT claim.
--
-- Vì sao nằm ở 0003 chứ không ở 0014 (migration RLS): RPC ghi_so_chung_tu và
-- huy_chung_tu ở 0011/0012 gọi vai_tro_hien_tai() để kiểm quyền tường minh
-- (SECURITY DEFINER bỏ qua RLS nên phải tự kiểm). Đặt helper ở 0014 tạo phụ
-- thuộc ngược. Helper chỉ cần enum vai_tro từ 0002 nên 0003 là sớm nhất hợp lệ.
--
-- Vì sao đọc từ auth.jwt() chứ không truy vấn bảng: policy phải
-- `select vai_tro from nguoi_dung where id = auth.uid()` sẽ chạy MỖI DÒNG.
-- Quét bảng tồn 3.266 mã sẽ chậm thấy rõ.
-- -----------------------------------------------------------------------------
create or replace function public.vai_tro_hien_tai()
returns public.vai_tro
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'vai_tro', '')::public.vai_tro;
$$;

create or replace function public.kho_hien_tai()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'kho_id', '')::uuid;
$$;

comment on function public.vai_tro_hien_tai() is
  'Đọc vai trò từ JWT claim. Trong policy LUÔN bọc (select public.vai_tro_hien_tai()) — bọc subquery làm Postgres cache một lần mỗi câu lệnh thay vì gọi lại mỗi dòng.';

grant execute on function public.vai_tro_hien_tai() to authenticated;
grant execute on function public.kho_hien_tai()    to authenticated;
