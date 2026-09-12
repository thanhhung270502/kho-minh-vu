-- =============================================================================
-- 0014b — RLS cho bảy bảng danh mục + quyền theo cột trên san_pham
--
-- QUY TẮC BẮT BUỘC cho mọi policy trong file này:
-- LUÔN viết (select public.vai_tro_hien_tai()), KHÔNG BAO GIỜ gọi trần.
-- Bọc subquery làm Postgres cache kết quả một lần mỗi câu lệnh (initPlan)
-- thay vì gọi lại mỗi dòng — dù bản thân hàm đã stable.
-- =============================================================================

alter table public.nguoi_dung  enable row level security;
alter table public.kho         enable row level security;
alter table public.nhom_hang   enable row level security;
alter table public.don_vi_tinh enable row level security;
alter table public.cong_doan   enable row level security;
alter table public.doi_tac     enable row level security;
alter table public.san_pham    enable row level security;

-- --- ĐỌC: mọi vai trò đều tra được danh mục ------------------------------
-- Thủ kho phải tra được mã hàng để nhập phiếu, nên không giới hạn theo kho ở đây.
create policy "moi vai tro doc san pham"    on public.san_pham    for select to authenticated using (true);
create policy "moi vai tro doc kho"         on public.kho         for select to authenticated using (true);
create policy "moi vai tro doc nhom hang"   on public.nhom_hang   for select to authenticated using (true);
create policy "moi vai tro doc don vi tinh" on public.don_vi_tinh for select to authenticated using (true);
create policy "moi vai tro doc cong doan"   on public.cong_doan   for select to authenticated using (true);
create policy "moi vai tro doc doi tac"     on public.doi_tac     for select to authenticated using (true);

-- nguoi_dung: quản lý thấy hết, người khác chỉ thấy chính mình.
create policy "xem ho so nguoi dung" on public.nguoi_dung
  for select to authenticated using (
    (select public.vai_tro_hien_tai()) = 'quan_ly' or id = (select auth.uid())
  );

-- --- GHI: chỉ quan_ly và van_phong ---------------------------------------
create policy "them san pham" on public.san_pham
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua san pham" on public.san_pham
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "them doi tac" on public.doi_tac
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua doi tac" on public.doi_tac
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "them nhom hang" on public.nhom_hang
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua nhom hang" on public.nhom_hang
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "them don vi tinh" on public.don_vi_tinh
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua don vi tinh" on public.don_vi_tinh
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

create policy "them cong doan" on public.cong_doan
  for insert to authenticated
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
create policy "sua cong doan" on public.cong_doan
  for update to authenticated
  using      ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'))
  with check ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));

-- kho và nguoi_dung: chỉ quản lý.
create policy "quan ly sua kho" on public.kho
  for all to authenticated
  using      ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');
create policy "quan ly sua nguoi dung" on public.nguoi_dung
  for all to authenticated
  using      ((select public.vai_tro_hien_tai()) = 'quan_ly')
  with check ((select public.vai_tro_hien_tai()) = 'quan_ly');

-- =============================================================================
-- AUTH-05 — văn phòng không sửa được giá. Dùng HAI lớp.
--
-- RLS chặn theo DÒNG, không theo CỘT — không thể dùng policy để chặn riêng
-- gia_von hay gia_ban. Postgres có sẵn cơ chế quyền theo cột cho việc này.
-- =============================================================================

-- LỚP 1 — quyền theo cột. PostgREST tôn trọng và trả 42501 ngay.
-- Phải phủ CẢ UPDATE lẫn INSERT: chặn sửa gia_von mà cho tạo mã mới với
-- gia_von tùy ý thì người dùng xóa rồi tạo lại là lách được. Giá trị bịa lúc
-- tạo còn nguy hiểm hơn — nó thành gia_von_cu ở lần ghi sổ đầu tiên và làm hỏng
-- bình quân gia quyền từ con số đầu, im lặng.
revoke update on public.san_pham from authenticated;
grant update (
  ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id, quy_doi,
  ton_toi_thieu, ton_toi_da, hinh_anh_url, vi_tri_ke, dang_kinh_doanh, ghi_chu,
  gia_ban
) on public.san_pham to authenticated;

revoke insert on public.san_pham from authenticated;
grant insert (
  ma_hang, ten_hang, barcode, nhom_hang_id, dvt_id, cong_doan_id, quy_doi,
  ton_toi_thieu, ton_toi_da, hinh_anh_url, vi_tri_ke, dang_kinh_doanh, ghi_chu,
  gia_ban
) on public.san_pham to authenticated;

-- CHỈ gia_von vắng mặt khỏi cả hai danh sách. INSERT không chỉ định cột thì
-- dùng default 0, đúng bất biến "gia_von chỉ do trigger giá vốn ghi".
--
-- gia_ban CÓ trong danh sách, cố ý: quyền theo cột áp theo SQL ROLE, không theo
-- JWT claim. Quản lý và văn phòng đều kết nối dưới cùng role authenticated,
-- chỉ khác claim. Bỏ gia_ban khỏi GRANT sẽ chặn luôn quản lý ở tầng privilege,
-- trước khi trigger bên dưới kịp chạy. Phân biệt vai trò là việc của trigger.

-- LỚP 2 — trigger, thứ duy nhất phân biệt được vai trò. Chỉ gác gia_ban.
create or replace function public.chan_sua_gia_khong_du_quyen()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.gia_ban, 0) <> 0
       and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
      raise exception 'Chỉ vai trò quản lý được đặt giá bán. Tạo mã với giá bán 0 rồi để quản lý cập nhật.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.gia_ban is distinct from old.gia_ban
     and coalesce((select public.vai_tro_hien_tai())::text, '') <> 'quan_ly' then
    raise exception 'Chỉ vai trò quản lý được sửa giá bán' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Trigger KHÔNG kiểm gia_von: chính trigger giá vốn (security definer, chạy
-- ngoài ngữ cảnh JWT) là thứ ghi cột đó — kiểm ở đây sẽ chặn nhầm đường ghi
-- hợp lệ. gia_von đã được bảo vệ hoàn toàn bằng lớp 1.
create trigger chan_sua_gia_san_pham
  before insert or update on public.san_pham
  for each row execute function public.chan_sua_gia_khong_du_quyen();
