# Phase 4: Đơn đặt hàng & Phiếu xuất - Discussion Log

> **Chỉ là dấu vết để người đọc lại.** Không dùng làm đầu vào cho bước nghiên cứu,
> lập kế hoạch hay thực thi — các quyết định đã nằm trong `04-CONTEXT.md`.
> File này giữ lại những phương án đã cân nhắc rồi loại.

**Date:** 2026-09-20
**Phase:** 4-Đơn đặt hàng & Phiếu xuất
**Areas discussed:** Office Hours · Danh sách người nhận · Luồng duyệt đơn · Phiếu in đi lấy hàng · Ngoại lệ lúc ghi sổ

---

## Office Hours (ba câu bắt buộc trước khi gom yêu cầu)

### Đau thật sự đang giải là gì?

| Phương án | Chọn |
|---|---|
| Gõ lại đơn từ Zalo/giấy — 92 phiếu/ngày qua nhiều tay, sai mã sai số | ✓ |
| Không biết đơn giao tới đâu — phải hỏi nhau hoặc mở KiotViet đối chiếu | |
| Hàng ra kho không kiểm soát — hàng ra trước, giấy tờ theo sau | ✓ |
| Kho lấy hàng bằng trí nhớ — không có phiếu in cầm đi kiểm hàng | ✓ |

**Đáng chú ý:** "không biết đơn giao tới đâu" **không** được chọn — nghĩa là giao
nhiều lần không phải nỗi đau hằng ngày, dù hướng B vẫn giữ khả năng đó.

### Bản hẹp nhất ship được để học

| Phương án | Chọn |
|---|---|
| Đơn → duyệt → in → phiếu xuất (bỏ mobile/barcode) | ✓ |
| Phiếu xuất thẳng trước, đơn đặt hàng sau | |
| Đủ cả gói như roadmap (kèm mobile + barcode) | |
| Chỉ màn đơn đặt hàng | |

### Giả định nào có thể sai

Chọn **cả bốn**: barcode chưa có gì để quét · danh sách sale chưa tồn tại · kho mặc
định đủ dùng · cơ chế Phase 3 đã chắc.

Ba trong bốn đã xác nhận bằng số đo trên database thật (xem `04-CONTEXT.md`).

---

## Danh sách người nhận

### Nguồn tên ngày đầu

| Phương án | Mô tả | Chọn |
|---|---|---|
| Rà 17 tên lớn trước | ≥10 hóa đơn, phủ 516/699; 123 tên lẻ rà dần | ✓ |
| Rà hết 154 tên một lượt | Đầy đủ nhưng tốn một buổi, 123 tên chỉ 1–2 lần | |
| Gõ tay danh sách sale hiện tại | Sạch nhưng mất liên kết lịch sử | |
| Làm cả hai | Gõ tay trước, rà nối vào sau | |

### Tên biết danh / trùng nhau

| Phương án | Chọn |
|---|---|
| Người rà quyết từng tên, máy không can thiệp | |
| Máy gợi ý nhóm tên gần giống, người xác nhận hoặc tách | ✓ |
| Giữ nguyên, mỗi chuỗi ghi chú là một đối tác | |

### 224 hóa đơn không ghi tên người nhận

| Phương án | Chọn |
|---|---|
| Bắt buộc chọn, có "Khách lẻ" làm lối thoát | |
| Bắt buộc chọn, không lối thoát | |
| Cho gõ tên tự do | ✓ |

**Ghi chú:** câu trả lời "gõ tên tự do" được làm rõ ở câu sau và **chuyển thành**
"một ô duy nhất, gõ ra tên mới thì tạo đối tác tại chỗ" — không thêm cột text tự do.

---

## Luồng duyệt đơn

### Ô người nhận sống chung với ô chọn đối tác thế nào

| Phương án | Chọn |
|---|---|
| Chọn đối tác + ô ghi tên thêm (hai ô) | |
| Một ô duy nhất, gõ ra tên mới thì tạo đối tác tại chỗ | ✓ |
| Ô gõ tay thay hẳn ô chọn (bỏ liên kết `doi_tac`) | |

### Đơn chuyển sang "hoàn thành" lúc nào

| Phương án | Chọn |
|---|---|
| Tự động khi giao đủ | |
| Tự động, nhưng quản lý đóng sớm được | ✓ |
| Quản lý đóng tay hoàn toàn | |

### Ai làm gì

| Phương án | Chọn |
|---|---|
| Văn phòng tạo — chỉ quản lý duyệt | ✓ |
| Cả văn phòng và quản lý đều duyệt được | |
| Văn phòng làm tất, quản lý chỉ xem lại | |

### Đơn đã xác nhận mà cần sửa

| Phương án | Chọn |
|---|---|
| Chỉ quản lý mở khóa về "tạm", ghi nhật ký | ✓ |
| Sửa được nếu chưa xuất dòng nào | |
| Cấm sửa, hủy và tạo lại | |

---

## Phiếu in đi lấy hàng

### In từ đâu

| Phương án | Chọn |
|---|---|
| In từ ĐƠN đã xác nhận | ✓ |
| In từ PHIẾU XUẤT nháp (sinh phiếu ngay khi duyệt) | |
| Cả hai chỗ đều in được | |

### Nội dung tờ phiếu (chọn nhiều)

| Phương án | Chọn |
|---|---|
| Cột trống ghi tay số thực lấy | ✓ |
| Tồn hiện tại của từng mã | |
| Kho và công đoạn | |
| Ô ký nhận | |

### Thứ tự dòng trên phiếu

**Người dùng:** *"bạn tự quyết theo cách tối ưu"* → chuyển sang mục Claude's Discretion.

### Ai nhập số thực xuất

| Phương án | Chọn |
|---|---|
| Văn phòng, điền sẵn số đặt, chỉ sửa dòng lệch | ✓ |
| Văn phòng, gõ lại từng dòng | |
| Thủ kho tự nhập ở kho | |

---

## Ngoại lệ lúc ghi sổ

### Lý do xuất âm nhập thế nào

Người dùng **không chọn phương án nào** mà trả lời bằng nguyên nhân gốc:

> "có thể xuất sai mã, ví dụ hàng hóa tên A mà người dùng không biết nhập thêm hàng
> mà đã mã khác nữa (do bên quy chuẩn mã thay đổi), nên số lượng thực tế ở kho 100 mà
> trên máy bị tách ra 2 dòng 2 mã khác nhau nên số lượng xuất bị âm"

Hỏi lại bằng văn xuôi (3 câu), trả lời:
1. Lúc phát hiện → **"nên đề xuất gộp 2 mã (gộp luôn xuất nhập tồn)"**
2. Có cần phát hiện mã trùng không → **"Có"**
3. Danh sách lý do đề xuất (mã bị tách · hàng đã về chưa nhập phiếu · lệch tồn chờ
   kiểm kê · khác, kèm ô ghi chú) → **"oke"**

Chốt cách tách việc:

| Phương án | Chọn |
|---|---|
| Gợi ý ở Phase 4, gộp để phase riêng | |
| Gộp mã làm luôn trong Phase 4 | |
| Bỏ luôn gợi ý ở Phase 4 | |
| **Tên gần giống (gợi ý hỏi có gộp không)** — người dùng tự viết | ✓ |

→ Phase 4 hiện gợi ý **và hỏi "có gộp không"**, ghi lại đề nghị; việc gộp thật để phase riêng.

### Cảnh báo tồn âm hiện lúc nào

| Phương án | Chọn |
|---|---|
| Ngay khi gõ + lại lúc ghi sổ | ✓ |
| Chỉ lúc bấm ghi sổ | |
| Chỉ ngay khi gõ | |

### Đổi kho khi kho mặc định không đủ

| Phương án | Chọn |
|---|---|
| Đổi được từng dòng | ✓ |
| Cả phiếu một kho | |
| Đổi được, nhưng chỉ quản lý | |

### Trả hàng (XUAT-09)

| Phương án | Chọn |
|---|---|
| Làm luôn, nút trên chứng từ gốc | ✓ |
| Làm, nhưng màn riêng chọn chứng từ gốc | |
| Hoãn sang đợt sau | |

---

## Claude's Discretion

- **Thứ tự dòng trên phiếu đi lấy hàng** — chốt: theo kho, trong kho theo mã hàng,
  mỗi kho một dòng tiêu đề nhóm (không thêm cột, giữ tờ giấy tối giản).
- **4 mã thiếu `kho_mac_dinh_id`** — chặn khi thêm dòng kèm thông báo chỉ đúng chỗ sửa.
- **Cách đánh số đơn** — để bước nghiên cứu chọn; ràng buộc: không trùng khi tạo đồng thời.

## Deferred Ideas

- Gộp hai mã trùng (phase riêng — kèm cảnh báo không được viết lại `kho_movement`)
- XUAT-03 quét barcode · XUAT-08 màn xuất trên điện thoại
- Ảnh sản phẩm, vị trí kệ, màn danh mục mobile, NCC theo mã hàng (phản hồi 19/09 lượt 1)
- Báo cáo sale bán nhiều nhất, báo cáo xuất âm theo lý do → Phase 5
- Sửa danh sách lý do xuất âm ở màn Cài đặt
