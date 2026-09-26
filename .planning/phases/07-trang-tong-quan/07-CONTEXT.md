# Phase 7: Trang tổng quan - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Trang `/` (hiện là `NotImplemented`) thành trang tổng quan **chỉ dành cho quản lý**,
trả lời hai nỗi đau người dùng chọn trong Office Hours:

- **B — xuất âm tùy tiện, sổ lệch mà không ai biết** → báo cáo xuất âm theo ngày (TQAN-06)
- **C — không biết bán chạy hay chậm** → thẻ nhịp bán hôm nay so với hôm qua

Kèm tồn theo nhóm hàng / công đoạn (TQAN-01) làm bức tranh nền.

**Trong phạm vi:** TQAN-01, TQAN-06, thẻ nhịp bán (bản hẹp thay cho TQAN-04), điều
hướng theo vai trò ở `/`.

**Ra khỏi phạm vi đợt này (người dùng chốt 26/09):**
- TQAN-05 tổng giá trị tồn — **bỏ hẳn**, không dùng giá (khớp D-17 Phase 6, DLIEU-05 đóng)
- TQAN-03, TQAN-04 (biểu đồ 30 ngày), TON-03 (tuổi tồn / không luân chuyển) — **không
  làm đợt này**: hệ mới chưa có đủ 30 ngày, và không ghép dữ liệu KiotViet
→ Cần cập nhật ROADMAP.md / REQUIREMENTS.md khi lập kế hoạch (xem `<deferred>`).

</domain>

<decisions>
## Implementation Decisions

### Báo cáo xuất âm (TQAN-06)
- **D-01:** Liệt kê **theo mã bị âm**, không theo phiếu. Mỗi dòng = một mã hàng bị một
  dòng phiếu đưa tồn (kho, mã) xuống dưới 0: mã, tên, kho, tồn sau khi xuất, số phiếu
  (bấm mở phiếu), người lập, lý do của phiếu (+ ghi chú lý do). Lý do lưu ở **đầu phiếu**
  (`chung_tu.ly_do_xuat_am`, một lý do/phiếu) — mỗi mã âm kế thừa lý do của phiếu chứa nó.
- **D-02:** Khoảng thời gian: **mặc định hôm nay, chọn được một ngày khác** (DatePicker).
  Ngày tính theo giờ Việt Nam.
- **D-03:** Gồm **`XUAT` và `TRA_NCC`** — cả hai đều bị `ghi_so_chung_tu` ép lý do xuất âm.
  Chỉ phiếu đã ghi sổ; phiếu đã hủy không tính.
- **D-04:** Hiển thị: **dải thẻ đếm theo lý do** (4 lý do trong `NEGATIVE_REASONS`, nhãn
  lấy từ `negativeReasonLabel`, chuỗi lạ vẫn hiện nguyên văn) **+ bảng chi tiết** bên dưới.
  Trạng thái rỗng phải nói rõ "Hôm nay không có lần xuất âm nào" — đó là tin tốt, không phải lỗi.

### Tồn theo nhóm / công đoạn (TQAN-01)
- **D-05:** **Không cộng số lượng** (lẫn ĐVT cái/bộ/cặp là vô nghĩa). Mỗi nhóm (và mỗi
  công đoạn) hiện **số mã**: tổng / còn hàng / hết / âm / dưới định mức.
- **D-06:** **Gộp 2 kho mặc định, có bộ lọc chọn kho.**
- **D-07:** **Hai tab: Theo nhóm hàng / Theo công đoạn**, cùng một khuôn bảng. Dùng bảng,
  không dùng biểu đồ (90 nhóm).
- **D-08:** **Bấm vào một con số → mở `/ton-kho` lọc sẵn** (`?nhom=` hoặc `?cong_doan=`,
  `?ton=am|het_hang|con_hang|duoi_dinh_muc`, `?kho=` nếu đang lọc kho). Không dựng bảng
  chi tiết mới. Định nghĩa trạng thái phải **khớp đúng** bộ lọc `/ton-kho` để số đếm trên
  tổng quan bằng số dòng khi bấm vào.

### Nhịp bán (nỗi đau C)
- **D-09:** Thẻ **hôm nay so với hôm qua**: số phiếu xuất · số dòng · số mã khác nhau, kèm
  chênh lệch tăng/giảm. Không có biểu đồ.
- **D-10:** Chỉ tính **phiếu `XUAT` đã ghi sổ, trừ phiếu đã hủy**, theo ngày chứng từ.
  Đơn đặt hàng chưa xuất không tính.

### Bố cục trang & vai trò
- **D-11:** **Chỉ vai trò `quan_ly` xem trang tổng quan.** Văn phòng / thủ kho / chỉ xem
  vào `/` được **chuyển thẳng** sang màn làm việc chính (văn phòng → `/xuat-kho`,
  thủ kho → `/ton-kho`, chỉ xem → `/ton-kho`), không hiện `/khong-du-quyen`.
- **D-12:** Chặn quyền **cả ở route lẫn ở RPC** — RPC báo cáo tự kiểm vai trò quản lý trong
  database (nguyên tắc "phân quyền bằng RLS, không bằng giao diện").
- **D-13:** Thứ tự từ trên xuống: **Nhịp bán → Xuất âm → Tồn theo nhóm/công đoạn**.
- **D-14:** Làm mới: **tải khi mở trang + nút "Làm mới"**. Không polling, không Realtime.

### Chốt sau nghiên cứu (26/09, giả định A1/A2/A4 trong 07-RESEARCH.md)
- **D-15:** Một mã bị hai dòng phiếu khác nhau đẩy xuống dưới 0 trong cùng ngày → **hai dòng
  báo cáo**, mỗi dòng một phiếu gây âm.
- **D-16:** "Người lập" = `chung_tu.nguoi_tao_id` (người tạo phiếu), không phải người ghi sổ.
- **D-17:** Tồn theo nhóm/công đoạn **mặc định chỉ tính mã đang kinh doanh**, giống hệt
  mặc định `/ton-kho` (`p_dang_kinh_doanh = true`), để số đếm khớp khi bấm vào.

### Claude's Discretion
- Cách xác định "dòng này làm tồn xuống dưới 0" (tính lũy kế từ `kho_movement` theo thứ tự
  ghi sổ, hay cột/trigger sẵn có) — researcher chọn, miễn đúng và không sửa sổ cái.
- Một RPC gộp hay ba RPC riêng cho ba khối; hình dạng thẻ và bảng theo design system hiện có.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phạm vi & yêu cầu
- `.planning/ROADMAP.md` §Phase 7 — mục tiêu, success criteria (sẽ phải sửa theo D-scope ở trên)
- `.planning/REQUIREMENTS.md` — TQAN-01, TQAN-03..06, TON-03
- `.planning/phases/05-ton-kho-tong-quan/05-CONTEXT.md` §deferred — lý do các TQAN bị dời
- `.planning/phases/06-kiem-ke-go-live/06-CONTEXT.md` D-17 — không dùng giá

### Xuất âm
- `supabase/migrations/0007_chung_tu.sql` — `ly_do_xuat_am`, `ghi_chu_ly_do`, index `idx_chung_tu_xuat_am`
- `supabase/migrations/0051_chung_tu_rpc_mo_rong.sql` — ghi sổ ép lý do cho XUAT/TRA_NCC
- `supabase/migrations/0008_so_cai_ton_kho.sql` — `kho_movement` (sổ cái append-only)
- `src/features/documents/lib/negative-reasons.ts` — 4 mã lý do + nhãn, nguồn duy nhất

### Tồn kho & bộ lọc
- `src/features/inventory/schemas/inventory.schema.ts` — `STOCK_STATUSES`, tham số URL `/ton-kho`
- `supabase/migrations/0005*.sql` — `san_pham.nhom_hang_id`, `cong_doan_id`, `ton_toi_thieu`

### Quyền
- `src/shared/lib/permissions.ts` — `hasPermission`
- `src/features/auth/api/current-user.server.ts` — chặn route phía server
- `scripts/test-route-permissions.ts` — phải thêm `/` vào ma trận (bẫy 12)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/ton-kho` với bộ lọc URL đầy đủ (nhóm, công đoạn, kho, trạng thái tồn) — đích drill-down D-08
- `negativeReasonLabel()` — nhãn lý do, chịu được chuỗi tự do
- `QueryState`, `PageHeader` — bốn trạng thái và đầu trang
- Recharts đã cài nhưng phase này không cần biểu đồ

### Established Patterns
- Feature folder `api/ + hooks/ + components/ + lib/`, mapper tên cột ở `types.ts`
- `san_pham`, `kho_movement` chỉ grant SELECT theo cột — cấm `select("*")` (bẫy 5)
- Hằng số/hàm thuần dùng ở server để ở `lib/*.ts` không `"use client"` (bẫy 9)
- antd v6: `Statistic` dùng `styles={{ content }}`, `Alert` dùng `title` (bẫy 11)

### Integration Points
- `src/app/(app)/page.tsx` — thay `NotImplemented`; thêm redirect theo vai trò
- Feature mới gợi ý: `src/features/dashboard/`

</code_context>

<specifics>
## Specific Ideas

- Nhịp vận hành tham chiếu: ~92 phiếu xuất/ngày, 5,1 dòng/phiếu.
- 42 mã đang bị xuất khi tồn ≤ 0 trên hệ cũ — báo cáo xuất âm là nơi quản lý thấy chúng.

</specifics>

<deferred>
## Deferred Ideas

- **TQAN-03 / TON-03** hàng không luân chuyển & tuổi tồn — chờ hệ mới chạy đủ ≥ 30 ngày
- **TQAN-04** biểu đồ nhập–xuất 30 ngày — như trên; thẻ nhịp bán D-09 là bản hẹp tạm thay
- **TQAN-05** tổng giá trị tồn — bỏ (không dùng giá); đánh dấu đóng như DLIEU-05
- Tự làm mới / Realtime cho trang tổng quan
- Báo cáo "sale nào bán nhiều nhất" (đã ghi từ Phase 5)

</deferred>

---

*Phase: 7-Trang tổng quan*
*Context gathered: 2026-09-26*
