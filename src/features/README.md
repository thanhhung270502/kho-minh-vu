# Thư mục feature

Mỗi nghiệp vụ một thư mục. Khung chuẩn:

```
<ten-feature>/
  types.ts                  # kiểu dữ liệu suy ra từ src/types/database.types.ts
  schemas/<x>.schema.ts     # zod schema (nếu có form)
  api/<x>.api.ts            # hàm gọi Supabase thuần — không JSX, không hook
  api/<x>.keys.ts           # query key tập trung
  hooks/use<X>.ts           # bọc TanStack Query
  components/               # component chỉ dùng trong feature này
```

Quy tắc:

- Feature **không** import trực tiếp từ thư mục nội bộ của feature khác.
- Component chỉ dùng một chỗ thì để trong feature. Chỉ nâng lên `src/shared/`
  khi có ít nhất 2 feature dùng thật.
- Route trong `src/app/` chỉ gọi component của feature, không chứa logic.

Feature dự kiến theo luồng sản xuất:

| Thư mục      | Phạm vi                                                           |
| ------------ | ----------------------------------------------------------------- |
| `san-xuat`   | lệnh sản xuất, theo dõi lô qua công đoạn của 5 xưởng              |
| `kho`        | nhập/xuất/tồn 3 nhóm: nguyên vật liệu, phôi chờ xử lý, thành phẩm |
| `bao-cao`    | sản lượng, tỷ lệ phế phẩm, FTY, biến động tồn, xuất Excel         |
| `danh-muc`   | xưởng, công đoạn, sản phẩm, khuôn, máy ép, mã lỗi                 |
| `nguoi-dung` | đăng nhập, phân quyền theo xưởng                                  |

Chi tiết quy trình xem `CLAUDE.md` ở thư mục gốc.
