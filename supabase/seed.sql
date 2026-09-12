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

do $$
declare
  v_kho1 uuid := (select id from public.kho where ma = 'K1');
  v_id uuid;
  r record;
begin
  for r in
    select * from (values
      ('quanly@khominhvu.local',   'Quản lý demo',   'quan_ly'::public.vai_tro,   null::uuid),
      ('vanphong@khominhvu.local', 'Văn phòng demo', 'van_phong'::public.vai_tro, null::uuid),
      ('thukho1@khominhvu.local',  'Thủ kho K1',     'thu_kho'::public.vai_tro,   v_kho1),
      ('chixem@khominhvu.local',   'Chỉ xem demo',   'chi_xem'::public.vai_tro,   null::uuid)
    ) as t(email, ho_ten, vai_tro, kho_id)
  loop
    select id into v_id from auth.users where email = r.email;

    if v_id is null then
      v_id := uuid_generate_v4();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        r.email, extensions.crypt('MatKhauDemo123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
      );
    end if;

    insert into public.nguoi_dung (id, ho_ten, vai_tro, kho_id)
    values (v_id, r.ho_ten, r.vai_tro, r.kho_id)
    on conflict (id) do update set
      vai_tro = excluded.vai_tro,
      kho_id = excluded.kho_id;
  end loop;
end $$;

insert into public.doi_tac (ma, ten, loai, ghi_chu) values
  ('NCC000001', 'Nhà máy Vũ Trụ L.An', 'CA_HAI',
   'Vừa bán vừa nhận trả hàng — đó là lý do bảng doi_tac dùng chung cho NCC và khách.')
on conflict (ma) do nothing;
