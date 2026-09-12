-- =============================================================================
-- 0018 — Dữ liệu nền
--
-- Đây là DỮ LIỆU THAM CHIẾU, không phải dữ liệu test: ứng dụng không chạy được
-- nếu thiếu. Vì vậy nó nằm trong migration chứ không trong seed.sql —
-- `supabase db push` lên cloud KHÔNG chạy seed.sql.
--
-- Idempotent: chạy lại nhiều lần không nhân đôi.
-- =============================================================================

insert into public.kho (ma, ten, dia_chi) values
  ('K1', 'Kho 1', 'Kho chính'),
  ('K2', 'Kho 2', 'Kho phụ')
on conflict (ma) do nothing;

-- Đơn vị tính THẬT, tách khỏi công đoạn.
insert into public.don_vi_tinh (ma, ten) values
  ('CAI',  'Cái'),
  ('CAP',  'Cặp'),
  ('BO',   'Bộ'),
  ('CHAI', 'Chai'),
  ('BICH', 'Bịch'),
  ('LON',  'Lon'),
  ('PC',   'PC')
on conflict (ma) do nothing;

-- Công đoạn xử lý bề mặt — trường MỚI, tách ra khỏi ô ĐVT của hệ cũ.
-- Năm giá trị đầu lấy đúng từ dữ liệu thật (CARBON 518 · SƠN 394 · XI MẠ 278 ·
-- ÉP 230 · NANO 20 mã). MUA_NGOAI là mặc định cho phần còn lại.
insert into public.cong_doan (ma, ten, mau_hien_thi) values
  ('EP',        'Ép',        '#2F4858'),
  ('SON',       'Sơn',       '#A4442A'),
  ('CARBON',    'Carbon',    '#15181A'),
  ('XI_MA',     'Xi mạ',     '#69716A'),
  ('NANO',      'Nano',      '#2C6B4A'),
  ('MUA_NGOAI', 'Mua ngoài', '#8A6410')
on conflict (ma) do nothing;
