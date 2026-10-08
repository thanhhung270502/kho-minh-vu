-- 0122: file Excel cập nhật Duyệt đơn theo mẫu "DanhSachChiTietHoaDon Đã process" (08/10/2026):
-- Mã đặt hàng · Mã hóa đơn · Ngày · Mã khách hàng · Người duyệt đơn · Người tạo · Ghi chú ·
-- Trạng thái · Mã hàng · Ghi chú dòng · Số lượng.
--
-- Người duyệt đơn của hóa đơn nạp từ KiotViet nằm trong ghi chú dưới dạng "Người bán: X"
-- (0115) — xử lý y như "Người nhập: X" của phiếu nhập (0112):
--   * tach_nguoi_ban / bo_nguoi_ban: tách / bỏ đoạn đó khỏi ghi chú
--   * xuat_excel_chung_tu: hóa đơn trả nguoi_ban, ghi_chu đã bỏ đoạn Người bán
--   * nhap_chung_tu_excel: đọc khóa nguoi_ban; nhập mới ghép vào ghi chú, cập nhật thay đoạn đó
--     (trống hoặc trùng người đang hiện = giữ nguyên)
-- Thân hàm chép từ 0120 / 0112, chỉ vá các chỗ ghi "0122".

create or replace function public.tach_nguoi_ban(p_ghi_chu text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(trim(substring(p_ghi_chu from 'Người bán:\s*([^' || chr(10) || '·]+)')), '')
$$;

create or replace function public.bo_nguoi_ban(p_ghi_chu text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(trim(both ' ·' from regexp_replace(p_ghi_chu,
    '\s*·?\s*Người bán:\s*[^' || chr(10) || '·]+', '')), '')
$$;

grant execute on function public.tach_nguoi_ban(text) to authenticated, service_role;
grant execute on function public.bo_nguoi_ban(text) to authenticated, service_role;

create or replace function public.nhap_chung_tu_excel(
  p_loai text,
  p_kieu text,
  p_phieu jsonb,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho_dau uuid;
  v_loai_ct public.loai_ct;
  v_moi integer := 0;
  v_sua integer := 0;
  v_so_dong integer := 0;
  v_ket_qua jsonb;
begin
  if p_loai is null or p_loai not in ('DON_DAT', 'HOA_DON', 'PHIEU_NHAP') then
    raise exception 'Loại chứng từ không hợp lệ: %', p_loai using errcode = '22023';
  end if;
  if p_kieu is null or p_kieu not in ('moi', 'cap_nhat') then
    raise exception 'Kiểu nhập không hợp lệ: %', p_kieu using errcode = '22023';
  end if;
  if jsonb_typeof(p_phieu) is distinct from 'array' then
    raise exception 'Dữ liệu phiếu phải là một mảng' using errcode = '22023';
  end if;
  if jsonb_array_length(p_phieu) > 1000 then
    raise exception 'Mỗi lần gửi tối đa 1.000 phiếu' using errcode = '22023';
  end if;

  -- SECURITY DEFINER bỏ qua RLS → kiểm quyền tường minh, khớp policy của bảng.
  if v_vai is null or v_vai = 'chi_xem' then
    raise exception 'Tài khoản không được tạo chứng từ' using errcode = '42501';
  end if;
  if p_loai = 'DON_DAT' and not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;
  if p_loai = 'PHIEU_NHAP' and not public.co_quyen('nhap_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Nhập kho' using errcode = '42501';
  end if;
  if p_loai = 'HOA_DON' and v_vai not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng nhập được hóa đơn từ Excel' using errcode = '42501';
  end if;

  v_loai_ct := case p_loai when 'HOA_DON' then 'XUAT' when 'PHIEU_NHAP' then 'NHAP' end;
  select k.id into v_kho_dau from public.kho k order by k.ma limit 1;

  drop table if exists _xl_phieu, _xl_dong, _xl_nv, _xl_loi, _xl_khop;

  create temp table _xl_loi (dong integer, so text, loi text, canh_bao boolean not null default false)
    on commit drop;

  create temp table _xl_phieu on commit drop as
  select
    nullif(trim(x->>'so'), '')                 as so,
    coalesce((x->>'dong_dau')::integer, 0)     as dong,
    nullif(x->>'ngay', '')::date               as ngay,
    nullif(x->>'ngay_giao', '')::date          as ngay_giao,
    nullif(x->>'loai_nhan', '')                as loai_nhan,
    nullif(trim(x->>'ma_doi_tac'), '')         as ma_doi_tac,
    nullif(x->>'nguon', '')                    as nguon,
    nullif(trim(x->>'ma_kho'), '')             as ma_kho,
    nullif(trim(x->>'ma_dat_hang'), '')        as ma_dat_hang,
    nullif(trim(x->>'ghi_chu'), '')            as ghi_chu,
    nullif(trim(x->>'ly_do_xuat_am'), '')      as ly_do_xuat_am,
    nullif(trim(x->>'ghi_chu_ly_do'), '')      as ghi_chu_ly_do,
    nullif(trim(x->>'nguoi_nhap'), '')         as nguoi_nhap,
    nullif(trim(x->>'nguoi_ban'), '')          as nguoi_ban,
    jsonb_array_length(coalesce(x->'dong', '[]')) as so_dong_file,
    null::uuid  as id_cu,
    null::date  as ngay_cu,
    null::uuid  as kho_cu,
    null::text  as loai_cu,
    null::text  as trang_thai_cu,
    null::uuid  as doi_tac_id,
    null::uuid  as kho_id,
    null::uuid  as don_id,
    null::uuid  as id_moi
  from jsonb_array_elements(p_phieu) as t(x);

  create temp table _xl_dong on commit drop as
  select
    nullif(trim(p.x->>'so'), '')                as so,
    coalesce((l->>'dong')::integer, 0)          as dong,
    d.thu_tu                                    as thu_tu,
    nullif(trim(l->>'ma_hang'), '')             as ma_hang,
    (l->>'so_luong')::numeric                   as so_luong,
    nullif(trim(l->>'ghi_chu'), '')             as ghi_chu,
    nullif(trim(l->>'nhan_vien'), '')           as nhan_vien,
    null::uuid as san_pham_id,
    null::uuid as kho_mac_dinh,
    null::uuid as nguoi_nhan_id
  from jsonb_array_elements(p_phieu) as p(x),
       jsonb_array_elements(coalesce(p.x->'dong', '[]')) with ordinality as d(l, thu_tu);

  create temp table _xl_nv on commit drop as
  select nullif(trim(p.x->>'so'), '') as so, trim(n.ten) as ten, n.thu_tu, null::uuid as nv_id
  from jsonb_array_elements(p_phieu) as p(x),
       jsonb_array_elements_text(coalesce(p.x->'nhan_vien', '[]')) with ordinality as n(ten, thu_tu)
  where trim(n.ten) <> '';

  -- 0110: phiếu nhập mới để trống Mã NCC → nhà máy Vũ Trụ (NCC000001), như nút Tạo phiếu nhập.
  if p_loai = 'PHIEU_NHAP' and p_kieu = 'moi' then
    update _xl_phieu p set ma_doi_tac = 'NCC000001' where p.ma_doi_tac is null;
  end if;

  -- 0120: đơn đặt / hóa đơn nhập mới không ghi Mã khách hàng lẫn nhân viên nhận →
  -- hóa đơn lấy người nhận của đơn đặt ở cột Mã đặt hàng; còn lại là NB001 (như tạo đơn, 0119).
  if p_loai in ('DON_DAT', 'HOA_DON') and p_kieu = 'moi' then
    if p_loai = 'HOA_DON' then
      update _xl_phieu p set ma_doi_tac = dt.ma, loai_nhan = null
      from public.don_dat_hang dh join public.doi_tac dt on dt.id = dh.doi_tac_id
      where p.ma_doi_tac is null and dh.so_dh = p.ma_dat_hang
        and not exists (select 1 from _xl_nv n where n.so = p.so);
    end if;
    update _xl_phieu p set ma_doi_tac = 'NB001', loai_nhan = null
    where p.ma_doi_tac is null
      and not exists (select 1 from _xl_nv n where n.so = p.so);
  end if;

  -- --- Tra mã -----------------------------------------------------------------
  update _xl_phieu p set doi_tac_id = dt.id
  from public.doi_tac dt where upper(dt.ma) = upper(p.ma_doi_tac);

  update _xl_phieu p set kho_id = k.id
  from public.kho k where upper(k.ma) = upper(p.ma_kho) or lower(k.ten) = lower(p.ma_kho);

  update _xl_dong d set san_pham_id = sp.id, kho_mac_dinh = sp.kho_mac_dinh_id
  from public.san_pham sp where upper(sp.ma_hang) = upper(d.ma_hang);

  update _xl_nv n set nv_id = nv.id
  from public.nhan_vien_phu_trach nv
  where upper(nv.ten_viet_tat) = upper(n.ten) or upper(nv.ten_day_du) = upper(n.ten);

  -- Dòng ghi đúng một tên nhân viên → người nhận của dòng.
  update _xl_dong d set nguoi_nhan_id = nv.id
  from public.nhan_vien_phu_trach nv
  where upper(nv.ten_viet_tat) = upper(d.nhan_vien) or upper(nv.ten_day_du) = upper(d.nhan_vien);

  if p_loai = 'DON_DAT' then
    update _xl_phieu p set id_cu = dh.id, trang_thai_cu = dh.trang_thai::text, loai_cu = 'DON_DAT'
    from public.don_dat_hang dh where dh.so_dh = p.so;
  else
    update _xl_phieu p set id_cu = ct.id, trang_thai_cu = ct.trang_thai::text, loai_cu = ct.loai_ct::text,
                           ngay_cu = ct.ngay_ct, kho_cu = ct.kho_id
    from public.chung_tu ct where ct.so_ct = p.so;

    update _xl_phieu p set don_id = dh.id
    from public.don_dat_hang dh where dh.so_dh = p.ma_dat_hang;
  end if;

  -- --- Kiểm lỗi ---------------------------------------------------------------
  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Thiếu số phiếu' from _xl_phieu p where p.so is null;

  insert into _xl_loi (dong, so, loi)
  select min(p.dong), p.so, 'Số phiếu ' || p.so || ' lặp lại trong file ở các dòng không liền nhau — gom các dòng của cùng một phiếu lại'
  from _xl_phieu p where p.so is not null group by p.so having count(*) > 1;

  if p_kieu = 'moi' then
    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Số ' || p.so || ' đã có trên hệ thống — dùng "Cập nhật" nếu muốn sửa phiếu này'
    from _xl_phieu p where p.id_cu is not null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Thiếu ngày' from _xl_phieu p where p.ngay is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Phiếu không có dòng hàng nào' from _xl_phieu p where p.so_dong_file = 0;

    if p_loai <> 'PHIEU_NHAP' then
      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Cần Mã khách hàng hoặc tên Nhân viên nhận'
      from _xl_phieu p
      where p.ma_doi_tac is null
        and not exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;
  else
    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Không tìm thấy số ' || p.so || ' — dùng "Nhập mới" để tạo phiếu này'
    from _xl_phieu p where p.so is not null and p.id_cu is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so, 'Số ' || p.so || ' là chứng từ loại khác, không phải '
      || case p_loai when 'HOA_DON' then 'hóa đơn' else 'phiếu nhập' end
    from _xl_phieu p
    where p.id_cu is not null and p_loai <> 'DON_DAT' and p.loai_cu <> v_loai_ct::text;

    -- Phiếu đã hủy: bỏ qua (cảnh báo), không chặn cả file — mẫu cập nhật xuất theo
    -- bộ lọc có thể chứa phiếu đã hủy.
    insert into _xl_loi (dong, so, loi, canh_bao)
    select p.dong, p.so, 'Phiếu ' || p.so || ' đã hủy — bỏ qua, không sửa', true
    from _xl_phieu p where p.trang_thai_cu = 'DA_HUY';
    delete from _xl_dong d using _xl_phieu p where d.so = p.so and p.trang_thai_cu = 'DA_HUY';
    delete from _xl_nv n using _xl_phieu p where n.so = p.so and p.trang_thai_cu = 'DA_HUY';
    delete from _xl_phieu p where p.trang_thai_cu = 'DA_HUY';

    -- Cập nhật chỉ sửa thông tin KHÔNG đụng tồn: ngày (thẻ kho ghi theo ngày phiếu),
    -- kho, mã hàng, số lượng phải giữ nguyên — ô trống = giữ nguyên.
    if p_loai <> 'DON_DAT' then
      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Ngày ' || to_char(p.ngay, 'DD/MM/YYYY') || ' khác ngày phiếu ('
        || to_char(p.ngay_cu, 'DD/MM/YYYY') || ') — Cập nhật không đổi ngày vì thẻ kho ghi theo ngày phiếu'
      from _xl_phieu p where p.id_cu is not null and p.ngay is not null and p.ngay <> p.ngay_cu;

      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Kho "' || p.ma_kho || '" khác kho của phiếu — Cập nhật không đổi kho vì ảnh hưởng tồn'
      from _xl_phieu p where p.id_cu is not null and p.kho_id is not null and p.kho_id <> p.kho_cu;
    end if;

    -- Ghép dòng file với dòng của phiếu theo (mã hàng, lần xuất hiện thứ n).
    if p_loai = 'DON_DAT' then
      create temp table _xl_khop on commit drop as
      with cu as (
        select p.so, x.id as dong_id, x.san_pham_id, x.so_luong_dat as so_luong,
               row_number() over (partition by x.don_dat_hang_id, x.san_pham_id order by x.created_at, x.id) as rn
        from _xl_phieu p join public.don_dat_hang_dong x on x.don_dat_hang_id = p.id_cu
        where p.so_dong_file > 0
      ), moi as (
        select d.so, d.dong, d.san_pham_id, d.so_luong,
               row_number() over (partition by d.so, d.san_pham_id order by d.thu_tu) as rn
        from _xl_dong d where d.san_pham_id is not null
      )
      select coalesce(m.so, c.so) as so, m.dong, coalesce(m.san_pham_id, c.san_pham_id) as san_pham_id,
             m.so_luong as so_luong_file, c.so_luong as so_luong_cu, c.dong_id
      from cu c full join moi m on m.so = c.so and m.san_pham_id = c.san_pham_id and m.rn = c.rn
      where coalesce(m.so, c.so) in (select x.so from _xl_phieu x where x.id_cu is not null);
    else
      create temp table _xl_khop on commit drop as
      with nguon as (
        -- Dòng của phiếu bổ sung "<số>-BS" tính như dòng của chính phiếu đó. UNION thay
        -- cho OR trong điều kiện join: OR làm mất index chung_tu_dong(chung_tu_id).
        select p.so, x.id, x.san_pham_id, x.so_luong, x.created_at, 0 as uu_tien
        from _xl_phieu p join public.chung_tu_dong x on x.chung_tu_id = p.id_cu
        where p.so_dong_file > 0
        union all
        select p.so, x.id, x.san_pham_id, x.so_luong, x.created_at, 1
        from _xl_phieu p
        join public.chung_tu bs on bs.so_ct = p.so || '-BS' and bs.loai_ct = v_loai_ct and bs.trang_thai <> 'DA_HUY'
        join public.chung_tu_dong x on x.chung_tu_id = bs.id
        where p.so_dong_file > 0 and p.id_cu is not null
      ), cu as (
        select n.so, n.id as dong_id, n.san_pham_id, n.so_luong,
               row_number() over (partition by n.so, n.san_pham_id order by n.uu_tien, n.created_at, n.id) as rn
        from nguon n
      ), moi as (
        select d.so, d.dong, d.san_pham_id, d.so_luong,
               row_number() over (partition by d.so, d.san_pham_id order by d.thu_tu) as rn
        from _xl_dong d where d.san_pham_id is not null
      )
      select coalesce(m.so, c.so) as so, m.dong, coalesce(m.san_pham_id, c.san_pham_id) as san_pham_id,
             m.so_luong as so_luong_file, c.so_luong as so_luong_cu, c.dong_id
      from cu c full join moi m on m.so = c.so and m.san_pham_id = c.san_pham_id and m.rn = c.rn
      where coalesce(m.so, c.so) in (select x.so from _xl_phieu x where x.id_cu is not null);
    end if;

    insert into _xl_loi (dong, so, loi)
    select k.dong, k.so, 'Mã ' || sp.ma_hang || ' không có trong phiếu ' || k.so
      || ' — Cập nhật không thêm dòng hàng vì ảnh hưởng tồn'
    from _xl_khop k join public.san_pham sp on sp.id = k.san_pham_id
    where k.dong_id is null;

    insert into _xl_loi (dong, so, loi)
    select p.dong, k.so, 'Phiếu ' || k.so || ' có mã ' || sp.ma_hang || ' (SL '
      || trim_scale(k.so_luong_cu)::text || ') nhưng file thiếu dòng này — Cập nhật không bớt dòng hàng. '
      || 'Muốn chỉ sửa đầu phiếu thì xóa trống Mã hàng và Số lượng ở mọi dòng của phiếu'
    from _xl_khop k
    join public.san_pham sp on sp.id = k.san_pham_id
    join _xl_phieu p on p.so = k.so
    where k.dong is null;

    insert into _xl_loi (dong, so, loi)
    select k.dong, k.so, 'Mã ' || sp.ma_hang || ': số lượng ' || trim_scale(k.so_luong_file)::text
      || ' khác phiếu (' || trim_scale(k.so_luong_cu)::text || ') — Cập nhật không đổi số lượng vì ảnh hưởng tồn'
    from _xl_khop k join public.san_pham sp on sp.id = k.san_pham_id
    where k.dong is not null and k.dong_id is not null and k.so_luong_file is distinct from k.so_luong_cu;
  end if;

  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Không có đối tác mã ' || p.ma_doi_tac
  from _xl_phieu p where p.ma_doi_tac is not null and p.doi_tac_id is null;

  insert into _xl_loi (dong, so, loi)
  select p.dong, p.so, 'Không có kho "' || p.ma_kho || '" — ghi mã kho (K1, K2) hoặc tên kho'
  from _xl_phieu p where p.ma_kho is not null and p.kho_id is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Không có mã hàng ' || d.ma_hang
  from _xl_dong d where d.ma_hang is not null and d.san_pham_id is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Thiếu mã hàng' from _xl_dong d where d.ma_hang is null;

  insert into _xl_loi (dong, so, loi)
  select d.dong, d.so, 'Số lượng phải lớn hơn 0'
  from _xl_dong d where d.so_luong is null or d.so_luong <= 0;

  -- --- Cảnh báo (không chặn) -------------------------------------------------
  insert into _xl_loi (dong, so, loi, canh_bao)
  select p.dong, p.so, 'Không tìm thấy đơn đặt ' || p.ma_dat_hang || ' — hóa đơn nhập không gắn đơn', true
  from _xl_phieu p where p.ma_dat_hang is not null and p.don_id is null and p_loai = 'HOA_DON';

  insert into _xl_loi (dong, so, loi, canh_bao)
  select min(d.dong), n.so, 'Không có nhân viên tên "' || n.ten || '" — bỏ qua tên này'
    || case when p_loai = 'DON_DAT' then '' else ', giữ trong ghi chú dòng' end, true
  from _xl_nv n
  left join _xl_dong d on d.so = n.so and upper(d.nhan_vien) like '%' || upper(n.ten) || '%'
  where n.nv_id is null
  group by n.so, n.ten;

  select count(*)::integer into v_so_dong from _xl_dong;

  v_ket_qua := jsonb_build_object(
    'loi', coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong, l.loi)
                     from _xl_loi l where not l.canh_bao), '[]'),
    'canh_bao', coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong, l.loi)
                          from _xl_loi l where l.canh_bao), '[]'),
    'phieu_moi', case when p_kieu = 'moi' then (select count(*) from _xl_phieu) else 0 end,
    'phieu_sua', case when p_kieu = 'cap_nhat' then (select count(*) from _xl_phieu) else 0 end,
    'so_dong', v_so_dong
  );

  if p_chi_kiem_tra or exists (select 1 from _xl_loi where not canh_bao) then
    return v_ket_qua || jsonb_build_object('committed', false);
  end if;

  -- Tên nhân viên không khớp được giữ lại trong ghi chú dòng (hóa đơn / phiếu nhập).
  update _xl_dong d
  set ghi_chu = concat_ws(' · ', d.ghi_chu, 'Nhân viên nhận: ' || d.nhan_vien)
  where d.nhan_vien is not null and d.nguoi_nhan_id is null
    and exists (select 1 from _xl_nv n
                where n.so = d.so and n.nv_id is null and upper(d.nhan_vien) like '%' || upper(n.ten) || '%');

  -- --- Ghi: đơn đặt -------------------------------------------------------------
  if p_loai = 'DON_DAT' then
    if p_kieu = 'moi' then
      insert into public.don_dat_hang (so_dh, ngay_dh, doi_tac_id, ngay_giao_du_kien, ghi_chu)
      select p.so, p.ngay, case when p.loai_nhan = 'NOI_BO' then null else p.doi_tac_id end, p.ngay_giao, p.ghi_chu
      from _xl_phieu p;

      update _xl_phieu p set id_moi = dh.id from public.don_dat_hang dh where dh.so_dh = p.so;
    else
      update public.don_dat_hang dh set
        ngay_dh = coalesce(p.ngay, dh.ngay_dh),
        doi_tac_id = case when p.loai_nhan = 'NOI_BO' then null else coalesce(p.doi_tac_id, dh.doi_tac_id) end,
        ngay_giao_du_kien = coalesce(p.ngay_giao, dh.ngay_giao_du_kien),
        ghi_chu = coalesce(p.ghi_chu, dh.ghi_chu)
      from _xl_phieu p where dh.id = p.id_cu;

      -- "where true": pg_safeupdate chặn UPDATE không WHERE khi gọi qua PostgREST (bẫy 22).
      update _xl_phieu p set id_moi = p.id_cu where true;

      -- Người nhận đơn: file có tên nhân viên thì thêm vào trước (dòng hàng chỉ được
      -- trỏ tới người đã có ở đơn — bất biến D1)...
      insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
      select p.id_moi, n.nv_id, min(n.thu_tu)::integer
      from _xl_nv n join _xl_phieu p on p.so = n.so
      where n.nv_id is not null
      group by p.id_moi, n.nv_id
      on conflict (don_dat_hang_id, nguoi_nhan_id) do update set thu_tu = excluded.thu_tu;

      -- ...rồi đổi người nhận của dòng (số lượng đã kiểm là giữ nguyên)...
      update public.don_dat_hang_dong dd set nguoi_nhan_id = dl.nguoi_nhan_id
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where dd.id = k.dong_id and dl.nguoi_nhan_id is not null;

      -- 0120: ghi chú dòng — ô trống = giữ nguyên.
      update public.don_dat_hang_dong dd set ghi_chu = dl.ghi_chu
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where dd.id = k.dong_id and dl.ghi_chu is not null;

      -- ...cuối cùng bỏ người không còn trong file và không còn dòng nào dùng.
      delete from public.don_dat_hang_nguoi_nhan x
      using _xl_phieu p
      where x.don_dat_hang_id = p.id_moi
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null)
        and not exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id = x.nguoi_nhan_id)
        and not exists (select 1 from public.don_dat_hang_dong dd
                        where dd.don_dat_hang_id = x.don_dat_hang_id and dd.nguoi_nhan_id = x.nguoi_nhan_id);
    end if;

    if p_kieu = 'moi' then
      -- Cùng mã + cùng người nhận trong một đơn thì cộng dồn (như gõ tay, 0094).
      -- 0118/0120: khác ghi chú dòng thì tách dòng.
      insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id, ghi_chu)
      select p.id_moi, d.san_pham_id, sum(d.so_luong), d.nguoi_nhan_id, d.ghi_chu
      from _xl_dong d join _xl_phieu p on p.so = d.so
      group by p.id_moi, d.san_pham_id, d.nguoi_nhan_id, d.ghi_chu;

      insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
      select p.id_moi, n.nv_id, min(n.thu_tu)::integer
      from _xl_nv n join _xl_phieu p on p.so = n.so
      where n.nv_id is not null
      group by p.id_moi, n.nv_id
      on conflict do nothing;
    end if;

    -- Người nhận ở dòng luôn phải có ở đơn (bất biến D1).
    insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
    select dd.don_dat_hang_id, dd.nguoi_nhan_id, 1000
    from public.don_dat_hang_dong dd join _xl_phieu p on p.id_moi = dd.don_dat_hang_id
    where dd.nguoi_nhan_id is not null
    group by dd.don_dat_hang_id, dd.nguoi_nhan_id
    on conflict do nothing;

    if p_kieu = 'moi' then
      insert into public.chuoi_so_dh (nam, so_hien_tai)
      select 0, max(substring(p.so from '^DH(\d+)$')::integer)
      from _xl_phieu p where p.so ~ '^DH\d+$'
      having count(*) > 0
      on conflict (nam)
      do update set so_hien_tai = greatest(public.chuoi_so_dh.so_hien_tai, excluded.so_hien_tai);
    end if;

  -- --- Ghi: hóa đơn / phiếu nhập -------------------------------------------------
  else
    -- Kho đầu phiếu: ô Kho trong file → (hóa đơn) kho mặc định của mã đầu tiên →
    -- kho đầu tiên theo mã (K1 = Kho 1). 0110: phiếu nhập trống Kho → Kho 1.
    update _xl_phieu p set kho_id = coalesce(p.kho_id, case when v_loai_ct = 'XUAT' then (
      select d.kho_mac_dinh from _xl_dong d where d.so = p.so and d.kho_mac_dinh is not null
      order by d.thu_tu limit 1
    ) end, v_kho_dau)
    where p_kieu = 'moi';

    if p_kieu = 'moi' then
      insert into public.chung_tu (
        so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap, don_dat_hang_id,
        ghi_chu, ly_do_xuat_am, ghi_chu_ly_do
      )
      select p.so, v_loai_ct, p.ngay, p.kho_id,
             case when p.loai_nhan = 'NOI_BO' then null else p.doi_tac_id end,
             case when v_loai_ct = 'NHAP' then coalesce(p.nguon, 'NCC')::public.nguon_nhap end,
             p.don_id,
             -- 0122: hóa đơn ghi người duyệt đơn thành đoạn "Người bán: X" như KiotViet.
             nullif(concat_ws(' · ', p.ghi_chu, 'Người nhập: ' || p.nguoi_nhap, 'Người bán: ' || p.nguoi_ban), ''),
             p.ly_do_xuat_am, p.ghi_chu_ly_do
      from _xl_phieu p;

      update _xl_phieu p set id_moi = ct.id from public.chung_tu ct where ct.so_ct = p.so;
    else
      -- Không đổi ngày / kho / dòng hàng: những thứ đó quyết định tồn và thẻ kho.
      update public.chung_tu ct set
        doi_tac_id = case when p.loai_nhan = 'NOI_BO' then null else coalesce(p.doi_tac_id, ct.doi_tac_id) end,
        nguon_nhap = case when v_loai_ct = 'NHAP' then coalesce(p.nguon::public.nguon_nhap, ct.nguon_nhap) else ct.nguon_nhap end,
        don_dat_hang_id = coalesce(p.don_id, ct.don_dat_hang_id),
        -- Phiếu nhập: "Người nhập: X" là một đoạn của ghi chú (nạp từ KiotViet). Ô Ghi chú
        -- phiếu chỉ thay phần còn lại; ô Người nhập trống hoặc trùng người đang hiện
        -- (đoạn trong ghi chú, không có thì người ghi sổ) = giữ nguyên.
        -- 0122: hóa đơn — "Người bán: X" (người duyệt đơn) xử lý y như "Người nhập: X";
        -- người đang hiện = đoạn trong ghi chú, không có thì người xác nhận đơn gốc, rồi người ghi sổ.
        ghi_chu = case when v_loai_ct <> 'NHAP' then nullif(concat_ws(' · ',
          coalesce(p.ghi_chu, public.bo_nguoi_ban(ct.ghi_chu)),
          case
            when p.nguoi_ban is null
              or upper(p.nguoi_ban) = upper(coalesce(public.tach_nguoi_ban(ct.ghi_chu),
                   (select nd.ho_ten from public.don_dat_hang dh join public.nguoi_dung nd on nd.id = dh.nguoi_xac_nhan_id
                    where dh.id = ct.don_dat_hang_id),
                   (select nd.ho_ten from public.nguoi_dung nd where nd.id = ct.nguoi_duyet_id), ''))
            then 'Người bán: ' || public.tach_nguoi_ban(ct.ghi_chu)
            else 'Người bán: ' || p.nguoi_ban
          end), '') else nullif(concat_ws(' · ',
          coalesce(p.ghi_chu, public.bo_nguoi_nhap(ct.ghi_chu)),
          case
            when p.nguoi_nhap is null
              or upper(p.nguoi_nhap) = upper(coalesce(public.tach_nguoi_nhap(ct.ghi_chu),
                   (select nd.ho_ten from public.nguoi_dung nd where nd.id = ct.nguoi_duyet_id), ''))
            then 'Người nhập: ' || public.tach_nguoi_nhap(ct.ghi_chu)
            else 'Người nhập: ' || p.nguoi_nhap
          end), '') end,
        ly_do_xuat_am = coalesce(p.ly_do_xuat_am, ct.ly_do_xuat_am),
        ghi_chu_ly_do = coalesce(p.ghi_chu_ly_do, ct.ghi_chu_ly_do)
      from _xl_phieu p where ct.id = p.id_cu;

      -- "where true": pg_safeupdate chặn UPDATE không WHERE khi gọi qua PostgREST (bẫy 22).
      update _xl_phieu p set id_moi = p.id_cu where true;

      update public.chung_tu_dong d set
        ghi_chu = coalesce(dl.ghi_chu, d.ghi_chu),
        nguoi_nhan_id = coalesce(dl.nguoi_nhan_id, d.nguoi_nhan_id)
      from _xl_khop k join _xl_dong dl on dl.so = k.so and dl.dong = k.dong
      where d.id = k.dong_id;

      -- File có tên nhân viên thì thay tập người nhận của hóa đơn (chèn lại ở dưới).
      delete from public.chung_tu_nguoi_nhan x
      using _xl_phieu p
      where x.chung_tu_id = p.id_moi
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;

    if p_kieu = 'moi' then
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, nguoi_nhan_id)
    select p.id_moi, d.san_pham_id, d.so_luong, 0, 0,
           -- Hóa đơn: kho theo mã (như tạo hóa đơn từ đơn, 0098); phiếu nhập: kho đầu phiếu.
           case when v_loai_ct = 'XUAT' and p.ma_kho is null then coalesce(d.kho_mac_dinh, p.kho_id) else p.kho_id end,
           d.ghi_chu, d.nguoi_nhan_id
    from _xl_dong d join _xl_phieu p on p.so = d.so
    order by p.id_moi, d.thu_tu;

    update public.chung_tu ct
    set tong_so_luong = coalesce((select sum(d.so_luong) from public.chung_tu_dong d where d.chung_tu_id = ct.id), 0)
    from _xl_phieu p where ct.id = p.id_moi;
    end if;

    insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
    select p.id_moi, n.nv_id, min(n.thu_tu)::integer
    from _xl_nv n join _xl_phieu p on p.so = n.so
    where n.nv_id is not null and v_loai_ct = 'XUAT'
    group by p.id_moi, n.nv_id
    on conflict do nothing;

    if p_kieu = 'moi' then
      -- Chỉ NÂNG bộ đếm (như 0098): số tự cấp về sau nối tiếp số lớn nhất trong file.
      insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
      select c.loai_ct, 0, c.nguon, max(substring(p.so from '^' || c.tien_to || '(\d+)$')::integer)
      from public.cau_hinh_so_ct c
      join _xl_phieu p on p.so ~ ('^' || c.tien_to || '\d+$')
      where c.loai_ct = v_loai_ct and not c.theo_nam
      group by c.loai_ct, c.nguon
      on conflict (loai_ct, nam, nguon)
      do update set so_hien_tai = greatest(public.chuoi_so_ct.so_hien_tai, excluded.so_hien_tai);
    end if;
  end if;

  if p_kieu = 'moi' then
    v_moi := (select count(*) from _xl_phieu);
  else
    v_sua := (select count(*) from _xl_phieu);
  end if;

  return v_ket_qua || jsonb_build_object('committed', true, 'phieu_moi', v_moi, 'phieu_sua', v_sua);
end;
$$;

revoke all on function public.nhap_chung_tu_excel(text, text, jsonb, boolean) from public, anon;
grant execute on function public.nhap_chung_tu_excel(text, text, jsonb, boolean) to authenticated;

create or replace function public.xuat_excel_chung_tu(
  p_loai_ct public.loai_ct,
  p_trang_thai public.trang_thai_ct default null,
  p_doi_tac_id uuid default null,
  p_kho_id uuid default null,
  p_nguon_nhap public.nguon_nhap default null,
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_tu_khoa text default null,
  p_toi_da integer default 10000
)
returns jsonb
-- Không STABLE: hàm dựng bảng tạm (plpgsql cấm DDL trong hàm non-volatile).
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_tong integer;
  v_dong jsonb;
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  drop table if exists _xx_loc;
  create temp table _xx_loc on commit drop as
  select ct.id, ct.so_ct, ct.ngay_ct, ct.kho_id, ct.doi_tac_id, ct.nguon_nhap, ct.don_dat_hang_id,
         ct.ghi_chu, ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.trang_thai, ct.nguoi_tao_id, ct.nguoi_duyet_id
  from public.chung_tu ct
  where ct.loai_ct = p_loai_ct
    and (p_trang_thai is null or ct.trang_thai = p_trang_thai)
    and (p_doi_tac_id is null or ct.doi_tac_id = p_doi_tac_id)
    and (p_nguon_nhap is null or ct.nguon_nhap = p_nguon_nhap)
    and (p_tu_ngay    is null or ct.ngay_ct >= p_tu_ngay)
    and (p_den_ngay   is null or ct.ngay_ct <= p_den_ngay)
    and (
      p_kho_id is null
      or ct.kho_id = p_kho_id
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = p_kho_id)
    )
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    )
    and (
      v_tu_khoa is null
      or ct.so_ct ilike '%' || v_tu_khoa || '%'
      or exists (
        select 1 from public.doi_tac dt
        where dt.id = ct.doi_tac_id
          and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
      )
      or exists (
        select 1
        from public.chung_tu_nguoi_nhan ctn
        join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
        where ctn.chung_tu_id = ct.id
          and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
      )
    );

  select count(*)::integer into v_tong from _xx_loc;
  if v_tong > p_toi_da then
    return jsonb_build_object('tong', v_tong, 'dong', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'so', l.so_ct,
           'ngay', l.ngay_ct,
           'ma_dat_hang', dh.so_dh,
           'ma_doi_tac', dt.ma,
           'nguon', l.nguon_nhap,
           'ma_kho', k.ma,
           'ghi_chu', case when p_loai_ct = 'NHAP' then public.bo_nguoi_nhap(l.ghi_chu) else public.bo_nguoi_ban(l.ghi_chu) end,
           'nguoi_nhap', case when p_loai_ct = 'NHAP' then coalesce(public.tach_nguoi_nhap(l.ghi_chu), ndd.ho_ten) end,
           -- 0122: Người duyệt đơn của hóa đơn — cùng thứ tự với màn Duyệt đơn.
           'nguoi_ban', case when p_loai_ct = 'XUAT' then coalesce(public.tach_nguoi_ban(l.ghi_chu), ndx.ho_ten, ndd.ho_ten) end,
           'nguoi_tao', ndt.ho_ten,
           'trang_thai', l.trang_thai,
           'ly_do_xuat_am', l.ly_do_xuat_am,
           'ghi_chu_ly_do', l.ghi_chu_ly_do,
           'nv_phieu', nn.ten,
           'ma_hang', sp.ma_hang,
           'so_luong', d.so_luong,
           'ghi_chu_dong', d.ghi_chu,
           'nv_dong', nvd.ten_viet_tat
         ) order by l.ngay_ct desc, l.so_ct desc, d.created_at, d.id), '[]'::jsonb)
    into v_dong
  from _xx_loc l
  left join public.don_dat_hang dh on dh.id = l.don_dat_hang_id
  left join public.doi_tac dt on dt.id = l.doi_tac_id
  left join public.kho k on k.id = l.kho_id
  left join public.nguoi_dung ndt on ndt.id = l.nguoi_tao_id
  left join public.nguoi_dung ndd on ndd.id = l.nguoi_duyet_id
  left join public.nguoi_dung ndx on ndx.id = dh.nguoi_xac_nhan_id
  left join lateral (
    select string_agg(nvp.ten_viet_tat, ' - ' order by ctn.thu_tu, ctn.nguoi_nhan_id) as ten
    from public.chung_tu_nguoi_nhan ctn
    join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
    where ctn.chung_tu_id = l.id
  ) nn on true
  left join public.chung_tu_dong d on d.chung_tu_id = l.id
  left join public.san_pham sp on sp.id = d.san_pham_id
  left join public.nhan_vien_phu_trach nvd on nvd.id = d.nguoi_nhan_id;

  return jsonb_build_object('tong', v_tong, 'dong', v_dong);
end;
$$;

revoke all on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer) from public, anon;
grant execute on function public.xuat_excel_chung_tu(public.loai_ct, public.trang_thai_ct, uuid, uuid, public.nguon_nhap, date, date, text, integer) to authenticated;
