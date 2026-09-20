-- =============================================================================
-- 0055 — Đề nghị gộp mã + gợi ý mã gần giống (Phase 4, plan 04-03, D-14)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Version này đã được áp lên cloud bởi một
-- phiên làm việc khác, file nguồn không có trong repo. Trích từ catalog của
-- chính database đang chạy.
--
-- Bối cảnh nghiệp vụ (lời người dùng, 20/09): nguyên nhân xuất âm phổ biến nhất
-- KHÔNG phải "hàng về chưa nhập phiếu" mà là **một món hàng bị tách làm hai mã**
-- vì quy chuẩn đặt mã đổi giữa chừng. Kho có 100 cái nhưng trên máy chia hai mã,
-- xuất theo mã này thì mã đó âm còn mã kia vẫn còn tồn.
--
-- Phase 4 đi NỬA đường: phát hiện, hỏi, và GHI LẠI đề nghị. Việc gộp thật (dời
-- tồn và lịch sử) là năng lực riêng của một phase sau — và phải làm bằng chứng
-- từ DIEU_CHINH rồi trỏ mã cũ sang mã mới, TUYỆT ĐỐI không viết lại
-- `kho_movement` (nguyên tắc kiến trúc số 2: sổ cái chỉ thêm).
-- =============================================================================

create table if not exists public.de_nghi_gop_ma (
  id uuid primary key default uuid_generate_v4(),
  san_pham_id_a uuid not null references public.san_pham(id),
  san_pham_id_b uuid not null references public.san_pham(id),
  nguoi_de_nghi_id uuid references public.nguoi_dung(id),
  chung_tu_id uuid references public.chung_tu(id),
  trang_thai text not null default 'CHO_XU_LY'
    check (trang_thai in ('CHO_XU_LY','DA_XU_LY','TU_CHOI')),
  ghi_chu text,
  created_at timestamptz not null default now(),
  constraint ck_de_nghi_gop_ma_khac_nhau check (san_pham_id_a <> san_pham_id_b)
);

comment on table public.de_nghi_gop_ma is
  'Đề nghị gộp hai mã bị tách (D-14). Phase 4 chỉ GHI LẠI đề nghị, không thực hiện gộp. Đầu vào cho phase gộp mã sau này.';

-- Một cặp mã chỉ có MỘT đề nghị đang chờ, bất kể thứ tự a/b. least/greatest làm
-- cặp (A,B) và (B,A) trùng nhau dưới mắt index.
create unique index if not exists idx_de_nghi_gop_ma_cap_cho_xu_ly
  on public.de_nghi_gop_ma (least(san_pham_id_a, san_pham_id_b), greatest(san_pham_id_a, san_pham_id_b))
  where trang_thai = 'CHO_XU_LY';
create index if not exists idx_de_nghi_gop_ma_sp_a on public.de_nghi_gop_ma (san_pham_id_a);
create index if not exists idx_de_nghi_gop_ma_sp_b on public.de_nghi_gop_ma (san_pham_id_b);

alter table public.de_nghi_gop_ma enable row level security;

-- Ghi chỉ qua RPC ghi_de_nghi_gop_ma (SECURITY DEFINER).
revoke insert, update, delete on public.de_nghi_gop_ma from anon, authenticated;

drop policy if exists "doc de nghi gop ma" on public.de_nghi_gop_ma;
create policy "doc de nghi gop ma" on public.de_nghi_gop_ma
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) = any (array['quan_ly'::public.vai_tro, 'van_phong'::public.vai_tro]));

-- --- Ghi đề nghị -------------------------------------------------------------
create or replace function public.ghi_de_nghi_gop_ma(
  p_san_pham_id_a uuid,
  p_san_pham_id_b uuid,
  p_chung_tu_id uuid default null,
  p_ghi_chu text default null
)
returns public.de_nghi_gop_ma
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.de_nghi_gop_ma;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng đề nghị gộp mã' using errcode = '42501';
  end if;

  if p_san_pham_id_a = p_san_pham_id_b then
    raise exception 'Không thể đề nghị gộp một mã với chính nó' using errcode = '23514';
  end if;

  insert into public.de_nghi_gop_ma (san_pham_id_a, san_pham_id_b, nguoi_de_nghi_id, chung_tu_id, ghi_chu)
  values (p_san_pham_id_a, p_san_pham_id_b, auth.uid(), p_chung_tu_id, p_ghi_chu)
  on conflict (least(san_pham_id_a, san_pham_id_b), greatest(san_pham_id_a, san_pham_id_b))
    where trang_thai = 'CHO_XU_LY'
  do nothing
  returning * into v_row;

  -- Bấm lại lần hai: không có dòng mới, đọc lại đề nghị đang chờ và trả về.
  if v_row.id is null then
    select * into v_row
    from public.de_nghi_gop_ma
    where least(san_pham_id_a, san_pham_id_b) = least(p_san_pham_id_a, p_san_pham_id_b)
      and greatest(san_pham_id_a, san_pham_id_b) = greatest(p_san_pham_id_a, p_san_pham_id_b)
      and trang_thai = 'CHO_XU_LY';
  end if;

  return v_row;
end;
$$;

-- --- Gợi ý mã gần giống đang còn tồn -----------------------------------------
create or replace function public.goi_y_ma_trung(
  p_san_pham_id uuid,
  p_kho_id uuid,
  p_gioi_han integer default 5
)
returns table (
  san_pham_id uuid, ma_hang text, ten_hang text,
  kho_id uuid, ten_kho text, ton numeric, do_giong real
)
language sql
stable
security definer
set search_path = ''
as $$
  with nguon as (
    select public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang) as chuoi
    from public.san_pham sp
    where sp.id = p_san_pham_id
  )
  select sp.id, sp.ma_hang, sp.ten_hang, tk.kho_id, k.ten, tk.so_luong,
         extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang))
  from public.san_pham sp
  join public.ton_kho tk on tk.san_pham_id = sp.id
  left join public.kho k on k.id = tk.kho_id
  cross join nguon
  where sp.id <> p_san_pham_id
    and sp.dang_kinh_doanh
    -- Chỉ trả mã đang còn tồn — gợi ý mã hết tồn không giúp giải quyết xuất âm.
    and tk.so_luong > 0
    and (p_kho_id is null or tk.kho_id = p_kho_id)
    and nguon.chuoi operator(extensions.<%) public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)
  order by
    extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)) desc,
    tk.so_luong desc
  limit greatest(coalesce(p_gioi_han, 5), 1);
$$;

comment on function public.goi_y_ma_trung(uuid, uuid, integer) is
  'Gợi ý mã tên gần giống ĐANG CÒN TỒN, để màn xuất kho hỏi "hai mã này có phải một?" khi một dòng làm tồn âm (D-14). Chỉ đọc, không đổi dữ liệu.';

revoke all    on function public.ghi_de_nghi_gop_ma(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.ghi_de_nghi_gop_ma(uuid, uuid, uuid, text) to authenticated;
revoke all    on function public.goi_y_ma_trung(uuid, uuid, integer) from public, anon;
grant execute on function public.goi_y_ma_trung(uuid, uuid, integer) to authenticated;
