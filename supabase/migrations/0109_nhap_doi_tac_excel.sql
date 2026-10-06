-- 0109: Nhập đối tác từ Excel (nhập mới + cập nhật).
--
-- SECURITY INVOKER: chạy bằng quyền người gọi — policy "them/sua doi tac" (quản lý,
-- văn phòng) chặn thật, nhật ký sửa ghi đúng người. Một lần gọi = một transaction:
-- kiểm hết, có lỗi thì không ghi gì.
--
--   p_kieu : 'moi'      — mỗi dòng một đối tác mới; mã trống thì cấp mã theo loại
--                         (sinh_ma_doi_tac, như nút "Thêm nhà cung cấp"); loại trống = NCC
--            'cap_nhat' — tìm theo mã; ô trống = giữ nguyên
--   p_dong : [{ dong, ma, ten, loai ('NCC'|'KHACH'|'CA_HAI'), dien_thoai, email,
--              dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong }]
--   (khóa snake_case là hợp đồng jsonb với route handler)
--
-- Trả: { committed, moi, sua, loi: [{dong, so, loi}], canh_bao: [] }

create or replace function public.nhap_doi_tac_excel(
  p_kieu text,
  p_dong jsonb,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_vai public.vai_tro := (select public.vai_tro_hien_tai());
  r record;
  v_ma text;
  v_moi integer := 0;
  v_sua integer := 0;
  v_loi jsonb;
begin
  if p_kieu is null or p_kieu not in ('moi', 'cap_nhat') then
    raise exception 'Kiểu nhập không hợp lệ: %', p_kieu using errcode = '22023';
  end if;
  if jsonb_typeof(p_dong) is distinct from 'array' then
    raise exception 'Dữ liệu phải là một mảng' using errcode = '22023';
  end if;
  if v_vai is null or v_vai not in ('quan_ly', 'van_phong') then
    raise exception 'Chỉ quản lý và văn phòng nhập được đối tác' using errcode = '42501';
  end if;

  drop table if exists _dt_dong, _dt_loi;
  create temp table _dt_loi (dong integer, so text, loi text) on commit drop;

  create temp table _dt_dong on commit drop as
  select
    coalesce((x->>'dong')::integer, 0)            as dong,
    nullif(trim(x->>'ma'), '')                    as ma,
    nullif(trim(x->>'ten'), '')                   as ten,
    nullif(x->>'loai', '')                        as loai,
    nullif(trim(x->>'dien_thoai'), '')            as dien_thoai,
    nullif(trim(x->>'email'), '')                 as email,
    nullif(trim(x->>'dia_chi'), '')               as dia_chi,
    nullif(trim(x->>'khu_vuc'), '')               as khu_vuc,
    nullif(trim(x->>'phuong_xa'), '')             as phuong_xa,
    nullif(trim(x->>'ma_so_thue'), '')            as ma_so_thue,
    nullif(trim(x->>'ghi_chu'), '')               as ghi_chu,
    (x->>'dang_hoat_dong')::boolean               as dang_hoat_dong,
    null::uuid                                    as id_cu
  from jsonb_array_elements(p_dong) as t(x);

  -- Mã cũ từ KiotViet có thể có dấu / chữ thường (vd. "NCC lẻ") — so không phân biệt hoa thường.
  update _dt_dong d set id_cu = dt.id from public.doi_tac dt where upper(dt.ma) = upper(d.ma);

  -- --- Kiểm lỗi ---------------------------------------------------------------
  insert into _dt_loi
  select min(d.dong), min(d.ma), 'Mã ' || min(d.ma) || ' lặp lại trong file' from _dt_dong d
  where d.ma is not null group by upper(d.ma) having count(*) > 1;


  insert into _dt_loi
  select d.dong, d.ma, 'Loại phải là Nhà cung cấp, Khách hàng hoặc Cả hai'
  from _dt_dong d where d.loai is not null and d.loai not in ('NCC', 'KHACH', 'CA_HAI');

  insert into _dt_loi
  select d.dong, d.ma, 'Số điện thoại chỉ gồm số và + ( ) . - (tối đa 20 ký tự)'
  from _dt_dong d where d.dien_thoai is not null and (d.dien_thoai !~ '^[0-9 +().-]*$' or length(d.dien_thoai) > 20);

  insert into _dt_loi
  select d.dong, d.ma, 'Email không hợp lệ: ' || d.email
  from _dt_dong d where d.email is not null and d.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';

  if p_kieu = 'moi' then
    insert into _dt_loi
    select d.dong, d.ma, 'Mã ' || d.ma || ' đã có — dùng "Cập nhật" nếu muốn sửa đối tác này'
    from _dt_dong d where d.id_cu is not null;

    insert into _dt_loi
    select d.dong, d.ma, 'Thiếu tên đối tác' from _dt_dong d where d.ten is null or length(d.ten) < 2;

    -- Mã mới theo quy tắc của form "Thêm nhà cung cấp"; mã cũ (cập nhật) giữ nguyên.
    insert into _dt_loi
    select d.dong, d.ma, 'Mã chỉ gồm chữ không dấu, số và . _ - (tối đa 32 ký tự)'
    from _dt_dong d where d.ma is not null and (d.ma !~* '^[A-Z0-9._-]+$' or length(d.ma) > 32);
  else
    insert into _dt_loi
    select d.dong, d.ma, 'Thiếu mã — Cập nhật tìm đối tác theo mã' from _dt_dong d where d.ma is null;

    insert into _dt_loi
    select d.dong, d.ma, 'Không có đối tác mã ' || d.ma || ' — dùng "Nhập mới" để thêm'
    from _dt_dong d where d.ma is not null and d.id_cu is null;
  end if;

  v_loi := coalesce((select jsonb_agg(jsonb_build_object('dong', l.dong, 'so', l.so, 'loi', l.loi) order by l.dong)
                     from _dt_loi l), '[]');

  if p_chi_kiem_tra or jsonb_array_length(v_loi) > 0 then
    return jsonb_build_object('committed', false, 'moi', 0, 'sua', 0, 'loi', v_loi, 'canh_bao', '[]'::jsonb);
  end if;

  -- --- Ghi ----------------------------------------------------------------------
  if p_kieu = 'moi' then
    -- Từng dòng một: mã trống được cấp theo mã lớn nhất HIỆN CÓ, nên phải chèn xong
    -- dòng trước rồi mới cấp mã cho dòng sau.
    for r in select * from _dt_dong order by dong loop
      v_ma := coalesce(upper(r.ma), public.sinh_ma_doi_tac(coalesce(r.loai, 'NCC')::public.loai_doi_tac));
      insert into public.doi_tac (ma, ten, loai, dien_thoai, email, dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong)
      values (v_ma, r.ten, coalesce(r.loai, 'NCC')::public.loai_doi_tac, r.dien_thoai, r.email, r.dia_chi,
              r.khu_vuc, r.phuong_xa, r.ma_so_thue, r.ghi_chu, coalesce(r.dang_hoat_dong, true));
      v_moi := v_moi + 1;
    end loop;
  else
    update public.doi_tac dt set
      ten            = coalesce(d.ten, dt.ten),
      loai           = coalesce(d.loai::public.loai_doi_tac, dt.loai),
      dien_thoai     = coalesce(d.dien_thoai, dt.dien_thoai),
      email          = coalesce(d.email, dt.email),
      dia_chi        = coalesce(d.dia_chi, dt.dia_chi),
      khu_vuc        = coalesce(d.khu_vuc, dt.khu_vuc),
      phuong_xa      = coalesce(d.phuong_xa, dt.phuong_xa),
      ma_so_thue     = coalesce(d.ma_so_thue, dt.ma_so_thue),
      ghi_chu        = coalesce(d.ghi_chu, dt.ghi_chu),
      dang_hoat_dong = coalesce(d.dang_hoat_dong, dt.dang_hoat_dong)
    from _dt_dong d where dt.id = d.id_cu;
    get diagnostics v_sua = row_count;
  end if;

  return jsonb_build_object('committed', true, 'moi', v_moi, 'sua', v_sua, 'loi', '[]'::jsonb, 'canh_bao', '[]'::jsonb);
end;
$$;

revoke all on function public.nhap_doi_tac_excel(text, jsonb, boolean) from public, anon;
grant execute on function public.nhap_doi_tac_excel(text, jsonb, boolean) to authenticated;
