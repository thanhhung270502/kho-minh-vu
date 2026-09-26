# Thiết lập Apps Script — lưu ảnh mã hàng trên Google Drive

## 1. Vì sao có thư mục này

Kho Minh Vũ chưa có kinh phí cho dịch vụ lưu trữ đám mây (Supabase Storage, S3, R2...),
nên ảnh mã hàng lưu trên **Google Drive** thông qua một **Apps Script web app** đóng vai
"storage adapter": phía Next.js gọi HTTP tới một URL cố định, Apps Script mới là nơi thật
sự chạm vào Drive.

Database (bảng `hinh_anh`) chỉ lưu `noi_luu` (hiện luôn là `GDRIVE`) và `khoa_luu`
(fileId trên Drive) — **không lưu URL Drive**. Giao diện chỉ biết gọi `/anh/<id>`, không
biết Drive tồn tại. Nếu sau này có kinh phí chuyển sang cloud thật, chỉ cần viết một
implementation `ImageStorage` mới (`src/features/images/lib/storage/`) và một script
migrate — không sửa component, không sửa schema `hinh_anh`.

## 2. Tạo tài khoản Google riêng cho hệ thống

Tạo một tài khoản Google mới dành riêng cho Kho Minh Vũ, ví dụ `kho.minhvu.anh@gmail.com`
— **không dùng Gmail cá nhân** của bất kỳ ai. Ảnh chỉ được xóa/di chuyển bởi Apps Script
chạy dưới danh nghĩa tài khoản này, tách bạch khỏi tài khoản cá nhân của nhân viên.

Dung lượng miễn phí 15 GB dùng chung Gmail/Drive/Photos là đủ: ~1.100 ảnh KiotViet sau
khi nén WebP chỉ chiếm vài trăm MB.

## 3. Bật Apps Script API

Đăng nhập tài khoản vừa tạo ở bước 2, mở
https://script.google.com/home/usersettings và bật **"Google Apps Script API"**. Thiếu
bước này thì `clasp login`/`clasp push` ở bước 4 sẽ báo lỗi quyền.

## 4. Đẩy code bằng clasp

Chạy từ **thư mục gốc repo** (không phải trong `apps-script/`):

```bash
npx @google/clasp@latest login            # đăng nhập bằng TÀI KHOẢN RIÊNG ở bước 2
cd apps-script
npx @google/clasp@latest create --type webapp --title "Kho Minh Vu - Anh" --rootDir .
git checkout -- appsscript.json           # clasp create ghi đè manifest — lấy lại bản trong repo
npx @google/clasp@latest push -f
```

`clasp create` sinh ra `.clasp.json` (chỉ chứa `scriptId`, không phải bí mật) — file này
commit được bình thường.

Không cài được `clasp` (máy không cho cài global, mạng công ty chặn...): mở
https://script.google.com, tạo project mới, dán nội dung `Code.gs` vào, rồi vào
**Project Settings** bật "Show appsscript.json manifest file" và dán nội dung
`appsscript.json` vào. Cách này chạy được nhưng mất tính "code sống trong repo" — nhớ
đồng bộ tay mỗi khi `Code.gs` trong repo đổi.

## 5. Đặt SECRET

Trong trình soạn thảo Apps Script: **Project Settings** → **Script Properties** →
**Add script property** → key `SECRET`, value sinh bằng:

```bash
openssl rand -base64 36
```

Giữ giá trị này lại — dùng ở bước 8.

## 6. Cấp quyền Drive lần đầu

Trong trình soạn thảo, chọn hàm `kiemTraThietLap` ở thanh chọn hàm phía trên, bấm
**Run**. Google sẽ hỏi xác nhận quyền truy cập Drive — đồng ý. Sau khi chạy xong, mở
**Execution log**: sẽ thấy link tới ba folder (`Kho Minh Vu - Anh`, `san-pham/goc`,
`san-pham/thumb`) và dòng báo SECRET đã đặt hay chưa.

## 7. Deploy

**Deploy** → **New deployment** → chọn loại **Web app** → điền:

- **Execute as:** Me (tài khoản riêng ở bước 2)
- **Who has access:** Anyone

Bấm **Deploy**, copy URL kết thúc bằng `/exec` — đây là `APPS_SCRIPT_URL`.

"Anyone" nghe có vẻ mở, nhưng vẫn an toàn: mọi request phải mang đúng `SECRET` (bước 5),
sai thì Apps Script trả `{"ok":false,"error":"forbidden"}` ngay từ `doPost`. File trên
Drive không hề bật chia sẻ công khai — chỉ tài khoản Google riêng (bước 2) đọc được.

## 8. Khai biến môi trường

Hai biến này **chỉ dùng ở server**, TUYỆT ĐỐI không thêm tiền tố `NEXT_PUBLIC_` — thêm
vào là lộ SECRET ra trình duyệt, mất quyền kiểm soát toàn bộ Drive lưu ảnh.

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
APPS_SCRIPT_SECRET=<giá trị bước 5>
```

Thêm vào `.env.local` (chạy local) **và** Vercel → Settings → Environment Variables
(cả Production lẫn Preview) → sau đó **Redeploy** để bản đang chạy đọc được giá trị mới.

## 9. Kiểm tra nhanh

```bash
curl -sL "$APPS_SCRIPT_URL"
# → {"ok":false,"error":"bad_request","message":"Chỉ nhận POST"}

curl -sL -X POST -H 'Content-Type: application/json' \
  -d '{"secret":"sai","action":"get","fileId":"x"}' "$APPS_SCRIPT_URL"
# → {"ok":false,"error":"forbidden","message":"Sai hoặc thiếu secret"}
```

Lưu ý cờ `-L`: Apps Script trả HTTP 302 chuyển hướng sang một URL
`googleusercontent.com` trước khi trả nội dung thật. `fetch()` của Node tự đi theo
redirect, nhưng `curl` cần `-L` mới thấy JSON.

## 10. Cập nhật code về sau

Mỗi khi sửa `Code.gs`/`appsscript.json` trong repo:

```bash
npx @google/clasp@latest push -f
```

Rồi vào trình soạn thảo Apps Script → **Deploy** → **Manage deployments** → bấm biểu
tượng bút chì trên deployment hiện có → **Version: New version** → **Deploy**.

**KHÔNG bấm "New deployment"** cho việc cập nhật thường — nó sinh ra một URL `/exec`
khác, buộc phải đổi lại `APPS_SCRIPT_URL` ở mọi nơi (bước 8). Chỉ dùng "New version" để
giữ nguyên URL.

## 11. Đổi SECRET (khi nghi bị lộ)

1. Đổi giá trị Script Property `SECRET` (bước 5).
2. Đổi `APPS_SCRIPT_SECRET` ở `.env.local` và Vercel (bước 8).
3. Redeploy ứng dụng Vercel.

Không cần deploy lại Apps Script — Script Properties đọc động mỗi request, không cần
"New version".

## 12. Hợp đồng JSON

Đây là hợp đồng cố định giữa Apps Script (`Code.gs`) và phía Next.js
(`src/features/images/lib/storage/gdrive-storage.server.ts`) — sửa một bên thì phải sửa
cả hai.

**Request** — `POST` body JSON, một trong ba dạng:

```json
{ "secret": "...", "action": "put", "folder": "san-pham/goc", "fileName": "MA01__uuid.webp", "mimeType": "image/webp", "base64Data": "..." }
{ "secret": "...", "action": "get", "fileId": "..." }
{ "secret": "...", "action": "remove", "fileId": "..." }
```

`folder` chỉ nhận `"san-pham/goc"` hoặc `"san-pham/thumb"`.

**Response** — LUÔN HTTP 200 (Apps Script không đặt được status tùy ý), JSON:

```json
{ "ok": true, "fileId": "..." }                          // put
{ "ok": true, "mimeType": "image/webp", "base64Data": "..." }  // get
{ "ok": true }                                            // remove
{ "ok": false, "error": "forbidden" | "bad_request" | "not_found" | "internal", "message": "..." }  // lỗi
```

