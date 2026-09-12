-- =============================================================================
-- 0007 — Chứng từ: MỘT bảng dùng chung cho cả bảy loại nghiệp vụ
-- =============================================================================

create table public.chung_tu (
  id uuid primary key default uuid_generate_v4(),
  so_ct text not null unique,
  loai_ct public.loai_ct not null,
  ngay_ct date not null default current_date,

  kho_id uuid not null references public.kho(id),
  kho_den_id uuid references public.kho(id),        -- chỉ CHUYEN_KHO dùng
  doi_tac_id uuid references public.doi_tac(id),
  don_dat_hang_id uuid references public.don_dat_hang(id),
  chung_tu_goc_id uuid references public.chung_tu(id),  -- trả hàng, bút toán đảo

  trang_thai public.trang_thai_ct not null default 'NHAP_LIEU',
  tong_so_luong numeric(18,4) not null default 0,
  tong_tien numeric(18,0) not null default 0,
  giam_gia numeric(18,0) not null default 0,

  -- Ở HEADER, không ở dòng: một phiếu xuất thường chỉ có một lý do chung.
  -- Cho xuất âm là quyết định có chủ đích (42 mã đang bị xuất khi tồn <= 0 trên
  -- hệ cũ; chặn cứng sẽ làm kho kẹt ngay ngày đầu và quay lại KiotViet) —
  -- nhưng bắt buộc có lý do để vào báo cáo hằng ngày cho quản lý.
  ly_do_xuat_am text,
  ghi_chu_ly_do text,

  ghi_chu text,
  nguoi_tao_id uuid references public.nguoi_dung(id),
  nguoi_duyet_id uuid references public.nguoi_dung(id),
  ngay_ghi_so timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ràng buộc nghiệp vụ ép ở tầng database, không ở tầng giao diện.
  constraint ck_chuyen_kho_co_kho_den check (
    loai_ct <> 'CHUYEN_KHO' or (kho_den_id is not null and kho_den_id <> kho_id)
  ),
  constraint ck_tra_hang_co_goc check (
    loai_ct not in ('TRA_NCC','TRA_KHACH') or chung_tu_goc_id is not null
  )
);

create index idx_chung_tu_loai_ngay on public.chung_tu (loai_ct, ngay_ct desc);
create index idx_chung_tu_kho       on public.chung_tu (kho_id);
create index idx_chung_tu_kho_den   on public.chung_tu (kho_den_id) where kho_den_id is not null;
create index idx_chung_tu_doi_tac   on public.chung_tu (doi_tac_id) where doi_tac_id is not null;
create index idx_chung_tu_ddh       on public.chung_tu (don_dat_hang_id) where don_dat_hang_id is not null;
create index idx_chung_tu_nhap_lieu on public.chung_tu (id) where trang_thai = 'NHAP_LIEU';
-- Báo cáo xuất âm hằng ngày (TQAN-06, Phase 5) đọc index này.
create index idx_chung_tu_xuat_am   on public.chung_tu (ngay_ct desc) where ly_do_xuat_am is not null;

create table public.chung_tu_dong (
  id uuid primary key default uuid_generate_v4(),
  chung_tu_id uuid not null references public.chung_tu(id) on delete cascade,
  san_pham_id uuid not null references public.san_pham(id),

  -- KHÔNG có check (> 0): DIEU_CHINH cần nhận cả số âm.
  so_luong numeric(18,4) not null,
  don_gia numeric(18,4) not null default 0,
  thanh_tien numeric(18,0) not null default 0,

  -- CHỈ dùng cho KIEM_KE: tồn sổ sách tại thời điểm đếm, để tính lệch.
  -- Nullable vì sáu loại còn lại không dùng.
  so_luong_he_thong numeric(18,4),

  ghi_chu text,
  created_at timestamptz not null default now()
);
create index idx_ct_dong_chung_tu on public.chung_tu_dong (chung_tu_id);
create index idx_ct_dong_san_pham on public.chung_tu_dong (san_pham_id);

create trigger set_updated_at_chung_tu
  before update on public.chung_tu
  for each row execute function public.update_updated_at();
