# Quyết định Phase 6 — Kiểm kê & Go-live (24–25/09/2026)

Nguồn đầy đủ: `.planning/phases/06-kiem-ke-go-live/06-CONTEXT.md` (D-01..D-17).

## Phạm vi

- Office Hours 24/09: nỗi đau chính là **mất lịch sử khi bỏ KiotViet**. Phase 6 thu về
  kiểm kê + chốt số + tra cứu lịch sử; tổng quan → Phase 7, mobile & chuyển kho → Phase 8.
- **Không dùng barcode, không dán tem/giá lên sản phẩm.** Mọi chỗ "quét mã" thành ô tìm mã.
- **Không dùng giá** ("mọi câu hỏi về giá cứ cho = 0"). DLIEU-05 đóng; kiểm kê không có cột tiền.

## Kiểm kê

- Tồn sổ chốt **theo từng dòng, lúc lưu số đếm** (D-03) — kho không đóng khi kiểm kê định kỳ.
  `_ghi_so_kiem_ke` (0011) không đổi; `luu_dong_kiem_ke` (0065) ghi `so_luong_he_thong` lúc lưu,
  đếm lại thì chốt lại. Duyệt dùng lệch ĐÃ chốt, không tính lại lúc duyệt.
- Một phiên = một chứng từ KIEM_KE cho một kho; mỗi mã một dòng (unique index); đếm song song
  chia theo nhóm hàng, không cộng dồn.
- Đầu kỳ: vẫn nạp tồn tạm KiotViet (DIEU_CHINH, Phase 5 D-05) rồi kiểm kê đè lên; đếm ngoài hệ
  sát ngày chuyển, nhập bằng Excel mẫu (không lộ tồn). Mã chưa đếm = 0 nhưng phải liệt kê trước duyệt.
- Ngưỡng lệch lớn ≥5 cái hoặc ≥10% — một hằng số trong `features/stocktake/lib/discrepancy.ts`.

## Quyền

- Hai **công tắc theo người** trên `nguoi_dung`: `xem_lich_su_kiotviet`, `duyet_kiem_ke`
  (0063). Hàm kiểm quyền đọc **bảng**, không đọc JWT → bật/tắt có hiệu lực ở lần tải trang kế,
  không vướng bẫy 6. `quan_ly` luôn có quyền dù cột false.
- Văn phòng được backfill `xem_lich_su_kiotviet = true` để không mất quyền ngày go-live.
- `ghi_so_chung_tu` từ chối KIEM_KE nếu thiếu quyền duyệt — chặn đường gọi thẳng RPC ghi sổ.

## Lịch sử KiotViet

- Ba cửa đọc `luu_tru_*` cùng gate theo công tắc: policy 0016, `lich_su_giao_dich_doi_tac`
  (0033), và `the_kho_san_pham` (0062 — **đã bỏ hẳn** dòng KiotViet khỏi thẻ kho, D-11).
- Xem ở màn `/lich-su-kiotviet` + tab trong chi tiết mã hàng; tìm khách tự do không dấu trên
  khách/NCC + ghi chú.
