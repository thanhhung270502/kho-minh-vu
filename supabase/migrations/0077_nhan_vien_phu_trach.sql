-- =============================================================================
-- 0077 — Nhân viên phụ trách: người nhận nội bộ là danh mục riêng
--
-- 0076 lấy người nhận nội bộ từ tài khoản đăng nhập (nguoi_dung). Thực tế văn
-- phòng giao hàng cho nhân viên không có tài khoản, và cần tên viết tắt để gọi
-- nhanh — nên tách thành danh mục `nhan_vien_phu_trach` quản lý trong Cài đặt
-- (yêu cầu 02/10/2026, NVPT-01..03).
--
-- Giữ nguyên tên cột nguoi_nhan_id và hình dạng dữ liệu mọi RPC trả về — chỉ
-- đổi FK và nguồn tên (ten_day_du thay ho_ten). Người từng làm người nhận được
-- chép sang bảng mới GIỮ NGUYÊN id, nên không phải cập nhật dòng đơn/phiếu nào
-- (và không sinh dòng nhật ký sửa thừa trên don_dat_hang).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Bảng nhân viên phụ trách
-- -----------------------------------------------------------------------------
create table public.nhan_vien_phu_trach (
  id uuid primary key default uuid_generate_v4(),
  ten_viet_tat text not null check (btrim(ten_viet_tat) <> ''),
  ten_day_du text not null check (btrim(ten_day_du) <> ''),
  -- Ngừng dùng thay vì xóa: đơn và hóa đơn cũ vẫn trỏ tới nhân viên này.
  dang_dung boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tên viết tắt là thứ văn phòng gõ để chọn nhanh — trùng thì không phân biệt được.
create unique index idx_nhan_vien_phu_trach_ten_viet_tat_unique
  on public.nhan_vien_phu_trach (lower(btrim(ten_viet_tat)));

create trigger set_updated_at_nhan_vien_phu_trach
  before update on public.nhan_vien_phu_trach
  for each row execute function public.update_updated_at();

comment on table public.nhan_vien_phu_trach is
  'Người nhận nội bộ của đơn đặt hàng / hóa đơn. Không phải tài khoản đăng nhập.';

-- RLS: khuôn danh mục 0015 — ai cũng đọc, quản lý + văn phòng thêm/sửa. Không
-- có policy xóa: ngừng dùng bằng dang_dung.
alter table public.nhan_vien_phu_trach enable row level security;

create policy "moi vai tro doc nhan vien phu trach" on public.nhan_vien_phu_trach
  for select to authenticated using (true);
create policy "them nhan vien phu trach" on public.nhan_vien_phu_trach
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua nhan vien phu trach" on public.nhan_vien_phu_trach
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- -----------------------------------------------------------------------------
-- (b) Chép người nhận cũ (tài khoản) sang nhân viên phụ trách, giữ nguyên id.
-- Tên viết tắt tạm bằng họ tên — văn phòng sửa lại trong Cài đặt. Hai tài khoản
-- trùng họ tên thì thêm hậu tố để không vướng unique index.
-- -----------------------------------------------------------------------------
insert into public.nhan_vien_phu_trach (id, ten_viet_tat, ten_day_du, dang_dung)
select nd.id,
       nd.ho_ten || case when rn > 1 then ' (' || rn || ')' else '' end,
       nd.ho_ten,
       nd.dang_hoat_dong
from (
  select nd.*, row_number() over (partition by lower(btrim(nd.ho_ten)) order by nd.created_at, nd.id) as rn
  from public.nguoi_dung nd
  where nd.id in (
    select nguoi_nhan_id from public.don_dat_hang where nguoi_nhan_id is not null
    union
    select nguoi_nhan_id from public.chung_tu where nguoi_nhan_id is not null
  )
) nd;

-- -----------------------------------------------------------------------------
-- (c) Đổi FK sang nhân viên phụ trách
-- -----------------------------------------------------------------------------
alter table public.don_dat_hang drop constraint don_dat_hang_nguoi_nhan_id_fkey;
alter table public.don_dat_hang
  add constraint don_dat_hang_nguoi_nhan_id_fkey
  foreign key (nguoi_nhan_id) references public.nhan_vien_phu_trach(id);

alter table public.chung_tu drop constraint chung_tu_nguoi_nhan_id_fkey;
alter table public.chung_tu
  add constraint chung_tu_nguoi_nhan_id_fkey
  foreign key (nguoi_nhan_id) references public.nhan_vien_phu_trach(id);

comment on column public.don_dat_hang.nguoi_nhan_id is
  'Người nhận nội bộ = nhân viên phụ trách (0077). Đúng một trong doi_tac_id / nguoi_nhan_id có giá trị — ck_ddh_mot_nguoi_nhan.';
comment on column public.chung_tu.nguoi_nhan_id is
  'Người nhận nội bộ = nhân viên phụ trách (0077), chép từ đơn nội bộ khi tạo hóa đơn. Không đồng thời với doi_tac_id.';

-- -----------------------------------------------------------------------------
-- (d) Danh sách người nhận nội bộ — đổi kiểu trả về nên drop rồi create.
-- Không cần SECURITY DEFINER nữa (RLS cho mọi vai trò đọc bảng mới), nhưng giữ
-- dạng hàm để client chỉ gọi một chỗ và chỉ thấy nhân viên đang dùng.
-- -----------------------------------------------------------------------------
drop function public.danh_sach_nguoi_nhan_noi_bo();

create function public.danh_sach_nguoi_nhan_noi_bo()
returns table (id uuid, ten_viet_tat text, ten_day_du text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select public.vai_tro_hien_tai()) is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select nv.id, nv.ten_viet_tat, nv.ten_day_du
  from public.nhan_vien_phu_trach nv
  where nv.dang_dung
  order by nv.ten_day_du;
end;
$$;
revoke all    on function public.danh_sach_nguoi_nhan_noi_bo() from public, anon;
grant execute on function public.danh_sach_nguoi_nhan_noi_bo() to authenticated;
comment on function public.danh_sach_nguoi_nhan_noi_bo() is
  'Nhân viên phụ trách đang dùng, để chọn người nhận đơn nội bộ (0077).';

-- -----------------------------------------------------------------------------
-- (e) Các RPC đọc: thân hàm chép từ 0076, chỉ đổi nguồn tên người nhận sang
-- nhan_vien_phu_trach.ten_day_du. Chữ ký và kiểu trả về giữ nguyên nên dùng
-- create or replace. tao_phieu_xuat_tu_don chỉ chép id — không phải sửa.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- (e1) danh_sach_don — thêm người nhận nội bộ, tìm theo tên nhân viên, lọc theo
-- chế độ. Đổi tham số + kiểu trả về nên drop rồi create.
-- -----------------------------------------------------------------------------
create or replace function public.danh_sach_don(
  p_trang_thai public.trang_thai_ddh default null,
  p_doi_tac_id uuid default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50,
  p_loai_nhan text default null
)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh,
  ngay_giao_du_kien date, doi_tac_id uuid, ten_doi_tac text,
  nguoi_nhan_id uuid, ten_nguoi_nhan text, so_dong bigint,
  tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text,
  ghi_chu text, created_at timestamptz, tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kich_thuoc integer := least(greatest(coalesce(p_kich_thuoc, 50), 1), 200);
  v_trang integer := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_loai_nhan is not null and p_loai_nhan not in ('DOI_TAC', 'NOI_BO') then
    raise exception 'Loại người nhận không hợp lệ: %', p_loai_nhan using errcode = '22023';
  end if;

  return query
  with loc as (
    select dh.*
    from public.don_dat_hang dh
    where (p_trang_thai is null or dh.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
      and (p_loai_nhan  is null
           or (p_loai_nhan = 'NOI_BO'  and dh.nguoi_nhan_id is not null)
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null))
      and (p_tu_ngay    is null or dh.ngay_dh >= p_tu_ngay)
      and (p_den_ngay   is null or dh.ngay_dh <= p_den_ngay)
      and (
        v_tu_khoa is null
        or dh.so_dh ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = dh.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1 from public.nhan_vien_phu_trach nn
          where nn.id = dh.nguoi_nhan_id
            and public.f_unaccent(nn.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_dh, l.ngay_dh, l.trang_thai, l.ngay_giao_du_kien, l.doi_tac_id,
    dt.ten,
    l.nguoi_nhan_id, nn.ten_day_du,
    (select count(*) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_dat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_da_xuat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    nd.ho_ten,
    l.ghi_chu, l.created_at,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.nhan_vien_phu_trach nn on nn.id = l.nguoi_nhan_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_dh desc, l.so_dh desc
  limit v_kich_thuoc
  offset (v_trang - 1) * v_kich_thuoc;
end;
$$;

revoke all    on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text) from public, anon;
grant execute on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text) to authenticated;
comment on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer, text) is
  'Danh sách đơn đặt hàng, lọc + phân trang ở server. p_loai_nhan: DOI_TAC | NOI_BO | null (tất cả). Từ khóa khớp số đơn, tên đối tác hoặc tên nhân viên nhận.';


-- -----------------------------------------------------------------------------
-- (e2) chi_tiet_don — thêm người nhận nội bộ. dong_don gọi lại hàm này bằng tên
-- trong thân plpgsql (không phụ thuộc cứng) nên drop không kéo theo dong_don.
-- -----------------------------------------------------------------------------
create or replace function public.chi_tiet_don(p_id uuid)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh,
  ngay_giao_du_kien date, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
  nguoi_nhan_id uuid, ten_nguoi_nhan text,
  ghi_chu text, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric,
  ho_ten_nguoi_tao text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select dh.id, dh.so_dh, dh.ngay_dh, dh.trang_thai, dh.ngay_giao_du_kien,
         dh.doi_tac_id, dt.ma, dt.ten,
         dh.nguoi_nhan_id, nn.ten_day_du,
         dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join public.nhan_vien_phu_trach nn on nn.id = dh.nguoi_nhan_id
  left join public.nguoi_dung nd on nd.id = dh.nguoi_tao_id
  where dh.id = p_id;
end;
$$;

revoke all    on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated;
comment on function public.chi_tiet_don(uuid) is
  'Header đơn đặt hàng kèm tổng số lượng đặt/đã xuất và người nhận (đối tác hoặc nội bộ).';


-- -----------------------------------------------------------------------------
-- (e3) chi_tiet_chung_tu — thêm người nhận nội bộ cho đầu phiếu xuất. Đổi kiểu
-- trả về nên drop rồi create; thân giữ nguyên 0051.
-- -----------------------------------------------------------------------------
create or replace function public.chi_tiet_chung_tu(p_id uuid)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct,
  nguon_nhap public.nguon_nhap, trang_thai public.trang_thai_ct,
  kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
  ghi_chu text, tong_so_luong numeric, tong_tien numeric,
  ho_ten_nguoi_tao text, ngay_ghi_so timestamptz, created_at timestamptz,
  don_dat_hang_id uuid, so_dh text,
  chung_tu_goc_id uuid, so_ct_goc text,
  ly_do_xuat_am text, ghi_chu_ly_do text,
  nguoi_duyet_id uuid,
  nguoi_nhan_id uuid, ten_nguoi_nhan text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select ct.id, ct.so_ct, ct.ngay_ct, ct.loai_ct, ct.nguon_nhap, ct.trang_thai,
         ct.kho_id, k.ten, ct.doi_tac_id, dt.ma, dt.ten,
         ct.ghi_chu, ct.tong_so_luong, ct.tong_tien,
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at,
         ct.don_dat_hang_id, dh.so_dh,
         ct.chung_tu_goc_id, goc.so_ct,
         ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.nguoi_duyet_id,
         ct.nguoi_nhan_id, nn.ten_day_du
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.nhan_vien_phu_trach nn  on nn.id = ct.nguoi_nhan_id
  left join public.don_dat_hang dh on dh.id = ct.don_dat_hang_id
  left join public.chung_tu goc   on goc.id = ct.chung_tu_goc_id
  where ct.id = p_id
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d
                 where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    );
end;
$$;

revoke all    on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- (e4) danh_sach_chung_tu — cột ten_doi_tac hiện "Nội bộ — <họ tên>" cho phiếu
-- nội bộ, từ khóa khớp cả tên nhân viên. Kiểu trả về không đổi nên create or
-- replace; thân giữ nguyên 0045.
-- -----------------------------------------------------------------------------
create or replace function public.danh_sach_chung_tu(
  p_loai_ct public.loai_ct default null,
  p_trang_thai public.trang_thai_ct default null,
  p_doi_tac_id uuid default null,
  p_kho_id uuid default null,
  p_nguon_nhap public.nguon_nhap default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct,
  nguon_nhap public.nguon_nhap, trang_thai public.trang_thai_ct,
  doi_tac_id uuid, ten_doi_tac text, ten_kho text,
  so_dong bigint, tong_so_luong numeric, tong_tien numeric,
  ho_ten_nguoi_tao text, ngay_ghi_so timestamptz, tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select ct.*
    from public.chung_tu ct
    where (p_loai_ct    is null or ct.loai_ct = p_loai_ct)
      and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
      and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
      and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
      and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
      and (
        p_kho_id is null
        or ct.kho_id = p_kho_id
        or exists (select 1 from public.chung_tu_dong d
                   where d.chung_tu_id = ct.id and d.kho_id = p_kho_id)
      )
      and (
        v_vai <> 'thu_kho'
        or ct.kho_id = any(v_kho)
        or ct.kho_den_id = any(v_kho)
        or exists (select 1 from public.chung_tu_dong d
                   where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
      )
      and (
        v_tu_khoa is null
        or ct.so_ct ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = ct.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1 from public.nhan_vien_phu_trach nn
          where nn.id = ct.nguoi_nhan_id
            and public.f_unaccent(nn.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_ct, l.ngay_ct, l.loai_ct, l.nguon_nhap, l.trang_thai,
    l.doi_tac_id,
    coalesce(dt.ten, 'Nội bộ — ' || nn.ten_day_du),
    k.ten,
    (select count(*) from public.chung_tu_dong d where d.chung_tu_id = l.id),
    l.tong_so_luong, l.tong_tien,
    nd.ho_ten, l.ngay_ghi_so,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.nhan_vien_phu_trach nn on nn.id = l.nguoi_nhan_id
  left join public.kho k         on k.id  = l.kho_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_ct desc, l.so_ct desc
  limit greatest(p_kich_thuoc, 1)
  offset greatest(p_trang - 1, 0) * greatest(p_kich_thuoc, 1);
end;
$$;


-- -----------------------------------------------------------------------------
-- (e5) the_kho_san_pham — cột doi_tac hiện "Nội bộ — <họ tên>". Kiểu trả về
-- không đổi nên create or replace; thân giữ nguyên 0074.
-- -----------------------------------------------------------------------------
create or replace function public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid default null::uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric, ly_do_xuat_am text)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           (((m.ngay at time zone 'Asia/Ho_Chi_Minh')::date
             + (m.created_at at time zone 'Asia/Ho_Chi_Minh')::time)
             at time zone 'Asia/Ho_Chi_Minh')                     as ngay,
           m.kho_id                                               as kho_id,
           k.ten                                                  as ten_kho,
           m.chung_tu_id                                          as chung_tu_id,
           ct.so_ct                                               as so_ct,
           ct.loai_ct::text                                       as loai_ct,
           coalesce(dt.ten, 'Nội bộ — ' || nn.ten_day_du)             as doi_tac,
           case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
           case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
           case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
           m.la_but_toan_dao                                      as la_but_toan_dao,
           ct.ghi_chu                                             as ghi_chu,
           case when m.so_luong < 0 and not m.la_but_toan_dao
                then ct.ly_do_xuat_am end                         as ly_do_xuat_am,
           (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date         as sx_ngay,
           m.created_at                                           as sx_phu,
           m.id                                                   as sx_id
    from public.kho_movement m
    join public.kho k on k.id = m.kho_id
    left join public.chung_tu ct on ct.id = m.chung_tu_id
    left join public.doi_tac dt on dt.id = ct.doi_tac_id
    left join public.nhan_vien_phu_trach nn on nn.id = ct.nguoi_nhan_id
    where m.san_pham_id = p_san_pham_id
      and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
      and (p_kho_id is null or m.kho_id = p_kho_id)
  ),
  voi_luy_ke as (
    select t.*,
           sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0))
             over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
             as ton_luy_ke
    from tat_ca t
  )
  select v.nguon, v.ngay, v.kho_id, v.ten_kho, v.chung_tu_id, v.so_ct, v.loai_ct,
         v.doi_tac, v.so_luong_nhap, v.so_luong_xuat, v.gia_von_tai_thoi_diem,
         v.la_but_toan_dao, v.ghi_chu, count(*) over (), v.ton_luy_ke,
         v.ly_do_xuat_am
  from voi_luy_ke v
  order by v.sx_ngay desc, v.sx_phu desc, v.sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;
