-- 0128: hai quyền mới theo người — Xem tồn kho, Sửa phiếu (12/10/2026).
--
-- xem_ton_kho: không có thì KHÔNG thấy số tồn ở đâu cả (người dùng chọn "ẩn hẳn số").
--   · Bảng ton_kho, kho_movement: policy đọc thêm điều kiện co_quyen('xem_ton_kho').
--   · Hàm SECURITY DEFINER bỏ qua RLS nên phải tự kiểm:
--       - hàm chỉ phục vụ số tồn → 42501 (danh_sach_ton_kho, the_kho_san_pham,
--         khong_luan_chuyen, ton_theo_nhom, bao_cao_xuat_am, phan_tich_ton_kho, doi_chieu_ton)
--       - hàm trả lẫn thông tin khác → cột tồn trả null (danh_sach_san_pham, chi_tiet_san_pham,
--         dong_chung_tu, bang_dem_kiem_ke, tong_quan_chi_so); goi_y_ma_trung trả rỗng.
--     Giao diện phân biệt null (bị ẩn) với 0 (hết hàng) — đừng coalesce null về 0.
-- sua_phieu: mở sửa phiếu ĐÃ DUYỆT — đơn đặt (mo_khoa_don, thay xac_nhan_don), hóa đơn
--   và phiếu nhập (mo_sua_chung_tu, thay sua_hoa_don / chỉ Admin). Hủy phiếu giữ luật cũ.
--
-- Admin (vai_tro quan_ly) luôn có cả hai qua co_quyen(). DỮ LIỆU (người dùng chọn
-- "bắt đầu từ không"): tài khoản khác KHÔNG được tích sẵn — sau migration nhân viên mất
-- số tồn và nút Sửa đơn cho tới khi quản lý tích lại trong Cài đặt → Người dùng.
--
-- Thân hàm chép nguyên từ định nghĩa mới nhất (ghi chú "-- 0128" ở chỗ vá), chữ ký
-- giữ nguyên. Migration sau ghi đè các hàm này phải giữ phần kiểm quyền Xem tồn.

-- --- 1. Bảng quyền nhận hai khóa mới --------------------------------------------
alter table public.nguoi_dung_quyen drop constraint nguoi_dung_quyen_quyen_check;
alter table public.nguoi_dung_quyen add constraint nguoi_dung_quyen_quyen_check check (quyen in (
  'tao_tai_khoan', 'phan_quyen', 'tao_don', 'xac_nhan_don', 'nhap_kho',
  'tao_doi_tac', 'tao_ma_hang', 'xem_dashboard', 'xem_phan_tich',
  'xem_ton_kho', 'sua_phieu'
));

-- --- 2. Bảng tồn và sổ cái: đọc trực tiếp cũng cần quyền Xem tồn ----------------
drop policy "doc ton kho theo pham vi" on public.ton_kho;
create policy "doc ton kho theo pham vi" on public.ton_kho
  for select to authenticated using (
    (select public.co_quyen('xem_ton_kho'))
    and (
      (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
      or ((select public.vai_tro_hien_tai()) = 'thu_kho'
          and kho_id = any((select public.kho_hien_tai())::uuid[]))
    )
  );

drop policy "doc so cai theo pham vi" on public.kho_movement;
create policy "doc so cai theo pham vi" on public.kho_movement
  for select to authenticated using (
    (select public.co_quyen('xem_ton_kho'))
    and (
      (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
      or ((select public.vai_tro_hien_tai()) = 'thu_kho'
          and kho_id = any((select public.kho_hien_tai())::uuid[]))
    )
  );

-- --- 3. co_quyen: nhận thêm xem_ton_kho, sua_phieu ---------------------------
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
    'xem_ton_kho', 'sua_phieu',
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

-- --- 4. quyen_cua_toi: Admin có đủ cả hai quyền mới --------------------------
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
      'xac_nhan_don', 'xem_dashboard', 'xem_phan_tich', 'nhap_kho',
      'xem_ton_kho', 'sua_phieu'
    ]
    else coalesce((select array_agg(q.quyen order by q.quyen) from public.nguoi_dung_quyen q
                   where q.nguoi_dung_id = nd.id), '{}')
  end
  from public.nguoi_dung nd
  where nd.id = (select auth.uid()) and nd.dang_hoat_dong;
$$;

-- --- 5. dat_quyen_nguoi_dung: cho tích hai quyền mới -------------------------
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
                  'tao_doi_tac', 'tao_ma_hang', 'xem_dashboard', 'xem_phan_tich',
                  'xem_ton_kho', 'sua_phieu')
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

-- --- 6. mo_khoa_don (Sửa đơn đã duyệt): quyền Sửa phiếu thay Xác nhận đơn ----
create or replace function public.mo_khoa_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('sua_phieu') then
    raise exception 'Tài khoản chưa có quyền Sửa phiếu' using errcode = '42501';
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

-- --- 7. mo_sua_chung_tu (Sửa hóa đơn / phiếu nhập đã duyệt): quyền Sửa phiếu ---
create or replace function public.mo_sua_chung_tu(p_chung_tu_id uuid, p_ly_do text)
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
  if not public.co_quyen('sua_phieu') then
    raise exception 'Tài khoản chưa có quyền Sửa phiếu' using errcode = '42501';
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

  -- 3. Bản sửa: nháp, đúng số cũ, chép đầu phiếu (người nhận nằm ở chung_tu_nguoi_nhan, chép ở dưới). Tổng tính lại khi ghi sổ.
  insert into public.chung_tu (
    so_ct, loai_ct, ngay_ct, kho_id, kho_den_id, doi_tac_id, don_dat_hang_id, chung_tu_goc_id,
    trang_thai, giam_gia, ly_do_xuat_am, ghi_chu_ly_do, ghi_chu, nguoi_tao_id, nguon_nhap,
    pham_vi_nhom_hang, ban_sua_cua_id
  ) values (
    v_ct.so_ct, v_ct.loai_ct, v_ct.ngay_ct, v_ct.kho_id, v_ct.kho_den_id, v_ct.doi_tac_id,
    v_ct.don_dat_hang_id, v_ct.chung_tu_goc_id, 'NHAP_LIEU', v_ct.giam_gia, v_ct.ly_do_xuat_am,
    v_ct.ghi_chu_ly_do, v_ct.ghi_chu, v_ct.nguoi_tao_id, v_ct.nguon_nhap, v_ct.pham_vi_nhom_hang,
    p_chung_tu_id
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

-- --- 8. danh_sach_ton_kho: cần quyền Xem tồn kho -----------------------------
create or replace function public.danh_sach_ton_kho(
  p_tu_khoa text default null,
  p_nhom_hang_id uuid default null,
  p_cong_doan_id uuid default null,
  p_kho_id uuid default null,
  p_trang_thai_ton text default null,
  p_dang_kinh_doanh boolean default true,
  p_sap_xep text default null,
  p_huong text default 'asc',
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table (
  id uuid,
  ma_hang text,
  ten_hang text,
  nhom_hang_id uuid,
  ten_nhom_hang text,
  cong_doan_id uuid,
  ma_cong_doan text,
  ten_cong_doan text,
  mau_cong_doan text,
  ten_dvt text,
  ton_theo_kho jsonb,
  tong_ton numeric,
  ton_toi_thieu numeric,
  dang_kinh_doanh boolean,
  tong_so_dong bigint
)
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;

  return query
  with ton as (
    -- Gộp tồn theo mã x kho thành một object jsonb {kho_id: so_luong}. Thủ
    -- kho chỉ cộng tồn của kho được phân — hàm tự áp phạm vi ở đây, không
    -- dựa vào RLS (SECURITY DEFINER bỏ qua RLS bên trong thân hàm).
    select tk.san_pham_id,
           jsonb_object_agg(tk.kho_id::text, tk.so_luong) as theo_kho,
           sum(tk.so_luong) as tong
    from public.ton_kho tk
    where (v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho))
      and (p_kho_id is null or tk.kho_id = p_kho_id)
    group by tk.san_pham_id
  ), loc as (
    -- LEFT JOIN bắt buộc: phần lớn mã chưa có dòng ton_kho nào và vẫn phải
    -- hiện với tồn 0, không được rơi khỏi danh sách.
    select sp.*,
           nh.ten as ten_nhom,
           cd.ma as ma_cd, cd.ten as ten_cd, cd.mau_hien_thi,
           dv.ten as ten_dv,
           coalesce(ton.theo_kho, '{}'::jsonb) as theo_kho,
           coalesce(ton.tong, 0) as tong
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
    left join public.don_vi_tinh dv on dv.id = sp.dvt_id
    left join ton on ton.san_pham_id = sp.id
    where (v_tk is null
           or public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
                ilike '%' || public.f_unaccent(v_tk) || '%'
           or public.f_unaccent(v_tk) operator(extensions.<%)
                public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
      and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
      and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
      -- Nhánh is null BẮT BUỘC: lớp client map "Tất cả" thành null. Viết
      -- thẳng sp.dang_kinh_doanh = p_dang_kinh_doanh sẽ cho ra unknown ở mọi
      -- dòng khi p_dang_kinh_doanh là null, RPC trả 0 dòng thay vì trả tất cả.
      and (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi,
         l.ten_dv, l.theo_kho, l.tong, l.ton_toi_thieu, l.dang_kinh_doanh,
         count(*) over ()
  from loc l
  where (p_trang_thai_ton is null
         or (p_trang_thai_ton = 'con_hang'      and l.tong > 0)
         or (p_trang_thai_ton = 'het_hang'      and l.tong = 0)
         or (p_trang_thai_ton = 'am'            and l.tong < 0)
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm —
         -- khớp isBelowMinimum() ở giao diện (0067, UAT 05 bài 7).
         or (p_trang_thai_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
  order by
    case when p_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when p_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when p_sap_xep = 'ten_hang' and p_huong = 'asc'  then l.ten_hang end asc,
    case when p_sap_xep = 'ten_hang' and p_huong = 'desc' then l.ten_hang end desc,
    case when p_sap_xep = 'tong_ton' and p_huong = 'asc'  then l.tong end asc,
    case when p_sap_xep = 'tong_ton' and p_huong = 'desc' then l.tong end desc,
    case when p_sap_xep = 'ma_hang'  and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

-- --- 9. the_kho_san_pham: cần quyền Xem tồn kho ------------------------------
CREATE OR REPLACE FUNCTION public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint, ton_luy_ke numeric, ly_do_xuat_am text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;
  return query
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           (((m.ngay at time zone 'Asia/Ho_Chi_Minh')::date
             + (m.created_at at time zone 'Asia/Ho_Chi_Minh')::time)
             at time zone 'Asia/Ho_Chi_Minh')                     as ngay,
           m.kho_id                                               as kho_id,
           k.ten                                                  as ten_kho,
           m.chung_tu_id                                          as chung_tu_id,
           ct.so_ct                                               as so_ct,
           ct.loai_ct::text                                       as loai_ct,
           case
      -- 0102: đối tác nội bộ (mã NB…) giao qua nhân viên → chỉ hiện tên nhân viên.
      when dt.ma ilike 'NB%' and exists (select 1 from public.chung_tu_nguoi_nhan x where x.chung_tu_id = ct.id)
        then (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = ct.id)
      else coalesce(dt.ten, (select string_agg(nvp.ten_day_du, ', ' order by ctn.thu_tu, ctn.nguoi_nhan_id)
       from public.chung_tu_nguoi_nhan ctn
       join public.nhan_vien_phu_trach nvp on nvp.id = ctn.nguoi_nhan_id
       where ctn.chung_tu_id = ct.id))
    end                                                     as doi_tac,
           case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
           case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
           case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
           m.la_but_toan_dao                                      as la_but_toan_dao,
           ct.ghi_chu                                             as ghi_chu,
           case when m.so_luong < 0 and not m.la_but_toan_dao
                then ct.ly_do_xuat_am end                         as ly_do_xuat_am,
           (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date         as sx_ngay,
           m.created_at                                           as sx_phu,
           m.id                                                   as sx_id
    from public.kho_movement m
    join public.kho k on k.id = m.kho_id
    left join public.chung_tu ct on ct.id = m.chung_tu_id
    left join public.doi_tac dt on dt.id = ct.doi_tac_id
    where m.san_pham_id = p_san_pham_id
      and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
      and (p_kho_id is null or m.kho_id = p_kho_id)
  ),
  voi_luy_ke as (
    select t.*,
           sum(coalesce(t.so_luong_nhap, 0) - coalesce(t.so_luong_xuat, 0))
             over (order by t.sx_ngay asc, t.sx_phu asc, t.sx_id asc rows unbounded preceding)
             as ton_luy_ke
    from tat_ca t
  )
  select v.nguon, v.ngay, v.kho_id, v.ten_kho, v.chung_tu_id, v.so_ct, v.loai_ct,
         v.doi_tac, v.so_luong_nhap, v.so_luong_xuat, v.gia_von_tai_thoi_diem,
         v.la_but_toan_dao, v.ghi_chu, count(*) over (), v.ton_luy_ke,
         v.ly_do_xuat_am
  from voi_luy_ke v
  order by v.sx_ngay desc, v.sx_phu desc, v.sx_id desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

-- --- 10. khong_luan_chuyen: cần quyền Xem tồn kho ----------------------------
create or replace function public.khong_luan_chuyen(
  p_so_ngay integer default 30,
  p_gioi_han integer default 10,
  p_ngay date default ((now() at time zone 'Asia/Ho_Chi_Minh')::date)
)
returns table (
  san_pham_id uuid,
  ma_hang text,
  ten_hang text,
  so_ngay integer,
  ton numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay <= 0 then
    raise exception 'Số ngày phải lớn hơn 0' using errcode = '22023';
  end if;

  return query
  select v.san_pham_id, v.ma_hang, v.ten_hang, v.so_ngay, v.ton
  from (
    select sp.id as san_pham_id, sp.ma_hang as ma_hang, sp.ten_hang as ten_hang,
           (p_ngay - (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date)::integer as so_ngay,
           d.tong as ton
    from public.san_pham sp
    join (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
          from public.ton_kho tk group by tk.san_pham_id) d on d.d_sp = sp.id
    where sp.dang_kinh_doanh
      and d.tong > 0
      and (coalesce(sp.lan_phat_sinh_cuoi, sp.created_at) at time zone 'Asia/Ho_Chi_Minh')::date < p_ngay - p_so_ngay
  ) v
  order by v.so_ngay desc, v.ma_hang
  limit least(greatest(coalesce(p_gioi_han, 10), 1), 100);
end;
$$;

-- --- 11. ton_theo_nhom: cần quyền Xem tồn kho --------------------------------
create or replace function public.ton_theo_nhom(p_theo text, p_kho_id uuid default null::uuid)
returns table (
  nhom_id uuid, ten_nhom text, tong_ma bigint, con_hang bigint, het_hang bigint,
  am bigint, duoi_dinh_muc bigint, tong_so_luong numeric
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;

  if p_theo is null or p_theo not in ('nhom', 'cong_doan') then
    raise exception 'Tham số p_theo chỉ nhận nhom hoặc cong_doan' using errcode = '22023';
  end if;

  return query
  select v.nhom_id, v.ten_nhom, v.tong_ma, v.con_hang, v.het_hang, v.am, v.duoi_dinh_muc, v.tong_so_luong
  from (
    with ton as (
      select tk.san_pham_id, sum(tk.so_luong) as tong
      from public.ton_kho tk
      where p_kho_id is null or tk.kho_id = p_kho_id
      group by tk.san_pham_id
    ), loc as (
      select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
             coalesce(ton.tong, 0) as tong
      from public.san_pham sp
      left join ton on ton.san_pham_id = sp.id
      where sp.dang_kinh_doanh = true
    ), gan as (
      select l.id, l.ton_toi_thieu, l.tong,
             case when p_theo = 'nhom' then l.nhom_hang_id else l.cong_doan_id end as nhom_id
      from loc l
    )
    select
      g.nhom_id as nhom_id,
      case when p_theo = 'nhom' then nh.ten else cd.ten end as ten_nhom,
      count(*) as tong_ma,
      count(*) filter (where g.tong > 0) as con_hang,
      count(*) filter (where g.tong = 0) as het_hang,
      count(*) filter (where g.tong < 0) as am,
      count(*) filter (where g.ton_toi_thieu > 0 and g.tong < g.ton_toi_thieu) as duoi_dinh_muc,
      coalesce(sum(greatest(g.tong, 0)), 0) as tong_so_luong
    from gan g
    left join public.nhom_hang nh on p_theo = 'nhom'      and nh.id = g.nhom_id
    left join public.cong_doan cd on p_theo = 'cong_doan' and cd.id = g.nhom_id
    group by g.nhom_id, nh.ten, cd.ten
  ) v
  order by v.ten_nhom asc nulls last;
end;
$function$;

-- --- 12. bao_cao_xuat_am: cần quyền Xem tồn kho ------------------------------
CREATE OR REPLACE FUNCTION public.bao_cao_xuat_am(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(dong_id uuid, chung_tu_id uuid, so_ct text, loai_ct text, kho_id uuid, ten_kho text, san_pham_id uuid, ma_hang text, ten_hang text, so_luong_xuat numeric, ton_sau numeric, nguoi_lap text, ly_do_xuat_am text, ghi_chu_ly_do text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- SECURITY DEFINER bỏ qua RLS/quyền cột nên phải tự kiểm vai trò TƯỜNG MINH
  -- tại đây (D-12 — "phân quyền bằng RLS/database, không bằng giao diện").
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;

  return query
  with ung_vien as (
    -- Chỉ những dòng CÓ THỂ đưa tồn xuống âm: XUAT/TRA_NCC, đã ghi sổ, không
    -- phải bút toán đảo, đúng ngày báo cáo (D-02, D-03). Phiếu DA_HUY và
    -- NHAP_LIEU (không có trong sổ cái) không bao giờ xuất hiện ở đây.
    select m.id
    from public.kho_movement m
    join public.chung_tu ct on ct.id = m.chung_tu_id
    where ct.ngay_ct = p_ngay
      and ct.loai_ct in ('XUAT', 'TRA_NCC')
      and ct.trang_thai = 'HOAN_THANH'
      and m.la_but_toan_dao = false
  ),
  cap as (
    -- Chỉ tính lũy kế cho các cặp (kho, mã) THẬT SỰ có dòng ứng viên hôm đó —
    -- tránh window function quét toàn bộ kho_movement mỗi lần mở trang.
    select distinct m.kho_id, m.san_pham_id
    from public.kho_movement m
    join ung_vien uv on uv.id = m.id
  ),
  luy_ke as (
    -- Lũy kế trên MỌI movement của các cặp trong `cap` (kể cả bút toán đảo,
    -- phiếu khác loại, mọi ngày) — đúng lịch sử thật của (kho, mã) đó, không
    -- chỉ riêng ngày báo cáo.
    select
      m.id, m.kho_id, m.san_pham_id, m.chung_tu_id, m.chung_tu_dong_id, m.so_luong,
      m.created_at,
      sum(m.so_luong) over (
        partition by m.kho_id, m.san_pham_id
        order by m.created_at, d.created_at, d.id, m.id
        rows unbounded preceding
      ) as ton_sau
    from public.kho_movement m
    join cap c on c.kho_id = m.kho_id and c.san_pham_id = m.san_pham_id
    left join public.chung_tu_dong d on d.id = m.chung_tu_dong_id
  )
  select
    l.id                as dong_id,
    ct.id               as chung_tu_id,
    ct.so_ct            as so_ct,
    ct.loai_ct::text    as loai_ct,
    l.kho_id            as kho_id,
    k.ten               as ten_kho,
    l.san_pham_id       as san_pham_id,
    sp.ma_hang          as ma_hang,
    sp.ten_hang         as ten_hang,
    -l.so_luong         as so_luong_xuat,
    l.ton_sau           as ton_sau,
    nd.ho_ten           as nguoi_lap,
    ct.ly_do_xuat_am    as ly_do_xuat_am,
    ct.ghi_chu_ly_do    as ghi_chu_ly_do
  from luy_ke l
  join ung_vien uv on uv.id = l.id
  join public.chung_tu ct on ct.id = l.chung_tu_id
  join public.kho k on k.id = l.kho_id
  join public.san_pham sp on sp.id = l.san_pham_id
  -- D-16: "người lập" = người TẠO phiếu, không phải người ghi sổ (nguoi_duyet_id).
  left join public.nguoi_dung nd on nd.id = ct.nguoi_tao_id
  where l.ton_sau < 0
  order by sp.ma_hang, k.ten, l.created_at, l.id;
end;
$function$;

-- --- 13. phan_tich_ton_kho: cần quyền Xem tồn kho ----------------------------
CREATE OR REPLACE FUNCTION public.phan_tich_ton_kho(p_so_ngay integer DEFAULT 30, p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date, p_san_pham_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(san_pham_id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, cong_doan_ma text, ten_dvt text, ton numeric, khach_dat numeric, ton_kha_dung numeric, ban_trong_ky numeric, ban_nua_dau numeric, ban_nua_sau numeric, so_ngay_thuc integer, ban_tb_ngay numeric, so_ngay_con numeric, ngay_het_du_kien date, ton_toi_thieu numeric, ngay_ban_cuoi date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tu date;
  v_dau date;
  v_so_ngay_thuc integer;
  v_giua date;
begin
  if not public.xem_duoc_phan_tich() then
    raise exception 'Tài khoản không có quyền xem phân tích tồn kho' using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;
  if p_so_ngay is null or p_so_ngay not between 1 and 365 then
    raise exception 'Kỳ phân tích phải từ 1 đến 365 ngày' using errcode = '22023';
  end if;

  v_tu := p_ngay - (p_so_ngay - 1);

  -- Hóa đơn đối tác đầu tiên của hệ: kỳ dài hơn dữ liệu đang có thì chia theo
  -- số ngày thật, không chia cho những ngày hệ chưa chạy.
  select min(ct.ngay_ct) into v_dau
  from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH' and ct.ngay_ct <= p_ngay;

  v_so_ngay_thuc := case when v_dau is null then 0 else least(p_so_ngay, p_ngay - v_dau + 1) end;
  -- Mốc chia đôi trên đoạn có dữ liệu thật (biểu đồ nhịp bán: % thay đổi).
  v_giua := p_ngay - (v_so_ngay_thuc - 1) + v_so_ngay_thuc / 2;

  return query
  with dong as (
    -- Dòng hóa đơn đối tác đã ghi sổ tới ngày chốt (cả lịch sử — cuoi_ma cần).
    select ct.ngay_ct as ngay, d.san_pham_id as sp_id, d.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and ct.ngay_ct <= p_ngay
    union all
    -- Khách trả cho hóa đơn đối tác: số âm, theo ngày phiếu trả.
    select ct.ngay_ct, d.san_pham_id, -d.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT'
      and ct.ngay_ct between v_tu and p_ngay
  ),
  dong_mo_rong as (
    -- Như _ma_ban_ra: chính mã đó + (nếu là combo) từng thành phần × số lượng.
    select g.ngay, g.sp_id, g.sl from dong g
    union all
    select g.ngay, tp.thanh_phan_id, g.sl * tp.so_luong
    from dong g
    join public.san_pham c on c.id = g.sp_id and c.loai_hang = 'COMBO'
    join public.thanh_phan_combo tp on tp.combo_id = g.sp_id
  ),
  ban as (
    select x.sp_id, x.ngay, x.sl
    from dong_mo_rong x
    where x.ngay between v_tu and p_ngay
      and (p_san_pham_id is null or x.sp_id = p_san_pham_id)
  ),
  ban_ma as (
    select b.sp_id,
           greatest(sum(b.sl), 0) as tong,
           greatest(coalesce(sum(b.sl) filter (where b.ngay < v_giua), 0), 0) as nua_dau,
           greatest(coalesce(sum(b.sl) filter (where b.ngay >= v_giua), 0), 0) as nua_sau
    from ban b
    group by b.sp_id
  ),
  ton_ma as (
    select tk.san_pham_id as sp_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where p_san_pham_id is null or tk.san_pham_id = p_san_pham_id
    group by tk.san_pham_id
  ),
  dat_ma as (
    select dd.san_pham_id as sp_id, sum(greatest(dd.so_luong_dat - dd.so_luong_da_xuat, 0)) as so_luong
    from public.don_dat_hang_dong dd
    join public.don_dat_hang dh on dh.id = dd.don_dat_hang_id
    where dh.trang_thai in ('TAM', 'DA_XAC_NHAN') and dh.doi_tac_id is not null
      and (p_san_pham_id is null or dd.san_pham_id = p_san_pham_id)
    group by dd.san_pham_id
  ),
  cuoi_ma as (
    -- Ngày bán cuối: chỉ dòng hóa đơn (sl > 0), không tính phiếu trả.
    select x.sp_id, max(x.ngay) as ngay
    from dong_mo_rong x
    where x.sl > 0
      and (p_san_pham_id is null or x.sp_id = p_san_pham_id)
    group by x.sp_id
  ),
  tinh as (
    select sp.id, sp.ma_hang, sp.ten_hang, sp.nhom_hang_id, nh.ten as ten_nhom, cd.ma as cd_ma,
           dvt.ten as dvt_ten, sp.ton_toi_thieu, sp.dang_kinh_doanh,
           coalesce(t.so_luong, 0) as ton,
           coalesce(dm.so_luong, 0) as dat,
           coalesce(b.tong, 0) as ban,
           coalesce(b.nua_dau, 0) as nua_dau,
           coalesce(b.nua_sau, 0) as nua_sau,
           c.ngay as ban_cuoi,
           case when v_so_ngay_thuc > 0 and coalesce(b.tong, 0) > 0
                then coalesce(b.tong, 0) / v_so_ngay_thuc end as adu
    from public.san_pham sp
    left join public.nhom_hang nh   on nh.id = sp.nhom_hang_id
    left join public.cong_doan cd   on cd.id = sp.cong_doan_id
    left join public.don_vi_tinh dvt on dvt.id = sp.dvt_id
    left join ton_ma t   on t.sp_id = sp.id
    left join dat_ma dm  on dm.sp_id = sp.id
    left join ban_ma b   on b.sp_id = sp.id
    left join cuoi_ma c  on c.sp_id = sp.id
    where p_san_pham_id is null or sp.id = p_san_pham_id
  )
  select x.id, x.ma_hang, x.ten_hang, x.nhom_hang_id, x.ten_nhom, x.cd_ma, x.dvt_ten,
         x.ton, x.dat, x.ton - x.dat,
         x.ban, x.nua_dau, x.nua_sau,
         v_so_ngay_thuc,
         round(x.adu, 4),
         round(greatest(x.ton - x.dat, 0) / x.adu, 2),
         p_ngay + floor(greatest(x.ton - x.dat, 0) / x.adu)::integer,
         x.ton_toi_thieu,
         x.ban_cuoi
  from tinh x
  -- Toàn danh mục: mã đang kinh doanh, hoặc đã ngừng nhưng còn tồn / còn bán.
  where p_san_pham_id is not null or x.dang_kinh_doanh or x.ton <> 0 or x.ban > 0
  order by x.ma_hang;
end;
$function$;

-- --- 14. doi_chieu_ton: cần quyền Xem tồn kho --------------------------------
create or replace function public.doi_chieu_ton()
returns table (
  kho_id uuid,
  san_pham_id uuid,
  ton_theo_bang numeric(18,4),
  ton_theo_so_cai numeric(18,4),
  chenh_lech numeric(18,4)
)
language plpgsql
stable
security definer
set search_path = ''
as $ham$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng được xem báo cáo đối chiếu tồn'
      using errcode = '42501';
  end if;
  if not public.co_quyen('xem_ton_kho') then
    raise exception 'Tài khoản chưa có quyền Xem tồn kho' using errcode = '42501';
  end if;

  return query
    select v.kho_id, v.san_pham_id, v.ton_theo_bang, v.ton_theo_so_cai, v.chenh_lech
    from public.v_doi_chieu_ton v
    where v.chenh_lech <> 0
    order by abs(v.chenh_lech) desc;
end;
$ham$;

-- --- 15. danh_sach_san_pham: trống cột tồn, bỏ lọc/sắp theo tồn khi không có quyền ---
CREATE OR REPLACE FUNCTION public.danh_sach_san_pham(p_tu_khoa text DEFAULT NULL::text, p_nhom_hang_id uuid DEFAULT NULL::uuid, p_cong_doan_id uuid DEFAULT NULL::uuid, p_dvt_id uuid DEFAULT NULL::uuid, p_trang_thai_ton text DEFAULT NULL::text, p_dang_kinh_doanh boolean DEFAULT true, p_can_ra boolean DEFAULT NULL::boolean, p_sap_xep text DEFAULT NULL::text, p_huong text DEFAULT 'asc'::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_co_anh boolean DEFAULT NULL::boolean, p_quy_chuan text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, updated_at timestamp with time zone, tong_so_dong bigint, loai_hang text, hang_xe text, dong_xe text, linh_kien text, ghi_chu text, truong_chon_tay text[], xe_dung_chung jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
  -- 0128: không có quyền Xem tồn thì lọc / sắp theo tồn cũng không được — nếu không
  -- vẫn suy ra được còn hay hết hàng từ việc mã có nằm trong kết quả lọc.
  v_loc_ton text := case when v_xem_ton then p_trang_thai_ton end;
  v_sap_xep text := case when p_sap_xep = 'tong_ton' and not v_xem_ton then 'ma_hang' else p_sap_xep end;
  v_tk text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 5000);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  return query
  with ton as (
    select tk.san_pham_id, sum(tk.so_luong) as so_luong
    from public.ton_kho tk
    where v_vai_tro <> 'thu_kho' or tk.kho_id = any(v_kho)
    group by tk.san_pham_id
  ), loc as (
    select sp.*,
           nh.ten as ten_nhom, dv.ten as ten_dv,
           cd.ma as ma_cd, cd.ten as ten_cd, cd.mau_hien_thi,
           coalesce(ton.so_luong, 0) as tong,
           public.la_can_ra(cd.ma, nh.ten, sp.ma_hang, sp.can_ra_dvt, sp.da_xac_nhan_ra) as cr
    from public.san_pham sp
    left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
    left join public.don_vi_tinh dv on dv.id = sp.dvt_id
    left join public.cong_doan cd on cd.id = sp.cong_doan_id
    left join ton on ton.san_pham_id = sp.id
    where (v_tk is null
           or public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,''))
                ilike '%' || public.f_unaccent(v_tk) || '%'
           or public.f_unaccent(v_tk) operator(extensions.<%)
                public.f_unaccent(coalesce(sp.ma_hang,'') || ' ' || coalesce(sp.ten_hang,'')))
      and (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
      and (p_cong_doan_id is null or sp.cong_doan_id = p_cong_doan_id)
      and (p_dvt_id is null or sp.dvt_id = p_dvt_id)
      and (p_dang_kinh_doanh is null or sp.dang_kinh_doanh = p_dang_kinh_doanh)
      and (p_co_anh is null
           or p_co_anh = exists (select 1 from public.hinh_anh h
                                 where h.san_pham_id = sp.id and h.xoa_luc is null))
  )
  select l.id, l.ma_hang, l.ten_hang, l.nhom_hang_id, l.ten_nhom, l.dvt_id, l.ten_dv,
         l.cong_doan_id, l.ma_cd, l.ten_cd, l.mau_hien_thi, l.quy_doi, l.gia_ban,
         case when v_xem_gv then l.gia_von end,
         l.ton_toi_thieu, l.ton_toi_da, l.kho_mac_dinh_id, l.dang_kinh_doanh,
         case when v_xem_ton then l.tong end, l.cr, l.can_ra_dvt, l.updated_at,
         count(*) over (),
         l.loai_hang, l.hang_xe, l.dong_xe, l.linh_kien, l.ghi_chu, l.truong_chon_tay,
         l.xe_dung_chung
  from loc l
  where (p_can_ra is null or l.cr = p_can_ra)
    -- 0087: lọc quy chuẩn — ghi_chu do trigger 0086 tự sinh, null = đủ.
    and (p_quy_chuan is null
         or (p_quy_chuan = 'du'       and l.ghi_chu is null)
         or (p_quy_chuan = 'thieu'    and l.ghi_chu is not null)
         or (p_quy_chuan = 'chon_tay' and cardinality(l.truong_chon_tay) > 0))
    and (v_loc_ton is null
         or (v_loc_ton = 'con_hang'     and l.tong > 0)
         or (v_loc_ton = 'het_hang'     and l.tong = 0)
         or (v_loc_ton = 'am'           and l.tong < 0)
         -- Chưa đặt định mức (0) thì không bao giờ "dưới định mức", kể cả tồn âm
         -- (0067, UAT 05 bài 7).
         or (v_loc_ton = 'duoi_dinh_muc'
             and l.ton_toi_thieu > 0 and l.tong < l.ton_toi_thieu))
  order by
    -- 0126: mã khớp đúng → bắt đầu bằng từ khóa → chứa từ khóa → còn lại (bẫy 15).
    case when v_sap_xep is null and v_tk is not null then
      case when upper(public.f_unaccent(l.ma_hang)) = upper(public.f_unaccent(v_tk)) then 0
           when starts_with(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) then 1
           when strpos(upper(public.f_unaccent(l.ma_hang)), upper(public.f_unaccent(v_tk))) > 0 then 2
           else 3 end end asc,
    case when v_sap_xep is null and v_tk is not null then l.lan_phat_sinh_cuoi end desc nulls last,
    case when v_sap_xep is null and v_tk is not null then
      extensions.word_similarity(public.f_unaccent(v_tk),
        public.f_unaccent(coalesce(l.ma_hang,'') || ' ' || coalesce(l.ten_hang,''))) end desc,
    case when v_sap_xep = 'ten_hang'   and p_huong = 'asc'  then l.ten_hang end asc,
    case when v_sap_xep = 'ten_hang'   and p_huong = 'desc' then l.ten_hang end desc,
    case when v_sap_xep = 'tong_ton'   and p_huong = 'asc'  then l.tong end asc,
    case when v_sap_xep = 'tong_ton'   and p_huong = 'desc' then l.tong end desc,
    case when v_sap_xep = 'updated_at' and p_huong = 'asc'  then l.updated_at end asc,
    case when v_sap_xep = 'updated_at' and p_huong = 'desc' then l.updated_at end desc,
    case when v_sap_xep = 'ma_hang'    and p_huong = 'desc' then l.ma_hang end desc,
    l.ma_hang asc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$;

-- --- 16. chi_tiet_san_pham: trống tổng tồn khi không có quyền ----------------
create or replace function public.chi_tiet_san_pham(p_id uuid)
 RETURNS TABLE(id uuid, ma_hang text, ten_hang text, nhom_hang_id uuid, ten_nhom_hang text, dvt_id uuid, ten_dvt text, cong_doan_id uuid, ma_cong_doan text, ten_cong_doan text, mau_cong_doan text, quy_doi numeric, gia_ban numeric, gia_von numeric, ton_toi_thieu numeric, ton_toi_da numeric, kho_mac_dinh_id uuid, ten_kho_mac_dinh text, dang_kinh_doanh boolean, tong_ton numeric, can_ra boolean, can_ra_dvt boolean, barcode text, hinh_anh_url text, vi_tri_ke text, ghi_chu text, created_at timestamp with time zone, updated_at timestamp with time zone, duoc_ban_truc_tiep boolean, loai_hang text, hang_xe text, ten_hang_xe text, dong_xe text, ten_dong_xe text, linh_kien text, ten_linh_kien text, ma_xu_ly text, mo_ta text, truong_chon_tay text[], xe_dung_chung jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
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
         case when v_xem_ton then coalesce(ton.so_luong, 0) end,
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
         sp.mo_ta,
         sp.truong_chon_tay,
         sp.xe_dung_chung
  from public.san_pham sp
  left join public.nhom_hang nh on nh.id = sp.nhom_hang_id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.cong_doan cd on cd.id = sp.cong_doan_id
  left join public.kho k on k.id = sp.kho_mac_dinh_id
  left join ton on ton.san_pham_id = sp.id
  where sp.id = p_id;
end;
$function$;

-- --- 17. dong_chung_tu: trống tồn hiện tại của dòng khi không có quyền -------
create or replace function public.dong_chung_tu(p_id uuid)
 RETURNS TABLE(id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text, so_luong numeric, don_gia numeric, thanh_tien numeric, kho_id uuid, ten_kho text, ghi_chu text, ton_hien_tai numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
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
         case when not v_xem_ton then null
              when sp.loai_hang = 'COMBO' then
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

-- --- 18. goi_y_ma_trung: không gợi ý khi không có quyền Xem tồn --------------
create or replace function public.goi_y_ma_trung(
  p_san_pham_id uuid,
  p_kho_id uuid,
  p_gioi_han int default 5
)
returns table (
  san_pham_id uuid, ma_hang text, ten_hang text, kho_id uuid, ten_kho text,
  ton numeric, do_giong real
)
language sql
stable
security definer
set search_path = ''
as $$
  with nguon as (
    select public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang) as chuoi
    from public.san_pham sp
    where sp.id = p_san_pham_id
  )
  select sp.id, sp.ma_hang, sp.ten_hang, tk.kho_id, k.ten, tk.so_luong,
         extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang))
  from public.san_pham sp
  join public.ton_kho tk on tk.san_pham_id = sp.id
  left join public.kho k on k.id = tk.kho_id
  cross join nguon
  where sp.id <> p_san_pham_id
    -- 0128: gợi ý dựa trên mã còn tồn — không có quyền Xem tồn thì không gợi ý.
    and public.co_quyen('xem_ton_kho')
    and sp.dang_kinh_doanh
    -- Chỉ trả mã đang còn tồn — gợi ý mã hết tồn không giúp giải quyết xuất âm.
    and tk.so_luong > 0
    and (p_kho_id is null or tk.kho_id = p_kho_id)
    and nguon.chuoi operator(extensions.<%) public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)
  order by
    extensions.word_similarity(nguon.chuoi, public.f_unaccent(sp.ma_hang || ' ' || sp.ten_hang)) desc,
    tk.so_luong desc
  limit greatest(coalesce(p_gioi_han, 5), 1);
$$;

-- --- 19. bang_dem_kiem_ke: trống tồn sổ / lệch / tồn hiện tại khi không có quyền ---
create or replace function public.bang_dem_kiem_ke(
  p_chung_tu_id uuid,
  p_nhom_hang_id uuid default null
)
returns table (
  san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  nhom_hang_id uuid, ten_nhom text, dong_id uuid, so_dem numeric,
  ton_so numeric, lech numeric, ton_hien_tai numeric, ton_kiotviet numeric,
  dem_luc timestamptz, nguoi_dem text, dem_lai boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
  v_ct public.chung_tu;
  v_xem_ton boolean := (select public.co_quyen('xem_ton_kho'));
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  select * into v_ct from public.chung_tu where id = p_chung_tu_id;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  -- chi_xem được đọc (chỉ xem, không sửa gì ở đây) — chỉ chặn thủ kho ngoài kho.
  if v_vai = 'thu_kho' and not (v_ct.kho_id = any(v_kho)) then
    raise exception 'Thủ kho chỉ xem được bảng đếm phiên của kho mình' using errcode = '42501';
  end if;

  return query
  with pham_vi as (
    select pv0.san_pham_id as id from public._pham_vi_kiem_ke(p_chung_tu_id) pv0
    union
    select cd0.san_pham_id as id from public.chung_tu_dong cd0 where cd0.chung_tu_id = p_chung_tu_id
  )
  select
    sp.id,
    sp.ma_hang,
    sp.ten_hang,
    dv.ten,
    sp.nhom_hang_id,
    nh.ten,
    cd.id,
    cd.so_luong,
    case when v_xem_ton then cd.so_luong_he_thong end,
    case when v_xem_ton then cd.so_luong - cd.so_luong_he_thong end,
    case when v_xem_ton then coalesce(tk.so_luong, 0) end,
    case when v_xem_ton then (
      select sum(d.so_luong)
      from public.chung_tu_dong d
      join public.chung_tu c on c.id = d.chung_tu_id
      where c.loai_ct = 'DIEU_CHINH' and c.trang_thai = 'HOAN_THANH'
        and c.ghi_chu like '[NAP_TON_TAM]%'
        and coalesce(d.kho_id, c.kho_id) = v_ct.kho_id
        and d.san_pham_id = sp.id
    ) end,
    cd.dem_luc,
    nd.ho_ten,
    coalesce(cd.dem_lai, false)
  from pham_vi pv
  join public.san_pham sp        on sp.id = pv.id
  left join public.don_vi_tinh dv on dv.id = sp.dvt_id
  left join public.nhom_hang nh   on nh.id = sp.nhom_hang_id
  left join public.chung_tu_dong cd on cd.chung_tu_id = p_chung_tu_id and cd.san_pham_id = sp.id
  left join public.nguoi_dung nd  on nd.id = cd.nguoi_dem_id
  left join public.ton_kho tk     on tk.kho_id = v_ct.kho_id and tk.san_pham_id = sp.id
  where (p_nhom_hang_id is null or sp.nhom_hang_id = p_nhom_hang_id)
  order by sp.ma_hang;
end;
$$;

-- --- 20. tong_quan_chi_so: trống mọi chỉ số tồn khi không có quyền -----------
CREATE OR REPLACE FUNCTION public.tong_quan_chi_so(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(xem_gia_von boolean, gia_tri_ton numeric, gia_tri_ton_thang_truoc numeric, tong_sl_ton numeric, tong_sl_ton_thang_truoc numeric, xu_huong_ton numeric[], ma_kinh_doanh bigint, ma_moi_thang bigint, xu_huong_ma_kd bigint[], phieu_xuat_tb_ngay numeric, cho_ghi_so bigint, cho_ghi_so_nhap bigint, cho_ghi_so_xuat bigint, cho_ghi_so_cu_nhat_ngay integer, xu_huong_cho_ghi_so bigint[], ton_am_theo_kho jsonb, vi_du_duoi_dinh_muc text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_xem boolean;
  v_gt numeric;
  v_sl numeric;
  v_t_truoc date := date_trunc('month', p_ngay)::date - 1;
  v_sl_truoc numeric;
  v_gt_truoc numeric;
  v_xu_huong numeric[];
  v_ma_kd bigint;
  v_ma_moi bigint;
  v_xh_ma bigint[];
  v_tb numeric;
  v_cho bigint;
  v_cho_nhap bigint;
  v_cho_xuat bigint;
  v_cho_cu integer;
  v_xh_cho bigint[];
  v_am jsonb;
  v_vd text[];
  v_xem_ton boolean := public.co_quyen('xem_ton_kho');
begin
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;

  v_xem := public.co_quyen_xem_gia_von();

  select coalesce(sum(greatest(d.tong, 0)), 0),
         coalesce(sum(greatest(d.tong, 0) * sp.gia_von), 0)
    into v_sl, v_gt
  from (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
        from public.ton_kho tk group by tk.san_pham_id) d
  join public.san_pham sp on sp.id = d.d_sp;

  -- Chuỗi lùi (D-09): ƯỚC TÍNH theo giá vốn HIỆN TẠI — giá trị cuối ngày T =
  -- hiện tại trừ mọi biến động có ngày > T. Không phải giá trị lịch sử thật.
  select coalesce(sum(m.so_luong), 0), coalesce(sum(m.so_luong * sp.gia_von), 0)
    into v_sl_truoc, v_gt_truoc
  from public.kho_movement m
  join public.san_pham sp on sp.id = m.san_pham_id
  where m.ngay >= ((v_t_truoc + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh');
  v_sl_truoc := v_sl - v_sl_truoc;
  v_gt_truoc := v_gt - v_gt_truoc;

  select array_agg(
           case when v_xem then v_gt - coalesce(b.gt, 0) else v_sl - coalesce(b.sl, 0) end
           order by s.t)
    into v_xu_huong
  from generate_series(p_ngay - 29, p_ngay, interval '1 day') as s(t)
  left join lateral (
    select sum(m.so_luong) as sl, sum(m.so_luong * sp.gia_von) as gt
    from public.kho_movement m
    join public.san_pham sp on sp.id = m.san_pham_id
    where m.ngay >= ((p_ngay - 28)::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and m.ngay >= ((s.t::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
  ) b on true;

  select count(*) into v_ma_kd from public.san_pham sp where sp.dang_kinh_doanh;
  select count(*) into v_ma_moi
  from public.san_pham sp
  where sp.dang_kinh_doanh
    and (sp.created_at at time zone 'Asia/Ho_Chi_Minh')::date between date_trunc('month', p_ngay)::date and p_ngay;

  -- Xấp xỉ: mã đang KD tại thời điểm xem mà đã được tạo từ ngày T trở về trước.
  select array_agg((select count(*) from public.san_pham sp
                    where sp.dang_kinh_doanh
                      and (sp.created_at at time zone 'Asia/Ho_Chi_Minh')::date <= s.t::date) order by s.t)
    into v_xh_ma
  from generate_series(p_ngay - 29, p_ngay, interval '1 day') as s(t);

  select round(count(*)::numeric / 30, 1) into v_tb
  from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
    and ct.ngay_ct between p_ngay - 30 and p_ngay - 1;

  select count(*),
         count(*) filter (where ct.loai_ct = 'NHAP'),
         count(*) filter (where ct.loai_ct = 'XUAT'),
         p_ngay - min((ct.created_at at time zone 'Asia/Ho_Chi_Minh')::date)
    into v_cho, v_cho_nhap, v_cho_xuat, v_cho_cu
  from public.chung_tu ct
  where ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH') and ct.trang_thai = 'NHAP_LIEU';

  select array_agg((select count(*) from public.chung_tu ct
                    where ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH')
                      and ct.created_at >= (s.t::date::timestamp at time zone 'Asia/Ho_Chi_Minh')
                      and ct.created_at < ((s.t::date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')) order by s.t)
    into v_xh_cho
  from generate_series(p_ngay - 13, p_ngay, interval '1 day') as s(t);

  select coalesce(jsonb_agg(jsonb_build_object('ten_kho', x.ten, 'so_ma', x.n) order by x.ten), '[]'::jsonb)
    into v_am
  from (
    select k.ten, count(*) as n
    from public.ton_kho tk
    join public.kho k on k.id = tk.kho_id
    join public.san_pham sp on sp.id = tk.san_pham_id
    where sp.dang_kinh_doanh and tk.so_luong < 0
    group by k.id, k.ten
  ) x;

  select coalesce(array_agg(y.ma_hang order by y.ma_hang), '{}'::text[])
    into v_vd
  from (
    select sp.ma_hang
    from public.san_pham sp
    left join (select tk.san_pham_id as d_sp, sum(tk.so_luong) as tong
               from public.ton_kho tk group by tk.san_pham_id) d on d.d_sp = sp.id
    where sp.dang_kinh_doanh
      and sp.ton_toi_thieu > 0 and coalesce(d.tong, 0) < sp.ton_toi_thieu
    order by sp.ma_hang
    limit 2
  ) y;

  return query
  select v_xem,
         case when v_xem and v_xem_ton then v_gt end,
         case when v_xem and v_xem_ton then v_gt_truoc end,
         case when v_xem_ton then v_sl end,
         case when v_xem_ton then v_sl_truoc end,
         case when v_xem_ton then v_xu_huong end,
         v_ma_kd, v_ma_moi, v_xh_ma, v_tb,
         v_cho, v_cho_nhap, v_cho_xuat, v_cho_cu, v_xh_cho,
         case when v_xem_ton then v_am else '[]'::jsonb end,
         case when v_xem_ton then v_vd else '{}'::text[] end;
end;
$function$;
