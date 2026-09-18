---
phase: 02-khung-ung-dung
plan: 14
status: complete
completed: 2026-09-18
requirements: [CDAT-01]
---

# Plan 02-14 — Cài đặt → Người dùng

## Đã làm

| File | Vai trò |
|---|---|
| `src/features/cai-dat/api/nguoi-dung.api.ts` | Một truy vấn kèm `nguoi_dung_kho(kho_id, kho:kho_id(...))`, kiểu suy bằng `QueryData` |
| `src/app/(app)/cai-dat/nguoi-dung/page.tsx` | Guard `cai_dat_nguoi_dung`, truyền id người đang đăng nhập |
| `src/features/cai-dat/components/bang-nguoi-dung.tsx` | Bảng + lọc client 3 trạng thái, menu Sửa / Đặt lại mật khẩu / Vô hiệu hóa |
| `src/features/cai-dat/components/ngan-keo-nguoi-dung.tsx` | Tạo/sửa; vai trò có mô tả từng dòng; ô Kho chỉ hiện với thủ kho |
| `src/features/cai-dat/components/hop-dat-lai-mat-khau.tsx` | Modal đặt lại, hiện lại mật khẩu có nút copy |
| `src/features/cai-dat/components/o-mat-khau-tam.tsx` | Ô mật khẩu tạm dùng chung: sinh ngẫu nhiên + sao chép |
| `src/features/cai-dat/schemas/nguoi-dung.schema.ts` | Tách `hoSoNguoiDungSchema` để form dùng lại luật vai trò/kho |

## Kiểm trên dữ liệu thật

Chạy đúng đường mà Server Action đi (admin tạo tài khoản Auth → quản lý gọi
`luu_ho_so_nguoi_dung` → thu hồi phiên):

```
quanly tạo hồ sơ thủ kho K2 → ok
vanphong sửa tài khoản → 42501 "Chỉ quản lý được sửa tài khoản"
thủ kho không kho → 23514 "Thủ kho phải được gán ít nhất một kho"
test.uat đăng nhập lần đầu → phải đổi mật khẩu: true, kho được gán: [K2]
đổi mật khẩu → da_doi_mat_khau() gỡ cờ: false
quản lý đổi K2 → K1 + thu hồi phiên → token mới thấy [K1]
vô hiệu hóa → đăng nhập lại: user_banned
số quản lý đang hoạt động: 1
```

`test.uat` để lại ở trạng thái **vô hiệu hóa** (không xóa), đúng D-32.
`npm run check` xanh.

## Quyết định khi thực thi

- **Tách `hoSoNguoiDungSchema`** khỏi `taoNguoiDungSchema`/`capNhatNguoiDungSchema`:
  form sửa không có `id` (id lấy từ dòng bảng) nên dùng thẳng `capNhatNguoiDungSchema`
  sẽ báo thiếu `id` và người dùng không hiểu lỗi ở đâu. Luật "thủ kho phải có kho" vẫn
  khai một chỗ duy nhất.
- **Mật khẩu tạm sinh bằng `crypto.getRandomValues`**, bảng chữ bỏ `0 O 1 l I` — mật khẩu
  này được đọc qua điện thoại cho nhau, ký tự dễ nhầm là lỗi thật chứ không phải chuyện nhỏ.
- **Tên đăng nhập không sửa được** khi đã tạo: nó là khóa đăng nhập (email nội bộ suy ra từ
  nó). Màn sửa hiện chữ tĩnh kèm hướng dẫn tạo tài khoản mới.
- **Đổi vai trò/kho hiện `notification` chứ không `message`**: câu giải thích về hiệu lực
  token (thu hẹp ngay / mở rộng tối đa 60 phút) dài hơn một dòng toast.
- **`useWatch` thay `watch()`** (lint `react-hooks/incompatible-library`), cùng cách plan 13.
- Lọc trạng thái làm ở client: danh sách chỉ vài chục dòng, thêm tham số server là thừa.

## Chưa làm

- Không có màn "tự đổi mật khẩu" ở đây — đã có `/doi-mat-khau` từ plan 10.
