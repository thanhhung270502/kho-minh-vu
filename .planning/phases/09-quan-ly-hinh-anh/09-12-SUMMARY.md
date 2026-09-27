---
phase: 09-quan-ly-hinh-anh
plan: 12
subsystem: script chép ảnh KiotViet một lần (chưa chạy --ghi thật)
tags: [script, sharp, gdrive, kiotviet, idempotent]
dependency_graph:
  requires:
    - "09-01 (RPC nap_anh_kiotviet)"
    - "09-04 (GDriveImageStorage, ImageStorageError, image-storage.ts)"
    - "09-03/09-08 (image-rules.ts: FULL_MAX_EDGE, safeFileStem, ...)"
  provides:
    - "scripts/copy-kiotviet-images/parse-image-cell.ts (parseImageCell, buildCopyPlan)"
    - "scripts/copy-kiotviet-images/index.ts (npm run import:kiotviet-images)"
    - "package.json devDependencies.sharp@0.35.4"
  affects:
    - "09-13 (chạy thật --ghi sau khi Apps Script deploy)"
tech_stack:
  added:
    - "sharp@0.35.4 (devDependency, chỉ dùng trong script này, D-22)"
  patterns:
    - "Dry-run mặc định an toàn, cùng khuôn với scripts/import-kiotviet/index.ts"
    - "Idempotent qua khóa `${productId}|${url}` đối chiếu với hinh_anh.nguon_url (kể cả đã xóa mềm)"
    - "Xử lý theo mã hàng song song có giới hạn (--song-song, mặc định 3, kẹp 1..5), ảnh trong cùng mã tuần tự theo order (D-14)"
key_files:
  created:
    - scripts/copy-kiotviet-images/parse-image-cell.ts
    - scripts/copy-kiotviet-images/index.ts
  modified:
    - scripts/test-pure-functions.ts
    - package.json
    - package-lock.json
decisions:
  - "sharp dynamic import (await import(\"sharp\")) trong nhánh --ghi, không import tĩnh — dry-run và typecheck không cần cài sharp thật sự chạy được, chỉ --ghi mới đòi hỏi"
  - "Kiểu SharpFn = (typeof import(\"sharp\"))[\"default\"] thay vì typeof import(\"sharp\") trực tiếp — module sharp dùng `export =`, gán thẳng làm biến không callable"
  - "--gioi-han cắt danh sách jobs MỘT lần ở main() trước khi in báo cáo và trước khi gọi chayThat() — tránh cắt hai lần ra số khác báo cáo"
metrics:
  duration: "~50 phút"
  completed: "2026-09-26"
---

# Phase 9 Plan 12: Script chép ảnh KiotViet sang Drive Summary

Script CLI chạy tay, chạy lại được (`npm run import:kiotviet-images`), chép ~1.100 ảnh mã hàng có sẵn trên KiotViet sang Drive theo đúng đường nén WebP + thumb như luồng ảnh mới — mặc định dry-run, `--ghi` chưa được chạy thật (thuộc plan 09-13, gated).

## Bối cảnh worktree

Worktree bắt đầu chưa có `.planning/phases/09-quan-ly-hinh-anh/`. Đã `git merge main --ff-only` trước khi đọc plan (fast-forward sạch, kéo về waves 1–3 gồm 09-01..09-11). `node_modules` và `.env.local` được symlink từ checkout chính theo hướng dẫn môi trường song song; `npm install --save-dev --save-exact sharp@0.35.4` sau đó **thay symlink `node_modules` bằng một bản cài thật** (npm không cài thêm được vào thư mục symlink phần lớn trường hợp) — kết quả: 618 gói cài lại trong worktree (không phải tải bản sharp khác, `npm ls sharp` chỉ ra đúng một bản 0.35.4 trùng bản `next@16.3.4` đang kéo về trong checkout chính). Vì `/node_modules` đã có trong `.gitignore`, không ảnh hưởng git status. Dữ liệu `data/kiotviet/*.xlsx` cũng bị `.gitignore` chặn (`/data/kiotviet/* !/data/kiotviet/README.md`) nên đã symlink 4 file thật từ checkout chính để chạy dry-run trên dữ liệu KiotViet thật.

## Đã làm

**Task 1 — `parse-image-cell.ts` (TDD, test trước):**
- Viết case `<behavior>` vào `scripts/test-pure-functions.ts` trước (khối `// --- Chép ảnh KiotViet (09-12) ---`), chạy thấy đỏ (`Cannot find module`) rồi mới tạo file.
- `parseImageCell(cell)`: tách theo dấu phẩy, trim, chỉ nhận `http/https`, bỏ trùng, giữ thứ tự.
- `buildCopyPlan(rows, productIdByCode, existing)`: đối chiếu mã (chuẩn hóa `trim().toUpperCase()`), lọc ảnh đã có trong `existing` (khóa `${productId}|${url}`), gom `unknownCodes` (không trùng, giữ thứ tự gặp), đếm `alreadyCopied` / `productsWithImages` / `totalImages`. Dòng không có url không tính vào `productsWithImages`.
- Sửa một lần: comment đầu file ban đầu viết "không import node/network" — tự khớp literal với gate `grep -cE "node:|fetch\("`, đã đổi cách diễn đạt (không đổi ý nghĩa).

**Task 2 — CLI `index.ts` + sharp devDependency + npm script:**
- `npm install --save-dev --save-exact sharp@0.35.4`; thêm script `import:kiotviet-images` vào `package.json` ngay sau `import:sample`.
- `scripts/copy-kiotviet-images/index.ts`:
  - Tìm file `DanhSachSanPham*.xlsx` mới nhất theo mtime trong `data/kiotviet/` (chép logic từ `scripts/import-kiotviet/index.ts`, không import file đó vì nó tự chạy `main`).
  - Đọc toàn bộ `san_pham` (id, ma_hang) và `hinh_anh` (san_pham_id, nguon_url — GỒM CẢ đã xóa mềm, service_role bỏ qua RLS) phân trang 1.000 dòng/lần bằng `taoAdminClient()`.
  - Dry-run (mặc định): in số mã có ảnh, tổng ảnh, đã chép trước đó, sẽ chép lần này, danh sách mã không khớp (tối đa 50 dòng). Không gọi mạng ra ngoài Supabase.
  - `--ghi`: `await import("sharp")` (lỗi → hướng dẫn `npm install`, thoát 1); đọc `APPS_SCRIPT_URL`/`APPS_SCRIPT_SECRET` trực tiếp từ `process.env` (không import `env-server.ts` vì file đó có `server-only`, script chạy ngoài Next.js); tải ảnh có thử lại (1s, 3s), timeout 20s bằng `AbortSignal.timeout`; nén full/thumb theo `image-rules.ts`, vượt dung lượng thì nén lại bằng `FALLBACK_QUALITY`; `put()` lên Drive qua `GDriveImageStorage`, `forbidden` dừng toàn bộ tiến trình (secret sai), `unavailable` thử lại có chờ; ghi RPC `nap_anh_kiotviet`, `23505` (trùng) → bù trừ xóa 2 file vừa lên + đếm bỏ qua, lỗi khác → bù trừ + ghi vào danh sách lỗi. Xử lý theo mã hàng song song (`--song-song`, mặc định 3, kẹp 1..5), ảnh trong cùng một mã tuần tự theo `order` gốc trong ô (D-14). `--gioi-han N` cắt danh sách job một lần duy nhất ở `main()`.
  - Báo cáo cuối: đã chép, bỏ qua trùng, link hỏng (đủ danh sách), lỗi khác. Link hỏng không làm thoát lỗi; lỗi khác thì thoát 1.

## Xác minh

- `npx tsx scripts/test-pure-functions.ts` → xanh (bao gồm case mới của Task 1).
- `npm run typecheck` → xanh toàn repo.
- `npx eslint .` → sạch, không cảnh báo (đã dọn biến `conLai` không dùng).
- `npm run build` → thành công (node_modules thật, không symlink, nên Turbopack không văng lỗi symlink như 09-04 từng gặp).
- Dry-run chạy **hai lần** trên dữ liệu KiotViet thật (`DanhSachSanPham_KV12092026-153850-575.xlsx`), cả hai lần in cùng con số:
  ```
  Mã có ảnh trong file:     1.094
  Tổng số ảnh trong file:   1.112
  Đã chép từ trước:         0
  Sẽ chép lần này:          1.112
  ```
  Khớp D-11 (1.094 mã có ảnh). "Đã chép từ trước: 0" vì database cloud thật chưa có bản ghi `hinh_anh` nào (đúng — chưa từng chạy `--ghi`). Không có mã nào không khớp danh mục.
- `node -e "..."` kiểm `package.json`: `devDependencies.sharp === "0.35.4"`, không có trong `dependencies`, có script `import:kiotviet-images` → OK.
- `grep -rn "sharp" src/` rỗng (D-22).
- Grep xác nhận có `AbortSignal.timeout`, xử lý `23505`, dừng khi `forbidden`, có `.remove()` bù trừ.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment tự khớp gate cấm chuỗi "node:"/"fetch("**
- Found during: Task 1, chạy acceptance criteria grep.
- Issue: Comment giải thích "thuần, không import node/network" chứa chuỗi con `node:` khớp nhầm với `grep -cE "node:|fetch\("` — gate đếm ra 1 thay vì 0 dù file không thật sự import `node:*`.
- Fix: đổi cách diễn đạt comment ("không đụng filesystem hay mạng"), không đổi hành vi.
- Files modified: `scripts/copy-kiotviet-images/parse-image-cell.ts`.
- Commit: gộp vào commit Task 1 (`1bafdde`), sửa trước khi chạy gate lần cuối.

**2. [Rule 1 - Bug] Kiểu `typeof import("sharp")` không callable**
- Found during: Task 2, `npm run typecheck`.
- Issue: module `sharp` dùng `export = sharp` (CommonJS single export dạng function+namespace). Gán `(await import("sharp")).default` vào biến kiểu `typeof import("sharp")` (kiểu của CẢ module, có thuộc tính `.default` lồng thêm) làm TypeScript báo "This expression is not callable" khi gọi `sharp(buf)`.
- Fix: định nghĩa `type SharpFn = (typeof import("sharp"))["default"]`, dùng kiểu này cho tham số/biến `sharp` thay vì `typeof import("sharp")` trực tiếp; bỏ ép kiểu `as unknown as` không cần thiết.
- Files modified: `scripts/copy-kiotviet-images/index.ts`.
- Commit: gộp vào commit Task 2 (`6b36242`), sửa trước khi commit.

**3. [Rule 3 - Blocking] Cắt `--gioi-han` hai lần ra hai con số khác nhau**
- Found during: tự review trước khi chạy dry-run (đọc lại code, chưa chạy sai thật ngoài đời vì dry-run không đi qua nhánh này).
- Issue: `main()` đã cắt `plan.jobs` theo `--gioi-han` để in báo cáo, nhưng `chayThat()` nhận `jobs` gốc chưa cắt rồi tự cắt lại lần nữa (biến `gioiHan` nội bộ) — số báo cáo và số thực chép có thể lệch nếu logic khác đi sau này.
- Fix: bỏ lần cắt thứ hai trong `chayThat()`, dùng thẳng `jobs` đã cắt từ `main()`.
- Files modified: `scripts/copy-kiotviet-images/index.ts`.
- Commit: gộp vào commit Task 2 (`6b36242`).

**4. [Rule 3 - Blocking] `node_modules`/`.env.local`/`data/kiotviet/*.xlsx` là symlink hoặc thiếu trong worktree**
- Found during: bước chuẩn bị trước Task 2 (chạy `npm install`, chạy dry-run).
- Issue: worktree mới không có `node_modules`, `.env.local`, và `data/kiotviet/*.xlsx` bị `.gitignore` chặn nên không theo cùng nhánh — không tự có để chạy `npm install`/dry-run trên dữ liệu thật.
- Fix: symlink `node_modules` và `.env.local` từ checkout chính (theo đúng hướng dẫn môi trường song song trong prompt); symlink riêng 4 file `.xlsx` thật từ `data/kiotviet/` checkout chính (không symlink cả thư mục vì `README.md` đã được track theo nhánh worktree). `npm install --save-dev sharp` sau đó tự thay symlink `node_modules` bằng bản cài thật — không có nội dung nào trong đó được commit (đã có trong `.gitignore`).
- Files modified: không có file nội dung (chỉ thao tác filesystem cục bộ của worktree).
- Commit: không tạo commit.

### Auth gates

Không có — script chưa từng gọi Apps Script hay Drive (chỉ dry-run được chạy trong plan này).

## Known Stubs

Không có. Cả `parse-image-cell.ts` và `index.ts` là implementation đầy đủ, không có giá trị rỗng/placeholder chảy vào UI (không có UI nào trong plan này). Nhánh `--ghi` (chép thật) đã viết đầy đủ nhưng **chưa được chạy** — theo đúng phạm vi plan (chạy thật thuộc 09-13, cần Apps Script đã deploy + secret thật). Đây không phải stub, chỉ là hành động bị gate lại theo yêu cầu.

## Chưa làm (đúng phạm vi plan)

- Chưa chạy `--ghi` thật (thuộc 09-13, cần `APPS_SCRIPT_URL`/`APPS_SCRIPT_SECRET` thật và người dùng xác nhận deploy Apps Script xong).
- Chưa kiểm tra thực tế đường link ảnh KiotViet còn sống (link hỏng/404 chỉ phát hiện được khi chạy `--ghi`).

## Self-Check: PASSED

- FOUND: `scripts/copy-kiotviet-images/parse-image-cell.ts`
- FOUND: `scripts/copy-kiotviet-images/index.ts`
- FOUND commit `1bafdde` (feat(anh): parseImageCell + buildCopyPlan cho script chep anh KiotViet)
- FOUND commit `c06a4b8` (chore(deps): sharp 0.35.4 devDependency cho script chep anh KiotViet)
- FOUND commit `6b36242` (feat(anh): script chep anh KiotViet sang Drive chay lai duoc)
