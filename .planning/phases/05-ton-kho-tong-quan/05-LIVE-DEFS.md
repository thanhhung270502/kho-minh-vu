# Phase 5 — Định nghĩa ĐANG CHẠY trên database, đọc lúc thực thi

**Đọc lúc:** 2026-09-21 09:24 UTC, từ database cloud `kho-vu-tru` (`phonzyruoalimgaovljm`),
qua kết nối Supabase MCP của phiên điều phối.
**Migration mới nhất trên database:** `0057` (trùng với repo — không trôi).

Vì sao có file này: plan 05-02, 05-03, 05-04 bắt buộc đọc bản đang chạy trước khi sửa
(bài học Phase 4 — repo `0011` lạc hậu so với database). Agent thực thi không có kết nối
database, nên phiên điều phối đọc hộ và ghi ra đây. **Chép từ file này vào header
migration, không chép từ file migration cũ trong repo.**

---

## Cho plan 05-02 — `the_kho_san_pham`

```sql
CREATE OR REPLACE FUNCTION public.the_kho_san_pham(p_san_pham_id uuid, p_kho_id uuid DEFAULT NULL::uuid, p_trang integer DEFAULT 1, p_kich_thuoc integer DEFAULT 50)
 RETURNS TABLE(nguon text, ngay timestamp with time zone, kho_id uuid, ten_kho text, chung_tu_id uuid, so_ct text, loai_ct text, doi_tac text, so_luong_nhap numeric, so_luong_xuat numeric, gia_von_tai_thoi_diem numeric, la_but_toan_dao boolean, ghi_chu text, tong_so_dong bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_vai_tro public.vai_tro := (select public.vai_tro_hien_tai());
  v_kho uuid[] := (select public.kho_hien_tai());
  v_xem_gv boolean := (select public.co_quyen_xem_gia_von());
  v_xem_kv boolean;
  v_ma text;
  v_kt int := least(greatest(coalesce(p_kich_thuoc, 50), 1), 500);
  v_tr int := greatest(coalesce(p_trang, 1), 1);
begin
  if v_vai_tro is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa'
      using errcode = '42501';
  end if;
  v_xem_kv := v_vai_tro in ('quan_ly', 'van_phong');
  select sp.ma_hang into v_ma from public.san_pham sp where sp.id = p_san_pham_id;
  return query
  with tat_ca as (
    select 'HE_THONG'::text                                       as nguon,
           m.ngay                                                 as ngay,
           m.kho_id                                               as kho_id,
           k.ten                                                  as ten_kho,
           m.chung_tu_id                                          as chung_tu_id,
           ct.so_ct                                               as so_ct,
           ct.loai_ct::text                                       as loai_ct,
           dt.ten                                                 as doi_tac,
           case when m.so_luong > 0 then m.so_luong end           as so_luong_nhap,
           case when m.so_luong < 0 then -m.so_luong end          as so_luong_xuat,
           case when v_xem_gv then m.gia_von_tai_thoi_diem end    as gia_von_tai_thoi_diem,
           m.la_but_toan_dao                                      as la_but_toan_dao,
           ct.ghi_chu                                             as ghi_chu
    from public.kho_movement m
    join public.kho k on k.id = m.kho_id
    left join public.chung_tu ct on ct.id = m.chung_tu_id
    left join public.doi_tac dt on dt.id = ct.doi_tac_id
    where m.san_pham_id = p_san_pham_id
      and (v_vai_tro <> 'thu_kho' or m.kho_id = any(v_kho))
      and (p_kho_id is null or m.kho_id = p_kho_id)
    union all
    select 'KIOTVIET_NHAP'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
           l.ma_phieu, 'NHAP'::text, l.nha_cung_cap,
           l.so_luong, null::numeric, null::numeric, false, l.ghi_chu
    from public.luu_tru_nhap_kiotviet l
    where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
    union all
    select 'KIOTVIET_BAN'::text, l.ngay::timestamptz, null::uuid, null::text, null::uuid,
           l.ma_hoa_don, 'XUAT'::text, coalesce(nullif(l.ghi_chu, ''), l.khach_hang),
           null::numeric, l.so_luong, null::numeric, false, l.ghi_chu
    from public.luu_tru_hoa_don_kiotviet l
    where v_xem_kv and p_kho_id is null and l.ma_hang = v_ma
  )
  select t.nguon, t.ngay, t.kho_id, t.ten_kho, t.chung_tu_id, t.so_ct, t.loai_ct,
         t.doi_tac, t.so_luong_nhap, t.so_luong_xuat, t.gia_von_tai_thoi_diem,
         t.la_but_toan_dao, t.ghi_chu, count(*) over ()
  from tat_ca t
  order by t.ngay desc
  limit v_kt offset (v_tr - 1) * v_kt;
end;
$function$
```

**Nhận xét của phiên điều phối (để 05-02 đối chiếu):**
- 14 cột trả về, đúng như plan mô tả.
- Cột `ngay` là `timestamp with time zone`. Biến động từ `ghi_so_chung_tu` lấy
  `p_ct.ngay_ct` (kiểu `date`) nên mọi dòng của cùng một ngày chứng từ rơi đúng nửa đêm —
  **vẫn hòa nhau**, vẫn cần khóa phá hòa `created_at, id`.
- Bản đang chạy chỉ `order by t.ngay desc`, không khóa phá hòa — đúng cái lỗi 05-02 đang sửa.

---

## Cho plan 05-03 — ràng buộc `nhat_ky_sua_nguon_check`

```
CHECK ((nguon = ANY (ARRAY['form'::text, 'sua_o'::text, 'hang_loat'::text, 'goi_y_duoi'::text, 'import'::text, 'ra_ghi_chu'::text, 'cai_dat'::text, 'script'::text, 'gia_von_dau_ky'::text])))
```

Chín giá trị, trùng với repo `0044`. Phase 4 **không** thêm giá trị nào.

---

## Cho plan 05-04 — đường ghi sổ `DIEU_CHINH`

**1. `_ghi_so_dieu_chinh` — ⚠️ VẪN GHI KHO ĐẦU PHIẾU**

```sql
CREATE OR REPLACE FUNCTION public._ghi_so_dieu_chinh(p_ct chung_tu, p_dong chung_tu_dong)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $function$
```

`kho_id` = **`p_ct.kho_id`**, không phải `coalesce(p_dong.kho_id, p_ct.kho_id)`. Migration
`0051` chỉ vá `_ghi_so_xuat` / `_ghi_so_tra_ncc` / `_ghi_so_tra_khach`, ghi rõ trong header
của nó rằng `DIEU_CHINH` "giữ nguyên, sẽ quyết ở phase của chúng".

Đây đúng là điều kiện dừng mà Task 1 của 05-04 cài sẵn: *"Nếu là bản cũ thì kho theo từng
dòng KHÔNG có hiệu lực và cả thiết kế ở Task 2 phải đổi: dừng lại, báo người dùng."*
Đã báo người dùng — xem quyết định ghi ở cuối file.

**2. `ghi_so_chung_tu`:** còn nhánh `when 'DIEU_CHINH'` — **có**. `grant execute ... to
authenticated` — **có**.

**3. Nhãn enum `loai_ct`:** `NHAP, XUAT, TRA_NCC, TRA_KHACH, CHUYEN_KHO, KIEM_KE, DIEU_CHINH`
— có `DIEU_CHINH` đúng chính tả.

---

## Quyết định cho 05-04 — người dùng chốt 2026-09-21

**Vá `_ghi_so_dieu_chinh` theo kho từng dòng.** Người dùng chọn phương án này trong ba
phương án được đưa ra (vá hàm · hai phiếu mỗi kho một phiếu · hoãn 05-04).

Cách làm, trong chính migration `0061_nap_ton_tam.sql`:
- `create or replace function public._ghi_so_dieu_chinh(...)` chép **nguyên văn** bản đang
  chạy ở trên, đổi **đúng một chỗ**: đối số `kho_id` của lệnh `insert into public.kho_movement`
  từ `p_ct.kho_id` thành `coalesce(p_dong.kho_id, p_ct.kho_id)` — y hệt cách `0051` đã vá
  `_ghi_so_xuat` / `_ghi_so_tra_ncc` / `_ghi_so_tra_khach`. Không đổi dấu `so_luong`, không
  đổi cách lấy `gia_von`.
- Kèm lại `revoke all on function public._ghi_so_dieu_chinh(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;`
- Comment trong migration nói rõ: `0051` cố ý để `DIEU_CHINH` lại "cho phase của nó";
  Phase 5 là phase đầu tiên dùng `DIEU_CHINH` (nạp tồn tạm D-05) nên quyết ở đây.
- `_ghi_so_kiem_ke` và `_ghi_so_chuyen_kho` **giữ nguyên** — kiểm kê và chuyển kho là việc
  của Phase 6.

Vì sao an toàn (đã đo trước khi hỏi người dùng):
- Database có **0** chứng từ `DIEU_CHINH` (cũng 0 `KIEM_KE`, 0 `CHUYEN_KHO`) — không dữ liệu
  cũ nào bị ảnh hưởng.
- Tương thích ngược: dòng không chọn kho vẫn rơi về kho đầu phiếu, nên mọi phiếu `DIEU_CHINH`
  sau này không chọn kho theo dòng vẫn ghi đúng như trước.

Nhờ vậy D-05 giữ đúng "**một** chứng từ `DIEU_CHINH`" cho cả hai kho: mỗi dòng mang
`kho_id` của kho mình.

pgTAP `35` phải assert: một phiếu `DIEU_CHINH` hai dòng hai kho → `kho_movement.kho_id`
của từng dòng đúng kho của dòng đó, và `ton_kho` của từng kho tăng đúng số.
