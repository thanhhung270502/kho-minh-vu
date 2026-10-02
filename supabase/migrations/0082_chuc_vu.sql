-- =============================================================================
-- 0082 — Chức vụ & quyền: phần nền (Phase 16, QUYEN-01..03)
--
-- Mô hình: người dùng chọn MỘT chức vụ. Chức vụ mang
--   - pham_vi (enum vai_tro cũ): quyết định phạm vi dữ liệu (thủ kho chỉ thấy
--     kho được giao) và các quyền quản trị (người dùng, kho, số chứng từ, giá
--     vốn). nguoi_dung.vai_tro tự đồng bộ theo pham_vi — token hook, RLS theo
--     kho và mọi chỗ đang đọc vai_tro_hien_tai() GIỮ NGUYÊN.
--   - 9 quyền nghiệp vụ bật/tắt (chuc_vu_quyen), kiểm bằng co_quyen() đọc thẳng
--     bảng → bật hay tắt đều có hiệu lực NGAY câu lệnh kế tiếp, không chờ token.
--
-- Bốn chức vụ mặc định giữ đúng quyền người dùng đang có (không ai mất/thêm
-- quyền). Thay phần kiểm vai trò ở RPC/policy bằng co_quyen: 0083.
-- =============================================================================

create table public.chuc_vu (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  pham_vi public.vai_tro not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_chuc_vu_ten on public.chuc_vu (lower(ten));

create trigger set_updated_at_chuc_vu
  before update on public.chuc_vu
  for each row execute function public.update_updated_at();

-- Danh sách quyền khóa cứng ở CHECK: thêm quyền = migration + code dùng nó,
-- không phải dữ liệu tự do (gõ sai tên quyền sẽ thành quyền không ai kiểm).
create table public.chuc_vu_quyen (
  chuc_vu_id uuid not null references public.chuc_vu(id) on delete cascade,
  quyen text not null check (quyen in (
    'xem_dashboard', 'nhap_kho', 'tao_don', 'xac_nhan_don', 'hoan_thanh_don',
    'sua_hoa_don', 'tao_ma_hang', 'tao_nhan_vien', 'kiem_kho'
  )),
  created_at timestamptz not null default now(),
  primary key (chuc_vu_id, quyen)
);

-- --- Dữ liệu mặc định: đúng quyền vai trò cũ đang có -----------------------
insert into public.chuc_vu (ma, ten, pham_vi) values
  ('QUAN_LY',   'Quản lý',   'quan_ly'),
  ('NHAN_VIEN', 'Nhân viên', 'van_phong'),
  ('THU_KHO',   'Thủ kho',   'thu_kho'),
  ('CHI_XEM',   'Chỉ xem',   'chi_xem');

insert into public.chuc_vu_quyen (chuc_vu_id, quyen)
select cv.id, q.quyen
from public.chuc_vu cv
join (values
  ('QUAN_LY', 'xem_dashboard'), ('QUAN_LY', 'nhap_kho'), ('QUAN_LY', 'tao_don'),
  ('QUAN_LY', 'xac_nhan_don'), ('QUAN_LY', 'hoan_thanh_don'), ('QUAN_LY', 'sua_hoa_don'),
  ('QUAN_LY', 'tao_ma_hang'), ('QUAN_LY', 'tao_nhan_vien'), ('QUAN_LY', 'kiem_kho'),
  ('NHAN_VIEN', 'nhap_kho'), ('NHAN_VIEN', 'tao_don'), ('NHAN_VIEN', 'hoan_thanh_don'),
  ('NHAN_VIEN', 'tao_ma_hang'), ('NHAN_VIEN', 'tao_nhan_vien'), ('NHAN_VIEN', 'kiem_kho'),
  ('THU_KHO', 'nhap_kho'), ('THU_KHO', 'kiem_kho')
) as q(ma, quyen) on q.ma = cv.ma;

-- --- nguoi_dung.chuc_vu_id --------------------------------------------------
alter table public.nguoi_dung add column chuc_vu_id uuid references public.chuc_vu(id);

update public.nguoi_dung nd
set chuc_vu_id = cv.id
from public.chuc_vu cv
where cv.ma = case nd.vai_tro
  when 'quan_ly' then 'QUAN_LY' when 'van_phong' then 'NHAN_VIEN'
  when 'thu_kho' then 'THU_KHO' else 'CHI_XEM' end;

alter table public.nguoi_dung alter column chuc_vu_id set not null;
create index idx_nguoi_dung_chuc_vu on public.nguoi_dung (chuc_vu_id);

-- Hai chiều đồng bộ, để code cũ (seed, test, script ghi vai_tro) vẫn đúng:
--   - đổi chuc_vu_id → vai_tro = pham_vi của chức vụ mới;
--   - chỉ ghi vai_tro (không kèm chức vụ) → chuyển sang chức vụ MẶC ĐỊNH của
--     vai trò đó.
create or replace function public.dong_bo_vai_tro_chuc_vu()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.chuc_vu_id is not null
     and (tg_op = 'INSERT' or new.chuc_vu_id is distinct from old.chuc_vu_id) then
    new.vai_tro := (select pham_vi from public.chuc_vu where id = new.chuc_vu_id);
  elsif (tg_op = 'INSERT' or new.vai_tro is distinct from old.vai_tro)
        -- Đổi phạm vi của chính chức vụ đang giữ (trigger dưới) thì giữ chức vụ.
        and new.vai_tro is distinct from (select pham_vi from public.chuc_vu where id = new.chuc_vu_id) then
    new.chuc_vu_id := (
      select id from public.chuc_vu
      where ma = case new.vai_tro
        when 'quan_ly' then 'QUAN_LY' when 'van_phong' then 'NHAN_VIEN'
        when 'thu_kho' then 'THU_KHO' else 'CHI_XEM' end
    );
  end if;
  return new;
end;
$$;
revoke all on function public.dong_bo_vai_tro_chuc_vu() from public, anon, authenticated;

create trigger dong_bo_vai_tro_chuc_vu
  before insert or update of chuc_vu_id, vai_tro on public.nguoi_dung
  for each row execute function public.dong_bo_vai_tro_chuc_vu();

-- Đổi phạm vi của chức vụ → mọi người giữ chức vụ đó đổi vai_tro theo. Chặn
-- hai trường hợp làm hỏng hệ thống: mất quản lý cuối cùng (không ai vào được
-- Cài đặt để sửa lại), và thủ kho không có kho (không thấy gì).
create or replace function public.dong_bo_pham_vi_chuc_vu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pham_vi is not distinct from old.pham_vi then
    return new;
  end if;

  if new.pham_vi = 'thu_kho' and exists (
    select 1 from public.nguoi_dung nd
    where nd.chuc_vu_id = new.id
      and not exists (select 1 from public.nguoi_dung_kho k where k.nguoi_dung_id = nd.id)
  ) then
    raise exception 'Có người giữ chức vụ "%" chưa được gán kho — gán kho trước khi đổi phạm vi sang Thủ kho', new.ten
      using errcode = '23514';
  end if;

  update public.nguoi_dung set vai_tro = new.pham_vi, chuc_vu_id = new.id
  where chuc_vu_id = new.id;

  if not exists (select 1 from public.nguoi_dung where vai_tro = 'quan_ly' and dang_hoat_dong) then
    raise exception 'Không thể đổi: hệ thống sẽ không còn quản lý nào đang hoạt động'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.dong_bo_pham_vi_chuc_vu() from public, anon, authenticated;

create trigger dong_bo_pham_vi_chuc_vu
  after update of pham_vi on public.chuc_vu
  for each row execute function public.dong_bo_pham_vi_chuc_vu();

-- --- RLS ---------------------------------------------------------------------
alter table public.chuc_vu enable row level security;
alter table public.chuc_vu_quyen enable row level security;

create policy "moi vai tro doc chuc vu" on public.chuc_vu for select to authenticated using (true);
create policy "quan ly them chuc vu" on public.chuc_vu
  for insert to authenticated with check ((select public.vai_tro_hien_tai()) = 'quan_ly');
create policy "quan ly sua chuc vu" on public.chuc_vu
  for update to authenticated
  using ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');
-- Chức vụ đang có người giữ thì FK của nguoi_dung chặn xóa (23503).
create policy "quan ly xoa chuc vu" on public.chuc_vu
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) = 'quan_ly' and ma not in ('QUAN_LY','NHAN_VIEN','THU_KHO','CHI_XEM'));

create policy "moi vai tro doc quyen chuc vu" on public.chuc_vu_quyen for select to authenticated using (true);
create policy "quan ly bat quyen" on public.chuc_vu_quyen
  for insert to authenticated with check ((select public.vai_tro_hien_tai()) = 'quan_ly');
create policy "quan ly tat quyen" on public.chuc_vu_quyen
  for delete to authenticated using ((select public.vai_tro_hien_tai()) = 'quan_ly');

grant select, insert, update, delete on public.chuc_vu to authenticated;
grant select, insert, delete on public.chuc_vu_quyen to authenticated;

-- --- co_quyen ----------------------------------------------------------------
-- Đọc thẳng bảng theo auth.uid() (khuôn duyet_duoc_kiem_ke, 0063) — KHÔNG qua
-- JWT claim, nên bật/tắt quyền có hiệu lực ngay. Người bị khóa, người không có
-- trong nguoi_dung → false. KHÔNG dùng kiểu coalesce(..., 'quan_ly') của các
-- RPC cũ: NULL phải là "không có quyền".
-- Gọi không kèm người dùng (postgres chạy script, service_role) → true, thay
-- cho nhánh coalesce cũ. anon không có auth.uid() nhưng role = 'anon' → false.
create or replace function public.co_quyen(p_quyen text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_quyen not in (
    'xem_dashboard', 'nhap_kho', 'tao_don', 'xac_nhan_don', 'hoan_thanh_don',
    'sua_hoa_don', 'tao_ma_hang', 'tao_nhan_vien', 'kiem_kho'
  ) then
    raise exception 'Quyền không tồn tại: %', p_quyen using errcode = '22023';
  end if;

  if v_uid is null then
    return coalesce((select auth.role()), 'service_role') = 'service_role';
  end if;

  return exists (
    select 1
    from public.nguoi_dung nd
    join public.chuc_vu_quyen q on q.chuc_vu_id = nd.chuc_vu_id
    where nd.id = v_uid and nd.dang_hoat_dong and q.quyen = p_quyen
  );
end;
$$;

revoke all    on function public.co_quyen(text) from public, anon;
grant execute on function public.co_quyen(text) to authenticated;

comment on function public.co_quyen(text) is
  'QUYEN-03: người đang đăng nhập có quyền nghiệp vụ p_quyen không — đọc nguoi_dung + chuc_vu_quyen, không đọc JWT, có hiệu lực ngay. Người bị khóa luôn false. Tên quyền lạ báo lỗi 22023.';

-- Danh sách quyền của chính mình — giao diện ẩn/hiện menu, nút (QUYEN-04).
create or replace function public.quyen_cua_toi()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(q.quyen order by q.quyen), '{}')
  from public.nguoi_dung nd
  join public.chuc_vu_quyen q on q.chuc_vu_id = nd.chuc_vu_id
  where nd.id = (select auth.uid()) and nd.dang_hoat_dong;
$$;
revoke all    on function public.quyen_cua_toi() from public, anon;
grant execute on function public.quyen_cua_toi() to authenticated;

-- --- luu_ho_so_nguoi_dung theo chức vụ -------------------------------------
-- RPC mới nhận p_chuc_vu_id. TÊN KHÁC bản cũ (không overload): test và code cũ
-- gọi luu_ho_so_nguoi_dung theo vị trí tham số, overload trùng tên sẽ mơ hồ.
-- Bản cũ (p_vai_tro) tạm giữ để màn Người dùng vẫn chạy — trigger đồng bộ đưa
-- vai_tro về chức vụ mặc định; bỏ khi giao diện chuyển sang chọn chức vụ.
create function public.luu_nguoi_dung(
  p_id uuid, p_ho_ten text, p_ten_dang_nhap text, p_chuc_vu_id uuid,
  p_kho_ids uuid[], p_phai_doi_mat_khau boolean,
  p_xem_lich_su_kiotviet boolean default null, p_duyet_kiem_ke boolean default null
) returns void language plpgsql set search_path = '' as $$
declare
  v_ten_dang_nhap text := nullif(btrim(p_ten_dang_nhap), '');
  v_pham_vi public.vai_tro := (select pham_vi from public.chuc_vu where id = p_chuc_vu_id);
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được sửa tài khoản' using errcode = '42501';
  end if;
  if v_pham_vi is null then
    raise exception 'Chức vụ không còn tồn tại — chọn lại chức vụ' using errcode = '23514';
  end if;
  if v_pham_vi = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
    raise exception 'Thủ kho phải được gán ít nhất một kho' using errcode = '23514';
  end if;
  insert into public.nguoi_dung (
    id, ho_ten, ten_dang_nhap, chuc_vu_id, phai_doi_mat_khau,
    xem_lich_su_kiotviet, duyet_kiem_ke
  )
  values (
    p_id, p_ho_ten, v_ten_dang_nhap, p_chuc_vu_id, p_phai_doi_mat_khau,
    coalesce(p_xem_lich_su_kiotviet, false), coalesce(p_duyet_kiem_ke, false)
  )
  on conflict (id) do update set
    ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
    chuc_vu_id = excluded.chuc_vu_id, phai_doi_mat_khau = excluded.phai_doi_mat_khau,
    xem_lich_su_kiotviet = coalesce(p_xem_lich_su_kiotviet, public.nguoi_dung.xem_lich_su_kiotviet),
    duyet_kiem_ke = coalesce(p_duyet_kiem_ke, public.nguoi_dung.duyet_kiem_ke);
  -- Chỉ phạm vi thủ kho gắn kho; phạm vi khác thấy mọi kho nên xóa gán kho.
  delete from public.nguoi_dung_kho
  where nguoi_dung_id = p_id
    and (v_pham_vi <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
  if v_pham_vi = 'thu_kho' then
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select p_id, unnest(p_kho_ids) on conflict do nothing;
  end if;
end $$;

revoke all    on function public.luu_nguoi_dung(uuid, text, text, uuid, uuid[], boolean, boolean, boolean) from public, anon;
grant execute on function public.luu_nguoi_dung(uuid, text, text, uuid, uuid[], boolean, boolean, boolean) to authenticated;
