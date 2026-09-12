# Phase 1: Nền dữ liệu - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-12
**Phase:** 01-nen-du-lieu
**Areas discussed:** Office Hours, Môi trường database, Nạp dữ liệu KiotViet, Phạm vi giá vốn, Tài khoản & vai trò, File export

---

## Office Hours (bắt buộc trước khi gom yêu cầu)

### Q1 — Nền dữ liệu này thực sự giải quyết nỗi đau gì?

| Option | Description | Selected |
|--------|-------------|----------|
| Tồn không đáng tin | Lệch tồn thì không truy được vì sao, phải đếm lại toàn kho | ✓ |
| Hỏi gì cũng không trả lời được | Công đoạn nhét vào ô ĐVT, khách nhét vào ô Ghi chú | ✓ |
| Không biết lãi lỗ | Giá bằng 0 trên toàn bộ chứng từ, không có giá vốn | ✓ |
| Ai cũng sửa được mọi thứ | Không phân quyền thật, không ai biết ai đã đổi gì | ✓ |

**User's choice:** Cả bốn.
**Notes:** Bốn nỗi đau ánh xạ thẳng vào bốn nhóm việc của Phase 1 — sổ cái bất biến,
tách `dvt`/`cong_doan` + bảng `doi_tac`, giá vốn, RLS. Xác nhận phạm vi Phase 1 không thừa.

### Q2 — Phiên bản hẹp nhất mà vẫn học được điều cần học?

| Option | Description | Selected |
|--------|-------------|----------|
| Đủ như roadmap | 13 bảng + trigger + RLS + RPC + tìm không dấu + cron + pgTAP + nạp 3.266 mã | ✓ |
| Bỏ cron + tìm kiếm | Dồn job đối chiếu và RPC tìm sang phase sau | |
| Chỉ schema + trigger tồn | RLS/RPC/pgTAP để sau | |

**User's choice:** Đủ như roadmap, không cắt.
**Notes:** Không cắt phạm vi. Phase 2 trở đi chỉ việc gọi.

### Q3 — Giả định nào đang đặt ra mà có thể sai?

| Option | Description | Selected |
|--------|-------------|----------|
| Công đoạn suy được từ nhóm hàng | 1.826 mã ĐVT "CÁI" chưa biết công đoạn | |
| Bình quân gia quyền đủ dùng | Nếu cần biết lô nào giá bao nhiêu thì phải làm lại theo FIFO | |
| File export đủ sạch để nạp | 4 file KiotViet ánh xạ thẳng sang schema mới | ✓ |
| Quy đổi đều bằng 1 | 148 mã đơn vị CẶP nhưng quy_doi hiện đều = 1 | |

**User's choice:** File export đủ sạch để nạp.
**Notes:** Đây là rủi ro duy nhất người dùng thấy đáng lo. Đổi cách thiết kế phần import:
phải có chế độ thử, báo cáo từng dòng lỗi, và chạy lại được nhiều lần. Không lo về công
đoạn, FIFO hay quy đổi — coi như các giả định đó đã được xác nhận.

---

## Môi trường database

| Option | Description | Selected |
|--------|-------------|----------|
| Local + cloud staging | `npx supabase start` trong Docker, push lên cloud khi chốt | ✓ |
| Chỉ cloud | Làm thẳng trên project Supabase cloud | |
| Chỉ local | Hoãn quyết định hạ tầng sang Phase 2 | |

**User's choice:** Local + cloud staging.
**Notes:** Docker 28.0.1 đã có sẵn trên máy; Supabase CLI 2.117.0 chạy được qua `npx`.
pgTAP chạy local, miễn phí và không giới hạn số lần thử migration.

---

## Nạp dữ liệu KiotViet

| Option | Description | Selected |
|--------|-------------|----------|
| Script có chế độ thử | Script Node `--dry-run`, báo cáo từng dòng lỗi, upsert idempotent | ✓ |
| Sinh sẵn file SQL seed | Chuyển export thành `supabase/seed.sql` một lần | |
| Import CSV bằng tay | Dùng chức năng import của Supabase Dashboard | |

**User's choice:** Script có chế độ thử.
**Notes:** Chọn thẳng theo rủi ro đã flag ở Office Hours Q3. Hai phương án còn lại đều giả
định file sạch — đúng cái giả định người dùng không tin.

---

## Phạm vi giá vốn

| Option | Description | Selected |
|--------|-------------|----------|
| Toàn công ty | Một mã = một giá vốn, dù nằm ở kho nào | ✓ |
| Theo từng kho | Mỗi kho giữ giá vốn riêng | |
| Cả hai | Lưu theo kho, tổng hợp lên sản phẩm | |

**User's choice:** Toàn công ty.
**Notes:** Kéo theo thay đổi schema so với tài liệu gốc — `ton_kho` bỏ cột `gia_von_bq`,
chỉ còn `so_luong`. Chuyển kho không đụng giá vốn. Ghi thành D-08/D-09/D-11 trong CONTEXT.md.

---

## Tài khoản & vai trò ở Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Seed sẵn 4 tài khoản mẫu | Quản lý/văn phòng/thủ kho/chỉ xem cho local, pgTAP dùng luôn | ✓ |
| Tạo tay qua Dashboard | pgTAP giả lập JWT claims thay vì dùng user thật | |
| Để bạn quyết | Claude chọn cách ít ma sát nhất | |

**User's choice:** Seed sẵn 4 tài khoản mẫu.
**Notes:** pgTAP test RLS bằng user thật qua JWT thật, không giả lập claims — bắt được lỗi
ở cả tầng hook lẫn tầng policy.

---

## File export KiotViet

| Option | Description | Selected |
|--------|-------------|----------|
| Tôi sẽ đưa vào repo | Copy 4 file vào `data/kiotviet/` (gitignore) | ✓ |
| Viết script trước, nạp sau | Test trên dữ liệu mẫu tự sinh | |
| Để sang Phase 2 | Dời DLIEU-01..03 sang Phase 2 | |

**User's choice:** Tôi sẽ đưa vào repo.
**Notes:** DLIEU-01..03 giữ nguyên trong Phase 1. Phase 1 phải tạo `data/kiotviet/README.md`
mô tả file nào cần đặt ở đâu, và thêm `data/kiotviet/` vào `.gitignore`.
**Phụ thuộc bên ngoài:** không nạp được dữ liệu thật cho tới khi người dùng đặt file vào.

---

## Claude's Discretion

Nêu ra lúc trình bày vùng xám, không ai phản đối — ghi thành D-21, D-22, D-23 và D-12:

- Đánh số chứng từ reset theo năm, không tách theo kho.
- Lý do xuất âm: danh sách cố định cấu hình được + ghi chú tự do, lưu ở header chứng từ.
- Chuyển kho: giá vốn đi theo hàng (hệ quả của "giá vốn toàn công ty").
- Kiểu số: `numeric(18,4)` cho giá vốn, `numeric(18,0)` cho thành tiền.

## Deferred Ideas

- `src/shared/lib/errors.ts` còn dùng từ "xưởng" trong thông báo người dùng → Phase 2.
- `src/shared/components/app-shell.tsx` còn menu phạm vi cũ → đã là blocker Phase 2.
- DLIEU-04 (trích khách hàng từ ô Ghi chú) → Phase 2.
- Supabase Realtime → không bật ở v1.
