# Bẫy tầng giao diện — Next.js 16 + antd v6 + supabase-js

Nguồn: UAT Phase 2 (2026-09-18). Cả bốn lỗi dưới đây đều **lọt qua** `npm run check`
(typecheck + lint + build) và lọt qua cả pgTAP — chỉ lộ ra khi mở trình duyệt thật.

## 1. Lỗi PostgREST KHÔNG phải instance của `PostgrestError`

supabase-js chỉ `new PostgrestError(...)` khi truy vấn gọi `.throwOnError()`. Dự án dùng:

```ts
const { data, error } = await sb.from(...).select(...);
if (error) throw error;      // ← ném OBJECT THƯỜNG parse từ JSON
```

nên `e instanceof PostgrestError` **luôn false**. Hậu quả đã gặp: "mã trùng" và "nhóm
đang có mã hàng dùng" đều hiện *"Không tải được dữ liệu"* — đúng thứ CLAUDE.md cấm; và
`nenThuLai()` không nhận ra lỗi nghiệp vụ nên TanStack Query thử lại lỗi 400 hai lần.

**Cách đúng:** nhận diện theo hình dạng (`laLoiPostgrest` / `maLoi` trong
`src/shared/lib/errors.ts`). `AuthError` thì ngược lại — auth-js dựng instance thật,
`instanceof AuthError` dùng được.

## 2. Hàm export từ file `"use client"` không gọi được ở Server Component

`tabDauTien()` nằm trong `components/tab-cai-dat.tsx` (có `"use client"`), Server
Component `app/(app)/cai-dat/page.tsx` gọi → runtime error *"Attempted to call
tabDauTien() from the server but tabDauTien is on the client"*. Bấm menu Cài đặt là ra
trang lỗi.

**Cách đúng:** hằng số và hàm thuần để ở module KHÔNG có `"use client"`
(`features/<x>/lib/…`), cả hai phía cùng import. Đây là mặt kia của bẫy antd trong
CLAUDE.md §1.

## 3. Query chạy với tham số rỗng

`useChiTietSanPham(id ?? "")` trong ngăn kéo "Thêm mã hàng" bắn RPC với uuid rỗng mỗi
lần mở trang danh mục → HTTP 400. Hook đọc-một-bản-ghi luôn cần `enabled`.

## 4. antd v6 bỏ nhiều prop của v5 — chỉ cảnh báo lúc CHẠY

Gặp đủ 5 cái: `Dropdown.Button`, `Modal.maskClosable`, `Select` option `value: null`,
`Descriptions` `span` cố định trong lưới responsive, và `Alert.message` (đổi thành
`title`, 17 chỗ). Build không báo. **Mở console trình duyệt một lần cho mỗi màn mới.**

## Chốt chặn hồi quy

`scripts/kiem-tra-quyen-route.ts` phải có **mọi route thật**, kể cả route chỉ redirect
(`/cai-dat`). Ma trận cũ thiếu đúng nó nên 45/45 vẫn xanh trong khi trang crash.
