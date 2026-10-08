-- 0104: Nhập đơn đặt / hóa đơn / phiếu nhập từ Excel (nhập mới + cập nhật).
--
-- Route handler đọc file ở server, gom dòng thành phiếu rồi gọi RPC này theo từng
-- lô. Một lần gọi = một transaction: kiểm hết, có lỗi thì không ghi gì.
--
--   p_loai : 'DON_DAT' | 'HOA_DON' | 'PHIEU_NHAP'
--   p_kieu : 'moi'      — tạo phiếu NHÁP mới, số phiếu lấy từ file (số KiotViet)
--            'cap_nhat' — phiếu còn nháp (NHAP_LIEU / đơn TAM): thay đầu phiếu
--                         (ô trống = giữ nguyên) và thay TOÀN BỘ dòng hàng
--   p_phieu: [{ so, dong_dau, ngay, ngay_giao, loai_nhan ('DOI_TAC'|'NOI_BO'),
--              ma_doi_tac, nguon ('NCC'|'NHA_MAY'), ma_kho, ma_dat_hang, ghi_chu,
--              ly_do_xuat_am, ghi_chu_ly_do, nhan_vien: [tên],
--              dong: [{ dong, ma_hang, so_luong, ghi_chu, nhan_vien }] }]
--   (khóa snake_case là hợp đồng jsonb với route handler)
--
-- Phiếu nhập về luôn ở trạng thái nháp — chưa đụng tồn (nguyên tắc 1, 4); người
-- dùng kiểm lại trên web rồi mới bấm Ghi sổ.
--
-- Trả: { committed, phieu_moi, phieu_sua, so_dong,
--        loi: [{dong, so, loi}], canh_bao: [{dong, so, loi}] }

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

  drop table if exists _xl_phieu, _xl_dong, _xl_nv, _xl_loi;

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
    jsonb_array_length(coalesce(x->'dong', '[]')) as so_dong_file,
    null::uuid  as id_cu,
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
    update _xl_phieu p set id_cu = ct.id, trang_thai_cu = ct.trang_thai::text, loai_cu = ct.loai_ct::text
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

    if p_loai = 'PHIEU_NHAP' then
      insert into _xl_loi (dong, so, loi)
      select p.dong, p.so, 'Thiếu Mã NCC' from _xl_phieu p where p.ma_doi_tac is null;
    else
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

    insert into _xl_loi (dong, so, loi)
    select p.dong, p.so,
      case when p_loai = 'DON_DAT'
        then 'Đơn ' || p.so || ' không còn là đơn tạm — chỉ sửa được đơn chưa xác nhận'
        else 'Phiếu ' || p.so || ' đã ghi sổ hoặc đã hủy — phiếu đã khóa không sửa được, hủy rồi lập phiếu mới'
      end
    from _xl_phieu p
    where p.id_cu is not null
      and p.trang_thai_cu <> case when p_loai = 'DON_DAT' then 'TAM' else 'NHAP_LIEU' end;
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

      update _xl_phieu p set id_moi = p.id_cu;

      -- Phiếu có dòng trong file: thay toàn bộ dòng. Không có dòng: giữ dòng cũ.
      delete from public.don_dat_hang_dong dd
      using _xl_phieu p where dd.don_dat_hang_id = p.id_moi and p.so_dong_file > 0;

      -- Chỉ thay người nhận khi thay cả dòng: dòng cũ còn giữ người nhận thì không bỏ được.
      delete from public.don_dat_hang_nguoi_nhan x
      using _xl_phieu p
      where x.don_dat_hang_id = p.id_moi and p.so_dong_file > 0
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;

    -- Cùng mã + cùng người nhận trong một đơn thì cộng dồn (như gõ tay, 0094).
    insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id)
    select p.id_moi, d.san_pham_id, sum(d.so_luong), d.nguoi_nhan_id
    from _xl_dong d join _xl_phieu p on p.so = d.so
    group by p.id_moi, d.san_pham_id, d.nguoi_nhan_id;

    insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
    select p.id_moi, n.nv_id, min(n.thu_tu)::integer
    from _xl_nv n join _xl_phieu p on p.so = n.so
    where n.nv_id is not null
    group by p.id_moi, n.nv_id
    on conflict do nothing;

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
    -- Kho đầu phiếu: ô Kho trong file → kho mặc định của mã đầu tiên → kho đầu tiên.
    update _xl_phieu p set kho_id = coalesce(p.kho_id, (
      select d.kho_mac_dinh from _xl_dong d where d.so = p.so and d.kho_mac_dinh is not null
      order by d.thu_tu limit 1
    ), v_kho_dau)
    where p_kieu = 'moi';

    if p_kieu = 'moi' then
      insert into public.chung_tu (
        so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap, don_dat_hang_id,
        ghi_chu, ly_do_xuat_am, ghi_chu_ly_do
      )
      select p.so, v_loai_ct, p.ngay, p.kho_id,
             case when p.loai_nhan = 'NOI_BO' then null else p.doi_tac_id end,
             case when v_loai_ct = 'NHAP' then coalesce(p.nguon, 'NCC')::public.nguon_nhap end,
             p.don_id, p.ghi_chu, p.ly_do_xuat_am, p.ghi_chu_ly_do
      from _xl_phieu p;

      update _xl_phieu p set id_moi = ct.id from public.chung_tu ct where ct.so_ct = p.so;
    else
      update public.chung_tu ct set
        ngay_ct = coalesce(p.ngay, ct.ngay_ct),
        kho_id = coalesce(p.kho_id, ct.kho_id),
        doi_tac_id = case when p.loai_nhan = 'NOI_BO' then null else coalesce(p.doi_tac_id, ct.doi_tac_id) end,
        nguon_nhap = case when v_loai_ct = 'NHAP' then coalesce(p.nguon::public.nguon_nhap, ct.nguon_nhap) else ct.nguon_nhap end,
        don_dat_hang_id = coalesce(p.don_id, ct.don_dat_hang_id),
        ghi_chu = coalesce(p.ghi_chu, ct.ghi_chu),
        ly_do_xuat_am = coalesce(p.ly_do_xuat_am, ct.ly_do_xuat_am),
        ghi_chu_ly_do = coalesce(p.ghi_chu_ly_do, ct.ghi_chu_ly_do)
      from _xl_phieu p where ct.id = p.id_cu;

      update _xl_phieu p set id_moi = p.id_cu;
      -- Dòng mới của phiếu nhập đi theo kho đầu phiếu SAU khi cập nhật.
      update _xl_phieu p set kho_id = ct.kho_id from public.chung_tu ct where ct.id = p.id_moi;

      delete from public.chung_tu_dong d
      using _xl_phieu p where d.chung_tu_id = p.id_moi and p.so_dong_file > 0;

      delete from public.chung_tu_nguoi_nhan x
      using _xl_phieu p
      where x.chung_tu_id = p.id_moi and p.so_dong_file > 0
        and exists (select 1 from _xl_nv n where n.so = p.so and n.nv_id is not null);
    end if;

    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, ghi_chu, nguoi_nhan_id)
    select p.id_moi, d.san_pham_id, d.so_luong, 0, 0,
           -- Hóa đơn: kho theo mã (như tạo hóa đơn từ đơn, 0098); phiếu nhập: kho đầu phiếu.
           case when v_loai_ct = 'XUAT' and p.ma_kho is null then coalesce(d.kho_mac_dinh, p.kho_id) else p.kho_id end,
           d.ghi_chu, d.nguoi_nhan_id
    from _xl_dong d join _xl_phieu p on p.so = d.so
    order by p.id_moi, d.thu_tu;

    insert into public.chung_tu_nguoi_nhan (chung_tu_id, nguoi_nhan_id, thu_tu)
    select p.id_moi, n.nv_id, min(n.thu_tu)::integer
    from _xl_nv n join _xl_phieu p on p.so = n.so
    where n.nv_id is not null and v_loai_ct = 'XUAT'
    group by p.id_moi, n.nv_id
    on conflict do nothing;

    update public.chung_tu ct
    set tong_so_luong = coalesce((select sum(d.so_luong) from public.chung_tu_dong d where d.chung_tu_id = ct.id), 0)
    from _xl_phieu p where ct.id = p.id_moi;

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
