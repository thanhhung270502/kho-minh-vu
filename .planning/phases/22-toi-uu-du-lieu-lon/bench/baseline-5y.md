# Bench baseline-5y

- Thời điểm: 2026-10-09T10:31:00.233Z
- Commit: 14dea8b · migration mới nhất: 0123_thu_quyen_them_dong_don_anon.sql
- Số lượt đo mỗi ca: 5 (không tính 1 lượt làm nóng)

## Quy mô dữ liệu

| Bảng | Số dòng |
|---|---|
| kho_movement | 1008828 |
| chung_tu | 183153 |
| chung_tu_dong | 974079 |
| don_dat_hang | 168018 |
| don_dat_hang_dong | 858833 |
| nhat_ky_sua | 678946 |

## Kết quả (ms)

| Ca | Vai trò | Trạng thái | p50 | p95 | max | Số dòng |
|---|---|---|---|---|---|---|
| tong_quan_chi_so | quan_ly | ok | 2699.4 | 3729.2 | 3729.2 | 1 |
| phan_tich_ton_kho.trang_1 | quan_ly | ok | 649.1 | 691.9 | 691.9 | 1000 |
| phan_tich_ton_kho.4_trang | quan_ly | ok | 2434.7 | 2535.8 | 2535.8 | 3311 |
| hoat_dong_gan_day | quan_ly | ok | 454.1 | 474.2 | 474.2 | 20 |
| bang_dem_kiem_ke | quan_ly | ok | 8.5 | 9.8 | 9.8 | 36 |
| bang_dem_kiem_ke | thu_kho | ok | 7.8 | 8.8 | 8.8 | 36 |
| tim_kiem_toan_cuc.so_ct | quan_ly | ok | 231.3 | 253.1 | 253.1 | 5 |
| tim_kiem_toan_cuc.so_ct | thu_kho | ok | 421.1 | 424.5 | 424.5 | 5 |
| tim_kiem_toan_cuc.so_dh | quan_ly | ok | 226.8 | 237.2 | 237.2 | 5 |
| tim_kiem_toan_cuc.so_dh | thu_kho | ok | 407.2 | 412.4 | 412.4 | 5 |
| phan_tich_theo_ky.mac_dinh | quan_ly | ok | 566.8 | 583.4 | 583.4 | 3311 |
| phan_tich_theo_ky.90_ngay | quan_ly | ok | 675.3 | 824.2 | 824.2 | 3311 |
| nhap_xuat_theo_ky.mac_dinh | quan_ly | ok | 83.7 | 85.6 | 85.6 | 9 |
| nhap_xuat_theo_ngay.30 | quan_ly | ok | 34.4 | 35 | 35 | 30 |
| nhap_xuat_theo_ngay.90 | quan_ly | ok | 40 | 40.7 | 40.7 | 90 |
| bao_cao_xuat_am | quan_ly | ok | 696.6 | 714.3 | 714.3 | 0 |
| danh_sach_doi_tac.o_chon_khach | quan_ly | ok | 39.5 | 42.3 | 42.3 | 20 |
| danh_sach_doi_tac.o_chon_khach | thu_kho | ok | 47.1 | 61.1 | 61.1 | 20 |
| danh_sach_doi_tac.trang_doi_tac | quan_ly | ok | 61.3 | 68.2 | 68.2 | 50 |
| danh_sach_don.mac_dinh | quan_ly | ok | 15 | 16.3 | 16.3 | 50 |
| danh_sach_don.mac_dinh | thu_kho | ok | 12.9 | 13.8 | 13.8 | 50 |
| dem_don_theo_trang_thai.mac_dinh | quan_ly | ok | 10.8 | 11.1 | 11.1 | 4 |
| dem_don_theo_trang_thai.mac_dinh | thu_kho | ok | 9.3 | 9.9 | 9.9 | 4 |
| danh_sach_chung_tu.hoa_don | quan_ly | ok | 8.7 | 9.1 | 9.1 | 50 |
| danh_sach_chung_tu.hoa_don | thu_kho | ok | 7.5 | 8.1 | 8.1 | 50 |
| the_kho_san_pham | quan_ly | ok | 109.2 | 130.4 | 130.4 | 50 |
| the_kho_san_pham | thu_kho | ok | 105.2 | 106.8 | 106.8 | 50 |
| lich_su_giao_dich_doi_tac | quan_ly | ok | 23.5 | 32.7 | 32.7 | 50 |
| tim_san_pham.1_ky_tu | quan_ly | ok | 33.4 | 35.1 | 35.1 | 20 |
| tim_san_pham.1_ky_tu | thu_kho | ok | 33.6 | 37.6 | 37.6 | 20 |
| tim_san_pham.5_ky_tu | quan_ly | ok | 6.3 | 6.4 | 6.4 | 20 |
| tim_san_pham.5_ky_tu | thu_kho | ok | 6 | 6.7 | 6.7 | 20 |
| xoa_dong_phieu_nhap | quan_ly | ok | 56.1 | 60.6 | 60.6 | 1 |
