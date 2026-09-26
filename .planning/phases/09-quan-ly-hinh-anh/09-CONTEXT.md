# Phase 9: Quản lý hình ảnh - Context

**Gathered:** 2026-09-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Gắn ảnh cho **mã hàng** để nhân viên nhìn là biết mặt hàng (nỗi đau gốc: "không có ảnh,
nhân viên không biết mặt hàng gì"). Ảnh lưu trên Google Drive qua một Apps Script web app
vì chưa có kinh phí cloud; database và giao diện không phụ thuộc Drive để sau này chuyển
sang cloud chỉ bằng một bản cài đặt storage mới + script migrate.

Phase này giao:
- Thêm / xem / đặt ảnh chính / xóa ảnh trong chi tiết mã hàng
- Thumbnail ở bảng danh mục + bộ lọc "Chưa có ảnh"
- Chép một lần ~1.100 ảnh đang có trên KiotViet sang Drive

KHÔNG thuộc phase này: ảnh chứng từ, thumbnail ở ô tìm mã / dòng phiếu / màn tồn kho
(xem Deferred).

</domain>

<decisions>
## Implementation Decisions

### Phạm vi & quyền
- **D-01:** Chỉ ảnh **mã hàng**. Ảnh chứng từ (phiếu giao, hàng lỗi) để phase sau.
- **D-02:** Thêm / xóa / đổi ảnh chính theo đúng quyền sửa danh mục: `quan_ly`, `van_phong`
  (`hasPermission(role, "edit-catalog")`, policy ghi `san_pham` ở `0015`). Mọi vai trò đọc
  được ảnh (kể cả `thu_kho`, `chi_xem`). Chặn bằng RLS trên bảng ảnh, không chỉ ở giao diện.
- **D-03:** Không có chiến dịch chụp toàn bộ 3.266 mã — "mã nào cần chụp thì chụp", người
  tạo/sửa mã tự bổ sung.

### Lưu trữ (đã chốt khi thêm phase, xem ROADMAP Phase 9)
- **D-04:** Bảng `hinh_anh` (tên tiếng Việt theo quy ước DB) lưu `noi_luu` + `khoa_luu`
  (fileId gốc) + khóa thumb — **không lưu URL Drive**. `noi_luu` ban đầu chỉ có `GDRIVE`,
  thiết kế để thêm `SUPABASE` / `R2` sau.
- **D-05:** Ghi: trình duyệt nén (WebP, cạnh dài ~1200px + thumb ~300px) → Route Handler
  (`getUser()` + kiểm quyền) → Apps Script ("Execute as me", tài khoản Google riêng cho hệ
  thống) → Drive. File Drive để private.
- **D-06:** Đọc: luôn qua URL của app `/anh/<id>` (và biến thể thumb) — Route Handler kiểm
  đăng nhập, lấy nội dung từ Apps Script, trả binary với cache dài hạn để CDN Vercel giữ.
- **D-07:** `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET` chỉ ở server (`env-server.ts`, thêm vào
  `.env.example`), tuyệt đối không `NEXT_PUBLIC_*`. Apps Script từ chối request sai secret.
- **D-08:** Folder Drive nông theo thứ không đổi: `san-pham/goc`, `san-pham/thumb`; tên file
  `<ma_hang>__<uuid>.webp`. ID folder cache trong `PropertiesService`, tạo folder bọc
  `LockService`. (Nhánh `chung-tu/<năm>/<tháng>` để dành cho phase ảnh chứng từ.)
- **D-09:** Code Apps Script nằm trong repo (`apps-script/`, đẩy bằng `clasp`); deploy bằng
  "Manage deployments → New version" để giữ URL `/exec`.
- **D-10:** Toàn bộ chỗ biết tới Drive / Apps Script gói trong một lớp storage server-only
  (interface kiểu `ImageStorage`: put / get / remove). Component, hook, URL không biết nơi lưu.

### Ảnh có sẵn trên KiotViet
- **D-11:** File export `data/kiotviet/DanhSachSanPham_*.xlsx` có cột
  `Hình ảnh (url1,url2...)`: **1.094 mã có ảnh** (1.088 mã 1 ảnh, 2 mã 2 ảnh, 4 mã 5 ảnh),
  link `https://cdn2-retail-images.kiotviet.vn/...`, công khai, ~150 KB/ảnh.
- **D-12:** **Chép một lần sang Drive** — không trỏ link KiotViet (sẽ mất khi ngừng thuê
  KiotViet), không bỏ ảnh cũ. Ảnh chép vào đi đúng cùng đường với ảnh mới: nén WebP + thumb,
  lên Drive, ghi `hinh_anh`, hiển thị qua `/anh/<id>`.
- **D-13:** Chạy bằng **script dòng lệnh chạy tay, chạy lại được** (cùng họ với
  `npm run import:kiotviet`): bỏ qua ảnh đã chép (idempotent — cần ghi nhận nguồn/URL gốc
  để nhận ra), in báo cáo link hỏng / mã không khớp với danh mục. Không làm nút trên giao diện.
- **D-14:** Thứ tự ảnh trong ô URL của KiotViet giữ nguyên; ảnh đầu tiên thành ảnh chính.

### Hiển thị
- **D-15:** Ảnh hiện ở: **chi tiết mã hàng** (thư viện ảnh) và **bảng danh mục** `/danh-muc`
  (cột thumbnail nhỏ đầu dòng). Không thêm ở chỗ khác trong phase này.
- **D-16:** Bấm thumbnail → **phóng to xem tại chỗ** (lớp xem ảnh lớn, qua lại giữa các ảnh
  của mã), không rời màn đang làm.
- **D-17:** Mã chưa có ảnh: ô xám với biểu tượng ảnh mờ ở cột thumbnail (giữ cột thẳng hàng,
  nhìn là biết mã nào còn thiếu ảnh).
- **D-18:** Thêm bộ lọc **Có ảnh / Chưa có ảnh** vào panel lọc hiện có của bảng danh mục
  (tham số URL tiếng Việt không dấu theo quy ước, ví dụ `?anh=co|chua`).

### Nhiều ảnh cho một mã
- **D-19:** **Không giới hạn** số ảnh mỗi mã.
- **D-20:** Ảnh chính: mã chưa có ảnh → ảnh vừa tải tự thành chính; nút "Đặt làm ảnh chính"
  trên ảnh khác; xóa ảnh chính thì ảnh kế tiếp (theo thứ tự) lên thay. Không làm kéo thả
  sắp thứ tự.
- **D-21:** Xóa ảnh là **xóa mềm** trong DB; file Drive chuyển vào thùng rác Drive (không xóa hẳn).

### Chốt thêm sau research (26/09)
- **D-22:** Người dùng cho phép khai báo `sharp` làm **devDependency**, CHỈ dùng trong script chép
  ảnh KiotViet (bản trùng với bản Next.js đang kéo về). Không import `sharp` trong `src/`.
- **D-23:** `/anh/<id>` KHÔNG dùng `Cache-Control: public` / `s-maxage` (CDN Vercel không phân
  biệt cookie phiên → lộ ảnh cho người chưa đăng nhập). Dùng `private, max-age=…, immutable`
  cho trình duyệt + cache phía server cho chặng gọi Apps Script; mỗi request vẫn `getUser()`.
  (Research 09-RESEARCH.md, Key Finding 1 — thay cho câu "cache dài hạn để CDN Vercel giữ" ở D-06.)

### Claude's Discretion
- Luồng tải nhiều ảnh cùng lúc (chọn nhiều file / chụp liên tiếp), thanh tiến độ từng ảnh
- Xử lý ảnh HEIC từ iPhone (chuyển được thì chuyển, không thì báo lỗi đọc hiểu được)
- Kích thước / chất lượng nén cụ thể, định dạng thumb
- Giao diện thư viện ảnh trong chi tiết mã (lưới, vị trí nút), dùng antd `Image` / `Image.PreviewGroup`
- Cách bảng danh mục lấy ảnh chính (mở rộng RPC `danh_sach_san_pham` hay truy vấn riêng)
- Tên cột cụ thể của `hinh_anh`, cách đánh dấu ảnh chính (cột boolean + unique index có điều kiện, hay cột trên `san_pham`)
- Cơ chế cache / header cụ thể của `/anh/<id>`, cách warm cache sau khi chép ảnh KiotViet
- Tài khoản Google giữ Drive: phase chỉ cần tài liệu hướng dẫn thiết lập (người dùng tự tạo tài khoản, tự deploy Apps Script)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dự án & quy ước
- `CLAUDE.md` — năm nguyên tắc kiến trúc, quy trình 7 bước, đặt tên (code tiếng Anh / DB + URL
  tiếng Việt), bẫy đã gặp (đặc biệt bẫy 1, 5, 7, 8, 9, 10, 11, 12, 17, 19)
- `.planning/ROADMAP.md` §"Phase 9: Quản lý hình ảnh" — mục tiêu, hướng kỹ thuật, success criteria
- `.planning/PROJECT.md` — ràng buộc stack, không ORM, bảo mật

### Mẫu tham chiếu Apps Script ↔ Drive
- `/Users/hungly/Desktop/tax-web/common/models/profile-handler/profile-handler-model.ts` — mẫu
  một endpoint `/exec` + `action`, kiểu request/response upload (base64) / preview / delete
- `/Users/hungly/Desktop/tax-web/src/app/api/profile-handler/route.ts` — Route Handler chuyển
  tiếp sang Apps Script (lưu ý: tax-web để URL ở `NEXT_PUBLIC_*` — KHÔNG làm theo điểm này, D-07)

### Dữ liệu KiotViet
- `data/kiotviet/DanhSachSanPham_KV12092026-153850-575.xlsx` — cột `Hình ảnh (url1,url2...)`
- `data/kiotviet/README.md` — mô tả bộ file export
- `scripts/import-kiotviet/` — mẫu script nạp dữ liệu KiotViet (đọc file, validate, báo cáo)
- `src/features/products/lib/read-catalog-file.server.ts` — reader file danh mục KiotViet dùng
  stream (bẫy 7); exceljs `readFile` thường chết trên styles của file KiotViet (đã tái hiện khi scout)

### Phân quyền & dữ liệu danh mục
- `supabase/migrations/0015_rls_danh_muc.sql` — policy đọc/ghi `san_pham` theo vai trò
- `supabase/migrations/0029_an_gia_von.sql` — thu SELECT mức bảng `san_pham`, cấp theo cột (bẫy 5)
- `src/shared/lib/permissions.ts` — `edit-catalog: ["quan_ly", "van_phong"]`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/products/components/product-detail.tsx` (260 dòng): chi tiết mã, đã có
  `Descriptions` + `Tabs` (Thẻ kho / Lịch sử KiotViet / Lịch sử sửa) và prop `permissions.canEdit`
  — chỗ gắn thư viện ảnh. File đã vượt ~200 dòng: thư viện ảnh phải là component riêng.
- `src/features/products/components/product-columns.tsx` — nơi thêm cột thumbnail.
- `src/features/products/components/product-filter-panel.tsx` + `schemas/filter.schema.ts` —
  bộ lọc đọc/ghi URL (mẫu `kinh_doanh` → `p_dang_kinh_doanh`), mở rộng cho lọc ảnh.
- `src/features/products/api/product.api.ts` — `fetchProducts` gọi RPC `danh_sach_san_pham`,
  `chi_tiet_san_pham`.
- `src/shared/components/query-state.tsx` — bắt buộc cho 4 trạng thái.
- `src/shared/lib/errors.ts` — `explainError`, `maLoi`, `laLoiPostgrest` (bẫy 8).
- `src/lib/env-server.ts` — nơi thêm biến server-only mới.
- `scripts/_supabase-admin.ts` — client admin cho script chép ảnh KiotViet.

### Established Patterns
- Feature folder `src/features/<x>/{types,api,hooks,components,lib}`; mapper snake_case ↔
  camelCase chỉ ở `api/` + `types.ts`. Ảnh có thể là feature mới `src/features/images/`
  hoặc nằm trong `products` — planner quyết.
- Ghi nhiều bảng → RPC Postgres trong một transaction; RLS bắt buộc cho bảng mới + pgTAP.
- Đã có Route Handler nhận file / trả file: `src/app/api/danh-muc/nhap-excel/route.ts`,
  `src/app/api/danh-muc/xuat-excel/route.ts`, `src/app/api/kiem-ke/nhap-excel/route.ts` — mẫu
  kiểm quyền + đọc body + trả binary cho route upload ảnh và `/anh/<id>`. Route mới phải vào
  `scripts/test-route-permissions.ts` và xử lý chưa đăng nhập ở `src/proxy.ts`.
- Bảng `san_pham` không có SELECT mức bảng: cột mới trên `san_pham` (nếu có) phải kèm
  `grant select (<cột>)` trong chính migration.

### Integration Points
- `/danh-muc` (bảng + drawer chi tiết), route mới `/anh/[id]` (đọc) và route upload.
- `package.json` scripts: thêm lệnh chép ảnh KiotViet cạnh `import:kiotviet`.
- `.env.example`: thêm mục Apps Script (server-only).

</code_context>

<specifics>
## Specific Ideas

- Tham chiếu cách tax-web gọi Apps Script (một endpoint, phân nhánh bằng `action`), nhưng
  giấu URL + secret ở server và KHÔNG liệt kê cây thư mục Drive — danh sách ảnh là DB của kho.
- Thumbnail trên bảng danh mục phải không làm bảng chậm rõ rệt: lần xem thứ hai không gọi
  Apps Script.

</specifics>

<deferred>
## Deferred Ideas

- **Ảnh chứng từ** (phiếu giao, hàng lỗi khi trả NCC/khách) — phase riêng; nhánh folder
  `chung-tu/<năm>/<tháng>` đã chừa sẵn.
- **Thumbnail ở gợi ý ô tìm mã** (`ProductSearchInput`) và **dòng phiếu / đơn** — giúp chọn
  đúng mã khi tên na ná; cân nhắc sau khi đo hiệu năng thumbnail ở danh mục (mục tiêu < 20 giây/phiếu xuất).
- **Thumbnail ở màn tồn kho** `/ton-kho`.
- **Kéo thả sắp thứ tự ảnh.**
- **Chuyển sang cloud** (Supabase Storage / R2) + script migrate — khi có kinh phí.

</deferred>

---

*Phase: 09-quan-ly-hinh-anh*
*Context gathered: 2026-09-26*
