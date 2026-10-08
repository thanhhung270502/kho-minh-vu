-- 0121: dong_don trả thêm tên nhóm hàng — phiếu in Đơn đặt ghi nhóm hàng dưới mã
-- (vd. "PÔ E - 12"), theo phiếu mẫu 08/10/2026. Thân hàm chép từ 0118.

-- Đổi kiểu trả về thì phải drop rồi tạo lại.
drop function if exists public.dong_don(uuid);

create function public.dong_don(p_id uuid)
returns table(
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong_dat numeric, so_luong_da_xuat numeric, kho_mac_dinh_id uuid,
  ten_kho_mac_dinh text, created_at timestamptz, nguoi_nhan_id uuid,
  ten_nguoi_nhan text, ghi_chu text, ten_nhom_hang text
)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  -- Quyền xem dòng bám theo quyền xem đơn.
  if not exists (select 1 from public.chi_tiet_don(p_id)) then
    return;
  end if;

  -- Liệt kê cột san_pham tường minh — 0029 đã thu quyền đọc mức bảng.
  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong_dat, d.so_luong_da_xuat,
         sp.kho_mac_dinh_id, k.ten,
         d.created_at,
         d.nguoi_nhan_id, nvd.ten_day_du,
         d.ghi_chu,
         nh.ten
  from public.don_dat_hang_dong d
  join public.san_pham sp        on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k          on k.id = sp.kho_mac_dinh_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  where d.don_dat_hang_id = p_id
  order by d.created_at, d.id;
end;
$function$;

grant execute on function public.dong_don(uuid) to authenticated;
