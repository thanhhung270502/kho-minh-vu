-- =============================================================================
-- 0083 — Chặn 9 quyền nghiệp vụ bằng co_quyen() (Phase 16, QUYEN-03)
--
-- Thay phần kiểm vai trò ở RPC/policy của 9 nghiệp vụ bằng co_quyen(<quyền>)
-- (0082). Bốn chức vụ mặc định giữ đúng quyền cũ nên hành vi không đổi; khác
-- biệt là quản lý bật/tắt được và có hiệu lực ngay.
--
--   xem_dashboard  nhip_ban, ton_theo_nhom, bao_cao_xuat_am
--   nhap_kho       chung_tu/chung_tu_dong loại NHAP (policy), ghi_so_chung_tu
--   tao_don        don_dat_hang/_dong (policy), sinh_so_dh
--   xac_nhan_don   xac_nhan_don, mo_khoa_don, dong_don_som
--   hoan_thanh_don hoan_thanh_duoc_don() (dùng trong hoan_thanh_don, chi_tiet_don)
--   sua_hoa_don    huy_chung_tu với hóa đơn (XUAT) đã ghi sổ
--   tao_ma_hang    san_pham + 5 danh mục phụ (policy), nhap_danh_muc,
--                  nhap_ma_hang_moi, gan_hang_loat, ap_dung_goi_y_cong_doan,
--                  xac_nhan_da_ra, ghi_de_nghi_gop_ma, them/dat_anh_chinh/xoa_anh
--   tao_nhan_vien  nhan_vien_phu_trach (policy)
--   kiem_kho       mo_phien_kiem_ke, luu_dong_kiem_ke, xoa_dong_kiem_ke,
--                  nhap_so_dem_kiem_ke (thủ kho vẫn chỉ kho của mình)
--
-- Thân hàm lấy NGUYÊN VĂN từ pg_get_functiondef của bản đang chạy, chỉ thay
-- dòng kiểm quyền — không chép tay từ migration cũ để khỏi lệch bản mới nhất.
-- Kèm vá: ghi_so_chung_tu / huy_chung_tu không còn cho NULL (tài khoản bị khóa,
-- token lệch bảng) lọt qua phép so sánh "= 'chi_xem'" / "<> 'quan_ly'".
--
-- Giữ nguyên theo phạm vi (vai_tro): đối tác, người dùng, kho, số chứng từ,
-- giá vốn, giá bán, hủy đơn, phiếu trả, định mức, nạp tồn tạm.
-- =============================================================================

-- --- Phiếu nhập: helper cho policy dòng chứng từ ----------------------------
create or replace function public.la_phieu_nhap(p_chung_tu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.chung_tu where id = p_chung_tu_id and loai_ct = 'NHAP');
$$;
revoke all    on function public.la_phieu_nhap(uuid) from public, anon;
grant execute on function public.la_phieu_nhap(uuid) to authenticated;

-- --- chung_tu / chung_tu_dong: loại NHAP cần quyền Nhập đơn hàng ------------
drop policy "tao chung tu tru chi xem" on public.chung_tu;
create policy "tao chung tu tru chi xem" on public.chung_tu
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem' and loai_ct <> 'KIEM_KE'
    and (loai_ct <> 'NHAP' or (select public.co_quyen('nhap_kho')))
  );

drop policy "chi sua chung tu dang nhap lieu" on public.chung_tu;
create policy "chi sua chung tu dang nhap lieu" on public.chung_tu
  for update to authenticated
  using (
    trang_thai = 'NHAP_LIEU' and (select public.vai_tro_hien_tai()) <> 'chi_xem' and loai_ct <> 'KIEM_KE'
    and (loai_ct <> 'NHAP' or (select public.co_quyen('nhap_kho')))
  )
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and (loai_ct <> 'NHAP' or (select public.co_quyen('nhap_kho')))
  );

drop policy "tao dong chung tu tru chi xem" on public.chung_tu_dong;
create policy "tao dong chung tu tru chi xem" on public.chung_tu_dong
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem' and not public.la_chung_tu_kiem_ke(chung_tu_id)
    and (not public.la_phieu_nhap(chung_tu_id) or (select public.co_quyen('nhap_kho')))
  );

drop policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong
  for update to authenticated
  using (
    exists (select 1 from public.chung_tu ct where ct.id = chung_tu_dong.chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem' and not public.la_chung_tu_kiem_ke(chung_tu_id)
    and (not public.la_phieu_nhap(chung_tu_id) or (select public.co_quyen('nhap_kho')))
  )
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and (not public.la_phieu_nhap(chung_tu_id) or (select public.co_quyen('nhap_kho')))
  );

drop policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong
  for delete to authenticated
  using (
    exists (select 1 from public.chung_tu ct where ct.id = chung_tu_dong.chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem' and not public.la_chung_tu_kiem_ke(chung_tu_id)
    and (not public.la_phieu_nhap(chung_tu_id) or (select public.co_quyen('nhap_kho')))
  );

-- --- don_dat_hang / _dong: Tạo đơn đặt hàng ---------------------------------
drop policy "tao don dat hang" on public.don_dat_hang;
create policy "tao don dat hang" on public.don_dat_hang
  for insert to authenticated with check ((select public.co_quyen('tao_don')));

drop policy "sua don dat hang" on public.don_dat_hang;
create policy "sua don dat hang" on public.don_dat_hang
  for update to authenticated
  using (trang_thai = 'TAM' and (select public.co_quyen('tao_don')))
  with check ((select public.co_quyen('tao_don')));

drop policy "tao dong don dat hang" on public.don_dat_hang_dong;
create policy "tao dong don dat hang" on public.don_dat_hang_dong
  for insert to authenticated
  with check (
    (select public.co_quyen('tao_don'))
    and exists (select 1 from public.don_dat_hang d where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM')
  );

drop policy "sua dong don dat hang" on public.don_dat_hang_dong;
create policy "sua dong don dat hang" on public.don_dat_hang_dong
  for update to authenticated
  using (
    (select public.co_quyen('tao_don'))
    and exists (select 1 from public.don_dat_hang d where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM')
  )
  with check ((select public.co_quyen('tao_don')));

drop policy "xoa dong don dat hang khi tam" on public.don_dat_hang_dong;
create policy "xoa dong don dat hang khi tam" on public.don_dat_hang_dong
  for delete to authenticated
  using (
    (select public.co_quyen('tao_don'))
    and exists (select 1 from public.don_dat_hang d where d.id = don_dat_hang_dong.don_dat_hang_id and d.trang_thai = 'TAM')
  );

-- --- san_pham + danh mục phụ: Tạo mã hàng -----------------------------------
-- Danh mục phụ đi cùng quyền Tạo mã hàng vì form mã hàng "+ Thêm mới" tại chỗ.
drop policy "them san pham" on public.san_pham;
create policy "them san pham" on public.san_pham
  for insert to authenticated with check ((select public.co_quyen('tao_ma_hang')));
drop policy "sua san pham" on public.san_pham;
create policy "sua san pham" on public.san_pham
  for update to authenticated
  using ((select public.co_quyen('tao_ma_hang'))) with check ((select public.co_quyen('tao_ma_hang')));

do $$
declare
  v_bang text;
  v_ten text;
begin
  for v_bang, v_ten in values
    ('nhom_hang', 'nhom hang'), ('don_vi_tinh', 'don vi tinh'), ('cong_doan', 'cong doan'),
    ('loai_hang', 'loai hang'), ('dong_xe', 'dong xe')
  loop
    execute format('drop policy %I on public.%I', 'them ' || v_ten, v_bang);
    execute format('drop policy %I on public.%I', 'sua ' || v_ten, v_bang);
    execute format('drop policy %I on public.%I', 'xoa ' || v_ten, v_bang);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check ((select public.co_quyen('tao_ma_hang')))$p$, 'them ' || v_ten, v_bang);
    execute format($p$create policy %I on public.%I for update to authenticated
      using ((select public.co_quyen('tao_ma_hang'))) with check ((select public.co_quyen('tao_ma_hang')))$p$,
      'sua ' || v_ten, v_bang);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using ((select public.co_quyen('tao_ma_hang')))$p$, 'xoa ' || v_ten, v_bang);
  end loop;
end $$;

-- --- nhan_vien_phu_trach: Tạo nhân viên -------------------------------------
drop policy "them nhan vien phu trach" on public.nhan_vien_phu_trach;
create policy "them nhan vien phu trach" on public.nhan_vien_phu_trach
  for insert to authenticated with check ((select public.co_quyen('tao_nhan_vien')));
drop policy "sua nhan vien phu trach" on public.nhan_vien_phu_trach;
create policy "sua nhan vien phu trach" on public.nhan_vien_phu_trach
  for update to authenticated
  using ((select public.co_quyen('tao_nhan_vien'))) with check ((select public.co_quyen('tao_nhan_vien')));

-- --- Hàm: thay dòng kiểm quyền ----------------------------------------------
-- bao_cao_xuat_am
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

-- nhip_ban
CREATE OR REPLACE FUNCTION public.nhip_ban(p_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS TABLE(ngay date, so_phieu bigint, so_dong bigint, so_ma bigint)
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

  return query
  select v.ngay, v.so_phieu, v.so_dong, v.so_ma
  from (
    with khung as (
      -- Tên cột khác tên biến OUT (d_ngay, không phải ngay) — tránh 42702 lúc
      -- GỌI hàm khi SELECT cuối chiếu ra cột trùng tên OUT parameter (bài học
      -- 0059 -> hotfix 0062).
      select p_ngay as d_ngay
      union all
      select p_ngay - 1
    ),
    dem as (
      -- Chỉ tính XUAT đã ghi sổ, trừ phiếu đã hủy (D-10). Không đọc
      -- don_dat_hang -- đơn chưa xuất không tính.
      select
        ct.ngay_ct                       as d_ngay,
        count(distinct ct.id)            as so_phieu,
        count(cd.id)                     as so_dong,
        count(distinct cd.san_pham_id)   as so_ma
      from public.chung_tu ct
      join public.chung_tu_dong cd on cd.chung_tu_id = ct.id
      where ct.loai_ct = 'XUAT'
        and ct.trang_thai = 'HOAN_THANH'
        and ct.ngay_ct in (p_ngay, p_ngay - 1)
      group by ct.ngay_ct
    )
    select
      k.d_ngay                        as ngay,
      coalesce(d.so_phieu, 0)         as so_phieu,
      coalesce(d.so_dong, 0)          as so_dong,
      coalesce(d.so_ma, 0)            as so_ma
    from khung k
    left join dem d on d.d_ngay = k.d_ngay
  ) v
  -- Hôm nay (p_ngay) trước, hôm qua sau.
  order by v.ngay desc;
end;
$function$;

-- ton_theo_nhom
CREATE OR REPLACE FUNCTION public.ton_theo_nhom(p_theo text, p_kho_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(nhom_id uuid, ten_nhom text, tong_ma bigint, con_hang bigint, het_hang bigint, am bigint, duoi_dinh_muc bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- SECURITY DEFINER bỏ qua RLS/quyền cột nên phải tự kiểm vai trò TƯỜNG MINH
  -- tại đây (D-12 — trang tổng quan chỉ dành cho quản lý).
  if not public.co_quyen('xem_dashboard') then
    raise exception 'Chức vụ của bạn chưa có quyền Xem dashboard' using errcode = '42501';
  end if;

  if p_theo is null or p_theo not in ('nhom', 'cong_doan') then
    raise exception 'Tham số p_theo chỉ nhận nhom hoặc cong_doan' using errcode = '22023';
  end if;

  return query
  select v.nhom_id, v.ten_nhom, v.tong_ma, v.con_hang, v.het_hang, v.am, v.duoi_dinh_muc
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
      -- D-17: cố định true, khớp mặc định p_dang_kinh_doanh của /ton-kho —
      -- trang tổng quan chỉ cần bức tranh "đang bán", không có tham số kinh
      -- doanh ở RPC này.
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
      -- Chép nguyên văn điều kiện dưới định mức từ danh_sach_ton_kho (0067).
      count(*) filter (where g.ton_toi_thieu > 0 and g.tong < g.ton_toi_thieu) as duoi_dinh_muc
    from gan g
    left join public.nhom_hang nh on p_theo = 'nhom'      and nh.id = g.nhom_id
    left join public.cong_doan cd on p_theo = 'cong_doan' and cd.id = g.nhom_id
    group by g.nhom_id, nh.ten, cd.ten
  ) v
  -- Tên OUT parameter (ten_nhom, nhom_id, ...) trùng tên cột nên bắt buộc gắn
  -- tiền tố bảng ở SELECT/ORDER BY cuối, nếu không sẽ lỗi 42702 lúc GỌI hàm
  -- (bài học 0059 → hotfix 0062).
  order by v.ten_nhom asc nulls last;
end;
$function$;

-- sinh_so_dh
CREATE OR REPLACE FUNCTION public.sinh_so_dh(p_nam smallint DEFAULT NULL::smallint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_so integer;
  v_nam smallint := coalesce(p_nam, extract(year from current_date)::smallint);
begin
  if not public.co_quyen('tao_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
  end if;

  -- MỘT câu lệnh duy nhất: vừa tạo dòng đếm nếu chưa có, vừa tăng nếu đã có,
  -- vừa trả giá trị mới. Không có khoảng hở đọc-rồi-ghi.
  insert into public.chuoi_so_dh (nam, so_hien_tai)
  values (v_nam, 1)
  on conflict (nam)
  do update set so_hien_tai = public.chuoi_so_dh.so_hien_tai + 1
  returning so_hien_tai into v_so;

  -- Dạng DH{YY}-{6 chữ số}, cùng hình dạng số chứng từ hiện có (PN26-000001...).
  return format('DH%s-%s', to_char(v_nam % 100, 'FM00'), lpad(v_so::text, 6, '0'));
end;
$function$;

-- xac_nhan_don
CREATE OR REPLACE FUNCTION public.xac_nhan_don(p_id uuid)
 RETURNS don_dat_hang
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('xac_nhan_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'TAM' then
    raise exception 'Đơn % đang ở trạng thái %, không xác nhận lại được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_XAC_NHAN'
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

-- mo_khoa_don
CREATE OR REPLACE FUNCTION public.mo_khoa_don(p_id uuid, p_ly_do text)
 RETURNS don_dat_hang
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('xac_nhan_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Xác nhận đơn' using errcode = '42501';
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
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[mở khóa] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

-- dong_don_som
CREATE OR REPLACE FUNCTION public.dong_don_som(p_id uuid, p_ly_do text)
 RETURNS don_dat_hang
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_don public.don_dat_hang;
begin
  if not public.co_quyen('xac_nhan_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Xác nhận đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai != 'DA_XAC_NHAN' then
    raise exception 'Đơn % đang ở trạng thái %, không đóng sớm được', v_don.so_dh, v_don.trang_thai
      using errcode = '23514';
  end if;
  if length(trim(coalesce(p_ly_do, ''))) < 5 then
    raise exception 'Phải nhập lý do đóng sớm tối thiểu 5 ký tự' using errcode = '23514';
  end if;

  -- D-05: đóng bất kể so_luong_da_xuat còn thiếu bao nhiêu — khách không lấy
  -- nốt phần còn lại, tránh đơn treo vĩnh viễn.
  update public.don_dat_hang
  set trang_thai = 'HOAN_THANH',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[đóng sớm] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$function$;

-- hoan_thanh_duoc_don
CREATE OR REPLACE FUNCTION public.hoan_thanh_duoc_don()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select public.co_quyen('hoan_thanh_don');
$function$;

-- ap_dung_goi_y_cong_doan
CREATE OR REPLACE FUNCTION public.ap_dung_goi_y_cong_doan(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so int;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  perform set_config('app.nguon_sua', 'goi_y_duoi', true);
  update public.san_pham sp
  set cong_doan_id = cd2.id
  from public.cong_doan cd, public.cong_doan cd2
  where sp.id = any(p_ids) and cd.id = sp.cong_doan_id and cd.ma = 'MUA_NGOAI'
    and cd2.ma = public.cong_doan_theo_duoi(sp.ma_hang);
  get diagnostics v_so = row_count;
  return v_so;
end $function$;

-- gan_hang_loat
CREATE OR REPLACE FUNCTION public.gan_hang_loat(p_ids uuid[], p_thay_doi jsonb, p_nguon text DEFAULT 'hang_loat'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so int; k text;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;
  if p_nguon not in ('hang_loat', 'sua_o') then
    raise exception 'Nguồn sửa không hợp lệ: %', p_nguon using errcode = '23514';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Tối đa 1000 mã mỗi lần' using errcode = '23514';
  end if;
  for k in select jsonb_object_keys(p_thay_doi) loop
    if k not in ('nhom_hang_id','dvt_id','cong_doan_id','dang_kinh_doanh') then
      raise exception 'Không gán hàng loạt được trường %', k using errcode = '23514';
    end if;
  end loop;
  perform set_config('app.nguon_sua', p_nguon, true);
  update public.san_pham set
    nhom_hang_id    = case when p_thay_doi ? 'nhom_hang_id'    then nullif(p_thay_doi->>'nhom_hang_id','')::uuid else nhom_hang_id end,
    dvt_id          = case when p_thay_doi ? 'dvt_id'          then (p_thay_doi->>'dvt_id')::uuid else dvt_id end,
    cong_doan_id    = case when p_thay_doi ? 'cong_doan_id'    then (p_thay_doi->>'cong_doan_id')::uuid else cong_doan_id end,
    dang_kinh_doanh = case when p_thay_doi ? 'dang_kinh_doanh' then (p_thay_doi->>'dang_kinh_doanh')::boolean else dang_kinh_doanh end
  where id = any(p_ids);
  get diagnostics v_so = row_count;
  return v_so;
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
$function$;

-- xac_nhan_da_ra
CREATE OR REPLACE FUNCTION public.xac_nhan_da_ra(p_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_so integer;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng'
      using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 1000 then
    raise exception 'Mỗi lần xác nhận tối đa 1.000 mã, hãy chia nhỏ lựa chọn'
      using errcode = '23514';
  end if;

  perform set_config('app.nguon_sua', 'hang_loat', true);
  update public.san_pham
  set da_xac_nhan_ra = true, can_ra_dvt = false
  where id = any(p_ids);
  get diagnostics v_so = row_count;
  return v_so;
end;
$function$;

-- ghi_de_nghi_gop_ma
CREATE OR REPLACE FUNCTION public.ghi_de_nghi_gop_ma(p_san_pham_id_a uuid, p_san_pham_id_b uuid, p_chung_tu_id uuid DEFAULT NULL::uuid, p_ghi_chu text DEFAULT NULL::text)
 RETURNS de_nghi_gop_ma
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.de_nghi_gop_ma;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  if p_san_pham_id_a = p_san_pham_id_b then
    raise exception 'Không thể đề nghị gộp một mã với chính nó' using errcode = '23514';
  end if;

  insert into public.de_nghi_gop_ma (san_pham_id_a, san_pham_id_b, nguoi_de_nghi_id, chung_tu_id, ghi_chu)
  values (p_san_pham_id_a, p_san_pham_id_b, auth.uid(), p_chung_tu_id, p_ghi_chu)
  on conflict (least(san_pham_id_a, san_pham_id_b), greatest(san_pham_id_a, san_pham_id_b))
    where trang_thai = 'CHO_XU_LY'
  do nothing
  returning * into v_row;

  -- Bấm lại lần hai: không có dòng mới, đọc lại đề nghị đang chờ và trả về.
  if v_row.id is null then
    select * into v_row
    from public.de_nghi_gop_ma
    where least(san_pham_id_a, san_pham_id_b) = least(p_san_pham_id_a, p_san_pham_id_b)
      and greatest(san_pham_id_a, san_pham_id_b) = greatest(p_san_pham_id_a, p_san_pham_id_b)
      and trang_thai = 'CHO_XU_LY';
  end if;

  return v_row;
end;
$function$;

-- nhap_danh_muc
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

-- them_anh
CREATE OR REPLACE FUNCTION public.them_anh(p_id uuid, p_san_pham_id uuid, p_noi_luu text, p_khoa_luu text, p_khoa_luu_thumb text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  return public._chen_anh(p_id, p_san_pham_id, p_noi_luu, p_khoa_luu, p_khoa_luu_thumb, null, (select auth.uid()));
end;
$function$;

-- dat_anh_chinh
CREATE OR REPLACE FUNCTION public.dat_anh_chinh(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_sp uuid;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  select h.san_pham_id into v_sp from public.hinh_anh h where h.id = p_id and h.xoa_luc is null;
  if v_sp is null then
    raise exception 'Ảnh không tồn tại hoặc đã bị xóa' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('hinh_anh:' || v_sp::text, 0));

  -- HAI câu UPDATE tách rời, theo đúng thứ tự này. Unique index của la_anh_chinh
  -- KHÔNG deferrable và Postgres kiểm ràng buộc theo TỪNG DÒNG được ghi, nên gộp
  -- thành một câu `set la_anh_chinh = (id = p_id)` sẽ vỡ 23505 tùy thứ tự quét
  -- dòng của planner (nếu dòng mới thành true được ghi trước khi dòng cũ thành
  -- false) — phải tắt ảnh chính cũ trước, bật ảnh chính mới sau.
  update public.hinh_anh h
     set la_anh_chinh = false
   where h.san_pham_id = v_sp and h.la_anh_chinh and h.xoa_luc is null and h.id <> p_id;

  update public.hinh_anh h
     set la_anh_chinh = true
   where h.id = p_id;
end;
$function$;

-- xoa_anh
CREATE OR REPLACE FUNCTION public.xoa_anh(p_id uuid)
 RETURNS TABLE(noi_luu text, khoa_luu text, khoa_luu_thumb text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_sp uuid;
  v_la_chinh boolean;
  v_noi_luu text;
  v_khoa_luu text;
  v_khoa_luu_thumb text;
  v_ke_tiep uuid;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  select h.san_pham_id, h.la_anh_chinh, h.noi_luu, h.khoa_luu, h.khoa_luu_thumb
    into v_sp, v_la_chinh, v_noi_luu, v_khoa_luu, v_khoa_luu_thumb
  from public.hinh_anh h
  where h.id = p_id and h.xoa_luc is null;

  if v_sp is null then
    raise exception 'Ảnh không tồn tại hoặc đã bị xóa' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('hinh_anh:' || v_sp::text, 0));

  update public.hinh_anh h
     set xoa_luc = now(), nguoi_xoa_id = (select auth.uid()), la_anh_chinh = false
   where h.id = p_id;

  if v_la_chinh then
    select h.id into v_ke_tiep
    from public.hinh_anh h
    where h.san_pham_id = v_sp and h.xoa_luc is null
    order by h.thu_tu, h.created_at, h.id
    limit 1;

    if v_ke_tiep is not null then
      update public.hinh_anh h set la_anh_chinh = true where h.id = v_ke_tiep;
    end if;
  end if;

  return query select v_noi_luu, v_khoa_luu, v_khoa_luu_thumb;
end;
$function$;

-- mo_phien_kiem_ke
CREATE OR REPLACE FUNCTION public.mo_phien_kiem_ke(p_kho_id uuid, p_nhom_hang_ids uuid[] DEFAULT NULL::uuid[], p_ghi_chu text DEFAULT NULL::text)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_kho public.kho;
  v_pham_vi uuid[];
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

  insert into public.chung_tu (so_ct, loai_ct, kho_id, pham_vi_nhom_hang, ghi_chu, nguoi_tao_id)
  values (
    public.sinh_so_ct('KIEM_KE'::public.loai_ct),
    'KIEM_KE',
    p_kho_id,
    v_pham_vi,
    nullif(trim(coalesce(p_ghi_chu, '')), ''),
    auth.uid()
  )
  returning * into v_ct;

  return v_ct;
end;
$function$;

-- luu_dong_kiem_ke
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

-- xoa_dong_kiem_ke
CREATE OR REPLACE FUNCTION public.xoa_dong_kiem_ke(p_dong_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_dong public.chung_tu_dong;
  v_ct public.chung_tu;
begin
  select * into v_dong from public.chung_tu_dong where id = p_dong_id;
  if v_dong.id is null then
    raise exception 'Không tìm thấy dòng đếm' using errcode = '23514';
  end if;

  select * into v_ct from public.chung_tu where id = v_dong.chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt hoặc đã hủy, không xóa dòng đếm được' using errcode = '23514';
  end if;

  if not public.co_quyen('kiem_kho') then
    raise exception 'Chức vụ của bạn chưa có quyền Kiểm kho' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ xóa được dòng phiên của kho mình' using errcode = '42501';
  end if;

  delete from public.chung_tu_dong where id = p_dong_id;
end;
$function$;

-- nhap_so_dem_kiem_ke
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

-- ghi_so_chung_tu
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
    -- Chặn xuất âm khi chưa chọn lý do.
    if v_ct.loai_ct in ('XUAT','TRA_NCC') and v_ct.ly_do_xuat_am is null then
      select coalesce(so_luong, 0) into v_ton_hien_tai
      from public.ton_kho
      where kho_id = coalesce(v_dong.kho_id, v_ct.kho_id) and san_pham_id = v_dong.san_pham_id;

      if coalesce(v_ton_hien_tai, 0) - v_dong.so_luong < 0 then
        raise exception
          'Xuất quá tồn cho sản phẩm % (tồn %, xuất %). Phải chọn lý do xuất âm trước khi ghi sổ.',
          v_dong.san_pham_id, coalesce(v_ton_hien_tai, 0), v_dong.so_luong
          using errcode = '23514';
      end if;
    end if;

    case v_ct.loai_ct
      when 'NHAP'       then perform public._ghi_so_nhap(v_ct, v_dong);
      when 'XUAT'       then perform public._ghi_so_xuat(v_ct, v_dong);
      when 'TRA_NCC'    then perform public._ghi_so_tra_ncc(v_ct, v_dong);
      when 'TRA_KHACH'  then perform public._ghi_so_tra_khach(v_ct, v_dong);
      when 'CHUYEN_KHO' then perform public._ghi_so_chuyen_kho(v_ct, v_dong);
      when 'KIEM_KE'    then perform public._ghi_so_kiem_ke(v_ct, v_dong);
      when 'DIEU_CHINH' then perform public._ghi_so_dieu_chinh(v_ct, v_dong);
    end case;
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

-- huy_chung_tu
CREATE OR REPLACE FUNCTION public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ct public.chung_tu;
  v_mv public.kho_movement;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;

  if v_ct.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_chung_tu_id using errcode = '23514';
  end if;
  if v_ct.trang_thai = 'DA_HUY' then
    raise exception 'Chứng từ % đã hủy rồi', v_ct.so_ct using errcode = '23514';
  end if;
  if coalesce(trim(p_ly_do), '') = '' then
    raise exception 'Phải nhập lý do khi hủy chứng từ' using errcode = '23514';
  end if;
  if auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, 'chi_xem') = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được hủy chứng từ' using errcode = '42501';
  end if;

  -- 0066: thủ kho không hủy được phiên KIEM_KE của kho khác — áp cho cả phiên
  -- còn NHAP_LIEU (khác NHAP/XUAT/TRA_* vốn không có khái niệm "kho của phiếu"
  -- bị giới hạn ở bước hủy nháp, vì D-02 cho phép kiểm kê chạy song song với
  -- biến động kho khác — hủy nhầm phiên kho khác vẫn là rủi ro cần chặn).
  if v_ct.loai_ct = 'KIEM_KE' and (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ hủy được phiên kiểm kê của kho mình' using errcode = '42501';
  end if;

  -- 0046 mới chặn NHAP; 0051 thêm XUAT/TRA_NCC/TRA_KHACH. 0066 thêm KIEM_KE:
  -- hủy phiên đã duyệt = đảo sổ cái + đảo cả tồn tạm KiotViet vừa nạp lúc duyệt
  -- (D-06) — cùng mức rủi ro như đảo NHAP/XUAT, chỉ quản lý được hủy.
  -- Phiếu còn NHAP_LIEU chưa đụng tồn, người nhập tự hủy được.
  -- CHUYEN_KHO/DIEU_CHINH chưa có giao diện, để nguyên luật cũ, sẽ quyết ở
  -- phase của chúng.
  -- 0083 (QUYEN-01): hủy hóa đơn đã ghi sổ = quyền "Sửa hóa đơn" của chức vụ.
  if v_ct.loai_ct = 'XUAT' and v_ct.trang_thai = 'HOAN_THANH' and not public.co_quyen('sua_hoa_don') then
    raise exception 'Chức vụ của bạn chưa có quyền Sửa hóa đơn' using errcode = '42501';
  end if;
  if v_ct.loai_ct in ('NHAP','TRA_NCC','TRA_KHACH','KIEM_KE') and v_ct.trang_thai = 'HOAN_THANH'
     and auth.uid() is not null
     and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý được hủy chứng từ đã ghi sổ' using errcode = '42501';
  end if;

  -- Chứng từ mới nhập liệu chưa đụng tồn: hủy thẳng, không sinh bút toán đảo.
  if v_ct.trang_thai = 'NHAP_LIEU' then
    update public.chung_tu
    set trang_thai = 'DA_HUY',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
    where id = p_chung_tu_id
    returning * into v_ct;
    return v_ct;
  end if;

  -- Đã ghi sổ: đảo TỪNG movement. Điều kiện la_but_toan_dao = false tránh đảo
  -- lại chính bút toán đảo nếu hàm bị gọi hai lần.
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

  update public.chung_tu
  set trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: ' || p_ly_do
  where id = p_chung_tu_id
  returning * into v_ct;

  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
    -- 0078: hủy hóa đơn ĐÃ GHI SỔ của đơn -> đơn quay về Đã xác nhận, để hoàn
    -- thành lại hoặc hủy đơn. Trước đây đơn kẹt ở Hoàn thành dù không còn hàng
    -- nào đã xuất (_cap_nhat_tien_do_ddh chỉ đẩy lên, không hạ xuống).
    update public.don_dat_hang
    set trang_thai = 'DA_XAC_NHAN',
        ghi_chu = coalesce(ghi_chu || E'\n', '') || '[hủy hóa đơn ' || v_ct.so_ct || '] ' || p_ly_do
    where id = v_ct.don_dat_hang_id and trang_thai = 'HOAN_THANH';
  end if;

  return v_ct;
end;
$function$;

