-- =============================================================================
-- 0086 — Trường quy chuẩn của mã hàng (Quy chuẩn mã, phần B)
--
-- 1. Bỏ "Loại hàng" và "Dòng xe" dạng danh mục tự do của Phase 15 (0081) —
--    Notion chốt: Loại hàng = HANG_HOA | COMBO; Hãng/Dòng/Linh kiện theo bộ mã
--    hóa (0085). Đã kiểm cloud 02/10/2026: hai bảng trống, không mã nào dùng.
-- 2. san_pham thêm loai_hang, hang_xe, dong_xe, linh_kien (lưu MÃ — tên tra
--    ma_hoa, bền khi bên làm mã đổi tên), mo_ta.
-- 3. Ghi chú TỰ SINH: trigger liệt kê trường quy chuẩn còn thiếu. Ghi chú cũ
--    (nội dung người dùng) chuyển sang mo_ta trước, không mất.
-- 4. Xử lý = công đoạn, đủ 21 loại: cong_doan.ma_quy_chuan nối mã xử lý của
--    sheet; Ép / Mua ngoài giữ (code đang dựa vào) với ma_quy_chuan null =
--    ngoài quy chuẩn. Đồng bộ hằng ngày tự thêm loại xử lý mới.
-- 5. Hai RPC nhập Excel ghi "Mô tả" vào mo_ta — ghi vào ghi_chu sẽ bị trigger đè.
-- =============================================================================

-- --- 1. Bỏ phần Phase 15 -----------------------------------------------------
drop index if exists public.idx_san_pham_loai_hang;
drop index if exists public.idx_san_pham_dong_xe;
alter table public.san_pham drop column loai_hang_id, drop column dong_xe_id;
drop table public.loai_hang;
drop table public.dong_xe;

-- --- 2. Cột quy chuẩn --------------------------------------------------------
alter table public.san_pham
  add column loai_hang text not null default 'HANG_HOA' check (loai_hang in ('HANG_HOA', 'COMBO')),
  -- Mã trong bộ mã hóa (ma_hoa.ma). dong_xe đi theo cặp với hang_xe.
  add column hang_xe text,
  add column dong_xe text,
  add column linh_kien text,
  add column mo_ta text;

create index idx_san_pham_hang_dong on public.san_pham (hang_xe, dong_xe) where hang_xe is not null;
create index idx_san_pham_linh_kien on public.san_pham (linh_kien) where linh_kien is not null;

-- Bẫy 5: cột mới của san_pham phải tự grant (khối tự kiểm 0029).
grant select (loai_hang, hang_xe, dong_xe, linh_kien, mo_ta) on public.san_pham to authenticated;
grant insert (loai_hang, hang_xe, dong_xe, linh_kien, mo_ta) on public.san_pham to authenticated;
grant update (loai_hang, hang_xe, dong_xe, linh_kien, mo_ta) on public.san_pham to authenticated;

-- --- 4. Xử lý = công đoạn, 21 loại -------------------------------------------
alter table public.cong_doan add column ma_quy_chuan text;
create unique index uq_cong_doan_ma_quy_chuan on public.cong_doan (upper(ma_quy_chuan)) where ma_quy_chuan is not null;

update public.cong_doan set ma_quy_chuan = v.qc
from (values ('SON', 'S'), ('CARBON', 'CB'), ('XI_MA', 'X'), ('NANO', 'NM')) as v(ma, qc)
where cong_doan.ma = v.ma;

-- 17 loại còn lại, đúng mã + tên sheet "Quy chuẩn mã" ngày 02/10/2026.
insert into public.cong_doan (ma, ten, ma_quy_chuan) values
  ('PVC', 'PVC', 'PVC'), ('PC', 'PC', 'PC'), ('PP', 'PP', 'PP'), ('ABS', 'ABS', 'ABS'),
  ('ASA', 'ASA', 'ASA'), ('PA', 'PA', 'PA'), ('PPH', 'Phôi PP', 'PPH'), ('PPN', 'Phôi nhôm', 'PPN'),
  ('PPC', 'Phôi PC', 'PPC'), ('I', 'Inox', 'I'), ('PPI', 'Phôi inox', 'PPI'), ('N', 'Nhôm', 'N'),
  ('SA', 'Sắt', 'SA'), ('PPS', 'Phôi sắt', 'PPS'), ('NK', 'Nhập khẩu', 'NK'), ('PS', 'PS', 'PS'),
  ('POM', 'POM', 'POM')
on conflict (ma) do update set ma_quy_chuan = excluded.ma_quy_chuan;

grant select (ma_quy_chuan) on public.cong_doan to authenticated;

-- --- 3. Ghi chú tự sinh --------------------------------------------------------
create or replace function public.ghi_chu_quy_chuan(
  p_hang_xe text, p_dong_xe text, p_linh_kien text, p_cong_doan_id uuid
) returns text
language sql
stable
set search_path = ''
as $$
  select case when cardinality(thieu) = 0 then null else 'Thiếu: ' || array_to_string(thieu, ', ') end
  from (
    select array_remove(array[
      case when nullif(btrim(coalesce(p_hang_xe, '')), '') is null then 'Hãng xe' end,
      case when nullif(btrim(coalesce(p_dong_xe, '')), '') is null then 'Dòng xe' end,
      case when nullif(btrim(coalesce(p_linh_kien, '')), '') is null then 'Linh kiện' end,
      case when not exists (select 1 from public.cong_doan cd where cd.id = p_cong_doan_id and cd.ma_quy_chuan is not null)
           then 'Xử lý theo quy chuẩn' end
    ], null) as thieu
  ) t;
$$;

create or replace function public.tu_sinh_ghi_chu_san_pham()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Luôn ghi đè: ghi chú là kết quả, không phải dữ liệu nhập tay.
  new.ghi_chu := public.ghi_chu_quy_chuan(new.hang_xe, new.dong_xe, new.linh_kien, new.cong_doan_id);
  return new;
end;
$$;
revoke all on function public.tu_sinh_ghi_chu_san_pham() from public, anon, authenticated;

create trigger tu_sinh_ghi_chu_san_pham
  before insert or update on public.san_pham
  for each row execute function public.tu_sinh_ghi_chu_san_pham();

-- Ghi chú cũ là nội dung người dùng → chuyển sang Mô tả, rồi tính ghi chú mới.
-- replica: không kích trigger nhật ký sửa / updated_at cho 3.266 mã (đây là đổi
-- cấu trúc, không phải ai đó sửa mã) — nên tự gọi hàm tính ghi chú.
set local session_replication_role = replica;
update public.san_pham
set mo_ta = coalesce(mo_ta, ghi_chu),
    ghi_chu = public.ghi_chu_quy_chuan(hang_xe, dong_xe, linh_kien, cong_doan_id)
where true;
set local session_replication_role = origin;

-- --- chi_tiet_san_pham: trường quy chuẩn + tên tra bộ mã hóa ------------------
drop function public.chi_tiet_san_pham(uuid);

create function public.chi_tiet_san_pham(p_id uuid)
 returns table(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone, duoc_ban_truc_tiep boolean, loai_hang text, hang_xe text, ten_hang_xe text, dong_xe text, ten_dong_xe text, linh_kien text, ten_linh_kien text, ma_xu_ly text, mo_ta text)
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
         sp.created_at, sp.updated_at, sp.duoc_ban_truc_tiep,
         sp.loai_hang,
         sp.hang_xe,
         (select m.ten from public.ma_hoa m where m.loai = 'hang' and upper(m.ma) = upper(sp.hang_xe) order by m.thu_tu limit 1),
         sp.dong_xe,
         (select m.ten from public.ma_hoa m where m.loai = 'dong' and upper(m.ma_hang) = upper(sp.hang_xe)
            and upper(m.ma) = upper(sp.dong_xe) order by m.thu_tu limit 1),
         sp.linh_kien,
         (select m.ten from public.ma_hoa m where m.loai = 'linh_kien' and upper(m.ma) = upper(sp.linh_kien) order by m.thu_tu limit 1),
         cd.ma_quy_chuan,
         sp.mo_ta
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  left join public.kho k on k.id = sp.kho_mac_dinh_id
  left join ton on ton.san_pham_id = sp.id
  where sp.id = p_id;
end;
$function$;

revoke all    on function public.chi_tiet_san_pham(uuid) from public, anon;
grant execute on function public.chi_tiet_san_pham(uuid) to authenticated;

-- --- 5. Hàm nhập Excel + đồng bộ (thân lấy từ bản đang chạy, chỉ sửa chỗ ghi) -
-- nhap_danh_muc: "Mô tả"/"Ghi chú" trong file → mo_ta (khóa jsonb đổi ghi_chu → mo_ta)
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
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
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
    gia_ban numeric, dang_kinh_doanh boolean, barcode text, mo_ta text,
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
           sp.gia_ban, sp.dang_kinh_doanh, sp.barcode, sp.mo_ta
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
    v_gc  := nullif(btrim(coalesce(v_n->>'mo_ta',  '')), '');

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
        v_td := v_td || jsonb_build_object('mo_ta', jsonb_build_array(v_gc_cu, v_gc));
      end if;
      v_loai := case when v_td = '{}'::jsonb then 'KHONG_DOI' else 'SUA' end;
    end if;

    insert into pg_temp._nhap (
      dong, ma_hang, du_lieu, sp_id, nhom_id, dvt_id, cd_id, kho_id,
      ten_hang, quy_doi, ton_toi_thieu, ton_toi_da, gia_ban, dang_kinh_doanh,
      barcode, mo_ta, loai, thay_doi)
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
    barcode, mo_ta)
  select n.ma_hang, n.ten_hang, n.nhom_id, n.dvt_id, n.cd_id, coalesce(n.quy_doi, 1),
         n.kho_id, coalesce(n.ton_toi_thieu, 0), n.ton_toi_da, coalesce(n.gia_ban, 0),
         coalesce(n.dang_kinh_doanh, true), n.barcode, n.mo_ta
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
    mo_ta         = coalesce(n.mo_ta,         sp.mo_ta)
  from pg_temp._nhap n
  where n.loai = 'SUA' and sp.id = n.sp_id;

  return jsonb_build_object(
    'tong', v_tong, 'them', v_so_them, 'sua', v_so_sua, 'khong_doi', v_so_khong,
    'da_nap', true, 'loi', v_loi, 'thay_doi', v_thay_doi, 'thay_doi_bi_cat', v_bi_cat);
end $function$;

-- nhap_ma_hang_moi
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

-- dong_bo_ma_hoa
create or replace function public.dong_bo_ma_hoa(p_ban_ghi jsonb, p_nguon text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loai text;
  v_moi int;
  v_cu int;
  v_so_muc jsonb;
  v_loi text;
  v_ten_loai constant jsonb := '{"hang": "hãng xe", "dong": "dòng xe", "linh_kien": "linh kiện", "xu_ly": "xử lý", "mau": "màu"}';
begin
  -- Job đồng bộ gọi bằng service role; postgres chạy script không có JWT.
  if not (coalesce((select auth.role()), 'service_role') = 'service_role'
          or (select public.vai_tro_hien_tai()) = 'quan_ly') then
    raise exception 'Chỉ quản lý hoặc job đồng bộ cập nhật được bộ mã hóa' using errcode = '42501';
  end if;

  if p_ban_ghi is null or jsonb_typeof(p_ban_ghi) <> 'array' then
    v_loi := 'Dữ liệu đồng bộ không phải một mảng.';
  end if;

  if v_loi is null then
    create temp table if not exists _ma_hoa_moi (
      loai text, ma text, ten text, ma_hang text, thu_tu int
    ) on commit drop;
    truncate _ma_hoa_moi;
    insert into _ma_hoa_moi
    select btrim(e->>'loai'), btrim(e->>'ma'), btrim(coalesce(e->>'ten', '')),
           nullif(btrim(coalesce(e->>'ma_hang', '')), ''), coalesce((e->>'thu_tu')::int, 0)
    from jsonb_array_elements(p_ban_ghi) e;

    select jsonb_object_agg(loai, n) into v_so_muc
    from (select loai, count(*) as n from _ma_hoa_moi group by loai) c;
    v_so_muc := coalesce(v_so_muc, '{}'::jsonb);

    if exists (select 1 from _ma_hoa_moi where loai not in ('hang', 'dong', 'linh_kien', 'xu_ly', 'mau')
                                            or coalesce(ma, '') = '' or ((loai = 'dong') <> (ma_hang is not null))) then
      v_loi := 'Có mục sai dạng (loại lạ, thiếu mã, hoặc dòng xe thiếu mã hãng).';
    end if;
  end if;

  if v_loi is null then
    for v_loai in select * from jsonb_object_keys(v_ten_loai) loop
      v_moi := coalesce((v_so_muc->>v_loai)::int, 0);
      v_cu := (select count(*) from public.ma_hoa where loai = v_loai);
      if v_moi = 0 then
        v_loi := format('Sheet không có mục %s nào — có thể sheet đổi cấu trúc hoặc lỗi IMPORTRANGE.', v_ten_loai->>v_loai);
        exit;
      end if;
      if v_moi * 2 < v_cu then
        v_loi := format('Số %s giảm bất thường (%s → %s) — có thể sheet bị cắt. Giữ nguyên bộ mã hóa cũ.',
                        v_ten_loai->>v_loai, v_cu, v_moi);
        exit;
      end if;
    end loop;
  end if;

  if v_loi is null then
    select format('Trùng mã %s "%s" trong sheet.', v_ten_loai->>loai, min(ma)) into v_loi
    from _ma_hoa_moi
    group by loai, upper(coalesce(ma_hang, '')), upper(ma)
    having count(*) > 1
    limit 1;
  end if;

  if v_loi is not null then
    insert into public.ma_hoa_dong_bo (trang_thai, nguon, so_muc, loi)
    values ('loi', p_nguon, coalesce(v_so_muc, '{}'::jsonb), v_loi);
    return jsonb_build_object('thanh_cong', false, 'so_muc', coalesce(v_so_muc, '{}'::jsonb), 'loi', v_loi);
  end if;

  -- "where true": Supabase bật pg_safeupdate cho request qua PostgREST — DELETE
  -- không WHERE bị chặn (21000), dù chạy trong hàm. pgTAP gọi bằng postgres nên không thấy.
  delete from public.ma_hoa where true;
  insert into public.ma_hoa (loai, ma, ten, ma_hang, thu_tu)
  select loai, ma, ten, ma_hang, thu_tu from _ma_hoa_moi;

  -- 0086: xử lý mới trên sheet → thêm công đoạn tương ứng (Xử lý = công đoạn).
  insert into public.cong_doan (ma, ten, ma_quy_chuan)
  select upper(m.ma), m.ten, upper(m.ma)
  from _ma_hoa_moi m
  where m.loai = 'xu_ly'
    and not exists (select 1 from public.cong_doan cd where upper(cd.ma_quy_chuan) = upper(m.ma))
  on conflict (ma) do nothing;

  insert into public.ma_hoa_dong_bo (trang_thai, nguon, so_muc)
  values ('thanh_cong', p_nguon, v_so_muc);

  return jsonb_build_object('thanh_cong', true, 'so_muc', v_so_muc, 'loi', null);
end;
$$;
