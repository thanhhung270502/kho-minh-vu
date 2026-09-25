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
- **Phase 5 — Tồn kho:** 12/12 plan thực thi, 0058–0062 trên cloud; UAT chưa xong (05-UAT testing).
- **Phase 6 — Kiểm kê & Go-live:** 16/16 plan thực thi, 0063–0066 trên cloud, pgTAP 34/34 file
  (~510 assert), quyền route 145/145. UAT **một phần** (4 đạt, 1 lỗi đã sửa, 9 chưa kiểm) —
  luồng kiểm kê chưa chạy trên giao diện thật, đầu kỳ chưa làm. Xem [[mo-sau-phase-6]].
- Database: Supabase cloud `kho-vu-tru` (`phonzyruoalimgaovljm`, ap-southeast-1), mới nhất 0066.
  ⚠ `.env.local` đang bật khối project SAI (`rnpq…`) — xem blockers/mo-sau-phase-6.md.
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
- [nextjs-antd-supabase-ui](patterns/nextjs-antd-supabase-ui.md) — 4 bẫy giao diện lọt qua `npm run check`: lỗi PostgREST không phải instance, hàm client gọi từ server, query tham số rỗng, prop antd v6 đã bỏ (kể cả `notification message`), ref + React Compiler lint
- [pgtap-va-test](patterns/pgtap-va-test.md) — false pass do trùng mã lỗi, test đếm không giả định bảng rỗng, test đồng thời bằng 2 psql, `finish(true)` không bắt thiếu assert, 42702 trong `RETURNS TABLE`, đẩy migration qua MCP + md5, `(fn()).*` gọi lại hàm VOLATILE một lần mỗi cột

## Knowledge

- [du-lieu-kiotviet](knowledge/du-lieu-kiotviet.md) — định dạng file export, quy ước đuôi mã `-CB`/`-X`/`-S`, cột "Vị trí" là kho, NCC ảo, 8 tên khách trong ô Ghi chú

## Decisions

- [phase-1](decisions/phase-1.md) — đảo sang cloud, không tự đặt quy_doi=2, giữ nguyên tên nhóm, tìm kiếm ILIKE + word_similarity
- [phase-6](decisions/phase-6.md) — không barcode/không giá, chốt tồn theo dòng, công tắc quyền đọc bảng, bỏ KiotViet khỏi thẻ kho

## Blockers

- [mo-sau-phase-6](blockers/mo-sau-phase-6.md) — UAT Phase 6 một phần, đầu kỳ chưa làm, .env.local trỏ sai project, 54 commit chưa push

- [mo-sau-phase-1](blockers/mo-sau-phase-1.md) — lỗi dữ liệu kho sai cột, 3 việc cần người dùng quyết, việc chuyển sang Phase 2
