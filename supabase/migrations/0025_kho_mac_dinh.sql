-- =============================================================================
-- 0025 — Kho mặc định của sản phẩm (sửa lỗi UAT Phase 1, bài 3)
--
-- LỖI: cột "Vị trí" trong file export KiotViet chứa TÊN KHO ("Kho 1" / "Kho 2"),
-- không phải dãy/kệ/tầng. Import ban đầu ánh xạ nó vào san_pham.vi_tri_ke vì
-- tên cột giống nhau — viết trước khi soi giá trị thật.
--
-- Dữ liệu tự nó đúng: 3.240 mã Kho 1, 26 mã Kho 2 (khớp tài liệu thiết kế), và
-- Kho 2 trùng khít Nhóm 122B. Chỉ nằm sai chỗ.
--
-- SỬA: thêm kho_mac_dinh_id, chuyển dữ liệu sang, dọn vi_tri_ke để cột kệ sạch
-- khi đưa vị trí kệ thật vào sau này. Phase 3–4 dùng cột mới để điền sẵn kho
-- khi tạo phiếu.
-- =============================================================================

alter table public.san_pham
  add column if not exists kho_mac_dinh_id uuid references public.kho(id);

create index if not exists idx_san_pham_kho_mac_dinh
  on public.san_pham (kho_mac_dinh_id) where kho_mac_dinh_id is not null;

-- ─── Chuyển dữ liệu ─────────────────────────────────────────────────────
update public.san_pham sp
set kho_mac_dinh_id = k.id
from public.kho k
where sp.vi_tri_ke = k.ten
  and sp.kho_mac_dinh_id is null;

-- Chặn mất dữ liệu: nếu còn dòng mang tên kho trong vi_tri_ke mà chưa chuyển
-- được thì dừng lại, không dọn. Đã kiểm trước khi viết: 0 dòng rơi vào trường hợp này.
do $$
declare v_con int;
begin
  select count(*) into v_con
  from public.san_pham sp
  join public.kho k on k.ten = sp.vi_tri_ke
  where sp.kho_mac_dinh_id is distinct from k.id;

  if v_con > 0 then
    raise exception 'Còn % sản phẩm chưa chuyển được sang kho_mac_dinh_id — dừng để không mất dữ liệu', v_con;
  end if;
end $$;

-- Chỉ dọn những giá trị ĐÚNG LÀ tên kho. Nếu sau này có vị trí kệ thật thì giữ nguyên.
update public.san_pham sp
set vi_tri_ke = null
from public.kho k
where sp.vi_tri_ke = k.ten;

-- ─── Quyền theo cột ─────────────────────────────────────────────────────
-- Migration 0015 cấp INSERT/UPDATE theo DANH SÁCH CỘT cho authenticated.
-- Cột mới không tự có trong danh sách đó — phải cấp tường minh, không thì văn
-- phòng cũng không sửa được. Kho mặc định là dữ liệu danh mục thường, không nhạy
-- cảm như giá. RLS (quản lý + văn phòng mới ghi được) vẫn áp như mọi cột khác.
grant insert (kho_mac_dinh_id) on public.san_pham to authenticated;
grant update (kho_mac_dinh_id) on public.san_pham to authenticated;

-- ─── RPC nạp danh mục ───────────────────────────────────────────────────
-- Nhận ten_kho_mac_dinh (tên kho như trong file export) thay vì vi_tri_ke.
-- Tên kho không tồn tại → kho_mac_dinh_id NULL, không làm hỏng cả lô;
-- script import cảnh báo trước ở bước kiểm tra.
-- vi_tri_ke không còn nằm trong insert lẫn update: RPC không được ghi đè vị trí
-- kệ người dùng tự nhập sau này.
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
           ten_kho_mac_dinh text, hinh_anh_url text, dang_kinh_doanh boolean, ghi_chu text)
  ), da_ghi as (
    insert into public.san_pham (
      ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id,
      quy_doi, gia_ban, ton_toi_thieu, ton_toi_da,
      kho_mac_dinh_id, hinh_anh_url, dang_kinh_doanh, ghi_chu
    )
    select
      n.ma_hang, n.ten_hang, n.barcode,
      (select id from public.nhom_hang   where ma  = n.ma_nhom_hang),
      (select id from public.don_vi_tinh where ma  = n.ma_dvt),
      (select id from public.cong_doan   where ma  = n.ma_cong_doan),
      coalesce(n.quy_doi, 1), coalesce(n.gia_ban, 0), coalesce(n.ton_toi_thieu, 0), n.ton_toi_da,
      (select id from public.kho         where ten = n.ten_kho_mac_dinh),
      n.hinh_anh_url, coalesce(n.dang_kinh_doanh, true), n.ghi_chu
    from nguon n
    on conflict (ma_hang) do update set
      ten_hang = excluded.ten_hang, barcode = excluded.barcode,
      nhom_hang_id = excluded.nhom_hang_id, dvt_id = excluded.dvt_id,
      cong_doan_id = excluded.cong_doan_id, quy_doi = excluded.quy_doi,
      gia_ban = excluded.gia_ban, ton_toi_thieu = excluded.ton_toi_thieu,
      ton_toi_da = excluded.ton_toi_da, kho_mac_dinh_id = excluded.kho_mac_dinh_id,
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
