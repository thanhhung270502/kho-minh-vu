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

Feature đã có sau Phase 2:

| Thư mục    | Phạm vi                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `xac-thuc` | đăng nhập bằng tên đăng nhập, đổi mật khẩu, người dùng hiện tại, chặn route theo phiên       |
| `danh-muc` | mã hàng, bộ lọc trên URL, thẻ kho, nhập/xuất Excel, công cụ rà dữ liệu                       |
| `doi-tac`  | NCC + khách hàng, rà ghi chú KiotViet, lịch sử giao dịch                                     |
| `cai-dat`  | người dùng & vai trò, kho, nhóm hàng/ĐVT/công đoạn, quy tắc đánh số chứng từ                 |

Hai quy ước riêng của dự án này:

- File đuôi `.server.ts` **chỉ** được import từ Server Component, Route Handler hoặc
  script. Chúng kéo theo `node:` (đọc Excel) — import nhầm vào Client Component là hỏng build.
- `src/shared/lib/quyen.ts` chỉ quyết **ẩn/hiện giao diện**. Chặn thật nằm ở RLS và ở các
  RPC `security definer`. Thêm quyền mới phải sửa migration trước, ma trận sau.

Chi tiết quy trình xem `CLAUDE.md` ở thư mục gốc.
