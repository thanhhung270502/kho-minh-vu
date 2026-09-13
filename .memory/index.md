# Bộ nhớ dự án — Kho Minh Vũ

Đọc file này đầu mỗi phiên làm việc. Chỉ chứa thứ **học được khi làm** — không lặp
lại PROJECT.md, CLAUDE.md hay code.

## Trạng thái

- **Phase 1 — Nền dữ liệu:** xong, UAT 5/6 đạt + 1 lỗi nhỏ (dữ liệu kho sai cột).
- Database: Supabase cloud `kho-vu-tru` (ap-southeast-1), 24 migration.
- Dữ liệu thật đã nạp: 3.266 sản phẩm, 90 nhóm, 23 NCC, 594 + 4.732 dòng lưu trữ.
- Test: 79 pgTAP + test đồng thời + verify:hook, xanh trên dữ liệu thật.

## Patterns

- [supabase-rls-bao-mat](patterns/supabase-rls-bao-mat.md) — GRANT ≠ RLS, quyền cột theo SQL role, view `security_invoker`, qualify toán tử khi khóa `search_path`
- [pgtap-va-test](patterns/pgtap-va-test.md) — false pass do trùng mã lỗi, test đếm không giả định bảng rỗng, test đồng thời bằng 2 psql

## Knowledge

- [du-lieu-kiotviet](knowledge/du-lieu-kiotviet.md) — định dạng file export, quy ước đuôi mã `-CB`/`-X`/`-S`, cột "Vị trí" là kho, NCC ảo, 8 tên khách trong ô Ghi chú

## Decisions

- [phase-1](decisions/phase-1.md) — đảo sang cloud, không tự đặt quy_doi=2, giữ nguyên tên nhóm, tìm kiếm ILIKE + word_similarity

## Blockers

- [mo-sau-phase-1](blockers/mo-sau-phase-1.md) — lỗi dữ liệu kho sai cột, 3 việc cần người dùng quyết, việc chuyển sang Phase 2
