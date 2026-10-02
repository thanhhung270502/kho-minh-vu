-- =============================================================================
-- 0080 — Tổng giao dịch của đối tác (Phase 14, PANEL-02/03)
--
-- Bảng đối tác thêm cột "Tổng giao dịch". Hệ không dùng giá (giá = 0) nên
-- không có tiền: tổng giao dịch = SỐ CHỨNG TỪ ĐÃ GHI SỔ (HOAN_THANH) của đối tác
-- trên hệ mới (chốt 02/10/2026). Phiếu nháp và phiếu đã hủy không tính.
--
-- Tab "Lịch sử giao dịch" trong panel đối tác phải khớp đúng tổng đó:
--   * nhánh hệ thống chỉ còn phiếu HOAN_THANH;
--   * bỏ hai nhánh lưu trữ KiotViet — Phase 10 (GON-02) đã gỡ lịch sử KiotViet
--     khỏi giao diện; dữ liệu luu_tru_* vẫn giữ nguyên trong database.
--
-- danh_sach_doi_tac là `language sql` không security definer: đếm chung_tu chịu
-- RLS nên thủ kho thấy tổng của kho mình — nhất quán với lịch sử (lọc theo kho).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) danh_sach_doi_tac thêm tong_giao_dich — đổi kiểu trả về nên drop rồi create.
-- Đếm bằng subquery tương quan trên đúng các dòng của trang (sau limit), không
-- gom toàn bảng trước.
-- -----------------------------------------------------------------------------
drop function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int);

create function public.danh_sach_doi_tac(
  p_tu_khoa text default null,
  p_loai public.loai_doi_tac default null,
  p_dang_hoat_dong boolean default true,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
)
returns table(
  id uuid, ma text, ten text, loai public.loai_doi_tac, dien_thoai text, email text, dia_chi text,
  khu_vuc text, ma_so_thue text, ghi_chu text, dang_hoat_dong boolean, updated_at timestamptz,
  tong_so_dong bigint, tong_giao_dich bigint
)
language sql
stable
set search_path = ''
as $function$
  select tr.*,
         (select count(*) from public.chung_tu ct
          where ct.doi_tac_id = tr.id and ct.trang_thai = 'HOAN_THANH') as tong_giao_dich
  from (
    select d.id, d.ma, d.ten, d.loai, d.dien_thoai, d.email, d.dia_chi, d.khu_vuc, d.ma_so_thue,
           d.ghi_chu, d.dang_hoat_dong, d.updated_at, count(*) over () as tong_so_dong
    from public.doi_tac d
    where (nullif(trim(coalesce(p_tu_khoa,'')),'') is null
           or public.f_unaccent(coalesce(d.ma,'') || ' ' || coalesce(d.ten,'') || ' ' || coalesce(d.dien_thoai,''))
                ilike '%' || public.f_unaccent(trim(p_tu_khoa)) || '%')
      and (p_loai is null or d.loai = p_loai or d.loai = 'CA_HAI')
      and (p_dang_hoat_dong is null or d.dang_hoat_dong = p_dang_hoat_dong)
    order by d.ma
    limit least(greatest(coalesce(p_kich_thuoc,50),1),500)
    offset (greatest(coalesce(p_trang,1),1) - 1) * least(greatest(coalesce(p_kich_thuoc,50),1),500)
  ) tr
  order by tr.ma;
$function$;

revoke all    on function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int) from public, anon;
grant execute on function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int) to authenticated;
comment on function public.danh_sach_doi_tac(text, public.loai_doi_tac, boolean, int, int) is
  'Danh sách đối tác (lọc, phân trang) kèm tong_giao_dich = số chứng từ đã ghi sổ (0080).';

-- -----------------------------------------------------------------------------
-- (b) lich_su_giao_dich_doi_tac — thân hàm từ 0064, chỉ còn nhánh hệ thống và
-- chỉ phiếu đã ghi sổ. Kiểu trả về giữ nguyên (cột nguon luôn 'HE_THONG').
-- -----------------------------------------------------------------------------
create or replace function public.lich_su_giao_dich_doi_tac(p_doi_tac_id uuid, p_trang integer default 1, p_kich_thuoc integer default 50)
returns table(nguon text, ma_phieu text, chung_tu_id uuid, loai text, ngay timestamp with time zone, so_dong bigint, tong_so_luong numeric, ghi_chu text, tong_so_dong bigint)
language plpgsql
stable security definer
set search_path = ''
as $function$
#variable_conflict use_column
declare
  v_vai_tro    text   := (select public.vai_tro_hien_tai())::text;
  v_kho        uuid[] := coalesce((select public.kho_hien_tai()), '{}'::uuid[]);
  v_kich_thuoc int    := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
begin
  if v_vai_tro is null then
    raise exception 'Hết phiên hoặc tài khoản không còn hiệu lực' using errcode = '42501';
  end if;

  return query
  with tat_ca as (
    select 'HE_THONG'::text as nguon, ct.so_ct as ma_phieu, ct.id as chung_tu_id,
           ct.loai_ct::text as loai,
           coalesce(ct.ngay_ghi_so, ct.ngay_ct::timestamptz) as ngay,
           (select count(*) from public.chung_tu_dong cd where cd.chung_tu_id = ct.id) as so_dong,
           ct.tong_so_luong, ct.ghi_chu
    from public.chung_tu ct
    where ct.doi_tac_id = p_doi_tac_id
      -- 0080: chỉ phiếu đã ghi sổ — khớp tong_giao_dich của danh_sach_doi_tac.
      and ct.trang_thai = 'HOAN_THANH'
      and (v_vai_tro <> 'thu_kho'
           or ct.kho_id = any(v_kho)
           or ct.kho_den_id = any(v_kho))

  )
  select t.nguon, t.ma_phieu, t.chung_tu_id, t.loai, t.ngay, t.so_dong,
         t.tong_so_luong, t.ghi_chu, count(*) over ()
  from tat_ca t
  order by t.ngay desc nulls last
  limit v_kich_thuoc
  offset (greatest(coalesce(p_trang,1),1) - 1) * v_kich_thuoc;
end $function$;

revoke all    on function public.lich_su_giao_dich_doi_tac(uuid, int, int) from public, anon;
grant execute on function public.lich_su_giao_dich_doi_tac(uuid, int, int) to authenticated;
