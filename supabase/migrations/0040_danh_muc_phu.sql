-- =============================================================================
-- 0040 — Danh mục phụ: xóa được thật + khóa mã hệ thống
--
-- Hai lỗ hổng phát hiện khi làm màn Cài đặt:
--
-- 1. 0015 chỉ cấp INSERT/UPDATE cho nhom_hang, don_vi_tinh, cong_doan. Không có
--    policy DELETE nghĩa là `delete` chạy êm nhưng xóa 0 dòng — giao diện báo
--    "đã xóa" còn dữ liệu vẫn nguyên. Im lặng, khó lần ra.
--
-- 2. Mã công đoạn và mã ĐVT đang được CODE dùng như hằng số:
--    `cong_doan_theo_duoi` (gợi ý theo đuôi mã), `la_can_ra`, hằng
--    `cong_doan_khi_tao_moi: "MUA_NGOAI"` khi nhập Excel, helper test dùng 'CAI'.
--    Đổi mã qua giao diện sẽ làm rà dữ liệu sai mà không báo gì. Khóa ở database
--    thay vì chỉ ẩn nút trên giao diện.
-- =============================================================================

create policy "xoa nhom hang" on public.nhom_hang
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "xoa don vi tinh" on public.don_vi_tinh
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "xoa cong doan" on public.cong_doan
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- --- Khóa mã hệ thống ------------------------------------------------------
-- Chỉ chặn ĐỔI MÃ và XÓA. Đổi TÊN, đổi màu hiển thị vẫn cho — đó là việc bình
-- thường của người dùng và không có dòng code nào phụ thuộc vào tên.
create or replace function public.chan_doi_ma_he_thong()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_he_thong text[] := case tg_table_name
    when 'cong_doan'   then array['EP','SON','CARBON','XI_MA','NANO','MUA_NGOAI']
    when 'don_vi_tinh' then array['CAI']
    else array[]::text[]
  end;
begin
  if old.ma = any(v_he_thong)
     and (tg_op = 'DELETE' or new.ma is distinct from old.ma) then
    raise exception
      'Mã % là mã hệ thống dùng trong quy tắc rà dữ liệu — chỉ đổi được tên', old.ma
      using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.chan_doi_ma_he_thong() from public, anon, authenticated;

create trigger chan_doi_ma_cong_doan
  before update or delete on public.cong_doan
  for each row execute function public.chan_doi_ma_he_thong();

create trigger chan_doi_ma_don_vi_tinh
  before update or delete on public.don_vi_tinh
  for each row execute function public.chan_doi_ma_he_thong();

-- Nhóm hàng không được tự làm cha của chính nó (giao diện đã lọc, nhưng đây là
-- ràng buộc thật — vòng lặp cha-con làm cây nhóm hàng treo khi dựng đệ quy).
alter table public.nhom_hang
  add constraint ck_nhom_hang_khong_tu_lam_cha
  check (parent_id is null or parent_id <> id);
