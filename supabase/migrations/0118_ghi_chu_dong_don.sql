-- 0118: ghi chú theo từng dòng của đơn đặt hàng (yêu cầu 08/10/2026).
--
-- - don_dat_hang_dong.ghi_chu (text, null = không ghi chú).
-- - them_dong_don nhận thêm p_ghi_chu; chỉ cộng dồn vào dòng cũ khi cùng mã, cùng
--   người nhận dòng VÀ cùng ghi chú — hai ghi chú khác nhau là hai dòng riêng.
-- - dong_don trả thêm ghi_chu.
-- - tao_phieu_xuat_tu_don chép ghi chú dòng sang chung_tu_dong.ghi_chu của hóa đơn.

alter table public.don_dat_hang_dong add column if not exists ghi_chu text;

-- Đổi chữ ký: bỏ bản 4 tham số để PostgREST không gặp hai hàm trùng tên.
drop function if exists public.them_dong_don(uuid, uuid, numeric, uuid);

create function public.them_dong_don(
  p_don_id uuid,
  p_san_pham_id uuid,
  p_so_luong numeric,
  p_nguoi_nhan_id uuid default null,
  p_ghi_chu text default null
)
returns table(dong_id uuid, da_cong_don boolean, so_luong_moi numeric)
language plpgsql
set search_path to ''
as $function$
declare
  v_dong uuid;
  v_ghi_chu text := nullif(trim(coalesce(p_ghi_chu, '')), '');
begin
  if p_so_luong is null or p_so_luong <= 0 then
    raise exception 'Số lượng phải lớn hơn 0' using errcode = '22023';
  end if;
  if not public.co_quyen('tao_don') then
    raise exception 'Tài khoản chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  -- Điểm tuần tự hóa: hai lần gõ cùng mã đồng thời xếp hàng ở đây.
  perform 1 from public.don_dat_hang d
  where d.id = p_don_id and d.trang_thai = 'TAM'
  for update;
  if not found then
    raise exception 'Đơn không còn là đơn tạm hoặc bạn không có quyền sửa đơn này' using errcode = '42501';
  end if;

  select dd.id into v_dong
  from public.don_dat_hang_dong dd
  where dd.don_dat_hang_id = p_don_id
    and dd.san_pham_id = p_san_pham_id
    and dd.nguoi_nhan_id is not distinct from p_nguoi_nhan_id
    and dd.ghi_chu is not distinct from v_ghi_chu
  order by dd.created_at, dd.id
  limit 1
  for update;

  if v_dong is not null then
    return query
    update public.don_dat_hang_dong dd
       set so_luong_dat = dd.so_luong_dat + p_so_luong
     where dd.id = v_dong
    returning dd.id, true, dd.so_luong_dat;
  else
    return query
    insert into public.don_dat_hang_dong as dd (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id, ghi_chu)
    values (p_don_id, p_san_pham_id, p_so_luong, p_nguoi_nhan_id, v_ghi_chu)
    returning dd.id, false, dd.so_luong_dat;
  end if;
end;
$function$;

grant execute on function public.them_dong_don(uuid, uuid, numeric, uuid, text) to authenticated;

-- Đổi kiểu trả về thì phải drop rồi tạo lại.
drop function if exists public.dong_don(uuid);

create function public.dong_don(p_id uuid)
returns table(
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong_dat numeric, so_luong_da_xuat numeric, kho_mac_dinh_id uuid,
  ten_kho_mac_dinh text, created_at timestamptz, nguoi_nhan_id uuid,
  ten_nguoi_nhan text, ghi_chu text
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
         d.ghi_chu
  from public.don_dat_hang_dong d
  join public.san_pham sp        on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k          on k.id = sp.kho_mac_dinh_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id
  where d.don_dat_hang_id = p_id
  order by d.created_at, d.id;
end;
$function$;

grant execute on function public.dong_don(uuid) to authenticated;

create or replace function public.tao_phieu_xuat_tu_don(p_don_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path to ''
as $function$
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

  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id)
  values (v_so_ct, 'XUAT', v_kho_dau_phieu, v_don.doi_tac_id, v_don.id)
  returning * into v_ct;

  insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
  select v_ct.id, ddn.nguoi_nhan_id, ddn.thu_tu
  from public.don_dat_hang_nguoi_nhan ddn
  where ddn.don_dat_hang_id = p_don_id;

  -- Dòng hóa đơn 1:1 với dòng đơn, mang theo người nhận và ghi chú riêng của dòng (0118).
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, nguoi_nhan_id, ghi_chu)
  select v_ct.id, d.san_pham_id, d.so_luong_dat, 0, 0, sp.kho_mac_dinh_id, d.nguoi_nhan_id, d.ghi_chu
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
$function$;
