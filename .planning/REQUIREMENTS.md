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
- [ ] **XUAT-03**: Thêm dòng nhanh trên điện thoại bằng ô tìm mã *(bỏ quét barcode — người dùng không dùng barcode, không dán tem; chốt 24/09. Dời sang Phase 8)*
- [x] **XUAT-04**: Khi số xuất làm tồn xuống dưới 0, hệ thống cảnh báo và bắt buộc chọn lý do trước khi cho ghi sổ
- [x] **XUAT-05**: Ghi sổ phiếu xuất làm tồn giảm và cập nhật tiến độ đơn đặt hàng liên quan
- [x] **XUAT-06**: In phiếu giao hàng
- [x] **XUAT-07**: Nhập liệu hoàn toàn bằng bàn phím — Enter xuống dòng mới, Tab sang ô số lượng, không cần chạm chuột
- [ ] **XUAT-08**: Màn xuất hàng dùng được trên điện thoại: nút đủ to, bảng cuộn ngang trong khung riêng *(dời sang Phase 8 — chốt 24/09)*
- [x] **XUAT-09**: Trả hàng khách (`TRA_KHACH`, tồn tăng) và trả hàng NCC (`TRA_NCC`, tồn giảm) là hai loại chứng từ riêng, đều bắt buộc tham chiếu chứng từ gốc

### Tồn kho (TON)

- [x] **TON-01**: Xem tồn theo từng kho, lọc theo nhóm hàng và công đoạn
- [x] **TON-02**: Xem thẻ kho của một mã — mọi biến động kèm link mở đúng chứng từ sinh ra nó
- [ ] **TON-03**: Xem tuổi tồn và danh sách hàng không luân chuyển *(dời — chờ hệ mới chạy đủ ≥ 30 ngày, không ghép KiotViet; chốt 26/09)*
- [ ] **TON-04**: Chuyển hàng giữa hai kho bằng một chứng từ `CHUYEN_KHO`
- [ ] **TON-05**: Màn tồn kho dùng được trên điện thoại

### Kiểm kê (KKE)

- [ ] **KKE-01**: Mở phiên kiểm kê theo kho và nhóm hàng; hệ thống chốt tồn sổ tại thời điểm đếm
- [ ] **KKE-02**: Đếm trên điện thoại bằng ô tìm mã, kèm nhập từ máy tính và import Excel *(bỏ quét mã — chốt 24/09)*
- [ ] **KKE-03**: Xem bảng lệch giữa số đếm thực tế và tồn sổ
- [ ] **KKE-04**: Duyệt phiên kiểm kê sinh phiếu điều chỉnh, tồn về đúng số đã đếm

### Tổng quan (TQAN)

- [x] **TQAN-01**: Xem tồn kho theo nhóm hàng và theo công đoạn
- [x] **TQAN-02**: Xem danh sách mã dưới định mức tồn tối thiểu
- [ ] **TQAN-03**: Xem danh sách hàng không luân chuyển quá 30 ngày *(dời — như TON-03; chốt 26/09)*
- [ ] **TQAN-04**: Xem biểu đồ nhập–xuất 30 ngày gần nhất *(dời — như TON-03; tạm thay bằng TQAN-07; chốt 26/09)*
- [x] **TQAN-05**: Xem tổng giá trị tồn kho *(đóng 26/09 — không dùng giá, như DLIEU-05)*
- [x] **TQAN-06**: Xem báo cáo các lần xuất âm trong ngày kèm lý do đã chọn
- [x] **TQAN-07**: Xem nhịp bán hôm nay so với hôm qua (số phiếu xuất, số dòng, số mã) *(thêm 26/09 — bản hẹp thay TQAN-04)*

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
- [x] **DLIEU-05**: Nạp giá vốn khởi đầu một lần từ file Excel *(đóng 24/09 — người dùng không dùng giá, mọi giá = 0; màn nạp giá vốn 0044 đã có, giữ để dùng sau)*
- [ ] **DLIEU-06**: Set tồn đầu kỳ từ kết quả kiểm kê thực tế, không bê số 389.671 từ KiotViet
- [x] **DLIEU-07**: Lưu 594 dòng nhập và 4.732 dòng hóa đơn cũ vào bảng lưu trữ riêng để tra cứu, không nạp vào `chung_tu`

### Hình ảnh (ANH)

- [ ] **ANH-01**: Người có quyền sửa danh mục (quản lý, văn phòng) thêm ảnh cho mã hàng bằng camera điện thoại hoặc chọn file; một mã có nhiều ảnh, không giới hạn
- [ ] **ANH-02**: Đặt ảnh chính cho mã (ảnh đầu tiên tự là ảnh chính, đổi được) và xóa mềm ảnh (ảnh chính bị xóa thì ảnh kế tiếp thay)
- [ ] **ANH-03**: Mọi vai trò đã đăng nhập xem thư viện ảnh trong chi tiết mã và phóng to tại chỗ; ảnh chỉ đọc được qua `/anh/<id>`, chặn bằng RLS + kiểm đăng nhập
- [ ] **ANH-04**: Bảng danh mục có cột thumbnail ảnh chính (ô xám khi chưa có ảnh) và bộ lọc Có ảnh / Chưa có ảnh
- [ ] **ANH-05**: Ảnh lưu trên Google Drive qua Apps Script, database chỉ lưu `noi_luu` + khóa; đổi nơi lưu không phải sửa giao diện
- [ ] **ANH-06**: Chép một lần ảnh mã hàng từ file export KiotViet (1.094 mã) sang nơi lưu mới bằng script chạy lại được, có báo cáo link hỏng / mã không khớp

## v1.1 Requirements — Phản hồi vận hành

Nguồn: Notion Task board (yêu cầu 28/09–02/10/2026). Quyết định chốt 02/10/2026 ghi ở PROJECT.md.

### Dọn dẹp & điều hướng (GON)

- [x] **GON-01**: Phiếu nhập, đơn đặt hàng và danh mục hàng hóa luôn hiện đủ mã hàng và tên hàng ở mọi dòng (sửa lỗi báo 28/09)
- [x] **GON-02**: Không còn trang, mục menu và tab "Lịch sử KiotViet" ở đâu trên giao diện; dữ liệu lưu trữ trong database giữ nguyên
- [x] **GON-03**: Không màn nào hiện hoặc cho nhập Giá bán; Giá vốn không hiện ở Danh mục hàng hóa; phiếu nhập vẫn nhập Đơn giá
- [x] **GON-04**: Menu chia nhóm: **Đơn hàng** (Đặt hàng, Hóa đơn), **Hàng hóa** (Danh sách hàng hóa, Kiểm kho), cùng Nhập kho, Đối tác, Phân tích, Cài đặt — trên cả máy tính và điện thoại *(mục Phân tích đã thêm ở Phase 13)*
- [x] **GON-05**: Mục "Xuất kho" đổi thành "Hóa đơn" ở menu, tiêu đề, phiếu in; route mới `/hoa-don`, link và bookmark `/xuat-kho` cũ tự chuyển sang
- [x] **GON-06**: Trang `/ton-kho` và Nạp tồn tạm bị gỡ; link cũ chuyển về Danh sách hàng hóa
- [x] **GON-07**: Ma trận quyền route (`test-route-permissions.ts`) phủ đúng bộ route mới, mọi route cũ đã gỡ trả về chuyển hướng chứ không 404/crash

### Nhân viên phụ trách & danh mục nền (NVPT)

- [x] **NVPT-01**: Quản lý thêm/sửa/ngừng dùng nhân viên phụ trách (tên viết tắt, tên đầy đủ) trong Cài đặt
- [x] **NVPT-02**: Khi đặt hàng, công tắc Nội bộ / Đối tác (mặc định Nội bộ) chọn đúng một loại người nhận; Nội bộ chọn từ nhân viên phụ trách, Đối tác chọn từ đối tác loại Khách hàng hoặc Cả hai; đổi công tắc thì xóa tên đã chọn
- [x] **NVPT-03**: Đơn đặt hàng, hóa đơn, danh sách và phiếu in hiện tên đầy đủ của nhân viên phụ trách; đơn nội bộ đã tạo trước đây được chuyển sang nhân viên tương ứng, không mất người nhận
- [x] **NVPT-04**: Nhóm hàng, Đơn vị tính, Công đoạn không còn ở Cài đặt; khi tạo/sửa mã hàng chọn giá trị có sẵn hoặc bấm "+ Thêm mới" để tạo ngay tại chỗ *(sửa/xóa/màu/nhóm cha chuyển sang nút "Danh mục phụ" ở Danh sách hàng hóa)*

### Luồng đơn hàng → hóa đơn (DON)

- [x] **DON-01**: Bấm "Tạo đơn" mở ngay giao diện tạo đơn đầy đủ (người nhận + dòng hàng), lưu là Đơn tạm *(làm bằng trang `/dat-hang/moi`: chọn người nhận là đơn tạm được tạo, sang gõ dòng ngay — đã chốt 02/10)*
- [x] **DON-02**: Xác nhận đơn tạm chuyển đơn sang Đã xác nhận và in được phiếu lấy hàng
- [x] **DON-03**: Hoàn thành đơn đã xác nhận tạo và ghi sổ một Hóa đơn trong một transaction — tồn giảm đúng, lỗi giữa chừng không để lại gì; xuất âm vẫn bắt buộc chọn lý do
- [x] **DON-04**: Mỗi đơn chỉ sinh tối đa một hóa đơn; bấm Hoàn thành hai lần hoặc hai người cùng bấm không trừ tồn hai lần (chặn ở database)
- [x] **DON-05**: Hủy được đơn chưa hoàn thành (Đơn tạm hoặc Đã xác nhận), đơn hủy không tạo hóa đơn và không đụng tồn
- [x] **DON-06**: Từ đơn mở được hóa đơn của nó và ngược lại; hóa đơn tạo không cần đơn vẫn làm được như phiếu xuất cũ

### Phân tích tồn kho (PTICH)

- [x] **PTICH-01**: Hệ thống tính cho từng mã: bán TB/ngày (ADU) trong kỳ chọn 7/30/90 ngày (mặc định 30, chia ngày lịch, chỉ hóa đơn hoàn thành gửi đối tác, không tính đơn nội bộ), tồn khả dụng = tồn − khách đặt, số ngày còn hàng, ngày dự kiến hết hàng, đề nghị nhập ⌈ADU × Y − tồn khả dụng⌉ (âm thì 0)
- [x] **PTICH-02**: Trang `/phan-tich` hiện 4 thẻ KPI: cần nhập trong X ngày, hết hàng vẫn có khách mua, tổng số lượng tồn, tồn không có tín hiệu bán
- [x] **PTICH-03**: Biểu đồ Số ngày còn hàng (lọc theo loại hoàn thiện ÉP/SƠN/CARBON/XI MẠ/NANO/Khác) và biểu đồ Nhịp bán hàng (theo số hóa đơn hoặc số lượng, kèm % thay đổi nửa sau so với nửa đầu kỳ)
- [x] **PTICH-04**: Bảng Cần nhập hàng có 3 tab (Sắp hết ≤ X ngày, Đã hết có khách mua, Còn X+1–30 ngày), tìm kiếm, lọc loại hoàn thiện, xuất CSV đề nghị nhập *(X = ngưỡng vàng; ngưỡng vàng ≥ 30 thì ẩn tab thứ ba)*
- [x] **PTICH-05**: Xem top 10 bán chạy, 15 nhóm bán nhiều nhất kèm số ngày tồn của nhóm, tồn chậm (Không bán: top 30 theo tồn; đủ bán ≥ 365 ngày: top 20); mã không bán hiện "Không bán" (còn tồn) hoặc "Ngừng bán?" (tồn 0), không có đề nghị nhập
- [x] **PTICH-06**: Ngưỡng đỏ (mặc định 7 ngày) và vàng (mặc định 14 ngày) cùng số ngày Y chỉnh được, lưu chung toàn hệ thống; màu trạng thái theo hai ngưỡng, hết hàng luôn đỏ đậm
- [x] **PTICH-07**: Chức năng duyệt định mức tồn tối thiểu (trước ở `/ton-kho/dinh-muc`) nằm trong trang Phân tích

### Panel chi tiết (PANEL)

- [x] **PANEL-01**: Ở Danh sách hàng hóa, bấm vào dòng mở panel cạnh bảng gồm ảnh, mã hàng, tên hàng, tồn kho, khách đặt, dự kiến hết hàng (cùng số với trang Phân tích), không rời trang
- [x] **PANEL-02**: Bảng đối tác chỉ gồm Mã, Tên, Loại, Điện thoại, Tổng giao dịch
- [x] **PANEL-03**: Bấm dòng đối tác mở panel: tab Thông tin (Loại, Mã, Tên, Điện thoại, Địa chỉ, Ghi chú, sửa được) và tab Lịch sử giao dịch; trang `/doi-tac/[id]` cũ chuyển về danh sách mở sẵn panel

### Import danh mục v2 (IMP)

- [x] **IMP-01**: File Excel mã hàng chỉ cần 4 cột: Mã hàng, Tên hàng, Tồn kho, Mô tả; có file mẫu tải về
- [x] **IMP-02**: Sau khi tải file lên, hiện bảng đủ cột theo thứ tự (Loại hàng, Nhóm hàng, Mã, Tên, Dòng xe, Tồn kho, ĐVT, Đang kinh doanh, Được bán trực tiếp, Vị trí, Mô tả); cột từ file điền sẵn, cột còn lại chọn bằng dropdown/bật tắt cho từng dòng hoặc áp cho nhiều dòng cùng lúc
- [x] **IMP-03**: Dòng lỗi (trùng mã, trùng tên — trong file hoặc với danh mục) bị bỏ qua, các dòng hợp lệ vẫn được nhập; người dùng tải về file chỉ chứa dòng lỗi kèm lý do để sửa và import lại
- [x] **IMP-04**: Tồn kho trong file được ghi bằng một chứng từ điều chỉnh (DIEU_CHINH), không ghi thẳng vào tồn; thẻ kho truy được về chứng từ đó
- [x] **IMP-05**: Mã hàng có thêm các trường Loại hàng, Dòng xe (danh mục chọn được, thêm mới tại chỗ) và Được bán trực tiếp; sửa được trong form mã hàng

### Chức vụ & quyền (QUYEN)

- [x] **QUYEN-01**: Quản lý tạo/sửa chức vụ (mặc định có Quản lý, Thủ kho, Nhân viên) và bật/tắt 9 quyền cho từng chức vụ: Xem dashboard, Nhập đơn hàng, Tạo đơn đặt hàng, Xác nhận, Hoàn thành, Sửa hóa đơn, Tạo mã hàng, Tạo nhân viên, Kiểm kho
- [x] **QUYEN-02**: Mỗi người dùng được gán một chức vụ; người dùng hiện có được chuyển sang chức vụ tương ứng với vai trò cũ, không ai mất quyền đang có
- [x] **QUYEN-03**: Quyền được chặn ở database (RLS/RPC qua `co_quyen()` đọc DB), không chỉ ẩn nút; đổi quyền của chức vụ có hiệu lực ngay, không phải chờ token mới
- [x] **QUYEN-04**: Menu, nút và route ẩn/chặn đúng theo quyền của chức vụ; ma trận kiểm thử quyền route chạy theo chức vụ

## v1.2 Requirements — Phản hồi vận hành đợt 2

Nguồn: Notion Task board (phản hồi 03/10/2026). Quyết định chốt 03/10/2026 ghi ở PROJECT.md.

### Đổi tên & gọn giao diện (TEN)

- [x] **TEN-01**: Menu nhóm Đơn hàng hiện "Đơn đặt" và "Duyệt đơn" (máy tính và điện thoại); tiêu đề trang và nút liên quan dùng tên mới
- [x] **TEN-02**: Trang đơn ở `/don-dat` (kèm `/moi`, `/[id]`, `/[id]/in`), trang hóa đơn ở `/duyet-don` (kèm `/[id]`); link cũ `/dat-hang/*`, `/hoa-don/*`, `/xuat-kho/*` chuyển thẳng sang đường mới, giữ đường con và tham số; chưa đăng nhập thì sau đăng nhập quay về đúng đường mới
- [x] **TEN-03**: Mọi chỗ hiện số lượng đang được đặt (bảng Danh sách hàng hóa, chi tiết mã, xuất Excel) ghi "Đơn đặt" thay "Khách đặt"
- [x] **TEN-04**: Công đoạn "Mua ngoài" hiện là "Hàng ngoài" ở mọi màn và file xuất; import Excel nhận cả tên cũ lẫn tên mới; mã `MUA_NGOAI` giữ nguyên
- [x] **TEN-05**: Danh mục hàng hóa không còn bộ lọc, cảnh báo, nút rà hàng loạt và nhãn "Cần rà"; cột `can_ra` giữ trong database

### Đơn đặt & phiếu lấy hàng (DDAT)

- [ ] **DDAT-01**: Tạo/sửa đơn không còn ô Ngày giao dự kiến; danh sách, chi tiết và bản in đơn không còn trường này; dữ liệu cũ giữ trong database
- [ ] **DDAT-02**: Phiếu lấy hàng ghi người nhận bằng tên đầy đủ, không kèm mã nhân viên
- [ ] **DDAT-03**: Phiếu lấy hàng ghi thời gian in (giờ:phút ngày) và người đặt (tài khoản đã tạo đơn trên app)

### Đơn nhiều người nhận (NNHAN)

- [ ] **NNHAN-01**: Tạo/sửa đơn nội bộ chọn được một hoặc nhiều người nhận (nhân viên phụ trách) cho cả đơn
- [ ] **NNHAN-02**: Từng dòng hàng của đơn gán được người nhận riêng
- [ ] **NNHAN-03**: Danh sách đơn hiện đủ người nhận; lọc theo một người nhận ra đơn có người đó ở cấp đơn hoặc cấp dòng
- [ ] **NNHAN-04**: Phiếu lấy hàng in người nhận của đơn và của từng dòng
- [ ] **NNHAN-05**: Hoàn thành đơn sinh hóa đơn mang theo người nhận của đơn và của từng dòng, xem lại được ở Duyệt đơn
- [ ] **NNHAN-06**: Đơn cũ đang có một người nhận chuyển nguyên sang cấu trúc mới, không mất người nhận

### Dòng xe dùng chung (DXE)

- [ ] **DXE-01**: Form mã hàng chọn được nhiều dòng xe cho một mã
- [ ] **DXE-02**: Chi tiết mã hàng hiện đủ mọi dòng xe của mã
- [ ] **DXE-03**: Lọc Danh sách hàng hóa theo một dòng xe ra mọi mã dùng cho dòng xe đó
- [ ] **DXE-04**: Import Excel (nhập mã mới và cập nhật) nhận nhiều dòng xe trong một ô, cách nhau bằng dấu phẩy; xuất Excel ghi cùng định dạng
- [ ] **DXE-05**: Dòng xe hiện có của mỗi mã chuyển sang cấu trúc mới; tự điền dòng xe từ quy chuẩn mã vẫn chạy

### Bỏ khỏi v1.2 (task Notion vẫn mở)

- **FUT-01**: Đối tác chỉ còn Nhà cung cấp — cần chốt số phận chế độ "Đối tác" của đơn đặt và các đối tác KHACH/CA_HAI hiện có
- **FUT-02**: Kiểm tra chịu tải khoảng 50 người truy cập cùng lúc — cần chốt môi trường (branch Supabase / cloud chỉ đọc / local) và công cụ
- **FUT-03**: Phân tích theo tuần, tháng, quý, năm — cần chốt kỳ lịch hay cuốn chiếu

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
- **MRNG-02**: Hàng thành phần (hàng combo/BOM) — cột thứ 12 của bảng import v2, hoãn từ v1.1 vì là nghiệp vụ riêng (xuất combo trừ tồn thành phần)

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
| "Hóa đơn" ở v1.1 là hóa đơn điện tử | Không. "Hóa đơn" chỉ là tên mới của phiếu xuất (chứng từ `XUAT`), không phát hành HĐĐT — vẫn thuộc TICH-02 |
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
| XUAT-03 | Phase 8 | Pending |
| XUAT-04 | Phase 4 | Complete |
| XUAT-05 | Phase 4 | Complete |
| XUAT-06 | Phase 4 | Complete |
| XUAT-07 | Phase 4 | Complete |
| XUAT-08 | Phase 8 | Pending |
| XUAT-09 | Phase 4 | Complete |
| TON-01 | Phase 5 | Complete |
| TON-02 | Phase 5 | Complete |
| TON-03 | Deferred | Chờ ≥ 30 ngày dữ liệu |
| TON-04 | Phase 8 | Pending |
| TON-05 | Phase 8 | Pending |
| TQAN-01 | Phase 7 | Complete |
| TQAN-02 | Phase 5 | Complete |
| TQAN-03 | Deferred | Chờ ≥ 30 ngày dữ liệu |
| TQAN-04 | Deferred | Chờ ≥ 30 ngày dữ liệu |
| TQAN-05 | — | Closed (không dùng giá) |
| TQAN-06 | Phase 7 | Complete |
| TQAN-07 | Phase 7 | Complete |
| KKE-01 | Phase 6 | Pending |
| KKE-02 | Phase 6 | Pending |
| KKE-03 | Phase 6 | Pending |
| KKE-04 | Phase 6 | Pending |
| DLIEU-05 | Phase 6 | Closed (không cần) |
| DLIEU-06 | Phase 6 | Pending |
| DLIEU-07 | Phase 6 | Complete |
| ANH-01 | Phase 9 | Pending |
| ANH-02 | Phase 9 | Pending |
| ANH-03 | Phase 9 | Pending |
| ANH-04 | Phase 9 | Pending |
| ANH-05 | Phase 9 | Pending |
| ANH-06 | Phase 9 | Pending |
| GON-01 | Phase 10 | Complete |
| GON-02 | Phase 10 | Complete |
| GON-03 | Phase 10 | Complete |
| GON-04 | Phase 10 | Complete |
| GON-05 | Phase 10 | Complete |
| GON-06 | Phase 10 | Complete |
| GON-07 | Phase 10 | Complete |
| NVPT-01 | Phase 11 | Complete |
| NVPT-02 | Phase 11 | Complete |
| NVPT-03 | Phase 11 | Complete |
| NVPT-04 | Phase 11 | Complete |
| DON-01 | Phase 12 | Complete |
| DON-02 | Phase 12 | Complete |
| DON-03 | Phase 12 | Complete |
| DON-04 | Phase 12 | Complete |
| DON-05 | Phase 12 | Complete |
| DON-06 | Phase 12 | Complete |
| PTICH-01 | Phase 13 | Complete |
| PTICH-02 | Phase 13 | Complete |
| PTICH-03 | Phase 13 | Complete |
| PTICH-04 | Phase 13 | Complete |
| PTICH-05 | Phase 13 | Complete |
| PTICH-06 | Phase 13 | Complete |
| PTICH-07 | Phase 13 | Complete |
| PANEL-01 | Phase 14 | Complete |
| PANEL-02 | Phase 14 | Complete |
| PANEL-03 | Phase 14 | Complete |
| IMP-01 | Phase 15 | Complete |
| IMP-02 | Phase 15 | Complete |
| IMP-03 | Phase 15 | Complete |
| IMP-04 | Phase 15 | Complete |
| IMP-05 | Phase 15 | Complete |
| QUYEN-01 | Phase 16 | Complete |
| QUYEN-02 | Phase 16 | Complete |
| QUYEN-03 | Phase 16 | Complete |
| QUYEN-04 | Phase 16 | Complete |
| TEN-01 | Phase 17 | Complete |
| TEN-02 | Phase 17 | Complete |
| TEN-03 | Phase 17 | Complete |
| TEN-04 | Phase 17 | Complete |
| TEN-05 | Phase 17 | Complete |
| DDAT-01 | Phase 17 | Pending |
| DDAT-02 | Phase 17 | Pending |
| DDAT-03 | Phase 17 | Pending |
| NNHAN-01 | Phase 18 | Pending |
| NNHAN-02 | Phase 18 | Pending |
| NNHAN-03 | Phase 18 | Pending |
| NNHAN-04 | Phase 18 | Pending |
| NNHAN-05 | Phase 18 | Pending |
| NNHAN-06 | Phase 18 | Pending |
| DXE-01 | Phase 19 | Pending |
| DXE-02 | Phase 19 | Pending |
| DXE-03 | Phase 19 | Pending |
| DXE-04 | Phase 19 | Pending |
| DXE-05 | Phase 19 | Pending |

**Coverage:**
- v1 requirements: 80 total
- Mapped to phases: 80
- Unmapped: 0 ✓

**Coverage v1.1:**
- v1.1 requirements: 36 total (GON 7, NVPT 4, DON 6, PTICH 7, PANEL 3, IMP 5, QUYEN 4)
- Mapped to phases 10–16: 36
- Unmapped: 0 ✓
- MRNG-02 hoãn (v2), không thuộc phase nào

**Coverage v1.2:**
- v1.2 requirements: 19 total (TEN 5, DDAT 3, NNHAN 6, DXE 5)
- Mapped to phases 17–19: 19 (Phase 17: 8, Phase 18: 6, Phase 19: 5)
- Unmapped: 0 ✓
- FUT-01..03 hoãn, không thuộc phase nào

---
*Requirements defined: 2026-09-12*
*Last updated: 2026-09-26 — thêm ANH-01..06 cho Phase 9 (Quản lý hình ảnh), 9 phases, 100% coverage*
*Traceability v1.1 added: 2026-10-02 — Phase 10–16, 36/36 mapped*
*v1.2 requirements added: 2026-10-03 — TEN 5, DDAT 3, NNHAN 6, DXE 5 (19)*
*Traceability v1.2 added: 2026-10-03 — Phase 17–19, 19/19 mapped*
