-- =============================================================================
-- 0027 — D-20: nhật ký sửa append-only cho san_pham, doi_tac, nguoi_dung.
--
-- Ghi bằng trigger GENERIC (một hàm cho cả ba bảng) nên mọi đường ghi — form,
-- sửa trên ô, hàng loạt, import, rà ghi chú, Cài đặt — đều tự động bị bắt,
-- không phụ thuộc code ứng dụng nhớ gọi log. Bất biến bằng HAI LỚP giống
-- kho_movement ở 0008: REVOKE (chặn mọi role thường) + trigger (chặn cả owner).
-- =============================================================================

create table public.nhat_ky_sua (
  id uuid primary key default uuid_generate_v4(),
  bang text not null check (bang in ('san_pham', 'doi_tac', 'nguoi_dung')),
  ban_ghi_id uuid not null,
  truong text not null,
  gia_tri_cu jsonb,
  gia_tri_moi jsonb,
  nguon text not null check (nguon in (
    'form', 'sua_o', 'hang_loat', 'goi_y_duoi', 'import', 'ra_ghi_chu', 'cai_dat', 'script'
  )),
  nguoi_sua_id uuid references public.nguoi_dung(id),
  sua_luc timestamptz not null default now()
);
create index idx_nhat_ky_sua_tra_cuu on public.nhat_ky_sua (bang, ban_ghi_id, sua_luc desc);
alter table public.nhat_ky_sua enable row level security;
-- Không policy nào: client không đọc/ghi trực tiếp. Đọc duy nhất qua RPC lich_su_sua.

-- LỚP 1 — thu hồi quyền (bài học 0008: service_role có BYPASSRLS, REVOKE riêng).
revoke all on public.nhat_ky_sua from anon, authenticated;
revoke update, delete on public.nhat_ky_sua from service_role;

-- LỚP 2 — trigger chặn owner/postgres, hàm dùng chung được (không tên bảng cứng
-- như chan_sua_xoa_so_cai của 0008 — nhật ký còn dùng cho nhiều nơi khác sau này).
create or replace function public.chan_sua_xoa_bat_bien()
returns trigger language plpgsql as $$
begin
  raise exception 'Bảng % là bất biến, không được sửa hoặc xóa (thao tác: %)', tg_table_name, tg_op
    using errcode = '23514';
end $$;
revoke all on function public.chan_sua_xoa_bat_bien() from public, anon, authenticated;

create trigger chan_sua_xoa_nhat_ky_sua
  before update or delete on public.nhat_ky_sua
  for each row execute function public.chan_sua_xoa_bat_bien();

-- -----------------------------------------------------------------------------
-- Trigger ghi nhật ký generic cho san_pham / doi_tac / nguoi_dung.
--
-- v_nguon: ứng dụng bơm ngữ cảnh qua set_config('app.nguon_sua', '<nguồn>', true)
-- trước câu lệnh ghi (RPC import/hàng loạt, plan 08; rà ghi chú, plan 07). Không
-- set thì suy ra 'form' (có JWT) hoặc 'script' (chạy tay/migration, không JWT).
--
-- v_bo_qua: ba cột vận hành tự động (updated_at/created_at/lan_phat_sinh_cuoi)
-- và gia_von (chỉ trigger giá vốn ở 0008 ghi, không phải hành vi người dùng sửa)
-- — không bao giờ vào nhật ký, kể cả khi chúng đổi cùng lúc với trường khác.
-- -----------------------------------------------------------------------------
create or replace function public.ghi_nhat_ky_sua()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nguon text := coalesce(
    nullif(current_setting('app.nguon_sua', true), ''),
    case when auth.uid() is null then 'script' else 'form' end
  );
  v_bo_qua text[] := array['updated_at', 'created_at', 'lan_phat_sinh_cuoi', 'gia_von'];
  v_cu jsonb;
  v_moi jsonb;
  k text;
begin
  if tg_op = 'INSERT' then
    insert into public.nhat_ky_sua (bang, ban_ghi_id, truong, gia_tri_moi, nguon, nguoi_sua_id)
    values (tg_table_name, new.id, '_tao_moi', to_jsonb(new) - v_bo_qua, v_nguon, auth.uid());
    return new;
  end if;

  v_cu := to_jsonb(old);
  v_moi := to_jsonb(new);
  for k in select jsonb_object_keys(v_moi) loop
    if k = any (v_bo_qua) then
      continue;
    end if;
    if (v_cu -> k) is distinct from (v_moi -> k) then
      insert into public.nhat_ky_sua (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguon, nguoi_sua_id)
      values (tg_table_name, new.id, k, v_cu -> k, v_moi -> k, v_nguon, auth.uid());
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.ghi_nhat_ky_sua() from public, anon, authenticated;

create trigger ghi_nhat_ky_san_pham after insert or update on public.san_pham
  for each row execute function public.ghi_nhat_ky_sua();
create trigger ghi_nhat_ky_doi_tac after insert or update on public.doi_tac
  for each row execute function public.ghi_nhat_ky_sua();
create trigger ghi_nhat_ky_nguoi_dung after insert or update on public.nguoi_dung
  for each row execute function public.ghi_nhat_ky_sua();

-- -----------------------------------------------------------------------------
-- Gán/gỡ kho của người dùng (nguoi_dung_kho, 0026) cũng phải vào nhật ký —
-- không dùng trigger generic ở trên vì bảng nối không có cột id/updated_at
-- riêng, ghi vào nhật ký của "nguoi_dung" với truong='kho' để tab Lịch sử sửa
-- của tài khoản thấy đủ cả thay đổi hồ sơ lẫn thay đổi phạm vi kho.
--
-- Tạo TRỰC TIẾP (không bọc if to_regclass(...)) — nếu 0026 chưa áp thì push
-- 0027 phải hỏng ngay: một khối điều kiện sẽ âm thầm bỏ qua trigger, và
-- migration ghi nhận rồi thì push lại không chạy lại được nữa.
-- -----------------------------------------------------------------------------
create or replace function public.ghi_nhat_ky_kho_nguoi_dung()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nguon text := coalesce(
    nullif(current_setting('app.nguon_sua', true), ''),
    case when auth.uid() is null then 'script' else 'cai_dat' end
  );
begin
  if tg_op = 'INSERT' then
    insert into public.nhat_ky_sua (bang, ban_ghi_id, truong, gia_tri_moi, nguon, nguoi_sua_id)
    values ('nguoi_dung', new.nguoi_dung_id, 'kho', to_jsonb(new.kho_id), v_nguon, auth.uid());
    return new;
  end if;
  insert into public.nhat_ky_sua (bang, ban_ghi_id, truong, gia_tri_cu, nguon, nguoi_sua_id)
  values ('nguoi_dung', old.nguoi_dung_id, 'kho', to_jsonb(old.kho_id), v_nguon, auth.uid());
  return old;
end $$;
revoke all on function public.ghi_nhat_ky_kho_nguoi_dung() from public, anon, authenticated;

create trigger ghi_nhat_ky_nguoi_dung_kho after insert or delete on public.nguoi_dung_kho
  for each row execute function public.ghi_nhat_ky_kho_nguoi_dung();

-- -----------------------------------------------------------------------------
-- RPC đọc — chỉ đường duy nhất client chạm vào nhật ký. Kiểm vai trò tường
-- minh vì SECURITY DEFINER bỏ qua RLS (bài học supabase-rls-bao-mat.md #6).
-- -----------------------------------------------------------------------------
create or replace function public.lich_su_sua(p_bang text, p_ban_ghi_id uuid, p_gioi_han int default 200)
returns table (
  id uuid, truong text, gia_tri_cu jsonb, gia_tri_moi jsonb, nguon text,
  nguoi_sua_id uuid, ho_ten_nguoi_sua text, sua_luc timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng xem được lịch sử sửa' using errcode = '42501';
  end if;
  return query
  select n.id, n.truong, n.gia_tri_cu, n.gia_tri_moi, n.nguon, n.nguoi_sua_id, nd.ho_ten, n.sua_luc
  from public.nhat_ky_sua n
  left join public.nguoi_dung nd on nd.id = n.nguoi_sua_id
  where n.bang = p_bang and n.ban_ghi_id = p_ban_ghi_id
  order by n.sua_luc desc, n.truong
  limit least(greatest(p_gioi_han, 1), 1000);
end $$;
revoke all    on function public.lich_su_sua(text, uuid, int) from public, anon;
grant execute on function public.lich_su_sua(text, uuid, int) to authenticated;

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (mẫu lấy từ 0016/0026).
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(tablename, ', ') into v_thieu
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if v_thieu is not null then
    raise exception 'Còn bảng chưa bật RLS: %', v_thieu;
  end if;
end $$;

comment on table public.nhat_ky_sua is
  'Nhật ký sửa append-only cho san_pham/doi_tac/nguoi_dung (D-20). Ghi bằng trigger generic ghi_nhat_ky_sua nên mọi đường ghi đều bị bắt. Đọc duy nhất qua RPC lich_su_sua (kiểm vai trò quan_ly/van_phong). Không sửa, không xóa được bởi bất kỳ role nào, kể cả postgres — xem chan_sua_xoa_bat_bien.';
