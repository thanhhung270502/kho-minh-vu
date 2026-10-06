-- 0111: chi_tiet_chung_tu trả thêm ho_ten_nguoi_duyet — tên người ghi sổ (cột
-- "Người nhập" của phiếu nhập). Bảng nguoi_dung chỉ cho quản lý đọc tên người
-- khác, nên phải lấy trong hàm SECURITY DEFINER này thay vì truy vấn ở giao diện.
-- Đổi kiểu trả về nên drop rồi tạo lại; giữ nguyên quyền và phạm vi kho (0091).

drop function if exists public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
returns table(
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct, nguon_nhap public.nguon_nhap,
  trang_thai public.trang_thai_ct, kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text,
  ten_doi_tac text, ghi_chu text, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text,
  ngay_ghi_so timestamp with time zone, created_at timestamp with time zone, don_dat_hang_id uuid,
  so_dh text, chung_tu_goc_id uuid, so_ct_goc text, ly_do_xuat_am text, ghi_chu_ly_do text,
  nguoi_duyet_id uuid, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], ho_ten_nguoi_duyet text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
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
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
         ndd.ho_ten
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.nguoi_dung ndd on ndd.id = ct.nguoi_duyet_id
  left join lateral (
    select coalesce(array_agg(ctn.nguoi_nhan_id order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = ct.id
  ) nn on true
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
$function$;

revoke all on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated, service_role;
