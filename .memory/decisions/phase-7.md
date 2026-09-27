# Quyết định Phase 7 — Trang tổng quan

- **Thu hẹp theo nỗi đau B + C** (xuất âm tùy tiện, không biết bán nhanh hay chậm).
  Phase 7 gồm TQAN-01, TQAN-06 và TQAN-07 (nhịp bán hôm nay/hôm qua). TQAN-05 (giá
  trị tồn) đóng hẳn vì không dùng giá. TQAN-03, TQAN-04 và TON-03 dời tới khi hệ mới
  có đủ ≥ 30 ngày dữ liệu, không ghép KiotViet.
- **Chỉ quản lý thấy `/`.** Vai trò khác vào `/` thì được chuyển sang màn làm việc
  (văn phòng → /xuat-kho, thủ kho và chỉ xem → /ton-kho), không đưa tới
  /khong-du-quyen. Quyền chặn ở cả route lẫn RPC (42501).
- **Tồn theo nhóm đếm SỐ MÃ, không cộng số lượng** (các mã khác ĐVT). Định nghĩa
  trạng thái phải khớp từng chữ với `danh_sach_ton_kho` (0067), và pgTAP 93 đối chiếu
  chéo trên dữ liệu thật để số đếm bằng số dòng khi bấm sang /ton-kho.
- **"Mã bị âm" dựng lại bằng window function** trên `kho_movement`, thứ tự
  `(m.created_at, d.created_at, d.id, m.id)`. Không có cột tồn lũy kế nào, và sổ cái
  không bị sửa.
- **Migration đánh số 0069–0071** vì cloud đã có `0068_hinh_anh` (Phase 9, áp từ một
  phiên khác, chưa có trong repo).
