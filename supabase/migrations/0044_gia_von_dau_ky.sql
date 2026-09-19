-- =============================================================================
-- 0044 — Đặt giá vốn đầu kỳ (Phase 3, D-02)
--
-- Ngày go-live, cả 3.268 mã có gia_von = 0 và dữ liệu nhập KiotViet cũ KHÔNG có
-- đơn giá, nên không suy được giá vốn từ lịch sử. Người dùng muốn nạp bằng Excel.
--
-- Nhưng `san_pham.gia_von` đã bị thu quyền ghi của client ở 0015/0029 — cố ý,
-- để bình quân gia quyền không bị ghi đè âm thầm. Cửa hợp lệ duy nhất là RPC này,
-- với ba lớp chặn:
--   1. chỉ vai trò quan_ly,
--   2. chỉ đặt được cho mã đang có gia_von = 0 (đã nhập hàng thật là khóa),
--   3. ghi nhật ký TƯỜNG MINH — trigger 0027 cố tình bỏ qua cột gia_von nên
--      không thể trông vào nó.
-- =============================================================================

alter table public.nhat_ky_sua drop constraint nhat_ky_sua_nguon_check;
alter table public.nhat_ky_sua add constraint nhat_ky_sua_nguon_check
  check (nguon in ('form','sua_o','hang_loat','goi_y_duoi','import','ra_ghi_chu','cai_dat','script','gia_von_dau_ky'));

create or replace function public.dat_gia_von_dau_ky(
  p_du_lieu jsonb,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nguoi uuid := auth.uid();
  v_dong jsonb;
  v_ma text;
  v_gia numeric(18,4);
  v_sp public.san_pham;
  v_dat jsonb := '[]'::jsonb;
  v_bo_qua jsonb := '[]'::jsonb;
  v_loi jsonb := '[]'::jsonb;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được đặt giá vốn đầu kỳ' using errcode = '42501';
  end if;

  for v_dong in select * from jsonb_array_elements(coalesce(p_du_lieu, '[]'::jsonb))
  loop
    v_ma  := nullif(trim(coalesce(v_dong->>'ma_hang', '')), '');
    v_gia := nullif(v_dong->>'gia_von', '')::numeric;

    if v_ma is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', '', 'ly_do', 'Thiếu mã hàng');
      continue;
    end if;
    if v_gia is null or v_gia <= 0 then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Giá vốn phải là số lớn hơn 0');
      continue;
    end if;

    select * into v_sp from public.san_pham where ma_hang = v_ma;

    if v_sp.id is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Không có mã này trong danh mục');
      continue;
    end if;

    if coalesce(v_sp.gia_von, 0) <> 0 then
      v_bo_qua := v_bo_qua || jsonb_build_object(
        'ma_hang', v_ma, 'gia_von_hien_tai', v_sp.gia_von,
        'ly_do', 'Mã đã có giá vốn — hệ thống tự tính từ phiếu nhập, không đặt đè');
      continue;
    end if;

    v_dat := v_dat || jsonb_build_object('ma_hang', v_ma, 'gia_von', v_gia);

    if not p_chi_kiem_tra then
      update public.san_pham set gia_von = v_gia where id = v_sp.id;

      -- Trigger 0027 bỏ qua cột gia_von nên phải tự ghi nhật ký.
      insert into public.nhat_ky_sua (bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguon, nguoi_sua_id)
      values ('san_pham', v_sp.id, 'gia_von', to_jsonb(0), to_jsonb(v_gia), 'gia_von_dau_ky', v_nguoi);
    end if;
  end loop;

  return jsonb_build_object(
    'da_nap', not p_chi_kiem_tra,
    'dat', jsonb_array_length(v_dat),
    'bo_qua', jsonb_array_length(v_bo_qua),
    'so_loi', jsonb_array_length(v_loi),
    'chi_tiet_dat', v_dat,
    'chi_tiet_bo_qua', v_bo_qua,
    'loi', v_loi
  );
end;
$$;

comment on function public.dat_gia_von_dau_ky(jsonb, boolean) is
  'Đặt giá vốn đầu kỳ cho mã đang có gia_von = 0. Chỉ quản lý. p_chi_kiem_tra = true để xem trước, không ghi.';

revoke all    on function public.dat_gia_von_dau_ky(jsonb, boolean) from public, anon;
grant execute on function public.dat_gia_von_dau_ky(jsonb, boolean) to authenticated;
