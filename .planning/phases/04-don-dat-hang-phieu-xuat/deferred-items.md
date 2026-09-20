# Deferred items — Phase 4

Phát hiện khi thực thi 04-15 (đối chiếu `find "src/app/(app)" -name "page.tsx"` với
`MA_TRAN` trong `scripts/test-route-permissions.ts`). Ngoài phạm vi 04-15 — không phải
route do Phase 4 tạo ra, gọi `requirePermission()` từ trước (Phase 2), việc thêm dòng
ma trận cho các route này đòi phải xác nhận lại đúng kỳ vọng quyền cho cả 5 "vai trò"
(kể cả khách chưa đăng nhập), việc đó không nằm trong `files_modified`/mục tiêu của
04-15. Không tự sửa — chỉ ghi lại để phase sau (hoặc một quick task) xử lý.

## Route thiếu dòng trong `MA_TRAN` (đã có sẵn từ Phase 2, không phải Phase 4)

| Route | `requirePermission` | Ghi chú |
|---|---|---|
| `/cai-dat/cong-doan` | `manage-lookups` | thêm ở 02-15 (`cf24d21`) |
| `/cai-dat/don-vi-tinh` | `manage-lookups` | thêm ở 02-15 (`cf24d21`) |
| `/cai-dat/kho` | `manage-warehouses` | thêm ở 02-15 (`cf24d21`) |
| `/danh-muc/[id]` | `view-catalog` | thêm ở 02-17 (`5d9d9c3`) |
| `/doi-tac/[id]` | `view-catalog` | thêm ở 02-17 (`5d9d9c3`) |

`/khong-du-quyen` **không phải** một gap — trang không gọi `requirePermission()` (đích
đến của mọi redirect "không đủ quyền", không có dữ liệu để lộ), nên không cần một dòng
ma trận.

## Đề xuất xử lý

Thêm năm dòng trên vào `MA_TRAN` (mẫu `AI_CUNG_XEM` cho `/danh-muc/[id]` và
`/doi-tac/[id]` — cùng quyền `view-catalog` với `/danh-muc`, `/doi-tac`; riêng ba route
`/cai-dat/*` cần đối chiếu lại đúng bảng quyền của `manage-lookups`/`manage-warehouses`
đã dùng cho `/cai-dat/nhom-hang`, `/cai-dat/so-chung-tu` trong chính file này). Ước
lượng 15–20 phút, không cần migration hay đổi code sản phẩm.
