-- =============================================================================
-- 0075 — public.ten_danh_muc(p_bang, p_id): helper tra tên danh mục.
--
-- 0034 (dựng lại từ catalog cloud ở b3dd55c) gọi hàm này trong nhap_danh_muc để
-- ghi nhật ký "tên cũ → tên mới" khi đổi nhóm/ĐVT/công đoạn/kho, nhưng không
-- migration nào tạo hàm. DB dựng từ migration thiếu hàm → import Excel đổi nhóm
-- chết "function public.ten_danh_muc(unknown, uuid) does not exist".
-- =============================================================================
begin;
select plan(7);

select has_function('public', 'ten_danh_muc', array['text', 'uuid'],
  'ten_danh_muc(text, uuid) tồn tại');

select is(
  public.ten_danh_muc('kho', (select id from public.kho where ma = 'K1')),
  (select ten from public.kho where ma = 'K1'),
  'Trả đúng tên kho'
);
select is(
  public.ten_danh_muc('don_vi_tinh', (select id from public.don_vi_tinh where ma = 'CAI')),
  (select ten from public.don_vi_tinh where ma = 'CAI'),
  'Trả đúng tên đơn vị tính'
);
select is(public.ten_danh_muc('nhom_hang', null), null, 'id null → null');
select throws_ok(
  $$ select public.ten_danh_muc('san_pham', uuid_generate_v4()) $$,
  'P0001',
  'Bảng danh mục không hợp lệ: san_pham',
  'Bảng ngoài danh sách bị từ chối'
);
select ok(
  has_function_privilege('authenticated', 'public.ten_danh_muc(text, uuid)', 'execute'),
  'authenticated gọi được (nhap_danh_muc chạy dưới quyền người dùng)'
);
select ok(
  not has_function_privilege('anon', 'public.ten_danh_muc(text, uuid)', 'execute'),
  'anon không gọi được — giống cloud'
);

select * from finish();
rollback;
