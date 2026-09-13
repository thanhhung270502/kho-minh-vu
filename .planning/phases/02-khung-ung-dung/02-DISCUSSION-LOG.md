# Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-13
**Phase:** 02-khung-ung-dung
**Areas discussed:** Office Hours, Tài khoản & Cài đặt, Màn danh mục hàng hóa, Import/Export Excel, Khách hàng từ ô Ghi chú

---

## Office Hours

| Câu hỏi | Lựa chọn đưa ra | Người dùng chọn |
|---|---|---|
| Nỗi đau thật | Chưa ai dùng được hệ thống · Tra mã hàng chậm · Danh mục sai mà không sửa được · Không kiểm soát được ai sửa gì | Cả bốn |
| Phiên bản hẹp nhất | Đủ 18 yêu cầu · Bỏ import/export Excel · Đăng nhập + tra cứu trước | Đủ 18 yêu cầu |
| Giả định có thể sai | Văn phòng chịu bỏ KiotViet · 8 tên trong Ghi chú là khách sỉ · Rà 356 mã trong màn danh mục · Người dùng tự quản lý tài khoản | Cả bốn |

---

## Tài khoản & Cài đặt

| Câu hỏi | Lựa chọn | Chọn |
|---|---|---|
| Đăng nhập bằng gì | Tên đăng nhập + mật khẩu (đề xuất) · Email thật + mật khẩu · Cả hai | Tên đăng nhập + mật khẩu |
| Tạo tài khoản | Quản lý tạo, đặt mật khẩu tạm (đề xuất) · Quản lý gửi email mời · Quản lý tạo, không bắt đổi mật khẩu | Quản lý tạo, đặt mật khẩu tạm |
| Menu không có quyền | Ẩn hẳn (đề xuất) · Hiện nhưng khóa | Ẩn hẳn |
| Cấu hình đánh số chứng từ | Tiền tố + số chữ số (đề xuất) · Chỉ xem · Toàn quyền | Tiền tố + số chữ số |
| Nhân viên nghỉ việc | Vô hiệu hóa, không xóa (đề xuất) · Cho xóa hẳn | Vô hiệu hóa, không xóa |
| Thủ kho gắn kho | Đúng một kho (đề xuất) · Một hoặc nhiều kho | **Một hoặc nhiều kho** — khác đề xuất, phải đổi schema/hook/RLS Phase 1 (tác động 10 tham chiếu) |

---

## Màn danh mục hàng hóa

| Câu hỏi | Lựa chọn | Chọn |
|---|---|---|
| Form tạo/sửa mở ở đâu | Ngăn kéo bên phải (đề xuất) · Trang riêng · Hộp thoại giữa màn | Ngăn kéo bên phải |
| Rà ~356 mã (chọn nhiều) | Chọn nhiều dòng → gán hàng loạt · Gợi ý theo đuôi mã · Lọc nhanh "Cần rà" · Sửa trực tiếp trên ô bảng | Cả bốn |
| Giá bán | Giữ chặn, quản lý đặt sau (đề xuất) · Cho văn phòng đặt lúc tạo · Ẩn giá bán ở v1 | Giữ chặn |
| 8 mã ĐVT mâu thuẫn | Đưa vào "Cần rà" (đề xuất) · Sơn vân carbon, giữ như cũ · Nhập sai, sửa theo đuôi mã | Đưa vào "Cần rà" |
| Giá vốn hiện cho ai | Quản lý + văn phòng (đề xuất) · Chỉ quản lý · Mọi vai trò | Quản lý + văn phòng |
| Mã không dùng nữa | Chỉ "Ngừng kinh doanh" (đề xuất) · Cho xóa mã chưa phát sinh | Chỉ "Ngừng kinh doanh" |
| Ai sửa gì | Người sửa cuối + lúc nào (đề xuất) · Nhật ký từng lần sửa · Không cần | **Nhật ký từng lần sửa** — khác đề xuất |
| Sửa trên ô bảng | Công đoạn, nhóm hàng, ĐVT (đề xuất) · Thêm tên hàng và tồn min/max | Công đoạn, nhóm hàng, ĐVT |

---

## Import/Export Excel

| Câu hỏi | Lựa chọn | Chọn |
|---|---|---|
| Mẫu file | Mẫu riêng hệ mới (đề xuất) · Định dạng KiotViet · Nhận cả hai | **Nhận cả hai** — khác đề xuất; export vẫn theo mẫu mới |
| Mã trùng | Cập nhật theo mã (đề xuất) · Chỉ thêm mới | Cập nhật theo mã |
| Luồng | Xem trước rồi xác nhận (đề xuất) · Tải lên là nạp | Xem trước rồi xác nhận |
| Danh mục lạ trong file | Báo lỗi dòng (đề xuất) · Tự tạo, báo trong xem trước | Báo lỗi dòng |

---

## Khách hàng từ ô Ghi chú

Trước khi hỏi, soi 923 hóa đơn: 699 có ghi chú, 150 giá trị khác nhau; ~20 tên ngắn chiếm ~600
hóa đơn; ~130 giá trị dài giống tên cửa hàng; có giá trị ghép ("PHƯƠNG BÁN LẺ", "HIỀN THẮNG
V.T-PHƯƠNG", "DẬU CB"); 224 hóa đơn không ghi chú. Dữ liệu gợi ý tên ngắn là người phụ trách đơn.

| Câu hỏi | Lựa chọn | Chọn |
|---|---|---|
| Tên ngắn là ai | Nhân viên sale · Khách sỉ thật · Lẫn cả hai · Chưa biết, phải hỏi công ty | Lẫn cả hai |
| Lịch sử giao dịch gồm dữ liệu cũ | Gồm cả dữ liệu cũ (đề xuất) · Chỉ chứng từ mới | Gồm cả dữ liệu cũ |
| Cách phân loại 150 giá trị | Màn "Rà ghi chú" trong app (đề xuất) · Qua file Excel | *Claude quyết* → Màn trong app |
| Sale lưu đến đâu | Chỉ gắn nhãn, Phase 4 dùng (đề xuất) · Tạo danh mục sale ngay | *Claude quyết* → Chỉ gắn nhãn |
| 224 hóa đơn không ghi chú | Gán "Khách lẻ" (đề xuất) · Bỏ qua | *Claude quyết* → Gán "Khách lẻ" |

Người dùng dừng bộ câu hỏi cuối và yêu cầu: "Tiếp tục, với các câu hỏi cứ tự quyết định toàn bộ".

---

## Claude's Discretion

- Ba câu cuối của vùng Khách hàng (D-29, D-30, D-31) — chọn phương án đề xuất.
- Mã khách tự sinh `KH000001` (D-32), bộ lọc CA_HAI (D-33).
- Viết lại app shell, xóa route cũ, menu Phase 2 (D-34); chống open redirect cho `tiep_tuc` (D-35);
  sửa chữ trong `errors.ts` (D-36); tên thư mục feature (D-37).
- Thẻ kho trong chi tiết mã kèm dữ liệu KiotViet cũ (D-21) — suy từ lựa chọn "Gồm cả dữ liệu cũ"
  của DTAC-03 cho nhất quán.
- Nhật ký sửa phủ cả thay đổi vai trò/kho/trạng thái của `nguoi_dung` (D-20).

## Deferred Ideas

- Danh mục sale + người phụ trách trên đơn/phiếu xuất → Phase 4.
- Loại mã ngừng kinh doanh khỏi ô tìm lúc lập phiếu → Phase 3–4.
- Tự khôi phục mật khẩu qua email — không làm (email nội bộ).
- Cây nhóm hàng kéo-thả.
- Xóa cột `nguoi_dung.kho_id` cũ — chỉ khi người dùng đồng ý lúc execute.
