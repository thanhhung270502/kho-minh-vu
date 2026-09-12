-- =============================================================================
-- DATA-07 — Tìm sản phẩm không dấu, ưu tiên mã phát sinh gần đây
-- =============================================================================
begin;
select plan(12);

create or replace function pg_temp.dang_nhap_nhu(p_email text)
returns void language plpgsql as $helper$
declare v_id uuid; v_nd public.nguoi_dung;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    raise exception 'Không có tài khoản mẫu %. Chạy `npm run seed:users` trước.', p_email;
  end if;
  select * into v_nd from public.nguoi_dung where id = v_id;
  perform set_config('request.jwt.claims', json_build_object(
    'sub', v_id::text, 'role', 'authenticated',
    'vai_tro', v_nd.vai_tro::text, 'kho_id', coalesce(v_nd.kho_id::text, '')
  )::text, true);
  perform set_config('role', 'authenticated', true);
end $helper$;

create or replace function pg_temp.dang_xuat()
returns void language plpgsql as $helper$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $helper$;

create or replace function pg_temp.sp_test(p_ma text)
returns uuid language plpgsql as $helper$
declare v_id uuid;
begin
  insert into public.san_pham (ma_hang, ten_hang, dvt_id, cong_doan_id)
  values (p_ma, 'Hàng test ' || p_ma,
          (select id from public.don_vi_tinh where ma = 'CAI'),
          (select id from public.cong_doan where ma = 'MUA_NGOAI'))
  on conflict (ma_hang) do update set ten_hang = excluded.ten_hang
  returning id into v_id;
  return v_id;
end $helper$;

create or replace function pg_temp.kho_id(p_ma text)
returns uuid language sql stable as $helper$
  select id from public.kho where ma = p_ma;
$helper$;


create temp table t_sp as
select pg_temp.sp_test('BD-001') as bd1,
       pg_temp.sp_test('BD-002') as bd2,
       pg_temp.sp_test('OC-001') as oc1;

grant select on t_sp to authenticated;

update public.san_pham set ten_hang = 'Bạc đạn 6202', lan_phat_sinh_cuoi = now()
  where ma_hang = 'BD-001';
update public.san_pham set ten_hang = 'Bạc đạn 6203', lan_phat_sinh_cuoi = now() - interval '30 days'
  where ma_hang = 'BD-002';
update public.san_pham set ten_hang = 'Ốc vít M6', lan_phat_sinh_cuoi = null
  where ma_hang = 'OC-001';

select isnt_empty(
  'select 1 from public.tim_san_pham(''bac dan'')',
  'gõ KHÔNG DẤU vẫn tìm được hàng có tên CÓ DẤU'
);
select is(
  (select ma_hang from public.tim_san_pham('bac dan') limit 1),
  'BD-001',
  'mã phát sinh gần đây xếp trước mã lâu không luân chuyển'
);
select isnt_empty(
  'select 1 from public.tim_san_pham(''Bạc đạn'')',
  'gõ CÓ DẤU cũng ra kết quả'
);
select isnt_empty(
  'select 1 from public.tim_san_pham(''BD-001'')',
  'tìm được theo mã hàng, không chỉ theo tên'
);
select is_empty(
  'select 1 from public.tim_san_pham(''xyzkhongcogithat'')',
  'từ khóa không khớp gì trả về rỗng'
);
select is(
  (select count(*) from public.tim_san_pham('bac dan', 1)),
  1::bigint,
  'tôn trọng tham số giới hạn'
);


select is(
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'idx_san_pham_tim_kiem'),
  1::bigint,
  'index GIN trigram tồn tại (xem supabase/README.md để kiểm planner có dùng)'
);

-- Các ca dưới đây đã kiểm chứng thật trên cloud sau migration 0022.
-- Trước 0022, ca "gõ vài ký tự" trả về RỖNG — toán tử % đo độ giống toàn chuỗi.
select is(
  (select count(*) from public.tim_san_pham('bd')),
  2::bigint,
  'gõ 2 ký tự "bd" ra cả BD-001 và BD-002 — ca dùng chính của thủ kho'
);
select isnt_empty(
  'select 1 from public.tim_san_pham(''bac dna'')',
  'gõ sai chính tả "bac dna" vẫn tìm được — nhánh word_similarity'
);
select isnt_empty(
  'select 1 from public.tim_san_pham(''oc vit'')',
  'tìm được "Ốc vít M6" khi gõ "oc vit"'
);
select is_empty(
  'select 1 from public.tim_san_pham('''')',
  'từ khóa rỗng trả về rỗng, không quét cả bảng'
);

-- Để CUỐI CÙNG: tắt BD-002 rồi mới kiểm. Đặt sớm hơn sẽ làm mọi assertion
-- phía sau thiếu mất một kết quả — đúng lỗi đã gặp ở lần chạy đầu.
update public.san_pham set dang_kinh_doanh = false where ma_hang = 'BD-002';
select is(
  (select count(*) from public.tim_san_pham('bac dan') where ma_hang = 'BD-002'),
  0::bigint,
  'hàng đã ngừng kinh doanh không xuất hiện trong kết quả'
);

select * from finish();
rollback;
