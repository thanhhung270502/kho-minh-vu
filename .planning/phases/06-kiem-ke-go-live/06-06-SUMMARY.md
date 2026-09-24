---
phase: 06-kiem-ke-go-live
plan: 06
subsystem: frontend
tags: [nextjs, antd, react-hook-form, per-user-permission]

# Dependency graph
requires:
  - phase: 06-kiem-ke-go-live
    provides: "nguoi_dung.xem_lich_su_kiotviet / duyet_kiem_ke, luu_ho_so_nguoi_dung 8 tham số (06-01, live từ 06-05)"
provides:
  - "CurrentUser.canViewKiotVietHistory / canApproveStocktake + requireKiotVietHistoryAccess()"
  - "UserDrawer có 2 công tắc quyền theo người; UserTable hiện nhãn tương ứng"
affects: [06-08, 06-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component tách riêng cho nhóm field per-user không thuộc PERMISSION_MATRIX (UserSpecialPermissions), generic theo Control<T extends {các field cần}> để tái dùng được ở form khác nếu cần"

key-files:
  created:
    - src/features/settings/components/user-special-permissions.tsx
  modified:
    - src/features/auth/api/current-user.server.ts
    - src/features/settings/schemas/user.schema.ts
    - src/features/settings/actions/user.actions.ts
    - src/features/settings/api/user.api.ts
    - src/features/settings/components/user-drawer.tsx
    - src/features/settings/components/user-table.tsx

key-decisions:
  - "resetPassword truyền lại giá trị CŨ của hai công tắc (đọc từ previous) thay vì dựa vào coalesce(null, cột_cũ) ngầm định của RPC — ghi rõ ý định tại call site"
  - "Tách nhóm 2 Checkbox ra UserSpecialPermissions riêng (thay vì giữ inline trong UserDrawer) vì UserDrawer đã 274 dòng trước khi bắt đầu — đúng ngưỡng CLAUDE.md Bước 6"
  - "UserTable thêm cột 'Quyền riêng' độc lập với cột Vai trò (không gộp) để không phải sửa logic render vai trò sẵn có"

requirements-completed: []  # DLIEU-07 đã Complete từ trước (06-04); KKE-04 vẫn Pending trong REQUIREMENTS.md — plan này chỉ dựng công tắc + CurrentUser, chưa có RPC duyet_phien_kiem_ke (thuộc plan khác trong Phase 6). KHÔNG đánh dấu KKE-04 hoàn thành ở đây.

# Metrics
duration: ~35min
completed: 2026-09-24
---

# Phase 6 Plan 06: Công tắc quyền theo người trong Cài đặt Summary

**Quản lý bật/tắt "Xem lịch sử KiotViet" và "Duyệt kiểm kê" cho từng người trong drawer Cài đặt → Người dùng, đọc/ghi qua `CurrentUser` mở rộng + `luu_ho_so_nguoi_dung` 8 tham số — không đi qua `PERMISSION_MATRIX`.**

## Performance

- **Duration:** ~35 phút
- **Tasks:** 2/2
- **Files modified:** 6 sửa, 1 mới

## Accomplishments

- `CurrentUser` có `canViewKiotVietHistory` / `canApproveStocktake`, tính từ `vai_tro === "quan_ly" || <cột>` — khớp helper SQL `xem_duoc_lich_su_kiotviet()`/`duyet_duoc_kiem_ke()` của 06-01.
- `requireKiotVietHistoryAccess()` mới — redirect `/dang-nhap` hoặc `/khong-du-quyen`, sẵn sàng cho route `06-08` (Lịch sử KiotViet).
- `userProfileSchema` thêm `viewKiotVietHistory`/`approveStocktake`; cả ba lời gọi RPC (`createUser`, `updateUser`, `resetPassword`) truyền đúng `p_xem_lich_su_kiotviet`/`p_duyet_kiem_ke`.
- `UserDrawer` có nhóm "Quyền riêng" (tách sang `UserSpecialPermissions` để giữ file dưới ngưỡng ~200 dòng theo CLAUDE.md Bước 6): 2 Checkbox, khóa + tick sẵn khi vai trò `quan_ly` (D-15), dòng ghi chú nói đúng "có hiệu lực ở lần tải trang kế tiếp, không cần đăng nhập lại".
- `UserTable` thêm cột "Quyền riêng" hiện `Tag` "LS KiotViet" / "Duyệt KK".

## Task Commits

1. **Task 1: CurrentUser, schema, Server Action truyền hai công tắc** - `028197a` (feat)
2. **Task 2: Hai ô công tắc trong UserDrawer + nhãn trong bảng người dùng** - `46fe979` (feat)

## Files Created/Modified

- `src/features/auth/api/current-user.server.ts` - CurrentUser mở rộng + `requireKiotVietHistoryAccess()`
- `src/features/settings/schemas/user.schema.ts` - `userProfileSchema` thêm 2 field boolean
- `src/features/settings/actions/user.actions.ts` - `readProfile` select thêm 2 cột; 3 lời gọi RPC truyền đúng tham số
- `src/features/settings/api/user.api.ts` - `userQuery` select thêm 2 cột
- `src/features/settings/components/user-drawer.tsx` - `UserFormValues`, `reset()`, `onSave` thêm 2 field; dùng `UserSpecialPermissions`
- `src/features/settings/components/user-special-permissions.tsx` (mới) - nhóm 2 Checkbox, khóa theo vai trò
- `src/features/settings/components/user-table.tsx` - cột "Quyền riêng"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — theo đúng plan, không phải phát hiện ngoài kế hoạch] Tách `UserSpecialPermissions` thành file riêng**
- **Found during:** Task 2
- **Vấn đề:** `user-drawer.tsx` đã 274 dòng trước khi thêm nhóm Checkbox mới (xác nhận đúng số dòng plan ghi ở `<read_first>`); thêm inline sẽ vượt xa ngưỡng ~200 dòng.
- **Khắc phục:** Plan đã lường trước trường hợp này ("Nếu file vượt ~200 dòng sau khi thêm, tách nhóm này ra `components/user-special-permissions.tsx`") — thực hiện đúng như plan chỉ định, không phải deviation tự phát sinh ngoài kế hoạch. Ghi lại ở đây để SUMMARY phản ánh đúng file thực tế được tạo.
- **Files modified:** `src/features/settings/components/user-special-permissions.tsx` (mới), `user-drawer.tsx`
- **Commit:** `46fe979`

Không có deviation nào khác — build/typecheck/lint xanh ngay từ lần chạy đầu sau khi viết đủ 2 task.

## Verification

- `npm run typecheck` — xanh (Task 1 và Task 2).
- `npm run lint` — xanh.
- `npm run build` — xanh, tất cả 31 route biên dịch thành công (không route nào lỗi do thay đổi này).
- `grep -c "p_duyet_kiem_ke" user.actions.ts` = 3, `grep -c "p_xem_lich_su_kiotviet"` = 3 (đúng cả ba lời gọi RPC).
- `grep -c "canViewKiotVietHistory\|canApproveStocktake" permissions.ts` = 0 (không lẫn vào `PERMISSION_MATRIX`, đúng D-13/D-14 thiết kế).
- `grep -c "export async function requireKiotVietHistoryAccess"` = 1.
- Không có `console.log`, `: any`, `@ts-ignore` mới trong diff.

**CHƯA kiểm trên trình duyệt** — theo ràng buộc của orchestrator (`<sequential_execution>`), executor này không khởi động dev server; việc kiểm UI thật (mở `/cai-dat/nguoi-dung` bằng `quanly`, mở drawer, tick/untick, lưu, mở lại, kiểm console không cảnh báo antd) để lại cho UAT cuối (`06-16`) hoặc người dùng kiểm tay. Ghi rõ ở đây để không bị coi là đã xác nhận nhưng thực ra chưa.

## Known Stubs

Không có — cả hai công tắc đọc/ghi thật qua RPC đã live trên cloud (06-05), không có dữ liệu giả/hardcode.

## Threat Flags

Không phát hiện bề mặt bảo mật mới ngoài `<threat_model>` của plan (T-06-34, T-06-35, T-06-36 — đã có disposition `mitigate`/`accept` sẵn trong PLAN.md).

## User Setup Required

- Cần mở trình duyệt kiểm tra UI thật theo acceptance criteria Task 2 (xem "Verification" ở trên) — chưa làm trong phiên executor này.
- `.env.local` vẫn còn vấn đề đã ghi nhận ở `06-01-SUMMARY.md`/`06-05-SUMMARY.md` (khối active trỏ sai project) — không liên quan trực tiếp plan này nhưng vẫn chặn `npm run dev` trên máy này.

## Next Phase Readiness

- `06-08` (route Lịch sử KiotViet) có thể dùng `requireKiotVietHistoryAccess()` ngay.
- `06-15` (nút duyệt kiểm kê) có thể đọc `user.canApproveStocktake` để disable nút, không cần thêm logic mới ở tầng CurrentUser.
- Đã xác nhận trong REQUIREMENTS.md: `DLIEU-07` đã `Complete` từ trước (06-04); `KKE-04` vẫn `Pending` — chờ RPC `duyet_phien_kiem_ke` ở plan Phase 6 khác trước khi đánh dấu hoàn thành.

---
*Phase: 06-kiem-ke-go-live*
*Completed: 2026-09-24*

## Self-Check: PASSED

- FOUND: src/features/auth/api/current-user.server.ts
- FOUND: src/features/settings/schemas/user.schema.ts
- FOUND: src/features/settings/actions/user.actions.ts
- FOUND: src/features/settings/api/user.api.ts
- FOUND: src/features/settings/components/user-drawer.tsx
- FOUND: src/features/settings/components/user-special-permissions.tsx
- FOUND: src/features/settings/components/user-table.tsx
- FOUND commit: 028197a
- FOUND commit: 46fe979
