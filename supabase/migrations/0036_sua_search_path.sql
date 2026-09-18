-- =============================================================================
-- 0036 — Khóa search_path cho các hàm của 0030–0035
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

-- Migration gốc chỉ `alter function ... set search_path = ''` cho các hàm vừa thêm
-- (cảnh báo function_search_path_mutable của Supabase advisor).
--
-- Khi dựng lại file từ database, mọi định nghĩa ở 0030–0035 đã mang sẵn
-- `SET search_path TO ''`, nên chạy lại chuỗi migration trên database rỗng cho ra
-- đúng trạng thái cuối. File này giữ nguyên số thứ tự để lịch sử migration của
-- cloud (`supabase_migrations.schema_migrations`) khớp với repo.
--
-- Tự kiểm: hàm nào của Phase 2 còn search_path để mở thì báo lỗi ngay.
do $$
declare v_thieu text;
begin
  select string_agg(p.proname, ', ') into v_thieu
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('la_can_ra','danh_sach_san_pham','chi_tiet_san_pham','xac_nhan_da_ra',
                      'the_kho_san_pham','sinh_ma_doi_tac','danh_sach_doi_tac','chuan_hoa_ghi_chu',
                      'danh_sach_ghi_chu_kiotviet','quyet_ghi_chu','bo_quyet_ghi_chu',
                      'lich_su_giao_dich_doi_tac','khop_danh_muc','nhap_danh_muc',
                      'cong_doan_theo_duoi','goi_y_cong_doan_theo_duoi','ap_dung_goi_y_cong_doan',
                      'gan_hang_loat')
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
    );
  if v_thieu is not null then
    raise exception 'Hàm chưa khóa search_path: %', v_thieu;
  end if;
end $$;
