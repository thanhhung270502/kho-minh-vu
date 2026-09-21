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

- [ ] **Phase 1: Nền dữ liệu** - Schema 13 bảng, sổ cái bất biến, trigger tồn kho + giá vốn, RLS bốn vai trò, chuyển danh mục thật — kiểm chứng bằng SQL, chưa có giao diện
- [ ] **Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt** - Đăng nhập, danh mục 3.266 mã, đối tác NCC/khách chung danh sách, cấu hình dữ liệu nền
- [ ] **Phase 3: Phiếu nhập** - Luồng chứng từ hoàn chỉnh đầu tiên: tạo, thêm dòng, ghi sổ, hủy đảo, in — giá vốn bình quân chạy thật
- [ ] **Phase 4: Đơn đặt hàng & Phiếu xuất** - Nhân bản cơ chế chứng từ cho chiều xuất, đơn đặt → duyệt → in đi lấy hàng → phiếu xuất, chạy trọn luồng trên máy tính văn phòng
- [ ] **Phase 5: Tồn kho & Thẻ kho** - Tồn theo mã × kho, thẻ kho có tồn lũy kế, đề xuất định mức và cảnh báo sắp hết
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

- [ ] 04-12-PLAN.md — duyệt đơn theo vai trò, in phiếu đi lấy hàng, nút tạo phiếu xuất từ đơn
- [ ] 04-13-PLAN.md — ghi sổ phiếu xuất: lý do xuất âm bắt buộc, tóm tắt hậu quả, gợi ý gộp mã

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
- [ ] 05-00-PLAN.md — [CHẶN] trang bị bản làm việc: npm install, .env.local, supabase login, file KiotViet (wave 1)
- [x] 05-01-PLAN.md — RPC `danh_sach_ton_kho`: tồn theo mã × kho, lọc + phân trang server (wave 1)
- [ ] 05-02-PLAN.md — Thêm cột tồn lũy kế vào `the_kho_san_pham` (wave 2)
- [ ] 05-03-PLAN.md — RPC đề xuất và duyệt định mức tồn tối thiểu (wave 2)
- [ ] 05-04-PLAN.md — RPC `nap_ton_tam` qua một chứng từ DIEU_CHINH (wave 2)
- [ ] 05-05-PLAN.md — [BLOCKING] db:push, db:types, chạy toàn bộ pgTAP (wave 3)
- [ ] 05-06-PLAN.md — Lớp dữ liệu feature inventory: kiểu, bộ lọc URL, api, hook (wave 4)
- [ ] 05-07-PLAN.md — Màn tồn kho `/ton-kho` (wave 5)
- [ ] 05-08-PLAN.md — Mở rộng thẻ kho đã có: cột lũy kế + link chứng từ (wave 4)
- [ ] 05-09-PLAN.md — Màn duyệt đề xuất định mức `/ton-kho/dinh-muc` (wave 5)
- [ ] 05-10-PLAN.md — Nạp tồn tạm từ file KiotViet `/ton-kho/nap-tam` (wave 5)
- [ ] 05-11-PLAN.md — Menu, ma trận quyền route, bộ kiểm toàn dự án, UAT (wave 6)

**UI hint**: yes

### Phase 6: Kiểm kê & Go-live

**Goal**: Số liệu tồn đầu kỳ đúng với thực tế đếm được (không bê nguyên số sai từ
KiotViet), dữ liệu lịch sử tra cứu được, và hệ thống ở trạng thái sẵn sàng để toàn
bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới mà không ai phải mở
KiotViet để đối chiếu.
**Depends on**: Phase 5
**Requirements**: KKE-01, KKE-02, KKE-03, KKE-04, DLIEU-05, DLIEU-06, DLIEU-07, XUAT-03, XUAT-08, TON-03, TON-04, TON-05, TQAN-01, TQAN-03, TQAN-04, TQAN-05, TQAN-06

> ⚠️ **Chặng này đang gánh 17 yêu cầu** sau hai lần dời (XUAT-03/08 từ Phase 4 ngày
> 20/09; tám yêu cầu tồn kho & tổng quan từ Phase 5 cùng ngày). Vai trò gốc của nó là
> chốt số liệu để go-live. **Nên tách trước khi lập kế hoạch** — ba nhóm tách được rõ:
> kiểm kê + chốt số liệu (gốc) · trang tổng quan (TQAN-01, 03, 04, 05, 06 + TON-03) ·
> màn mobile & quét mã (XUAT-03, XUAT-08, TON-05, KKE-02).
**Success Criteria** (what must be TRUE):

  1. Mở phiên kiểm kê theo kho và nhóm hàng, hệ thống chốt tồn sổ tại đúng thời điểm đếm; đếm bằng quét mã trên điện thoại
  1b. Màn xuất hàng dùng được trên điện thoại và thêm dòng bằng quét barcode qua camera (XUAT-03, XUAT-08 — dời từ Phase 4 sang vì dùng chung thư viện quét và khuôn màn mobile với kiểm kê; chốt 20/09). Chặn trước: 0/3.270 mã đang có barcode — phải quyết in tem hay quét mã nhà sản xuất

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
| 5. Tồn kho & Tổng quan | 1/12 | In Progress|  |
| 6. Kiểm kê & Go-live | 0/TBD | Not started | - |
