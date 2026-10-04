-- =============================================================================
-- 0097 — Bấm "Tạo đơn" vào thẳng trang đơn, chọn người nhận trong đó
--
-- Trước (0090): tao_don đòi người nhận ngay, nên giao diện phải hỏi trong một
-- hộp thoại trước khi có đơn. Giờ đơn TẠM được tạo trống người nhận; người nhận
-- chọn ở khung "Thông tin đơn". Luật "đơn nội bộ phải có >= 1 người nhận" chuyển
-- sang lúc RỜI trạng thái TAM (xác nhận / hoàn thành) — constraint trigger kiểm
-- thêm khi trang_thai đổi. Chỉ sửa hàm + trigger, không đổi dữ liệu.
-- =============================================================================

create or replace function public._kiem_don_noi_bo_co_nguoi_nhan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_don_id uuid;
begin
  if tg_table_name = 'don_dat_hang' then
    v_don_id := new.id;
  else
    v_don_id := old.don_dat_hang_id;
  end if;
  -- Đơn tạm (và đơn đã hủy) được trống người nhận; đơn đã xác nhận trở đi thì không.
  if exists (select 1 from public.don_dat_hang d
             where d.id = v_don_id and d.doi_tac_id is null and d.trang_thai not in ('TAM', 'DA_HUY'))
     and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = v_don_id) then
    raise exception 'Chọn người nhận (nhân viên hoặc khách hàng) trước khi xác nhận đơn' using errcode = '23514';
  end if;
  return null;
end $$;
revoke execute on function public._kiem_don_noi_bo_co_nguoi_nhan() from public, anon, authenticated;

drop trigger kiem_don_noi_bo_co_nguoi_nhan on public.don_dat_hang;
create constraint trigger kiem_don_noi_bo_co_nguoi_nhan
  after insert or update of doi_tac_id, trang_thai on public.don_dat_hang
  deferrable initially deferred
  for each row execute function public._kiem_don_noi_bo_co_nguoi_nhan();

-- tao_don: bỏ bắt buộc người nhận lúc tạo.
create or replace function public.tao_don(p_doi_tac_id uuid default null, p_nguoi_nhan_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
  v_so text;
  v_id uuid;
  v_loi text;
begin
  -- Bỏ trùng và NULL, giữ thứ tự xuất hiện đầu tiên.
  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  -- Cấp số trước: kiểm quyền tao_don (42501) nằm trong sinh_so_dh.
  v_so := public.sinh_so_dh();


  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where nv.id is null or not nv.dang_dung;
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng hoặc không tồn tại', v_loi using errcode = '23514';
  end if;

  insert into public.don_dat_hang (so_dh, doi_tac_id) values (v_so, p_doi_tac_id) returning id into v_id;

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select v_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord);

  return v_id;
end $$;

-- dat_nguoi_nhan_don: đơn TAM được để trống người nhận (chọn dần trong trang đơn).
create or replace function public.dat_nguoi_nhan_don(
  p_don_id uuid,
  p_doi_tac_id uuid default null,
  p_nguoi_nhan_ids uuid[] default '{}'
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_don public.don_dat_hang;
  v_ids uuid[];
  v_dang_dung text;
  v_loi text;
begin
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn' using errcode = '23514';
  end if;
  if v_don.trang_thai <> 'TAM' then
    raise exception 'Đơn % đã xác nhận, không sửa người nhận được', v_don.so_dh using errcode = '23514';
  end if;

  -- Chỉ người MỚI phải đang dùng; người cũ đã ngừng dùng được giữ.
  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where (nv.id is null or not nv.dang_dung)
    and not exists (select 1 from public.don_dat_hang_nguoi_nhan x
                    where x.don_dat_hang_id = p_don_id and x.nguoi_nhan_id = i.id);
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng', v_loi using errcode = '23514';
  end if;

  select string_agg(format('%s (%s)', nv.ten_day_du, ds.ma), '; ') into v_dang_dung
  from (select d.nguoi_nhan_id, string_agg(sp.ma_hang, ', ' order by sp.ma_hang) as ma
        from public.don_dat_hang_dong d
        join public.san_pham sp on sp.id = d.san_pham_id
        where d.don_dat_hang_id = p_don_id and d.nguoi_nhan_id is not null
          and d.nguoi_nhan_id <> all (v_ids)
        group by d.nguoi_nhan_id) ds
  join public.nhan_vien_phu_trach nv on nv.id = ds.nguoi_nhan_id;
  if v_dang_dung is not null then
    raise exception 'Không bỏ được khỏi đơn: % đang được gán ở dòng. Gỡ người nhận ở các dòng đó trước.', v_dang_dung
      using errcode = '23514';
  end if;

  update public.don_dat_hang set doi_tac_id = p_doi_tac_id
  where id = p_don_id and doi_tac_id is distinct from p_doi_tac_id;

  delete from public.don_dat_hang_nguoi_nhan
  where don_dat_hang_id = p_don_id and nguoi_nhan_id <> all (v_ids);

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select p_don_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord)
  on conflict (don_dat_hang_id, nguoi_nhan_id) do update set thu_tu = excluded.thu_tu;
end $$;
