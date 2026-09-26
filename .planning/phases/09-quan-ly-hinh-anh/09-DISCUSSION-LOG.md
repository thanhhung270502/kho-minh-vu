# Phase 9: Quản lý hình ảnh - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-26
**Phase:** 09-quan-ly-hinh-anh
**Areas discussed:** Ảnh có sẵn trên KiotViet, Ảnh hiện ở đâu, Nhiều ảnh cho 1 mã

---

## Office Hours

1. **Nỗi đau:** Không có ảnh, nhân viên không biết mặt hàng gì.
2. **Bản hẹp nhất:** Mỗi mã có thể có nhiều ảnh.
3. **Giả định có thể sai:** Người chụp là người được tạo mã, mã nào cần chụp thì chụp · Ảnh
   KiotViet có sẵn: có · Drive đủ dùng · Thumbnail không làm chậm phiếu xuất: ok.

Vùng "Ai thêm/xóa ảnh" không chọn bàn — lấy theo câu 3 (quyền `edit-catalog`).

---

## Ảnh có sẵn trên KiotViet

| Option | Description | Selected |
|--------|-------------|----------|
| Chép 1 lần sang Drive | Script tải CDN KiotViet → nén → Drive → hinh_anh | ✓ |
| Trỏ tạm link KiotViet | noi_luu='KIOTVIET', chép sau | |
| Bỏ, chụp lại từ đầu | Không dùng ảnh cũ | |

| Option | Description | Selected |
|--------|-------------|----------|
| Script chạy tay, chạy lại được | Cùng họ import:kiotviet, idempotent, báo cáo lỗi | ✓ |
| Nút trên giao diện | Tải file export lên rồi bấm nhập | |

## Ảnh hiện ở đâu

| Option | Description | Selected |
|--------|-------------|----------|
| Bảng danh mục | Cột thumbnail ở /danh-muc | ✓ |
| Gợi ý ô tìm mã | Thumbnail trong ProductSearchInput | |
| Dòng phiếu / đơn | Thumbnail trong bảng dòng | |
| Màn tồn kho | Thumbnail ở /ton-kho | |

| Option | Description | Selected |
|--------|-------------|----------|
| Phóng to xem tại chỗ | Lớp xem ảnh lớn, qua lại giữa các ảnh | ✓ |
| Mở chi tiết mã hàng | Chuyển màn | |

## Nhiều ảnh cho 1 mã

| Câu hỏi | Chọn |
|---------|------|
| Tối đa ảnh/mã (8 / 5 / không giới hạn) | Không giới hạn |
| Ảnh chính (ảnh đầu tự thành chính, đổi được / kéo thả) | Ảnh đầu tự thành chính, đổi được |
| Mã chưa có ảnh (ô xám biểu tượng / để trống) | Ô xám biểu tượng ảnh mờ |
| Bộ lọc "Chưa có ảnh" (có / không) | Có |

## Claude's Discretion

Luồng tải nhiều ảnh, xử lý HEIC, thông số nén, giao diện thư viện ảnh, cách bảng danh mục
lấy ảnh chính, schema chi tiết `hinh_anh`, cơ chế cache `/anh/<id>`, tài liệu thiết lập
tài khoản Google + Apps Script.

## Deferred Ideas

Ảnh chứng từ · thumbnail ở ô tìm mã / dòng phiếu / tồn kho · kéo thả sắp thứ tự · chuyển cloud.
