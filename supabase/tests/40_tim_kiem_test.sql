-- =============================================================================
-- DATA-07 — Tìm sản phẩm không dấu, ưu tiên mã phát sinh gần đây
--
-- Chạy được cả khi bảng san_pham đã có 3.266 mã thật: mọi assertion đếm tổng
-- đều dùng từ khóa "zqx" không khớp dữ liệu thật nào.
-- =============================================================================
begin;
select plan(14);

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


-- Từ khóa "zqx" KHÔNG khớp sản phẩm thật nào (đã kiểm trên 3.266 mã).
-- Test chỉ đếm tổng khi truy vấn chứa "zqx"; mọi truy vấn khác kiểm CÓ MẶT chứ
-- không kiểm TỔNG SỐ — vì bảng có dữ liệu thật, "bd" khớp 37 mã thật.
-- Lần chạy đầu sau khi nạp dữ liệu, assertion `tim_san_pham('bd') = 2` ra 20
-- (chạm giới hạn) — test đã ngầm giả định bảng chỉ có hàng test.

create temp table t_sp as
select pg_temp.sp_test('ZQX-001') as sp1,
       pg_temp.sp_test('ZQX-002') as sp2,
       pg_temp.sp_test('ZQX-OC1') as sp3;
grant select on t_sp to authenticated;

update public.san_pham set ten_hang = 'Bạc đạn Zqx 6202', lan_phat_sinh_cuoi = now()
  where ma_hang = 'ZQX-001';
update public.san_pham set ten_hang = 'Bạc đạn Zqx 6203', lan_phat_sinh_cuoi = now() - interval '30 days'
  where ma_hang = 'ZQX-002';
update public.san_pham set ten_hang = 'Ốc vít Zqx M6', lan_phat_sinh_cuoi = null
  where ma_hang = 'ZQX-OC1';

-- ─── Nhánh 1: chuỗi con (ILIKE) ─────────────────────────────────────────
select is(
  (select count(*) from public.tim_san_pham('zqx')),
  3::bigint,
  'từ khóa duy nhất "zqx" ra đúng 3 hàng test'
);
select is(
  (select count(*) from public.tim_san_pham('bac dan zqx')),
  2::bigint,
  'gõ KHÔNG DẤU "bac dan zqx" ra 2 hàng có tên CÓ DẤU "Bạc đạn Zqx"'
);
select is(
  (select count(*) from public.tim_san_pham('Bạc đạn Zqx')),
  2::bigint,
  'gõ CÓ DẤU cũng ra đúng 2 hàng'
);
select ok(
  exists (select 1 from public.tim_san_pham('ZQX-001') where ma_hang = 'ZQX-001'),
  'tìm được theo mã hàng, không chỉ theo tên'
);
select ok(
  (select count(*) from public.tim_san_pham('zq', 100) where ma_hang like 'ZQX-%') = 3,
  'gõ 2 ký tự "zq" vẫn ra cả 3 hàng test — ca dùng chính của thủ kho'
);

-- ─── Thứ tự: mã phát sinh gần đây lên trước ────────────────────────────
select is(
  (select ma_hang from public.tim_san_pham('bac dan zqx') limit 1),
  'ZQX-001',
  'mã phát sinh gần đây xếp trước mã lâu không luân chuyển'
);
select is(
  (select ma_hang from public.tim_san_pham('zqx') offset 2 limit 1),
  'ZQX-OC1',
  'mã chưa từng phát sinh (lan_phat_sinh_cuoi NULL) xếp cuối'
);

-- ─── Nhánh 2: gõ sai chính tả (word_similarity, ngưỡng 0.6) ────────────
-- "bac dna" vs "Bac dan Zqx 6202": word_similarity = 0.625, trên ngưỡng.
-- KHÔNG dùng "bac dna zqx" — ra đúng 0.600, sát ngưỡng, chập chờn.
select ok(
  exists (select 1 from public.tim_san_pham('bac dna', 100) where ma_hang = 'ZQX-001'),
  'gõ sai "bac dna" vẫn tìm được "Bạc đạn" — nhánh word_similarity'
);

-- GIỚI HẠN ĐÃ BIẾT, ghi thành test để không ai kỳ vọng sai:
-- gõ sai MỘT ký tự trong mã NGẮN (3 ký tự) cho word_similarity 0.5, dưới ngưỡng.
-- Trigram chịu gõ sai tốt với từ dài, kém với mã ngắn. Thủ kho gõ nhầm mã hàng
-- ngắn sẽ ra rỗng. Nếu sau này hạ ngưỡng, assertion này đỏ — đó là tín hiệu
-- phải đánh giá lại số kết quả nhiễu.
select is(
  (select count(*) from public.tim_san_pham('zqz') where ma_hang like 'ZQX-%'),
  0::bigint,
  'GIỚI HẠN: gõ sai 1 ký tự của mã 3 ký tự "zqz" không tìm ra "zqx"'
);

-- ─── Biên ──────────────────────────────────────────────────────────────
select is_empty(
  'select 1 from public.tim_san_pham(''xyzkhongcogithatzqq'')',
  'từ khóa vô nghĩa trả về rỗng'
);
select is_empty(
  'select 1 from public.tim_san_pham('''')',
  'từ khóa rỗng trả về rỗng, không quét cả bảng'
);
select is(
  (select count(*) from public.tim_san_pham('zqx', 1)),
  1::bigint,
  'tôn trọng tham số giới hạn'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'public' and indexname = 'idx_san_pham_tim_kiem'),
  1::bigint,
  'index GIN trigram tồn tại'
);

-- Để CUỐI: tắt một mã rồi mới kiểm. Đặt sớm hơn sẽ làm các assertion phía
-- trên thiếu một kết quả.
update public.san_pham set dang_kinh_doanh = false where ma_hang = 'ZQX-002';
select is(
  (select count(*) from public.tim_san_pham('zqx') where ma_hang = 'ZQX-002'),
  0::bigint,
  'hàng ngừng kinh doanh không xuất hiện trong kết quả'
);

select * from finish();
rollback;
