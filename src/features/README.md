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

Feature dự kiến theo luồng xuất nhập tồn (D-37):

| Thư mục     | Phạm vi                                                        |
| ----------- | --------------------------------------------------------------- |
| `xac-thuc`  | đăng nhập bằng tên đăng nhập, chặn route theo phiên, phân quyền |
| `danh-muc`  | sản phẩm, mã hàng, nhóm hàng, ĐVT                               |
| `doi-tac`   | nhà cung cấp + khách hàng, lịch sử giao dịch                     |
| `cai-dat`   | người dùng & vai trò, kho, nhóm hàng/ĐVT, quy tắc đánh số chứng từ |

Chi tiết quy trình xem `CLAUDE.md` ở thư mục gốc.
