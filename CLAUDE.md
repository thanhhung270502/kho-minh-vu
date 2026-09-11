# Hệ thống theo dõi sản xuất & tồn kho

## Bối cảnh nghiệp vụ

Công ty sản xuất linh kiện nhựa, 5 xưởng: **ép nhựa, sơn, carbon, xi mạ, đóng gói**.
Một hệ thống dùng chung cho cả 5 xưởng — không tách riêng từng xưởng.

Luồng sản xuất:

```
Hạt nhựa → ÉP NHỰA → phôi/bán thành phẩm
                        ├─(1) không cần xử lý bề mặt → ĐÓNG GÓI
                        ├─(2) cần xử lý bề mặt      → SƠN / CARBON / XI MẠ → ĐÓNG GÓI
                        └─(3) lưu kho chờ           → sau đó mới qua xử lý bề mặt
ĐÓNG GÓI → kho thành phẩm
```

Ba loại tồn kho phải theo dõi tách bạch:

1. Nguyên vật liệu (hạt nhựa, hoá chất)
2. Bán thành phẩm / phôi chờ xử lý (WIP)
3. Thành phẩm chờ xuất

Lưu ý: phôi chờ xử lý và thành phẩm hoàn thiện **đang để chung một kho vật lý**
nhưng trong hệ thống phải tách riêng, nếu không sẽ không biết còn bao nhiêu phôi
cần chạy tiếp.

Mục tiêu: biết lô hàng đang ở giai đoạn nào, cần sản xuất bao nhiêu, tồn kho bao
nhiêu — thay thế sổ sách + Google Sheet đang làm thủ công.

## Lệnh hay dùng

```bash
npm run dev          # chạy local, http://localhost:3000
npm run check        # typecheck + lint + build — chạy trước khi commit
npm run typecheck
npm run lint
npm run format
npm run db:types     # sinh lại src/types/database.types.ts sau mỗi migration
```

## Tech stack

| Việc            | Dùng gì                                                        |
| --------------- | -------------------------------------------------------------- |
| Framework       | Next.js 16 App Router, TypeScript                              |
| UI              | Ant Design v6 (bảng, form) + Tailwind v4 (layout, khoảng cách) |
| Dữ liệu server  | TanStack Query v5 + supabase-js                                |
| Database / Auth | Supabase (Postgres + RLS + Realtime)                           |
| Form            | React Hook Form + Zod                                          |
| Biểu đồ         | Recharts                                                       |
| Xuất Excel      | exceljs                                                        |
| QR lô hàng      | qrcode (sinh) + html5-qrcode (quét)                            |

Không dùng ORM (Prisma/Drizzle), không dùng Redux/Zustand, không dùng NextAuth —
xem phần "Không tự ý làm".

---

# Quy trình build feature

Đi tuần tự 7 bước, không nhảy bước.

## Bước 1 — Chốt hợp đồng trước khi gõ code

Trả lời được 5 câu này rồi mới viết dòng đầu tiên. Câu nào không suy ra được từ
schema hoặc yêu cầu thì **hỏi người dùng**, không đoán:

1. Đọc/ghi bảng nào, cột nào, kiểu gì? Có phân trang không?
2. Ai được xem, ai được sửa? RLS policy nào phủ trường hợp này?
3. Trạng thái rỗng hiển thị ra sao?
4. Dữ liệu server (TanStack Query) hay state UI (useState)?
5. Thuộc feature folder nào — mới hay đã có?

Viết 3–5 dòng tóm tắt trước khi code.

## Bước 2 — Dựng khung file trước, code sau

Liệt kê file sẽ tạo/sửa cho người dùng xem trước khi viết nội dung.

```
src/features/<ten-feature>/
  types.ts                  # kiểu dữ liệu suy ra từ database.types.ts
  schemas/<x>.schema.ts     # zod schema (nếu có form)
  api/<x>.api.ts            # hàm gọi Supabase thuần, không JSX, không hook
  api/<x>.keys.ts           # query key tập trung
  hooks/use<X>.ts           # bọc TanStack Query
  components/               # component chỉ dùng trong feature này
```

Route mỏng, feature dày: `src/app/(app)/<route>/page.tsx` chỉ đặt metadata,
`PageHeader` và gọi component của feature. Logic không nằm trong `app/`.

Component chỉ dùng một chỗ thì để trong feature. Chỉ nâng lên `src/shared/` khi
có **ít nhất 2** feature dùng thật. Feature không import trực tiếp từ thư mục nội
bộ của feature khác.

Tên file và route: tiếng Việt **không dấu**, nối bằng gạch ngang (`san-xuat`,
`nhap-kho`). Không trộn tiếng Anh nửa vời.

## Bước 3 — Kiểu dữ liệu đi trước

- **Không tự viết type của bảng.** Chạy `npm run db:types` rồi suy ra:
  ```ts
  type LoSanXuat = Database["public"]["Tables"]["lo_san_xuat"]["Row"];
  ```
  Sửa `src/types/database.types.ts` bằng tay là sai — lần sinh sau sẽ mất.
- Có form thì viết Zod schema trước, type suy ra bằng `z.infer` — không khai hai lần.
- Cấm `any`. Không chắc thì `unknown` rồi thu hẹp. Không dùng `!` để làm im lặng lỗi kiểu.
- Trạng thái mô tả bằng union (`"cho_ep" | "dang_ep" | "cho_xu_ly_be_mat" | ...`),
  không dùng nhiều boolean rời rạc.
- **Số lượng tồn kho và sản lượng**: cột Postgres dùng `numeric`, không dùng
  `float8`. Cộng dồn phiếu nhập/xuất bằng float sẽ sai số và lệch sổ kho.

## Bước 4 — Lớp gọi dữ liệu tách riêng

- Hàm gọi API là hàm thuần, nhận tham số, trả dữ liệu đã có kiểu. Không JSX, không hook.
- Dùng **duy nhất** client dùng chung:
  - Client Component / hook: `getSupabaseBrowserClient()` (`src/lib/supabase/client.ts`)
  - Server Component / Route Handler / Server Action: `await createSupabaseServerClient()`
    (`src/lib/supabase/server.ts`) — **tạo mới mỗi request**, cấm cache ra biến
    module, sẽ rò rỉ phiên giữa các người dùng.
  - Không tự gọi `createClient()` của supabase-js ở nơi khác, không hardcode URL/key.
- Luôn kiểm tra `error` supabase-js trả về rồi `throw` để TanStack Query bắt được.
  supabase-js **không tự ném lỗi**:
  ```ts
  const { data, error } = await supabase.from("lo_san_xuat").select("*");
  if (error) throw error;
  return data;
  ```
- Query key khai báo tập trung trong `api/<x>.keys.ts`, không rải chuỗi khắp nơi.
- Mutation thành công phải `invalidateQueries` đúng key liên quan.
- Không dùng `useEffect` + `useState` để lấy dữ liệu server — đã có TanStack Query.
- Xác thực: dùng `supabase.auth.getUser()`, **không dùng `getSession()`**.
  `getSession()` chỉ đọc cookie nên giả mạo được; chỉ `getUser()` mới hỏi lại server.
- Hết phiên (401) và không đủ quyền (403) là hai luồng khác nhau, không gộp.
  `dienGiaiLoi()` trong `src/shared/lib/errors.ts` đã tách sẵn: `het-phien` →
  về đăng nhập; `khong-du-quyen` → báo liên hệ quản trị. Thêm mã lỗi mới vào đó.

## Bước 5 — UI: bốn trạng thái, không được thiếu

Mọi màn hình đọc dữ liệu bọc qua `<QueryState>` (`src/shared/components/query-state.tsx`).
Không render thẳng từ `query.data`.

| Trạng thái | Yêu cầu                                             |
| ---------- | --------------------------------------------------- |
| loading    | skeleton, không phải màn hình trắng                 |
| error      | thông báo đọc hiểu được **và** nút "Thử lại"        |
| empty      | trạng thái rỗng riêng, không dùng chung với loading |
| success    | nội dung thật                                       |

Thông báo lỗi nói **chuyện gì xảy ra và làm gì tiếp theo**. Cấm "Có lỗi xảy ra".
Cấm `catch (e) {}` nuốt lỗi im lặng. Người ở xưởng phải biết nên bấm thử lại, gọi
quản trị, hay sửa lại số liệu vừa nhập.

Có form thì bắt buộc:

- validate theo Zod schema, lỗi hiện **theo từng field**
- đang submit: nút `disabled`/`loading` (bấm 5 lần không được tạo 5 phiếu nhập kho)
- lỗi server map về đúng field (`setError`), không đổ hết ra toast
- submit lỗi **giữ nguyên** dữ liệu đã nhập
- form sửa: nạp `defaultValues`, dữ liệu về sau khi mount thì `reset(data)`

Route mới phải trả lời: chưa đăng nhập vào đây thì sao? Chặn ở `src/proxy.ts`
và giữ `?tiep_tuc=<đường-dẫn>` để đăng nhập xong quay lại đúng trang.

Màn hình nhập liệu tại xưởng phải dùng được trên điện thoại: nút đủ to, bảng cho
cuộn ngang trong khung riêng, không để cả trang tràn ngang.

## Bước 6 — Đặt state ở bậc thấp nhất còn đủ dùng

Thang bậc, luôn thử từ trên xuống:

1. tính khi render (không phải state)
2. `useState` ngay trong component đang dùng
3. `useReducer` khi nhiều trạng thái liên quan nhau
4. nâng lên cha chung gần nhất
5. Context — chỉ cho dữ liệu ít thay đổi (người dùng hiện tại, xưởng đang chọn)
6. global store — phải nói rõ lý do trước khi thêm

Dấu hiệu đang làm sai:

- state UI (modal đang mở, tab đang chọn) nằm trong store toàn cục
- lưu vào state cái tính được từ state khác (`danhSachDaLoc` phải tính khi render)
- dữ liệu server nằm trong Context kèm cache tự viết tay
- prop drilling từ 3 tầng trở lên → state đặt sai chỗ, **không** phải lý do cài store

Component vượt ~200 dòng thì tách, không xin phép. Tách theo trách nhiệm
(lấy dữ liệu / layout / dòng lặp lại). Logic lặp từ 2 chỗ trở lên → custom hook.

## Bước 7 — Tự review trước khi báo xong

Chạy `npm run check` (typecheck + lint + build). Sau đó đọc lại diff và đối chiếu:

- [ ] Không `any` mới, không `@ts-ignore`, không `console.log` sót
- [ ] Không component mới nào vượt ~200 dòng
- [ ] Đủ loading / error / empty / success
- [ ] Lỗi có thông báo đọc được và có đường phục hồi
- [ ] Form: validate, disable khi submit, map lỗi server, giữ dữ liệu đã nhập
- [ ] Route mới đã xử lý trường hợp chưa đăng nhập
- [ ] Bảng mới đã bật RLS và có policy, không chỉ chặn ở giao diện
- [ ] Đã chạy `npm run db:types` nếu có đổi schema
- [ ] Không còn file, import, biến thừa
- [ ] Biến môi trường mới đã thêm vào `.env.example`

Báo cáo cuối nêu rõ: đã tạo/sửa file nào, **giả định nào đã đặt ra** khi yêu cầu
chưa rõ, và phần nào chưa làm.

Commit theo Conventional Commits: `feat(kho): thêm phiếu nhập nguyên vật liệu`.
Một commit làm một việc.

---

# Bẫy đã gặp — đừng lặp lại

Những lỗi này đã tốn thời gian một lần rồi, ghi lại để khỏi vấp lại.

### 1. antd chỉ chạy trong Client Component

antd là thư viện client. Component dạng chấm (`Typography.Title`, `Layout.Sider`,
`Form.Item`, `Select.Option`, `Card.Meta`) gọi từ **Server Component** sẽ trả về
`undefined` và văng lỗi _"Element type is invalid ... got: undefined"_ — vì
Next.js chỉ proxy được export của module, không proxy được thuộc tính gắn trên
object đã export.

**Quy tắc: file nào import từ `antd` thì phải có `"use client"` ở dòng đầu.**
Component đó vẫn được render sẵn phía server (SSR), chỉ là kèm thêm JS.
Server Component dùng cho layout, metadata, lấy dữ liệu — không render antd.

### 2. Thứ tự CSS layer giữa Tailwind và antd

`src/app/globals.css` khai báo `@layer theme, base, antd, components, utilities;`
**trước** `@import "tailwindcss"`, và `<AntdRegistry layer>` trong
`src/providers/app-providers.tsx` đẩy style antd vào `@layer antd`.

Hai chỗ này đi cặp — bỏ một cái là giao diện vỡ:

- thiếu prop `layer` → preflight của Tailwind xoá nền nút antd (nút primary thành trong suốt)
- sai thứ tự layer → class Tailwind không đè được style antd

Vì layer quyết định thắng thua **trước cả độ ưu tiên selector**, class Tailwind
đè được antd mà **không cần `!`**. Thấy `!` trước class Tailwind trên component
antd là dấu hiệu ai đó đang chữa cháy sai chỗ.

Muốn đổi màu/bo góc toàn hệ thống thì sửa token trong
`src/providers/antd-theme.ts`, không rải class Tailwind lên từng component antd.

### 3. Next.js 16 dùng `proxy.ts`, không phải `middleware.ts`

File là `src/proxy.ts` và export hàm tên `proxy`. Đặt tên `middleware` sẽ chạy
nhưng Next.js cảnh báo deprecated.

### 4. exceljs và cảnh báo `npm audit`

`npm audit` báo lỗi moderate ở `uuid@8` (phụ thuộc của exceljs). Không sửa được
bằng `npm audit fix` vì nó hạ exceljs xuống bản 3.x. Đã kiểm tra: exceljs chỉ gọi
`uuid.v4()` không truyền `buf`, còn advisory chỉ ảnh hưởng `v3/v5/v6` khi có
tham số `buf` — đường code đó không bao giờ chạy. Cứ để nguyên, đừng hạ cấp.

---

# Không tự ý làm

- **Cài thư viện mới** — hỏi trước. Đặc biệt: ORM (Prisma/Drizzle) — đã chọn
  supabase-js + type tự sinh; global store (Redux/Zustand) — TanStack Query đã lo
  dữ liệu server; NextAuth — đã dùng Supabase Auth vì nó gắn thẳng với RLS.
- **Sửa file ngoài phạm vi feature đang làm** — nói rõ lý do trước.
- **Đổi cấu hình build, lint, tsconfig, thứ tự CSS layer** — hỏi trước.
- **Chạy migration xoá/đổi cột trên database thật** — hỏi trước, dữ liệu sản xuất
  không khôi phục được.
- **Bịa shape dữ liệu** khi chưa thấy schema thật — hỏi, hoặc nói rõ là đang giả định.
- **Đặt `service_role` key vào biến `NEXT_PUBLIC_*`** — key đó lộ ra trình duyệt là
  mất sạch quyền kiểm soát database.
