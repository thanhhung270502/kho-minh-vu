-- =============================================================================
-- 0088 — Combo: tồn trừ theo mã thành phần (Quy chuẩn mã, phần D)
--
-- Combo (san_pham.loai_hang = 'COMBO', 0086) không có tồn riêng. Khai thành
-- phần ở thanh_phan_combo; ghi sổ phiếu Xuất / Trả NCC / Khách trả tách dòng
-- combo thành một bút toán cho TỪNG mã thành phần (số lượng x định mức), cùng
-- chung_tu_dong_id của dòng combo — huy_chung_tu (đảo từng bút toán) nhờ vậy
-- trả lại đúng mà không phải sửa.
--
-- Nhập / chuyển kho / kiểm kê / điều chỉnh: chặn dòng combo, làm theo mã
-- thành phần (nhập combo phải chia giá vốn cho thành phần — không có quy tắc).
-- =============================================================================

create table public.thanh_phan_combo (
  id uuid primary key default uuid_generate_v4(),
  combo_id uuid not null references public.san_pham (id),
  thanh_phan_id uuid not null references public.san_pham (id),
  so_luong numeric(18,4) not null check (so_luong > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (combo_id, thanh_phan_id),
  check (combo_id <> thanh_phan_id)
);
create index idx_thanh_phan_combo_thanh_phan on public.thanh_phan_combo (thanh_phan_id);

create trigger set_updated_at_thanh_phan_combo
  before update on public.thanh_phan_combo
  for each row execute function public.update_updated_at();

alter table public.thanh_phan_combo enable row level security;
create policy "moi vai tro doc thanh phan combo" on public.thanh_phan_combo
  for select to authenticated using (true);
-- Chỉ ghi qua RPC luu_thanh_phan_combo (kiểm loại hàng, không lồng combo).
revoke insert, update, delete on public.thanh_phan_combo from anon, authenticated;

-- --- _tach_combo -------------------------------------------------------------
-- Một dòng chứng từ → các dòng đi vào sổ cái. Hàng hóa: chính nó. Combo: từng
-- mã thành phần x định mức (combo rỗng → không dòng nào; ghi sổ chặn trước).
create or replace function public._tach_combo(p_san_pham_id uuid, p_so_luong numeric)
returns table (san_pham_id uuid, so_luong numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p_san_pham_id, p_so_luong
  where not exists (select 1 from public.san_pham sp where sp.id = p_san_pham_id and sp.loai_hang = 'COMBO')
  union all
  select tp.thanh_phan_id, p_so_luong * tp.so_luong
  from public.thanh_phan_combo tp
  join public.san_pham sp on sp.id = tp.combo_id and sp.loai_hang = 'COMBO'
  where tp.combo_id = p_san_pham_id;
$$;
revoke all on function public._tach_combo(uuid, numeric) from public, anon, authenticated;

-- --- luu_thanh_phan_combo -----------------------------------------------------
-- p_thanh_phan: [{thanh_phan_id, so_luong}] — thay TOÀN BỘ thành phần của combo.
create or replace function public.luu_thanh_phan_combo(p_combo_id uuid, p_thanh_phan jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loai text;
  v_ma text;
  v_so int;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  select loai_hang, ma_hang into v_loai, v_ma from public.san_pham where id = p_combo_id for update;
  if v_loai is null then
    raise exception 'Không tìm thấy mã hàng %', p_combo_id using errcode = '23514';
  end if;
  if v_loai <> 'COMBO' then
    raise exception 'Mã % không phải loại Combo — đổi Loại hàng sang Combo trước khi khai thành phần.', v_ma
      using errcode = '23514';
  end if;
  if p_thanh_phan is null or jsonb_typeof(p_thanh_phan) <> 'array' then
    raise exception 'Danh sách thành phần phải là một mảng' using errcode = '23514';
  end if;

  create temp table if not exists _tp_moi (thanh_phan_id uuid, so_luong numeric) on commit drop;
  truncate _tp_moi;
  insert into _tp_moi
  select (e->>'thanh_phan_id')::uuid, (e->>'so_luong')::numeric
  from jsonb_array_elements(p_thanh_phan) e;

  if exists (select 1 from _tp_moi where thanh_phan_id is null or so_luong is null or so_luong <= 0) then
    raise exception 'Mỗi thành phần phải có mã và số lượng lớn hơn 0' using errcode = '23514';
  end if;
  if exists (select 1 from _tp_moi where thanh_phan_id = p_combo_id) then
    raise exception 'Combo không chứa được chính nó' using errcode = '23514';
  end if;
  if exists (select thanh_phan_id from _tp_moi group by thanh_phan_id having count(*) > 1) then
    raise exception 'Một mã thành phần chỉ khai một lần — cộng số lượng lại' using errcode = '23514';
  end if;
  if exists (select 1 from _tp_moi t left join public.san_pham sp on sp.id = t.thanh_phan_id where sp.id is null) then
    raise exception 'Có mã thành phần không tồn tại' using errcode = '23514';
  end if;
  select string_agg(sp.ma_hang, ', ') into v_ma
  from _tp_moi t join public.san_pham sp on sp.id = t.thanh_phan_id
  where sp.loai_hang = 'COMBO';
  if v_ma is not null then
    raise exception 'Không lồng combo trong combo: % là combo', v_ma using errcode = '23514';
  end if;

  delete from public.thanh_phan_combo where combo_id = p_combo_id;
  insert into public.thanh_phan_combo (combo_id, thanh_phan_id, so_luong)
  select p_combo_id, thanh_phan_id, so_luong from _tp_moi;
  get diagnostics v_so = row_count;
  return v_so;
end;
$$;
revoke all on function public.luu_thanh_phan_combo(uuid, jsonb) from public, anon;
grant execute on function public.luu_thanh_phan_combo(uuid, jsonb) to authenticated;

-- --- Đổi Loại hàng -------------------------------------------------------------
-- Sang Combo: mã phải hết tồn (combo không có tồn riêng — tồn cũ sẽ treo vĩnh
-- viễn) và không đang là thành phần của combo khác (không lồng combo).
-- Về Hàng hóa: phải xóa hết thành phần trước.
create or replace function public.kiem_doi_loai_hang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_ton numeric;
begin
  if new.loai_hang = old.loai_hang then
    return new;
  end if;
  if new.loai_hang = 'COMBO' then
    select coalesce(sum(so_luong), 0) into v_ton from public.ton_kho where san_pham_id = new.id;
    if v_ton <> 0 then
      raise exception 'Mã % đang tồn % — combo không có tồn riêng. Xuất/điều chỉnh về 0 trước khi đổi sang Combo.',
        new.ma_hang, v_ton using errcode = '23514';
    end if;
    if exists (select 1 from public.thanh_phan_combo where thanh_phan_id = new.id) then
      raise exception 'Mã % đang là thành phần của combo khác — không lồng combo trong combo.', new.ma_hang
        using errcode = '23514';
    end if;
  elsif exists (select 1 from public.thanh_phan_combo where combo_id = new.id) then
    raise exception 'Combo % còn mã thành phần — xóa hết thành phần trước khi đổi về Hàng hóa.', new.ma_hang
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger kiem_doi_loai_hang_san_pham
  before update of loai_hang on public.san_pham
  for each row execute function public.kiem_doi_loai_hang();

-- --- dong_chung_tu: tồn khả dụng của combo ---------------------------------------
-- Combo = số bộ ráp được từ tồn thành phần (min tồn / định mức) — cảnh báo
-- vượt tồn và panel lý do xuất âm trên phiếu chạy đúng mà không sửa giao diện.
create or replace function public.dong_chung_tu(p_id uuid)
 RETURNS TABLE(id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text, so_luong numeric, don_gia numeric, thanh_tien numeric, kho_id uuid, ten_kho text, ghi_chu text, ton_hien_tai numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  -- Quyền xem dòng bám theo quyền xem phiếu: hàm trên đã lọc phạm vi kho.
  if not exists (select 1 from public.chi_tiet_chung_tu(p_id)) then
    return;
  end if;

  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong, d.don_gia, d.thanh_tien,
         coalesce(d.kho_id, ct.kho_id), k.ten, d.ghi_chu,
         case when sp.loai_hang = 'COMBO' then
           coalesce((
             select min(floor(coalesce(t2.so_luong, 0) / tp.so_luong))
             from public.thanh_phan_combo tp
             left join public.ton_kho t2 on t2.san_pham_id = tp.thanh_phan_id
                                        and t2.kho_id = coalesce(d.kho_id, ct.kho_id)
             where tp.combo_id = d.san_pham_id
           ), 0)
         else coalesce(tk.so_luong, 0) end
  from public.chung_tu_dong d
  join public.chung_tu ct       on ct.id = d.chung_tu_id
  join public.san_pham sp       on sp.id = d.san_pham_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.kho k        on k.id = coalesce(d.kho_id, ct.kho_id)
  left join public.ton_kho tk   on tk.san_pham_id = d.san_pham_id
                                and tk.kho_id = coalesce(d.kho_id, ct.kho_id)
  where d.chung_tu_id = p_id
  order by d.created_at, d.id;
end;
$function$;

-- --- ghi_so_chung_tu: tách combo -------------------------------------------------
CREATE OR REPLACE FUNCTION public.ghi_so_chung_tu(p_chung_tu_id uuid)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_dong public.chung_tu_dong;
  v_so_dong integer;
  v_ton_hien_tai numeric(18,4);
  v_tp record;
  v_dong_tp public.chung_tu_dong;
  v_la_combo boolean;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;

  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Chứng từ % đang ở trạng thái %, không ghi sổ lại được', v_ct.so_ct, v_ct.trang_thai
      using errcode = '23514';
  end if;

  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  -- 0083: vai_tro_hien_tai() NULL (tài khoản bị khóa / token lệch bảng) trước
  -- đây lọt qua phép so sánh "= 'chi_xem'". Chỉ bỏ qua khi không có người dùng
  -- (postgres chạy script) — cùng quy ước co_quyen().
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được ghi sổ chứng từ' using errcode = '42501';
  end if;
  if v_ct.loai_ct = 'NHAP' and not public.co_quyen('nhap_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Nhập đơn hàng' using errcode = '42501';
  end if;

  -- 0066 (KKE-04, T-06-22/T-06-23, 06-RESEARCH.md §Security Domain): ghi_so_chung_tu
  -- được grant cho MỌI authenticated — một người có quyền ghi sổ thường (mọi vai
  -- trò trừ chi_xem) vẫn gọi thẳng được hàm này cho phiếu KIEM_KE nếu không có cửa
  -- chặn ở đây, bỏ qua toàn bộ kiểm D-07 (còn mã chưa đếm)/D-14 (quyền duyệt) của
  -- duyet_phien_kiem_ke. Cờ kho_minh_vu.duyet_kiem_ke là transaction-local
  -- (set_config ... true) — chỉ duyet_phien_kiem_ke đặt được, và PostgREST không
  -- cho client tự gọi set_config nên không giả được cờ này qua REST. Kiểm
  -- duyet_duoc_kiem_ke() lần hai ở đây là phòng thủ nhiều lớp (defense in depth),
  -- phòng trường hợp có đường gọi nội bộ khác quên đặt cờ đúng cách.
  -- auth.uid() is null (chạy dưới postgres — script/migration/nap_ton_tam nội bộ,
  -- không qua phiên PostgREST) KHÔNG bị chặn: các RPC nội bộ tự gọi
  -- ghi_so_chung_tu cho KIEM_KE (không có trong dự án hiện tại, nhưng để ngỏ) chạy
  -- dưới postgres nên không có JWT, và mọi client PostgREST LUÔN có auth.uid() khi
  -- đã đăng nhập (chưa đăng nhập thì vai_tro_hien_tai() đã null từ khối RLS khác).
  if v_ct.loai_ct = 'KIEM_KE' and auth.uid() is not null
     and (
       coalesce(current_setting('kho_minh_vu.duyet_kiem_ke', true), '') <> 'on'
       or not (select public.duyet_duoc_kiem_ke())
     ) then
    raise exception 'Phiếu kiểm kê chỉ ghi sổ qua nút Duyệt phiên' using errcode = '42501';
  end if;

  select count(*) into v_so_dong from public.chung_tu_dong where chung_tu_id = p_chung_tu_id;
  if v_so_dong = 0 then
    raise exception 'Chứng từ % không có dòng nào, không ghi sổ được', v_ct.so_ct
      using errcode = '23514';
  end if;

  for v_dong in
    select * from public.chung_tu_dong where chung_tu_id = p_chung_tu_id order by created_at, id
  loop
    -- 0088: combo không có tồn riêng. Chỉ phiếu Xuất / Trả NCC / Khách trả
    -- tách combo ra mã thành phần; nhập, chuyển kho, kiểm kê, điều chỉnh làm
    -- theo mã thành phần (nhập combo phải chia giá vốn — không có quy tắc).
    v_la_combo := (select sp.loai_hang = 'COMBO' from public.san_pham sp where sp.id = v_dong.san_pham_id);
    if v_la_combo then
      if v_ct.loai_ct not in ('XUAT', 'TRA_NCC', 'TRA_KHACH') then
        raise exception 'Mã % là combo — % theo từng mã thành phần, không theo mã combo.',
          (select ma_hang from public.san_pham where id = v_dong.san_pham_id),
          case v_ct.loai_ct when 'NHAP' then 'nhập kho' when 'KIEM_KE' then 'kiểm kê'
                            when 'CHUYEN_KHO' then 'chuyển kho' else 'điều chỉnh' end
          using errcode = '23514';
      end if;
      if not exists (select 1 from public.thanh_phan_combo where combo_id = v_dong.san_pham_id) then
        raise exception 'Combo % chưa khai báo mã thành phần — khai ở Danh sách hàng hóa trước khi ghi sổ.',
          (select ma_hang from public.san_pham where id = v_dong.san_pham_id)
          using errcode = '23514';
      end if;
    end if;

    -- Mỗi dòng "thật" đi vào sổ cái: chính dòng đó, hoặc từng mã thành phần
    -- (số lượng x định mức) khi là combo. Bút toán vẫn trỏ về dòng combo
    -- (chung_tu_dong_id) nên huy_chung_tu đảo đúng từng dòng thành phần.
    for v_tp in select * from public._tach_combo(v_dong.san_pham_id, v_dong.so_luong)
    loop
      v_dong_tp := v_dong;
      v_dong_tp.san_pham_id := v_tp.san_pham_id;
      v_dong_tp.so_luong := v_tp.so_luong;

      -- Chặn xuất âm khi chưa chọn lý do.
      if v_ct.loai_ct in ('XUAT','TRA_NCC') and v_ct.ly_do_xuat_am is null then
        select coalesce(so_luong, 0) into v_ton_hien_tai
        from public.ton_kho
        where kho_id = coalesce(v_dong_tp.kho_id, v_ct.kho_id) and san_pham_id = v_dong_tp.san_pham_id;

        if coalesce(v_ton_hien_tai, 0) - v_dong_tp.so_luong < 0 then
          raise exception
            'Xuất quá tồn cho sản phẩm % (tồn %, xuất %). Phải chọn lý do xuất âm trước khi ghi sổ.',
            v_dong_tp.san_pham_id, coalesce(v_ton_hien_tai, 0), v_dong_tp.so_luong
            using errcode = '23514';
        end if;
      end if;

      case v_ct.loai_ct
        when 'NHAP'       then perform public._ghi_so_nhap(v_ct, v_dong_tp);
        when 'XUAT'       then perform public._ghi_so_xuat(v_ct, v_dong_tp);
        when 'TRA_NCC'    then perform public._ghi_so_tra_ncc(v_ct, v_dong_tp);
        when 'TRA_KHACH'  then perform public._ghi_so_tra_khach(v_ct, v_dong_tp);
        when 'CHUYEN_KHO' then perform public._ghi_so_chuyen_kho(v_ct, v_dong_tp);
        when 'KIEM_KE'    then perform public._ghi_so_kiem_ke(v_ct, v_dong_tp);
        when 'DIEU_CHINH' then perform public._ghi_so_dieu_chinh(v_ct, v_dong_tp);
      end case;
    end loop;
  end loop;

  -- KHÔNG bọc vòng lặp trên trong `exception when others` — làm vậy sẽ nuốt lỗi
  -- và phá đúng tính chất atomic cần có. Lỗi ở dòng thứ n phải rollback cả n-1
  -- dòng trước, và transaction ngầm định của RPC lo việc đó.

  update public.chung_tu
  set trang_thai = 'HOAN_THANH',
      ngay_ghi_so = now(),
      nguoi_duyet_id = auth.uid(),
      tong_so_luong = (select coalesce(sum(so_luong),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id),
      tong_tien     = (select coalesce(sum(thanh_tien),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id)
  where id = p_chung_tu_id
  returning * into v_ct;

  -- Đặt SAU khi chứng từ đã HOAN_THANH: subquery bên trong _cap_nhat_tien_do_ddh
  -- lọc trang_thai = 'HOAN_THANH' trên bảng chung_tu, phải thấy đúng chứng từ vừa
  -- ghi sổ này (bug thật đã sửa ở 0051, xem comment gốc).
  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
  end if;

  return v_ct;
end;
$function$;


-- --- nhap_ma_hang_moi: combo không nhận tồn đầu kỳ ------------------------------
-- Tồn đầu kỳ ghi bằng phiếu DIEU_CHINH, mà ghi sổ (ở trên) chặn dòng combo —
-- báo lỗi theo dòng thay vì làm hỏng cả lần nhập.
CREATE OR REPLACE FUNCTION public.nhap_ma_hang_moi(p_dong jsonb, p_kho_id uuid, p_chi_kiem_tra boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
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
    if coalesce(nullif(v_dong->>'loai_hang', ''), 'HANG_HOA') not in ('HANG_HOA', 'COMBO') then
      v_ly_do := array_append(v_ly_do, 'Loại hàng phải là Hàng hóa hoặc Combo');
    end if;
    -- 0088: combo không có tồn riêng — tồn nằm ở các mã thành phần.
    if v_dong->>'loai_hang' = 'COMBO' and v_ton <> 0 then
      v_ly_do := array_append(v_ly_do, 'Combo không có tồn riêng — để trống tồn kho, nhập tồn cho mã thành phần');
    end if;
    if nullif(v_dong->>'ma_xu_ly', '') is not null
       and not exists (select 1 from public.cong_doan where upper(ma_quy_chuan) = upper(v_dong->>'ma_xu_ly')) then
      v_ly_do := array_append(v_ly_do, 'Xử lý không có trong quy chuẩn');
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
      ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id, loai_hang,
      hang_xe, dong_xe, linh_kien,
      dang_kinh_doanh, duoc_ban_truc_tiep, vi_tri_ke, mo_ta, kho_mac_dinh_id
    )
    select d->>'ma_hang', d->>'ten_hang', (d->>'dvt_id')::uuid,
           -- 0086: xử lý theo quy chuẩn (tách từ mã) nếu có, không thì Mua ngoài.
           coalesce((select cd.id from public.cong_doan cd
                     where upper(cd.ma_quy_chuan) = upper(nullif(d->>'ma_xu_ly', ''))), v_cong_doan),
           nullif(d->>'nhom_hang_id', '')::uuid,
           coalesce(nullif(d->>'loai_hang', ''), 'HANG_HOA'),
           nullif(trim(coalesce(d->>'hang_xe', '')), ''),
           nullif(trim(coalesce(d->>'dong_xe', '')), ''),
           nullif(trim(coalesce(d->>'linh_kien', '')), ''),
           coalesce((d->>'dang_kinh_doanh')::boolean, true),
           coalesce((d->>'duoc_ban_truc_tiep')::boolean, true),
           nullif(trim(coalesce(d->>'vi_tri_ke', '')), ''),
           -- 0086: "Mô tả" trong file vào mo_ta; ghi_chu do trigger tự sinh.
           nullif(trim(coalesce(d->>'mo_ta', '')), ''),
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
$function$;

-- --- hoan_thanh_don: kiểm xuất âm theo mã thành phần -------------------------------
CREATE OR REPLACE FUNCTION public.hoan_thanh_don(p_don_id uuid, p_ly_do_xuat_am text DEFAULT NULL::text, p_ghi_chu_ly_do text DEFAULT NULL::text)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_don public.don_dat_hang;
  v_ct public.chung_tu;
  v_am text;
begin
  if not public.hoan_thanh_duoc_don() then
    raise exception 'Tài khoản không có quyền hoàn thành đơn' using errcode = '42501';
  end if;

  if p_ly_do_xuat_am is not null
     and p_ly_do_xuat_am not in ('MA_BI_TACH', 'HANG_VE_CHUA_NHAP', 'LECH_TON_CHO_KIEM_KE', 'KHAC') then
    raise exception 'Lý do xuất âm không hợp lệ: %', p_ly_do_xuat_am using errcode = '22023';
  end if;
  if p_ly_do_xuat_am = 'KHAC' and length(trim(coalesce(p_ghi_chu_ly_do, ''))) = 0 then
    raise exception 'Chọn lý do "Khác" thì phải ghi rõ lý do' using errcode = '23514';
  end if;

  -- Khóa đơn TRƯỚC: người bấm sau chờ, rồi thấy đơn đã Hoàn thành và bị từ chối.
  select * into v_don from public.don_dat_hang where id = p_don_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_don_id using errcode = '23514';
  end if;
  if v_don.trang_thai <> 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, chỉ đơn đã xác nhận mới hoàn thành được',
      v_don.so_dh, v_don.trang_thai using errcode = '23514';
  end if;

  v_ct := public.tao_phieu_xuat_tu_don(p_don_id);

  -- Kiểm xuất âm TRƯỚC ghi_so_chung_tu để báo bằng MÃ HÀNG — câu của ghi_so chỉ
  -- có uuid sản phẩm, người dùng không đọc được. Cùng phép tính với ghi_so
  -- (tồn tại kho của dòng, rơi về kho đầu phiếu). Câu phải chứa "lý do xuất âm":
  -- client dựa vào đó để hỏi lý do (sales-order/lib/complete-order.ts).
  if p_ly_do_xuat_am is null then
    select string_agg(
             format('%s (tồn %s, xuất %s)', sp.ma_hang,
                    trim_scale(coalesce(tk.so_luong, 0)), trim_scale(x.so_luong)),
             '; ' order by sp.ma_hang)
      into v_am
    -- 0088: dòng combo kiểm trên từng mã thành phần (_tach_combo), như ghi sổ.
    from public.chung_tu_dong ctd
    cross join lateral public._tach_combo(ctd.san_pham_id, ctd.so_luong) x
    join public.san_pham sp on sp.id = x.san_pham_id
    left join public.ton_kho tk
      on tk.san_pham_id = x.san_pham_id and tk.kho_id = coalesce(ctd.kho_id, v_ct.kho_id)
    where ctd.chung_tu_id = v_ct.id
      and coalesce(tk.so_luong, 0) - x.so_luong < 0;

    if v_am is not null then
      raise exception 'Xuất quá tồn: %. Phải chọn lý do xuất âm trước khi hoàn thành.', v_am
        using errcode = '23514';
    end if;
  end if;

  if p_ly_do_xuat_am is not null then
    update public.chung_tu
    set ly_do_xuat_am = p_ly_do_xuat_am,
        ghi_chu_ly_do = nullif(trim(coalesce(p_ghi_chu_ly_do, '')), '')
    where id = v_ct.id;
  end if;

  -- ghi_so_chung_tu ném 23514 nếu có dòng xuất âm mà chưa có lý do — cả
  -- transaction (gồm hóa đơn nháp vừa tạo) cuộn lại.
  v_ct := public.ghi_so_chung_tu(v_ct.id);

  -- Hóa đơn chép đủ số đặt nên _cap_nhat_tien_do_ddh đã tự đẩy đơn lên; đặt
  -- tường minh để không phụ thuộc phép tính đó.
  update public.don_dat_hang set trang_thai = 'HOAN_THANH' where id = p_don_id;

  return v_ct;
end;
$function$;
