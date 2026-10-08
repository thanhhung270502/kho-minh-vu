-- 0115: Lưu NGƯỜI XÁC NHẬN đơn đặt.
--
-- Trước đây xac_nhan_don chỉ đổi trạng thái — không biết ai đã duyệt. Màn Duyệt đơn cần
-- "Người duyệt đơn": hóa đơn nạp từ KiotViet có sẵn trong ghi chú ("Người bán: X"),
-- hóa đơn lập trên hệ mới thì lấy người xác nhận đơn gốc.
--   * don_dat_hang thêm nguoi_xac_nhan_id, ngay_xac_nhan (không khóa ngoại — DATABASE_RULES)
--   * xac_nhan_don ghi người + giờ; mo_khoa_don xóa đi (đơn về Tạm, duyệt lại thì ghi lại)
--   * chi_tiet_don trả ho_ten_nguoi_xac_nhan, ngay_xac_nhan
--   * chi_tiet_chung_tu trả ho_ten_nguoi_xac_nhan_don (người xác nhận đơn gốc)
-- Đơn đã xác nhận trước migration này để trống (không suy ra được ai duyệt).
-- Không đụng dữ liệu cũ ngoài việc thêm hai cột rỗng.

alter table public.don_dat_hang
  add column if not exists nguoi_xac_nhan_id uuid,
  add column if not exists ngay_xac_nhan timestamptz;

comment on column public.don_dat_hang.nguoi_xac_nhan_id is 'Người bấm Xác nhận đơn gần nhất; mở khóa thì xóa (0115).';

create or replace function public.xac_nhan_don(p_id uuid)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('xac_nhan_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'TAM' then
    raise exception 'Đơn % đang ở trạng thái %, không xác nhận lại được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_XAC_NHAN',
      nguoi_xac_nhan_id = (select auth.uid()),
      ngay_xac_nhan = now()
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

create or replace function public.mo_khoa_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('xac_nhan_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, không mở khóa được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;
  if length(trim(coalesce(p_ly_do, ''))) < 5 then
    raise exception 'Phải nhập lý do mở khóa tối thiểu 5 ký tự' using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'TAM',
      nguoi_xac_nhan_id = null,
      ngay_xac_nhan = null,
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[mở khóa] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

drop function if exists public.chi_tiet_don(uuid);

create function public.chi_tiet_don(p_id uuid)
returns table(
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh, ngay_giao_du_kien date,
  doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[],
  ghi_chu text, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text,
  created_at timestamp with time zone, hoa_don_id uuid, so_hoa_don text,
  ho_ten_nguoi_xac_nhan text, ngay_xac_nhan timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select dh.id, dh.so_dh, dh.ngay_dh, dh.trang_thai, dh.ngay_giao_du_kien,
         dh.doi_tac_id, dt.ma, dt.ten,
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
         dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at,
         hd.id, hd.so_ct,
         ndx.ho_ten, dh.ngay_xac_nhan
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join lateral (
    select coalesce(array_agg(ddn.nguoi_nhan_id order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.don_dat_hang_nguoi_nhan ddn
    join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
    where ddn.don_dat_hang_id = dh.id
  ) nn on true
  left join public.nguoi_dung nd  on nd.id = dh.nguoi_tao_id
  left join public.nguoi_dung ndx on ndx.id = dh.nguoi_xac_nhan_id
  -- Một đơn tối đa một hóa đơn chưa hủy (uq_chung_tu_hoa_don_cua_don).
  left join public.chung_tu hd
    on hd.don_dat_hang_id = dh.id and hd.loai_ct = 'XUAT' and hd.trang_thai <> 'DA_HUY'
  where dh.id = p_id;
end;
$function$;

revoke all on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated, service_role;

drop function if exists public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
returns table(
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct, nguon_nhap public.nguon_nhap,
  trang_thai public.trang_thai_ct, kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text,
  ten_doi_tac text, ghi_chu text, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text,
  ngay_ghi_so timestamp with time zone, created_at timestamp with time zone, don_dat_hang_id uuid,
  so_dh text, chung_tu_goc_id uuid, so_ct_goc text, ly_do_xuat_am text, ghi_chu_ly_do text,
  nguoi_duyet_id uuid, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], ho_ten_nguoi_duyet text,
  ho_ten_nguoi_xac_nhan_don text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select ct.id, ct.so_ct, ct.ngay_ct, ct.loai_ct, ct.nguon_nhap, ct.trang_thai,
         ct.kho_id, k.ten, ct.doi_tac_id, dt.ma, dt.ten,
         ct.ghi_chu, ct.tong_so_luong, ct.tong_tien,
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at,
         ct.don_dat_hang_id, dh.so_dh,
         ct.chung_tu_goc_id, goc.so_ct,
         ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.nguoi_duyet_id,
         nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
         ndd.ho_ten,
         ndx.ho_ten
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.nguoi_dung ndd on ndd.id = ct.nguoi_duyet_id
  left join lateral (
    select coalesce(array_agg(ctn.nguoi_nhan_id order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ctn.thu_tu, ctn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = ct.id
  ) nn on true
  left join public.don_dat_hang dh on dh.id = ct.don_dat_hang_id
  left join public.nguoi_dung ndx  on ndx.id = dh.nguoi_xac_nhan_id
  left join public.chung_tu goc   on goc.id = ct.chung_tu_goc_id
  where ct.id = p_id
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d
                 where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    );
end;
$function$;

revoke all on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated, service_role;
