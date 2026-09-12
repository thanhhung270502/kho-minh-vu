-- =============================================================================
-- 0002 — Kiểu enum của miền nghiệp vụ
--
-- Quy ước đặt tên giá trị, giữ nguyên sự khác biệt này:
--   - loai_ct / trang_thai_ct / loai_doi_tac / trang_thai_ddh dùng CHỮ HOA
--     vì là mã nghiệp vụ, xuất hiện trực tiếp trên chứng từ người dùng đọc.
--   - vai_tro dùng chữ thường vì là khóa kỹ thuật, đi vào JWT claim.
-- =============================================================================

-- Bảy loại chứng từ dùng chung MỘT bảng chung_tu, phân biệt bằng cột này.
-- Nhờ vậy thẻ kho chỉ phải join một bảng thay vì bảy.
create type public.loai_ct as enum (
  'NHAP',        -- nhập hàng từ nhà cung cấp hoặc nhà máy
  'XUAT',        -- xuất bán
  'TRA_NCC',     -- trả hàng cho nhà cung cấp (tồn giảm)
  'TRA_KHACH',   -- khách trả hàng về (tồn tăng)
  'CHUYEN_KHO',  -- chuyển giữa hai kho, sinh 2 movement mỗi dòng
  'KIEM_KE',     -- kiểm kê, movement = chênh lệch giữa đếm thực tế và tồn sổ
  'DIEU_CHINH'   -- điều chỉnh thủ công, số lượng có dấu
);

-- Hai trạng thái sống + một trạng thái chết.
-- NHAP_LIEU: sửa thoải mái, chưa đụng tồn.
-- HOAN_THANH: đã ghi sổ, khóa. Muốn sửa phải hủy để sinh bút toán đảo.
create type public.trang_thai_ct as enum ('NHAP_LIEU', 'HOAN_THANH', 'DA_HUY');

create type public.vai_tro as enum ('quan_ly', 'van_phong', 'thu_kho', 'chi_xem');

-- Một bảng doi_tac dùng chung NCC và khách hàng: nhà máy Vũ Trụ L.An vừa bán
-- vừa nhận trả hàng nên phải là CA_HAI. Tách hai bảng sẽ phải nhân bản hồ sơ đó.
create type public.loai_doi_tac as enum ('NCC', 'KHACH', 'CA_HAI');

create type public.trang_thai_ddh as enum (
  'MOI', 'DA_XUAT_MOT_PHAN', 'DA_XUAT_DU', 'DA_HUY'
);
