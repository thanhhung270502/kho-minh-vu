-- =============================================================================
-- 0057 — Sinh phiếu trả hàng từ chứng từ gốc (Phase 4, plan 04-04, XUAT-09)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Version này đã được áp lên cloud bởi một
-- phiên làm việc khác, file nguồn không có trong repo. Trích từ `pg_get_functiondef`.
--
-- D-15: trả hàng luôn sinh từ NÚT TRÊN CHỨNG TỪ GỐC, không phải từ màn trống.
-- Phiếu xuất đã ghi sổ → "Khách trả hàng" (TRA_KHACH, tồn tăng).
-- Phiếu nhập đã ghi sổ → "Trả NCC" (TRA_NCC, tồn giảm).
-- Nhờ vậy ràng buộc `ck_tra_hang_co_goc` (0007) tự thỏa mãn, không cần người
-- dùng đi tìm chứng từ gốc bằng tay.
-- =============================================================================

create or replace function public.tao_phieu_tra(p_goc_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goc public.chung_tu;
  v_loai_tra public.loai_ct;
  v_so_ct text;
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
    raise exception 'Tài khoản không có quyền tạo phiếu trả hàng' using errcode = '42501';
  end if;

  select * into v_goc from public.chung_tu where id = p_goc_id for update;
  if v_goc.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_goc_id using errcode = '23514';
  end if;

  if v_goc.trang_thai != 'HOAN_THANH' then
    raise exception 'Chứng từ % đang ở trạng thái %, chỉ chứng từ đã ghi sổ mới tạo được phiếu trả',
      v_goc.so_ct, v_goc.trang_thai
      using errcode = '23514';
  end if;

  v_loai_tra := case v_goc.loai_ct
    when 'XUAT' then 'TRA_KHACH'::public.loai_ct
    when 'NHAP' then 'TRA_NCC'::public.loai_ct
    else null
  end;

  if v_loai_tra is null then
    raise exception 'Chỉ tạo được phiếu trả từ phiếu nhập hoặc phiếu xuất' using errcode = '23514';
  end if;

  v_so_ct := public.sinh_so_ct(v_loai_tra);

  -- ck_tra_hang_co_goc (0007_chung_tu.sql dòng 40-42) tự chặn phần còn lại —
  -- RPC chỉ cần set đúng chung_tu_goc_id, không cần kiểm thêm ở tầng ứng dụng.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, chung_tu_goc_id)
  values (v_so_ct, v_loai_tra, v_goc.kho_id, v_goc.doi_tac_id, v_goc.id)
  returning * into v_ct;

  -- Bê dòng giữ nguyên kho_id của DÒNG GỐC — trả về đúng kho đã lấy hàng ra,
  -- không phải kho đầu phiếu. Văn phòng sửa số trả sau khi phiếu mở ra.
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  select v_ct.id, cd.san_pham_id, cd.so_luong, cd.don_gia, cd.thanh_tien, cd.kho_id
  from public.chung_tu_dong cd
  where cd.chung_tu_id = p_goc_id
  order by cd.created_at, cd.id;

  update public.chung_tu
  set tong_so_luong = (select coalesce(sum(so_luong), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id),
      tong_tien     = (select coalesce(sum(thanh_tien), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id)
  where id = v_ct.id;

  select * into v_ct from public.chung_tu where id = v_ct.id;

  -- KHÔNG dùng khối bắt-mọi-lỗi ở đây — cùng lý do đã ghi ở ghi_so_chung_tu
  -- (0011 dòng 243-245) và tao_phieu_xuat_tu_don (0056): giữ tính atomic.
  return v_ct;
end;
$$;

comment on function public.tao_phieu_tra(uuid) is
  'Sinh phiếu trả NHAP_LIEU từ một chứng từ đã ghi sổ: XUAT → TRA_KHACH, NHAP → TRA_NCC (D-15, XUAT-09). Dòng bê sang giữ nguyên kho của dòng gốc để văn phòng sửa số trả.';

revoke all    on function public.tao_phieu_tra(uuid) from public, anon;
grant execute on function public.tao_phieu_tra(uuid) to authenticated;
