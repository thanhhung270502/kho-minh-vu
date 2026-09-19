# Bộ nhớ dự án — Kho Minh Vũ

Đọc file này đầu mỗi phiên làm việc. Chỉ chứa thứ **học được khi làm** — không lặp
lại PROJECT.md, CLAUDE.md hay code.

## Trạng thái

- **Phase 1 — Nền dữ liệu:** xong, UAT 6/6 đạt (lỗi dữ liệu kho sai cột đã sửa ở 0025).
- **Phase 2 — Khung ứng dụng:** xong 21 plan, UAT 12 đạt / 0 lỗi còn lại / 2 bài chờ
  phiên quản lý. 199 pgTAP, quyền route 50/50 ô.
- Database: Supabase cloud `kho-vu-tru` (ap-southeast-1), 48 migration (mới nhất 0048).
- Dữ liệu thật đã nạp: 3.266 sản phẩm, 90 nhóm, 23 NCC, 594 + 4.732 dòng lưu trữ.
- Kho mặc định của sản phẩm ở `san_pham.kho_mac_dinh_id`, KHÔNG ở `vi_tri_ke`.
- Test: 225 pgTAP + test đồng thời + verify:hook + hàm thuần + đọc Excel + quyền route,
  xanh trên dữ liệu thật.
- **Đếm assert phải đếm cả dòng ERROR:** một file pgTAP chết giữa chừng không sinh
  `not ok` nào — chỉ đếm `not ok` sẽ ra "0 lỗi" trong khi 34 assert không hề chạy.

## Patterns

- [supabase-rls-bao-mat](patterns/supabase-rls-bao-mat.md) — GRANT ≠ RLS, quyền cột theo SQL role, view `security_invoker`, qualify toán tử khi khóa `search_path`
- [nextjs-antd-supabase-ui](patterns/nextjs-antd-supabase-ui.md) — 4 bẫy giao diện lọt qua `npm run check`: lỗi PostgREST không phải instance, hàm client gọi từ server, query tham số rỗng, prop antd v6 đã bỏ
- [pgtap-va-test](patterns/pgtap-va-test.md) — false pass do trùng mã lỗi, test đếm không giả định bảng rỗng, test đồng thời bằng 2 psql

## Knowledge

- [du-lieu-kiotviet](knowledge/du-lieu-kiotviet.md) — định dạng file export, quy ước đuôi mã `-CB`/`-X`/`-S`, cột "Vị trí" là kho, NCC ảo, 8 tên khách trong ô Ghi chú

## Decisions

- [phase-1](decisions/phase-1.md) — đảo sang cloud, không tự đặt quy_doi=2, giữ nguyên tên nhóm, tìm kiếm ILIKE + word_similarity

## Blockers

- [mo-sau-phase-1](blockers/mo-sau-phase-1.md) — lỗi dữ liệu kho sai cột, 3 việc cần người dùng quyết, việc chuyển sang Phase 2
