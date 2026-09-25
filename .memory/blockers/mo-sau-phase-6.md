# Việc còn mở sau Phase 6 (25/09/2026)

1. **UAT Phase 6 mới một phần** (`06-UAT.md`, status partial): 4 đạt, 1 lỗi đã sửa (7b1fe8f),
   9 chưa kiểm. Luồng kiểm kê trên giao diện (mở phiên, đếm điện thoại/bảng/Excel, D-03,
   bảng lệch, duyệt/hủy) CHƯA chạy trên database thật — 25/09 `kho-vu-tru` có 0 KIEM_KE.
   Người dùng từng trả lời "đạt"/"pass" khi chưa thử: **đối chiếu database sau mỗi bài có ghi dữ liệu.**
2. **Đầu kỳ chưa làm** (D-01, D-06): 0 DIEU_CHINH. Thứ tự: nạp tồn tạm → mở phiên toàn kho →
   file mẫu từng nhóm → đếm sát ngày chuyển → nhập → duyệt.
3. **`.env.local` bật khối project sai** `rnpqgbuypmecxiatuulz` (không phân giải); khối đúng
   `phonzyruoalimgaovljm` đang bị comment. `npm run dev`/`db:push`/`db:types`/`seed:users` đi nhầm
   cho tới khi người dùng đổi. Cách tạm đã dùng: script bọc nạp khối comment vào env rồi
   `next dev` (dotenv/Next không ghi đè biến đã có); đẩy migration bằng client `pg` + ghi
   `schema_migrations` + so md5 (pattern 12); kiểu bằng MCP `generate_typescript_types`.
4. **`data/kiotviet/*.xlsx` không có trên máy này** → `test-excel-reader.ts` không chạy trọn.
5. Phase 5 vẫn chưa verify (05-UAT status testing).
6. Nhánh `main` đi trước `origin/main` 54 commit — chưa push.
