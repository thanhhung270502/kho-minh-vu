# Bộ nhớ dự án — Kho Minh Vũ

Đọc file này đầu mỗi phiên làm việc. Chỉ chứa thứ **học được khi làm** — không lặp
lại PROJECT.md, CLAUDE.md hay code.

## Trạng thái

- **Phase 1 — Nền dữ liệu:** xong, UAT 6/6 đạt (lỗi dữ liệu kho sai cột đã sửa ở 0025).
- **Phase 2 — Khung ứng dụng:** xong 21 plan, UAT 12 đạt / 0 lỗi còn lại / 2 bài chờ
  phiên quản lý. 199 pgTAP, quyền route 50/50 ô.
- **Phase 3 — Phiếu nhập:** xong 13 plan, UAT 12/12 đạt sau khi đóng 5 khuyết.
  225 pgTAP, quyền route 65/65 ô. Migration mới nhất 0049.
- **Phase 4 — Đơn đặt hàng & Phiếu xuất:** xem `.planning/STATE.md` (còn checkpoint kiểm mắt mở).
- **Phase 5 — Tồn kho:** 05-00…05-05 xong — 0058–0062 trên cloud, pgTAP 380/380 (30 file).
  05-06…05-11 (lớp dữ liệu, 3 màn, UAT) đang làm.
- Database: Supabase cloud `kho-vu-tru` (ap-southeast-1), mới nhất 0062.
- Dữ liệu thật đã nạp: 3.266 sản phẩm, 90 nhóm, 23 NCC, 594 + 4.732 dòng lưu trữ.
- Kho mặc định của sản phẩm ở `san_pham.kho_mac_dinh_id`, KHÔNG ở `vi_tri_ke`.
- Test: 225 pgTAP + test đồng thời + verify:hook + hàm thuần + đọc Excel + quyền route,
  xanh trên dữ liệu thật.
- **pgTAP không neo vào bộ đếm sống:** assertion `sinh_so_ct(...) = 'PN26-000001'`
  xanh đúng một lần rồi đỏ vĩnh viễn kể từ phiếu thật đầu tiên của năm. Dùng năm
  2091–2093 hoặc so tương đối.
- **Phím giả lập của công cụ trình duyệt có thể có `event.key` rỗng** (tên `Return`).
  Mọi handler `if (e.key !== "Enter")` đều trượt → trông y như thư viện hỏng. Đo
  `document.addEventListener("keydown", e => console.log(e.key), true)` trước khi
  kết luận. Dùng đúng tên `Enter`.
- **Đếm assert phải đếm cả dòng ERROR:** một file pgTAP chết giữa chừng không sinh
  `not ok` nào — chỉ đếm `not ok` sẽ ra "0 lỗi" trong khi 34 assert không hề chạy.

## Patterns

- [supabase-rls-bao-mat](patterns/supabase-rls-bao-mat.md) — GRANT ≠ RLS, quyền cột theo SQL role, view `security_invoker`, qualify toán tử khi khóa `search_path`
- [nextjs-antd-supabase-ui](patterns/nextjs-antd-supabase-ui.md) — 4 bẫy giao diện lọt qua `npm run check`: lỗi PostgREST không phải instance, hàm client gọi từ server, query tham số rỗng, prop antd v6 đã bỏ
- [pgtap-va-test](patterns/pgtap-va-test.md) — false pass do trùng mã lỗi, test đếm không giả định bảng rỗng, test đồng thời bằng 2 psql, `finish(true)` không bắt thiếu assert, 42702 trong `RETURNS TABLE`, đẩy migration qua MCP + md5

## Knowledge

- [du-lieu-kiotviet](knowledge/du-lieu-kiotviet.md) — định dạng file export, quy ước đuôi mã `-CB`/`-X`/`-S`, cột "Vị trí" là kho, NCC ảo, 8 tên khách trong ô Ghi chú

## Decisions

- [phase-1](decisions/phase-1.md) — đảo sang cloud, không tự đặt quy_doi=2, giữ nguyên tên nhóm, tìm kiếm ILIKE + word_similarity

## Blockers

- [mo-sau-phase-1](blockers/mo-sau-phase-1.md) — lỗi dữ liệu kho sai cột, 3 việc cần người dùng quyết, việc chuyển sang Phase 2
