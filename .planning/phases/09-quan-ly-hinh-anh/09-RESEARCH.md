# Phase 9: Quản lý hình ảnh - Research

**Researched:** 2026-09-26
**Domain:** Upload/lưu/đọc ảnh qua Google Apps Script + Drive, nén ảnh phía trình duyệt, Next.js 16 Route Handler trên Vercel, Supabase RLS/RPC
**Confidence:** MEDIUM-HIGH (Apps Script quotas: MEDIUM — tài liệu chính thức không liệt kê hết mọi số; Next.js/Vercel caching: HIGH — xác nhận bằng docs chính thức; database/RLS: HIGH — đọc trực tiếp migration thật của dự án)

<user_constraints>
## User Constraints (từ CONTEXT.md)

### Locked Decisions

- **D-01:** Chỉ ảnh **mã hàng**. Ảnh chứng từ để phase sau.
- **D-02:** Thêm/xóa/đổi ảnh chính theo đúng quyền sửa danh mục: `quan_ly`, `van_phong`
  (`hasPermission(role, "edit-catalog")`, policy ghi `san_pham` ở `0015`). Mọi vai trò đọc
  được ảnh (kể cả `thu_kho`, `chi_xem`). Chặn bằng RLS trên bảng ảnh, không chỉ ở giao diện.
- **D-03:** Không có chiến dịch chụp toàn bộ 3.266 mã — "mã nào cần chụp thì chụp".
- **D-04:** Bảng `hinh_anh` lưu `noi_luu` + `khoa_luu` (fileId gốc) + khóa thumb —
  **không lưu URL Drive**. `noi_luu` ban đầu chỉ có `GDRIVE`, thiết kế để thêm `SUPABASE`/`R2` sau.
- **D-05:** Ghi: trình duyệt nén (WebP, cạnh dài ~1200px + thumb ~300px) → Route Handler
  (`getUser()` + kiểm quyền) → Apps Script ("Execute as me", tài khoản Google riêng cho hệ
  thống) → Drive. File Drive để private.
- **D-06:** Đọc: luôn qua URL của app `/anh/<id>` (và biến thể thumb) — Route Handler kiểm
  đăng nhập, lấy nội dung từ Apps Script, trả binary với cache dài hạn để CDN Vercel giữ.
- **D-07:** `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET` chỉ ở server (`env-server.ts`, thêm vào
  `.env.example`), tuyệt đối không `NEXT_PUBLIC_*`. Apps Script từ chối request sai secret.
- **D-08:** Folder Drive nông theo thứ không đổi: `san-pham/goc`, `san-pham/thumb`; tên file
  `<ma_hang>__<uuid>.webp`. ID folder cache trong `PropertiesService`, tạo folder bọc
  `LockService`.
- **D-09:** Code Apps Script nằm trong repo (`apps-script/`, đẩy bằng `clasp`); deploy bằng
  "Manage deployments → New version" để giữ URL `/exec`.
- **D-10:** Toàn bộ chỗ biết tới Drive/Apps Script gói trong một lớp storage server-only
  (interface kiểu `ImageStorage`: put/get/remove). Component, hook, URL không biết nơi lưu.
- **D-11:** File export có cột `Hình ảnh (url1,url2...)`: **1.094 mã có ảnh** (đã xác minh
  bằng script thật, xem "Dữ liệu KiotViet" bên dưới), link `https://cdn2-retail-images.kiotviet.vn/...`.
- **D-12:** Chép một lần sang Drive — không trỏ link KiotViet, không bỏ ảnh cũ. Ảnh chép vào
  đi đúng cùng đường với ảnh mới: nén WebP + thumb, lên Drive, ghi `hinh_anh`, hiển thị qua `/anh/<id>`.
- **D-13:** Script dòng lệnh chạy tay, chạy lại được (idempotent), bỏ qua ảnh đã chép, in
  báo cáo link hỏng/mã không khớp. Không làm nút trên giao diện.
- **D-14:** Thứ tự ảnh trong ô URL của KiotViet giữ nguyên; ảnh đầu tiên thành ảnh chính.
- **D-15:** Ảnh hiện ở: chi tiết mã hàng (thư viện ảnh) và bảng danh mục `/danh-muc` (cột
  thumbnail). Không thêm ở chỗ khác trong phase này.
- **D-16:** Bấm thumbnail → phóng to xem tại chỗ, không rời màn đang làm.
- **D-17:** Mã chưa có ảnh: ô xám với biểu tượng ảnh mờ.
- **D-18:** Thêm bộ lọc Có ảnh/Chưa có ảnh (`?anh=co|chua`).
- **D-19:** Không giới hạn số ảnh mỗi mã.
- **D-20:** Ảnh chính: mã chưa có ảnh → ảnh vừa tải tự thành chính; nút "Đặt làm ảnh chính";
  xóa ảnh chính thì ảnh kế tiếp (theo thứ tự) lên thay. Không kéo thả sắp thứ tự.
- **D-21:** Xóa ảnh là xóa mềm trong DB; file Drive chuyển vào thùng rác Drive.

### Claude's Discretion

- Luồng tải nhiều ảnh cùng lúc, thanh tiến độ từng ảnh.
- Xử lý HEIC từ iPhone (chuyển được thì chuyển, không thì báo lỗi đọc hiểu được).
- Kích thước/chất lượng nén cụ thể, định dạng thumb.
- Giao diện thư viện ảnh (lưới, vị trí nút), dùng antd `Image`/`Image.PreviewGroup`.
- Cách bảng danh mục lấy ảnh chính (mở rộng RPC `danh_sach_san_pham` hay truy vấn riêng).
- Tên cột cụ thể của `hinh_anh`, cách đánh dấu ảnh chính.
- Cơ chế cache/header cụ thể của `/anh/<id>`, cách warm cache sau khi chép ảnh KiotViet.
- Tài khoản Google giữ Drive: phase chỉ cần tài liệu hướng dẫn thiết lập.

### Deferred Ideas (OUT OF SCOPE)

- Ảnh chứng từ (phiếu giao, hàng lỗi) — phase riêng, nhánh folder `chung-tu/<năm>/<tháng>` đã chừa sẵn.
- Thumbnail ở gợi ý ô tìm mã (`ProductSearchInput`) và dòng phiếu/đơn.
- Thumbnail ở màn tồn kho `/ton-kho`.
- Kéo thả sắp thứ tự ảnh.
- Chuyển sang cloud (Supabase Storage/R2) + script migrate.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANH-01 | Người có quyền sửa danh mục thêm ảnh bằng camera/file, một mã nhiều ảnh không giới hạn | §Kiến trúc ghi ảnh, §Nén ảnh phía trình duyệt, §Apps Script contract |
| ANH-02 | Đặt ảnh chính (ảnh đầu tự chính, đổi được) và xóa mềm (ảnh chính bị xóa → ảnh kế tiếp thay) | §Thiết kế bảng `hinh_anh`, §RPC đặt ảnh chính/xóa ảnh |
| ANH-03 | Mọi vai trò đã đăng nhập xem thư viện ảnh, phóng to tại chỗ; ảnh chỉ đọc qua `/anh/<id>`, chặn bằng RLS + kiểm đăng nhập | §Kiến trúc đọc ảnh, §RLS bảng `hinh_anh`, §Cache/bảo mật `/anh/<id>` |
| ANH-04 | Bảng danh mục có cột thumbnail (ô xám khi chưa có) + bộ lọc Có ảnh/Chưa có ảnh | §Mở rộng RPC `danh_sach_san_pham`, §UI bảng danh mục |
| ANH-05 | Ảnh lưu trên Google Drive qua Apps Script, database chỉ lưu `noi_luu` + khóa; đổi nơi lưu không sửa giao diện | §Lớp `ImageStorage`, §Thiết kế bảng `hinh_anh` |
| ANH-06 | Chép một lần ảnh KiotViet (1.094 mã) sang nơi lưu mới bằng script chạy lại được, có báo cáo | §Script chép ảnh KiotViet, §Dữ liệu KiotViet |
</phase_requirements>

## Summary

Phase này ghép ba mảnh tương đối độc lập: (1) một **Google Apps Script web app** đóng vai
trò "storage adapter" phía Drive — nhận base64, trả base64, không có SDK chính thức nào để
gọi nó ngoài `fetch` HTTP thuần; (2) một **lớp storage server-only** trong Next.js che giấu
Apps Script sau hai Route Handler (ghi và đọc `/anh/<id>`); (3) **nén ảnh phía trình duyệt**
bằng Canvas API (không cần cài thư viện mới) trước khi gửi, để né giới hạn 4.5 MB body của
Vercel. Điểm rủi ro lớn nhất tìm thấy trong lúc research: câu chữ "trả binary với cache dài
hạn để CDN Vercel giữ" ở ROADMAP/CONTEXT (D-06) — nếu hiểu là `Cache-Control: public,
s-maxage=...` — **sẽ làm lộ ảnh cho người chưa đăng nhập**, vì Vercel Edge Cache không tự
động phân biệt theo cookie phiên (chỉ bỏ qua cache khi có header `Authorization`, dự án
dùng cookie). D-06 không khóa cơ chế cache cụ thể — "Cơ chế cache/header cụ thể" nằm trong
mục Claude's Discretion của CONTEXT.md — nên phần này research đề xuất một cách khác đạt
được đúng mục tiêu ("lần xem thứ hai không gọi Apps Script") mà không có lỗ hổng bảo mật:
cache **phía server** bằng Next.js Data Cache (`fetch(..., { cache: "force-cache" })`, bền
qua nhiều lần gọi hàm trên Vercel) đặt TRƯỚC route vẫn tự kiểm đăng nhập mỗi lần, cộng
`Cache-Control: private, max-age=..., immutable` để trình duyệt của CHÍNH người dùng đó
không phải tải lại.

Về database: `danh_sach_san_pham` (0030, sửa lần cuối ở 0067) là RPC dùng chung cho cả màn
danh mục lẫn route xuất Excel — **không nên đổi kiểu trả về của nó** (thêm cột) vì Postgres
buộc `DROP FUNCTION` trước khi tạo lại với kiểu trả về khác, kéo theo phải chép lại toàn bộ
GRANT/COMMENT (bài học từ chính comment trong 0067). Thumbnail của bảng danh mục nên lấy
bằng **một truy vấn riêng** theo danh sách id của trang hiện tại (~50 dòng), không đụng RPC.
Ngược lại, bộ lọc "Có ảnh/Chưa có ảnh" (D-18) BẮT BUỘC nằm trong RPC vì lọc phải chạy trước
phân trang server — may mắn là **thêm một tham số MỚI có default ở cuối danh sách tham số
KHÔNG đổi kiểu trả về**, nên `CREATE OR REPLACE FUNCTION` dùng được bình thường, không cần
DROP.

**Primary recommendation:** dựng Apps Script theo đúng khuôn một endpoint `/exec` + trường
`action` (giống tax-web, không có URL public), gói mọi lệnh gọi Apps Script trong
`src/features/images/lib/storage/gdrive-storage.server.ts` implement interface `ImageStorage`;
đọc ảnh qua `fetch(url, { cache: "force-cache" })` bên trong Route Handler `/anh/[id]` (vẫn
tự `getUser()` mỗi lần) + `Cache-Control: private, max-age=31536000, immutable` cho trình
duyệt; bảng `hinh_anh` dùng partial unique index để giữ đúng một ảnh chính; script chép ảnh
KiotViet tái dùng `readCatalogFile`/`readFirstSheet` đã có và cần `sharp` (hỏi người dùng
trước khi cài, xem lý do ở phần Node-side compression) vì dự án hiện không có công cụ nào mã
hoá WebP ở Node.

## Standard Stack

### Core

| Thành phần | Phiên bản/công cụ | Việc gì | Vì sao |
|---|---|---|---|
| Google Apps Script (V8 runtime) | hiện hành 2026 | Nhận request, ghi/đọc/xóa file trên Drive bằng `DriveApp` | Không tốn tiền cloud, đúng D-05/D-09; không có thư viện npm nào gọi Apps Script — chỉ có REST qua `fetch` |
| `clasp` (`@google/clasp`) | bản mới nhất trên npm, cài **global hoặc devDependency** riêng cho `apps-script/` (không lẫn vào `package.json` gốc của Next.js) | Đẩy code Apps Script từ repo lên Google, quản lý version/deployment | D-09 khóa cứng — code Apps Script phải nằm trong git |
| Canvas API (`HTMLCanvasElement.toBlob`, `createImageBitmap`) | built-in trình duyệt, không cần cài gì | Nén ảnh phía client thành WebP + thumb trước khi gửi | `toBlob('image/webp', quality)` là API chuẩn, baseline từ 2020; không cần thư viện |
| `sharp` | **CẦN HỎI NGƯỜI DÙNG TRƯỚC KHI CÀI** (CLAUDE.md: cài thư viện mới phải hỏi trước) | Nén WebP + thumb ở **script Node** chép ảnh KiotViet (D-12: ảnh chép vào phải đi đúng đường nén như ảnh mới) | Node không có API nén ảnh built-in; dự án hiện không có `sharp`/`jimp`/thư viện ảnh nào trong `node_modules` (đã kiểm `package.json`) |

### Supporting

| Thành phần | Phiên bản | Việc gì | Khi nào dùng |
|---|---|---|---|
| `PropertiesService` (Apps Script built-in) | — | Cache folder ID (`san-pham/goc`, `san-pham/thumb`) để không phải `getFoldersByName` mỗi lần | D-08 |
| `LockService` (Apps Script built-in) | — | Tránh tạo trùng folder khi hai request tạo folder cùng lúc lúc đầu | D-08 |
| antd `Image` / `Image.PreviewGroup` | có sẵn trong antd v6.6.3 đã cài | Phóng to ảnh tại chỗ (D-16), điều hướng qua lại giữa các ảnh của mã | Không cần cài thêm — đã có trong `dependencies` |

### Alternatives Considered

| Thay vì | Có thể dùng | Đánh đổi |
|---|---|---|
| `sharp` cho script Node | Không nén (upload nguyên ảnh KiotViet ~150KB đã sẵn nhỏ) | KHÔNG khớp D-12 ("ảnh chép vào đi đúng cùng đường với ảnh mới: nén WebP + thumb") — script vẫn cần SINH ra bản thumb 300px dù ảnh gốc đã nhỏ, nên vẫn cần một cách nào đó resize. `sharp` là lựa chọn hợp lý nhất (binary có sẵn cho macOS/Linux, không cần biên dịch) |
| Route Handler tự lưu ảnh vào Vercel filesystem tạm | Không dùng — Vercel serverless không có filesystem bền, mỗi invocation là container mới | N/A, không khả thi |
| Gọi Apps Script bằng SDK chính thức Google | Không có SDK — chỉ `fetch` HTTP thuần tới URL `/exec` | Không phải đánh đổi, đây là cách DUY NHẤT — Apps Script web app không có client library |

**Installation (chỉ khi người dùng đồng ý):**
```bash
npm install sharp
```

**Version verification:** chưa cài, chưa có gì để kiểm registry. Khi plan quyết định dùng
`sharp`, chạy `npm view sharp version` trước khi ghi vào PLAN.md — không giả định số phiên
bản từ training data.

## Kiến trúc ghi ảnh (ANH-01)

```
Trình duyệt (chọn file / chụp camera)
  → resize + nén WebP (Canvas), sinh thêm bản thumb
  → POST base64 tới Route Handler nội bộ (VD: POST /api/anh/tai-len)
      Route Handler: getUser() + hasPermission(role, "edit-catalog")
  → Route Handler gọi lớp ImageStorage.put(...)
      ImageStorage (gdrive-storage.server.ts): POST base64 → Apps Script /exec
      Apps Script: kiểm secret → DriveApp tạo file trong đúng folder → trả fileId
  → Route Handler ghi một dòng vào bảng hinh_anh qua Supabase (RLS vẫn áp — dùng
    session của chính người dùng, không dùng service_role)
```

### Apps Script — hợp đồng doPost/doGet

Không có SDK chính thức; hình dạng request/response là **quyết định tự do của Apps Script
code trong repo**. Mẫu tham chiếu ở `tax-web` (`common/models/profile-handler/profile-
handler-model.ts`, `src/app/api/profile-handler/route.ts`) dùng **một endpoint duy nhất +
trường `action`** phân nhánh, upload/preview đều truyền `base64Data` trong body JSON — không
có Apps Script source thật trong repo đó để xem contract phía server, chỉ có phía Next.js gọi
nó. Khuôn này áp dụng tốt cho Phase 9:

```ts
// apps-script/src/main.ts (biên dịch/đẩy bằng clasp)
type Action = "put" | "get" | "remove";

type Request = {
  secret: string;
  action: Action;
  // put
  folder?: "san-pham/goc" | "san-pham/thumb";
  fileName?: string;   // "<ma_hang>__<uuid>.webp"
  mimeType?: string;   // "image/webp"
  base64Data?: string;
  // get/remove
  fileId?: string;
};

function doPost(e: GoogleAppsScript.Events.DoPost) {
  const body = JSON.parse(e.postData.contents) as Request;
  if (body.secret !== PropertiesService.getScriptProperties().getProperty("SECRET")) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "forbidden" })
    ).setMimeType(ContentService.MimeType.JSON); // Apps Script không set HTTP status tùy ý — luôn 200, lỗi phải nằm TRONG body JSON
  }
  // switch theo action...
}
```

**Điểm phải biết:**

1. **Apps Script web app KHÔNG cho set HTTP status code tùy ý.** `doGet`/`doPost` luôn trả
   `200` (trừ khi Google tự trả lỗi hạ tầng, ví dụ deploy sai quyền). Route Handler của Next.js
   phải tự đọc field `error`/`success` trong JSON body để quyết định trả 4xx/5xx cho client —
   không thể dựa vào status code từ `fetch()` gọi Apps Script.
2. **Response có thể là redirect 302** tới `script.googleusercontent.com` (cơ chế bảo mật
   nội bộ của Google). `fetch()` của Node/Next.js **tự động theo redirect** (`redirect:
   "follow"` là default) nên không cần xử lý gì thêm — khác với `curl` (cần `-L`). Không có
   rủi ro ở đây, chỉ ghi lại để không ai debug nhầm khi thấy 302 trong log thử bằng curl.
3. **Không set HTTP header tùy ý được** trên response — không dùng được `Cache-Control` của
   chính Apps Script; caching phải làm ở tầng Route Handler của Next.js (đúng hướng D-06).
4. **`doGet`/`doPost` không nhận được cookie/session của Google** khi publish "Execute as
   me" + "Anyone" — đây chính là lý do bắt buộc phải tự kiểm `secret` thủ công (D-07), không
   có auth nào khác ở tầng Apps Script.

### Quota Apps Script (tài khoản Google cá nhân/consumer, KHÔNG phải Workspace)

Nguồn: [Quotas for Google Services](https://developers.google.com/apps-script/guides/services/quotas) (chính thức, HIGH confidence).

| Giới hạn | Giá trị (tài khoản cá nhân) | Ảnh hưởng tới Phase 9 |
|---|---|---|
| Thời gian chạy một script | 6 phút/lần gọi | Dư sức cho một lần upload/nén ảnh trên Apps Script (chỉ ghi blob vào Drive, không xử lý ảnh nặng — nén đã làm ở trình duyệt) |
| Số lần chạy đồng thời / user | 30 | Đủ cho ~92 phiếu xuất/ngày; upload ảnh không dồn dập theo lô lớn (D-03: không có chiến dịch chụp hàng loạt) — nhưng **script chép 1.094 ảnh KiotViet (ANH-06) PHẢI tự giới hạn tốc độ** (xem bên dưới), không được bắn 1.094 request Apps Script song song |
| UrlFetch calls | 20.000/ngày | Không áp dụng trực tiếp — request TỚI Apps Script không tính vào quota UrlFetch CỦA Apps Script; quota này chỉ tính khi CHÍNH Apps Script gọi `UrlFetchApp` ra ngoài (không cần trong thiết kế Phase 9, vì Apps Script chỉ ghi Drive, không gọi ra ngoài) |
| Properties value size | 9 KB/giá trị | Đủ dư để lưu folder ID (D-08) |
| Properties tổng | 500 KB | Không áp lực — chỉ vài chục giá trị (folder id theo nhánh) |
| Tổng thời gian trigger/ngày | 90 phút | Không dùng trigger định kỳ trong thiết kế này (mọi lệnh gọi là on-demand qua web app) |

**Điểm KHÔNG tìm được số chính thức (LOW confidence, cần thực nghiệm):** giới hạn "simultaneous
executions" chính xác cho RIÊNG web app doPost/doGet (30 là số chung cho mọi loại execution
của một user theo tài liệu quotas, không phải số riêng cho web app) — cần thực nghiệm khi
chạy script chép 1.094 ảnh: khuyến nghị giới hạn concurrency tự đặt trong script Node ở mức
**thấp hơn nhiều so với 30** (ví dụ 3-5 request song song, có `await sleep()` giữa các batch)
để chừa margin cho người dùng khác đang thao tác trên app cùng lúc, và vì thời gian mỗi lần
gọi (network round-trip + DriveApp write) không nhỏ.

### Giới hạn kích thước liên quan tới Apps Script

| Giới hạn | Giá trị | Nguồn |
|---|---|---|
| UrlFetch POST size | 50 MB/lần gọi | docs chính thức — áp dụng khi APPS SCRIPT tự gọi `UrlFetchApp`, không áp dụng cho request TỚI web app (web app request size không có số công bố riêng, nhưng thực tế cộng đồng ghi nhận payload JSON lớn (nhiều MB base64) vẫn vào được `doPost`) |
| Vercel Route Handler body | **4.5 MB cứng, không nâng được** | [Vercel KB](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — đây mới là giới hạn THẬT SỰ quyết định kích thước ảnh cho phép, vì request đi TỪ trình duyệt VÀO Route Handler của chính ứng dụng trước khi tới Apps Script |

→ **Kết luận cho ANH-04 tiêu chí "ảnh upload lên đều dưới giới hạn body của Vercel":** ảnh
nén xuống cạnh dài 1200px chất lượng WebP ~0.8 thường ra 80-300KB; base64 hoá cộng thêm ~33%
overhead (~110-400KB) — an toàn xa dưới 4.5MB. Vẫn nên chặn cứng phía client (kiểm
`blob.size` sau khi nén, báo lỗi rõ ràng nếu vượt một ngưỡng ví dụ 3MB trước khi gửi) để
không phụ thuộc hoàn toàn vào việc nén luôn thành công.

### Node-side compression cho script chép ảnh KiotViet

`package.json` hiện tại **không có** `sharp`, `jimp`, hay bất kỳ thư viện xử lý ảnh nào — chỉ
có `exceljs` (đọc Excel) và `qrcode`. Node.js không có API built-in để mã hoá WebP hay
resize ảnh. Để script `ANH-06` thoả D-12 ("ảnh chép vào đi đúng cùng đường với ảnh mới: nén
WebP + thumb"), cần một cách resize+encode ở Node. Lựa chọn thực tế:

- **`sharp`** — chuẩn công nghiệp, có binary dựng sẵn cho macOS ARM/Intel và Linux (Vercel
  build không liên quan vì đây là script chạy tay trên máy dev, không deploy), hỗ trợ WebP
  encode + resize trong một lệnh, API đơn giản (`sharp(buffer).resize(1200).webp({quality:
  80}).toBuffer()`). Đây là thư viện phổ biến nhất cho việc này trong hệ sinh thái Node —
  **PHẢI HỎI NGƯỜI DÙNG TRƯỚC KHI CÀI** theo đúng luật CLAUDE.md.
- Không dùng `canvas`/`@napi-rs/canvas` (native binding nặng hơn, không hỗ trợ WebP encode
  tốt bằng sharp) hay dịch vụ ngoài (tốn phí, đi ngược tinh thần "không tốn tiền cloud" của
  phase này).

Nếu người dùng từ chối cài thư viện: phương án dự phòng là **không resize/nén** ảnh KiotViet
khi chép — ghi nguyên bản JPEG gốc (~150KB, đã đủ nhỏ) làm cả "ảnh gốc" lẫn dùng chung một
file cho thumb (thumb chỉ cần giới hạn kích thước hiển thị bằng CSS `object-fit`, không cần
file riêng). Đây là một lệch nhẹ so với D-12 cần được người dùng xác nhận rõ ràng trước khi
plan chốt hướng này — **ghi lại như Open Question**, không tự quyết.

## Kiến trúc đọc ảnh + Cache/bảo mật `/anh/<id>` (ANH-03)

### Rủi ro cụ thể của "cache dài hạn để CDN Vercel giữ"

Theo [Vercel Cache-Control headers docs](https://vercel.com/docs/caching/cache-control-headers)
(HIGH confidence, đọc trực tiếp docs chính thức):

- Vercel Edge Cache **bỏ qua cache** cho request có header `Authorization`, nhưng **KHÔNG tự
  động bỏ qua cache theo cookie phiên** (dự án dùng cookie Supabase, không dùng
  `Authorization` header) — nghĩa là nếu Route Handler trả `Cache-Control: public,
  s-maxage=...`, response của LẦN GỌI ĐẦU (từ một người dùng đã đăng nhập) có thể bị Edge lưu
  lại và trả THẲNG cho các request tiếp theo tới CÙNG URL — **kể cả từ người chưa đăng
  nhập** — vì Edge không chạm vào Route Handler nữa một khi đã có cache hit. Đây là lỗ hổng
  thật, không phải lý thuyết.
- `Cache-Control: private` **chặn hẳn** Vercel Edge Cache lưu response đó (docs xác nhận
  "responses cannot contain the private... directive... for caching on Vercel's edge
  network"). `private` vẫn cho phép TRÌNH DUYỆT của người dùng cache bình thường.

### Cách đề xuất (đạt cả hai mục tiêu: bảo mật VÀ "lần xem thứ hai không gọi Apps Script")

```ts
// src/app/anh/[id]/route.ts (ví dụ đặt tên — plan tự quyết định path chính xác)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 }); // luôn kiểm MỖI request

  const anh = await fetchAnhChoPhep(params.id); // đọc bảng hinh_anh qua session người dùng (RLS áp)
  if (!anh) return new Response(null, { status: 404 });

  // fetch tới Apps Script dùng Next.js Data Cache — cache BỀN qua nhiều lần
  // gọi hàm trên hạ tầng Vercel (không phải cache trong bộ nhớ tiến trình),
  // NHƯNG route handler này vẫn tự chạy + tự kiểm đăng nhập mỗi lần — cache
  // nằm ở tầng fetch() nội bộ, không phải ở tầng response ra ngoài, nên không
  // có đường nào để người chưa đăng nhập lấy được ảnh mà bỏ qua getUser().
  const res = await fetch(appsScriptUrl(anh.khoaLuu), {
    cache: "force-cache",
    next: { tags: [`anh-${anh.id}`] }, // cho phép revalidateTag khi xóa/đổi ảnh
  });
  const bytes = await res.arrayBuffer();

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      // private: KHÔNG cho Vercel Edge/CDN giữ — chỉ trình duyệt của
      // CHÍNH người dùng đó giữ. immutable: id là UUID, nội dung file không
      // đổi sau khi tạo (xóa = tạo bản ghi mới, không sửa tại chỗ).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
```

- Khi xóa ảnh (D-21) hoặc đổi ảnh chính, gọi `revalidateTag(`anh-${id}`)` để buộc lần đọc kế
  tiếp lấy lại từ Apps Script — quan trọng cho trường hợp thùng rác Drive (dù file vẫn đọc
  được từ thùng rác một thời gian, không nên phụ thuộc vào đó).
- `id` trong URL là UUID (đã có sẵn qua PK `hinh_anh.id`) — thỏa "unguessable id", không cần
  thêm cơ chế token riêng.
- **Vẫn phải review lại điểm này với người dùng nếu ROADMAP D-06 được hiểu chặt là "phải là
  CDN Vercel giữ, không phải Data Cache"** — nhưng theo đúng CONTEXT.md, "Cơ chế cache/header
  cụ thể" nằm trong mục Claude's Discretion, nên đề xuất trên KHÔNG vi phạm locked decision,
  chỉ hiện thực hoá D-06 theo cách an toàn hơn.

### Xác nhận tiêu chí "lần xem thứ hai không gọi Apps Script"

ANH-03/ROADMAP yêu cầu "xác nhận bằng header cache/log" — cách đo cụ thể:
- Thêm header debug tạm (ví dụ `X-Anh-Nguon: cache|apps-script`) dựa vào việc `fetch()` có
  set `x-vercel-cache` (Next.js Data Cache trả header tương tự khi cache HIT/MISS — kiểm
  bằng cách log `res.headers.get("x-vercel-cache")` hoặc đơn giản là đo thời gian phản hồi:
  lần đầu vài trăm ms (network tới Apps Script + Drive), lần sau gần như tức thời).
- UAT thủ công: mở một ảnh, xem Network tab — request đầu chậm, F5 lại thấy nhanh hơn nhiều
  (trình duyệt phục vụ từ cache `private, immutable`, request thậm chí không rời máy).

## Thiết kế bảng `hinh_anh` (ANH-02, ANH-05)

Dự án **không có tiền lệ soft-delete bằng cột `deleted_at`/`xoa_luc`** ở bất kỳ bảng nào
hiện có (đã grep toàn bộ `supabase/migrations/`) — các bảng khác dùng cờ hoạt động
(`dang_hoat_dong` ở `kho`) hoặc bút toán đảo (chứng từ). D-21 của CONTEXT.md **chốt rõ** đây
là bảng đầu tiên dùng xóa mềm thật (khác nguyên tắc kiến trúc số 2 áp cho sổ cái kho, không
áp cho bảng ảnh — bảng ảnh không phải sổ cái). Đề xuất tên cột theo đúng quy ước
snake_case/tiếng Việt của dự án, khớp mẫu timestamp hiện có (`sua_luc`, `nap_luc`,
`quyet_luc`...): dùng `xoa_luc timestamptz` (nullable).

```sql
create table public.hinh_anh (
  id uuid primary key default uuid_generate_v4(),
  san_pham_id uuid not null references public.san_pham(id),
  noi_luu text not null default 'GDRIVE',      -- 'GDRIVE' | 'SUPABASE' | 'R2' sau này
  khoa_luu text not null,                       -- Drive fileId ảnh gốc
  khoa_luu_thumb text not null,                 -- Drive fileId ảnh thumb
  la_anh_chinh boolean not null default false,
  thu_tu integer not null default 0,            -- giữ thứ tự (D-14: ảnh đầu KiotViet = đầu danh sách)
  nguon_url text,                                -- url gốc KiotViet, để ANH-06 idempotent (bỏ qua nếu đã có)
  nguoi_tao_id uuid references public.nguoi_dung(id),
  xoa_luc timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Đúng một ảnh chính CÒN SỐNG cho mỗi mã — partial unique index, không phải
-- constraint mức bảng (nhiều ảnh la_anh_chinh=false vẫn hợp lệ).
create unique index idx_hinh_anh_chinh_unique
  on public.hinh_anh (san_pham_id)
  where la_anh_chinh and xoa_luc is null;

-- Idempotent cho script chép KiotViet: một url nguồn chỉ chép một lần.
create unique index idx_hinh_anh_nguon_url_unique
  on public.hinh_anh (san_pham_id, nguon_url)
  where nguon_url is not null;

create index idx_hinh_anh_san_pham on public.hinh_anh (san_pham_id) where xoa_luc is null;
```

**Về `san_pham.hinh_anh_url`:** cột này đã tồn tại từ 0005 (bảng gốc Phase 1), **chưa từng
được ghi giá trị thật** (Phase 1/2 không nạp ảnh, D-11/D-12 của Phase 9 chủ động KHÔNG dùng
URL KiotViet). Cột này KHÔNG liên quan tới bảng `hinh_anh` mới — planner **không cần và
không nên** đụng vào nó (xóa cột là việc ngoài phạm vi, cần hỏi trước theo CLAUDE.md "chạy
migration xóa/đổi cột trên database thật — hỏi trước"). Chỉ cần biết nó tồn tại để không bị
nhầm là "đã có sẵn hạ tầng ảnh".

### RLS (theo đúng khuôn 0015)

```sql
alter table public.hinh_anh enable row level security;

create policy "moi vai tro doc hinh anh" on public.hinh_anh
  for select to authenticated using (xoa_luc is null);

create policy "them hinh anh" on public.hinh_anh
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "sua hinh anh" on public.hinh_anh
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
```

Vì `.select('*')` KHÔNG bị chặn ở bảng này (không nằm trong danh sách bảng bị thu quyền mức
bảng ở 0029 — chỉ `san_pham`/`kho_movement` bị thu), `select('*')` trên `hinh_anh` an toàn
bình thường — **không cần** áp lại bẫy số 5 (CLAUDE.md) cho bảng mới này, nhưng vẫn nên liệt
kê cột tường minh theo thói quen chung của dự án.

### RPC đặt ảnh chính / xóa ảnh (ANH-02)

Cả hai thao tác cần nhiều câu UPDATE nằm trong MỘT statement/transaction để partial unique
index không bị vi phạm giữa chừng và để D-20 ("xóa ảnh chính → ảnh kế tiếp lên thay") atomic.
Khác với các RPC ghi sổ kho (`SECURITY DEFINER` + tự kiểm vai trò, vì RLS không cho phép ghi
`kho_movement` từ client), bảng `hinh_anh` **cho phép** `quan_ly`/`van_phong` ghi trực tiếp
qua RLS — nên RPC ở đây nên là `SECURITY INVOKER` (mặc định), đơn giản hơn, RLS tự áp, không
cần khối kiểm vai trò thủ công:

```sql
create or replace function public.dat_anh_chinh(p_id uuid)
returns void
language sql
as $$
  update public.hinh_anh
  set la_anh_chinh = (id = p_id), updated_at = now()
  where san_pham_id = (select san_pham_id from public.hinh_anh where id = p_id)
    and xoa_luc is null;
$$;

create or replace function public.xoa_anh(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_san_pham_id uuid;
  v_la_chinh boolean;
  v_ke_tiep uuid;
begin
  select san_pham_id, la_anh_chinh into v_san_pham_id, v_la_chinh
  from public.hinh_anh where id = p_id and xoa_luc is null;

  if v_san_pham_id is null then
    raise exception 'Ảnh không tồn tại hoặc đã bị xóa' using errcode = 'P0002';
  end if;

  update public.hinh_anh set xoa_luc = now(), la_anh_chinh = false where id = p_id;

  if v_la_chinh then
    select id into v_ke_tiep from public.hinh_anh
    where san_pham_id = v_san_pham_id and xoa_luc is null
    order by thu_tu asc, created_at asc limit 1;

    if v_ke_tiep is not null then
      update public.hinh_anh set la_anh_chinh = true, updated_at = now() where id = v_ke_tiep;
    end if;
  end if;
end;
$$;
```

Một câu UPDATE nhiều dòng như `dat_anh_chinh` được Postgres kiểm ràng buộc unique **sau khi
cả statement chạy xong** (không phải per-row) nên không cần `DEFERRABLE` — đã xác minh đây là
hành vi chuẩn của Postgres cho non-deferred constraint trong MỘT câu lệnh.

RLS vẫn áp cho các UPDATE bên trong hàm `SECURITY INVOKER` — `chi_xem`/`thu_kho` gọi hai RPC
này sẽ bị chặn tự nhiên bởi policy "sua hinh anh" ở trên, không cần raise exception thủ công.

## Mở rộng RPC `danh_sach_san_pham` cho bộ lọc Có ảnh/Chưa có ảnh (ANH-04, D-18)

**KHÔNG đổi kiểu trả về** (không thêm cột ảnh chính vào output của RPC này — xem lý do dưới).
**CÓ THỂ** thêm tham số lọc mới ở cuối danh sách tham số hiện có (0067):

```sql
create or replace function public.danh_sach_san_pham(
  p_tu_khoa text default null, p_nhom_hang_id uuid default null,
  p_cong_doan_id uuid default null, p_dvt_id uuid default null,
  p_trang_thai_ton text default null, p_dang_kinh_doanh boolean default true,
  p_can_ra boolean default null, p_sap_xep text default null,
  p_huong text default 'asc', p_trang integer default 1, p_kich_thuoc integer default 50,
  p_co_anh boolean default null   -- MỚI, thêm ở CUỐI, có default → CREATE OR REPLACE hợp lệ
)
returns table (...)  -- GIỮ NGUYÊN, không thêm cột
...
  where ...
    and (p_co_anh is null
         or (p_co_anh and exists (select 1 from public.hinh_anh h
                                   where h.san_pham_id = l.id and h.xoa_luc is null))
         or (not p_co_anh and not exists (select 1 from public.hinh_anh h
                                           where h.san_pham_id = l.id and h.xoa_luc is null)))
...
```

**Vì sao KHÔNG dùng CREATE OR REPLACE để đổi return type:** Postgres từ chối
`CREATE OR REPLACE FUNCTION` khi kiểu trả về (bao gồm thêm cột trong `RETURNS TABLE`) khác
với hàm đang tồn tại — buộc `DROP FUNCTION` trước. `DROP` xóa sạch GRANT/REVOKE/COMMENT gắn
trên hàm (đã ghi rõ trong chính comment của 0029/0067: "`create or replace` giữ nguyên chữ
ký, quyền GRANT và COMMENT" — hàm ở 0067 CHỈ dùng được `CREATE OR REPLACE` vì không đổi kiểu
trả về). Hàm này còn được gọi từ `src/app/api/danh-muc/xuat-excel/route.ts` — đổi return
type buộc phải rà lại cả chỗ đó. Thêm tham số mới với default (không đổi return type) là
đường an toàn hơn nhiều, đã verify hợp lệ theo Postgres docs (thêm tham số cuối có default =
tương thích ngược với mọi lời gọi cũ).

`toListRpcArgs` trong `src/features/products/schemas/filter.schema.ts` cần thêm nhánh y hệt
`p_dang_kinh_doanh`/`p_can_ra` cho `p_co_anh` (map từ `filter.hasImage: "co" | "chua" | null`
→ `true`/`false`/`undefined`). Tham số URL theo đúng quy ước dự án: `?anh=co|chua` (D-18 đã chỉ định).

## Cách bảng danh mục lấy ảnh chính (thumbnail cột)

**Đề xuất: truy vấn riêng**, không mở rộng RPC trên (RPC không đổi output). Sau khi
`fetchProducts()` trả về trang hiện tại (tối đa `pageSize` ≤ 200 dòng theo `PAGE_SIZES`), gọi
thêm một truy vấn batch lấy ảnh chính của đúng các id đó:

```ts
// src/features/products/api/product.api.ts (hoặc feature images/ nếu tách riêng)
const { data } = await supabase
  .from("hinh_anh")
  .select("san_pham_id, id, khoa_luu_thumb")
  .in("san_pham_id", ids)
  .eq("la_anh_chinh", true)
  .is("xoa_luc", null);
```

Ưu điểm: không đụng RPC dùng chung, không tốn công re-test toàn bộ caller hiện có của
`danh_sach_san_pham`, và tách rõ trách nhiệm — đúng tinh thần D-10 (mọi thứ liên quan ảnh
nằm ở lớp riêng). Nhược điểm nhỏ: hai round-trip thay vì một — chấp nhận được vì bảng chỉ
50-200 dòng/trang, không phải 3.266 dòng.

## Runtime State Inventory

> Phase này KHÔNG phải rename/refactor/migration đổi tên — bỏ qua theo điều kiện skip.

## Common Pitfalls

### Pitfall 1: Cache CDN công khai làm lộ ảnh cho người chưa đăng nhập
**Đã mô tả chi tiết ở §Cache/bảo mật.** Dấu hiệu cảnh báo: nếu code dùng
`Cache-Control: public, s-maxage=...` hoặc `CDN-Cache-Control` cho response của `/anh/<id>`
— DỪNG LẠI, đây là lỗ hổng. Chỉ dùng `private` cho response ra trình duyệt.

### Pitfall 2: `CREATE OR REPLACE FUNCTION` đổi kiểu trả về
**Đã gặp trong lịch sử dự án (0029: `tim_san_pham` phải DROP).** Nếu plan nào định thêm cột
ảnh chính vào `danh_sach_san_pham`, phải dừng lại và dùng cách truy vấn riêng ở trên thay vì
`DROP FUNCTION`.

### Pitfall 3: `san_pham` không có SELECT mức bảng (bẫy 5, migration 0029)
Bảng `hinh_anh` MỚI không nằm trong nhóm bị siết này — nhưng bất kỳ hàm/view nào JOIN
`hinh_anh` với `san_pham` và SELECT cột `san_pham.*` sẽ dính lỗi 42501 cho MỌI vai trò. Luôn
liệt kê cột tường minh khi join sang `san_pham`.

### Pitfall 4: Apps Script luôn trả 200
`fetch()` gọi Apps Script sẽ KHÔNG BAO GIỜ tự nhiên trả 4xx/5xx cho lỗi nghiệp vụ (sai secret,
DriveApp quota, file không tồn tại) — Route Handler PHẢI tự đọc field lỗi trong JSON body.
Nếu code chỉ kiểm `res.ok` (dựa vào HTTP status) để quyết định thành công/thất bại, mọi lỗi
nghiệp vụ sẽ bị coi là thành công — lặp lại đúng lớp lỗi "PostgrestError không phải instance"
đã gặp ở Phase 2 (bẫy 8, CLAUDE.md), chỉ khác nguồn.

### Pitfall 5: HEIC + `accept="image/*"` trên Safari 17+
Nếu `<input type="file" accept="image/*">` được dùng (bao gồm ngầm cả `image/heic` trong
danh sách chấp nhận), **Safari 17+ có thể chuyển NGƯỢC LẠI** — biến JPEG/PNG đã chọn thành
HEIC (xác nhận bằng nguồn Apple Developer Forums, MEDIUM confidence — hiện tượng cộng đồng
ghi nhận, chưa thấy trong changelog chính thức Apple). Cách né: khai `accept` TƯỜNG MINH
(`accept="image/jpeg,image/png,image/webp"`, không liệt kê `image/heic` và không dùng
wildcard `image/*`) — buộc iOS tự động convert HEIC → JPEG lúc chọn ảnh, tránh hoàn toàn việc
phải tự giải mã HEIC ở Canvas.

### Pitfall 6: `sharp` không có sẵn — đừng giả định
Script chép ảnh KiotViet KHÔNG THỂ chạy nếu code giả định `sharp` đã được cài — kiểm
`node_modules/sharp` hoặc bắt lỗi import rõ ràng trước khi chạy `--ghi`, theo đúng khuôn an
toàn của `import-kiotviet/index.ts` (mặc định `--dry-run`, chỉ `--ghi` khi người dùng xác nhận).

## Code Examples

### Nén WebP + thumb phía trình duyệt (không cần cài thư viện)

```ts
// src/features/images/lib/compress-image.ts (client, KHÔNG "use server")
async function compressToWebp(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  // { imageOrientation: "from-image" } áp EXIF orientation tự động — Canvas
  // strip hết EXIF khi vẽ lại nên không cần xử lý tay.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // toBlob KHÔNG throw khi trình duyệt không mã hoá được WebP — nó âm
        // thầm trả PNG (nặng hơn nhiều). PHẢI kiểm blob.type.
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("Trình duyệt này không nén được WebP — thử trình duyệt khác."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}
```

### Route Handler ghi ảnh — mẫu kiểm quyền (khuôn giống `nhap-excel/route.ts` đã có)

```ts
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Phiên đăng nhập đã hết hạn", "Đăng nhập lại.", 401);
  if (!hasPermission(user.role, "edit-catalog")) {
    return errorResponse("Không có quyền thêm ảnh", "Chỉ quản lý và văn phòng thêm được ảnh.", 403);
  }
  // ... đọc formData, gọi ImageStorage.put(), ghi bảng hinh_anh qua session người dùng
}
```

## State of the Art

| Cách cũ | Cách hiện tại | Đổi khi nào | Ý nghĩa |
|---|---|---|---|
| Tự parse EXIF orientation bằng thư viện (`exif-js`...) | `createImageBitmap(file, { imageOrientation: "from-image" })` | API này đã baseline nhiều năm, không phải thứ mới của 2026 | Không cần cài thư viện EXIF nào |
| `new Image()` + `<canvas>` ẩn trong DOM để resize | `createImageBitmap()` — decode ngoài DOM, không reflow | — | Nhanh hơn, không cần gắn/gỡ phần tử DOM |
| Next.js fetch cache mặc định `force-cache` (Next ≤14) | Next.js 15+/16: **mặc định `no-store`**, phải khai `{ cache: "force-cache" }` tường minh | Next.js 15 | Nếu plan/code copy mẫu cũ (Next 13/14) mà không khai `cache` tường minh, request tới Apps Script sẽ KHÔNG được cache — vẫn đúng chức năng nhưng không đạt tiêu chí "lần xem thứ hai không gọi Apps Script" |

**Deprecated/outdated:** không có mục nào trong phase này dựa vào API đã deprecate — Apps
Script `ContentService`, Canvas API, và Next.js Route Handler đều là API còn hiệu lực.

## Open Questions

1. **Script chép ảnh KiotViet có được phép cài `sharp` không?**
   - Đã biết: dự án hiện không có thư viện xử lý ảnh nào; D-12 yêu cầu ảnh chép vào phải đi
     đúng đường nén WebP + thumb như ảnh mới.
   - Chưa rõ: người dùng có đồng ý cài `sharp` (~30-50MB kèm binary native) chỉ cho MỘT
     script chạy tay hay không.
   - Khuyến nghị: hỏi trực tiếp ở bước lập PLAN.md (checkpoint xác nhận), phương án dự phòng
     đã nêu ở §Node-side compression.

2. **Giới hạn concurrency chính xác cho web app Apps Script (không phải quota chung).**
   - Đã biết: quota "30 lần chạy đồng thời/user" là số chung cho MỌI loại execution, tài
     liệu không tách riêng số cho web app.
   - Chưa rõ: có bị giới hạn thấp hơn thực tế khi 1.094 request dồn dập không.
   - Khuyến nghị: script `ANH-06` tự giới hạn concurrency thấp (3-5) + retry có backoff, đo
     thực tế trong lúc chạy `--dry-run` trước (không gọi Apps Script thật) rồi thử một batch
     nhỏ (~20 ảnh) bằng `--ghi` trước khi chạy toàn bộ 1.094.

3. **Tài khoản Google giữ Drive — dung lượng miễn phí có đủ không?**
   - Đã biết: 1.094 ảnh KiotViet ~150KB/ảnh gốc (~165MB tổng, trước nén) + ảnh mới phát sinh
     theo D-03 ("mã nào cần thì chụp", không có chiến dịch toàn bộ). Sau nén WebP còn ít hơn.
   - Chưa rõ: dung lượng còn trống trong tài khoản Google cá nhân dự định dùng (15GB miễn phí
     dùng chung Gmail/Drive/Photos).
   - Khuyến nghị: việc thiết lập tài khoản là "chỉ cần tài liệu hướng dẫn" theo CONTEXT.md —
     không phải rủi ro kỹ thuật của phase, nhưng đáng ghi một dòng nhắc trong tài liệu setup.

## Environment Availability

| Phụ thuộc | Cần cho | Có sẵn | Phiên bản | Fallback |
|---|---|---|---|---|
| `clasp` (CLI) | Đẩy code Apps Script (D-09) | ✗ (chưa kiểm trên máy này — không có quyền chạy `npx clasp login` tương tác) | — | Không có fallback thật — nếu không cài được, phải copy-paste code vào trình soạn thảo Apps Script trên web thủ công (mất tính năng "code trong repo" của D-09, chỉ nên dùng tạm) |
| `sharp` | Nén ảnh phía Node cho script chép KiotViet (ANH-06) | ✗ (chưa cài, cần hỏi người dùng) | — | Xem §Node-side compression: chép nguyên bản không nén |
| Tài khoản Google + Drive API bật cho Apps Script project | Toàn bộ phase | ✗ (chưa xác nhận đã tạo) | — | Không có fallback — là điều kiện tiên quyết của D-05, cần checkpoint "người dùng tự tạo tài khoản, tự deploy Apps Script" (CONTEXT.md Claude's Discretion) trước khi plan có thể thực thi phần Apps Script |
| `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET` trong `.env.local` | Route Handler gọi được Apps Script | ✗ (chưa tồn tại — sẽ thêm ở plan này) | — | N/A, là việc của plan |

**Phụ thuộc thiếu không có fallback (chặn thực thi):** thiết lập Apps Script project + Drive
(tài khoản Google, bật deploy, lấy URL `/exec`) — đây là **checkpoint bắt buộc con người làm
trước**, giống các checkpoint `db:push`/`supabase login` đã có tiền lệ ở Phase 5 (`05-00-PLAN.md`).

**Phụ thuộc thiếu có fallback:** `sharp` (chép ảnh không nén), `clasp` (dán code thủ công
tạm thời).

## Validation Architecture

> `.planning/config.json` chưa được đọc trong phiên research này (không có trong danh sách
> file bắt buộc đọc) — giả định `workflow.nyquist_validation` KHÔNG bị tắt tường minh, nên
> mục này được đưa vào theo mặc định "bật".

### Test Framework

| Thuộc tính | Giá trị |
|---|---|
| Framework | pgTAP (database) + `tsx` chạy trực tiếp cho hàm thuần (`scripts/test-pure-functions.ts` kiểu) + `scripts/test-route-permissions.ts` cho ma trận quyền route — **không có** framework test JS/TS kiểu Jest/Vitest trong dự án (đã kiểm `package.json`, không có) |
| Config file | không có config test JS riêng — mỗi script `tsx` tự chứa case, chạy trực tiếp |
| Quick run command | `npx tsx scripts/test-pure-functions.ts` (sau khi thêm case cho hàm nén/tính toán thuần của Phase 9, nếu có) |
| Full suite command | `npm run check && npx tsx scripts/test-pure-functions.ts && npx tsx scripts/test-route-permissions.ts` + chạy pgTAP file mới qua `psql "$DATABASE_URL" -f supabase/tests/<file>.sql` (khuôn đã dùng ở Phase 4 do Docker không chạy được trên máy hiện tại) |

### Phase Requirements → Test Map

| Req ID | Hành vi | Loại test | Lệnh tự động | File đã có? |
|---|---|---|---|---|
| ANH-01 | Thêm ảnh → RLS chặn vai trò không có quyền | pgTAP | `psql "$DATABASE_URL" -f supabase/tests/<NN>_hinh_anh_rls.sql` | ❌ Wave 0 |
| ANH-02 | `dat_anh_chinh`/`xoa_anh` giữ đúng một ảnh chính, xóa ảnh chính tự chuyển ảnh kế tiếp | pgTAP | như trên (cùng file hoặc file riêng `<NN>_hinh_anh_rpc.sql`) | ❌ Wave 0 |
| ANH-03 | Chưa đăng nhập gọi `/anh/<id>` → 401; đã đăng nhập → 200; RLS chặn đọc ảnh đã xóa mềm | pgTAP (RLS) + kiểm thủ công qua `curl` có/không cookie (khuôn `test-route-permissions.ts`) | thêm route `/anh/[id]` vào `scripts/test-route-permissions.ts` | ❌ Wave 0 (route chưa tồn tại) |
| ANH-04 | `p_co_anh` lọc đúng; cột thumbnail hiện ô xám khi chưa có ảnh | pgTAP (RPC) + UAT trình duyệt (không tự động hoá được phần hiển thị ô xám — chỉ con người xác nhận bằng mắt, đúng tiền lệ mọi phase trước) | `psql ... -f supabase/tests/<NN>_danh_sach_san_pham_co_anh.sql` | ❌ Wave 0 |
| ANH-05 | Đổi `noi_luu` không sửa component/URL — kiểm bằng review code (`grep -rn "GDRIVE\|DriveApp\|APPS_SCRIPT" src/` chỉ nên trúng đúng lớp `ImageStorage` + Route Handler mỏng) | kiểm tĩnh (grep), không phải test tự động chạy được | `grep -rln "khoa_luu\|APPS_SCRIPT\|DriveApp" src/ | grep -v "features/images/lib/storage"` phải rỗng (hoặc gần rỗng, chỉ Route Handler gọi vào lớp storage) | N/A — quy ước kiểm tra, không phải file test |
| ANH-06 | Script chạy lại lần hai không chép trùng (idempotent), báo đúng số link hỏng | script tự in báo cáo, so sánh thủ công hai lần chạy trên cùng dữ liệu | `npx tsx scripts/copy-anh-kiotviet.ts --dry-run` (tên file ví dụ, plan tự đặt) chạy hai lần liên tiếp phải ra cùng "đã chép: 0 mới" ở lần hai | ❌ Wave 0 (script chưa tồn tại) |

### Sampling Rate

- **Per task commit:** `npm run check` (typecheck+lint+build) — bắt buộc mọi commit TypeScript,
  giống mọi phase trước.
- **Per wave merge:** chạy đủ bộ pgTAP mới của Phase 9 + `scripts/test-route-permissions.ts`
  (thêm `/anh/[id]` và route upload vào ma trận ngay trong wave tạo ra route đó, đúng tiền lệ
  04-08/04-10/05-11).
- **Phase gate:** không có trình duyệt trong môi trường thực thi agent (đã xác nhận là hạn
  chế xuyên suốt dự án, xem STATE.md) — mọi tiêu chí liên quan tới "nhìn thấy ảnh", "phóng to
  ảnh", "ô xám khi chưa có ảnh" là **checkpoint:human-verify bắt buộc**, không tự động hoá được.

### Wave 0 Gaps

- [ ] `apps-script/` — thư mục project Apps Script mới, chưa tồn tại trong repo.
- [ ] `supabase/migrations/00XX_hinh_anh.sql` — bảng + RLS + RPC mới.
- [ ] `supabase/tests/XX_hinh_anh_*.sql` — pgTAP cho bảng mới.
- [ ] `src/features/images/` (hoặc mở rộng `products/`) — feature folder chưa tồn tại.
- [ ] `src/app/anh/[id]/route.ts` (hoặc path tương đương) — Route Handler đọc ảnh, chưa tồn tại.
- [ ] `.env.example` — chưa có mục Apps Script.
- [ ] `scripts/copy-anh-kiotviet.ts` (tên ví dụ) — script chép ảnh KiotViet, chưa tồn tại.
- [ ] Framework install: không cần cài framework test mới — tiếp tục dùng pgTAP + `tsx` như
      mọi phase trước; chỉ cần quyết định có cài `sharp` hay không (xem Open Questions #1).

## Sources

### Primary (HIGH confidence)

- [Quotas for Google Services — Apps Script, Google for Developers](https://developers.google.com/apps-script/guides/services/quotas) — số quota chính thức
- [Content Service — Apps Script, Google for Developers](https://developers.google.com/apps-script/guides/content) — cơ chế trả nội dung, redirect `script.googleusercontent.com`
- [Vercel — How to bypass the 4.5MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — giới hạn body cứng, không nâng được
- [Vercel — Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers) — hành vi `private` chặn Edge Cache, `Authorization` header mới được Edge tự bỏ qua cache
- [Vercel — Data Cache](https://vercel.com/docs/caching/runtime-cache/data-cache) — `fetch({cache:"force-cache"})` bền qua nhiều lần gọi hàm trên hạ tầng Vercel
- [MDN — HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/api/HTMLCanvasElement/toBlob) — hành vi fallback PNG khi không mã hoá được WebP
- Đọc trực tiếp source thật của dự án: `supabase/migrations/0005, 0015, 0029, 0030, 0067` — schema `san_pham`, RLS, quyền cột, RPC `danh_sach_san_pham`
- Chạy thật `npx tsx` trên `data/kiotviet/DanhSachSanPham_KV12092026-153850-575.xlsx` — xác
  nhận cột `hinh_anh_url1_url2`, 1.094 dòng có ảnh, mẫu URL CDN KiotViet

### Secondary (MEDIUM confidence)

- [Apple Developer Forums — Safari 17+ HEIC accept issue](https://developer.apple.com/forums/thread/743049) — hiện tượng cộng đồng ghi nhận, chưa thấy trong tài liệu chính thức Apple
- [heicify.com — HEIC Browser Support 2026](https://www.heicify.com/guides/heic-browser-support) — Safari decode HEIC native qua OS codec, Chrome/Firefox không hỗ trợ trong `<canvas>`/`createImageBitmap`
- Cộng đồng (Hacker News threads, dev.to) về hành vi iOS tự convert HEIC → JPEG khi `accept` không gồm `image/heic`

### Tertiary (LOW confidence, cần validate thêm)

- Số "simultaneous executions" riêng cho web app doPost/doGet (khác số chung 30/user) — không
  tìm được nguồn công bố riêng, đề xuất thực nghiệm khi chạy script ANH-06 (xem Open Question #2)
- Kích thước request tối đa mà `doPost` của Apps Script web app chấp nhận (không có số công
  bố riêng, chỉ có số 50MB cho `UrlFetchApp` — là một quota KHÁC, không áp dụng trực tiếp) —
  không phải rủi ro thực tế vì Vercel 4.5MB đã là giới hạn chặt hơn nhiều nằm ở lớp trước

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — Apps Script không có "phiên bản" để chốt (chạy trên V8 runtime
  hiện hành của Google, không version hóa như npm package); `sharp` chưa được cài, cần xác
  nhận version registry lúc plan.
- Kiến trúc đọc/ghi + cache: HIGH — xác nhận bằng docs chính thức Vercel + Next.js, cộng với
  việc đọc trực tiếp code/migration thật của dự án.
- Database (bảng `hinh_anh`, RPC, RLS): HIGH — dựa trên pattern đã chứng minh chạy đúng trong
  8 phase trước của CHÍNH dự án này (0015, 0029, 0067), không phải suy đoán từ training data.
- Pitfalls: HIGH cho các pitfall có tiền lệ thật trong dự án (2, 3), MEDIUM cho pitfall về
  HEIC/Safari 17+ (nguồn cộng đồng, chưa chính thức).

**Research date:** 2026-09-26
**Valid until:** ~30 ngày cho phần database/kiến trúc Next.js (ổn định); ~14 ngày cho phần
quota/hành vi Apps Script và Safari HEIC (thay đổi theo bản cập nhật Google/Apple, khó dự đoán).
