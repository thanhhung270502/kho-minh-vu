---
phase: 09-quan-ly-hinh-anh
plan: 01
subsystem: database
tags: [postgres, rls, rpc, pgtap, hinh-anh]
dependency_graph:
  requires: []
  provides:
    - "public.hinh_anh (bảng)"
    - "public.them_anh / public.nap_anh_kiotviet / public.dat_anh_chinh / public.xoa_anh / public.lay_khoa_anh"
    - "public.danh_sach_san_pham(..., p_co_anh)"
  affects:
    - "supabase/migrations (chuỗi migration, đến 0068)"
    - "danh_sach_san_pham (chữ ký đổi từ 11 sang 12 tham số)"
tech_stack:
  added: []
  patterns:
    - "RPC SECURITY DEFINER tự kiểm vai trò thay cho RLS ghi (policy SELECT lọc xoa_luc is null làm UPDATE xóa mềm bị RLS từ chối)"
    - "pg_advisory_xact_lock theo san_pham_id để tránh đua khi quyết ảnh chính"
    - "drop + create (không create or replace) khi đổi chữ ký RPC PostgREST để tránh PGRST203"
key_files:
  created:
    - supabase/tests/43_hinh_anh_test.sql
    - supabase/migrations/0068_hinh_anh.sql
  modified: []
decisions:
  - "dat_anh_chinh dùng HAI câu UPDATE tách rời (tắt ảnh chính cũ trước, bật ảnh mới sau) — gộp một câu sẽ vỡ unique index tùy thứ tự quét dòng"
  - "Casing 'set search_path' hạ về chữ thường cho cả danh_sach_san_pham (khác 0030/0067 dùng SET...TO in hoa) để khớp gate tự động đếm case-sensitive của chính plan — không đổi hành vi"
metrics:
  duration: "~45 phút"
  completed: "2026-09-26"
---

# Phase 9 Plan 01: Tầng database ảnh mã hàng Summary

Bảng `hinh_anh` (D-04, không lưu URL) + 6 RPC SECURITY DEFINER (thêm/đọc khóa/đặt ảnh chính/xóa mềm/nạp KiotViet) + bộ lọc `p_co_anh` trên `danh_sach_san_pham`, đi kèm pgTAP 31 assertion — chưa đẩy lên cloud.

## Bối cảnh worktree

Worktree bắt đầu ở commit `93056b9` (Phase 5), KHÔNG có thư mục
`.planning/phases/09-quan-ly-hinh-anh/` — các plan Phase 9 nằm ở các commit
mới hơn trên `main` (`fc15131`..`a297929`) chưa được merge vào nhánh worktree.
Đã `git merge main --ff-only` trước khi đọc plan (working tree sạch, merge-base
đúng bằng HEAD cũ nên fast-forward an toàn, không mất commit nào của worktree).

## Đã làm

**Task 1 — pgTAP 43 (RED, TDD):** `supabase/tests/43_hinh_anh_test.sql`, 31
assertion (đếm lại sau khi viết — nhiều hơn số 24 hành vi mô tả trong plan vì
một số hành vi tách thành 2-3 assertion riêng, ví dụ item 5 "trả false + thu_tu
=1" là 2 lệnh `is()`). Phủ: bảng tồn tại + RLS bật + không cột URL; thủ
kho/chỉ xem bị chặn ghi (42501) ở cả RPC lẫn insert trực tiếp; mọi vai trò đọc
được ảnh còn sống nhưng không đọc thẳng `khoa_luu`; `lay_khoa_anh` cho người
đăng nhập, `anon` bị chặn; đặt ảnh chính đổi đúng 1 dòng; xóa ảnh chính chuyển
sang ảnh kế tiếp theo `thu_tu`; xóa ảnh đã xóa báo `P0002`; xóa mềm giữ dòng
với `xoa_luc`; unique index chặn 2 ảnh chính; `nap_anh_kiotviet` chỉ
`service_role`, idempotent theo `nguon_url` (`23505` khi trùng); bộ lọc
`p_co_anh` true/false/null trên `danh_sach_san_pham`; đúng 1 overload của hàm
đó. File cố ý ĐỎ (migration 0068 chưa tồn tại lúc viết) — chạy thật là việc
của plan 09-05.

**Task 2 — Migration `0068_hinh_anh.sql`:**
- Bảng `hinh_anh`: `noi_luu` (text + check GDRIVE/SUPABASE/R2, không enum —
  tránh sinh chuỗi cứng vào `database.types.ts`), `khoa_luu`/`khoa_luu_thumb`,
  `la_anh_chinh`, `thu_tu`, `nguon_url` (chỉ để idempotent chép KiotViet),
  `xoa_luc`/`nguoi_xoa_id` (xóa mềm), 3 index (partial unique cho ảnh chính,
  partial unique cho `nguon_url`, index tra cứu theo mã + thứ tự), trigger
  `updated_at`.
- RLS: chỉ 1 policy SELECT (`xoa_luc is null`), KHÔNG có policy
  INSERT/UPDATE/DELETE — lý do ghi trong header migration: policy SELECT lọc
  `xoa_luc is null` sẽ khiến UPDATE xóa mềm (đổi `xoa_luc` từ null sang giá
  trị) bị chính RLS từ chối vì dòng SAU khi ghi không còn thỏa điều kiện.
  `grant select` chỉ 5 cột, KHÔNG có `khoa_luu`/`khoa_luu_thumb`.
- 6 hàm SECURITY DEFINER, `search_path = ''`: `_chen_anh` (nội bộ, dùng chung
  cho `them_anh`/`nap_anh_kiotviet`, khóa bằng `pg_advisory_xact_lock`),
  `them_anh` (quan_ly/van_phong), `nap_anh_kiotviet` (chỉ `service_role`),
  `dat_anh_chinh` (2 UPDATE tách rời — xem Decisions), `xoa_anh` (xóa mềm +
  chuyển ảnh chính kế tiếp, trả khóa lưu để route dọn file Drive),
  `lay_khoa_anh` (đường đọc khóa duy nhất, cho mọi vai trò đã đăng nhập).
- `danh_sach_san_pham`: `drop function (...)` chữ ký 11 tham số cũ rồi
  `create function (...)` chữ ký 12 tham số (thêm `p_co_anh`) — không dùng
  `create or replace` vì Postgres/PostgREST coi đó là overload mới
  (PGRST203). Thân hàm chép nguyên văn từ `0067`, chỉ thêm một điều kiện lọc
  `exists (...)` vào CTE `loc`.
- Khối `DO` tự kiểm cuối file: đúng 1 overload `danh_sach_san_pham`, cả 7 hàm
  khóa `search_path`, `anon` không có quyền gọi `them_anh`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree thiếu commit Phase 9 planning, phải merge trước khi đọc plan**
- Found during: bước đọc file (`files_to_read`)
- Issue: `.planning/phases/09-quan-ly-hinh-anh/` không tồn tại trên nhánh worktree dù đã được liệt kê trong prompt — nhánh tạo từ commit cũ hơn commit chứa các plan Phase 9.
- Fix: `git merge main --ff-only` (working tree sạch, đúng fast-forward, không mất commit local nào của worktree — worktree chưa có commit riêng nào lúc đó).
- Files modified: không có file nội dung nào, chỉ cập nhật HEAD của nhánh worktree.
- Commit: không tạo commit mới (fast-forward).

**2. [Rule 3 - Blocking] Hai chỗ casing lệch với gate tự động của chính plan**
- Found during: Task 2, chạy `<verify><automated>` của plan
- Issue: (a) `p_co_anh boolean DEFAULT NULL::boolean` (chữ hoa, theo văn phong `pg_get_functiondef` của 0067) không khớp gate `grep -q "p_co_anh boolean default null"` (chữ thường, phân biệt hoa/thường). (b) `danh_sach_san_pham` dùng `SET search_path TO ''` (chữ hoa, đúng văn phong 0067) khiến `grep -c "set search_path"` (chữ thường) chỉ đếm 6/7 hàm thay vì ≥7.
- Fix: hạ cả hai xuống chữ thường (`p_co_anh boolean default null`, `set search_path = ''`) — không đổi ngữ nghĩa SQL, chỉ đổi cách viết để khớp đúng gate mà chính plan định nghĩa.
- Files modified: `supabase/migrations/0068_hinh_anh.sql`
- Commit: gộp vào commit Task 2 (`0dc8da9`), không tách riêng vì phát hiện ngay khi chạy verify lần đầu, chưa từng commit bản sai.

### Auth gates

Không có.

## Known Stubs

Không có — cả hai file đều là SQL hoàn chỉnh cho tầng database, không có giá
trị rỗng hoặc placeholder nào chảy vào UI (chưa có UI ở plan này).

## Chưa làm (đúng phạm vi plan)

- Chưa đẩy `0068_hinh_anh.sql` lên cloud, chưa chạy `43_hinh_anh_test.sql`
  thật — theo `<objective>` của plan, việc đó thuộc **plan 09-05**.
- Chưa xóa cột `san_pham.hinh_anh_url` (cột cũ không dùng) — plan nói rõ xóa
  cột phải hỏi trước, không thuộc phạm vi plan 01.

## Self-Check: PASSED

- FOUND: `supabase/tests/43_hinh_anh_test.sql`
- FOUND: `supabase/migrations/0068_hinh_anh.sql`
- FOUND commit `e0d0116` (test(anh): pgTAP 43 hinh_anh (RED))
- FOUND commit `0dc8da9` (feat(anh): bang hinh_anh, RPC anh chinh/xoa mem, loc p_co_anh)
