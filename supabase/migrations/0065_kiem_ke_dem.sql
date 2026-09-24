-- =============================================================================
-- 0065 — KKE-01/02, DLIEU-06 (D-02, D-03, D-05, D-08): mở phiên kiểm kê và
-- chốt tồn sổ TỪNG DÒNG tại lúc lưu số đếm.
--
-- KHÔNG đổi `_ghi_so_kiem_ke` (0011) — công thức lệch = so_luong -
-- so_luong_he_thong đã đúng D-03 từ Phase 1 (đọc giá trị ĐÃ LƯU trong dòng,
-- không tính lại lúc duyệt). Việc thật ở migration này là ghi `so_luong_he_thong`
-- đúng LÚC LƯU (đọc `ton_kho` NGAY LÚC GỌI `luu_dong_kiem_ke`, không phải lúc mở
-- phiên — kho vẫn nhận NHAP/XUAT song song trong lúc phiên mở, D-02), và khóa
-- mọi đường ghi thẳng `chung_tu_dong` của KIEM_KE qua PostgREST để không ai bỏ
-- qua bước chốt đó (06-RESEARCH.md Pitfall 1/2).
--
-- ĐỊNH NGHĨA ĐANG CHẠY TRÊN CLOUD lúc viết migration này (project
-- phonzyruoalimgaovljm, đọc bằng kết nối trực tiếp Session pooler — môi trường
-- thực thi này KHÔNG có MCP execute_sql, giống tiền lệ 06-01):
--
-- select count(*) from chung_tu_dong where so_luong_he_thong is not null;
--   => 0  (bắt buộc = 0 để tạo được unique index partial mới ở mục 2)
--
-- select tablename, policyname, cmd, qual, with_check from pg_policies
-- where tablename in ('chung_tu','chung_tu_dong');
--
--   chung_tu / INSERT "tao chung tu tru chi xem"
--     with_check: ((select vai_tro_hien_tai()) <> 'chi_xem')
--   chung_tu / UPDATE "chi sua chung tu dang nhap lieu"
--     using:      (trang_thai = 'NHAP_LIEU' and (select vai_tro_hien_tai()) <> 'chi_xem')
--     with_check: ((select vai_tro_hien_tai()) <> 'chi_xem')
--   chung_tu_dong / INSERT "tao dong chung tu tru chi xem"
--     with_check: ((select vai_tro_hien_tai()) <> 'chi_xem')
--   chung_tu_dong / UPDATE "chi sua dong cua chung tu nhap lieu"
--     using: (exists(select 1 from chung_tu ct where ct.id = chung_tu_id
--             and ct.trang_thai = 'NHAP_LIEU') and (select vai_tro_hien_tai()) <> 'chi_xem')
--     with_check: ((select vai_tro_hien_tai()) <> 'chi_xem')
--   chung_tu_dong / DELETE "xoa dong cua chung tu nhap lieu"
--     using: (exists(select 1 from chung_tu ct where ct.id = chung_tu_id
--             and ct.trang_thai = 'NHAP_LIEU') and (select vai_tro_hien_tai()) <> 'chi_xem')
--
-- Latest migration trên cloud lúc đọc: 0062 (khớp repo — 0063/0064 chưa đẩy,
-- việc của 06-05).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Cột mới: phạm vi phiên (chỉ KIEM_KE) và dấu vết đếm (chỉ KIEM_KE).
-- -----------------------------------------------------------------------------
alter table public.chung_tu
  add column pham_vi_nhom_hang uuid[];
comment on column public.chung_tu.pham_vi_nhom_hang is
  'CHỈ dùng cho KIEM_KE. NULL = toàn bộ kho (đếm đầu kỳ/go-live, KKE-01/DLIEU-06).
   Có giá trị = phiên kiểm kê định kỳ chỉ nhắm một số nhóm hàng (D-05) — "chưa
   đếm" chỉ tính trong phạm vi này, không báo thiếu cả kho.';

alter table public.chung_tu_dong
  add column dem_luc timestamptz,
  add column nguoi_dem_id uuid references public.nguoi_dung(id),
  add column dem_lai boolean not null default false;
comment on column public.chung_tu_dong.dem_luc is
  'CHỈ dùng cho KIEM_KE. Thời điểm số đếm của dòng này được LƯU (không phải lúc
   mở phiên) — đây là "LÚC" mà so_luong_he_thong được chốt theo (D-03).';
comment on column public.chung_tu_dong.nguoi_dem_id is
  'CHỈ dùng cho KIEM_KE. Ghi bởi luu_dong_kiem_ke (auth.uid()), client không
   truyền — chống chối bỏ (Repudiation, T-06-20).';
comment on column public.chung_tu_dong.dem_lai is
  'CHỈ dùng cho KIEM_KE. Người duyệt trả dòng này về để đếm lại (D-16, plan sau
   dùng) — luu_dong_kiem_ke luôn đặt lại false khi có số đếm mới.';

-- -----------------------------------------------------------------------------
-- 2. Unique index: một mã CHỈ một dòng trong một phiên KIEM_KE (D-05). Điều
-- kiện lọc `where so_luong_he_thong is not null` để KHÔNG ảnh hưởng NHAP/XUAT
-- (0041 cho phép nhiều dòng cùng mã khi chia theo kho) — chỉ dòng KIEM_KE mang
-- so_luong_he_thong.
-- -----------------------------------------------------------------------------
create unique index uq_ct_dong_kiem_ke_ma
  on public.chung_tu_dong (chung_tu_id, san_pham_id)
  where so_luong_he_thong is not null;

-- -----------------------------------------------------------------------------
-- 3. Helper SECURITY DEFINER dùng TRONG policy — cắt vòng RLS (khuôn 0042
-- phieu_co_dong_thuoc_kho_hien_tai): thủ kho không thấy phiếu kho khác thì
-- exists() thường trả false -> lọt qua điều kiện chặn. SECURITY DEFINER bỏ
-- qua RLS khi đọc chung_tu nên luôn trả đúng loai_ct thật.
-- -----------------------------------------------------------------------------
create or replace function public.la_chung_tu_kiem_ke(p_chung_tu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chung_tu where id = p_chung_tu_id and loai_ct = 'KIEM_KE'
  );
$$;
comment on function public.la_chung_tu_kiem_ke(uuid) is
  'Dùng TRONG policy ghi của chung_tu_dong để chặn client ghi thẳng dòng KIEM_KE
   (phải đi qua luu_dong_kiem_ke/xoa_dong_kiem_ke). SECURITY DEFINER để không bị
   RLS chung_tu che (khuôn 0042).';
revoke all    on function public.la_chung_tu_kiem_ke(uuid) from public, anon;
grant execute on function public.la_chung_tu_kiem_ke(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Helper nội bộ: mã hàng nào thuộc PHẠM VI của một phiên kiểm kê (dùng cho
-- RPC "chưa đếm"/duyệt ở plan sau — KHÔNG gọi từ migration này). Tách riêng
-- khỏi kiểm tra "nhóm hàng của mã có thuộc phiên" trong luu_dong_kiem_ke/
-- nhap_so_dem_kiem_ke: hai RPC đó CHỈ xét nhóm hàng (cho phép đếm một mã dù
-- kho mặc định của nó khác kho đầu phiên — hàng tìm thấy lạc kho vẫn đếm
-- được), còn hàm này còn xét thêm điều kiện "có mặt ở kho" cho danh sách
-- "chưa đếm" (06-RESEARCH.md Pitfall 5, A3: bắt cả mã ngừng kinh doanh còn
-- tồn và mã mới nhập chưa gán kho mặc định).
-- -----------------------------------------------------------------------------
create or replace function public._pham_vi_kiem_ke(p_chung_tu_id uuid)
returns table(san_pham_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select sp.id
  from public.san_pham sp
  join public.chung_tu ct on ct.id = p_chung_tu_id
  left join public.ton_kho tk on tk.kho_id = ct.kho_id and tk.san_pham_id = sp.id
  where (ct.pham_vi_nhom_hang is null or sp.nhom_hang_id = any(ct.pham_vi_nhom_hang))
    and (
      (sp.dang_kinh_doanh and sp.kho_mac_dinh_id = ct.kho_id)
      or coalesce(tk.so_luong, 0) <> 0
    );
$$;
comment on function public._pham_vi_kiem_ke(uuid) is
  'Nội bộ — mã hàng thuộc phạm vi ĐẾM ĐỦ của một phiên (dùng cho "chưa đếm"/mẫu
   Excel ở plan sau, KHÔNG dùng bởi luu_dong_kiem_ke). Vế "có tồn" bắt mã ngừng
   kinh doanh còn hàng và mã chuyển kho (Phase 8); mã chưa gán kho mặc định và
   tồn 0 nằm NGOÀI phạm vi này có chủ đích.';
revoke all on function public._pham_vi_kiem_ke(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Sửa policy: phiếu KIEM_KE chỉ ghi qua RPC SECURITY DEFINER (bỏ qua RLS),
-- không có đường ghi trực tiếp cho client — đúng khuôn "sổ cái không có policy
-- ghi cho client" (0016, áp cho kho_movement), thu hẹp cho MỘT loại chứng từ
-- thay vì cả bảng. Điều kiện gốc lấy nguyên văn từ pg_policies đọc ở trên.
-- -----------------------------------------------------------------------------
drop policy "tao chung tu tru chi xem" on public.chung_tu;
create policy "tao chung tu tru chi xem" on public.chung_tu
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and loai_ct <> 'KIEM_KE'
  );

drop policy "chi sua chung tu dang nhap lieu" on public.chung_tu;
create policy "chi sua chung tu dang nhap lieu" on public.chung_tu
  for update to authenticated
  using (
    trang_thai = 'NHAP_LIEU'
    and (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and loai_ct <> 'KIEM_KE'
  )
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

drop policy "tao dong chung tu tru chi xem" on public.chung_tu_dong;
create policy "tao dong chung tu tru chi xem" on public.chung_tu_dong
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and not public.la_chung_tu_kiem_ke(chung_tu_id)
  );

drop policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "chi sua dong cua chung tu nhap lieu" on public.chung_tu_dong
  for update to authenticated
  using (
    exists (select 1 from public.chung_tu ct
            where ct.id = chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and not public.la_chung_tu_kiem_ke(chung_tu_id)
  )
  with check ((select public.vai_tro_hien_tai()) <> 'chi_xem');

drop policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong;
create policy "xoa dong cua chung tu nhap lieu" on public.chung_tu_dong
  for delete to authenticated
  using (
    exists (select 1 from public.chung_tu ct
            where ct.id = chung_tu_id and ct.trang_thai = 'NHAP_LIEU')
    and (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and not public.la_chung_tu_kiem_ke(chung_tu_id)
  );

-- -----------------------------------------------------------------------------
-- 6. mo_phien_kiem_ke: MỘT chứng từ KIEM_KE cho MỘT kho, phạm vi nhóm hàng tùy
-- chọn (NULL = toàn kho, dùng cho đợt đầu kỳ, KKE-01).
-- -----------------------------------------------------------------------------
create or replace function public.mo_phien_kiem_ke(
  p_kho_id uuid,
  p_nhom_hang_ids uuid[] default null,
  p_ghi_chu text default null
)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kho public.kho;
  v_pham_vi uuid[];
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không mở được phiên kiểm kê' using errcode = '42501';
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
$$;
comment on function public.mo_phien_kiem_ke(uuid, uuid[], text) is
  'KKE-01: mở MỘT chứng từ KIEM_KE cho MỘT kho. p_nhom_hang_ids NULL hoặc mảng
   rỗng = toàn kho (đếm đầu kỳ/go-live, DLIEU-06); có giá trị = phiên định kỳ
   chỉ nhắm một số nhóm (D-05, chia việc cho nhiều người đếm song song).';
revoke all    on function public.mo_phien_kiem_ke(uuid, uuid[], text) from public, anon;
grant execute on function public.mo_phien_kiem_ke(uuid, uuid[], text) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. luu_dong_kiem_ke: chốt tồn sổ THEO TỪNG DÒNG tại LÚC LƯU (D-03) — đọc
-- ton_kho NGAY LÚC GỌI, không phải lúc mở phiên. Upsert bằng ON CONFLICT trên
-- unique index (mục 2); khóa header (`for update`) tuần tự hóa với người đếm
-- khác cùng mã và với duyệt (khóa DUY NHẤT áp cho race condition, vì
-- chung_tu_dong không có PK nào khác để khóa theo mã).
-- -----------------------------------------------------------------------------
create or replace function public.luu_dong_kiem_ke(
  p_chung_tu_id uuid,
  p_san_pham_id uuid,
  p_so_luong numeric
)
returns public.chung_tu_dong
language plpgsql
security definer
set search_path = ''
as $$
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
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không đếm được' using errcode = '42501';
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
$$;
comment on function public.luu_dong_kiem_ke(uuid, uuid, numeric) is
  'D-03: chốt so_luong_he_thong (tồn sổ) TẠI LÚC LƯU số đếm của TỪNG DÒNG, không
   phải lúc mở phiên. Sửa đếm lại một mã thì chốt lại tồn sổ tại lúc sửa — VẪN
   một dòng cho mỗi mã (unique index uq_ct_dong_kiem_ke_ma, D-05). _ghi_so_kiem_ke
   (0011) đọc lại giá trị này lúc duyệt, KHÔNG tính lại — công thức lệch = so_luong
   - so_luong_he_thong đã đúng từ Phase 1, không đổi ở đây.';
revoke all    on function public.luu_dong_kiem_ke(uuid, uuid, numeric) from public, anon;
grant execute on function public.luu_dong_kiem_ke(uuid, uuid, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. xoa_dong_kiem_ke: xóa một dòng đếm (sửa sai kiểu "gõ nhầm mã"). Cùng
-- ràng buộc quyền/trạng thái như luu_dong_kiem_ke.
-- -----------------------------------------------------------------------------
create or replace function public.xoa_dong_kiem_ke(p_dong_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không xóa được' using errcode = '42501';
  end if;
  if (select public.vai_tro_hien_tai()) = 'thu_kho'
     and not (v_ct.kho_id = any((select public.kho_hien_tai())::uuid[])) then
    raise exception 'Thủ kho chỉ xóa được dòng phiên của kho mình' using errcode = '42501';
  end if;

  delete from public.chung_tu_dong where id = p_dong_id;
end;
$$;
comment on function public.xoa_dong_kiem_ke(uuid) is
  'Xóa một dòng đếm của phiên KIEM_KE còn NHAP_LIEU (sửa sai kiểu gõ nhầm mã).
   Cùng ràng buộc quyền/trạng thái như luu_dong_kiem_ke.';
revoke all    on function public.xoa_dong_kiem_ke(uuid) from public, anon;
grant execute on function public.xoa_dong_kiem_ke(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. nhap_so_dem_kiem_ke: ba đường nhập số đếm (điện thoại, máy tính, Excel)
-- đều gọi luu_dong_kiem_ke; Excel/nhập hàng loạt đi qua RPC gộp này — có chế
-- độ xem trước, không nạp nửa vời (D-04, D-08). Khuôn nap_ton_tam (0061): vòng
-- 1 phân loại không ghi, vòng 2 chỉ chạy khi sạch và p_chi_kiem_tra = false.
-- -----------------------------------------------------------------------------
create or replace function public.nhap_so_dem_kiem_ke(
  p_chung_tu_id uuid,
  p_du_lieu jsonb,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không nhập được' using errcode = '42501';
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
$$;
comment on function public.nhap_so_dem_kiem_ke(uuid, jsonb, boolean) is
  'D-04/D-08: nhập số đếm hàng loạt (Excel) qua ĐÚNG luu_dong_kiem_ke mỗi dòng —
   không có đường ghi riêng. p_chi_kiem_tra = true (mặc định) là xem trước,
   không ghi gì. Còn dòng lỗi thì KHÔNG nạp nửa vời — trả da_nap=false, người
   dùng sửa hết lỗi rồi nạp lại. Ô Số đếm trống = bỏ qua (CHƯA ĐẾM, D-07), khác
   với số đếm = 0 (là dat/cap_nhat hợp lệ).';
revoke all    on function public.nhap_so_dem_kiem_ke(uuid, jsonb, boolean) from public, anon;
grant execute on function public.nhap_so_dem_kiem_ke(uuid, jsonb, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Tự kiểm: không sót bảng nào chưa bật RLS (khuôn 0026/0063).
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
