-- =============================================================================
-- 0006 — Đơn đặt hàng
--
-- Quan hệ đơn đặt <-> hóa đơn trên hệ cũ là 1:1 hoàn hảo (923 <-> 923).
-- Giữ nguyên luồng đó: mỗi đơn đặt sinh đúng một phiếu xuất.
-- =============================================================================

create table public.don_dat_hang (
  id uuid primary key default uuid_generate_v4(),
  so_dh text not null unique,
  ngay_dh date not null default current_date,
  doi_tac_id uuid not null references public.doi_tac(id),
  trang_thai public.trang_thai_ddh not null default 'MOI',
  ngay_giao_du_kien date,
  nguoi_tao_id uuid references public.nguoi_dung(id),
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ddh_doi_tac on public.don_dat_hang (doi_tac_id);
-- Partial index chỉ phủ hai trạng thái còn việc phải làm. Đơn đã xuất đủ hoặc
-- đã hủy sẽ là đa số dòng sau vài tháng và không cần quét nữa.
create index idx_ddh_trang_thai on public.don_dat_hang (trang_thai)
  where trang_thai in ('MOI','DA_XUAT_MOT_PHAN');

create table public.don_dat_hang_dong (
  id uuid primary key default uuid_generate_v4(),
  -- on delete cascade chỉ dùng giữa đơn và dòng của chính nó (quan hệ sở hữu).
  don_dat_hang_id uuid not null references public.don_dat_hang(id) on delete cascade,
  san_pham_id uuid not null references public.san_pham(id),
  so_luong_dat numeric(18,4) not null check (so_luong_dat > 0),
  so_luong_da_xuat numeric(18,4) not null default 0,
  don_gia numeric(18,4) not null default 0,
  created_at timestamptz not null default now()
);
create index idx_ddh_dong_don      on public.don_dat_hang_dong (don_dat_hang_id);
create index idx_ddh_dong_san_pham on public.don_dat_hang_dong (san_pham_id);

create trigger set_updated_at_don_dat_hang
  before update on public.don_dat_hang
  for each row execute function public.update_updated_at();
