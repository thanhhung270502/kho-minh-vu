-- =============================================================================
-- 0008 — Sổ cái kho bất biến, bảng tồn tổng hợp, trigger tồn + giá vốn
--
-- Đây là migration rủi ro cao nhất của Phase 1. Đọc kỹ comment về thứ tự khóa
-- trước khi sửa bất cứ dòng nào trong cap_nhat_ton_va_gia_von().
-- =============================================================================

-- SỔ CÁI — APPEND ONLY. Không UPDATE, không DELETE, không ngoại lệ.
-- Nguồn sự thật để dựng lại tồn bất cứ lúc nào và để truy vết khi lệch.
create table public.kho_movement (
  id uuid primary key default uuid_generate_v4(),
  ngay timestamptz not null default now(),
  kho_id uuid not null references public.kho(id),
  san_pham_id uuid not null references public.san_pham(id),
  so_luong numeric(18,4) not null,               -- dương = nhập, âm = xuất
  gia_von_tai_thoi_diem numeric(18,4) not null,  -- để thẻ kho dựng lại giá trị lịch sử
  chung_tu_id uuid references public.chung_tu(id),
  chung_tu_dong_id uuid references public.chung_tu_dong(id),
  la_but_toan_dao boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ck_so_luong_khac_khong check (so_luong <> 0)
);
create index idx_movement_kho_san_pham  on public.kho_movement (kho_id, san_pham_id, ngay desc);
create index idx_movement_chung_tu      on public.kho_movement (chung_tu_id) where chung_tu_id is not null;
create index idx_movement_san_pham_ngay on public.kho_movement (san_pham_id, ngay desc);

-- Bảng tổng hợp: trả lời "tồn là bao nhiêu" trong một phần nghìn giây.
-- Sổ cái trả lời "vì sao tồn là con số này". Cần cả hai: chỉ sổ cái thì mỗi lần
-- mở màn tồn phải cộng dồn hàng trăm nghìn dòng; chỉ bảng tồn thì lệch số không
-- truy được. Trigger dưới đây giữ hai bảng khớp nhau, job ở 0015 đối chiếu.
--
-- KHÔNG có cột gia_von_bq. Giá vốn tính toàn công ty, sống ở san_pham.gia_von.
-- Đây là điểm lệch có chủ đích so với tài liệu thiết kế gốc.
create table public.ton_kho (
  kho_id uuid not null references public.kho(id),
  san_pham_id uuid not null references public.san_pham(id),
  so_luong numeric(18,4) not null default 0,
  cap_nhat_luc timestamptz not null default now(),
  primary key (kho_id, san_pham_id)
);
create index idx_ton_kho_san_pham on public.ton_kho (san_pham_id);
create index idx_ton_kho_am       on public.ton_kho (kho_id, san_pham_id) where so_luong < 0;

-- -----------------------------------------------------------------------------
-- Trigger cập nhật tồn và tính giá vốn bình quân gia quyền di động.
--
-- THỨ TỰ BỐN BƯỚC DƯỚI ĐÂY LÀ BẮT BUỘC. Không sắp xếp lại.
-- -----------------------------------------------------------------------------
create or replace function public.cap_nhat_ton_va_gia_von()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gia_von_cu numeric(18,4);
  v_gia_von_moi numeric(18,4);
  v_ton_cu numeric(18,4);
begin
  -- BƯỚC 1 — KHÓA DÒNG san_pham TRƯỚC MỌI THỨ KHÁC.
  --
  -- Đây là điểm serialize duy nhất. Đảo bước 1 và bước 2 sẽ tạo lost update:
  -- hai phiếu nhập cùng mã chạy gần như đồng thời, cả hai đọc tồn và giá cũ
  -- trước khi cái kia commit, một bản ghi cost bị mất, giá vốn cuối cùng sai.
  --
  -- Lỗi này KHÔNG lộ ra trong test một-transaction. Nó chỉ lộ dưới tải thật,
  -- và lúc đó thì đã lệch tiền nhiều tháng. Test 2 kết nối ở
  -- supabase/tests/ton_kho_test.sql tồn tại chính vì lý do này.
  --
  -- READ COMMITTED (mặc định) + khóa dòng tường minh là đủ. Không cần
  -- SERIALIZABLE, vốn kéo theo chi phí retry-on-conflict khó xử lý đúng
  -- bên trong một trigger.
  select gia_von into v_gia_von_cu
  from public.san_pham
  where id = new.san_pham_id
  for update;

  -- BƯỚC 2 — đọc tồn cũ TOÀN CÔNG TY. An toàn vì đã giữ khóa ở bước 1:
  -- transaction thứ hai buộc phải đợi tới khi transaction này commit.
  select coalesce(sum(so_luong), 0) into v_ton_cu
  from public.ton_kho
  where san_pham_id = new.san_pham_id;

  -- BƯỚC 3 — cập nhật tồn của đúng kho phát sinh.
  insert into public.ton_kho (kho_id, san_pham_id, so_luong, cap_nhat_luc)
  values (new.kho_id, new.san_pham_id, new.so_luong, now())
  on conflict (kho_id, san_pham_id)
  do update set
    so_luong = public.ton_kho.so_luong + excluded.so_luong,
    cap_nhat_luc = now();

  -- BƯỚC 4 — giá vốn CHỈ tính lại khi nhập. Xuất không đổi giá vốn.
  if new.so_luong > 0 then
    if (v_ton_cu + new.so_luong) = 0 then
      v_gia_von_moi := v_gia_von_cu;   -- tránh chia 0
    else
      v_gia_von_moi := ((v_ton_cu * v_gia_von_cu) + (new.so_luong * new.gia_von_tai_thoi_diem))
                       / (v_ton_cu + new.so_luong);
    end if;
  else
    v_gia_von_moi := v_gia_von_cu;
  end if;

  update public.san_pham
  set gia_von = v_gia_von_moi,
      lan_phat_sinh_cuoi = now()
  where id = new.san_pham_id;

  return new;
end;
$$;

create trigger cap_nhat_ton_sau_khi_ghi_so_cai
  after insert on public.kho_movement
  for each row execute function public.cap_nhat_ton_va_gia_von();

-- -----------------------------------------------------------------------------
-- Hai lớp chặn sửa/xóa sổ cái. Cần CẢ HAI, không lớp nào thừa.
-- -----------------------------------------------------------------------------

-- LỚP 1 — thu hồi quyền.
-- Supabase mặc định chạy ALTER DEFAULT PRIVILEGES IN SCHEMA public
-- GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, nên mọi
-- bảng mới TỰ ĐỘNG có UPDATE/DELETE cho cả service_role. Privilege GRANT là một
-- lớp riêng, độc lập với RLS — service_role có BYPASSRLS nên RLS không cản nó.
-- Nhắm đích danh từng role, không REVOKE FROM PUBLIC (quyền được cấp trực tiếp
-- cho từng role chứ không đi qua PUBLIC).
revoke update, delete on public.kho_movement from anon, authenticated, service_role;

-- LỚP 2 — trigger.
-- Cần lớp này vì REVOKE KHÔNG chặn được chủ sở hữu bảng (role postgres, dùng để
-- chạy migration và trong SQL Editor): quyền sở hữu không bị REVOKE loại bỏ.
-- Trigger chặn được MỌI role kể cả owner và superuser.
create or replace function public.chan_sua_xoa_so_cai()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Sổ cái kho_movement là bất biến, không được sửa hoặc xóa (thao tác: %)', tg_op
    using errcode = '23514';  -- check_violation, khớp map trong src/shared/lib/errors.ts
end;
$$;

create trigger chan_sua_xoa_kho_movement
  before update or delete on public.kho_movement
  for each row execute function public.chan_sua_xoa_so_cai();

comment on table public.kho_movement is
  'Sổ cái kho, append-only. Muốn sửa một movement đã ghi thì cách duy nhất là hủy chứng từ sinh ra nó để tạo bút toán đảo (xem huy_chung_tu ở 0012). Đó là ý đồ thiết kế, không phải hạn chế.';
