# Phase 6: Kiểm kê & Go-live - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-24
**Phase:** 06-kiem-ke-go-live
**Areas discussed:** Office Hours, Nhịp đếm, Tồn đầu kỳ, Tra cứu lịch sử KiotViet, Duyệt lệch & giá vốn

---

## Office Hours

| Câu | Chọn |
|---|---|
| Nỗi đau thật | Mất lịch sử khi bỏ KiotViet (các lựa chọn khác: tồn sổ sai, thủ kho không dùng điện thoại, quản lý không thấy bức tranh) |
| Bản hẹp nhất | Chỉ kiểm kê + chốt số (khác: kiểm kê + mobile/quét; giữ 17 yêu cầu) |
| Giả định có thể sai | Tự do: "tôi không dùng barcode, không dùng giá trên sản phẩm" + đếm được hết trong một đợt, file giá vốn Excel đáng tin, tồn tạm đã được nạp |

## Nhịp đếm

| Câu | Lựa chọn | Chọn |
|---|---|---|
| Đợt đầu kỳ | Đóng kho đếm hết (đề xuất) / Cuốn chiếu theo nhóm / Đếm ngoài KiotViet rồi nhập sau | Đếm ngoài, nhập sau |
| Kiểm kê định kỳ vừa bán vừa đếm | Để phase sau / Làm luôn Phase 6 / Không cần | Làm luôn Phase 6 |
| Thiết bị | Điện thoại (đề xuất) / Giấy + máy tính / Cả hai + import Excel | Cả hai + import Excel |
| Song song | Chia theo nhóm (đề xuất) / Cộng dồn theo vị trí / Một người mỗi kho | Chia theo nhóm |
| Khoảng hở đếm → chuyển | Đếm sát ngày chuyển (đề xuất) / Đếm trước, trừ bán sau / Ngày đếm theo dòng | Đếm sát ngày chuyển |
| Chốt tồn sổ | Lúc nhập số từng dòng (đề xuất) / Lúc mở phiên + khóa xuất nhóm / Claude quyết | Lúc nhập số từng dòng |

## Tồn đầu kỳ

| Câu | Lựa chọn | Chọn |
|---|---|---|
| Tồn tạm | Bỏ, kiểm kê đặt từ 0 (đề xuất) / Vẫn nạp tồn tạm rồi đè | **Vẫn nạp tồn tạm rồi đè** (khác đề xuất) |
| Mã không có trong file đếm | Tồn 0 + liệt kê (đề xuất) / Chặn duyệt / Để trống | Tồn 0 + liệt kê |
| Khuôn file | Hệ xuất file mẫu theo nhóm (đề xuất) / File KiotViet thêm cột / Claude quyết | Hệ xuất file mẫu |
| So KiotViet | Có, tham khảo (đề xuất) / Không | Có |

## Tra cứu lịch sử KiotViet

| Câu | Lựa chọn | Chọn |
|---|---|---|
| Khi nào tra | Khách hỏi đơn cũ / NCC đối chiếu / Một mã bán cho ai / Mở lại nguyên phiếu | Cả bốn |
| Vị trí | Màn riêng + tab chi tiết mã (đề xuất) / Chỉ màn riêng / Trộn vào thẻ kho | Màn riêng + tab |
| Ai xem | Mọi vai trò, thủ kho ẩn tiền (đề xuất) / Mọi vai trò đủ cột / Chỉ QL + VP | Tự do: "do quản lý phân" → hỏi lại → **công tắc theo từng người** |
| Tra theo khách | Ô tìm tự do khách + ghi chú (đề xuất) / Liên kết đối tác | Ô tìm tự do |

## Duyệt lệch & giá vốn

| Câu | Lựa chọn | Chọn |
|---|---|---|
| Người duyệt | Chỉ quản lý (đề xuất) / QL + VP | Tự do: "admin chỉ định (bật tắt)" → công tắc theo người, quản lý luôn có |
| Lệch lớn | Đánh dấu + đếm lại (đề xuất) / Bắt buộc lý do / Cả hai | Đánh dấu + đếm lại |
| Giá vốn trước/sau | Trước (đề xuất) / Sau / Không quan trọng | Tự do: "dữ liệu này không cần giá, mọi câu hỏi về giá cứ cho = 0" |
| File giá vốn | Kế toán có sẵn (đề xuất) / Giá nhập gần nhất / Chưa có file | Tự do: "không giá" |
| DLIEU-05 | Đóng, không cần (đề xuất) / Chuyển v2 | Đóng |
| Công tắc | QL bật, QL luôn có (đề xuất) / QL cũng phải được bật | QL bật, QL luôn có |

## Claude's Discretion

Ngưỡng lệch lớn; trạng thái phiên ↔ trạng thái chứng từ; cách lưu công tắc quyền và có vào JWT không; bố cục các màn; parse cột `ngay` text; cách gán người ↔ nhóm.

## Deferred Ideas

Trang tổng quan (TQAN-01/03/04/05/06, TON-03); mobile & chuyển kho (XUAT-08, TON-04, TON-05); XUAT-03 bỏ quét; map lịch sử cũ vào đối tác; giá trị tồn/giá trị lệch.
