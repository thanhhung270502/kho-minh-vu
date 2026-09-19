# Phase 4: Đơn đặt hàng & Phiếu xuất - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Tờ đơn đi suốt một vòng: sale báo hàng → văn phòng nhập đơn tạm → quản lý xác nhận →
in giấy cho kho đi lấy hàng → văn phòng nhập số thực xuất → ghi sổ trừ tồn → tiến độ
đơn tự cập nhật. Cộng hai loại trả hàng (`TRA_KHACH` tồn tăng, `TRA_NCC` tồn giảm)
tạo từ chứng từ gốc.

Đây là khối lượng nghiệp vụ chính của hệ thống: **923 phiếu xuất/tuần** (~92/ngày,
5,1 dòng/phiếu). Cơ chế chứng từ đã tôi luyện ở Phase 3 (phiếu nhập) được nhân bản
cho chiều xuất.

**Ba cái đau đang giải** (người dùng tự nêu, Office Hours 20/09):
1. Văn phòng gõ lại đơn từ Zalo/giấy — thông tin qua nhiều tay, sai mã và sai số là chuyện thường
2. Hàng ra kho không ai duyệt — hàng ra trước, giấy tờ theo sau
3. Kho đi lấy hàng không có phiếu cầm tay

**Ra khỏi phạm vi đợt này** (người dùng chốt ở Office Hours — "bản hẹp nhất ship được để học"):
- **XUAT-03 quét barcode** — đo trên database thật: **0/3.270 mã có barcode**. Không có gì để quét.
- **XUAT-08 màn xuất dùng trên điện thoại** — làm sau khi luồng máy tính chạy ổn.
- Ảnh sản phẩm + màn danh mục mobile (hoãn từ Phase 3, và từ phản hồi 19/09 lượt 1).

> **Đã xếp lại (chốt 20/09):** XUAT-03 và XUAT-08 **dời sang Phase 6**, nơi đã có
> KKE-02 "đếm bằng quét mã trên điện thoại" — gộp lại thì chỉ phải chốt thư viện quét
> và dựng khuôn màn mobile một lần. ROADMAP.md và REQUIREMENTS.md đã cập nhật.

</domain>

<decisions>
## Implementation Decisions

### Danh sách người nhận (chắn cứng — không có danh sách thì không tạo được đơn)

Đo trên database thật `kho-vu-tru` ngày 20/09: bảng `doi_tac` có **24 dòng = 23 NCC
+ 1 "Khách lẻ"**. Không có khách hàng/sale nào. `don_dat_hang.doi_tac_id` là
**NOT NULL** → không tạo được đơn nào cho tới khi có danh sách.

Hóa đơn cũ KiotViet: 923 hóa đơn đều ghi cùng một khách *"BỘ PHẬN ĐIỀU PHỐI ĐƠN"*.
Tên người nhận thật nằm trong ô Ghi chú: **154 tên khác nhau**, phủ 699/923 hóa đơn.
Phân bố: 17 tên ≥10 hóa đơn (phủ 516/699) · 10 tên 3–9 · **123 tên chỉ 1–2 hóa đơn**.

- **D-01:** Nguồn tên ngày đầu = **rà 17 tên lớn** (≥10 hóa đơn: NGỌC 58, TỐT 50,
  PHƯƠNG 48, OANH 45, QUỲNH 42, QUYÊN 39, NHUNG 32, DIỆU 31, MỸ 28, VI 27...) qua
  màn `/doi-tac/ra-ghi-chu` đã dựng sẵn ở Phase 2. 123 tên đuôi rà dần khi gặp.
  **Đây là việc của người dùng, không phải của code** — `anh_xa_ghi_chu_kiotviet`
  hiện có **0 dòng**, chưa ai rà tên nào.
- **D-02:** Tên biết danh / gần trùng (`PHƯƠNG` vs `PHƯƠNG BÁN LẺ`, `DẬU CB`, `95B`):
  **máy gợi ý nhóm**, người rà xác nhận gộp hoặc tách. Không tự động gộp.
- **D-03:** Ô người nhận trên đơn là **MỘT ô tìm kiếm duy nhất** trên `doi_tac`.
  Gõ ra tên chưa có → nút "thêm đối tác mới" tạo ngay tại chỗ. **Không thêm cột text
  tự do**; `doi_tac_id` giữ NOT NULL. Lý do: giữ được lịch sử giao dịch theo khách và
  báo cáo "sale nào bán nhiều nhất" ở Phase 5, mà vẫn không kẹt khi gặp tên mới.

### Luồng duyệt đơn

- **D-04:** Trạng thái đơn chỉ mang **trục duyệt**: `TAM` → `DA_XAC_NHAN` →
  `HOAN_THANH` (+ `DA_HUY`). **Trục giao** (đã xuất bao nhiêu / còn lại bao nhiêu)
  **tính khi đọc** từ `so_luong_da_xuat` so với `so_luong_dat` trên từng dòng —
  không thành enum thứ hai. (Chốt hướng B, phản hồi 19/09 mục V-07.)
- **D-05:** `HOAN_THANH` **tự động** khi mọi dòng giao đủ; ngoài ra **quản lý đóng
  sớm được** khi khách không lấy nốt phần còn lại — tránh đơn treo vĩnh viễn.
- **D-06:** Phân vai: **văn phòng** tạo/sửa đơn tạm và tạo phiếu xuất; **chỉ quản lý**
  bấm xác nhận đơn. Thủ kho không tạo đơn. Giữ nguyên 4 vai trò RLS hiện có,
  **không thêm cờ quyền theo từng người** (chốt 19/09 câu 6+9).
- **D-07:** Đơn đã xác nhận mà cần sửa: **chỉ quản lý mở khóa về `TAM`**, mỗi lần mở
  khóa ghi vào `nhat_ky_sua` (trigger generic đã có từ Phase 2).

> **Phải xử lý — enum đang đo trục khác:** `trang_thai_ddh` hiện là
> `MOI | DA_XUAT_MOT_PHAN | DA_XUAT_DU | DA_HUY` (migration 0002) và hàm
> `_cap_nhat_tien_do_ddh` (migration 0011, dòng 139–170) **đang ghi thẳng vào đó**.
> Cần migration đổi trục + sửa hàm để nó chỉ cập nhật `so_luong_da_xuat` và tự đóng
> `HOAN_THANH`. **Thuận lợi: `don_dat_hang` đang có 0 dòng** — không có dữ liệu phải
> chuyển đổi.

### Phiếu in đi lấy hàng

- **D-08:** In **từ ĐƠN đã xác nhận**, không sinh phiếu xuất sớm. Đơn bỏ giữa chừng
  không để lại phiếu xuất rỗng, và không tốn số phiếu rác.
- **D-09:** Nội dung **tối giản**: giữ khuôn mẫu in Phase 3 (không hiện giá, đầu bảng
  lặp khi sang trang), thêm **một cột trống để kho ghi tay số thực lấy**.
  **Không in** tồn hiện tại (số cũ ngay khi in xong), **không** cột kho/công đoạn,
  **không** ô ký nhận.
- **D-10:** Văn phòng nhập số thực xuất. Phiếu xuất sinh từ đơn **điền sẵn mọi dòng
  = số đặt**, người nhập chỉ gõ lại dòng nào kho lấy thiếu rồi ghi sổ. Đây là đường
  đạt mốc **dưới 20 giây một phiếu** (XUAT-01).
- **Lưu ý:** XUAT-06 (in phiếu giao hàng cho khách) **vẫn trong phạm vi** — đó là
  mẫu in thứ hai, in từ phiếu xuất, khác mục đích với tờ đi lấy hàng.

### Ngoại lệ lúc ghi sổ

- **D-11:** Lý do xuất âm = **danh sách cố định + ô ghi chú tự do**. Bốn mục:
  `mã bị tách / xuất nhầm mã` · `hàng đã về chưa nhập phiếu` · `lệch tồn chờ kiểm kê`
  · `khác`. (Mục đầu là nguyên nhân gốc người dùng chỉ ra — xem `<specifics>`.)
  Cho sửa danh sách ở Cài đặt: **hoãn**, chưa cần đợt này.
- **D-12:** Cảnh báo **hai lớp**: dòng đổi màu **ngay khi** số xuất vượt tồn, **và**
  nhắc lại trong hộp tóm tắt trước khi ghi sổ (dùng lại `posting-summary.tsx` Phase 3).
- **D-13:** Kho **sửa được từng dòng**, mặc định điền từ `san_pham.kho_mac_dinh_id`.
  Cơ chế kho-theo-dòng đã dựng ở migration 0041 (cột nullable +
  `coalesce(dòng, header)`), dùng lại nguyên vẹn.
- **D-14:** **Gợi ý mã gần giống**: khi một dòng làm tồn âm, hiện nhắc *"mã X tên gần
  giống đang còn tồn N ở kho K"* (dùng lại RPC `tim_san_pham`), kèm nút
  **"Đề nghị gộp hai mã"** chỉ **ghi lại đề nghị** (mã A, mã B, người đề nghị, phiếu
  phát sinh, thời điểm). **Phase 4 không thực hiện gộp** — xem `<deferred>`.
- **D-15:** **Trả hàng làm trong đợt này**, tạo từ **nút trên chứng từ gốc**: phiếu
  xuất đã ghi sổ → "Khách trả hàng" (`TRA_KHACH`); phiếu nhập đã ghi sổ → "Trả NCC"
  (`TRA_NCC`). Dòng bê sang để sửa số trả. Ràng buộc `ck_tra_hang_co_goc` tự thỏa mãn.

### Claude's Discretion

Người dùng giao lại ba chỗ này:

- **Thứ tự dòng trên phiếu đi lấy hàng** (người dùng: "bạn tự quyết theo cách tối ưu")
  → **Chốt: xếp theo kho, trong mỗi kho xếp theo mã hàng**, và mỗi kho có **một dòng
  tiêu đề nhóm** thay vì thêm hẳn một cột. Lý do: kho đi hết kho 1 rồi mới sang kho 2,
  không chạy qua lại; dòng tiêu đề giữ tờ giấy tối giản đúng D-09 mà vẫn đọc được
  ranh giới; thứ tự theo mã cho mắt quét ổn định.
- **4 mã thiếu `kho_mac_dinh_id`** (3.266/3.270 đã có) → **chặn khi thêm dòng**, kèm
  thông báo chỉ đúng chỗ sửa (Danh mục → mã hàng → kho mặc định). **Không đoán kho.**
- Cách đánh số đơn (`don_dat_hang.so_dh` là text unique, chưa có bộ sinh) → để bước
  nghiên cứu/lập kế hoạch chọn: dùng lại khuôn `sinh_so_ct`/`chuoi_so_ct` hay chuỗi
  riêng. Ràng buộc bắt buộc: **không trùng khi hai người tạo cùng lúc**.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quyết định nghiệp vụ đã chốt (đọc trước hết)
- `.planning/feedback/2026-09-19-business.md` — **bắt buộc đọc hết.** Lời người dùng
  chưa qua diễn giải, bốn mâu thuẫn M-01..M-04, bảy điểm vướng V-01..V-07, và bảng
  **"Chốt cuối — 19/09/2026"** với 8 câu đã khóa (hướng B, không để giá trên đơn,
  kho = `kho_mac_dinh_id`, người nhận là `doi_tac`, giữ 4 vai trò).
- `.planning/ROADMAP.md` §Phase 4 — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` — DDH-01..04, XUAT-01..09 (dòng 60–75)
- `.planning/PROJECT.md` — core value, constraints

### Khuôn cơ chế chứng từ đã tôi luyện (Phase 3 — nhân bản từ đây)
- `.planning/phases/03-phieu-nhap/03-CONTEXT.md` — quyết định của luồng nhập
- `.planning/phases/03-phieu-nhap/03-SUMMARY.md` — 13 plan, 4 lỗi thật đã sửa,
  **và mục "Chưa làm"** (nợ UAT trình duyệt)
- `.planning/phases/03-phieu-nhap/03-UAT.md` — bài kiểm đã dùng cho phiếu nhập

### Luật dự án
- `CLAUDE.md` — 5 nguyên tắc kiến trúc, quy ước đặt tên (code tiếng Anh / URL +
  database tiếng Việt), 7 bước build feature, **18 bẫy đã gặp** (đặc biệt bẫy 1, 5,
  8, 10, 11, 12, 13, 14, 15)
- `.memory/index.md` — trạng thái từng phase, bài học xuyên suốt
- `.memory/patterns/nextjs-antd-supabase-ui.md` — 4 bẫy giao diện lọt qua `npm run check`
- `.memory/patterns/supabase-rls-bao-mat.md` — GRANT ≠ RLS, quyền theo cột
- `.memory/patterns/pgtap-va-test.md` — false pass, test không giả định bảng rỗng
- `supabase/README.md` — cách chạy migration và pgTAP

### Database đã dựng sẵn cho Phase 4 (đọc trước khi viết migration mới)
- `supabase/migrations/0002_enums.sql` — `loai_ct`, `trang_thai_ct`, `trang_thai_ddh`
- `supabase/migrations/0006_don_dat_hang.sql` — `don_dat_hang` + `don_dat_hang_dong`
  (đã có `so_luong_dat`, `so_luong_da_xuat`, `don_gia`)
- `supabase/migrations/0007_chung_tu.sql` — `chung_tu` (đã có `don_dat_hang_id`,
  `chung_tu_goc_id`, `ly_do_xuat_am`, `ghi_chu_ly_do`, `nguoi_duyet_id`,
  `ck_tra_hang_co_goc`)
- `supabase/migrations/0011_rpc_ghi_so.sql` — `ghi_so_chung_tu`, `_ghi_so_xuat`,
  `_ghi_so_tra_khach`, `_ghi_so_tra_ncc`, **`_cap_nhat_tien_do_ddh`** (dòng 139)
- `supabase/migrations/0012_rpc_huy.sql` — `huy_chung_tu` (bút toán đảo)
- `supabase/migrations/0033_ra_ghi_chu_lich_su.sql` — `anh_xa_ghi_chu_kiotviet`,
  `danh_sach_ghi_chu_kiotviet`, `chuan_hoa_ghi_chu` (công cụ rà tên người nhận)
- `supabase/migrations/0041_kho_theo_dong.sql` — kho theo từng dòng
- `supabase/migrations/0045_rpc_chung_tu.sql` — `danh_sach_chung_tu`,
  `chi_tiet_chung_tu`, `dong_chung_tu`
- `supabase/migrations/0046_chi_quan_ly_huy_nhap.sql` — chặn hủy ở tầng database

</canonical_refs>

<code_context>
## Existing Code Insights

### Tầng database của Phase 4 phần lớn ĐÃ DỰNG từ Phase 1 — đừng viết lại

| Có sẵn | Nghĩa là |
|---|---|
| `ghi_so_chung_tu(uuid)` xử lý cả `XUAT`, `TRA_KHACH`, `TRA_NCC` | XUAT-05 và XUAT-09 chỉ thiếu giao diện |
| `ly_do_xuat_am` bị ép ở `ghi_so_chung_tu` (0011 dòng 219, 0041 dòng 76) | XUAT-04 đã chặn ở database, giao diện chỉ cần thu thập lý do |
| `_cap_nhat_tien_do_ddh(uuid)` cộng lại `so_luong_da_xuat` sau mỗi lần ghi sổ | DDH-02/DDH-03 có sẵn phần tính, chỉ cần đổi trục trạng thái |
| `ck_tra_hang_co_goc` | "trả hàng bắt buộc có chứng từ gốc" tự thỏa mãn |
| `chung_tu.nguoi_duyet_id` đã có cột | Không cần thêm cột cho bước duyệt |
| `nguoi_tao_id` mặc định `auth.uid()` (0049) | "tự động điền người nào nhập liệu" đã xong |
| `sinh_so_ct` (0047/0048 — `SECURITY DEFINER`) | Cấp số phiếu chạy được từ client |
| `tim_san_pham` (ILIKE + `word_similarity`, gõ không dấu) | Ô tìm mã và gợi ý mã gần giống dùng chung |

### Reusable Assets (nhân bản từ `src/features/stock-in/`)
- `components/product-search-input.tsx` — ô tìm mã, **nhớ bẫy 15**: phải ưu tiên mã
  khớp tuyệt đối trước khi lấy kết quả đầu tiên
- `components/receipt-line-table.tsx` + `receipt-table-body.tsx` — bảng dòng gõ bàn
  phím (XUAT-07), **nhớ bẫy 14**: bắt Enter ở `onKeyDownCapture` của div bọc ngoài,
  và `setTimeout(..., 0)` khi chuyển focus sau mutation
- `components/posting-summary.tsx` — hộp tóm tắt hậu quả trước khi ghi sổ (D-12)
- `components/receipt-print-template.tsx` + `receipt-print-page.tsx` — mẫu in không
  giá, đầu bảng lặp sang trang (D-09)
- `components/void-receipt-dialog.tsx` — hủy phiếu sinh bút toán đảo
- `components/receipt-filter-panel.tsx` + `receipt-toolbar.tsx` + khuôn
  `ListLayout` — màn danh sách
- `api/receipt.api.ts` + `receipt.keys.ts` + `hooks/useReceipts.ts` — khuôn lớp dữ liệu
- `src/shared/lib/errors.ts` — `explainError()`, `isPostgrestError()`, `errorCode()`
  (**bẫy 8**: lỗi PostgREST KHÔNG phải instance của `PostgrestError`. Lưu ý: CLAUDE.md còn ghi tên cũ `laLoiPostgrest`/`maLoi` — tên thật hiện nay là `isPostgrestError`/`errorCode`)
- `src/shared/components/query-state.tsx` — bốn trạng thái bắt buộc
- `/doi-tac/ra-ghi-chu` (`src/app/(app)/doi-tac/ra-ghi-chu/page.tsx`) — công cụ rà tên
  người nhận, **đã có nhưng chưa ai chạy**

### Established Patterns
- Mapper ở `api/` + `types.ts` là chỗ DUY NHẤT biết tên cột tiếng Việt; component và
  hook không bao giờ thấy `ma_hang`, `so_luong_dat`
- Ghi sổ là RPC Postgres một transaction, không phải Server Action gọi nhiều lệnh
- URL tiếng Việt không dấu (`/dat-hang`, `/xuat-kho`, `?tiep_tuc=`), ruột code tiếng Anh
- File nào import `antd` phải có `"use client"` (bẫy 1); hằng số và hàm thuần để ở
  `features/<x>/lib/*.ts` để cả hai phía import được (bẫy 9)

### Integration Points
- Route mới: `src/app/(app)/dat-hang` (+ `[id]`, `[id]/in`) và `src/app/(app)/xuat-kho`
  (+ `[id]`, `[id]/in`) — đặt tên theo quy ước URL tiếng Việt không dấu
- Điều hướng trong `app-shell` + chặn quyền ở `src/proxy.ts`
- **`scripts/test-route-permissions.ts` phải thêm dòng cho mọi route mới** — bẫy 12:
  lần trước thiếu đúng `/cai-dat` nên script báo 45/45 xanh trong khi trang đó crash.
  Hiện 65/65 ô.
- `npm run db:types` sau mỗi migration

</code_context>

<specifics>
## Specific Ideas

**Nguyên nhân gốc của xuất âm — lời người dùng, 20/09:**

> "có thể xuất sai mã, ví dụ hàng hóa tên A mà người dùng không biết nhập thêm hàng
> mà đã mã khác nữa (do bên quy chuẩn mã thay đổi), nên số lượng thực tế ở kho 100 mà
> trên máy bị tách ra 2 dòng 2 mã khác nhau nên số lượng xuất bị âm"

Nghĩa là: cùng một món hàng vật lý nằm trong kho 100 cái, nhưng trên máy bị tách
thành **hai mã** vì quy chuẩn đặt mã đổi giữa chừng. Xuất theo một mã thì mã đó âm,
trong khi mã kia còn tồn. **Lý do xuất âm phổ biến nhất không phải "hàng về chưa nhập
phiếu" mà là "mã bị tách"** — nên nó là mục đầu trong danh sách lý do (D-11), và là
lý do có D-14 (gợi ý mã gần giống + nút đề nghị gộp).

Người dùng muốn hệ thống **chủ động đề xuất gộp**, không chỉ ghi lý do rồi thôi.
Phase 4 đi được nửa đường: phát hiện + hỏi + ghi lại đề nghị. Nửa còn lại (gộp thật,
gộp cả xuất nhập tồn) là phase riêng.

**Mốc hiệu năng nhắc lại:** dưới 20 giây một phiếu xuất tạo từ đơn có sẵn
(XUAT-01) — đây là lý do D-10 điền sẵn số đặt thay vì bắt gõ lại từng dòng.

</specifics>

<deferred>
## Deferred Ideas

### Gộp hai mã trùng — năng lực mới, cần phase riêng
Người dùng xác nhận muốn có. **Cảnh báo thiết kế phải mang sang phase đó:** gộp mã
đụng thẳng **nguyên tắc kiến trúc số 2 — sổ cái `kho_movement` chỉ thêm, không sửa,
không xóa**. Không được viết lại lịch sử movement của mã cũ. Cách làm đúng:
1. Sinh cặp chứng từ `DIEU_CHINH` — xuất hết tồn mã cũ, nhập vào mã mới, cùng giá vốn
2. Đánh dấu mã cũ ngừng kinh doanh + trỏ sang mã mới (cột "gộp vào mã")
3. Thẻ kho mã mới đọc được cả lịch sử mã cũ qua con trỏ đó, không phải qua việc dời dòng

Đầu vào của phase này chính là bảng đề nghị gộp do D-14 sinh ra.

### Dời sang đợt sau (đã nằm trong Phase 4 của roadmap — cần cập nhật roadmap)
- **XUAT-03 quét barcode** — chặn bởi dữ liệu: 0/3.270 mã có barcode. Phải quyết
  trước: in tem dán lên hàng, hay quét mã nhà sản xuất có sẵn? Chưa có câu trả lời.
- **XUAT-08 màn xuất dùng trên điện thoại** — làm sau khi luồng máy tính chạy ổn.

### Từ phản hồi 19/09 lượt 1 (danh mục hàng hóa), chưa xếp phase
- Ảnh sản phẩm (`san_pham.hinh_anh_url` có cột, `storage.buckets` rỗng, chưa có code
  upload) + màn danh mục dùng được trên điện thoại (đo ở 375px: bảng rộng 1.492px
  trong khung 319px)
- Vị trí kệ (`san_pham.vi_tri_ke` — cột có, đang rỗng ở cả 3.270 mã, chưa màn nào hiện)
- NCC theo mã hàng suy từ lịch sử nhập — chấp nhận 88% mã trống lúc đầu (594 dòng lưu
  trữ chỉ chạm 406/3.270 mã)
- Đầu kỳ / cuối kỳ trong chi tiết mã hàng — neo vào **kiểm kê đầu kỳ Phase 6**, không
  neo vào lần import danh mục
- Tồn lũy kế tại từng thời điểm trên thẻ kho (`the_kho_san_pham` trả 14 cột, chưa có)

### Phase 5
- Báo cáo "sale nào nhận (bán) nhiều nhất" — cần D-03 giữ `doi_tac_id` thì mới tổng được
- Báo cáo các lần xuất âm trong ngày kèm lý do đã chọn — cần D-11 dùng danh sách cố
  định thì mới nhóm được

### Nhỏ, để sau
- Cho quản lý sửa danh sách lý do xuất âm ở màn Cài đặt (đợt này dùng danh sách cố định)

</deferred>

<open_items>
## Phải xử lý — bước lập kế hoạch không được bỏ qua

1. **Enum `trang_thai_ddh` đang đo trục khác.** Cần migration đổi sang
   `TAM | DA_XAC_NHAN | HOAN_THANH | DA_HUY` và sửa `_cap_nhat_tien_do_ddh` (0011
   dòng 139–170) để nó chỉ cập nhật `so_luong_da_xuat` + tự đóng `HOAN_THANH`.
   `don_dat_hang` đang **0 dòng** → không có dữ liệu phải chuyển đổi.
2. **Danh sách người nhận chưa tồn tại** (`doi_tac` có 1 khách; `anh_xa_ghi_chu_kiotviet`
   có 0 dòng). Đây là **việc của người dùng**, phải làm trước khi UAT Phase 4 —
   không có tên thì không tạo được đơn nào.
3. **4 mã thiếu `kho_mac_dinh_id`** (3.266/3.270). Xử lý theo Claude's Discretion ở trên.
4. **Nợ UAT trình duyệt của Phase 3** — phiếu nhập chưa ai mở bằng mắt
   (03-SUMMARY.md mục "Chưa làm"). Phase 4 nhân bản chính cơ chế đó, nên lỗi giao
   diện chưa phát hiện sẽ bị nhân đôi. **Đề xuất: mở màn phiếu nhập kiểm bằng mắt
   trước khi nhân bản.** Người dùng đã đánh dấu đây là rủi ro đáng lo.
5. **Dữ liệu thử Phase 3 còn nằm trên database thật:** phiếu `PNM26-000001` trạng
   thái đã hủy; hai mã `PN-UAT-A` / `PN-UAT-B` ngừng kinh doanh, giá vốn 5.000/10.000.
   Phải tránh khi kiểm đếm, và cân nhắc dọn.
6. **ROADMAP.md / REQUIREMENTS.md chưa phản ánh việc dời XUAT-03 và XUAT-08.**
   Chưa sửa — chờ người dùng quyết cách xếp (Phase 4.1 riêng, hay dồn vào Phase 5/6).
7. **Đơn không có giá** (`don_dat_hang_dong.don_gia` để nguyên 0) → hệ quả đã chốt:
   **sẽ không có báo cáo doanh thu**. Tồn và giá vốn vẫn đúng vì phiếu xuất lấy giá
   vốn từ trigger.

</open_items>

---

*Phase: 4-Đơn đặt hàng & Phiếu xuất*
*Context gathered: 2026-09-20*
