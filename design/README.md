# Kho Minh Vũ — bản demo UI/UX tĩnh

Bản demo HTML + CSS + JS thuần cho toàn bộ hệ thống Kho Minh Vũ. Không build,
không framework, không CDN. Mở bằng `file://` là chạy — kể cả khi ngắt mạng.

## Cách mở

Nhấp đúp `design/styleguide.html` (hoặc `design/index.html`). Từ đó bấm vào
mục lục hoặc thanh điều hướng để đi tới mọi màn.

## Sơ đồ file

```
design/
  assets/
    tokens.css   biến CSS chép từ src/providers/antd-theme.ts + src/app/globals.css
    app.css      component CSS (tiền tố kv-)
    app.js       khung (top nav/tab đáy/menu), drawer/modal/toast, bảng, lọc, nhập liệu bàn phím
    data.js      dữ liệu mẫu (window.KMV_DATA)
  styleguide.html         mục lục + bảng màu/nút/tag/bảng/4 trạng thái
  dang-nhap.html / doi-mat-khau.html / khong-du-quyen.html
  index.html              Tổng quan
  nhap-kho(.html|-chi-tiet.html)     Phiếu nhập
  dat-hang(.html|-chi-tiet.html)     Đơn đặt hàng
  xuat-kho(.html|-chi-tiet.html)     Phiếu xuất
  tra-hang(.html|-chi-tiet.html)     Phiếu trả (NCC + khách)
  in-phieu.html           Mẫu in (nhập / giao hàng / đi lấy hàng)
  danh-muc(.html|-chi-tiet.html)     Danh mục hàng
  doi-tac(.html|-chi-tiet.html)      Đối tác
  ton-kho.html, the-kho.html, kiem-ke.html, chuyen-kho.html
  bao-cao.html, cai-dat.html
  check.mjs               bộ kiểm tĩnh (xem bên dưới)
```

## Ánh xạ file demo ↔ route thật của app

| File demo | Route thật (dự kiến / đã có) |
|---|---|
| `nhap-kho.html` | `/nhap-kho` |
| `nhap-kho-chi-tiet.html?id=` | `/nhap-kho/[id]` |
| `dat-hang.html` | `/dat-hang` |
| `dat-hang-chi-tiet.html?id=` | `/dat-hang/[id]` |
| `xuat-kho.html` | `/xuat-kho` |
| `xuat-kho-chi-tiet.html?id=` | `/xuat-kho/[id]` |
| `tra-hang-chi-tiet.html?id=` | `/tra-hang/[id]` |
| `in-phieu.html?loai=nhap&id=` | `/nhap-kho/[id]/in` (giả định — chưa có route thật) |
| `in-phieu.html?loai=giao-hang&id=` | `/xuat-kho/[id]/in` |
| `in-phieu.html?loai=lay-hang&id=` | `/dat-hang/[id]/in` |
| `danh-muc.html`, `danh-muc-chi-tiet.html?id=` | `/danh-muc`, `/danh-muc/[id]` |
| `doi-tac.html`, `doi-tac-chi-tiet.html?id=` | `/doi-tac`, `/doi-tac/[id]` |
| `ton-kho.html`, `the-kho.html`, `kiem-ke.html`, `chuyen-kho.html`, `bao-cao.html` | **Chưa có trong app** — đề xuất cho Phase 5–6 |
| `cai-dat.html?tab=` | `/cai-dat/*` |

## Quy ước

- `<body data-page="..." data-nav="..." data-shell="app|bare|print">`
  - `data-page`: tên trang, dùng để đăng ký logic riêng qua `KMV.page(name, fn)`.
  - `data-nav`: mục đang sáng trên top nav / tab đáy (rỗng nếu trang không có khung).
  - `data-shell`: `app` (có top nav + tab đáy, do `app.js` tự dựng), `bare` (đăng
    nhập/đổi mật khẩu — không khung), `print` (mẫu in — không khung, có thanh
    công cụ riêng `data-no-print`).
- Mọi trang chỉ viết phần NỘI DUNG trong `<main id="page">` — khung được
  `app.js` dựng lúc `DOMContentLoaded` (`renderShell()`).
- Đường dẫn tương đối, không có `type="module"`, không `fetch`, không URL ngoài
  (xem `check.mjs`).

## Cách thêm màn mới

1. Sao chép khung một file `.html` hiện có (giữ `<head>`, script tag ở cuối).
2. Đổi `data-page`, `data-nav`, tiêu đề `<title>`.
3. Viết nội dung trong `<main id="page">`.
4. Đăng ký logic riêng bằng `KMV.page("ten-trang", function () { ... })`.
5. Nếu cần state chung mới (chứng từ, dòng…) thì thêm vào `assets/data.js`.
6. Thêm file vào mục lục `styleguide.html` và vào danh sách `check.mjs`.

## Tham số demo qua URL

- `?state=loading|error|empty` — ép trang danh sách sang trạng thái đó (test
  bốn trạng thái mà không cần chờ tải thật).
- `?id=` — id chứng từ/mã hàng cho trang chi tiết.
- `?loc=` — bộ lọc mở sẵn khi vào từ Tổng quan (vd. `ton-kho.html?loc=duoi-dinh-muc`).
- `?tab=` — tab đang mở của `cai-dat.html`.
- Chuyển vai trò: menu tài khoản góc phải → chọn vai trò → lưu vào
  `sessionStorage`, áp dụng ngay (không cần tải lại thủ công, trang tự
  `location.reload()`).

## Giả định của demo (chưa chốt với người dùng)

- **Tiền tố số chứng từ** cho các loại chưa có trong app thật: `CK` (chuyển
  kho), `KK` (kiểm kê), `DC` (điều chỉnh) — suy theo khuôn `PN/PX/TN/TK/DH` đã
  có, KHÔNG lấy từ cấu hình thật.
- **Menu con trên pill nav** ("Xuất kho" → Phiếu xuất/Trả hàng; "Tồn kho" →
  Tồn kho/Thẻ kho/Kiểm kê/Chuyển kho) — app thật hiện là menu phẳng, không có
  cấp con. Đây là đề xuất để gom đủ các màn Phase 5–6 vào điều hướng.
- **Toàn bộ `ton-kho.html`, `the-kho.html`, `kiem-ke.html`, `chuyen-kho.html`,
  `bao-cao.html`** là đề xuất bố cục cho các phase sau (5–6), CHƯA có trong
  app thật và CHƯA được duyệt — chỉ để chủ doanh nghiệp/thủ kho góp ý trước.
- Đăng nhập nhanh theo vai trò trên `dang-nhap.html` chỉ có ở demo.
- "Đề nghị gộp mã" trên `xuat-kho-chi-tiet.html` chỉ ghi lại đề nghị trong
  phiên trình duyệt (giống hành vi RPC `de_nghi_gop_ma` thật — chỉ ghi log,
  không tự gộp mã).

## Lưu ý công cụ

`eslint.config.mjs` của repo **không** loại trừ thư mục `design/`, nên
`npm run lint` / `npm run check` sẽ quét cả `design/**/*.js`. Tương tự,
`npm run format` (prettier --write .) sẽ định dạng lại file trong `design/`.

Theo yêu cầu của plan, KHÔNG sửa cấu hình lint/prettier trong lượt thực thi
này. Kết quả chạy thật (ghi lại tại đây, không tự xử):

```
$ npx eslint design
# Sau Task 1: 0 lỗi, 0 cảnh báo (đã sửa các catch(e) không dùng biến).
# Kết quả cuối cùng sau Task 3 — xem mục "Kết quả kiểm cuối" bên dưới.
```

**Đề xuất cho người dùng quyết định:** nếu `npx eslint design` báo lỗi không
tự sửa được trong phạm vi `design/` (vd. quy tắc dành riêng cho React/TSX),
cân nhắc thêm `design/**` vào `globalIgnores` của `eslint.config.mjs` và
`.prettierignore` — hai file này KHÔNG bị sửa trong lượt thực thi này.

### Kết quả kiểm cuối (Task 3)

- `node design/check.mjs --stage=3`: **OK** — đủ 24 file `.html`, không URL
  ngoài, không `type="module"`/`fetch`/`XMLHttpRequest`, không link nội bộ
  gãy (kể cả chuỗi `"*.html"` sinh trong `app.js`), `app.js`/`data.js` qua
  được `node --check`, `git status` chỉ có `design/` + `.planning/`.
- `npx eslint design`: **0 lỗi, 0 cảnh báo.**
- `npm run lint`: **thoát 0**, không in lỗi/cảnh báo nào cho `design/`.
- Đã đối chiếu bằng mắt (đọc mã nguồn, không có trình duyệt thật): mọi
  `<table class="kv-table">` được bọc trong `.kv-table-wrap{overflow-x:auto}`;
  mọi hàng công cụ dùng `kv-flex-wrap`/`kv-form-row` (flex-wrap); `kiem-ke.html`
  và `xuat-kho-chi-tiet.html` có nhánh mobile riêng (`kv-hide-lg`/`kv-only-lg`,
  `kv-qty-stepper` cao 44px). **Chưa mở bằng trình duyệt thật ở 375px/1280px**
  — cần người dùng tự kiểm một lượt trước khi coi là đạt (xem mục dưới).

## Trạng thái từng màn

| Màn | Có trong app thật | Ghi chú |
|---|---|---|
| Đăng nhập, Đổi mật khẩu, Không đủ quyền | Có | Khớp luồng auth hiện tại |
| Tổng quan | Có (route `/`) | Biểu đồ/stat là bố cục đề xuất, số liệu giả |
| Nhập kho (danh sách + chi tiết) | Có | Ghi sổ/hủy khớp `NHAP_LIEU → HOAN_THANH → DA_HUY` |
| Đặt hàng (danh sách + chi tiết) | Có | Stepper `TAM → DA_XAC_NHAN → HOAN_THANH` |
| Xuất kho (danh sách + chi tiết) | Có | Xuất âm bắt buộc chọn lý do trước khi ghi sổ |
| Trả hàng (danh sách + chi tiết) | Có | Chỉ tạo được từ chứng từ gốc đã ghi sổ |
| Mẫu in | Giả định — chưa có route `/…/in` thật | 3 loại: nhập, giao hàng, đi lấy hàng |
| Danh mục hàng, Đối tác | Có | Import Excel 3 bước là giả lập |
| **Tồn kho, Thẻ kho, Kiểm kê, Chuyển kho, Báo cáo** | **Chưa có** | Đề xuất Phase 5–6, chưa duyệt |
| Cài đặt | Có | Tab "Người dùng" chỉ Quản lý thấy |

## Phạm vi KHÔNG vẽ (đúng ranh giới v1)

Không có màn/ô nào cho: công nợ đối tác, quản lý lô/hạn dùng, hóa đơn điện tử,
theo dõi sản xuất/WIP. Đối tác chỉ có "Lịch sử giao dịch", không có số dư.
