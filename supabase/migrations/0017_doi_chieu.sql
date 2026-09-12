-- =============================================================================
-- 0015 — Đối chiếu tồn kho với sổ cái
-- =============================================================================

-- full outer join là cố ý: bắt được cả hai chiều lệch — dòng có trong ton_kho
-- mà không có movement nào, và movement có mà ton_kho thiếu dòng.
create or replace view public.v_doi_chieu_ton as
select
  coalesce(tk.kho_id, mv.kho_id)                          as kho_id,
  coalesce(tk.san_pham_id, mv.san_pham_id)                as san_pham_id,
  coalesce(tk.so_luong, 0)                                as ton_theo_bang,
  coalesce(mv.tong_movement, 0)                           as ton_theo_so_cai,
  coalesce(tk.so_luong, 0) - coalesce(mv.tong_movement, 0) as chenh_lech
from public.ton_kho tk
full outer join (
  select kho_id, san_pham_id, sum(so_luong) as tong_movement
  from public.kho_movement
  group by kho_id, san_pham_id
) mv on mv.kho_id = tk.kho_id and mv.san_pham_id = tk.san_pham_id;

create or replace function public.doi_chieu_ton()
returns table (
  kho_id uuid,
  san_pham_id uuid,
  ton_theo_bang numeric(18,4),
  ton_theo_so_cai numeric(18,4),
  chenh_lech numeric(18,4)
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.kho_id, v.san_pham_id, v.ton_theo_bang, v.ton_theo_so_cai, v.chenh_lech
  from public.v_doi_chieu_ton v
  where v.chenh_lech <> 0
  order by abs(v.chenh_lech) desc;
$$;

comment on function public.doi_chieu_ton() is
  'Trả rỗng khi mọi thứ khớp — đó là kết quả mong đợi khi chạy hằng đêm.';

grant execute on function public.doi_chieu_ton() to authenticated;

-- -----------------------------------------------------------------------------
-- Đăng ký job hằng đêm.
--
-- pg_cron trên Supabase local (Docker CLI stack) KHÔNG đáng tin: nhiều issue mở
-- về database-name mismatch và cấp quyền (supabase/cli#158, #1591).
-- Bọc toàn bộ trong DO ... EXCEPTION để `db reset` không bao giờ hỏng ở máy dev.
--
-- pg_cron KHÔNG relocatable: nó luôn tạo object trong schema tên `cron`.
-- Viết `with schema extensions` sẽ lỗi, và `extensions.cron.schedule(...)`
-- không phải tên hàm hợp lệ.
--
-- Bản thân hàm doi_chieu_ton() test được 100% ở local bằng cách gọi trực tiếp.
-- Chỉ phần đăng ký lịch là phụ thuộc hạ tầng.
-- -----------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;

  perform cron.schedule(
    'doi-chieu-ton-hang-dem',
    '0 1 * * *',
    $cron$ select public.doi_chieu_ton(); $cron$
  );

  raise notice 'Đã đăng ký job doi-chieu-ton-hang-dem';
exception when others then
  raise notice 'Bỏ qua đăng ký pg_cron (%). Đăng ký thủ công qua Dashboard khi lên cloud.', sqlerrm;
end $$;
