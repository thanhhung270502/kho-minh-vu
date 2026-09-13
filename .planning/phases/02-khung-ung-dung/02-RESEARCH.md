# Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt - Research

**Researched:** 2026-09-13
**Domain:** Next.js 16 App Router + Supabase Auth/RLS/PostgREST, phân quyền cột theo vai trò trên chung một SQL role, exceljs server-side, phân trang server kết hợp trigram search, antd v6
**Confidence:** HIGH cho phần đã verify bằng docs chính thức + truy vấn trực tiếp trên database thật (cloud `phonzyruoalimgaovljm`); MEDIUM cho phần cộng đồng (session revocation, exceljs browser) vì Supabase không có tài liệu chính thức đầy đủ cho các case này.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Phạm vi

Ứng dụng thật đầu tiên người dùng chạm vào, dựng trên nền dữ liệu Phase 1: đăng nhập/phiên/khung
app theo vai trò; danh mục 3.266 mã hàng (bảng server-side, tìm không dấu, tạo/sửa, chi tiết + thẻ
kho, rà dữ liệu hàng loạt, import/export Excel); đối tác NCC+khách hàng thật từ Ghi chú KiotViet
(DLIEU-04); cài đặt (người dùng/vai trò, kho, nhóm hàng/ĐVT/công đoạn, đánh số chứng từ). 18 yêu
cầu: AUTH-01, AUTH-02, AUTH-07, DMUC-01..07, DTAC-01..03, DLIEU-04, CDAT-01..04. **Không có chứng từ
trong phase này** — tồn mọi mã = 0, `kho_movement` rỗng tới Phase 3.

### Locked Decisions (D-01 → D-28, xem toàn văn ở 02-CONTEXT.md)

Tóm tắt các quyết định có ảnh hưởng trực tiếp tới research (toàn văn D-01..D-28 trong CONTEXT.md,
không rút gọn lại các điều khoản pháp lý/nghiệp vụ ở đây):

- **D-01/D-03:** Đăng nhập bằng tên đăng nhập → ghép `@khominhvu.local` → Supabase Auth email/password.
  Bắt đổi mật khẩu lần đầu qua cờ `phai_doi_mat_khau`. Không có khôi phục mật khẩu qua email.
- **D-02:** Quản lý tạo tài khoản qua Admin API chạy **phía server** (server-only client, kiểm người
  gọi là `quan_ly` bằng `getUser()`, không tin claim client). Tạo auth user + `nguoi_dung` + gán kho
  phải trọn vẹn — lỗi giữa chừng thì xóa auth user.
- **D-04:** Nghỉ việc → vô hiệu hóa (`dang_hoat_dong=false`) + ban Auth + thu hồi phiên, không xóa.
- **D-05 (BẮT BUỘC RESEARCH):** Đổi vai trò/kho/vô hiệu hóa phải có hiệu lực nhanh. Ghi chú Phase 1
  `auth.admin.signOut(userId, 'others')` nghi sai chữ ký. Phải so sánh: xóa phiên trong
  `auth.sessions`/refresh token, rút TTL, hay kiểm `dang_hoat_dong` trong helper RLS — chọn một
  hướng, **ghi rõ độ trễ tối đa**.
- **D-06:** Thủ kho gắn **nhiều kho** — lệch schema Phase 1 (hiện 1 giá trị). Cần bảng nối, hook mảng,
  helper mảng, RLS `= any(...)` vẫn bọc `select`. Backfill từ `kho_id` cũ, **không xóa cột cũ** trừ
  khi hỏi người dùng lúc execute.
- **D-07:** Ẩn hẳn menu/nút không có quyền (không hiện mờ). Route không quyền → trang "Không đủ
  quyền", không phải 404/trắng. Ma trận quyền theo bảng ở CONTEXT.md (Danh mục/Đối tác xem: cả 4 vai
  trò; tạo/sửa/import/rà: quản lý+văn phòng; giá vốn xem: quản lý+văn phòng; giá bán sửa: chỉ quản
  lý; Cài đặt nhóm hàng/ĐVT/công đoạn: quản lý+văn phòng; Cài đặt người dùng/kho/số CT: chỉ quản lý).
- **D-08:** Sửa được tiền tố + số chữ số đánh số theo từng loại chứng từ; không sửa/lùi số hiện tại;
  `sinh_so_ct` (0009) đang hard-code tiền tố → cần bảng cấu hình.
- **D-09/D-10:** Kho/Nhóm hàng/ĐVT/Công đoạn: CRUD + ngừng hoạt động, không xóa cứng trừ khi 0 mã
  dùng (lỗi `23503` đọc được).
- **D-11 (BẮT BUỘC RESEARCH):** Bảng server-side: phân trang/sắp xếp/lọc chạy DB, trả tổng số dòng.
  Tìm 1 ô dùng **đúng biểu thức** `tim_san_pham` (0022: ILIKE `f_unaccent` + `word_similarity` qualify
  `operator(extensions.<%)`). Lọc + trang + sort trên URL query.
- **D-12:** Tồn mọi mã = 0 tới Phase 3, filter tồn vẫn hiện.
- **D-13:** Tạo/sửa trong Drawer bên phải; bảng phía sau giữ filter/scroll. Chi tiết + thẻ kho là
  trang riêng.
- **D-14:** `dvt`/`cong_doan` hai Select độc lập; `quy_doi > 0` mặc định 1; kho mặc định chọn từ
  `kho_mac_dinh_id` (không phải `vi_tri_ke`).
- **D-15:** Giữ nguyên chặn Phase 1 (giá bán: văn phòng khóa, quản lý sửa được). Không đổi trigger.
- **D-16 (BẮT BUỘC RESEARCH):** Giá vốn chỉ quản lý+văn phòng thấy, chặn **ở database** không chỉ ẩn
  UI. Bẫy: 4 vai trò cùng SQL role `authenticated`, `REVOKE SELECT` không phân biệt được vai trò.
  Phải chọn cơ chế phủ **mọi nơi** lộ giá vốn: `san_pham.gia_von`, `kho_movement.gia_von_tai_thoi_diem`,
  export Excel. pgTAP: thủ kho/chỉ xem không đọc được bằng bất kỳ đường nào.
- **D-17:** Mã không dùng → `dang_kinh_doanh=false`, không xóa. Mặc định lọc "Đang kinh doanh".
- **D-18:** 4 công cụ rà: gán hàng loạt, gợi ý công đoạn theo đuôi mã (145 mã, ~95% khớp, không tự
  ghi), filter "Cần rà" (~356 mã MUA_NGOAI vô căn cứ + 8 mã ĐVT mâu thuẫn D-19), sửa trên ô (chỉ
  công đoạn/nhóm/ĐVT — Select).
- **D-19:** 8 mã ĐVT mâu thuẫn: giữ nguyên dữ liệu, gắn cờ "Cần rà", có nút "Giữ như cũ" gỡ cờ.
- **D-20:** Nhật ký sửa theo dòng cho `san_pham`, `doi_tac`, thay đổi vai trò/kho/trạng thái
  `nguoi_dung`: bảng+trigger, append-only (REVOKE+trigger như sổ cái), ghi nguồn qua `set_config`.
- **D-21:** Chi tiết mã: thông tin + thẻ kho (`kho_movement` rỗng + dòng KiotViet cũ gắn nhãn, chỉ
  đọc, không cộng tồn) + lịch sử sửa. Thủ kho chỉ thấy kho mình. Component dùng lại ở Phase 5.
- **D-22 (BẮT BUỘC RESEARCH):** Import nhận cả 2 định dạng (mẫu mới + KiotViet `DanhSachSanPham`),
  nhận diện theo header, dùng chung `tach-dvt-cong-doan.ts`. Nhớ bẫy Phase 1: exceljs phải bỏ qua
  styles khi đọc file KiotViet.
- **D-23:** Export theo mẫu mới, đúng filter/từ khóa, toàn bộ kết quả. Cột giá vốn theo quyền.
- **D-24/D-25/D-26:** Upsert theo mã (ô trống giữ nguyên); xem trước → xác nhận (một transaction,
  validate lại server, không tin kết quả preview); tên nhóm/ĐVT/công đoạn/kho chưa có → lỗi dòng,
  không tự tạo.
- **D-27/D-28:** Lịch sử đối tác = chứng từ mới ∪ KiotViet cũ gắn nhãn. NCC khớp theo mã ở đầu chuỗi
  `nha_cung_cap`. 8 tên Ghi chú **không tự phân loại** — người dùng xác nhận lẫn cả khách và sale.

### Claude's Discretion (đã chọn phương án đề xuất — D-29 → D-37)

- **D-29:** DLIEU-04 làm bằng màn "Rà ghi chú" trong app (không qua Excel) — mỗi giá trị ghi chú
  chuẩn hóa 1 dòng, hành động Tạo khách mới / Gộp / Là sale / Khách+sale / Bỏ qua, lưu ngay từng
  quyết định, đếm ngược.
- **D-30:** Sale chỉ gắn nhãn text trong bảng ánh xạ, không thêm danh mục nhân viên (Phase 4).
- **D-31:** 224 hóa đơn không ghi chú → đối tác chung "Khách lẻ" (mã cố định).
- **D-32:** Mã khách tự sinh `KH000001` tăng dần, sửa được lúc tạo.
- **D-33:** Đối tác: 1 bảng, filter NCC/KHACH/CA_HAI (CA_HAI hiện ở cả 2 filter), tìm không dấu theo
  mã/tên/SĐT, Drawer như danh mục, ngừng hoạt động thay vì xóa.
- **D-34:** Viết lại `app-shell.tsx`: tên "Kho Minh Vũ", xóa `/san-xuat` `/bao-cao` `/kho`, menu Phase
  2 (Tổng quan, Danh mục, Đối tác, Cài đặt), header họ tên+vai trò+Đổi mật khẩu/Đăng xuất.
- **D-35:** `src/proxy.ts` chặn → `/dang-nhap?tiep_tuc=<path>`, chỉ nhận path nội bộ bắt đầu `/` và
  khác `//` (chống open redirect). Đã đăng nhập vào `/dang-nhap` → về `/`.
- **D-36:** `errors.ts`: "xưởng"→"kho", "lô"→"mã hàng"; thêm thông báo sai tên/mật khẩu + tài khoản
  vô hiệu hóa.
- **D-37:** Feature folders: `xac-thuc`, `danh-muc`, `doi-tac`, `cai-dat`. Cập nhật `features/README.md`.

### Deferred Ideas (OUT OF SCOPE Phase 2)

- Danh mục nhân viên sale + gắn người phụ trách vào phiếu — Phase 4.
- Loại mã ngừng kinh doanh khỏi ô tìm khi lập phiếu — áp dụng khi Phase 3-4 dùng `tim_san_pham`.
- Tự khôi phục mật khẩu qua email — không làm (email nội bộ D-01).
- Cây nhóm hàng kéo-thả — chỉ chọn nhóm cha ở Phase 2.
- Xóa cột `nguoi_dung.kho_id` cũ — chỉ khi người dùng đồng ý lúc execute.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Mô tả | Research hỗ trợ |
|----|-------|------------------|
| AUTH-01 | Đăng nhập username→email nội bộ, phiên giữ qua refresh | §Kiến trúc đăng nhập; mã nguồn `src/lib/supabase/*` đã có sẵn, chỉ thiếu UI |
| AUTH-02 | Chặn route chưa đăng nhập, quay lại đúng trang | §Kiến trúc đăng nhập — `proxy.ts` đã có khung comment |
| AUTH-07 | Đăng xuất từ bất kỳ trang | §Khung app (app-shell) |
| DMUC-01..03 | Bảng server-side, lọc, tìm không dấu | §Câu hỏi 4 (D-11) — RPC phân trang + `count(*) over()` |
| DMUC-04 | Tạo/sửa mã, dvt/cong_doan độc lập | §Schema hiện có (0004/0005), không cần đổi DDL |
| DMUC-05 | Chi tiết mã + thẻ kho | §Câu hỏi 2 (D-16, phủ `kho_movement`) + §Thẻ kho KiotViet |
| DMUC-06 | Import Excel, báo lỗi rõ, không nạp nửa vời | §Câu hỏi 3 (D-22) |
| DMUC-07 | Export Excel theo filter | §Câu hỏi 3 + Câu hỏi 2 (cột giá vốn theo quyền) |
| DTAC-01 | Danh sách NCC+khách chung, lọc loại | §Schema `doi_tac` (0004), không cần đổi DDL |
| DTAC-02 | Tạo/sửa đối tác NCC/KHACH/CA_HAI | §Mã tự sinh `KH######` |
| DTAC-03 | Lịch sử giao dịch đối tác | §Ghép nối KiotViet cũ (nha_cung_cap / ghi_chu) |
| DLIEU-04 | Trích khách hàng thật từ Ghi chú | §Xác minh dữ liệu thật (923 hóa đơn, ghép nối nha_cung_cap) |
| CDAT-01 | Quản lý người dùng + vai trò | §Câu hỏi 1 (D-05) + D-06 nhiều kho |
| CDAT-02 | Quản lý kho | §Schema `kho` (0003), không cần đổi DDL |
| CDAT-03 | Nhóm hàng/ĐVT/công đoạn | §Schema (0004), không cần đổi DDL |
| CDAT-04 | Đánh số chứng từ theo loại | §Cấu hình `sinh_so_ct` |

</phase_requirements>

## Summary

Phase 2 không có rủi ro về "13 bảng DDL bình thường" như Phase 1 — phần lớn schema (`nguoi_dung`,
`kho`, `nhom_hang`, `don_vi_tinh`, `cong_doan`, `doi_tac`, `san_pham`) đã tồn tại và đã có RLS. Rủi ro
thật của phase này nằm ở bốn điểm nơi kiến trúc Phase 1 (JWT claim cache, quyền theo cột SQL role,
exceljs stream reader) chạm giới hạn khi phải phục vụ **giao diện thật** thay vì database thuần:

1. **D-05 (thu hồi quyền):** Đã xác nhận bằng nhiều nguồn độc lập (docs chính thức + GitHub
   discussion có maintainer Supabase trả lời) — **không có cách nào vô hiệu hóa một access token
   JWT đã phát hành trước khi nó hết hạn** (`jwt_expiry = 3600` giây, cấu hình local xác nhận trong
   `supabase/config.toml`). `auth.admin.signOut()` phía admin nhận **JWT của phiên**, không nhận
   `userId` — ghi chú cũ ở Phase 1 sai như nghi ngờ. Cách khả thi duy nhất để đóng gap về 0 giây là
   **không dựa vào claim JWT cho những gì cần tức thời** (`dang_hoat_dong`) — kiểm tra trực tiếp
   bảng `nguoi_dung` trong helper, vẫn bọc `(select ...)` nên chi phí ngang với đọc JWT (một
   InitPlan/câu lệnh, không phải mỗi dòng). Đổi vai trò/kho thì chấp nhận cửa sổ hở tối đa =
   `jwt_expiry`, cộng thêm bước xóa `auth.sessions`/refresh token để chặn *làm mới* token cũ.

2. **D-16 (giấu giá vốn):** Xác nhận đúng bẫy: quyền cột (`GRANT`/`REVOKE`) áp theo **SQL role**
   (`authenticated`), 4 vai trò dùng chung role này. Giải pháp nhất quán với pattern đã có ở 0015
   (giá bán) là đảo ngược: **`REVOKE SELECT (gia_von)` khỏi `authenticated` hoàn toàn** (không ai
   đọc trực tiếp qua PostgREST `select=*` hay `select=gia_von`), chỉ lộ giá trị qua RPC
   `SECURITY DEFINER` tự kiểm `vai_tro_hien_tai()` — RPC bypass quyền cột vì chạy dưới quyền chủ sở
   hữu hàm. Điều này khớp 100% với cách 0015 đã làm cho `gia_ban` (lớp 1 = quyền cột, lớp 2 = trigger
   phân vai) nhưng đảo chiều READ thay vì WRITE. Phải phủ cả `kho_movement.gia_von_tai_thoi_diem`.

3. **D-22 (đọc Excel):** Xác nhận `ExcelJS.stream.xlsx.WorkbookReader` phụ thuộc `fs`/Node stream —
   **không chạy được trong bundle trình duyệt** mà không polyfill nặng (không khuyến nghị). Tùy chọn
   browser duy nhất là `workbook.xlsx.load(buffer)` (đọc toàn bộ vào RAM, không stream) — API này
   dùng **cùng code path** gây crash `reading 'styles'` mà Phase 1 đã né bằng `styles: "ignore"` (tùy
   chọn này chỉ tồn tại trên `WorkbookReader`, không có trên `.load()`). Kết luận: **parse Excel bắt
   buộc chạy ở server** (Route Handler, Node runtime mặc định của App Router) cho cả 2 định dạng, để
   dùng chung code Node đã có (`doc-file.ts`, `tach-dvt-cong-doan.ts`) mà không polyfill hay phân
   nhánh logic.

4. **D-11 (phân trang + tổng số dòng):** Không cần kỹ thuật lạ — RPC tự viết (không dùng PostgREST
   tự động trên bảng, vì cần kết hợp filter nhiều bảng + "Cần rà") dùng `count(*) over()` để trả
   tổng số dòng cùng lúc với trang dữ liệu trong **một** câu lệnh, không phải 2 round-trip. 3.266 dòng
   là quá nhỏ để lo hiệu năng COUNT chính xác (khác biệt với các hướng dẫn PostgREST "estimated count"
   dành cho bảng triệu dòng).

**Primary recommendation:** Đúng theo 31 WU đề xuất, nhưng: (a) WU-04 (ẩn giá vốn) nên làm **trước**
WU-07 (danh sách sản phẩm) đúng như thứ tự wave đã xếp, vì WU-07 phải viết RPC không dùng `select *`
mà liệt kê cột tường minh và điều kiện hóa `gia_von`; (b) WU-13 (quản trị tài khoản) phải tự viết
thêm một RPC/hàm `thu_hoi_phien_nguoi_dung(uuid)` chạy bằng service-role hoặc `security definer` sở
hữu bởi `postgres`, xóa `auth.sessions` của user đó — đây là việc MỚI, không có trong WU-13 hiện tại,
cần thêm; (c) WU-20/WU-30 (import Excel) phải chốt ngay từ đầu là Route Handler, không viết component
đọc file phía client rồi mới phát hiện lỗi styles giữa chừng.

## Câu hỏi bắt buộc chốt trước khi plan

### Câu hỏi 1 (D-05): Thu hồi quyền ngay khi đổi vai trò/kho/vô hiệu hóa

**Sự thật đã verify (nhiều nguồn độc lập, HIGH confidence):**

| Cơ chế | Hành vi thật | Nguồn |
|---|---|---|
| `supabase.auth.signOut({ scope })` (client, không phải admin) | `scope: 'global'` (mặc định) đăng xuất mọi thiết bị; `'local'` chỉ tab hiện tại; `'others'` mọi phiên khác. **Chỉ hoạt động cho phiên hiện tại của người gọi**, không dùng để admin ép người khác đăng xuất. Dùng `'others'` thì sự kiện `SIGNED_OUT` **không** bắn ra. | supabase.com/docs/guides/auth/signout |
| `auth.admin.signOut(jwt, scope)` (server, admin) | Tham số đầu là **access token JWT của phiên cần thu hồi**, không phải `userId`. Đây là bằng chứng ghi chú Phase 1 `auth.admin.signOut(userId, 'others')` **sai chữ ký** — hàm không nhận `userId`. Muốn dùng hàm này phải có JWT của phiên đang sống (server không lưu sẵn, phải tự lưu access token lúc đăng nhập nếu muốn dùng đường này) — **không thực tế cho ca "quản lý đổi vai trò người khác"**. | supabase.com/docs/reference/javascript/auth-signout |
| `auth.admin.updateUserById(id, { ban_duration })` | Chặn **đăng nhập mới** trong thời gian ban. **Không thu hồi phiên đang sống** — access token hiện tại vẫn dùng được tới khi hết hạn. | GitHub supabase/auth#1798, Supabase Docs "Managing user data" |
| `auth.admin.deleteUser(id)` | Xóa dòng `auth.users`, **cascade xóa `auth.sessions`** → refresh token không dùng lại được. Nhưng đây là **xóa tài khoản**, không phù hợp D-04 ("vô hiệu hóa, không xóa"). | Supabase Docs "Managing user data" |
| Access token JWT (stateless) | **Không có cách nào thu hồi một access token đã phát hành trước khi hết hạn** — xác nhận bởi chính Supabase engineer trong GitHub Discussion #13941: *"There is no way for the database or auth to communicate to [already-issued tokens]"*. | github.com/orgs/supabase/discussions/13941 (câu trả lời của GaryAustin1, Supabase collaborator) |
| `jwt_expiry` | `3600` giây, xác nhận trong `supabase/config.toml` dòng 164 (local). Supabase khuyến nghị hạ xuống thấp nhất 5 phút nếu cần thu hồi nhanh hơn — đây là **đánh đổi chính sách** (refresh thường xuyên hơn), không phải bug cần sửa. | supabase.com/docs/guides/auth/jwts + `supabase/config.toml` đọc trực tiếp |
| `session_id` claim | JWT của Supabase (bản hiện tại) mang claim `session_id` (uuid) trỏ đúng 1 dòng `auth.sessions`. Docs chính thức mô tả **đây là cơ chế được thiết kế để app tự kiểm** — "nếu dòng `auth.sessions` không còn tồn tại, nghĩa là user đã đăng xuất." Điều này ngụ ý: xóa dòng trong `auth.sessions` **là hành động được công nhận**, dù trang docs không đưa ví dụ SQL trực tiếp. | supabase.com/docs/guides/auth/sessions |
| Xóa trực tiếp `auth.sessions`/`auth.refresh_tokens` bằng SQL | **Không có trang docs chính thức nào hướng dẫn DELETE trực tiếp**, nhưng nhiều nguồn cộng đồng (bài blog, GitHub) dùng pattern hàm `security definer` sở hữu bởi role có quyền trên schema `auth` (mặc định là `postgres`/`supabase_admin` trên Supabase-hosted) để `delete from auth.sessions where user_id = $1`. Cascade FK từ `auth.refresh_tokens` xuống theo `session_id` khiến **refresh token cũng mất hiệu lực** — chặn được việc *làm mới* access token, nhưng **access token đang cầm trên tay vẫn còn hiệu lực tới khi hết hạn** (đúng như mục trên). MEDIUM confidence — mẫu cộng đồng, chưa official, cần verify quyền `postgres` trên `auth.sessions` khi thực thi. | til.unessa.net/supabase/properly-sign-out (cộng đồng) + suy luận từ cấu trúc bảng chính thức |

**Kết luận — độ trễ tối đa theo từng loại thay đổi:**

| Thay đổi | Độ trễ tối đa nếu CHỈ dựa JWT claim | Độ trễ tối đa với cơ chế đề xuất |
|---|---|---|
| Vô hiệu hóa (`dang_hoat_dong=false`) | tới `jwt_expiry` (≤ 3600s) — vì `vai_tro_hien_tai()` đọc claim cũ | **~0 giây (request tiếp theo)** — xem giải pháp dưới |
| Đổi vai trò | tới `jwt_expiry` (≤ 3600s) | **≤ 3600s cho quyền ĐỌC** (claim cache theo D-15); có thể ép về ~0s cho hành động NHẠY CẢM cụ thể bằng cách thêm điều kiện kiểm live-lookup riêng cho hành động đó (xem dưới) |
| Đổi kho (thủ kho nhiều kho) | tới `jwt_expiry` | như trên |

**Cơ chế đề xuất (kết hợp 2 lớp, không có lớp nào một mình đủ):**

1. **Lớp tức thời — live-lookup `dang_hoat_dong`, không đọc từ JWT.** Thêm helper mới:
   ```sql
   create or replace function public.nguoi_dung_dang_hoat_dong()
   returns boolean
   language sql stable security definer set search_path = ''
   as $$
     select coalesce(
       (select dang_hoat_dong from public.nguoi_dung where id = (select auth.uid())),
       false
     );
   $$;
   ```
   **Vì sao KHÔNG vi phạm lý do D-15 (đọc JWT thay vì query bảng để tránh chậm):** lý do gốc của
   D-15 là tránh gọi hàm **không bọc `(select ...)`** trong `USING`/`WITH CHECK` — khi đó Postgres
   re-evaluate mỗi dòng. Một khi đã bọc `(select public.nguoi_dung_dang_hoat_dong())`, Postgres coi
   đây là subquery không tương quan (uncorrelated) và biến thành **InitPlan — chạy đúng 1 lần mỗi
   câu lệnh**, bất kể quét bao nhiêu dòng `san_pham`/`ton_kho`. Chi phí thực tế = 1 lần lookup
   index trên bảng `nguoi_dung` có vài chục dòng — không khác gì đọc JWT về độ lớn. Điểm này KHÔNG
   được nêu rõ trong research Phase 1 (chỉ nói "đọc JWT nhanh hơn query theo dòng") — cần làm rõ ở
   Phase 2: **chi phí thật nằm ở "mỗi dòng" hay "mỗi câu lệnh", không nằm ở "JWT hay bảng"**.
   Thêm điều kiện này vào MỌI policy vốn đã check `vai_tro_hien_tai()` (viết lại 0015/0016 hoặc
   thêm migration mới `and (select public.nguoi_dung_dang_hoat_dong())`), và vào đầu mọi RPC
   `SECURITY DEFINER` (`ghi_so_chung_tu`, RPC mới của Phase 2) — người bị vô hiệu hóa bị chặn ngay
   request kế tiếp dù access token còn hạn.
   Test bằng EXPLAIN giống `30_rls_test.sql` đã làm cho `ton_kho` (`matches('InitPlan|...')`).

2. **Lớp chặn làm mới — xóa `auth.sessions`/refresh token khi quản lý bấm đổi vai trò/kho/vô hiệu
   hóa.** Tạo hàm (chạy trong action server, dùng service-role client hoặc RPC owned by `postgres`):
   ```sql
   create or replace function public.thu_hoi_phien_nguoi_dung(p_user_id uuid)
   returns void
   language sql
   security definer
   set search_path = ''
   as $$
     delete from auth.sessions where user_id = p_user_id;
   $$;
   revoke all on function public.thu_hoi_phien_nguoi_dung(uuid) from public, anon, authenticated;
   -- chỉ gọi được từ server (service_role) hoặc qua Server Action kiểm quan_ly trước
   ```
   **Cảnh báo cần verify lúc thực thi (chưa xác nhận trên project cloud cụ thể này):** hàm
   `security definer` có ghi được vào schema `auth` hay không phụ thuộc **owner của hàm** có
   GRANT trên `auth.sessions`. Trên Supabase-hosted, role `postgres` thường có quyền do
   `supabase_admin` cấp, nhưng đây là **giả định dựa trên cộng đồng, MEDIUM confidence** — WU-13
   phải thử `select has_table_privilege('postgres', 'auth.sessions', 'DELETE')` trước khi viết
   logic phụ thuộc vào nó, và có phương án dự phòng: dùng `service_role` Supabase client gọi thẳng
   REST admin API nếu Supabase bổ sung endpoint (hiện tại supabase-js **không expose** hàm xóa
   session theo `userId` trực tiếp — chỉ có `signOut(jwt)`).
   Việc này **không** làm access token cũ hết hạn ngay — chỉ chặn *refresh* — nên đây là lớp phòng
   thủ thứ hai, không phải giải pháp chính cho "tức thời".

3. **Ghi rõ trong UI/UAT:** đổi vai trò/kho hiển thị cảnh báo "Có hiệu lực đầy đủ trong tối đa 60
   phút hoặc khi người dùng đăng nhập lại" — đây là **giới hạn kỹ thuật đã xác nhận của Supabase**,
   không phải thiếu sót của implementation.

**Việc research CHƯA giải quyết được, cần quyết định ở plan:** có nên hạ `jwt_expiry` xuống thấp
hơn 3600s (đánh đổi: gọi refresh thường xuyên hơn, tăng round-trip) để giảm cửa sổ hở cho riêng "đổi
vai trò"? Context D-05 không khóa con số này — để planner/user quyết định, không phải mặc định đổi.

---

### Câu hỏi 2 (D-16): Chặn đọc giá vốn theo vai trò khi 4 vai trò dùng chung SQL role

**Xác nhận bẫy (HIGH confidence — khớp `.memory/patterns/supabase-rls-bao-mat.md` mục 2, đã xảy ra
thật với `gia_ban`):** `GRANT`/`REVOKE` cột trong Postgres áp theo **role kết nối** (`authenticated`),
không đọc được JWT claim. RLS (`USING`/`WITH CHECK`) chỉ lọc **theo dòng**, không lọc theo cột. Không
có cơ chế Postgres nào "REVOKE SELECT theo giá trị claim" — phải tự dựng bằng 1 trong 2 cách:

| Phương án | Cách làm | PostgREST `select=*` | Ảnh hưởng RPC/trigger hiện có | Khuyến nghị |
|---|---|---|---|---|
| **A. REVOKE cột + RPC/hàm SECURITY DEFINER lộ giá trị có điều kiện** | `revoke select (gia_von) on san_pham from authenticated;` — không ai đọc trực tiếp qua PostgREST. Muốn đọc thì gọi RPC `security definer` (bypass quyền cột vì chạy dưới quyền owner) tự kiểm `vai_tro_hien_tai()`. | `select=*` hoặc `select=gia_von` **lỗi 42501 cho MỌI vai trò** kể cả quản lý — đây là hệ quả BẮT BUỘC, không phải bug: quản lý cũng phải đọc gia_von qua đường RPC, không phải đọc trực tiếp bảng. | RPC nội bộ (`cap_nhat_ton_va_gia_von`, ghi_so_chung_tu) đã chạy `security definer` nên **không bị ảnh hưởng** — chúng đọc/ghi bằng quyền owner. `tim_san_pham` hiện `select sp.*` — PHẢI SỬA vì nó implicit chọn cả `gia_von`, sẽ lỗi 42501 khi role không có quyền cột dù bản thân hàm KHÔNG phải `security definer` (0022 chỉ có `set search_path`, không có `security definer`) → xem cảnh báo dưới. | **Khuyến nghị chính** — nhất quán với cách 0015 đã làm cho `gia_ban` (đảo chiều: đó là chặn WRITE cho 1 vai trò, đây là chặn READ cho 2 vai trò) |
| B. View `security_invoker` với `CASE WHEN` che giá trị | `create view v_san_pham as select ..., case when (select vai_tro_hien_tai()) in (...) then gia_von else null end as gia_von from san_pham;` | App phải đổi mọi chỗ đọc `san_pham` sang đọc `v_san_pham` — cột `gia_von` qua `CASE` là biểu thức nên **view không tự động updatable cho cột đó** (Postgres auto-updatable view rule: cột phải là tham chiếu trực tiếp) — INSERT/UPDATE qua view vẫn được nếu KHÔNG đụng cột `gia_von` trong danh sách ghi (giống hiện trạng). | Không ảnh hưởng RPC nội bộ (chúng đọc thẳng bảng gốc `san_pham`, không qua view). `tim_san_pham` cần đổi từ `select sp.*` sang chọn cột hoặc dùng view. | Khả thi nhưng thêm một tầng gián tiếp (2 đối tượng cùng biểu diễn 1 khái niệm `san_pham`) — chỉ chọn nếu cần trả `null` thay vì lỗi 42501 (UX mềm hơn nhưng dễ nhầm "0/null" với "không có quyền") |

**Quyết định:** chọn **Phương án A** — nhất quán tuyệt đối với pattern đã dùng cho `gia_ban`/`gia_von`
ghi (0015), dễ audit (`\d san_pham` liệt kê ngay ai có quyền cột nào), và lỗi 42501 rõ ràng hơn `null`
mập mờ. Chấp nhận việc mọi lần đọc `gia_von` — kể cả của quản lý — phải qua RPC, không qua PostgREST
trực tiếp trên bảng.

**Việc PHẢI sửa vì cảnh báo mới phát hiện (không có trong CONTEXT.md, phải đưa vào WU-04):**

1. `tim_san_pham(text, int)` (0022) đang `returns setof public.san_pham` với `select sp.*` — hàm
   này **không phải `security definer`** (kiểm tra 0020: chỉ có `set search_path`, không thấy
   `security definer` trong định nghĩa 0022) → khi REVOKE SELECT(gia_von), **mọi lệnh gọi
   `tim_san_pham` của thủ kho/chỉ xem sẽ lỗi 42501 toàn bộ**, không chỉ ẩn cột — hỏng luôn use case
   "thủ kho tra mã hàng để nhập phiếu" (đúng nguyên tắc kiến trúc, RLS cho thủ kho đọc `san_pham`
   `using (true)`). **Phải sửa `tim_san_pham` ở Phase 2** để hoặc (a) liệt kê cột tường minh loại
   trừ `gia_von`, hoặc (b) thêm `security definer` + tự kiểm/che giá trị bên trong. Khuyến nghị (a)
   vì đơn giản hơn và không mở thêm bề mặt security-definer.
2. Bất kỳ chỗ nào trong Wave 4/5 (danh mục list/detail/export) dùng `.from('san_pham').select('*')`
   qua supabase-js **sẽ vỡ cho quản lý/văn phòng luôn** (không chỉ thủ kho) trừ khi đã đổi sang RPC.
   Vì Phase 2 vốn dĩ đã lên kế hoạch RPC riêng cho danh sách (WU-07) và chi tiết/thẻ kho (WU-09),
   rủi ro này **được giảm nhẹ tự nhiên** — chỉ cần đảm bảo hai RPC đó liệt kê cột tường minh (không
   `select *`) và tự quyết có trả `gia_von` hay không dựa theo `vai_tro_hien_tai()` (chạy dưới
   `security definer` nên đọc được `gia_von` bất kể REVOKE).
3. `kho_movement.gia_von_tai_thoi_diem` — áp đúng pattern tương tự: `revoke select
   (gia_von_tai_thoi_diem) on kho_movement from authenticated`, phơi ra qua RPC thẻ kho (WU-09) có
   điều kiện vai trò. `kho_movement` hiện chưa GRANT cột nào tường minh (chỉ có RLS `select`
   `using(true)` theo phạm vi kho) — REVOKE riêng 1 cột trong khi các cột khác vẫn SELECT thường
   (không qua GRANT liệt kê) là hợp lệ về mặt cú pháp Postgres (REVOKE 1 cột không đòi hỏi các cột
   khác phải có GRANT tường minh, vì SELECT mặc định cấp cho *mọi cột* qua `GRANT SELECT ON TABLE`
   — chỉ cột bị REVOKE riêng mới bị chặn). Cần verify bằng pgTAP: `select kho_id from kho_movement`
   (không đụng cột bị revoke) vẫn chạy được cho thủ kho.
4. Export Excel (D-23): vì export phải đi qua server logic (không thể export "toàn bộ kết quả theo
   filter" bằng client fetch từng trang), tự nhiên đã nằm sau lớp RPC — không có đường lách.

**pgTAP bắt buộc (bổ sung khuôn mẫu `30_rls_test.sql`):**
```sql
select throws_ok(
  'select gia_von from public.san_pham limit 1',
  '42501', null,
  'thủ kho KHÔNG đọc được gia_von bằng SELECT trực tiếp, dù RLS cho đọc dòng'
);
select throws_ok(
  'select gia_von_tai_thoi_diem from public.kho_movement limit 1',
  '42501', null,
  'thủ kho KHÔNG đọc được gia_von_tai_thoi_diem'
);
-- Quản lý/văn phòng: gọi được RPC chi tiết trả gia_von, KHÔNG gọi trực tiếp select * được (đúng ý đồ)
select throws_ok(
  'select * from public.san_pham limit 1',
  '42501', null,
  'KỂ CẢ quản lý cũng không select * trực tiếp — phải qua RPC'
);
```

---

### Câu hỏi 3 (D-22): Đọc Excel — trình duyệt hay server?

**Xác nhận (HIGH confidence cho phần API, MEDIUM cho browser bundling cụ thể):**

- `ExcelJS.stream.xlsx.WorkbookReader` (dùng trong `scripts/import-kiotviet/doc-file.ts` hiện tại,
  với `styles: "ignore"`) nhận input là stream — tài liệu/discussion chính thức của exceljs mô tả
  API này nhận `fs.createReadStream()` làm ví dụ chuẩn. Nó phụ thuộc module `fs`/`stream` của
  Node.js. Bundler trình duyệt (webpack/Turbopack qua Next.js) **không polyfill `fs` mặc định** —
  muốn chạy được cần polyfill nặng, không có lợi ích thực tế.
- exceljs có build riêng cho browser (`exceljs/dist/exceljs.min.js`, dùng `browser` field trong
  `package.json`), nhưng build đó chỉ hỗ trợ **`workbook.xlsx.load(buffer)`** (đọc toàn bộ file vào
  bộ nhớ dưới dạng `ArrayBuffer`/ `Buffer`), KHÔNG có `stream.xlsx.WorkbookReader`.
- Tùy chọn `styles: "ignore"` (né lỗi `reading 'styles'` đã gặp ở Phase 1) là tham số của
  `WorkbookReader`, **không xuất hiện trong `XlsxReadOptions` của `.load()`** theo type definition
  công khai — không tìm thấy tài liệu nào xác nhận `.load()` có cách bỏ qua styles.xml lỗi. Vì file
  KiotViet **chính là loại file gây lỗi này** (styles.xml lệch chuẩn do không phải Excel thật sinh
  ra), rủi ro là `.load()` ở browser **crash giống hệt** lỗi Phase 1 đã né — chưa ai verify được
  ngược lại, và không có bằng chứng docs nào nói `.load()` xử lý khác `readFile()` ở điểm này (cả
  hai đều thuộc nhánh "đọc toàn bộ workbook", khác nhánh với `WorkbookReader`).

**Kết luận — khuyến nghị (HIGH confidence về hướng đi, dù MEDIUM về chi tiết API browser):**
**Parse Excel bắt buộc chạy ở server**, cho **cả hai định dạng** (mẫu mới lẫn KiotViet), lý do:
1. Định dạng KiotViet chắc chắn cần `WorkbookReader` + `styles: "ignore"` — chỉ chạy được ở Node.
2. Dù định dạng mẫu mới (do app tự xuất) có thể không lỗi styles, viết 2 code path (browser cho mẫu
   mới, server cho KiotViet) vi phạm chính yêu cầu D-22 "dùng chung một nguồn, không chép" và tăng
   rủi ro bảo trì gấp đôi cho một tính năng ít dùng.
3. Tránh đưa exceljs (thư viện lớn — zip + XML parser) vào bundle client, giảm kích thước JS gửi
   xuống trình duyệt (không đo được số chính xác nhưng exceljs là thư viện cỡ trung-lớn theo cấu
   trúc mã nguồn, không có lý do kỹ thuật để trả giá này khi server-side đã đủ).

**Cách triển khai cụ thể:**
- Dùng **Route Handler** (`src/app/api/danh-muc/nhap-excel/route.ts`), **không dùng Server Action**
  cho bước upload file: Next.js 16 xác nhận **Route Handler không có giới hạn body size cấu hình
  được ở tầng framework** cho App Router — giới hạn thực tế chỉ tới từ nền tảng hosting (Vercel:
  4.5–6MB tùy gói) hoặc Node server tự host (không giới hạn cứng). Server Action có
  `bodySizeLimit` mặc định nhỏ hơn (1MB) cần cấu hình lại trong `next.config.ts` — thêm một bước cấu
  hình không cần thiết khi Route Handler xử lý multipart/form-data tự nhiên hơn.
  → **Cần xác nhận nền tảng deploy thực tế của dự án này** (không thấy trong PROJECT.md/CLAUDE.md
  project — đây là gap, xem Open Questions) để biết giới hạn cứng thật sự; với quy mô file hiện tại
  (3.266 dòng danh mục, hóa đơn mẫu ~1,1MB theo `.memory/knowledge/du-lieu-kiotviet.md`), rủi ro thấp
  trên hầu hết nền tảng.
- Runtime mặc định của Route Handler trong Next.js App Router là **Node.js** (không phải Edge) trừ
  khi khai báo `export const runtime = "edge"` — không cần khai báo gì thêm để dùng `exceljs`/`fs`.
- Chia sẻ code: giữ `scripts/import-kiotviet/doc-file.ts` và `tach-dvt-cong-doan.ts` làm module Node
  thuần (không có import Next.js-specific), rồi **import thẳng từ Route Handler trong `src/`** (đúng
  ý D-22 "dùng chung, không chép"). Không cần di chuyển file — TypeScript path alias hiện tại
  (`@/...` trỏ `src/`) không cản việc `src/app/api/.../route.ts` import
  `../../../../scripts/import-kiotviet/tach-dvt-cong-doan` bằng relative path hoặc thêm alias mới
  (khuyến nghị thêm alias `@/scripts/...` trong `tsconfig.json` để tránh relative path dài — việc
  nhỏ, tự quyết lúc plan).
- Luồng D-25 (xem trước → xác nhận): Route Handler bước 1 (`?che_do=kiem_tra`) trả JSON preview
  (thêm/sửa/lỗi theo dòng), KHÔNG ghi gì. Bước 2 xác nhận gọi lại **cùng Route Handler** với file
  đã upload lại (vì D-25 yêu cầu **validate lại ở server**, không tin kết quả preview — nghĩa là
  không thể chỉ gửi "đã xác nhận" mà phải gửi lại toàn bộ dữ liệu hoặc file để server tự parse +
  validate lại từ đầu, portanto tránh race condition dữ liệu đổi giữa 2 bước) hoặc gửi lại **dữ liệu
  đã parse** (JSON, không phải file gốc) tới RPC `nap_danh_muc` (WU-10) — cách này rẻ hơn (không
  parse Excel 2 lần) nhưng đòi hỏi RPC WU-10 tự validate lại toàn bộ ràng buộc (mã trùng, nhóm/ĐVT
  tồn tại...) ngay trong transaction ghi, đúng tinh thần D-25. **Khuyến nghị: parse 1 lần ở Route
  Handler, gửi JSON đã parse cho RPC, RPC tự validate lại** — vừa tránh chi phí parse 2 lần vừa giữ
  đúng nguyên tắc "không tin preview, validate lại ở server" vì RPC là một invocation độc lập, có
  thể chạy validate ngay trước khi ghi trong cùng transaction.

---

### Câu hỏi 4 (D-11): RPC phân trang + tổng số dòng, kết hợp trigram + lọc

**Kết luận (HIGH confidence — kỹ thuật Postgres phổ thông, không cần xác minh ngoài):**
Dùng cửa sổ `count(*) over()` để trả tổng số dòng **trong cùng câu lệnh** với trang dữ liệu — không
cần 2 round-trip (1 lần COUNT riêng + 1 lần SELECT trang) và không cần PostgREST `count=exact`/
`estimated` (kỹ thuật đó dành cho bảng triệu dòng nơi COUNT chính xác tốn kém; 3.266 dòng + filter
là COUNT tức thời, không có lý do dùng "estimated").

**Lưu ý bắt buộc (đã xác nhận qua nguồn cộng đồng, khớp logic Postgres):** nếu `OFFSET` vượt quá số
dòng thật, kết quả trả về RỖNG và **`count(*) over()` biến mất theo** (không có dòng nào để đính kèm
giá trị). RPC phải xử lý ca này riêng (ví dụ trả tổng số dòng bằng 1 CTE riêng luôn có giá trị, hoặc
FE tự phát hiện "trang trống nhưng đang không phải trang 1" rồi lùi về trang cuối) — đưa yêu cầu này
vào WU-07 test.

**Khung RPC đề xuất** (khớp `tim_san_pham` 0022 để tái dùng đúng biểu thức, D-11 yêu cầu):
```sql
create or replace function public.danh_sach_san_pham(
  p_tu_khoa text default null,
  p_nhom_hang_id uuid default null,
  p_cong_doan_id uuid default null,
  p_dvt_id uuid default null,
  p_dang_kinh_doanh boolean default null,
  p_can_ra boolean default null,
  p_sap_xep text default 'ma_hang',
  p_huong text default 'asc',
  p_trang int default 1,
  p_kich_thuoc int default 50
)
returns table (
  id uuid, ma_hang text, ten_hang text, /* ... cột không nhạy cảm ... */
  gia_von numeric,          -- NULL nếu vai trò không đủ quyền, xem Câu hỏi 2
  can_ra boolean,
  tong_so_dong bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  select sp.id, sp.ma_hang, sp.ten_hang, /* ... */,
    case when (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong')
         then sp.gia_von else null end,
    -- "Cần rà": MUA_NGOAI ngoài 2 nhóm L5/6 và không có đuôi công đoạn đã biết, HOẶC cờ D-19
    (cd.ma = 'MUA_NGOAI'
       and nh.ma not in ('HANG_HANG_L5_6','HANG_NGOAI_L5_6')
       and sp.ma_hang !~ '-(CB|X|S)$'
     or coalesce(sp.can_ra_dvt, false)),
    count(*) over() as tong_so_dong
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  where (p_tu_khoa is null or trim(p_tu_khoa) = '' or
         public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
           ilike '%' || public.f_unaccent(p_tu_khoa) || '%'
         or public.f_unaccent(p_tu_khoa)
              operator(extensions.<%)
              public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
    and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
    -- ... các filter khác
  order by
    case when p_sap_xep = 'ma_hang' and p_huong = 'asc' then sp.ma_hang end asc,
    -- lặp lại cho từng cột sort hợp lệ — KHÔNG nội suy tên cột từ text trực tiếp vào ORDER BY
    -- (rủi ro SQL injection nếu ghép chuỗi động; dùng CASE WHEN tường minh theo whitelist)
    sp.ma_hang asc  -- fallback ổn định, tránh thứ tự đổi giữa các trang
  limit p_kich_thuoc offset (p_trang - 1) * p_kich_thuoc;
end;
$$;
```

**Điểm phải cẩn thận (rút từ kinh nghiệm thật của Phase 1, không phải suy đoán):**
- **Không nội suy tên cột vào `ORDER BY` bằng nối chuỗi động** (`format('order by %s', p_sap_xep)`)
  — mở SQL injection qua tham số sort nếu không kiểm whitelist nghiêm ngặt. Dùng `CASE WHEN` tường
  minh theo danh sách cột cho phép (như khung trên) — chấp nhận dài dòng hơn để an toàn.
- **Luôn có ORDER BY phụ ổn định** (`sp.ma_hang asc` cuối cùng) — `LIMIT/OFFSET` không có `ORDER BY`
  xác định duy nhất sẽ cho thứ tự không ổn định giữa các trang khi có nhiều dòng bằng nhau ở tiêu
  chí sort chính (đã là lỗi thật gặp trong nhiều dự án phân trang Postgres, không riêng dự án này).
- **`security definer`** bắt buộc để hàm có thể tự quyết trả `gia_von` hay không (bỏ qua REVOKE cột)
  — nghĩa là hàm này phải **tự kiểm vai trò TRƯỚC khi trả bất kỳ dữ liệu nào nhạy cảm**, không dựa
  vào RLS (RLS không áp dụng dưới `security definer`, nhưng ở đây không cần chặn DÒNG nào — `san_pham`
  cho mọi vai trò đọc mọi dòng — nên chỉ cần che CỘT bằng `CASE WHEN` như trên).
- Cột `can_ra_dvt` (cờ D-19, 8 mã) **chưa tồn tại trong schema** — đây là việc migration mới của
  WU-07, không phải cột có sẵn. Cần thêm `alter table san_pham add column can_ra_dvt boolean not
  null default false` (đặt `true` cho 8 mã cụ thể liệt kê ở `01-UAT.md`) + cột/cách lưu trạng thái
  "đã xác nhận Giữ như cũ" (ví dụ chính cột này chuyển về `false` khi người dùng bấm "Giữ như cũ" —
  đơn giản hơn thêm cột thứ hai, vì D-19 chỉ cần "gỡ cờ", không cần phân biệt "chưa từng có vấn đề"
  với "đã xử lý xong").

**"Cần rà" 356 mã — chú ý:** biểu thức đuôi mã trong ví dụ trên (`!~ '-(CB|X|S)$'`) là suy từ mô tả
D-18/`.memory/knowledge/du-lieu-kiotviet.md` ("đuôi `-CB`/`-X`/`-S`") — **chưa test trên dữ liệu
thật để xác nhận ra đúng số ~356**. Khuyến nghị WU-07 chạy thử biểu thức này bằng `select count(*)`
trực tiếp trên cloud DB **trước khi** đưa vào RPC chính thức, so khớp con số 356 đã nêu trong
CONTEXT.md — nếu lệch, biểu thức đuôi mã cần điều chỉnh (ví dụ thêm biến thể `-SĐM` đã nhắc trong
`.memory/knowledge/du-lieu-kiotviet.md`, dùng `~` với nhóm ký tự rộng hơn `-(CB|X|S[A-ZĐ]*)$`).

## Standard Stack

Không thêm thư viện mới cho toàn bộ 4 câu hỏi trên — mọi giải pháp dùng Postgres thuần (REVOKE, RPC,
`count() over()`), Route Handler có sẵn trong Next.js, và exceljs đã có trong `package.json`.

### Core (đã có, verify version qua `npm ls`)

| Thư viện | Version | Vai trò trong Phase 2 |
|---|---|---|
| next | 16.3.4 | App Router, Route Handler cho import Excel (Câu hỏi 3), `src/proxy.ts` |
| react / react-dom | 19.2.8 | — |
| antd | 6.6.3 | Table server pagination, Drawer, Form, rowSelection (xem §antd v6) |
| @supabase/ssr | 0.12.7 | `createServerClient`/`createBrowserClient` — không đổi so với Phase 1 |
| @supabase/supabase-js | 2.116.0 | `auth.admin.*`, `.rpc()`, không dùng session invalidation API riêng (không tồn tại — Câu hỏi 1) |
| @tanstack/react-query | 5.102.8 | Query key cho danh sách/chi tiết/lịch sử |
| react-hook-form + @hookform/resolvers + zod | 7.87.0 / 5.9.1 / 4.6.2 | Form Drawer tạo/sửa (D-13, D-22 preview) |
| exceljs | 4.4.0 | Đọc/ghi Excel — **chỉ ở server** (Route Handler), xem Câu hỏi 3 |

**Không cần cài mới.** Nếu planner cân nhắc bất kỳ thư viện nào khác (vd. thư viện virtualized table
cho 3.266 dòng, thư viện diff hiển thị nhật ký sửa) — **phải hỏi người dùng trước** theo CLAUDE.md;
antd `Table` với phân trang server (không tải hết 3.266 dòng vào DOM cùng lúc) đã đủ, không cần
virtualization riêng.

### Alternatives Considered

| Thay vì | Có thể dùng | Đánh đổi |
|---|---|---|
| REVOKE cột + RPC (Câu hỏi 2, phương án A) | View `security_invoker` + CASE WHEN (phương án B) | B trả `null` mềm hơn nhưng thêm 1 tầng đối tượng DB, không nhất quán với pattern `gia_ban` đã có |
| RPC tự viết `count() over()` (Câu hỏi 4) | 2 query riêng (COUNT + SELECT) hoặc PostgREST `count=estimated` | 2 query tốn thêm 1 round-trip không cần thiết ở quy mô 3.266 dòng; `estimated` chỉ có lợi cho bảng triệu dòng, không áp dụng |
| Route Handler cho import (Câu hỏi 3) | Server Action với `bodySizeLimit` tăng lên | Server Action thêm bước cấu hình `next.config.ts`, và ngữ nghĩa "upload file nhị phân" khớp Route Handler tự nhiên hơn |
| Xóa `auth.sessions` bằng SQL (Câu hỏi 1) | Chỉ dựa `ban_duration` + chờ hết hạn JWT | Đơn giản hơn nhưng không đóng được gap "đổi vai trò" nhanh hơn 1 giờ — không đáp ứng "phải có hiệu lực nhanh" của D-05 |

## Architecture Patterns

### D-06 — Thủ kho nhiều kho: đúng 10 điểm chạm cần sửa (grep xác nhận)

Đã grep toàn bộ tham chiếu `kho_hien_tai()` / `nguoi_dung.kho_id` / claim `kho_id` trong codebase.
Danh sách điểm chạm PHẢI sửa đồng bộ khi đổi từ "1 kho" sang "nhiều kho":

| File | Điểm chạm | Việc cần làm |
|---|---|---|
| `0003_nguoi_dung_kho.sql` | Cột `nguoi_dung.kho_id uuid` (1 giá trị) + helper `kho_hien_tai() returns uuid` | Thêm bảng nối `nguoi_dung_kho (nguoi_dung_id, kho_id)`, backfill từ `kho_id` cũ, **giữ nguyên cột cũ** (D-06 khóa: xóa phải hỏi người dùng lúc execute) |
| `0014_auth_hook.sql` | Hook đọc `select vai_tro, kho_id from nguoi_dung ... jsonb_set(claims,'{kho_id}', to_jsonb(v_kho_id))` (scalar) | Đổi sang mảng: `select array_agg(kho_id) from nguoi_dung_kho where nguoi_dung_id = ...`, `jsonb_set(claims,'{kho_id}', to_jsonb(v_kho_ids))` (jsonb array) |
| `0003` helper | `kho_hien_tai() returns uuid` đọc `auth.jwt()->>'kho_id'` (scalar text→uuid) | Đổi thành `kho_hien_tai() returns uuid[]` đọc `auth.jwt()->'kho_id'` (jsonb array) rồi `jsonb_array_elements_text` ép `uuid[]`. **Cân nhắc giữ tên hàm cũ trả `uuid[]`** thay vì đổi tên — ít điểm phải sửa nơi gọi hơn, nhưng cần review kỹ mọi noi gọi `= kho_hien_tai()` phải đổi thành `= any(kho_hien_tai())` |
| `0016_rls_chung_tu.sql` | 3 policy dùng `kho_id = (select public.kho_hien_tai())`: `"doc ton kho theo pham vi"`, `"doc so cai theo pham vi"`, `"doc chung tu theo pham vi"` (policy thứ 3 có 2 lần, cho `kho_id` và `kho_den_id`) | Đổi cả 4 chỗ thành `kho_id = any((select public.kho_hien_tai()))` — **vẫn bọc `(select ...)` bên ngoài** `any()` đúng D-15/D-06 |
| `supabase/tests/30_rls_test.sql` | Helper `pg_temp.dang_nhap_nhu` set `'kho_id', coalesce(v_nd.kho_id::text, '')` (scalar) | Đổi sang set mảng `kho_id` từ bảng nối; thêm case test "thủ kho 2 kho thấy cả 2, thủ kho 1 kho không thấy kho thứ 3" (yêu cầu CONTEXT.md) |
| `scripts/verify-hook.ts` | `type Claims = { kho_id?: string }`, so sánh `maTheoKhoId.get(claims.kho_id)` (scalar) | Đổi kiểu `kho_id?: string[]`, so sánh từng phần tử mảng với danh sách kho mong đợi của tài khoản mẫu |
| `scripts/_supabase-admin.ts` | `TAI_KHOAN_MAU` có `maKho: string \| null` (1 kho) | Đổi thành `maKho: string[] \| null` nếu muốn seed thêm 1 tài khoản thủ kho 2 kho để test D-06 (khuyến nghị thêm 1 tài khoản mẫu mới `thukho2@khominhvu.local` gắn cả K1+K2, giữ `thukho1` chỉ 1 kho để test "không thấy kho khác" vẫn còn) |
| `scripts/seed-users.ts` | `.from("nguoi_dung").upsert({ kho_id: khoId })` | Thêm bước upsert vào bảng nối `nguoi_dung_kho` sau khi tạo `nguoi_dung` |

**Thứ tự migration để không có khoảng hở RLS vỡ:** (1) tạo bảng nối + backfill dữ liệu trước, (2)
đổi helper `kho_hien_tai()` trả mảng, (3) đổi hook đọc từ bảng nối, (4) đổi policy dùng `any()` —
**thứ tự 2 và 4 phải cùng 1 migration/transaction** (đổi helper mà chưa đổi policy dùng nó là vô
hại vì kiểu trả về đổi nhưng chưa ai gọi khác cách; đổi policy trước khi helper đổi kiểu sẽ lỗi biên
dịch ngay lập tức) — an toàn nhất là gộp bước 2-3-4 vào **một file migration duy nhất** (giống cách
Phase 1 gộp 0014a/b/c thành 1 lần chạy `db push`), tách theo comment section thay vì tách file, vì
Postgres không cho "sửa nửa vời" một transaction DDL.

### D-20 — Nhật ký sửa append-only (mẫu từ `kho_movement`)

Tái dùng chính xác pattern 2 lớp đã có ở 0008 (REVOKE + trigger), áp cho bảng mới `nhat_ky_sua`:

```sql
create table public.nhat_ky_sua (
  id uuid primary key default uuid_generate_v4(),
  bang text not null,              -- 'san_pham' | 'doi_tac' | 'nguoi_dung'
  ban_ghi_id uuid not null,
  truong text not null,
  gia_tri_cu jsonb,
  gia_tri_moi jsonb,
  nguon text not null,             -- 'form'|'sua_o'|'hang_loat'|'goi_y_duoi'|'import'|'ra_ghi_chu'
  nguoi_sua_id uuid references public.nguoi_dung(id),
  sua_luc timestamptz not null default now()
);
create index idx_nhat_ky_sua_tra_cuu on public.nhat_ky_sua (bang, ban_ghi_id, sua_luc desc);

revoke update, delete on public.nhat_ky_sua from anon, authenticated, service_role;
create trigger chan_sua_xoa_nhat_ky
  before update or delete on public.nhat_ky_sua
  for each row execute function public.chan_sua_xoa_so_cai();  -- TÁI DÙNG hàm đã có, không viết hàm mới
```

**Ghi nguồn qua `set_config`:** RPC/Route Handler set `perform set_config('app.nguon_sua', 'import',
true)` NGAY ĐẦU transaction trước khi UPDATE/INSERT bảng bị theo dõi; trigger đọc lại bằng
`current_setting('app.nguon_sua', true)` (tham số `true` = không lỗi nếu chưa set, trả NULL) —
mặc định `'form'` nếu NULL (đường ghi qua UI thường không set, chỉ RPC hàng loạt/import mới cần set
tường minh vì chúng không đi qua form). **Đây là kỹ thuật phổ thông của Postgres** (session-local
GUC qua `set_config(..., true)` = chỉ trong transaction hiện tại, tự động reset khi commit/rollback)
— không cần thư viện ngoài, HIGH confidence vì đã dùng tương tự cho JWT test claims trong 30_rls_test.

**Trigger dùng chung cho 3 bảng:** một hàm `ghi_nhat_ky_sua()` generic đọc `TG_TABLE_NAME`, so sánh
`to_jsonb(OLD)` với `to_jsonb(NEW)` để tìm cột nào đổi (dùng `jsonb_each` + so sánh giá trị từng
key), tránh viết 3 trigger riêng biệt cho từng bảng — giảm code trùng lặp, và tự động phủ cột mới
nếu sau này bảng `san_pham`/`doi_tac` thêm cột (không cần sửa trigger).

### D-08 — Cấu hình đánh số chứng từ (đổi `sinh_so_ct` từ hard-code)

`sinh_so_ct` (0009) hiện `case p_loai when 'NHAP' then 'PN' ... end` — hard-code trong thân hàm
PL/pgSQL. Thêm bảng cấu hình, đổi hàm đọc từ bảng thay vì `CASE`:

```sql
create table public.cau_hinh_so_ct (
  loai_ct public.loai_ct primary key,
  tien_to text not null,      -- CHECK: [A-Z0-9]{1,5}, unique giữa các loại
  so_chu_so smallint not null default 6 check (so_chu_so between 3 and 8)
);
-- seed 7 dòng từ giá trị hard-code hiện tại (PN, PX, TN, TK, CK, KK, DC)
alter table public.cau_hinh_so_ct add constraint uq_tien_to unique (tien_to);
```

Đổi `sinh_so_ct`: thay khối `case p_loai when ...` bằng
`select tien_to, so_chu_so into v_tien_to, v_so_chu_so from public.cau_hinh_so_ct where loai_ct =
p_loai` — nếu không thấy dòng, `raise exception` (an toàn hơn trả `NULL` âm thầm như code cũ vốn
đã có nguy cơ này qua nhánh `else` không tồn tại). **Không ảnh hưởng số đã phát hành** vì
`chuoi_so_ct` (bảng đếm) độc lập với `cau_hinh_so_ct` (bảng cấu hình định dạng) — đổi tiền tố/số chữ
số chỉ tác động lần `sinh_so_ct` kế tiếp, đúng yêu cầu D-08 "đổi giữa năm: số mới dùng định dạng mới,
số đã phát giữ nguyên" (số đã phát là **chuỗi text đã lưu trong `chung_tu.so_ct`**, không tính lại).

**Test `20_chung_tu_test.sql` hiện có** rất có thể assert cứng tiền tố `'PN26-000001'` — cần đọc lại
file này lúc plan để xác nhận không giả định tiền tố hard-code theo cách phá vỡ khi đổi cấu hình
(nếu test tạo dữ liệu bằng cách gọi `sinh_so_ct` thay vì literal string thì không bị ảnh hưởng).

### Kiến trúc đăng nhập (D-01/D-03/D-35)

`src/proxy.ts` đã có khung comment chính xác (đọc lúc research, xem code). Việc cần làm chỉ là bật
logic đã comment sẵn + thêm validate `tiep_tuc`:

```ts
// Chống open redirect: chỉ chấp nhận path nội bộ bắt đầu "/", không phải "//..." (protocol-relative
// URL trỏ ra ngoài) và không chứa "://" (chặn "/\evil.com" hoặc encode lạ).
function tiepTucAnToan(gt: string | null): string {
  if (!gt || !gt.startsWith("/") || gt.startsWith("//") || gt.includes("://")) return "/";
  return gt;
}
```

Ghép username→email nội bộ **ở phía client trước khi gọi `signInWithPassword`** (không cần Route
Handler riêng — `@supabase/ssr` browser client gọi thẳng Supabase Auth từ trình duyệt là pattern
chuẩn, không lộ bí mật vì chỉ dùng `anon` key). Chuẩn hóa tên đăng nhập (`chuẩn hóa: chữ thường,
không dấu, chỉ [a-z0-9._-]`) nên tái dùng hàm `chuanHoa` đã có ở `tach-dvt-cong-doan.ts` (đã xử lý
bỏ dấu tiếng Việt đúng cách) thay vì viết lại — chỉ cần thêm bước lowercase + strip ký tự ngoài
whitelist sau khi gọi `chuanHoa`.

`phai_doi_mat_khau` — cờ này đọc ở đâu để redirect trong `proxy.ts`? **Không đọc được từ JWT claim**
trừ khi thêm vào `custom_access_token_hook` (giống `vai_tro`/`kho_id`) — khuyến nghị làm vậy (thêm
1 dòng `jsonb_set` trong hook, không tốn thêm query vì hook đã `select` từ `nguoi_dung`) thay vì để
`proxy.ts` tự query DB mỗi request (proxy chạy trên **Edge runtime** theo mặc định của Next.js
middleware/proxy — gọi trực tiếp Postgres từ Edge không khả thi, phải qua REST/JWT). Đây là điểm
CONTEXT.md nêu là "cần research: claim từ hook vs DB lookup" — **kết luận: dùng claim từ hook**, vì
proxy chạy Edge không có đường nào khác hiệu quả để tra bảng.

### antd v6.6.3 — các đổi API cần biết trước khi viết Drawer/Table (D-13, D-18)

Verify qua migration guide chính thức `ant.design/docs/react/migration-v6/` (dự án đã ở v6.6.3, sau
các bản vá 6.1.x-6.6.x nêu trong changelog):

| Thành phần | Đổi so với v5 | Ảnh hưởng Phase 2 |
|---|---|---|
| `Table.pagination.position` | Đổi tên thành `pagination.placement` | Không dùng nếu chỉ đặt pagination mặc định (bottom-right) — chỉ cần biết nếu tùy chỉnh vị trí |
| `Table` selection callbacks (`onSelectAll`, `onSelectInvert`...) | Gộp vào `onChange` duy nhất | D-18 "chọn nhiều dòng → gán hàng loạt" (WU-28) phải dùng `rowSelection.onChange`, không dùng các callback rời đã bị loại |
| `Table size="middle"` | Đổi thành `size="medium"` | Nếu copy code mẫu v5 cũ từ tài liệu/Stack Overflow, chuỗi `"middle"` sẽ không còn hợp lệ — TypeScript sẽ bắt lỗi này ngay ở `npm run typecheck` |
| `Drawer.width` / `Drawer.height` | Thay bằng `size` | **Ảnh hưởng trực tiếp D-13** (Drawer bên phải cho tạo/sửa mã hàng/đối tác) — không dùng `width={480}` như quen thuộc v5, phải tra API `size` mới (thường nhận token kích thước định sẵn, không phải số px tùy ý — cần đọc kỹ doc Drawer v6 lúc code, đây là thay đổi thu hẹp khả năng tùy biến so với v5) |
| `Drawer.headerStyle/bodyStyle/footerStyle/maskStyle` | Gộp vào `styles={{ header, body, footer, mask }}` | Nếu cần padding tùy chỉnh cho nội dung Drawer (form dài) |
| `Select.dropdownStyle/dropdownClassName/dropdownRender` | Đổi thành `styles.popup.root` / `classNames.popup.root` / `popupRender` | Ảnh hưởng Select `dvt`/`cong_doan`/`nhom_hang` nếu cần tùy biến dropdown (ví dụ thêm nút "Tạo mới" trong dropdown — không có trong yêu cầu hiện tại, nhưng nếu planner thêm thì phải dùng API mới) |
| `Form.List` | Không còn lấy dữ liệu từ item con chưa register — bỏ được `getFieldsValue({ strict: true })` | Không dùng `Form.List` trong Phase 2 (không có form mảng động) — ghi chú để không bị bất ngờ nếu Phase sau cần |

**Khuyến nghị:** viết 1 component Drawer form dùng chung tối thiểu (props `open`, `onClose`, `size`)
để tránh lặp lại việc tra API `size` mới ở nhiều nơi (D-13 dùng cho cả danh mục lẫn đối tác, D-33).

## Don't Hand-Roll

| Vấn đề | Đừng tự viết | Dùng thay | Vì sao |
|---|---|---|---|
| Thu hồi phiên khi đổi vai trò | Tự implement blacklist JWT bằng Redis/bảng riêng | `auth.sessions` (đã có sẵn trong GoTrue) + live-lookup `dang_hoat_dong` cho phần cần tức thời | Supabase đã có `session_id` claim + bảng `auth.sessions` thiết kế đúng cho việc này — tự dựng thêm 1 tầng blacklist song song là trùng lặp hạ tầng đã tồn tại |
| Ẩn giá vốn theo vai trò | Middleware Next.js lọc field JSON response trước khi trả về client | `REVOKE SELECT (cột)` ở Postgres + RPC `security definer` | Chặn ở tầng ứng dụng có thể bị bỏ sót ở 1 endpoint mới thêm sau này; chặn ở DB đúng "AUTH-05/D-16 chặn ở database" và không phụ thuộc việc nhớ áp lại middleware mỗi route mới |
| Đếm tổng số dòng cho phân trang | Query `SELECT COUNT(*)` riêng rồi query `SELECT ... LIMIT` riêng (2 round-trip) | `count(*) over()` trong 1 câu lệnh | Ít round-trip hơn, và bảng 3.266 dòng không cần tối ưu COUNT kiểu "estimated" của bảng lớn |
| Đọc file Excel KiotViet ở trình duyệt | Viết lại logic tách ĐVT/công đoạn bằng JS chạy client, bỏ qua exceljs stream reader | Route Handler tái dùng `doc-file.ts`/`tach-dvt-cong-doan.ts` đã có | Hai code path xử lý cùng 1 định dạng file dễ lệch nhau theo thời gian, và trình duyệt không chạy được `WorkbookReader` với `styles: "ignore"` |
| Validate tên đăng nhập chuẩn hóa không dấu | Viết lại regex bỏ dấu tiếng Việt riêng cho form đăng nhập | Hàm `chuanHoa()` đã có ở `tach-dvt-cong-doan.ts` | Đã xử lý đúng combining marks tiếng Việt (`normalize('NFD')` + strip), viết lại dễ sót ca như `đ/Đ` |
| Ghi nhật ký sửa cho 3 bảng | 3 trigger riêng biệt, mỗi cái liệt kê tay từng cột cần theo dõi | 1 hàm trigger generic đọc `to_jsonb(OLD)`/`to_jsonb(NEW)` + `TG_TABLE_NAME` | Tự động phủ cột mới nếu bảng đổi sau này, giảm 3 lần code trùng lặp logic so sánh |

**Key insight:** Toàn bộ 4 câu hỏi nghiên cứu của phase này đều có chung một câu trả lời gốc: **đừng
cố giải quyết ở tầng ứng dụng (Next.js/React) những gì Postgres/Supabase đã có cơ chế cho ở tầng
database (GRANT/REVOKE cột, `auth.sessions`, window function, RPC)**. Đây chính là triết lý đã được
xác lập từ Phase 1 ("Postgres là backend duy nhất") — Phase 2 chỉ là phép thử đầu tiên của triết lý
đó khi có UI thật gây áp lực "làm cho nhanh ở component" thay vì "làm đúng ở schema".

## Common Pitfalls

### Pitfall 1: Tưởng đổi vai trò có hiệu lực ngay vì đã gọi `signOut`
**What goes wrong:** Quản lý đổi vai trò một nhân viên, gọi `supabase.auth.signOut()` ở đâu đó nghĩ
là "đã đăng xuất họ" — nhưng đây là **client-side signOut cho phiên hiện tại của người gọi**
(chính quản lý), không đăng xuất được người khác.
**Why it happens:** Tên hàm giống nhau (`signOut`) giữa client API và admin API, nhưng client API
không nhận `userId`.
**How to avoid:** Chỉ dùng `auth.admin.*` (namespace admin) cho hành động server-side nhắm vào
người khác, và chấp nhận nó KHÔNG kill được access token đang sống (xem Câu hỏi 1).
**Warning signs:** Test thủ công: đổi vai trò tài khoản A trong khi tab B đang đăng nhập là A, thấy
tab B **vẫn** thao tác được theo quyền cũ ngay sau khi đổi — đây là hành vi ĐÚNG theo giới hạn kỹ
thuật đã xác nhận, không phải bug, nhưng phải được UAT chấp nhận trước, không phát hiện giữa chừng.

### Pitfall 2: REVOKE SELECT một cột làm vỡ RPC tưởng chừng không liên quan
**What goes wrong:** Sau khi `REVOKE SELECT (gia_von) ... FROM authenticated`, hàm `tim_san_pham`
(vốn chỉ để tìm kiếm, không ai nghĩ nó "liên quan tới giá vốn") lỗi 42501 cho MỌI vai trò vì nó
`select sp.*` (bao gồm `gia_von`) và không phải `security definer`.
**Why it happens:** `select *`/`returns setof <table>` âm thầm kéo theo mọi cột, kể cả cột không
dùng tới — REVOKE là chặn theo **cột được truy cập trong câu lệnh**, không phải theo "có cần dùng
giá trị đó hay không" ở tầng ứng dụng.
**How to avoid:** Sau khi REVOKE bất kỳ cột nào trên `san_pham`/`kho_movement`, **grep toàn bộ
`select \*` và `returns setof public.san_pham`/`kho_movement`** trong `supabase/migrations/` để tìm
hết các hàm bị ảnh hưởng — không chỉ sửa những hàm "nghĩ tới đầu tiên".
**Warning signs:** pgTAP xanh cho test giá vốn mới nhưng `40_tim_kiem_test.sql` (đã có từ Phase 1)
đỏ sau khi thêm REVOKE — đây là tín hiệu đúng loại lỗi này, phải chạy lại **toàn bộ** suite sau khi
đổi quyền cột, không chỉ file test mới viết.

### Pitfall 3: Parse Excel ở client vì "thấy code mẫu chạy được trên file demo"
**What goes wrong:** Viết thử `workbook.xlsx.load(buffer)` ở component React với file mẫu tự tạo
(sạch, không lỗi styles) → chạy ngon → tưởng đã xong D-22 → khi thử file `DanhSachSanPham` KiotViet
thật mới phát hiện crash `reading 'styles'`, lúc đó code đã viết theo kiến trúc client-side, phải
viết lại toàn bộ luồng.
**Why it happens:** File test tự tạo trong lúc code không tái tạo được lỗi styles.xml của KiotViet
(lỗi này đặc thù cho file do phần mềm KiotViet xuất ra, không phải do exceljs viết sai chuẩn chung).
**How to avoid:** **Luôn test bằng file export KiotViet thật** (`data/kiotviet/*.xlsx`, đã có sẵn từ
Phase 1) ngay từ vòng lặp code đầu tiên của WU-20/WU-30, không dùng file tự tạo làm bằng chứng "đã
xong".
**Warning signs:** Không có file KiotViet thật nào được dùng để test trong suốt quá trình code —
đây tự nó là dấu hiệu cảnh báo, không cần đợi tới khi lỗi xảy ra.

### Pitfall 4: `count(*) over()` biến mất khi trang đang xem rỗng
**What goes wrong:** Người dùng lọc còn 12 dòng nhưng đang ở "trang 3" (do trước đó lọc rộng hơn) —
`OFFSET` vượt quá 12 dòng → trả về 0 dòng → `tong_so_dong` cũng mất theo (không có dòng nào để đính
kèm) → FE hiển thị "Tổng: 0" sai, gây hoang mang tưởng lọc ra rỗng.
**Why it happens:** `count(*) over()` là giá trị đính kèm TỪNG DÒNG kết quả, không phải giá trị độc
lập của câu lệnh — không có dòng thì không có giá trị.
**How to avoid:** FE giữ nguyên `p_trang` trong URL nhưng phải tự phát hiện "0 dòng trả về nhưng
`p_trang > 1`" rồi tự động gọi lại với `p_trang = 1` (hoặc trang cuối tính được nếu biết tổng từ lần
gọi trước) — hoặc RPC luôn trả thêm 1 dòng tổng riêng bằng CTE độc lập không phụ thuộc OFFSET (tốn
thêm 1 lần quét nhưng đơn giản hơn xử lý ở FE). Quyết định cụ thể để planner chọn, nhưng PHẢI xử lý
ca này, không bỏ qua.
**Warning signs:** Đổi bộ lọc làm số lượng kết quả giảm mạnh trong khi đang ở trang cao — pgTAP nên
có 1 test dựng đúng tình huống này (lọc còn ít hơn `p_trang * p_kich_thuoc`).

## Runtime State Inventory

Phase này KHÔNG phải rename/refactor/migration string — là build tính năng mới trên schema đã có
với một số thay đổi cấu trúc (D-06 nhiều kho, D-08 cấu hình đánh số, D-16 quyền cột, D-20 nhật ký).
Không áp dụng bảng kiểm kê rename đầy đủ, nhưng có 2 điểm cần lưu ý tương tự "runtime state" vì đụng
tới dữ liệu đã tồn tại trên database thật (không phải database rỗng như lúc Phase 1 viết migration):

| Hạng mục | Phát hiện | Hành động |
|---|---|---|
| Dữ liệu đã lưu | `nguoi_dung.kho_id` của 4 tài khoản demo hiện có giá trị (thukho1 = K1) | Backfill sang bảng nối `nguoi_dung_kho` trong CHÍNH migration tạo bảng, không để bước riêng — tránh khoảng hở nơi RLS theo kho không thấy dữ liệu nào (bảng nối rỗng) |
| Session đang sống | Không có (môi trường dev/demo, không có người dùng thật đang thao tác lúc chạy migration) | Không cần xử lý đặc biệt cho go-live thật — nhưng khi lên PRODUCTION thật (sau go-live), đổi cấu trúc `kho_id` JWT claim từ scalar sang mảng sẽ cần **mọi người dùng đăng nhập lại** (JWT cũ có `kho_id` dạng string, code mới đọc mảng sẽ không parse được) — ghi vào runbook go-live nếu Phase 2 này chạy sau khi đã có người dùng thật (hiện tại: chưa, an toàn) |

**Nothing found ngoài 2 mục trên** — verify bằng cách đã đọc toàn bộ 25 migration hiện có và không
thấy nơi nào khác lưu `kho_id` dạng scalar ngoài 2 chỗ đã liệt kê ở bảng D-06 phía trên.

## Xác minh dữ liệu thật (DLIEU-04, D-27) — chạy trực tiếp trên cloud DB

Đã chạy SQL read-only trên `phonzyruoalimgaovljm` (không ghi gì) để kiểm 2 giả định quan trọng cho
WU-08/WU-09 trước khi viết RPC "Rà ghi chú"/"Lịch sử đối tác":

1. **Mỗi hóa đơn có ĐÚNG MỘT giá trị Ghi chú nhất quán trên mọi dòng của nó** — đã verify:
   `4.732 dòng / 923 mã hóa đơn (`ma_hoa_don`) riêng biệt`, và **0 hóa đơn** có nhiều hơn 1 giá trị
   `ghi_chu` khác nhau giữa các dòng cùng `ma_hoa_don`. → RPC "Rà ghi chú" (WU-08) có thể nhóm theo
   `ghi_chu` chuẩn hóa rồi lấy `ma_hoa_don` bất kỳ đại diện, không cần xử lý ca "1 hóa đơn 2 ghi chú
   khác nhau" (không tồn tại trong dữ liệu thật).
2. **Khớp mã NCC theo tiền tố `nha_cung_cap` KHÔNG THỂ dùng `split_part(..., ' ', 1)` đơn giản** —
   giá trị `"NCC lẻ Nhà cung cấp lẻ"` (74 dòng, xác nhận đúng số trong `.memory/knowledge/du-lieu-kiotviet.md`)
   có khoảng trắng NGAY TRONG PHẦN MÃ ("NCC lẻ", 2 từ) — `split_part` theo khoảng trắng đầu tiên cho
   ra `"NCC"` (không khớp bất kỳ `doi_tac.ma` nào, đúng ý — nhưng nếu code lấy `"NCC lẻ"` bằng cách
   khác, ví dụ so khớp theo tiền tố chuỗi thay vì tách từ, kết quả phải giống nhau: không khớp). Cách
   đúng: `doi_tac.ma` hiện tại (`NCC000001`..`NCC000023`, `NCC900001`) đều là **1 từ liền không dấu
   cách**, nên match bằng `nha_cung_cap like doi_tac.ma || ' %'` (LIKE theo tiền tố + dấu cách ngay
   sau) sẽ tự động loại đúng "NCC lẻ" (không match được với bất kỳ `doi_tac.ma` 1-từ nào) mà KHÔNG
   cần xử lý case đặc biệt trong code — đơn giản hơn parse bằng `split_part`.
3. **`0317415317`** (2 dòng, mã số thuế nằm nhầm ở cột mã) đã được xử lý ở Phase 1 (đổi thành
   `NCC900001` trong `doi_tac`, nhưng **dữ liệu gốc trong `luu_tru_nhap_kiotviet.nha_cung_cap` vẫn
   giữ nguyên chuỗi cũ `"0317415317 CÔNG TY TNHH..."`** — xác nhận bằng query trực tiếp) → RPC lịch
   sử đối tác (WU-09) cho NCC `NCC900001` cần **thêm 1 case đặc biệt hard-code**: khi tìm dòng
   `luu_tru_nhap_kiotviet` của đối tác này, match CẢ tiền tố `NCC900001` LẪN tiền tố `0317415317`
   (2 dòng) — không thể suy tự động từ dữ liệu, phải liệt kê tường minh trong code/migration (comment
   rõ lý do, trỏ về `.memory/knowledge/du-lieu-kiotviet.md`).
4. **`doi_tac` hiện chỉ có 23 dòng, toàn bộ `loai = 'NCC'`** — xác nhận CHƯA có khách hàng nào
   (đúng kỳ vọng, DLIEU-04 là việc của Phase 2) và **NB001/NB002 KHÔNG có trong `doi_tac`** (đúng
   như `.memory/knowledge/du-lieu-kiotviet.md` đã ghi — chúng là "NCC ảo" chỉ dùng trong
   `luu_tru_nhap_kiotviet`, D-33 xác nhận "NCC ảo NB001/NB002 vẫn không có trong doi_tac").

## Open Questions

1. **Nền tảng deploy thực tế của dự án `kiotviet` là gì?**
   - Đã biết: CLAUDE.md **toàn cục** (Spartan) mặc định Railway/AWS/GCP cho stack Kotlin/Next.js
     nói chung, nhưng đây là hướng dẫn generic cho nhiều dự án, KHÔNG phải cấu hình xác nhận riêng
     cho `kiotviet` (dự án Next.js + Supabase thuần, không có `railway.toml`/Dockerfile nào tìm
     thấy trong repo lúc research).
   - Chưa rõ: giới hạn body size thật cho Route Handler import Excel (Câu hỏi 3) phụ thuộc hoàn
     toàn vào nơi deploy — Vercel giới hạn cứng 4.5-6MB, self-host Node thì gần như không giới hạn.
   - Khuyến nghị: hỏi người dùng lúc plan/execute trước khi khóa cứng bất kỳ giả định về kích thước
     file tối đa trong thông báo lỗi UI; với quy mô dữ liệu hiện tại (vài MB), rủi ro thấp trên mọi
     nền tảng phổ biến.

2. **Owner của hàm `thu_hoi_phien_nguoi_dung` có thật sự có quyền `DELETE` trên `auth.sessions`
   trên project cloud CỤ THỂ này hay không?**
   - Đã biết: pattern cộng đồng dùng `security definer` owned by `postgres`, giả định `postgres` có
     quyền do Supabase cấp sẵn.
   - Chưa rõ: chưa test trực tiếp trên `phonzyruoalimgaovljm` (không muốn tạo hàm ghi vào schema
     `auth` trong lúc research — đây là hành động ghi, ngoài phạm vi "chỉ SELECT" được giao).
   - Khuyến nghị: WU-13 chạy `select has_table_privilege('postgres', 'auth.sessions', 'DELETE');`
     ngay khi bắt đầu viết migration, trước khi viết phần còn lại phụ thuộc vào giả định này.

3. **Biểu thức "đuôi mã suy công đoạn" trong RPC "Cần rà" (Câu hỏi 4) có ra đúng ~356 mã như
   CONTEXT.md đã nêu không?**
   - Đã biết: quy ước đuôi `-CB`(97,3%)/`-X`(95,3%)/`-S`(94,4%) từ `.memory/knowledge/du-lieu-kiotviet.md`,
     và biến thể `-SĐM` được nhắc tới nhưng chưa gộp vào regex nháp ở Câu hỏi 4.
   - Chưa rõ: con số chính xác khi chạy thật trên `phonzyruoalimgaovljm` với biểu thức đề xuất.
   - Khuyến nghị: WU-07 chạy `select count(*) from san_pham sp join cong_doan cd ...` bằng regex đề
     xuất, so khớp ~356 trước khi đóng gói vào RPC chính thức; lệch thì tinh chỉnh regex, không thay
     đổi ý nghĩa nghiệp vụ.

4. **`20_chung_tu_test.sql` (Phase 1) có assert cứng tiền tố `PN`/`PX`/... hay không?**
   - Đã biết: file test tồn tại, chưa đọc chi tiết nội dung trong phiên research này (ngoài phạm vi
     câu hỏi bắt buộc, nhưng ảnh hưởng WU-03 D-08).
   - Khuyến nghị: WU-03 đọc lại file này TRƯỚC khi đổi `sinh_so_ct`, đảm bảo test không giả định
     tiền tố hard-code theo cách phá vỡ khi đọc từ bảng cấu hình mới.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Supabase cloud project (`phonzyruoalimgaovljm`) | Toàn bộ phase | ✓ (đã link, đã verify bằng psql trực tiếp) | Postgres 17.x (kế thừa Phase 1) | — |
| `psql` + `DATABASE_URL` (Session pooler) | Test đồng thời, xác minh dữ liệu thật | ✓ đã dùng trong research này | — | — |
| exceljs | DMUC-06/07 | ✓ có sẵn `package.json` | 4.4.0 | — |
| antd | DMUC/DTAC/CDAT UI | ✓ có sẵn | 6.6.3 | — |
| Nền tảng deploy production | Giới hạn body size Route Handler (Câu hỏi 3) | **Chưa xác định** | — | Xem Open Question 1 — không chặn phase, chỉ chặn việc khóa cứng thông báo lỗi kích thước file |

**Missing dependencies with no fallback:** Không có.

**Missing dependencies with fallback:** Nền tảng deploy — fallback là thiết kế thông báo lỗi "File
quá lớn, vui lòng chia nhỏ" chung chung không phụ thuộc số MB cụ thể, cho tới khi biết chắc nền tảng.

## Validation Architecture

`workflow.nyquist_validation = true` trong `.planning/config.json` → bắt buộc mục này.

### Test Framework

| Property | Value |
|---|---|
| Framework | pgTAP (bundled, đã dùng suốt Phase 1) — **không có Vitest hay bất kỳ JS test runner nào được cài** (xác nhận: không thấy `vitest`/`jest` trong `package.json` devDependencies) |
| Config file | Không có config riêng — `supabase/config.toml` mặc định |
| Quick run command | `npm run db:test` (reset local + `supabase test db`) |
| Full suite command | `npm run db:test:linked` (chạy trên cloud linked project) + `npm run verify:hook` + `npm run test:dong-thoi` (nếu đổi liên quan concurrency) |

**Khoảng trống JS/TS test:** dự án hiện **không có** cách tự động verify logic phía client (form
validate, Drawer, redirect `proxy.ts`, ghép username→email) ngoài `npm run check` (typecheck + lint
+ build) — đây KHÔNG phải test hành vi, chỉ bắt lỗi biên dịch/style. Theo CLAUDE.md, cài thư viện
mới (Vitest/Testing Library) **phải hỏi người dùng trước**. Khuyến nghị research: **không đề xuất
cài Vitest trong Phase 2** trừ khi người dùng chủ động muốn — thay vào đó, những gì verify được mà
không cần thư viện mới:
- Logic thuần (validate `tiepTucAnToan`, chuẩn hóa username, biểu thức "Cần rà") → viết dưới dạng
  hàm thuần trong `src/shared/lib/` hoặc `src/features/*/lib/`, verify bằng cách gọi thử qua
  `tsx` script tạm (giống cách Phase 1 dùng `scripts/phan-tich.ts` để soi dữ liệu) — không phải test
  tự động lặp lại được, nhưng đủ để verify 1 lần lúc code.
- Toàn bộ logic nghiệp vụ nhạy cảm (quyền, đánh số, giá vốn, phân trang) đã và nên tiếp tục nằm ở
  RPC Postgres → verify bằng pgTAP như Phase 1, đây là nơi ROI cao nhất cho effort test.
- UAT thủ công (đã có trong `.planning/phases/01-nen-du-lieu/01-UAT.md` làm khuôn mẫu) là lớp verify
  chính cho hành vi UI/UX (Drawer, redirect, thông báo lỗi đọc được) — không tự động hóa được nếu
  không thêm thư viện.

### Phase Requirements → Test Map

| Req ID | Hành vi | Loại test | Lệnh tự động | File đã có? |
|---|---|---|---|---|
| AUTH-01 | Đăng nhập username→email, phiên giữ qua refresh | manual + pgTAP gián tiếp (JWT có claim đúng) | `npm run verify:hook` (đã có, cần cập nhật cho `phai_doi_mat_khau`) + UAT thủ công đăng nhập/F5 | ✅ script có sẵn, cần sửa |
| AUTH-02 | Chặn route chưa đăng nhập, quay lại đúng trang | manual (Playwright không có sẵn) | UAT thủ công: vào `/danh-muc` chưa đăng nhập → `/dang-nhap?tiep_tuc=/danh-muc` → đăng nhập → về `/danh-muc` | ❌ không có test tự động, chấp nhận theo Validation Architecture ở trên |
| AUTH-07 | Đăng xuất từ mọi trang | manual | UAT thủ công | ❌ |
| DMUC-01..03 | Phân trang/lọc/tìm server, tổng số dòng đúng | pgTAP | `supabase/tests/41_danh_sach_san_pham_test.sql` (mới, WU-07) — assert `tong_so_dong` đúng khi filter, đúng khi trang rỗng (Pitfall 4) | ❌ Wave 2 |
| DMUC-04 | Tạo/sửa `dvt`/`cong_doan` độc lập | pgTAP (RLS/constraint) + manual (Drawer) | Constraint đã có từ Phase 1 (`0005`), không cần test mới trừ khi đổi DDL | ✅ (Phase 1) |
| DMUC-05 | Chi tiết + thẻ kho | pgTAP | `supabase/tests/52_lich_su_the_kho_test.sql` (WU-09) — assert thủ kho chỉ thấy kho mình, gia_von ẩn đúng vai trò | ❌ Wave 2 |
| DMUC-06 | Import không nạp nửa vời, báo lỗi rõ | pgTAP (RPC nạp) + manual (file KiotViet thật) | `supabase/tests/61_import_danh_muc_test.sql` (WU-10) — assert transaction rollback khi có lỗi dòng giữa chừng; **manual bắt buộc dùng file `data/kiotviet/*.xlsx` thật** (Pitfall 3) | ❌ Wave 2 |
| DMUC-07 | Export theo filter, cột giá vốn theo quyền | manual (không pgTAP vì xuất ra file, không phải hành vi DB thuần) | UAT thủ công: export bằng tài khoản văn phòng vs thủ kho, mở file kiểm cột | ❌ |
| DTAC-01..03 | Danh sách, tạo/sửa, lịch sử | pgTAP (RLS/constraint) + manual | Tương tự DMUC | ❌ Wave 2/5 |
| DLIEU-04 | Rà ghi chú thành khách/sale | pgTAP (RPC) + manual (UAT với người văn phòng thật, theo `.specifics` của CONTEXT.md) | `supabase/tests/51_ra_ghi_chu_test.sql` (WU-08) — assert nhóm đúng theo `ghi_chu` chuẩn hóa (đã verify 0 hóa đơn có ghi chú mâu thuẫn ở §Xác minh dữ liệu thật) | ❌ Wave 2 |
| CDAT-01 | Quản lý người dùng, thu hồi phiên | pgTAP (RLS quan_ly-only) + **manual bắt buộc** (không tự động hóa được việc "đo độ trễ thu hồi thật" — cần chờ thời gian thật hoặc giả lập JWT hết hạn) | `supabase/tests/30_rls_test.sql` mở rộng (D-06 case 2 kho) + UAT: đổi vai trò 1 tài khoản demo, quan sát hành vi trước/sau `jwt_expiry` | ❌ mở rộng |
| CDAT-02, CDAT-03 | Kho/nhóm hàng/ĐVT/công đoạn CRUD | pgTAP | Constraint đã có, thêm test lỗi `23503` đọc được nếu WU-18 đổi cách trả lỗi | ❌ nếu cần |
| CDAT-04 | Đánh số cấu hình được | pgTAP | `supabase/tests/80_cau_hinh_so_ct_test.sql` (WU-03) — assert đổi tiền tố không ảnh hưởng số đã phát, validate format tiền tố/số chữ số | ❌ Wave 1 |

### Sampling Rate
- **Per task commit:** `npm run db:reset` (migration mới không vỡ chain) + `npm run check` (task có
  đổi TS/TSX).
- **Per wave merge:** `npm run db:test:linked` (toàn bộ pgTAP, bao gồm 89 cũ + mới) + `npm run
  verify:hook` (bắt buộc sau bất kỳ đổi nào ở D-06/hook) + `npm run check`.
- **Phase gate:** Toàn bộ lệnh trên xanh + UAT thủ công theo `.specifics` của CONTEXT.md ("người văn
  phòng thật thao tác trên dữ liệu thật: tìm mã, sửa công đoạn một nhóm mã, rà 10 giá trị ghi chú")
  trước khi `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/41_danh_sach_san_pham_test.sql` — chưa tồn tại, WU-07 phải tự viết trước khi
      code RPC (đỏ→xanh theo quy tắc WORK-UNITS.md).
- [ ] Cột `san_pham.can_ra_dvt` (D-19, 8 mã) — chưa có trong schema, phải thêm ở WU-07, không phải
      cột có sẵn từ Phase 1 như CONTEXT.md có thể ngụ ý.
- [ ] Bảng `nguoi_dung_kho` (D-06) — chưa tồn tại, WU-01 tạo mới hoàn toàn, không phải sửa bảng có
      sẵn.
- [ ] Hàm `thu_hoi_phien_nguoi_dung` (Câu hỏi 1) — **KHÔNG có trong WORK-UNITS.md hiện tại**, phải
      thêm vào WU-13 (hoặc WU-01) trước khi plan, nếu không CDAT-01 "thu hồi phiên" (D-05) không có
      chỗ triển khai cụ thể.
- [ ] Sửa `tim_san_pham` (0022) để không `select sp.*` sau khi REVOKE cột `gia_von` (Pitfall 2) —
      **không có trong WORK-UNITS.md hiện tại**, phải thêm vào WU-04.

*(Không "None" — có 5 gap cụ thể cần bổ sung vào work units trước khi plan chốt.)*

## Sources

### Primary (HIGH confidence)
- https://supabase.com/docs/guides/auth/signout — chữ ký `signOut({scope})`, hành vi 3 scope
- https://supabase.com/docs/reference/javascript/auth-signout — `auth.admin.signOut(jwt, scope)` nhận JWT
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser — `deleteUser(id)` cascade `auth.sessions`
- https://supabase.com/docs/guides/auth/managing-user-data — `ban_duration` không revoke session sống, `deleteUser` cascade
- https://supabase.com/docs/guides/auth/jwts — access token stateless, khuyến nghị hạ `jwt_expiry`
- https://supabase.com/docs/guides/auth/sessions — `session_id` claim, cấu trúc `auth.sessions`, time-boxed/inactivity timeout
- `supabase/config.toml` (đọc trực tiếp, dòng 164) — `jwt_expiry = 3600` xác nhận local
- Truy vấn trực tiếp `psql` trên cloud project `phonzyruoalimgaovljm` — số liệu DLIEU-04/D-27 (mục
  "Xác minh dữ liệu thật"), schema `san_pham`/`doi_tac`/`luu_tru_*` hiện tại, enum values
- Toàn bộ `supabase/migrations/0001..0025` (đọc trực tiếp) — xác nhận chính xác pattern GRANT/REVOKE,
  RLS, hook, `tim_san_pham` hiện tại không phải `security definer`
- `.memory/patterns/supabase-rls-bao-mat.md`, `.memory/patterns/pgtap-va-test.md` — bài học Phase 1
  đã xảy ra thật, không phải lý thuyết
- https://ant.design/docs/react/migration-v6/ — breaking changes Table/Drawer/Select v5→v6

### Secondary (MEDIUM confidence)
- https://github.com/orgs/supabase/discussions/13941 — trả lời của Supabase collaborator (GaryAustin1)
  xác nhận không có cách revoke JWT đã phát hành; xác nhận `auth.admin.signOut()` chỉ chặn refresh
- https://til.unessa.net/supabase/properly-sign-out/ — pattern cộng đồng `delete from auth.sessions`
  qua hàm `security definer` (chưa verify quyền `postgres` trên schema `auth` của project cụ thể này)
- GitHub `exceljs/exceljs` discussions #2517, #63 — hành vi `WorkbookReader`, phụ thuộc polyfill ES5
- Next.js docs `proxyClientMaxBodySize`, GitHub discussions #70621/#68409, issue #57501 — giới hạn
  body size Route Handler vs Server Action trong App Router

### Tertiary (LOW confidence — cần validate lúc thực thi)
- Quyền `DELETE` của role `postgres` trên `auth.sessions` cho project `phonzyruoalimgaovljm` cụ thể
  — chưa test trực tiếp (không muốn ghi vào schema `auth` trong phạm vi research chỉ-đọc), xem Open
  Question 2.
- exceljs `.load()` ở browser bundle có crash giống `readFile()` trên file KiotViet hay không — suy
  luận từ việc cả hai cùng thuộc nhánh "đọc toàn bộ workbook" khác `WorkbookReader`, nhưng chưa có
  ai thử nghiệm trực tiếp file KiotViet thật qua `.load()` trong trình duyệt để xác nhận 100%.
- Số ~356 mã "Cần rà" từ biểu thức regex đề xuất ở Câu hỏi 4 — chưa chạy thử trên dữ liệu thật.

## Metadata

**Confidence breakdown:**
- D-05 (thu hồi phiên): HIGH cho "không thể revoke JWT sống" (nhiều nguồn độc lập đồng thuận,
  gồm cả câu trả lời trực tiếp của Supabase engineer); MEDIUM cho phần thực thi SQL cụ thể
  (`delete from auth.sessions`) vì chưa test trên project này.
- D-16 (giấu giá vốn): HIGH — dựa hoàn toàn trên cơ chế Postgres đã dùng thật trong chính migration
  0015 của dự án (không phải suy đoán từ tài liệu ngoài), cộng xác nhận trực tiếp qua `\d san_pham`
  trên cloud DB.
- D-22 (Excel): HIGH về kết luận "phải parse server-side"; MEDIUM về chi tiết API browser cụ thể
  (không tìm được tài liệu chính thức xác nhận `.load()` có/không xử lý được styles.xml lỗi).
- D-11 (phân trang): HIGH — kỹ thuật Postgres phổ thông, không phụ thuộc phiên bản/nền tảng cụ thể.
- D-06/D-08/D-20 (grep điểm chạm, cấu hình đánh số, nhật ký sửa): HIGH — đọc trực tiếp toàn bộ mã
  nguồn migration hiện có, không suy đoán.
- Dữ liệu KiotViet thật (DLIEU-04/D-27): HIGH — chạy SQL trực tiếp trên cloud DB, không phải số liệu
  cũ từ tài liệu Phase 1 (dù khớp phần lớn với `.memory/knowledge/du-lieu-kiotviet.md`).
- antd v6 breaking changes: HIGH cho danh sách đổi API (đọc migration guide chính thức); chưa thử
  code thật trong dự án này nên chưa biết hết mọi trap runtime.

**Research date:** 2026-09-13
**Valid until:** ~30 ngày cho phần Postgres/kiến trúc (ổn định); ~14 ngày cho phần Supabase Auth
session/JWT (tính năng đang phát triển, GitHub Discussion #33791 cho thấy cộng đồng vẫn yêu cầu tính
năng JWT blacklist mà Supabase chưa có — có thể đổi bất kỳ lúc nào); antd v6 mới ra 2025-11-22, còn
đang vá lỗi nhanh (6.1.x→6.6.x trong vài tháng) — re-check changelog nếu Phase 2 kéo dài quá 2 tuần.

---
*Phase: 02-khung-ung-dung*
*Research completed: 2026-09-13*
