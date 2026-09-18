---
phase: 02-khung-ung-dung
plan: 13
status: complete
completed: 2026-09-18
requirements: [DTAC-01, DTAC-02]
---

# Plan 02-13 — Màn Đối tác: NCC và khách trong một bảng

## Đã làm

| File | Vai trò |
|---|---|
| `src/shared/components/ngan-keo-form.tsx` | Ngăn kéo form dùng chung (đối tác + danh mục): `size` thay `width`, footer Hủy/Lưu, chặn đóng khi đang lưu |
| `src/features/doi-tac/types.ts` | `DongDoiTac`, `ChiTietDoiTac`, `LoaiDoiTac`, nhãn + màu Tag, `BoLocDoiTac` |
| `src/features/doi-tac/schemas/doi-tac.schema.ts` | Zod: mã viết hoa, SĐT, email, ô trống → `null` |
| `src/features/doi-tac/api/doi-tac.keys.ts` | Query key tập trung |
| `src/features/doi-tac/api/doi-tac.api.ts` | `danh_sach_doi_tac`, `sinh_ma_doi_tac`, `lich_su_giao_dich_doi_tac`, đọc/ghi bộ lọc URL |
| `src/features/doi-tac/hooks/useDoiTac.ts` | 5 hook TanStack Query |
| `src/features/doi-tac/components/thanh-loc-doi-tac.tsx` | Ô tìm debounce 300ms, `Segmented` loại, `Select` trạng thái, nút Thêm |
| `src/features/doi-tac/components/bang-doi-tac.tsx` | Bảng phân trang server, 4 trạng thái qua `QueryState` |
| `src/features/doi-tac/components/ngan-keo-doi-tac.tsx` | Form tạo/sửa trong ngăn kéo, gợi ý mã theo loại |
| `src/app/(app)/doi-tac/page.tsx` | Server Component: `yeuCauQuyen("xem_danh_muc")`, truyền `coQuyenSua` |

## Kiểm trên dữ liệu thật

Chạy bằng phiên đăng nhập thật (anon client, chịu RLS) thay vì bấm tay — **không nhập
mật khẩu vào trình duyệt**, nên phần UAT giao diện để lại cho người dùng.

```
mã gợi ý KHACH: KH000001
tạo:  KH000001 / Test UAT plan 13
sửa SĐT rồi tìm "Test UAT" → 1 dòng, 0900000113
mã trùng → 23505  (form gắn lỗi vào ô Mã, không đổ toast)
thukho1 đọc: 5 dòng, không lỗi
thukho1 ghi → 42501 row-level security  (giao diện cũng ẩn nút Thêm/Sửa)
đã đặt đối tác test về ngừng hoạt động
```

Đối tác test **không xóa**, chỉ `dang_hoat_dong = false` (D-32).

`npm run check` xanh (typecheck + lint + build).

## Quyết định khi thực thi

- **`mask={{ closable: !dangLuu }}` thay cho `maskClosable`** — plan viết theo API v5;
  antd v6.6 (`node_modules/antd/es/drawer/Drawer.d.ts`) đã bỏ `maskClosable` sang
  `mask.closable`. Tiêu chí nghiệm thu ghi chuỗi cũ nên đây là sai lệch có chủ ý.
- **`useForm<DoiTacForm, undefined, DoiTacLuu>`** — schema có `transform` nên input và
  output khác kiểu; khai đủ 3 generic thì `handleSubmit` nhận thẳng giá trị đã chuyển,
  bỏ được ép kiểu `as unknown as`.
- **Đồng bộ ô tìm bằng cách chỉnh state trong lúc render**, không `useEffect` —
  lint `react-hooks/set-state-in-effect` chặn setState trong effect, và cách này cũng
  bớt một vòng render. Chỉ chạy khi từ khóa đổi từ bên ngoài (nút "Xóa bộ lọc", bấm back).
- **`useWatch` thay `watch("loai")`** — lint `react-hooks/incompatible-library` cảnh báo
  `watch()` không memo được.
- **Tách `thanh-loc-doi-tac.tsx`** để `bang-doi-tac.tsx` không vượt ~200 dòng.
- **Bọc `<Suspense>` quanh bảng** — `useSearchParams()` trong Client Component bắt buộc
  có ranh giới Suspense, không thì build chuyển cả trang sang render động kèm cảnh báo.
- Trang > 1 mà không còn dòng nào thì tự `router.replace` về trang 1 (Pitfall 4 trong RESEARCH).

## Chưa làm (đúng phạm vi plan)

- `/doi-tac/[id]` (chi tiết + lịch sử giao dịch) — plan 17. Cột Mã đã trỏ sẵn link.
- `/doi-tac/ra-ghi-chu` — plan 18. Nút đã có trên đầu trang cho người có quyền sửa.
