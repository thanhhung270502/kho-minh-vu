-- =============================================================================
-- 0076 — Đơn đặt hàng nội bộ: người nhận là nhân viên (tài khoản nguoi_dung)
--
-- Đơn có hai chế độ người nhận: đối tác (như cũ) hoặc nội bộ. Chế độ SUY RA từ
-- cột nào đang có giá trị — không thêm cột "loại": hai cột cộng một cột loại
-- là ba nguồn sự thật có thể cãi nhau. CHECK ép đơn có ĐÚNG MỘT người nhận.
--
-- Phiếu xuất sinh từ đơn nội bộ mang theo nguoi_nhan_id để thẻ kho và phiếu in
-- biết hàng đi đâu. Các RPC đọc không cần phân biệt chế độ (danh sách chứng từ,
-- thẻ kho) chỉ đổi cột tên đối tác thành "Nội bộ — <họ tên>", giữ nguyên kiểu
-- trả về để không màn nào phải sửa theo.
--
-- Hàng xuất nội bộ VẪN tính vào nhịp bán / đề xuất định mức (chốt 01/10): hàng
-- đã ra khỏi kho là tiêu hao, nên 0071 không đổi.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Cột người nhận + ràng buộc
-- -----------------------------------------------------------------------------
alter table public.don_dat_hang
  add column nguoi_nhan_id uuid references public.nguoi_dung(id);

-- Nới ràng buộc (đã được đồng ý 01/10): đơn nội bộ không có đối tác. Mọi đơn
-- đang có đều có doi_tac_id nên CHECK bên dưới hợp lệ ngay với dữ liệu cũ.
alter table public.don_dat_hang alter column doi_tac_id drop not null;

alter table public.don_dat_hang
  add constraint ck_ddh_mot_nguoi_nhan
  check (num_nonnulls(doi_tac_id, nguoi_nhan_id) = 1);

create index idx_ddh_nguoi_nhan on public.don_dat_hang (nguoi_nhan_id)
  where nguoi_nhan_id is not null;

comment on column public.don_dat_hang.nguoi_nhan_id is
  'Người nhận nội bộ (đơn nội bộ). Đúng một trong doi_tac_id / nguoi_nhan_id có giá trị — ck_ddh_mot_nguoi_nhan.';

-- chung_tu: bảy loại chứng từ dùng chung bảng, nhiều loại không có người nhận
-- nào — chỉ cấm có CẢ HAI.
alter table public.chung_tu
  add column nguoi_nhan_id uuid references public.nguoi_dung(id);

alter table public.chung_tu
  add constraint ck_chung_tu_khong_hai_nguoi_nhan
  check (doi_tac_id is null or nguoi_nhan_id is null);

create index idx_chung_tu_nguoi_nhan on public.chung_tu (nguoi_nhan_id)
  where nguoi_nhan_id is not null;

comment on column public.chung_tu.nguoi_nhan_id is
  'Người nhận nội bộ, chép từ đơn nội bộ khi tạo phiếu xuất. Không đồng thời với doi_tac_id.';

-- -----------------------------------------------------------------------------
-- (b) Danh sách người nhận nội bộ
--
-- Policy "xem ho so nguoi dung" (0015) chỉ cho quản lý đọc hết, người khác chỉ
-- thấy chính mình — văn phòng tạo đơn nội bộ cần thấy cả danh sách. Hàm này
-- chỉ lộ id + họ tên của tài khoản đang hoạt động, không lộ vai trò/kho.
-- -----------------------------------------------------------------------------
create or replace function public.danh_sach_nguoi_nhan_noi_bo()
returns table (id uuid, ho_ten text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select public.vai_tro_hien_tai()) is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select nd.id, nd.ho_ten
  from public.nguoi_dung nd
  where nd.dang_hoat_dong
  order by nd.ho_ten;
end;
$$;
revoke all    on function public.danh_sach_nguoi_nhan_noi_bo() from public, anon;
grant execute on function public.danh_sach_nguoi_nhan_noi_bo() to authenticated;
comment on function public.danh_sach_nguoi_nhan_noi_bo() is
  'id + họ tên tài khoản đang hoạt động, để chọn người nhận đơn nội bộ. SECURITY DEFINER vì RLS nguoi_dung chỉ cho văn phòng đọc hồ sơ của chính mình.';

-- -----------------------------------------------------------------------------
-- (c) danh_sach_don — thêm người nhận nội bộ, tìm theo tên nhân viên, lọc theo
-- chế độ. Đổi tham số + kiểu trả về nên drop rồi create.
-- -----------------------------------------------------------------------------
drop function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer);

create function public.danh_sach_don(
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
          select 1 from public.nguoi_dung nn
          where nn.id = dh.nguoi_nhan_id
            and public.f_unaccent(nn.ho_ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_dh, l.ngay_dh, l.trang_thai, l.ngay_giao_du_kien, l.doi_tac_id,
    dt.ten,
    l.nguoi_nhan_id, nn.ho_ten,
    (select count(*) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_dat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_da_xuat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    nd.ho_ten,
    l.ghi_chu, l.created_at,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.nguoi_dung nn on nn.id = l.nguoi_nhan_id
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
-- (d) chi_tiet_don — thêm người nhận nội bộ. dong_don gọi lại hàm này bằng tên
-- trong thân plpgsql (không phụ thuộc cứng) nên drop không kéo theo dong_don.
-- -----------------------------------------------------------------------------
drop function public.chi_tiet_don(uuid);

create function public.chi_tiet_don(p_id uuid)
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
         dh.nguoi_nhan_id, nn.ho_ten,
         dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join public.nguoi_dung nn on nn.id = dh.nguoi_nhan_id
  left join public.nguoi_dung nd on nd.id = dh.nguoi_tao_id
  where dh.id = p_id;
end;
$$;

revoke all    on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated;
comment on function public.chi_tiet_don(uuid) is
  'Header đơn đặt hàng kèm tổng số lượng đặt/đã xuất và người nhận (đối tác hoặc nội bộ).';

-- -----------------------------------------------------------------------------
-- (e) tao_phieu_xuat_tu_don — chép thêm nguoi_nhan_id. Thân hàm giữ nguyên
-- 0056, chỉ đổi câu insert chung_tu.
-- -----------------------------------------------------------------------------
create or replace function public.tao_phieu_xuat_tu_don(p_don_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
  v_so_dong integer;
  v_ma_thieu_kho text;
  v_so_ct text;
  v_kho_dau_phieu uuid;
  v_ct public.chung_tu;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
    raise exception 'Tài khoản không có quyền tạo phiếu xuất' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_don_id using errcode = '23514';
  end if;

  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, chỉ đơn đã xác nhận mới tạo được phiếu xuất',
      v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  select count(*) into v_so_dong from public.don_dat_hang_dong where don_dat_hang_id = p_don_id;
  if v_so_dong = 0 then
    raise exception 'Đơn % không có dòng nào, không tạo phiếu xuất được', v_don.so_dh
      using errcode = '23514';
  end if;

  select string_agg(sp.ma_hang, ', ' order by sp.ma_hang) into v_ma_thieu_kho
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id and sp.kho_mac_dinh_id is null;

  if v_ma_thieu_kho is not null then
    raise exception 'Mã hàng %  chưa có kho mặc định. Sửa ở Danh mục → mã hàng → kho mặc định rồi tạo lại phiếu.',
      v_ma_thieu_kho
      using errcode = '23514';
  end if;

  v_so_ct := public.sinh_so_ct('XUAT'::public.loai_ct);

  select sp.kho_mac_dinh_id into v_kho_dau_phieu
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id
  limit 1;

  -- Đúng một trong doi_tac_id / nguoi_nhan_id của đơn có giá trị (0076), chép
  -- cả hai là đủ — ck_chung_tu_khong_hai_nguoi_nhan không bao giờ vướng.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, nguoi_nhan_id, don_dat_hang_id)
  values (v_so_ct, 'XUAT', v_kho_dau_phieu, v_don.doi_tac_id, v_don.nguoi_nhan_id, v_don.id)
  returning * into v_ct;

  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  select v_ct.id, d.san_pham_id, d.so_luong_dat, 0, 0, sp.kho_mac_dinh_id
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id;

  update public.chung_tu
  set tong_so_luong = (select coalesce(sum(so_luong), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id)
  where id = v_ct.id;

  select * into v_ct from public.chung_tu where id = v_ct.id;

  return v_ct;
end;
$$;

-- -----------------------------------------------------------------------------
-- (f) chi_tiet_chung_tu — thêm người nhận nội bộ cho đầu phiếu xuất. Đổi kiểu
-- trả về nên drop rồi create; thân giữ nguyên 0051.
-- -----------------------------------------------------------------------------
drop function public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
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
         ct.nguoi_nhan_id, nn.ho_ten
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.nguoi_dung nn  on nn.id = ct.nguoi_nhan_id
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
-- (g) danh_sach_chung_tu — cột ten_doi_tac hiện "Nội bộ — <họ tên>" cho phiếu
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
          select 1 from public.nguoi_dung nn
          where nn.id = ct.nguoi_nhan_id
            and public.f_unaccent(nn.ho_ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_ct, l.ngay_ct, l.loai_ct, l.nguon_nhap, l.trang_thai,
    l.doi_tac_id,
    coalesce(dt.ten, 'Nội bộ — ' || nn.ho_ten),
    k.ten,
    (select count(*) from public.chung_tu_dong d where d.chung_tu_id = l.id),
    l.tong_so_luong, l.tong_tien,
    nd.ho_ten, l.ngay_ghi_so,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.nguoi_dung nn on nn.id = l.nguoi_nhan_id
  left join public.kho k         on k.id  = l.kho_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_ct desc, l.so_ct desc
  limit greatest(p_kich_thuoc, 1)
  offset greatest(p_trang - 1, 0) * greatest(p_kich_thuoc, 1);
end;
$$;

-- -----------------------------------------------------------------------------
-- (h) the_kho_san_pham — cột doi_tac hiện "Nội bộ — <họ tên>". Kiểu trả về
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
           coalesce(dt.ten, 'Nội bộ — ' || nn.ho_ten)             as doi_tac,
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
    left join public.nguoi_dung nn on nn.id = ct.nguoi_nhan_id
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
