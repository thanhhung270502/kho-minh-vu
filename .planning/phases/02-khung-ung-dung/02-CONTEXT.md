# Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt - Context

**Gathered:** 2026-09-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Ứng dụng thật đầu tiên người dùng chạm vào, dựng trên nền dữ liệu Phase 1:

- Đăng nhập, phiên, chặn route, đăng xuất, đổi mật khẩu; khung app có menu theo vai trò.
- Danh mục 3.266 mã hàng: bảng server-side, tìm không dấu, tạo/sửa, chi tiết kèm thẻ kho,
  công cụ rà dữ liệu hàng loạt, import/export Excel.
- Đối tác: NCC + khách trong một danh sách, tạo/sửa, lịch sử giao dịch; dựng danh sách
  khách hàng thật từ ô Ghi chú hóa đơn KiotViet (DLIEU-04).
- Cài đặt: người dùng & vai trò, kho, nhóm hàng/ĐVT/công đoạn, quy tắc đánh số chứng từ.

18 yêu cầu: AUTH-01, AUTH-02, AUTH-07, DMUC-01..07, DTAC-01..03, DLIEU-04, CDAT-01..04.

**Không có chứng từ trong phase này.** Phiếu nhập là Phase 3, phiếu xuất Phase 4. Tồn của mọi
mã hiện bằng 0 và `kho_movement` rỗng — màn nào đọc tồn/thẻ kho phải xử lý đúng trạng thái đó.

</domain>

<decisions>
## Implementation Decisions

### Office Hours — nỗi đau, phạm vi, giả định rủi ro

- **Nỗi đau (cả bốn):** chưa ai dùng được hệ thống · tra mã hàng chậm · danh mục sai mà không
  sửa được · không kiểm soát được ai sửa gì.
- **Phạm vi:** đủ 18 yêu cầu như roadmap, không cắt.
- **Cả bốn giả định bị người dùng đánh dấu là đáng lo.** Mỗi giả định có biện pháp đối ứng
  trong quyết định bên dưới — planner không được bỏ biện pháp nào:

| Giả định có thể sai | Đối ứng |
|---|---|
| Văn phòng chịu bỏ KiotViet | D-21, D-22, D-27: dữ liệu KiotViet cũ hiện ngay trong thẻ kho và lịch sử đối tác; import nhận luôn file KiotViet; tìm không dấu |
| 8 tên trong Ghi chú là khách sỉ | D-28..D-31: **sai một phần** — người dùng xác nhận lẫn cả khách và sale. Không tự phân loại |
| Rà 356 mã làm được trong màn danh mục | D-18: bốn công cụ rà hàng loạt, không chỉ form từng mã |
| Người dùng tự quản lý tài khoản | D-01..D-04: tên đăng nhập thay email, mật khẩu tạm, quản lý đặt lại tại chỗ |

### Đăng nhập & tài khoản

- **D-01:** Đăng nhập bằng **tên đăng nhập + mật khẩu**, không phải email. App ghép tên thành
  email nội bộ `<ten>@khominhvu.local` trước khi gọi Supabase Auth (4 tài khoản demo đã theo
  quy ước này). Tên chuẩn hóa: chữ thường, không dấu, chỉ `[a-z0-9._-]`. Đây là lệch chữ có chủ
  đích với AUTH-01 ("email") — bên dưới vẫn là email/password của Supabase. Hệ quả: **không có
  tự khôi phục mật khẩu qua email.**
- **D-02:** **Quản lý tạo tài khoản** trong Cài đặt: họ tên, tên đăng nhập, vai trò, kho (D-06),
  mật khẩu tạm. Tạo bằng Supabase Admin API **chạy phía server** (Route Handler hoặc Server
  Action, client admin đánh dấu `server-only`, key `SUPABASE_SERVICE_ROLE_KEY` không bao giờ
  vào `NEXT_PUBLIC_*`). Server tự kiểm người gọi là `quan_ly` bằng `getUser()` + `nguoi_dung`,
  không tin claim gửi từ client. Tạo auth user + `nguoi_dung` + gán kho phải trọn vẹn: bước sau
  lỗi thì xóa auth user vừa tạo.
- **D-03:** **Bắt đổi mật khẩu lần đầu.** Cờ `phai_doi_mat_khau` bật khi tạo và khi quản lý đặt
  lại mật khẩu. Cờ bật thì mọi route nội bộ chuyển về `/doi-mat-khau`. Người dùng tự đổi mật khẩu
  được bất cứ lúc nào từ menu tài khoản.
- **D-04:** Nhân viên nghỉ việc: **vô hiệu hóa, không xóa.** `nguoi_dung.dang_hoat_dong = false`
  + chặn đăng nhập ở Auth (ban) + thu hồi phiên. Mở lại được. Tên vẫn hiện trong nhật ký sửa
  và lịch sử chứng từ.
- **D-05:** Đổi vai trò, đổi kho, vô hiệu hóa phải có hiệu lực nhanh. **Research phải kiểm
  chứng cơ chế thật trước khi plan:** ghi chú ở Phase 1 (`auth.admin.signOut(userId, 'others')`)
  nhiều khả năng sai chữ ký — hàm admin `signOut` của supabase-js nhận JWT của phiên, không nhận
  userId. Access token đang sống vẫn hợp lệ tới hết TTL (`jwt_expiry = 3600`). Các hướng cần so:
  xóa phiên trong `auth.sessions`/refresh token, rút TTL, hay kiểm `dang_hoat_dong` trong helper
  RLS. Planner chọn một hướng và **ghi rõ độ trễ tối đa** trước khi quyền cũ hết hiệu lực.
- **D-06:** Thủ kho gắn **một hoặc nhiều kho** — **lệch schema Phase 1** (hiện `nguoi_dung.kho_id`
  một giá trị, claim `kho_id` một uuid). Hướng làm: bảng nối người dùng–kho; hook đưa mảng kho
  vào JWT; helper `kho_hien_tai()` thay bằng helper trả mảng; RLS đổi `kho_id = (select ...)`
  thành `kho_id = any((select ...))`, **vẫn bọc `select`** (Phase 1 D-15). Tác động đo được:
  10 tham chiếu trong `0003`, `0016`, `0020` và `supabase/tests/30_rls_test.sql`. Backfill từ
  `nguoi_dung.kho_id`. **Xóa cột `kho_id` cũ là đổi cột trên database thật → hỏi người dùng lúc
  execute** (CLAUDE.md "Không tự ý làm"); mặc định giữ cột, ngừng đọc. pgTAP phải có ca thủ kho 2
  kho thấy cả hai và thủ kho 1 kho không thấy kho kia. `scripts/verify-hook.ts` cập nhật theo.
- **D-07:** Mục menu và nút mà vai trò không có quyền thì **ẩn hẳn**, không hiện mờ. Database vẫn
  là lớp chặn thật (RLS Phase 1 đã có). Gõ thẳng URL không có quyền → trang "Không đủ quyền" có
  hướng dẫn, không phải trang trắng hay 404.

  | | quản lý | văn phòng | thủ kho | chỉ xem |
  |---|---|---|---|---|
  | Danh mục, Đối tác — xem | ✓ | ✓ | ✓ | ✓ |
  | Danh mục, Đối tác — tạo/sửa/import/rà | ✓ | ✓ | | |
  | Giá vốn — xem (D-16) | ✓ | ✓ | | |
  | Giá bán — sửa (D-15) | ✓ | | | |
  | Cài đặt: Nhóm hàng / ĐVT / Công đoạn | ✓ | ✓ | | |
  | Cài đặt: Người dùng / Kho / Số chứng từ | ✓ | | | |

  Ma trận khớp policy ở `0015_rls_danh_muc.sql` — không đổi quyền ghi của Phase 1.

### Cài đặt

- **D-08:** Đánh số chứng từ (CDAT-04): **sửa được tiền tố và số chữ số** theo từng loại; reset
  theo năm giữ nguyên (Phase 1 D-21); xem được số đang chạy năm nay. **Không cho sửa hay lùi số
  hiện tại.** Hiện tiền tố đang hard-code trong `sinh_so_ct` (`0009_danh_so.sql`) → cần bảng cấu
  hình và sửa hàm đọc từ đó. Validate: tiền tố `[A-Z0-9]` 1–5 ký tự, không trùng giữa các loại;
  số chữ số 3–8. Đổi giữa năm: số mới dùng định dạng mới, số đã phát giữ nguyên. Chỉ quản lý.
- **D-09:** Kho (CDAT-02): tạo, sửa, ngừng hoạt động. Không xóa. Chỉ quản lý.
- **D-10:** Nhóm hàng / ĐVT / công đoạn (CDAT-03): danh sách phẳng + ngăn kéo sửa. Nhóm hàng chọn
  được nhóm cha (`parent_id`) nhưng không làm cây kéo-thả. Xóa chỉ khi chưa mã nào dùng — lỗi
  khóa ngoại `23503` hiện thành "Đang có N mã hàng dùng …". Quản lý + văn phòng.

### Danh mục hàng hóa

- **D-11:** Bảng server-side (DMUC-01..03): phân trang, sắp xếp, lọc chạy ở database, trả tổng số
  dòng. Lọc: nhóm hàng, công đoạn, ĐVT, trạng thái tồn, trạng thái kinh doanh, "Cần rà" (D-18).
  Tìm một ô theo mã + tên, dùng **cùng biểu thức tìm** với `tim_san_pham` (`0022`: ILIKE trên
  `f_unaccent` + `word_similarity`, qualify `operator(extensions.<%)`). Bộ lọc, trang, sắp xếp
  nằm trên URL query — refresh hay gửi link giữ nguyên.
- **D-12:** Trạng thái tồn: Còn hàng / Hết hàng (= 0) / Âm / Dưới định mức. **Mọi mã đang tồn 0**
  cho tới Phase 3 — bộ lọc vẫn hiện, không ẩn; cột tồn hiện 0 kèm gợi ý "chưa có chứng từ".
- **D-13:** Tạo/sửa mã hàng trong **ngăn kéo (Drawer) bên phải**. Bảng phía sau giữ bộ lọc và vị
  trí cuộn; sửa xong mã này mở được mã kế. Chi tiết + thẻ kho là **trang riêng** (D-21).
- **D-14:** `dvt` và `cong_doan` là hai Select độc lập (DMUC-04); `quy_doi` > 0, mặc định 1
  (Phase 1: 148 mã CẶP đều quy đổi 1 — không tự đặt 2); kho mặc định chọn từ danh sách kho
  (`kho_mac_dinh_id`, không phải `vi_tri_ke`).
- **D-15:** Giá bán: **giữ chặn của Phase 1**. Văn phòng thấy ô giá bán khóa (tạo mới = 0), quản
  lý sửa được. Không đổi trigger `chan_sua_gia_khong_du_quyen`.
- **D-16:** Giá vốn **chỉ quản lý + văn phòng thấy**, thủ kho và chỉ xem không — **chặn ở
  database**, không chỉ ẩn cột. Bẫy kỹ thuật cho research: quyền cột áp theo SQL role, cả 4 vai
  trò cùng role `authenticated` nên `REVOKE SELECT (gia_von)` không phân biệt được vai trò (bài học
  `.memory/patterns/supabase-rls-bao-mat.md`). Research chọn cơ chế (vd. thu quyền đọc cột khỏi
  `authenticated` + đọc qua view/RPC kiểm `vai_tro_hien_tai()`), và phủ **mọi chỗ lộ giá vốn**:
  `san_pham.gia_von`, `kho_movement.gia_von_tai_thoi_diem`, `chung_tu_dong` nếu có, export Excel.
  pgTAP bắt buộc: thủ kho và chỉ xem không đọc được giá vốn bằng bất kỳ đường nào.
- **D-17:** Mã không dùng nữa → **Ngừng kinh doanh** (`dang_kinh_doanh = false`), không xóa. Bảng
  mặc định lọc "Đang kinh doanh"; mã ngừng vẫn xem được qua bộ lọc và trong thẻ kho. Ô tìm lúc lập
  phiếu (Phase 3–4) sẽ loại mã ngừng.
- **D-18:** Rà dữ liệu hàng loạt — **dùng cả bốn công cụ**:
  1. **Chọn nhiều dòng → gán hàng loạt** công đoạn / nhóm hàng / ĐVT / trạng thái kinh doanh.
     Một lệnh, một transaction.
  2. **Gợi ý công đoạn theo đuôi mã:** liệt kê mã `MUA_NGOAI` có đuôi `-CB`/`-X`/`-S`/`-N` kèm
     công đoạn đề xuất (145 mã trên dữ liệu hiện tại, độ khớp ~95% — quy ước ở
     `.memory/knowledge/du-lieu-kiotviet.md`). Người dùng bỏ tick dòng sai rồi áp dụng. **Không tự
     ghi khi chưa ai xác nhận.**
  3. **Bộ lọc nhanh "Cần rà"** kèm bộ đếm lùi: (a) mã `MUA_NGOAI` không thuộc `Hàng Hãng - L5/6` /
     `Hàng Ngoài - L5/6` và không có đuôi công đoạn (~356 mã); (b) 8 mã ĐVT mâu thuẫn (D-19).
  4. **Sửa trực tiếp trên ô bảng** — chỉ cho công đoạn, nhóm hàng, ĐVT (Select, khó gõ sai). Tên,
     mã, quy đổi, tồn min/max vẫn qua ngăn kéo.
- **D-19:** 8 mã có ô ĐVT mâu thuẫn tên/đuôi (danh sách ở `01-UAT.md` mục "Cần người quyết"):
  **giữ nguyên dữ liệu, gắn cờ vào "Cần rà"**. Người rành hàng sửa hoặc bấm "Giữ như cũ" thì gỡ cờ.
  Không migration sửa dữ liệu tự động.
- **D-20:** **Nhật ký từng lần sửa** cho `san_pham`, `doi_tac` và thay đổi vai trò/kho/trạng thái
  của `nguoi_dung`: bảng, bản ghi, trường, giá trị cũ → mới, người sửa (`auth.uid()`), thời điểm,
  nguồn (form / sửa trên ô / hàng loạt / gợi ý đuôi / import / rà ghi chú). Ghi bằng trigger, nên
  mọi đường ghi đều bị bắt. **Append-only như sổ cái** (REVOKE + trigger chặn UPDATE/DELETE). Tab
  "Lịch sử sửa" trong chi tiết mã và chi tiết đối tác. Import 1.000 mã sinh nhiều dòng nhật ký —
  chấp nhận, index theo (bảng, bản ghi, thời điểm). Quy tắc global "no audit logs unless asked"
  không áp — người dùng yêu cầu rõ.
- **D-21:** Chi tiết mã (DMUC-05) ở trang riêng: thông tin mã + thẻ kho + lịch sử sửa. Thẻ kho
  gồm `kho_movement` của mã (rỗng tới Phase 3) **và các dòng nhập/hóa đơn KiotViet cũ** của mã đó
  từ bảng lưu trữ, gắn nhãn "KiotViet", chỉ đọc, **không cộng vào tồn**. Thủ kho chỉ thấy kho mình.
  Component thẻ kho dựng để Phase 5 (TON-02) dùng lại.

### Import / Export Excel

- **D-22:** Import **nhận cả hai định dạng**, nhận diện theo dòng tiêu đề: mẫu của hệ mới, và file
  `DanhSachSanPham` export từ KiotViet (tách ĐVT/công đoạn bằng đúng logic
  `scripts/import-kiotviet/tach-dvt-cong-doan.ts` — dùng chung một nguồn, không chép). File KiotViet:
  bỏ qua cột giá vốn và tồn; không đọc được tiêu đề → báo lỗi file kèm danh sách cột mong đợi.
  Nhớ bẫy Phase 1: exceljs đọc file KiotViet phải bỏ qua styles.
- **D-23:** Export theo **mẫu hệ mới**, đúng bộ lọc + từ khóa đang áp (toàn bộ kết quả, không chỉ
  trang đang xem). File export mở ra sửa rồi import lại được ngay. Có nút tải file mẫu trống. Cột
  giá vốn chỉ có khi người export có quyền (D-16); import luôn bỏ qua cột giá vốn.
- **D-24:** Mã đã có → **cập nhật theo mã**: mã mới thì thêm; mã có sẵn thì sửa các ô có giá trị,
  ô trống giữ nguyên. Mọi thay đổi vào nhật ký (D-20, nguồn = import). Văn phòng import mã có giá
  bán ≠ giá hiện tại → lỗi dòng (trigger D-15).
- **D-25:** **Xem trước rồi xác nhận.** Tải file → tóm tắt: X dòng thêm, Y dòng sửa (hiện cũ → mới
  theo trường), dòng không đổi, Z dòng lỗi kèm lý do theo dòng + cột. Có lỗi thì không cho nạp,
  tải được file lỗi (file gốc + cột "Lỗi"). Sạch thì bấm "Nạp": **một transaction, validate lại ở
  server** — không tin kết quả xem trước vì dữ liệu có thể đổi giữa hai bước (DMUC-06 "không nạp nửa
  vời").
- **D-26:** Tên nhóm hàng / ĐVT / công đoạn / kho chưa có trong hệ → **lỗi dòng**, không tự tạo.

### Đối tác & khách hàng thật

- **D-27:** Lịch sử giao dịch (DTAC-03) gồm **chứng từ mới + dữ liệu KiotViet cũ** gắn nhãn, chỉ
  đọc, gom theo phiếu/hóa đơn. NCC khớp theo mã ở đầu chuỗi `luu_tru_nhap_kiotviet.nha_cung_cap`
  (nhớ `0317415317` đã đổi thành `NCC900001`). Khách khớp qua bảng ánh xạ ghi chú (D-29).
- **D-28:** Người dùng xác nhận các tên ngắn trong Ghi chú **lẫn cả khách và sale**. Dữ liệu 923
  hóa đơn (soi 2026-09-13): 699 có ghi chú, **150 giá trị khác nhau**; ~20 tên ngắn (NGỌC 59, TỐT
  50, PHƯƠNG 48, OANH 45, QUỲNH 42…) chiếm ~600 hóa đơn; ~130 giá trị dài giống tên cửa hàng +
  địa chỉ, mỗi giá trị 1–2 hóa đơn; có giá trị ghép ("PHƯƠNG BÁN LẺ", "HIỀN THẮNG V.T-PHƯƠNG",
  "DẬU CB" — Dậu trùng tên người bán Chề Quay Dậu); 224 hóa đơn không ghi chú. **Hệ thống không tự
  phân loại** — mọi phân loại do người của công ty quyết.

### Claude's Discretion

Người dùng yêu cầu "tự quyết định toàn bộ" các câu còn lại. Đã chọn phương án đề xuất:

- **D-29:** DLIEU-04 làm bằng **màn "Rà ghi chú" trong app** (thuộc khu Đối tác), không qua Excel.
  Mỗi giá trị ghi chú chuẩn hóa (trim, upper, gộp khoảng trắng) một dòng kèm số hóa đơn, khoảng ngày,
  vài hóa đơn mẫu. Hành động: **Tạo khách mới** (điền sẵn tên, sửa được) / **Gộp vào khách đã có** /
  **Là sale** / **Khách + sale** (giá trị ghép) / **Bỏ qua**. Lưu từng quyết định ngay — làm dở được,
  có bộ đếm "còn N giá trị chưa rà". Quyết định lưu ở bảng ánh xạ ghi chú → khách/sale. Quản lý +
  văn phòng.
- **D-30:** Giá trị xếp là "sale" **chỉ gắn nhãn** (tên sale dạng text) trong bảng ánh xạ. Danh mục
  nhân viên sale và việc gắn người phụ trách vào đơn/phiếu xuất để Phase 4 — không thêm danh mục mới
  ở Phase 2.
- **D-31:** 224 hóa đơn không ghi chú gắn vào một đối tác chung **"Khách lẻ"** (loại KHACH, mã cố
  định), dùng lại được cho phiếu xuất sau này. Giá trị "Bỏ qua" không gắn đối tác nào, vẫn tra được
  trong bảng lưu trữ.
- **D-32:** Mã khách tự sinh `KH000001` tăng dần (cùng kiểu `NCC000001`), sửa được lúc tạo. Tạo đối
  tác tay cũng gợi ý mã theo loại.
- **D-33:** Danh sách đối tác (DTAC-01): một bảng, lọc NCC / KHACH / CA_HAI (`CA_HAI` hiện trong cả
  bộ lọc NCC lẫn KHACH), tìm không dấu theo mã / tên / SĐT, form ngăn kéo như danh mục, ngừng hoạt
  động thay vì xóa. NCC ảo NB001/NB002 vẫn không có trong `doi_tac`.
- **D-34:** Viết lại `src/shared/components/app-shell.tsx`: tên "Kho Minh Vũ"; xóa route phạm vi cũ
  `/san-xuat`, `/bao-cao`, `/kho` và nội dung "xưởng"; menu Phase 2 gồm Tổng quan, Danh mục, Đối tác,
  Cài đặt (phase sau tự thêm mục của mình). Header có họ tên + vai trò + menu Đổi mật khẩu / Đăng
  xuất (AUTH-07). Dưới 992px menu thu về 0 như hiện tại.
- **D-35:** `src/proxy.ts` chặn route nội bộ → `/dang-nhap?tiep_tuc=<đường-dẫn>` (khung comment đã có
  sẵn). `tiep_tuc` chỉ nhận đường dẫn nội bộ bắt đầu bằng `/` và không bằng `//` — chống open
  redirect. Đã đăng nhập mà vào `/dang-nhap` thì về `/`.
- **D-36:** `src/shared/lib/errors.ts`: đổi "xưởng" thành "kho", "lô" thành "mã hàng"; thêm thông
  báo sai tên/mật khẩu và tài khoản bị vô hiệu hóa.
- **D-37:** Thư mục feature: `xac-thuc`, `danh-muc`, `doi-tac`, `cai-dat`. Cập nhật bảng feature ở
  `src/features/README.md` (đang mô tả phạm vi sản xuất cũ).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Đặc tả & quyết định
- `.planning/PROJECT.md` — Core Value, ràng buộc, Key Decisions
- `.planning/REQUIREMENTS.md` — 18 yêu cầu của Phase 2
- `.planning/ROADMAP.md` §Phase 2 — 5 success criteria (criterion 1 ghi "email/mật khẩu": xem D-01)
- `.planning/phases/01-nen-du-lieu/01-CONTEXT.md` — quyết định Phase 1 còn hiệu lực (D-08 giá vốn
  toàn công ty, D-15 helper bọc `select`, D-21 đánh số, D-23 SQLSTATE)
- `.planning/phases/01-nen-du-lieu/01-UAT.md` — danh sách 8 mã ĐVT mâu thuẫn, số liệu 356/145 mã
- Tài liệu thiết kế gốc (artifact): `https://claude.ai/code/artifact/3e37d306-5acd-4803-bbdc-aaad139b154b`

### Bộ nhớ dự án
- `.memory/index.md`
- `.memory/patterns/supabase-rls-bao-mat.md` — quyền cột theo SQL role (D-16), view `security_invoker`,
  qualify toán tử khi khóa `search_path`
- `.memory/patterns/pgtap-va-test.md` — false pass do trùng mã lỗi, test đếm không giả định bảng rỗng
- `.memory/knowledge/du-lieu-kiotviet.md` — quy ước đuôi mã, cột "Vị trí" là kho, NCC ảo, ghi chú
- `.memory/blockers/mo-sau-phase-1.md` — việc chuyển sang Phase 2, việc trước go-live

### Database hiện có
- `supabase/migrations/0003_nguoi_dung_kho.sql` — `nguoi_dung`, helper `vai_tro_hien_tai()` / `kho_hien_tai()` (D-06)
- `supabase/migrations/0009_danh_so.sql` — `chuoi_so_ct`, `sinh_so_ct` tiền tố hard-code (D-08)
- `supabase/migrations/0014_auth_hook.sql` — custom access token hook (D-05, D-06)
- `supabase/migrations/0015_rls_danh_muc.sql` — policy ghi danh mục, quyền cột, trigger giá bán (D-07, D-15, D-16)
- `supabase/migrations/0016_rls_chung_tu.sql` — RLS theo kho (D-06)
- `supabase/migrations/0022_tim_kiem_theo_chuoi_con.sql` — biểu thức tìm kiếm (D-11)
- `supabase/migrations/0024_nap_danh_muc_day_du.sql`, `0025_kho_mac_dinh.sql` — RPC nạp danh mục, `kho_mac_dinh_id`
- `supabase/tests/` — 89 pgTAP; helper `00_helper.sql.inc`
- `supabase/README.md` — quy trình migration trên cloud, sửa lịch sử migration

### Quy ước code
- `CLAUDE.md` — quy trình build feature 7 bước, bốn trạng thái UI, bẫy antd/Tailwind/proxy.ts
- `~/.claude/rules/project/DATABASE_RULES.md` — dự án lệch có chủ đích ở khóa ngoại (Phase 1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/client.ts` / `server.ts` / `middleware.ts` — ba client chuẩn (`getUser()`).
- `src/proxy.ts` — đã có khung comment redirect `/dang-nhap?tiep_tuc=` (D-35).
- `src/shared/components/query-state.tsx` — bốn trạng thái, bỏ nút Thử lại khi hết phiên/thiếu quyền.
- `src/shared/components/page-header.tsx`, `chua-trien-khai.tsx` — tiêu đề trang, placeholder.
- `src/shared/lib/errors.ts` — map SQLSTATE → thông báo tiếng Việt (sửa chữ ở D-36).
- `src/providers/` — AntdRegistry có `layer`, QueryClient, theme token.
- `scripts/_supabase-admin.ts` — mẫu tạo client service_role phía server (dùng cho D-02).
- `scripts/import-kiotviet/doc-file.ts`, `tach-dvt-cong-doan.ts` — đọc Excel KiotViet, tách ĐVT (D-22).
- RPC `tim_san_pham(text, int)` — tìm không dấu, xếp mã phát sinh gần đây trước.
- `src/types/database.types.ts` — sinh lại sau mọi migration của phase này.

### Established Patterns
- Tên file, route, bảng, cột, hàm: tiếng Việt không dấu.
- Migration `NNNN_ten_khong_dau.sql`, tiếp theo là **0026**. Áp bằng `npm run db:push` (không dùng MCP
  `apply_migration` — sinh version timestamp lệch).
- RPC ném SQLSTATE có nghĩa: `23514` quy tắc nghiệp vụ, `42501` quyền.
- View bật `security_invoker = on`; hàm khóa `search_path = ''`, qualify `extensions.*`.
- pgTAP chạy `npm run db:test:linked` (cần Docker cho pg_prove).

### Integration Points
- `src/app/(app)/` — route nội bộ; `layout.tsx` bọc `AppShell`. Route `/dang-nhap`, `/doi-mat-khau`
  nằm ngoài group `(app)`.
- Route cũ cần xóa: `src/app/(app)/san-xuat`, `bao-cao`, `kho` (D-34).
- Bảng lưu trữ `luu_tru_nhap_kiotviet` (594 dòng), `luu_tru_hoa_don_kiotviet` (4.732 dòng) — nguồn cho
  D-21, D-27, D-29.
- `.env.example` — biến mới (nếu có) phải thêm vào đây.

</code_context>

<specifics>
## Specific Ideas

- Ngày đầu mở app, văn phòng phải thấy **dữ liệu thật quen thuộc** (lịch sử hóa đơn, phiếu nhập cũ)
  chứ không phải bảng trống — đó là đối ứng chính cho rủi ro "không chịu bỏ KiotViet".
- Bộ đếm lùi "Cần rà" và "còn N ghi chú chưa rà" biến việc dọn dữ liệu thành việc có điểm kết thúc.
- UAT Phase 2 nên có người văn phòng thật thao tác trên dữ liệu thật: tìm mã, sửa công đoạn một nhóm
  mã, rà 10 giá trị ghi chú.

</specifics>

<deferred>
## Deferred Ideas

- **Danh mục nhân viên sale + gắn người phụ trách vào đơn/phiếu xuất** — Phase 4 (từ D-30).
- **Loại mã ngừng kinh doanh khỏi ô tìm khi lập phiếu** — áp khi Phase 3–4 dùng `tim_san_pham`.
- **Tự khôi phục mật khẩu qua email** — không làm vì tài khoản dùng email nội bộ (D-01).
- **Cây nhóm hàng kéo-thả** — Phase 2 chỉ chọn nhóm cha.
- **Xóa cột `nguoi_dung.kho_id` cũ** — chỉ khi người dùng đồng ý lúc execute (D-06).
- **Trước go-live** (giữ nguyên từ Phase 1): xóa/đổi mật khẩu 4 tài khoản demo, bật Leaked Password
  Protection.

</deferred>

---

*Phase: 02-khung-ung-dung*
*Context gathered: 2026-09-13*
