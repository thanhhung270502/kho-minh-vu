-- =============================================================================
-- 0019 — RPC nạp danh mục từ file export KiotViet
--
-- supabase-js không mở transaction nhiều lệnh được. Để việc nạp là "toàn bộ
-- hoặc không gì cả", script gửi toàn bộ dữ liệu đã validate dưới dạng jsonb và
-- hàm này làm mọi upsert bên trong MỘT transaction.
--
-- Cách thay thế (gọi nhiều lệnh rời rạc rồi tự dọn khi lỗi) chính là thứ đã bị
-- cấm ở nghiệp vụ ghi sổ — không có lý do gì nới lỏng ở đây.
-- =============================================================================

create or replace function public.nap_danh_muc_kiotviet(p_du_lieu jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nhom int := 0;
  v_dvt int := 0;
  v_cong_doan int := 0;
  v_doi_tac int := 0;
  v_san_pham int := 0;
begin
  -- 1. Nhóm hàng
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'nhom_hang','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.nhom_hang (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do update set ten = excluded.ten
    returning 1
  ) select count(*) into v_nhom from da_ghi;

  -- 2. Đơn vị tính bổ sung (ngoài bộ đã có ở 0018)
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'don_vi_tinh','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.don_vi_tinh (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do nothing
    returning 1
  ) select count(*) into v_dvt from da_ghi;

  -- 3. Công đoạn bổ sung
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'cong_doan','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.cong_doan (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do nothing
    returning 1
  ) select count(*) into v_cong_doan from da_ghi;

  -- 4. Đối tác
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'doi_tac','[]'::jsonb))
      as x(ma text, ten text, loai text, dien_thoai text, email text,
           dia_chi text, khu_vuc text, phuong_xa text, ma_so_thue text, ghi_chu text)
  ), da_ghi as (
    insert into public.doi_tac (ma, ten, loai, dien_thoai, email, dia_chi,
                                khu_vuc, phuong_xa, ma_so_thue, ghi_chu)
    select ma, ten, loai::public.loai_doi_tac, dien_thoai, email, dia_chi,
           khu_vuc, phuong_xa, ma_so_thue, ghi_chu
    from nguon
    on conflict (ma) do update set
      ten = excluded.ten, loai = excluded.loai, dien_thoai = excluded.dien_thoai,
      email = excluded.email, dia_chi = excluded.dia_chi, khu_vuc = excluded.khu_vuc,
      phuong_xa = excluded.phuong_xa, ma_so_thue = excluded.ma_so_thue,
      ghi_chu = excluded.ghi_chu
    returning 1
  ) select count(*) into v_doi_tac from da_ghi;

  -- 5. Sản phẩm. Tra id danh mục theo MÃ, không theo id — script không biết id.
  --    gia_von CỐ Ý không nhận từ đầu vào: nó chỉ do trigger giá vốn ghi.
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'san_pham','[]'::jsonb))
      as x(ma_hang text, ten_hang text, barcode text, ma_nhom_hang text,
           ma_dvt text, ma_cong_doan text, quy_doi numeric,
           gia_ban numeric, ton_toi_thieu numeric, ghi_chu text)
  ), da_ghi as (
    insert into public.san_pham (
      ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id,
      quy_doi, gia_ban, ton_toi_thieu, ghi_chu
    )
    select
      n.ma_hang, n.ten_hang, n.barcode,
      (select id from public.nhom_hang   where ma = n.ma_nhom_hang),
      (select id from public.don_vi_tinh where ma = n.ma_dvt),
      (select id from public.cong_doan   where ma = n.ma_cong_doan),
      coalesce(n.quy_doi, 1), coalesce(n.gia_ban, 0), coalesce(n.ton_toi_thieu, 0), n.ghi_chu
    from nguon n
    on conflict (ma_hang) do update set
      ten_hang = excluded.ten_hang, barcode = excluded.barcode,
      nhom_hang_id = excluded.nhom_hang_id, dvt_id = excluded.dvt_id,
      cong_doan_id = excluded.cong_doan_id, quy_doi = excluded.quy_doi,
      gia_ban = excluded.gia_ban, ton_toi_thieu = excluded.ton_toi_thieu,
      ghi_chu = excluded.ghi_chu
    returning 1
  ) select count(*) into v_san_pham from da_ghi;

  return jsonb_build_object(
    'nhom_hang', v_nhom, 'don_vi_tinh', v_dvt, 'cong_doan', v_cong_doan,
    'doi_tac', v_doi_tac, 'san_pham', v_san_pham
  );
end;
$$;

comment on function public.nap_danh_muc_kiotviet(jsonb) is
  'Nạp danh mục trong MỘT transaction. Idempotent theo mã nghiệp vụ. KHÔNG nhận gia_von và KHÔNG ghi ton_kho — tồn đầu kỳ set từ kiểm kê thực tế ở Phase 6, không bê số 389.671 từ KiotViet.';

-- Chỉ service_role (script import) gọi được. Client không bao giờ nạp hàng loạt.
revoke all    on function public.nap_danh_muc_kiotviet(jsonb) from public, anon, authenticated;
grant execute on function public.nap_danh_muc_kiotviet(jsonb) to service_role;
