-- =============================================================================
-- 0085 — Bộ mã hóa quy chuẩn mã hàng (Quy chuẩn mã, phần C)
--
-- Từ điển hãng / dòng / linh kiện / xử lý / màu đồng bộ hằng ngày từ sheet
-- "Quy chuẩn mã" do bên làm mã cập nhật. Hàm tách mã (TypeScript,
-- features/product-codes) đọc bảng này.
--
-- Chỉ ghi qua RPC dong_bo_ma_hoa: thay TOÀN BỘ trong một transaction, và từ
-- chối (giữ nguyên từ điển) khi dữ liệu nguồn hỏng — thiếu hẳn một loại, trùng
-- mã, hoặc một loại giảm quá nửa (sheet bị cắt, IMPORTRANGE lỗi). Mọi lần chạy,
-- kể cả lần lỗi, đều vào ma_hoa_dong_bo.
-- =============================================================================

create table public.ma_hoa (
  id uuid primary key default uuid_generate_v4(),
  loai text not null check (loai in ('hang', 'dong', 'linh_kien', 'xu_ly', 'mau')),
  ma text not null check (btrim(ma) <> ''),
  ten text not null default '',
  -- Chỉ dòng xe: mã hãng NẰM CÙNG DÒNG sheet (khóa hãng+dòng của TRA_CUU).
  ma_hang text,
  -- Thứ tự dòng trong sheet — MATCH của Sheets lấy dòng đầu tiên khớp.
  thu_tu integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((loai = 'dong') = (ma_hang is not null))
);

-- Sheets so khớp không phân biệt hoa thường → mã trùng theo chữ hoa.
create unique index uq_ma_hoa on public.ma_hoa (loai, upper(coalesce(ma_hang, '')), upper(ma));
create index idx_ma_hoa_loai on public.ma_hoa (loai, thu_tu);

create trigger set_updated_at_ma_hoa
  before update on public.ma_hoa
  for each row execute function public.update_updated_at();

create table public.ma_hoa_dong_bo (
  id uuid primary key default uuid_generate_v4(),
  bat_dau timestamptz not null default clock_timestamp(),
  trang_thai text not null check (trang_thai in ('thanh_cong', 'loi')),
  -- 'cron' | 'tay' | nguồn khác (test) — để biết lần nào tự chạy, lần nào bấm tay.
  nguon text not null,
  so_muc jsonb not null default '{}'::jsonb,
  loi text,
  nguoi_chay_id uuid default auth.uid()
);
create index idx_ma_hoa_dong_bo_bat_dau on public.ma_hoa_dong_bo (bat_dau desc);

alter table public.ma_hoa enable row level security;
alter table public.ma_hoa_dong_bo enable row level security;

create policy "moi vai tro doc ma hoa" on public.ma_hoa for select to authenticated using (true);
create policy "moi vai tro doc nhat ky dong bo ma hoa" on public.ma_hoa_dong_bo for select to authenticated using (true);

-- Không ai ghi thẳng — kể cả quản lý. Thu quyền mức bảng để lệnh ghi báo 42501
-- thay vì "thành công 0 dòng" im lặng của RLS.
revoke insert, update, delete on public.ma_hoa from anon, authenticated;
revoke insert, update, delete on public.ma_hoa_dong_bo from anon, authenticated;

-- --- dong_bo_ma_hoa ----------------------------------------------------------
-- p_ban_ghi: mảng {loai, ma, ten, ma_hang?, thu_tu} — lớp TypeScript đã chuyển
-- 10 cột sheet sang dạng này. Trả {thanh_cong, so_muc, loi}; lỗi dữ liệu KHÔNG
-- raise (raise sẽ rollback luôn dòng nhật ký) — chỉ lỗi quyền mới raise.
create or replace function public.dong_bo_ma_hoa(p_ban_ghi jsonb, p_nguon text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loai text;
  v_moi int;
  v_cu int;
  v_so_muc jsonb;
  v_loi text;
  v_ten_loai constant jsonb := '{"hang": "hãng xe", "dong": "dòng xe", "linh_kien": "linh kiện", "xu_ly": "xử lý", "mau": "màu"}';
begin
  -- Job đồng bộ gọi bằng service role; postgres chạy script không có JWT.
  if not (coalesce((select auth.role()), 'service_role') = 'service_role'
          or (select public.vai_tro_hien_tai()) = 'quan_ly') then
    raise exception 'Chỉ quản lý hoặc job đồng bộ cập nhật được bộ mã hóa' using errcode = '42501';
  end if;

  if p_ban_ghi is null or jsonb_typeof(p_ban_ghi) <> 'array' then
    v_loi := 'Dữ liệu đồng bộ không phải một mảng.';
  end if;

  if v_loi is null then
    create temp table if not exists _ma_hoa_moi (
      loai text, ma text, ten text, ma_hang text, thu_tu int
    ) on commit drop;
    truncate _ma_hoa_moi;
    insert into _ma_hoa_moi
    select btrim(e->>'loai'), btrim(e->>'ma'), btrim(coalesce(e->>'ten', '')),
           nullif(btrim(coalesce(e->>'ma_hang', '')), ''), coalesce((e->>'thu_tu')::int, 0)
    from jsonb_array_elements(p_ban_ghi) e;

    select jsonb_object_agg(loai, n) into v_so_muc
    from (select loai, count(*) as n from _ma_hoa_moi group by loai) c;
    v_so_muc := coalesce(v_so_muc, '{}'::jsonb);

    if exists (select 1 from _ma_hoa_moi where loai not in ('hang', 'dong', 'linh_kien', 'xu_ly', 'mau')
                                            or coalesce(ma, '') = '' or ((loai = 'dong') <> (ma_hang is not null))) then
      v_loi := 'Có mục sai dạng (loại lạ, thiếu mã, hoặc dòng xe thiếu mã hãng).';
    end if;
  end if;

  if v_loi is null then
    for v_loai in select * from jsonb_object_keys(v_ten_loai) loop
      v_moi := coalesce((v_so_muc->>v_loai)::int, 0);
      v_cu := (select count(*) from public.ma_hoa where loai = v_loai);
      if v_moi = 0 then
        v_loi := format('Sheet không có mục %s nào — có thể sheet đổi cấu trúc hoặc lỗi IMPORTRANGE.', v_ten_loai->>v_loai);
        exit;
      end if;
      if v_moi * 2 < v_cu then
        v_loi := format('Số %s giảm bất thường (%s → %s) — có thể sheet bị cắt. Giữ nguyên bộ mã hóa cũ.',
                        v_ten_loai->>v_loai, v_cu, v_moi);
        exit;
      end if;
    end loop;
  end if;

  if v_loi is null then
    select format('Trùng mã %s "%s" trong sheet.', v_ten_loai->>loai, min(ma)) into v_loi
    from _ma_hoa_moi
    group by loai, upper(coalesce(ma_hang, '')), upper(ma)
    having count(*) > 1
    limit 1;
  end if;

  if v_loi is not null then
    insert into public.ma_hoa_dong_bo (trang_thai, nguon, so_muc, loi)
    values ('loi', p_nguon, coalesce(v_so_muc, '{}'::jsonb), v_loi);
    return jsonb_build_object('thanh_cong', false, 'so_muc', coalesce(v_so_muc, '{}'::jsonb), 'loi', v_loi);
  end if;

  delete from public.ma_hoa;
  insert into public.ma_hoa (loai, ma, ten, ma_hang, thu_tu)
  select loai, ma, ten, ma_hang, thu_tu from _ma_hoa_moi;

  insert into public.ma_hoa_dong_bo (trang_thai, nguon, so_muc)
  values ('thanh_cong', p_nguon, v_so_muc);

  return jsonb_build_object('thanh_cong', true, 'so_muc', v_so_muc, 'loi', null);
end;
$$;

revoke all    on function public.dong_bo_ma_hoa(jsonb, text) from public, anon;
grant execute on function public.dong_bo_ma_hoa(jsonb, text) to authenticated, service_role;

comment on function public.dong_bo_ma_hoa(jsonb, text) is
  'Quy chuẩn mã (C): thay toàn bộ bộ mã hóa trong một transaction. Từ chối (giữ nguyên từ điển, ghi nhật ký lỗi) khi thiếu loại, trùng mã, hoặc một loại giảm quá nửa. Chỉ quản lý hoặc service role (job cron).';
