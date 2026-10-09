-- LOCAL ONLY — bộ sinh chứng từ một ngày cho Phase 22 (npm run bench:seed). Chỉ định nghĩa hàm
-- pg_temp.* nên không để lại đối tượng nào trong DB; nạp bằng `\i` ngay trước khi gọi.
--
-- Mọi bút toán sổ cái đi qua ghi_so_chung_tu / huy_chung_tu (không INSERT thẳng kho_movement),
-- nên trigger tồn kho, giá vốn bình quân và nhật ký chạy đúng như thật.
--
-- Giới hạn đã biết (sổ cái bất biến nên không sửa lại được):
--   * bút toán đảo của phiếu hủy có ngay = now() lúc seed;
--   * kho_movement.created_at = lúc seed;
--   * hoan_thanh_don không lùi ngày được nên bước "đơn -> hóa đơn" tái hiện 4 bước của nó;
--   * duyet_phien_kiem_ke ép ngay_ct = hôm nay, nên phiếu kiểm kê được ghi sổ thẳng bằng
--     ghi_so_chung_tu để bút toán nằm đúng ngày lịch sử (xem phần KIEM_KE).

-- Bộ đếm số chứng từ là bộ đếm sống (bẫy 16): chụp trước mỗi lô, trả lại sau lô.
create or replace function pg_temp.bench_snapshot_counters() returns void
language plpgsql as $$
begin
  create temp table if not exists _bench_counters as select * from public.chuoi_so_ct with no data;
  truncate _bench_counters;
  insert into _bench_counters select * from public.chuoi_so_ct;
end $$;

create or replace function pg_temp.bench_restore_counters() returns void
language plpgsql as $$
begin
  update public.chuoi_so_ct c
  set so_hien_tai = s.so_hien_tai
  from _bench_counters s
  where (c.loai_ct, c.nam, c.nguon) = (s.loai_ct, s.nam, s.nguon);

  delete from public.chuoi_so_ct c
  where not exists (
    select 1 from _bench_counters s
    where (c.loai_ct, c.nam, c.nguon) = (s.loai_ct, s.nam, s.nguon)
  );
end $$;

-- Bảng tra mã BENCH: n = 1..3300 mã thường, 3301..3310 là BENCH-CB-01..10.
create or replace function pg_temp.bench_prep() returns void
language plpgsql as $$
begin
  create temp table if not exists _bench_sp (n int primary key, id uuid not null);
  if not exists (select 1 from _bench_sp limit 1) then
    insert into _bench_sp (n, id)
    select substr(ma_hang, 7)::int, id from public.san_pham where ma_hang ~ '^BENCH-[0-9]{4}$'
    union all
    select 3300 + substr(ma_hang, 10)::int, id from public.san_pham where ma_hang ~ '^BENCH-CB-[0-9]{2}$';
  end if;
end $$;

-- Mã bán chạy dồn về số nhỏ (BENCH-0001 nhiều phát sinh nhất). Mã n > 2000 chia hết 3 có kho
-- mặc định K2 (catalog.sql); mã chia hết 25 đã ngừng kinh doanh nên không sinh phát sinh.
--   'ban': dòng đơn hàng, 3% là combo | 'k1': phiếu nhập kho K1 | 'k2': phiếu nhập kho K2
create or replace function pg_temp.bench_pick_n(p_mode text) returns int
language plpgsql as $$
declare
  v int;
begin
  if p_mode = 'k2' then
    v := 2001 + 3 * floor(random() * 434)::int;
    while v % 25 = 0 loop
      v := v - 3;
    end loop;
    return v;
  end if;

  if p_mode = 'ban' and random() < 0.03 then
    return 3301 + floor(random() * 10)::int;
  end if;

  v := least(1 + floor(power(random(), 2.2) * 3300)::int, 3300);
  while v % 25 = 0 or (v > 2000 and v % 3 = 0) loop
    v := v - 1;
  end loop;
  return v;
end $$;

create or replace function pg_temp.bench_seed_day(p_ngay date) returns jsonb
language plpgsql as $$
declare
  v_yymmdd text := to_char(p_ngay, 'YYMMDD');
  v_t0 timestamptz := (p_ngay + time '07:30') at time zone 'Asia/Ho_Chi_Minh';
  v_gan_day boolean :=
    p_ngay >= ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 2);
  v_nguoi uuid := (select id from auth.users where email = 'vanphong@khominhvu.local');
  v_k1 uuid := (select id from public.kho where ma = 'K1');
  v_k2 uuid := (select id from public.kho where ma = 'K2');
  v_kh uuid[];
  v_ncc uuid[];
  v_nv uuid[];
  v_nb uuid := (select id from public.doi_tac where ma = 'NBBENCH');

  v_n_nhap int := 6 + floor(random() * 5)::int;
  v_n_don int := 85 + floor(random() * 15)::int;
  v_i int;
  v_k int;
  v_cre timestamptz;
  v_kho uuid;
  v_ct_id uuid;
  v_ct public.chung_tu;
  v_don uuid;
  v_doi_tac uuid;
  v_nhan_vien uuid;
  v_r float8;
  v_am text;
  v_goc uuid;
  v_n_am int;
  v_bu int;

  c_nhap int := 0;
  c_don int := 0;
  c_hd int := 0;
  c_huy int := 0;
  c_am int := 0;
  c_tra int := 0;
  c_dc int := 0;
  c_kk int := 0;
  v_dong_so_cai bigint;
  v_dong record;
begin
  if exists (
       select 1 from public.chung_tu
       where loai_ct = 'XUAT' and ngay_ct = p_ngay and so_ct like 'BENCH-HD' || v_yymmdd || '-%'
     )
     or exists (
       select 1 from public.chung_tu
       where loai_ct = 'NHAP' and ngay_ct = p_ngay and so_ct like 'BENCH-PN' || v_yymmdd || '-%'
     ) then
    return jsonb_build_object('ngay', p_ngay, 'bo_qua', true);
  end if;

  perform pg_temp.bench_prep();
  perform set_config('app.nguon_sua', 'form', true);
  -- Cùng ngày cho cùng dữ liệu: chạy lại sau khi dọn ra đúng bộ số cũ.
  perform setseed(((p_ngay - date '2000-01-01') % 997)::float8 / 997.0);

  select array_agg(id order by ma) into v_kh from public.doi_tac where ma like 'BENCH-KH-%';
  select array_agg(id order by ma) into v_ncc from public.doi_tac where ma like 'BENCH-NCC-%';
  select array_agg(id order by ten_viet_tat) into v_nv
  from public.nhan_vien_phu_trach where ten_viet_tat like 'BENCH-NV%';

  -- NHAP -------------------------------------------------------------------------------------
  for v_i in 1..v_n_nhap loop
    v_cre := v_t0 + make_interval(mins => (v_i * 480 / v_n_nhap) + floor(random() * 10)::int);
    v_kho := case when random() < 0.15 then v_k2 else v_k1 end;
    v_k := 6 + floor(random() * 4)::int;

    insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, doi_tac_id, nguoi_tao_id, ghi_chu, created_at)
    values (
      'BENCH-PN' || v_yymmdd || '-' || lpad(v_i::text, 3, '0'), 'NHAP', p_ngay, v_kho,
      v_ncc[1 + floor(random() * cardinality(v_ncc))::int], v_nguoi, '[BENCH]', v_cre
    )
    returning id into v_ct_id;

    -- Nhập bù trước: kho K1 nhập lại các mã sắp hết (tồn thấp nhất trước) theo lô lớn, nếu không
    -- mã bán chạy cạn dần và tỷ lệ xuất âm trượt khỏi ~1% sau vài tuần.
    v_bu := 0;
    if v_kho = v_k1 then
      insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, created_at)
      select v_ct_id, d.id, q.sl, q.dg, q.sl * q.dg, v_kho, v_cre
      from (
        select s.n, s.id
        from public.ton_kho tk
        join _bench_sp s on s.id = tk.san_pham_id
        where tk.kho_id = v_k1 and s.n <= 3300 and s.n % 25 <> 0
          and not (s.n > 2000 and s.n % 3 = 0) and tk.so_luong < 150
        order by tk.so_luong
        limit (v_k + 1) / 2
      ) d
      cross join lateral (
        select (100 + floor(random() * 201))::numeric as sl,
               round((5000 + (d.n::bigint * 104729) % 295000) * (0.9 + random() * 0.2)) as dg
      ) q;
      get diagnostics v_bu = row_count;
    end if;

    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, created_at)
    select v_ct_id, s.id, q.sl, q.dg, q.sl * q.dg, v_kho, v_cre
    from (
      select c.n
      from (
        select distinct pg_temp.bench_pick_n(case when v_kho = v_k2 then 'k2' else 'k1' end) as n
        from generate_series(1, v_k + 3)
      ) c
      order by random()
      limit greatest(v_k - v_bu, 1)
    ) d
    join _bench_sp s on s.n = d.n
    cross join lateral (
      select (20 + floor(random() * 81))::numeric as sl,
             round((5000 + (d.n::bigint * 104729) % 295000) * (0.9 + random() * 0.2)) as dg
    ) q
    where not exists (
      select 1 from public.chung_tu_dong x where x.chung_tu_id = v_ct_id and x.san_pham_id = s.id
    );

    perform public.ghi_so_chung_tu(v_ct_id);
    c_nhap := c_nhap + 1;
  end loop;

  -- ĐƠN -> HÓA ĐƠN XUẤT --------------------------------------------------------------------------
  for v_i in 1..v_n_don loop
    v_cre := v_t0 + make_interval(mins => (v_i * 540 / v_n_don) + floor(random() * 3)::int);
    v_r := random();
    if random() < 0.20 then
      v_doi_tac := v_nb;
      v_nhan_vien := v_nv[1 + floor(random() * cardinality(v_nv))::int];
    else
      v_doi_tac := v_kh[1 + floor(random() * cardinality(v_kh))::int];
      v_nhan_vien := null;
    end if;

    insert into public.don_dat_hang (so_dh, ngay_dh, doi_tac_id, nguoi_tao_id, ghi_chu, created_at)
    values (
      'BENCH-DH' || v_yymmdd || '-' || lpad(v_i::text, 3, '0'), p_ngay, v_doi_tac, v_nguoi, '[BENCH]', v_cre
    )
    returning id into v_don;

    v_k := 3 + floor(random() * 5)::int + case when random() < 0.1 then 1 else 0 end;
    insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id, created_at)
    select v_don, s.id, 1 + floor(random() * 12)::int, v_nhan_vien, v_cre
    from (
      select c.n
      from (
        select distinct pg_temp.bench_pick_n('ban') as n from generate_series(1, v_k + 2)
      ) c
      order by random()
      limit v_k
    ) d
    join _bench_sp s on s.n = d.n;

    -- ~1% đơn đặt vượt tồn kho K1 của một mã -> hóa đơn xuất âm có lý do.
    if random() < 0.01 then
      v_n_am := pg_temp.bench_pick_n('k1');
      insert into public.don_dat_hang_dong (don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id, created_at)
      select v_don, s.id, greatest(coalesce(tk.so_luong, 0), 0) + 5, v_nhan_vien, v_cre
      from _bench_sp s
      left join public.ton_kho tk on tk.san_pham_id = s.id and tk.kho_id = v_k1
      where s.n = v_n_am;
    end if;

    c_don := c_don + 1;

    -- 3 ngày gần nhất: khách còn đặt (TAM) và đơn chờ xuất (DA_XAC_NHAN) chưa có hóa đơn.
    if v_gan_day and v_r < 0.05 then
      continue;
    end if;
    perform public.xac_nhan_don(v_don);
    if v_gan_day and v_r < 0.15 then
      continue;
    end if;

    -- Tái hiện hoan_thanh_don (không lùi ngày được): tạo hóa đơn nháp, chỉnh mốc, kiểm xuất
    -- âm, ghi sổ, đơn -> HOAN_THANH.
    v_ct := public.tao_phieu_xuat_tu_don(v_don);
    update public.chung_tu
    set so_ct = 'BENCH-HD' || v_yymmdd || '-' || lpad(v_i::text, 3, '0'),
        ngay_ct = p_ngay,
        created_at = v_cre + make_interval(mins => 5 + floor(random() * 85)::int),
        nguoi_tao_id = v_nguoi
    where id = v_ct.id;

    select string_agg(sp.ma_hang, '; ' order by sp.ma_hang) into v_am
    from (
      select t.san_pham_id, coalesce(ctd.kho_id, v_ct.kho_id) as kho_id, sum(t.so_luong) as so_luong
      from public.chung_tu_dong ctd
      cross join lateral public._tach_combo(ctd.san_pham_id, ctd.so_luong) t
      where ctd.chung_tu_id = v_ct.id
      group by t.san_pham_id, coalesce(ctd.kho_id, v_ct.kho_id)
    ) x
    join public.san_pham sp on sp.id = x.san_pham_id
    left join public.ton_kho tk on tk.san_pham_id = x.san_pham_id and tk.kho_id = x.kho_id
    where coalesce(tk.so_luong, 0) - x.so_luong < 0;

    if v_am is not null then
      update public.chung_tu set ly_do_xuat_am = 'LECH_TON_CHO_KIEM_KE' where id = v_ct.id;
      c_am := c_am + 1;
    end if;

    perform public.ghi_so_chung_tu(v_ct.id);
    update public.don_dat_hang set trang_thai = 'HOAN_THANH' where id = v_don;
    c_hd := c_hd + 1;

    if random() < 0.01 then
      perform public.huy_chung_tu(v_ct.id, 'Bench: hủy thử');
      c_huy := c_huy + 1;
    end if;
  end loop;

  -- TRA_KHACH: thứ Hai và thứ Năm ----------------------------------------------------------------
  if extract(isodow from p_ngay) in (1, 4) then
    select id into v_goc
    from public.chung_tu
    where loai_ct = 'XUAT' and trang_thai = 'HOAN_THANH'
      and ngay_ct between p_ngay - 14 and p_ngay - 1
      and so_ct like 'BENCH-HD%'
    order by random()
    limit 1;

    if v_goc is not null then
      v_ct := public.tao_phieu_tra(v_goc);
      delete from public.chung_tu_dong
      where chung_tu_id = v_ct.id
        and id <> (select id from public.chung_tu_dong where chung_tu_id = v_ct.id order by random() limit 1);
      update public.chung_tu_dong set so_luong = 1, thanh_tien = don_gia where chung_tu_id = v_ct.id;
      update public.chung_tu
      set so_ct = 'BENCH-TK' || v_yymmdd || '-001', ngay_ct = p_ngay, nguoi_tao_id = v_nguoi,
          created_at = v_t0 + interval '6 hours'
      where id = v_ct.id;
      perform public.ghi_so_chung_tu(v_ct.id);
      c_tra := c_tra + 1;
    end if;
  end if;

  -- DIEU_CHINH: ngày 28 hằng tháng ----------------------------------------------------------------
  if extract(day from p_ngay) = 28 then
    insert into public.chung_tu (so_ct, loai_ct, ngay_ct, kho_id, nguoi_tao_id, ghi_chu, created_at)
    values ('BENCH-DC' || v_yymmdd || '-001', 'DIEU_CHINH', p_ngay, v_k1, v_nguoi, '[BENCH]', v_t0 + interval '7 hours')
    returning id into v_ct_id;

    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id, created_at)
    select v_ct_id, s.id, (array[-3, -2, -1, 1, 2, 3])[1 + floor(random() * 6)::int], 0, 0, v_k1, v_t0 + interval '7 hours'
    from (
      select c.n from (select distinct pg_temp.bench_pick_n('k1') as n from generate_series(1, 8)) c
      order by random() limit 5
    ) d
    join _bench_sp s on s.n = d.n;

    perform public.ghi_so_chung_tu(v_ct_id);
    c_dc := c_dc + 1;
  end if;

  -- KIEM_KE: ngày 1 các tháng 1/4/7/10 --------------------------------------------------------------
  if extract(day from p_ngay) = 1 and extract(month from p_ngay) in (1, 4, 7, 10) then
    v_ct := public.mo_phien_kiem_ke(
      v_k1,
      array[(select id from public.nhom_hang
             where ma = 'BENCH-NH-' || lpad((1 + extract(month from p_ngay)::int % 90)::text, 2, '0'))],
      'Bench'
    );
    update public.chung_tu
    set so_ct = 'BENCH-KK' || v_yymmdd || '-001', ngay_ct = p_ngay, nguoi_tao_id = v_nguoi,
        created_at = v_t0 + interval '8 hours'
    where id = v_ct.id;

    for v_dong in select pv.san_pham_id from public._pham_vi_kiem_ke(v_ct.id) pv loop
      perform public.luu_dong_kiem_ke(
        v_ct.id, v_dong.san_pham_id,
        greatest(0, coalesce((select tk.so_luong from public.ton_kho tk
                              where tk.kho_id = v_k1 and tk.san_pham_id = v_dong.san_pham_id), 0)
                    + floor(random() * 5)::int - 2)
      );
    end loop;

    -- Mọi mã trong phạm vi đã có dòng đếm nên điều kiện của duyet_phien_kiem_ke luôn thỏa;
    -- ghi sổ thẳng để giữ ngay_ct lịch sử (hàm duyệt ép về hôm nay).
    perform public.ghi_so_chung_tu(v_ct.id);
    c_kk := c_kk + 1;
  end if;

  -- Mốc thời gian giống thật. Khối này tắt cả trigger lẫn khóa ngoại nên MỌI UPDATE chỉ được chạm
  -- dòng BENCH của đúng ngày đang sinh; không thêm lệnh nào vào giữa hai lệnh đổi vai trò. (set_config() bị Supabase từ chối cho tham số này,
  -- chỉ `set local` chạy được — vì vậy dùng execute.)
  execute 'set local session_replication_role = replica';
  update public.chung_tu set ngay_ghi_so = created_at + interval '3 min', updated_at = created_at + interval '3 min' where so_ct like 'BENCH-%' and ngay_ct = p_ngay and ngay_ghi_so is not null and trang_thai <> 'DA_HUY';
  update public.chung_tu set updated_at = created_at where so_ct like 'BENCH-%' and ngay_ct = p_ngay and ngay_ghi_so is null and trang_thai <> 'DA_HUY';
  update public.chung_tu set ngay_ghi_so = created_at + interval '3 min', updated_at = created_at + interval '2 hours' where so_ct like 'BENCH-%' and ngay_ct = p_ngay and trang_thai = 'DA_HUY' and ngay_ghi_so is not null;
  update public.don_dat_hang set updated_at = created_at + interval '25 min', ngay_xac_nhan = case when ngay_xac_nhan is not null then created_at + interval '10 min' end where so_dh like 'BENCH-%' and ngay_dh = p_ngay;
  update public.nhat_ky_sua n set sua_luc = d.created_at + case n.truong when '_tao_moi' then interval '0' when 'trang_thai' then (case n.gia_tri_moi #>> '{}' when 'DA_XAC_NHAN' then interval '10 min' when 'HOAN_THANH' then interval '25 min' else interval '15 min' end) else interval '5 min' end from public.don_dat_hang d where n.bang = 'don_dat_hang' and n.ban_ghi_id = d.id and d.so_dh like 'BENCH-%' and d.ngay_dh = p_ngay;
  execute 'set local session_replication_role = origin';

  select count(*) into v_dong_so_cai
  from public.chung_tu c
  join public.kho_movement m on m.chung_tu_id = c.id
  where c.so_ct like 'BENCH-%' and c.ngay_ct = p_ngay;

  return jsonb_build_object(
    'ngay', p_ngay, 'bo_qua', false, 'nhap', c_nhap, 'don', c_don, 'hoa_don', c_hd,
    'huy', c_huy, 'xuat_am', c_am, 'tra', c_tra, 'dieu_chinh', c_dc, 'kiem_ke', c_kk,
    'dong_so_cai', v_dong_so_cai
  );
end $$;

-- Phiên kiểm kê đang mở cho 22-03 đo bang_dem_kiem_ke: nhóm BENCH-NH-01, đếm nửa số mã.
create or replace function pg_temp.bench_ensure_open_session() returns uuid
language plpgsql as $$
declare
  v_ct public.chung_tu;
  v_k1 uuid := (select id from public.kho where ma = 'K1');
  v_dong record;
  v_i int := 0;
begin
  select * into v_ct from public.chung_tu where so_ct = 'BENCH-KK-MO' and trang_thai = 'NHAP_LIEU';
  if v_ct.id is not null then
    return v_ct.id;
  end if;

  v_ct := public.mo_phien_kiem_ke(
    v_k1, array[(select id from public.nhom_hang where ma = 'BENCH-NH-01')], 'Bench'
  );
  update public.chung_tu set so_ct = 'BENCH-KK-MO' where id = v_ct.id;

  for v_dong in select pv.san_pham_id from public._pham_vi_kiem_ke(v_ct.id) pv order by pv.san_pham_id loop
    v_i := v_i + 1;
    if v_i % 2 = 0 then
      perform public.luu_dong_kiem_ke(
        v_ct.id, v_dong.san_pham_id,
        coalesce((select tk.so_luong from public.ton_kho tk
                  where tk.kho_id = v_k1 and tk.san_pham_id = v_dong.san_pham_id), 0)
      );
    end if;
  end loop;
  return v_ct.id;
end $$;
