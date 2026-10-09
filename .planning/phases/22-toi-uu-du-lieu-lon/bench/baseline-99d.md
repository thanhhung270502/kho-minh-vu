# Bench baseline-99d

- Thời điểm: 2026-10-09T10:15:44.729Z
- Commit: dff45bc · migration mới nhất: 0123_thu_quyen_them_dong_don_anon.sql
- Số lượt đo mỗi ca: 5 (không tính 1 lượt làm nóng)

## Quy mô dữ liệu

| Bảng | Số dòng |
|---|---|
| kho_movement | 58754 |
| chung_tu | 9916 |
| chung_tu_dong | 56934 |
| don_dat_hang | 9138 |
| don_dat_hang_dong | 46690 |
| nhat_ky_sua | 40042 |

## Kết quả (ms)

| Ca | Vai trò | Trạng thái | p50 | p95 | max | Số dòng |
|---|---|---|---|---|---|---|
| tong_quan_chi_so | quan_ly | ok | 255.1 | 277 | 277 | 1 |
| phan_tich_ton_kho.trang_1 | quan_ly | ok | 58.2 | 59.6 | 59.6 | 1000 |
| phan_tich_ton_kho.4_trang | quan_ly | ok | 200.7 | 215 | 215 | 3311 |
| hoat_dong_gan_day | quan_ly | ok | 30.6 | 33 | 33 | 20 |
| bang_dem_kiem_ke | quan_ly | ok | 7.9 | 8.4 | 8.4 | 36 |
| bang_dem_kiem_ke | thu_kho | ok | 6.8 | 8.1 | 8.1 | 36 |
| tim_kiem_toan_cuc.so_ct | quan_ly | ok | 17.6 | 19.2 | 19.2 | 5 |
| tim_kiem_toan_cuc.so_ct | thu_kho | ok | 26.1 | 26.9 | 26.9 | 5 |
| tim_kiem_toan_cuc.so_dh | quan_ly | ok | 16.8 | 18.1 | 18.1 | 5 |
| tim_kiem_toan_cuc.so_dh | thu_kho | ok | 26.5 | 26.8 | 26.8 | 5 |
| phan_tich_theo_ky.mac_dinh | quan_ly | ok | 146.3 | 158 | 158 | 3311 |
| phan_tich_theo_ky.90_ngay | quan_ly | ok | 173.8 | 177.7 | 177.7 | 3311 |
| nhap_xuat_theo_ky.mac_dinh | quan_ly | ok | 20.4 | 21.7 | 21.7 | 9 |
| nhap_xuat_theo_ngay.30 | quan_ly | ok | 12.8 | 14.1 | 14.1 | 30 |
| nhap_xuat_theo_ngay.90 | quan_ly | ok | 19.7 | 20.4 | 20.4 | 90 |
| bao_cao_xuat_am | quan_ly | ok | 32.4 | 34.7 | 34.7 | 0 |
| danh_sach_doi_tac.o_chon_khach | quan_ly | ok | 5.6 | 6.3 | 6.3 | 20 |
| danh_sach_doi_tac.o_chon_khach | thu_kho | ok | 5.3 | 6.3 | 6.3 | 20 |
| danh_sach_doi_tac.trang_doi_tac | quan_ly | ok | 5.6 | 5.8 | 5.8 | 50 |
| danh_sach_don.mac_dinh | quan_ly | ok | 7.6 | 8 | 8 | 50 |
| danh_sach_don.mac_dinh | thu_kho | ok | 6.9 | 9.1 | 9.1 | 50 |
| dem_don_theo_trang_thai.mac_dinh | quan_ly | ok | 3.3 | 4.3 | 4.3 | 4 |
| dem_don_theo_trang_thai.mac_dinh | thu_kho | ok | 4 | 4.4 | 4.4 | 4 |
| danh_sach_chung_tu.hoa_don | quan_ly | ok | 5.3 | 6.1 | 6.1 | 50 |
| danh_sach_chung_tu.hoa_don | thu_kho | ok | 5.5 | 7.4 | 7.4 | 50 |
| the_kho_san_pham | quan_ly | ok | 11.3 | 13.2 | 13.2 | 50 |
| the_kho_san_pham | thu_kho | ok | 11.4 | 11.8 | 11.8 | 50 |
| lich_su_giao_dich_doi_tac | quan_ly | ok | 5.9 | 20 | 20 | 50 |
| tim_san_pham.1_ky_tu | quan_ly | ok | 36.3 | 36.9 | 36.9 | 20 |
| tim_san_pham.1_ky_tu | thu_kho | ok | 34.4 | 37.3 | 37.3 | 20 |
| tim_san_pham.5_ky_tu | quan_ly | ok | 6.8 | 7.4 | 7.4 | 20 |
| tim_san_pham.5_ky_tu | thu_kho | ok | 7.6 | 8.1 | 8.1 | 20 |
| xoa_dong_phieu_nhap | quan_ly | ok | 6.8 | 9.4 | 9.4 | 1 |
