-- =============================================================================
-- CHỈ DÙNG CHO MÔI TRƯỜNG LOCAL.
--
-- `supabase db reset` tự chạy file này. `supabase db push` lên cloud thì KHÔNG.
-- Trên cloud, tài khoản mẫu tạo bằng `npm run seed:users` (Admin API).
--
-- Dữ liệu THAM CHIẾU (kho, ĐVT, công đoạn) KHÔNG nằm ở đây mà ở migration
-- 0018_du_lieu_nen.sql — ứng dụng cần chúng ở mọi môi trường.
--
-- Mật khẩu dưới đây là mật khẩu rác, cố ý để lộ. Thấy nó trên môi trường thật
-- thì đó là sự cố, không phải tiện lợi.
-- =============================================================================

-- Năm tài khoản khớp SAMPLE_ACCOUNTS (scripts/_supabase-admin.ts) để pgTAP và
-- `npm run seed:users` gặp đúng trạng thái như trên cloud:
--   · ten_dang_nhap = phần trước @ — không để NULL, nếu không màn Người dùng hiện
--     "—" và luu_ho_so_nguoi_dung từng chết vì chuỗi rỗng (checklist 9.6)
--   · văn phòng bật xem_lich_su_kiotviet: migration 0063 backfill công tắc này
--     bằng UPDATE, nhưng khi `db reset` migration chạy TRƯỚC seed nên lúc đó
--     chưa có ai để cập nhật
--   · kho của thủ kho ghi vào nguoi_dung_kho (0026), không phải cột kho_id cũ
do $$
declare
  v_id uuid;
  r record;
begin
  for r in
    select * from (values
      ('quanly@khominhvu.local',   'Quản lý demo',    'quan_ly'::public.vai_tro,   array[]::text[]),
      ('vanphong@khominhvu.local', 'Văn phòng demo',  'van_phong'::public.vai_tro, array[]::text[]),
      ('thukho1@khominhvu.local',  'Thủ kho K1',      'thu_kho'::public.vai_tro,   array['K1']),
      ('thukho2@khominhvu.local',  'Thủ kho K1 + K2', 'thu_kho'::public.vai_tro,   array['K1', 'K2']),
      ('chixem@khominhvu.local',   'Chỉ xem demo',    'chi_xem'::public.vai_tro,   array[]::text[])
    ) as t(email, ho_ten, vai_tro, ma_kho)
  loop
    select id into v_id from auth.users where email = r.email;

    if v_id is null then
      v_id := uuid_generate_v4();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        -- GoTrue quét các cột này vào string Go: để NULL là mọi lệnh Admin API
        -- (listUsers, createUser) trả 500 "converting NULL to string".
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        r.email, extensions.crypt('MatKhauDemo123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
    end if;

    insert into public.nguoi_dung (id, ho_ten, ten_dang_nhap, vai_tro, xem_lich_su_kiotviet)
    values (v_id, r.ho_ten, split_part(r.email, '@', 1), r.vai_tro, r.vai_tro = 'van_phong')
    on conflict (id) do update set
      ho_ten = excluded.ho_ten,
      ten_dang_nhap = excluded.ten_dang_nhap,
      vai_tro = excluded.vai_tro,
      xem_lich_su_kiotviet = excluded.xem_lich_su_kiotviet;

    delete from public.nguoi_dung_kho where nguoi_dung_id = v_id;
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select v_id, k.id from public.kho k where k.ma = any(r.ma_kho);
  end loop;
end $$;

insert into public.doi_tac (ma, ten, loai, ghi_chu) values
  ('NCC000001', 'Nhà máy Vũ Trụ L.An', 'CA_HAI',
   'Vừa bán vừa nhận trả hàng — đó là lý do bảng doi_tac dùng chung cho NCC và khách.')
on conflict (ma) do nothing;
