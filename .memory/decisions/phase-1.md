# Quyết định Phase 1 — Nền dữ liệu

Chỉ ghi quyết định **phát sinh trong lúc làm**, hoặc quyết định gốc bị đảo lại.
Quyết định thiết kế ban đầu nằm ở `.planning/PROJECT.md` (Key Decisions) và
`.planning/phases/01-nen-du-lieu/01-CONTEXT.md` (D-01..D-23).

---

## ĐẢO LẠI: Supabase cloud thay vì local

**Gốc (D-01):** phát triển trên Supabase local qua Docker.
**Đổi:** máy hết đĩa (441/460 GB) → dùng project cloud `kho-vu-tru` (ap-southeast-1).
**Hệ quả:**
- Dữ liệu nền (kho, ĐVT, công đoạn) chuyển vào migration `0018` — `db push` không chạy `seed.sql`.
- `scripts/seed-users.ts` (Admin API) thành đường chính tạo tài khoản mẫu.
- Không còn `db reset` rẻ tiền để thử — mọi thử nghiệm dùng khối `DO` ném lỗi để rollback.
- Region `ap-southeast-1` (Singapore): độ trễ từ VN ~30–40ms thay vì ~60–90ms nếu Seoul.
  Project Seoul tạo nhầm lúc đầu đã xóa, tạo lại khi DB còn rỗng.

## ĐẢO LẠI: không tự đặt quy_doi = 2 cho hàng CẶP

**Gốc:** script đặt `quy_doi = 2` khi ĐVT là CẶP.
**Đổi:** nạp đúng số trong file (1). Dữ liệu chứng minh CẶP là đơn vị gốc (bán số lẻ 1/3/5/7).
Đặt 2 sẽ làm sai tồn của 148 mã.

## MỚI: nhóm hàng giữ nguyên tên, không tách tên–mã

`" - "` không nhất quán trong KiotViet. Tách sẽ trộn 1.324 sản phẩm vào một nhóm.
Mã nhóm = slug của tên đầy đủ. Dựng cây nhóm (`parent_id`) là việc tay ở màn Cài đặt.

## MỚI: văn phòng tạo mã hàng phải để gia_ban = 0

Hệ quả của việc khóa đường INSERT. AUTH-05 ghi "văn phòng không sửa được giá" — cho đặt
giá lúc tạo là lách bằng xóa-rồi-tạo-lại. Sửa ở nhánh `tg_op = 'INSERT'` của
`chan_sua_gia_khong_du_quyen` nếu vận hành thấy vướng. **Chưa được người dùng xác nhận.**

## MỚI: tìm kiếm hai nhánh ILIKE + word_similarity

Toán tử `%` đo độ giống **toàn chuỗi** — gõ vài ký tự luôn dưới ngưỡng, trả rỗng.
Đổi sang `ILIKE '%...%'` (index GIN trigram tăng tốc được) cộng `<%` cho gõ sai.
**Giới hạn đã biết:** gõ sai 1 ký tự trong mã ngắn 3 ký tự không tìm ra (word_similarity 0.5).

## MỚI: đối chiếu tồn tách hàm người dùng và hàm hệ thống

`doi_chieu_ton()` cho người dùng — kiểm vai trò, chỉ quản lý/văn phòng.
`_doi_chieu_ton_he_thong()` cho cron — không kiểm vai trò (không có JWT), **ghi kết quả**
vào `nhat_ky_doi_chieu`. Bản gốc chạy rồi vứt kết quả đi.

## MỚI: psql thay vì thêm dependency pg cho test đồng thời

`psql` 15.10 có sẵn qua Homebrew. CLAUDE.md yêu cầu hỏi trước khi cài thư viện.

## MỚI: publishable/secret key đời mới

`NEXT_PUBLIC_SUPABASE_ANON_KEY` giữ giá trị `sb_publishable_...`,
`SUPABASE_SERVICE_ROLE_KEY` giữ `sb_secret_...`. Giữ tên biến cũ để không phải sửa 4 file.
