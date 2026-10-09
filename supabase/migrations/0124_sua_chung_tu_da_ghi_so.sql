-- 0124: sửa hóa đơn / phiếu nhập ĐÃ GHI SỔ — đảo sổ rồi ghi lại, giữ nguyên số phiếu.
--
-- Trước đây phiếu HOAN_THANH chỉ có đường Hủy (bút toán đảo) rồi tạo phiếu mới ra số
-- mới. mo_sua_chung_tu làm trong MỘT transaction:
--   1. đảo từng movement của phiếu đang ghi sổ (giống huy_chung_tu),
--   2. phiếu cũ -> DA_HUY và đổi số thành "<số>-S<n>" — giữ làm lịch sử trên thẻ kho,
--   3. tạo phiếu nháp (NHAP_LIEU) mang lại ĐÚNG số cũ, chép đầu phiếu + dòng + người nhận,
--      ban_sua_cua_id trỏ về phiếu cũ.
-- Người dùng sửa phiếu nháp bằng màn sửa sẵn có rồi bấm Ghi sổ như mọi phiếu khác.
--
-- Vì sao tách hai bản ghi thay vì mở lại chính phiếu đó: kho_movement là sổ cái
-- append-only và trỏ chung_tu_dong_id — dòng đã có bút toán không xóa được, và huy_chung_tu
-- đảo mọi movement la_but_toan_dao = false nên phiếu ghi sổ hai lần sẽ bị đảo trùng.
--
-- Quyền: như quyền Hủy phiếu đã ghi sổ — hóa đơn cần co_quyen('sua_hoa_don'), phiếu nhập
-- cần vai trò quản lý.
--
-- Hóa đơn của đơn đặt ĐÃ HOÀN THÀNH: đơn giữ nguyên trạng thái trong lúc sửa; ghi sổ bản
-- sửa thì dòng đơn được chép lại theo hóa đơn (trigger cuối file) để đơn và hóa đơn khớp.

alter table public.chung_tu add column ban_sua_cua_id uuid references public.chung_tu(id);
comment on column public.chung_tu.ban_sua_cua_id is
  'Phiếu đã ghi sổ mà phiếu này là bản sửa (mo_sua_chung_tu, 0124). Phiếu cũ đã đảo sổ, mang số "<số>-S<n>".';
create index idx_chung_tu_ban_sua_cua on public.chung_tu (ban_sua_cua_id) where ban_sua_cua_id is not null;

-- -----------------------------------------------------------------------------
-- mo_sua_chung_tu
-- -----------------------------------------------------------------------------
create function public.mo_sua_chung_tu(p_chung_tu_id uuid, p_ly_do text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
  v_so_cu text;
  v_lan integer;
  v_moi uuid;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;
  if v_ct.loai_ct not in ('XUAT', 'NHAP') then
    raise exception 'Chỉ sửa được hóa đơn và phiếu nhập' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'HOAN_THANH' then
    raise exception 'Phiếu % chưa ghi sổ — sửa thẳng trên phiếu, không cần mở sửa', v_ct.so_ct
      using errcode = '23514';
  end if;
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Phải nhập lý do sửa phiếu' using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS: kiểm quyền tường minh, cùng luật với huy_chung_tu.
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được sửa chứng từ' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'XUAT' and not public.co_quyen('sua_hoa_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Sửa hóa đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'NHAP' and auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được sửa phiếu nhập đã ghi sổ' using errcode = '42501';
  end if;

  -- 1. Đảo sổ — chỉ movement gốc của phiếu này (phiếu chỉ ghi sổ một lần).
  for v_mv in
    select * from public.kho_movement
    where chung_tu_id = p_chung_tu_id and la_but_toan_dao = false
  loop
    insert into public.kho_movement (
      ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem,
      chung_tu_id, chung_tu_dong_id, la_but_toan_dao
    ) values (
      now(), v_mv.kho_id, v_mv.san_pham_id, -v_mv.so_luong, v_mv.gia_von_tai_thoi_diem,
      v_mv.chung_tu_id, v_mv.chung_tu_dong_id, true
    );
  end loop;

  -- 2. Phiếu cũ nhường số: "<số>-S1", "<số>-S2"... theo số lần đã sửa.
  select count(*) + 1 into v_lan
  from public.chung_tu
  where left(so_ct, length(v_ct.so_ct) + 2) = v_ct.so_ct || '-S'
    and substr(so_ct, length(v_ct.so_ct) + 3) ~ '^[0-9]+$';
  v_so_cu := v_ct.so_ct || '-S' || v_lan;

  update public.chung_tu
  set so_ct = v_so_cu,
      trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Sửa: ' || trim(p_ly_do) || ' (bản sửa giữ số ' || v_ct.so_ct || ')'
  where id = p_chung_tu_id;

  -- 3. Bản sửa: nháp, đúng số cũ, chép đầu phiếu. Tổng tính lại khi ghi sổ.
  insert into public.chung_tu (
    so_ct, loai_ct, ngay_ct, kho_id, kho_den_id, doi_tac_id, don_dat_hang_id, chung_tu_goc_id,
    trang_thai, giam_gia, ly_do_xuat_am, ghi_chu_ly_do, ghi_chu, nguoi_tao_id, nguon_nhap,
    pham_vi_nhom_hang, nguoi_nhan_id, ban_sua_cua_id
  ) values (
    v_ct.so_ct, v_ct.loai_ct, v_ct.ngay_ct, v_ct.kho_id, v_ct.kho_den_id, v_ct.doi_tac_id,
    v_ct.don_dat_hang_id, v_ct.chung_tu_goc_id, 'NHAP_LIEU', v_ct.giam_gia, v_ct.ly_do_xuat_am,
    v_ct.ghi_chu_ly_do, v_ct.ghi_chu, v_ct.nguoi_tao_id, v_ct.nguon_nhap, v_ct.pham_vi_nhom_hang,
    v_ct.nguoi_nhan_id, p_chung_tu_id
  )
  returning id into v_moi;

  insert into public.chung_tu_dong (
    chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, so_luong_he_thong, ghi_chu,
    created_at, kho_id, nguoi_nhan_id
  )
  select v_moi, d.san_pham_id, d.so_luong, d.don_gia, d.thanh_tien, d.so_luong_he_thong, d.ghi_chu,
         d.created_at, d.kho_id, d.nguoi_nhan_id
  from public.chung_tu_dong d where d.chung_tu_id = p_chung_tu_id;

  insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
  select v_moi, n.nguoi_nhan_id, n.thu_tu
  from public.chung_tu_nguoi_nhan n where n.chung_tu_id = p_chung_tu_id;

  -- Phiếu trả hàng tham chiếu phiếu gốc đi theo bản sửa.
  update public.chung_tu set chung_tu_goc_id = v_moi where chung_tu_goc_id = p_chung_tu_id;

  return v_moi;
end;
$$;

comment on function public.mo_sua_chung_tu(uuid, text) is
  'Sửa hóa đơn / phiếu nhập đã ghi sổ: đảo sổ phiếu cũ (đổi số thành <số>-S<n>), trả về id phiếu nháp mang lại số cũ — 0124.';
revoke all on function public.mo_sua_chung_tu(uuid, text) from public, anon;
grant execute on function public.mo_sua_chung_tu(uuid, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Ghi sổ bản sửa của hóa đơn thuộc đơn ĐÃ HOÀN THÀNH -> chép lại dòng đơn theo hóa đơn.
-- Chạy trong cùng lệnh UPDATE trạng thái của ghi_so_chung_tu, TRƯỚC _cap_nhat_tien_do_ddh,
-- nên tiến độ được tính lại trên dòng đơn mới. Gộp theo mã vì tiến độ đơn tính theo mã.
-- -----------------------------------------------------------------------------
create function public._dong_bo_don_theo_hoa_don_sua()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.don_dat_hang
                 where id = new.don_dat_hang_id and trang_thai = 'HOAN_THANH') then
    return new;
  end if;

  delete from public.don_dat_hang_dong where don_dat_hang_id = new.don_dat_hang_id;

  insert into public.don_dat_hang_dong (
    don_dat_hang_id, san_pham_id, so_luong_dat, so_luong_da_xuat, don_gia, nguoi_nhan_id, ghi_chu, created_at
  )
  select new.don_dat_hang_id, d.san_pham_id, sum(d.so_luong), sum(d.so_luong), max(d.don_gia),
         (array_agg(d.nguoi_nhan_id order by d.created_at, d.id))[1],
         nullif(string_agg(distinct nullif(trim(d.ghi_chu), ''), '; '), ''),
         min(d.created_at)
  from public.chung_tu_dong d
  where d.chung_tu_id = new.id
  group by d.san_pham_id;

  return new;
end;
$$;

create trigger dong_bo_don_theo_hoa_don_sua
  after update of trang_thai on public.chung_tu
  for each row
  when (old.trang_thai = 'NHAP_LIEU' and new.trang_thai = 'HOAN_THANH'
        and new.loai_ct = 'XUAT' and new.ban_sua_cua_id is not null and new.don_dat_hang_id is not null)
  execute function public._dong_bo_don_theo_hoa_don_sua();

-- -----------------------------------------------------------------------------
-- chi_tiet_chung_tu: thêm số phiếu đã thay (để màn sửa báo "đang sửa phiếu đã ghi sổ").
-- Thân chép từ 0115, chỉ thêm ban_sua_cua_id / so_ct_ban_sua.
-- -----------------------------------------------------------------------------
drop function public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
returns table(
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct, nguon_nhap public.nguon_nhap,
  trang_thai public.trang_thai_ct, kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text,
  ten_doi_tac text, ghi_chu text, tong_so_luong numeric, tong_tien numeric, ho_ten_nguoi_tao text,
  ngay_ghi_so timestamp with time zone, created_at timestamp with time zone, don_dat_hang_id uuid,
  so_dh text, chung_tu_goc_id uuid, so_ct_goc text, ly_do_xuat_am text, ghi_chu_ly_do text,
  nguoi_duyet_id uuid, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], ho_ten_nguoi_duyet text,
  ho_ten_nguoi_xac_nhan_don text, ban_sua_cua_id uuid, so_ct_ban_sua text
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
         ndx.ho_ten,
         ct.ban_sua_cua_id, cu.so_ct
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
  left join public.chung_tu cu    on cu.id = ct.ban_sua_cua_id
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
