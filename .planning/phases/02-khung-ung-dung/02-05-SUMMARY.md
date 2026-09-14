---
phase: 02-khung-ung-dung
plan: 05
subsystem: auth
tags: [supabase-auth, nextjs-proxy, rbac, react-hook-form, zod, antd]

requires:
  - phase: 02-khung-ung-dung
    provides: "database.types.ts với bảng nguoi_dung, enum vai_tro (plan 01-04)"
provides:
  - "Đăng nhập bằng tên đăng nhập (quy đổi sang email nội bộ khominhvu.local)"
  - "proxy.ts chặn route nội bộ theo phiên, 401 JSON cho /api/*, chống open redirect"
  - "Ma trận quyền D-07 (coQuyen/NHAN_VAI_TRO) dùng chung cho menu và yeuCauQuyen()"
  - "AppShell theo vai trò: menu lọc theo quyền, header có họ tên/vai trò/đăng xuất"
  - "Xóa sạch route và chữ nghĩa phạm vi sản xuất/xưởng cũ (D-36)"
affects: [danh-muc, doi-tac, cai-dat, xac-thuc]

tech-stack:
  added: []
  patterns:
    - "Hàm thuần (chuan-hoa.ts, tiep-tuc.ts, quyen.ts) kiểm bằng node:assert qua tsx, không cần Next.js/database"
    - "yeuCauQuyen() ở Server Component chặn theo quyền, redirect /khong-du-quyen"
    - "Ma trận quyền chỉ quyết định ẩn/hiện UI — chặn thật nằm ở RLS"

key-files:
  created:
    - src/shared/lib/chuan-hoa.ts
    - src/shared/lib/tiep-tuc.ts
    - src/shared/lib/quyen.ts
    - scripts/kiem-tra-ham-thuan.ts
    - src/app/dang-nhap/page.tsx
    - src/features/xac-thuc/schemas/dang-nhap.schema.ts
    - src/features/xac-thuc/components/form-dang-nhap.tsx
    - src/features/xac-thuc/api/nguoi-dung-hien-tai.server.ts
    - src/shared/components/menu-tai-khoan.tsx
    - src/shared/components/khong-du-quyen.tsx
    - src/app/(app)/khong-du-quyen/page.tsx
    - src/app/(app)/doi-tac/page.tsx
    - src/app/(app)/cai-dat/page.tsx
  modified:
    - src/proxy.ts
    - src/shared/lib/errors.ts
    - src/app/(app)/layout.tsx
    - src/shared/components/app-shell.tsx
    - src/app/(app)/page.tsx
    - src/app/(app)/danh-muc/page.tsx
    - src/app/layout.tsx
    - src/providers/antd-theme.ts
    - src/features/README.md

key-decisions:
  - "Redirect trong proxy.ts chép cookie đã refresh từ response gốc sang response redirect (chuyenHuong helper) để không làm mất phiên vừa làm mới"
  - "layout.tsx (app) gọi signOut() + redirect ?loi=vo-hieu-hoa khi có phiên Supabase Auth nhưng hồ sơ nguoi_dung thiếu/bị khóa, tránh vòng lặp qua proxy"
  - "Tách MenuTaiKhoan khỏi AppShell để giữ mỗi file dưới ~200 dòng"

patterns-established:
  - "Server Component gọi yeuCauQuyen(quyen) đầu hàm để chặn quyền trước khi render (dùng ở cai-dat/page.tsx)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-07]

duration: ~55min
completed: 2026-09-14
---

# Phase 2 Plan 05: Khung ứng dụng thật đầu tiên Summary

**Đăng nhập bằng tên đăng nhập qua Supabase Auth, proxy chặn route + 401 JSON cho API, AppShell lọc menu theo ma trận quyền D-07, xóa sạch route/chữ nghĩa phạm vi "sản xuất" cũ.**

## Performance

- **Duration:** ~55 min (resume từ Task 1 đã dở dang)
- **Started:** 2026-09-14T04:00:00Z (ước tính, phiên trước bị ngắt giữa Task 1)
- **Completed:** 2026-09-14T05:19:06Z
- **Tasks:** 3/3
- **Files modified:** 25 (13 tạo mới, 12 sửa/xóa)

## Accomplishments
- Hàm thuần cho chuẩn hóa tên đăng nhập, chặn open redirect, và ma trận quyền — kiểm độc lập bằng `tsx` + `node:assert`, không cần Next.js hay database
- Luồng đăng nhập/đăng xuất hoàn chỉnh chạy được bằng tài khoản demo thật (đã xác minh qua curl với session Supabase thật)
- Route nội bộ bị chặn đúng chuẩn: HTML redirect kèm `tiep_tuc` cho trang, JSON 401 cho `/api/*`
- Menu và trang tuân thủ ma trận quyền D-07: `văn phòng` thấy mục Cài đặt, `thủ kho` bị chặn ở `/cai-dat` (redirect sang trang 403)
- Toàn bộ dấu vết phạm vi "sản xuất/xưởng" cũ đã xóa khỏi route và mã nguồn

## Task Commits

1. **Task 1: Hàm thuần — chuẩn hóa, tiep_tuc an toàn, ma trận quyền** - `032d785` (test)
2. **Task 2: Proxy chặn route + trang đăng nhập** - `df73964` (feat)
3. **Task 3: Khung app theo vai trò, đăng xuất, xóa route phạm vi cũ** - `52e7788` (feat)

_Ghi chú: Task 1 được executor trước bắt đầu (file đã tồn tại chưa commit khi phiên này khởi động); đã đối chiếu lại với action + acceptance criteria của plan, chạy đủ `npx tsx scripts/kiem-tra-ham-thuan.ts && npm run typecheck` trước khi commit — không cần sửa gì._

## Files Created/Modified

- `src/shared/lib/chuan-hoa.ts` — `boDau`, `chuanHoaTenDangNhap`, `tenDangNhapThanhEmail`
- `src/shared/lib/tiep-tuc.ts` — `tiepTucAnToan` chặn open redirect (D-35)
- `src/shared/lib/quyen.ts` — ma trận quyền D-07 (`coQuyen`, `NHAN_VAI_TRO`, `VaiTro`, `Quyen`)
- `scripts/kiem-tra-ham-thuan.ts` — kiểm hàm thuần bằng `node:assert`
- `src/proxy.ts` — chặn route theo phiên, 401 JSON cho API, chép cookie khi redirect
- `src/features/xac-thuc/schemas/dang-nhap.schema.ts` — Zod schema đăng nhập
- `src/features/xac-thuc/components/form-dang-nhap.tsx` — form RHF + Zod + antd, gọi `signInWithPassword`
- `src/app/dang-nhap/page.tsx` — trang đăng nhập (Server Component, bọc `Suspense`)
- `src/shared/lib/errors.ts` — thêm nhánh `invalid_credentials`/`user_banned`/`weak_password`; dọn chữ "xưởng"/"lô"
- `src/features/xac-thuc/api/nguoi-dung-hien-tai.server.ts` — `layNguoiDungHienTai`, `yeuCauQuyen`
- `src/app/(app)/layout.tsx` — đọc vai trò từ bảng, xử lý hồ sơ thiếu/bị khóa
- `src/shared/components/app-shell.tsx` — menu lọc theo quyền, layout Sider/Header/Content
- `src/shared/components/menu-tai-khoan.tsx` — Dropdown tài khoản + đăng xuất
- `src/shared/components/khong-du-quyen.tsx`, `src/app/(app)/khong-du-quyen/page.tsx` — trang 403
- `src/app/(app)/page.tsx`, `danh-muc/page.tsx`, `doi-tac/page.tsx`, `cai-dat/page.tsx` — placeholder `ChuaTrienKhai` theo scope mới; `cai-dat` gọi `yeuCauQuyen`
- Xóa `src/app/(app)/san-xuat/`, `bao-cao/`, `kho/`
- `src/app/layout.tsx`, `src/providers/antd-theme.ts`, `src/features/README.md` — dọn nốt chữ "sản xuất/xưởng" còn sót (ngoài `files_modified` của plan, xem Deviations)

## Decisions Made

- Redirect trong `proxy.ts` dùng helper `chuyenHuong()` chép cookie đã refresh từ `response` gốc sang response redirect — nếu không, cookie phiên vừa làm mới sẽ mất khi bị redirect ngay trong cùng request.
- `(app)/layout.tsx`: khi có Supabase Auth session nhưng không tìm thấy hồ sơ `nguoi_dung` hợp lệ (thiếu hoặc `dang_hoat_dong = false`), chủ động `signOut()` trước khi redirect `?loi=vo-hieu-hoa`, tránh vòng lặp redirect vô hạn qua proxy.
- Tách `MenuTaiKhoan` ra khỏi `AppShell` để mỗi file giữ dưới ~200 dòng (theo Bước 6 CLAUDE.md).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dọn nốt chữ "sản xuất"/"xưởng" ngoài danh sách `files_modified`**
- **Found during:** Task 3 — chạy `grep -rn "xưởng\|san-xuat\|Theo dõi sản xuất" src/` theo acceptance criteria
- **Issue:** `src/app/layout.tsx` (metadata title/description), `src/providers/antd-theme.ts` (comment), `src/features/README.md` (bảng feature dự kiến) còn nguyên chữ nghĩa/route phạm vi "sản xuất" cũ dù không nằm trong `files_modified` của plan — acceptance criteria của Task 3 kiểm tra grep trên toàn bộ `src/` nên đây là blocking issue, không phải out-of-scope
- **Fix:** Đổi metadata layout gốc thành "Kho Minh Vũ", sửa comment antd-theme.ts, cập nhật bảng feature trong README theo D-37 (`xac-thuc`, `danh-muc`, `doi-tac`, `cai-dat`)
- **Files modified:** `src/app/layout.tsx`, `src/providers/antd-theme.ts`, `src/features/README.md`
- **Verification:** `grep -rn "xưởng\|san-xuat\|Theo dõi sản xuất" src/` không còn kết quả; `npm run check` xanh
- **Committed in:** `52e7788` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cần thiết để acceptance criteria của Task 3 (grep toàn `src/`) đạt được đúng như plan yêu cầu. Không có scope creep — chỉ sửa chữ nghĩa/metadata, không đổi logic.

## Issues Encountered

- `npm run check` lần đầu báo lỗi typecheck do `.next/types/validator.ts` cache còn tham chiếu 3 route vừa xóa (`san-xuat`, `bao-cao`, `kho`) — không phải lỗi code, chỉ là artifact build cũ. Xóa `.next/` rồi chạy lại `npm run check` thì sạch (typecheck + lint + build đều exit 0).

## User Setup Required

None - không cần cấu hình dịch vụ ngoài nào.

## Manual Verification (Task 3)

Chạy `npm run dev`, dùng `curl` (không mở trình duyệt) và một script tạm dùng `@supabase/ssr` + tài khoản demo (`SEED_USER_PASSWORD` không in ra) để lấy cookie phiên thật, sau đó xóa script:

| Kiểm tra | Kết quả |
|---|---|
| GET `/danh-muc` ẩn danh | `307` → `location: /dang-nhap?tiep_tuc=%2Fdanh-muc` ✓ |
| GET `/api/anything` ẩn danh | `401` JSON `{"loai":"het-phien",...}` ✓ |
| GET `/danh-muc` với cookie `vanphong` (van_phong) | `200` ✓ |
| GET `/cai-dat` với cookie `vanphong` (có quyền `cai_dat_danh_muc_phu`) | `200` ✓ |
| GET `/cai-dat` với cookie `thukho1` (không có quyền) | `307` → `location: /khong-du-quyen` ✓ |
| GET `/danh-muc` với cookie `thukho1` | `200` ✓ |
| GET `/khong-du-quyen` với cookie `thukho1` | render "Tài khoản không có quyền mở trang này" ✓ |

Tất cả 3 luồng UAT trong plan (ẩn danh bị chặn, văn phòng thấy Cài đặt, thủ kho bị chặn ở Cài đặt) đã xác minh trực tiếp bằng session Supabase thật — không phải giả lập. Dev server đã dừng sau khi kiểm xong.

## Next Phase Readiness

- Khung xác thực + phân quyền UI sẵn sàng cho các plan tiếp theo xây `danh-muc`, `doi-tac`, `cai-dat` thật (thay `ChuaTrienKhai`)
- `/doi-mat-khau` (plan 10) và cột `phai_doi_mat_khau` (plan 09+) chưa làm — đúng như phạm vi plan này đã khoanh
- Không có blocker cho wave tiếp theo

---
*Phase: 02-khung-ung-dung*
*Completed: 2026-09-14*

## Self-Check: PASSED

All claimed files verified to exist on disk; all three task commits (032d785, df73964, 52e7788) verified present in git log.
