-- =============================================================================
-- 0098 — Sửa lỗi review PR #4 (quy chuẩn mã / combo / đánh số / đơn tạm)
--
-- 1. Phiếu nhập không còn ô giá (giao diện gửi đơn giá 0): dòng nhập đơn giá 0
--    lấy GIÁ VỐN HIỆN TẠI làm giá nhập — bình quân gia quyền giữ nguyên thay vì
--    bị kéo về 0 ở mỗi lần nhập.
-- 2. Kiểm kê: combo không có tồn riêng nên không nằm trong phạm vi kiểm kê
--    (trước đây duyệt phiên ở kho có combo thì ghi sổ chặn → cả phiên rollback).
-- 3. Combo:
--    - đổi sang Combo phải hết tồn ở TỪNG kho (không bù trừ K1 +5 / K2 −5);
--    - không đổi thành phần khi combo đang có chứng từ đã ghi sổ (chưa hủy) (khách trả tách
--      theo thành phần hiện tại — đổi công thức sẽ hoàn sai mã);
--    - khóa dòng mã thành phần khi lưu, chặn đua "đổi X sang combo" song song
--      với "đưa X vào combo khác";
--    - hoan_thanh_don kiểm xuất âm theo TỔNG từng mã thành phần của cả phiếu;
--    - phân tích tồn kho tính cả lượng thành phần bán ra qua combo.
-- 4. tao_don không người nhận: dùng lại đơn tạm trống của chính người bấm thay
--    vì cấp số mới mỗi lần bấm "Tạo đơn" rồi bỏ ngang.
-- 5. Lọc "Nội bộ" không gồm đơn tạm chưa chọn người nhận.
-- 6. Đánh số kiểu KiotViet (0095): bộ đếm liên tục khởi từ số lớn nhất đang có
--    cùng dạng, không cấp trùng số trên môi trường chưa chạy script dữ liệu.
-- =============================================================================

-- --- 1. _ghi_so_nhap: đơn giá 0 = "không nhập giá" -----------------------------
create or replace function public._ghi_so_nhap(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gia numeric(18,4) := p_dong.don_gia;
begin
  -- Phiếu nhập bỏ ô giá (chọn của người dùng): đơn giá 0 dùng giá vốn đang có,
  -- để trigger bình quân giữ nguyên giá vốn. Khóa dòng san_pham trước khi đọc —
  -- cùng thứ tự khóa với cap_nhat_ton_va_gia_von nên không đọc giá cũ khi có
  -- phiếu nhập cùng mã chạy song song.
  if coalesce(v_gia, 0) = 0 then
    select coalesce(sp.gia_von, 0) into v_gia
    from public.san_pham sp where sp.id = p_dong.san_pham_id for update;
  end if;

  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, p_dong.so_luong, v_gia,
    p_ct.id, p_dong.id
  );
end; $$;
revoke all on function public._ghi_so_nhap(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;

-- --- 2. Phạm vi kiểm kê bỏ combo ------------------------------------------------
CREATE OR REPLACE FUNCTION public._pham_vi_kiem_ke(p_chung_tu_id uuid)
 RETURNS TABLE(san_pham_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select sp.id
  from public.san_pham sp
  join public.chung_tu ct on ct.id = p_chung_tu_id
  left join public.ton_kho tk on tk.kho_id = ct.kho_id and tk.san_pham_id = sp.id
  where sp.loai_hang <> 'COMBO'  -- 0098: combo không có tồn riêng, kiểm theo mã thành phần
    and (ct.pham_vi_nhom_hang is null or sp.nhom_hang_id = any(ct.pham_vi_nhom_hang))
    and (
      (sp.dang_kinh_doanh and sp.kho_mac_dinh_id = ct.kho_id)
      or coalesce(tk.so_luong, 0) <> 0
    );
$function$;

-- --- 3a. Đổi sang Combo: hết tồn ở từng kho -----------------------------------
CREATE OR REPLACE FUNCTION public.kiem_doi_loai_hang()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ton numeric;
begin
  if new.loai_hang = old.loai_hang then
    return new;
  end if;
  if new.loai_hang = 'COMBO' then
    -- 0098: từng kho phải về 0 — tổng hai kho bằng 0 (K1 +5, K2 −5) vẫn treo tồn.
    select tk.so_luong into v_ton from public.ton_kho tk
    where tk.san_pham_id = new.id and tk.so_luong <> 0
    order by abs(tk.so_luong) desc limit 1;
    if v_ton is not null then
      raise exception 'Mã % còn tồn % ở một kho — combo không có tồn riêng. Xuất/điều chỉnh về 0 trước khi đổi sang Combo.',
        new.ma_hang, v_ton using errcode = '23514';
    end if;
    if exists (select 1 from public.thanh_phan_combo where thanh_phan_id = new.id) then
      raise exception 'Mã % đang là thành phần của combo khác — không lồng combo trong combo.', new.ma_hang
        using errcode = '23514';
    end if;
  elsif exists (select 1 from public.thanh_phan_combo where combo_id = new.id) then
    raise exception 'Combo % còn mã thành phần — xóa hết thành phần trước khi đổi về Hàng hóa.', new.ma_hang
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

-- --- 3b. Thành phần combo: khóa sau khi ghi sổ, khóa dòng thành phần ----------
CREATE OR REPLACE FUNCTION public.luu_thanh_phan_combo(p_combo_id uuid, p_thanh_phan jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_loai text;
  v_ma text;
  v_so int;
begin
  if not public.co_quyen('tao_ma_hang') then
    raise exception 'Chức vụ của bạn chưa có quyền Tạo mã hàng' using errcode = '42501';
  end if;

  select loai_hang, ma_hang into v_loai, v_ma from public.san_pham where id = p_combo_id for update;
  if v_loai is null then
    raise exception 'Không tìm thấy mã hàng %', p_combo_id using errcode = '23514';
  end if;
  if v_loai <> 'COMBO' then
    raise exception 'Mã % không phải loại Combo — đổi Loại hàng sang Combo trước khi khai thành phần.', v_ma
      using errcode = '23514';
  end if;
  -- 0098: khách trả combo tách theo thành phần HIỆN TẠI — đổi công thức sau
  -- khi đã bán sẽ hoàn sai mã. Công thức mới thì tạo mã combo mới.
  if exists (select 1 from public.chung_tu_dong d
             join public.chung_tu ct on ct.id = d.chung_tu_id
             where d.san_pham_id = p_combo_id and ct.trang_thai = 'HOAN_THANH') then
    raise exception 'Combo % đã có chứng từ ghi sổ — không đổi thành phần được (khách trả sẽ hoàn sai mã). Tạo mã combo mới cho công thức mới.', v_ma
      using errcode = '23514';
  end if;

  if p_thanh_phan is null or jsonb_typeof(p_thanh_phan) <> 'array' then
    raise exception 'Danh sách thành phần phải là một mảng' using errcode = '23514';
  end if;

  create temp table if not exists _tp_moi (thanh_phan_id uuid, so_luong numeric) on commit drop;
  truncate _tp_moi;
  insert into _tp_moi
  select (e->>'thanh_phan_id')::uuid, (e->>'so_luong')::numeric
  from jsonb_array_elements(p_thanh_phan) e;

  if exists (select 1 from _tp_moi where thanh_phan_id is null or so_luong is null or so_luong <= 0) then
    raise exception 'Mỗi thành phần phải có mã và số lượng lớn hơn 0' using errcode = '23514';
  end if;
  if exists (select 1 from _tp_moi where thanh_phan_id = p_combo_id) then
    raise exception 'Combo không chứa được chính nó' using errcode = '23514';
  end if;
  if exists (select thanh_phan_id from _tp_moi group by thanh_phan_id having count(*) > 1) then
    raise exception 'Một mã thành phần chỉ khai một lần — cộng số lượng lại' using errcode = '23514';
  end if;
  if exists (select 1 from _tp_moi t left join public.san_pham sp on sp.id = t.thanh_phan_id where sp.id is null) then
    raise exception 'Có mã thành phần không tồn tại' using errcode = '23514';
  end if;
  -- 0098: khóa dòng các mã thành phần (theo id để không deadlock) trước khi đọc
  -- loai_hang — đổi X sang combo song song phải chờ, rồi thấy X đã là combo.
  perform 1 from public.san_pham sp
  where sp.id in (select thanh_phan_id from _tp_moi)
  order by sp.id
  for update;

  select string_agg(sp.ma_hang, ', ') into v_ma
  from _tp_moi t join public.san_pham sp on sp.id = t.thanh_phan_id
  where sp.loai_hang = 'COMBO';
  if v_ma is not null then
    raise exception 'Không lồng combo trong combo: % là combo', v_ma using errcode = '23514';
  end if;

  delete from public.thanh_phan_combo where combo_id = p_combo_id;
  insert into public.thanh_phan_combo (combo_id, thanh_phan_id, so_luong)
  select p_combo_id, thanh_phan_id, so_luong from _tp_moi;
  get diagnostics v_so = row_count;
  return v_so;
end;
$function$;

-- --- 3c. hoan_thanh_don: kiểm xuất âm theo tổng từng mã -------------------------
CREATE OR REPLACE FUNCTION public.hoan_thanh_don(p_don_id uuid, p_ly_do_xuat_am text DEFAULT NULL::text, p_ghi_chu_ly_do text DEFAULT NULL::text)
 RETURNS chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- 0098: cộng TỔNG theo (mã, kho) — một mã vừa trong combo vừa ở dòng riêng
    -- thì từng dòng không âm nhưng cả phiếu âm (ghi_so sẽ chặn bằng uuid).
    select string_agg(
             format('%s (tồn %s, xuất %s)', sp.ma_hang,
                    trim_scale(coalesce(tk.so_luong, 0)), trim_scale(x.so_luong)),
             '; ' order by sp.ma_hang)
      into v_am
    from (
      select t.san_pham_id, coalesce(ctd.kho_id, v_ct.kho_id) as kho_id, sum(t.so_luong) as so_luong
      from public.chung_tu_dong ctd
      cross join lateral public._tach_combo(ctd.san_pham_id, ctd.so_luong) t
      where ctd.chung_tu_id = v_ct.id
      group by t.san_pham_id, coalesce(ctd.kho_id, v_ct.kho_id)
    ) x
    join public.san_pham sp on sp.id = x.san_pham_id
    left join public.ton_kho tk on tk.san_pham_id = x.san_pham_id and tk.kho_id = x.kho_id
    where coalesce(tk.so_luong, 0) - x.so_luong < 0;

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
$function$;

-- --- 3d. Phân tích tồn kho tính lượng thành phần bán qua combo ----------------------
-- Một dòng chứng từ → chính mã đó + (nếu là combo) từng mã thành phần. Combo giữ
-- số bán của chính nó; thành phần cộng thêm phần bán qua combo. Dùng công thức
-- hiện tại — đúng vì 3b khóa công thức khi combo đã ghi sổ.
create or replace function public._ma_ban_ra(p_san_pham_id uuid, p_so_luong numeric)
returns table (san_pham_id uuid, so_luong numeric)
language sql stable security definer set search_path = '' as $$
  select p_san_pham_id, p_so_luong
  union all
  select t.san_pham_id, t.so_luong
  from public._tach_combo(p_san_pham_id, p_so_luong) t
  where t.san_pham_id <> p_san_pham_id;
$$;
revoke all on function public._ma_ban_ra(uuid, numeric) from public, anon, authenticated;

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
  if p_so_ngay is null or p_so_ngay not between 1 and 365 then
    raise exception 'Kỳ phân tích phải từ 1 đến 365 ngày' using errcode = '22023';
  end if;

  v_tu := p_ngay - (p_so_ngay - 1);

  -- Hóa đơn đối tác đầu tiên của hệ: kỳ dài hơn dữ liệu đang có thì chia theo
  -- số ngày thật, không chia cho những ngày hệ chưa chạy.
  select min(ct.ngay_ct) into v_dau
  from public.chung_tu ct
  where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
    and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) and ct.ngay_ct <= p_ngay;

  v_so_ngay_thuc := case when v_dau is null then 0 else least(p_so_ngay, p_ngay - v_dau + 1) end;
  -- Mốc chia đôi trên đoạn có dữ liệu thật (biểu đồ nhịp bán: % thay đổi).
  v_giua := p_ngay - (v_so_ngay_thuc - 1) + v_so_ngay_thuc / 2;

  return query
  with ban as (
    -- Hóa đơn đối tác đã ghi sổ trong kỳ.
    select x.san_pham_id as sp_id, ct.ngay_ct as ngay, x.so_luong as sl
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    cross join lateral public._ma_ban_ra(d.san_pham_id, d.so_luong) x
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id))
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or x.san_pham_id = p_san_pham_id)
    union all
    -- Khách trả cho hóa đơn đối tác: trừ, theo ngày phiếu trả.
    select x.san_pham_id, ct.ngay_ct, -x.so_luong
    from public.chung_tu ct
    join public.chung_tu goc on goc.id = ct.chung_tu_goc_id
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    cross join lateral public._ma_ban_ra(d.san_pham_id, d.so_luong) x
    where ct.loai_ct = 'TRA_KHACH' and ct.trang_thai = 'HOAN_THANH'
      and goc.loai_ct = 'XUAT' and (goc.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = goc.id))
      and ct.ngay_ct between v_tu and p_ngay
      and (p_san_pham_id is null or x.san_pham_id = p_san_pham_id)
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
    select x.san_pham_id as sp_id, max(ct.ngay_ct) as ngay
    from public.chung_tu ct
    join public.chung_tu_dong d on d.chung_tu_id = ct.id
    cross join lateral public._ma_ban_ra(d.san_pham_id, d.so_luong) x
    where ct.loai_ct = 'XUAT' and ct.trang_thai = 'HOAN_THANH'
      and (ct.doi_tac_id is not null or not exists (select 1 from public.chung_tu_nguoi_nhan ctn where ctn.chung_tu_id = ct.id)) and ct.ngay_ct <= p_ngay
      and (p_san_pham_id is null or x.san_pham_id = p_san_pham_id)
    group by x.san_pham_id
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

-- --- 4. tao_don: dùng lại đơn tạm trống ----------------------------------------
CREATE OR REPLACE FUNCTION public.tao_don(p_doi_tac_id uuid DEFAULT NULL::uuid, p_nguoi_nhan_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ids uuid[];
  v_so text;
  v_id uuid;
  v_loi text;
begin
  -- Bỏ trùng và NULL, giữ thứ tự xuất hiện đầu tiên.
  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (select u.id, min(u.ord) as ord
        from unnest(coalesce(p_nguoi_nhan_ids, '{}')) with ordinality u(id, ord)
        where u.id is not null group by u.id) s;

  -- 0098: bấm "Tạo đơn" (chưa đối tác, chưa người nhận) rồi bỏ ngang để lại một
  -- đơn tạm trống đã cấp số. Lần bấm sau dùng lại đơn trống đó của chính người
  -- bấm thay vì cấp thêm số.
  if p_doi_tac_id is null and cardinality(v_ids) = 0 then
    if not public.co_quyen('tao_don') then
      raise exception 'Chức vụ của bạn chưa có quyền Tạo đơn đặt hàng' using errcode = '42501';
    end if;
    select d.id into v_id
    from public.don_dat_hang d
    where d.trang_thai = 'TAM' and d.nguoi_tao_id = (select auth.uid())
      and d.doi_tac_id is null and d.ghi_chu is null
      and not exists (select 1 from public.don_dat_hang_dong x where x.don_dat_hang_id = d.id)
      and not exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = d.id)
    order by d.created_at desc
    limit 1
    for update skip locked;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  -- Cấp số trước: kiểm quyền tao_don (42501) nằm trong sinh_so_dh.
  v_so := public.sinh_so_dh();


  select string_agg(coalesce(nv.ten_day_du, i.id::text), ', ') into v_loi
  from unnest(v_ids) i(id)
  left join public.nhan_vien_phu_trach nv on nv.id = i.id
  where nv.id is null or not nv.dang_dung;
  if v_loi is not null then
    raise exception 'Nhân viên % đã ngừng dùng hoặc không tồn tại', v_loi using errcode = '23514';
  end if;

  insert into public.don_dat_hang (so_dh, doi_tac_id) values (v_so, p_doi_tac_id) returning id into v_id;

  insert into public.don_dat_hang_nguoi_nhan (don_dat_hang_id, nguoi_nhan_id, thu_tu)
  select v_id, u.id, u.ord from unnest(v_ids) with ordinality u(id, ord);

  return v_id;
end $function$;

-- --- 5. Lọc Nội bộ bỏ đơn chưa có người nhận ------------------------------------
CREATE OR REPLACE FUNCTION public.danh_sach_don(p_trang_thai trang_thai_ddh DEFAULT NULL::trang_thai_ddh, p_doi_tac_id uuid DEFAULT NULL::uuid, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50, p_loai_nhan text DEFAULT NULL::text, p_nguoi_nhan_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, so_dh text, ngay_dh date, trang_thai trang_thai_ddh, ngay_giao_du_kien date, doi_tac_id uuid, ten_doi_tac text, nguoi_nhan_ids uuid[], ten_nguoi_nhan text[], so_dong bigint, tong_so_luong_dat numeric, tong_so_luong_da_xuat numeric, ho_ten_nguoi_tao text, ghi_chu text, created_at timestamp with time zone, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
  v_kich_thuoc integer := least(greatest(coalesce(p_kich_thuoc, 50), 1), 200);
  v_trang integer := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_loai_nhan is not null and p_loai_nhan not in ('DOI_TAC', 'NOI_BO') then
    raise exception 'Loại người nhận không hợp lệ: %', p_loai_nhan using errcode = '22023';
  end if;

  return query
  with loc as (
    select dh.*
    from public.don_dat_hang dh
    where (p_trang_thai is null or dh.trang_thai = p_trang_thai)
      and (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
      and (p_loai_nhan  is null
           or (p_loai_nhan = 'NOI_BO'  and dh.doi_tac_id is null
               -- 0098: đơn tạm chưa chọn người nhận không phải "Nội bộ".
               and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null))
      -- Cấp đơn đã bao cấp dòng (bất biến D1: người ở dòng luôn có ở đơn).
      and (p_nguoi_nhan_id is null or exists (
            select 1 from public.don_dat_hang_nguoi_nhan ddn
            where ddn.don_dat_hang_id = dh.id and ddn.nguoi_nhan_id = p_nguoi_nhan_id))
      and (p_tu_ngay    is null or dh.ngay_dh >= p_tu_ngay)
      and (p_den_ngay   is null or dh.ngay_dh <= p_den_ngay)
      and (
        v_tu_khoa is null
        or dh.so_dh ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = dh.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1
          from public.don_dat_hang_nguoi_nhan ddn
          join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
          where ddn.don_dat_hang_id = dh.id
            and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  ), dem as (select count(*) as tong from loc)
  select
    l.id, l.so_dh, l.ngay_dh, l.trang_thai, l.ngay_giao_du_kien, l.doi_tac_id,
    dt.ten,
    nn.nguoi_nhan_ids, nn.ten_nguoi_nhan,
    (select count(*) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_dat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    (select coalesce(sum(d.so_luong_da_xuat), 0) from public.don_dat_hang_dong d where d.don_dat_hang_id = l.id),
    nd.ho_ten,
    l.ghi_chu, l.created_at,
    (select tong from dem)
  from loc l
  left join public.doi_tac dt    on dt.id = l.doi_tac_id
  left join lateral (
    select coalesce(array_agg(ddn.nguoi_nhan_id order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as nguoi_nhan_ids,
           coalesce(array_agg(nvp.ten_day_du     order by ddn.thu_tu, ddn.nguoi_nhan_id), '{}') as ten_nguoi_nhan
    from public.don_dat_hang_nguoi_nhan ddn
    join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
    where ddn.don_dat_hang_id = l.id
  ) nn on true
  left join public.nguoi_dung nd on nd.id = l.nguoi_tao_id
  order by l.ngay_dh desc, l.so_dh desc
  limit v_kich_thuoc
  offset (v_trang - 1) * v_kich_thuoc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dem_don_theo_trang_thai(p_doi_tac_id uuid DEFAULT NULL::uuid, p_tu_ngay date DEFAULT NULL::date, p_den_ngay date DEFAULT NULL::date, p_tu_khoa text DEFAULT NULL::text, p_loai_nhan text DEFAULT NULL::text, p_nguoi_nhan_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(trang_thai trang_thai_ddh, so_don bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  v_tu_khoa text := nullif(trim(coalesce(p_tu_khoa, '')), '');
begin
  if v_vai is null then
    raise exception 'Chưa đăng nhập' using errcode = '42501';
  end if;
  if p_loai_nhan is not null and p_loai_nhan not in ('DOI_TAC', 'NOI_BO') then
    raise exception 'Loại người nhận không hợp lệ: %', p_loai_nhan using errcode = '22023';
  end if;

  return query
  with loc as (
    select dh.*
    from public.don_dat_hang dh
    where (p_doi_tac_id is null or dh.doi_tac_id = p_doi_tac_id)
      and (p_loai_nhan  is null
           or (p_loai_nhan = 'NOI_BO'  and dh.doi_tac_id is null
               -- 0098: đơn tạm chưa chọn người nhận không phải "Nội bộ".
               and exists (select 1 from public.don_dat_hang_nguoi_nhan x where x.don_dat_hang_id = dh.id))
           or (p_loai_nhan = 'DOI_TAC' and dh.doi_tac_id is not null))
      and (p_nguoi_nhan_id is null or exists (
            select 1 from public.don_dat_hang_nguoi_nhan ddn
            where ddn.don_dat_hang_id = dh.id and ddn.nguoi_nhan_id = p_nguoi_nhan_id))
      and (p_tu_ngay    is null or dh.ngay_dh >= p_tu_ngay)
      and (p_den_ngay   is null or dh.ngay_dh <= p_den_ngay)
      and (
        v_tu_khoa is null
        or dh.so_dh ilike '%' || v_tu_khoa || '%'
        or exists (
          select 1 from public.doi_tac dt
          where dt.id = dh.doi_tac_id
            and public.f_unaccent(dt.ten) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
        or exists (
          select 1
          from public.don_dat_hang_nguoi_nhan ddn
          join public.nhan_vien_phu_trach nvp on nvp.id = ddn.nguoi_nhan_id
          where ddn.don_dat_hang_id = dh.id
            and public.f_unaccent(nvp.ten_day_du) ilike '%' || public.f_unaccent(v_tu_khoa) || '%'
        )
      )
  )
  select v.d_tt, coalesce(c.d_so, 0)::bigint
  from unnest(enum_range(null::public.trang_thai_ddh)) as v(d_tt)
  left join (select l.trang_thai as d_tt, count(*) as d_so from loc l group by l.trang_thai) c
    on c.d_tt = v.d_tt
  order by v.d_tt;
end;
$function$;

-- --- 6. Bộ đếm liên tục khởi từ số lớn nhất đang có ------------------------------
-- Chỉ NÂNG bộ đếm (greatest) — môi trường đã chạy data/doi-so-kieu-kiotviet.sql
-- giữ nguyên. Môi trường chưa có số kiểu mới thì không đổi gì (bắt đầu từ 1).
insert into public.chuoi_so_ct (loai_ct, nam, nguon, so_hien_tai)
select c.loai_ct, 0, c.nguon, max(substring(ct.so_ct from '^' || c.tien_to || '(\d+)$')::int)
from public.cau_hinh_so_ct c
join public.chung_tu ct on ct.loai_ct = c.loai_ct and ct.so_ct ~ ('^' || c.tien_to || '\d+$')
where not c.theo_nam
group by c.loai_ct, c.nguon
on conflict (loai_ct, nam, nguon)
do update set so_hien_tai = greatest(public.chuoi_so_ct.so_hien_tai, excluded.so_hien_tai);

insert into public.chuoi_so_dh (nam, so_hien_tai)
select 0, max(substring(so_dh from '^DH(\d+)$')::int)
from public.don_dat_hang where so_dh ~ '^DH\d+$'
having count(*) > 0
on conflict (nam)
do update set so_hien_tai = greatest(public.chuoi_so_dh.so_hien_tai, excluded.so_hien_tai);

-- --- 7. Mô tả bị chép nhầm ghi chú tự sinh ------------------------------------
-- 0086 chuyển ghi_chu cũ sang mo_ta. Môi trường nạp lại dữ liệu SAU khi đã có
-- 0086 thì ghi_chu cũ chính là chuỗi tự sinh "Thiếu: …" — Mô tả hiện y hệt Ghi
-- chú. Chỉ xóa đúng trường hợp trùng khớp chuỗi tự sinh; replica để không kích
-- nhật ký sửa / updated_at (đây là dọn dữ liệu, không phải người sửa mã).
set local session_replication_role = replica;
update public.san_pham
set mo_ta = null
where mo_ta is not null
  and mo_ta = public.ghi_chu_quy_chuan(hang_xe, dong_xe, linh_kien, cong_doan_id);
set local session_replication_role = origin;
