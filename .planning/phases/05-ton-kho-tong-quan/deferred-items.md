# Phase 5 — việc ngoài phạm vi phát hiện khi thực thi

## Từ plan 05-10 (2026-09-21)

### 1. Hồi quy: nhập danh mục Excel và nạp giá vốn đầu kỳ đọc sai khóa JSON — CHƯA sửa

Commit `9ec9b1f` ("refactor(settings,app,scripts): dot cuoi cua lop code sang tieng Anh")
đổi khóa trả về của hai route handler từ `ketQua` sang `result`, nhưng phía client vẫn đọc `ketQua`:

| Route (đã đổi) | Client (chưa đổi) | Hậu quả |
|---|---|---|
| `src/app/api/danh-muc/nhap-excel/route.ts:77` trả `{ dinhDang, result }` | `src/features/products/api/excel-import.api.ts:35` — zod `ketQua: resultSchema` | `responseSchema.parse` ném ZodError → mọi lần nhập danh mục Excel báo lỗi, kể cả file đúng |
| `src/app/api/danh-muc/gia-von-dau-ky/route.ts:121` trả `{ result }` | `src/features/products/components/cost-import.tsx:84-103` đọc `body.ketQua` | luôn rơi vào nhánh lỗi "Không nạp được giá vốn" |

Chỉ đọc code, chưa chạy trên trình duyệt để xác nhận. Sửa: đổi hai chỗ client sang `result`
(một feature products, ngoài phạm vi 05-10). Màn nạp tồn tạm mới KHÔNG mắc lỗi này — client
parse `{ result }` bằng zod.

### 2. Cảnh báo antd v6 lúc chạy: `Statistic valueStyle` đã bỏ — CHƯA sửa

`src/features/products/components/cost-import.tsx` và `import-preview.tsx` dùng
`valueStyle`; antd 6.6 cảnh báo deprecated, thay bằng `styles={{ content: … }}` (Bẫy 11).
Màn nạp tồn tạm đã dùng `styles.content`.
