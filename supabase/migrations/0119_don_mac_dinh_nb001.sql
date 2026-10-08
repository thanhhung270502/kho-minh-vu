-- 0119: người nhận mặc định của đơn đặt là NB001 (yêu cầu 08/10/2026).
--
-- - tao_don: không truyền đối tác lẫn nhân viên thì gắn đối tác mã NB001 (nếu còn
--   dùng). Đơn trống bỏ ngang (0098) vẫn được dùng lại — nay nhận cả đơn đã gắn NB001.
-- - Đơn TAM đang trống người nhận (không đối tác, không nhân viên) gắn luôn NB001.

create or replace function public.tao_don(
  p_doi_tac_id uuid default null,
  p_nguoi_nhan_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ids uuid[];
  v_so text;
  v_id uuid;
  v_loi text;
  v_doi_tac uuid := p_doi_tac_id;
  v_mac_dinh uuid;
begin
  -- Bỏ trùng và NULL, giữ thứ tự xuất hiện đầu tiên.
  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  select dt.id into v_mac_dinh
  from public.doi_tac dt
  where dt.ma = 'NB001' and dt.dang_hoat_dong
  limit 1;

  if p_doi_tac_id is null and cardinality(v_ids) = 0 then
    if not public.co_quyen('tao_don') then
      raise exception 'Tài khoản chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
    end if;
    v_doi_tac := v_mac_dinh;

    -- 0098: dùng lại đơn tạm trống của chính người bấm thay vì cấp thêm số.
    select d.id into v_id
    from public.don_dat_hang d
    where d.trang_thai = 'TAM' and d.nguoi_tao_id = (select auth.uid())
      and (d.doi_tac_id is null or d.doi_tac_id is not distinct from v_mac_dinh)
      and d.ghi_chu is null
      and not exists (select 1 from public.don_dat_hang_dong x where x.don_dat_hang_id = d.id)
      and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = d.id)
    order by d.created_at desc
    limit 1
    for update skip locked;
    if v_id is not null then
      if v_doi_tac is not null then
        update public.don_dat_hang set doi_tac_id = v_doi_tac
        where id = v_id and doi_tac_id is null;
      end if;
      return v_id;
    end if;
  end if;

  -- Cấp số trước: kiểm quyền tao_don (42501) nằm trong sinh_so_dh.
  v_so := public.sinh_so_dh();

  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where nv.id is null or not nv.dang_dung;
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng hoặc không tồn tại', v_loi using errcode = '23514';
  end if;

  insert into public.don_dat_hang (so_dh, doi_tac_id) values (v_so, v_doi_tac) returning id into v_id;

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select v_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord);

  return v_id;
end $function$;

update public.don_dat_hang d
set doi_tac_id = (select dt.id from public.doi_tac dt where dt.ma = 'NB001' and dt.dang_hoat_dong limit 1)
where d.trang_thai = 'TAM'
  and d.doi_tac_id is null
  and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = d.id)
  and exists (select 1 from public.doi_tac dt where dt.ma = 'NB001' and dt.dang_hoat_dong);
