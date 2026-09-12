# File export KiotViet

Đặt bốn file export vào **chính thư mục này**. Nội dung thư mục bị gitignore (trừ
file README này) — đây là dữ liệu kinh doanh thật, không đẩy lên git.

| File cần đặt | Dòng dự kiến | Nạp vào bảng |
|---|---|---|
| `DanhSachSanPham.xlsx` | 3.266 | `san_pham`, `nhom_hang`, `don_vi_tinh`, `cong_doan` |
| `DanhSachNhaCungCap.xlsx` | 25 | `doi_tac` (loai = NCC) |
| `ChiTietNhapHang.xlsx` | 594 | bảng lưu trữ tra cứu (**không** nạp vào `chung_tu`) |
| `ChiTietHoaDon.xlsx` | 4.732 | `doi_tac` (loai = KHACH) + bảng lưu trữ tra cứu |

Giữ nguyên tên file và định dạng KiotViet xuất ra. Không sửa tay trước khi nạp —
script import có chế độ thử sẽ báo cáo mọi dòng bất thường, sửa ở đó dễ truy vết hơn.

## Cách nạp

```bash
# 1. Chế độ thử — đọc file, kiểm tra từng dòng, KHÔNG ghi gì vào database
npm run import:kiotviet -- --dry-run

# 2. Đọc báo cáo. Dòng nào lỗi thì xử lý rồi chạy lại bước 1.

# 3. Nạp thật — toàn bộ hoặc không gì cả, chạy lại nhiều lần không nhân đôi
npm run import:kiotviet
```

Script được tạo ở Phase 1 (xem `.planning/phases/01-nen-du-lieu/01-CONTEXT.md`, D-04..D-07).

## Hai việc làm sạch phải xong trước go-live

1. **Tách ĐVT thành `dvt` + `cong_doan`.** Trường ĐVT của KiotViet đang chứa lẫn đơn vị
   tính (CÁI, CẶP, BỘ, CHAI) và công đoạn xử lý bề mặt (ÉP, SƠN, CARBON, XI MẠ, NANO).
   Script tách tự động được 1.440 mã; 1.826 mã còn lại có ĐVT "CÁI" phải rà theo nhóm hàng.
2. **Trích khách hàng thật từ ô Ghi chú.** Cả 4.732 dòng bán gắn với một mã khách duy nhất
   "BỘ PHẬN ĐIỀU PHỐI ĐƠN"; tên khách thật nằm ở cột Ghi chú dạng chữ tự do. Việc này thuộc
   Phase 2 vì cần người đối chiếu tay.

**Không nạp số tồn 389.671 từ KiotViet.** Tồn đầu kỳ được set từ kiểm kê thực tế ở Phase 6 —
tồn khởi điểm sai thì cả hệ thống sai từ ngày đầu và không có cách sửa ngoài kiểm kê lại.
