# Requirements: Kho Minh Vũ

**Defined:** 2026-09-12
**Core Value:** Ngày đầu go-live, toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở KiotViet để đối chiếu.

## v1 Requirements

### Nền dữ liệu (DATA)

- [ ] **DATA-01**: Chạy migration từ đầu trên database rỗng dựng được đủ 13 bảng, index và ràng buộc
- [ ] **DATA-02**: Mọi UPDATE hoặc DELETE trên `kho_movement` bị database từ chối, kể cả khi gọi bằng `service_role`
- [ ] **DATA-03**: Thêm một dòng `kho_movement` làm `ton_kho` của (kho, sản phẩm) đó cập nhật ngay, ứng dụng không phải gọi thêm lệnh nào
- [ ] **DATA-04**: Sau mỗi phiếu nhập, giá vốn bình quân gia quyền di động của sản phẩm được tính lại theo công thức `(tồn cũ × giá cũ + lượng nhập × giá nhập) / (tồn cũ + lượng nhập)`
- [ ] **DATA-05**: Ghi sổ một chứng từ là một transaction — lỗi ở dòng thứ n không để lại movement nào của n-1 dòng trước
- [ ] **DATA-06**: Hủy chứng từ đã ghi sổ sinh bút toán đảo và giữ nguyên bản ghi gốc, tồn quay về đúng số trước khi ghi sổ
- [ ] **DATA-07**: Tìm sản phẩm bằng mã hoặc tên, gõ không dấu vẫn ra kết quả có dấu, mã phát sinh gần đây xếp trước
- [ ] **DATA-08**: Chứng từ được đánh số tự động theo loại và năm (`PN26-000001`), hai người tạo cùng lúc không ra số trùng
- [ ] **DATA-09**: Job hằng đêm đối chiếu `ton_kho` với tổng `kho_movement` và báo ra danh sách chênh lệch
- [ ] **DATA-10**: Bộ test pgTAP phủ trigger tồn kho, công thức giá vốn, chặn sửa sổ cái và bốn vai trò RLS

### Đăng nhập & phân quyền (AUTH)

- [x] **AUTH-01**: Người dùng đăng nhập bằng email và mật khẩu, phiên giữ nguyên qua refresh trang
- [x] **AUTH-02**: Chưa đăng nhập mà vào route nội bộ thì bị đẩy về `/dang-nhap`, đăng nhập xong quay lại đúng trang định vào
- [ ] **AUTH-03**: Vai trò và kho của người dùng nằm trong JWT claims; RLS policy đọc từ claims, không truy vấn bảng theo từng dòng
- [ ] **AUTH-04**: Thủ kho chỉ đọc được tồn và chứng từ của kho mình, không thấy kho còn lại
- [ ] **AUTH-05**: Văn phòng sửa được danh mục nhưng không sửa được giá vốn và giá bán
- [ ] **AUTH-06**: Vai trò "chỉ xem" không tạo được chứng từ — bị chặn ở database, không chỉ ẩn nút
- [x] **AUTH-07**: Người dùng đăng xuất được từ bất kỳ trang nào

### Danh mục hàng hóa (DMUC)

- [ ] **DMUC-01**: Xem bảng 3.266 mã hàng với phân trang, sắp xếp và lọc chạy phía server
- [ ] **DMUC-02**: Lọc danh mục theo nhóm hàng, công đoạn, đơn vị tính và trạng thái tồn
- [ ] **DMUC-03**: Tìm bằng một ô duy nhất theo cả mã và tên, gõ không dấu vẫn ra kết quả
- [x] **DMUC-04**: Tạo và sửa mã hàng với `dvt` và `cong_doan` là hai trường độc lập, kèm `quy_doi`
- [x] **DMUC-05**: Xem chi tiết một mã hàng kèm thẻ kho của mã đó
- [ ] **DMUC-06**: Import danh mục từ file Excel, báo rõ dòng nào lỗi và lỗi gì, không nạp nửa vời
- [ ] **DMUC-07**: Export danh mục đang lọc ra file Excel

### Đối tác (DTAC)

- [ ] **DTAC-01**: Xem nhà cung cấp và khách hàng trong cùng một danh sách, lọc được theo loại
- [x] **DTAC-02**: Tạo và sửa đối tác với loại thuộc (NCC, KHACH, CA_HAI)
- [ ] **DTAC-03**: Xem lịch sử giao dịch của một đối tác

### Phiếu nhập (NHAP)

- [ ] **NHAP-01**: Tạo phiếu nhập ở trạng thái `NHAP_LIEU`, chọn nhà cung cấp và kho
- [ ] **NHAP-02**: Thêm dòng bằng ô tìm mã, nhập số lượng và đơn giá
- [ ] **NHAP-03**: Ghi sổ phiếu nhập làm tồn tăng và giá vốn tính lại
- [ ] **NHAP-04**: Phiếu đã `HOAN_THANH` không sửa được — chặn ở database
- [ ] **NHAP-05**: Hủy phiếu nhập đã ghi sổ sinh bút toán đảo
- [ ] **NHAP-06**: In phiếu nhập
- [ ] **NHAP-07**: Chọn được loại "Nhập từ nhà máy", phân biệt với nhập NCC thường
- [ ] **NHAP-08**: Phiếu đang nhập dở tự lưu nháp, không mất khi mất mạng hoặc đóng nhầm tab

### Đơn đặt hàng (DDH)

- [x] **DDH-01**: Tạo đơn đặt hàng theo khách với nhiều dòng và ngày giao dự kiến
- [x] **DDH-02**: Xem số đã xuất và còn lại của từng dòng đơn đặt hàng
- [x] **DDH-03**: Trạng thái đơn chạy `TAM` → `DA_XAC_NHAN` → `HOAN_THANH` theo bước duyệt; tiến độ giao (đã xuất / còn lại) tính khi đọc từ số đã xuất của từng dòng *(đổi trục theo D-04, chốt 20/09)*
- [x] **DDH-04**: Tạo phiếu xuất thẳng từ đơn đặt hàng, các dòng được bê sang nguyên vẹn

### Phiếu xuất & trả hàng (XUAT)

- [x] **XUAT-01**: Tạo và ghi sổ một phiếu xuất từ đơn đặt hàng có sẵn trong dưới 20 giây — kho chỉ xác nhận số thực xuất, không gõ lại mã
- [x] **XUAT-02**: Tạo phiếu xuất mới không cần đơn đặt hàng
- [ ] **XUAT-03**: Thêm dòng bằng cách quét barcode qua camera điện thoại *(dời sang Phase 6 — chốt 20/09)*
- [x] **XUAT-04**: Khi số xuất làm tồn xuống dưới 0, hệ thống cảnh báo và bắt buộc chọn lý do trước khi cho ghi sổ
- [x] **XUAT-05**: Ghi sổ phiếu xuất làm tồn giảm và cập nhật tiến độ đơn đặt hàng liên quan
- [x] **XUAT-06**: In phiếu giao hàng
- [x] **XUAT-07**: Nhập liệu hoàn toàn bằng bàn phím — Enter xuống dòng mới, Tab sang ô số lượng, không cần chạm chuột
- [ ] **XUAT-08**: Màn xuất hàng dùng được trên điện thoại: nút đủ to, bảng cuộn ngang trong khung riêng *(dời sang Phase 6 — chốt 20/09)*
- [x] **XUAT-09**: Trả hàng khách (`TRA_KHACH`, tồn tăng) và trả hàng NCC (`TRA_NCC`, tồn giảm) là hai loại chứng từ riêng, đều bắt buộc tham chiếu chứng từ gốc

### Tồn kho (TON)

- [ ] **TON-01**: Xem tồn theo từng kho, lọc theo nhóm hàng và công đoạn
- [ ] **TON-02**: Xem thẻ kho của một mã — mọi biến động kèm link mở đúng chứng từ sinh ra nó
- [ ] **TON-03**: Xem tuổi tồn và danh sách hàng không luân chuyển
- [ ] **TON-04**: Chuyển hàng giữa hai kho bằng một chứng từ `CHUYEN_KHO`
- [ ] **TON-05**: Màn tồn kho dùng được trên điện thoại

### Kiểm kê (KKE)

- [ ] **KKE-01**: Mở phiên kiểm kê theo kho và nhóm hàng; hệ thống chốt tồn sổ tại thời điểm đếm
- [ ] **KKE-02**: Đếm bằng quét mã trên điện thoại
- [ ] **KKE-03**: Xem bảng lệch giữa số đếm thực tế và tồn sổ
- [ ] **KKE-04**: Duyệt phiên kiểm kê sinh phiếu điều chỉnh, tồn về đúng số đã đếm

### Tổng quan (TQAN)

- [ ] **TQAN-01**: Xem tồn kho theo nhóm hàng và theo công đoạn
- [ ] **TQAN-02**: Xem danh sách mã dưới định mức tồn tối thiểu
- [ ] **TQAN-03**: Xem danh sách hàng không luân chuyển quá 30 ngày
- [ ] **TQAN-04**: Xem biểu đồ nhập–xuất 30 ngày gần nhất
- [ ] **TQAN-05**: Xem tổng giá trị tồn kho
- [ ] **TQAN-06**: Xem báo cáo các lần xuất âm trong ngày kèm lý do đã chọn

### Cài đặt (CDAT)

- [x] **CDAT-01**: Quản lý người dùng và gán vai trò
- [ ] **CDAT-02**: Quản lý danh sách kho
- [ ] **CDAT-03**: Quản lý nhóm hàng, đơn vị tính và công đoạn
- [x] **CDAT-04**: Cấu hình quy tắc đánh số chứng từ theo loại

### Chuyển dữ liệu (DLIEU)

- [x] **DLIEU-01**: Nạp 3.266 mã hàng, 90 nhóm, 25 đối tác và 2 kho từ file export KiotViet
- [x] **DLIEU-02**: Khi nạp, tách trường ĐVT cũ thành `dvt` và `cong_doan`
- [x] **DLIEU-03**: Gán công đoạn cho 1.826 mã không suy được từ ĐVT cũ
- [ ] **DLIEU-04**: Trích và chuẩn hóa danh sách khách hàng thật từ ô Ghi chú của 4.732 dòng bán
- [ ] **DLIEU-05**: Nạp giá vốn khởi đầu một lần từ file Excel
- [ ] **DLIEU-06**: Set tồn đầu kỳ từ kết quả kiểm kê thực tế, không bê số 389.671 từ KiotViet
- [ ] **DLIEU-07**: Lưu 594 dòng nhập và 4.732 dòng hóa đơn cũ vào bảng lưu trữ riêng để tra cứu, không nạp vào `chung_tu`

## v2 Requirements

### Công nợ (CNO)

- **CNO-01**: Theo dõi công nợ phải thu theo khách hàng
- **CNO-02**: Theo dõi công nợ phải trả theo nhà cung cấp
- **CNO-03**: Ghi nhận thanh toán và đối chiếu
- **CNO-04**: Báo cáo tuổi nợ

### Quản lý lô (LO)

- **LO-01**: Quản lý hàng theo lô và hạn dùng
- **LO-02**: Tính giá vốn FIFO theo lô

### Tích hợp (TICH)

- **TICH-01**: Nối API với hệ sản xuất Vũ Trụ L.An để tự sinh phiếu nhập từ nhà máy
- **TICH-02**: Phát hành hóa đơn điện tử và kết nối thuế

### Mở rộng (MRNG)

- **MRNG-01**: Hỗ trợ nhiều chi nhánh

## Out of Scope

| Feature | Reason |
|---------|--------|
| Công nợ phải thu / phải trả | Đã chốt ngoài phạm vi v1. Cần thêm bảng thanh toán, đối chiếu, tuổi nợ — đủ lớn để thành milestone riêng |
| Sổ quỹ, nghiệp vụ thanh toán | Hệ quả trực tiếp của việc bỏ công nợ ở v1 |
| Quản lý theo lô & hạn dùng | Phụ tùng xe máy chưa cần truy xuất lô. Kéo theo FIFO và toàn bộ logic phân bổ lô khi xuất |
| Quản lý sản xuất (WIP, lệnh sản xuất, tiến độ xưởng) | Ranh giới đã chốt: chỉ kho thương mại Minh Vũ. Nhà máy Vũ Trụ L.An là một nhà cung cấp |
| Nối API hệ sản xuất | Ranh giới như trên. Chỉ chừa sẵn loại phiếu "Nhập từ nhà máy" để v2 nối vào |
| Nhiều chi nhánh | Hiện 1 chi nhánh, 2 kho. Bảng `kho` đã đủ để mở rộng khi cần |
| Hóa đơn điện tử, kết nối thuế | Giá đang bằng 0 trên hệ cũ, chưa phát sinh nghiệp vụ hóa đơn |
| App native (iOS/Android) | Web responsive + quét barcode qua camera trình duyệt là đủ. Không dự kiến làm |
| Realtime đồng bộ nhiều thiết bị | Chưa có nhu cầu — mỗi phiếu do một người nhập. Supabase Realtime đã sẵn nếu v2 cần |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| DATA-06 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Pending |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Pending |
| DATA-10 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| DLIEU-01 | Phase 1 | Complete |
| DLIEU-02 | Phase 1 | Complete |
| DLIEU-03 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| DMUC-01 | Phase 2 | Pending |
| DMUC-02 | Phase 2 | Pending |
| DMUC-03 | Phase 2 | Pending |
| DMUC-04 | Phase 2 | Complete |
| DMUC-05 | Phase 2 | Complete |
| DMUC-06 | Phase 2 | Pending |
| DMUC-07 | Phase 2 | Pending |
| DTAC-01 | Phase 2 | Pending |
| DTAC-02 | Phase 2 | Complete |
| DTAC-03 | Phase 2 | Pending |
| DLIEU-04 | Phase 2 | Pending |
| CDAT-01 | Phase 2 | Complete |
| CDAT-02 | Phase 2 | Pending |
| CDAT-03 | Phase 2 | Pending |
| CDAT-04 | Phase 2 | Complete |
| NHAP-01 | Phase 3 | Pending |
| NHAP-02 | Phase 3 | Pending |
| NHAP-03 | Phase 3 | Pending |
| NHAP-04 | Phase 3 | Pending |
| NHAP-05 | Phase 3 | Pending |
| NHAP-06 | Phase 3 | Pending |
| NHAP-07 | Phase 3 | Pending |
| NHAP-08 | Phase 3 | Pending |
| DDH-01 | Phase 4 | Complete |
| DDH-02 | Phase 4 | Complete |
| DDH-03 | Phase 4 | Complete |
| DDH-04 | Phase 4 | Complete |
| XUAT-01 | Phase 4 | Complete |
| XUAT-02 | Phase 4 | Complete |
| XUAT-03 | Phase 6 | Pending |
| XUAT-04 | Phase 4 | Complete |
| XUAT-05 | Phase 4 | Complete |
| XUAT-06 | Phase 4 | Complete |
| XUAT-07 | Phase 4 | Complete |
| XUAT-08 | Phase 6 | Pending |
| XUAT-09 | Phase 4 | Complete |
| TON-01 | Phase 5 | Pending |
| TON-02 | Phase 5 | Pending |
| TON-03 | Phase 6 | Pending |
| TON-04 | Phase 6 | Pending |
| TON-05 | Phase 6 | Pending |
| TQAN-01 | Phase 6 | Pending |
| TQAN-02 | Phase 5 | Pending |
| TQAN-03 | Phase 6 | Pending |
| TQAN-04 | Phase 6 | Pending |
| TQAN-05 | Phase 6 | Pending |
| TQAN-06 | Phase 6 | Pending |
| KKE-01 | Phase 6 | Pending |
| KKE-02 | Phase 6 | Pending |
| KKE-03 | Phase 6 | Pending |
| KKE-04 | Phase 6 | Pending |
| DLIEU-05 | Phase 6 | Pending |
| DLIEU-06 | Phase 6 | Pending |
| DLIEU-07 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 74 total
- Mapped to phases: 74
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-12*
*Last updated: 2026-09-12 after roadmap creation (6 phases, 100% coverage)*
