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

## 5. React Compiler lint cấm đưa ref vào hàm gọi lúc render

`react-hooks/refs` (eslint-plugin-react-hooks bản có React Compiler) báo lỗi khi truyền
`useRef` vào hàm gọi trong render — ví dụ `columns(inputRefs)` cho bảng nhập liệu nhiều dòng.
Khuôn `issue-line-table.tsx` của Phase 3/4 không còn lint sạch.

**Áp dụng (06-11):** đặt `id` DOM cố định theo khóa dòng (`countInputDomId(productId)`) rồi
`document.getElementById(id)?.focus()` trong `setTimeout(…, 0)` (bẫy 14). Không cần `useRef`.

## 6. `notification.*({ message })` cũng là prop antd v6 đã bỏ

Giống `Alert message` → dùng `title`. Chỉ hiện khi CHẠY đúng nhánh (ở Cài đặt: chỉ khi đổi
vai trò/kho) nên lọt qua `npm run check` và cả UAT Phase 2. Grep `message:` trong lời gọi
`notification.` khi rà antd.

## Chốt chặn hồi quy

`scripts/test-route-permissions.ts` phải có **mọi route thật**, kể cả route chỉ redirect
(`/cai-dat`). Ma trận cũ thiếu đúng nó nên 45/45 vẫn xanh trong khi trang crash.

---

**Bản rút gọn để dùng khi code nằm ở `CLAUDE.md` mục "Bẫy đã gặp" số 8–12** (file đó nạp
vào context mỗi phiên). File này giữ phần bối cảnh và cách phát hiện.
