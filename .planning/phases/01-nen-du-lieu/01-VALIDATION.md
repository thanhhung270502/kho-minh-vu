---
phase: 1
slug: nen-du-lieu
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-12
---

# Phase 1 — Validation Strategy

> Hợp đồng kiểm chứng cho Phase 1. Nguồn: `01-RESEARCH.md` §Validation Architecture.
> Phase này không có giao diện — mọi hành vi kiểm chứng được bằng SQL, pgTAP hoặc exit code.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (có sẵn trong image Supabase local, không cần cài thêm) |
| **Config file** | `supabase/config.toml` — mục `[db.seed]` trỏ tới `supabase/seed.sql`. Không cần config riêng cho pgTAP. |
| **Quick run command** | `npx supabase db reset` |
| **Full suite command** | `npx supabase db reset && npx supabase test db` |
| **Estimated runtime** | ~30–60 giây (Docker local, 13 bảng, dữ liệu seed nhỏ) |

---

## Sampling Rate

- **Sau mỗi task commit:** `npx supabase db reset` — bắt ngay migration mới làm vỡ chuỗi migration.
- **Sau mỗi wave:** `npx supabase test db` — toàn bộ pgTAP suite.
- **Trước `/spartan:phase verify 1`:** full suite xanh, **cộng** chạy thật `scripts/import-kiotviet` với `--dry-run=false`.
- **Max feedback latency:** 60 giây.

---

## Per-Task Verification Map

Ánh xạ 17 yêu cầu → tín hiệu quan sát được. Cột "Wave" theo phân rã ở `01-WORK-UNITS.md`
(planner có thể đánh lại số; điều quan trọng là mỗi yêu cầu có đúng một tín hiệu tự động).

| Requirement | Hành vi phải đúng | Test Type | Automated Command | File Exists |
|---|---|---|---|---|
| **DATA-01** | Migration chạy sạch trên DB rỗng, dựng đủ 13 bảng + index + ràng buộc | smoke | `npx supabase db reset` (exit 0) | ❌ W0 — là tiền đề của mọi WU sau, không cần file test riêng |
| **DATA-02** | UPDATE/DELETE `kho_movement` bị từ chối kể cả `service_role` **và** table owner | pgTAP | `supabase/tests/ton_kho_test.sql` | ❌ W0 |
| **DATA-03** | Insert `kho_movement` → `ton_kho` cập nhật ngay, không cần lệnh phụ | pgTAP | `supabase/tests/ton_kho_test.sql` | ❌ W0 |
| **DATA-04** | Giá vốn bình quân gia quyền di động đúng công thức, kể cả khi 2 phiếu nhập đồng thời | pgTAP (có 1 test 2-connection) | `supabase/tests/ton_kho_test.sql` | ❌ W0 |
| **DATA-05** | Ghi sổ atomic — lỗi ở dòng n không để lại movement của n-1 dòng trước | pgTAP (cố tình đưa dòng sai vào giữa phiếu) | `supabase/tests/chung_tu_test.sql` | ❌ W0 |
| **DATA-06** | Hủy chứng từ sinh bút toán đảo, bản ghi gốc còn nguyên, tồn về đúng số cũ | pgTAP | `supabase/tests/chung_tu_test.sql` | ❌ W0 |
| **DATA-07** | Gõ không dấu ra kết quả có dấu; mã phát sinh gần đây xếp trước; truy vấn dùng Index Scan | pgTAP + assert `EXPLAIN` có Index Scan | `supabase/tests/tim_kiem_test.sql` | ❌ W0 — plan **01-12** Task 3 |
| **DATA-08** | Số chứng từ theo loại+năm, hai phiên tạo đồng thời không ra số trùng | pgTAP mô phỏng 2 kết nối | `supabase/tests/chung_tu_test.sql` | ❌ W0 |
| **DATA-09** | `doi_chieu_ton()` báo đúng danh sách chênh lệch khi cố tình làm lệch | pgTAP gọi thẳng hàm (**không** phụ thuộc pg_cron) | `supabase/tests/doi_chieu_test.sql` | ❌ W0 — plan **01-12** Task 3 |
| **DATA-10** | Toàn bộ suite pgTAP xanh | CLI exit code | `npx supabase test db` | ❌ W0 |
| **AUTH-03** | Vai trò nằm trong JWT; policy **không** có subplan truy vấn `nguoi_dung` mỗi dòng | pgTAP + assert `EXPLAIN`; **cộng** script tay verify hook thật khi login | `supabase/tests/rls_test.sql` + `scripts/verify-hook.ts` | ❌ W0 — plan **01-12** Task 1+2 |
| **AUTH-04** | Thủ kho không đọc được tồn/chứng từ của kho khác | pgTAP với JWT thật của tài khoản seed `thu_kho` | `supabase/tests/rls_test.sql` | ❌ W0 |
| **AUTH-05** | Văn phòng `UPDATE san_pham SET gia_von` bị từ chối `42501` | pgTAP với JWT `van_phong` | `supabase/tests/rls_test.sql` | ❌ W0 |
| **AUTH-06** | "Chỉ xem" không insert `chung_tu` và không gọi được `ghi_so_chung_tu` | pgTAP với JWT `chi_xem` | `supabase/tests/rls_test.sql` | ❌ W0 |
| **DLIEU-01** | Nạp đủ 3.266 mã / 90 nhóm / 25 đối tác / 2 kho | script output + `select count(*)` đối chiếu số liệu PROJECT.md | `npx tsx scripts/import-kiotviet/index.ts` rồi query đếm | ❌ W0 |
| **DLIEU-02** | ĐVT cũ tách thành `dvt` + `cong_doan` đúng mapping | SQL query đếm dòng có cả hai cột non-null theo mapping | query trong báo cáo import | ❌ W0 |
| **DLIEU-03** | 1.826 mã không suy được công đoạn từ ĐVT cũ được liệt kê rõ trong báo cáo | script output `--dry-run` | `npx tsx scripts/import-kiotviet/index.ts --dry-run` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — tất cả đang ⬜ pending.*

---

## Wave 0 Requirements

Chưa có hạ tầng test nào — toàn bộ phải dựng trong phase này.

- [ ] `supabase/config.toml` — khởi tạo stack local, bật extension, đăng ký custom access token hook
- [ ] `supabase/seed.sql` — 4 tài khoản mẫu (quản lý / văn phòng / thủ kho / chỉ xem) + danh mục cơ bản
- [ ] `supabase/tests/_helper.sql` — helper tự viết `dang_nhap_nhu(vai_tro)` bọc `set_config('request.jwt.claims', ...)`. **Không cài package ngoài** (`basejump-supabase_test_helpers` giả định model quyền riêng, không khớp `nguoi_dung`/`vai_tro`/`kho_id`; CLAUDE.md cũng yêu cầu hỏi trước khi thêm thư viện).
- [ ] `supabase/tests/ton_kho_test.sql` — DATA-02, DATA-03, DATA-04
- [ ] `supabase/tests/chung_tu_test.sql` — DATA-05, DATA-06, DATA-08
- [ ] `supabase/tests/tim_kiem_test.sql` — DATA-07 *(gap so với WORK-UNITS.md)*
- [ ] `supabase/tests/doi_chieu_test.sql` — DATA-09 *(gap so với WORK-UNITS.md)*
- [ ] `supabase/tests/rls_test.sql` — AUTH-03..06
- [ ] `scripts/verify-hook.ts` — xác nhận hook chạy thật khi login *(gap; xem Manual-Only bên dưới)*

---

## Manual-Only Verifications

| Hành vi | Requirement | Vì sao phải thủ công | Cách kiểm |
|---|---|---|---|
| Custom access token hook thật sự bơm `vai_tro`/`kho_id` vào JWT | AUTH-03 | pgTAP đặt `request.jwt.claims` trực tiếp nên **bỏ qua hook hoàn toàn** — test xanh không chứng minh hook chạy. Đây là lỗ hổng kiểm chứng thật, không phải chi tiết vặt. | `npx tsx scripts/verify-hook.ts` — login bằng tài khoản seed qua `supabase.auth.signInWithPassword()`, decode access token, assert có `vai_tro` và `kho_id` |
| `cron.schedule()` đăng ký job hằng đêm | DATA-09 (phần lịch) | pg_cron trên Supabase local Docker không đáng tin (nhiều issue mở tính đến 09/2026). Bản thân hàm `doi_chieu_ton()` **có** test tự động; chỉ phần đăng ký lịch là thủ công. | Kiểm trên cloud sau khi push: `select * from cron.job;` |
| Claim cũ sống sót tới khi refresh token | AUTH-03 | Phụ thuộc `jwt_expiry` của GoTrue, không quan sát được trong một transaction pgTAP | Đổi `vai_tro` của một tài khoản, gọi lại API bằng token cũ, xác nhận vẫn dùng vai trò cũ cho tới lần refresh kế tiếp. Ghi `jwt_expiry` đọc được vào README nội bộ. |

---

## Rủi ro đã biết ảnh hưởng tới kiểm chứng

Từ `01-RESEARCH.md` §Work Unit Risk Assessment — planner phải xử lý:

1. **Trigger giá vốn (WU-08)** — sai thứ tự khóa (đọc `ton_kho` trước khi khóa `san_pham` bằng `FOR UPDATE`) chỉ lộ dưới tải đồng thời. pgTAP một-transaction **không** bắt được. Bắt buộc có test 2-connection.
2. **RPC ghi sổ (WU-11)** — 7 loại chứng từ trong một hàm quá lớn cho một work unit; tách thành hàm nội bộ theo loại để test độc lập.
3. **RLS (WU-14)** — 20–30 policy trên 13 bảng; tách thành `0014a_rls_helper` / `0014b_rls_danh_muc` / `0014c_rls_chung_tu`.
4. **pg_cron (WU-15)** — tách "viết hàm" (test được) khỏi "đăng ký lịch" (hoãn tới khi có cloud project).
5. **Import Excel (WU-20/21)** — KiotViet export thường có dòng tổng/dòng trống cuối sheet và cột số format Text; script phải tự ép kiểu, không tin `typeof` mặc định của exceljs.

**Ba lỗi plan-checker bắt được trong vòng soát plan, đã sửa — ghi lại để không tái phạm:**

6. **Quyền theo cột áp theo SQL role, không theo JWT claim.** Quản lý và văn phòng cùng kết nối dưới role `authenticated`, chỉ khác claim. Bỏ một cột khỏi `grant update (...)` là chặn MỌI vai trò, kể cả vai trò lẽ ra được phép, và biến nhánh phân vai của trigger thành code chết. → `gia_von` dùng GRANT cột (chặn tuyệt đối), `gia_ban` dùng trigger (phân vai).
7. **Khối tự kiểm RLS quét MỌI bảng schema `public`**, không chỉ 13 bảng nghiệp vụ. `chuoi_so_ct` và hai bảng lưu trữ KiotViet cũng phải bật RLS, nếu không `npm run db:reset` hỏng từ wave 7 và kéo theo mọi plan sau.
8. **Khóa cột trên UPDATE mà quên INSERT là không khóa gì cả.** Chặn sửa `gia_von` nhưng cho tạo mã mới với `gia_von` tùy ý thì người dùng xóa rồi tạo lại là lách được. Giá trị bịa lúc tạo còn nguy hiểm hơn: nó thành `v_gia_von_cu` ở lần ghi sổ đầu tiên và làm hỏng bình quân gia quyền từ con số đầu, im lặng. Mọi ràng buộc cột phải phủ cả hai đường ghi.

---

## Validation Sign-Off

- [ ] Mọi task có `<automated>` verify hoặc phụ thuộc Wave 0
- [ ] Liên tục lấy mẫu: không có 3 task liên tiếp nào thiếu verify tự động
- [ ] Wave 0 phủ hết các file MISSING ở trên (kể cả 3 gap: `tim_kiem_test.sql`, `doi_chieu_test.sql`, `verify-hook.ts`)
- [ ] Không dùng cờ watch-mode
- [ ] Feedback latency < 60s
- [ ] Đặt `nyquist_compliant: true` trong frontmatter

**Approval:** pending
