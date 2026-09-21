-- =============================================================================
-- 0060 — Đề xuất & duyệt định mức tồn tối thiểu (TQAN-02, D-04)
--
-- Đau thứ hai người dùng tự nêu: "hết hàng mới biết". Bộ lọc "dưới định mức" đã
-- có sẵn ở danh_sach_san_pham (0030, p_trang_thai_ton = 'duoi_dinh_muc') nhưng
-- luôn rỗng vì 0/3.266 mã có ton_toi_thieu > 0. Không ai ngồi gõ 3.266 dòng, nên
-- hệ tự đề xuất định mức từ lịch sử bán KiotViet (luu_tru_hoa_don_kiotviet, hiện
-- 10 ngày 03/09→12/09/2026, chạm 1.223/3.266 mã) rồi để người duyệt bấm áp dụng —
-- đúng khuôn "hệ đề xuất — người duyệt" đã có ở 0035 (goi_y_cong_doan_theo_duoi /
-- ap_dung_goi_y_cong_doan).
--
-- de_xuat_dinh_muc: CHỈ ĐỌC, không ghi gì — trả kèm căn cứ (so_ngay_du_lieu,
-- so_lan_ban, nguon_de_xuat) để người duyệt biết con số nào đáng tin (D-04).
-- dat_dinh_muc: CHỈ GHI, nhận uuid[] — con số tính lại từ chính de_xuat_dinh_muc
-- ngay ở server, client không có đường đẩy một ton_toi_thieu tùy ý vào danh mục.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dat_dinh_muc ghi vào san_pham.ton_toi_thieu → trigger nhật ký 0027 chèn một
-- dòng nhat_ky_sua với nguon = 'dinh_muc'. Giá trị này chưa nằm trong ràng buộc
-- nhat_ky_sua_nguon_check → phải drop/add với DANH SÁCH ĐẦY ĐỦ (tiền lệ 0044).
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD, đọc từ cloud lúc 2026-09-21 09:24 UTC (database
-- kho-vu-tru, phonzyruoalimgaovljm) qua Supabase MCP của phiên điều phối, bằng:
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'nhat_ky_sua_nguon_check';
-- Migration mới nhất trên database lúc đọc: 0057 (khớp repo, không trôi).
--
-- NGUYÊN VĂN pg_get_constraintdef ĐỌC ĐƯỢC (chưa sửa gì, dán y nguyên):
--
-- CHECK ((nguon = ANY (ARRAY['form'::text, 'sua_o'::text, 'hang_loat'::text, 'goi_y_duoi'::text, 'import'::text, 'ra_ghi_chu'::text, 'cai_dat'::text, 'script'::text, 'gia_von_dau_ky'::text])))
--
-- Chín giá trị, khớp hoàn toàn với 0044 trong repo — Phase 4 không thêm giá trị
-- nào (xác nhận trong 05-LIVE-DEFS.md, mục "Cho plan 05-03"). Danh sách dưới đây
-- lấy nguyên từ đó, cộng đúng một giá trị mới 'dinh_muc'.
-- -----------------------------------------------------------------------------

alter table public.nhat_ky_sua drop constraint nhat_ky_sua_nguon_check;
alter table public.nhat_ky_sua add constraint nhat_ky_sua_nguon_check
  check (nguon in (
    'form', 'sua_o', 'hang_loat', 'goi_y_duoi', 'import', 'ra_ghi_chu', 'cai_dat',
    'script', 'gia_von_dau_ky', 'dinh_muc'
  ));

-- -----------------------------------------------------------------------------
-- Hàm 1 — ĐỀ XUẤT (chỉ đọc). Công thức đã chốt ở bước lập kế hoạch (05-CONTEXT.md
-- "Claude's Discretion"), cài đúng nguyên văn, không tự đổi hằng số:
--   - Cửa sổ dữ liệu: max(ngay) - min(ngay) + 1 tính trên TOÀN BỘ lưu trữ, không
--     tính riêng từng mã — tính riêng sẽ thổi tốc độ bán của mã ít dữ liệu.
--   - Số ngày cần phủ = 7 (hằng số v_so_ngay_phu, chỉnh một chỗ khi có lịch sử
--     dài hơn).
--   - Nhánh theo_ma (mã có dòng trong lưu trữ): least(ceil(tong_da_ban / so_ngay
--     * 7), tong_da_ban), sàn 1. Cận trên tong_da_ban là chốt chặn giá trị vô lý
--     — không bao giờ đề xuất trữ nhiều hơn toàn bộ lượng đã bán trong cả cửa sổ.
--   - Nhánh trung_binh_nhom (mã không có dòng nào): ceil(avg(dinh_muc)) của các
--     mã theo_ma CÙNG nhom_hang_id.
--   - Nhánh khong_du_lieu (nhóm không có mã nào từng bán): đề xuất 0. Thà nói
--     thẳng không biết còn hơn bịa một con số.
-- -----------------------------------------------------------------------------
create or replace function public.de_xuat_dinh_muc(
  p_nguon text default null,
  p_chi_khac_hien_tai boolean default true,
  p_trang integer default 1,
  p_kich_thuoc integer default 100
)
returns table (
  id uuid,
  ma_hang text,
  ten_hang text,
  ten_nhom_hang text,
  dinh_muc_hien_tai numeric,
  dinh_muc_de_xuat numeric,
  nguon_de_xuat text,
  so_ngay_du_lieu integer,
  so_lan_ban integer,
  tong_da_ban numeric,
  so_ma_trong_nhom_co_lich_su integer,
  tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 100), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
  v_chi_khac boolean := coalesce(p_chi_khac_hien_tai, true);
  -- Số ngày cần định mức phủ được. Lịch sử hiện chỉ 10 ngày (03/09→12/09/2026) —
  -- chỉnh một chỗ này khi hệ mới có lịch sử dài hơn.
  v_so_ngay_phu constant integer := 7;
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with cua_so as (
    -- Cửa sổ TOÀN BỘ lưu trữ, không tính riêng từng mã. coalesce(..., 1) tránh
    -- chia cho 0 khi bảng lưu trữ rỗng.
    select coalesce(max(l.ngay::date) - min(l.ngay::date) + 1, 1) as so_ngay
    from public.luu_tru_hoa_don_kiotviet l
  ),
  ban_theo_ma as (
    select sp.id as san_pham_id,
           sum(l.so_luong) as tong_da_ban,
           count(distinct l.ma_hoa_don) as so_lan_ban
    from public.luu_tru_hoa_don_kiotviet l
    join public.san_pham sp on sp.ma_hang = l.ma_hang
    group by sp.id
  ),
  theo_ma as (
    select b.san_pham_id,
           greatest(
             least(
               ceil(b.tong_da_ban / (select so_ngay from cua_so) * v_so_ngay_phu),
               b.tong_da_ban
             ),
             1
           ) as dinh_muc,
           b.tong_da_ban,
           b.so_lan_ban
    from ban_theo_ma b
  ),
  theo_nhom as (
    select sp.nhom_hang_id,
           ceil(avg(t.dinh_muc)) as dinh_muc,
           count(*) as so_ma_co_lich_su
    from theo_ma t
    join public.san_pham sp on sp.id = t.san_pham_id
    where sp.nhom_hang_id is not null
    group by sp.nhom_hang_id
  ),
  de_xuat as (
    select sp.id, sp.ma_hang, sp.ten_hang, nh.ten as ten_nhom_hang,
           sp.ton_toi_thieu as dinh_muc_hien_tai,
           case
             when tm.dinh_muc is not null then tm.dinh_muc
             when tn.dinh_muc is not null then tn.dinh_muc
             else 0
           end as dinh_muc_de_xuat,
           case
             when tm.dinh_muc is not null then 'theo_ma'
             when tn.dinh_muc is not null then 'trung_binh_nhom'
             else 'khong_du_lieu'
           end as nguon_de_xuat,
           (select so_ngay from cua_so)::integer as so_ngay_du_lieu,
           coalesce(tm.so_lan_ban, 0)::integer as so_lan_ban,
           coalesce(tm.tong_da_ban, 0) as tong_da_ban,
           coalesce(tn.so_ma_co_lich_su, 0)::integer as so_ma_trong_nhom_co_lich_su
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join theo_ma tm on tm.san_pham_id = sp.id
    left join theo_nhom tn on tn.nhom_hang_id = sp.nhom_hang_id
    where sp.dang_kinh_doanh = true
  )
  select d.id, d.ma_hang, d.ten_hang, d.ten_nhom_hang, d.dinh_muc_hien_tai,
         d.dinh_muc_de_xuat, d.nguon_de_xuat, d.so_ngay_du_lieu, d.so_lan_ban,
         d.tong_da_ban, d.so_ma_trong_nhom_co_lich_su, count(*) over ()
  from de_xuat d
  where (p_nguon is null or d.nguon_de_xuat = p_nguon)
    and (v_chi_khac = false or d.dinh_muc_de_xuat is distinct from d.dinh_muc_hien_tai)
  order by d.nguon_de_xuat, d.ma_hang
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$$;

revoke all    on function public.de_xuat_dinh_muc(text, boolean, integer, integer) from public, anon;
grant execute on function public.de_xuat_dinh_muc(text, boolean, integer, integer) to authenticated;
comment on function public.de_xuat_dinh_muc(text, boolean, integer, integer) is
  'TQAN-02/D-04: đề xuất định mức tồn tối thiểu suy từ luu_tru_hoa_don_kiotviet. Cửa sổ dữ liệu = toàn bộ lưu trữ (không tính riêng từng mã), phủ 7 ngày. nguon_de_xuat: theo_ma (mã có lịch sử bán riêng, cận trên = tong_da_ban) | trung_binh_nhom (không có lịch sử riêng, lấy trung bình các mã theo_ma cùng nhom_hang_id) | khong_du_lieu (cả nhóm chưa từng bán, đề xuất 0 — không bịa số). Chỉ đọc, không ghi gì; người duyệt gọi dat_dinh_muc.';

-- -----------------------------------------------------------------------------
-- Hàm 2 — DUYỆT (ghi). Chỉ nhận uuid[] — KHÔNG nhận con số từ client. Giá trị
-- ghi vào ton_toi_thieu lấy lại từ chính de_xuat_dinh_muc ngay trong câu UPDATE,
-- không tin con số người dùng đã thấy trên màn hình lúc mở trang duyệt.
-- -----------------------------------------------------------------------------
create or replace function public.dat_dinh_muc(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_so int;
begin
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng duyệt được định mức' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  perform set_config('app.nguon_sua', 'dinh_muc', true);
  update public.san_pham sp
  set ton_toi_thieu = d.dinh_muc_de_xuat
  from public.de_xuat_dinh_muc(null, false, 1, 5000) d
  where d.id = sp.id and sp.id = any(p_ids);
  get diagnostics v_so = row_count;
  return v_so;
end;
$$;

revoke all    on function public.dat_dinh_muc(uuid[]) from public, anon;
grant execute on function public.dat_dinh_muc(uuid[]) to authenticated;
comment on function public.dat_dinh_muc(uuid[]) is
  'TQAN-02/D-04: duyệt đề xuất định mức. Chỉ nhận danh sách id — con số ton_toi_thieu do server tính lại từ de_xuat_dinh_muc(null,false,1,5000), client không có đường đẩy một số tùy ý vào danh mục qua cửa này. Chỉ quản lý/văn phòng (42501). Tối đa 1000 id/lần (23514). Ghi app.nguon_sua = dinh_muc trước UPDATE để trigger nhat_ky_sua (0027) gắn đúng nguồn.';
