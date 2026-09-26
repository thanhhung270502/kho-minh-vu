-- =============================================================================
-- 0069 — RPC ton_theo_nhom(p_theo, p_kho_id): đếm mã theo nhóm hàng / công
-- đoạn theo trạng thái tồn (TQAN-01), để trang tổng quan bấm một con số là mở
-- `/ton-kho` lọc sẵn với ĐÚNG số dòng đó (D-08).
--
-- ĐỊNH NGHĨA TRẠNG THÁI CHÉP NGUYÊN VĂN TỪ 0067 (danh_sach_ton_kho) — đổi ở
-- một nơi phải đổi cả hai, pgTAP 93 đối chiếu chéo sẽ đỏ nếu lệch:
--   con_hang      : tong > 0
--   het_hang      : tong = 0
--   am            : tong < 0
--   duoi_dinh_muc : ton_toi_thieu > 0 and tong < ton_toi_thieu (mã chưa đặt
--                   định mức KHÔNG BAO GIỜ tính, kể cả tồn âm — 0067, UAT 05
--                   bài 7)
--
-- Hàm này chỉ cho quản lý (42501, D-12) nên CTE `ton` không cần lọc theo kho
-- được phân như danh_sach_ton_kho làm cho thủ kho — quản lý luôn thấy toàn bộ.
-- p_theo rẽ nhánh nhom/cong_doan bằng CASE, KHÔNG execute format (T-07-06) —
-- chỉ hai nhánh cố định, không có SQL động nào cần thiết.
-- =============================================================================

create or replace function public.ton_theo_nhom(
  p_theo text,
  p_kho_id uuid default null
)
returns table (
  nhom_id uuid,
  ten_nhom text,
  tong_ma bigint,
  con_hang bigint,
  het_hang bigint,
  am bigint,
  duoi_dinh_muc bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  -- SECURITY DEFINER bỏ qua RLS/quyền cột nên phải tự kiểm vai trò TƯỜNG MINH
  -- tại đây (D-12 — trang tổng quan chỉ dành cho quản lý).
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý xem được trang tổng quan' using errcode = '42501';
  end if;

  if p_theo is null or p_theo not in ('nhom', 'cong_doan') then
    raise exception 'Tham số p_theo chỉ nhận nhom hoặc cong_doan' using errcode = '22023';
  end if;

  return query
  select v.nhom_id, v.ten_nhom, v.tong_ma, v.con_hang, v.het_hang, v.am, v.duoi_dinh_muc
  from (
    with ton as (
      select tk.san_pham_id, sum(tk.so_luong) as tong
      from public.ton_kho tk
      where p_kho_id is null or tk.kho_id = p_kho_id
      group by tk.san_pham_id
    ), loc as (
      select sp.id, sp.nhom_hang_id, sp.cong_doan_id, sp.ton_toi_thieu,
             coalesce(ton.tong, 0) as tong
      from public.san_pham sp
      left join ton on ton.san_pham_id = sp.id
      -- D-17: cố định true, khớp mặc định p_dang_kinh_doanh của /ton-kho —
      -- trang tổng quan chỉ cần bức tranh "đang bán", không có tham số kinh
      -- doanh ở RPC này.
      where sp.dang_kinh_doanh = true
    ), gan as (
      select l.id, l.ton_toi_thieu, l.tong,
             case when p_theo = 'nhom' then l.nhom_hang_id else l.cong_doan_id end as nhom_id
      from loc l
    )
    select
      g.nhom_id as nhom_id,
      case when p_theo = 'nhom' then nh.ten else cd.ten end as ten_nhom,
      count(*) as tong_ma,
      count(*) filter (where g.tong > 0) as con_hang,
      count(*) filter (where g.tong = 0) as het_hang,
      count(*) filter (where g.tong < 0) as am,
      -- Chép nguyên văn điều kiện dưới định mức từ danh_sach_ton_kho (0067).
      count(*) filter (where g.ton_toi_thieu > 0 and g.tong < g.ton_toi_thieu) as duoi_dinh_muc
    from gan g
    left join public.nhom_hang nh on p_theo = 'nhom'      and nh.id = g.nhom_id
    left join public.cong_doan cd on p_theo = 'cong_doan' and cd.id = g.nhom_id
    group by g.nhom_id, nh.ten, cd.ten
  ) v
  -- Tên OUT parameter (ten_nhom, nhom_id, ...) trùng tên cột nên bắt buộc gắn
  -- tiền tố bảng ở SELECT/ORDER BY cuối, nếu không sẽ lỗi 42702 lúc GỌI hàm
  -- (bài học 0059 → hotfix 0062).
  order by v.ten_nhom asc nulls last;
end;
$function$;

revoke all    on function public.ton_theo_nhom(text, uuid) from public, anon;
grant execute on function public.ton_theo_nhom(text, uuid) to authenticated;

comment on function public.ton_theo_nhom(text, uuid) is
  'TQAN-01: đếm mã hàng theo nhóm hàng / công đoạn theo trạng thái tồn (con_hang/het_hang/am/duoi_dinh_muc), khớp tuyệt đối bộ lọc /ton-kho (danh_sach_ton_kho, 0067) để trang tổng quan bấm một con số mở đúng danh sách đó (D-08). Chỉ quản lý gọi được (42501). Không đọc giá vốn (D-17).';
