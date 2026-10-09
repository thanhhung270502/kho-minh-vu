-- 0123: 0118 tạo lại them_dong_don (thêm p_ghi_chu) nhưng quên lệnh revoke của 0094.
-- Hàm mới tạo mặc định cho PUBLIC (kể cả anon) quyền execute. Hàm chạy với quyền người
-- gọi nên RLS vẫn chặn anon ghi bảng, nhưng giữ đúng quy ước: chỉ authenticated gọi được.
revoke all on function public.them_dong_don(uuid, uuid, numeric, uuid, text) from public, anon;
grant execute on function public.them_dong_don(uuid, uuid, numeric, uuid, text) to authenticated;
