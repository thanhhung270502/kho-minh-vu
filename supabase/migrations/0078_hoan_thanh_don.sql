-- =============================================================================
-- 0078 — Luồng đơn hàng → hóa đơn (Phase 12, DON-01..06)
--
-- Đơn đi một mạch Đơn tạm → Đã xác nhận → Hoàn thành. "Hoàn thành" KHÔNG còn
-- là hai bước rời (tạo phiếu xuất nháp, rồi ghi sổ): hoan_thanh_don làm cả
-- hai trong MỘT transaction — lỗi ở bất kỳ đâu thì không còn lại gì.
--
-- Một đơn tối đa một hóa đơn chưa hủy (đã chốt 02/10: không giao nhiều đợt,
-- giao thiếu thì dùng "Đóng sớm"). Trước 0078, bấm "Tạo phiếu xuất" hai lần
-- sinh hai phiếu nháp, ghi sổ cả hai là trừ tồn hai lần.
--
-- Hủy hóa đơn đã ghi sổ của đơn đưa đơn về Đã xác nhận; hủy đơn (huy_don)
-- chỉ cho đơn chưa hoàn thành.
--
-- Quyền gói trong hai hàm mỏng hoan_thanh_duoc_don / huy_duoc_don để Phase 16
-- (chức vụ & quyền) chỉ thay ruột hàm, không phải sửa RPC.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Hàm quyền — hôm nay theo vai trò, Phase 16 đổi sang quyền theo chức vụ.
-- Gọi không có JWT (script/migration) coi như quản lý, khuôn 0052/0056.
-- -----------------------------------------------------------------------------
create or replace function public.hoan_thanh_duoc_don()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') in ('quan_ly', 'van_phong');
$$;

create or replace function public.huy_duoc_don()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') = 'quan_ly';
$$;

revoke all    on function public.hoan_thanh_duoc_don() from public, anon;
grant execute on function public.hoan_thanh_duoc_don() to authenticated;
revoke all    on function public.huy_duoc_don() from public, anon;
grant execute on function public.huy_duoc_don() to authenticated;

-- -----------------------------------------------------------------------------
-- (b) Phiếu xuất nháp đang gắn với đơn (sinh từ nút "Tạo phiếu xuất" cũ) chưa
-- đụng tồn — hủy để nhường chỗ cho hoan_thanh_don. Đơn của chúng vẫn ở
-- Đã xác nhận, bấm Hoàn thành là ra hóa đơn mới.
-- -----------------------------------------------------------------------------
update public.chung_tu
set trang_thai = 'DA_HUY',
    ghi_chu = coalesce(ghi_chu || E'\n', '') || 'Hủy: phiếu nháp từ đơn — luồng mới tạo hóa đơn khi Hoàn thành đơn (0078)'
where loai_ct = 'XUAT' and trang_thai = 'NHAP_LIEU' and don_dat_hang_id is not null;

-- -----------------------------------------------------------------------------
-- (c) Một đơn tối đa một hóa đơn chưa hủy. Dữ liệu thật đã có đơn mang hai hóa
-- đơn ĐÃ GHI SỔ thì DỪNG, liệt kê để người dùng quyết — không tự hủy chứng từ
-- đã ghi sổ (nguyên tắc 2: sửa sai bằng chứng từ, không bằng migration).
-- -----------------------------------------------------------------------------
do $$
declare v_trung text;
begin
  select string_agg(ds, '; ') into v_trung
  from (
    select string_agg(ct.so_ct, ', ' order by ct.so_ct) as ds
    from public.chung_tu ct
    where ct.loai_ct = 'XUAT' and ct.trang_thai <> 'DA_HUY' and ct.don_dat_hang_id is not null
    group by ct.don_dat_hang_id
    having count(*) > 1
  ) x;
  if v_trung is not null then
    raise exception 'Có đơn mang nhiều hóa đơn đã ghi sổ: %. Hủy hóa đơn thừa (bút toán đảo) rồi chạy lại migration.', v_trung
      using errcode = '23505';
  end if;
end $$;

create unique index uq_chung_tu_hoa_don_cua_don
  on public.chung_tu (don_dat_hang_id)
  where loai_ct = 'XUAT' and trang_thai <> 'DA_HUY' and don_dat_hang_id is not null;

comment on index public.uq_chung_tu_hoa_don_cua_don is
  'Một đơn đặt hàng tối đa một hóa đơn (XUAT) chưa hủy — 0078, chốt 02/10/2026.';

-- -----------------------------------------------------------------------------
-- (d) Client không tự tạo phiếu xuất từ đơn nữa — chỉ đi qua hoan_thanh_don.
-- Hàm vẫn giữ làm bước nội bộ (security definer gọi được dù đã thu quyền).
-- -----------------------------------------------------------------------------
revoke execute on function public.tao_phieu_xuat_tu_don(uuid) from authenticated;
comment on function public.tao_phieu_xuat_tu_don(uuid) is
  'Bước nội bộ của hoan_thanh_don (0078): sinh hóa đơn nháp từ đơn đã xác nhận. Client không gọi trực tiếp.';

-- -----------------------------------------------------------------------------
-- (e) Hoàn thành đơn = tạo hóa đơn + ghi lý do xuất âm + ghi sổ, một transaction.
-- Lý do xuất âm là mã của src/features/documents/lib/negative-reasons.ts.
-- -----------------------------------------------------------------------------
create or replace function public.hoan_thanh_don(
  p_don_id uuid,
  p_ly_do_xuat_am text default null,
  p_ghi_chu_ly_do text default null
)
returns public.chung_tu
language plpgsql
security definer
set search_path = ''
as $$
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
                    trim_scale(coalesce(tk.so_luong, 0)), trim_scale(ctd.so_luong)),
             '; ' order by sp.ma_hang)
      into v_am
    from public.chung_tu_dong ctd
    join public.san_pham sp on sp.id = ctd.san_pham_id
    left join public.ton_kho tk
      on tk.san_pham_id = ctd.san_pham_id and tk.kho_id = coalesce(ctd.kho_id, v_ct.kho_id)
    where ctd.chung_tu_id = v_ct.id
      and coalesce(tk.so_luong, 0) - ctd.so_luong < 0;

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
$$;

revoke all    on function public.hoan_thanh_don(uuid, text, text) from public, anon;
grant execute on function public.hoan_thanh_don(uuid, text, text) to authenticated;
comment on function public.hoan_thanh_don(uuid, text, text) is
  'Hoàn thành đơn đã xác nhận: tạo hóa đơn (XUAT) từ đơn, ghi lý do xuất âm nếu có, ghi sổ, đơn sang HOAN_THANH — một transaction (0078).';

-- -----------------------------------------------------------------------------
-- (f) Hủy đơn chưa hoàn thành — khuôn dong_don_som (0052).
-- -----------------------------------------------------------------------------
create or replace function public.huy_don(p_id uuid, p_ly_do text)
returns public.don_dat_hang
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_don public.don_dat_hang;
begin
  if not public.huy_duoc_don() then
    raise exception 'Chỉ quản lý được hủy đơn' using errcode = '42501';
  end if;

  select * into v_don from public.don_dat_hang where id = p_id for update;
  if v_don.id is null then
    raise exception 'Không tìm thấy đơn %', p_id using errcode = '23514';
  end if;
  if v_don.trang_thai not in ('TAM', 'DA_XAC_NHAN') then
    raise exception 'Đơn % đang ở trạng thái %, không hủy được. Đơn đã hoàn thành phải hủy hóa đơn trước.',
      v_don.so_dh, v_don.trang_thai using errcode = '23514';
  end if;
  if length(trim(coalesce(p_ly_do, ''))) < 5 then
    raise exception 'Phải nhập lý do hủy đơn tối thiểu 5 ký tự' using errcode = '23514';
  end if;
  -- Phòng thủ: đơn còn hóa đơn chưa hủy thì không hủy đơn (không thể xảy ra
  -- với đơn TAM/DA_XAC_NHAN theo luồng mới, nhưng dữ liệu cũ có thể có).
  if exists (select 1 from public.chung_tu
             where don_dat_hang_id = p_id and loai_ct = 'XUAT' and trang_thai <> 'DA_HUY') then
    raise exception 'Đơn % còn hóa đơn chưa hủy — hủy hóa đơn trước', v_don.so_dh using errcode = '23514';
  end if;

  update public.don_dat_hang
  set trang_thai = 'DA_HUY',
      ghi_chu = coalesce(ghi_chu || E'\n', '') || '[hủy] ' || p_ly_do
  where id = p_id
  returning * into v_don;

  return v_don;
end;
$$;

revoke all    on function public.huy_don(uuid, text) from public, anon;
grant execute on function public.huy_don(uuid, text) to authenticated;
comment on function public.huy_don(uuid, text) is
  'Hủy đơn TAM/DA_XAC_NHAN, bắt buộc lý do >= 5 ký tự; đơn đã hoàn thành phải hủy hóa đơn trước (0078).';

-- -----------------------------------------------------------------------------
-- (g) huy_chung_tu — thân hàm chép từ 0066, thêm: hủy hóa đơn đã ghi sổ của đơn
-- đưa đơn về Đã xác nhận.
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
$$;

comment on function public.huy_chung_tu(uuid, text) is
  'Hủy chứng từ bằng bút toán đảo. Phiếu NHAP/XUAT/TRA_NCC/TRA_KHACH/KIEM_KE đã
   ghi sổ chỉ quản lý hủy được (0046 + 0051 + 0066) — hủy đều viết lại sổ cái và
   đảo tồn nên cùng một mức quyền. Thủ kho không hủy được phiên KIEM_KE ngoài kho
   mình (0066), kể cả khi còn NHAP_LIEU. CHUYEN_KHO/DIEU_CHINH chưa siết, chưa có
   giao diện. 0078: hủy hóa đơn đã ghi sổ của đơn đưa đơn về DA_XAC_NHAN. LƯU Ý: bút toán đảo của phiếu NHẬP có so_luong âm nên trigger giá
   vốn KHÔNG tính lại — giá vốn không tự quay về số trước khi nhập. Đó là hành vi
   đúng của bình quân gia quyền di động.';

revoke all    on function public.huy_chung_tu(uuid, text) from public, anon;
grant execute on function public.huy_chung_tu(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- (h) chi_tiet_don — thêm hóa đơn của đơn (link đơn → hóa đơn, DON-06). Đổi
-- kiểu trả về nên drop rồi create; dong_don gọi hàm này theo tên trong thân
-- plpgsql nên không bị kéo theo.
-- -----------------------------------------------------------------------------
drop function public.chi_tiet_don(uuid);

create function public.chi_tiet_don(p_id uuid)
returns table (
  id uuid, so_dh text, ngay_dh date, trang_thai public.trang_thai_ddh,
  ngay_giao_du_kien date, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
  nguoi_nhan_id uuid, ten_nguoi_nhan text,
  ghi_chu text, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric,
  ho_ten_nguoi_tao text, created_at timestamptz,
  hoa_don_id uuid, so_hoa_don text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_vai public.vai_tro := (select public.vai_tro_hien_tai());
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select dh.id, dh.so_dh, dh.ngay_dh, dh.trang_thai, dh.ngay_giao_du_kien,
         dh.doi_tac_id, dt.ma, dt.ten,
         dh.nguoi_nhan_id, nn.ten_day_du,
         dh.ghi_chu,
         coalesce((select sum(d.so_luong_dat)     from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         coalesce((select sum(d.so_luong_da_xuat) from public.don_dat_hang_dong d where d.don_dat_hang_id = dh.id), 0),
         nd.ho_ten, dh.created_at,
         hd.id, hd.so_ct
  from public.don_dat_hang dh
  left join public.doi_tac dt    on dt.id = dh.doi_tac_id
  left join public.nhan_vien_phu_trach nn on nn.id = dh.nguoi_nhan_id
  left join public.nguoi_dung nd on nd.id = dh.nguoi_tao_id
  -- Một đơn tối đa một hóa đơn chưa hủy (uq_chung_tu_hoa_don_cua_don).
  left join public.chung_tu hd
    on hd.don_dat_hang_id = dh.id and hd.loai_ct = 'XUAT' and hd.trang_thai <> 'DA_HUY'
  where dh.id = p_id;
end;
$$;

revoke all    on function public.chi_tiet_don(uuid) from public, anon;
grant execute on function public.chi_tiet_don(uuid) to authenticated;
comment on function public.chi_tiet_don(uuid) is
  'Header đơn đặt hàng kèm tổng số lượng đặt/đã xuất, người nhận (đối tác hoặc nội bộ) và hóa đơn của đơn (0078).';
