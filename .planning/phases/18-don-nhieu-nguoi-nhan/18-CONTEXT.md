# Phase 18: Đơn nhiều người nhận - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning
**Source:** Hỏi trực tiếp trong /gsd:plan-phase 18 (4 câu hỏi mở của ROADMAP)

<domain>
## Phase Boundary

Một đơn đặt (cả chế độ Nội bộ lẫn Đối tác) có danh sách nhiều người nhận là nhân viên phụ trách, và từng dòng hàng gán được
một người nhận riêng. Thông tin này đi xuyên: tạo/sửa đơn → danh sách + bộ lọc → phiếu đi lấy hàng → hoàn thành đơn sinh
hóa đơn (Duyệt đơn). Đơn cũ (một người nhận) chuyển nguyên sang cấu trúc mới.

Không thuộc phase này: đổi cách chọn đối tác, giao hàng nhiều đợt (vẫn 1 đơn = 1 hóa đơn), báo cáo theo người nhận.

</domain>

<decisions>
## Implementation Decisions

### D1 — Quan hệ người nhận cấp đơn ↔ cấp dòng
- Gán người nhận cho một dòng mà người đó chưa có trong danh sách người nhận của đơn → **tự động thêm** vào danh sách của đơn.
- Ngoài ra vẫn thêm được người nhận thẳng vào danh sách của đơn (không cần gắn dòng nào).
- Hệ quả: danh sách người nhận của đơn ⊇ mọi người nhận ở dòng. Bất biến này phải giữ ở database (RPC/trigger), không chỉ ở giao diện.

### D2 — Dòng để trống người nhận
- Dòng không gán người nhận = **hàng chung**, giao cho toàn bộ người nhận của đơn.
- Không bắt buộc gán từng dòng — đơn một người nhận nhập nhanh như hiện nay (không thêm thao tác).

### D3 — Áp dụng cho cả hai chế độ đơn
- **Cả Nội bộ lẫn Đối tác** đều có danh sách nhân viên nhận ở cấp đơn và người nhận theo dòng.
- Đơn Đối tác vẫn có đúng **một** đối tác (khách); danh sách người nhận là nhân viên phụ trách, đi kèm.
- Đơn Nội bộ phải có ít nhất một người nhận (như hiện nay); đơn Đối tác được phép không có nhân viên nhận nào.
- NNHAN-01 sửa câu chữ: "Tạo/sửa đơn (Nội bộ hoặc Đối tác) chọn được một hoặc nhiều người nhận…".

### D4 — Phiếu đi lấy hàng
- **Một tờ chung**: đầu phiếu liệt kê mọi người nhận của đơn (tên đầy đủ, theo `recipientDisplayName` của Phase 17 — không
  tiền tố, không mã); đơn Đối tác thêm dòng đối tác.
- Bảng thêm cột **"Người nhận"** ở mỗi dòng; dòng chung để trống (hoặc ghi "Chung" — Claude chọn, giữ nhất quán với màn hình).
- Vẫn nhóm theo kho như hiện tại; vẫn có Người đặt + In lúc (Phase 17).

### Claude's Discretion
- Bỏ một người khỏi danh sách đơn khi người đó đang được gán ở dòng: chặn kèm thông báo rõ dòng nào đang dùng (khuyến nghị),
  hoặc tự gỡ khỏi các dòng — chọn một, ghi lý do.
- Mô hình dữ liệu: bảng nối người nhận ↔ đơn + cột người nhận trên dòng đơn; tương tự cho chứng từ hóa đơn (NNHAN-05). Giữ hay
  bỏ cột `nguoi_nhan_id` cũ trên đơn/chứng từ (không xóa cột có dữ liệu thật — chuyển dữ liệu rồi thôi dùng, như Phase 17).
- Giao diện chọn nhiều người (Select mode multiple / tag), cột người nhận trên lưới nhập dòng (giữ luồng bàn phím của bẫy 14/15).
- Bộ lọc danh sách đơn theo người nhận: khớp ở cấp đơn hoặc cấp dòng (NNHAN-03) — với D1 thì lọc theo cấp đơn là đủ.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Yêu cầu & quyết định
- `.planning/REQUIREMENTS.md` — NNHAN-01..06
- `.planning/ROADMAP.md` — "### Phase 18" (success criteria)
- `.planning/PROJECT.md` — Current Milestone v1.2 (quyết định chốt)
- `./CLAUDE.md` — năm nguyên tắc kiến trúc, bẫy 5, 8, 10, 14, 15, 20, 22

### Hiện trạng người nhận (Phase 11, 12, 17)
- `supabase/migrations/0076_don_noi_bo.sql` — người nhận nội bộ trên đơn và phiếu xuất
- `supabase/migrations/0077_nhan_vien_phu_trach.sql` — bảng `nhan_vien_phu_trach`, `nguoi_nhan_id`
- `supabase/migrations/0078_hoan_thanh_don.sql` — `hoan_thanh_don`, `chi_tiet_don`
- `src/shared/lib/recipient.ts` — `formatRecipient`, `recipientDisplayName`
- `src/features/sales-order/` — form, header, lưới dòng, phiếu in, bộ lọc
- `.planning/phases/17-doi-ten-gon-don-dat/17-05-SUMMARY.md` — phiếu lấy hàng sau Phase 17

</canonical_refs>

<specifics>
## Specific Ideas

- Đơn một người nhận (trường hợp phổ biến hiện nay) không được chậm hơn: không thêm bước bắt buộc nào.
- Người nhận theo dòng chọn nhanh bằng bàn phím trên lưới nhập (văn phòng nhập ~470 dòng/ngày).

</specifics>

<deferred>
## Deferred Ideas

- Báo cáo / thống kê theo người nhận.
- In tách mỗi người nhận một tờ (đã chọn một tờ chung).

</deferred>

---

*Phase: 18-don-nhieu-nguoi-nhan*
*Context gathered: 2026-10-03 via plan-phase (hỏi trực tiếp)*
