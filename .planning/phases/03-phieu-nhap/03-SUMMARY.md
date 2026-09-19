---
phase: 03-phieu-nhap
status: complete
completed: 2026-09-19
plans: 13
requirements: [NHAP-01, NHAP-02, NHAP-03, NHAP-04, NHAP-05, NHAP-06, NHAP-07, NHAP-08]
---

# Phase 3 — Phiếu nhập: tổng kết thực thi

13 plan, 8 wave, chạy tuần tự trong một phiên. 8 migration mới (0041–0048).

## Làm được gì

| Plan | Kết quả |
|---|---|
| 03-01 | Kho theo **từng dòng** — cột nullable + `coalesce(dòng, header)` nên Phase 1 không vỡ |
| 03-02 | Số phiếu riêng cho nhà máy (`PNM26-000001`) bằng cặp (loại, nguồn), không đụng enum `loai_ct` |
| 03-03 | `dat_gia_von_dau_ky` — chỉ quản lý, chỉ khi giá vốn đang 0, tự ghi nhật ký |
| 03-04 | `danh_sach_chung_tu`, `chi_tiet_chung_tu`, `dong_chung_tu` |
| 03-05 | Lớp dữ liệu client: schema, api, hooks, bộ lọc URL |
| 03-06 | Màn danh sách theo khuôn `BoCucDanhSach` mới |
| 03-07 | Tạo phiếu cấp số ngay trên server; đầu phiếu sửa tới đâu lưu tới đó |
| 03-08 | Bảng dòng gõ bàn phím, kho riêng từng dòng, hàng tổng cộng |
| 03-09 | Ghi sổ có tóm tắt hậu quả, chặn sớm dòng thiếu đơn giá |
| 03-10 | Hủy phiếu: chỉ quản lý với phiếu đã ghi sổ — chặn ở **database** |
| 03-11 | Mẫu in không có giá, đầu bảng lặp sang trang sau |
| 03-12 | Nạp giá vốn đầu kỳ bằng Excel, xem trước rồi mới đặt |
| 03-13 | Điều hướng + ma trận quyền route 50 → 65 ô |

## Bộ kiểm cuối

```
pgTAP                 225 assert, 0 đỏ, 0 lỗi SQL   (Phase 2 kết thúc ở 199)
verify:hook           ✓ 4/4 tài khoản
hàm thuần             ✓ (+11 assert bộ lọc phiếu)
đọc Excel             ✓ file KiotViet thật
quyền route           ✓ 65/65 ô
npm run check         exit 0
```

## Thử toàn luồng trên database thật

Dùng **mã test** (`PN-UAT-A`, `PN-UAT-B`), không đụng mã thật — giá vốn không hoàn tác được.

```
giá vốn trước:            0 và 0
tạo phiếu                 PNM26-000001   ← số theo nguồn nhà máy
2 dòng, 2 kho             dòng A → kho phiếu (K1), dòng B → K2
ghi sổ                    tồn K1=10, K2=20
giá vốn sau               5.000 và 10.000
vanphong hủy              42501 "Chỉ quản lý được hủy phiếu nhập đã ghi sổ"
quanly hủy                ok — tồn về 0
giá vốn sau hủy           5.000 và 10.000  ← KHÔNG quay lại, đúng thiết kế
```

## Bốn lỗi thật phát hiện khi chạy, đã sửa

1. **Đệ quy vô hạn RLS** (0041 → 0042). Policy `chung_tu` hỏi `chung_tu_dong`, mà policy
   `chung_tu_dong` hỏi ngược `chung_tu`. Mọi truy vấn chứng từ chết, kể cả của quản lý.
   Thoát bằng hàm `SECURITY DEFINER` cắt vòng.
2. **`kho_hien_tai()` trả mảng** từ 0026, nhưng file `0016` tôi chép là bản cũ so bằng `=`.
   Phải lấy định nghĩa policy **đang chạy** từ `pg_policies`, không chép từ file migration cũ.
3. **`sinh_so_ct` thiếu `SECURITY DEFINER`** (0047). Nó ghi `chuoi_so_ct` mà client không có
   quyền ghi. Từ Phase 1 tới giờ chưa ai gọi từ client nên lỗi nằm im; màn tạo phiếu gọi thật
   là lộ ngay.
4. **Khối kiểm vai trò chặn nhầm ngữ cảnh không có JWT** (0047 → 0048). Làm chết 34 assert ở
   test 20 và 80. Quy ước dự án: chỉ chặn `chi_xem`, để null cho migration/script/pgTAP.

## Lan tỏa ngoài dự tính, đã xử lý

- Cặp khóa (loại, nguồn) làm mọi `where loai_ct = X` khớp **hai dòng** → sửa màn Cài đặt số
  chứng từ của Phase 2 và 3 chỗ trong test 80.
- Một **false pass** do chính tôi tạo ở plan 01: assertion "thủ kho Kho 2 thấy phiếu nhờ dòng"
  dùng `thukho2`, mà seed cho tài khoản đó **cả K1 lẫn K2** — nó pass vì header. Hai test giờ
  gán lại thủ kho chỉ còn K2 ngay trong transaction.
- **Cách đếm assert cũ nói dối:** file pgTAP chết giữa chừng không sinh `not ok` nào, nên chỉ
  đếm `not ok` ra "0 lỗi" trong khi 34 assert không hề chạy. Bộ đếm giờ đếm cả dòng `ERROR`.

## Chưa làm

- **UAT trên trình duyệt** — chưa mở màn phiếu nhập bằng mắt. `npm run check` và 65 ô quyền
  route không chứng minh giao diện chạy (bài học Phase 2: cả 5 lỗi UAT đều lọt qua check).
- Dữ liệu thử để lại: phiếu `PNM26-000001` ở trạng thái **đã hủy**, hai mã `PN-UAT-A/B`
  **ngừng kinh doanh** với giá vốn 5.000/10.000.
