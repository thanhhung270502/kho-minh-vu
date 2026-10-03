-- =============================================================================
-- 0090 — Đơn nhiều người nhận (Phase 18, NNHAN-01/02/06)
--
-- Bảng nối là NGUỒN SỰ THẬT duy nhất của người nhận:
--   don_dat_hang_nguoi_nhan (đơn) và chung_tu_nguoi_nhan (hóa đơn).
-- Cột nguoi_nhan_id cũ trên don_dat_hang / chung_tu giữ nguyên dữ liệu nhưng
-- ngừng đọc/ghi. "Nội bộ" từ nay nghĩa là doi_tac_id IS NULL.
--
-- Quyết định (18-CONTEXT):
--   D1  gán người nhận cho dòng => tự thêm vào danh sách đơn (trigger ở DB)
--   D2  dòng nguoi_nhan_id NULL = hàng chung của cả đơn
--   D3  đơn nội bộ phải có >= 1 người nhận; đơn đối tác được phép không có
--
-- Client không ghi trực tiếp bảng nối; chỉ qua tao_don / dat_nguoi_nhan_don.
-- Không đụng hoan_thanh_don, ghi_so_chung_tu, dong_chung_tu, các RPC đọc (0091).
-- =============================================================================

-- ─── 1. Bảng nối và cột dòng ────────────────────────────────────────────────
create table public.don_dat_hang_nguoi_nhan (
  don_dat_hang_id uuid not null references public.don_dat_hang(id),
  nguoi_nhan_id   uuid not null references public.nhan_vien_phu_trach(id),
  thu_tu          integer not null,
  created_at      timestamptz not null default now(),
  primary key (don_dat_hang_id, nguoi_nhan_id)
);
create index idx_ddh_nguoi_nhan_theo_nguoi on public.don_dat_hang_nguoi_nhan (nguoi_nhan_id);

create table public.chung_tu_nguoi_nhan (
  chung_tu_id   uuid not null references public.chung_tu(id),
  nguoi_nhan_id uuid not null references public.nhan_vien_phu_trach(id),
  thu_tu        integer not null,
  created_at    timestamptz not null default now(),
  primary key (chung_tu_id, nguoi_nhan_id)
);
create index idx_chung_tu_nguoi_nhan_theo_nguoi on public.chung_tu_nguoi_nhan (nguoi_nhan_id);

alter table public.don_dat_hang_dong add column nguoi_nhan_id uuid references public.nhan_vien_phu_trach(id);
alter table public.chung_tu_dong     add column nguoi_nhan_id uuid references public.nhan_vien_phu_trach(id);
create index idx_ddh_dong_nguoi_nhan on public.don_dat_hang_dong (nguoi_nhan_id) where nguoi_nhan_id is not null;
create index idx_ct_dong_nguoi_nhan on public.chung_tu_dong (nguoi_nhan_id) where nguoi_nhan_id is not null;

-- ─── 2. RLS: chỉ đọc, thừa hưởng phạm vi của bảng cha ──────────────────────
alter table public.don_dat_hang_nguoi_nhan enable row level security;
alter table public.chung_tu_nguoi_nhan enable row level security;

create policy "doc nguoi nhan don" on public.don_dat_hang_nguoi_nhan
  for select to authenticated
  using (exists (select 1 from public.don_dat_hang d where d.id = don_dat_hang_id));

create policy "doc nguoi nhan chung tu" on public.chung_tu_nguoi_nhan
  for select to authenticated
  using (exists (select 1 from public.chung_tu c where c.id = chung_tu_id));

revoke insert, update, delete, truncate on public.don_dat_hang_nguoi_nhan, public.chung_tu_nguoi_nhan
  from anon, authenticated;
revoke all on public.don_dat_hang_nguoi_nhan, public.chung_tu_nguoi_nhan from anon;

-- ─── 3. Backfill (NNHAN-06) — trước trigger, không UPDATE bảng đơn ──────────
insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
select id, nguoi_nhan_id, 1 from public.don_dat_hang where nguoi_nhan_id is not null;

insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
select id, nguoi_nhan_id, 1 from public.chung_tu where nguoi_nhan_id is not null;

do $$
declare
  v_don int;
  v_ct int;
  v_rong int;
begin
  select count(*) into v_don from public.don_dat_hang d
  where d.nguoi_nhan_id is not null
    and not exists (select 1 from public.don_dat_hang_nguoi_nhan x
                    where x.don_dat_hang_id = d.id and x.nguoi_nhan_id = d.nguoi_nhan_id);
  select count(*) into v_ct from public.chung_tu c
  where c.nguoi_nhan_id is not null
    and not exists (select 1 from public.chung_tu_nguoi_nhan x
                    where x.chung_tu_id = c.id and x.nguoi_nhan_id = c.nguoi_nhan_id);
  select count(*) into v_rong from public.don_dat_hang d
  where d.doi_tac_id is null
    and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = d.id);
  if v_don > 0 or v_ct > 0 or v_rong > 0 then
    raise exception 'Backfill người nhận thiếu % đơn / % hóa đơn / % đơn nội bộ rỗng', v_don, v_ct, v_rong;
  end if;
end $$;

-- ─── 4. Cột cũ ngừng dùng (giữ dữ liệu) ─────────────────────────────────────
comment on column public.don_dat_hang.nguoi_nhan_id is
  'Ngừng dùng từ 0090 — nguồn sự thật là don_dat_hang_nguoi_nhan. Giữ dữ liệu cũ, không đọc/ghi.';
comment on column public.chung_tu.nguoi_nhan_id is
  'Ngừng dùng từ 0090 — nguồn sự thật là chung_tu_nguoi_nhan. Giữ dữ liệu cũ, không đọc/ghi.';

-- ─── 5. Bỏ CHECK một-người-nhận của đơn (đối tác kèm nhân viên là hợp lệ) ───
-- Giữ ck_chung_tu_khong_hai_nguoi_nhan: cột cũ của chung_tu không còn ghi.
alter table public.don_dat_hang drop constraint ck_ddh_mot_nguoi_nhan;

-- ─── 6. D1: gán người nhận cho dòng => tự thêm vào đơn ──────────────────────
create function public._tu_them_nguoi_nhan_don()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- FOR UPDATE (không phải SHARE): hai lệnh thêm dòng đồng thời sẽ xếp hàng
  -- trên hàng đơn nên không đọc cùng một max(thu_tu) và sinh thu_tu trùng.
  perform 1 from public.don_dat_hang where id = new.don_dat_hang_id for update;
  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  values (
    new.don_dat_hang_id,
    new.nguoi_nhan_id,
    (select coalesce(max(thu_tu), 0) + 1 from public.don_dat_hang_nguoi_nhan
     where don_dat_hang_id = new.don_dat_hang_id)
  )
  on conflict (don_dat_hang_id, nguoi_nhan_id) do nothing;
  return new;
end $$;

create trigger tu_them_nguoi_nhan_don
  after insert or update of nguoi_nhan_id on public.don_dat_hang_dong
  for each row when (new.nguoi_nhan_id is not null)
  execute function public._tu_them_nguoi_nhan_don();

-- ─── 7. Chặn bỏ người còn được gán ở dòng (lưới an toàn ngoài RPC) ──────────
create function public._chan_bo_nguoi_nhan_dang_dung()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ma text;
begin
  select string_agg(sp.ma_hang, ', ' order by sp.ma_hang) into v_ma
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = old.don_dat_hang_id and d.nguoi_nhan_id = old.nguoi_nhan_id;
  if v_ma is not null then
    raise exception 'Không bỏ được người nhận khỏi đơn: đang được gán ở dòng %', v_ma
      using errcode = '23514';
  end if;
  return old;
end $$;

create trigger chan_bo_nguoi_nhan_dang_dung
  before delete on public.don_dat_hang_nguoi_nhan
  for each row execute function public._chan_bo_nguoi_nhan_dang_dung();

-- ─── 8. D3: đơn nội bộ phải còn >= 1 người nhận khi commit ──────────────────
create function public._kiem_don_noi_bo_co_nguoi_nhan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_don_id uuid;
begin
  if tg_table_name = 'don_dat_hang' then
    v_don_id := new.id;
  else
    v_don_id := old.don_dat_hang_id;
  end if;
  if exists (select 1 from public.don_dat_hang d where d.id = v_don_id and d.doi_tac_id is null)
     and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = v_don_id) then
    raise exception 'Đơn nội bộ phải có ít nhất một người nhận' using errcode = '23514';
  end if;
  return null;
end $$;

create constraint trigger kiem_don_noi_bo_co_nguoi_nhan
  after insert or update of doi_tac_id on public.don_dat_hang
  deferrable initially deferred
  for each row execute function public._kiem_don_noi_bo_co_nguoi_nhan();

create constraint trigger kiem_don_noi_bo_con_nguoi_nhan
  after delete on public.don_dat_hang_nguoi_nhan
  deferrable initially deferred
  for each row execute function public._kiem_don_noi_bo_co_nguoi_nhan();

-- ─── 9. RPC tạo đơn ─────────────────────────────────────────────────────────
create function public.tao_don(p_doi_tac_id uuid default null, p_nguoi_nhan_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
  v_so text;
  v_id uuid;
  v_loi text;
begin
  -- Bỏ trùng và NULL, giữ thứ tự xuất hiện đầu tiên.
  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  -- Cấp số trước: kiểm quyền tao_don (42501) nằm trong sinh_so_dh.
  v_so := public.sinh_so_dh();

  if p_doi_tac_id is null and cardinality(v_ids) = 0 then
    raise exception 'Đơn nội bộ phải có ít nhất một người nhận' using errcode = '23514';
  end if;

  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where nv.id is null or not nv.dang_dung;
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng hoặc không tồn tại', v_loi using errcode = '23514';
  end if;

  insert into public.don_dat_hang (so_dh, doi_tac_id) values (v_so, p_doi_tac_id) returning id into v_id;

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select v_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord);

  return v_id;
end $$;

-- ─── 10. RPC đặt lại tập người nhận của đơn ─────────────────────────────────
create function public.dat_nguoi_nhan_don(
  p_don_id uuid,
  p_doi_tac_id uuid default null,
  p_nguoi_nhan_ids uuid[] default '{}'
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_don public.don_dat_hang;
  v_ids uuid[];
  v_dang_dung text;
  v_loi text;
begin
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn' using errcode = '23514';
  end if;
  if v_don.trang_thai <> 'TAM' then
    raise exception 'Đơn % đã xác nhận, không sửa người nhận được', v_don.so_dh using errcode = '23514';
  end if;
  if p_doi_tac_id is null and cardinality(v_ids) = 0 then
    raise exception 'Đơn nội bộ phải có ít nhất một người nhận' using errcode = '23514';
  end if;

  -- Chỉ người MỚI phải đang dùng; người cũ đã ngừng dùng được giữ.
  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where (nv.id is null or not nv.dang_dung)
    and not exists (select 1 from public.don_dat_hang_nguoi_nhan x
                    where x.don_dat_hang_id = p_don_id and x.nguoi_nhan_id = i.id);
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng', v_loi using errcode = '23514';
  end if;

  select string_agg(format('%s (%s)', nv.ten_day_du, ds.ma), '; ') into v_dang_dung
  from (select d.nguoi_nhan_id, string_agg(sp.ma_hang, ', ' order by sp.ma_hang) as ma
        from public.don_dat_hang_dong d
        join public.san_pham sp on sp.id = d.san_pham_id
        where d.don_dat_hang_id = p_don_id and d.nguoi_nhan_id is not null
          and d.nguoi_nhan_id <> all (v_ids)
        group by d.nguoi_nhan_id) ds
  join public.nhan_vien_phu_trach nv on nv.id = ds.nguoi_nhan_id;
  if v_dang_dung is not null then
    raise exception 'Không bỏ được khỏi đơn: % đang được gán ở dòng. Gỡ người nhận ở các dòng đó trước.', v_dang_dung
      using errcode = '23514';
  end if;

  update public.don_dat_hang set doi_tac_id = p_doi_tac_id
  where id = p_don_id and doi_tac_id is distinct from p_doi_tac_id;

  delete from public.don_dat_hang_nguoi_nhan
  where don_dat_hang_id = p_don_id and nguoi_nhan_id <> all (v_ids);

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select p_don_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord)
  on conflict (don_dat_hang_id, nguoi_nhan_id) do update set thu_tu = excluded.thu_tu;
end $$;

-- ─── 11. Quyền hàm ──────────────────────────────────────────────────────────
revoke execute on function public.tao_don(uuid, uuid[]) from public, anon;
grant execute on function public.tao_don(uuid, uuid[]) to authenticated;
revoke execute on function public.dat_nguoi_nhan_don(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.dat_nguoi_nhan_don(uuid, uuid, uuid[]) to authenticated;

revoke execute on function public._tu_them_nguoi_nhan_don() from public, anon, authenticated;
revoke execute on function public._chan_bo_nguoi_nhan_dang_dung() from public, anon, authenticated;
revoke execute on function public._kiem_don_noi_bo_co_nguoi_nhan() from public, anon, authenticated;
