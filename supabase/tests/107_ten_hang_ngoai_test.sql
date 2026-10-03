-- =============================================================================
-- 0089 — Công đoạn MUA_NGOAI hiện tên "Hàng ngoài" (TEN-04). Mã giữ nguyên; file
-- Excel cũ ghi "Mua ngoài" vẫn khớp nhờ khop_danh_muc so cả mã-có-dấu-cách (0034).
-- =============================================================================
begin;
select plan(6);

select is(
  (select ten from public.cong_doan where ma = 'MUA_NGOAI'),
  'Hàng ngoài',
  'MUA_NGOAI hiện tên Hàng ngoài'
);
select is(
  (select count(*)::int from public.cong_doan where ma = 'MUA_NGOAI'),
  1,
  'Mã MUA_NGOAI giữ nguyên, đúng một dòng'
);
select is(
  public.khop_danh_muc('cong_doan', 'Hàng ngoài'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  'Import: tên mới "Hàng ngoài" khớp'
);
select is(
  public.khop_danh_muc('cong_doan', 'Mua ngoài'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  'Import: tên cũ "Mua ngoài" vẫn khớp (qua mã có dấu cách)'
);
select is(
  public.khop_danh_muc('cong_doan', 'MUA_NGOAI'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  'Import: mã MUA_NGOAI khớp'
);
select is(
  public.khop_danh_muc('cong_doan', 'hang ngoai'),
  (select id from public.cong_doan where ma = 'MUA_NGOAI'),
  'Import: không dấu, chữ thường vẫn khớp'
);

select * from finish();
rollback;
