-- =============================================================================
-- 0081 — Import danh mục v2 (Phase 15, IMP-01..05)
--
-- 1. Hai danh mục mới `loai_hang`, `dong_xe` — cùng khuôn nhom_hang (0004 + RLS
--    0015 + policy xóa 0040): mọi vai trò đọc, quản lý + văn phòng thêm/sửa/xóa.
-- 2. san_pham thêm loai_hang_id, dong_xe_id, duoc_ban_truc_tiep. Cột mới phải
--    tự grant select/insert/update (bẫy 5, khối tự kiểm 0029 cuối file).
-- 3. chi_tiet_san_pham trả thêm ba cột trên (đổi kiểu trả về → drop + create).
-- 4. RPC nhap_ma_hang_moi: CHỈ tạo mã mới. Dòng lỗi (trùng mã/tên trong file
--    hoặc với danh mục, thiếu trường bắt buộc) bị bỏ qua kèm lý do, dòng hợp lệ
--    vẫn nhập. Tồn trong file vào sổ bằng MỘT phiếu DIEU_CHINH đã ghi sổ trong
--    cùng transaction — không dòng nào ghi thẳng vào ton_kho (nguyên tắc 1–2).
--    Cập nhật mã đã có vẫn đi đường nhap_danh_muc (0034), không đổi.
-- =============================================================================

-- --- 1. Danh mục Loại hàng, Dòng xe ----------------------------------------
create table public.loai_hang (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dong_xe (
  id uuid primary key default uuid_generate_v4(),
  ma text not null unique,
  ten text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_loai_hang
  before update on public.loai_hang
  for each row execute function public.update_updated_at();
create trigger set_updated_at_dong_xe
  before update on public.dong_xe
  for each row execute function public.update_updated_at();

alter table public.loai_hang enable row level security;
alter table public.dong_xe   enable row level security;

create policy "moi vai tro doc loai hang" on public.loai_hang for select to authenticated using (true);
create policy "them loai hang" on public.loai_hang
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua loai hang" on public.loai_hang
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "xoa loai hang" on public.loai_hang
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "moi vai tro doc dong xe" on public.dong_xe for select to authenticated using (true);
create policy "them dong xe" on public.dong_xe
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua dong xe" on public.dong_xe
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "xoa dong xe" on public.dong_xe
  for delete to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- --- 2. Cột mới của san_pham ------------------------------------------------
alter table public.san_pham
  add column loai_hang_id uuid references public.loai_hang(id),
  add column dong_xe_id uuid references public.dong_xe(id),
  -- Mặc định bật: mọi mã hiện có đều đang được bán thẳng cho khách.
  add column duoc_ban_truc_tiep boolean not null default true;

create index idx_san_pham_loai_hang on public.san_pham (loai_hang_id) where loai_hang_id is not null;
create index idx_san_pham_dong_xe on public.san_pham (dong_xe_id) where dong_xe_id is not null;

grant select (loai_hang_id, dong_xe_id, duoc_ban_truc_tiep) on public.san_pham to authenticated;
grant insert (loai_hang_id, dong_xe_id, duoc_ban_truc_tiep) on public.san_pham to authenticated;
grant update (loai_hang_id, dong_xe_id, duoc_ban_truc_tiep) on public.san_pham to authenticated;

-- --- 3. chi_tiet_san_pham trả thêm ba cột -----------------------------------
drop function public.chi_tiet_san_pham(uuid);

create function public.chi_tiet_san_pham(p_id uuid)
 returns table(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone, loai_hang_id uuid, ten_loai_hang text, dong_xe_id uuid, ten_dong_xe text, duoc_ban_truc_tiep boolean)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with ton as (
    select tk.san_pham_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where tk.san_pham_id = p_id
      and (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
    group by tk.san_pham_id
  )
  select sp.id, sp.ma_hang, sp.ten_hang, sp.nhom_hang_id, nh.ten, sp.dvt_id, dv.ten,
         sp.cong_doan_id, cd.ma, cd.ten, cd.mau_hien_thi, sp.quy_doi, sp.gia_ban,
         case when v_xem_gv then sp.gia_von end,
         sp.ton_toi_thieu, sp.ton_toi_da, sp.kho_mac_dinh_id, k.ten, sp.dang_kinh_doanh,
         coalesce(ton.so_luong, 0),
         public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra),
         sp.can_ra_dvt, sp.barcode, sp.hinh_anh_url, sp.vi_tri_ke, sp.ghi_chu,
         sp.created_at, sp.updated_at,
         sp.loai_hang_id, lh.ten, sp.dong_xe_id, dx.ten, sp.duoc_ban_truc_tiep
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  left join public.kho k on k.id = sp.kho_mac_dinh_id
  left join public.loai_hang lh on lh.id = sp.loai_hang_id
  left join public.dong_xe dx on dx.id = sp.dong_xe_id
  left join ton on ton.san_pham_id = sp.id
  where sp.id = p_id;
end;
$function$;

revoke all    on function public.chi_tiet_san_pham(uuid) from public, anon;
grant execute on function public.chi_tiet_san_pham(uuid) to authenticated;

-- --- 4. nhap_ma_hang_moi ----------------------------------------------------
-- So tên "giống nhau": bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng.
-- "  nhong xich ZQX cu " trùng "Nhông xích Zqx cũ".
create or replace function public.chuan_hoa_ten(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(public.f_unaccent(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g')));
$$;

create or replace function public.nhap_ma_hang_moi(
  p_dong jsonb,
  p_kho_id uuid,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dong jsonb;
  v_so int;
  v_ma text;
  v_ten text;
  v_ton numeric(18,4);
  v_ly_do text[];
  v_hop_le jsonb := '[]'::jsonb;
  v_loi jsonb := '[]'::jsonb;
  v_cong_doan uuid := (select id from public.cong_doan where ma = 'MUA_NGOAI');
  v_ct public.chung_tu;
  v_co_ton boolean;
begin
  -- SECURITY DEFINER bỏ qua RLS — kiểm quyền tường minh, cùng phạm vi nhap_danh_muc.
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng nhập được mã hàng' using errcode = '42501';
  end if;
  if p_dong is null or jsonb_typeof(p_dong) <> 'array' then
    raise exception 'Dữ liệu nhập phải là một mảng dòng' using errcode = '23514';
  end if;
  if jsonb_array_length(p_dong) > 10000 then
    raise exception 'File quá 10.000 dòng — chia nhỏ rồi nhập lại' using errcode = '23514';
  end if;
  if p_kho_id is not null and not exists (
    select 1 from public.kho where id = p_kho_id and dang_hoat_dong
  ) then
    raise exception 'Kho đã chọn không còn hoạt động' using errcode = '23514';
  end if;

  -- Mã / tên chuẩn hóa của cả file — đếm trùng TRONG file một lần.
  create temp table if not exists _nmm_file (ma text, ten text) on commit drop;
  truncate _nmm_file;
  insert into _nmm_file
  select lower(trim(coalesce(d->>'ma_hang', ''))), public.chuan_hoa_ten(d->>'ten_hang')
  from jsonb_array_elements(p_dong) d;

  for v_dong in select * from jsonb_array_elements(p_dong) loop
    v_ly_do := '{}';
    v_so := nullif(v_dong->>'dong', '')::int;
    v_ma := nullif(trim(coalesce(v_dong->>'ma_hang', '')), '');
    v_ten := nullif(regexp_replace(trim(coalesce(v_dong->>'ten_hang', '')), '\s+', ' ', 'g'), '');

    if v_ma is null then
      v_ly_do := array_append(v_ly_do, 'Thiếu mã hàng');
    elsif (select count(*) from _nmm_file f where f.ma = lower(v_ma)) > 1 then
      v_ly_do := array_append(v_ly_do, 'Mã hàng trùng với dòng khác trong file');
    elsif exists (select 1 from public.san_pham sp where lower(sp.ma_hang) = lower(v_ma)) then
      v_ly_do := array_append(v_ly_do, 'Mã hàng đã có trong danh mục');
    end if;

    if v_ten is null then
      v_ly_do := array_append(v_ly_do, 'Thiếu tên hàng');
    elsif (select count(*) from _nmm_file f where f.ten = public.chuan_hoa_ten(v_ten)) > 1 then
      v_ly_do := array_append(v_ly_do, 'Tên hàng trùng với dòng khác trong file');
    elsif exists (
      select 1 from public.san_pham sp where public.chuan_hoa_ten(sp.ten_hang) = public.chuan_hoa_ten(v_ten)
    ) then
      v_ly_do := array_append(v_ly_do, 'Tên hàng đã có trong danh mục');
    end if;

    -- Ô Excel gõ nhầm chữ không được làm hỏng cả lần nhập.
    begin
      v_ton := coalesce(nullif(v_dong->>'ton_kho', '')::numeric, 0);
    exception when invalid_text_representation then
      v_ton := 0;
      v_ly_do := array_append(v_ly_do, 'Tồn kho không phải là số');
    end;
    if v_ton < 0 then
      v_ly_do := array_append(v_ly_do, 'Tồn kho không được âm');
    elsif v_ton <> 0 and p_kho_id is null then
      v_ly_do := array_append(v_ly_do, 'Chưa chọn kho để ghi tồn');
    end if;

    if nullif(v_dong->>'dvt_id', '') is null then
      v_ly_do := array_append(v_ly_do, 'Chưa chọn đơn vị tính');
    elsif not exists (select 1 from public.don_vi_tinh where id = (v_dong->>'dvt_id')::uuid) then
      v_ly_do := array_append(v_ly_do, 'Đơn vị tính không còn trong danh mục');
    end if;
    if nullif(v_dong->>'nhom_hang_id', '') is not null
       and not exists (select 1 from public.nhom_hang where id = (v_dong->>'nhom_hang_id')::uuid) then
      v_ly_do := array_append(v_ly_do, 'Nhóm hàng không còn trong danh mục');
    end if;
    if nullif(v_dong->>'loai_hang_id', '') is not null
       and not exists (select 1 from public.loai_hang where id = (v_dong->>'loai_hang_id')::uuid) then
      v_ly_do := array_append(v_ly_do, 'Loại hàng không còn trong danh mục');
    end if;
    if nullif(v_dong->>'dong_xe_id', '') is not null
       and not exists (select 1 from public.dong_xe where id = (v_dong->>'dong_xe_id')::uuid) then
      v_ly_do := array_append(v_ly_do, 'Dòng xe không còn trong danh mục');
    end if;

    if cardinality(v_ly_do) > 0 then
      v_loi := v_loi || jsonb_build_object(
        'dong', v_so, 'ma_hang', coalesce(v_ma, ''), 'ten_hang', coalesce(v_ten, ''),
        'ly_do', array_to_string(v_ly_do, '; ')
      );
    else
      v_hop_le := v_hop_le || (v_dong || jsonb_build_object('ma_hang', v_ma, 'ten_hang', v_ten, 'ton_kho', v_ton));
    end if;
  end loop;

  if p_chi_kiem_tra or jsonb_array_length(v_hop_le) = 0 then
    return jsonb_build_object(
      'da_nap', false, 'them', jsonb_array_length(v_hop_le), 'so_loi', jsonb_array_length(v_loi),
      'loi', v_loi, 'chung_tu_id', null, 'so_ct', null
    );
  end if;

  perform set_config('app.nguon_sua', 'import', true);

  create temp table if not exists _nmm_moi (id uuid, ton numeric) on commit drop;
  truncate _nmm_moi;
  with moi as (
    insert into public.san_pham (
      ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id, loai_hang_id, dong_xe_id,
      dang_kinh_doanh, duoc_ban_truc_tiep, vi_tri_ke, ghi_chu, kho_mac_dinh_id
    )
    select d->>'ma_hang', d->>'ten_hang', (d->>'dvt_id')::uuid, v_cong_doan,
           nullif(d->>'nhom_hang_id', '')::uuid, nullif(d->>'loai_hang_id', '')::uuid,
           nullif(d->>'dong_xe_id', '')::uuid,
           coalesce((d->>'dang_kinh_doanh')::boolean, true),
           coalesce((d->>'duoc_ban_truc_tiep')::boolean, true),
           nullif(trim(coalesce(d->>'vi_tri_ke', '')), ''),
           nullif(trim(coalesce(d->>'ghi_chu', '')), ''),
           p_kho_id
    from jsonb_array_elements(v_hop_le) d
    returning id, ma_hang
  )
  insert into _nmm_moi
  select moi.id, (d->>'ton_kho')::numeric
  from moi join jsonb_array_elements(v_hop_le) d on d->>'ma_hang' = moi.ma_hang;

  v_co_ton := exists (select 1 from _nmm_moi where ton <> 0);
  if v_co_ton then
    insert into public.chung_tu (so_ct, loai_ct, kho_id, ghi_chu)
    values (public.sinh_so_ct('DIEU_CHINH'::public.loai_ct), 'DIEU_CHINH', p_kho_id,
            'Tồn ban đầu của mã hàng mới nhập từ Excel')
    returning * into v_ct;

    -- don_gia = 0: điều chỉnh SỐ LƯỢNG, không mang tiền.
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
    select v_ct.id, m.id, m.ton, 0, 0, p_kho_id from _nmm_moi m where m.ton <> 0;

    -- Không bọc exception: lỗi ghi sổ rollback luôn các mã vừa tạo (nguyên tắc 4).
    perform public.ghi_so_chung_tu(v_ct.id);
  end if;

  return jsonb_build_object(
    'da_nap', true, 'them', jsonb_array_length(v_hop_le), 'so_loi', jsonb_array_length(v_loi),
    'loi', v_loi, 'chung_tu_id', v_ct.id, 'so_ct', v_ct.so_ct
  );
end;
$$;

revoke all    on function public.nhap_ma_hang_moi(jsonb, uuid, boolean) from public, anon;
grant execute on function public.nhap_ma_hang_moi(jsonb, uuid, boolean) to authenticated;

comment on function public.nhap_ma_hang_moi(jsonb, uuid, boolean) is
  'IMP-01..04: tạo mã hàng MỚI từ màn nhập Excel 4 cột. Dòng lỗi (trùng mã/tên trong file hoặc với danh mục — tên so không dấu; thiếu mã/tên/ĐVT; tồn âm hoặc không phải số; có tồn mà chưa chọn kho) bị bỏ qua kèm lý do, dòng hợp lệ vẫn nhập. Tồn khác 0 vào sổ bằng MỘT phiếu DIEU_CHINH tự ghi sổ, kho = p_kho_id (cũng là kho mặc định của mã mới). p_chi_kiem_tra = true (mặc định) không ghi gì. Chỉ quản lý + văn phòng.';
