-- =============================================================================
-- 0045 — RPC đọc cho màn phiếu nhập (Phase 3, NHAP-01)
--
-- Cùng khuôn `danh_sach_san_pham` của Phase 2: lọc và phân trang chạy ở server,
-- `tong_so_dong` đi kèm mỗi dòng để giao diện khỏi gọi thêm một lượt đếm.
--
-- SECURITY DEFINER vì `san_pham`/`kho_movement` đã bị thu quyền đọc mức bảng.
-- Đổi lại, hàm phải TỰ áp phạm vi kho của thủ kho — RLS không chạy trong definer.
--
-- Tách chi tiết thành HAI hàm (header và dòng) thay vì trả một jsonb: hai hàm
-- trả table cho ra kiểu TypeScript thật, jsonb chỉ ra `Json`.
-- =============================================================================

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
      -- Thủ kho: chỉ phiếu chạm tới kho được phân công, tính cả kho theo dòng.
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
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_ct, l.ngay_ct, l.loai_ct, l.nguon_nhap, l.trang_thai,
    l.doi_tac_id,
    dt.ten,
    k.ten,
    (select count(*) from public.chung_tu_dong d where d.chung_tu_id = l.id),
    l.tong_so_luong, l.tong_tien,
    nd.ho_ten, l.ngay_ghi_so,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt on dt.id = l.doi_tac_id
  left join public.kho k      on k.id  = l.kho_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_ct desc, l.so_ct desc
  limit greatest(p_kich_thuoc, 1)
  offset greatest(p_trang - 1, 0) * greatest(p_kich_thuoc, 1);
end;
$$;

-- --- Chi tiết: header ---------------------------------------------------------
create or replace function public.chi_tiet_chung_tu(p_id uuid)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct,
  nguon_nhap public.nguon_nhap, trang_thai public.trang_thai_ct,
  kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
  ghi_chu text, tong_so_luong numeric, tong_tien numeric,
  ho_ten_nguoi_tao text, ngay_ghi_so timestamptz, created_at timestamptz
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
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at
  from public.chung_tu ct
  left join public.kho k        on k.id  = ct.kho_id
  left join public.doi_tac dt   on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd on nd.id = ct.nguoi_tao_id
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

-- --- Chi tiết: các dòng -------------------------------------------------------
create or replace function public.dong_chung_tu(p_id uuid)
returns table (
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong numeric, don_gia numeric, thanh_tien numeric,
  kho_id uuid, ten_kho text, ghi_chu text
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

  -- Quyền xem dòng bám theo quyền xem phiếu: hàm trên đã lọc phạm vi kho.
  if not exists (select 1 from public.chi_tiet_chung_tu(p_id)) then
    return;
  end if;

  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong, d.don_gia, d.thanh_tien,
         coalesce(d.kho_id, ct.kho_id), k.ten, d.ghi_chu
  from public.chung_tu_dong d
  join public.chung_tu ct       on ct.id = d.chung_tu_id
  join public.san_pham sp       on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k        on k.id = coalesce(d.kho_id, ct.kho_id)
  where d.chung_tu_id = p_id
  order by d.created_at, d.id;
end;
$$;

revoke all    on function public.danh_sach_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer, integer) from public, anon;
grant execute on function public.danh_sach_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer, integer) to authenticated;
revoke all    on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated;
revoke all    on function public.dong_chung_tu(uuid) from public, anon;
grant execute on function public.dong_chung_tu(uuid) to authenticated;
