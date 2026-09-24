---
phase: 06-kiem-ke-go-live
plan: 05
subsystem: database
tags: [supabase, migration, pgtap, types]
requires: [06-01, 06-02, 06-03, 06-04]
provides: ["0063-0066 trên cloud kho-vu-tru", "database.types.ts có RPC/cột Phase 6"]
affects: [06-06, 06-07, 06-09, 06-13]
key-files:
  modified: [src/types/database.types.ts]
duration: ~20 min
completed: 2026-09-24
---

# Phase 6 Plan 05: Đẩy schema Phase 6 lên cloud — Summary

**Bốn migration 0063 → 0066 lên `kho-vu-tru` đúng thứ tự, md5 lịch sử khớp git; kiểu sinh lại; 34/34 file pgTAP ĐẠT (~510 assertion); verify:hook xanh.**

## Thực hiện (orchestrator chạy inline, không qua subagent)

Lý do chạy inline: `.env.local` đang bật khối trỏ project `rnpqgbuypmecxiatuulz` (không phân giải được);
`npm run db:push` / `db:types` sẽ đi nhầm đích. Người dùng xác nhận đích là `kho-vu-tru` (`phonzyruoalimgaovljm`)
và không sửa `.env.local`.

1. **Trước khi đẩy:** `schema_migrations` dừng ở `0062` — không phiên nào khác ghi. Không có md5 định nghĩa hàm
   dán trong migration để so; các định nghĩa được executor 06-01..06-04 đọc trực tiếp từ cloud cùng ngày và
   danh sách migration không đổi kể từ đó.
2. **Đẩy (pattern 12, qua client `pg` trong scratchpad, không `apply_migration`):** mỗi file một transaction —
   nguyên văn file (chuẩn hóa LF) + insert `supabase_migrations.schema_migrations (version, name, statements)`.

   | Version | Name | md5 statements[1] = md5 file |
   |---|---|---|
   | 0063 | cong_tac_quyen | ✓ f6e7ff14d15d7a1afbeb42f2d7cea45d |
   | 0064 | lich_su_kiotviet | ✓ d92b4d8ae3c048c4af19d10f7bd8af85 |
   | 0065 | kiem_ke_dem | ✓ 890c9175343a836141154e3115cc8fac |
   | 0066 | kiem_ke_duyet | ✓ 567a8858b0d79ab1f44437144c95dfcb |

3. **Kiểu:** MCP `generate_typescript_types` → `src/types/database.types.ts` (+225 dòng, không dòng nào bị xóa/đổi).
   Có `duyet_phien_kiem_ke`, `tra_cuu_lich_su_kiotviet`, `bang_dem_kiem_ke`, `xem_lich_su_kiotviet`, `pham_vi_nhom_hang`.
4. **Gọi thật dưới phiên người dùng (rollback):**
   - quản lý: `xem_duoc_lich_su_kiotviet()`=true, `duyet_duoc_kiem_ke()`=true (cột đều false — đúng D-15),
     `danh_sach_phien_kiem_ke()` 0 dòng, `tra_cuu_lich_su_kiotviet(p_kich_thuoc:=1)` 1 dòng, `the_kho_san_pham` chạy,
     `select count(*) from luu_tru_hoa_don_kiotviet` = 4.732.
   - thủ kho: cả hai công tắc false, SELECT thẳng `luu_tru_hoa_don_kiotviet` / `luu_tru_nhap_kiotviet` = 0 dòng (RLS).
   - Backfill: văn phòng 1/1 có `xem_lich_su_kiotviet = true`.
5. **`npm run typecheck`** xanh (sau `npm ci` — bản làm việc chưa có `node_modules`).
6. **pgTAP toàn bộ** (từng file trong transaction riêng, `finish(true)` → `DAT`, lỗi giữa chừng tính là KHÔNG):
   **34 DAT / 0 KHONG / 0 ERROR**, tổng `plan()` ≈ 510 (trước Phase 6: 380). File mới: 36 (19), 37 (22), 38 (41), 39 (48);
   file sửa: 33 (9), 42 (7).
7. **`npm run verify:hook`** chạy với biến môi trường của khối `kho-vu-tru` nạp tạm vào shell (dotenv không ghi đè):
   5/5 tài khoản nhận đúng `vai_tro`/`kho_id`.

## Deviations

- **[Rule 3 — Blocking] Chạy inline thay vì subagent** vì MCP chỉ có ở orchestrator và `.env.local` trỏ nhầm project.
- **[Rule 3] `npm ci`** — bản làm việc chưa có `node_modules`; cài đúng lockfile, không thêm gói.

## Việc cần người dùng

- `.env.local` vẫn bật khối `rnpqgbuypmecxiatuulz`. `npm run dev`, `db:push`, `seed:users` chạy trên máy này sẽ đi
  nhầm project cho tới khi đổi lại khối `phonzyruoalimgaovljm`.
