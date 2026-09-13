# File export KiotViet

Đặt bốn file export vào **chính thư mục này**. Nội dung thư mục bị gitignore (trừ
file README này) — đây là dữ liệu kinh doanh thật, không đẩy lên git.

**Giữ nguyên tên file KiotViet xuất ra**, kể cả phần timestamp. Script khớp theo
tiền tố:

| Tiền tố tên file | Dòng (12/09/2026) | Nạp vào |
|---|---|---|
| `DanhSachSanPham_KV…` | 3.266 | `san_pham`, `nhom_hang` |
| `DanhSachNhaCungCap_KV…` | 25 → nạp 23 | `doi_tac` (bỏ 2 NCC ảo) |
| `DanhSachChiTietNhapHang_KV…` | 594 | `luu_tru_nhap_kiotviet` |
| `DanhSachChiTietHoaDon_KV…` | 4.732 | `luu_tru_hoa_don_kiotviet` |

Có nhiều bản cùng loại thì script dùng bản mới nhất và báo ra.

## Cách nạp

```bash
npx tsx scripts/import-kiotviet/xem-cot.ts        # xem cấu trúc cột, khi KiotViet đổi định dạng
npx tsx scripts/import-kiotviet/phan-tich.ts      # hồ sơ dữ liệu, không ghi gì
npm run import:kiotviet -- --dry-run              # kiểm từng dòng, không ghi gì (mặc định)
npm run import:kiotviet -- --ghi                  # nạp thật — idempotent, chạy lại an toàn
```

## Những điều đã biết về file export KiotViet

**Reader thường của exceljs crash** trên file này (`Cannot read properties of
undefined (reading 'styles')`) vì phần styles.xml lệch chuẩn. Script dùng stream
reader bỏ qua styles.

**Ngày là số sê-ri Excel** (`46277.65498746528`), không có múi giờ — là giờ treo
tường Việt Nam. Script chuyển thành ISO kèm `+07:00`.

**Nhóm hàng không tách được thành tên–mã.** `" - "` lúc là tên–mã (`NẠ - 75`),
lúc là cha–con (`BAGA - CẢNG`). Tách máy móc làm `Hàng Hãng - L5/6` (1.135 mã) và
`Hàng Ngoài - L5/6` (189 mã) cùng ra mã `L5/6` và trộn vào nhau. Script giữ
nguyên tên đầy đủ, dựng cây nhóm là việc tay ở màn Cài đặt.

**Ô ĐVT chứa lẫn công đoạn.** Suy được công đoạn cho 1.441 mã (có thêm 1 mã ghi
`Sơn` chữ thường), 1.825 mã còn lại tạm gán `MUA_NGOAI` — trong đó 39 mã ô ĐVT
rỗng.

**Cột `Quy đổi` ghi 1 cho cả 148 mã CẶP.** Script nạp đúng số trong file, không
tự đặt 2. **Cần vận hành xác nhận** 1 CẶP là 1 đơn vị tồn hay 2 CÁI.

**Nhà cung cấp ảo:** `NB001` (trả hàng giả lập), `NB002` (nhập bù nội bộ) — bỏ
qua. `NCC lẻ` chỉ xuất hiện trong phiếu nhập (74 dòng), không có trong danh sách
NCC. Mã `0317415317` là mã số thuế ghi nhầm vào ô mã → đổi thành `NCC900001`.

**Giá bằng 0 trên toàn bộ** 3.266 sản phẩm và 4.732 dòng hóa đơn.

**2 mã trên hóa đơn có hậu tố `{DEL}`** (`HS20-34ĐB-S{DEL}`, `NCTMD{DEL}`) — sản
phẩm đã xóa trên KiotViet, chỉ còn trong bảng lưu trữ.

**Không nạp số tồn 389.671.** Tồn đầu kỳ set từ kiểm kê thực tế ở Phase 6 — tồn
khởi điểm sai thì cả hệ thống sai từ ngày đầu. 2 mã đang tồn âm trên KiotViet.

## Việc còn lại cho Phase 2

- **Trích khách hàng thật từ ô Ghi chú** (DLIEU-04): 3.505 dòng hóa đơn có ghi
  chú, 8 tên chính QUỲNH 317 · NGỌC 288 · TỐT 285 · NHUNG 260 · VI 192 · OANH 179
  · QUYÊN 175 · PHƯƠNG 161, cùng ~150 giá trị khác cần người đối chiếu.
- **Gán công đoạn cho 1.825 mã** đang tạm là `MUA_NGOAI`.
