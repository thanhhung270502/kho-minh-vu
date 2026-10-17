-- 0145: sửa phiếu đã hoàn thành (mo_sua_chung_tu) không bắt buộc lý do — người dùng 17/10/2026:
-- hộp Sửa phiếu chỉ nói tồn sẽ đổi thế nào, ô ghi chú để trống cũng được. Có ghi chú thì vẫn
-- lưu vào phiếu cũ như trước; trống thì phiếu cũ ghi "Sửa (bản sửa giữ số …)".
--
-- Thân hàm chép NGUYÊN định nghĩa đang chạy (pg_get_functiondef), chỉ đổi các dòng "-- 0145".

CREATE OR REPLACE FUNCTION public.mo_sua_chung_tu(p_chung_tu_id uuid, p_ly_do text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
  v_so_cu text;
  v_lan integer;
  v_moi uuid;
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
  if v_ct.loai_ct not in ('XUAT', 'NHAP') then
    raise exception 'Chỉ sửa được hóa đơn và phiếu nhập' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'HOAN_THANH' then
    raise exception 'Phiếu % chưa hoàn thành — sửa thẳng trên phiếu, không cần mở sửa', v_ct.so_ct -- 0145: đổi chữ
      using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS: kiểm quyền tường minh, cùng luật với huy_chung_tu.
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được sửa chứng từ' using errcode = '42501';
  end if;
  if not public.co_quyen('sua_phieu') then
    raise exception 'Tài khoản chưa có quyền Sửa phiếu' using errcode = '42501';
  end if;

  -- 1. Đảo sổ — chỉ movement gốc của phiếu này (phiếu chỉ ghi sổ một lần).
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

  -- 2. Phiếu cũ nhường số: "<số>-S1", "<số>-S2"... theo số lần đã sửa.
  select count(*) + 1 into v_lan
  from public.chung_tu
  where left(so_ct, length(v_ct.so_ct) + 2) = v_ct.so_ct || '-S'
    and substr(so_ct, length(v_ct.so_ct) + 3) ~ '^[0-9]+$';
  v_so_cu := v_ct.so_ct || '-S' || v_lan;

  update public.chung_tu
  set so_ct = v_so_cu,
      trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Sửa' || coalesce(': ' || nullif(trim(p_ly_do), ''), '') || ' (bản sửa giữ số ' || v_ct.so_ct || ')' -- 0145
  where id = p_chung_tu_id;

  -- 3. Bản sửa: nháp, đúng số cũ, chép đầu phiếu (người nhận nằm ở chung_tu_nguoi_nhan, chép ở dưới). Tổng tính lại khi ghi sổ.
  insert into public.chung_tu (
    so_ct, loai_ct, ngay_ct, kho_id, kho_den_id, doi_tac_id, don_dat_hang_id, chung_tu_goc_id,
    trang_thai, giam_gia, ly_do_xuat_am, ghi_chu_ly_do, ghi_chu, nguoi_tao_id, nguon_nhap,
    pham_vi_nhom_hang, ban_sua_cua_id
  ) values (
    v_ct.so_ct, v_ct.loai_ct, v_ct.ngay_ct, v_ct.kho_id, v_ct.kho_den_id, v_ct.doi_tac_id,
    v_ct.don_dat_hang_id, v_ct.chung_tu_goc_id, 'NHAP_LIEU', v_ct.giam_gia, v_ct.ly_do_xuat_am,
    v_ct.ghi_chu_ly_do, v_ct.ghi_chu, v_ct.nguoi_tao_id, v_ct.nguon_nhap, v_ct.pham_vi_nhom_hang,
    p_chung_tu_id
  )
  returning id into v_moi;

  insert into public.chung_tu_dong (
    chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, so_luong_he_thong, ghi_chu,
    created_at, kho_id, nguoi_nhan_id
  )
  select v_moi, d.san_pham_id, d.so_luong, d.don_gia, d.thanh_tien, d.so_luong_he_thong, d.ghi_chu,
         d.created_at, d.kho_id, d.nguoi_nhan_id
  from public.chung_tu_dong d where d.chung_tu_id = p_chung_tu_id;

  insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
  select v_moi, n.nguoi_nhan_id, n.thu_tu
  from public.chung_tu_nguoi_nhan n where n.chung_tu_id = p_chung_tu_id;

  -- Phiếu trả hàng tham chiếu phiếu gốc đi theo bản sửa.
  update public.chung_tu set chung_tu_goc_id = v_moi where chung_tu_goc_id = p_chung_tu_id;

  return v_moi;
end;
$function$;

