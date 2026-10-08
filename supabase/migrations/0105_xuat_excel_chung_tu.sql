-- 0105: Xuất Excel hóa đơn / phiếu nhập đang lọc trên màn danh sách.
--
-- Route xuất trước đây lấy id qua danh_sach_chung_tu từng trang 200 rồi đọc dòng
-- theo lô — 800 phiếu nhập mất ~45 giây. Hàm này áp ĐÚNG bộ lọc + phạm vi kho của
-- danh_sach_chung_tu (0091) và trả thẳng mỗi dòng hàng một phần tử, trong một câu SQL.
--
-- Trả jsonb (né giới hạn 1000 dòng của PostgREST):
--   { tong: số phiếu khớp lọc, dong: [...] } — tong > p_toi_da thì dong rỗng.
-- Khóa của từng phần tử là hợp đồng với route handler (snake_case có chủ đích).

create or replace function public.xuat_excel_chung_tu(
  p_loai_ct public.loai_ct,
  p_trang_thai public.trang_thai_ct default null,
  p_doi_tac_id uuid default null,
  p_kho_id uuid default null,
  p_nguon_nhap public.nguon_nhap default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_toi_da integer default 10000
)
returns jsonb
-- Không STABLE: hàm dựng bảng tạm (plpgsql cấm DDL trong hàm non-volatile).
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_tong integer;
  v_dong jsonb;
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  drop table if exists _xx_loc;
  create temp table _xx_loc on commit drop as
  select ct.id, ct.so_ct, ct.ngay_ct, ct.kho_id, ct.doi_tac_id, ct.nguon_nhap, ct.don_dat_hang_id,
         ct.ghi_chu, ct.ly_do_xuat_am, ct.ghi_chu_ly_do
  from public.chung_tu ct
  where ct.loai_ct = p_loai_ct
    and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
    and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
    and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
    and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
    and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
    and (
      p_kho_id is null
      or ct.kho_id = p_kho_id
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = p_kho_id)
    )
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
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
        select 1
        from public.chung_tu_nguoi_nhan ctn
        join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
        where ctn.chung_tu_id = ct.id
          and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
      )
    );

  select count(*)::integer into v_tong from _xx_loc;
  if v_tong > p_toi_da then
    return jsonb_build_object('tong', v_tong, 'dong', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'so', l.so_ct,
           'ngay', l.ngay_ct,
           'ma_dat_hang', dh.so_dh,
           'ma_doi_tac', dt.ma,
           'nguon', l.nguon_nhap,
           'ma_kho', k.ma,
           'ghi_chu', l.ghi_chu,
           'ly_do_xuat_am', l.ly_do_xuat_am,
           'ghi_chu_ly_do', l.ghi_chu_ly_do,
           'nv_phieu', nn.ten,
           'ma_hang', sp.ma_hang,
           'so_luong', d.so_luong,
           'ghi_chu_dong', d.ghi_chu,
           'nv_dong', nvd.ten_viet_tat
         ) order by l.ngay_ct desc, l.so_ct desc, d.created_at, d.id), '[]'::jsonb)
    into v_dong
  from _xx_loc l
  left join public.don_dat_hang dh on dh.id = l.don_dat_hang_id
  left join public.doi_tac dt on dt.id = l.doi_tac_id
  left join public.kho k on k.id = l.kho_id
  left join lateral (
    select string_agg(nvp.ten_viet_tat, ' - ' order by ctn.thu_tu, ctn.nguoi_nhan_id) as ten
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = l.id
  ) nn on true
  left join public.chung_tu_dong d on d.chung_tu_id = l.id
  left join public.san_pham sp on sp.id = d.san_pham_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id;

  return jsonb_build_object('tong', v_tong, 'dong', v_dong);
end;
$$;

revoke all on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer) from public, anon;
grant execute on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer) to authenticated;
