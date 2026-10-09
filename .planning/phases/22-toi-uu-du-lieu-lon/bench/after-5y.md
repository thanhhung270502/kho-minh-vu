# Bench after-5y

- Thời điểm: 2026-10-09T10:41:34.562Z
- Commit: 5cbe982 · migration mới nhất: 0125_dieu_kien_ngay_dung_index.sql
- Số lượt đo mỗi ca: 5 (không tính 1 lượt làm nóng)

## Quy mô dữ liệu

| Bảng | Số dòng |
|---|---|
| kho_movement | 1008828 |
| chung_tu | 183154 |
| chung_tu_dong | 974079 |
| don_dat_hang | 168018 |
| don_dat_hang_dong | 858833 |
| nhat_ky_sua | 678948 |

## Kết quả (ms)

| Ca | Vai trò | Trạng thái | p50 | p95 | max | Số dòng |
|---|---|---|---|---|---|---|
| tong_quan_chi_so | quan_ly | ok | 169.9 | 177.2 | 177.2 | 1 |
| phan_tich_ton_kho.trang_1 | quan_ly | ok | 530.5 | 555.9 | 555.9 | 1000 |
| phan_tich_ton_kho.4_trang | quan_ly | ok | 2279.3 | 2383.3 | 2383.3 | 3311 |
| hoat_dong_gan_day | quan_ly | ok | 354 | 355.8 | 355.8 | 20 |
| bang_dem_kiem_ke | quan_ly | ok | 7 | 8.7 | 8.7 | 36 |
| bang_dem_kiem_ke | thu_kho | ok | 6.6 | 7.7 | 7.7 | 36 |
| tim_kiem_toan_cuc.so_ct | quan_ly | ok | 125.9 | 126.7 | 126.7 | 5 |
| tim_kiem_toan_cuc.so_ct | thu_kho | ok | 308.4 | 326.4 | 326.4 | 5 |
| tim_kiem_toan_cuc.so_dh | quan_ly | ok | 122.5 | 125.9 | 125.9 | 5 |
| tim_kiem_toan_cuc.so_dh | thu_kho | ok | 302.2 | 315.5 | 315.5 | 5 |
| phan_tich_theo_ky.mac_dinh | quan_ly | ok | 549.9 | 579.3 | 579.3 | 3311 |
| phan_tich_theo_ky.90_ngay | quan_ly | ok | 500.6 | 507.2 | 507.2 | 3311 |
| nhap_xuat_theo_ky.mac_dinh | quan_ly | ok | 18.7 | 19.3 | 19.3 | 9 |
| nhap_xuat_theo_ngay.30 | quan_ly | ok | 35.9 | 37.6 | 37.6 | 30 |
| nhap_xuat_theo_ngay.90 | quan_ly | ok | 39.5 | 40 | 40 | 90 |
| bao_cao_xuat_am | quan_ly | ok | 629.9 | 642.8 | 642.8 | 0 |
| danh_sach_doi_tac.o_chon_khach | quan_ly | ok | 36.3 | 37.3 | 37.3 | 20 |
| danh_sach_doi_tac.o_chon_khach | thu_kho | ok | 41.7 | 44.3 | 44.3 | 20 |
| danh_sach_doi_tac.trang_doi_tac | quan_ly | ok | 56.2 | 58 | 58 | 50 |
| danh_sach_don.mac_dinh | quan_ly | ok | 6.9 | 6.9 | 6.9 | 50 |
| danh_sach_don.mac_dinh | thu_kho | ok | 5.2 | 6.5 | 6.5 | 50 |
| dem_don_theo_trang_thai.mac_dinh | quan_ly | ok | 3.4 | 3.8 | 3.8 | 4 |
| dem_don_theo_trang_thai.mac_dinh | thu_kho | ok | 2.8 | 3.1 | 3.1 | 4 |
| danh_sach_chung_tu.hoa_don | quan_ly | ok | 6.9 | 7.5 | 7.5 | 50 |
| danh_sach_chung_tu.hoa_don | thu_kho | ok | 6.3 | 7.9 | 7.9 | 50 |
| the_kho_san_pham | quan_ly | ok | 101.4 | 113.8 | 113.8 | 50 |
| the_kho_san_pham | thu_kho | ok | 99.4 | 100.9 | 100.9 | 50 |
| lich_su_giao_dich_doi_tac | quan_ly | ok | 21.8 | 29.9 | 29.9 | 50 |
| tim_san_pham.1_ky_tu | quan_ly | ok | 32.2 | 32.8 | 32.8 | 20 |
| tim_san_pham.1_ky_tu | thu_kho | ok | 31.7 | 32.2 | 32.2 | 20 |
| tim_san_pham.5_ky_tu | quan_ly | ok | 5.2 | 6.1 | 6.1 | 20 |
| tim_san_pham.5_ky_tu | thu_kho | ok | 6 | 7 | 7 | 20 |
| xoa_dong_phieu_nhap | quan_ly | ok | 2.8 | 12 | 12 | 1 |
