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

-- Chức vụ "Quản lý kho" khớp scripts/seed-users.ts: phạm vi văn phòng, mọi
-- quyền trừ Tạo nhân viên.
insert into public.chuc_vu (ma, ten, pham_vi)
values ('QUAN_LY_KHO', 'Quản lý kho', 'van_phong')
on conflict (ma) do update set ten = excluded.ten, pham_vi = excluded.pham_vi;

delete from public.chuc_vu_quyen
where chuc_vu_id = (select id from public.chuc_vu where ma = 'QUAN_LY_KHO');
insert into public.chuc_vu_quyen (chuc_vu_id, quyen)
select cv.id, q.quyen
from public.chuc_vu cv
cross join unnest(array[
  'xem_dashboard', 'nhap_kho', 'tao_don', 'xac_nhan_don', 'hoan_thanh_don',
  'sua_hoa_don', 'tao_ma_hang', 'kiem_kho'
]) as q(quyen)
where cv.ma = 'QUAN_LY_KHO';


-- Local chỉ có 3 tài khoản demo (quản lý, văn phòng, chỉ xem). Nhân viên thật và
-- thủ kho demo chỉ tạo trên cloud bằng `npm run seed:users`.
--   · ten_dang_nhap = phần trước @ — không để NULL, nếu không màn Người dùng hiện
--     "—" và luu_ho_so_nguoi_dung từng chết vì chuỗi rỗng (checklist 9.6)
--   · văn phòng demo bật xem_lich_su_kiotviet: migration 0063 backfill công tắc
--     này bằng UPDATE, nhưng khi `db reset` migration chạy TRƯỚC seed nên lúc đó
--     chưa có ai để cập nhật
do $$
declare
  v_id uuid;
  r record;
begin
  for r in
    select * from (values
      ('quanly@khominhvu.local',      'Quản lý demo',    'QUAN_LY',     array[]::text[],    true,  false, false),
      ('vanphong@khominhvu.local',    'Văn phòng demo',  'NHAN_VIEN',   array[]::text[],    false, false, true),
      ('chixem@khominhvu.local',      'Chỉ xem demo',    'CHI_XEM',     array[]::text[],    false, false, false)
    ) as t(email, ho_ten, ma_chuc_vu, ma_kho, duyet_kiem_ke, phai_doi_mat_khau, xem_lich_su_kiotviet)
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
        r.email, extensions.crypt('password', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
    end if;

    -- Ghi chức vụ, trigger dong_bo_vai_tro_chuc_vu (0082) tự đặt vai_tro.
    insert into public.nguoi_dung (
      id, ho_ten, ten_dang_nhap, chuc_vu_id,
      duyet_kiem_ke, phai_doi_mat_khau, xem_lich_su_kiotviet
    )
    values (
      v_id, r.ho_ten, split_part(r.email, '@', 1),
      (select id from public.chuc_vu where ma = r.ma_chuc_vu),
      r.duyet_kiem_ke, r.phai_doi_mat_khau, r.xem_lich_su_kiotviet
    )
    on conflict (id) do update set
      ho_ten = excluded.ho_ten,
      ten_dang_nhap = excluded.ten_dang_nhap,
      chuc_vu_id = excluded.chuc_vu_id,
      duyet_kiem_ke = excluded.duyet_kiem_ke,
      phai_doi_mat_khau = excluded.phai_doi_mat_khau,
      xem_lich_su_kiotviet = excluded.xem_lich_su_kiotviet;

    delete from public.nguoi_dung_kho where nguoi_dung_id = v_id;
    insert into public.nguoi_dung_kho (nguoi_dung_id, kho_id)
    select v_id, k.id from public.kho k where k.ma = any(r.ma_kho);
  end loop;
end $$;

-- Local không dùng chức vụ Thủ kho (không còn tài khoản thủ kho). Migration 0082
-- tạo nó cùng ba chức vụ mặc định nên phải xóa ở đây sau mỗi `db reset`.
delete from public.chuc_vu where ma = 'THU_KHO';

insert into public.doi_tac (ma, ten, loai, ghi_chu) values
  ('NCC000001', 'Nhà máy Vũ Trụ L.An', 'CA_HAI',
   'Vừa bán vừa nhận trả hàng — đó là lý do bảng doi_tac dùng chung cho NCC và khách.')
on conflict (ma) do nothing;
