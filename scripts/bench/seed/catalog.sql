-- LOCAL ONLY — dữ liệu thử Phase 22, dọn bằng npm run bench:clean;
-- bảng tiền tố ở scripts/bench/README.md.
--
-- Chạy: psql <db local> -v ngay_dau=YYYY-MM-DD -f scripts/bench/seed/catalog.sql
-- Chạy lại không nhân đôi: mọi INSERT đều `on conflict do nothing`, phiếu tồn đầu
-- chỉ tạo khi chưa có.
\set ON_ERROR_STOP on

begin;

-- Nhật ký sửa ghi nguồn 'form' như thao tác người dùng (trigger ghi_nhat_ky_sua đọc GUC này).
select set_config('app.nguon_sua', 'form', true);
-- psql KHÔNG thay :'ngay_dau' bên trong thân $$ ... $$, nên các khối do $$ đọc ngày qua GUC.
select set_config('bench.ngay_dau', :'ngay_dau', false);

-- Trigger chan_sua_gia_san_pham chỉ cho vai trò quản lý đặt gia_ban (vai_tro_hien_tai() đối chiếu
-- JWT với nguoi_dung). Giả lập JWT quản lý CHỈ quanh các INSERT san_pham, rồi xóa ngay để
-- phiếu tồn đầu không mang nguoi_tao_id của người thật (cùng cách các file pgTAP đang làm).
do $$
declare
  v_ql uuid;
begin
  select id into v_ql from public.nguoi_dung where vai_tro = 'quan_ly' and dang_hoat_dong limit 1;
  if v_ql is null then
    raise exception 'Cần ít nhất một tài khoản quản lý đang hoạt động — chạy npm run seed:users trước.';
  end if;
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_ql, 'vai_tro', 'quan_ly')::text,
    true
  );
end $$;

-- 90 nhóm hàng
insert into public.nhom_hang (ma, ten)
select 'BENCH-NH-' || lpad(n::text, 2, '0'), 'Nhóm thử ' || n
from generate_series(1, 90) n
on conflict (ma) do nothing;

-- 3.300 mã hàng thường
insert into public.san_pham (
  ma_hang, ten_hang, nhom_hang_id, dvt_id, cong_doan_id,
  gia_ban, dang_kinh_doanh, ton_toi_thieu
)
select
  'BENCH-' || lpad(n::text, 4, '0'),
  (array['Nhông','Xích','Má phanh','Bugi','Lọc gió','Dây ga','Đèn pha','Gương chiếu hậu','Ốp sườn','Bạc đạn'])[1 + n % 10]
    || ' ' || (array['Wave','Dream','Vision','Air Blade','Exciter','Sirius','Lead','SH'])[1 + (n / 10) % 8]
    || ' loại ' || n,
  (select nh.id from public.nhom_hang nh where nh.ma = 'BENCH-NH-' || lpad((1 + n % 90)::text, 2, '0')),
  (select id from public.don_vi_tinh where ma = 'CAI'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  10000 + (n * 7919) % 490000,
  (n % 25 <> 0),
  case when n % 7 = 0 then 5 else 0 end
from generate_series(1, 3300) n
on conflict (ma_hang) do nothing;

-- 10 combo (không có tồn riêng — ghi sổ tách ra mã thành phần)
insert into public.san_pham (
  ma_hang, ten_hang, nhom_hang_id, dvt_id, cong_doan_id, gia_ban, loai_hang
)
select
  'BENCH-CB-' || lpad(k::text, 2, '0'),
  'Combo thử ' || k,
  (select nh.id from public.nhom_hang nh where nh.ma = 'BENCH-NH-' || lpad(k::text, 2, '0')),
  (select id from public.don_vi_tinh where ma = 'CAI'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  200000 + k * 1000,
  'COMBO'
from generate_series(1, 10) k
on conflict (ma_hang) do nothing;

insert into public.thanh_phan_combo (combo_id, thanh_phan_id, so_luong)
select cb.id, tp.id, c.so_luong
from generate_series(1, 10) k
cross join lateral (values (k * 10 + 1, 1), (k * 10 + 2, 2)) as c(n, so_luong)
join public.san_pham cb on cb.ma_hang = 'BENCH-CB-' || lpad(k::text, 2, '0')
join public.san_pham tp on tp.ma_hang = 'BENCH-' || lpad(c.n::text, 4, '0')
on conflict (combo_id, thanh_phan_id) do nothing;

select set_config('request.jwt.claims', '', true);

-- Đối tác: 25 NCC, 30 khách, 1 đối tác nội bộ (mã NB... bị các báo cáo loại ra)
insert into public.doi_tac (ma, ten, loai)
select 'BENCH-NCC-' || lpad(n::text, 2, '0'), 'NCC thử ' || n, 'NCC'
from generate_series(1, 25) n
on conflict (ma) do nothing;

insert into public.doi_tac (ma, ten, loai)
select 'BENCH-KH-' || lpad(n::text, 3, '0'), 'Khách thử ' || n, 'KHACH'
from generate_series(1, 30) n
on conflict (ma) do nothing;

insert into public.doi_tac (ma, ten, loai)
values ('NBBENCH', 'Nội bộ (bench)', 'KHACH')
on conflict (ma) do nothing;

insert into public.nhan_vien_phu_trach (ten_viet_tat, ten_day_du)
select 'BENCH-NV' || n, 'Nhân viên thử ' || n
from generate_series(1, 8) n
on conflict do nothing;

-- Tồn đầu kỳ đi qua ghi_so_chung_tu bằng phiếu NHAP, không INSERT thẳng kho_movement.
-- Không dùng DIEU_CHINH: _ghi_so_dieu_chinh lấy giá vốn hiện tại (= 0 với mã mới),
-- còn phiếu nhập mang don_gia thật nên trigger bình quân cho ra giá vốn khác 0.
do $$
declare
  v_ngay date := current_setting('bench.ngay_dau')::date;
  v_ct uuid;
  v_kho record;
begin
  for v_kho in
    select * from (values
      ('K1', 'BENCH-PN-DAU-K1', 1),
      ('K2', 'BENCH-PN-DAU-K2', 3)
    ) as t(kho_ma, so_ct, chia)
  loop
    continue when exists (select 1 from public.chung_tu where so_ct = v_kho.so_ct);

    insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, ghi_chu, created_at)
    values (
      v_kho.so_ct, 'NHAP', v_ngay,
      (select id from public.kho where ma = v_kho.kho_ma),
      (select id from public.doi_tac where ma = 'BENCH-NCC-01'),
      '[BENCH] tồn đầu kỳ',
      (v_ngay + time '08:00') at time zone 'Asia/Ho_Chi_Minh'
    )
    returning id into v_ct;

    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
    select
      v_ct, sp.id, q.so_luong, q.don_gia, q.so_luong * q.don_gia,
      (select id from public.kho where ma = v_kho.kho_ma)
    from public.san_pham sp
    cross join lateral (select substr(sp.ma_hang, 7)::int as n) x
    cross join lateral (
      select
        case v_kho.kho_ma
          when 'K1' then 300 + (x.n * 37) % 1200
          else 50 + x.n % 200
        end as so_luong,
        5000 + (x.n * 104729) % 295000 as don_gia
    ) q
    where sp.ma_hang ~ '^BENCH-[0-9]{4}$'
      and (v_kho.chia = 1 or x.n % v_kho.chia = 0);

    perform public.ghi_so_chung_tu(v_ct);
  end loop;
end $$;

commit;

select
  (select count(*) from public.san_pham where ma_hang like 'BENCH-%') as ma,
  (select count(*) from public.doi_tac where ma like 'BENCH-%' or ma = 'NBBENCH') as doi_tac,
  (select count(*) from public.kho_movement m
     join public.chung_tu c on c.id = m.chung_tu_id
    where c.so_ct like 'BENCH-PN-DAU-%') as dong_so_cai_dau_ky;
