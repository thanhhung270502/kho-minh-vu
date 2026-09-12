-- =============================================================================
-- 0011 — RPC ghi sổ chứng từ
--
-- Ghi sổ là cửa DUY NHẤT làm tồn kho thay đổi.
--
-- Vì sao phải là RPC chứ không phải Server Action gọi nhiều lệnh: ghi sổ phải
-- atomic. Bốn câu lệnh rời rạc từ ứng dụng KHÔNG phải một transaction — mất
-- mạng giữa chừng là lệch tồn vĩnh viễn.
--
-- Vì sao SECURITY DEFINER là bắt buộc chứ không phải tùy chọn: client
-- (authenticated) không được GRANT INSERT trực tiếp trên kho_movement (xem
-- 0014c). Nếu hàm là SECURITY INVOKER thì chính REVOKE đó chặn nó lại.
-- Đổi lại, hàm phải TỰ kiểm quyền nghiệp vụ bên trong vì RLS không áp dụng.
--
-- Mọi hàm SECURITY DEFINER đều `set search_path = ''` và schema-qualify mọi
-- tên object: thiếu điều này là lỗ hổng leo quyền.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bảy hàm nội bộ, mỗi loại chứng từ một hàm. Tách ra để test độc lập được và
-- để không có một khối case khổng lồ khó đọc.
-- Tiền tố _ báo hiệu nội bộ: chỉ ghi_so_chung_tu được gọi chúng.
-- -----------------------------------------------------------------------------

create or replace function public._ghi_so_nhap(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, p_dong.so_luong, p_dong.don_gia,
    p_ct.id, p_dong.id
  );
end; $$;

-- Khách trả hàng về: tồn tăng, ghi nhận theo giá vốn hiện hành (không phải đơn
-- giá bán trên chứng từ gốc — hàng về kho được định giá theo giá vốn công ty).
create or replace function public._ghi_so_tra_khach(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

create or replace function public._ghi_so_xuat(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, -p_dong.so_luong, coalesce(v_gia_von, 0),
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
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, -p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

-- HAI movement cho mỗi dòng: âm ở kho đi, dương ở kho đến, CÙNG giá vốn.
-- Giá vốn toàn công ty nên chuyển kho không làm đổi giá vốn.
create or replace function public._ghi_so_chuyen_kho(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;

  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, -p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );

  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_den_id, p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

-- Kiểm kê: movement = chênh lệch giữa số đếm thực tế và tồn sổ tại thời điểm đếm.
-- Chênh lệch bằng 0 thì KHÔNG sinh movement (ck_so_luong_khac_khong sẽ chặn).
create or replace function public._ghi_so_kiem_ke(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gia_von numeric(18,4);
  v_lech numeric(18,4);
begin
  v_lech := p_dong.so_luong - coalesce(p_dong.so_luong_he_thong, 0);
  if v_lech = 0 then
    return;
  end if;

  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, v_lech, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

-- Điều chỉnh: giữ nguyên dấu của so_luong (cho phép âm).
create or replace function public._ghi_so_dieu_chinh(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

-- -----------------------------------------------------------------------------
-- Cập nhật tiến độ đơn đặt hàng theo các phiếu xuất đã ghi sổ.
-- -----------------------------------------------------------------------------
create or replace function public._cap_nhat_tien_do_ddh(p_ddh_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_con_thieu integer;
  v_da_xuat integer;
begin
  update public.don_dat_hang_dong d
  set so_luong_da_xuat = coalesce((
    select sum(ctd.so_luong)
    from public.chung_tu_dong ctd
    join public.chung_tu ct on ct.id = ctd.chung_tu_id
    where ct.don_dat_hang_id = p_ddh_id
      and ct.loai_ct = 'XUAT'
      and ct.trang_thai = 'HOAN_THANH'
      and ctd.san_pham_id = d.san_pham_id
  ), 0)
  where d.don_dat_hang_id = p_ddh_id;

  select count(*) into v_con_thieu
  from public.don_dat_hang_dong
  where don_dat_hang_id = p_ddh_id and so_luong_da_xuat < so_luong_dat;

  select count(*) into v_da_xuat
  from public.don_dat_hang_dong
  where don_dat_hang_id = p_ddh_id and so_luong_da_xuat > 0;

  update public.don_dat_hang
  set trang_thai = case
        when v_con_thieu = 0 then 'DA_XUAT_DU'::public.trang_thai_ddh
        when v_da_xuat > 0   then 'DA_XUAT_MOT_PHAN'::public.trang_thai_ddh
        else 'MOI'::public.trang_thai_ddh
      end
  where id = p_ddh_id and trang_thai <> 'DA_HUY';
end; $$;

-- -----------------------------------------------------------------------------
-- RPC công khai: điều phối, kiểm tra, ghi sổ.
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
      where kho_id = v_ct.kho_id and san_pham_id = v_dong.san_pham_id;

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
$$;

revoke all on function public._ghi_so_nhap(public.chung_tu, public.chung_tu_dong)       from public, anon, authenticated;
revoke all on function public._ghi_so_xuat(public.chung_tu, public.chung_tu_dong)       from public, anon, authenticated;
revoke all on function public._ghi_so_tra_ncc(public.chung_tu, public.chung_tu_dong)    from public, anon, authenticated;
revoke all on function public._ghi_so_tra_khach(public.chung_tu, public.chung_tu_dong)  from public, anon, authenticated;
revoke all on function public._ghi_so_chuyen_kho(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;
revoke all on function public._ghi_so_kiem_ke(public.chung_tu, public.chung_tu_dong)    from public, anon, authenticated;
revoke all on function public._ghi_so_dieu_chinh(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;
revoke all on function public._cap_nhat_tien_do_ddh(uuid)                               from public, anon, authenticated;

revoke all    on function public.ghi_so_chung_tu(uuid) from public, anon;
grant execute on function public.ghi_so_chung_tu(uuid) to authenticated;
