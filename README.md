# Hệ thống theo dõi sản xuất & tồn kho

Theo dõi lô hàng đi qua 5 xưởng (ép nhựa, sơn, carbon, xi mạ, đóng gói) và quản
lý tồn kho nguyên vật liệu, bán thành phẩm/phôi chờ xử lý, thành phẩm.

## Chạy lần đầu

```bash
npm install
cp .env.example .env.local     # rồi điền URL và anon key của Supabase
npm run dev                    # http://localhost:3000
```

Lấy `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` tại
Supabase Dashboard → Project Settings → API.

Thiếu biến môi trường thì ứng dụng báo lỗi ngay lúc khởi động kèm hướng dẫn,
không chạy tiếp với cấu hình sai.

## Lệnh

| Lệnh               | Việc                                            |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | chạy local                                      |
| `npm run check`    | typecheck + lint + build, chạy trước khi commit |
| `npm run db:types` | sinh lại TypeScript types từ schema Supabase    |
| `npm run format`   | định dạng lại code                              |

## Cấu trúc

```
src/
  app/(app)/        route và layout — mỏng, chỉ gọi component của feature
  features/         nghiệp vụ, mỗi thư mục một feature (xem features/README.md)
  shared/           component và tiện ích dùng chung từ 2 feature trở lên
  lib/supabase/     client cho trình duyệt, server và proxy
  providers/        antd + TanStack Query + theme
  types/            database.types.ts sinh tự động, không sửa tay
  proxy.ts          làm mới phiên đăng nhập trên mỗi request
```

## Công nghệ

Next.js 16 (App Router) · Ant Design v6 · Tailwind v4 · TanStack Query v5 ·
Supabase (Postgres + Auth + RLS) · React Hook Form + Zod · Recharts · exceljs

Quy ước viết code và các bẫy đã gặp: xem [`CLAUDE.md`](./CLAUDE.md).
