-- 0137: Sửa đơn đã duyệt (mo_khoa_don) và Hủy đơn (huy_don) không còn bắt buộc lý do.
--
-- Trước đây cả hai đòi lý do >= 5 ký tự (0078, 0128). Người dùng thấy ô lý do là
-- thủ tục thừa với hai thao tác này nên bỏ. Lý do vẫn nhận nếu có nhập; bỏ trống
-- thì ghi chú chỉ thêm nhãn "[mở khóa]" / "[hủy]".
--
-- Bẫy: `ghi_chu || '[hủy] ' || null` ra NULL và xóa sạch ghi chú cũ — phải
-- chuẩn hóa lý do rỗng trước khi nối. Thân hàm còn lại giữ nguyên bản 0128 / 0078.

create or replace function public.mo_khoa_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_don public.don_dat_hang;
  v_ly_do text := nullif(trim(coalesce(p_ly_do, '')), '');
begin
  if not public.co_quyen('sua_phieu') then
    raise exception 'Tài khoản chưa có quyền Sửa phiếu' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, không mở khóa được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'TAM',
      nguoi_xac_nhan_id = null,
      ngay_xac_nhan = null,
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[mở khóa]' || coalesce(' ' || v_ly_do, '')
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

comment on function public.mo_khoa_don(uuid, text) is
  'Sửa đơn đã duyệt: DA_XAC_NHAN -> TAM, quyền Sửa phiếu; lý do không bắt buộc (0137).';

create or replace function public.huy_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
  v_ly_do text := nullif(trim(coalesce(p_ly_do, '')), '');
begin
  if not public.huy_duoc_don() then
    raise exception 'Chỉ quản lý được hủy đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai not in ('TAM', 'DA_XAC_NHAN') then
    raise exception 'Đơn % đang ở trạng thái %, không hủy được. Đơn đã hoàn thành phải hủy hóa đơn trước.',
      v_don.so_dh, v_don.trang_thai using errcode = '23514';
  end if;
  -- Phòng thủ: đơn còn hóa đơn chưa hủy thì không hủy đơn (không thể xảy ra
  -- với đơn TAM/DA_XAC_NHAN theo luồng mới, nhưng dữ liệu cũ có thể có).
  if exists (select 1 from public.chung_tu
             where don_dat_hang_id = p_id and loai_ct = 'XUAT' and trang_thai <> 'DA_HUY') then
    raise exception 'Đơn % còn hóa đơn chưa hủy — hủy hóa đơn trước', v_don.so_dh using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[hủy]' || coalesce(' ' || v_ly_do, '')
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$$;

comment on function public.huy_don(uuid, text) is
  'Hủy đơn TAM/DA_XAC_NHAN, lý do không bắt buộc; đơn đã hoàn thành phải hủy hóa đơn trước (0078, 0137).';
