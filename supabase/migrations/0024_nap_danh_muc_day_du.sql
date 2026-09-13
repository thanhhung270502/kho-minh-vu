-- =============================================================================
-- 0024 — Mở rộng nap_danh_muc_kiotviet cho các cột có trong file export thật
--
-- Phiên bản ở 0019 viết TRƯỚC khi thấy file KiotViet. File thật có thêm dữ liệu
-- đáng giá mà RPC cũ vứt đi:
--   - Vị trí kệ: 3.266/3.266 mã có giá trị
--   - Hình ảnh: 1.094 mã có URL
--   - Tồn lớn nhất, trạng thái kinh doanh
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
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'nhom_hang','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.nhom_hang (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do update set ten = excluded.ten
    returning 1
  ) select count(*) into v_nhom from da_ghi;

  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'don_vi_tinh','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.don_vi_tinh (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do nothing
    returning 1
  ) select count(*) into v_dvt from da_ghi;

  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'cong_doan','[]'::jsonb))
      as x(ma text, ten text)
  ), da_ghi as (
    insert into public.cong_doan (ma, ten)
    select ma, ten from nguon
    on conflict (ma) do nothing
    returning 1
  ) select count(*) into v_cong_doan from da_ghi;

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

  -- gia_von CỐ Ý không nhận từ đầu vào: chỉ trigger giá vốn ghi cột đó.
  -- Không ghi ton_kho: tồn đầu kỳ set từ kiểm kê thực tế (Phase 6).
  with nguon as (
    select * from jsonb_to_recordset(coalesce(p_du_lieu->'san_pham','[]'::jsonb))
      as x(ma_hang text, ten_hang text, barcode text, ma_nhom_hang text,
           ma_dvt text, ma_cong_doan text, quy_doi numeric,
           gia_ban numeric, ton_toi_thieu numeric, ton_toi_da numeric,
           vi_tri_ke text, hinh_anh_url text, dang_kinh_doanh boolean, ghi_chu text)
  ), da_ghi as (
    insert into public.san_pham (
      ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id,
      quy_doi, gia_ban, ton_toi_thieu, ton_toi_da,
      vi_tri_ke, hinh_anh_url, dang_kinh_doanh, ghi_chu
    )
    select
      n.ma_hang, n.ten_hang, n.barcode,
      (select id from public.nhom_hang   where ma = n.ma_nhom_hang),
      (select id from public.don_vi_tinh where ma = n.ma_dvt),
      (select id from public.cong_doan   where ma = n.ma_cong_doan),
      coalesce(n.quy_doi, 1), coalesce(n.gia_ban, 0), coalesce(n.ton_toi_thieu, 0), n.ton_toi_da,
      n.vi_tri_ke, n.hinh_anh_url, coalesce(n.dang_kinh_doanh, true), n.ghi_chu
    from nguon n
    on conflict (ma_hang) do update set
      ten_hang = excluded.ten_hang, barcode = excluded.barcode,
      nhom_hang_id = excluded.nhom_hang_id, dvt_id = excluded.dvt_id,
      cong_doan_id = excluded.cong_doan_id, quy_doi = excluded.quy_doi,
      gia_ban = excluded.gia_ban, ton_toi_thieu = excluded.ton_toi_thieu,
      ton_toi_da = excluded.ton_toi_da, vi_tri_ke = excluded.vi_tri_ke,
      hinh_anh_url = excluded.hinh_anh_url, dang_kinh_doanh = excluded.dang_kinh_doanh,
      ghi_chu = excluded.ghi_chu
    returning 1
  ) select count(*) into v_san_pham from da_ghi;

  return jsonb_build_object(
    'nhom_hang', v_nhom, 'don_vi_tinh', v_dvt, 'cong_doan', v_cong_doan,
    'doi_tac', v_doi_tac, 'san_pham', v_san_pham
  );
end;
$$;

revoke all    on function public.nap_danh_muc_kiotviet(jsonb) from public, anon, authenticated;
grant execute on function public.nap_danh_muc_kiotviet(jsonb) to service_role;
