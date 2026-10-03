-- Dữ liệu riêng cho load test: 1 khách LOADTEST-KH + 50 mã LOADTEST-001..050,
-- mỗi mã tồn 1.000.000 ở K1 để phiếu xuất thử không bao giờ âm.
-- Mọi thứ mang tiền tố LOADTEST, cleanup.sql xóa sạch.
\set ON_ERROR_STOP on
begin;
set local session_replication_role = replica;  -- không ghi nhat_ky_sua cho dữ liệu thử

insert into public.doi_tac (ma, ten, loai)
values ('LOADTEST-KH', 'Khách load test', 'KHACH')
on conflict do nothing;

insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
select 'LOADTEST-' || lpad(i::text, 3, '0'), 'Hàng load test ' || i,
       (select id from public.don_vi_tinh where ma = 'CAI'),
       (select id from public.cong_doan where ma = 'MUA_NGOAI')
from generate_series(1, 50) i
on conflict do nothing;
commit;

-- Tồn đầu: trigger phải chạy để dựng ton_kho + gia_von → role mặc định.
insert into public.kho_movement (kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem)
select (select id from public.kho where ma = 'K1'), sp.id, 1000000, 10000
from public.san_pham sp
where sp.ma_hang like 'LOADTEST-%'
  and not exists (select 1 from public.ton_kho tk where tk.san_pham_id = sp.id);

-- Ghi nhớ bộ đếm số phiếu XUAT trước test để cleanup trả lại.
create table if not exists public._loadtest_state (k text primary key, v bigint);
insert into public._loadtest_state
select 'xuat_counter', coalesce((select so_hien_tai from public.chuoi_so_ct
  where loai_ct = 'XUAT' and nam = extract(year from now())::smallint), 0)
on conflict (k) do nothing;
revoke all on public._loadtest_state from anon, authenticated;

select count(*) as so_ma_test from public.san_pham where ma_hang like 'LOADTEST-%';
