-- =============================================================================
-- 0072 — luu_ho_so_nguoi_dung nhận tên đăng nhập rỗng như "chưa đặt"
--
-- Lỗi (checklist kiểm thử 28/09, bước 9.6): tài khoản có ten_dang_nhap NULL
-- (tài khoản tạo bằng seed/seed:users) không sửa được — đổi kho, vai trò, công
-- tắc quyền đều báo lỗi. Lớp Server Action gửi `previous.ten_dang_nhap ?? ""`
-- vì kiểu sinh khai p_ten_dang_nhap là `string`, và chuỗi rỗng vi phạm
-- ck_ten_dang_nhap (NULL hoặc ^[a-z0-9._-]{3,32}$) → 23514.
--
-- Sửa ở RPC chứ không ép kiểu ở TypeScript: chuỗi rỗng/toàn khoảng trắng nghĩa
-- là "chưa đặt tên đăng nhập" → ghi NULL. Chữ ký giữ nguyên nên không cần drop,
-- quyền execute (0063) giữ nguyên.
-- =============================================================================

create or replace function public.luu_ho_so_nguoi_dung(
  p_id uuid, p_ho_ten text, p_ten_dang_nhap text, p_vai_tro public.vai_tro,
  p_kho_ids uuid[], p_phai_doi_mat_khau boolean,
  p_xem_lich_su_kiotviet boolean default null, p_duyet_kiem_ke boolean default null
) returns void language plpgsql set search_path = '' as $$
declare
  v_ten_dang_nhap text := nullif(btrim(p_ten_dang_nhap), '');
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được sửa tài khoản' using errcode = '42501';
  end if;
  if p_vai_tro = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
    raise exception 'Thủ kho phải được gán ít nhất một kho' using errcode = '23514';
  end if;
  insert into public.nguoi_dung (
    id, ho_ten, ten_dang_nhap, vai_tro, phai_doi_mat_khau,
    xem_lich_su_kiotviet, duyet_kiem_ke
  )
  values (
    p_id, p_ho_ten, v_ten_dang_nhap, p_vai_tro, p_phai_doi_mat_khau,
    coalesce(p_xem_lich_su_kiotviet, false), coalesce(p_duyet_kiem_ke, false)
  )
  on conflict (id) do update set
    ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
    vai_tro = excluded.vai_tro, phai_doi_mat_khau = excluded.phai_doi_mat_khau,
    xem_lich_su_kiotviet = coalesce(p_xem_lich_su_kiotviet, public.nguoi_dung.xem_lich_su_kiotviet),
    duyet_kiem_ke = coalesce(p_duyet_kiem_ke, public.nguoi_dung.duyet_kiem_ke);
  -- Chỉ thủ kho gắn kho; vai trò khác thấy mọi kho nên xóa gán kho.
  delete from public.nguoi_dung_kho
  where nguoi_dung_id = p_id
    and (p_vai_tro <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
  if p_vai_tro = 'thu_kho' then
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select p_id, unnest(p_kho_ids) on conflict do nothing;
  end if;
end $$;
