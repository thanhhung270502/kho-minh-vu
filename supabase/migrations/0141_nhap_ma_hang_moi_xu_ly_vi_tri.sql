-- 0141: "Nhập mã hàng mới" dùng chung bố cục file với "Cập nhật mã hàng" (9 cột).
-- Hai cột file cập nhật có mà RPC chưa nhận theo từng dòng: "Xử lý" (cong_doan_id) và
-- "Vị trí" (kho_mac_dinh_id). Client khớp tên/mã trong file ra id (như dvt_id, nhom_hang_id).
--
-- Tồn đầu vẫn ghi vào MỘT phiếu DIEU_CHINH ở kho chọn trên hộp thoại (p_kho_id) — "Vị trí"
-- chỉ là kho mặc định của mã mới, không tách phiếu theo kho.
--
-- Thân hàm chép NGUYÊN định nghĩa đang chạy (pg_get_functiondef, = 0088), chỉ đổi các dòng "-- 0141".

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
    if coalesce(nullif(v_dong->>'loai_hang', ''), 'HANG_HOA') not in ('HANG_HOA', 'COMBO') then
      v_ly_do := array_append(v_ly_do, 'Loại hàng phải là Hàng hóa hoặc Combo');
    end if;
    -- 0088: combo không có tồn riêng — tồn nằm ở các mã thành phần.
    if v_dong->>'loai_hang' = 'COMBO' and v_ton <> 0 then
      v_ly_do := array_append(v_ly_do, 'Combo không có tồn riêng — để trống tồn kho, nhập tồn cho mã thành phần');
    end if;
    -- 0141: Xử lý / Vị trí (kho mặc định) theo từng dòng, như file cập nhật mã hàng.
    if nullif(v_dong->>'cong_doan_id', '') is not null
       and not exists (select 1 from public.cong_doan where id = (v_dong->>'cong_doan_id')::uuid) then
      v_ly_do := array_append(v_ly_do, 'Xử lý không còn trong danh mục');
    end if;
    if nullif(v_dong->>'kho_mac_dinh_id', '') is not null
       and not exists (
         select 1 from public.kho where id = (v_dong->>'kho_mac_dinh_id')::uuid and dang_hoat_dong
       ) then
      v_ly_do := array_append(v_ly_do, 'Vị trí (kho mặc định) không còn hoạt động');
    end if;
    if nullif(v_dong->>'ma_xu_ly', '') is not null
       and not exists (select 1 from public.cong_doan where upper(ma_quy_chuan) = upper(v_dong->>'ma_xu_ly')) then
      v_ly_do := array_append(v_ly_do, 'Xử lý không có trong quy chuẩn');
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
      ma_hang, ten_hang, dvt_id, cong_doan_id, nhom_hang_id, loai_hang,
      hang_xe, dong_xe, linh_kien,
      dang_kinh_doanh, duoc_ban_truc_tiep, vi_tri_ke, mo_ta, kho_mac_dinh_id
    )
    select d->>'ma_hang', d->>'ten_hang', (d->>'dvt_id')::uuid,
           -- 0141: cột "Xử lý" trong file trước; 0086: không có thì theo quy chuẩn
           -- (tách từ mã), không nữa thì Mua ngoài.
           coalesce(nullif(d->>'cong_doan_id', '')::uuid,
                    (select cd.id from public.cong_doan cd
                     where upper(cd.ma_quy_chuan) = upper(nullif(d->>'ma_xu_ly', ''))), v_cong_doan),
           nullif(d->>'nhom_hang_id', '')::uuid,
           coalesce(nullif(d->>'loai_hang', ''), 'HANG_HOA'),
           nullif(trim(coalesce(d->>'hang_xe', '')), ''),
           nullif(trim(coalesce(d->>'dong_xe', '')), ''),
           nullif(trim(coalesce(d->>'linh_kien', '')), ''),
           coalesce((d->>'dang_kinh_doanh')::boolean, true),
           coalesce((d->>'duoc_ban_truc_tiep')::boolean, true),
           nullif(trim(coalesce(d->>'vi_tri_ke', '')), ''),
           -- 0086: "Mô tả" trong file vào mo_ta; ghi_chu do trigger tự sinh.
           nullif(trim(coalesce(d->>'mo_ta', '')), ''),
           -- 0141: cột "Vị trí" trong file; trống thì kho ghi tồn như trước.
           coalesce(nullif(d->>'kho_mac_dinh_id', '')::uuid, p_kho_id)
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

comment on function public.nhap_ma_hang_moi(jsonb, uuid, boolean) is
  'IMP-01..04: tạo mã hàng MỚI từ màn nhập Excel (cùng bố cục file cập nhật mã hàng). Dòng lỗi (trùng mã/tên trong file hoặc với danh mục — tên so không dấu; thiếu mã/tên/ĐVT; tồn âm hoặc không phải số; có tồn mà chưa chọn kho) bị bỏ qua kèm lý do, dòng hợp lệ vẫn nhập. Xử lý (cong_doan_id) và kho mặc định (kho_mac_dinh_id) theo từng dòng, trống thì Mua ngoài / p_kho_id. Tồn khác 0 vào sổ bằng MỘT phiếu DIEU_CHINH tự ghi sổ ở kho p_kho_id. p_chi_kiem_tra = true (mặc định) không ghi gì. Cần quyền tao_ma_hang.';
