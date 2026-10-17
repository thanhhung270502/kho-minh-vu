-- 0144: hủy phiếu trả hàng (TRA_KHACH / TRA_NCC) và phiếu nhập (NHAP) không cần lý do nữa —
-- người dùng 17/10/2026 "bỏ lý do" ở hộp Hủy phiếu. Hóa đơn đã bỏ từ 0139; còn kiểm kê vẫn bắt buộc.
--
-- Thân hàm chép NGUYÊN định nghĩa đang chạy (pg_get_functiondef, = 0139), chỉ đổi dòng "-- 0144".

CREATE OR REPLACE FUNCTION public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
 RETURNS public.chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
  v_ly_do text := nullif(trim(coalesce(p_ly_do, '')), '');
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;

  -- 0136: phiếu nhập có dòng thuộc nhóm hàng người gọi không được xem → không thao tác.
  if public.so_dong_an_nhom_hang(p_chung_tu_id) > 0 then
    raise exception 'Phiếu có hàng thuộc nhóm hàng bạn không được xem — nhờ Quản lý/Admin hoặc người phụ trách nhóm đó xử lý'
      using errcode = '42501';
  end if;
  if v_ct.trang_thai = 'DA_HUY' then
    raise exception 'Chứng từ % đã hủy rồi', v_ct.so_ct using errcode = '23514';
  end if;
  -- 0139: hóa đơn (XUAT) hủy không bắt buộc lý do — giống Sửa đơn / Hủy đơn (0137).
  -- 0144: phiếu trả, phiếu nhập cũng bỏ. Kiểm kê vẫn bắt buộc.
  if v_ly_do is null and v_ct.loai_ct not in ('XUAT', 'NHAP', 'TRA_KHACH', 'TRA_NCC') then -- 0144
    raise exception 'Phải nhập lý do khi hủy chứng từ' using errcode = '23514';
  end if;
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được hủy chứng từ' using errcode = '42501';
  end if;

  -- 0066: thủ kho không hủy được phiên KIEM_KE của kho khác — áp cho cả phiên
  -- còn NHAP_LIEU (khác NHAP/XUAT/TRA_* vốn không có khái niệm "kho của phiếu"
  -- bị giới hạn ở bước hủy nháp, vì D-02 cho phép kiểm kê chạy song song với
  -- biến động kho khác — hủy nhầm phiên kho khác vẫn là rủi ro cần chặn).
  if v_ct.loai_ct = 'KIEM_KE' and (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ hủy được phiên kiểm kê của kho mình' using errcode = '42501';
  end if;

  -- 0046 mới chặn NHAP; 0051 thêm XUAT/TRA_NCC/TRA_KHACH. 0066 thêm KIEM_KE:
  -- hủy phiên đã duyệt = đảo sổ cái + đảo cả tồn tạm KiotViet vừa nạp lúc duyệt
  -- (D-06) — cùng mức rủi ro như đảo NHAP/XUAT, chỉ quản lý được hủy.
  -- Phiếu còn NHAP_LIEU chưa đụng tồn, người nhập tự hủy được.
  -- CHUYEN_KHO/DIEU_CHINH chưa có giao diện, để nguyên luật cũ, sẽ quyết ở
  -- phase của chúng.
  -- 0083 (QUYEN-01): hủy hóa đơn đã ghi sổ = quyền "Sửa hóa đơn" của chức vụ.
  -- 0130: hóa đơn và phiếu trả đi theo quyền Xác nhận / duyệt đơn — người chỉ có
  -- Tạo đơn đặt hàng không lập / duyệt / hủy được.
  if v_ct.loai_ct in ('XUAT', 'TRA_KHACH', 'TRA_NCC') and not public.co_quyen('xac_nhan_don') then
    raise exception 'Tài khoản chưa có quyền Xác nhận / duyệt đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'XUAT' and v_ct.trang_thai = 'HOAN_THANH' and not public.co_quyen('sua_hoa_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Sửa hóa đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct in ('NHAP','TRA_NCC','TRA_KHACH','KIEM_KE') and v_ct.trang_thai = 'HOAN_THANH'
     and auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được hủy chứng từ đã ghi sổ' using errcode = '42501';
  end if;

  -- Chứng từ mới nhập liệu chưa đụng tồn: hủy thẳng, không sinh bút toán đảo.
  if v_ct.trang_thai = 'NHAP_LIEU' then
    update public.chung_tu
    set trang_thai = 'DA_HUY',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy' || coalesce(': ' || v_ly_do, '')
    where id = p_chung_tu_id
    returning * into v_ct;
    perform public._huy_don_theo_hoa_don(v_ct, v_ly_do);
    return v_ct;
  end if;

  -- Đã ghi sổ: đảo TỪNG movement. Điều kiện la_but_toan_dao = false tránh đảo
  -- lại chính bút toán đảo nếu hàm bị gọi hai lần.
  for v_mv in
    select * from public.kho_movement
    where chung_tu_id = p_chung_tu_id and la_but_toan_dao = false
  loop
    insert into public.kho_movement (
      ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem,
      chung_tu_id, chung_tu_dong_id, la_but_toan_dao
    ) values (
      now(), v_mv.kho_id, v_mv.san_pham_id, -v_mv.so_luong, v_mv.gia_von_tai_thoi_diem,
      v_mv.chung_tu_id, v_mv.chung_tu_dong_id, true
    );
  end loop;

  update public.chung_tu
  set trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy' || coalesce(': ' || v_ly_do, '')
  where id = p_chung_tu_id
  returning * into v_ct;

  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
  end if;
  perform public._huy_don_theo_hoa_don(v_ct, v_ly_do);

  return v_ct;
end;
$function$;

