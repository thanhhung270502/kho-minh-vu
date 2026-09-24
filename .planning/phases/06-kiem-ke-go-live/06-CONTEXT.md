# Phase 6: Kiểm kê & Go-live - Context

**Gathered:** 2026-09-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Chốt số liệu để go-live: **kiểm kê** (mở phiên theo kho × nhóm hàng, đếm, xem lệch,
duyệt sinh chứng từ `KIEM_KE`), **đặt tồn đầu kỳ** từ đợt đếm thật, và **tra cứu lịch
sử KiotViet** (594 dòng nhập + 4.732 dòng hóa đơn đã nằm sẵn trong database).

**Nỗi đau chính (Office Hours 24/09):** tắt KiotViet là mất lịch sử — khách hỏi lại đơn
cũ, NCC đối chiếu, không ai tra được. DLIEU-07 là trọng tâm, không phải việc phụ.

**Phạm vi hẹp đã chốt (Office Hours 24/09) — 7 yêu cầu:**
KKE-01, KKE-02 (đếm bằng ô tìm mã, **không quét**), KKE-03, KKE-04, DLIEU-05 (đóng —
xem D-15), DLIEU-06, DLIEU-07.

**Tách khỏi Phase 6** (ROADMAP phải được sửa theo — xem `<deferred>`):
- Trang tổng quan: TQAN-01, TQAN-03, TQAN-04, TQAN-05, TQAN-06, TON-03
- Mobile & chuyển kho: XUAT-08, TON-04, TON-05
- XUAT-03: bỏ quét camera (người dùng không dùng barcode, không dán tem/giá lên sản phẩm)

</domain>

<decisions>
## Implementation Decisions

### Nhịp đếm & thời điểm chốt sổ

- **D-01:** **Đợt đếm đầu kỳ làm ngoài hệ, trên giấy/Excel, trong khi KiotViet vẫn chạy**,
  và **đếm sát ngày chuyển** (tối hoặc chủ nhật ngay trước go-live, không có bán xen
  giữa). Số đếm = tồn đầu kỳ. Hệ chỉ cần nhận file và duyệt — không phải trừ hóa đơn
  KiotViet phát sinh sau ngày đếm.
- **D-02:** **Kiểm kê định kỳ vừa bán vừa đếm làm luôn trong Phase 6.** Kho KHÔNG đóng
  khi kiểm kê trên hệ mới; phiếu xuất/nhập vẫn ghi sổ bình thường trong lúc phiên mở.
- **D-03:** **Tồn sổ chốt theo TỪNG DÒNG, tại lúc người đếm lưu số đếm của dòng đó.**
  Lệch = số đếm − tồn sổ lúc lưu. Quy ước vận hành: đếm xong mã nào nhập mã đó ngay.
  ⚠️ Code hiện tại (`_ghi_so_kiem_ke`, migration 0011) tính
  `so_luong - so_luong_he_thong` với `so_luong_he_thong` coi như chốt lúc mở phiên —
  planner phải đổi nghĩa/thời điểm ghi của `so_luong_he_thong` (hoặc thêm cột thời
  điểm chốt) cho khớp D-03. Sửa đếm lại một dòng thì chốt lại tồn sổ tại lúc sửa.
- **D-04:** Nhập số đếm bằng **ba đường, cùng về một phiên**: điện thoại (thủ kho đứng
  ở kệ, gõ vài ký tự mã vào ô tìm không dấu → chọn → gõ số), máy tính (bảng dày cho văn
  phòng), và **import Excel**. Chỉ riêng màn đếm phải dùng tốt trên điện thoại
  (nút to, không tràn ngang) — phần mobile còn lại của hệ vẫn để phase sau.
- **D-05:** **Nhiều người đếm song song, chia theo nhóm hàng**; mỗi mã chỉ một người
  đếm — không cộng dồn theo vị trí, không phải xử lý đếm trùng.

### Tồn đầu kỳ

- **D-06:** **Giữ D-05 của Phase 5: vẫn nạp tồn tạm KiotViet qua một chứng từ
  `DIEU_CHINH`, rồi kiểm kê đầu kỳ đè lên** bằng chứng từ `KIEM_KE`. Người dùng chọn
  rõ ràng khi được đề xuất bỏ. Hệ quả cần biết: sổ cái có một phiếu số tạm + một phiếu
  kiểm kê gần như đảo nó; lệch của đợt đầu kỳ = đúng phần KiotViet sai.
  Tồn tạm **hiện CHƯA nạp** (24/09: 0 DIEU_CHINH, 0 dòng `ton_kho` khác 0) — đây là
  bước vận hành bắt buộc trước đợt đếm đầu kỳ.
- **D-07:** **Mã trong danh mục nhưng không có trong file đếm = tồn 0, nhưng phải liệt
  kê "chưa đếm" cho người duyệt thấy trước khi duyệt.** Người duyệt chấp nhận 0 (đảo
  phần tồn tạm của mã đó) hoặc trả về đếm bù. Không mã nào bị bỏ sót mà không ai biết.
- **D-08:** **Hệ xuất file mẫu đếm theo nhóm hàng** (sheet theo nhóm/người đếm): cột
  mã, tên, ĐVT, và cột "Số đếm" để trống. **Không in tồn KiotViet/tồn sổ lên file đếm**
  để người đếm không chép theo. Điền xong import lại vào phiên.
- **D-09:** Bảng lệch đợt đầu kỳ **có hiện tồn KiotViet để tham khảo** — vì tồn tạm =
  số KiotViet (D-06), cột "tồn sổ" chính là cột so với KiotViet. Lệch lớn so với
  KiotViet thường là đếm sót → gợi ý đếm lại.

### Tra cứu lịch sử KiotViet (DLIEU-07)

- **D-10:** Bốn nhu cầu tra cứu phải phục vụ đủ: khách hỏi lại đơn cũ; NCC đối chiếu
  hàng nhập; xem một mã hàng đã nhập/bán cho ai, bao nhiêu; mở lại nguyên một phiếu cũ
  theo số phiếu/số hóa đơn (xem đủ các dòng).
- **D-11:** Hiện ở **hai chỗ, dùng chung một bảng**: màn riêng (route tiếng Việt không
  dấu, ví dụ `/lich-su-kiotviet`) có lọc loại nhập/bán, khoảng ngày, khách/NCC, mã hàng,
  số phiếu; và **tab "Lịch sử KiotViet" trong chi tiết mã hàng**, cạnh thẻ kho.
  KHÔNG trộn vào thẻ kho — dòng cũ không có tồn lũy kế đúng, trộn vào sẽ bị hiểu nhầm
  là sổ cái.
- **D-12:** Tra theo khách bằng **ô tìm tự do, không dấu, trên cả cột khách lẫn ghi
  chú** (tên khách thật như QUỲNH, NGỌC, TỐT nằm trong ghi chú). Không map dòng cũ vào
  đối tác đã tách.
- **D-13:** Quyền xem lịch sử KiotViet là **công tắc theo từng người**, quản lý bật/tắt
  trong Cài đặt → Người dùng. Chặn bằng **RLS**, không chỉ ẩn giao diện — thay policy
  hiện tại ở migration 0016 (đang cho `quan_ly`, `van_phong` theo vai trò).
  Cột `ngay` của hai bảng lưu trữ là **text** (giữ nguyên dạng nguồn) — lọc khoảng ngày
  phải parse; planner quyết cách.

### Duyệt lệch & quyền duyệt

- **D-14:** **Quyền duyệt phiên kiểm kê là công tắc theo từng người**, quản lý bật/tắt
  (cùng cơ chế D-13). Ai cũng có thể mở phiên/nhập số đếm theo quyền hiện có; chỉ người
  được bật mới bấm duyệt (sinh chứng từ `KIEM_KE` ghi sổ).
- **D-15:** Cả hai công tắc (D-13, D-14): **quản lý bật; người vai trò `quan_ly` luôn
  có quyền**, không tự khóa được mình. Lưu ý bẫy 6 CLAUDE.md: nếu quyền đọc qua claim
  JWT thì bật thêm phải chờ token làm mới — giao diện phải nói đúng điều này.
- **D-16:** **Lệch lớn: tô nổi + trả về "đếm lại" từng dòng.** Không chặn cứng, không
  bắt buộc lý do — người duyệt vẫn duyệt được nếu chấp nhận.

### Giá vốn (DLIEU-05)

- **D-17:** **Không cần giá.** Người dùng: *"dữ liệu này không cần giá, mọi câu hỏi về
  giá cứ cho = 0"*. DLIEU-05 **đóng là không cần**: không làm thêm gì; màn nạp giá vốn
  đầu kỳ đã có (0044, `cost-import.tsx`) giữ nguyên để dùng sau. Kiểm kê KHÔNG hiện giá
  trị lệch, KHÔNG cảnh báo giá vốn = 0. Biến động kiểm kê ghi giá vốn tại thời điểm như
  trigger đang làm (thực tế = 0).

### Claude's Discretion

- Ngưỡng "lệch lớn" (tuyệt đối/phần trăm) để tô nổi ở D-16.
- Trạng thái phiên kiểm kê (mở → đang đếm → chờ duyệt → đã duyệt) và cách ánh xạ vào
  `NHAP_LIEU`/`HOAN_THANH` của `chung_tu`; phiên nhiều nhóm → một hay nhiều chứng từ.
- Cách lưu hai công tắc quyền (cột trên `nguoi_dung` hay bảng riêng) và có đưa vào
  JWT claim hay không.
- Bố cục màn đếm mobile, màn bảng lệch, màn lịch sử; cách parse cột `ngay` text.
- Cách phân nhóm hàng cho người đếm (gán người ↔ nhóm trong phiên hay tự nhận).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Yêu cầu & lộ trình
- `.planning/REQUIREMENTS.md` — KKE-01..04, DLIEU-05..07 (và các mã bị tách ra)
- `.planning/ROADMAP.md` §"Phase 6: Kiểm kê & Go-live" — success criteria (phải sửa theo phạm vi mới)
- `.planning/phases/05-ton-kho-tong-quan/05-CONTEXT.md` — D-05 nạp tồn tạm qua `DIEU_CHINH`, dành `KIEM_KE` cho Phase 6
- `CLAUDE.md` — năm nguyên tắc kiến trúc, bẫy 5 (grant theo cột), bẫy 6 (quyền mở rộng cần token mới), bẫy 12 (ma trận route), bẫy 15 (khớp mã tuyệt đối khi Enter)

### Database đã có
- `supabase/migrations/0002_enums.sql` — enum `KIEM_KE`
- `supabase/migrations/0007_chung_tu.sql` — `chung_tu_dong.so_luong_he_thong`
- `supabase/migrations/0011_rpc_ghi_so.sql` — `_ghi_so_kiem_ke`, `ghi_so` (atomic); phải đổi theo D-03
- `supabase/migrations/0010_luu_tru_kiotviet.sql` — hai bảng lưu trữ (cột `ngay` là text, có `du_lieu_goc` jsonb)
- `supabase/migrations/0016_rls_chung_tu.sql` — policy đọc lưu trữ hiện tại (thay theo D-13)
- `supabase/migrations/0003_nguoi_dung_kho.sql`, `0026_nguoi_dung_nhieu_kho.sql` — bảng người dùng (nơi đặt công tắc)
- `supabase/migrations/0061_nap_ton_tam.sql` — RPC nạp tồn tạm (D-06)
- `supabase/migrations/0044_gia_von_dau_ky.sql` — giữ nguyên (D-17)

### Thiết kế
- `design/kiem-ke.html` — bản demo UI tĩnh màn kiểm kê (quick task 260921-v15)
- `design/danh-muc-chi-tiet.html`, `design/the-kho.html` — chỗ đặt tab lịch sử KiotViet
- `design/cai-dat.html` — chỗ đặt công tắc quyền

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- RPC `tim_san_pham` + ô tìm không dấu (phiếu nhập/xuất): dùng cho màn đếm; nhớ ưu tiên mã khớp tuyệt đối (bẫy 15).
- `src/features/products/components/excel-import.tsx`, `import-preview.tsx`, `src/shared/lib/o-excel.ts`, `excel-cell.ts`: khuôn import Excel báo dòng lỗi, không nạp nửa vời — dùng cho import số đếm.
- `src/features/products/components/excel-button.tsx`: export Excel — dùng cho file mẫu đếm theo nhóm (D-08).
- `src/features/inventory/*` (Phase 5): bộ lọc nhóm/kho, `provisional-stock-*` (nạp tồn tạm).
- `src/features/products/components/stock-card.tsx` + `product-detail.tsx`: nơi thêm tab "Lịch sử KiotViet".
- `src/features/settings/components/user-drawer.tsx`, `user-table.tsx`: nơi thêm hai công tắc quyền.
- `src/shared/lib/permissions.ts`, `scripts/test-route-permissions.ts`: ma trận quyền route — thêm route mới.

### Established Patterns
- Ghi sổ atomic bằng RPC Postgres; chứng từ `NHAP_LIEU` → `HOAN_THANH`; không sửa tồn tay.
- Lớp `api/` là chỗ duy nhất thấy tên cột tiếng Việt; mapper ở `types.ts`.
- `QueryState` bốn trạng thái; `explainError` tách 401/403; lỗi PostgREST so bằng `maLoi()`.

### Integration Points
- Route mới dưới `src/app/(app)/` (ví dụ `/kiem-ke`, `/kiem-ke/[id]`, `/lich-su-kiotviet`), menu, `src/proxy.ts`.
- `database.types.ts` sinh lại sau migration (`npm run db:types`).

### Hiện trạng dữ liệu (24/09, project `kho-vu-tru`)
- `luu_tru_nhap_kiotviet` = 594, `luu_tru_hoa_don_kiotviet` = 4.732 — đã nạp.
- 0 chứng từ `DIEU_CHINH`, 0 `KIEM_KE`, 0 phiếu NHAP/XUAT hoàn thành; 0 dòng `ton_kho` khác 0.
- 3/3.272 mã có `gia_von > 0`.

</code_context>

<specifics>
## Specific Ideas

- File mẫu đếm không được lộ số tồn — người đếm phải đếm thật, không chép.
- Màn đếm trên điện thoại: gõ vài ký tự mã → chọn → gõ số → lưu, lặp lại nhanh (giống nhịp bàn phím phiếu nhập Phase 3, bẫy 14).
- Thứ tự vận hành trước go-live: (1) nạp tồn tạm KiotViet, (2) xuất file mẫu đếm theo nhóm, (3) đếm sát ngày chuyển, (4) import số đếm, (5) xem danh sách chưa đếm + lệch, đếm lại nếu cần, (6) người có quyền duyệt → tồn đầu kỳ.

</specifics>

<deferred>
## Deferred Ideas

- **Phase mới — Trang tổng quan:** TQAN-01, TQAN-03, TQAN-04, TQAN-05, TQAN-06, TON-03.
- **Phase mới — Mobile & chuyển kho:** XUAT-08 (màn xuất trên điện thoại), TON-04 (chuyển kho), TON-05 (màn tồn trên điện thoại).
- **XUAT-03 (quét barcode):** bỏ quét camera — không dùng barcode, không dán tem/giá. Cần sửa lại câu chữ yêu cầu hoặc chuyển Out of Scope.
- **DLIEU-05:** đóng là không cần (D-17); nếu sau này cần giá vốn thì màn 0044 đã có.
- Map dòng lịch sử cũ vào đối tác đã tách (để lịch sử đối tác hiện cả phần cũ) — không làm.
- Tổng giá trị tồn / giá trị lệch kiểm kê — không làm (không dùng giá).

</deferred>

---

*Phase: 06-kiem-ke-go-live*
*Context gathered: 2026-09-24*
