---
quick_id: 261013-x6q
status: complete
commit: 3de683d
---

# Phân quyền theo nhóm hàng — PR 3/4: lọc danh mục, tìm mã, tồn kho

## Đã làm

- `0134_loc_nhom_hang_danh_muc_ton_kho.sql` — 7 hàm: danh_sach_san_pham, danh_sach_ton_kho,
  chi_tiet_san_pham, the_kho_san_pham, ton_theo_nhom, khong_luan_chuyen, goi_y_ma_trung.
- `0135_phan_tich_ton_kho_theo_nhom.sql` — phát hiện khi mở màn Danh mục: ô tóm tắt (và màn
  Phân tích) gộp từ phan_tich_ton_kho theo từng mã → lọc ở bước tính.
- `supabase/tests/134_loc_nhom_hang_danh_muc_ton_kho_test.sql` — 23 bài; bài 17 đã kiểm là
  TRƯỢT khi chưa có 0135.
- `supabase/tests/132_…` — sửa `dang_nhap_id` (đọc hồ sơ bằng postgres; trước đó claim
  vai_tro rỗng khi đổi tài khoản giữa chừng, test 132 đạt nhờ may).

## Kiểm chứng

- Demo phonzy: 0134, 0135 áp bằng `supabase db push --db-url`; 132 → 28/28, 134 → 23/23.
- Admin: Danh mục 3.320 mã như trước, Phân tích tải đủ, console sạch.
- Excel danh mục (`/api/danh-muc/xuat-excel`) dùng client theo phiên → hưởng lọc tự động.

## Sự cố

- Một file debug ghép tay thiếu `ON_ERROR_STOP` nên đã GHI dữ liệu thử vào demo (2 tài khoản
  zq134, quyền, 2 nhóm, 2 mã). Đã xóa trong transaction; còn 4 dòng `nhat_ky_sua` (bất biến,
  nguồn "script", 13/10 16:49) không xóa được và không nên xóa.

## Chưa làm

- Phân tích theo kỳ (`phan_tich_theo_ky`, `nhap_xuat_theo_ky`) và dashboard (tong_quan_chi_so,
  nhap_xuat_theo_ngay, bao_cao_xuat_am, hoat_dong_gan_day) vẫn là số tổng mọi nhóm — đợt sau.
- Đơn đặt NCC, phiếu nhập → PR 4/4. Ảnh sản phẩm (hinh_anh, /api/anh) chưa lọc.
- Bộ pgTAP cũ cần tài khoản seed nên không chạy được trên demo (bản sao production).
