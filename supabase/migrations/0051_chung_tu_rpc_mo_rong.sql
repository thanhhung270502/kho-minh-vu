-- =============================================================================
-- 0051 — Mở rộng RPC chứng từ cho chiều xuất + vá kho theo dòng còn sót (Phase 4)
--
-- Ba việc trong một file:
-- (a) chi_tiet_chung_tu: thêm đơn gốc, chứng từ gốc, lý do xuất âm, người duyệt
--     — bốn thứ màn phiếu xuất bắt buộc phải có.
-- (b) dong_chung_tu: thêm ton_hien_tai để giao diện tô màu dòng vượt tồn.
-- (c) _ghi_so_xuat/_ghi_so_tra_ncc/_ghi_so_tra_khach: ghi kho_movement vào kho
--     của DÒNG (coalesce(p_dong.kho_id, p_ct.kho_id)) thay vì kho đầu phiếu.
--     Migration 0041 chỉ sửa _ghi_so_nhap và khối kiểm tồn âm — nếu để nguyên
--     ba hàm này thì cảnh báo xuất âm đọc tồn của DÒNG (0041) trong khi sổ cái
--     lại trừ kho ĐẦU PHIẾU: kho này âm, kho kia dư, không ai thấy cho tới lúc
--     kiểm kê. D-13 cho kho sửa từng dòng trên phiếu xuất nên lỗi này sẽ nổ
--     ngay ngày đầu nếu không vá trước khi dựng giao diện.
-- (d) huy_chung_tu: siết quyền hủy cho XUAT/TRA_NCC/TRA_KHACH đã ghi sổ giống
--     hệt mức đã siết cho NHAP ở 0046 — hủy phiếu xuất đã ghi sổ cũng viết lại
--     sổ cái và đảo tồn nên phải cùng một mức quyền.
--
-- _ghi_so_chuyen_kho GIỮ NGUYÊN — chuyển kho theo bản chất là chuyện của cả
-- phiếu (kho đi -> kho đến), không phải của từng dòng (đúng comment 0041).
-- CHUYEN_KHO/KIEM_KE/DIEU_CHINH trong huy_chung_tu cũng giữ nguyên — chưa có
-- giao diện, sẽ quyết ở phase của chúng.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) chi_tiet_chung_tu — đổi kiểu trả về nên phải drop rồi create lại.
-- -----------------------------------------------------------------------------
drop function public.chi_tiet_chung_tu(uuid);

create function public.chi_tiet_chung_tu(p_id uuid)
returns table (
  id uuid, so_ct text, ngay_ct date, loai_ct public.loai_ct,
  nguon_nhap public.nguon_nhap, trang_thai public.trang_thai_ct,
  kho_id uuid, ten_kho text, doi_tac_id uuid, ma_doi_tac text, ten_doi_tac text,
  ghi_chu text, tong_so_luong numeric, tong_tien numeric,
  ho_ten_nguoi_tao text, ngay_ghi_so timestamptz, created_at timestamptz,
  don_dat_hang_id uuid, so_dh text,
  chung_tu_goc_id uuid, so_ct_goc text,
  ly_do_xuat_am text, ghi_chu_ly_do text,
  nguoi_duyet_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai())::uuid[];
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;

  return query
  select ct.id, ct.so_ct, ct.ngay_ct, ct.loai_ct, ct.nguon_nhap, ct.trang_thai,
         ct.kho_id, k.ten, ct.doi_tac_id, dt.ma, dt.ten,
         ct.ghi_chu, ct.tong_so_luong, ct.tong_tien,
         nd.ho_ten, ct.ngay_ghi_so, ct.created_at,
         ct.don_dat_hang_id, dh.so_dh,
         ct.chung_tu_goc_id, goc.so_ct,
         ct.ly_do_xuat_am, ct.ghi_chu_ly_do,
         ct.nguoi_duyet_id
  from public.chung_tu ct
  left join public.kho k          on k.id  = ct.kho_id
  left join public.doi_tac dt     on dt.id = ct.doi_tac_id
  left join public.nguoi_dung nd  on nd.id = ct.nguoi_tao_id
  left join public.don_dat_hang dh on dh.id = ct.don_dat_hang_id
  left join public.chung_tu goc   on goc.id = ct.chung_tu_goc_id
  where ct.id = p_id
    and (
      v_vai <> 'thu_kho'
      or ct.kho_id = any(v_kho)
      or ct.kho_den_id = any(v_kho)
      or exists (select 1 from public.chung_tu_dong d
                 where d.chung_tu_id = ct.id and d.kho_id = any(v_kho))
    );
end;
$$;

revoke all    on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- (b) dong_chung_tu — thêm ton_hien_tai theo kho của DÒNG.
-- -----------------------------------------------------------------------------
drop function public.dong_chung_tu(uuid);

create function public.dong_chung_tu(p_id uuid)
returns table (
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong numeric, don_gia numeric, thanh_tien numeric,
  kho_id uuid, ten_kho text, ghi_chu text,
  ton_hien_tai numeric
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

  -- Quyền xem dòng bám theo quyền xem phiếu: hàm trên đã lọc phạm vi kho.
  if not exists (select 1 from public.chi_tiet_chung_tu(p_id)) then
    return;
  end if;

  return query
  select d.id, d.san_pham_id, sp.ma_hang, sp.ten_hang, dv.ten,
         d.so_luong, d.don_gia, d.thanh_tien,
         coalesce(d.kho_id, ct.kho_id), k.ten, d.ghi_chu,
         coalesce(tk.so_luong, 0)
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
$$;

revoke all    on function public.dong_chung_tu(uuid) from public, anon;
grant execute on function public.dong_chung_tu(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- (c) Ghi sổ chiều xuất theo kho của DÒNG — chép nguyên văn 0011, đổi đúng một
--     đối số kho_id ở mỗi hàm, giống hệt khuôn _ghi_so_nhap đã sửa ở 0041.
-- -----------------------------------------------------------------------------
create or replace function public._ghi_so_xuat(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, -p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

create or replace function public._ghi_so_tra_ncc(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, -p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

create or replace function public._ghi_so_tra_khach(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

revoke all on function public._ghi_so_xuat(public.chung_tu, public.chung_tu_dong)      from public, anon, authenticated;
revoke all on function public._ghi_so_tra_ncc(public.chung_tu, public.chung_tu_dong)   from public, anon, authenticated;
revoke all on function public._ghi_so_tra_khach(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- (d) huy_chung_tu — siết quyền hủy cho chiều xuất, chép nguyên từ bản ĐANG
--     CHẠY ở 0046, đổi đúng một điều kiện.
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

  -- 0046 mới chặn NHAP. Hủy phiếu XUAT/TRA_NCC/TRA_KHACH đã ghi sổ cũng viết
  -- lại sổ cái và đảo tồn nên phải cùng một mức quyền — chỉ quản lý được hủy.
  -- Phiếu còn NHAP_LIEU chưa đụng tồn, người nhập tự hủy được.
  -- CHUYEN_KHO/KIEM_KE/DIEU_CHINH chưa có giao diện, để nguyên luật cũ, sẽ
  -- quyết ở phase của chúng.
  if v_ct.loai_ct in ('NHAP','XUAT','TRA_NCC','TRA_KHACH') and v_ct.trang_thai = 'HOAN_THANH'
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
  'Hủy chứng từ bằng bút toán đảo. Phiếu NHAP/XUAT/TRA_NCC/TRA_KHACH đã ghi sổ chỉ quản lý hủy được (0046 + 0051) — hủy đều viết lại sổ cái và đảo tồn nên cùng một mức quyền. CHUYEN_KHO/KIEM_KE/DIEU_CHINH chưa siết, chưa có giao diện. LƯU Ý: bút toán đảo của phiếu NHẬP có so_luong âm nên trigger giá vốn KHÔNG tính lại — giá vốn không tự quay về số trước khi nhập. Đó là hành vi đúng của bình quân gia quyền di động.';

revoke all    on function public.huy_chung_tu(uuid, text) from public, anon;
grant execute on function public.huy_chung_tu(uuid, text) to authenticated;
