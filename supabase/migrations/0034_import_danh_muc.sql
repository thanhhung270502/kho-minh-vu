-- =============================================================================
-- 0034 — Import danh mục từ Excel: kiểm tra và nạp trong một transaction (DMUC-06)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-18). Migration này đã được áp lên cloud bởi một
-- phiên làm việc khác nhưng file nguồn không có trong repo. Nội dung dưới đây
-- trích thẳng từ `pg_get_functiondef` và catalog của chính database đó, nên
-- chạy lại trên database rỗng cho ra đúng trạng thái hiện tại.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.khop_danh_muc(p_bang text, p_gia_tri text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_ids uuid[];
  v_chuan text := upper(public.f_unaccent(btrim(p_gia_tri)));
begin
  if nullif(btrim(coalesce(p_gia_tri, '')), '') is null then
    return null;
  end if;

  if p_bang = 'nhom_hang' then
    select array_agg(id) into v_ids from public.nhom_hang
    where upper(public.f_unaccent(ma)) = v_chuan or upper(public.f_unaccent(ten)) = v_chuan;
  elsif p_bang = 'don_vi_tinh' then
    select array_agg(id) into v_ids from public.don_vi_tinh
    where upper(public.f_unaccent(ma)) = v_chuan or upper(public.f_unaccent(ten)) = v_chuan;
  elsif p_bang = 'cong_doan' then
    select array_agg(id) into v_ids from public.cong_doan
    where upper(public.f_unaccent(ma)) = v_chuan or upper(public.f_unaccent(ten)) = v_chuan
       or upper(public.f_unaccent(replace(ma, '_', ' '))) = v_chuan;
  elsif p_bang = 'kho' then
    select array_agg(id) into v_ids from public.kho
    where upper(public.f_unaccent(ma)) = v_chuan or upper(public.f_unaccent(ten)) = v_chuan;
  else
    raise exception 'Bảng khớp không hợp lệ: %', p_bang;
  end if;

  if coalesce(cardinality(v_ids), 0) > 1 then
    raise exception 'NHIEU_KET_QUA';
  end if;
  return v_ids[1];
end $function$;

revoke all    on function public.khop_danh_muc(text, text) from public, anon;
grant execute on function public.khop_danh_muc(text, text) to authenticated;

CREATE OR REPLACE FUNCTION public.nhap_danh_muc(p_dong jsonb, p_chi_kiem_tra boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_vai_tro text;
  v_tong    int := 0;
  v_i       int := 0;

  e          jsonb;
  v_n        jsonb;
  v_dong     int;
  v_ma       text;
  v_loi_dong boolean;
  v_loai     text;
  v_td       jsonb;
  v_txt      text;
  i          int;
  v_kq       uuid;

  v_khoa text[] := array[
    array['nhom_hang',    'nhom_hang',   'nhóm hàng'],
    array['dvt',          'don_vi_tinh', 'đơn vị tính'],
    array['cong_doan',    'cong_doan',   'công đoạn'],
    array['kho_mac_dinh', 'kho',         'kho']
  ];
  v_fk     uuid[];
  v_cd_moi uuid;

  v_sp_id   uuid;
  v_ten_cu  text;    v_nhom_cu uuid;    v_dvt_cu uuid;    v_cd_cu uuid;
  v_kho_cu  uuid;    v_qd_cu   numeric; v_ttt_cu numeric; v_ttd_cu numeric;
  v_gb_cu   numeric; v_dkd_cu  boolean; v_bc_cu  text;    v_gc_cu  text;

  v_ten text;    v_qd  numeric; v_ttt numeric; v_ttd numeric;
  v_gb  numeric; v_dkd boolean; v_bc  text;    v_gc  text;

  v_so_them  int; v_so_sua int; v_so_khong int;
  v_loi      jsonb; v_thay_doi jsonb; v_bi_cat boolean;
begin
  v_vai_tro := coalesce((select public.vai_tro_hien_tai())::text, '');
  if v_vai_tro not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng import được danh mục' using errcode = '42501';
  end if;

  if p_dong is null or jsonb_typeof(p_dong) <> 'array' then
    raise exception 'Dữ liệu import phải là một mảng dòng' using errcode = '23514';
  end if;
  v_tong := jsonb_array_length(p_dong);
  if v_tong > 10000 then
    raise exception 'Tối đa 10000 dòng mỗi lần import, file đang có % dòng', v_tong
      using errcode = '23514';
  end if;

  if to_regclass('pg_temp._nhap') is not null then execute 'drop table pg_temp._nhap'; end if;
  create temp table _nhap (
    dong int, ma_hang text, du_lieu jsonb, sp_id uuid,
    nhom_id uuid, dvt_id uuid, cd_id uuid, kho_id uuid,
    ten_hang text, quy_doi numeric, ton_toi_thieu numeric, ton_toi_da numeric,
    gia_ban numeric, dang_kinh_doanh boolean, barcode text, ghi_chu text,
    loai text, thay_doi jsonb
  ) on commit drop;

  if to_regclass('pg_temp._loi') is not null then execute 'drop table pg_temp._loi'; end if;
  create temp table _loi (dong int, cot text, thong_bao text) on commit drop;

  for e in select value from jsonb_array_elements(p_dong) loop
    v_i := v_i + 1;
    v_loi_dong := false;

    begin
      v_dong := (e->>'dong')::int;
    exception when others then
      v_dong := null;
    end;
    if v_dong is null then v_dong := v_i; end if;

    select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into v_n
    from jsonb_each(e) t(k, v)
    where jsonb_typeof(v) <> 'null'
      and not (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '');

    v_ma := nullif(btrim(coalesce(v_n->>'ma_hang', '')), '');
    if v_ma is null then
      insert into pg_temp._loi values (v_dong, 'ma_hang', 'Thiếu mã hàng');
      continue;
    end if;

    select sp.id, sp.ten_hang, sp.nhom_hang_id, sp.dvt_id, sp.cong_doan_id,
           sp.kho_mac_dinh_id, sp.quy_doi, sp.ton_toi_thieu, sp.ton_toi_da,
           sp.gia_ban, sp.dang_kinh_doanh, sp.barcode, sp.ghi_chu
      into v_sp_id, v_ten_cu, v_nhom_cu, v_dvt_cu, v_cd_cu,
           v_kho_cu, v_qd_cu, v_ttt_cu, v_ttd_cu,
           v_gb_cu, v_dkd_cu, v_bc_cu, v_gc_cu
    from public.san_pham sp
    where sp.ma_hang = v_ma;

    v_fk := array[null, null, null, null]::uuid[];
    for i in 1..4 loop
      if v_n ? v_khoa[i][1] then
        v_kq := null;
        begin
          v_kq := public.khop_danh_muc(v_khoa[i][2], v_n->>v_khoa[i][1]);
        exception when others then
          insert into pg_temp._loi values (v_dong, v_khoa[i][1],
            'Có nhiều ''' || (v_n->>v_khoa[i][1]) || ''' trùng tên, dùng mã');
          v_loi_dong := true;
        end;
        exit when v_loi_dong;
        if v_kq is null then
          insert into pg_temp._loi values (v_dong, v_khoa[i][1],
            'Không có ' || v_khoa[i][3] || ' ''' || (v_n->>v_khoa[i][1]) || '''');
          v_loi_dong := true;
          exit;
        end if;
        v_fk[i] := v_kq;
      end if;
    end loop;
    continue when v_loi_dong;

    v_cd_moi := null;
    if v_n ? 'cong_doan_khi_tao_moi' then
      begin
        v_cd_moi := public.khop_danh_muc('cong_doan', v_n->>'cong_doan_khi_tao_moi');
      exception when others then
        insert into pg_temp._loi values (v_dong, 'cong_doan_khi_tao_moi',
          'Có nhiều ''' || (v_n->>'cong_doan_khi_tao_moi') || ''' trùng tên, dùng mã');
        v_loi_dong := true;
      end;
      if not v_loi_dong and v_cd_moi is null then
        insert into pg_temp._loi values (v_dong, 'cong_doan_khi_tao_moi',
          'Không có công đoạn ''' || (v_n->>'cong_doan_khi_tao_moi') || '''');
        v_loi_dong := true;
      end if;
      continue when v_loi_dong;
    end if;

    if v_sp_id is null then
      if not (v_n ? 'ten_hang') then
        insert into pg_temp._loi values (v_dong, 'ten_hang', 'Mã mới phải có tên hàng');
        continue;
      end if;
      if not (v_n ? 'dvt') then
        insert into pg_temp._loi values (v_dong, 'dvt', 'Mã mới phải có đơn vị tính');
        continue;
      end if;
      if v_fk[3] is null and v_cd_moi is null then
        insert into pg_temp._loi values (v_dong, 'cong_doan', 'Mã mới phải có công đoạn');
        continue;
      end if;
    end if;

    v_qd := null;
    if v_n ? 'quy_doi' then
      begin v_qd := (v_n->>'quy_doi')::numeric; exception when others then v_qd := null; end;
      if v_qd is null or v_qd <= 0 then
        insert into pg_temp._loi values (v_dong, 'quy_doi', 'Quy đổi phải lớn hơn 0');
        continue;
      end if;
    end if;

    v_ttt := null;
    if v_n ? 'ton_toi_thieu' then
      begin v_ttt := (v_n->>'ton_toi_thieu')::numeric; exception when others then v_ttt := null; end;
      if v_ttt is null or v_ttt < 0 then
        insert into pg_temp._loi values (v_dong, 'ton_toi_thieu', 'Tồn tối thiểu phải là số không âm');
        continue;
      end if;
    end if;

    v_ttd := null;
    if v_n ? 'ton_toi_da' then
      begin v_ttd := (v_n->>'ton_toi_da')::numeric; exception when others then v_ttd := null; end;
      if v_ttd is null or v_ttd < 0 then
        insert into pg_temp._loi values (v_dong, 'ton_toi_da', 'Tồn tối đa phải là số không âm');
        continue;
      end if;
    end if;

    v_gb := null;
    if v_n ? 'gia_ban' then
      begin v_gb := (v_n->>'gia_ban')::numeric; exception when others then v_gb := null; end;
      if v_gb is null or v_gb < 0 then
        insert into pg_temp._loi values (v_dong, 'gia_ban', 'Giá bán phải là số không âm');
        continue;
      end if;
      if v_vai_tro <> 'quan_ly'
         and ( (v_sp_id is null and v_gb <> 0)
            or (v_sp_id is not null and v_gb is distinct from v_gb_cu) ) then
        insert into pg_temp._loi values (v_dong, 'gia_ban', 'Chỉ quản lý được đặt giá bán');
        continue;
      end if;
    end if;

    v_dkd := null;
    if v_n ? 'dang_kinh_doanh' then
      v_txt := upper(public.f_unaccent(btrim(v_n->>'dang_kinh_doanh')));
      v_dkd := case
                 when v_txt in ('TRUE', 'CO', '1', 'X', 'YES', 'Y') then true
                 when v_txt in ('FALSE', 'KHONG', '0', 'NO', 'N')   then false
               end;
      if v_dkd is null then
        insert into pg_temp._loi values (v_dong, 'dang_kinh_doanh', 'Kinh doanh chỉ nhận Có hoặc Không');
        continue;
      end if;
    end if;

    v_ten := nullif(btrim(coalesce(v_n->>'ten_hang', '')), '');
    v_bc  := nullif(btrim(coalesce(v_n->>'barcode',  '')), '');
    v_gc  := nullif(btrim(coalesce(v_n->>'ghi_chu',  '')), '');

    v_td := '{}'::jsonb;
    if v_sp_id is null then
      v_loai := 'THEM';
    else
      if v_ten is not null and v_ten is distinct from v_ten_cu then
        v_td := v_td || jsonb_build_object('ten_hang', jsonb_build_array(v_ten_cu, v_ten));
      end if;
      if v_fk[1] is not null and v_fk[1] is distinct from v_nhom_cu then
        v_td := v_td || jsonb_build_object('nhom_hang', jsonb_build_array(
          public.ten_danh_muc('nhom_hang', v_nhom_cu), public.ten_danh_muc('nhom_hang', v_fk[1])));
      end if;
      if v_fk[2] is not null and v_fk[2] is distinct from v_dvt_cu then
        v_td := v_td || jsonb_build_object('dvt', jsonb_build_array(
          public.ten_danh_muc('don_vi_tinh', v_dvt_cu), public.ten_danh_muc('don_vi_tinh', v_fk[2])));
      end if;
      if v_fk[3] is not null and v_fk[3] is distinct from v_cd_cu then
        v_td := v_td || jsonb_build_object('cong_doan', jsonb_build_array(
          public.ten_danh_muc('cong_doan', v_cd_cu), public.ten_danh_muc('cong_doan', v_fk[3])));
      end if;
      if v_fk[4] is not null and v_fk[4] is distinct from v_kho_cu then
        v_td := v_td || jsonb_build_object('kho_mac_dinh', jsonb_build_array(
          public.ten_danh_muc('kho', v_kho_cu), public.ten_danh_muc('kho', v_fk[4])));
      end if;
      if v_qd is not null and v_qd is distinct from v_qd_cu then
        v_td := v_td || jsonb_build_object('quy_doi', jsonb_build_array(v_qd_cu, v_qd));
      end if;
      if v_ttt is not null and v_ttt is distinct from v_ttt_cu then
        v_td := v_td || jsonb_build_object('ton_toi_thieu', jsonb_build_array(v_ttt_cu, v_ttt));
      end if;
      if v_ttd is not null and v_ttd is distinct from v_ttd_cu then
        v_td := v_td || jsonb_build_object('ton_toi_da', jsonb_build_array(v_ttd_cu, v_ttd));
      end if;
      if v_gb is not null and v_gb is distinct from v_gb_cu then
        v_td := v_td || jsonb_build_object('gia_ban', jsonb_build_array(v_gb_cu, v_gb));
      end if;
      if v_dkd is not null and v_dkd is distinct from v_dkd_cu then
        v_td := v_td || jsonb_build_object('dang_kinh_doanh', jsonb_build_array(v_dkd_cu, v_dkd));
      end if;
      if v_bc is not null and v_bc is distinct from v_bc_cu then
        v_td := v_td || jsonb_build_object('barcode', jsonb_build_array(v_bc_cu, v_bc));
      end if;
      if v_gc is not null and v_gc is distinct from v_gc_cu then
        v_td := v_td || jsonb_build_object('ghi_chu', jsonb_build_array(v_gc_cu, v_gc));
      end if;
      v_loai := case when v_td = '{}'::jsonb then 'KHONG_DOI' else 'SUA' end;
    end if;

    insert into pg_temp._nhap (
      dong, ma_hang, du_lieu, sp_id, nhom_id, dvt_id, cd_id, kho_id,
      ten_hang, quy_doi, ton_toi_thieu, ton_toi_da, gia_ban, dang_kinh_doanh,
      barcode, ghi_chu, loai, thay_doi)
    values (
      v_dong, v_ma, v_n, v_sp_id, v_fk[1], v_fk[2],
      coalesce(v_fk[3], case when v_sp_id is null then v_cd_moi end), v_fk[4],
      v_ten, v_qd, v_ttt, v_ttd, v_gb, v_dkd, v_bc, v_gc, v_loai, v_td);
  end loop;

  insert into pg_temp._loi (dong, cot, thong_bao)
  select n.dong, 'ma_hang', 'Mã hàng xuất hiện nhiều lần trong file'
  from pg_temp._nhap n
  where n.ma_hang in (select ma_hang from pg_temp._nhap group by 1 having count(*) > 1)
    and not exists (select 1 from pg_temp._loi l where l.dong = n.dong);

  select count(*) filter (where loai = 'THEM'),
         count(*) filter (where loai = 'SUA'),
         count(*) filter (where loai = 'KHONG_DOI')
    into v_so_them, v_so_sua, v_so_khong
  from pg_temp._nhap;

  select coalesce(jsonb_agg(jsonb_build_object(
           'dong', dong, 'cot', cot, 'thong_bao', thong_bao) order by dong, cot), '[]'::jsonb)
    into v_loi
  from pg_temp._loi;

  select coalesce(jsonb_agg(jsonb_build_object(
           'dong', dong, 'ma_hang', ma_hang, 'loai', loai, 'truong', thay_doi) order by dong), '[]'::jsonb)
    into v_thay_doi
  from (select dong, ma_hang, loai, thay_doi from pg_temp._nhap
        where loai in ('THEM', 'SUA') order by dong limit 500) t;

  select count(*) > 500 into v_bi_cat from pg_temp._nhap where loai in ('THEM', 'SUA');

  if p_chi_kiem_tra or jsonb_array_length(v_loi) > 0 then
    return jsonb_build_object(
      'tong', v_tong, 'them', v_so_them, 'sua', v_so_sua, 'khong_doi', v_so_khong,
      'da_nap', false, 'loi', v_loi, 'thay_doi', v_thay_doi, 'thay_doi_bi_cat', v_bi_cat);
  end if;

  perform set_config('app.nguon_sua', 'import', true);

  insert into public.san_pham (
    ma_hang, ten_hang, nhom_hang_id, dvt_id, cong_doan_id, quy_doi,
    kho_mac_dinh_id, ton_toi_thieu, ton_toi_da, gia_ban, dang_kinh_doanh,
    barcode, ghi_chu)
  select n.ma_hang, n.ten_hang, n.nhom_id, n.dvt_id, n.cd_id, coalesce(n.quy_doi, 1),
         n.kho_id, coalesce(n.ton_toi_thieu, 0), n.ton_toi_da, coalesce(n.gia_ban, 0),
         coalesce(n.dang_kinh_doanh, true), n.barcode, n.ghi_chu
  from pg_temp._nhap n
  where n.loai = 'THEM';

  update public.san_pham sp set
    ten_hang        = coalesce(n.ten_hang,        sp.ten_hang),
    nhom_hang_id    = coalesce(n.nhom_id,         sp.nhom_hang_id),
    dvt_id          = coalesce(n.dvt_id,          sp.dvt_id),
    cong_doan_id    = coalesce(n.cd_id,           sp.cong_doan_id),
    quy_doi         = coalesce(n.quy_doi,         sp.quy_doi),
    kho_mac_dinh_id = coalesce(n.kho_id,          sp.kho_mac_dinh_id),
    ton_toi_thieu   = coalesce(n.ton_toi_thieu,   sp.ton_toi_thieu),
    ton_toi_da      = coalesce(n.ton_toi_da,      sp.ton_toi_da),
    gia_ban         = coalesce(n.gia_ban,         sp.gia_ban),
    dang_kinh_doanh = coalesce(n.dang_kinh_doanh, sp.dang_kinh_doanh),
    barcode         = coalesce(n.barcode,         sp.barcode),
    ghi_chu         = coalesce(n.ghi_chu,         sp.ghi_chu)
  from pg_temp._nhap n
  where n.loai = 'SUA' and sp.id = n.sp_id;

  return jsonb_build_object(
    'tong', v_tong, 'them', v_so_them, 'sua', v_so_sua, 'khong_doi', v_so_khong,
    'da_nap', true, 'loi', v_loi, 'thay_doi', v_thay_doi, 'thay_doi_bi_cat', v_bi_cat);
end $function$;

revoke all    on function public.nhap_danh_muc(jsonb, boolean) from public, anon;
grant execute on function public.nhap_danh_muc(jsonb, boolean) to authenticated;
comment on function public.nhap_danh_muc(jsonb, boolean) is
  'Import danh mục (DMUC-06/D-24..D-26). p_chi_kiem_tra=true trả tóm tắt thêm/sửa/không đổi/lỗi mà không ghi gì; false validate lại từ đầu rồi ghi trong một transaction. Có bất kỳ dòng lỗi nào thì không ghi dòng nào. SECURITY INVOKER để RLS, quyền theo cột và trigger giá bán tự áp.';

