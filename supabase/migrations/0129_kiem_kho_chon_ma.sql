-- 0129: Kiểm kho chọn theo mã + chọn nhanh mã đang âm (12/10/2026).
--
-- Phiên kiểm kê trước chỉ chọn theo kho + nhóm hàng. Nay chọn được TỪNG MÃ muốn kiểm
-- (chung_tu.pham_vi_san_pham), có RPC ma_ton_am_theo_kho để thêm nhanh mọi mã đang âm
-- của kho. Một phiên chọn theo nhóm HOẶC theo mã, không cả hai.
--
-- Phiên theo mã: phạm vi = đúng các mã đã chọn (không xét kho mặc định / tồn ≠ 0 như
-- phiên theo nhóm); lưu số đếm cho mã ngoài danh sách bị từ chối như mã ngoài nhóm.
--
-- Thân hàm chép từ định nghĩa mới nhất, chỉ vá chỗ ghi "0129". mo_phien_kiem_ke và
-- danh_sach_phien_kiem_ke đổi chữ ký / kiểu trả nên phải drop rồi tạo lại.

-- --- 1. Cột phạm vi theo mã -----------------------------------------------------
alter table public.chung_tu add column pham_vi_san_pham uuid[];
comment on column public.chung_tu.pham_vi_san_pham is
  '0129: phiên KIEM_KE chọn theo mã — danh sách san_pham.id cần kiểm. null = theo nhóm / toàn kho.';

-- --- 2. Mở phiên: thêm p_san_pham_ids ------------------------------------------
drop function public.mo_phien_kiem_ke(uuid, uuid[], text);
CREATE FUNCTION public.mo_phien_kiem_ke(p_kho_id uuid, p_nhom_hang_ids uuid[] DEFAULT NULL::uuid[], p_ghi_chu text DEFAULT NULL::text, p_san_pham_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_kho public.kho;
  v_pham_vi uuid[];
  v_ma uuid[];
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (p_kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ mở được phiên của kho mình' using errcode = '42501';
  end if;

  select * into v_kho from public.kho where id = p_kho_id and dang_hoat_dong;
  if v_kho.id is null then
    raise exception 'Kho không tồn tại hoặc không hoạt động' using errcode = '23514';
  end if;

  -- Mảng rỗng đối xử như NULL — cả hai đều nghĩa là "toàn kho" (KKE-01).
  if p_nhom_hang_ids is null or cardinality(p_nhom_hang_ids) = 0 then
    v_pham_vi := null;
  else
    v_pham_vi := p_nhom_hang_ids;
    if exists (
      select 1 from unnest(v_pham_vi) as x(id)
      left join public.nhom_hang nh on nh.id = x.id
      where nh.id is null
    ) then
      raise exception 'Có nhóm hàng không tồn tại trong phạm vi phiên' using errcode = '23514';
    end if;
  end if;

  -- 0129: chọn theo mã — loại trùng, bỏ phần tử null; rỗng = không chọn theo mã.
  v_ma := (select array_agg(distinct x) from unnest(coalesce(p_san_pham_ids, '{}'::uuid[])) as x where x is not null);
  if v_ma is not null then
    if v_pham_vi is not null then
      raise exception 'Chọn theo nhóm hàng hoặc theo mã, không chọn cả hai' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(v_ma) as x(id)
      left join public.san_pham sp on sp.id = x.id
      where sp.id is null or sp.loai_hang = 'COMBO'
    ) then
      raise exception 'Có mã không tồn tại hoặc là combo (combo kiểm theo mã thành phần)' using errcode = '23514';
    end if;
  end if;

  insert into public.chung_tu (so_ct, loai_ct, kho_id, pham_vi_nhom_hang, pham_vi_san_pham, ghi_chu, nguoi_tao_id)
  values (
    public.sinh_so_ct('KIEM_KE'::public.loai_ct),
    'KIEM_KE',
    p_kho_id,
    v_pham_vi,
    v_ma,
    nullif(trim(coalesce(p_ghi_chu, '')), ''),
    auth.uid()
  )
  returning * into v_ct;

  return v_ct;
end;
$function$;

revoke all    on function public.mo_phien_kiem_ke(uuid, uuid[], text, uuid[]) from public, anon;
grant execute on function public.mo_phien_kiem_ke(uuid, uuid[], text, uuid[]) to authenticated;
comment on function public.mo_phien_kiem_ke(uuid, uuid[], text, uuid[]) is
  'KKE-01 + 0129: mở phiên kiểm kê theo kho + nhóm hàng HOẶC theo danh sách mã. Không ghi sổ cái.';

-- --- 3. Phạm vi phiên: theo mã khi có -------------------------------------------
CREATE OR REPLACE FUNCTION public._pham_vi_kiem_ke(p_chung_tu_id uuid)
 RETURNS TABLE(san_pham_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select sp.id
  from public.san_pham sp
  join public.chung_tu ct on ct.id = p_chung_tu_id
  left join public.ton_kho tk on tk.kho_id = ct.kho_id and tk.san_pham_id = sp.id
  where sp.loai_hang <> 'COMBO'  -- 0098: combo không có tồn riêng, kiểm theo mã thành phần
    and case
      -- 0129: phiên chọn theo mã — đúng các mã đã chọn, không xét kho mặc định / tồn.
      when ct.pham_vi_san_pham is not null then sp.id = any(ct.pham_vi_san_pham)
      else (ct.pham_vi_nhom_hang is null or sp.nhom_hang_id = any(ct.pham_vi_nhom_hang))
        and (
          (sp.dang_kinh_doanh and sp.kho_mac_dinh_id = ct.kho_id)
          or coalesce(tk.so_luong, 0) <> 0
        )
    end;
$function$;

-- --- 4. Lưu một dòng đếm: chặn mã ngoài danh sách -------------------------------
CREATE OR REPLACE FUNCTION public.luu_dong_kiem_ke(p_chung_tu_id uuid, p_san_pham_id uuid, p_so_luong numeric)
 RETURNS chung_tu_dong
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_sp public.san_pham;
  v_ton numeric(18,4);
  v_dong public.chung_tu_dong;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt hoặc đã hủy, không sửa số đếm được' using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ đếm được phiên của kho mình' using errcode = '42501';
  end if;

  if p_so_luong is null or p_so_luong < 0 then
    raise exception 'Số đếm phải là số không âm' using errcode = '23514';
  end if;

  select * into v_sp from public.san_pham where id = p_san_pham_id;
  if v_sp.id is null then
    raise exception 'Không tìm thấy mã hàng' using errcode = '23514';
  end if;

  -- Chỉ xét NHÓM HÀNG của phiên — không xét kho mặc định của mã (hàng tìm
  -- thấy lạc kho vẫn đếm được, 06-RESEARCH.md §Data Model mục 1).
  if v_ct.pham_vi_nhom_hang is not null
     and not (v_sp.nhom_hang_id is not null and v_sp.nhom_hang_id = any(v_ct.pham_vi_nhom_hang)) then
    raise exception 'Mã không thuộc nhóm hàng của phiên' using errcode = '23514';
  end if;
  -- 0129: phiên chọn theo mã chỉ nhận đúng các mã đã chọn.
  if v_ct.pham_vi_san_pham is not null and not (v_sp.id = any(v_ct.pham_vi_san_pham)) then
    raise exception 'Mã không nằm trong danh sách mã của phiên' using errcode = '23514';
  end if;

  -- CHỐT tồn sổ TẠI LÚC LƯU (D-03) — đọc ton_kho NGAY BÂY GIỜ, không phải lúc
  -- mở phiên. Kho vẫn nhận XUAT/NHAP song song trong lúc phiên mở (D-02).
  select coalesce(so_luong, 0) into v_ton
  from public.ton_kho where kho_id = v_ct.kho_id and san_pham_id = p_san_pham_id;

  insert into public.chung_tu_dong (
    chung_tu_id, san_pham_id, so_luong, so_luong_he_thong, don_gia, thanh_tien,
    kho_id, dem_luc, nguoi_dem_id, dem_lai
  )
  values (
    p_chung_tu_id, p_san_pham_id, p_so_luong, coalesce(v_ton, 0), 0, 0,
    v_ct.kho_id, now(), auth.uid(), false
  )
  on conflict (chung_tu_id, san_pham_id) where so_luong_he_thong is not null
  do update set
    so_luong = excluded.so_luong,
    so_luong_he_thong = excluded.so_luong_he_thong,
    dem_luc = excluded.dem_luc,
    nguoi_dem_id = excluded.nguoi_dem_id,
    dem_lai = false
  returning * into v_dong;

  return v_dong;
end;
$function$;

-- --- 5. Nạp Excel: chặn mã ngoài danh sách --------------------------------------
CREATE OR REPLACE FUNCTION public.nhap_so_dem_kiem_ke(p_chung_tu_id uuid, p_du_lieu jsonb, p_chi_kiem_tra boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_dong jsonb;
  v_ma text;
  v_so_dem_text text;
  v_so_dem numeric;
  v_sp public.san_pham;
  v_da_thay jsonb := '{}'::jsonb;
  v_dat jsonb := '[]'::jsonb;
  v_cap_nhat jsonb := '[]'::jsonb;
  v_bo_qua jsonb := '[]'::jsonb;
  v_loi jsonb := '[]'::jsonb;
  v_item jsonb;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt hoặc đã hủy, không nhập số đếm được' using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây (áp cho
  -- cả chế độ xem trước lẫn nạp thật — không cần khóa riêng ở vòng phân loại).
  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ nhập được phiên của kho mình' using errcode = '42501';
  end if;

  -- Vòng 1 — PHÂN LOẠI, không ghi gì. An toàn gọi lại nhiều lần khi xem trước.
  -- Khóa jsonb {ma_hang, so_dem} tiếng Việt = hợp đồng với route Excel.
  for v_dong in select * from jsonb_array_elements(coalesce(p_du_lieu, '[]'::jsonb)) loop
    v_ma := nullif(trim(coalesce(v_dong->>'ma_hang', '')), '');
    if v_ma is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', '', 'ly_do', 'Thiếu mã hàng');
      continue;
    end if;

    if v_da_thay ? v_ma then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã lặp trong file');
      continue;
    end if;
    v_da_thay := v_da_thay || jsonb_build_object(v_ma, true);

    -- Trống KHÁC 0 (D-07): mã vẫn tính là CHƯA ĐẾM, không phải "đếm được 0".
    v_so_dem_text := nullif(trim(coalesce(v_dong->>'so_dem', '')), '');
    if v_so_dem_text is null then
      v_bo_qua := v_bo_qua || jsonb_build_object(
        'ma_hang', v_ma, 'ly_do', 'Ô Số đếm trống — mã vẫn tính là CHƯA ĐẾM'
      );
      continue;
    end if;

    begin
      v_so_dem := v_so_dem_text::numeric;
    exception when invalid_text_representation then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Số đếm không phải là số');
      continue;
    end;
    if v_so_dem < 0 then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Số đếm không được âm');
      continue;
    end if;

    select * into v_sp from public.san_pham where ma_hang = v_ma;
    if v_sp.id is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Không có mã này trong danh mục');
      continue;
    end if;

    -- CÙNG điều kiện với luu_dong_kiem_ke — chỉ xét nhóm, không xét kho.
    if v_ct.pham_vi_nhom_hang is not null
       and not (v_sp.nhom_hang_id is not null and v_sp.nhom_hang_id = any(v_ct.pham_vi_nhom_hang)) then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã không thuộc nhóm hàng của phiên');
      continue;
    end if;
    -- 0129: phiên chọn theo mã chỉ nhận đúng các mã đã chọn.
    if v_ct.pham_vi_san_pham is not null and not (v_sp.id = any(v_ct.pham_vi_san_pham)) then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã không nằm trong danh sách mã của phiên');
      continue;
    end if;

    v_item := jsonb_build_object('san_pham_id', v_sp.id, 'ma_hang', v_ma, 'so_dem', v_so_dem);
    if exists (
      select 1 from public.chung_tu_dong cd
      where cd.chung_tu_id = p_chung_tu_id and cd.san_pham_id = v_sp.id and cd.so_luong_he_thong is not null
    ) then
      v_cap_nhat := v_cap_nhat || v_item;
    else
      v_dat := v_dat || v_item;
    end if;
  end loop;

  -- Chế độ xem trước: trả kết quả phân loại, KHÔNG ghi gì xuống database.
  if p_chi_kiem_tra then
    return jsonb_build_object(
      'da_nap', false,
      'dat', jsonb_array_length(v_dat),
      'cap_nhat', jsonb_array_length(v_cap_nhat),
      'bo_qua', jsonb_array_length(v_bo_qua),
      'so_loi', jsonb_array_length(v_loi),
      'chi_tiet_dat', v_dat,
      'chi_tiet_cap_nhat', v_cap_nhat,
      'chi_tiet_bo_qua', v_bo_qua,
      'loi', v_loi
    );
  end if;

  -- Còn dòng lỗi: KHÔNG nạp nửa vời (D-04, D-08) — người dùng sửa hết lỗi rồi
  -- nạp lại nguyên file.
  if jsonb_array_length(v_loi) > 0 then
    return jsonb_build_object(
      'da_nap', false,
      'dat', jsonb_array_length(v_dat),
      'cap_nhat', jsonb_array_length(v_cap_nhat),
      'bo_qua', jsonb_array_length(v_bo_qua),
      'so_loi', jsonb_array_length(v_loi),
      'loi', v_loi,
      'ly_do', 'Sửa hết dòng lỗi rồi nạp lại — không nạp nửa vời'
    );
  end if;

  -- Vòng 2 — GHI THẬT, mỗi dòng sạch đi qua ĐÚNG luu_dong_kiem_ke như ba đường
  -- kia (điện thoại, máy tính) — không có đường ghi riêng nào khác cho Excel.
  for v_item in select * from jsonb_array_elements(v_dat || v_cap_nhat) loop
    perform public.luu_dong_kiem_ke(
      p_chung_tu_id, (v_item->>'san_pham_id')::uuid, (v_item->>'so_dem')::numeric
    );
  end loop;

  return jsonb_build_object(
    'da_nap', true,
    'dat', jsonb_array_length(v_dat),
    'cap_nhat', jsonb_array_length(v_cap_nhat),
    'bo_qua', jsonb_array_length(v_bo_qua),
    'so_loi', 0,
    'chi_tiet_bo_qua', v_bo_qua
  );
end;
$function$;

-- --- 6. Danh sách phiên: thêm so_ma_chon ---------------------------------------
drop function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid);
create function public.danh_sach_phien_kiem_ke(
  p_kho_id uuid default null,
  p_trang_thai public.trang_thai_ct default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 20,
  p_chung_tu_id uuid default null
)
returns table (
  id uuid, so_ct text, ngay_ct date, kho_id uuid, ten_kho text,
  pham_vi_nhom_hang uuid[], ten_nhom_pham_vi text, so_ma_chon integer, trang_thai public.trang_thai_ct,
  so_da_dem bigint, so_trong_pham_vi bigint, so_dem_lai bigint,
  nguoi_tao text, ngay_ghi_so timestamptz, created_at timestamptz, tong_so_dong bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_kich_thuoc integer := greatest(least(coalesce(p_kich_thuoc, 20), 100), 1);
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  with loc as (
    select ct.*
    from public.chung_tu ct
    where ct.loai_ct = 'KIEM_KE'
      and (p_kho_id      is null or ct.kho_id = p_kho_id)
      and (p_trang_thai  is null or ct.trang_thai = p_trang_thai)
      and (p_chung_tu_id is null or ct.id = p_chung_tu_id)
      -- Thủ kho: chỉ phiên của kho được phân công.
      and (v_vai <> 'thu_kho' or ct.kho_id = any(v_kho))
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_ct, l.ngay_ct, l.kho_id, k.ten,
    l.pham_vi_nhom_hang,
    (
      select string_agg(nh.ten, ', ' order by nh.ten)
      from public.nhom_hang nh
      where nh.id = any(l.pham_vi_nhom_hang)
    ),
    -- 0129: null = phiên theo nhóm / toàn kho; số = phiên chọn theo mã.
    cardinality(l.pham_vi_san_pham),
    l.trang_thai,
    (select count(*) from public.chung_tu_dong cd where cd.chung_tu_id = l.id)::bigint,
    (
      select count(*) from (
        select san_pham_id from public._pham_vi_kiem_ke(l.id)
        union
        select san_pham_id from public.chung_tu_dong where chung_tu_id = l.id
      ) u
    )::bigint,
    (select count(*) from public.chung_tu_dong cd where cd.chung_tu_id = l.id and cd.dem_lai)::bigint,
    nd.ho_ten,
    l.ngay_ghi_so, l.created_at,
    (select tong from dem)
  from loc l
  left join public.kho k         on k.id  = l.kho_id
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.created_at desc
  limit v_kich_thuoc
  offset greatest(coalesce(p_trang, 1) - 1, 0) * v_kich_thuoc;
end;
$$;

revoke all    on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) from public, anon;
grant execute on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) to authenticated;
comment on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) is
  'Danh sách / đầu phiên kiểm kê. 0129 thêm so_ma_chon (null = phiên theo nhóm / toàn kho).';

-- --- 7. Mã đang âm của một kho — nút "Thêm các mã đang âm" ----------------------
create function public.ma_ton_am_theo_kho(p_kho_id uuid)
returns table (san_pham_id uuid, ma_hang text, ten_hang text, ton numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- SECURITY DEFINER bỏ qua RLS — cùng cửa quyền với mo_phien_kiem_ke.
  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (p_kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ xem được mã của kho mình' using errcode = '42501';
  end if;

  return query
  select sp.id, sp.ma_hang, sp.ten_hang, tk.so_luong
  from public.ton_kho tk
  join public.san_pham sp on sp.id = tk.san_pham_id
  where tk.kho_id = p_kho_id
    and tk.so_luong < 0
    and sp.loai_hang <> 'COMBO'
  order by sp.ma_hang;
end;
$$;
revoke all    on function public.ma_ton_am_theo_kho(uuid) from public, anon;
grant execute on function public.ma_ton_am_theo_kho(uuid) to authenticated;
comment on function public.ma_ton_am_theo_kho(uuid) is
  '0129: mã đang tồn âm của một kho (không gồm combo) — để chọn nhanh khi mở phiên kiểm kê.';
