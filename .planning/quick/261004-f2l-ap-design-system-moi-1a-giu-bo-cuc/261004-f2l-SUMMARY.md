---
quick_id: 261004-f2l
status: complete
commits: [1400830, 6e086ab, 41378f2]
---

# Quick 261004-f2l — Áp design system 1A, giữ bố cục

Nguồn tham khảo: artifact https://claude.ai/artifact/QaWzNG6HWaQUqbHjh6mfyu
("Kho Minh Vu 1A"). Chỉ lấy token và cách trình bày; bố cục mọi màn giữ nguyên.

## Đã làm

| Task | Commit | Nội dung |
|---|---|---|
| 1 Token | 1400830 | `antd-theme.ts` viết lại (primary #0A0A0A, viền #EBEBEB/#E5E5E5, header bảng #FCFCFC, bỏ bóng); `globals.css` giữ tên biến, đổi giá trị (`brand-*` thành thang mực), thêm màu báo hiệu `canh-bao`/`nguy-hiem`, header bảng chữ hoa, `kbd`; font Be Vietnam Pro + JetBrains Mono; `design-tokens.ts` đơn sắc |
| 2 Vỏ app | 6e086ab | Nav ngang nền trắng, mục chọn khối đen; logo ô "MV"; tài khoản avatar chữ tắt + tên + vai trò; thẻ lọc/bảng/panel chi tiết/hàng nhập dòng: viền thay bóng; tiêu đề trang 26px/600 |
| 3 Trạng thái | 41378f2 | `StatusDot` (dot/badge, `strike`) + `StatusTone`; `DOC/ORDER/SESSION_STATUS_COLORS` → `*_TONES`; 11 chỗ Tag trạng thái → StatusDot; bỏ `RECEIPT_SOURCE_COLORS`, `PARTNER_KIND_COLORS` (chip xám); Đang dùng/Ngừng, Đang kinh doanh, Đã giao đủ → chấm |

## Giả định
- Giữ icon trong thanh nav (design không có) vì yêu cầu là giữ bố cục.
- Tag phân loại (nguồn, loại đối tác) về chip xám — màu chỉ để báo hiệu.
- Tag cảnh báo (đỏ/cam: Lệch lớn, Cần đếm lại, Ngừng kinh doanh…) và màu
  công đoạn do người dùng cấu hình giữ nguyên — đó là tín hiệu/dữ liệu.
- Biểu đồ phân tích (`cover-chart`, `sales-pace-chart`) chưa đổi màu.

## Kiểm tra
- `npm run check` xanh (typecheck + lint + build).
- Trang `/dang-nhap` render đúng theme mới, console sạch.
- **Chưa** xem được màn bên trong: `.env.local` đang trỏ Supabase cloud
  production (rnpq) — không tự đăng nhập tài khoản demo lên đó.
