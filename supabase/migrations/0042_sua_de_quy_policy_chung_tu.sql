-- =============================================================================
-- 0042 — Sửa đệ quy vô hạn giữa policy chung_tu và chung_tu_dong
--
-- 0041 thêm vào policy đọc của `chung_tu` một `exists` lên `chung_tu_dong`.
-- Nhưng policy đọc của `chung_tu_dong` lại là `exists` ngược lên `chung_tu`:
--
--   chung_tu → (RLS) chung_tu_dong → (RLS) chung_tu → …
--
-- Postgres phát hiện và ném "infinite recursion detected in policy for relation
-- chung_tu". Mọi truy vấn chứng từ chết, kể cả của quản lý.
--
-- Cách thoát: hỏi qua một hàm SECURITY DEFINER. Hàm đó đọc `chung_tu_dong`
-- KHÔNG qua RLS nên vòng lặp bị cắt. Nó chỉ trả true/false về việc phiếu có dòng
-- thuộc kho CỦA CHÍNH NGƯỜI GỌI, không trả dữ liệu nào ra ngoài.
-- =============================================================================

create or replace function public.phieu_co_dong_thuoc_kho_hien_tai(p_chung_tu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chung_tu_dong d
    where d.chung_tu_id = p_chung_tu_id
      and d.kho_id = any((select public.kho_hien_tai())::uuid[])
  );
$$;

comment on function public.phieu_co_dong_thuoc_kho_hien_tai(uuid) is
  'Dùng TRONG policy đọc chung_tu. SECURITY DEFINER để cắt vòng đệ quy RLS chung_tu ↔ chung_tu_dong. Chỉ so với kho của chính người gọi nên không lộ dữ liệu kho khác.';

revoke all    on function public.phieu_co_dong_thuoc_kho_hien_tai(uuid) from public, anon;
grant execute on function public.phieu_co_dong_thuoc_kho_hien_tai(uuid) to authenticated;

drop policy if exists "doc chung tu theo pham vi" on public.chung_tu;

create policy "doc chung tu theo pham vi" on public.chung_tu
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or (
      (select public.vai_tro_hien_tai()) = 'thu_kho'
      and (
        kho_id        = any((select public.kho_hien_tai())::uuid[])
        or kho_den_id = any((select public.kho_hien_tai())::uuid[])
        or public.phieu_co_dong_thuoc_kho_hien_tai(id)
      )
    )
  );
