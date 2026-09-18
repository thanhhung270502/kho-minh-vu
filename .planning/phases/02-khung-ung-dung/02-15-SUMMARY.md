---
phase: 02-khung-ung-dung
plan: 15
status: complete
completed: 2026-09-18
requirements: [CDAT-02, CDAT-03, CDAT-04]
---

# Plan 02-15 — Cài đặt: kho, danh mục phụ, số chứng từ

## Đã làm

| File | Vai trò |
|---|---|
| `supabase/migrations/0040_danh_muc_phu.sql` | 3 policy DELETE, trigger khóa mã hệ thống, check nhóm không tự làm cha |
| `supabase/tests/63_danh_muc_phu_test.sql` | 6 assertion, xanh |
| `src/app/(app)/cai-dat/layout.tsx` | Guard `cai_dat_danh_muc_phu` + tab |
| `src/app/(app)/cai-dat/page.tsx` | Chuyển thẳng tới tab đầu tiên người dùng có quyền |
| `src/features/cai-dat/components/tab-cai-dat.tsx` | 6 tab lọc theo `coQuyen`, sáng đúng tab khi ở trang con |
| `src/features/cai-dat/api/danh-muc-phu.api.ts` | `CAU_HINH_DANH_MUC_PHU` cho 4 bảng, CRUD kiểm `count` |
| `src/features/cai-dat/hooks/useDanhMucPhu.ts` | Query + mutation, invalidate cả cụm `["danh-muc-phu"]` |
| `src/features/cai-dat/components/danh-muc-phu.tsx` | Một bảng dùng cho cả 4 màn, Popconfirm xóa, dịch 23503/23514 |
| `src/features/cai-dat/components/ngan-keo-danh-muc-phu.tsx` | Form theo cấu hình (nhóm cha / màu / địa chỉ / trạng thái) |
| `src/app/(app)/cai-dat/{kho,nhom-hang,don-vi-tinh,cong-doan}/page.tsx` | 4 trang mỏng, mỗi trang tự gác quyền |
| `src/features/cai-dat/api/so-chung-tu.api.ts` | RPC cấu hình + công thức ví dụ số kế tiếp |
| `src/features/cai-dat/components/cau-hinh-so-ct.tsx` | Bảng 7 loại, sửa tại chỗ, lưu từng dòng |
| `src/app/(app)/cai-dat/so-chung-tu/page.tsx` | Guard `cai_dat_so_chung_tu` |

## Kiểm trên dữ liệu thật

pgTAP 63 (cloud) — 6/6 xanh:

```
ok 1 văn phòng xóa được ĐVT chưa dùng
ok 2 không xóa được ĐVT hệ thống
ok 3 không đổi mã công đoạn hệ thống
ok 4 đổi TÊN công đoạn hệ thống vẫn được
ok 5 xóa nhóm đang có mã hàng dùng bị khóa ngoại chặn
ok 6 thủ kho không xóa được nhóm hàng trống
```

Chạy thêm bằng phiên đăng nhập thật của 3 vai trò:

```
vanphong tạo/sửa/xóa ĐVT → ok, count 1
đổi mã CAI → 23514 "Mã CAI là mã hệ thống…"
xóa công đoạn SON → 23514
thukho1 xóa nhóm → KHÔNG lỗi, count 0   ← lý do phải đếm
7 cấu hình số: PN26-000001 … DC26-000001
vanphong sửa số chứng từ → KHÔNG lỗi, count 0
quanly sửa số chữ số → ok count 1; tiền tố trùng → 23505
```

`npm run check` xanh. `npm run db:types` không sinh khác biệt (0040 chỉ thêm policy,
trigger đã revoke và check constraint).

## Quyết định khi thực thi

- **`delete`/`update` luôn dùng `{ count: "exact" }`** ở cả danh mục phụ và số chứng từ.
  Thiếu policy khớp thì PostgREST **không báo lỗi**, chỉ trả 0 dòng — giao diện sẽ báo
  "đã xóa/đã lưu" trong khi dữ liệu còn nguyên. Hai lần đo ở trên chứng minh ca này có thật.
- **Một mặt cắt kiểu hẹp cho `.from(bang)`** trong `danh-muc-phu.api.ts`: bốn bảng shape khác
  nhau nên supabase-js chốt kiểu vào bảng đầu của union rồi báo lỗi cột. Ép kiểu gói gọn
  trong một hàm, cột đọc ra khai tường minh, không có `any` lọt ra ngoài file.
- **Bỏ ý định đếm "N mã hàng đang dùng" cho mỗi dòng** — sẽ phải quét 3.266 dòng `san_pham`
  mỗi lần mở màn. Thay bằng dịch lỗi `23503` lúc xóa thành câu tiếng Việt chỉ rõ việc phải làm.
- **Trang `/cai-dat` chỉ redirect** tới tab đầu tiên có quyền, không có nội dung riêng.
- **Nút Xóa ẩn với mã hệ thống**, nhưng chặn thật nằm ở trigger 0040 — ẩn nút chỉ để đỡ bực.

## Bẫy đã gặp khi viết test

Gọi `pg_temp.sp_test(...)` ngay trong `WHERE` của `UPDATE`: dòng vừa chèn nằm **ngoài
snapshot** của chính câu lệnh đó nên update 0 dòng, im lặng, và test khóa ngoại "pass"
sai. Phải tách thành hai câu lệnh (`create temp table … as select sp_test(...)`).

## Chưa làm (đúng phạm vi plan)

- Tab "Người dùng" — plan 14. Vào tab đó bây giờ sẽ 404.
