-- =============================================================================
-- 0041 — Kho theo TỪNG DÒNG cho phiếu nhập (Phase 3, D-05)
--
-- Một chuyến hàng về có thể chia cho cả Kho 1 và Kho 2. Trước đây kho nằm ở
-- header (`chung_tu.kho_id NOT NULL`) nên phải tách hai phiếu.
--
-- Cột mới NULLABLE có chủ đích: NULL = dùng kho của phiếu. Nhờ vậy mọi chứng từ
-- đã có và mọi test của Phase 1 giữ NGUYÊN hành vi, không phải viết lại bài nào.
--
-- KHÔNG đụng `huy_chung_tu`: nó đảo theo `kho_movement.kho_id` đã ghi, không
-- đọc lại chứng từ (xem 03-RESEARCH.md §1).
-- KHÔNG đụng `_ghi_so_chuyen_kho`: chuyển kho theo bản chất là chuyện của cả
-- phiếu (kho đi → kho đến), không phải của từng dòng.
-- =============================================================================

alter table public.chung_tu_dong add column kho_id uuid references public.kho(id);

comment on column public.chung_tu_dong.kho_id is
  'Kho của riêng dòng này. NULL = dùng chung_tu.kho_id. Nullable có chủ đích để dòng cũ giữ nguyên hành vi.';

create index idx_ct_dong_kho on public.chung_tu_dong (kho_id) where kho_id is not null;

-- --- Ghi sổ phiếu nhập: kho lấy theo dòng, rơi về header khi dòng không chọn ---
create or replace function public._ghi_so_nhap(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, p_dong.so_luong, p_dong.don_gia,
    p_ct.id, p_dong.id
  );
end; $$;;


-- --- Kiểm xuất âm cũng phải tính theo kho của DÒNG ---------------------------
-- Chép nguyên văn từ 0011, chỉ đổi đúng một dòng trong khối kiểm tồn.
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

  if v_ct.loai_ct = 'XUAT' and v_ct.don_dat_hang_id is not null then
    perform public._cap_nhat_tien_do_ddh(v_ct.don_dat_hang_id);
  end if;

  update public.chung_tu
  set trang_thai = 'HOAN_THANH',
      ngay_ghi_so = now(),
      nguoi_duyet_id = auth.uid(),
      tong_so_luong = (select coalesce(sum(so_luong),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id),
      tong_tien     = (select coalesce(sum(thanh_tien),0) from public.chung_tu_dong where chung_tu_id = p_chung_tu_id)
  where id = p_chung_tu_id
  returning * into v_ct;

  return v_ct;
end;
$$;;


-- --- Thủ kho phải thấy phiếu có DÒNG thuộc kho mình --------------------------
-- Policy cũ chỉ lọc theo header: phiếu header Kho 1 có dòng về Kho 2 sẽ bị giấu
-- khỏi thủ kho Kho 2 — lỗi phân quyền âm thầm, không ai phát hiện tới khi họ hỏi
-- "sao không thấy phiếu".
drop policy if exists "doc chung tu theo pham vi" on public.chung_tu;

-- Chép từ ĐỊNH NGHĨA ĐANG CHẠY (pg_policies), không từ file 0016 — 0026 đã đổi
-- kho_hien_tai() thành trả MẢNG uuid. Thiếu `= any(...::uuid[])` là lỗi 42883
-- "operator does not exist: uuid = uuid[]" (bài học đã ghi trong .memory).
create policy "doc chung tu theo pham vi" on public.chung_tu
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) in ('quan_ly','van_phong','chi_xem')
    or (
      (select public.vai_tro_hien_tai()) = 'thu_kho'
      and (
        kho_id     = any((select public.kho_hien_tai())::uuid[])
        or kho_den_id = any((select public.kho_hien_tai())::uuid[])
        or exists (
          select 1 from public.chung_tu_dong d
          where d.chung_tu_id = chung_tu.id
            and d.kho_id = any((select public.kho_hien_tai())::uuid[])
        )
      )
    )
  );
