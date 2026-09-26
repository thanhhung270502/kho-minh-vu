-- =============================================================================
-- 0070 — RPC nhip_ban(p_ngay): nhịp bán hôm nay so với hôm qua (TQAN-07).
--
-- Nỗi đau C — quản lý không biết hôm nay bán nhanh hay chậm. Bản hẹp thay cho
-- biểu đồ 30 ngày (TQAN-04 đã dời, hệ mới chưa chạy đủ dữ liệu). Chỉ đếm số
-- phiếu / số dòng / số mã khác nhau của phiếu XUAT đã ghi sổ, theo ngày chứng
-- từ (D-09, D-10) — không đọc don_dat_hang (đơn chưa xuất không tính).
--
-- Đơn giản nhất trong ba RPC của Phase 7 — không cần window function, chỉ một
-- lượt quét index idx_chung_tu_loai_ngay (0007). Khung hai ngày (p_ngay,
-- p_ngay - 1) dựng bằng CTE `khung` rồi LEFT JOIN với `dem` + coalesce, để
-- ngày không có phiếu nào vẫn trả về một dòng với ba số 0 (giao diện không
-- phải tự bù).
-- =============================================================================

create or replace function public.nhip_ban(
  p_ngay date default (now() at time zone 'Asia/Ho_Chi_Minh')::date
)
returns table (
  ngay date,
  so_phieu bigint,
  so_dong bigint,
  so_ma bigint
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
    raise exception 'Chỉ quản lý xem được trang tổng quan' using errcode = '42501';
  end if;

  return query
  select v.ngay, v.so_phieu, v.so_dong, v.so_ma
  from (
    with khung as (
      -- Tên cột khác tên biến OUT (d_ngay, không phải ngay) — tránh 42702 lúc
      -- GỌI hàm khi SELECT cuối chiếu ra cột trùng tên OUT parameter (bài học
      -- 0059 -> hotfix 0062).
      select p_ngay as d_ngay
      union all
      select p_ngay - 1
    ),
    dem as (
      -- Chỉ tính XUAT đã ghi sổ, trừ phiếu đã hủy (D-10). Không đọc
      -- don_dat_hang -- đơn chưa xuất không tính.
      select
        ct.ngay_ct                       as d_ngay,
        count(distinct ct.id)            as so_phieu,
        count(cd.id)                     as so_dong,
        count(distinct cd.san_pham_id)   as so_ma
      from public.chung_tu ct
      join public.chung_tu_dong cd on cd.chung_tu_id = ct.id
      where ct.loai_ct = 'XUAT'
        and ct.trang_thai = 'HOAN_THANH'
        and ct.ngay_ct in (p_ngay, p_ngay - 1)
      group by ct.ngay_ct
    )
    select
      k.d_ngay                        as ngay,
      coalesce(d.so_phieu, 0)         as so_phieu,
      coalesce(d.so_dong, 0)          as so_dong,
      coalesce(d.so_ma, 0)            as so_ma
    from khung k
    left join dem d on d.d_ngay = k.d_ngay
  ) v
  -- Hôm nay (p_ngay) trước, hôm qua sau.
  order by v.ngay desc;
end;
$function$;

revoke all    on function public.nhip_ban(date) from public, anon;
grant execute on function public.nhip_ban(date) to authenticated;

comment on function public.nhip_ban(date) is
  'TQAN-07: nhịp bán hôm nay so với hôm qua — số phiếu xuất/số dòng/số mã khác nhau của phiếu XUAT đã ghi sổ, theo ngày chứng từ. Ngày không có phiếu vẫn trả dòng ba số 0. Chỉ đọc chung_tu/chung_tu_dong, không đọc đơn đặt hàng (D-10). Chỉ quản lý gọi được (42501). Không đọc giá vốn (D-17).';
