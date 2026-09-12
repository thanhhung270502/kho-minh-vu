-- =============================================================================
-- 0023 — Cho supabase_auth_admin đọc được nguoi_dung
--
-- LỖI: custom_access_token_hook chạy dưới role `supabase_auth_admin`. Migration
-- 0014 đã `grant select on public.nguoi_dung to supabase_auth_admin`, nhưng
-- migration 0015 bật RLS trên bảng đó và MỌI policy đều `to authenticated`.
--
-- GRANT và RLS là HAI LỚP RIÊNG BIỆT. Có GRANT mà không có policy thì vẫn
-- không đọc được dòng nào.
--
-- Triệu chứng đánh lừa: hook KHÔNG báo lỗi. Nó chạy, query trả 0 dòng,
-- v_vai_tro = NULL, nhánh `if v_vai_tro is not null` bị bỏ qua, hàm trả claims
-- nguyên vẹn. Đăng nhập thành công, token hợp lệ, chỉ là thiếu vai_tro —
-- và RLS sau đó từ chối mọi thứ vì vai_tro_hien_tai() trả NULL.
--
-- Đây chính xác là cái bẫy đã ghi trong comment của migration 0008 về
-- service_role ("privilege GRANT là một lớp riêng, độc lập với RLS"), chỉ khác
-- role. Bài học: mỗi khi RLS bật trên một bảng, phải rà lại MỌI role đọc bảng
-- đó, không chỉ `authenticated`.
--
-- Phát hiện bằng `npm run verify:hook` — pgTAP không bắt được vì nó đặt thẳng
-- request.jwt.claims và bỏ qua hook hoàn toàn. Đúng lý do script đó tồn tại.
-- =============================================================================

drop policy if exists "auth admin doc nguoi dung" on public.nguoi_dung;
create policy "auth admin doc nguoi dung" on public.nguoi_dung
  for select to supabase_auth_admin
  using (true);

-- Nhắc lại GRANT cho chắc — 0014 đã có nhưng để migration này tự đủ.
grant usage  on schema public         to supabase_auth_admin;
grant select on public.nguoi_dung     to supabase_auth_admin;
