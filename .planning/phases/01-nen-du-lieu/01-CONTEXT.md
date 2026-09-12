# Phase 1: Nền dữ liệu - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Toàn bộ mô hình dữ liệu và quy tắc toàn vẹn kho vận hành đúng ở **tầng database**:
13 bảng, sổ cái `kho_movement` bất biến, trigger tồn kho + giá vốn, RLS bốn vai trò,
RPC ghi sổ/hủy/tìm kiếm, đánh số chứng từ, job đối chiếu hằng đêm, bộ test pgTAP,
và nạp danh mục thật từ export KiotViet.

**Không có giao diện trong phase này.** Mọi thứ kiểm chứng bằng SQL và pgTAP.
Màn hình, đăng nhập, layout thuộc Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Môi trường & quy trình migration

- **D-01:** Phát triển trên **Supabase local** (`npx supabase start`, Docker 28 đã có sẵn).
  Chạy pgTAP và thử migration miễn phí, không đụng dữ liệu thật. Push lên project cloud
  khi schema đã chốt.
- **D-02:** Mọi thay đổi schema là **file trong `supabase/migrations/`**, không bao giờ
  click sửa trên Dashboard. Dashboard chỉ dùng để bật extension và custom access token hook
  (những thứ CLI không làm được).
- **D-03:** pgTAP chạy bằng `npx supabase test db`, test đặt ở `supabase/tests/`.

### Nạp dữ liệu từ KiotViet

Đây là **giả định rủi ro nhất** người dùng tự nhận ở Office Hours: "file export đủ sạch
để nạp thẳng". Thiết kế phải giả định điều ngược lại.

- **D-04:** Import bằng **script Node có `--dry-run`**. Chế độ thử đọc file, validate
  từng dòng, in báo cáo (dòng nào lỗi, lỗi gì, tổng bao nhiêu dòng hợp lệ) và **không ghi
  gì vào database**. Chỉ khi báo cáo sạch mới chạy thật.
- **D-05:** Import **idempotent** — chạy lại nhiều lần không nhân đôi dữ liệu. Upsert theo
  khóa nghiệp vụ (`san_pham.ma_hang`, `doi_tac.ma`, `nhom_hang.ma`).
- **D-06:** Import chạy **toàn bộ hoặc không gì cả** trong một transaction. Không nạp nửa vời.
- **D-07:** File export thật đặt ở **`data/kiotviet/`**, thêm vào `.gitignore` — đây là dữ
  liệu kinh doanh thật, không đẩy lên git. Repo chỉ giữ `data/kiotviet/README.md` mô tả
  file nào cần đặt ở đâu.

### Giá vốn

- **D-08:** Bình quân gia quyền di động tính **toàn công ty** — một mã hàng có đúng một
  giá vốn, dù nằm ở kho nào. Nguồn sự thật là `san_pham.gia_von`.
- **D-09:** **Lệch với tài liệu thiết kế gốc:** `ton_kho` **không** giữ cột `gia_von_bq`.
  Tài liệu gốc đặt giá vốn ở cấp (kho, sản phẩm); quyết định D-08 chuyển nó lên cấp sản phẩm.
  `ton_kho` chỉ còn `(kho_id, san_pham_id, so_luong, cap_nhat_luc)`.
- **D-10:** `kho_movement.gia_von_tai_thoi_diem` ghi giá vốn toàn công ty tại thời điểm
  phát sinh, để thẻ kho dựng lại được giá trị lịch sử mà không phải tính ngược.
- **D-11:** Chuyển kho **không đụng giá vốn** — hệ quả trực tiếp của D-08. Một chứng từ
  `CHUYEN_KHO` sinh 2 movement (âm ở kho đi, dương ở kho đến), cùng một `gia_von_tai_thoi_diem`.
- **D-12:** Kiểu số: `numeric(18,4)` cho giá vốn và đơn giá, `numeric(18,0)` cho thành tiền.
  **Mọi phép tính giá vốn làm trong Postgres, không ở JS** — `supabase-js` trả `numeric` về
  dạng string, `Number()` rồi nhân chia là mất chính xác và lệch dần theo thời gian.

### Tài khoản & phân quyền

- **D-13:** Seed **4 tài khoản mẫu** (quản lý / văn phòng / thủ kho / chỉ xem) cho môi trường
  local. pgTAP dùng chính 4 tài khoản này, không giả lập JWT bằng tay.
- **D-14:** Trên cloud, tài khoản tạo tay qua Dashboard cho đến khi có màn Cài đặt (Phase 2).
- **D-15:** Vai trò và kho được bơm vào JWT bằng **custom access token hook**. Helper RLS
  đọc từ `auth.jwt()` và **phải bọc trong `(select ...)`** để Postgres cache một lần mỗi câu
  lệnh thay vì chạy lại mỗi dòng — quét bảng tồn 3.266 mã sẽ chậm thấy rõ nếu không.

### Toàn vẹn dữ liệu

- **D-16:** **13 bảng**, không phải 11 như tài liệu gốc ghi (tài liệu đếm nhầm — xem
  PROJECT.md Key Decisions). Thêm `nguoi_dung` so với danh sách trong tài liệu.
- **D-17:** Sổ cái bất biến chặn bằng **cả hai lớp**: REVOKE UPDATE/DELETE **và** trigger
  `BEFORE UPDATE OR DELETE` ném exception. RLS một mình không đủ vì `service_role` bypass RLS.
- **D-18:** Đánh số chứng từ bằng **bảng đếm + `UPDATE ... RETURNING`** (khóa dòng), không
  dùng Postgres sequence — sequence không reset theo năm được.
- **D-19:** Tìm không dấu dùng `unaccent` + `pg_trgm`. `unaccent()` không IMMUTABLE nên
  **phải bọc trong hàm wrapper IMMUTABLE** mới index được.
- **D-20:** `uuid_generate_v4()` (extension `uuid-ossp`), không `gen_random_uuid()` — theo
  quy tắc global của người dùng.

### Claude's Discretion

Đã nêu ra lúc thảo luận, không ai phản đối:

- **D-21:** Đánh số chứng từ reset theo năm, **không** tách theo kho (`PN26-000001` dùng chung
  cả 2 kho).
- **D-22:** Lý do xuất âm: **danh sách cố định cấu hình được + ô ghi chú tự do**, lưu ở
  **header** chứng từ (không phải từng dòng) — một phiếu xuất thường chỉ có một lý do.
- **D-23:** RPC phải ném exception với **SQLSTATE có nghĩa** (`23514` cho vi phạm quy tắc
  nghiệp vụ, `42501` cho không đủ quyền) vì `src/shared/lib/errors.ts` đã map sẵn các mã đó
  sang thông báo tiếng Việt. Ném `RAISE EXCEPTION` mặc định (`P0001`) sẽ rơi vào nhánh
  "không xác định" và người dùng đọc được message thô.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Đặc tả nghiệp vụ
- `.planning/PROJECT.md` — bối cảnh, Core Value, ràng buộc, bảng Key Decisions (13 quyết định đã chốt)
- `.planning/REQUIREMENTS.md` — 17 yêu cầu của Phase 1: DATA-01..10, AUTH-03..06, DLIEU-01..03
- `.planning/ROADMAP.md` §Phase 1 — 5 success criteria phải đạt
- Tài liệu thiết kế gốc (artifact): `https://claude.ai/code/artifact/3e37d306-5acd-4803-bbdc-aaad139b154b`
  — mô hình dữ liệu chi tiết từng cột, 5 nguyên tắc kiến trúc, luồng chứng từ, bảng ánh xạ
  chuyển dữ liệu. **Là nguồn gốc của mọi quyết định trong PROJECT.md.** Nơi CONTEXT.md này
  lệch khỏi nó đã ghi rõ ở D-09 và D-16.

### Quy ước code
- `CLAUDE.md` — quy trình build feature 7 bước, 5 nguyên tắc kiến trúc kho, bẫy đã gặp
  (thứ tự CSS layer antd/Tailwind, `proxy.ts` thay `middleware.ts`)
- `~/.claude/rules/project/DATABASE_RULES.md` — quy tắc database global. **Phase này theo
  hầu hết nhưng lệch có chủ đích ở khóa ngoại**: quy tắc global cấm FK, dự án này dùng FK
  (lý do ở PROJECT.md Key Decisions). Các mục khác vẫn theo: TEXT không VARCHAR,
  `uuid_generate_v4()`, partial index cho soft delete, tái dùng `update_updated_at()`.

### Code hiện có
- `src/types/database.types.ts` — hiện là stub rỗng. Phase 1 kết thúc phải sinh lại bằng
  `npm run db:types`.
- `src/shared/lib/errors.ts` — map mã lỗi Postgres sang thông báo tiếng Việt. Quyết định
  SQLSTATE của RPC (D-23) phải khớp file này.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/client.ts` / `server.ts` / `middleware.ts` — ba client Supabase đã dựng
  đúng chuẩn (`getUser()` không `getSession()`, server client tạo mới mỗi request). Phase 1
  không cần sửa, chỉ cần schema để type hóa `Database` generic.
- `src/lib/env.ts` — validate biến môi trường bằng Zod lúc khởi động. Biến mới của Phase 1
  (nếu có) thêm vào đây và `.env.example`.
- `src/shared/lib/errors.ts` — đã map sẵn `23505` (trùng), `23503` (sai khóa ngoại),
  `23514` (vi phạm ràng buộc), `42501` (RLS chặn), `PGRST116` (không tìm thấy).
- `package.json` có sẵn script `db:types` trỏ vào project cloud qua `SUPABASE_PROJECT_ID`.

### Established Patterns
- Tên file và route: tiếng Việt **không dấu**, nối bằng gạch ngang. Áp dụng cho cả tên bảng,
  cột và hàm SQL (`kho_movement`, `ghi_so_chung_tu`, `tim_san_pham`).
- Cột số lượng dùng `numeric`, **không** `float8` — đã ghi trong CLAUDE.md Bước 3.

### Integration Points
- **Chưa có thư mục `supabase/`** — Phase 1 tạo mới toàn bộ: `config.toml`, `migrations/`,
  `tests/`, `seed.sql`.
- `src/types/database.types.ts` là điểm nối duy nhất giữa database và ứng dụng. Phase 2 trở
  đi chỉ đọc file này, không tự viết type bảng.
- `npm run db:types` hiện trỏ vào cloud; cần bổ sung biến thể chạy với local khi phát triển.

</code_context>

<specifics>
## Specific Ideas

- **Ô tìm mã hàng là chỗ tiết kiệm thời gian lớn nhất của cả hệ thống.** 3.266 mã nhưng chỉ
  1.223 mã luân chuyển trong 10 ngày. RPC `tim_san_pham` phải xếp mã phát sinh gần đây lên
  trước — cần cột `san_pham.lan_phat_sinh_cuoi` cập nhật bằng trigger từ `kho_movement`.
- **Nỗi đau người dùng nêu ở Office Hours (cả bốn đều chọn):** tồn không đáng tin, hỏi gì
  cũng không trả lời được, không biết lãi lỗ, ai cũng sửa được mọi thứ. Bốn nỗi đau này ánh
  xạ thẳng vào bốn nhóm việc của Phase 1: sổ cái bất biến, tách `dvt`/`cong_doan` + bảng
  `doi_tac`, giá vốn, RLS.
- **Người dùng sẽ đặt 4 file export vào `data/kiotviet/`.** Script import phải chạy được
  trên dữ liệu thật ngay trong Phase 1, không chỉ trên dữ liệu mẫu.

</specifics>

<deferred>
## Deferred Ideas

- **`src/shared/lib/errors.ts` còn dùng từ "xưởng"** trong thông báo người dùng ("chỉ thao
  tác được trên xưởng được phân công") — phạm vi này là "kho", không phải "xưởng". Sửa ở
  Phase 2 khi lỗi RLS lần đầu hiện ra giao diện.
- **`src/shared/components/app-shell.tsx`** còn menu của phạm vi cũ (`/san-xuat`, `/bao-cao`).
  Đã ghi là blocker của Phase 2 trong STATE.md.
- **DLIEU-04** (trích khách hàng thật từ ô Ghi chú) thuộc Phase 2 — cần bảng `doi_tac` của
  Phase 1 tồn tại trước, nhưng bản thân việc chuẩn hóa 8 tên khách cần người đối chiếu tay.
- **Realtime** — Supabase đã sẵn nhưng v1 không dùng. Không bật ở Phase 1.

</deferred>

---

*Phase: 01-nen-du-lieu*
*Context gathered: 2026-09-12*
