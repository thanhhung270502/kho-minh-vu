# Phase 3: Phiếu nhập - Context

**Gathered:** 2026-09-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Luồng chứng từ hoàn chỉnh đầu tiên chạy thật từ đầu đến cuối: tạo phiếu nhập → thêm dòng →
ghi sổ (tồn tăng, giá vốn bình quân gia quyền tính lại) → in → hủy sinh bút toán đảo.
Phạm vi cố định theo ROADMAP: **NHAP-01 … NHAP-08**, làm đủ cả 8 (người dùng chốt ở Office Hours).

Phiếu nhập được chọn làm phase tôi luyện vì chỉ 78 phiếu/tuần, ít hơn phiếu xuất 12 lần.
Cơ chế chốt ở đây sẽ được nhân bản cho chiều xuất ở Phase 4.

**Ngoài phạm vi:** đơn đặt hàng, phiếu xuất, chuyển kho, kiểm kê, ảnh sản phẩm, dashboard.

</domain>

<office_hours>
## Ba câu Office Hours

**1. Nỗi đau thật (chọn cả bốn):** không biết giá vốn thật · tồn lệch vì phiếu nhập sai ·
không truy được hàng về lúc nào · nhập liệu hai lần, chậm.

**2. Bản hẹp nhất ship được:** đủ 8 yêu cầu NHAP-01..08 — không cắt bớt.

**3. Giả định có thể sai (chọn cả bốn):** đơn giá đã sạch · hàng và giá về cùng lúc ·
văn phòng nhập trên máy tính · một phiếu gắn đúng một kho.
Cả bốn đã được xử lý thành quyết định D-02, D-03, D-06, D-05 bên dưới.

</office_hours>

<du_lieu_thuc_te>
## Đo trên dữ liệu thật trước khi hỏi

| Sự thật | Số liệu | Hệ quả |
|---|---|---|
| Dữ liệu nhập KiotViet cũ **không có đơn giá** | 594/594 dòng `don_gia` null, `thanh_tien` = 0 | Không thể suy giá vốn từ lịch sử |
| Mọi mã đang có giá vốn 0 | 3.268/3.268 mã | Phiếu nhập đầu tiên sẽ ĐỊNH RA giá vốn |
| Nhập cũ gom về một chi nhánh | 1 giá trị `chi_nhanh` duy nhất | Lịch sử không cho biết hàng về kho nào |
| Khối lượng | 594 dòng / 78 phiếu (7,6 dòng/phiếu); phiếu lớn nhất PN000649 có 48 dòng | Nhập dòng phải nhanh, có ca 48 dòng |
| NCC000001 = VŨ TRỤ L.AN (nhà máy) | 289 dòng / 10 phiếu | Nhà máy là nguồn nhập lớn nhất |

</du_lieu_thuc_te>

<decisions>
## Implementation Decisions

### Giá vốn đầu kỳ
- **D-01:** Giá vốn để **0** ngày go-live; phiếu nhập thật đầu tiên định ra giá vốn cho mã đó.
- **D-02:** Người dùng sẽ nạp giá vốn đầu kỳ bằng **Excel**, nhưng KHÔNG ghi thẳng
  `san_pham.gia_von` (Phase 1 đã thu quyền ghi cột đó của client — cố ý). Làm bằng **RPC riêng
  `dat_gia_von_dau_ky`**: chỉ `quan_ly` gọi được, **chỉ đặt được cho mã đang có `gia_von = 0`**,
  ghi vào `nhat_ky_sua`. Sau khi mã đã có phiếu nhập thật thì không đè được nữa.
  → Đây là **việc mới ngoài NHAP-01..08**; planner phải tách thành plan riêng và nói rõ.

### Đơn giá và công thức giá vốn
- **D-03:** Đơn giá trên dòng là **giá cuối cùng, đã sạch** — người nhập tự trừ chiết khấu,
  tự quyết có VAT hay không. **Không thêm ô VAT, không thêm ô phí vận chuyển.**
  Cột `chung_tu.giam_gia` sẵn có **không tham gia** công thức giá vốn ở Phase 3.
- **D-04:** Ghi sổ **bắt buộc mọi dòng có đơn giá > 0**. Ca "hàng về trước, giá chốt sau"
  người dùng khẳng định **không xảy ra** — chặn cứng, không làm luồng chờ giá.

### Kho trên phiếu
- **D-05:** Một chuyến hàng **có thể chia cho cả Kho 1 và Kho 2** → **chọn kho theo từng dòng**.
  ⚠️ **Đụng vào phần đã ổn định của Phase 1:** thêm `kho_id` vào `chung_tu_dong`, sửa
  `ghi_so_chung_tu()` và `huy_chung_tu()` để lấy kho theo dòng, cập nhật pgTAP 10/20/30/50.
  `chung_tu.kho_id` giữ lại làm kho mặc định điền sẵn cho dòng mới.

### Người dùng và thiết bị
- **D-06:** Nhập liệu và in **trên máy tính** (văn phòng). Phase 3 **không làm layout điện thoại**.
- **D-07:** Nhập dòng **bằng bàn phím**: gõ mã → Enter → nhảy vào ô số lượng → đơn giá →
  Enter sang dòng mới. Không rời bàn phím. Không dán khối từ Excel, không quét barcode
  (3.266 mã đang trống ô barcode), không sinh từ đơn đặt hàng (Phase 4).
- **D-08:** Không có bước duyệt riêng — người nhập tự ghi sổ.

### Lưu nháp
- **D-09:** **Lưu thật trên server từ dòng đầu**: bấm "Tạo phiếu" là sinh ngay chứng từ
  `NHAP_LIEU` có số; mỗi dòng thêm vào lưu luôn. Mất điện vẫn còn, máy khác mở tiếp được.
  Chấp nhận đánh đổi: **số phiếu nhảy** khi có phiếu bỏ dở.

### Phân biệt nhập từ nhà máy (NHAP-07)
- **D-10:** Phân biệt bằng **số phiếu riêng** (ví dụ `PNM26-000001` cho nhà máy, `PN26-000001`
  cho NCC ngoài). Cần thêm cấu hình đánh số — hiện `cau_hinh_so_ct` có đúng 7 loại.
  Cách hiện thực (thêm giá trị enum `loai_ct` hay thêm cột loại phụ) để researcher đề xuất;
  ràng buộc: **không được phá 7 dòng cấu hình đang chạy và `sinh_so_ct` đã test**.

### Hủy phiếu (NHAP-05)
- **D-11:** **Chỉ `quan_ly`** hủy được phiếu đã ghi sổ.
- **D-12:** Lý do hủy vẫn bắt buộc — `huy_chung_tu(p_chung_tu_id, p_ly_do)` của Phase 1 đã
  yêu cầu, giữ nguyên, không phải quyết định mới.
- **D-13:** **Không chặn** hủy khi hàng đã xuất đi. Hủy có thể đẩy tồn xuống âm — chấp nhận,
  đúng nguyên tắc "xuất âm được phép" của dự án.

### In phiếu (NHAP-06)
- **D-14:** Phiếu in **KHÔNG hiện đơn giá và thành tiền** — chỉ mã hàng, tên, ĐVT, số lượng,
  kho, để ký nhận. Một mẫu duy nhất. Giá xem trên màn hình.

### Claude's Discretion
Người dùng không chốt, Claude quyết khi lập kế hoạch:
- Bố cục màn danh sách phiếu nhập: bộ lọc nào, sắp xếp mặc định, khoảng ngày mặc định.
- Trạng thái rỗng, thông báo lỗi cụ thể (theo `dienGiaiLoi` và CLAUDE.md §Bước 5).
- Khổ giấy và bố cục mẫu in (A4 hay A5, in bằng CSS `@media print` hay route riêng).
- Cách hiện thực đánh số riêng cho nhập nhà máy (D-10).
- Hiện thực RPC `dat_gia_von_dau_ky` và giao diện nạp file (D-02).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Nguyên tắc và phạm vi
- `CLAUDE.md` — năm nguyên tắc kiến trúc, quy trình 7 bước, **"Bẫy đã gặp" 1–12**
- `.planning/PROJECT.md` — ranh giới nghiệp vụ, tiêu chí thành công go-live
- `.planning/REQUIREMENTS.md` §NHAP-01..08 — phát biểu gốc của 8 yêu cầu

### Nền database đã có (Phase 1) — KHÔNG dựng lại
- `supabase/migrations/0002_chung_tu.sql` — một bảng cho bảy loại chứng từ, hai trạng thái sống
- `supabase/migrations/0006_ghi_so.sql` … `0009_*` — `ghi_so_chung_tu`, `huy_chung_tu`, `sinh_so_ct`
- `supabase/tests/20_chung_tu_test.sql` (18 assert) — hợp đồng ghi sổ/hủy hiện hành
- `supabase/tests/10_ton_kho_test.sql` (18 assert) — bình quân gia quyền di động
- `supabase/tests/90_gia_von_test.sql` (11 assert) — quyền xem giá vốn theo vai trò
- `supabase/README.md` — quy trình `db:push`, cảnh báo chỉ MỘT phiên được push

### Khuôn giao diện đã có (Phase 2) — dùng lại, không viết mới
- `.planning/phases/02-khung-ung-dung/02-CONTEXT.md` — 37 quyết định D-01..D-37 vẫn hiệu lực
- `.planning/phases/02-khung-ung-dung/02-UAT.md` — 5 lỗi UAT và cách sửa
- `.memory/patterns/nextjs-antd-supabase-ui.md` — 4 bẫy giao diện lọt qua `npm run check`
- `.memory/knowledge/du-lieu-kiotviet.md` — định dạng dữ liệu cũ, quy ước đuôi mã
- `.memory/blockers/mo-sau-phase-1.md` — việc còn mở, gồm 2 việc người dùng phải tự rà

</canonical_refs>

<code_context>
## Existing Code Insights

### Dùng lại được ngay
- `ghi_so_chung_tu(p_chung_tu_id)` / `huy_chung_tu(p_chung_tu_id, p_ly_do)` — ghi sổ atomic và
  bút toán đảo đã test; **D-05 buộc phải sửa hai hàm này** để lấy kho theo dòng.
- `sinh_so_ct(loai, nam)` + `cau_hinh_so_ct` (7 loại, màn Cài đặt đã chạy) — D-10 mở rộng.
- `NganKeoForm` (`src/shared/components/ngan-keo-form.tsx`) — ngăn kéo form dùng chung.
- `QueryState` — bốn trạng thái bắt buộc của mọi màn đọc dữ liệu.
- `taoCot` + `OSuaNhanh` của danh mục — mẫu bảng dày, sửa ô tại chỗ.
- `docBoLocTuUrl` / `ghiBoLocRaUrl` — mẫu bộ lọc trên URL, áp cho danh sách phiếu.
- `errors.ts` với `laLoiPostgrest()` / `maLoi()` — **bắt buộc dùng**, không `instanceof`.
- `scripts/kiem-tra-quyen-route.ts` — thêm route phiếu nhập vào ma trận (hiện 50 ô).

### Ràng buộc từ kiến trúc
- `kho_movement` append-only: sửa phiếu đã ghi sổ là không thể — chỉ hủy rồi lập lại.
- `san_pham.gia_von` client không ghi được (0015 + 0029) — nền tảng của D-02.
- Thủ kho và chỉ xem không đọc được `gia_von`/`gia_von_tai_thoi_diem` — màn phiếu nhập phải
  chịu được khi cột giá vốn trả null.
- Quyền mở rộng cần token mới, thu hẹp có hiệu lực ngay (CLAUDE.md §6).

### Điểm nối
- Route mới `/nhap-kho` (danh sách) và `/nhap-kho/[id]` (chi tiết/nhập liệu) trong `(app)`.
- Menu trái `app-shell.tsx` — thêm mục Nhập kho.
- Thẻ kho của mã hàng (`the-kho.tsx`) sẽ bắt đầu có dòng nguồn `HE_THONG` thay vì chỉ KiotViet.
- Lịch sử giao dịch đối tác (`lich-su-giao-dich.tsx`) sẽ có phiếu mới bên cạnh phiếu KiotViet.

</code_context>

<deferred>
## Deferred Ideas

- **Chụp ảnh sản phẩm trên điện thoại** — người dùng muốn, nhưng ảnh thuộc danh mục hàng
  (`san_pham.hinh_anh_url` đã có sẵn, chưa dùng), không thuộc phiếu nhập. Kéo theo lưu trữ ảnh,
  nén ảnh, quyền xem. **Chốt: làm ở Phase 4 cùng màn mobile cho thủ kho.**
- **Dán khối mã + số lượng từ Excel** vào bảng dòng — nhanh cho phiếu 48 dòng, nhưng D-07 chọn
  luồng bàn phím trước. Xem lại sau khi văn phòng dùng thật.
- **Quét barcode** — chưa dùng được vì 3.266 mã đang trống ô barcode. Phase 4 mới chốt thư viện quét.
- **Sinh phiếu nhập từ đơn đặt hàng NCC** — đơn đặt hàng là Phase 4.
- **Chặn hủy phiếu khi hàng đã xuất đi** — người dùng chọn không chặn (D-13); ghi lại phòng khi
  vận hành thật thấy cần.

</deferred>

---

*Phase: 03-phieu-nhap*
*Context gathered: 2026-09-19*
