# Kho Minh Vũ — quản lý xuất nhập tồn

## Bối cảnh nghiệp vụ

Doanh nghiệp **thương mại** phụ tùng xe máy (CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ).
Hệ thống thay thế KiotViet đang dùng.

| | |
|---|---|
| Mã hàng | 3.266, thuộc 90 nhóm |
| Kho | 2 |
| Đối tác | 25 NCC + khách hàng |
| Nhịp vận hành | ~92 phiếu xuất/ngày (5,1 dòng/phiếu), ~8 phiếu nhập/ngày (7,6 dòng/phiếu) |

**Ranh giới: chỉ kho thương mại.** Nhà máy Vũ Trụ L.An là **một nhà cung cấp** —
không có WIP, không lệnh sản xuất, không tiến độ xưởng. v1 cũng không có công nợ,
không quản lý lô/hạn dùng, không hóa đơn điện tử (xem `.planning/REQUIREMENTS.md`).

Ba nhóm người dùng, hai lớp UI trên cùng một API:
thủ kho (điện thoại, quét mã) · văn phòng (máy tính, bảng dày) · quản lý (dashboard).

### Năm nguyên tắc kiến trúc — mọi tính năng phải tuân theo

Lệch khỏi năm nguyên tắc này thì hệ thống sẽ lệch tồn trong vòng vài tháng.

1. **Tồn kho là kết quả, không phải dữ liệu nhập tay.** Không màn nào cho sửa trực
   tiếp số tồn. Muốn tồn đổi thì phải có chứng từ. Sai số chỉnh bằng phiếu kiểm kê.
2. **Một sổ cái kho append-only.** Mọi biến động ghi vào `kho_movement` — chỉ thêm,
   không sửa, không xóa. Đây là nguồn sự thật để dựng lại tồn và truy vết khi lệch.
3. **Một bảng chứng từ cho bảy loại.** `NHAP`, `XUAT`, `TRA_NCC`, `TRA_KHACH`,
   `CHUYEN_KHO`, `KIEM_KE`, `DIEU_CHINH` dùng chung header + dòng, phân biệt bằng
   `loai_ct`. Thẻ kho chỉ phải join một bảng.
4. **Chứng từ có hai trạng thái sống.** `NHAP_LIEU` (sửa thoải mái, chưa đụng tồn)
   → `HOAN_THANH` (ghi sổ, khóa). Hủy phiếu đã ghi sổ sinh bút toán đảo, không xóa.
5. **Mã hàng là khóa nghiệp vụ, ID là khóa kỹ thuật.** PK là `uuid`, `ma_hang` là
   unique index.

**Giá vốn: bình quân gia quyền di động**, không FIFO. Tính bằng trigger ở database,
không tính ở JS. `san_pham.gia_von` chỉ ghi được bằng trigger, không ghi từ client.

**Ghi sổ phải atomic** — làm bằng Postgres RPC trong một transaction, không bằng
Server Action gọi nhiều lệnh rời rạc.

**Xuất âm được phép** nhưng bắt buộc chọn lý do (42 mã đang bị xuất khi tồn ≤ 0 trên
hệ cũ — chặn cứng sẽ làm kho kẹt ngay ngày đầu).

## Lệnh hay dùng

```bash
npm run dev          # chạy local, http://localhost:3000
npm run check        # typecheck + lint + build — chạy trước khi commit
npm run typecheck
npm run lint
npm run format
npm run db:types     # sinh lại src/types/database.types.ts sau mỗi migration

# Database — xem supabase/README.md để biết chi tiết
npm run db:push          # áp migration lên cloud
npm run db:test:linked   # chạy pgTAP trên cloud
npm run seed:users       # tạo 4 tài khoản mẫu
npm run verify:hook      # xác nhận JWT có vai_tro/kho_id

npx tsx scripts/kiem-tra-ham-thuan.ts     # hàm thuần: bộ lọc URL, tên khách, CSV lỗi
npx tsx scripts/kiem-tra-doc-excel.ts     # đọc file KiotViet thật + quay vòng xuất/nhập
npx tsx scripts/kiem-tra-quyen-route.ts   # ma trận quyền route × 4 vai trò (cần npm run dev)
npm run import:kiotviet -- --mau   # thử nạp dữ liệu trên file mẫu
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
| Excel           | exceljs (import danh mục, export báo cáo)                      |
| Quét barcode    | camera trình duyệt — chốt thư viện ở Phase 4                   |

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
  type SanPham = Database["public"]["Tables"]["san_pham"]["Row"];
  ```
  Sửa `src/types/database.types.ts` bằng tay là sai — lần sinh sau sẽ mất.
- Có form thì viết Zod schema trước, type suy ra bằng `z.infer` — không khai hai lần.
- Cấm `any`. Không chắc thì `unknown` rồi thu hẹp. Không dùng `!` để làm im lặng lỗi kiểu.
- Trạng thái mô tả bằng union (`"NHAP_LIEU" | "HOAN_THANH" | "DA_HUY"`),
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
  const { data, error } = await supabase.from("san_pham").select("*");
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
Cấm `catch (e) {}` nuốt lỗi im lặng. Thủ kho và văn phòng phải biết nên bấm thử lại,
gọi quản trị, hay sửa lại số liệu vừa nhập.

Có form thì bắt buộc:

- validate theo Zod schema, lỗi hiện **theo từng field**
- đang submit: nút `disabled`/`loading` (bấm 5 lần không được tạo 5 phiếu nhập kho)
- lỗi server map về đúng field (`setError`), không đổ hết ra toast
- submit lỗi **giữ nguyên** dữ liệu đã nhập
- form sửa: nạp `defaultValues`, dữ liệu về sau khi mount thì `reset(data)`

Route mới phải trả lời: chưa đăng nhập vào đây thì sao? Chặn ở `src/proxy.ts`
và giữ `?tiep_tuc=<đường-dẫn>` để đăng nhập xong quay lại đúng trang.

Màn hình thủ kho dùng (phiếu xuất, tồn kho, kiểm kê) phải dùng được trên điện thoại: nút đủ to, bảng cho
cuộn ngang trong khung riêng, không để cả trang tràn ngang.

## Bước 6 — Đặt state ở bậc thấp nhất còn đủ dùng

Thang bậc, luôn thử từ trên xuống:

1. tính khi render (không phải state)
2. `useState` ngay trong component đang dùng
3. `useReducer` khi nhiều trạng thái liên quan nhau
4. nâng lên cha chung gần nhất
5. Context — chỉ cho dữ liệu ít thay đổi (người dùng hiện tại, kho đang chọn)
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
- [ ] **Đã mở màn hình mới trên trình duyệt và xem console** — `npm run check` xanh
      KHÔNG chứng minh giao diện chạy (xem bẫy 8–11)

Báo cáo cuối nêu rõ: đã tạo/sửa file nào, **giả định nào đã đặt ra** khi yêu cầu
chưa rõ, và phần nào chưa làm.

Commit theo Conventional Commits: `feat(nhap): ghi sổ phiếu nhập tính lại giá vốn`.
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

### 5. `san_pham` và `kho_movement` không có quyền SELECT mức bảng

Migration 0029 thu `select` trên hai bảng này rồi cấp lại **theo từng cột** để giấu
`gia_von`. Hệ quả:

- Cấm `select("*")` và cấm `.select()` trống sau `insert`/`update` — PostgREST sẽ đòi
  đọc mọi cột và trả 42501 `permission denied for table san_pham`.
- Cột mới thêm vào hai bảng này phải kèm `grant select (<cột>)` trong chính migration đó,
  nếu không nó vô hình với mọi truy vấn có liệt kê cột.

### 6. Quyền mở rộng cần token mới, quyền thu hẹp có hiệu lực ngay

Helper RLS đối chiếu claim trong JWT **giao** với bảng `nguoi_dung`/`nguoi_dung_kho`. Bỏ
một kho khỏi thủ kho là mất quyền ngay lập tức; thêm kho thì phải chờ token làm mới (tối đa
60 phút, hoặc người dùng tải lại trang). Giao diện phải nói đúng điều này thay vì hứa "đã áp dụng".

### 7. Đọc Excel chỉ ở server

`src/shared/lib/o-excel.ts` dùng `node:stream`. Reader dạng stream (`styles: "ignore"`) là
đường chính vì reader thường chết trên styles lệch chuẩn của KiotViet; nhưng reader stream
lại hỏng với chính file exceljs ghi ra ở cỡ 100–1200 dòng, nên có đường dự phòng bằng
reader thường. Đừng bỏ một trong hai.

### 8. Lỗi PostgREST KHÔNG phải instance của `PostgrestError`

supabase-js chỉ dựng instance lớp đó khi truy vấn gọi `.throwOnError()`. Dự án
dùng `const { data, error } = await …; if (error) throw error` nên thứ ném ra là
**object thường** parse từ JSON.

```ts
// SAI — luôn false, mọi lỗi nghiệp vụ rơi xuống câu chung chung
if (e instanceof PostgrestError && e.code === "23505") …

// ĐÚNG
import { laLoiPostgrest, maLoi } from "@/shared/lib/errors";
if (maLoi(e) === "23505") …                      // so mã
if (laLoiPostgrest(e) && e.code === "23514") …   // cần đọc e.message
```

Lần vấp: "mã trùng" và "nhóm đang có mã hàng dùng" đều hiện *"Không tải được dữ
liệu"*, và `nenThuLai()` cho TanStack Query thử lại lỗi 400 hai lần (3 request).
`AuthError` thì ngược lại — auth-js dựng instance thật, `instanceof` dùng được.

### 9. Hàm export từ file `"use client"` không gọi được ở Server Component

Mặt kia của bẫy 1. `tabDauTien()` để trong `components/tab-cai-dat.tsx` rồi
`app/(app)/cai-dat/page.tsx` gọi → *"Attempted to call tabDauTien() from the server
but tabDauTien is on the client"*, bấm menu Cài đặt ra trang lỗi.

**Quy tắc: hằng số và hàm thuần để ở `features/<x>/lib/*.ts` (không `"use client"`),
cả hai phía cùng import.** Component client chỉ giữ phần JSX.

### 10. Hook đọc một bản ghi phải có `enabled`

`useChiTietSanPham(id ?? "")` trong ngăn kéo "Thêm mã hàng" bắn RPC với uuid rỗng
mỗi lần mở trang danh mục → HTTP 400. Query nhận id có thể null thì luôn kèm
`enabled: id !== ""`.

### 11. antd v6 bỏ prop của v5 — chỉ cảnh báo lúc CHẠY, build vẫn xanh

Đã vấp đủ năm cái:

| v5 (đã bỏ) | v6 |
|---|---|
| `<Alert message=…>` | `title` |
| `<Modal maskClosable>` | `mask={{ closable }}` |
| `<Drawer width=…>` | `size` |
| `<Dropdown.Button>` | `Space.Compact` + `Dropdown` + `Button` |
| `<Select options=[{ value: null }]>` | dùng `""` làm "tất cả", đổi sang null khi gọi API |
| `<Descriptions items=[{ span: 3 }]>` trong lưới responsive | bỏ `span` cố định |

Viết component antd mới thì **mở console một lần** trước khi báo xong.

### 12. Chốt chặn hồi quy quyền route

`scripts/kiem-tra-quyen-route.ts` phải liệt kê **mọi route thật**, kể cả route chỉ
redirect như `/cai-dat`. Thêm màn mới thì thêm dòng vào ma trận — lần trước thiếu
đúng `/cai-dat` nên script báo 45/45 xanh trong khi trang đó crash.

### 13. Phím giả lập của công cụ trình duyệt có thể không mang `event.key`

Khi tự kiểm thử bằng công cụ điều khiển trình duyệt, phím gửi dưới tên `Return`
tới trang với `event.key === ""`. Mọi handler viết `if (e.key !== "Enter") return`
— kể cả handler nội bộ của antd và rc-component — đều trượt, nên màn hình trông
y hệt như đang hỏng thật. Đã suýt ghi hai kết luận sai vào UAT Phase 3 vì việc này.

**Trước khi kết luận "thư viện không xử lý phím X", hãy đo chính sự kiện đó:**

```js
document.addEventListener("keydown", (e) => console.log(e.key), true);
```

Rỗng thì lỗi nằm ở công cụ, không nằm ở code. Gửi đúng tên `Enter` thì chạy.

### 14. Tranh chấp focus với rc-select và với vòng render

Hai chỗ đã cắn trong luồng nhập liệu bàn phím của phiếu nhập:

- **rc-select tự focus lại ô tìm của nó** ngay sau khi Enter chọn option. Lệnh
  `focus()` sang ô kế tiếp đặt trong `onChange` sẽ bị nuốt. Cách chữa: bắt Enter ở
  `onKeyDownCapture` của div bọc ngoài — pha capture chạy TRƯỚC rc-select — rồi
  `preventDefault` + `stopPropagation`.
- **`focus()` gọi ngay sau khi mutation resolve** bị chính vòng render kế tiếp dọn
  đi. Hẹn `setTimeout(..., 0)` thì con trỏ mới ở lại đúng ô.

### 15. Gợi ý tìm kiếm phải ưu tiên mã khớp tuyệt đối

`tim_san_pham` xếp `lan_phat_sinh_cuoi desc` TRƯỚC `similarity` — hợp lý khi gõ
dở, nhưng khiến mã luân chuyển nhiều đè lên mã vừa gõ đầy đủ. Bất kỳ chỗ nào
"Enter chọn kết quả đầu tiên" đều phải tìm mã khớp tuyệt đối trước:

```ts
const khopHan = ds.find((sp) => sp.ma_hang.toLowerCase() === q.trim().toLowerCase());
onChon(khopHan ?? ds[0]);
```

Chọn nhầm mã ở màn nhập kho là nhập sai hàng vào sổ, không phải lỗi hiển thị.

### 16. pgTAP không được neo vào bộ đếm đang sống

`chuoi_so_ct` là bộ đếm thật. Assertion kiểu `sinh_so_ct('NHAP', 2026) = 'PN26-000001'`
xanh đúng một lần rồi đỏ vĩnh viễn kể từ phiếu thật đầu tiên của năm đó. Test đánh
số phải dùng năm không ai chạm tới (2091–2093) hoặc so tương đối với giá trị đang có.

### 17. Integration Supabase trên Vercel đặt TÊN BIẾN khác `.env.local`

Bấm "Connect Supabase" trên Vercel sinh ra một bộ biến tên khác hẳn file local.
Build production đầu tiên chết ở `src/lib/env.ts` vì thế:

| `.env.local` | Vercel (integration tự tạo) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` | **không tạo** — chỉ có `SUPABASE_URL` |

`env.ts` / `env-server.ts` nay đọc cả hai tên, nối bằng `||` chứ không `??`:
biến khai trên Vercel nhưng bỏ trống là **chuỗi rỗng**, `??` sẽ nhận chuỗi rỗng
đó rồi bỏ qua tên còn lại.

Dòng thứ ba không có đường vòng. Next.js chỉ nhúng biến `NEXT_PUBLIC_*` vào
bundle trình duyệt, nên `SUPABASE_URL` của integration vô dụng ở client —
**`NEXT_PUBLIC_SUPABASE_URL` phải tự khai tay** trong Vercel > Settings >
Environment Variables. Thiếu nó thì `next build` chết ngay ở bước collect page
data, không phải lúc chạy.

Giá trị hiện tại là khóa đời mới (`sb_publishable_…`, `sb_secret_…`), nên trường
xuất ra đặt tên trung tính `env.SUPABASE_URL` / `env.SUPABASE_PUBLISHABLE_KEY` /
`layEnvServer().SUPABASE_SECRET_KEY` — gọi là "anon key" hay "service role" đều sai.

### 18. Vercel chặn deploy khi tác giả commit không thuộc team

Repo private + `git push` từ máy có `user.email` lạ → deployment vào thẳng trạng
thái `BLOCKED`, **không có log build** nên rất dễ tưởng là lỗi code. Dấu hiệu
nhận ra: `errorLink` trỏ tới `/docs/deployments/troubleshoot-project-collaboration`.

Vercel đối chiếu email tác giả commit với thành viên team. Repo này:

- tác giả commit: `hung.ly@c0x12c.com`
- team Vercel: chỉ `production.planning@vutru.vn` (GitHub `vutru-productionplanning-code`)

Deployment đã `BLOCKED` thì **không redeploy lại được** (`deployment_can_never_deploy`).
Hai đường thoát:

```bash
# Cách bền: đặt tác giả commit khớp tài khoản GitHub của chủ team
git config user.email "<email đã verify trên GitHub vutru-productionplanning-code>"

# Cách chữa cháy: tạo deployment qua API dưới danh nghĩa chủ team
# (Vercel MCP create_deployment với gitSource org/repo/ref/sha)
```

Không sửa được bằng code trong repo. Trước khi đào log build, kiểm tra state:
`BLOCKED` là chuyện quyền, `ERROR` mới là chuyện code.

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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kho Minh Vũ**

Nền tảng quản lý xuất nhập tồn và đặt hàng cho **CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ** —
một doanh nghiệp thương mại phụ tùng xe máy với 3.266 mã hàng, 2 kho, 25 nhà cung cấp,
khoảng 92 phiếu xuất mỗi ngày. Hệ thống thay thế KiotViet đang dùng, dựng bằng
Next.js + Supabase, phục vụ ba nhóm người dùng: thủ kho (điện thoại, quét mã),
văn phòng (máy tính, nhập liệu dày) và quản lý (dashboard).

**Core Value:** Ngày đầu go-live, **toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới
mà không ai phải mở KiotViet để đối chiếu.** Đó là tiêu chí thành công duy nhất — không
phải số lượng tính năng.

### Constraints

- **Tech stack**: Next.js 16 App Router + TypeScript, Ant Design v6 (bảng/form) +
  Tailwind v4 (layout), Supabase (Postgres + Auth + RLS + Realtime), TanStack Query v5,
  React Hook Form + Zod, exceljs, Recharts — đã chốt, không đổi giữa chừng.
- **Không ORM**: dùng supabase-js + type sinh tự động. Prisma/Drizzle kết nối trực tiếp
  bằng service role → bypass RLS, phá toàn bộ mô hình phân quyền.
- **Timeline**: 6 tuần, làm ngoài giờ, một người. Mỗi tuần phải kết thúc bằng một thứ
  chạy được, không phải một thứ làm dở.
- **Thiết bị**: thủ kho dùng điện thoại (quét mã, kiểm kê); văn phòng dùng máy tính với
  bảng dày. Hai lớp UI trên cùng một API.
- **Hiệu năng nhập liệu**: mục tiêu dưới 20 giây một phiếu xuất khi tạo từ đơn đặt hàng
  có sẵn. Văn phòng nhập ~470 dòng/ngày.
- **Bảo mật**: phân quyền cài bằng RLS ở tầng database, không bằng logic giao diện.
  `service_role` key tuyệt đối không đặt vào biến `NEXT_PUBLIC_*`.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
