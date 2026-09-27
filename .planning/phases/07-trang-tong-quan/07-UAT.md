---
status: complete
phase: 07-trang-tong-quan
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md, 07-07-SUMMARY.md, 07-08-SUMMARY.md, 07-09-SUMMARY.md]
started: 2026-09-27T03:00:00Z
updated: 2026-09-27T10:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Khởi động nguội
expected: Tắt server, xóa .next, `npm run dev` lại. Server lên không lỗi; `/` chưa đăng nhập về /dang-nhap?tiep_tuc=%2F; ba RPC mới gọi bằng khóa anon bị từ chối.
result: pass
ghi_chu: "Claude chạy 27/09: preview_stop → rm -rf .next → preview_start; preview_logs không lỗi. GET / → 307 /dang-nhap?tiep_tuc=%2F. POST rpc/bao_cao_xuat_am, nhip_ban, ton_theo_nhom bằng khóa anon → 42501 permission denied cả ba."

### 2. Trang tổng quan của quản lý
expected: Đăng nhập quanly → `/`. Ba khối từ trên xuống: Nhịp bán → Xuất âm → Tồn theo nhóm/công đoạn, có nút Làm mới. Console không có cảnh báo antd hay lỗi React.
result: pass
ghi_chu: "Tiêu đề thẻ theo thứ tự: Nhịp bán hôm nay · Xuất âm · Tồn theo nhóm hàng / công đoạn; nút Làm mới ở PageHeader. Console chỉ có info React DevTools + HMR (và cảnh báo preload font của Next dev ở phiên trước) — không cảnh báo antd, không lỗi React."

### 3. Nhịp bán khớp danh sách phiếu xuất
expected: Thẻ Nhịp bán hiện số phiếu / dòng / mã hôm nay kèm "Hôm qua: n" và ▲/▼/"Bằng hôm qua". Số phiếu hôm nay bằng số phiếu xuất đã ghi sổ ngày hôm nay ở /xuat-kho.
result: pass
ghi_chu: "Thẻ 0/0/0, 'Hôm qua: 0 · Bằng hôm qua', chốt 27/09/2026. DB: không có phiếu XUAT nào ngày 26-27/09 → khớp. Trường hợp số khác 0 phủ bằng pgTAP 94 (14/14) — chưa go-live nên chưa có phiếu thật để so."

### 4. Xuất âm rỗng và phiếu hủy không tính
expected: Mặc định hôm nay, hiện "Hôm nay không có lần xuất âm nào." Chọn 25/09 (có 3 phiếu xuất/trả chọn lý do xuất âm nhưng ĐÃ HỦY) → vẫn rỗng. Không chọn được ngày tương lai.
result: pass
ghi_chu: "Hôm nay: 'Hôm nay không có lần xuất âm nào.' Gõ 25/09/2026 → 'Ngày 25/09/2026 không có lần xuất âm nào.' (PX26-000004, PX26-000006, TN26-000024 đều DA_HUY — D-03). Lịch: ô 28/09 có ant-picker-cell-disabled, 27/09 là today."

### 5. Xuất âm có dữ liệu
expected: Ngày có phiếu xuất âm đã ghi sổ: dải thẻ đếm theo 4 lý do + bảng (mã, kho, tồn sau, số phiếu, người lập, lý do). Bấm số phiếu mở đúng /xuat-kho/{id} hoặc /tra-hang/{id}.
result: skipped
reason: "Người dùng chọn bỏ qua 27/09: dữ liệu thật không có lần xuất âm nào còn hiệu lực (4 phiếu có lý do đều đã hủy), tạo phiếu thử trên database sản xuất để lại dấu trong sổ cái. Logic phủ bằng pgTAP 92 (18/18). Kiểm lại khi go-live có phiếu xuất âm thật."

### 6. Bấm số tồn theo nhóm mở /ton-kho khớp số dòng
expected: Tab "Theo nhóm hàng": bấm số ở cột Âm / Hết hàng của một nhóm → /ton-kho lọc sẵn, số dòng bằng số vừa bấm. Chọn một kho trong bộ lọc → số đổi, bấm số → URL có kho=, số dòng vẫn khớp.
result: pass
ghi_chu: "'ĐẦU ĐÈN - 46' Âm = 1 → /ton-kho?nhom=…&ton=am ra 1 mã (YE19-46-1305-S, -6). Chọn Kho 2: 'Hàng Hãng - L5/6' đổi thành 1.135 tổng / 0 còn / 1.135 hết / 2 dưới định mức; bấm '2' → /ton-kho?nhom=…&kho=…&ton=duoi_dinh_muc, bộ lọc hiện đúng nhóm + Kho 2 + Dưới định mức, '2 mã' (06430K44V80, 08CLAM9905BOX)."

### 7. Tab theo công đoạn
expected: Tab "Theo công đoạn": 6 công đoạn, tổng cột Tổng mã bằng tổng tab nhóm; bấm một số → /ton-kho?cong_doan=… khớp số dòng.
result: pass
ghi_chu: "6 công đoạn (Carbon 518, Ép 230, Mua ngoài 1.826, Nano 20, Sơn 395, Xi mạ 278), dòng Tổng 3.267 = dòng Tổng tab nhóm 3.267 (danh mục vừa tăng 1 mã so với 3.266 lúc 07-05). Sơn Âm = 1 → /ton-kho?cong_doan=…&ton=am ra 1 mã YE19-46-1305-S."

### 8. Làm mới
expected: Bấm "Làm mới" → nút quay, gọi lại nhip_ban, bao_cao_xuat_am, ton_theo_nhom. Để yên 1 phút không tự gọi lại.
result: pass
ghi_chu: "PerformanceResourceTiming: bấm Làm mới sinh đúng 3 request mới nhip_ban, bao_cao_xuat_am, ton_theo_nhom. Trong phút sau đó có thêm 3 request — do refetchOnWindowFocus toàn cục (src/providers/query-client.ts, staleTime 30s) khi cửa sổ lấy lại focus lúc chụp màn hình, không phải polling: dashboard không có refetchInterval (D-14 giữ)."

### 9. Vai trò khác vào `/`
expected: vanphong vào `/` → /xuat-kho; thukho1, chixem → /ton-kho. Menu của ba vai trò này không có "Tổng quan".
result: pass
ghi_chu: "Kiểm bằng tự động, không xem giao diện dưới từng vai trò (khung trình duyệt bị thu nhỏ giữa chừng; tiền lệ UAT 05 bài 8): test-route-permissions 150/150 gồm dòng / (quanly 200, vanphong →/xuat-kho, thukho1 →/ton-kho, chixem →/ton-kho, khách →đăng nhập); test-pure-functions: hasPermission(view-dashboard) chỉ quan_ly, filterNavItems ẩn 'Tổng quan' cho văn phòng/thủ kho."

### 10. Điện thoại
expected: Cỡ 375px, quản lý: trang tổng quan không tràn ngang, bảng tồn theo nhóm cuộn ngang trong khung riêng, thẻ nhịp bán xếp dọc đọc được.
result: pass
ghi_chu: "resize mobile 375×812: document.scrollWidth 375 (không tràn); .ant-table-body overflow-x auto, 641px nội dung trong khung 294px; skeleton hiện khi đang tải; thanh tab đáy quản lý: Tổng quan · Xuất · Nhập · Tồn · Khác."

## Summary

total: 10
passed: 9
issues: 0
pending: 0
skipped: 1

## Gaps

[none]

## Ghi chú ngoài phạm vi (không phải lỗi Phase 7)

- Thanh tab đáy của văn phòng/thủ kho/chỉ xem: ô thứ 4 tự lấp "Đặt hàng" sau khi ẩn "Tổng quan" (mobilePriority) — 07-04-SUMMARY.
- Bộ lọc kho của khối tồn theo nhóm là state cục bộ: quay lại từ /ton-kho thì về "Tất cả kho" (D-06 không yêu cầu giữ).
- Cloud có migration 0068_hinh_anh chưa có trong repo.
