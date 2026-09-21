-- =============================================================================
-- 0061 — nap_ton_tam: nạp tồn KiotViet vào hệ mới làm số tạm (D-05, TON-01)
--
-- ton_kho hiện có 2 dòng và 0 dòng khác 0 — màn tồn kho, thẻ kho, cảnh báo dưới
-- định mức đều trắng, không UAT được bằng dữ liệu giống thật. Nguyên tắc kiến
-- trúc số 1 cấm sửa tồn tay, nên đường hợp lệ duy nhất là một chứng từ.
--
-- Đây là chỗ đi ngược một quyết định đã khóa, có chủ đích, người dùng đã xác
-- nhận sau khi được cảnh báo (05-CONTEXT.md D-05): số nạp ở đây KHÔNG phải tồn
-- đầu kỳ chính thức — Phase 6 kiểm kê thật sẽ đè lên bằng phiếu điều chỉnh
-- riêng, không xóa chứng từ này.
--
-- -----------------------------------------------------------------------------
-- TASK 1 — ba điều đọc từ database ĐANG CHẠY, trước khi viết bất cứ dòng SQL
-- nào bên dưới (bài học Phase 4: repo có thể lệch cloud).
--
-- Đọc lúc: 2026-09-21 09:24 UTC, từ database cloud `kho-vu-tru`
-- (`phonzyruoalimgaovljm`), qua kết nối Supabase MCP của phiên điều phối
-- (agent thực thi không có kết nối database — xem 05-LIVE-DEFS.md, mục
-- "Cho plan 05-04"). Migration mới nhất trên database lúc đọc: 0057, khớp repo.
--
-- 1. `_ghi_so_dieu_chinh` — ⚠️ VẪN GHI KHO ĐẦU PHIẾU (bản cũ 0011), CHƯA theo
--    kho của dòng như 0051 đã vá cho XUAT/TRA_NCC/TRA_KHACH. Nguyên văn đối số
--    `kho_id` của lệnh insert đang chạy:
--
--      insert into public.kho_movement (
--        ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
--      ) values (
--        p_ct.ngay_ct, p_ct.kho_id, p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
--        p_ct.id, p_dong.id
--      );
--
--    `kho_id` = `p_ct.kho_id` (kho đầu phiếu), KHÔNG phải
--    `coalesce(p_dong.kho_id, p_ct.kho_id)`. Migration 0051 tự ghi trong header
--    của nó rằng DIEU_CHINH "giữ nguyên, sẽ quyết ở phase của chúng" — đây
--    đúng là phase đó.
--
-- 2. `ghi_so_chung_tu` — nhánh `when 'DIEU_CHINH' then perform
--    public._ghi_so_dieu_chinh(v_ct, v_dong);` VẪN CÒN, và hàm vẫn
--    `grant execute ... to authenticated`. Không cần vá gì ở hàm điều phối.
--
-- 3. Nhãn enum `loai_ct` trên database: NHAP, XUAT, TRA_NCC, TRA_KHACH,
--    CHUYEN_KHO, KIEM_KE, DIEU_CHINH — đủ bảy nhãn, `DIEU_CHINH` đúng chính tả.
--
-- ĐIỀU KIỆN DỪNG của Task 1 đã cài sẵn trong 05-04-PLAN.md ĐÃ FIRE: mục (1) là
-- bản cũ, nghĩa là "kho theo từng dòng KHÔNG có hiệu lực và cả thiết kế ở
-- Task 2 phải đổi: dừng lại, báo người dùng." Đã báo. Xem quyết định dưới đây.
--
-- -----------------------------------------------------------------------------
-- QUYẾT ĐỊNH CỦA NGƯỜI DÙNG — 2026-09-21, ghi lại nguyên văn từ 05-LIVE-DEFS.md
-- mục "Quyết định cho 05-04 — người dùng chốt 2026-09-21":
--
-- Ba phương án được đưa ra: (a) vá hàm `_ghi_so_dieu_chinh` theo kho từng
-- dòng, (b) tách thành hai phiếu — mỗi kho một phiếu DIEU_CHINH riêng, (c)
-- hoãn plan 05-04. Người dùng chọn (a).
--
-- Vì sao an toàn (đã đo TRƯỚC khi hỏi người dùng, không phải sau):
--   - Database có 0 chứng từ DIEU_CHINH (cũng 0 KIEM_KE, 0 CHUYEN_KHO) tại
--     thời điểm đọc — không dữ liệu cũ nào bị ảnh hưởng bởi việc vá hàm.
--   - Tương thích ngược: dòng KHÔNG chọn kho riêng vẫn rơi về kho đầu phiếu
--     qua `coalesce(p_dong.kho_id, p_ct.kho_id)` — mọi phiếu DIEU_CHINH sau
--     này không dùng kho theo dòng vẫn ghi đúng như hành vi cũ.
--
-- Nhờ vậy D-05 giữ đúng "MỘT chứng từ DIEU_CHINH" cho cả hai kho: mỗi dòng
-- mang kho_id của kho mình, không phải tách hai phiếu.
--
-- Hàm được vá NGAY TRONG FILE NÀY (không phải migration riêng) theo đúng chỉ
-- định của người dùng — copy nguyên văn bản đang chạy ở trên, đổi ĐÚNG MỘT
-- chỗ: đối số `kho_id` của `insert into public.kho_movement` từ `p_ct.kho_id`
-- thành `coalesce(p_dong.kho_id, p_ct.kho_id)`, y hệt cách 0051 đã vá
-- `_ghi_so_xuat`/`_ghi_so_tra_ncc`/`_ghi_so_tra_khach`. Không đổi dấu
-- `so_luong` (DIEU_CHINH giữ nguyên dấu, nhận cả số âm), không đổi cách lấy
-- `gia_von`. `_ghi_so_kiem_ke` và `_ghi_so_chuyen_kho` GIỮ NGUYÊN — kiểm kê và
-- chuyển kho là việc của Phase 6, không quyết ở đây. Hàm vá này và RPC
-- `nap_ton_tam` gọi nó được viết tiếp ở Task 2 của cùng file.
-- =============================================================================

create or replace function public._ghi_so_dieu_chinh(p_ct public.chung_tu, p_dong public.chung_tu_dong)
returns void language plpgsql security definer set search_path = '' as $$
declare v_gia_von numeric(18,4);
begin
  select gia_von into v_gia_von from public.san_pham where id = p_dong.san_pham_id;
  insert into public.kho_movement (
    ngay, kho_id, san_pham_id, so_luong, gia_von_tai_thoi_diem, chung_tu_id, chung_tu_dong_id
  ) values (
    p_ct.ngay_ct, coalesce(p_dong.kho_id, p_ct.kho_id), p_dong.san_pham_id, p_dong.so_luong, coalesce(v_gia_von, 0),
    p_ct.id, p_dong.id
  );
end; $$;

revoke all on function public._ghi_so_dieu_chinh(public.chung_tu, public.chung_tu_dong) from public, anon, authenticated;

comment on function public._ghi_so_dieu_chinh(public.chung_tu, public.chung_tu_dong) is
  'Ghi sổ điều chỉnh, giữ nguyên dấu so_luong (DIEU_CHINH nhận cả số âm). Vá 2026-09-21 (05-04, D-05): kho lấy theo coalesce(p_dong.kho_id, p_ct.kho_id) — kho của DÒNG trước, rơi về kho đầu phiếu nếu dòng không chọn — thay vì luôn p_ct.kho_id như bản 0011. 0051 cố ý để DIEU_CHINH lại "cho phase của nó" khi vá XUAT/TRA_NCC/TRA_KHACH; Phase 5 (nap_ton_tam) là nơi ĐẦU TIÊN dùng DIEU_CHINH nên quyết ở đây. An toàn: 0 chứng từ DIEU_CHINH tồn tại lúc vá; dòng không chọn kho riêng vẫn ghi đúng như hành vi cũ (tương thích ngược).';

-- =============================================================================
-- TASK 2 — nap_ton_tam(jsonb, uuid, boolean): dựng MỘT chứng từ DIEU_CHINH rồi
-- tự ghi sổ trong cùng transaction. Ghép hai khuôn đã có (05-PATTERNS.md WU-4):
--   - "xem trước / bỏ qua mã đã có dữ liệu thật / jsonb vào-ra" của
--     dat_gia_von_dau_ky (0044).
--   - "dựng một chứng từ atomic rồi tự ghi sổ, không bọc exception when
--     others" của tao_phieu_xuat_tu_don (0056).
-- KHÔNG viết theo _ghi_so_dieu_chinh một mình — hàm đó chỉ ghi MỘT dòng sổ
-- cho MỘT dòng chứng từ ĐÃ TỒN TẠI, không tự tạo chứng từ, không có xem
-- trước, và bị revoke khỏi authenticated (chỉ ghi_so_chung_tu gọi được).
-- =============================================================================
create or replace function public.nap_ton_tam(
  p_du_lieu jsonb,
  p_kho_mac_dinh uuid default null,
  p_chi_kiem_tra boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dong jsonb;
  v_ma text;
  v_so_luong numeric(18,4);
  v_sp public.san_pham;
  v_kho_id uuid;
  v_dat jsonb := '[]'::jsonb;
  v_bo_qua jsonb := '[]'::jsonb;
  v_loi jsonb := '[]'::jsonb;
  v_ct public.chung_tu;
begin
  -- SECURITY DEFINER bỏ qua RLS nên phải kiểm quyền TƯỜNG MINH tại đây.
  -- Hẹp hơn D-04 (quản lý + văn phòng) có chủ đích: đây là việc một lần, hậu
  -- quả trải khắp mọi báo cáo tồn — nới ra sau thì dễ hơn siết lại.
  if coalesce((select public.vai_tro_hien_tai())::text, 'quan_ly') <> 'quan_ly' then
    raise exception 'Chỉ quản lý nạp được tồn tạm' using errcode = '42501';
  end if;

  -- Vòng 1 — PHÂN LOẠI, không ghi gì. An toàn gọi lại nhiều lần khi xem trước.
  for v_dong in select * from jsonb_array_elements(coalesce(p_du_lieu, '[]'::jsonb)) loop
    v_ma := nullif(trim(coalesce(v_dong->>'ma_hang', '')), '');
    if v_ma is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', '', 'ly_do', 'Thiếu mã hàng');
      continue;
    end if;

    -- Số lượng có thể không phải số hợp lệ (ô Excel gõ nhầm chữ) — bắt riêng
    -- lỗi ép kiểu để một dòng sai không làm cả lần đọc thất bại.
    begin
      v_so_luong := nullif(v_dong->>'so_luong', '')::numeric;
    exception when invalid_text_representation then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Số lượng không phải là số');
      continue;
    end;
    if v_so_luong is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Thiếu số lượng');
      continue;
    end if;

    select * into v_sp from public.san_pham where ma_hang = v_ma;
    if v_sp.id is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Không có mã này trong danh mục');
      continue;
    end if;

    -- D-05 quyết định 3: kho của DÒNG = kho_mac_dinh_id của mã, dự phòng bằng
    -- p_kho_mac_dinh do người nạp chọn trên giao diện. Vẫn thiếu thì vào loi
    -- kèm tên mã, KHÔNG chặn cả lần nạp.
    v_kho_id := coalesce(v_sp.kho_mac_dinh_id, p_kho_mac_dinh);
    if v_kho_id is null then
      v_loi := v_loi || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã chưa có kho mặc định, chưa chọn kho để nạp');
      continue;
    end if;

    if v_so_luong = 0 then
      v_bo_qua := v_bo_qua || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Tồn KiotViet bằng 0, không cần chứng từ');
      continue;
    end if;

    -- Điều kiện bỏ qua là ĐÃ CÓ CHỨNG TỪ THẬT, KHÔNG phải ton_kho.so_luong <> 0
    -- — một mã tồn 0 vì đã xuất hết thật khác hẳn một mã tồn 0 vì chưa từng có
    -- chứng từ nào. Đây cũng là điều kiện làm lần chạy thứ hai vô hại (idempotent):
    -- sau khi nạp, mọi mã đã có kho_movement nên v_dat rỗng ở lần gọi kế tiếp.
    if exists (select 1 from public.kho_movement km where km.san_pham_id = v_sp.id) then
      v_bo_qua := v_bo_qua || jsonb_build_object('ma_hang', v_ma, 'ly_do', 'Mã đã có chứng từ thật, không nạp đè');
      continue;
    end if;

    -- Giữ nguyên dấu — KiotViet có mã đang tồn âm, chung_tu_dong cố ý không
    -- ràng buộc so_luong > 0 (0007 dòng 59: "DIEU_CHINH cần nhận cả số âm").
    v_dat := v_dat || jsonb_build_object(
      'san_pham_id', v_sp.id, 'ma_hang', v_ma, 'so_luong', v_so_luong, 'kho_id', v_kho_id
    );
  end loop;

  -- Chế độ xem trước: trả kết quả phân loại, KHÔNG ghi gì xuống database.
  -- Giữ đúng hình dạng jsonb (dat/bo_qua/so_loi/chi_tiet_dat/chi_tiet_bo_qua/loi)
  -- vì cost-import.tsx (khuôn UI dùng chung) đã dựng sẵn ba Statistic + hai
  -- bảng con theo đúng hình này.
  if p_chi_kiem_tra then
    return jsonb_build_object(
      'da_nap', false,
      'dat', jsonb_array_length(v_dat),
      'bo_qua', jsonb_array_length(v_bo_qua),
      'so_loi', jsonb_array_length(v_loi),
      'chi_tiet_dat', v_dat,
      'chi_tiet_bo_qua', v_bo_qua,
      'loi', v_loi
    );
  end if;

  -- Không còn mã nào cần nạp (mọi mã đã có chứng từ thật / tồn 0 / không hợp
  -- lệ) — KHÔNG tạo chứng từ rỗng. Đây chính là điều làm lần chạy thứ hai với
  -- cùng dữ liệu vô hại: không sinh thêm chứng từ DIEU_CHINH nào.
  if jsonb_array_length(v_dat) = 0 then
    return jsonb_build_object(
      'da_nap', false,
      'dat', 0,
      'bo_qua', jsonb_array_length(v_bo_qua),
      'so_loi', jsonb_array_length(v_loi),
      'chi_tiet_bo_qua', v_bo_qua,
      'loi', v_loi,
      'ly_do', 'Không còn mã nào cần nạp — mọi mã đã có chứng từ thật, tồn bằng 0, hoặc không hợp lệ.'
    );
  end if;

  -- Vòng 2 — DỰNG CHỨNG TỪ THẬT, chỉ chạy khi p_chi_kiem_tra = false. Khuôn
  -- tao_phieu_xuat_tu_don (0056): insert header rồi insert...select N dòng.
  -- chung_tu.kho_id NOT NULL nên phiếu buộc phải có kho đầu phiếu — lấy kho
  -- của dòng dat ĐẦU TIÊN; mỗi dòng vẫn tự đi đúng kho của mình qua
  -- chung_tu_dong.kho_id + _ghi_so_dieu_chinh đã vá ở trên.
  insert into public.chung_tu (so_ct, loai_ct, kho_id, ghi_chu)
  values (
    public.sinh_so_ct('DIEU_CHINH'::public.loai_ct),
    'DIEU_CHINH',
    (v_dat->0->>'kho_id')::uuid,
    '[NAP_TON_TAM] Số tạm từ KiotViet, CHƯA đếm thực tế. Kiểm kê Phase 6 sẽ đè lên bằng phiếu điều chỉnh (D-05).'
  )
  returning * into v_ct;

  -- don_gia/thanh_tien = 0: đây là điều chỉnh SỐ LƯỢNG, không mang tiền.
  insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, don_gia, thanh_tien, kho_id)
  select v_ct.id, (d->>'san_pham_id')::uuid, (d->>'so_luong')::numeric, 0, 0, (d->>'kho_id')::uuid
  from jsonb_array_elements(v_dat) d;

  -- Ghi sổ TỰ ĐỘNG trong cùng transaction — không trả về chứng từ còn ở
  -- NHAP_LIEU. KHÔNG bọc exception when others: lỗi ở dòng thứ n phải
  -- rollback cả n-1 dòng trước (nguyên tắc kiến trúc số 4), để transaction
  -- ngầm định của RPC tự lo việc đó.
  perform public.ghi_so_chung_tu(v_ct.id);

  return jsonb_build_object(
    'da_nap', true,
    'dat', jsonb_array_length(v_dat),
    'bo_qua', jsonb_array_length(v_bo_qua),
    'so_loi', jsonb_array_length(v_loi),
    'chi_tiet_bo_qua', v_bo_qua,
    'loi', v_loi,
    'chung_tu_id', v_ct.id,
    'so_ct', v_ct.so_ct
  );
end;
$$;

revoke all    on function public.nap_ton_tam(jsonb, uuid, boolean) from public, anon;
grant execute on function public.nap_ton_tam(jsonb, uuid, boolean) to authenticated;

comment on function public.nap_ton_tam(jsonb, uuid, boolean) is
  'D-05/TON-01: nạp tồn hiện tại của KiotViet làm SỐ TẠM qua đúng một chứng từ DIEU_CHINH đã ghi sổ — KHÔNG phải tồn đầu kỳ chính thức, Phase 6 kiểm kê thật sẽ đè lên bằng phiếu điều chỉnh riêng. Chỉ vai trò quan_ly. p_chi_kiem_tra = true (mặc định) là xem trước, không ghi gì. Kho của từng dòng = san_pham.kho_mac_dinh_id, dự phòng bằng p_kho_mac_dinh; thiếu cả hai thì mã đó vào nhóm loi, không chặn cả lần nạp. Mã đã có kho_movement thật bị BỎ QUA (không nạp đè) — đây cũng là lý do gọi lại lần hai với cùng dữ liệu không sinh thêm chứng từ nào (idempotent). ghi_chu bắt đầu bằng tiền tố cố định [NAP_TON_TAM] để Phase 6 lọc ra bằng ghi_chu like ''[NAP_TON_TAM]%'' thay vì so khớp câu tiếng Việt dài dễ gõ sai.';
