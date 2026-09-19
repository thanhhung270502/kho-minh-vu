-- =============================================================================
-- 0046 — Chỉ quản lý hủy được phiếu NHẬP đã ghi sổ (Phase 3, D-11)
--
-- Chép nguyên văn 0012 rồi chèn đúng một khối kiểm. Các loại chứng từ khác giữ
-- nguyên luật cũ — không đoán trước Phase 4.
-- =============================================================================

create or replace function public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;
  if v_ct.trang_thai = 'DA_HUY' then
    raise exception 'Chứng từ % đã hủy rồi', v_ct.so_ct using errcode = '23514';
  end if;
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Phải nhập lý do khi hủy chứng từ' using errcode = '23514';
  end if;
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được hủy chứng từ' using errcode = '42501';
  end if;

  -- D-11: hủy phiếu NHẬP đã ghi sổ làm đổi tồn VÀ giá vốn của mọi mã trong
  -- phiếu — hậu quả rộng nhất trong các thao tác hằng ngày, nên siết về quản lý.
  -- Phiếu còn NHAP_LIEU chưa đụng tồn, người nhập tự hủy được.
  if v_ct.loai_ct = 'NHAP' and v_ct.trang_thai = 'HOAN_THANH'
     and (select public.vai_tro_hien_tai()) <> 'quan_ly' then
    raise exception 'Chỉ quản lý được hủy phiếu nhập đã ghi sổ' using errcode = '42501';
  end if;

  -- Chứng từ mới nhập liệu chưa đụng tồn: hủy thẳng, không sinh bút toán đảo.
  if v_ct.trang_thai = 'NHAP_LIEU' then
    update public.chung_tu
    set trang_thai = 'DA_HUY',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
    where id = p_chung_tu_id
    returning * into v_ct;
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
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
  where id = p_chung_tu_id
  returning * into v_ct;

  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
  end if;

  return v_ct;
end;
$$;;

comment on function public.huy_chung_tu(uuid, text) is
  'Hủy chứng từ bằng bút toán đảo. Phiếu NHẬP đã ghi sổ chỉ quản lý hủy được (D-11). LƯU Ý: bút toán đảo của phiếu NHẬP có so_luong âm nên trigger giá vốn KHÔNG tính lại — giá vốn không tự quay về số trước khi nhập. Đó là hành vi đúng của bình quân gia quyền di động.';
