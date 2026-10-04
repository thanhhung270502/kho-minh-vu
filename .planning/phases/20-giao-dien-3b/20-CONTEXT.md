# Phase 20: Giao diện 3b và tính năng còn thiếu — Context

**Gathered:** 2026-10-04
**Status:** Ready for planning
**Design nguồn:** https://claude.ai/artifact/CmTtL7XqUnZzLSV54iE1ZC — bản giải nén (đã bỏ font-face nhúng) ở
`20-DESIGN-3b.html` cùng thư mục. Bốn khung: **3b** Tổng quan · **5a** Danh sách đơn đặt · **5b** Chi tiết đơn
DH26-000008 · **5c** Chi tiết hàng hóa 06410KFL850. Script cuối file chứa dữ liệu mẫu và các biến màu.

<domain>
## Ranh giới

Thay design system 1A (quick 261004-f2l, đang chạy) bằng "hướng 3b" cho TOÀN app, và bổ sung các tính năng mà
bốn khung design thể hiện nhưng hệ thống chưa có. Nguyên tắc kiến trúc (CLAUDE.md) giữ nguyên: tồn là kết quả,
sổ cái append-only, ghi sổ atomic bằng RPC, phân quyền ở RLS/RPC.

Không làm: chọn kho toàn cục ở header (người dùng KHÔNG chọn — xem D-02); đổi luồng duyệt/ghi sổ; đổi schema
nghiệp vụ ngoài phần ghi rõ dưới đây.
</domain>

<decisions>
## Quyết định đã chốt (người dùng, 2026-10-04)

- **D-01 Tổng quan: theo design, giữ phần cũ.** Dựng đủ widget design; "Nhịp bán hôm nay" và bảng "Xuất âm" chọn
  ngày KHÔNG bỏ — đặt xuống dưới các widget mới (hoặc gộp hợp lý: KPI Phiếu xuất hôm nay dùng chung nguồn
  `nhip_ban`), không mất thông tin đang dùng.
- **D-02 Header: chỉ làm ô tìm kiếm ⌘K.** Ô "Tất cả kho ▼" trong design KHÔNG làm (bỏ khỏi header). Bộ lọc kho
  theo từng trang giữ như hiện tại.
- **D-03 Trùng mã ở đơn đặt: cộng dồn khi cùng mã VÀ cùng người nhận dòng.** Khác người nhận (Phase 18) vẫn tách
  dòng. Dòng "hàng chung" (người nhận null) trùng mã cũng cộng dồn với dòng null.
- **D-04 KPI Giá trị tồn:** người có quyền xem giá vốn (`co_quyen_xem_gia_von()`) thấy giá trị (đ); người không có
  quyền thấy **"Tổng SL tồn"** ở cùng ô — lưới vẫn 4 KPI, không lộ giá vốn ra client.

### Chốt mặc định cho câu hỏi mở của research (Claude, 2026-10-04 — người dùng có thể đổi ở UAT)
- **D-05 Không luân chuyển:** đo bằng `san_pham.lan_phat_sinh_cuoi` như design ("biến động"), loại mã tồn ≤ 0 và
  mã ngừng KD; ghi caveat (nạp tồn/kiểm kê cũng đặt lại mốc) trong comment hàm. UAT thấy rỗng bất thường thì đổi
  sang lần XUAT cuối.
- **D-06 Phiếu chờ ghi sổ:** chỉ `NHAP` + `XUAT` (+ trả hàng) ở `NHAP_LIEU`, KHÔNG tính `KIEM_KE` (luồng duyệt riêng)
  — khớp mô tả design "3 phiếu nhập · 2 phiếu xuất".
- **D-07 ⌘K:** chỉ trả loại có trang chi tiết (mã hàng, phiếu nhập, phiếu xuất/hóa đơn, trả hàng, đơn đặt, đối
  tác); bỏ `CHUYEN_KHO`/`DIEU_CHINH`.
- **D-08 Biểu đồ Nhập–Xuất:** cột = số phiếu đã ghi sổ mỗi ngày; số lượng ở tooltip.
- **D-09 Giá trị tồn quá khứ (delta tháng, sparkline):** tính lùi từ sổ cái × giá vốn HIỆN TẠI — là xấp xỉ, ghi rõ
  "ước tính" ở tooltip; không thêm bảng snapshot.
- **D-10 Header cao ~104px:** thêm `sticky={{ offsetHeader }}` cho các bảng đang dùng header dính để tiêu đề bảng
  không bị che — trong phạm vi phase vì chính header 2 tầng gây ra.
- **D-11 `editRecipient` tạo trùng mã+người nhận:** ngoài phạm vi, chỉ ghi nhận.

### Claude's Discretion
- Cách gói RPC mới (một RPC tổng hợp dashboard hay nhiều RPC nhỏ), miễn kiểm quyền `xem_dashboard` ở database.
- Sparkline: vẽ bằng Recharts hoặc SVG thuần — chọn cái nhẹ hơn, không thêm thư viện.
- ⌘K: dùng antd Modal + danh sách tự dựng; không cài thư viện command palette.
- Thứ tự cột thẻ kho: có thể giữ cột hiện có (Nguồn, Kho là cột bổ sung có ích) — chỉ đổi nhãn nếu rõ hơn.
</decisions>

<specifics>
## Design system 3b (trích từ 20-DESIGN-3b.html)

| Token | Giá trị |
|---|---|
| Font | **Manrope** (next/font, subset vietnamese có sẵn; weight 400–800); mono giữ JetBrains Mono |
| Nền trang / thẻ | trang `#FFFFFF` (design dùng nền trắng), mặt phụ `#F5F5F5` (ô tìm, segmented, panel Cần xử lý) |
| Viền | thẻ `#EDEDED`, input `#E5E5E5`, kẻ dòng `#F3F3F3` |
| Chữ | chính `#0A0A0A`, phụ `#737373`, nhạt `#8C8C8C`/`#A3A3A3` |
| Nhấn | cam `oklch(0.6 0.15 60)`, đỏ `oklch(0.55 0.2 27)` — chỉ báo hiệu |
| Bo góc | thẻ 16 (panel aside 18), nút & chip **9999 (viên thuốc)**, input 10, segmented 9/7 |
| Trọng lượng | tiêu đề trang 30px/800 letter-spacing −.04em; tiêu đề thẻ 15px/800; KPI 28px/800; nav 13.5px/600–700 |
| Header tầng 1 (60px) | logo tròn "MV" 28px + "Kho Minh Vũ" 800 · ô tìm giữa 440×38 nền `#F5F5F5` bo 10, gợi ý `⌘ K` · tên + avatar tròn bên phải |
| Header tầng 2 | menu tab: mục đang chọn chữ đen 700 + gạch chân 2px đen; mục khác `#737373`; nhóm có ▼ (Đơn hàng, Hàng hóa); kẻ dưới `#EDEDED` |
| Trạng thái đơn | Đơn tạm: chip nền `oklch(0.97 0.035 75)` chữ `oklch(0.45 0.12 55)` chấm cam · Đã xác nhận: nền `#F3F3F1` chữ `#404040` chấm xám · Hoàn thành: **nền đen chữ trắng** |

Bố cục từng khung (giữ bố cục nội dung hiện có khi design không thể hiện; áp layout design cho 4 khung):
- **3b Tổng quan:** lưới `1fr 300px`. Trái: tiêu đề + "Cập nhật hh:mm · dd/mm/yyyy" + nút "Xuất báo cáo" (viền) /
  "+ Tạo phiếu" (đen); hàng 4 KPI chung một thẻ (ngăn bằng viền trái) mỗi ô: nhãn · số + đơn vị · sparkline 80×28 ·
  dòng delta; thẻ "Nhập – Xuất" (cột đôi đen/xám theo ngày, segmented 7N/30N/90N); thẻ "Tồn theo nhóm hàng"
  (tab Nhóm hàng / Công đoạn; cột Nhóm · Tỷ trọng (thanh) · SL tồn · %). Phải (aside): panel nền `#F5F5F5`
  "Cần xử lý · N việc" — mỗi việc: số lớn, chấm màu, tiêu đề, mô tả, nút viên thuốc "CTA →"; thẻ "Không luân
  chuyển > 30 ngày" (mã mono + tên + "N ngày").
- **5a Đơn đặt:** panel lọc trái — Trạng thái dạng danh sách có chấm + **số đếm**; Loại người nhận segmented
  (Tất cả/Nội bộ/Khách → nhãn hệ thống "Đối tác"); Đối tác nhận; Người nhận; Khoảng ngày có preset
  **7N/30N/Tháng/Tùy** + ô Từ/Đến. Bảng: ô tìm + số kết quả ("8 đơn"); cột Số đơn · Ngày đơn · Người nhận (+ chip
  Nội bộ) · **Tiến độ (thanh + "đã/tổng")** · Trạng thái (chip) · Người tạo · ›. Đầu trang: "Xuất Excel" + "+ Tạo đơn".
- **5b Chi tiết đơn:** đầu trang "← Đơn đặt", số đơn lớn, chip trạng thái + tóm tắt người nhận; nút "Hủy đơn" (chữ
  đỏ, hover nền đỏ nhạt) + "Xác nhận đơn" khi TAM; sau xác nhận "In phiếu lấy hàng". Thân hai cột: trái "Hàng đặt ·
  N dòng" — hàng nhập (Mã hàng → Enter → Số lượng → Enter thêm dòng, con trỏ về ô mã; gợi ý phím), bảng # · Mã ·
  Tên · ĐVT · SL đặt (sửa tại chỗ khi nháp) · xóa, dòng Tổng cộng. Phải aside "Thông tin đơn": Người nhận (segmented
  Nội bộ/Đối tác + chọn người), Ghi chú (textarea), kẻ ngang, lưới meta Số đơn/Ngày đơn/Người tạo/Trạng thái.
- **5c Chi tiết hàng hóa:** đầu trang "← Danh mục", mã lớn + chip "Đang kinh doanh", tên bên dưới; nút "Ngừng kinh
  doanh" (viền) + "Sửa" (đen). Thân hai cột: trái — thẻ "Thông tin hàng" lưới 4 cột × 3 hàng (12 trường, "—" màu
  `#C7C7C7`, Công đoạn là chip); thẻ "Tồn theo kho" (Kho · Tồn · Tối thiểu · Giá trị, "Tổng tồn: N" ở đầu thẻ,
  trạng thái rỗng có icon); thẻ tab "Thẻ kho" (lọc kho) / "Lịch sử sửa". Phải aside "Hình ảnh · N" + "Quản lý":
  ảnh lớn có nhãn "★ Ảnh chính" hoặc nút "Đặt làm ảnh chính", dải ảnh nhỏ (viền đen ảnh đang xem) + ô "+ Thêm".
</specifics>

<code_context>
## Hiện trạng (rà 2026-10-04, ba agent Explore)

### Vỏ app
- `src/shared/components/app-shell.tsx`, `top-nav.tsx`, `nav-pill.tsx`, `account-menu.tsx`, `bottom-tab-bar.tsx`,
  `src/shared/lib/navigation.ts` (NAV_ITEMS lọc theo quyền; nhóm Đơn hàng, Hàng hóa; tràn → "Khác").
- Token: `src/providers/antd-theme.ts`, `src/app/globals.css` (tên biến giữ, đổi giá trị — cách quick 261004-f2l đã
  làm), `src/app/layout.tsx` (next/font), `src/shared/components/status-dot.tsx` + `src/shared/lib/status-tone.ts`.
- **Không có tìm kiếm toàn cục.** `tim_san_pham` (chỉ mã hàng) dùng ở `src/shared/api/product-search.api.ts`;
  đối tác tìm qua `danh_sach_doi_tac`; KHÔNG RPC nào tìm `so_ct` / số đơn → cần RPC mới (security invoker, để RLS
  lọc) gộp mã hàng + chứng từ + đơn đặt + đối tác, trả `loai`, `id`, `nhan`, `phu`, `href`-key.

### Tổng quan (`src/app/(app)/page.tsx`, `src/features/dashboard/**`)
- Đang có: `SalesPaceCard` (`nhip_ban`, 0071), `NegativeStockSection` (`bao_cao_xuat_am(p_ngay)`, 0069),
  `StockByGroupSection` (`ton_theo_nhom(p_theo, p_kho_id)`, 0070 — trả SỐ MÃ: tong_ma, con_hang, het_hang, am,
  duoi_dinh_muc; KHÔNG trả SL tồn). RPC dashboard kiểm `co_quyen('xem_dashboard')` (0083).
- Thiếu: Giá trị tồn + delta tháng + sparkline (cần RPC security definer kiểm `co_quyen_xem_gia_von()`; giá vốn bị
  thu ở 0029 — `san_pham.gia_von`, `kho_movement.gia_von_tai_thoi_diem`); Mã KD + "+N tháng này"
  (`san_pham.dang_kinh_doanh`, `created_at`); Phiếu xuất hôm nay + TB/ngày (`nhip_ban_theo_ngay` 0079 chỉ XUAT, kiểm
  quyền phân tích chứ không phải dashboard); Phiếu chờ ghi sổ + cũ nhất N ngày (`chung_tu.trang_thai='NHAP_LIEU'`);
  chuỗi Nhập–Xuất theo ngày (cả NHAP lẫn XUAT); SL tồn theo nhóm (thêm cột tổng SL vào `ton_theo_nhom` hoặc RPC
  mới); "Cần xử lý" (dưới ĐM = Σ `duoi_dinh_muc`; tồn âm theo kho; xuất âm hôm nay = số dòng `bao_cao_xuat_am`;
  phiếu chờ ghi sổ); Không luân chuyển > 30 ngày (`san_pham.lan_phat_sinh_cuoi`).
- Link CTA có sẵn: danh mục lọc `?ton=duoi_dinh_muc` / âm (0067, `lib/stock-drilldown.ts`); kiểm kê `/kiem-ke`.

### Đơn đặt (`src/app/(app)/don-dat/**`, `src/features/sales-order/**`)
- RPC: `danh_sach_don` (bản mới nhất 0091), `chi_tiet_don`, `dong_don`, `xac_nhan_don`, `mo_khoa_don`,
  `dong_don_som` (0052), `hoan_thanh_don` (0078), `huy_don`. Dòng thêm/sửa ghi thẳng bảng `don_dat_hang_dong`.
- Danh sách: lọc trạng thái là Select, **không có số đếm** (cần RPC đếm group by trạng thái theo cùng bộ lọc);
  loại người nhận, đối tác, người nhận có sẵn; RangePicker **không có preset**; Tiến độ chỉ là chữ; **không có Xuất
  Excel** (mẫu: `src/app/api/danh-muc/xuat-excel/route.ts`); số kết quả chỉ ở phân trang.
- Chi tiết: back link, PageHeader + StatusDot badge + tóm tắt người nhận, `order-actions.tsx` (Xác nhận, Hoàn
  thành, In phiếu đi lấy hàng, Mở khóa, Đóng sớm, Hủy đơn). `order-header.tsx` là Descriptions 3 cột FULL WIDTH
  phía trên bảng dòng — **chưa có aside**. Hàng nhập `order-line-entry-row.tsx` đã Enter→Enter; **chưa cộng dồn**
  khi trùng mã (không unique/upsert trên `don_dat_hang_dong`); bảng dòng không có cột #.
- Không có nhật ký đơn — ngoài phạm vi design, không làm.

### Chi tiết hàng hóa (`src/app/(app)/danh-muc/[id]/page.tsx`, `src/features/products/components/product-detail.tsx`)
- Route riêng theo UUID. Có: back link, mã làm tiêu đề, tên làm mô tả, nút Sửa (`ProductDrawer`), Descriptions 12
  trường (đủ cột schema), `warehouse-stock.tsx` (thẻ Statistic mỗi kho), thẻ kho `stock-card.tsx` (lọc kho, phân
  trang 50, RPC `the_kho_san_pham`), `AuditLog` bảng `san_pham`, gallery `product-image-gallery.tsx` FULL WIDTH
  (ảnh chính ★, đặt ảnh chính qua `dat_anh_chinh`, xóa, thêm/kéo thả, camera mobile), `product-image-preview.tsx`.
- Thiếu: badge trạng thái ở đầu trang; nút Ngừng/Mở lại KD (logic có ở `product-row-actions.tsx` → `gan_hang_loat`
  `{isActive}`); Tồn theo kho dạng BẢNG + Tối thiểu (chỉ có `ton_toi_thieu` cấp mã — hiện cùng một số mỗi dòng,
  KHÔNG thêm schema theo kho) + Giá trị (qua `gia_von_san_pham(p_ids)`, kiểm `co_quyen_xem_gia_von()`, ẩn cột với
  người không có quyền) + Tổng tồn; ảnh chuyển sang aside (ảnh lớn + dải ảnh nhỏ + "+ Thêm" + "Quản lý").

### Bẫy cần nhớ (CLAUDE.md)
- Bẫy 5: `san_pham`/`kho_movement` cấp SELECT theo cột — RPC/truy vấn mới không được `select("*")`.
- Bẫy 11: prop antd v6 đã đổi — mở console sau khi làm UI. Bẫy 12: thêm route vào `scripts/test-route-permissions.ts`.
- Bẫy 16: pgTAP không neo bộ đếm sống. Migration mới bắt đầu từ **0092**.
- `.env.local` hiện trỏ CLOUD `rnpq` — migration mới chỉ áp local; áp cloud phải hỏi người dùng.
- antd seed màu đen: các bậc nhạt phải khai báo tường minh (đã làm ở fix 26c13d7) — giữ khi đổi token.
</code_context>

<canonical_refs>
## Tham chiếu
- `20-DESIGN-3b.html` — design gốc đã giải nén (đọc style inline để lấy kích thước/màu chính xác).
- `.planning/quick/261004-f2l-ap-design-system-moi-1a-giu-bo-cuc/261004-f2l-SUMMARY.md` — design system 1A đang
  chạy và cách đổi token không phải sửa từng file.
- `.planning/phases/18-don-nhieu-nguoi-nhan/18-CONTEXT.md` — quy tắc người nhận theo dòng (liên quan D-03).
</canonical_refs>
