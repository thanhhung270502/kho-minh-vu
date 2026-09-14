# Roadmap: Kho Minh Vũ

## Overview

Sáu chặng, mỗi chặng kết thúc bằng một thứ chạy được thật, không phải một thứ làm dở.
Chặng 1 dựng nền dữ liệu (schema, sổ cái, trigger, RLS) và kiểm chứng bằng SQL —
chưa có giao diện. Chặng 2 dựng khung ứng dụng (đăng nhập, layout) và hai màn CRUD
đầu tiên (danh mục, đối tác) cộng màn Cài đặt để có đủ dữ liệu nền cho các chặng sau.
Chặng 3 tôi luyện cơ chế chứng từ lần đầu qua Phiếu nhập — ít phiếu hơn, phù hợp để
bắt lỗi cơ chế trước khi nhân bản. Chặng 4 nhân bản cơ chế đó cho chiều xuất (khối
lượng nghiệp vụ chính: 923 phiếu/tuần) và nối với Đơn đặt hàng. Chặng 5 dựng các màn
đọc-nhiều (tồn kho, thẻ kho, tổng quan) trên dữ liệu đã sinh ra ở các chặng trước.
Chặng 6 đóng vòng bằng Kiểm kê, chốt số liệu chuyển đổi cuối cùng, và đưa hệ thống
vào trạng thái sẵn sàng thay thế hoàn toàn KiotViet.

Thứ tự này bám sát nguyên trạng đề xuất trong tài liệu thiết kế gốc (6 tuần). Điểm
khác biệt duy nhất: các yêu cầu RLS theo vai trò (AUTH-03..06) được gộp vào Chặng 1
thay vì Chặng 2, vì đó là hành vi được kiểm chứng ở tầng database (pgTAP), không cần
giao diện — đúng với chính mô tả "Kết quả: query được tồn thật bằng SQL, chưa có
giao diện" của tuần 1. Màn Cài đặt (CDAT) được gộp vào Chặng 2 vì nó quản lý dữ liệu
nền (nhóm hàng, ĐVT, công đoạn, quy tắc đánh số) mà danh mục và chứng từ ở các chặng
sau cần dùng ngay.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Nền dữ liệu** - Schema 13 bảng, sổ cái bất biến, trigger tồn kho + giá vốn, RLS bốn vai trò, chuyển danh mục thật — kiểm chứng bằng SQL, chưa có giao diện
- [ ] **Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt** - Đăng nhập, danh mục 3.266 mã, đối tác NCC/khách chung danh sách, cấu hình dữ liệu nền
- [ ] **Phase 3: Phiếu nhập** - Luồng chứng từ hoàn chỉnh đầu tiên: tạo, thêm dòng, ghi sổ, hủy đảo, in — giá vốn bình quân chạy thật
- [ ] **Phase 4: Đơn đặt hàng & Phiếu xuất** - Nhân bản cơ chế chứng từ cho chiều xuất, liên kết đơn đặt → phiếu xuất, vận hành trên cả PC và mobile quét barcode
- [ ] **Phase 5: Tồn kho & Tổng quan** - Tồn theo kho/công đoạn, thẻ kho, tuổi tồn, dashboard tổng quan
- [ ] **Phase 6: Kiểm kê & Go-live** - Kiểm kê mobile, chốt số liệu chuyển đổi cuối cùng, hệ thống sẵn sàng thay KiotViet

## Phase Details

### Phase 1: Nền dữ liệu
**Goal**: Toàn bộ mô hình dữ liệu và quy tắc toàn vẹn kho vận hành đúng ở tầng
database — sổ cái bất biến, tồn và giá vốn tự cập nhật, bốn vai trò bị giới hạn đúng
phạm vi — kiểm chứng được bằng SQL và pgTAP, chưa cần giao diện.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DLIEU-01, DLIEU-02, DLIEU-03
**Success Criteria** (what must be TRUE):
  1. Migration chạy sạch trên database rỗng, dựng đủ 13 bảng/index/ràng buộc, và nạp được dữ liệu danh mục thật (3.266 mã, 90 nhóm, 25 đối tác, 2 kho) với trường ĐVT cũ đã tách thành `dvt` + `cong_doan`
  2. Thêm một dòng `kho_movement` làm `ton_kho` và giá vốn bình quân gia quyền di động của (kho, sản phẩm) đó cập nhật ngay lập tức, không cần ứng dụng gọi thêm lệnh nào
  3. `kho_movement` là sổ cái bất biến — UPDATE/DELETE bị từ chối kể cả gọi bằng `service_role`; ghi sổ một chứng từ là atomic (lỗi ở dòng thứ n không để lại movement mồ côi); hủy chứng từ đã ghi sổ sinh đúng bút toán đảo và giữ nguyên bản ghi gốc
  4. Tìm sản phẩm gõ không dấu vẫn ra kết quả có dấu; chứng từ tự sinh số theo loại và năm không trùng khi hai người tạo cùng lúc; job hằng đêm đối chiếu `ton_kho` với tổng `kho_movement` và báo đúng danh sách chênh lệch
  5. Bốn vai trò (quản lý/văn phòng/thủ kho/chỉ xem) bị giới hạn đúng phạm vi bằng RLS đọc từ JWT claims — thủ kho không thấy kho khác, văn phòng không sửa được giá vốn/giá bán, chỉ xem không tạo được chứng từ dù gọi thẳng API bỏ qua giao diện; toàn bộ được phủ bởi bộ test pgTAP
**Plans**: TBD

### Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt
**Goal**: Người dùng đăng nhập được và thấy đúng layout theo vai trò; văn phòng quản
lý được danh mục 3.266 mã hàng và danh sách đối tác (NCC + khách hàng thật) qua giao
diện; dữ liệu nền (kho, nhóm hàng, ĐVT, công đoạn, quy tắc đánh số) cấu hình được qua
Cài đặt.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-07, DMUC-01, DMUC-02, DMUC-03, DMUC-04, DMUC-05, DMUC-06, DMUC-07, DTAC-01, DTAC-02, DTAC-03, DLIEU-04, CDAT-01, CDAT-02, CDAT-03, CDAT-04
**Success Criteria** (what must be TRUE):
  1. Người dùng đăng nhập bằng email/mật khẩu và phiên giữ nguyên qua refresh trang; vào route nội bộ khi chưa đăng nhập bị đẩy về `/dang-nhap` và quay lại đúng trang sau khi đăng nhập; đăng xuất được từ bất kỳ trang nào
  2. Xem bảng 3.266 mã hàng với phân trang/sắp xếp/lọc chạy phía server, lọc theo nhóm hàng/công đoạn/ĐVT/trạng thái tồn, tìm bằng một ô duy nhất theo mã và tên gõ không dấu
  3. Tạo và sửa mã hàng với `dvt` và `cong_doan` là hai trường độc lập kèm `quy_doi`; xem chi tiết một mã hàng kèm thẻ kho; import danh mục từ Excel báo rõ dòng lỗi và không nạp nửa vời; export danh mục đang lọc ra Excel
  4. Xem NCC và khách hàng trong cùng một danh sách lọc được theo loại; tạo và sửa đối tác với loại NCC/KHACH/CA_HAI; xem lịch sử giao dịch của một đối tác — danh sách khách hàng đã có tên thật (QUỲNH, NGỌC, TỐT...) trích từ ô Ghi chú thay vì gộp chung một mã khách
  5. Quản lý được người dùng & vai trò, danh sách kho, nhóm hàng/đơn vị tính/công đoạn, và quy tắc đánh số chứng từ theo từng loại qua màn Cài đặt
**Plans**: 5/21 plans executed
**UI hint**: yes

### Phase 3: Phiếu nhập
**Goal**: Luồng chứng từ hoàn chỉnh đầu tiên chạy thật từ đầu đến cuối — tạo, thêm
dòng, ghi sổ, in, hủy đảo — với giá vốn bình quân gia quyền di động chạy đúng trên
dữ liệu thật. Ít phiếu hơn (78/tuần so với 923/tuần của phiếu xuất) nên dùng để tôi
luyện cơ chế trước khi nhân bản sang Phase 4.
**Depends on**: Phase 2
**Requirements**: NHAP-01, NHAP-02, NHAP-03, NHAP-04, NHAP-05, NHAP-06, NHAP-07, NHAP-08
**Success Criteria** (what must be TRUE):
  1. Tạo phiếu nhập ở trạng thái `NHAP_LIEU` chọn nhà cung cấp và kho, thêm dòng bằng ô tìm mã kèm số lượng/đơn giá; phiếu đang nhập dở tự lưu nháp, không mất khi mất mạng hoặc đóng nhầm tab
  2. Ghi sổ phiếu nhập làm tồn tăng đúng và giá vốn bình quân gia quyền di động tính lại theo công thức chuẩn
  3. Phiếu đã `HOAN_THANH` không sửa được (chặn ở database); hủy phiếu nhập đã ghi sổ sinh đúng bút toán đảo
  4. In được phiếu nhập; chọn được loại "Nhập từ nhà máy" phân biệt rõ với nhập NCC thường
**Plans**: TBD
**UI hint**: yes

### Phase 4: Đơn đặt hàng & Phiếu xuất
**Goal**: Cơ chế chứng từ tôi luyện ở Phase 3 được nhân bản cho chiều xuất — khối
lượng nghiệp vụ chính của hệ thống (923 phiếu/tuần) — liên kết với đơn đặt hàng, và
vận hành được cả trên máy tính văn phòng lẫn điện thoại thủ kho ngoài kho.
**Depends on**: Phase 3
**Requirements**: DDH-01, DDH-02, DDH-03, DDH-04, XUAT-01, XUAT-02, XUAT-03, XUAT-04, XUAT-05, XUAT-06, XUAT-07, XUAT-08, XUAT-09
**Success Criteria** (what must be TRUE):
  1. Tạo đơn đặt hàng theo khách với nhiều dòng và ngày giao dự kiến; xem số đã xuất/còn lại của từng dòng; trạng thái đơn tự chuyển `MOI` → `DA_XUAT_MOT_PHAN` → `DA_XUAT_DU` theo phiếu xuất
  2. Tạo phiếu xuất thẳng từ đơn đặt hàng (các dòng bê nguyên vẹn) và ghi sổ trong dưới 20 giây khi kho chỉ xác nhận số thực xuất; tạo được phiếu xuất mới không cần đơn đặt hàng; nhập liệu hoàn toàn bằng bàn phím (Enter xuống dòng mới, Tab sang ô số lượng)
  3. Thêm dòng bằng quét barcode qua camera điện thoại; màn xuất hàng dùng được trên điện thoại (nút đủ to, bảng cuộn ngang trong khung riêng)
  4. Khi số xuất làm tồn xuống dưới 0, hệ thống cảnh báo và bắt buộc chọn lý do trước khi cho ghi sổ; ghi sổ phiếu xuất làm tồn giảm đúng và cập nhật tiến độ đơn đặt hàng liên quan; in được phiếu giao hàng
  5. Trả hàng khách (`TRA_KHACH`, tồn tăng) và trả hàng NCC (`TRA_NCC`, tồn giảm) là hai loại chứng từ riêng, đều bắt buộc tham chiếu chứng từ gốc
**Plans**: TBD
**UI hint**: yes

### Phase 5: Tồn kho & Tổng quan
**Goal**: Người quản lý và thủ kho nhìn thấy đúng bức tranh tồn kho hiện tại và xu
hướng biến động trên dữ liệu thật đã sinh ra từ Phase 3 và 4, không cần hỏi hay tính
tay.
**Depends on**: Phase 4
**Requirements**: TON-01, TON-02, TON-03, TON-04, TON-05, TQAN-01, TQAN-02, TQAN-03, TQAN-04, TQAN-05, TQAN-06
**Success Criteria** (what must be TRUE):
  1. Xem tồn theo từng kho, lọc theo nhóm hàng và công đoạn; xem thẻ kho của một mã với mọi biến động kèm link mở đúng chứng từ sinh ra nó
  2. Xem tuổi tồn và danh sách hàng không luân chuyển; chuyển hàng giữa hai kho bằng một chứng từ `CHUYEN_KHO`; màn tồn kho dùng được trên điện thoại
  3. Trang tổng quan hiển thị tồn theo nhóm hàng và theo công đoạn, cùng tổng giá trị tồn kho
  4. Trang tổng quan hiển thị danh sách mã dưới định mức tồn tối thiểu và danh sách hàng không luân chuyển quá 30 ngày
  5. Trang tổng quan hiển thị biểu đồ nhập–xuất 30 ngày gần nhất và báo cáo các lần xuất âm trong ngày kèm lý do đã chọn
**Plans**: TBD
**UI hint**: yes

### Phase 6: Kiểm kê & Go-live
**Goal**: Số liệu tồn đầu kỳ đúng với thực tế đếm được (không bê nguyên số sai từ
KiotViet), dữ liệu lịch sử tra cứu được, và hệ thống ở trạng thái sẵn sàng để toàn
bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở
KiotViet để đối chiếu.
**Depends on**: Phase 5
**Requirements**: KKE-01, KKE-02, KKE-03, KKE-04, DLIEU-05, DLIEU-06, DLIEU-07
**Success Criteria** (what must be TRUE):
  1. Mở phiên kiểm kê theo kho và nhóm hàng, hệ thống chốt tồn sổ tại đúng thời điểm đếm; đếm bằng quét mã trên điện thoại
  2. Xem bảng lệch giữa số đếm thực tế và tồn sổ; duyệt phiên kiểm kê sinh phiếu điều chỉnh đưa tồn về đúng số đã đếm
  3. Giá vốn khởi đầu của toàn bộ danh mục được nạp một lần từ Excel trước go-live
  4. Tồn đầu kỳ của toàn hệ thống được set từ kết quả kiểm kê thực tế, không bê nguyên số 389.671 từ KiotViet
  5. 594 dòng nhập và 4.732 dòng hóa đơn cũ từ KiotViet tra cứu được trong bảng lưu trữ riêng, không lẫn vào `chung_tu`
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nền dữ liệu | 0/TBD | Not started | - |
| 2. Khung ứng dụng, Danh mục, Đối tác, Cài đặt | 2/21 | In Progress | - |
| 3. Phiếu nhập | 0/TBD | Not started | - |
| 4. Đơn đặt hàng & Phiếu xuất | 0/TBD | Not started | - |
| 5. Tồn kho & Tổng quan | 0/TBD | Not started | - |
| 6. Kiểm kê & Go-live | 0/TBD | Not started | - |
