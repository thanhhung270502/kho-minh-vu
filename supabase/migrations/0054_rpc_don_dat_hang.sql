-- =============================================================================
-- 0054 — RPC đọc cho màn đơn đặt hàng (DDH-01, DDH-02)
--
-- Cùng khuôn `danh_sach_chung_tu` / `chi_tiet_chung_tu` / `dong_chung_tu` của
-- migration 0045: lọc và phân trang chạy ở server, `tong_so_dong` đi kèm mỗi
-- dòng để giao diện khỏi gọi thêm một lượt đếm.
--
-- Quyết định phân quyền đọc (chốt ở 04-03-PLAN.md, không lặp lại ở 04-CONTEXT.md
-- cũ): cả BỐN vai trò đọc đơn, KHÔNG lọc theo kho — policy "doc don dat hang"
-- của 0016 đã là `using (true)`, và tờ phiếu đi lấy hàng in ra là để thủ kho
-- cầm. Chặn thật nằm ở chiều GHI (0052). Vì vậy ba hàm dưới đây chỉ kiểm
-- "đã đăng nhập chưa", không kiểm vai trò/kho như `danh_sach_chung_tu`.
--
-- D-04: KHÔNG trả cột "còn lại" — `dong_don` trả cả `so_luong_dat` và
-- `so_luong_da_xuat`, phép trừ làm ở mapper `types.ts` tầng client.
-- Chốt 19/09 câu 7: đơn không để giá — không hàm nào dưới đây đọc cột đơn giá.
-- =============================================================================

create or replace function public.danh_sach_don(
  p_trang_thai public.trang_thai_ddh default null,
  p_doi_tac_id uuid default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh,
  ngay_giao_du_kien date, doi_tac_id uuid, ten_doi_tac text, so_dong bigint,
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
  -- T-04-16: kẹp kích thước trang, đúng cách 0045 đã làm.
  v_kich_thuoc integer := least(greatest(coalesce(p_kich_thuoc, 50), 1), 200);
  v_trang integer := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select dh.*
    from public.don_dat_hang dh
    where (p_trang_thai is null or dh.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
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
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_dh, l.ngay_dh, l.trang_thai, l.ngay_giao_du_kien, l.doi_tac_id,
    dt.ten,
    (select count(*) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_dat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_da_xuat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    nd.ho_ten,
    l.ghi_chu, l.created_at,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_dh desc, l.so_dh desc
  limit v_kich_thuoc
  offset (v_trang - 1) * v_kich_thuoc;
end;
$$;

-- --- Chi tiết: header ---------------------------------------------------------
create or replace function public.chi_tiet_don(p_id uuid)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh,
  ngay_giao_du_kien date, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
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
         dh.doi_tac_id, dt.ma, dt.ten, dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join public.nguoi_dung nd on nd.id = dh.nguoi_tao_id
  where dh.id = p_id;
end;
$$;

-- --- Chi tiết: các dòng -------------------------------------------------------
create or replace function public.dong_don(p_id uuid)
returns table (
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong_dat numeric, so_luong_da_xuat numeric,
  kho_mac_dinh_id uuid, ten_kho_mac_dinh text, created_at timestamptz
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

  -- Quyền xem dòng bám theo quyền xem đơn: hàm trên đã kiểm đăng nhập.
  -- Đúng cách `dong_chung_tu` gọi lại `chi_tiet_chung_tu` ở 0045 — không lặp
  -- logic quyền ở hai nơi.
  if not exists (select 1 from public.chi_tiet_don(p_id)) then
    return;
  end if;

  -- Liệt kê cột san_pham tường minh, KHÔNG chọn nguyên hàng — 0029 đã thu
  -- quyền đọc mức bảng, chọn nguyên hàng trả 42501. kho_mac_dinh_id trả null khi mã chưa gán kho
  -- (4/3.270 mã còn thiếu) — giao diện dùng để chặn đúng chỗ, không đoán kho.
  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong_dat, d.so_luong_da_xuat,
         sp.kho_mac_dinh_id, k.ten,
         d.created_at
  from public.don_dat_hang_dong d
  join public.san_pham sp        on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k          on k.id = sp.kho_mac_dinh_id
  where d.don_dat_hang_id = p_id
  order by d.created_at, d.id;
end;
$$;

revoke all    on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer) from public, anon;
grant execute on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer) to authenticated;
revoke all    on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated;
revoke all    on function public.dong_don(uuid) from public, anon;
grant execute on function public.dong_don(uuid) to authenticated;

comment on function public.danh_sach_don(public.trang_thai_ddh, uuid, date, date, text, integer, integer) is
  'Danh sách đơn đặt hàng, lọc + phân trang ở server, tong_so_dong là tổng đơn khớp bộ lọc trước phân trang. Cả bốn vai trò đọc được, không lọc theo kho (chặn ghi đã siết ở 0052).';
comment on function public.chi_tiet_don(uuid) is
  'Header đơn đặt hàng kèm tổng số lượng đặt/đã xuất của mọi dòng.';
comment on function public.dong_don(uuid) is
  'Các dòng của đơn đặt hàng. Không trả cột đơn giá (đơn không có giá) và không trả cột "còn lại" (D-04 — tính ở mapper client từ so_luong_dat - so_luong_da_xuat).';
