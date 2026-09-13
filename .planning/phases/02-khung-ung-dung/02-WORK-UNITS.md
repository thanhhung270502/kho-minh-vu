# Phase 2: Khung ứng dụng, Danh mục, Đối tác, Cài đặt - Work Units

**Đầu vào cho `/spartan:phase plan 2`.** Đây là bản chia việc đề xuất, chưa phải plan cuối.
Planner được gộp hoặc tách nếu có lý do rõ.

Quy tắc: mỗi WU tối đa 3 file, tối đa nửa ngày, đúng một commit.
Wave N+1 phụ thuộc đầu ra của Wave N. WU cùng wave chạy song song được.

- Migration đánh số trước từ **0026**. Số theo thứ tự wave, nên WU chạy song song không đụng số nhau.
- WU database tự viết pgTAP trước (đỏ → xanh), file test đếm vào giới hạn 3 file.
- WU giao diện theo 7 bước trong `CLAUDE.md`, đủ bốn trạng thái, chạy `npm run check` trước commit.
- **Wave 3 là cổng chặn:** chưa push migration và sinh lại `database.types.ts` thì chưa làm giao diện đọc schema mới.

---

## Wave 1 — Nền database + khung app (độc lập nhau)

| WU | Việc | File | Yêu cầu · Quyết định |
|---|---|---|---|
| **WU-01** | Thủ kho nhiều kho: bảng nối người dùng–kho + backfill, cờ `phai_doi_mat_khau`, hook đưa mảng kho vào JWT, helper mảng, viết lại policy theo kho (`any(...)` bọc `select`), ca test 2 kho | `supabase/migrations/0026_nguoi_dung_nhieu_kho.sql`, `supabase/tests/30_rls_test.sql`, `scripts/verify-hook.ts` | CDAT-01 · D-03, D-06 |
| **WU-02** | Nhật ký sửa append-only: bảng + trigger trên `san_pham`, `doi_tac`, `nguoi_dung` (+ gán kho), ghi nguồn sửa qua `set_config`, chặn UPDATE/DELETE | `supabase/migrations/0027_nhat_ky_sua.sql`, `supabase/tests/70_nhat_ky_sua_test.sql` | DMUC-04, DTAC-02 · D-20 |
| **WU-03** | Cấu hình đánh số: bảng tiền tố + số chữ số theo loại, `sinh_so_ct` đọc cấu hình, không cho lùi số, validate | `supabase/migrations/0028_cau_hinh_so_ct.sql`, `supabase/tests/80_cau_hinh_so_ct_test.sql` | CDAT-04 · D-08 |
| **WU-04** | Ẩn giá vốn theo vai trò ở database (cơ chế do research chốt), phủ `san_pham` + `kho_movement` | `supabase/migrations/0029_an_gia_von.sql`, `supabase/tests/90_gia_von_test.sql` | AUTH-05 mở rộng · D-16 |
| **WU-05** | Khung app: viết lại app shell (menu Phase 2 ẩn theo vai trò, header họ tên + vai trò + Đăng xuất), xóa route `/san-xuat` `/bao-cao` `/kho`, sửa chữ trong `errors.ts` | `src/shared/components/app-shell.tsx`, `src/shared/lib/errors.ts`, `src/app/(app)/layout.tsx` | AUTH-07 · D-07, D-34, D-36 |
| **WU-06** | Đăng nhập: trang `/dang-nhap` (tên → email nội bộ), form Zod, redirect ở proxy với `tiep_tuc` chống open redirect | `src/app/dang-nhap/page.tsx`, `src/features/xac-thuc/components/form-dang-nhap.tsx`, `src/proxy.ts` | AUTH-01, AUTH-02 · D-01, D-35 |

## Wave 2 — Logic database cho màn hình + quản trị tài khoản

| WU | Việc | File | Phụ thuộc | Yêu cầu · Quyết định |
|---|---|---|---|---|
| **WU-07** | RPC danh sách sản phẩm: tìm (cùng biểu thức `tim_san_pham`), lọc (nhóm, công đoạn, ĐVT, tồn, kinh doanh, Cần rà), sắp xếp, phân trang, tổng số; đánh dấu 8 mã mâu thuẫn + "Giữ như cũ" | `supabase/migrations/0030_danh_sach_san_pham.sql`, `supabase/tests/41_danh_sach_san_pham_test.sql` | WU-04 | DMUC-01..03 · D-11, D-12, D-18, D-19 |
| **WU-08** | Rà ghi chú: bảng ánh xạ ghi chú → khách/sale/bỏ qua, đối tác "Khách lẻ", RPC tổng hợp 150 giá trị kèm mẫu, RPC áp quyết định (tạo khách `KH…` / gộp) | `supabase/migrations/0031_ra_ghi_chu.sql`, `supabase/tests/51_ra_ghi_chu_test.sql` | WU-02 | DLIEU-04 · D-28..D-32 |
| **WU-09** | RPC lịch sử đối tác (chứng từ mới ∪ KiotViet cũ, gom theo phiếu) và thẻ kho sản phẩm (movement ∪ dòng lưu trữ, lọc theo kho được phân) | `supabase/migrations/0032_lich_su_the_kho.sql`, `supabase/tests/52_lich_su_the_kho_test.sql` | WU-01, WU-04, WU-08 | DTAC-03, DMUC-05 · D-21, D-27 |
| **WU-10** | RPC import danh mục: nhận mảng dòng, chế độ kiểm tra (trả thêm/sửa/lỗi theo dòng + cột) và chế độ nạp (validate lại, một transaction, cập nhật theo mã, ô trống giữ nguyên) | `supabase/migrations/0033_import_danh_muc.sql`, `supabase/tests/61_import_danh_muc_test.sql` | WU-02 | DMUC-06 · D-24, D-25, D-26 |
| **WU-11** | RPC gán hàng loạt (công đoạn/nhóm/ĐVT/kinh doanh) + RPC gợi ý công đoạn theo đuôi mã (chỉ đọc) | `supabase/migrations/0034_ra_hang_loat.sql`, `supabase/tests/62_ra_hang_loat_test.sql` | WU-02 | DMUC-04 · D-18 |
| **WU-12** | Đổi mật khẩu: trang `/doi-mat-khau`, chặn route khi cờ `phai_doi_mat_khau` bật, mục menu tài khoản | `src/app/doi-mat-khau/page.tsx`, `src/features/xac-thuc/components/form-doi-mat-khau.tsx`, `src/proxy.ts` | WU-01, WU-06 | AUTH-01 · D-03 |
| **WU-13** | Server quản trị tài khoản: client admin `server-only`, action tạo / sửa vai trò+kho / vô hiệu hóa / đặt lại mật khẩu, kiểm người gọi là quản lý, thu hồi phiên theo cơ chế research chốt | `src/lib/supabase/admin.ts`, `src/features/cai-dat/actions/nguoi-dung.actions.ts`, `.env.example` | WU-01 | CDAT-01 · D-02, D-04, D-05 |

## Wave 3 — Cổng chặn: áp schema

| WU | Việc | File | Phụ thuộc |
|---|---|---|---|
| **WU-14** | `npm run db:push` áp 0026–0034, chạy toàn bộ pgTAP trên cloud (89 cũ + mới), kiểm advisor, `npm run db:types` | `src/types/database.types.ts`, `supabase/README.md` | Wave 1–2 |

> Hỏi người dùng trước khi push nếu có migration xóa/đổi cột (D-06: cột `nguoi_dung.kho_id`).

## Wave 4 — Lớp dữ liệu và màn Cài đặt

| WU | Việc | File | Yêu cầu · Quyết định |
|---|---|---|---|
| **WU-15** | Lớp API danh mục: kiểu, query key, hàm gọi RPC danh sách/chi tiết/lưu/hàng loạt/gợi ý | `src/features/danh-muc/types.ts`, `src/features/danh-muc/api/san-pham.api.ts`, `src/features/danh-muc/api/san-pham.keys.ts` | DMUC-01..05 |
| **WU-16** | Đối tác: API + bảng danh sách lọc loại (CA_HAI ở cả hai), tìm theo mã/tên/SĐT, route `/doi-tac` | `src/features/doi-tac/api/doi-tac.api.ts`, `src/features/doi-tac/components/bang-doi-tac.tsx`, `src/app/(app)/doi-tac/page.tsx` | DTAC-01 · D-33 |
| **WU-17** | Cài đặt → Người dùng: bảng, ngăn kéo tạo/sửa (vai trò, nhiều kho, mật khẩu tạm), vô hiệu hóa, đặt lại mật khẩu | `src/app/(app)/cai-dat/nguoi-dung/page.tsx`, `src/features/cai-dat/components/bang-nguoi-dung.tsx`, `src/features/cai-dat/components/form-nguoi-dung.tsx` | CDAT-01 · D-02..D-06 |
| **WU-18** | Cài đặt → Kho + Nhóm hàng / ĐVT / Công đoạn: một component danh mục phụ dùng chung, nhóm cha, lỗi 23503 đọc được | `src/app/(app)/cai-dat/[muc]/page.tsx`, `src/features/cai-dat/components/danh-muc-phu.tsx`, `src/features/cai-dat/api/danh-muc-phu.api.ts` | CDAT-02, CDAT-03 · D-09, D-10 |
| **WU-19** | Cài đặt → Số chứng từ: bảng 7 loại, sửa tiền tố + số chữ số, xem số đang chạy | `src/app/(app)/cai-dat/so-chung-tu/page.tsx`, `src/features/cai-dat/components/cau-hinh-so-ct.tsx`, `src/features/cai-dat/api/so-ct.api.ts` | CDAT-04 · D-08 |
| **WU-20** | Thư viện Excel danh mục dùng chung: định nghĩa cột mẫu mới, nhận diện 2 định dạng, chuyển dòng KiotViet (dùng chung `tach-dvt-cong-doan.ts`) | `src/features/danh-muc/lib/mau-excel.ts`, `src/features/danh-muc/lib/doc-file-danh-muc.ts`, `scripts/import-kiotviet/tach-dvt-cong-doan.ts` | DMUC-06, DMUC-07 · D-22 |

## Wave 5 — Màn hình chính

| WU | Việc | File | Phụ thuộc | Yêu cầu · Quyết định |
|---|---|---|---|---|
| **WU-21** | Bảng danh mục: cột, phân trang/sắp xếp server, bộ lọc trên URL, ô tìm, trạng thái tồn 0 | `src/app/(app)/danh-muc/page.tsx`, `src/features/danh-muc/components/bang-san-pham.tsx`, `src/features/danh-muc/components/bo-loc-san-pham.tsx` | WU-15 | DMUC-01..03 · D-11, D-12, D-17 |
| **WU-22** | Ngăn kéo tạo/sửa mã: Zod schema, ĐVT/công đoạn độc lập, quy đổi, kho mặc định, giá bán khóa theo vai trò, map lỗi server về field | `src/features/danh-muc/schemas/san-pham.schema.ts`, `src/features/danh-muc/components/ngan-keo-san-pham.tsx`, `src/features/danh-muc/hooks/useLuuSanPham.ts` | WU-15 | DMUC-04 · D-13..D-15 |
| **WU-23** | Trang chi tiết mã: thông tin + thẻ kho (movement + KiotViet gắn nhãn) + tab lịch sử sửa (component dùng chung với đối tác) | `src/app/(app)/danh-muc/[id]/page.tsx`, `src/shared/components/the-kho.tsx`, `src/shared/components/lich-su-sua.tsx` | WU-15 | DMUC-05 · D-20, D-21 |
| **WU-24** | Export danh mục theo bộ lọc đang áp + tải file mẫu trống, cột giá vốn theo quyền | `src/features/danh-muc/lib/xuat-excel.ts`, `src/features/danh-muc/components/nut-xuat-excel.tsx` | WU-15, WU-20 | DMUC-07 · D-23 |
| **WU-25** | Ngăn kéo tạo/sửa đối tác: loại NCC/KHACH/CA_HAI, gợi ý mã theo loại, ngừng hoạt động | `src/features/doi-tac/schemas/doi-tac.schema.ts`, `src/features/doi-tac/components/ngan-keo-doi-tac.tsx`, `src/features/doi-tac/hooks/useLuuDoiTac.ts` | WU-16 | DTAC-02 · D-32, D-33 |
| **WU-26** | Trang chi tiết đối tác: lịch sử giao dịch (mới + KiotViet gom theo phiếu) + lịch sử sửa | `src/app/(app)/doi-tac/[id]/page.tsx`, `src/features/doi-tac/components/lich-su-giao-dich.tsx` | WU-16, WU-23 | DTAC-03 · D-27 |
| **WU-27** | Màn Rà ghi chú: danh sách giá trị kèm số hóa đơn và mẫu, năm hành động, bộ đếm còn lại | `src/app/(app)/doi-tac/ra-ghi-chu/page.tsx`, `src/features/doi-tac/components/ra-ghi-chu.tsx`, `src/features/doi-tac/api/ra-ghi-chu.api.ts` | WU-16 | DLIEU-04 · D-29..D-31 |

## Wave 6 — Công cụ rà và import

| WU | Việc | File | Phụ thuộc | Yêu cầu · Quyết định |
|---|---|---|---|---|
| **WU-28** | Sửa trên ô (công đoạn/nhóm/ĐVT), chọn nhiều → gán hàng loạt, lọc nhanh "Cần rà" + bộ đếm, "Giữ như cũ" | `src/features/danh-muc/components/o-sua-nhanh.tsx`, `src/features/danh-muc/components/thanh-gan-hang-loat.tsx`, `src/features/danh-muc/components/bang-san-pham.tsx` | WU-21 | DMUC-04 · D-18, D-19 |
| **WU-29** | Hộp gợi ý công đoạn theo đuôi mã: danh sách đề xuất, bỏ tick, áp dụng | `src/features/danh-muc/components/goi-y-cong-doan.tsx`, `src/features/danh-muc/hooks/useGoiYCongDoan.ts` | WU-21 | DMUC-04 · D-18 |
| **WU-30** | Luồng import: tải file → xem trước (thêm / sửa cũ→mới / lỗi) → tải file lỗi → Nạp | `src/features/danh-muc/components/nhap-excel.tsx`, `src/features/danh-muc/components/xem-truoc-nhap.tsx`, `src/features/danh-muc/hooks/useNhapDanhMuc.ts` | WU-20, WU-21 | DMUC-06 · D-22, D-24..D-26 |

## Wave 7 — Tích hợp

| WU | Việc | File | Phụ thuộc |
|---|---|---|---|
| **WU-31** | Soát tích hợp: trang "Không đủ quyền", đi 4 vai trò qua mọi route, cập nhật `src/features/README.md` + `CLAUDE.md`, `npm run check` + pgTAP toàn bộ xanh | `src/app/(app)/khong-du-quyen/page.tsx`, `src/features/README.md`, `CLAUDE.md` | Wave 1–6 |

---

## Phủ yêu cầu

| Yêu cầu | WU |
|---|---|
| AUTH-01 | WU-06, WU-12 |
| AUTH-02 | WU-06 |
| AUTH-07 | WU-05 |
| DMUC-01, DMUC-02, DMUC-03 | WU-07, WU-15, WU-21 |
| DMUC-04 | WU-02, WU-11, WU-22, WU-28, WU-29 |
| DMUC-05 | WU-09, WU-23 |
| DMUC-06 | WU-10, WU-20, WU-30 |
| DMUC-07 | WU-20, WU-24 |
| DTAC-01 | WU-16 |
| DTAC-02 | WU-02, WU-25 |
| DTAC-03 | WU-09, WU-26 |
| DLIEU-04 | WU-08, WU-27 |
| CDAT-01 | WU-01, WU-13, WU-17 |
| CDAT-02, CDAT-03 | WU-18 |
| CDAT-04 | WU-03, WU-19 |

18/18 yêu cầu có WU. **31 WU trong 7 wave.**

## Việc research phải chốt trước khi plan

1. **D-05:** thu hồi quyền ngay khi đổi vai trò/kho/vô hiệu hóa. Cần biết API thật, độ trễ tối đa. Ảnh hưởng WU-01, WU-13.
2. **D-16:** chặn đọc giá vốn theo vai trò khi mọi vai trò dùng chung SQL role `authenticated`. Ảnh hưởng WU-04, WU-07, WU-09, WU-24.
3. **D-22:** exceljs đọc file KiotViet (styles lệch chuẩn) trong trình duyệt hay ở server; giới hạn kích thước file.
4. **D-11:** RPC phân trang trả tổng số dòng hiệu quả trên 3.266 mã khi kết hợp tìm trigram + lọc.
