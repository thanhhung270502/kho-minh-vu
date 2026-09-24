-- =============================================================================
-- 0066 — KKE-03/04, DLIEU-06 (D-06, D-07, D-09, D-14, D-16): bảng lệch/chưa đếm
-- của một phiên, danh sách phiên có tiến độ, cờ "đếm lại" từng dòng, và RPC
-- duyệt phiên gọi ghi_so_chung_tu có sẵn.
--
-- 06-RESEARCH.md §Security Domain: ghi_so_chung_tu được `grant execute` cho
-- MỌI authenticated từ Phase 1 — kiểm quyền chỉ trong duyet_phien_kiem_ke là
-- CHƯA ĐỦ, vì một người có quyền ghi sổ thường (mọi vai trò trừ chi_xem) vẫn
-- gọi thẳng được ghi_so_chung_tu(phiên_KIEM_KE) bỏ qua toàn bộ kiểm D-07/D-14.
-- Migration này thêm cửa chặn NGAY TRONG ghi_so_chung_tu cho KIEM_KE — chỉ đi
-- được qua duyet_phien_kiem_ke (cờ transaction-local kho_minh_vu.duyet_kiem_ke),
-- không có đường tắt nào khác từ PostgREST.
--
-- Trạng thái hiển thị (mới mở / đang đếm / chờ duyệt) KHÔNG lưu DB — tính từ
-- tiến độ (so_da_dem/so_trong_pham_vi/so_dem_lai) ở tầng giao diện, đúng
-- nguyên tắc kiến trúc số 1 (tồn kho/tiến độ là kết quả, không phải dữ liệu
-- nhập tay).
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD lúc viết migration này (project
-- phonzyruoalimgaovljm, đọc bằng pg_get_functiondef qua kết nối trực tiếp
-- Session pooler — môi trường thực thi này KHÔNG có MCP execute_sql, giống
-- tiền lệ 06-01/06-02/06-03):
--
--   select pg_get_functiondef('public.ghi_so_chung_tu(uuid)'::regprocedure);
--   select pg_get_functiondef('public.huy_chung_tu(uuid,text)'::regprocedure);
--
-- Cả hai bản trên cloud KHỚP HOÀN TOÀN (từng ký tự, kể cả comment) với
-- supabase/migrations/0051_chung_tu_rpc_mo_rong.sql trong git — không lệch
-- cloud, khác tình huống 0059→0062. `create or replace` bên dưới dùng nguyên
-- văn hai hàm đó làm gốc, chỉ thêm/sửa đúng phần đã nêu ở mục 5 và 6.
--
-- Migration mới nhất trên cloud lúc đọc: 0062 (khớp repo — 0063/0064/0065
-- chưa đẩy, việc của 06-05).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. danh_sach_phien_kiem_ke: danh sách phiên KIEM_KE kèm tiến độ. p_chung_tu_id
-- lọc đúng một phiên — trang chi tiết dùng để lấy đầu phiên kèm tiến độ cùng
-- một lượt gọi thay vì phải ghép chi_tiet_chung_tu.
-- -----------------------------------------------------------------------------
create or replace function public.danh_sach_phien_kiem_ke(
  p_kho_id uuid default null,
  p_trang_thai public.trang_thai_ct default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 20,
  p_chung_tu_id uuid default null
)
returns table (
  id uuid, so_ct text, ngay_ct date, kho_id uuid, ten_kho text,
  pham_vi_nhom_hang uuid[], ten_nhom_pham_vi text, trang_thai public.trang_thai_ct,
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
comment on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) is
  'KKE-03: danh sách phiên KIEM_KE kèm tiến độ (so_da_dem/so_trong_pham_vi/so_dem_lai)
   — trạng thái hiển thị (mới mở/đang đếm/chờ duyệt) giao diện tự suy từ ba số này,
   KHÔNG lưu DB (nguyên tắc kiến trúc số 1). p_chung_tu_id lọc đúng một phiên cho
   trang chi tiết. Thủ kho chỉ thấy phiên kho mình.';
revoke all    on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) from public, anon;
grant execute on function public.danh_sach_phien_kiem_ke(uuid, public.trang_thai_ct, integer, integer, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. bang_dem_kiem_ke: bảng lệch của một phiên — mọi mã trong phạm vi (đã đếm
-- và chưa đếm) kèm số đếm, tồn sổ đã chốt, lệch, tồn hiện tại, tồn KiotViet tạm
-- (KKE-03, D-07, D-09). Không phân trang (một kho tối đa ~3.300 mã). Không trả
-- giá (D-17).
-- -----------------------------------------------------------------------------
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
    cd.so_luong_he_thong,
    cd.so_luong - cd.so_luong_he_thong,
    coalesce(tk.so_luong, 0),
    (
      select sum(d.so_luong)
      from public.chung_tu_dong d
      join public.chung_tu c on c.id = d.chung_tu_id
      where c.loai_ct = 'DIEU_CHINH' and c.trang_thai = 'HOAN_THANH'
        and c.ghi_chu like '[NAP_TON_TAM]%'
        and coalesce(d.kho_id, c.kho_id) = v_ct.kho_id
        and d.san_pham_id = sp.id
    ),
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
comment on function public.bang_dem_kiem_ke(uuid, uuid) is
  'KKE-03/D-07/D-09: bảng lệch của MỘT phiên — mọi mã trong phạm vi (_pham_vi_kiem_ke
   hợp mã đã có dòng), kèm số đếm/tồn sổ đã chốt/lệch/tồn hiện tại/tồn KiotViet tạm
   (từ nap_ton_tam, ghi_chu [NAP_TON_TAM]%). Không phân trang — một kho tối đa
   ~3.300 mã. KHÔNG trả giá vốn/đơn giá (D-17).';
revoke all    on function public.bang_dem_kiem_ke(uuid, uuid) from public, anon;
grant execute on function public.bang_dem_kiem_ke(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. dat_dem_lai: người duyệt trả một dòng về "đếm lại" (D-16). Chỉ người có
-- duyet_duoc_kiem_ke() (helper 0063).
-- -----------------------------------------------------------------------------
create or replace function public.dat_dem_lai(p_dong_id uuid, p_dem_lai boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dong public.chung_tu_dong;
  v_ct public.chung_tu;
begin
  if not (select public.duyet_duoc_kiem_ke()) then
    raise exception 'Không có quyền duyệt kiểm kê' using errcode = '42501';
  end if;

  select * into v_dong from public.chung_tu_dong where id = p_dong_id;
  if v_dong.id is null then
    raise exception 'Không tìm thấy dòng đếm' using errcode = '23514';
  end if;

  select * into v_ct from public.chung_tu where id = v_dong.chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt hoặc đã hủy, không đổi cờ đếm lại được' using errcode = '23514';
  end if;

  update public.chung_tu_dong set dem_lai = p_dem_lai where id = p_dong_id;
end;
$$;
comment on function public.dat_dem_lai(uuid, boolean) is
  'D-16: người duyệt trả một dòng đếm về "đếm lại" (không chặn duyệt vì lệch lớn,
   chỉ nêu ra để người đếm xem lại). luu_dong_kiem_ke (0065) tự đặt lại false khi
   có số đếm mới.';
revoke all    on function public.dat_dem_lai(uuid, boolean) from public, anon;
grant execute on function public.dat_dem_lai(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. duyet_phien_kiem_ke: duyệt phiên — chấp nhận mã chưa đếm là 0, sinh dòng
-- 0 cho các mã đó, đặt ngay_ct = ngày duyệt (giờ Việt Nam), rồi gọi
-- ghi_so_chung_tu qua cờ transaction-local (KKE-04, D-03, D-14).
-- -----------------------------------------------------------------------------
create or replace function public.duyet_phien_kiem_ke(
  p_chung_tu_id uuid,
  p_chap_nhan_khong_dem uuid[] default '{}'::uuid[]
)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ct public.chung_tu;
  v_chua_dem uuid[];
  v_con_thieu uuid[];
  v_sai uuid[];
  v_ton numeric(18,4);
  v_id uuid;
  v_chap_nhan uuid[] := coalesce(p_chap_nhan_khong_dem, '{}'::uuid[]);
begin
  -- a) Kiểm quyền TRƯỚC TIÊN — SECURITY DEFINER bỏ qua RLS.
  if not (select public.duyet_duoc_kiem_ke()) then
    raise exception 'Không có quyền duyệt kiểm kê' using errcode = '42501';
  end if;

  -- b) Header hợp lệ + còn NHAP_LIEU.
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt hoặc đã hủy' using errcode = '23514';
  end if;

  -- c) Còn dòng chờ đếm lại (D-16) — chặn TRƯỚC khi xét mã chưa đếm.
  if exists (select 1 from public.chung_tu_dong where chung_tu_id = p_chung_tu_id and dem_lai) then
    raise exception 'Còn % dòng chờ đếm lại',
      (select count(*) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id and dem_lai)
      using errcode = '23514';
  end if;

  -- d) Tập chưa đếm = phạm vi trừ mã đã có dòng. Mọi phần tử của
  -- p_chap_nhan_khong_dem phải nằm trong tập này; tập này trừ danh sách chấp
  -- nhận phải rỗng (D-07 — không mã nào bị bỏ sót mà không ai biết).
  select coalesce(array_agg(pv.san_pham_id), '{}'::uuid[]) into v_chua_dem
  from public._pham_vi_kiem_ke(p_chung_tu_id) pv
  where not exists (
    select 1 from public.chung_tu_dong cd
    where cd.chung_tu_id = p_chung_tu_id and cd.san_pham_id = pv.san_pham_id
  );

  select coalesce(array_agg(x), '{}'::uuid[]) into v_sai
  from unnest(v_chap_nhan) x
  where not (x = any(v_chua_dem));
  if cardinality(v_sai) > 0 then
    raise exception 'Có % mã chấp nhận không nằm trong danh sách chưa đếm', cardinality(v_sai)
      using errcode = '23514';
  end if;

  select coalesce(array_agg(x), '{}'::uuid[]) into v_con_thieu
  from unnest(v_chua_dem) x
  where not (x = any(v_chap_nhan));
  if cardinality(v_con_thieu) > 0 then
    raise exception 'Còn % mã chưa đếm chưa được xử lý — đếm bù hoặc chấp nhận 0', cardinality(v_con_thieu)
      using errcode = '23514';
  end if;

  -- e) Mã chấp nhận 0: sinh dòng 0, tồn tại kho phiên NGAY LÚC DUYỆT (D-06).
  foreach v_id in array v_chap_nhan loop
    select coalesce(so_luong, 0) into v_ton
    from public.ton_kho where kho_id = v_ct.kho_id and san_pham_id = v_id;

    insert into public.chung_tu_dong (
      chung_tu_id, san_pham_id, so_luong, so_luong_he_thong, don_gia, thanh_tien,
      kho_id, dem_luc, nguoi_dem_id, ghi_chu
    ) values (
      p_chung_tu_id, v_id, 0, coalesce(v_ton, 0), 0, 0,
      v_ct.kho_id, now(), auth.uid(), '[CHAP_NHAN_0]'
    );
  end loop;

  -- f) Movement mang ngày DUYỆT, không phải ngày mở phiên — thẻ kho sắp theo
  -- ngày, và phiên có thể mở cách nhiều ngày trước lúc duyệt.
  update public.chung_tu
  set ngay_ct = (now() at time zone 'Asia/Ho_Chi_Minh')::date
  where id = p_chung_tu_id;

  -- g) Ghi sổ qua cờ transaction-local — ghi_so_chung_tu (đã vá ở mục 5) chỉ
  -- cho KIEM_KE đi qua khi cờ này = 'on' VÀ người gọi có duyet_duoc_kiem_ke().
  -- KHÔNG bọc exception when others (nguyên tắc kiến trúc số 4).
  perform set_config('kho_minh_vu.duyet_kiem_ke', 'on', true);
  return public.ghi_so_chung_tu(p_chung_tu_id);
end;
$$;
comment on function public.duyet_phien_kiem_ke(uuid, uuid[]) is
  'KKE-04: duyệt phiên kiểm kê — chỉ duyet_duoc_kiem_ke(); chặn khi còn dòng chờ
   đếm lại (D-16) hoặc còn mã chưa đếm chưa được xử lý (D-07); mã chấp nhận 0
   được chốt tồn tại LÚC DUYỆT (D-06); ngay_ct đổi thành ngày duyệt giờ Việt Nam;
   ghi sổ qua cờ transaction-local kho_minh_vu.duyet_kiem_ke (D-14, xem
   ghi_so_chung_tu). Movement = lệch ĐÃ CHỐT lúc lưu từng dòng, KHÔNG tính lại
   theo tồn lúc duyệt (D-03, _ghi_so_kiem_ke 0011 không đổi).';
revoke all    on function public.duyet_phien_kiem_ke(uuid, uuid[]) from public, anon;
grant execute on function public.duyet_phien_kiem_ke(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. ghi_so_chung_tu — thêm DUY NHẤT một khối chặn KIEM_KE ngay sau khối kiểm
-- chi_xem đã có, TRƯỚC vòng lặp ghi từng dòng. auth.uid() is null (script/
-- postgres, không phiên) KHÔNG bị chặn — comment giải thích lý do ở dưới.
-- -----------------------------------------------------------------------------
create or replace function public.ghi_so_chung_tu(p_chung_tu_id uuid)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
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
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không được ghi sổ chứng từ' using errcode = '42501';
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
$$;

revoke all    on function public.ghi_so_chung_tu(uuid) from public, anon;
grant execute on function public.ghi_so_chung_tu(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. huy_chung_tu — thêm KIEM_KE vào danh sách "đã ghi sổ chỉ quản lý hủy"
-- (hủy = đảo sổ cái, cùng mức quyền như NHAP/XUAT/TRA_NCC/TRA_KHACH), và chặn
-- thủ kho hủy phiên KIEM_KE ngoài kho được phân công (kể cả khi còn NHAP_LIEU).
-- -----------------------------------------------------------------------------
create or replace function public.huy_chung_tu(p_chung_tu_id uuid, p_ly_do text)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
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
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
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
  if v_ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH','KIEM_KE') and v_ct.trang_thai = 'HOAN_THANH'
     and (select public.vai_tro_hien_tai()) <> 'quan_ly' then
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
  end if;

  return v_ct;
end;
$$;

comment on function public.huy_chung_tu(uuid, text) is
  'Hủy chứng từ bằng bút toán đảo. Phiếu NHAP/XUAT/TRA_NCC/TRA_KHACH/KIEM_KE đã
   ghi sổ chỉ quản lý hủy được (0046 + 0051 + 0066) — hủy đều viết lại sổ cái và
   đảo tồn nên cùng một mức quyền. Thủ kho không hủy được phiên KIEM_KE ngoài kho
   mình (0066), kể cả khi còn NHAP_LIEU. CHUYEN_KHO/DIEU_CHINH chưa siết, chưa có
   giao diện. LƯU Ý: bút toán đảo của phiếu NHẬP có so_luong âm nên trigger giá
   vốn KHÔNG tính lại — giá vốn không tự quay về số trước khi nhập. Đó là hành vi
   đúng của bình quân gia quyền di động.';

revoke all    on function public.huy_chung_tu(uuid, text) from public, anon;
grant execute on function public.huy_chung_tu(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (khuôn 0026/0063/0065).
-- -----------------------------------------------------------------------------
do $$
declare v_thieu text;
begin
  select string_agg(tablename, ', ') into v_thieu
  from pg_tables
  where schemaname = 'public' and rowsecurity = false;

  if v_thieu is not null then
    raise exception 'Còn bảng chưa bật RLS: %', v_thieu;
  end if;
end $$;
