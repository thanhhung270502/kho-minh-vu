---
phase: 09-quan-ly-hinh-anh
plan: 13
subsystem: thiết lập Apps Script thật, kiểm chứng hệ thật, chép thử ảnh KiotViet, UAT trình duyệt
tags: [uat, apps-script, gdrive, cache, kiotviet]
dependency_graph:
  requires:
    - "09-01..09-12"
  provides:
    - "Apps Script web app chạy thật, APPS_SCRIPT_URL/SECRET trong .env.local (người dùng khai)"
    - "40 ảnh KiotViet đầu tiên đã chép lên Drive + hinh_anh"
  affects:
    - "ANH-06: phần chép toàn bộ chờ người dùng chạy"
key_files:
  created: []
  modified:
    - scripts/copy-kiotviet-images/index.ts
decisions:
  - "Người dùng chọn tự chạy phần chép toàn bộ sau (Task 4 hoãn): `npm run import:kiotviet-images -- --ghi`"
  - "curl -X POST -L giữ POST qua 302 của Apps Script → trang HTML lỗi; dùng --data (không -X) hoặc fetch của Node — Node fetch đã đúng, không phải lỗi code"
metrics:
  completed: "2026-09-26"
status: partial
---

# 09-13 — Thiết lập Apps Script + kiểm chứng hệ thật

## Task 1 — Người dùng thiết lập (xong)

Người dùng báo "xong". `grep` `.env.local` in `SETUP-OK` (có `APPS_SCRIPT_URL=…/exec` và `APPS_SCRIPT_SECRET`).
Việc khai biến trên Vercel: người dùng tự làm, chưa kiểm từ phía Claude.

## Task 2 — Kiểm chứng tự động trên hệ thật (xong)

| Bước | Kết quả |
|---|---|
| GET Apps Script không secret | `{"ok":false,"error":"bad_request","message":"Chỉ nhận POST"}` |
| POST sai secret | `{"ok":false,"error":"forbidden","message":"Sai hoặc thiếu secret"}` (curl `--data`, và Node `fetch`) |
| `npm run check` + test-pure-functions + test-image-storage + kiểm tĩnh ANH-05 | `AUTO-OK` |
| Dry-run S0 | 1.094 mã / 1.112 ảnh / 0 đã chép / **sẽ chép 1.112** |
| `--ghi --gioi-han 20` lần 1 | đã chép 20, bỏ qua trùng 0, link hỏng 0 — 46 giây |
| Dry-run lại | đã chép từ trước 20, sẽ chép 1.092 |
| `--ghi --gioi-han 20` lần 2 | chép 20 ảnh **kế tiếp**, không chép lại lô đầu |
| DB (`nguon_url is not null`, còn sống) | 40 ảnh / 40 mã / 40 ảnh chính |
| Ma trận quyền route (có ảnh thật) | **175/175 ô đúng** |
| Cache `/anh/<id>?co=nho` (cookie quanly) | lần 1 `Server-Timing: storage;dur=2678`, lần 2 `storage;dur=1`; gốc 2184 → 1 |
| `Cache-Control` | `private, max-age=31536000, immutable` |
| Không cookie | 401 |

Sửa thêm: `fix(anh)` dc66402 — script không còn in "đã chép hết" khi chạy với `--gioi-han`.

## Task 3 — UAT trình duyệt (Claude tự kiểm trên localhost; còn thiếu thiết bị thật)

Đã kiểm (tài khoản quanly, Apps Script thật, console không lỗi ứng dụng / không cảnh báo antd):

1. `/danh-muc?anh=co` → "Tổng cộng — 40 mã", 40/40 thumbnail tải, 0 ảnh vỡ.
2. Xem lại bảng lần hai: 0 request `/anh`, ảnh hiện ngay khi dòng có (≈1 s, do RPC).
3. Chi tiết mã `11363KWN900`: ảnh KiotViet gắn "Ảnh chính".
4. Upload PNG 1600×1000 qua ô "Chọn ảnh" → nén WebP (gốc 6,6 KB, thumb 300×188, 1,8 KB), hiện sau ~10 s, hàng đợi báo "Xong".
5. "Đặt làm ảnh chính" cho ảnh mới → lên đầu, nhãn "Ảnh chính".
6. Xóa ảnh chính → hộp xác nhận "Ảnh chính bị xóa thì ảnh kế tiếp tự lên thay." → ảnh cũ lên lại làm chính; DB `xoa_luc` có giá trị; `/anh/<id đã xóa>` → 404.
7. Bấm thumbnail → lớp phóng to mở ảnh gốc `/anh/<id>` (không `?co=nho`).
8. Sửa hai lỗi giao diện thấy khi kiểm (d102d35 nhãn tổng cộng trải qua cột Ảnh; 2cba107 lọc ảnh tính là đang lọc).

**Chưa kiểm — cần người dùng:**
- Nút "Chụp ảnh" trên **điện thoại thật** (camera, `capture="environment"`), đặc biệt ảnh HEIC từ iPhone phải được iOS tự chuyển sang JPEG nhờ `accept="image/jpeg,image/png,image/webp"`.
- Tài khoản thủ kho/chỉ xem không thấy nút thêm/xóa trên giao diện (ma trận quyền đã chứng minh route chặn 403).
- Bản production trên Vercel (biến môi trường đã khai, redeploy).

## Task 4 — Chép toàn bộ (hoãn theo lựa chọn người dùng)

Còn **1.072 ảnh**. Người dùng tự chạy:

```bash
npm run import:kiotviet-images -- --ghi
```

Sau đó chạy dry-run (bỏ `--ghi`) — "Sẽ chép lần này" phải bằng 0 (trừ link hỏng đã liệt kê).
Ước tính ~40 phút ở mức song song mặc định 3.

## Self-Check

- `.env.local` có hai biến Apps Script: PASS
- AUTO-OK: PASS
- 175/175 quyền route: PASS
- Commit dc66402 tồn tại: PASS
