-- =============================================================================
-- 0049 — Ghi lại AI lập chứng từ (UAT Phase 3, bài 4)
--
-- `chung_tu.nguoi_tao_id` không có default nên mọi phiếu tạo từ giao diện đều
-- null, và màn chi tiết hiện "Người tạo: —". Mất đúng một trong bốn nỗi đau
-- người dùng nêu ở Office Hours: "không truy được hàng về lúc nào, ai nhận".
--
-- Đặt default ở DATABASE chứ không ở client: mọi đường ghi (giao diện, script,
-- RPC sau này) đều được ghi nhận, không phải nhớ truyền field.
-- auth.uid() trả null khi chạy ngoài ngữ cảnh JWT (migration, script) — chấp
-- nhận, đúng ý nghĩa "không có người dùng nào tạo".
-- =============================================================================

alter table public.chung_tu alter column nguoi_tao_id set default auth.uid();

comment on column public.chung_tu.nguoi_tao_id is
  'Người lập chứng từ. Default auth.uid() — client không cần truyền.';

-- Đơn đặt hàng có cùng vấn đề; sửa luôn cho nhất quán trước khi Phase 4 dùng tới.
alter table public.don_dat_hang alter column nguoi_tao_id set default auth.uid();
