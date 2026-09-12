-- =============================================================================
-- 0004 — Danh mục nền: nhóm hàng, đơn vị tính, công đoạn, đối tác
-- =============================================================================

create table public.nhom_hang (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  -- 90 nhóm hiện đang phẳng; parent_id cho phép dựng cây 3 cấp sau mà không
  -- phải migrate lại dữ liệu.
  parent_id uuid references public.nhom_hang(id),
  thu_tu integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_nhom_hang_parent on public.nhom_hang (parent_id) where parent_id is not null;

create table public.don_vi_tinh (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trường MỚI, sửa lỗi dữ liệu số 1 của hệ cũ: KiotViet nhét công đoạn xử lý bề
-- mặt (ÉP/SƠN/CARBON/XI MẠ/NANO) vào ô Đơn vị tính, nên không trả lời được
-- "hàng sơn tồn bao nhiêu" và "một cặp là mấy cái" cùng lúc.
create table public.cong_doan (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  mau_hien_thi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sửa lỗi dữ liệu số 2: cả 4.732 dòng bán của hệ cũ gắn với một mã khách duy
-- nhất, tên khách thật nằm trong ô Ghi chú dạng chữ tự do.
create table public.doi_tac (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  loai public.loai_doi_tac not null,
  dien_thoai text,
  email text,
  dia_chi text,
  khu_vuc text,
  phuong_xa text,
  ma_so_thue text,
  ghi_chu text,
  dang_hoat_dong boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_doi_tac_loai on public.doi_tac (loai) where dang_hoat_dong;

create trigger set_updated_at_nhom_hang
  before update on public.nhom_hang
  for each row execute function public.update_updated_at();

create trigger set_updated_at_don_vi_tinh
  before update on public.don_vi_tinh
  for each row execute function public.update_updated_at();

create trigger set_updated_at_cong_doan
  before update on public.cong_doan
  for each row execute function public.update_updated_at();

create trigger set_updated_at_doi_tac
  before update on public.doi_tac
  for each row execute function public.update_updated_at();
