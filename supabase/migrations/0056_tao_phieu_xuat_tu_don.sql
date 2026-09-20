-- =============================================================================
-- 0056 — Sinh phiếu xuất từ đơn đã xác nhận (Phase 4, plan 04-04, DDH-04/XUAT-01)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Version này đã được áp lên cloud bởi một
-- phiên làm việc khác, file nguồn không có trong repo. Trích từ `pg_get_functiondef`.
--
-- Đây là đường đạt mốc "dưới 20 giây một phiếu" (XUAT-01): mọi dòng được điền
-- sẵn `so_luong = so_luong_dat` (D-10), kho từng dòng lấy từ
-- `san_pham.kho_mac_dinh_id` (D-13 + chốt 19/09 câu 8). Văn phòng chỉ gõ lại
-- dòng nào kho lấy thiếu rồi ghi sổ.
--
-- Cả hàm nằm trong MỘT transaction ngầm định của RPC — nguyên tắc kiến trúc số
-- 4 (ghi sổ phải atomic). Cố ý KHÔNG bọc exception: lỗi ở bước nào thì rollback
-- toàn bộ, không để lại chứng từ mồ côi.
-- =============================================================================

create or replace function public.tao_phieu_xuat_tu_don(p_don_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
  v_so_dong integer;
  v_ma_thieu_kho text;
  v_so_ct text;
  v_kho_dau_phieu uuid;
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  -- D-06: thủ kho không tạo phiếu xuất từ đơn. Ngữ cảnh không JWT (migration/
  -- script/pgTAP chạy dưới postgres) được coi như quan_ly, đúng quy ước đã
  -- dùng ở sinh_so_dh/xac_nhan_don (0052/0053).
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

  -- Chặn TRƯỚC khi tạo bất cứ thứ gì — không để lại chứng từ rác nếu có mã
  -- thiếu kho mặc định. Liệt kê đúng mã hàng để người dùng biết chỗ sửa.
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

  -- chung_tu.kho_id là NOT NULL nên phiếu bắt buộc có kho đầu phiếu, dù mỗi
  -- dòng có thể đi kho khác qua chung_tu_dong.kho_id ở bước dưới (D-13, kho
  -- theo từng dòng đã dựng từ migration 0041).
  select sp.kho_mac_dinh_id into v_kho_dau_phieu
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id
  limit 1;

  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, don_dat_hang_id)
  values (v_so_ct, 'XUAT', v_kho_dau_phieu, v_don.doi_tac_id, v_don.id)
  returning * into v_ct;

  -- so_luong = so_luong_dat (D-10, điền sẵn). don_gia/thanh_tien cố định 0:
  -- phiếu xuất không mang giá bán (chốt 19/09 câu 7) — giá vốn do trigger
  -- tính lúc ghi sổ, RPC này không đọc đơn giá từ don_dat_hang_dong.
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  select v_ct.id, d.san_pham_id, d.so_luong_dat, 0, 0, sp.kho_mac_dinh_id
  from public.don_dat_hang_dong d
  join public.san_pham sp on sp.id = d.san_pham_id
  where d.don_dat_hang_id = p_don_id
  order by d.created_at, d.id;

  update public.chung_tu
  set tong_so_luong = (select coalesce(sum(so_luong), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id)
  where id = v_ct.id;

  select * into v_ct from public.chung_tu where id = v_ct.id;

  -- KHÔNG dùng khối bắt-mọi-lỗi ở đây — giữ đúng tính atomic: lỗi ở bước nào
  -- phải rollback toàn bộ, để transaction ngầm định của RPC tự lo, đúng lý do
  -- đã ghi ở ghi_so_chung_tu (0011 dòng 243-245).
  return v_ct;
end;
$$;

comment on function public.tao_phieu_xuat_tu_don(uuid) is
  'Sinh phiếu xuất NHAP_LIEU từ một đơn DA_XAC_NHAN, điền sẵn số lượng = số đặt và kho từng dòng = kho mặc định của mã (D-10, D-13). Chặn sớm nếu có mã chưa gán kho mặc định.';

revoke all    on function public.tao_phieu_xuat_tu_don(uuid) from public, anon;
grant execute on function public.tao_phieu_xuat_tu_don(uuid) to authenticated;
