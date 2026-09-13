# Kiến thức: dữ liệu KiotViet của Minh Vũ

Sự thật rút từ 4 file export ngày 12/09/2026 (kỳ 03–12/09/2026), đã kiểm trên dữ liệu
đã nạp. Công cụ soi lại: `npx tsx scripts/import-kiotviet/phan-tich.ts`.

---

## Định dạng file

- **Tên file có timestamp:** `DanhSachSanPham_KV12092026-153850-575.xlsx`. Khớp theo tiền tố.
- **exceljs reader thường crash** (`reading 'styles'`) — styles.xml lệch chuẩn. Dùng
  `ExcelJS.stream.xlsx.WorkbookReader` với `styles: "ignore"`.
- **Ngày là số sê-ri Excel** (`46277.65498746528`), không múi giờ, là **giờ treo tường
  Việt Nam**. Gắn `+07:00`, không phải `Z`. Kiểm chứng: hóa đơn cuối 15:43, file xuất 15:50.
- Không có dòng "TỔNG CỘNG" ở cuối sheet. Một vài dòng hóa đơn lỗi mã hóa ký tự
  (`ĐIỀU PH��I`) ở cột khách hàng.

---

## Sản phẩm (3.266 mã)

**Ô ĐVT chứa lẫn công đoạn:** CÁI 1.571 · CARBON 518 · SƠN 394 · XI MẠ 278 · ÉP 230 ·
CẶP 148 · BỘ 42 · rỗng 39 · CHAI 22 · NANO 20 · và 1 mỗi loại: PC, Sơn (chữ thường), LON, BỊCH.

**Quy ước đuôi mã hàng = công đoạn** (kiểm trên 1.441 mã có công đoạn từ ĐVT):

| Đuôi | Công đoạn | Độ khớp |
|---|---|---|
| `-CB` | CARBON | 97,3% |
| `-X` | XI MẠ | 95,3% |
| `-S` (kể cả `-SĐM`…) | SƠN | 94,4% |
| — | ÉP, NANO | không có quy ước |

**Nhóm hàng (90 nhóm):** `" - "` **không nhất quán** — lúc tên–mã (`NẠ - 75`), lúc
cha–con (`BAGA - CẢNG`). Tách máy móc làm đụng mã: `Hàng Hãng - L5/6` và
`Hàng Ngoài - L5/6` cùng ra `L5/6`; `DÈ CON - 35` và `DÈ TRƯỚC - 35` cùng ra `35`.
Giữ nguyên tên đầy đủ, mã = slug.

- `Hàng Hãng - L5/6` (1.135 mã): phụ tùng chính hãng, mã Honda dạng `06410KFL850`. 100% mua ngoài.
- `Hàng Ngoài - L5/6` (189 mã): hàng ngoài. 100% mua ngoài.
- Họ `BAGA` (baga, cảng, inox, sắt…): phụ kiện kim loại, phần lớn mua ngoài.

**Cột "Vị trí" là KHO, không phải kệ:** Kho 1 = 3.240 mã, Kho 2 = 26 mã.
Kho 2 trùng khít `Nhóm 122B` (26 mã).

**Quy đổi = 1 cho mọi mã, kể cả 148 mã CẶP.** CẶP là đơn vị gốc: hóa đơn ghi ĐVT = CẶP,
bán ra số lẻ (1, 3, 5, 7 — 83 dòng). **1 CẶP = 1 đơn vị tồn.**

**Khác:** giá bán = 0 cho cả 3.266 mã · 7 mã "Combo - đóng gói" · 2 mã tồn âm ·
1.094 mã có URL hình ảnh · tồn tổng 389.671 (không nạp).

---

## Nhà cung cấp (25 dòng → 23 thật)

- **NCC ảo:** `NB001` BỘ PHẬN ĐIỀU PHỐI TRẢ HÀNG (giả lập trả hàng) · `NB002` NHẬP BÙ -
  TỒN NỘI BỘ CTY MINH VŨ (nhập bù nội bộ).
- `0317415317` nằm ở ô **mã** — là mã số thuế của CÔNG TY TNHH MTV XE MÁY TÂN THIÊN LONG.
  Đã đổi thành `NCC900001`.
- `NCC000001` = CÔNG TY TNHH MTX SXTM VŨ TRỤ L.AN (nhà máy) — 289/594 dòng nhập.
- `NCC lẻ` (74 dòng) chỉ xuất hiện trong phiếu nhập, không có trong danh sách NCC.

---

## Hóa đơn (4.732 dòng) và phiếu nhập (594 dòng)

- **Mọi hóa đơn** có khách = `NB001 BỘ PHẬN ĐIỀU PHỐI ĐƠN`. Tên khách thật ở ô **Ghi chú**:
  QUỲNH 317 · NGỌC 288 · TỐT 285 · NHUNG 260 · VI 192 · OANH 179 · QUYÊN 175 · PHƯƠNG 161,
  cùng ~147 giá trị khác. 1.227 dòng ghi chú rỗng.
- **8 tên này KHÔNG phải nhân viên lập hóa đơn.** Người bán chỉ có 2: Bùi Thị Kim Chi (3.598),
  Chề Quay Dậu (1.134). Người tạo: Minh Nhi (4.719), Từ Vĩnh An (13).
- Mỗi tên đi với 27–58 hóa đơn trong 10 ngày → mua lặp lại thường xuyên.
- Kênh bán 100% "Bán trực tiếp". Trạng thái 100% "Hoàn thành".
- Đơn giá = 0 trên mọi dòng hóa đơn. File chi tiết nhập **không có cột đơn giá**.
- 2 mã trên hóa đơn có hậu tố `{DEL}`: `HS20-34ĐB-S{DEL}`, `NCTMD{DEL}` — hàng đã xóa.
- Mã hóa đơn `HD…`, mã đặt hàng `DH…`, mã nhập `PN…`.
