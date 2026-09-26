-- =============================================================================
-- 0069 — RPC bao_cao_xuat_am(p_ngay): báo cáo xuất âm theo ngày (TQAN-06)
--
-- Không có cột lũy kế nào sẵn trên kho_movement (sổ cái append-only, chỉ ghi
-- so_luong dương/âm của từng dòng — xem 0008_so_cai_ton_kho.sql). "Tồn sau"
-- CHƯA TỪNG được lưu ở đâu: nơi duy nhất từng tính ra một con số tồn tạm thời
-- là VÒNG LẶP TRONG ghi_so_chung_tu (0051) để quyết có ép chọn lý do xuất âm
-- hay không, và con số đó không được giữ lại sau khi ghi sổ. Hàm này dựng lại
-- đúng con số đó bằng window function, tái dùng kỹ thuật đã kiểm chứng ở
-- the_kho_san_pham (0059/0062), nhưng lũy kế theo (kho_id, san_pham_id) —
-- không theo một mã như 0059 — vì tồn được theo dõi RIÊNG TỪNG KHO
-- (ton_kho PK là (kho_id, san_pham_id)).
--
-- Thứ tự lũy kế BẮT BUỘC là (m.created_at, d.created_at, d.id, m.id), TUYỆT ĐỐI
-- KHÔNG dùng kho_movement.ngay: ngay được gán từ chung_tu.ngay_ct (kiểu date)
-- ép sang timestamptz nên MỌI dòng cùng ngày chứng từ rơi đúng nửa đêm và hòa
-- nhau — đây chính là lỗi đã xảy ra thật và được sửa ở 0059 (xem 05-LIVE-DEFS.md).
-- created_at tăng chặt vì mỗi insert kho_movement chạy trong một transaction
-- giữ khóa dòng san_pham (bước 1 của trigger cap_nhat_ton_va_gia_von,
-- 0008_so_cai_ton_kho.sql) — đây là thứ tự nhân quả thật của tồn kho, không
-- phải suy diễn. d.created_at/d.id chỉ để phá hòa khi hai dòng CÙNG một phiếu
-- (cùng created_at của kho_movement vì cùng một transaction ghi sổ) — vòng lặp
-- ghi_so_chung_tu (0051) tự nó đi theo thứ tự chung_tu_dong (created_at, id).
-- =============================================================================

create or replace function public.bao_cao_xuat_am(
  p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date
)
returns table (
  dong_id uuid,
  chung_tu_id uuid,
  so_ct text,
  loai_ct text,
  kho_id uuid,
  ten_kho text,
  san_pham_id uuid,
  ma_hang text,
  ten_hang text,
  so_luong_xuat numeric,
  ton_sau numeric,
  nguoi_lap text,
  ly_do_xuat_am text,
  ghi_chu_ly_do text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  -- SECURITY DEFINER bỏ qua RLS/quyền cột nên phải tự kiểm vai trò TƯỜNG MINH
  -- tại đây (D-12 — "phân quyền bằng RLS/database, không bằng giao diện").
  if coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ quản lý xem được báo cáo xuất âm' using errcode = '42501';
  end if;

  return query
  with ung_vien as (
    -- Chỉ những dòng CÓ THỂ đưa tồn xuống âm: XUAT/TRA_NCC, đã ghi sổ, không
    -- phải bút toán đảo, đúng ngày báo cáo (D-02, D-03). Phiếu DA_HUY và
    -- NHAP_LIEU (không có trong sổ cái) không bao giờ xuất hiện ở đây.
    select m.id
    from public.kho_movement m
    join public.chung_tu ct on ct.id = m.chung_tu_id
    where ct.ngay_ct = p_ngay
      and ct.loai_ct in ('XUAT', 'TRA_NCC')
      and ct.trang_thai = 'HOAN_THANH'
      and m.la_but_toan_dao = false
  ),
  cap as (
    -- Chỉ tính lũy kế cho các cặp (kho, mã) THẬT SỰ có dòng ứng viên hôm đó —
    -- tránh window function quét toàn bộ kho_movement mỗi lần mở trang.
    select distinct m.kho_id, m.san_pham_id
    from public.kho_movement m
    join ung_vien uv on uv.id = m.id
  ),
  luy_ke as (
    -- Lũy kế trên MỌI movement của các cặp trong `cap` (kể cả bút toán đảo,
    -- phiếu khác loại, mọi ngày) — đúng lịch sử thật của (kho, mã) đó, không
    -- chỉ riêng ngày báo cáo.
    select
      m.id, m.kho_id, m.san_pham_id, m.chung_tu_id, m.chung_tu_dong_id, m.so_luong,
      m.created_at,
      sum(m.so_luong) over (
        partition by m.kho_id, m.san_pham_id
        order by m.created_at, d.created_at, d.id, m.id
        rows unbounded preceding
      ) as ton_sau
    from public.kho_movement m
    join cap c on c.kho_id = m.kho_id and c.san_pham_id = m.san_pham_id
    left join public.chung_tu_dong d on d.id = m.chung_tu_dong_id
  )
  select
    l.id                as dong_id,
    ct.id               as chung_tu_id,
    ct.so_ct            as so_ct,
    ct.loai_ct::text    as loai_ct,
    l.kho_id            as kho_id,
    k.ten               as ten_kho,
    l.san_pham_id       as san_pham_id,
    sp.ma_hang          as ma_hang,
    sp.ten_hang         as ten_hang,
    -l.so_luong         as so_luong_xuat,
    l.ton_sau           as ton_sau,
    nd.ho_ten           as nguoi_lap,
    ct.ly_do_xuat_am    as ly_do_xuat_am,
    ct.ghi_chu_ly_do    as ghi_chu_ly_do
  from luy_ke l
  join ung_vien uv on uv.id = l.id
  join public.chung_tu ct on ct.id = l.chung_tu_id
  join public.kho k on k.id = l.kho_id
  join public.san_pham sp on sp.id = l.san_pham_id
  -- D-16: "người lập" = người TẠO phiếu, không phải người ghi sổ (nguoi_duyet_id).
  left join public.nguoi_dung nd on nd.id = ct.nguoi_tao_id
  where l.ton_sau < 0
  order by sp.ma_hang, k.ten, l.created_at, l.id;
end;
$function$;

revoke all    on function public.bao_cao_xuat_am(date) from public, anon;
grant execute on function public.bao_cao_xuat_am(date) to authenticated;

comment on function public.bao_cao_xuat_am(date) is
  'TQAN-06: báo cáo xuất âm theo ngày. Một dòng = một dòng phiếu XUAT/TRA_NCC đã ghi sổ đưa tồn (kho, mã) xuống dưới 0, dựng lại bằng window function trên kho_movement (thứ tự created_at, không phải ngay — bài học 0059). Chỉ quản lý gọi được (42501). Không đọc giá vốn (D-17).';
