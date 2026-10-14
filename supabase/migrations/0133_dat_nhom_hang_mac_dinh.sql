-- 0133: dat_nhom_hang_nguoi_dung — p_nhom_hang_ids mặc định null.
--
-- Kiểu sinh ra cho supabase-js luôn coi tham số là bắt buộc, không nhận null. Có default
-- thì tham số thành tùy chọn: giao diện bỏ tham số (`?? undefined`) = "Tất cả nhóm hàng",
-- đúng khuôn các RPC khác của dự án. Thân hàm giữ nguyên 0132.

create or replace function public.dat_nhom_hang_nguoi_dung(p_id uuid, p_nhom_hang_ids uuid[] default null)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_la_admin boolean := coalesce((select public.vai_tro_hien_tai())::text, '') = 'quan_ly';
  v_dich_vai public.vai_tro := (select vai_tro from public.nguoi_dung where id = p_id);
  v_nhom uuid[];
begin
  if not v_la_admin and not public.co_quyen('phan_quyen') then
    raise exception 'Tài khoản chưa có quyền Phân quyền' using errcode = '42501';
  end if;
  if v_dich_vai is null then
    raise exception 'Không tìm thấy tài khoản' using errcode = '23514';
  end if;
  if v_dich_vai = 'quan_ly' then
    raise exception 'Tài khoản Quản lý/Admin luôn xem mọi nhóm hàng — không cần giới hạn' using errcode = '23514';
  end if;
  -- Người được phân quyền (không phải Admin) mà tự sửa được phạm vi của mình thì tự mở được hết.
  if not v_la_admin and p_id = v_uid then
    raise exception 'Không tự đổi nhóm hàng của chính mình — nhờ Quản lý/Admin' using errcode = '42501';
  end if;

  if p_nhom_hang_ids is null then
    delete from public.nguoi_dung_nhom_hang where nguoi_dung_id = p_id;
    return null;
  end if;

  select coalesce(array_agg(distinct x order by x), '{}') into v_nhom
  from unnest(p_nhom_hang_ids) x where x is not null;
  if cardinality(v_nhom) = 0 then
    raise exception 'Chọn ít nhất một nhóm hàng, hoặc chọn "Tất cả nhóm hàng"' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(v_nhom) x
             where not exists (select 1 from public.nhom_hang nh where nh.id = x)) then
    raise exception 'Có nhóm hàng không tồn tại — tải lại trang rồi chọn lại' using errcode = '22023';
  end if;

  insert into public.nguoi_dung_nhom_hang (nguoi_dung_id, nhom_hang_ids, nguoi_cap_nhat_id)
  values (p_id, v_nhom, v_uid)
  on conflict (nguoi_dung_id) do update
    set nhom_hang_ids = excluded.nhom_hang_ids,
        nguoi_cap_nhat_id = excluded.nguoi_cap_nhat_id;
  return v_nhom;
end;
$$;
