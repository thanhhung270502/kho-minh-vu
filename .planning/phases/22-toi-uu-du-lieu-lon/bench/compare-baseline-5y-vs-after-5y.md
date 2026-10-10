# So sánh baseline-5y → after-5y

- baseline-5y: 2026-10-09T10:31:00.233Z · 14dea8b · 0123_thu_quyen_them_dong_don_anon.sql · kho_movement=1008828, chung_tu=183153, chung_tu_dong=974079, don_dat_hang=168018, don_dat_hang_dong=858833, nhat_ky_sua=678946
- after-5y: 2026-10-09T10:41:34.562Z · 5cbe982 · 0125_dieu_kien_ngay_dung_index.sql · kho_movement=1008828, chung_tu=183154, chung_tu_dong=974079, don_dat_hang=168018, don_dat_hang_dong=858833, nhat_ky_sua=678948

| Ca | Vai trò | p50 baseline-5y | p50 after-5y | Δ p50 | p95 baseline-5y | p95 after-5y | Δ p95 |
|---|---|---|---|---|---|---|---|
| tong_quan_chi_so | quan_ly | 2699.4 | 169.9 | -93.7% | 3729.2 | 177.2 | -95.2% |
| phan_tich_ton_kho.trang_1 | quan_ly | 649.1 | 530.5 | -18.3% | 691.9 | 555.9 | -19.7% |
| phan_tich_ton_kho.4_trang | quan_ly | 2434.7 | 2279.3 | -6.4% | 2535.8 | 2383.3 | -6% |
| hoat_dong_gan_day | quan_ly | 454.1 | 354 | -22% | 474.2 | 355.8 | -25% |
| bang_dem_kiem_ke | quan_ly | 8.5 | 7 | -17.6% | 9.8 | 8.7 | -11.2% |
| bang_dem_kiem_ke | thu_kho | 7.8 | 6.6 | -15.4% | 8.8 | 7.7 | -12.5% |
| tim_kiem_toan_cuc.so_ct | quan_ly | 231.3 | 125.9 | -45.6% | 253.1 | 126.7 | -49.9% |
| tim_kiem_toan_cuc.so_ct | thu_kho | 421.1 | 308.4 | -26.8% | 424.5 | 326.4 | -23.1% |
| tim_kiem_toan_cuc.so_dh | quan_ly | 226.8 | 122.5 | -46% | 237.2 | 125.9 | -46.9% |
| tim_kiem_toan_cuc.so_dh | thu_kho | 407.2 | 302.2 | -25.8% | 412.4 | 315.5 | -23.5% |
| phan_tich_theo_ky.mac_dinh | quan_ly | 566.8 | 549.9 | -3% | 583.4 | 579.3 | -0.7% |
| phan_tich_theo_ky.90_ngay | quan_ly | 675.3 | 500.6 | -25.9% | 824.2 | 507.2 | -38.5% |
| nhap_xuat_theo_ky.mac_dinh | quan_ly | 83.7 | 18.7 | -77.7% | 85.6 | 19.3 | -77.5% |
| nhap_xuat_theo_ngay.30 | quan_ly | 34.4 | 35.9 | +4.4% | 35 | 37.6 | +7.4% |
| nhap_xuat_theo_ngay.90 | quan_ly | 40 | 39.5 | -1.2% | 40.7 | 40 | -1.7% |
| bao_cao_xuat_am | quan_ly | 696.6 | 629.9 | -9.6% | 714.3 | 642.8 | -10% |
| danh_sach_doi_tac.o_chon_khach | quan_ly | 39.5 | 36.3 | -8.1% | 42.3 | 37.3 | -11.8% |
| danh_sach_doi_tac.o_chon_khach | thu_kho | 47.1 | 41.7 | -11.5% | 61.1 | 44.3 | -27.5% |
| danh_sach_doi_tac.trang_doi_tac | quan_ly | 61.3 | 56.2 | -8.3% | 68.2 | 58 | -15% |
| danh_sach_don.mac_dinh | quan_ly | 15 | 6.9 | -54% | 16.3 | 6.9 | -57.7% |
| danh_sach_don.mac_dinh | thu_kho | 12.9 | 5.2 | -59.7% | 13.8 | 6.5 | -52.9% |
| dem_don_theo_trang_thai.mac_dinh | quan_ly | 10.8 | 3.4 | -68.5% | 11.1 | 3.8 | -65.8% |
| dem_don_theo_trang_thai.mac_dinh | thu_kho | 9.3 | 2.8 | -69.9% | 9.9 | 3.1 | -68.7% |
| danh_sach_chung_tu.hoa_don | quan_ly | 8.7 | 6.9 | -20.7% | 9.1 | 7.5 | -17.6% |
| danh_sach_chung_tu.hoa_don | thu_kho | 7.5 | 6.3 | -16% | 8.1 | 7.9 | -2.5% |
| the_kho_san_pham | quan_ly | 109.2 | 101.4 | -7.1% | 130.4 | 113.8 | -12.7% |
| the_kho_san_pham | thu_kho | 105.2 | 99.4 | -5.5% | 106.8 | 100.9 | -5.5% |
| lich_su_giao_dich_doi_tac | quan_ly | 23.5 | 21.8 | -7.2% | 32.7 | 29.9 | -8.6% |
| tim_san_pham.1_ky_tu | quan_ly | 33.4 | 32.2 | -3.6% | 35.1 | 32.8 | -6.6% |
| tim_san_pham.1_ky_tu | thu_kho | 33.6 | 31.7 | -5.7% | 37.6 | 32.2 | -14.4% |
| tim_san_pham.5_ky_tu | quan_ly | 6.3 | 5.2 | -17.5% | 6.4 | 6.1 | -4.7% |
| tim_san_pham.5_ky_tu | thu_kho | 6 | 6 | 0% | 6.7 | 7 | +4.5% |
| xoa_dong_phieu_nhap | quan_ly | 56.1 | 2.8 | -95% | 60.6 | 12 | -80.2% |
