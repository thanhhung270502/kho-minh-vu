-- 0117: Quyền theo TỪNG NGƯỜI thay cho quyền theo chức vụ.
--
-- Chỉ còn một chức vụ thật: Quản lý/Admin (vai_tro quan_ly) — luôn đủ mọi quyền.
-- Tài khoản khác được tích quyền trực tiếp (bảng nguoi_dung_quyen), 9 quyền:
--   tao_tai_khoan · phan_quyen · tao_don · xac_nhan_don · nhap_kho · tao_doi_tac ·
--   tao_ma_hang · xem_dashboard · xem_phan_tich
-- Quyền cũ: hoan_thanh_don đi theo xac_nhan_don ("xác nhận/duyệt đơn");
--   sua_hoa_don, tao_nhan_vien, kiem_kho → chỉ Admin.
--
-- co_quyen() đổi ruột, giữ tên và nhận cả khóa cũ → hơn 30 RPC / policy đang gọi
-- nó tự theo quyền mới, không phải viết lại từng hàm.
--
-- Bảng chuc_vu vẫn giữ làm "phạm vi" (vai_tro: quan_ly / van_phong / thu_kho …)
-- cho JWT và lọc theo kho — giao diện không còn gọi là chức vụ. chuc_vu_quyen
-- không còn được đọc; xóa dữ liệu cho khỏi nhầm.
--
-- DỮ LIỆU (người dùng đã đồng ý): tài khoản không phải Admin bắt đầu KHÔNG có quyền
-- nào — quản lý tự tích lại. Chức vụ tự tạo "Đặt hàng" bỏ; người đang giữ chuyển
-- về NHAN_VIEN (cùng phạm vi văn phòng).

-- --- 1. Bảng quyền theo người --------------------------------------------------
create table public.nguoi_dung_quyen (
  nguoi_dung_id uuid not null,
  quyen text not null check (quyen in (
    'tao_tai_khoan', 'phan_quyen', 'tao_don', 'xac_nhan_don', 'nhap_kho',
    'tao_doi_tac', 'tao_ma_hang', 'xem_dashboard', 'xem_phan_tich'
  )),
  created_at timestamptz not null default now(),
  primary key (nguoi_dung_id, quyen)
);
comment on table public.nguoi_dung_quyen is
  '0117: quyền nghiệp vụ của từng tài khoản (Admin không cần dòng — luôn đủ quyền). Ghi qua RPC dat_quyen_nguoi_dung.';

alter table public.nguoi_dung_quyen enable row level security;
create policy "xem quyen nguoi dung" on public.nguoi_dung_quyen
  for select to authenticated using (
    nguoi_dung_id = (select auth.uid())
    or (select public.co_quyen('phan_quyen'))
    or (select public.co_quyen('tao_tai_khoan'))
  );
grant select on public.nguoi_dung_quyen to authenticated;

-- --- 2. co_quyen theo người ------------------------------------------------------
create or replace function public.co_quyen(p_quyen text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_vai public.vai_tro;
  v_khoa text;
begin
  if p_quyen not in (
    'tao_tai_khoan', 'phan_quyen', 'tao_don', 'xac_nhan_don', 'nhap_kho',
    'tao_doi_tac', 'tao_ma_hang', 'xem_dashboard', 'xem_phan_tich',
    -- khóa cũ còn được các RPC gọi (0083…)
    'hoan_thanh_don', 'sua_hoa_don', 'tao_nhan_vien', 'kiem_kho'
  ) then
    raise exception 'Quyền không tồn tại: %', p_quyen using errcode = '22023';
  end if;

  if v_uid is null then
    return coalesce((select auth.role()), 'service_role') = 'service_role';
  end if;

  select nd.vai_tro into v_vai from public.nguoi_dung nd where nd.id = v_uid and nd.dang_hoat_dong;
  if v_vai is null then return false; end if;
  if v_vai = 'quan_ly' then return true; end if;

  v_khoa := case p_quyen
    when 'hoan_thanh_don' then 'xac_nhan_don'
    when 'sua_hoa_don' then null
    when 'tao_nhan_vien' then null
    when 'kiem_kho' then null
    else p_quyen
  end;
  if v_khoa is null then return false; end if;

  return exists (
    select 1 from public.nguoi_dung_quyen q where q.nguoi_dung_id = v_uid and q.quyen = v_khoa
  );
end;
$$;
comment on function public.co_quyen(text) is
  '0117: Admin (vai_tro quan_ly) luôn true; người khác theo nguoi_dung_quyen. Khóa cũ: hoan_thanh_don = xac_nhan_don; sua_hoa_don / tao_nhan_vien / kiem_kho chỉ Admin. Người bị khóa luôn false.';

create or replace function public.quyen_cua_toi()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when nd.vai_tro = 'quan_ly' then array[
      'phan_quyen', 'tao_doi_tac', 'tao_don', 'tao_ma_hang', 'tao_tai_khoan',
      'xac_nhan_don', 'xem_dashboard', 'xem_phan_tich', 'nhap_kho'
    ]
    else coalesce((select array_agg(q.quyen order by q.quyen) from public.nguoi_dung_quyen q
                   where q.nguoi_dung_id = nd.id), '{}')
  end
  from public.nguoi_dung nd
  where nd.id = (select auth.uid()) and nd.dang_hoat_dong;
$$;

-- --- 3. Xem phân tích, tạo đối tác theo quyền ---------------------------------
create or replace function public.xem_duoc_phan_tich()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.co_quyen('xem_phan_tich');
$$;

drop policy if exists "them doi tac" on public.doi_tac;
drop policy if exists "sua doi tac" on public.doi_tac;
create policy "them doi tac" on public.doi_tac
  for insert to authenticated
  with check ((select public.co_quyen('tao_doi_tac')));
create policy "sua doi tac" on public.doi_tac
  for update to authenticated
  using      ((select public.co_quyen('tao_doi_tac')))
  with check ((select public.co_quyen('tao_doi_tac')));

-- --- 4. Tài khoản: Admin hoặc quyền Tạo tài khoản / Phân quyền ----------------
drop policy if exists "xem ho so nguoi dung" on public.nguoi_dung;
create policy "xem ho so nguoi dung" on public.nguoi_dung
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) = 'quan_ly'
    or id = (select auth.uid())
    or (select public.co_quyen('tao_tai_khoan'))
    or (select public.co_quyen('phan_quyen'))
  );

-- SECURITY DEFINER: người có quyền Tạo tài khoản (không phải Admin) không qua được
-- policy "quan ly sua nguoi dung" — kiểm quyền tường minh ở đây. Không phải Admin thì
-- không đụng được tài khoản Admin và không cấp được phạm vi Admin (chặn leo quyền).
create or replace function public.luu_nguoi_dung(
  p_id uuid, p_ho_ten text, p_ten_dang_nhap text, p_chuc_vu_id uuid,
  p_kho_ids uuid[], p_phai_doi_mat_khau boolean,
  p_xem_lich_su_kiotviet boolean default null, p_duyet_kiem_ke boolean default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ten_dang_nhap text := nullif(btrim(p_ten_dang_nhap), '');
  v_pham_vi public.vai_tro := (select pham_vi from public.chuc_vu where id = p_chuc_vu_id);
  v_la_admin boolean := coalesce((select public.vai_tro_hien_tai())::text, '') = 'quan_ly';
  v_dich_vai public.vai_tro := (select vai_tro from public.nguoi_dung where id = p_id);
begin
  if not v_la_admin and not public.co_quyen('tao_tai_khoan') then
    raise exception 'Tài khoản chưa có quyền Tạo tài khoản' using errcode = '42501';
  end if;
  if not v_la_admin and (v_pham_vi = 'quan_ly' or v_dich_vai = 'quan_ly') then
    raise exception 'Chỉ Quản lý/Admin được tạo hoặc sửa tài khoản Quản lý/Admin' using errcode = '42501';
  end if;
  if v_pham_vi is null then
    raise exception 'Loại tài khoản không còn tồn tại — chọn lại' using errcode = '23514';
  end if;
  if v_pham_vi = 'thu_kho' and coalesce(cardinality(p_kho_ids), 0) = 0 then
    raise exception 'Nhân viên giới hạn kho phải được gán ít nhất một kho' using errcode = '23514';
  end if;
  insert into public.nguoi_dung (
    id, ho_ten, ten_dang_nhap, chuc_vu_id, phai_doi_mat_khau,
    xem_lich_su_kiotviet, duyet_kiem_ke
  )
  values (
    p_id, p_ho_ten, v_ten_dang_nhap, p_chuc_vu_id, p_phai_doi_mat_khau,
    coalesce(p_xem_lich_su_kiotviet, false), coalesce(p_duyet_kiem_ke, false)
  )
  on conflict (id) do update set
    ho_ten = excluded.ho_ten, ten_dang_nhap = excluded.ten_dang_nhap,
    chuc_vu_id = excluded.chuc_vu_id, phai_doi_mat_khau = excluded.phai_doi_mat_khau,
    xem_lich_su_kiotviet = coalesce(p_xem_lich_su_kiotviet, public.nguoi_dung.xem_lich_su_kiotviet),
    duyet_kiem_ke = coalesce(p_duyet_kiem_ke, public.nguoi_dung.duyet_kiem_ke);
  delete from public.nguoi_dung_kho
  where nguoi_dung_id = p_id
    and (v_pham_vi <> 'thu_kho' or not (kho_id = any(p_kho_ids)));
  if v_pham_vi = 'thu_kho' then
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select p_id, unnest(p_kho_ids) on conflict do nothing;
  end if;
  -- Lên Admin thì quyền lẻ thừa (Admin luôn đủ) — dọn cho gọn.
  if v_pham_vi = 'quan_ly' then
    delete from public.nguoi_dung_quyen where nguoi_dung_id = p_id;
  end if;
end $$;

-- Ghi đè trọn bộ quyền của một tài khoản.
create or replace function public.dat_quyen_nguoi_dung(p_id uuid, p_quyen text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_la_admin boolean := coalesce((select public.vai_tro_hien_tai())::text, '') = 'quan_ly';
  v_dich_vai public.vai_tro := (select vai_tro from public.nguoi_dung where id = p_id);
  v_la text;
begin
  if not v_la_admin and not public.co_quyen('phan_quyen') then
    raise exception 'Tài khoản chưa có quyền Phân quyền' using errcode = '42501';
  end if;
  if v_dich_vai is null then
    raise exception 'Không tìm thấy tài khoản' using errcode = '23514';
  end if;
  if v_dich_vai = 'quan_ly' then
    raise exception 'Tài khoản Quản lý/Admin luôn đủ quyền — không cần phân quyền' using errcode = '23514';
  end if;
  select q into v_la from unnest(coalesce(p_quyen, '{}')) q
  where q not in ('tao_tai_khoan', 'phan_quyen', 'tao_don', 'xac_nhan_don', 'nhap_kho',
                  'tao_doi_tac', 'tao_ma_hang', 'xem_dashboard', 'xem_phan_tich')
  limit 1;
  if v_la is not null then
    raise exception 'Quyền không tồn tại: %', v_la using errcode = '22023';
  end if;

  delete from public.nguoi_dung_quyen where nguoi_dung_id = p_id and not (quyen = any(coalesce(p_quyen, '{}')));
  insert into public.nguoi_dung_quyen (nguoi_dung_id, quyen)
  select p_id, q from unnest(coalesce(p_quyen, '{}')) q on conflict do nothing;

  return coalesce((select array_agg(quyen order by quyen) from public.nguoi_dung_quyen where nguoi_dung_id = p_id), '{}');
end;
$$;
revoke all    on function public.dat_quyen_nguoi_dung(uuid, text[]) from public, anon;
grant execute on function public.dat_quyen_nguoi_dung(uuid, text[]) to authenticated;

-- --- 5. Dữ liệu: chỉ còn Admin là chức vụ thật --------------------------------
update public.chuc_vu set ten = 'Quản lý/Admin' where ma = 'QUAN_LY';
update public.chuc_vu set ten = 'Nhân viên — mọi kho' where ma = 'NHAN_VIEN';
update public.chuc_vu set ten = 'Nhân viên — kho được giao' where ma = 'THU_KHO';
-- Chức vụ tự tạo: người đang giữ về NHAN_VIEN (phạm vi văn phòng), rồi bỏ chức vụ.
update public.nguoi_dung nd set chuc_vu_id = (select id from public.chuc_vu where ma = 'NHAN_VIEN')
where nd.chuc_vu_id in (select id from public.chuc_vu where ma not in ('QUAN_LY', 'NHAN_VIEN', 'THU_KHO', 'CHI_XEM'));
delete from public.chuc_vu where ma not in ('QUAN_LY', 'NHAN_VIEN', 'THU_KHO', 'CHI_XEM');
delete from public.chuc_vu_quyen where true;

-- --- 6. nhap_doi_tac_excel theo quyền Tạo đối tác -----------------------------
create or replace function public.nhap_doi_tac_excel(
  p_kieu text,
  p_dong jsonb,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r record;
  v_ma text;
  v_moi integer := 0;
  v_sua integer := 0;
  v_loi jsonb;
begin
  if p_kieu is null or p_kieu not in ('moi', 'cap_nhat') then
    raise exception 'Kiểu nhập không hợp lệ: %', p_kieu using errcode = '22023';
  end if;
  if jsonb_typeof(p_dong) is distinct from 'array' then
    raise exception 'Dữ liệu phải là một mảng' using errcode = '22023';
  end if;
  if not public.co_quyen('tao_doi_tac') then
    raise exception 'Tài khoản chưa có quyền Tạo đối tác' using errcode = '42501';
  end if;

  drop table if exists _dt_dong, _dt_loi;
  create temp table _dt_loi (dong integer, so text, loi text) on commit drop;

  create temp table _dt_dong on commit drop as
  select
    coalesce((x->>'dong')::integer, 0)            as dong,
    nullif(trim(x->>'ma'), '')                    as ma,
    nullif(trim(x->>'ten'), '')                   as ten,
    nullif(x->>'loai', '')                        as loai,
    nullif(trim(x->>'dien_thoai'), '')            as dien_thoai,
    nullif(trim(x->>'email'), '')                 as email,
    nullif(trim(x->>'dia_chi'), '')               as dia_chi,
    nullif(trim(x->>'khu_vuc'), '')               as khu_vuc,
    nullif(trim(x->>'phuong_xa'), '')             as phuong_xa,
    nullif(trim(x->>'ma_so_thue'), '')            as ma_so_thue,
    nullif(trim(x->>'ghi_chu'), '')               as ghi_chu,
    (x->>'dang_hoat_dong')::boolean               as dang_hoat_dong,
    null::uuid                                    as id_cu
  from jsonb_array_elements(p_dong) as t(x);

  -- Mã cũ từ KiotViet có thể có dấu / chữ thường (vd. "NCC lẻ") — so không phân biệt hoa thường.
  update _dt_dong d set id_cu = dt.id from public.doi_tac dt where upper(dt.ma) = upper(d.ma);

  -- --- Kiểm lỗi ---------------------------------------------------------------
  insert into _dt_loi
  select min(d.dong), min(d.ma), 'Mã ' || min(d.ma) || ' lặp lại trong file' from _dt_dong d
  where d.ma is not null group by upper(d.ma) having count(*) > 1;


  insert into _dt_loi
  select d.dong, d.ma, 'Loại phải là Nhà cung cấp, Khách hàng hoặc Cả hai'
  from _dt_dong d where d.loai is not null and d.loai not in ('NCC', 'KHACH', 'CA_HAI');

  insert into _dt_loi
  select d.dong, d.ma, 'Số điện thoại chỉ gồm số và + ( ) . - (tối đa 20 ký tự)'
  from _dt_dong d where d.dien_thoai is not null and (d.dien_thoai !~ '^[0-9 +().-]*$' or length(d.dien_thoai) > 20);

  insert into _dt_loi
  select d.dong, d.ma, 'Email không hợp lệ: ' || d.email
  from _dt_dong d where d.email is not null and d.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';

  if p_kieu = 'moi' then
    insert into _dt_loi
    select d.dong, d.ma, 'Mã ' || d.ma || ' đã có — dùng "Cập nhật" nếu muốn sửa đối tác này'
    from _dt_dong d where d.id_cu is not null;

    insert into _dt_loi
    select d.dong, d.ma, 'Thiếu tên đối tác' from _dt_dong d where d.ten is null or length(d.ten) < 2;

    -- Mã mới theo quy tắc của form "Thêm nhà cung cấp"; mã cũ (cập nhật) giữ nguyên.
    insert into _dt_loi
    select d.dong, d.ma, 'Mã chỉ gồm chữ không dấu, số và . _ - (tối đa 32 ký tự)'
    from _dt_dong d where d.ma is not null and (d.ma !~* '^[A-Z0-9._-]+$' or length(d.ma) > 32);
  else
    insert into _dt_loi
    select d.dong, d.ma, 'Thiếu mã — Cập nhật tìm đối tác theo mã' from _dt_dong d where d.ma is null;

    insert into _dt_loi
    select d.dong, d.ma, 'Không có đối tác mã ' || d.ma || ' — dùng "Nhập mới" để thêm'
    from _dt_dong d where d.ma is not null and d.id_cu is null;
  end if;

  v_loi := coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong)
                     from _dt_loi l), '[]');

  if p_chi_kiem_tra or jsonb_array_length(v_loi) > 0 then
    return jsonb_build_object('committed', false, 'moi', 0, 'sua', 0, 'loi', v_loi, 'canh_bao', '[]'::jsonb);
  end if;

  -- --- Ghi ----------------------------------------------------------------------
  if p_kieu = 'moi' then
    -- Từng dòng một: mã trống được cấp theo mã lớn nhất HIỆN CÓ, nên phải chèn xong
    -- dòng trước rồi mới cấp mã cho dòng sau.
    for r in select * from _dt_dong order by dong loop
      v_ma := coalesce(upper(r.ma), public.sinh_ma_doi_tac(coalesce(r.loai, 'NCC')::public.loai_doi_tac));
      insert into public.doi_tac (ma, ten, loai, dien_thoai, email, dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong)
      values (v_ma, r.ten, coalesce(r.loai, 'NCC')::public.loai_doi_tac, r.dien_thoai, r.email, r.dia_chi,
              r.khu_vuc, r.phuong_xa, r.ma_so_thue, r.ghi_chu, coalesce(r.dang_hoat_dong, true));
      v_moi := v_moi + 1;
    end loop;
  else
    update public.doi_tac dt set
      ten            = coalesce(d.ten, dt.ten),
      loai           = coalesce(d.loai::public.loai_doi_tac, dt.loai),
      dien_thoai     = coalesce(d.dien_thoai, dt.dien_thoai),
      email          = coalesce(d.email, dt.email),
      dia_chi        = coalesce(d.dia_chi, dt.dia_chi),
      khu_vuc        = coalesce(d.khu_vuc, dt.khu_vuc),
      phuong_xa      = coalesce(d.phuong_xa, dt.phuong_xa),
      ma_so_thue     = coalesce(d.ma_so_thue, dt.ma_so_thue),
      ghi_chu        = coalesce(d.ghi_chu, dt.ghi_chu),
      dang_hoat_dong = coalesce(d.dang_hoat_dong, dt.dang_hoat_dong)
    from _dt_dong d where dt.id = d.id_cu;
    get diagnostics v_sua = row_count;
  end if;

  return jsonb_build_object('committed', true, 'moi', v_moi, 'sua', v_sua, 'loi', '[]'::jsonb, 'canh_bao', '[]'::jsonb);
end;
$$;

revoke all on function public.nhap_doi_tac_excel(text, jsonb, boolean) from public, anon;
grant execute on function public.nhap_doi_tac_excel(text, jsonb, boolean) to authenticated;
