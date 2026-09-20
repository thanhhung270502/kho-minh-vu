-- =============================================================================
-- 0055 — Đề nghị gộp mã trùng (D-14)
--
-- Nguyên nhân gốc của xuất âm theo lời người dùng (20/09): cùng một món hàng
-- vật lý bị tách thành hai mã vì quy chuẩn đặt mã đổi giữa chừng. Phase 4 đi
-- NỬA đường: phát hiện + hỏi + ghi lại đề nghị. Gộp thật (sinh cặp DIEU_CHINH,
-- ngừng kinh doanh mã cũ, trỏ sang mã mới) là phase riêng — file này TUYỆT ĐỐI
-- không đụng kho_movement/ton_kho/san_pham, chỉ ghi một dòng đề nghị.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Bảng đề nghị — khuôn "ghi lại quyết định, không tự hành động" của
-- anh_xa_ghi_chu_kiotviet (0033): RLS chỉ SELECT theo vai trò, ghi chỉ qua RPC.
-- -----------------------------------------------------------------------------
create table public.de_nghi_gop_ma (
  id uuid primary key default uuid_generate_v4(),
  san_pham_id_a uuid not null references public.san_pham(id),
  san_pham_id_b uuid not null references public.san_pham(id),
  nguoi_de_nghi_id uuid references public.nguoi_dung(id),
  chung_tu_id uuid references public.chung_tu(id),
  trang_thai text not null default 'CHO_XU_LY' check (trang_thai in ('CHO_XU_LY','DA_XU_LY','TU_CHOI')),
  ghi_chu text,
  created_at timestamptz not null default now(),
  constraint ck_de_nghi_gop_ma_khac_nhau check (san_pham_id_a <> san_pham_id_b)
);

-- Chống ghi trùng đề nghị cho cùng một cặp còn chờ xử lý — bấm nút hai lần
-- không tạo hai dòng. least/greatest bỏ qua thứ tự (A,B) hay (B,A).
create unique index idx_de_nghi_gop_ma_cap_cho_xu_ly
  on public.de_nghi_gop_ma (least(san_pham_id_a, san_pham_id_b), greatest(san_pham_id_a, san_pham_id_b))
  where trang_thai = 'CHO_XU_LY';

create index idx_de_nghi_gop_ma_sp_a on public.de_nghi_gop_ma (san_pham_id_a);
create index idx_de_nghi_gop_ma_sp_b on public.de_nghi_gop_ma (san_pham_id_b);

alter table public.de_nghi_gop_ma enable row level security;

create policy "doc de nghi gop ma" on public.de_nghi_gop_ma
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- Ghi chỉ qua RPC ghi_de_nghi_gop_ma (SECURITY DEFINER) — đúng khuôn 0033.
revoke insert, update, delete on public.de_nghi_gop_ma from anon, authenticated;

comment on table public.de_nghi_gop_ma is
  'D-14: đề nghị gộp hai mã trùng, chỉ ghi lại quyết định, không có tác dụng phụ nào lên tồn/sổ cái. Gộp thật là phase riêng. Ghi chỉ qua RPC ghi_de_nghi_gop_ma.';

-- -----------------------------------------------------------------------------
-- (b) Ghi đề nghị — khuôn quyet_ghi_chu của 0033 (SECURITY DEFINER tự kiểm
-- vai trò, on conflict do nothing rồi đọc lại dòng đang chờ nếu đã có).
-- -----------------------------------------------------------------------------
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

revoke all    on function public.ghi_de_nghi_gop_ma(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.ghi_de_nghi_gop_ma(uuid, uuid, uuid, text) to authenticated;

comment on function public.ghi_de_nghi_gop_ma(uuid, uuid, uuid, text) is
  'D-14: ghi một đề nghị gộp mã CHO_XU_LY. Chỉ quan_ly/van_phong gọi được. Không đụng ton_kho/kho_movement/san_pham — chỉ insert vào de_nghi_gop_ma. Gọi lại cho cùng một cặp đang chờ trả về đúng dòng đã có, không tạo dòng mới.';

-- -----------------------------------------------------------------------------
-- (c) Gợi ý mã tên gần giống đang còn tồn — cùng cách so khớp với tim_san_pham
-- (0022/0029): ILIKE chuỗi con hoặc word_similarity, cùng ngưỡng mặc định của
-- pg_trgm, không tự đặt ngưỡng mới.
-- -----------------------------------------------------------------------------
create or replace function public.goi_y_ma_trung(
  p_san_pham_id uuid,
  p_kho_id uuid,
  p_gioi_han int default 5
)
returns table (
  san_pham_id uuid, ma_hang text, ten_hang text, kho_id uuid, ten_kho text,
  ton numeric, do_giong real
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

revoke all    on function public.goi_y_ma_trung(uuid, uuid, int) from public, anon;
grant execute on function public.goi_y_ma_trung(uuid, uuid, int) to authenticated;

comment on function public.goi_y_ma_trung(uuid, uuid, int) is
  'D-14: gợi ý mã tên gần giống p_san_pham_id đang còn tồn (tk.so_luong > 0), lọc theo p_kho_id nếu có. SECURITY DEFINER vì san_pham đã thu quyền đọc mức bảng, nhưng KHÔNG trả bất kỳ cột giá vốn nào. Dùng chung cách so khớp (ILIKE + word_similarity) với tim_san_pham (0022/0029).';
