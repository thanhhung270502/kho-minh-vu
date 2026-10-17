-- 0143: phiếu trả chép số CÒN ĐƯỢC TRẢ, và chặn ghi sổ khi trả vượt số trên chứng từ gốc.
--
-- Lỗi (17/10/2026, thử trên demo): trả hàng xong, bấm "Trả hàng" lần nữa vẫn bê nguyên số
-- của chứng từ gốc. HD009432 (30.000) đã ghi sổ hai phiếu trả TK000002, TK000003 mỗi phiếu
-- 30.000 — trả 60.000 trên hóa đơn 30.000, tồn tăng khống 30.000.
--
-- Sửa:
--   1. tao_phieu_tra: số mỗi dòng = số gốc − số đã trả ở các phiếu trả ĐÃ HOÀN THÀNH của
--      cùng chứng từ gốc. Gom theo mã hàng (kho của dòng trả sửa được nên không gom theo kho);
--      mã có nhiều dòng thì trừ dần từ dòng đầu. Dòng hết số không chép; hết sạch thì báo lỗi
--      trước khi cấp số phiếu.
--   2. Trigger chan_tra_vuot_so_goc: lúc phiếu trả chuyển sang HOAN_THANH, tổng số trả của
--      mỗi mã (phiếu này + các phiếu trả đã hoàn thành khác) không được vượt số gốc. Đặt ở
--      trigger để mọi đường ghi sổ (ghi_so_chung_tu, nhập Excel…) đều qua cùng một chốt.
--
-- Thân tao_phieu_tra chép NGUYÊN định nghĩa đang chạy (pg_get_functiondef, = 0130), chỉ đổi
-- các dòng "-- 0143".

-- --- 1. tao_phieu_tra --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tao_phieu_tra(p_goc_id uuid)
 RETURNS public.chung_tu
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_goc public.chung_tu;
  v_loai_tra public.loai_ct;
  v_so_ct text;
  v_ct public.chung_tu;
  v_so_dong_con int; -- 0143
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') not in ('quan_ly', 'van_phong') then
    raise exception 'Tài khoản không có quyền tạo phiếu trả hàng' using errcode = '42501';
  end if;
  -- 0130: hóa đơn và phiếu trả đi theo quyền Xác nhận / duyệt đơn — người chỉ có
  -- Tạo đơn đặt hàng không lập / duyệt / hủy được.
  if auth.uid() is not null and not public.co_quyen('xac_nhan_don') then
    raise exception 'Tài khoản chưa có quyền Xác nhận / duyệt đơn' using errcode = '42501';
  end if;

  select * into v_goc from public.chung_tu where id = p_goc_id for update;
  if v_goc.id is null then
    raise exception 'Không tìm thấy chứng từ %', p_goc_id using errcode = '23514';
  end if;

  if v_goc.trang_thai != 'HOAN_THANH' then
    raise exception 'Chứng từ % đang ở trạng thái %, chỉ chứng từ đã hoàn thành mới tạo được phiếu trả', -- 0143: đổi chữ
      v_goc.so_ct, v_goc.trang_thai
      using errcode = '23514';
  end if;

  v_loai_tra := case v_goc.loai_ct
    when 'XUAT' then 'TRA_KHACH'::public.loai_ct
    when 'NHAP' then 'TRA_NCC'::public.loai_ct
    else null
  end;

  if v_loai_tra is null then
    raise exception 'Chỉ tạo được phiếu trả từ phiếu nhập hoặc phiếu xuất' using errcode = '23514';
  end if;

  -- 0143: số còn được trả theo từng dòng gốc — bảng tạm dùng cho cả bước kiểm và bước chép.
  -- Mã có nhiều dòng thì số đã trả trừ dần từ dòng đầu: còn_i = kẹp(lũy_kế_i − đã_trả, 0, sl_i).
  drop table if exists pg_temp._tra_con_lai;
  create temp table _tra_con_lai on commit drop as -- search_path rỗng: đọc lại bằng pg_temp.
  select g.san_pham_id, g.don_gia, g.kho_id, g.created_at, g.id,
         g.so_luong, g.thanh_tien,
         greatest(0, least(g.so_luong, g.luy_ke - coalesce(da.sl, 0))) as con_lai
  from (
    select cd.*, sum(cd.so_luong) over (
      partition by cd.san_pham_id order by cd.created_at, cd.id
    ) as luy_ke
    from public.chung_tu_dong cd
    where cd.chung_tu_id = p_goc_id
  ) g
  left join (
    select d.san_pham_id, sum(d.so_luong) as sl
    from public.chung_tu_dong d
    join public.chung_tu t on t.id = d.chung_tu_id
    where t.chung_tu_goc_id = p_goc_id and t.trang_thai = 'HOAN_THANH'
    group by d.san_pham_id
  ) da on da.san_pham_id = g.san_pham_id;

  select count(*) into v_so_dong_con from pg_temp._tra_con_lai where con_lai > 0;
  if v_so_dong_con = 0 then
    raise exception 'Chứng từ % đã trả hết, không còn hàng để trả', v_goc.so_ct
      using errcode = '23514';
  end if;

  v_so_ct := public.sinh_so_ct(v_loai_tra);

  -- ck_tra_hang_co_goc (0007_chung_tu.sql dòng 40-42) tự chặn phần còn lại —
  -- RPC chỉ cần set đúng chung_tu_goc_id, không cần kiểm thêm ở tầng ứng dụng.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, doi_tac_id, chung_tu_goc_id)
  values (v_so_ct, v_loai_tra, v_goc.kho_id, v_goc.doi_tac_id, v_goc.id)
  returning * into v_ct;

  -- Bê dòng giữ nguyên kho_id của DÒNG GỐC — trả về đúng kho đã lấy hàng ra,
  -- không phải kho đầu phiếu. Văn phòng sửa số trả sau khi phiếu mở ra.
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  -- 0143: chép số còn được trả; dòng trả đủ giữ nguyên thành tiền gốc, dòng trả một phần tính lại.
  select v_ct.id, c.san_pham_id, c.con_lai, c.don_gia,
         case when c.con_lai = c.so_luong then c.thanh_tien else round(c.con_lai * c.don_gia) end,
         c.kho_id
  from pg_temp._tra_con_lai c
  where c.con_lai > 0
  order by c.created_at, c.id;

  update public.chung_tu
  set tong_so_luong = (select coalesce(sum(so_luong), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id),
      tong_tien     = (select coalesce(sum(thanh_tien), 0) from public.chung_tu_dong where chung_tu_id = v_ct.id)
  where id = v_ct.id;

  select * into v_ct from public.chung_tu where id = v_ct.id;

  -- KHÔNG dùng khối bắt-mọi-lỗi ở đây — cùng lý do đã ghi ở ghi_so_chung_tu
  -- (0011 dòng 243-245) và tao_phieu_xuat_tu_don (0056): giữ tính atomic.
  return v_ct;
end;
$function$;

-- --- 2. Chốt chặn trả vượt số gốc ------------------------------------------------
create function public._chan_tra_vuot_so_goc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vuot text;
begin
  select string_agg(
           format('%s (gốc %s, đã trả %s, phiếu này %s)',
             sp.ma_hang, trim_scale(coalesce(goc.sl, 0)), trim_scale(coalesce(da.sl, 0)),
             trim_scale(nay.sl)),
           '; ' order by sp.ma_hang)
  into v_vuot
  from (
    select d.san_pham_id, sum(d.so_luong) as sl
    from public.chung_tu_dong d
    where d.chung_tu_id = new.id
    group by d.san_pham_id
  ) nay
  join public.san_pham sp on sp.id = nay.san_pham_id
  left join (
    select d.san_pham_id, sum(d.so_luong) as sl
    from public.chung_tu_dong d
    where d.chung_tu_id = new.chung_tu_goc_id
    group by d.san_pham_id
  ) goc on goc.san_pham_id = nay.san_pham_id
  left join (
    select d.san_pham_id, sum(d.so_luong) as sl
    from public.chung_tu_dong d
    join public.chung_tu t on t.id = d.chung_tu_id
    where t.chung_tu_goc_id = new.chung_tu_goc_id
      and t.trang_thai = 'HOAN_THANH'
      and t.id <> new.id
    group by d.san_pham_id
  ) da on da.san_pham_id = nay.san_pham_id
  where nay.sl > coalesce(goc.sl, 0) - coalesce(da.sl, 0);

  if v_vuot is not null then
    raise exception 'Số trả vượt số còn lại trên chứng từ gốc: %', v_vuot
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public._chan_tra_vuot_so_goc() from public, anon, authenticated;

create trigger chan_tra_vuot_so_goc
  before update of trang_thai on public.chung_tu
  for each row
  when (
    new.trang_thai = 'HOAN_THANH'
    and old.trang_thai is distinct from 'HOAN_THANH'
    and new.loai_ct in ('TRA_KHACH', 'TRA_NCC')
  )
  execute function public._chan_tra_vuot_so_goc();
