-- =============================================================================
-- 0005 — san_pham, bảng trung tâm (3.266 dòng) + index tìm kiếm không dấu
-- =============================================================================

create table public.san_pham (
  id uuid primary key default uuid_generate_v4(),
  ma_hang text not null,
  ten_hang text not null,
  barcode text,
  nhom_hang_id uuid references public.nhom_hang(id),

  -- HAI cột độc lập. Đây là toàn bộ lý do tồn tại của lỗi dữ liệu số 1:
  -- hệ cũ có một ô duy nhất chứa lẫn cả hai khái niệm.
  dvt_id uuid references public.don_vi_tinh(id),
  cong_doan_id uuid references public.cong_doan(id),

  -- Số đơn vị cơ bản trong 1 ĐVT. Hiện toàn bộ 3.266 mã đều bằng 1, nhưng
  -- 148 mã đơn vị CẶP là lý do cột này phải có ngay từ đầu.
  quy_doi numeric(18,4) not null default 1,

  -- Tiền dùng numeric, KHÔNG float. Cộng dồn tiền bằng float sẽ lệch sổ.
  -- gia_von là giá vốn bình quân gia quyền di động TOÀN CÔNG TY (một mã một giá,
  -- dù nằm ở kho nào). Chỉ trigger cap_nhat_ton_va_gia_von ghi được cột này —
  -- 0014b thu hồi quyền ghi của mọi client.
  gia_von numeric(18,4) not null default 0,
  gia_ban numeric(18,4) not null default 0,

  ton_toi_thieu numeric(18,4) not null default 0,
  ton_toi_da numeric(18,4),
  hinh_anh_url text,
  vi_tri_ke text,
  dang_kinh_doanh boolean not null default true,
  ghi_chu text,

  -- Cập nhật bởi trigger giá vốn ở 0008. RPC tim_san_pham ở 0013 dùng cột này
  -- để xếp mã phát sinh gần đây lên trước — chỉ 1.223/3.266 mã luân chuyển
  -- trong 10 ngày nên thứ tự này quan trọng ngang việc tìm đúng.
  lan_phat_sinh_cuoi timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- KHÔNG có cột tồn ở đây. Tồn là kết quả của sổ cái, sống ở bảng ton_kho (0008).
-- Thêm cột tồn vào đây là vi phạm nguyên tắc kiến trúc số 1.

create unique index idx_san_pham_ma_hang_unique on public.san_pham (ma_hang);
create index idx_san_pham_nhom_hang   on public.san_pham (nhom_hang_id);
create index idx_san_pham_cong_doan   on public.san_pham (cong_doan_id);
create index idx_san_pham_barcode     on public.san_pham (barcode) where barcode is not null;
create index idx_san_pham_kinh_doanh  on public.san_pham (id) where dang_kinh_doanh;

-- Tìm đồng thời theo mã và tên, gõ không dấu vẫn ra kết quả có dấu.
-- Biểu thức ở đây phải khớp TỪNG KÝ TỰ với biểu thức trong tim_san_pham (0013),
-- nếu không planner sẽ không nhận ra và chuyển sang Seq Scan.
create index idx_san_pham_tim_kiem
  on public.san_pham
  using gin (
    public.f_unaccent(coalesce(ma_hang,'') || ' ' || coalesce(ten_hang,''))
    extensions.gin_trgm_ops
  );

create trigger set_updated_at_san_pham
  before update on public.san_pham
  for each row execute function public.update_updated_at();
