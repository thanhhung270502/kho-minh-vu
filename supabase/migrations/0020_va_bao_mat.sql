-- =============================================================================
-- 0020 — Vá các vấn đề bảo mật do Supabase Security Advisor phát hiện
--
-- Chạy `get_advisors(type: security)` sau mỗi lần đổi DDL. Lần quét đầu tiên
-- sau khi push 19 migration bắt được ba nhóm vấn đề dưới đây.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ERROR — view chạy với quyền NGƯỜI TẠO, không phải người truy vấn.
--
-- Postgres mặc định cho view chạy dưới quyền của owner (ở đây là postgres),
-- nghĩa là RLS trên ton_kho và kho_movement KHÔNG áp dụng khi đọc qua view.
-- Hậu quả thật: thủ kho `select * from v_doi_chieu_ton` sẽ thấy tồn của CẢ HAI
-- kho — lách đúng phạm vi mà AUTH-04 vừa dựng.
--
-- security_invoker = on (PG15+) làm view chạy dưới quyền người gọi.
-- doi_chieu_ton() vẫn thấy toàn bộ vì bản thân nó là SECURITY DEFINER.
-- -----------------------------------------------------------------------------
alter view public.v_doi_chieu_ton set (security_invoker = on);

-- -----------------------------------------------------------------------------
-- 2. WARN — hàm không khóa search_path.
--
-- Mọi hàm dưới đây đã schema-qualify đầy đủ nên rủi ro thực tế thấp, nhưng
-- khóa search_path là chi phí bằng không và loại bỏ hẳn một lớp rủi ro:
-- role có quyền tạo object trong schema nằm trước trong search_path có thể
-- "che" một object nội bộ và chèn code chạy với quyền của hàm.
-- -----------------------------------------------------------------------------
alter function public.f_unaccent(text)                  set search_path = '';
alter function public.update_updated_at()               set search_path = '';
alter function public.chan_sua_xoa_so_cai()             set search_path = '';
alter function public.sinh_so_ct(public.loai_ct, smallint) set search_path = '';
alter function public.tim_san_pham(text, int)           set search_path = '';
alter function public.custom_access_token_hook(jsonb)   set search_path = '';
alter function public.chan_sua_gia_khong_du_quyen()     set search_path = '';

-- -----------------------------------------------------------------------------
-- 3. WARN — anon và authenticated gọi được hàm không dành cho họ.
--
-- Supabase mặc định GRANT EXECUTE mọi hàm trong schema public cho PUBLIC, và
-- PostgREST phơi chúng ra /rest/v1/rpc/<tên>. Lệnh `grant ... to authenticated`
-- ở các migration trước KHÔNG thu hồi quyền mặc định đó.
-- -----------------------------------------------------------------------------

-- Hàm trigger: không ai được gọi trực tiếp. Trigger chạy không cần EXECUTE
-- của người gây ra thao tác, nên thu hồi sạch là an toàn.
revoke all on function public.cap_nhat_ton_va_gia_von()       from public, anon, authenticated;
revoke all on function public.chan_sua_xoa_so_cai()           from public, anon, authenticated;
revoke all on function public.chan_sua_gia_khong_du_quyen()   from public, anon, authenticated;
revoke all on function public.update_updated_at()             from public, anon, authenticated;

-- Helper RLS: policy cần authenticated gọi được, anon thì không.
revoke all    on function public.vai_tro_hien_tai() from public, anon;
revoke all    on function public.kho_hien_tai()     from public, anon;
grant execute on function public.vai_tro_hien_tai() to authenticated;
grant execute on function public.kho_hien_tai()     to authenticated;

-- Hàm nghiệp vụ: chỉ người đã đăng nhập.
revoke all    on function public.f_unaccent(text)                     from public, anon;
revoke all    on function public.tim_san_pham(text, int)              from public, anon;
revoke all    on function public.sinh_so_ct(public.loai_ct, smallint) from public, anon;
revoke all    on function public.ghi_so_chung_tu(uuid)                from public, anon;
revoke all    on function public.huy_chung_tu(uuid, text)             from public, anon;
grant execute on function public.f_unaccent(text)                     to authenticated;
grant execute on function public.tim_san_pham(text, int)              to authenticated;
grant execute on function public.sinh_so_ct(public.loai_ct, smallint) to authenticated;
grant execute on function public.ghi_so_chung_tu(uuid)                to authenticated;
grant execute on function public.huy_chung_tu(uuid, text)             to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Đối chiếu tồn — tách hàm cho người dùng và hàm cho job hệ thống.
--
-- Hai lỗi của migration 0017 được sửa ở đây:
--
--   a) Hàm là SECURITY DEFINER nên bỏ qua RLS. Thủ kho gọi được sẽ thấy chênh
--      lệch của MỌI kho — lách phạm vi AUTH-04. Cần kiểm vai trò tường minh.
--
--   b) Job cron chạy `select public.doi_chieu_ton();` rồi VỨT KẾT QUẢ ĐI.
--      Phát hiện lệch xong không ghi vào đâu, không ai thấy. DATA-09 yêu cầu
--      "báo ra danh sách chênh lệch" — phải có chỗ ghi.
-- -----------------------------------------------------------------------------

create table if not exists public.nhat_ky_doi_chieu (
  id uuid primary key default uuid_generate_v4(),
  chay_luc timestamptz not null default now(),
  so_dong_lech integer not null,
  chi_tiet jsonb,
  ghi_chu text
);
create index if not exists idx_nhat_ky_doi_chieu_ngay
  on public.nhat_ky_doi_chieu (chay_luc desc);

alter table public.nhat_ky_doi_chieu enable row level security;

create policy "quan ly doc nhat ky doi chieu" on public.nhat_ky_doi_chieu
  for select to authenticated
  using ((select public.vai_tro_hien_tai()) in ('quan_ly','van_phong'));
-- Không policy ghi: chỉ job hệ thống (chạy dưới postgres) ghi vào bảng này.

-- Hàm cho NGƯỜI DÙNG: kiểm vai trò, chỉ đọc.
create or replace function public.doi_chieu_ton()
returns table (
  kho_id uuid,
  san_pham_id uuid,
  ton_theo_bang numeric(18,4),
  ton_theo_so_cai numeric(18,4),
  chenh_lech numeric(18,4)
)
language plpgsql
stable
security definer
set search_path = ''
as $ham$
begin
  if coalesce((select public.vai_tro_hien_tai())::text, '') not in ('quan_ly','van_phong') then
    raise exception 'Chỉ quản lý và văn phòng được xem báo cáo đối chiếu tồn'
      using errcode = '42501';
  end if;

  return query
    select v.kho_id, v.san_pham_id, v.ton_theo_bang, v.ton_theo_so_cai, v.chenh_lech
    from public.v_doi_chieu_ton v
    where v.chenh_lech <> 0
    order by abs(v.chenh_lech) desc;
end;
$ham$;

revoke all    on function public.doi_chieu_ton() from public, anon;
grant execute on function public.doi_chieu_ton() to authenticated;

-- Hàm cho JOB HỆ THỐNG: không kiểm vai trò (cron chạy dưới postgres, không có
-- JWT nên vai_tro_hien_tai() trả NULL), và GHI LẠI kết quả thay vì vứt đi.
create or replace function public._doi_chieu_ton_he_thong()
returns integer
language plpgsql
security definer
set search_path = ''
as $ham$
declare
  v_so_dong integer;
  v_chi_tiet jsonb;
begin
  select count(*), coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    into v_so_dong, v_chi_tiet
  from (
    select v.kho_id, v.san_pham_id, v.ton_theo_bang, v.ton_theo_so_cai, v.chenh_lech
    from public.v_doi_chieu_ton v
    where v.chenh_lech <> 0
    order by abs(v.chenh_lech) desc
    limit 500   -- lệch quá 500 dòng thì vấn đề không nằm ở từng dòng
  ) t;

  insert into public.nhat_ky_doi_chieu (so_dong_lech, chi_tiet, ghi_chu)
  values (
    v_so_dong,
    case when v_so_dong = 0 then null else v_chi_tiet end,
    case when v_so_dong = 0 then 'Khớp hoàn toàn' else 'CÓ LỆCH — cần kiểm tra' end
  );

  return v_so_dong;
end;
$ham$;

revoke all on function public._doi_chieu_ton_he_thong() from public, anon, authenticated;

-- Đăng ký lại job: gọi hàm hệ thống thay vì hàm có kiểm vai trò.
do $cron$
begin
  perform cron.unschedule('doi-chieu-ton-hang-dem');
exception when others then
  raise notice 'Chưa có job cũ để gỡ (%)', sqlerrm;
end $cron$;

do $cron$
begin
  perform cron.schedule(
    'doi-chieu-ton-hang-dem',
    '0 1 * * *',
    $lenh$ select public._doi_chieu_ton_he_thong(); $lenh$
  );
  raise notice 'Đã đăng ký lại job doi-chieu-ton-hang-dem';
exception when others then
  raise notice 'Bỏ qua đăng ký pg_cron (%). Đăng ký thủ công qua Dashboard.', sqlerrm;
end $cron$;

-- -----------------------------------------------------------------------------
-- 5. Bật pgtap để chạy được `npm run db:test:linked`.
-- -----------------------------------------------------------------------------
create extension if not exists pgtap with schema extensions;
