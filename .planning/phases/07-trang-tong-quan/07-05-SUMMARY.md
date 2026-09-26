---
phase: 07-trang-tong-quan
plan: 05
subsystem: database
tags: [supabase, migration, mcp, pgtap, typegen]
requires: [07-01, 07-02, 07-03]
provides: ["0069-0071 trên cloud phonzyruoalimgaovljm", "database.types.ts có bao_cao_xuat_am, ton_theo_nhom, nhip_ban"]
affects: [07-06, 07-07, 07-08, 07-09]
key-files:
  modified: [src/types/database.types.ts]
key-decisions:
  - "Đánh số lại migration Phase 7 thành 0069-0071 vì cloud đã có 0068_hinh_anh (Phase 9, áp từ phiên khác, chưa có trong repo)"
  - "Đẩy bằng MCP execute_sql + ghi schema_migrations + md5 (pattern 12), không dùng npm db:* vì .env.local trỏ project sai"
requirements-completed: []
duration: 25min
completed: 2026-09-26
---

# 07-05: Đẩy 0069-0071 lên cloud, sinh lại kiểu

Orchestrator làm inline (agent con không có Supabase MCP).

## Xác minh đích

| Nguồn | 4 ký tự đầu ref |
|---|---|
| `.env.local` NEXT_PUBLIC_SUPABASE_URL | `rnpq` (SAI) |
| `.env.local` SUPABASE_PROJECT_ID | `rnpq` (SAI) |
| `supabase/.temp/project-ref` | không có file |

→ Cấm `npm run db:push/db:types/db:test:linked`. Dùng MCP với `project_id = phonzyruoalimgaovljm`.

## Migration

- Trước: remote dừng ở `0068` (`hinh_anh`, md5 `6c87d74a…`) — KHÔNG có trong repo. `danh_sach_ton_kho` đang chạy vẫn chứa điều kiện 0067.
- Sau:

| version | name | md5 cloud = md5 file (LF) |
|---|---|---|
| 0069 | bao_cao_xuat_am | a6a7d0411616ff6146f5b54641520ee4 ✓ |
| 0070 | ton_theo_nhom | fc7a04da0c856aee3b79ae177a01143d ✓ |
| 0071 | nhip_ban | c2d0116aa9465225be98fafa2c78989c ✓ |

## Kiểu

`generate_typescript_types` → `src/types/database.types.ts`: +161 dòng, 0 dòng xóa. Gồm ba RPC mới và bảng
`hinh_anh` + tham số `p_co_anh` của `danh_sach_san_pham` (từ 0068 của phiên khác — kiểu phản ánh database thật).
`npm run typecheck` xanh.

## Gọi thật (rollback)

Dưới quanly: `bao_cao_xuat_am()` hôm nay 0 dòng · `ton_theo_nhom('nhom')` 90 dòng, tổng 3.266 mã ·
`ton_theo_nhom('cong_doan', null)` 6 dòng · `nhip_ban()` 2 dòng (0/0/0 — chưa go-live). Dưới vanphong:
`bao_cao_xuat_am()` → 42501 ✓. Không lỗi 42702.

## pgTAP

| File | Kết quả | Cách chạy |
|---|---|---|
| 92_bao_cao_xuat_am_test | 18/18 | MCP, migration + test trong transaction ép rollback (trước khi đẩy) |
| 93_ton_theo_nhom_test | 24/24 (gồm 3 phép đối chiếu chéo mọi nhóm/công đoạn thật với danh_sach_ton_kho) | như trên |
| 94_nhip_ban_test | 14/14 | MCP trên hàm đã đẩy, rollback |

Chạy thử bắt được 4 lỗi test mà kiểm tĩnh bỏ sót (commit 67bd655): `throws_ok` 3 tham số hiểu tham số 3 là
nội dung lỗi; literal trong `union all` bị suy ra text (42804 với enum/date/uuid); `sum(bigint)` ra numeric.

**Chưa chạy lại** các file pgTAP cũ (trước Phase 7): không có CLI đúng project, MCP phải dán tay từng file.
Phase 7 chỉ TẠO ba hàm mới, không sửa đối tượng cũ nào, nên không thể làm đỏ test cũ. Rủi ro còn lại đến từ
0068_hinh_anh (drop/create lại `danh_sach_san_pham`) của phiên khác — nằm ngoài Phase 7.

## Deviations

- Đánh số lại 0068-0070 → 0069-0071 (người dùng chọn), commit 0cd865b.
- Không chạy toàn bộ suite cũ (lý do ở trên).
