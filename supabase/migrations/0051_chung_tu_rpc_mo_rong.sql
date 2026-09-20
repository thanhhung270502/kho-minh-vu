-- =============================================================================
-- 0051 — RPC chứng từ mở rộng cho chiều xuất (Phase 4, plan 04-01 Task 2)
--
-- DỰNG LẠI TỪ DATABASE (2026-09-20). Migration mang version 0051 đã được áp lên
-- cloud bởi một phiên làm việc khác nhưng file nguồn không có trong repo — giống
-- hệt tình huống của 0033. Nội dung dưới đây trích thẳng từ `pg_get_functiondef`
-- của chính database đang chạy, nên chạy lại trên database rỗng cho ra đúng
-- trạng thái hiện tại.
--
-- ĐỪNG chép thân ba hàm `_ghi_so_*` từ file 0011 trong repo. Bản 0011 vẫn ghi
-- `p_ct.kho_id`, trong khi bản ĐANG CHẠY đã dùng `coalesce(p_dong.kho_id,
-- p_ct.kho_id)`. Chép từ 0011 là ghi đè bản đúng bằng bản cũ.
--
-- Bốn việc trong file này:
--   (a) `chi_tiet_chung_tu` trả thêm đơn gốc, chứng từ gốc, lý do xuất âm, người duyệt
--   (b) `dong_chung_tu` trả thêm `ton_hien_tai` theo kho của TỪNG DÒNG
--   (c) `_ghi_so_xuat` / `_ghi_so_tra_ncc` / `_ghi_so_tra_khach` ghi sổ theo kho của dòng
--   (d) `huy_chung_tu` siết quyền cho cả bốn loại chứng từ viết sổ cái
-- =============================================================================

-- --- (a) Chi tiết header: thêm 7 cột ------------------------------------------
-- CREATE OR REPLACE không đổi được kiểu trả về nên phải drop trước (tiền lệ 0029).
drop function if exists public.chi_tiet_chung_tu(uuid);

create or replace function public.chi_tiet_chung_tu(p_id uuid)
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

-- --- (b) Chi tiết dòng: thêm ton_hien_tai theo kho của DÒNG -------------------
-- Số này để giao diện tô màu dòng làm tồn xuống dưới 0 (D-12, XUAT-04). Kho hiệu
-- lực phải là `coalesce(dòng, header)` giống hệt khối kiểm tồn âm trong
-- `ghi_so_chung_tu` (0041) — lệch chỗ này thì cảnh báo báo nhầm kho.
drop function if exists public.dong_chung_tu(uuid);

create or replace function public.dong_chung_tu(p_id uuid)
returns table (
  id uuid, san_pham_id uuid, ma_hang text, ten_hang text, ten_dvt text,
  so_luong numeric, don_gia numeric, thanh_tien numeric,
  kho_id uuid, ten_kho text, ghi_chu text, ton_hien_tai numeric
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

-- --- (c) Ghi sổ chiều xuất theo kho của DÒNG ----------------------------------
-- 0041 chỉ sửa `_ghi_so_nhap`. Ba hàm dưới đây cũng phải theo kho của dòng, nếu
-- không thì cảnh báo đọc tồn kho DÒNG còn sổ cái lại trừ kho ĐẦU PHIẾU — kho này
-- âm, kho kia dư, không ai thấy cho tới lúc kiểm kê. D-13 cho kho sửa từng dòng
-- trên phiếu xuất nên sai chỗ này là nổ ngay ngày đầu.
--
-- Hàm ghi sổ của loại CHUYEN_KHO cố ý KHÔNG có mặt ở đây: chuyển kho theo bản
-- chất là chuyện của cả phiếu (kho đi → kho đến), đúng comment đã ghi ở đầu 0041.

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

-- --- (d) Siết quyền hủy cho mọi chứng từ viết sổ cái --------------------------
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
  'Hủy chứng từ bằng bút toán đảo. Mọi chứng từ viết sổ cái (NHAP/XUAT/TRA_NCC/TRA_KHACH) đã ghi sổ chỉ quản lý hủy được. LƯU Ý: bút toán đảo của phiếu NHẬP có so_luong âm nên trigger giá vốn KHÔNG tính lại — giá vốn không tự quay về số trước khi nhập. Đó là hành vi đúng của bình quân gia quyền di động.';

-- --- Quyền ------------------------------------------------------------------
-- Hai hàm đọc bị drop nên mất quyền đã cấp ở 0045, phải cấp lại.
revoke all    on function public.chi_tiet_chung_tu(uuid) from public, anon;
grant execute on function public.chi_tiet_chung_tu(uuid) to authenticated;
revoke all    on function public.dong_chung_tu(uuid) from public, anon;
grant execute on function public.dong_chung_tu(uuid) to authenticated;

-- Ba hàm ghi sổ là hàm nội bộ, chỉ `ghi_so_chung_tu` gọi. Client không được gọi.
revoke all on function public._ghi_so_xuat(public.chung_tu, public.chung_tu_dong)      from public, anon, authenticated;
revoke all on function public._ghi_so_tra_ncc(public.chung_tu, public.chung_tu_dong)   from public, anon, authenticated;
revoke all on function public._ghi_so_tra_khach(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;
