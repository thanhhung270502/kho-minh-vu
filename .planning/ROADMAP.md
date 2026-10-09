# Roadmap: Kho Minh Vũ

## Overview

Sáu chặng, mỗi chặng kết thúc bằng một thứ chạy được thật, không phải một thứ làm dở.
Chặng 1 dựng nền dữ liệu (schema, sổ cái, trigger, RLS) và kiểm chứng bằng SQL —
chưa có giao diện. Chặng 2 dựng khung ứng dụng (đăng nhập, layout) và hai màn CRUD
đầu tiên (danh mục, đối tác) cộng màn Cài đặt để có đủ dữ liệu nền cho các chặng sau.
Chặng 3 tôi luyện cơ chế chứng từ lần đầu qua Phiếu nhập — ít phiếu hơn, phù hợp để
bắt lỗi cơ chế trước khi nhân bản. Chặng 4 nhân bản cơ chế đó cho chiều xuất (khối
lượng nghiệp vụ chính: 923 phiếu/tuần) và nối với Đơn đặt hàng. Chặng 5 dựng hai màn
đọc cốt lõi (tồn kho theo mã × kho, thẻ kho có tồn lũy kế) cộng cảnh báo sắp hết.
Chặng 6 đóng vòng bằng Kiểm kê, trang tổng quan, các màn mobile, chốt số liệu chuyển
đổi cuối cùng, và đưa hệ thống vào trạng thái sẵn sàng thay thế hoàn toàn KiotViet.

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

### v1.0

- [ ] **Phase 1: Nền dữ liệu** - Schema 13 bảng, sổ cái bất biến, trigger tồn kho + giá vốn, RLS bốn vai trò, chuyển danh mục thật — kiểm chứng bằng SQL, chưa có giao diện
- [ ] **Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt** - Đăng nhập, danh mục 3.266 mã, đối tác NCC/khách chung danh sách, cấu hình dữ liệu nền
- [ ] **Phase 3: Phiếu nhập** - Luồng chứng từ hoàn chỉnh đầu tiên: tạo, thêm dòng, ghi sổ, hủy đảo, in — giá vốn bình quân chạy thật
- [ ] **Phase 4: Đơn đặt hàng & Phiếu xuất** - Nhân bản cơ chế chứng từ cho chiều xuất, đơn đặt → duyệt → in đi lấy hàng → phiếu xuất, chạy trọn luồng trên máy tính văn phòng
- [ ] **Phase 5: Tồn kho & Thẻ kho** - Tồn theo mã × kho, thẻ kho có tồn lũy kế, đề xuất định mức và cảnh báo sắp hết
- [x] **Phase 6: Kiểm kê & Go-live** - Kiểm kê (đếm điện thoại/máy tính/Excel), đặt tồn đầu kỳ, tra cứu lịch sử KiotViet — hệ thống sẵn sàng thay KiotViet
 (completed 2026-09-25)
- [x] **Phase 7: Trang tổng quan** - Nhịp bán hôm nay/hôm qua, báo cáo xuất âm, tồn theo nhóm/công đoạn (chỉ quản lý)
 (completed 2026-09-27)
- [ ] **Phase 8: Mobile & Chuyển kho** - Màn xuất và màn tồn dùng trên điện thoại, thêm dòng bằng ô tìm, chuyển kho
- [x] **Phase 9: Quản lý hình ảnh** - Upload và hiển thị ảnh mã hàng lưu trên Google Drive qua Apps Script, lớp lưu trữ trừu tượng để sau chuyển cloud không đổi giao diện

### v1.1 Phản hồi vận hành

- [x] **Phase 10: Dọn dẹp & điều hướng** - Sửa lỗi hiển thị mã/tên hàng, bỏ Lịch sử KiotViet và Giá bán, menu chia nhóm, Xuất kho → Hóa đơn (`/hoa-don`), gỡ `/ton-kho`
- [x] **Phase 11: Nhân viên phụ trách & danh mục nền** - Danh mục nhân viên phụ trách, đặt hàng chọn Nội bộ/Đối tác, thêm Nhóm hàng/ĐVT/Công đoạn ngay trong form mã hàng
- [x] **Phase 12: Luồng đơn hàng → hóa đơn** - Đơn tạm → Xác nhận (in phiếu lấy hàng) → Hoàn thành ghi sổ Hóa đơn atomic, 1 đơn = 1 hóa đơn, hủy đơn
- [x] **Phase 13: Phân tích tồn kho** - Trang `/phan-tich`: bán TB/ngày, dự kiến hết hàng, đề nghị nhập, tồn chậm, ngưỡng chỉnh được, duyệt định mức
- [x] **Phase 14: Panel chi tiết** - Bấm dòng Danh sách hàng hóa và Đối tác mở panel cạnh bảng, không rời trang
- [x] **Phase 15: Import danh mục v2** - File 4 cột, bảng chọn trường từng dòng, bỏ qua dòng lỗi và tải file lỗi, tồn kho ghi bằng phiếu điều chỉnh
- [x] **Phase 16: Chức vụ & quyền** - Chức vụ động với 9 quyền, chặn ở database bằng `co_quyen()` đọc DB, có hiệu lực ngay (rủi ro cao nhất, đụng RLS)

**v1.2 Phản hồi vận hành đợt 2** (chi tiết ở "## Milestone v1.2")

- [x] **Phase 17: Đổi tên & gọn đơn đặt** - Menu Đơn đặt / Duyệt đơn (`/don-dat`, `/duyet-don`), "Khách đặt" → "Đơn đặt", "Mua ngoài" → "Hàng ngoài", bỏ "Cần rà" và Ngày giao dự kiến, phiếu lấy hàng ghi tên đầy đủ + giờ in + người đặt
 (completed 2026-10-03)
- [x] **Phase 18: Đơn nhiều người nhận** - Đơn chọn nhiều người nhận, từng dòng gán người nhận riêng, lọc/in/hóa đơn mang theo cả hai cấp
 (completed 2026-10-03)
- [ ] **Phase 19: Dòng xe dùng chung** - Một mã hàng thuộc nhiều dòng xe: chọn trong form, lọc theo dòng xe, import/xuất Excel nhiều dòng xe một ô
 (completed 2026-09-26)

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
vận hành trọn luồng trên máy tính văn phòng.
**Depends on**: Phase 3
**Requirements**: DDH-01, DDH-02, DDH-03, DDH-04, XUAT-01, XUAT-02, XUAT-04, XUAT-05, XUAT-06, XUAT-07, XUAT-09
**Success Criteria** (what must be TRUE):

  1. Tạo đơn đặt hàng theo người nhận với nhiều dòng và ngày giao dự kiến; xem số đã xuất/còn lại của từng dòng; trạng thái đơn chạy `TAM` → `DA_XAC_NHAN` → `HOAN_THANH` theo bước duyệt, còn tiến độ giao tính khi đọc từ số đã xuất
  2. Tạo phiếu xuất thẳng từ đơn đặt hàng (các dòng bê nguyên vẹn) và ghi sổ trong dưới 20 giây khi kho chỉ xác nhận số thực xuất; tạo được phiếu xuất mới không cần đơn đặt hàng; nhập liệu hoàn toàn bằng bàn phím (Enter xuống dòng mới, Tab sang ô số lượng)
  3. Quản lý xác nhận đơn rồi in được phiếu đi lấy hàng có cột trống để kho ghi tay số thực lấy; đơn đã xác nhận chỉ quản lý mở khóa được về `TAM`
  4. Khi số xuất làm tồn xuống dưới 0, hệ thống cảnh báo và bắt buộc chọn lý do trước khi cho ghi sổ; ghi sổ phiếu xuất làm tồn giảm đúng và cập nhật tiến độ đơn đặt hàng liên quan; in được phiếu giao hàng
  5. Trả hàng khách (`TRA_KHACH`, tồn tăng) và trả hàng NCC (`TRA_NCC`, tồn giảm) là hai loại chứng từ riêng, đều bắt buộc tham chiếu chứng từ gốc

**Plans**: 15 plans
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — đổi trục trạng thái đơn sang trục duyệt, mở rộng RPC chứng từ, vá kho theo dòng cho chiều xuất

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — RPC duyệt đơn (xác nhận / mở khóa / đóng sớm), khóa sửa đơn đã duyệt, bộ cấp số đơn

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03-PLAN.md — RPC đọc đơn (danh sách / chi tiết / dòng) và bảng đề nghị gộp mã + gợi ý mã trùng

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-04-PLAN.md — RPC tạo phiếu xuất từ đơn và RPC tạo phiếu trả từ chứng từ gốc

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 04-05-PLAN.md — rút lớp chứng từ dùng chung sang features/documents, trả nợ UAT màn phiếu nhập

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 04-06-PLAN.md — lớp dữ liệu đơn đặt hàng: kiểu, schema, bộ lọc URL, query key, api, hook
- [x] 04-07-PLAN.md — lớp dữ liệu phiếu xuất và phiếu trả, danh sách lý do xuất âm

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 04-08-PLAN.md — màn danh sách đơn, ô tìm người nhận kèm tạo đối tác tại chỗ, nút tạo đơn

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 04-09-PLAN.md — chi tiết đơn: đầu đơn sửa tại chỗ và bảng dòng gõ bàn phím
- [x] 04-10-PLAN.md — màn danh sách phiếu xuất và nút tạo phiếu xuất không cần đơn

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 04-11-PLAN.md — chi tiết phiếu xuất: kho theo dòng và tô màu dòng vượt tồn

**Wave 10** *(blocked on Wave 9 completion)*

> **Ghi chú v1.1 (02/10/2026):** plan 04-12 và 04-13 bị **Phase 12** (Luồng đơn hàng → hóa đơn, đã xong 02/10) thay thế — luồng duyệt đơn, nút "Tạo phiếu xuất từ đơn" và ghi sổ phiếu xuất được dựng lại theo mô hình Đơn tạm → Xác nhận → Hoàn thành. Không xóa hai plan; không thực thi tiếp theo thiết kế cũ.

- [ ] 04-12-PLAN.md — duyệt đơn theo vai trò, in phiếu đi lấy hàng, nút tạo phiếu xuất từ đơn *(bị Phase 12 thay thế — giữ nguyên, không xóa)*
- [ ] 04-13-PLAN.md — ghi sổ phiếu xuất: lý do xuất âm bắt buộc, tóm tắt hậu quả, gợi ý gộp mã *(bị Phase 12 thay thế — giữ nguyên, không xóa)*

**Wave 11** *(blocked on Wave 10 completion)*

- [ ] 04-14-PLAN.md — in phiếu giao hàng và trả hàng hai chiều

**Wave 12** *(blocked on Wave 11 completion)*

- [ ] 04-15-PLAN.md — điều hướng, ma trận quyền route, bộ kiểm cuối, cập nhật tài liệu

**UI hint**: yes

### Phase 5: Tồn kho & Thẻ kho

**Goal**: Người quản lý và thủ kho nhìn thấy đúng số tồn hiện tại mà không phải hỏi ai,
truy được mọi biến động của một mã về đúng chứng từ sinh ra nó, và biết TRƯỚC mã nào
sắp hết thay vì biết sau.
**Depends on**: Phase 4
**Requirements**: TON-01, TON-02, TQAN-02
**Success Criteria** (what must be TRUE):

  1. Xem tồn của cả 3.266 mã với mỗi mã một dòng và kho là cột, lọc theo nhóm hàng/công đoạn/kho và tìm bằng một ô theo mã và tên gõ không dấu; phân trang và lọc chạy phía server
  2. Xem thẻ kho của một mã với mọi biến động, mỗi dòng kèm **tồn lũy kế tại thời điểm đó** và link mở đúng chứng từ sinh ra nó
  3. Hệ đề xuất định mức tồn tối thiểu cho từng mã từ lịch sử bán (mã chưa từng bán lấy trung bình nhóm), hiện rõ căn cứ của từng con số, và chỉ ghi vào `san_pham.ton_toi_thieu` sau khi có người duyệt
  4. Xem danh sách mã đang dưới định mức tồn tối thiểu
  5. Nạp được tồn tạm từ cột tồn của file danh mục KiotViet qua **một chứng từ `DIEU_CHINH`** gắn nhãn rõ là số tạm chưa đếm — để các màn trên có dữ liệu thật mà kiểm, và để kiểm kê Phase 6 đè lên bằng bút toán điều chỉnh

> Tám yêu cầu còn lại của chặng này (TON-03, TON-04, TON-05, TQAN-01, TQAN-03, TQAN-04,
> TQAN-05, TQAN-06) **dời sang Phase 6** — chốt 20/09. Lý do: bản hẹp nhất để học là
> "biết tồn thật" + "biết trước khi hết"; phần còn lại là trang tổng quan và chuyển kho,
> đọc trên cùng dữ liệu nên làm sau không mất gì.

**Plans**: 12 plans trong 6 wave

Plans:
- [x] 05-00-PLAN.md — [CHẶN] trang bị bản làm việc: npm install, .env.local, supabase login, file KiotViet (wave 1)
- [x] 05-01-PLAN.md — RPC `danh_sach_ton_kho`: tồn theo mã × kho, lọc + phân trang server (wave 1)
- [x] 05-02-PLAN.md — Thêm cột tồn lũy kế vào `the_kho_san_pham` (wave 2)
- [x] 05-03-PLAN.md — RPC đề xuất và duyệt định mức tồn tối thiểu (wave 2)
- [x] 05-04-PLAN.md — RPC `nap_ton_tam` qua một chứng từ DIEU_CHINH (wave 2)
- [x] 05-05-PLAN.md — [BLOCKING] db:push, db:types, chạy toàn bộ pgTAP (wave 3)
- [x] 05-06-PLAN.md — Lớp dữ liệu feature inventory: kiểu, bộ lọc URL, api, hook (wave 4)
- [x] 05-07-PLAN.md — Màn tồn kho `/ton-kho` (wave 5)
- [x] 05-08-PLAN.md — Mở rộng thẻ kho đã có: cột lũy kế + link chứng từ (wave 4)
- [x] 05-09-PLAN.md — Màn duyệt đề xuất định mức `/ton-kho/dinh-muc` (wave 5)
- [x] 05-10-PLAN.md — Nạp tồn tạm từ file KiotViet `/ton-kho/nap-tam` (wave 5)
- [x] 05-11-PLAN.md — Menu, ma trận quyền route, bộ kiểm toàn dự án, UAT (wave 6)

**UI hint**: yes

### Phase 6: Kiểm kê & Go-live

**Goal**: Số liệu tồn đầu kỳ đúng với thực tế đếm được (không bê nguyên số sai từ
KiotViet), dữ liệu lịch sử tra cứu được, và hệ thống ở trạng thái sẵn sàng để toàn
bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở
KiotViet để đối chiếu.
**Depends on**: Phase 5
**Requirements**: KKE-01, KKE-02, KKE-03, KKE-04, DLIEU-05, DLIEU-06, DLIEU-07

> Tách ngày 24/09 (Office Hours): nỗi đau chính là **mất lịch sử khi bỏ KiotViet**; bản
> hẹp nhất là kiểm kê + chốt số. Trang tổng quan → Phase 7; mobile & chuyển kho → Phase 8.
> Không dùng barcode, không dùng giá (DLIEU-05 đóng). Quyết định chi tiết:
> `.planning/phases/06-kiem-ke-go-live/06-CONTEXT.md`.

**Success Criteria** (what must be TRUE):

  1. Mở phiên kiểm kê theo kho và nhóm hàng, nhiều người đếm song song chia theo nhóm; tồn sổ chốt theo từng dòng tại lúc lưu số đếm, nên phiếu xuất/nhập ghi sổ trong lúc phiên mở không làm sai lệch
  2. Nhập số đếm được bằng điện thoại (ô tìm mã không dấu), máy tính và import Excel từ file mẫu hệ xuất theo nhóm (file mẫu không lộ số tồn)
  3. Xem bảng lệch giữa số đếm và tồn sổ, danh sách mã chưa đếm, dòng lệch lớn được tô nổi và trả về đếm lại từng dòng; người được bật quyền "Duyệt kiểm kê" duyệt phiên sinh chứng từ `KIEM_KE` đưa tồn về đúng số đã đếm
  4. Tồn đầu kỳ của toàn hệ thống được set từ đợt đếm thực tế sát ngày chuyển, đè lên tồn tạm KiotViet — không bê nguyên số 389.671
  5. 594 dòng nhập và 4.732 dòng hóa đơn cũ tra cứu được (màn riêng + tab trong chi tiết mã hàng) theo khách/NCC, mã hàng, số phiếu, ngày — chỉ người được quản lý bật quyền mới đọc được, chặn bằng RLS

**Plans**: 16 plans
Plans:
**Wave 1**

- [x] 06-01-PLAN.md — công tắc quyền theo người (xem lịch sử KiotViet, duyệt kiểm kê) + luu_ho_so_nguoi_dung 8 tham số
- [x] 06-03-PLAN.md — DB mở phiên + đếm: chốt tồn sổ theo dòng, chặn ghi thẳng KIEM_KE, nhập số đếm hàng loạt

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — DB tra cứu lịch sử KiotViet, ba cửa quyền (RLS, 0033, thẻ kho), bỏ dòng KiotViet khỏi thẻ kho
- [x] 06-04-PLAN.md — DB bảng đếm/lệch, đếm lại, duyệt phiên, siết ghi_so_chung_tu và huy_chung_tu cho KIEM_KE

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-05-PLAN.md — [BLOCKING] đẩy 0063-0066 lên cloud, sinh lại kiểu, chạy toàn bộ pgTAP

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-06-PLAN.md — công tắc quyền trong Cài đặt → Người dùng + CurrentUser
- [x] 06-07-PLAN.md — lớp dữ liệu + bảng lịch sử KiotViet + drawer mở lại nguyên phiếu
- [x] 06-09-PLAN.md — lớp dữ liệu kiểm kê + hàm thuần ngưỡng lệch và trạng thái phiên
- [x] 06-13-PLAN.md — file mẫu đếm theo nhóm (không lộ tồn) + route xuất/nhập Excel

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 06-08-PLAN.md — màn /lich-su-kiotviet + tab trong chi tiết mã hàng
- [x] 06-10-PLAN.md — danh sách phiên + mở phiên (/kiem-ke)
- [x] 06-11-PLAN.md — màn đếm điện thoại + bảng đếm văn phòng
- [x] 06-12-PLAN.md — bảng lệch, đếm lại, danh sách chưa đếm, nút duyệt
- [x] 06-14-PLAN.md — giao diện nhập số đếm từ Excel

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 06-15-PLAN.md — trang chi tiết phiên /kiem-ke/[id] + link phiếu kiểm kê trên thẻ kho

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 06-16-PLAN.md — menu, ma trận quyền route, toàn bộ bộ kiểm, UAT (có checkpoint)
**UI hint**: yes

### Phase 7: Trang tổng quan

**Goal**: Quản lý nhìn được bức tranh kho mà không phải hỏi người — thấy ngay ai xuất âm vì
lý do gì, bán hôm nay nhanh hay chậm, và nhóm hàng nào đang hết/âm.
**Depends on**: Phase 6
**Requirements**: TQAN-01, TQAN-06, TQAN-07

> Thu hẹp 26/09 (discuss Phase 7): TQAN-05 đóng (không dùng giá); TQAN-03, TQAN-04, TON-03
> dời tới khi hệ mới có đủ ≥ 30 ngày dữ liệu, không ghép KiotViet. Quyết định chi tiết:
> `.planning/phases/07-trang-tong-quan/07-CONTEXT.md`.

**Success Criteria** (what must be TRUE):

  1. Quản lý mở `/` thấy nhịp bán hôm nay so với hôm qua: số phiếu xuất, số dòng, số mã khác nhau (chỉ phiếu `XUAT` đã ghi sổ, không tính phiếu hủy)
  2. Quản lý thấy các mã bị xuất âm trong ngày (mặc định hôm nay, chọn được ngày khác) từ phiếu `XUAT` và `TRA_NCC`, đếm theo lý do và bảng chi tiết từng mã kèm phiếu, người lập, lý do
  3. Quản lý thấy tồn theo nhóm hàng và theo công đoạn dưới dạng số mã (tổng/còn/hết/âm/dưới định mức), lọc được theo kho, bấm số mở `/ton-kho` lọc sẵn và số dòng khớp
  4. Văn phòng, thủ kho, chỉ xem vào `/` được chuyển sang màn làm việc chính; gọi thẳng RPC báo cáo bị database từ chối

**Plans**: 9 plans
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — DB RPC bao_cao_xuat_am (lũy kế sổ cái theo kho × mã) + pgTAP 92
- [x] 07-02-PLAN.md — DB RPC ton_theo_nhom khớp danh_sach_ton_kho (0067) + pgTAP 93 đối chiếu chéo
- [x] 07-03-PLAN.md — DB RPC nhip_ban hôm nay/hôm qua + pgTAP 94
- [x] 07-04-PLAN.md — hàm thuần: trang chủ theo vai trò, ẩn menu Tổng quan, URL drill-down /ton-kho, đếm theo lý do, so nhịp bán

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-05-PLAN.md — [BLOCKING] đẩy 0068-0070 lên phonzyruoalimgaovljm (MCP, không qua .env.local sai), sinh lại kiểu, chạy toàn bộ pgTAP

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-06-PLAN.md — lớp dữ liệu features/dashboard: mapper, api, keys, hooks + Làm mới

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-07-PLAN.md — thẻ nhịp bán + khối xuất âm (chọn ngày, đếm theo lý do, bảng mở phiếu)
- [x] 07-08-PLAN.md — khối tồn theo nhóm/công đoạn (hai tab, lọc kho, số bấm mở /ton-kho)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 07-09-PLAN.md — ghép trang /, điều hướng theo vai trò, ma trận quyền route, kiểm mắt (có checkpoint)
**UI hint**: yes

### Phase 8: Mobile & Chuyển kho

**Goal**: Thủ kho làm việc xuất hàng và xem tồn trên điện thoại; chuyển hàng giữa hai kho bằng chứng từ.
**Depends on**: Phase 6
**Requirements**: XUAT-03, XUAT-08, TON-04, TON-05

**Success Criteria** (what must be TRUE):

  1. Màn xuất hàng dùng được trên điện thoại: nút đủ to, bảng cuộn ngang trong khung riêng; thêm dòng bằng ô tìm mã (không quét barcode)
  2. Màn tồn kho dùng được trên điện thoại
  3. Chuyển hàng giữa hai kho bằng một chứng từ `CHUYEN_KHO`

> **Ghi chú v1.1 (02/10/2026):** TON-05 / màn tồn kho trên điện thoại phải xét lại trước khi lập kế hoạch — `/ton-kho` bị gỡ ở Phase 10 (GON-06); tồn xem qua Danh sách hàng hóa (Phase 14) và trang Phân tích (Phase 13). XUAT-03/XUAT-08 cũng phải đổi tên theo "Hóa đơn" (`/hoa-don`).

**Plans**: TBD
**UI hint**: yes

### Phase 9: Quản lý hình ảnh

**Goal**: Quản lý và văn phòng chụp/tải ảnh mã hàng, mọi vai trò xem lại ngay trong app để nhận ra mặt hàng, không tốn tiền cloud — ảnh nằm trên Google Drive, nhưng database và giao diện không phụ thuộc Drive để sau này chuyển sang cloud chỉ bằng một script copy.
**Depends on**: Phase 2 (chi tiết mã hàng là nơi gắn ảnh)
**Requirements**: ANH-01, ANH-02, ANH-03, ANH-04, ANH-05, ANH-06 (chỉ ảnh mã hàng — chốt ở discuss 26/09, xem 09-CONTEXT.md)

**Hướng kỹ thuật đã bàn** (chi tiết chốt ở discuss/plan):

- Bảng `hinh_anh` lưu `noi_luu` (`GDRIVE` | `SUPABASE` | `R2`) + `khoa_luu` (fileId gốc và thumb) — **không lưu URL Drive**; RLS theo vai trò
- Ghi: trình duyệt nén WebP 1200px + thumb 300px → Route Handler (`getUser()` + vai trò) → Apps Script web app ("Execute as me", tài khoản Google riêng cho hệ thống) → Drive
- Đọc: luôn qua URL của app `/anh/<id>` — Route Handler kiểm quyền, lấy base64 từ Apps Script, trả binary với `Cache-Control: immutable` để CDN giữ; file Drive để private
- `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET` chỉ ở server, không `NEXT_PUBLIC_*`; Apps Script kiểm secret
- Folder Drive nông, theo thứ không đổi: `san-pham/{goc,thumb}`, `chung-tu/<năm>/<tháng>/{goc,thumb}`; tên file `<mã>__<uuid>.webp`; ID folder cache trong `PropertiesService`, tạo folder bọc `LockService`
- Code Apps Script nằm trong repo (`apps-script/`, đẩy bằng `clasp`); deploy bằng "New version" để giữ URL `/exec`
- Tham chiếu: tax-web (`/Users/hungly/Desktop/tax-web`) đã kết nối Drive qua Apps Script theo mẫu một endpoint + `action`

**Success Criteria** (what must be TRUE):

  1. Mở chi tiết mã hàng, chụp bằng camera điện thoại hoặc chọn file máy tính, ảnh hiện ngay trong thư viện ảnh của mã; đặt được ảnh chính và xóa ảnh (xóa mềm, file Drive vào thùng rác)
  2. Ảnh chỉ xem được qua `/anh/<id>` khi đã đăng nhập; mở link Drive gốc hoặc gọi thẳng Apps Script không có secret đều bị từ chối
  3. Bảng danh mục có thumbnail mà không chậm đi rõ rệt: lần xem thứ hai của cùng một ảnh không gọi Apps Script (xác nhận bằng header cache / log)
  4. Ảnh upload lên đều dưới giới hạn body của Vercel nhờ nén ở client; ảnh HEIC từ iPhone xử lý được hoặc báo lỗi đọc hiểu được
  5. Chuyển nơi lưu chỉ cần viết một bản cài đặt `ImageStorage` mới + script migrate đổi `noi_luu`/`khoa_luu` — không sửa component hay URL nào (kiểm bằng review: ngoài lớp storage không chỗ nào biết tới Drive)

**Plans**: 13 plans trong 5 wave

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — DB: bảng hinh_anh, RLS + quyền cột, RPC them_anh/xoa_anh/dat_anh_chinh/lay_khoa_anh/nap_anh_kiotviet, lọc p_co_anh + pgTAP 43
- [x] 09-02-PLAN.md — Mã nguồn Apps Script (apps-script/) + README thiết lập tiếng Việt
- [x] 09-03-PLAN.md — Quy tắc ảnh, URL /anh, nén WebP + thumb phía trình duyệt (hàm thuần có test)
- [x] 09-04-PLAN.md — Lớp ImageStorage + bản cài đặt Google Drive, biến môi trường server-only

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-05-PLAN.md — [BLOCKING] đẩy 0068 lên cloud, sinh lại kiểu, chạy pgTAP

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-06-PLAN.md — Lớp server hinh_anh + route đọc /anh/[id] (cache private) + proxy 401
- [x] 09-07-PLAN.md — Lớp dữ liệu client ảnh: api, query key, hook (nén rồi tải lên)
- [x] 09-08-PLAN.md — Bộ lọc Có ảnh / Chưa có ảnh (?anh=co|chua) ở danh mục

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 09-09-PLAN.md — Route tải ảnh lên / xóa ảnh + ma trận quyền ba route ảnh
- [x] 09-10-PLAN.md — Thư viện ảnh trong chi tiết mã: chụp/chọn, ảnh chính, xóa, phóng to
- [x] 09-11-PLAN.md — Cột thumbnail ảnh chính + ô xám ở bảng danh mục
- [x] 09-12-PLAN.md — Script chép ảnh KiotViet sang Drive (sharp devDependency, chạy lại được)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 09-13-PLAN.md — [CHECKPOINT] thiết lập Apps Script, kiểm chứng hệ thật, UAT, chép toàn bộ ảnh KiotViet

**UI hint**: yes

## Milestone v1.1 — Phản hồi vận hành

Nguồn: phản hồi vận hành 28/09–02/10/2026 (Notion Task board). v1.0 vẫn mở song song
(Phase 4 còn checkpoint, Phase 8 chưa bắt đầu). Bảy chặng 10–16; chặng 10 và 11 độc lập
nhau, chạy song song được. Migration kế tiếp là `0077`.

### Phase 10: Dọn dẹp & điều hướng

**Goal**: Giao diện chỉ còn những thứ Minh Vũ thật sự dùng: mã/tên hàng luôn hiện đủ, không còn Lịch sử KiotViet, Giá bán và Tồn kho cũ; menu chia nhóm đúng cách vận hành; "Xuất kho" thành "Hóa đơn".
**Depends on**: Nothing (v1.0 code)
**Requirements**: GON-01, GON-02, GON-03, GON-04, GON-05, GON-06, GON-07
**Success Criteria** (what must be TRUE):

  1. Mở phiếu nhập, đơn đặt hàng và Danh mục hàng hóa, mọi dòng đều hiện đủ mã hàng và tên hàng, kể cả dòng vừa thêm
  2. Không còn trang, mục menu hay tab "Lịch sử KiotViet" ở đâu trên giao diện; dữ liệu lưu trữ trong database vẫn nguyên
  3. Không màn nào hiện hoặc cho nhập Giá bán; Danh mục không hiện Giá vốn; phiếu nhập vẫn nhập được Đơn giá
  4. Menu có nhóm Đơn hàng (Đặt hàng, Hóa đơn), Hàng hóa (Danh sách hàng hóa, Kiểm kho), cùng Nhập kho, Đối tác, Phân tích, Cài đặt — trên cả máy tính và thanh điện thoại
  5. Vào `/xuat-kho` hoặc `/ton-kho` (kể cả bookmark cũ) được chuyển sang `/hoa-don` / Danh sách hàng hóa; ma trận quyền route phủ đúng bộ route mới và không route cũ nào trả 404/crash

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-10-don-dep`
- [x] Gỡ Lịch sử KiotViet khỏi giao diện, giữ dữ liệu (`643550f`)
- [x] Menu nhóm, Xuất kho → Hóa đơn, gỡ trang Tồn kho (`d43643f`)
- [x] Bỏ giá bán và giá vốn khỏi giao diện, giữ đơn giá phiếu nhập (`514ddd4`)
- [x] Hiện tên hàng dưới mã trên điện thoại (`a5b72ed`); ô mã ở hàng nhập liệu đã sửa ở `281dceb`

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, test hàm thuần, test đọc Excel,
> ma trận quyền route 165/165 đều xanh. Mục "Phân tích" trong menu (tiêu chí 4) chưa có — thêm ở
> Phase 13 khi trang `/phan-tich` ra đời. `/ton-kho/dinh-muc` tạm giữ, vào bằng nút "Định mức" ở
> Danh sách hàng hóa, chuyển vào Phân tích ở Phase 13.

**UI hint**: yes

### Phase 11: Nhân viên phụ trách & danh mục nền

**Goal**: Người nhận nội bộ là nhân viên phụ trách có tên đầy đủ, đặt hàng chọn đúng Nội bộ hoặc Đối tác, và nhóm hàng/ĐVT/công đoạn tạo được ngay trong form mã hàng.
**Depends on**: Nothing (chạy song song với Phase 10). Migration `0077` là số trống kế tiếp.
**Requirements**: NVPT-01, NVPT-02, NVPT-03, NVPT-04
**Success Criteria** (what must be TRUE):

  1. Quản lý thêm, sửa, ngừng dùng nhân viên phụ trách (tên viết tắt, tên đầy đủ) trong Cài đặt
  2. Khi đặt hàng, công tắc Nội bộ/Đối tác mặc định Nội bộ; Nội bộ chọn từ nhân viên phụ trách, Đối tác chọn từ khách hàng hoặc cả hai; đổi công tắc thì tên đã chọn bị xóa
  3. Đơn đặt hàng, hóa đơn, danh sách và phiếu in hiện tên đầy đủ nhân viên phụ trách; đơn nội bộ tạo trước đây vẫn còn người nhận (đã chuyển sang nhân viên tương ứng)
  4. Nhóm hàng, Đơn vị tính, Công đoạn không còn ở Cài đặt; trong form mã hàng chọn giá trị có sẵn hoặc bấm "+ Thêm mới" tạo ngay tại chỗ

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-11-nhan-vien` (tách từ `feature/phase-10-don-dep`)
- [x] Migration `0077`: bảng `nhan_vien_phu_trach`, đổi FK người nhận nội bộ, chuyển dữ liệu giữ nguyên id (`c15464c`)
- [x] Tab Cài đặt → Nhân viên phụ trách, tạo đơn mặc định Nội bộ (`4382a70`)
- [x] Quản lý nhóm hàng/ĐVT/công đoạn chuyển sang nút "Danh mục phụ" ở Danh sách hàng hóa (`112f849`)
- [x] "+ Thêm mới" nhóm/ĐVT/công đoạn ngay trong form mã hàng (`f2f53e2`)

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 42 file / 647 test, test hàm thuần,
> test đọc Excel, ma trận quyền route 180/180 đều xanh. Quyết định khi làm: quyền ghi nhân viên phụ trách là
> quản lý + văn phòng (khuôn danh mục, RLS 0077); nhóm hàng/ĐVT/công đoạn KHÔNG mất chức năng sửa/xóa/màu/nhóm
> cha — chuyển vào modal "Danh mục phụ". `0077` mới áp ở local; cloud còn lệch từ 0072 (chưa có 0076).
**UI hint**: yes

### Phase 12: Luồng đơn hàng → hóa đơn

**Goal**: Đơn đặt hàng đi một mạch Đơn tạm → Đã xác nhận → Hoàn thành, và Hoàn thành tự ghi sổ một Hóa đơn atomic — thay thế thiết kế duyệt đơn/tạo phiếu xuất của plan 04-12 và 04-13.
**Depends on**: Phase 10 (route `/hoa-don`), Phase 11 (người nhận nhân viên phụ trách)
**Requirements**: DON-01, DON-02, DON-03, DON-04, DON-05, DON-06

> Đặt tên khóa quyền (Xác nhận, Hoàn thành, Sửa hóa đơn, Tạo đơn đặt hàng...) ngay từ chặng này
> để Phase 16 chỉ phải nối vào, không phải đổi RPC.

**Success Criteria** (what must be TRUE):

  1. Bấm "Tạo đơn" mở ngay giao diện tạo đơn đầy đủ (người nhận + dòng hàng), lưu thành Đơn tạm
  2. Xác nhận đơn tạm chuyển sang Đã xác nhận và in được phiếu lấy hàng
  3. Hoàn thành đơn đã xác nhận tạo và ghi sổ một Hóa đơn trong một transaction: tồn giảm đúng, lỗi giữa chừng không để lại gì, xuất âm vẫn bắt buộc chọn lý do
  4. Bấm Hoàn thành hai lần hoặc hai người cùng bấm không trừ tồn hai lần (database chặn: một đơn tối đa một hóa đơn)
  5. Hủy được đơn Tạm hoặc Đã xác nhận mà không sinh hóa đơn và không đụng tồn; từ đơn mở được hóa đơn và ngược lại; hóa đơn tạo không cần đơn vẫn làm được

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-12-hoa-don` (tách từ `feature/phase-11-nhan-vien`)
- [x] Migration `0078`: `hoan_thanh_don` tạo + ghi sổ hóa đơn một transaction, unique index một đơn một hóa đơn, `huy_don`, hủy hóa đơn đưa đơn về Đã xác nhận (`e8c1457`)
- [x] Nút Hoàn thành (hỏi lý do khi xuất âm), Hủy đơn, link đơn ↔ hóa đơn, bỏ nút "Tạo hóa đơn" rời (`a32f71d`)
- [x] Bấm Tạo đơn vào thẳng `/dat-hang/moi` (`b0e62b5`)
- [x] `test-concurrency.sh` PHẦN 3: hai người cùng hoàn thành một đơn (`855592d`)

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 43 file / 672 test, test hàm thuần,
> test đọc Excel, ma trận quyền route 185/185, `npm run test:concurrency` (3 phần) đều xanh; chạy trọn luồng trên
> trình duyệt. Quyết định khi làm: Hoàn thành = quản lý + văn phòng, Hủy đơn = chỉ quản lý (hàm quyền
> `hoan_thanh_duoc_don` / `huy_duoc_don` chờ Phase 16 thay ruột); hủy hóa đơn → đơn về Đã xác nhận; tạo đơn
> qua trang `/dat-hang/moi` (chọn người nhận là tạo đơn tạm). Ghi chú Notion "Không hiện" chưa làm — chờ làm rõ.
> `0078` mới áp ở local; dừng nếu dữ liệu thật có đơn mang 2 hóa đơn chưa hủy.
**UI hint**: yes

### Phase 13: Phân tích tồn kho

**Goal**: Quản lý biết mã nào sắp hết, mã nào đã hết mà vẫn có khách mua, cần nhập bao nhiêu, và hàng nào tồn chậm — thay cho trang Tồn kho.
**Depends on**: Phase 12 (bán = hóa đơn hoàn thành, khách đặt tính từ đơn đã xác nhận)
**Requirements**: PTICH-01, PTICH-02, PTICH-03, PTICH-04, PTICH-05, PTICH-06, PTICH-07
> Mang theo từ Phase 10: thêm mục "Phân tích" vào menu (`NAV_ITEMS`, ma trận quyền route), chuyển
> `/ton-kho/dinh-muc` vào trang này rồi gỡ nút tạm "Định mức" ở Danh sách hàng hóa.
**Success Criteria** (what must be TRUE):

  1. Trang `/phan-tich` hiện 4 thẻ KPI (cần nhập trong X ngày, hết hàng vẫn có khách mua, tổng số lượng tồn, tồn không có tín hiệu bán); mỗi mã có bán TB/ngày theo kỳ 7/30/90 ngày, tồn khả dụng, số ngày còn hàng, ngày dự kiến hết và đề nghị nhập đúng công thức
  2. Có biểu đồ Số ngày còn hàng (lọc theo loại hoàn thiện) và Nhịp bán hàng kèm % thay đổi giữa nửa sau và nửa đầu kỳ
  3. Bảng Cần nhập hàng có 3 tab, tìm kiếm, lọc loại hoàn thiện và xuất được CSV đề nghị nhập
  4. Xem được top 10 bán chạy, 15 nhóm bán nhiều nhất kèm số ngày tồn, tồn chậm; mã không bán hiện "Không bán" hoặc "Ngừng bán?" và không có đề nghị nhập
  5. Chỉnh được ngưỡng đỏ, ngưỡng vàng và số ngày Y, lưu chung toàn hệ thống, màu đổi theo; duyệt định mức tồn tối thiểu làm được ngay trong trang này

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-13-phan-tich` (tách từ `feature/phase-12-hoa-don`)
- [x] Migration `0079`: `phan_tich_ton_kho` (một dòng mỗi mã), `nhip_ban_theo_ngay`, bảng `cau_hinh_phan_tich` (`e8c8462`)
- [x] Lớp dữ liệu + hàm tính thuần (đề nghị nhập, màu, KPI, tab, xếp hạng, tồn chậm, CSV) (`2956ef1`)
- [x] Trang `/phan-tich`, mục menu Phân tích, quyền `view-analysis` (`223de74`)
- [x] Duyệt định mức thành tab `?tab=dinh-muc`, gỡ `/ton-kho/dinh-muc` và nút tạm (`30f9515`)

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 44 file / 696 test, test hàm thuần,
> test đọc Excel, ma trận quyền route 190/190, `npm run test:concurrency`; xem trang trên trình duyệt với dữ liệu thử
> `DEMO-PT` (đã xóa). Quyết định khi làm: xem = quản lý + văn phòng, đổi ngưỡng = quản lý; khách đặt = đơn tạm +
> đã xác nhận (bỏ nội bộ); bán trừ khách trả; X ("Sắp hết ≤ X ngày", KPI "Cần nhập trong X ngày") = ngưỡng vàng,
> ngưỡng đỏ chỉ tô màu; biểu đồ bỏ mã không tồn không bán. Tải toàn danh mục theo trang 1.000 dòng (max_rows của
> PostgREST). `0079` mới áp ở local. Việc mang theo từ Phase 10 (menu Phân tích, chuyển định mức, gỡ nút tạm) đã xong.
**UI hint**: yes

### Phase 14: Panel chi tiết

**Goal**: Xem nhanh một mã hàng hoặc một đối tác ngay cạnh bảng, không rời trang, với cùng con số dự kiến hết hàng của trang Phân tích.
**Depends on**: Phase 13 (dự kiến hết hàng)
**Requirements**: PANEL-01, PANEL-02, PANEL-03
**Success Criteria** (what must be TRUE):

  1. Ở Danh sách hàng hóa, bấm một dòng mở panel cạnh bảng có ảnh, mã, tên, tồn kho, khách đặt, dự kiến hết hàng — số khớp trang Phân tích — và không rời trang
  2. Bảng đối tác chỉ có 5 cột: Mã, Tên, Loại, Điện thoại, Tổng giao dịch
  3. Bấm dòng đối tác mở panel với tab Thông tin (sửa được) và tab Lịch sử giao dịch
  4. Vào `/doi-tac/[id]` cũ được chuyển về danh sách với panel đối tác đó mở sẵn

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-14-panel` (tách từ `feature/phase-13-phan-tich`)
- [x] Migration `0080`: `danh_sach_doi_tac` thêm `tong_giao_dich` (số chứng từ đã ghi sổ); `lich_su_giao_dich_doi_tac` chỉ còn phiếu hệ thống đã ghi sổ (`37efacc`)
- [x] Khung panel dùng chung (`DetailPanel`, slot `detailPanel` của `ListLayout`, `?chon=<uuid>`) + panel mã hàng (`7af573b`)
- [x] Bảng đối tác 5 cột + panel đối tác (Thông tin / Lịch sử giao dịch / Lịch sử sửa), gỡ `/doi-tac/[id]` thay bằng redirect (`df98528`)
- [x] Kiểm toàn bộ: `npm run check`, pgTAP, test hàm thuần, test đọc Excel, ma trận quyền route, trình duyệt desktop + điện thoại

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 45 file / 702 test, test hàm thuần,
> test đọc Excel, ma trận quyền route 195/195; xem trên trình duyệt 1440px và 375px (vai trò quản lý). Quyết định khi làm:
> khách đặt + dự kiến hết hàng chỉ hiện cho quản lý + văn phòng (thủ kho/chỉ xem ẩn hẳn, không nới quyền RPC), tính theo
> nhịp bán 30 ngày cố định; Tổng giao dịch = số chứng từ `HOAN_THANH`; giữ `/danh-muc/[id]` + link "Xem chi tiết";
> panel đối tác xem chỉ đọc, nút Sửa mở form có sẵn; bỏ dòng "Tên trong ô Ghi chú KiotViet". Panel là cột phải từ
> 1280px, ngăn kéo toàn màn dưới đó; đổi trang/bộ lọc không đóng panel. `0080` mới áp ở local.
**UI hint**: yes

### Phase 15: Import danh mục v2

**Goal**: Nhập mã hàng từ file Excel 4 cột, chọn các trường còn lại ngay trên màn hình, dòng lỗi không chặn cả file, tồn kho vào sổ bằng chứng từ.
**Depends on**: Phase 11 (thêm mới giá trị danh mục tại chỗ)
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):

  1. Tải được file mẫu 4 cột (Mã hàng, Tên hàng, Tồn kho, Mô tả); tải file lên hiện bảng đủ cột theo thứ tự, cột từ file điền sẵn, cột còn lại chọn bằng dropdown/bật tắt cho từng dòng hoặc nhiều dòng cùng lúc
  2. Dòng lỗi (trùng mã, trùng tên trong file hoặc với danh mục) bị bỏ qua, các dòng hợp lệ vẫn nhập; tải được file chỉ chứa dòng lỗi kèm lý do để sửa và import lại
  3. Tồn kho trong file được ghi bằng một chứng từ DIEU_CHINH; thẻ kho mở được về chứng từ đó, không có dòng nào ghi thẳng vào tồn
  4. Mã hàng có Loại hàng, Dòng xe (chọn được, thêm mới tại chỗ) và Được bán trực tiếp, sửa được trong form mã hàng

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-15-import-v2` (tách từ `feature/phase-14-panel`)
- [x] Migration `0081`: danh mục `loai_hang`, `dong_xe`; `san_pham` thêm `loai_hang_id`, `dong_xe_id`, `duoc_ban_truc_tiep`; RPC `nhap_ma_hang_moi` (bỏ qua dòng lỗi, tồn vào một phiếu DIEU_CHINH tự ghi sổ) (`a5c4eac`)
- [x] Form mã hàng: Loại hàng, Dòng xe (thêm mới tại chỗ), Vị trí kệ, Được bán trực tiếp; tab Danh mục phụ; nhãn nhật ký sửa (`a819032`)
- [x] File mẫu 4 cột, route đọc file, file dòng lỗi (4 cột + Lý do, nhập lại được) (`3ebc455`)
- [x] Màn xem trước 11 cột, chọn từng dòng / gán hàng loạt, chọn kho ghi tồn, kết quả + tải file lỗi; menu Excel tách "Nhập mã hàng mới" / "Cập nhật từ Excel" (`b5a5889`)

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 46 file / 719 test, test hàm thuần,
> test đọc Excel, ma trận quyền route 205/205, `npm run test:concurrency`; chạy trọn luồng trên trình duyệt (file 7 dòng → 2 nhập,
> 5 lỗi; phiếu DC26-000001 đã ghi sổ, thẻ kho hiện đúng). Quyết định khi làm: giữ trình nhập cũ thành "Cập nhật từ Excel";
> một kho cho cả file (mặc định Kho 1, cũng là kho mặc định của mã mới); Vị trí = `vi_tri_ke`, Mô tả = `ghi_chu`;
> Loại hàng là danh mục tự do; trùng mã/tên trong file đánh dấu mọi dòng trùng; tên so không dấu; mã mới công đoạn
> MUA_NGOAI. Chưa có trang xem phiếu điều chỉnh — thẻ kho hiện số phiếu nhưng chưa bấm mở được. `0081` mới áp ở local.
**UI hint**: yes

### Phase 16: Chức vụ & quyền

**Goal**: Quản lý tự tạo chức vụ và bật/tắt từng quyền; quyền được chặn ở database và có hiệu lực ngay, không chờ token mới.
**Depends on**: Phase 12 (quyền Xác nhận/Hoàn thành/Sửa hóa đơn gắn vào RPC luồng đơn)
**Requirements**: QUYEN-01, QUYEN-02, QUYEN-03, QUYEN-04

> **Rủi ro cao nhất của milestone** — đụng RLS và mọi RPC đang chạy thật. Khóa quyền phải được đặt tên
> từ Phase 12; làm sau cùng, giữ vai trò cũ chạy song song cho tới khi ma trận quyền xanh.

**Success Criteria** (what must be TRUE):

  1. Quản lý tạo/sửa chức vụ (mặc định Quản lý, Thủ kho, Nhân viên) và bật/tắt 9 quyền cho từng chức vụ: Xem dashboard, Nhập đơn hàng, Tạo đơn đặt hàng, Xác nhận, Hoàn thành, Sửa hóa đơn, Tạo mã hàng, Tạo nhân viên, Kiểm kho
  2. Mỗi người dùng được gán một chức vụ; người dùng hiện có được chuyển sang chức vụ tương ứng với vai trò cũ, không ai mất quyền đang có
  3. Tắt một quyền của chức vụ thì người đó bị database từ chối ngay (kể cả gọi thẳng API), không phải đăng nhập lại
  4. Menu, nút và route ẩn/chặn đúng theo quyền chức vụ; ma trận kiểm thử quyền route chạy theo chức vụ và xanh

**Plans**: 4 task — làm theo quickplan (không qua `/gsd:execute-phase`), branch `feature/phase-16-chuc-vu` (tách từ `feature/phase-15-import-v2`)
- [x] Migration `0082`: `chuc_vu` (mang phạm vi = enum vai_tro cũ) + `chuc_vu_quyen`, 4 chức vụ mặc định giữ đúng quyền cũ, `nguoi_dung.chuc_vu_id` + trigger đồng bộ vai_tro, `co_quyen()` / `quyen_cua_toi()` đọc DB, `luu_nguoi_dung` (`b3f0e42`)
- [x] Migration `0083`: 23 hàm + 26 policy của 9 nghiệp vụ chuyển sang `co_quyen` (thân hàm lấy từ `pg_get_functiondef`); vá NULL lọt ở `ghi_so_chung_tu` / `huy_chung_tu` (`61d1539`)
- [x] Cài đặt › Chức vụ (bảng chức vụ × 9 quyền), form người dùng chọn chức vụ, `0084` bỏ `luu_ho_so_nguoi_dung` theo vai trò (`226c44f`)
- [x] Menu, nút, route theo quyền chức vụ (`allows()`), nút đơn tách Xác nhận / Hoàn thành / Hủy; ma trận route bật/tắt quyền trên cùng phiên (`cb4e8a7`)

> **Hoàn thành 02/10/2026.** Kiểm trên Supabase local: `npm run check`, pgTAP 48 file / 748 test (toàn bộ test cũ xanh = không ai
> mất/thêm quyền), test hàm thuần, test đọc Excel, ma trận quyền route 220/220 (gồm 10 ô bật/tắt quyền trên cùng cookie),
> `npm run test:concurrency`, `npm run verify:hook`; xem trên trình duyệt. Quyết định khi làm: chức vụ chứa phạm vi (người dùng
> chỉ chọn chức vụ, vai_tro suy ra); thêm chức vụ mặc định "Chỉ xem"; "Nhập đơn hàng" = phiếu nhập kho; "Tạo nhân viên" =
> nhân viên phụ trách; "Sửa hóa đơn" = hủy hóa đơn đã ghi sổ; danh mục phụ đi cùng "Tạo mã hàng"; Hủy đơn, đối tác, người dùng,
> kho, số chứng từ, giá vốn vẫn theo phạm vi. Đổi phạm vi vẫn chờ token mới (bẫy 6); 9 quyền có hiệu lực ngay. Còn lỗ
> `coalesce(vai_tro, 'quan_ly')` ở các RPC ngoài 9 quyền — đã tách việc riêng. `0082`–`0084` mới áp ở local.
**UI hint**: yes

## Milestone v1.2 — Phản hồi vận hành đợt 2

Nguồn: phản hồi vận hành 03/10/2026 (Notion Task board). Ba chặng 17–19, đi tuần tự: 18 và 19 cùng dựa
trên chặng 17 (đường `/don-dat` mới, phiếu lấy hàng). Chặng 19 còn phải chờ branch `feature/quy-chuan-ma-b`
(ngoài GSD, migration tới 0086) merge vào `main`, vì quy chuẩn mã tự điền `dong_xe_id` mà chặng này thay bằng
bảng nhiều-nhiều. Ba task Notion bỏ khỏi milestone (FUT-01..03). Migration kế tiếp: kiểm lại sau khi merge quy chuẩn mã.

### Phase 17: Đổi tên & gọn đơn đặt

**Goal**: Giao diện nói đúng ngôn ngữ vận hành của Minh Vũ: "Đơn đặt" và "Duyệt đơn" thay "Đặt hàng" và "Hóa đơn", "Hàng ngoài" thay "Mua ngoài", bỏ những thứ không dùng (Cần rà, Ngày giao dự kiến), phiếu lấy hàng đủ thông tin người in.
**Depends on**: Phase 16 (v1.1 xong; dựng trên `/dat-hang`, `/hoa-don` hiện có)
**Requirements**: TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, DDAT-01, DDAT-02, DDAT-03
**Success Criteria** (what must be TRUE):

  1. Menu nhóm Đơn hàng hiện "Đơn đặt" và "Duyệt đơn" trên cả máy tính và điện thoại; tiêu đề trang và nút liên quan dùng tên mới
  2. Đơn nằm ở `/don-dat` (kèm tạo mới, chi tiết, in), hóa đơn ở `/duyet-don`; bookmark cũ `/dat-hang/*`, `/hoa-don/*`, `/xuat-kho/*` tự chuyển sang đường mới, giữ đường con và tham số; chưa đăng nhập thì đăng nhập xong quay về đúng đường mới
  3. Mọi chỗ hiện số lượng đang được đặt ghi "Đơn đặt" thay "Khách đặt" (bảng Danh sách hàng hóa, chi tiết mã, file xuất Excel); công đoạn "Mua ngoài" hiện là "Hàng ngoài" ở mọi màn và file xuất, import Excel nhận cả tên cũ lẫn tên mới
  4. Danh mục hàng hóa không còn bộ lọc, cảnh báo, nút rà hàng loạt hay nhãn "Cần rà"
  5. Tạo/sửa đơn không còn ô Ngày giao dự kiến (danh sách, chi tiết, bản in cũng bỏ); phiếu lấy hàng ghi người nhận bằng tên đầy đủ không kèm mã nhân viên, kèm thời gian in (giờ:phút ngày) và người đặt

**Plans:** 6/6 plans complete

Plans:
- [x] 17-01-PLAN.md — Dời route /don-dat, /duyet-don + redirect thẳng, menu Đơn đặt/Duyệt đơn, ma trận route (W1)
- [x] 17-02-PLAN.md — Trỏ mọi link trong features sang đường mới, tên màn ở back-link/empty state (W1)
- [x] 17-03-PLAN.md — Migration 0089 "Hàng ngoài" + pgTAP 107, nhãn Đơn đặt ở Phân tích/CSV (W1)
- [x] 17-04-PLAN.md — Danh sách hàng hóa: bỏ Cần rà + ĐVT mâu thuẫn, nhãn Đơn đặt / Hàng ngoài (W2)
- [x] 17-05-PLAN.md — Bỏ Ngày giao dự kiến, phiếu lấy hàng in tên người nhận + người đặt + giờ in (W3)
- [x] 17-06-PLAN.md — Cổng cuối: full suite + kiểm trên trình duyệt (checkpoint) (W4)

**UI hint**: yes

### Phase 18: Đơn nhiều người nhận

**Goal**: Một đơn nội bộ có thể giao cho nhiều người, và từng dòng hàng gán được người nhận riêng — thông tin này đi xuyên từ danh sách, phiếu lấy hàng tới hóa đơn.
**Depends on**: Phase 17 (cùng đụng phiếu lấy hàng và các đường `/don-dat` đã đổi tên)
**Requirements**: NNHAN-01, NNHAN-02, NNHAN-03, NNHAN-04, NNHAN-05, NNHAN-06

> Câu hỏi mở — **chốt ở discuss-phase**, không giả định trước: người nhận của dòng có bắt buộc nằm trong người nhận của đơn
> không; dòng để trống người nhận có kế thừa người nhận đơn không; đơn chế độ Đối tác có áp dụng nhiều người nhận không;
> phiếu lấy hàng in một tờ chung hay một tờ mỗi người nhận.

**Success Criteria** (what must be TRUE):

  1. Tạo/sửa đơn (Nội bộ hoặc Đối tác) chọn được một hoặc nhiều người nhận (nhân viên phụ trách) cho cả đơn, và gán được người nhận riêng cho từng dòng hàng; gán ở dòng tự thêm người đó vào danh sách của đơn, dòng trống = hàng chung (18-CONTEXT D1–D3)
  2. Danh sách đơn hiện đủ người nhận; lọc theo một người nhận ra mọi đơn có người đó ở cấp đơn hoặc cấp dòng
  3. Phiếu lấy hàng một tờ chung: đầu phiếu liệt kê người nhận của đơn, bảng có cột "Người nhận" theo dòng (18-CONTEXT D4)
  4. Hoàn thành đơn sinh hóa đơn mang theo người nhận của đơn và của từng dòng, xem lại được ở Duyệt đơn
  5. Đơn cũ đang có một người nhận vẫn hiện đúng người đó sau khi chuyển sang cấu trúc mới, không mất người nhận nào

**Plans**: 8 plans

Plans:
- [x] 18-01-PLAN.md — Migration 0090: bảng nối người nhận, cột dòng, backfill, trigger D1/D3, RPC tao_don/dat_nguoi_nhan_don + pgTAP 108
- [x] 18-02-PLAN.md — Migration 0091: RPC đọc đổi sang bảng nối, hóa đơn chép người nhận, nguoi_nhan_dong_chung_tu + pgTAP 109, sửa 30/98
- [x] 18-03-PLAN.md — Nền TS: regen types, kiểu + hàm thuần người nhận, mapper/schema/api/hook sales-order + documents (TDD)
- [x] 18-04-PLAN.md — UI tạo đơn + đầu đơn chọn nhiều người nhận (StaffMultiSelect)
- [x] 18-05-PLAN.md — Lưới dòng: cột/ô người nhận theo dòng, giữ luồng bàn phím
- [x] 18-06-PLAN.md — Danh sách + lọc ?nhan_vien= + phiếu lấy hàng có cột Người nhận
- [x] 18-07-PLAN.md — Duyệt đơn: hóa đơn hiện người nhận đơn + dòng
- [x] 18-08-PLAN.md — Cổng cuối: bộ kiểm toàn phần + UAT trình duyệt
**UI hint**: yes

### Phase 19: Dòng xe dùng chung

**Goal**: Một mã hàng dùng được cho nhiều dòng xe — chọn, xem, lọc và nhập/xuất Excel đều theo nhiều dòng xe thay vì một.
**Depends on**: Phase 17; branch `feature/quy-chuan-ma-b` (quy chuẩn mã, ngoài GSD) phải merge vào `main` trước, vì quy chuẩn mã tự điền `dong_xe_id` mà phase này thay bằng bảng nhiều-nhiều
**Requirements**: DXE-01, DXE-02, DXE-03, DXE-04, DXE-05
**Success Criteria** (what must be TRUE):

  1. Form mã hàng chọn được nhiều dòng xe cho một mã; chi tiết mã hiện đủ mọi dòng xe của mã
  2. Lọc Danh sách hàng hóa theo một dòng xe ra mọi mã dùng cho dòng xe đó, kể cả mã còn dùng cho dòng xe khác
  3. Import Excel (nhập mã mới và cập nhật) nhận nhiều dòng xe trong một ô, cách nhau bằng dấu phẩy; xuất Excel ghi cùng định dạng, nạp lại file vừa xuất không đổi gì
  4. Mã hiện có vẫn giữ đúng dòng xe cũ sau khi chuyển cấu trúc; tự điền dòng xe từ quy chuẩn mã vẫn chạy

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → ... → 9 (v1.0, còn mở song song) và 10 → 16 (v1.1; 10 và 11 song song, 12 sau cả hai, 13 → 14, 15 sau 11, 16 sau cùng), 17 → 19 (v1.2; tuần tự, 19 chờ merge `feature/quy-chuan-ma-b`)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nền dữ liệu | 0/TBD | Not started | - |
| 2. Khung ứng dụng, Danh mục, Đối tác, Cài đặt | 2/21 | In Progress | - |
| 3. Phiếu nhập | 0/TBD | Not started | - |
| 4. Đơn đặt hàng & Phiếu xuất | 0/TBD | Not started | - |
| 5. Tồn kho & Tổng quan | 12/12 | Executed — chờ verify |  |
| 6. Kiểm kê & Go-live | 16/16 | Complete   | 2026-09-25 |
| 7. Trang tổng quan | 9/9 | Complete    | 2026-09-27 |
| 8. Mobile & Chuyển kho | 0/TBD | Not started | - |
| 9. Quản lý hình ảnh | 13/13 | Complete   | 2026-09-26 |
| 10. Dọn dẹp & điều hướng | 4/4 | Complete | 2026-10-02 |
| 11. Nhân viên phụ trách & danh mục nền | 4/4 | Complete | 2026-10-02 |
| 12. Luồng đơn hàng → hóa đơn | 4/4 | Complete | 2026-10-02 |
| 13. Phân tích tồn kho | 4/4 | Complete | 2026-10-02 |
| 14. Panel chi tiết | 4/4 | Complete | 2026-10-02 |
| 15. Import danh mục v2 | 4/4 | Complete | 2026-10-02 |
| 16. Chức vụ & quyền | 4/4 | Complete | 2026-10-02 |
| 17. Đổi tên & gọn đơn đặt | 6/6 | Complete    | 2026-10-03 |
| 18. Đơn nhiều người nhận | 8/8 | Complete    | 2026-10-03 |
| 19. Dòng xe dùng chung | 0/TBD | Not started | - |

### Phase 20: Giao diện 3b và tính năng còn thiếu

**Goal**: Toàn app mang design system "hướng 3b" (artifact https://claude.ai/artifact/CmTtL7XqUnZzLSV54iE1ZC), và bốn màn có design — Tổng quan, Đơn đặt (danh sách + chi tiết), Chi tiết hàng hóa — có đủ tính năng design thể hiện mà hệ thống còn thiếu.
**Depends on**: Phase 18 (dựng trên đơn nhiều người nhận). Độc lập với Phase 19.
**Requirements**: UI3B-01, UI3B-02, UI3B-03, UI3B-04, UI3B-05, UI3B-06, UI3B-07
**Success Criteria** (what must be TRUE):

  1. Mọi màn dùng chung design system 3b: font Manrope, header 2 tầng (logo · ô tìm ⌘K · tài khoản / menu tab gạch chân), nút bo tròn, thẻ viền mảnh bo 16 — bố cục nội dung từng màn không vỡ, mobile vẫn có thanh tab đáy
  2. Ô tìm kiếm toàn cục (bấm hoặc ⌘K/Ctrl+K) tìm được mã hàng, số phiếu/số đơn và đối tác, Enter mở thẳng trang chi tiết; tôn trọng RLS/quyền xem
  3. Tổng quan có 4 KPI kèm xu hướng (Giá trị tồn — người không có quyền giá vốn thấy Tổng SL tồn thay thế; Mã đang kinh doanh; Phiếu xuất hôm nay; Phiếu chờ ghi sổ), biểu đồ Nhập–Xuất 7N/30N/90N, Tồn theo nhóm có SL + tỷ trọng, panel "Cần xử lý" có nút dẫn tới đúng màn, "Không luân chuyển > 30 ngày" có số ngày; Nhịp bán và Xuất âm theo ngày vẫn còn
  4. Danh sách Đơn đặt: lọc trạng thái có số đếm, khoảng ngày có preset 7N/30N/Tháng/Tùy, cột Tiến độ có thanh, nút Xuất Excel theo bộ lọc hiện tại
  5. Chi tiết đơn: nội dung hai cột — dòng hàng bên trái, aside "Thông tin đơn" (người nhận, ghi chú, số đơn/ngày/người tạo/trạng thái) bên phải; gõ lại mã đã có với cùng người nhận thì cộng dồn số lượng
  6. Chi tiết hàng hóa: badge trạng thái cạnh mã, nút Ngừng/Mở lại kinh doanh; "Tồn theo kho" là bảng Tồn · Tối thiểu · Giá trị (ẩn với người không có quyền giá vốn) + Tổng tồn; ảnh nằm ở aside (ảnh chính lớn + dải ảnh nhỏ)

**Plans**: 16 plans (5 waves)

Plans:
- [x] 20-01-PLAN.md — W1: RPC tìm kiếm toàn cục `tim_kiem_toan_cuc` (0092, invoker) + pgTAP 110
- [x] 20-02-PLAN.md — W1: RPC Tổng quan (`tong_quan_chi_so`, `nhap_xuat_theo_ngay`, `khong_luan_chuyen`, `ton_theo_nhom` + SL) (0093) + pgTAP 111/93
- [x] 20-03-PLAN.md — W1: RPC đơn đặt (`dem_don_theo_trang_thai`, `them_dong_don` cộng dồn) (0094) + pgTAP 113
- [x] 20-04-PLAN.md — W1: Token design system 3b (Manrope, antd pill/bo 16, biến CSS, chip trạng thái, tiêu đề trang)
- [x] 20-05-PLAN.md — W1: Bảng Tồn theo kho có giá trị theo quyền + khung ảnh aside
- [x] 20-06-PLAN.md — W2: Đồng bộ migration + database.types + mapper/hàm thuần có test cho 3 feature
- [x] 20-07-PLAN.md — W2: Header hai tầng + slot ô tìm + offsetHeader 6 bảng dính (D-10)
- [x] 20-08-PLAN.md — W2: Chi tiết hàng hóa hai cột — badge, Ngừng/Mở lại KD, ghép bảng tồn + ảnh aside
- [x] 20-09-PLAN.md — W3: Ô tìm kiếm ⌘K (feature global-search) ghép vào header
- [x] 20-10-PLAN.md — W3: Tổng quan A — 4 KPI + sparkline + biểu đồ Nhập–Xuất 7N/30N/90N
- [x] 20-11-PLAN.md — W3: Đơn đặt — panel lọc có số đếm trạng thái, preset ngày
- [x] 20-12-PLAN.md — W3: Đơn đặt — cột Tiến độ dạng thanh, chip trạng thái, số kết quả
- [x] 20-13-PLAN.md — W3: Xuất Excel danh sách đơn theo bộ lọc
- [x] 20-14-PLAN.md — W4: Tổng quan B — Cần xử lý, Không luân chuyển, Tồn theo nhóm có SL + tỷ trọng, lưới 1fr 300px
- [x] 20-15-PLAN.md — W4: Chi tiết đơn hai cột + thêm dòng cộng dồn qua RPC
- [x] 20-16-PLAN.md — W5: Ma trận quyền route, cổng kiểm toàn bộ, UAT trình duyệt (checkpoint)
**UI hint**: yes

### Phase 21: Đồng bộ KiotViet hằng ngày

**Goal**: Trong giai đoạn KiotViet còn là nơi nhập liệu duy nhất, mỗi ngày người dùng export file Excel từ KiotViet, thả vào `data/kiotviet-sync/inbox/`, chạy `npm run sync:kiotviet` — hệ mới nhận đủ danh mục, đối tác và mọi chứng từ phát sinh, chạy lại không trùng, tồn khớp KiotViet.
**Depends on**: Phase 20. Script mới hoàn toàn (`scripts/kiotviet-sync/`), KHÔNG dùng lại `scripts/import-*`, `_nap-chung-tu.ts`, `_supabase-admin.ts`.
**Requirements**: TBD
**Quyết định đã chốt (08/10/2026)**:

- Nguồn: 9 file Excel export tay (sản phẩm, NCC, khách hàng, hóa đơn, nhập hàng, trả hàng, trả hàng nhập, chuyển hàng, kiểm kho). Không dùng KiotViet Public API, không cào phiên web.
- Nhịp: một lần/ngày, chạy tay. KiotViet là nguồn duy nhất — không ai nhập trực tiếp trên hệ mới trong giai đoạn này.
- 1 kho (Kho 1). Không lấy giá (đơn giá 0). Người nhận hóa đơn = khách hàng thật từ KiotViet (upsert đối tác). Tài khoản riêng "Đồng bộ KiotViet" là người tạo mọi phiếu sync.

**Success Criteria** (what must be TRUE):

  1. `npm run sync:kiotviet` mặc định chỉ đọc + báo cáo; `--ghi` mới nạp; trỏ cloud mà thiếu `--cloud` thì dừng, và luôn in rõ host đang trỏ
  2. Chạy lại cùng bộ file lần hai: 0 phiếu thêm, 0 phiếu sửa — nhận diện theo số phiếu KiotViet + dấu vân tay nội dung
  3. Phiếu bị sửa trên KiotViet → phiếu cũ hủy bằng bút toán đảo, ghi phiếu mới; phiếu "Đã hủy" trên KiotViet → hủy theo; không xóa gì khỏi sổ cái
  4. Mỗi phiếu tạo + dòng + ghi sổ trong MỘT RPC Postgres (một transaction); xuất âm tự gắn lý do lệch tồn
  5. Đối tác/mã hàng mới hoặc đổi trên KiotViet được upsert trước khi nạp chứng từ
  6. Bảng nhật ký sync (có RLS) ghi mỗi lần chạy: file, số phiếu thêm/sửa/hủy/bỏ qua/lỗi; báo cáo markdown ở `data/kiotviet-sync/reports/`, file đã xử lý chuyển sang `processed/<ngày>/`
  7. Báo cáo đối chiếu tồn hệ mới với cột tồn file sản phẩm; `--can-ton` sinh phiếu Điều chỉnh đưa về khớp
  8. README hướng dẫn export từng màn KiotViet (bộ lọc, khoảng ngày) và lệnh chạy hằng ngày

**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 21 to break down)

### Phase 22: Tối ưu truy vấn khi dữ liệu phình theo thời gian (Wave 0 + Wave 1)

**Goal**: Có thước đo hiệu năng ở quy mô 5 năm (~1 triệu dòng sổ cái), và mọi đường đọc theo ngày / theo số phiếu / xóa dòng phiếu đi qua index thay vì quét cả bảng — không đổi dữ liệu, không đổi kết quả trả về của RPC nào.
**Depends on**: Không phụ thuộc phase đang mở. Migration đánh số sau 0123. Audit đầy đủ (số đo phonzy, 13 rủi ro xếp hạng, Wave 2–4 để sau): `.planning/phases/22-toi-uu-du-lieu-lon/22-AUDIT.md`
**Requirements**: TBD
**Success Criteria** (what must be TRUE):

  1. Script sinh dữ liệu quy mô 5 năm trên Supabase LOCAL (chặn mọi host khác 127.0.0.1/localhost), ghi qua RPC ghi sổ để trigger tồn/giá vốn chạy thật, đánh dấu để dọn được; chạy lại không nhân đôi
  2. Script benchmark gọi các RPC trong bảng rủi ro của audit qua supabase-js bằng tài khoản quản lý và thủ kho, in p50/p95, lưu kết quả để so trước/sau
  3. Có baseline đo ở hai mức (dữ liệu hiện tại và 5 năm) TRƯỚC khi áp migration index
  4. Một migration thêm index cho: khóa ngoại thiếu index (`kho_movement.chung_tu_dong_id`, `chung_tu.chung_tu_goc_id`, `de_nghi_gop_ma.chung_tu_id`), lọc ngày (`kho_movement.ngay`, `chung_tu.created_at`/`ngay_ghi_so`, `don_dat_hang.ngay_dh`, `nhat_ky_sua(bang, sua_luc)`), thứ tự danh sách chứng từ, trigram cho `so_ct`/`so_dh`; bỏ index chết trên cột đã ngừng dùng
  5. Các RPC lọc sổ cái/chứng từ theo ngày viết lại điều kiện dùng được index (không bọc `at time zone`/cast quanh cột) — pgTAP chứng minh kết quả cũ và mới TRÙNG KHỚP trên cùng bộ dữ liệu, kể cả bút toán đảo và ranh giới nửa đêm giờ Việt Nam
  6. `EXPLAIN` xác nhận xóa dòng phiếu, `danh_sach_don`, `tim_kiem_toan_cuc` (số phiếu/số đơn) dùng index; benchmark sau migration được ghi vào SUMMARY cạnh baseline
  7. `npm run check`, pgTAP local và `npm run test:integration` xanh

**Plans**: 7 plans

Plans:
- [ ] 22-01-PLAN.md — W1: Guard LOCAL dùng chung, 5 lệnh bench:*, danh mục BENCH + tồn đầu kỳ, bench:clean
- [ ] 22-02-PLAN.md — W2: Bộ sinh chứng từ theo ngày qua đường ghi sổ thật (bench:seed, 99 ngày → 5 năm)
- [ ] 22-03-PLAN.md — W3: Bộ đo RPC qua PostgREST bằng quản lý + thủ kho (bench:run, bench:compare)
- [ ] 22-04-PLAN.md — W4: bench:explain + baseline 99 ngày và 5 năm TRƯỚC migration (cổng chặn D-12)
- [ ] 22-05-PLAN.md — W5: Migration 0124 — index khóa ngoại, lọc ngày, danh sách chứng từ, trigram; bỏ index chết
- [ ] 22-06-PLAN.md — W6: pgTAP 115 so khớp hàm cũ/mới + migration 0125 điều kiện ngày dùng được index
- [ ] 22-07-PLAN.md — W7: Đo lại 5 năm + EXPLAIN sau, cổng check / db:test / test:integration
