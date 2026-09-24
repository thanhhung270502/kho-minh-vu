# Phase 6: Kiểm kê & Go-live - Research

**Researched:** 2026-09-24
**Domain:** Kiểm kê tồn kho (chứng từ nghiệp vụ mới trên hạ tầng chung_tu sẵn có) +
tra cứu dữ liệu lưu trữ chỉ-đọc (PostgREST/Supabase, RLS theo cột quyền per-user)
**Confidence:** HIGH cho phần dùng lại hạ tầng đã có (chứng từ, RLS, Excel, tìm kiếm);
MEDIUM cho phần thiết kế mới (mô hình phiên kiểm kê, công tắc quyền per-user) vì chưa
có tiền lệ y hệt trong dự án — nhưng mọi mảnh ghép cần thiết đều đã có khuôn để nhân bản.

## Summary

Phase 6 không cần công nghệ mới — không cài thêm package nào. Toàn bộ việc là **nhân
bản đúng khuôn đã chạy** (chứng từ NHAP_LIEU → HOAN_THANH, RPC SECURITY DEFINER tự
kiểm quyền, Excel đọc bằng `excel-cell.ts`, tìm kiếm bằng `tim_san_pham`) cho hai mảng
việc: (1) kiểm kê — một loại chứng từ mới (`KIEM_KE`) đã có sẵn enum, RPC ghi sổ
(`_ghi_so_kiem_ke`), và cột `so_luong_he_thong` từ Phase 1, chỉ thiếu lớp RPC "mở
phiên / lưu dòng đếm / duyệt" và giao diện; (2) tra cứu lịch sử KiotViet — hai bảng
`luu_tru_*` đã có dữ liệu thật (594 + 4.732 dòng), chỉ thiếu RPC tra cứu phân trang và
màn hình.

Phát hiện quan trọng nhất: **`_ghi_so_kiem_ke` (migration 0011) đã tính đúng công thức
D-03** (`lệch = so_luong − so_luong_he_thong`, đọc giá trị đã LƯU trong dòng, không
tính lại lúc duyệt) — không cần sửa RPC ghi sổ. Việc thật sự cần làm là: RPC **lưu một
dòng đếm** phải tự đọc `ton_kho` hiện tại và ghi vào `so_luong_he_thong` **tại đúng lúc
lưu** (và lưu lại mỗi lần sửa/đếm lại), rồi khóa đường ghi trực tiếp qua PostgREST
(client hiện có thể `UPDATE chung_tu_dong` thẳng qua policy chung — phải chặn riêng
cho dòng thuộc `KIEM_KE`, buộc đi qua RPC, đúng khuôn "sổ cái không có policy ghi cho
client" đã dùng cho `kho_movement`).

Phát hiện thứ hai: **RPC `lich_su_giao_dich_doi_tac` (migration 0033, Phase 2, đã chạy
thật)** đã có một nhánh đọc hai bảng `luu_tru_*` gộp vào lịch sử đối tác, gate bằng
`v_xem_kv := vai_tro in ('quan_ly','van_phong')` — **đây là chỗ THỨ HAI** (ngoài policy
RLS ở 0016) đang chặn theo vai trò mà D-13 yêu cầu đổi sang công tắc theo từng người.
Sửa policy 0016 mà quên sửa hàm này thì tab "Lịch sử KiotViet" trong chi tiết đối tác
vẫn hở theo vai trò cũ — không đồng bộ với màn `/lich-su-kiotviet` mới.

**Đề xuất giải pháp công tắc quyền (D-13/D-14):** đọc **trực tiếp từ bảng
`nguoi_dung`** (không qua JWT claim) trong một helper SQL — giống hệt cách
`getCurrentUser()` (server component) đã đọc `vai_tro` trực tiếp từ bảng thay vì JWT để
tránh vấn đề "quyền mở rộng phải chờ token mới" (bẫy 6 CLAUDE.md). Với công tắc, tra
bảng mỗi câu lệnh là rẻ (một dòng theo khóa chính `auth.uid()`, không phải quét
3.266 mã), nên **cả hai chiều bật/tắt đều có hiệu lực ngay lập tức** — né hoàn toàn giới
hạn "nâng quyền phải chờ token" mà D-15 cảnh báo trước. Đây là điểm khác trục với cách
`vai_tro_hien_tai()`/`kho_hien_tai()` đọc JWT claim (lý do ở đó là tránh join bảng theo
TỪNG DÒNG khi lọc bảng lớn `ton_kho`/`kho_movement`; ở đây các bảng bị chặn
(`luu_tru_*`) chỉ đọc, không phải bảng chính của mọi RLS trong hệ).

**Primary recommendation:** xây kiểm kê như MỘT `chung_tu` (`loai_ct='KIEM_KE'`) mỗi
kho mỗi phiên (không phải mỗi nhóm hàng) — nhóm hàng chỉ là bộ lọc chia việc trên màn
đếm, không phải ranh giới chứng từ; dùng công tắc quyền đọc trực tiếp từ bảng
`nguoi_dung` (không qua JWT) cho cả D-13 lẫn D-14; không cần đổi `_ghi_so_kiem_ke`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chốt tồn sổ theo dòng tại lúc lưu (D-03) | Database (RPC SECURITY DEFINER) | — | Phải atomic với đọc `ton_kho`; client không được tự tính |
| Ghi sổ kiểm kê → movement | Database (RPC `ghi_so_chung_tu`, đã có) | — | Không đổi — `_ghi_so_kiem_ke` đã đúng công thức |
| Danh sách "chưa đếm" | Database (RPC, LEFT JOIN) | Frontend (hiển thị trước duyệt) | Cần join toàn bộ danh mục theo phạm vi phiên, không tính được ở client |
| Excel mẫu đếm / import số đếm | API Route (Next.js Route Handler, server) | Frontend (upload UI) | `node:stream` chỉ chạy server (bẫy 7 CLAUDE.md) |
| Tìm mã trên màn đếm | Database (RPC `tim_san_pham`, đã có) | Frontend (ô tìm, ưu tiên khớp tuyệt đối) | Dùng lại nguyên vẹn, không đổi |
| Công tắc quyền theo người (D-13/D-14) | Database (cột `nguoi_dung` + helper SQL đọc bảng) | Frontend (Cài đặt → Người dùng, ẩn/hiện) | Chặn thật ở RLS/RPC; giao diện chỉ trang trí |
| Tra cứu lịch sử KiotViet | Database (RPC phân trang, unaccent) | Frontend (2 nơi hiển thị, dùng chung 1 RPC) | Bảng lưu trữ lớn (4.732 dòng), lọc/phân trang phải ở server |

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Đợt đếm đầu kỳ làm ngoài hệ (giấy/Excel), trong khi KiotViet vẫn chạy, đếm
  sát ngày chuyển. Số đếm = tồn đầu kỳ. Hệ chỉ nhận file và duyệt.
- **D-02:** Kiểm kê định kỳ vừa bán vừa đếm làm luôn trong Phase 6. Kho KHÔNG đóng khi
  kiểm kê; phiếu xuất/nhập vẫn ghi sổ bình thường trong lúc phiên mở.
- **D-03:** Tồn sổ chốt theo TỪNG DÒNG, tại lúc người đếm lưu số đếm của dòng đó. Lệch
  = số đếm − tồn sổ lúc lưu. Sửa đếm lại một dòng thì chốt lại tồn sổ tại lúc sửa.
- **D-04:** Nhập số đếm bằng ba đường, cùng về một phiên: điện thoại (ô tìm không dấu),
  máy tính (bảng dày văn phòng), import Excel. Chỉ màn đếm phải dùng tốt trên điện thoại.
- **D-05:** Nhiều người đếm song song, chia theo nhóm hàng; mỗi mã chỉ một người đếm —
  không cộng dồn theo vị trí, không xử lý đếm trùng.
- **D-06:** Giữ D-05 của Phase 5: tồn tạm KiotViet qua `DIEU_CHINH`, kiểm kê đầu kỳ đè
  lên bằng `KIEM_KE`. Tồn tạm HIỆN CHƯA nạp (24/09) — bước vận hành bắt buộc trước đếm.
- **D-07:** Mã trong danh mục nhưng không có trong file đếm = tồn 0, phải liệt kê "chưa
  đếm" cho người duyệt thấy. Người duyệt chấp nhận 0 hoặc trả về đếm bù.
- **D-08:** Hệ xuất file mẫu đếm theo nhóm hàng (sheet theo nhóm/người đếm): mã, tên,
  ĐVT, cột "Số đếm" trống. KHÔNG in tồn KiotViet/tồn sổ lên file đếm.
- **D-09:** Bảng lệch đợt đầu kỳ có hiện tồn KiotViet để tham khảo.
- **D-10:** Bốn nhu cầu tra cứu: khách hỏi lại đơn cũ; NCC đối chiếu; xem mã đã
  nhập/bán cho ai bao nhiêu; mở lại nguyên phiếu cũ theo số phiếu/hóa đơn.
- **D-11:** Hiện ở hai chỗ, dùng chung một bảng: màn riêng `/lich-su-kiotviet` (lọc
  loại/ngày/khách-NCC/mã/số phiếu) và tab "Lịch sử KiotViet" trong chi tiết mã hàng,
  cạnh thẻ kho. KHÔNG trộn vào thẻ kho.
- **D-12:** Tra theo khách bằng ô tìm tự do, không dấu, trên cả cột khách lẫn ghi chú.
  Không map dòng cũ vào đối tác đã tách.
- **D-13:** Quyền xem lịch sử KiotViet là công tắc theo từng người, quản lý bật/tắt
  trong Cài đặt → Người dùng. Chặn bằng RLS — thay policy 0016. Cột `ngay` là text,
  lọc khoảng ngày phải parse.
- **D-14:** Quyền duyệt phiên kiểm kê là công tắc theo từng người, quản lý bật/tắt. Ai
  cũng mở phiên/nhập đếm theo quyền hiện có; chỉ người được bật mới duyệt.
- **D-15:** Cả hai công tắc: quản lý bật; người vai trò `quan_ly` luôn có quyền, không
  tự khóa được mình. Nếu quyền đọc qua JWT claim thì bật thêm phải chờ token mới.
- **D-16:** Lệch lớn: tô nổi + trả về "đếm lại" từng dòng. Không chặn cứng, không bắt
  buộc lý do — người duyệt vẫn duyệt được nếu chấp nhận.
- **D-17:** Không cần giá. DLIEU-05 đóng — không làm thêm gì. Kiểm kê KHÔNG hiện giá
  trị lệch, KHÔNG cảnh báo giá vốn = 0.

### Claude's Discretion

- Ngưỡng "lệch lớn" (tuyệt đối/phần trăm) để tô nổi ở D-16.
- Trạng thái phiên kiểm kê (mở → đang đếm → chờ duyệt → đã duyệt) và cách ánh xạ vào
  `NHAP_LIEU`/`HOAN_THANH` của `chung_tu`; phiên nhiều nhóm → một hay nhiều chứng từ.
- Cách lưu hai công tắc quyền (cột trên `nguoi_dung` hay bảng riêng) và có đưa vào JWT
  claim hay không.
- Bố cục màn đếm mobile, màn bảng lệch, màn lịch sử; cách parse cột `ngay` text.
- Cách phân nhóm hàng cho người đếm (gán người ↔ nhóm trong phiên hay tự nhận).

### Deferred Ideas (OUT OF SCOPE)

- Phase mới — Trang tổng quan: TQAN-01, TQAN-03, TQAN-04, TQAN-05, TQAN-06, TON-03.
- Phase mới — Mobile & chuyển kho: XUAT-08, TON-04, TON-05.
- XUAT-03 (quét barcode): bỏ hẳn — không dùng barcode, không dán tem.
- DLIEU-05: đóng, không cần giá vốn.
- Map dòng lịch sử cũ vào đối tác đã tách — không làm.
- Tổng giá trị tồn/giá trị lệch kiểm kê — không làm (không dùng giá).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KKE-01 | Mở phiên kiểm kê theo kho và nhóm hàng; chốt tồn sổ tại thời điểm đếm | §Data Model — chứng từ `KIEM_KE` 1/kho/phiên, cột phạm vi nhóm hàng mới; §Pitfall 1 (chốt PER DÒNG không phải per phiên) |
| KKE-02 | Đếm trên điện thoại/máy tính/Excel, không quét mã | §Code Examples — RPC `luu_dong_kiem_ke`; §Don't Hand-Roll (dùng lại `tim_san_pham`, `excel-cell.ts`) |
| KKE-03 | Bảng lệch giữa đếm và tồn sổ | §Code Examples — RPC `danh_sach_dong_kiem_ke` / `chua_dem_kiem_ke` |
| KKE-04 | Duyệt phiên sinh `KIEM_KE`, tồn về đúng số đã đếm | §Code Examples — RPC `duyet_phien_kiem_ke` gọi `ghi_so_chung_tu` có sẵn |
| DLIEU-05 | Đóng — không cần giá vốn | Xác nhận: không đụng gì tới `gia_von`, `0044` giữ nguyên |
| DLIEU-06 | Tồn đầu kỳ từ đếm thật, không bê KiotViet | §Summary — đợt đếm đầu kỳ dùng ĐÚNG cơ chế kiểm kê định kỳ, không cần luồng riêng |
| DLIEU-07 | Tra cứu 594 dòng nhập + 4.732 dòng hóa đơn | §Data Model mục 2, §Code Examples — RPC `tra_cuu_lich_su_kiotviet`, sửa `lich_su_giao_dich_doi_tac` (0033) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Không ORM — chỉ `supabase-js` + type sinh tự động (`npm run db:types` sau mọi migration).
- RPC ghi sổ atomic: SECURITY DEFINER + `set search_path = ''` + qualify mọi object
  (kể cả toán tử `pg_trgm`: `operator(extensions.%)`, `extensions.similarity(...)`).
- Giá vốn bình quân gia quyền tính bằng trigger, không tính ở JS — không liên quan
  Phase 6 (D-17 đóng giá) nhưng `_ghi_so_kiem_ke`/`_ghi_so_dieu_chinh` vẫn đọc
  `san_pham.gia_von` (sẽ luôn = 0, không sao — không hiện ra UI theo D-17).
- Route mới dưới `src/app/(app)/`, phải thêm vào `scripts/test-route-permissions.ts`
  NGAY trong plan tạo route đó (tiền lệ 04-08, 04-10).
- URL/route tiếng Việt không dấu; DB tên bảng/cột/RPC tiếng Việt; code TypeScript
  tiếng Anh (mapper ở `types.ts`/`api/*.ts` là nơi DUY NHẤT thấy tên cột tiếng Việt).
- `npm run check` (typecheck+lint+build) + pgTAP + `verify:hook` +
  `test-route-permissions.ts` là bộ kiểm bắt buộc sau mỗi plan đụng DB/route.
- Mọi bảng mới phải bật RLS — migration nào cũng có khối tự kiểm cuối
  (`do $$ ... còn bảng chưa bật RLS ...`) — COPY khối này vào migration mới nếu tạo bảng.
- Cấm `.select('*')`/`.select()` trống sau insert/update trên `san_pham` (grant theo
  cột từ 0029) — không liên quan trực tiếp Phase 6 nhưng nếu RPC mới trả kèm thông tin
  sản phẩm phải liệt kê cột tường minh.

## Standard Stack

Không cài package mới. Dùng nguyên xi:

| Việc | Thư viện đã có | Ghi chú |
|------|---------------|---------|
| Đọc/ghi Excel | `exceljs` qua `src/shared/lib/excel-cell.ts` | `readFirstSheet` (server-only, `node:stream`) |
| Form | `react-hook-form` + `zod` | Màn đếm máy tính, form mở phiên |
| Dữ liệu server | `@tanstack/react-query` v5 + `supabase-js` | Giữ khuôn `api/*.ts` + `hooks/use*.ts` |
| UI | antd v6 + Tailwind v4 | `Statistic`, `Table`, `Tag` (tô lệch lớn), `Drawer`/`Card` cho màn đếm mobile |
| Biểu đồ | Không dùng ở Phase 6 (Recharts dành Phase 7) | — |

**Version verification:** không áp dụng — không có package mới để kiểm registry.

## Package Legitimacy Audit

**Không áp dụng.** Phase 6 không cài package mới. Bảng audit rỗng theo đúng nghĩa —
không có gì cần `slopcheck`/registry verify.

## Data Model

### 1. Kiểm kê (KKE-01..04)

**Một `chung_tu` (`loai_ct = 'KIEM_KE'`) = một phiên kiểm kê = một kho.** KHÔNG tách
theo nhóm hàng — nhóm hàng là bộ lọc chia việc trên màn đếm (D-05), không phải ranh
giới chứng từ. Lý do: `chung_tu.kho_id NOT NULL` (một kho/phiếu, khớp cách hệ thống
hiện dùng chứng từ), và việc đối chiếu "chưa đếm" (D-07) cần nhìn TOÀN BỘ kho tại một
thời điểm duyệt, tách theo nhóm sẽ phải hợp nhất nhiều chứng từ lại — phức tạp hơn
không cần thiết.

**Cột mới cần thêm** (migration mới, không sửa 0007):

```sql
alter table public.chung_tu
  add column pham_vi_nhom_hang uuid[];
comment on column public.chung_tu.pham_vi_nhom_hang is
  'CHỈ dùng cho KIEM_KE. NULL = toàn bộ kho (đếm đầu kỳ/go-live). Có giá trị = phiên
   kiểm kê định kỳ chỉ nhắm một số nhóm hàng — "chưa đếm" (D-07) chỉ tính trong phạm vi
   này, không báo thiếu cả kho.';
```

**Trạng thái phiên — KHÔNG thêm cột trạng thái mới.** Dùng đúng hai trạng thái sống có
sẵn của `chung_tu` (`NHAP_LIEU` → `HOAN_THANH`); "mở / đang đếm / chờ duyệt" là NHÃN
TÍNH TOÁN ở tầng giao diện từ tiến độ (đã đếm bao nhiêu / tổng bao nhiêu trong phạm
vi), không lưu DB. Khớp nguyên tắc kiến trúc số 1 (tồn/kết quả tính từ chứng từ, không
lưu tay) áp dụng luôn cho trạng thái hiển thị.

**Chốt tồn sổ theo TỪNG DÒNG (D-03) — RPC mới `luu_dong_kiem_ke`, KHÔNG cho client tự
UPDATE `chung_tu_dong` của phiên KIEM_KE:**

```sql
create or replace function public.luu_dong_kiem_ke(
  p_chung_tu_id uuid,
  p_san_pham_id uuid,
  p_so_luong numeric
) returns public.chung_tu_dong
language plpgsql security definer set search_path = '' as $$
declare
  v_ct public.chung_tu;
  v_ton numeric(18,4);
  v_dong public.chung_tu_dong;
begin
  select * into v_ct from public.chung_tu where id = p_chung_tu_id for update;
  if v_ct.id is null or v_ct.loai_ct <> 'KIEM_KE' then
    raise exception 'Không phải phiên kiểm kê hợp lệ' using errcode = '23514';
  end if;
  if v_ct.trang_thai <> 'NHAP_LIEU' then
    raise exception 'Phiên đã duyệt, không sửa số đếm được' using errcode = '23514';
  end if;
  if (select public.vai_tro_hien_tai()) = 'chi_xem' then
    raise exception 'Vai trò chỉ xem không đếm được' using errcode = '42501';
  end if;

  -- CHỐT tồn sổ TẠI LÚC LƯU (D-03) — đọc ton_kho NGAY BÂY GIỜ, không phải lúc mở phiên.
  select coalesce(so_luong, 0) into v_ton
  from public.ton_kho where kho_id = v_ct.kho_id and san_pham_id = p_san_pham_id;

  -- Upsert thủ công: một mã chỉ một dòng trong phiên (D-05 "mỗi mã chỉ một người đếm").
  select * into v_dong from public.chung_tu_dong
  where chung_tu_id = p_chung_tu_id and san_pham_id = p_san_pham_id;

  if v_dong.id is null then
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, so_luong_he_thong, don_gia, thanh_tien)
    values (p_chung_tu_id, p_san_pham_id, p_so_luong, v_ton, 0, 0)
    returning * into v_dong;
  else
    -- Sửa đếm lại: chốt lại tồn sổ tại lúc sửa (D-03, câu 2).
    update public.chung_tu_dong
    set so_luong = p_so_luong, so_luong_he_thong = v_ton
    where id = v_dong.id
    returning * into v_dong;
  end if;

  return v_dong;
end $$;
revoke all    on function public.luu_dong_kiem_ke(uuid, uuid, numeric) from public, anon;
grant execute on function public.luu_dong_kiem_ke(uuid, uuid, numeric) to authenticated;
```

**Khóa đường ghi trực tiếp:** policy `"tao dong chung tu tru chi xem"` và
`"chi sua dong cua chung tu nhap lieu"` (0016) hiện cho phép BẤT KỲ user không phải
`chi_xem` insert/update thẳng `chung_tu_dong` qua PostgREST — kể cả dòng thuộc
`KIEM_KE`. Nếu không chặn, ai đó gọi thẳng `.from('chung_tu_dong').insert(...)` sẽ bỏ
qua bước chốt `so_luong_he_thong`, phá D-03 âm thầm (không lỗi gì, chỉ sai số liệu).
**Phải thêm điều kiện WITH CHECK từ chối ghi trực tiếp khi chứng từ cha là `KIEM_KE`:**

```sql
drop policy "tao dong chung tu tru chi xem" on public.chung_tu_dong;
create policy "tao dong chung tu tru chi xem" on public.chung_tu_dong
  for insert to authenticated
  with check (
    (select public.vai_tro_hien_tai()) <> 'chi_xem'
    and (select ct.loai_ct from public.chung_tu ct where ct.id = chung_tu_id) <> 'KIEM_KE'
  );
-- Tương tự cho policy update — KIEM_KE chỉ ghi qua luu_dong_kiem_ke (SECURITY DEFINER,
-- bỏ qua RLS nên vẫn ghi được dù policy chặn client).
```

Đây đúng khuôn "sổ cái không có policy ghi cho client" (0016, áp cho `kho_movement`),
áp dụng thu hẹp cho MỘT loại dòng chứng từ thay vì cả bảng.

**Danh sách "chưa đếm" (D-07) — RPC đọc, không ghi:**

```sql
create or replace function public.chua_dem_kiem_ke(p_chung_tu_id uuid)
returns table(san_pham_id uuid, ma_hang text, ten_hang text, ton_hien_tai numeric)
language sql stable security definer set search_path = '' as $$
  select sp.id, sp.ma_hang, sp.ten_hang,
         coalesce(tk.so_luong, 0)
  from public.san_pham sp
  join public.chung_tu ct on ct.id = p_chung_tu_id
  left join public.ton_kho tk on tk.kho_id = ct.kho_id and tk.san_pham_id = sp.id
  where sp.dang_kinh_doanh
    and sp.kho_mac_dinh_id = ct.kho_id
    and (ct.pham_vi_nhom_hang is null or sp.nhom_hang_id = any(ct.pham_vi_nhom_hang))
    and not exists (
      select 1 from public.chung_tu_dong cd
      where cd.chung_tu_id = p_chung_tu_id and cd.san_pham_id = sp.id
    );
$$;
```

**Duyệt phiên (KKE-04) — wrapper RPC, tự kiểm quyền duyệt (D-14), xử lý D-07, rồi gọi
`ghi_so_chung_tu` có sẵn (KHÔNG đổi `_ghi_so_kiem_ke`):**

```sql
create or replace function public.duyet_phien_kiem_ke(
  p_chung_tu_id uuid,
  p_chap_nhan_khong_dem uuid[] default '{}'::uuid[]  -- san_pham_id được chấp nhận = 0
) returns public.chung_tu
language plpgsql security definer set search_path = '' as $$
declare v_ct public.chung_tu; v_sp uuid; v_ton numeric;
begin
  if not (select public.duyet_duoc_kiem_ke()) then
    raise exception 'Không có quyền duyệt kiểm kê' using errcode = '42501';
  end if;
  select * into v_ct from public.chung_tu where id = p_chung_tu_id and loai_ct = 'KIEM_KE';
  if v_ct.id is null then raise exception 'Không tìm thấy phiên' using errcode = '23514'; end if;

  -- D-07: mã được người duyệt CHỌN chấp nhận 0 -> tạo dòng đếm = 0, chốt tồn sổ NGAY LÚC DUYỆT.
  foreach v_sp in array p_chap_nhan_khong_dem loop
    select coalesce(so_luong,0) into v_ton from public.ton_kho
      where kho_id = v_ct.kho_id and san_pham_id = v_sp;
    insert into public.chung_tu_dong (chung_tu_id, san_pham_id, so_luong, so_luong_he_thong, don_gia, thanh_tien)
    values (p_chung_tu_id, v_sp, 0, v_ton, 0, 0)
    on conflict do nothing; -- (nếu thêm unique index; xem ghi chú dưới)
  end loop;

  return public.ghi_so_chung_tu(p_chung_tu_id); -- đã có sẵn, không đổi
end $$;
revoke all    on function public.duyet_phien_kiem_ke(uuid, uuid[]) from public, anon;
grant execute on function public.duyet_phien_kiem_ke(uuid, uuid[]) to authenticated;
```

> **Ghi chú `on conflict do nothing`:** cần một unique index để câu này hợp lệ. Vì
> `chung_tu_dong` KHÔNG có ràng buộc unique (NHAP/XUAT cho phép nhiều dòng cùng mã khi
> chia theo kho — 0041), không thể thêm unique bảng rộng. Cách an toàn: kiểm tồn tại
> bằng `if not exists (...) then insert...` (như `luu_dong_kiem_ke` đã làm) thay vì dựa
> `on conflict`. Planner chọn một trong hai, ưu tiên `if not exists` để nhất quán.

### 2. Tra cứu lịch sử KiotViet (DLIEU-07)

**Xác nhận định dạng cột `ngay`:** đọc `scripts/import-kiotviet/load-data.ts` +
`src/shared/lib/excel-cell.ts::readExcelDate` — cột `ngay` (text) được ghi bằng
`readExcelDate()`, cho ra chuỗi ISO-8601 có offset tường minh, ví dụ
`"2026-09-12T15:43:00+07:00"`. **[VERIFIED: đọc mã nguồn import]** — không phải chuỗi
tự do, ép kiểu `ngay::timestamptz` an toàn và ĐÃ ĐƯỢC DÙNG trong sản xuất
(`lich_su_giao_dich_doi_tac`, migration 0033, dòng `min(l.ngay::timestamptz)`). Lọc
khoảng ngày dùng thẳng:

```sql
where l.ngay::timestamptz >= p_tu_ngay and l.ngay::timestamptz < p_den_ngay + interval '1 day'
```

**RPC tra cứu mới, khuôn chép từ `danh_sach_ghi_chu_kiotviet` (0033) — cùng
`SECURITY DEFINER STABLE`, cùng `count(*) over()` phân trang, cùng `f_unaccent` + `%`
qua `operator(extensions.%)`:**

```sql
create or replace function public.tra_cuu_lich_su_kiotviet(
  p_loai text default null,          -- 'NHAP' | 'XUAT' | null (cả hai)
  p_tu_khoa text default null,       -- khớp mã hàng, khách/NCC, ghi chú (D-12)
  p_tu_ngay date default null,
  p_den_ngay date default null,
  p_so_phieu text default null,
  p_trang integer default 1,
  p_kich_thuoc integer default 50
) returns table(
  nguon text, ma_phieu text, ngay timestamptz, doi_tac text,
  ma_hang text, ten_hang text, so_luong numeric, ghi_chu text, tong_so_dong bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select public.xem_duoc_lich_su_kiotviet()) then
    raise exception 'Không có quyền xem lịch sử KiotViet' using errcode = '42501';
  end if;
  return query
  with tat_ca as (
    select 'NHAP'::text as nguon, l.ma_phieu, l.ngay::timestamptz as ngay,
           l.nha_cung_cap as doi_tac, l.ma_hang, l.ten_hang, l.so_luong, l.ghi_chu
    from public.luu_tru_nhap_kiotviet l
    where (p_loai is null or p_loai = 'NHAP')
    union all
    select 'XUAT'::text, h.ma_hoa_don, h.ngay::timestamptz,
           h.khach_hang, h.ma_hang, h.ten_hang, h.so_luong, h.ghi_chu
    from public.luu_tru_hoa_don_kiotviet h
    where (p_loai is null or p_loai = 'XUAT')
  )
  select t.*, count(*) over ()
  from tat_ca t
  where (p_tu_ngay is null or t.ngay >= p_tu_ngay)
    and (p_den_ngay is null or t.ngay < p_den_ngay + 1)
    and (p_so_phieu is null or t.ma_phieu = p_so_phieu)
    and (nullif(trim(coalesce(p_tu_khoa,'')),'') is null or
         public.f_unaccent(coalesce(t.ma_hang,'') || ' ' || coalesce(t.doi_tac,'') || ' ' || coalesce(t.ghi_chu,''))
           ilike '%' || public.f_unaccent(trim(p_tu_khoa)) || '%')
  order by t.ngay desc nulls last
  limit least(greatest(coalesce(p_kich_thuoc,50),1),500)
  offset (greatest(coalesce(p_trang,1),1)-1) * least(greatest(coalesce(p_kich_thuoc,50),1),500);
end $$;
revoke all    on function public.tra_cuu_lich_su_kiotviet(text,text,date,date,text,int,int) from public, anon;
grant execute on function public.tra_cuu_lich_su_kiotviet(text,text,date,date,text,int,int) to authenticated;
```

Cột "mở lại nguyên phiếu" (D-10 mục 4): frontend gọi lại cùng RPC lọc theo
`p_so_phieu`, hiện mọi dòng của số phiếu đó (không cần RPC riêng).

**Tab trong chi tiết mã hàng:** lọc thêm `p_ma_hang` (thêm tham số hoặc lọc client-side
sau khi gọi với `p_tu_khoa = ma_hang` — khuyến nghị thêm tham số `p_ma_hang exact`
riêng để không lẫn với tìm mờ theo `p_tu_khoa`).

**BẮT BUỘC sửa cùng lúc — không chỉ policy 0016:**

1. `luu_tru_nhap_kiotviet` / `luu_tru_hoa_don_kiotviet` — policy SELECT hiện tại
   (`vai_tro_hien_tai() in ('quan_ly','van_phong')`, 0016) đổi thành gọi helper mới.
2. **`lich_su_giao_dich_doi_tac` (0033, ĐÃ CHẠY THẬT trên production)** — dòng
   `v_xem_kv := v_vai_tro in ('quan_ly','van_phong');` PHẢI đổi thành
   `v_xem_kv := (select public.xem_duoc_lich_su_kiotviet());`. Đây là RPC của Phase 2
   (DTAC-03, "xem lịch sử giao dịch đối tác") — nó ĐÃ gộp sẵn hai bảng `luu_tru_*` vào
   kết quả. Bỏ sót chỗ này là để lại một cửa hở quyền song song với cửa đã sửa.

### 3. Công tắc quyền theo từng người (D-13, D-14, D-15)

**Khuyến nghị: cột trên `nguoi_dung`, đọc trực tiếp từ bảng (không qua JWT claim).**

```sql
alter table public.nguoi_dung
  add column xem_lich_su_kiotviet boolean not null default false,
  add column duyet_kiem_ke        boolean not null default false;

create or replace function public.xem_duoc_lich_su_kiotviet()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select vai_tro = 'quan_ly' or xem_lich_su_kiotviet
     from public.nguoi_dung where id = auth.uid() and dang_hoat_dong),
    false);
$$;
create or replace function public.duyet_duoc_kiem_ke()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select vai_tro = 'quan_ly' or duyet_kiem_ke
     from public.nguoi_dung where id = auth.uid() and dang_hoat_dong),
    false);
$$;
revoke all    on function public.xem_duoc_lich_su_kiotviet() from public, anon;
revoke all    on function public.duyet_duoc_kiem_ke()        from public, anon;
grant execute on function public.xem_duoc_lich_su_kiotviet() to authenticated;
grant execute on function public.duyet_duoc_kiem_ke()        to authenticated;
```

**Vì sao đọc bảng thay vì JWT claim (khác `vai_tro_hien_tai()`/`kho_hien_tai()`):**
- `vai_tro_hien_tai()`/`kho_hien_tai()` đọc JWT trước rồi ĐỐI CHIẾU bảng — lý do lịch
  sử (0003) là để RLS lọc **theo từng dòng** trên bảng lớn (`ton_kho`, `kho_movement`,
  `chung_tu`) không phải quét bảng `nguoi_dung` mỗi dòng.
- Hai công tắc mới chỉ chặn SELECT trên **hai bảng nhỏ, không lọc theo dòng theo user**
  (`luu_tru_*`) và một RPC (`duyet_phien_kiem_ke`) gọi MỘT LẦN mỗi thao tác duyệt — chi
  phí đọc `nguoi_dung` một dòng theo khóa chính, MỘT LẦN mỗi câu lệnh (nhờ bọc
  `(select fn())` thành InitPlan, đúng ghi chú `.memory/patterns/supabase-rls-bao-mat.md`
  mục 7), là không đáng kể.
- Đổi lại: **CẢ nâng quyền lẫn hạ quyền đều có hiệu lực ngay câu lệnh kế tiếp** — không
  phải chờ JWT làm mới. Đây là cách né được đúng cảnh báo D-15 nêu ra thay vì phải giải
  thích cho người dùng "bật quyền phải đợi tối đa 60 phút".

**D-15 "quản lý luôn có quyền, không tự khóa được mình":** đã thỏa bằng
`vai_tro = 'quan_ly' or <cột>` trong cả hai helper — không cần logic riêng ở tầng ghi
(quản lý tắt công tắc chính mình cũng không mất quyền, vì điều kiện OR).

**Frontend:** mở rộng `CurrentUser` (`current-user.server.ts`) thêm hai field đọc từ
CÙNG MỘT truy vấn đã có (`getCurrentUser()` hiện đã `select` từ `nguoi_dung`, chỉ cần
thêm hai cột vào danh sách select):

```ts
export type CurrentUser = {
  // ...existing
  canViewKiotVietHistory: boolean;  // vai_tro === 'quan_ly' || xem_lich_su_kiotviet
  canApproveStocktake: boolean;     // vai_tro === 'quan_ly' || duyet_kiem_ke
};
```

Đây KHÔNG thuộc `PERMISSION_MATRIX` (`shared/lib/permissions.ts`) vì không theo vai
trò — matrix đó chủ đích chỉ ánh xạ `Role → Permission`. Thêm hai field riêng trên
`CurrentUser`, không ép vào `hasPermission()`.

**Cài đặt → Người dùng:** `UserDrawer` (đã có, sửa vai trò/kho) thêm hai
`Checkbox`, disable khi `role === 'quan_ly'` (đã luôn có quyền, tô tick sẵn, không cho
tắt — tránh hiểu lầm "tắt được nhưng không có tác dụng"). RPC
`luu_ho_so_nguoi_dung` (0026) cần thêm hai tham số
`p_xem_lich_su_kiotviet boolean, p_duyet_kiem_ke boolean`.

**JWT claim: KHÔNG cần đưa vào.** Vì helper đọc bảng trực tiếp, không có claim nào để
thêm — tránh luôn rủi ro quên làm mới token (bẫy 6 CLAUDE.md không áp dụng ở đây).

## Architecture Patterns

### System Architecture Diagram

```
┌─── Mở phiên ───┐
│ Chọn kho (+ nhóm hàng tùy chọn) → INSERT chung_tu(loai_ct=KIEM_KE, NHAP_LIEU)
└────────┬────────┘
         │
         ▼
┌──────────────────── Đếm (D-04, ba đường vào MỘT phiên) ────────────────────┐
│  Điện thoại: tim_san_pham() → chọn mã → luu_dong_kiem_ke()                 │
│  Máy tính:   bảng dày, cùng RPC luu_dong_kiem_ke() mỗi dòng                │
│  Excel:      đọc file (excel-cell.ts) → vòng lặp gọi luu_dong_kiem_ke()    │
│              hoặc RPC gộp nhieu_dong_kiem_ke(jsonb) khuôn nap_ton_tam      │
│                                                                              │
│  luu_dong_kiem_ke(): đọc ton_kho NGAY LÚC GỌI → ghi so_luong_he_thong      │
│  (D-03 — chốt PER DÒNG, không phải lúc mở phiên; kho vẫn nhận XUAT/NHAP    │
│  song song trong lúc này, D-02, không khóa gì)                             │
└────────────────────────────┬─────────────────────────────────────────────┘
                              │
                              ▼
┌─────────── Bảng lệch + chưa đếm (KKE-03, D-07, D-16) ───────────┐
│  chua_dem_kiem_ke(phien) → LEFT JOIN san_pham thiếu dòng         │
│  SELECT chung_tu_dong WHERE chung_tu_id → tính lệch = đếm - so_luong_he_thong │
│  tô nổi |lệch| vượt ngưỡng (Claude's Discretion — đề xuất |lệch|≥5 hoặc ≥10%) │
└────────────────────────────┬─────────────────────────────────────┘
                              │ (chỉ người duyet_duoc_kiem_ke() bấm được)
                              ▼
┌──── duyet_phien_kiem_ke() ────┐
│ 1. Kiểm quyền duyệt (D-14)     │
│ 2. Với mã "chấp nhận 0" (D-07): tạo dòng so_luong=0, chốt so_luong_he_thong │
│ 3. Gọi ghi_so_chung_tu() — CÓ SẴN, KHÔNG ĐỔI                                │
│    → _ghi_so_kiem_ke() mỗi dòng: lệch = so_luong - so_luong_he_thong        │
│    → INSERT kho_movement (sổ cái bất biến) → trigger cập nhật ton_kho       │
│    → UPDATE chung_tu SET trang_thai = HOAN_THANH                           │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────── Tra cứu lịch sử KiotViet (song song, độc lập) ───────────────┐
│ /lich-su-kiotviet (màn riêng) ──┐                                          │
│ Tab "Lịch sử KiotViet" (chi tiết mã hàng) ──┴──→ tra_cuu_lich_su_kiotviet() │
│                                    → xem_duoc_lich_su_kiotviet() (RLS/RPC gate) │
│ lich_su_giao_dich_doi_tac() (0033, ĐÃ CÓ) — PHẢI sửa cùng gate              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/features/stocktake/                  # mới — không tái dùng inventory (khác nghiệp vụ)
├── types.ts                             # StocktakeSession, StocktakeLine (mapper snake→camel)
├── schemas/stocktake.schema.ts          # zod cho form mở phiên, đếm tay
├── api/stocktake.api.ts                 # gọi RPC: mo_phien, luu_dong_kiem_ke, chua_dem, duyet
├── api/stocktake.keys.ts
├── hooks/useStocktake.ts
└── components/
    ├── session-list.tsx                 # danh sách phiên
    ├── open-session-form.tsx            # chọn kho + nhóm hàng (tùy chọn)
    ├── count-mobile.tsx                 # màn đếm điện thoại (ô tìm + stepper)
    ├── count-desk-table.tsx             # bảng dày văn phòng, bàn phím (khuôn issue-line-table)
    ├── count-excel-import.tsx           # khuôn excel-import.tsx (products)
    ├── discrepancy-table.tsx            # bảng lệch, tô nổi, danh sách chưa đếm
    └── approve-session-button.tsx       # nút duyệt, disabled nếu !canApproveStocktake

src/features/kiotviet-history/           # mới — DLIEU-07
├── types.ts
├── api/kiotviet-history.api.ts          # gọi tra_cuu_lich_su_kiotviet
├── hooks/useKiotVietHistory.ts
└── components/
    ├── history-filter-panel.tsx         # loại/khoảng ngày/khách-NCC/mã/số phiếu
    ├── history-table.tsx                # dùng chung ở /lich-su-kiotviet lẫn tab chi tiết
    └── product-history-tab.tsx          # wrapper cho tab trong danh-muc/[id]

src/app/(app)/
├── kiem-ke/page.tsx                     # danh sách phiên
├── kiem-ke/[id]/page.tsx                # chi tiết phiên: đếm + bảng lệch (tab nội bộ)
└── lich-su-kiotviet/page.tsx            # màn tra cứu riêng (D-11)

src/app/api/kiem-ke/
├── mau-excel/route.ts                   # xuất file mẫu đếm theo nhóm (D-08)
└── nhap-excel/route.ts                  # đọc file đã điền, trả preview (khuôn nap_ton_tam)

supabase/migrations/
├── 00XX_kiem_ke_rpc.sql                 # cột pham_vi_nhom_hang, luu_dong_kiem_ke,
│                                         # chua_dem_kiem_ke, duyet_phien_kiem_ke,
│                                         # policy chặn ghi trực tiếp chung_tu_dong KIEM_KE
├── 00XX_cong_tac_quyen.sql              # cột nguoi_dung, 2 helper, sửa luu_ho_so_nguoi_dung
└── 00XX_lich_su_kiotviet_rpc.sql        # tra_cuu_lich_su_kiotviet, sửa policy 0016 +
                                          # sửa lich_su_giao_dich_doi_tac (0033)
```

### Pattern 1: RPC lưu một dòng đếm — upsert bằng đọc-rồi-quyết (không `ON CONFLICT`)

**What:** Vì `chung_tu_dong` không có unique constraint (NHAP/XUAT cần nhiều dòng cùng
mã khi chia theo kho, 0041), upsert số đếm phải tự kiểm tồn tại bằng SELECT trước rồi
INSERT/UPDATE trong cùng transaction (RPC), khóa dòng chứng từ (`for update`) để tránh
hai người cùng lưu một mã cùng lúc tạo hai dòng trùng.

**When to use:** Mọi lần lưu số đếm (ba đường D-04 đều gọi cùng RPC này, kể cả import
Excel — lặp qua từng dòng file, hoặc gói jsonb gọi một hàm bọc ngoài).

**Example:** xem `luu_dong_kiem_ke` ở §Data Model mục 1.

### Pattern 2: Danh sách "chưa đếm" bằng LEFT JOIN phủ định (khuôn đã có ở `danh_sach_ton_kho`)

**What:** Không lưu trạng thái "đã đếm/chưa đếm" trên `san_pham` — tính bằng
`LEFT JOIN ... WHERE NOT EXISTS`, đúng nguyên tắc kiến trúc số 1 (không lưu tay cái
tính được).

**When to use:** Màn bảng lệch trước khi duyệt, và badge số lượng "còn N mã chưa đếm"
trên danh sách phiên.

### Pattern 3: Excel mẫu không lộ tồn — chỉ 3-4 cột

**What:** `TEMPLATE_COLUMNS` kiểu `products/excel-template.ts` nhưng KHÔNG có cột
`exportOnly` chứa tồn — chỉ `ma_hang`, `ten_hang`, `dvt`, và một cột trống `so_dem`.

```typescript
// Source: khuôn src/features/products/lib/excel-template.ts, KHÔNG có cột tồn (D-08)
export const STOCKTAKE_TEMPLATE_COLUMNS = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 40 },
  { key: "dvt", title: "ĐVT", width: 10 },
  { key: "so_dem", title: "Số đếm", width: 12 }, // để trống khi xuất
] as const;
```

**Xuất nhiều sheet/nhiều file theo nhóm hàng (D-08 "sheet theo nhóm/người đếm"):**
`src/shared/lib/excel-cell.ts::readFirstSheet` **chỉ đọc SHEET ĐẦU TIÊN** — nếu xuất
một workbook nhiều sheet (mỗi nhóm một sheet), route nhập lại KHÔNG đọc được các sheet
sau mà không sửa `excel-cell.ts` để duyệt hết `workbook.worksheets`. **Khuyến nghị:
xuất MỖI NHÓM MỘT FILE riêng** (người dùng chọn nhóm hàng trước khi tải, hoặc tải lần
lượt từng nhóm qua dropdown) — tái dùng nguyên `readFirstSheet` không sửa gì, đơn giản
hơn việc dạy `excel-cell.ts` đọc nhiều sheet. Đây là điểm "Claude's Discretion — cách
phân nhóm hàng cho người đếm"; nếu planner muốn multi-sheet thật (một file, nhiều
sheet), phải thêm hàm đọc-tất-cả-sheet vào `excel-cell.ts` (việc thêm, không sửa hàm
cũ, không phá `readFirstSheet` đang dùng ở nơi khác).

### Pattern 4: Ngưỡng "lệch lớn" (D-16) — hằng số, không cấu hình DB

**What:** Không cần bảng cấu hình — một hằng số ở tầng ứng dụng (hoặc tính ở RPC nếu
muốn nhất quán export/UI):

```typescript
// Đề xuất — không có yêu cầu số cụ thể từ người dùng, cần XÁC NHẬN LẠI ở discuss-phase
// nếu muốn số khác. Logic OR: lệch tuyệt đối lớn HOẶC lệch phần trăm lớn (mã tồn ít
// vẫn cần bắt được lệch 100%, mã tồn nhiều cần bắt được lệch tuyệt đối dù % nhỏ).
export function isLargeDiscrepancy(dem: number, soSach: number): boolean {
  const lech = Math.abs(dem - soSach);
  if (lech === 0) return false;
  if (lech >= 5) return true;
  return soSach > 0 && lech / soSach >= 0.1;
}
```

### Anti-Patterns to Avoid

- **Đổi `_ghi_so_kiem_ke`/`ghi_so_chung_tu`:** KHÔNG cần. Công thức đã đúng D-03 từ
  Phase 1. Đổi hàm này là rủi ro không cần thiết cho một hàm đã chạy production
  (dùng chung dispatcher với 6 loại chứng từ khác).
- **Thêm cột trạng thái phiên kiểm kê riêng:** vi phạm nguyên tắc kiến trúc số 1 — trạng
  thái hiển thị tính được từ tiến độ đếm, không cần lưu.
- **Cho phép client `UPDATE chung_tu_dong` trực tiếp cho dòng KIEM_KE:** phá D-03 âm
  thầm (không lỗi, chỉ sai số) — phải chặn bằng policy như đã nêu.
- **Đọc công tắc quyền qua JWT claim:** không cần thiết cho khối lượng đọc nhỏ
  (`nguoi_dung` một dòng), và tự tạo ra đúng vấn đề "chờ token mới" mà D-15 đã cảnh báo
  trước — đọc bảng trực tiếp né được hoàn toàn.
- **Sửa policy 0016 mà bỏ sót `lich_su_giao_dich_doi_tac` (0033):** để lại hai cơ chế
  quyền không đồng bộ trên cùng dữ liệu.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tìm mã trên màn đếm | Ô tìm tự chế, gọi `ilike` trực tiếp | `tim_san_pham()` RPC có sẵn | Đã có unaccent + ưu tiên khớp tuyệt đối (bẫy 15) + trigram, kiểm đủ pgTAP |
| Đọc file Excel | Reader Excel tự viết | `readFirstSheet`/`readNumber`/`readString` (`excel-cell.ts`) | Đã xử lý 3 bẫy KiotViet thật (styles crash, dòng tổng, rich text) |
| Phân trang + đếm tổng | Query riêng đếm `count` rồi query riêng lấy trang | `count(*) over ()` trong CTE — khuôn mọi RPC danh sách đã dùng | Một round-trip, nhất quán snapshot |
| Ghi sổ kiểm kê | Server Action tự UPDATE `ton_kho` | `ghi_so_chung_tu()` có sẵn, không đổi | Atomic, đã có transaction, đã có kiểm quyền, đã có test |
| Tìm không dấu | Regex/JS strip accent | `public.f_unaccent()` + `operator(extensions.%)` | Đã có index trigram khớp biểu thức (0005) |

**Key insight:** Phase 6 gần như không có "vấn đề mới" về mặt kỹ thuật — mọi khối đã
có khuôn chạy thật trong 5 phase trước. Rủi ro thật sự nằm ở CHỖ NỐI (quên sửa một
trong hai nơi chặn quyền lịch sử, quên khóa đường ghi trực tiếp `chung_tu_dong`), không
nằm ở việc phát minh cơ chế mới.

## Common Pitfalls

### Pitfall 1: Tưởng phải sửa `_ghi_so_kiem_ke` vì CONTEXT.md cảnh báo

**What goes wrong:** Đọc câu cảnh báo trong 06-CONTEXT.md ("planner phải đổi
nghĩa/thời điểm ghi của `so_luong_he_thong`") rồi đi sửa hàm ghi sổ `_ghi_so_kiem_ke`
hoặc `ghi_so_chung_tu` — hai hàm này ĐANG ĐÚNG, không cần đổi.

**Why it happens:** Câu cảnh báo mô tả đúng hiện trạng NHƯNG hiện trạng đó là "chưa có
gì ghi `so_luong_he_thong` cả" (không có RPC lưu dòng đếm nào tồn tại trước Phase 6),
không phải "hàm ghi sai công thức". Đọc nhanh dễ hiểu nhầm thành "công thức sai, phải
sửa công thức".

**How to avoid:** Việc cần làm là XÂY MỘT RPC MỚI (`luu_dong_kiem_ke`) đặt đúng giá trị
vào cột đã có, đúng LÚC (tại thời điểm lưu, không phải lúc mở phiên) — không đổi công
thức tính lệch ở `_ghi_so_kiem_ke`.

**Warning signs:** Plan có task "sửa `0011_rpc_ghi_so.sql`" hoặc "sửa
`_ghi_so_kiem_ke`" — dừng lại, kiểm tra lại xem có thật sự cần không (không cần).

### Pitfall 2: Quên khóa client-side write path cho `chung_tu_dong` của KIEM_KE

**What goes wrong:** Xây RPC `luu_dong_kiem_ke` đúng, nhưng để nguyên policy 0016 —
client vẫn `.from('chung_tu_dong').update({so_luong: 99})` thẳng qua PostgREST được
(không phải chi_xem), bỏ qua chốt `so_luong_he_thong`. Không lỗi gì lúc chạy — số liệu
âm thầm sai.

**Why it happens:** Policy 0016 cho phép ghi mọi dòng chứng từ `NHAP_LIEU` không phân
biệt loại, vì lúc viết 0016 (Phase 1) chưa có khái niệm "dòng phải ghi qua RPC riêng".

**How to avoid:** Thêm điều kiện `loai_ct <> 'KIEM_KE'` vào WITH CHECK của cả hai
policy ghi (`tao dong`, `chi sua dong`) — như đã viết ở §Data Model mục 1.

**Warning signs:** pgTAP không kiểm được điều này qua RPC (RPC luôn đúng) — phải viết
test GỌI THẲNG `.from('chung_tu_dong').insert(...)` dưới role `authenticated` với
`chung_tu_id` trỏ tới một phiên `KIEM_KE` và assert bị chặn (42501/RLS).

### Pitfall 3: Sửa quyền lịch sử ở một nơi, quên nơi thứ hai (0033)

**What goes wrong:** Sửa policy `luu_tru_nhap_kiotviet`/`luu_tru_hoa_don_kiotviet`
(0016) đúng theo D-13, nhưng để nguyên `v_xem_kv := vai_tro in (...)` trong
`lich_su_giao_dich_doi_tac` (0033). Tab lịch sử giao dịch đối tác (DTAC-03, đã chạy)
vẫn lộ theo vai trò cũ dù RLS bảng gốc đã đổi — vì hàm là `SECURITY DEFINER`, TỰ đọc
biến `v_xem_kv` chứ không đi qua RLS của hai bảng đó.

**Why it happens:** `SECURITY DEFINER` bỏ qua RLS — sửa RLS không ảnh hưởng gì tới
logic bên trong hàm đã có, phải sửa CẢ HAI nơi tách biệt.

**How to avoid:** Grep toàn bộ `supabase/migrations/*.sql` tìm
`luu_tru_nhap_kiotviet\|luu_tru_hoa_don_kiotviet` trước khi coi là xong — đã tìm thấy
đúng 1 chỗ khác ngoài 0016/0010: `0033_ra_ghi_chu_lich_su.sql`.

**Warning signs:** UAT bật/tắt công tắc cho một user văn phòng — nếu tab "Lịch sử
giao dịch" ở trang đối tác vẫn hiện dữ liệu KiotViet dù công tắc tắt, đây là dấu hiệu.

### Pitfall 4: Excel multi-sheet export nhưng import chỉ đọc sheet đầu

**What goes wrong:** D-08 gợi ý "sheet theo nhóm hàng" — dựng một workbook nhiều sheet,
rồi phát hiện route nhập (`readFirstSheet`) chỉ đọc sheet 1, dữ liệu các nhóm khác bị
lặng lẽ bỏ qua khi người dùng import lại nguyên file đa-sheet.

**Why it happens:** `readFirstSheet` được đặt tên và viết đúng như tên — chưa từng có
nhu cầu đọc nhiều sheet trong dự án tới giờ.

**How to avoid:** Xuất một file riêng mỗi nhóm hàng (khuyến nghị chính, xem Pattern 3),
hoặc nếu chọn multi-sheet, THÊM hàm đọc hết sheet vào `excel-cell.ts` TRƯỚC khi viết
route import, và viết rõ trong task đó.

### Pitfall 5: Tính "chưa đếm" sai phạm vi kho khi mã có `kho_mac_dinh_id` khác kho phiên

**What goes wrong:** RPC `chua_dem_kiem_ke` lọc `sp.kho_mac_dinh_id = ct.kho_id` — nếu
sau này có `CHUYEN_KHO` (Phase 8) làm một mã có tồn thật ở kho KHÁC với
`kho_mac_dinh_id` của nó, mã đó sẽ không bao giờ xuất hiện trong danh sách "chưa đếm"
của kho đang có tồn thật, dù đang có hàng ở đó cần đếm.

**Why it happens:** Tại thời điểm Phase 6, `CHUYEN_KHO` chưa tồn tại (Phase 8) nên mọi
tồn đều khớp `kho_mac_dinh_id` — giả định này đúng NGAY BÂY GIỜ nhưng sẽ sai sau
Phase 8.

**How to avoid:** Cân nhắc lọc theo `EXISTS (ton_kho tại kho phiên VÀ số lượng ≠ 0) OR
kho_mac_dinh_id = kho phiên` thay vì chỉ `kho_mac_dinh_id`. Ghi rõ trong migration
comment lý do chọn cách nào — đây cũng là điểm Phase 8 (CHUYEN_KHO) cần quay lại kiểm.

## Code Examples

Đã viết đầy đủ trong §Data Model (mục 1, 2, 3) — không lặp lại ở đây. Tổng hợp danh
sách RPC cần tạo:

| RPC | Mục đích | Khuôn chép từ |
|-----|----------|---------------|
| `luu_dong_kiem_ke(chung_tu_id, san_pham_id, so_luong)` | Lưu/sửa một dòng đếm, chốt `so_luong_he_thong` tại lúc gọi | `tao_phieu_xuat_tu_don` (0056, dựng dòng trong transaction) |
| `chua_dem_kiem_ke(chung_tu_id)` | Danh sách mã chưa đếm trong phạm vi phiên | `danh_sach_ton_kho` (LEFT JOIN + lọc kho) |
| `duyet_phien_kiem_ke(chung_tu_id, chap_nhan_khong_dem[])` | Kiểm quyền D-14, xử lý D-07, gọi `ghi_so_chung_tu` | `nap_ton_tam` (0061 — tự kiểm quyền, dựng dòng, tự ghi sổ) |
| `xem_duoc_lich_su_kiotviet()` / `duyet_duoc_kiem_ke()` | Helper quyền per-user | `vai_tro_hien_tai()` (0003/0026 — đọc trực tiếp thay vì JWT) |
| `tra_cuu_lich_su_kiotviet(...)` | Tra cứu phân trang, unaccent | `danh_sach_ghi_chu_kiotviet` (0033) |
| (sửa) `lich_su_giao_dich_doi_tac` | Đổi gate quyền cho khớp D-13 | Chính nó (0033) |
| (sửa) `luu_ho_so_nguoi_dung` | Thêm 2 tham số công tắc quyền | Chính nó (0026) |
| (tùy chọn) `nhieu_dong_kiem_ke(chung_tu_id, jsonb)` | Import Excel hàng loạt, khuôn preview/commit | `nap_ton_tam` (0061) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ngưỡng "lệch lớn" đề xuất (≥5 tuyệt đối HOẶC ≥10% tồn sổ) — KHÔNG có con số từ người dùng, D-16 chỉ nói "lệch lớn" | §Pattern 4 | Người dùng có thể muốn ngưỡng khác hẳn (VD tuyệt đối theo nhóm hàng); nên xác nhận ở discuss-phase hoặc để planner ghi rõ đây là giá trị khởi điểm có thể chỉnh |
| A2 | Một phiên kiểm kê = một `chung_tu`/kho (không tách theo nhóm hàng) | §Data Model mục 1 | Nếu người dùng thật sự muốn "mỗi nhóm hàng một chứng từ riêng" (để in/duyệt độc lập từng nhóm), thiết kế phải tách; hiện CONTEXT.md để "Claude's Discretion" nên đây là lựa chọn hợp lý nhất nhưng chưa được xác nhận trực tiếp |
| A3 | Phạm vi "chưa đếm" dùng `kho_mac_dinh_id = kho phiên` (không union với tồn thật tại kho khác) | §Pitfall 5 | Đúng cho Phase 6 (chưa có CHUYEN_KHO) nhưng cần soát lại khi Phase 8 thêm CHUYEN_KHO |
| A4 | Xuất Excel mẫu đếm: một file riêng mỗi nhóm hàng, không phải một workbook nhiều sheet | §Pattern 3 | Nếu người dùng cần đúng một file duy nhất nhiều sheet để gửi một lần, cần thêm code đọc multi-sheet vào `excel-cell.ts` |
| A5 | Cột `ngay` của hai bảng lưu trữ luôn parse được bằng `::timestamptz` (không có dòng lỗi định dạng) | §Data Model mục 2 | Xác nhận qua code (`readExcelDate` luôn trả ISO hoặc null) và qua RPC 0033 đã dùng `ngay::timestamptz` trên dữ liệu thật production — rủi ro thấp nhưng chưa tự tay query 100% của 5.326 dòng để chắc chắn không có ngoại lệ |

## Open Questions

1. **Ngưỡng "lệch lớn" chính xác (D-16)**
   - What we know: người dùng chỉ nói "lệch lớn", không cho con số.
   - What's unclear: tuyệt đối, phần trăm, hay cả hai; có khác nhau theo nhóm hàng không.
   - Recommendation: dùng A1 làm điểm khởi đầu, đưa vào PLAN như một hằng số dễ sửa
     (không phải giá trị cứng rải rác nhiều nơi), gắn UAT hỏi lại người dùng khi demo.

2. **Một phiên = một hay nhiều nhóm hàng, phân công người đếm có ghi DB không?**
   - What we know: D-05 nói "chia theo nhóm hàng", "mỗi mã chỉ một người đếm — không
     xử lý đếm trùng" (nghĩa là không cần cơ chế khóa/ngăn hai người cùng đếm một mã ở
     tầng hệ thống, chỉ cần quy ước vận hành).
   - What's unclear: liệu quản lý có cần MÀN GÁN người ↔ nhóm hàng trước khi mở phiên
     đếm, hay để người đếm tự lọc nhóm hàng mình phụ trách trên màn đếm (không lưu gán).
   - Recommendation: bắt đầu với "tự lọc, không lưu gán" (đơn giản hơn, không bảng
     mới) — nếu người dùng cần theo dõi "ai đếm nhóm nào" sau này, thêm cột
     `nguoi_dem_id` trực tiếp trên `chung_tu_dong` (ghi trong `luu_dong_kiem_ke` bằng
     `auth.uid()`) mà không cần bảng phân công riêng.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pgTAP (Postgres, chạy qua `psql` trực tiếp — Docker treo trên máy phát triển) |
| Config file | `supabase/tests/*.sql`, helper `00_helper.sql.inc` |
| Quick run command | `psql "$DATABASE_URL" -f supabase/tests/9X_kiem_ke_test.sql` (một file mới) |
| Full suite command | `for f in supabase/tests/*.sql; do psql "$DATABASE_URL" -f "$f"; done` (hoặc MCP `execute_sql` theo `.memory/patterns/pgtap-va-test.md` mục 9, 12) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KKE-01 | Mở phiên tạo đúng `chung_tu(loai_ct=KIEM_KE, kho_id, pham_vi_nhom_hang)` | pgTAP | `psql -f supabase/tests/9X_kiem_ke_test.sql` | ❌ Wave mới |
| KKE-02 | `luu_dong_kiem_ke` chốt `so_luong_he_thong` = tồn TẠI LÚC GỌI, không phải lúc mở phiên (mô phỏng: mở phiên, XUAT một mã, rồi đếm mã đó, kiểm `so_luong_he_thong` = tồn SAU khi xuất) | pgTAP | cùng file trên | ❌ Wave mới |
| KKE-02 | Client `.from('chung_tu_dong').insert(...)` thẳng cho dòng `KIEM_KE` bị 42501 | pgTAP (test policy, không qua RPC) | cùng file trên | ❌ Wave mới |
| KKE-03 | `chua_dem_kiem_ke` liệt kê đúng mã KHÔNG có dòng trong phiên, đúng phạm vi kho/nhóm | pgTAP | cùng file trên | ❌ Wave mới |
| KKE-04 | `duyet_phien_kiem_ke` sinh đúng `kho_movement` bằng lệch đã CHỐT (không tính lại theo tồn hiện tại lúc duyệt) — test bằng cách XUAT thêm SAU khi đếm nhưng TRƯỚC khi duyệt, kiểm movement vẫn đúng số đã chốt | pgTAP | cùng file trên | ❌ Wave mới |
| KKE-04 | `duyet_duoc_kiem_ke() = false` → 42501; `quan_ly` luôn `true` dù cột = false | pgTAP | cùng file trên | ❌ Wave mới |
| DLIEU-07 | `tra_cuu_lich_su_kiotviet` lọc đúng loại/ngày/mã/số phiếu; unaccent khớp cả `ghi_chu` lẫn `khach_hang`/`nha_cung_cap` | pgTAP | `psql -f supabase/tests/9X_lich_su_kiotviet_test.sql` | ❌ Wave mới |
| DLIEU-07 | `xem_duoc_lich_su_kiotviet() = false` → RPC 42501 VÀ `SELECT` thẳng bảng `luu_tru_*` trả 0 dòng (RLS) | pgTAP | cùng file trên | ❌ Wave mới |
| DLIEU-07 | `lich_su_giao_dich_doi_tac` (0033) tôn trọng công tắc mới, không còn gate theo vai trò cũ | pgTAP | cùng file trên (hoặc thêm assertion vào file cũ nếu có) | ⚠️ Sửa test hiện có nếu tồn tại, hoặc thêm mới |
| Route quyền | `/kiem-ke`, `/kiem-ke/[id]`, `/lich-su-kiotviet` đúng ma trận 4 vai trò × khách | Script | `npx tsx scripts/test-route-permissions.ts` | ⚠️ Cần thêm dòng route mới NGAY trong plan tạo route (tiền lệ 04-08) |
| Toàn dự án | `npm run check` xanh sau mọi thay đổi TypeScript | Automated | `npm run check` | ✅ |

### Sampling Rate

- **Per task commit:** chạy file pgTAP mới liên quan + `npm run check`.
- **Per wave merge:** chạy toàn bộ `supabase/tests/*.sql` (hiện 380+ assertion) +
  `npm run verify:hook` (nếu đụng `custom_access_token_hook`/`nguoi_dung` — Phase 6 CÓ
  đụng vì thêm cột) + `test-route-permissions.ts`.
- **Phase gate:** đủ bộ trên xanh trước `/gsd:verify-work`, cộng UAT thật trên trình
  duyệt (agent không có trình duyệt — theo tiền lệ mọi phase trước, checkpoint
  `human-verify` là bắt buộc cho màn đếm mobile và màn duyệt phiên).

### Wave 0 Gaps

- [ ] `supabase/tests/9X_kiem_ke_test.sql` — file mới, chưa tồn tại.
- [ ] `supabase/tests/9X_lich_su_kiotviet_test.sql` — file mới, chưa tồn tại.
- [ ] `npm run verify:hook` phải chạy lại sau khi thêm 2 cột vào `nguoi_dung` — không
  đổi hook nhưng đổi shape bảng mà `getCurrentUser()` select — kiểm typecheck bắt được
  qua `npm run db:types`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | yes | RLS (Postgres) + SECURITY DEFINER RPC tự kiểm quyền tường minh (đã là chuẩn toàn dự án) |
| V5 Input Validation | yes | RPC nhận `numeric`/`uuid` đã ép kiểu ở biên PostgREST; Excel import qua `readNumber`/`readString` không tin định dạng ô |
| V2 Authentication | no (không đổi) | Supabase Auth có sẵn, không đụng ở Phase 6 |
| V3 Session Management | no (không đổi) | — |
| V6 Cryptography | no | Không liên quan |

### Known Threat Patterns for hệ thống này

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client bỏ qua RPC, ghi thẳng `chung_tu_dong` qua PostgREST để giả mạo `so_luong_he_thong` | Tampering | Policy WITH CHECK chặn ghi trực tiếp dòng `KIEM_KE` (§Data Model mục 1, Pitfall 2) |
| Người dùng bị tắt công tắc vẫn đọc được lịch sử qua RPC cũ chưa sửa (0033) | Elevation of Privilege | Sửa CẢ HAI nơi — policy 0016 và hàm 0033 (Pitfall 3) |
| Người không có quyền duyệt gọi thẳng `ghi_so_chung_tu(id)` cho phiên KIEM_KE (hàm này vẫn `grant execute` cho `authenticated` từ 0011) | Elevation of Privilege | `duyet_phien_kiem_ke` kiểm quyền TRƯỚC khi gọi `ghi_so_chung_tu`, nhưng bản thân `ghi_so_chung_tu` KHÔNG kiểm quyền duyệt riêng cho KIEM_KE — cần đánh giá thêm: người có quyền ghi sổ chung (không phải `chi_xem`) NHƯNG không có `duyet_duoc_kiem_ke()` có thể gọi thẳng `ghi_so_chung_tu(phien_id)` bỏ qua `duyet_phien_kiem_ke` và ghi sổ được luôn — PHẢI thêm nhánh kiểm `duyet_duoc_kiem_ke()` ngay trong `ghi_so_chung_tu` khi `loai_ct = 'KIEM_KE'` (một dòng, khuôn dòng kiểm `chi_xem` đã có) để chặn triệt để, không chỉ dựa vào "wrapper RPC là đường duy nhất" |

**Lưu ý bổ sung quan trọng (phát hiện khi viết Security Domain):** ban đầu §Data Model
đề xuất kiểm quyền duyệt CHỈ trong `duyet_phien_kiem_ke` — nhưng vì `ghi_so_chung_tu`
đã `grant execute ... to authenticated` cho MỌI loại chứng từ, một user có quyền ghi sổ
thường (không phải `chi_xem`) vẫn gọi thẳng được `ghi_so_chung_tu(phien_kiem_ke_id)` mà
bỏ qua wrapper — ghi sổ phiên kiểm kê mà không có quyền duyệt. **Planner PHẢI thêm
một nhánh kiểm trong chính `ghi_so_chung_tu`** (cạnh nhánh `chi_xem` đã có):

```sql
if v_ct.loai_ct = 'KIEM_KE' and not (select public.duyet_duoc_kiem_ke()) then
  raise exception 'Không có quyền duyệt kiểm kê' using errcode = '42501';
end if;
```

Đây là sửa ĐÚNG MỘT chỗ trong `ghi_so_chung_tu` (không đổi `_ghi_so_kiem_ke`), khác
với Pitfall 1 (không cần đổi công thức) — đây là THÊM một câu kiểm quyền, không đổi
logic ghi.

## Sources

### Primary (HIGH confidence — đọc trực tiếp mã nguồn/migration đã chạy)

- `supabase/migrations/0007_chung_tu.sql` — schema `chung_tu`/`chung_tu_dong`, cột `so_luong_he_thong`
- `supabase/migrations/0010_luu_tru_kiotviet.sql` — schema hai bảng lưu trữ
- `supabase/migrations/0011_rpc_ghi_so.sql`, `0041_kho_theo_dong.sql` — `_ghi_so_kiem_ke`, `ghi_so_chung_tu` hiện hành
- `supabase/migrations/0016_rls_chung_tu.sql` — policy hiện tại cần sửa
- `supabase/migrations/0021_sua_tim_kiem_search_path.sql` — `tim_san_pham`, khuôn qualify toán tử trigram
- `supabase/migrations/0026_nguoi_dung_nhieu_kho.sql` — helper `vai_tro_hien_tai`/`kho_hien_tai`, `luu_ho_so_nguoi_dung`, cơ chế JWT vs bảng
- `supabase/migrations/0033_ra_ghi_chu_lich_su.sql` — `danh_sach_ghi_chu_kiotviet`, `lich_su_giao_dich_doi_tac` (RPC cần sửa cùng D-13)
- `supabase/migrations/0061_nap_ton_tam.sql` — khuôn preview/commit + tự kiểm quyền
- `src/shared/lib/excel-cell.ts`, `src/features/inventory/lib/read-stock-file.server.ts` — hạ tầng đọc Excel
- `src/features/auth/api/current-user.server.ts`, `src/shared/lib/permissions.ts` — cách đọc quyền hiện tại (đọc bảng, không JWT, ở tầng Server Component)
- `scripts/import-kiotviet/load-data.ts` + `readExcelDate` — xác nhận định dạng cột `ngay`
- `.planning/phases/06-kiem-ke-go-live/06-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- `CLAUDE.md`, `.memory/index.md` + 3 pattern file (`supabase-rls-bao-mat.md`, `pgtap-va-test.md`, `nextjs-antd-supabase-ui.md`), `.memory/knowledge/du-lieu-kiotviet.md`

### Secondary (MEDIUM confidence)

- `design/kiem-ke.html` — demo tĩnh (quick task 260921-v15). **CẢNH BÁO: mâu thuẫn với
  quyết định đã chốt** — demo dùng quét mã vạch (đã bỏ, chốt 24/09) và "chốt tồn sổ tại
  thời điểm MỞ PHIÊN" (sai D-03, phải là tại lúc LƯU TỪNG DÒNG). Chỉ dùng demo này để
  tham khảo BỐ CỤC (tab danh sách/đếm/bảng lệch, thẻ dòng, banner cảnh báo), KHÔNG dùng
  logic nghiệp vụ trong đó.

### Tertiary (LOW confidence)

- Không còn mục nào — `nhom_hang_id` đã [VERIFIED: supabase/migrations/0005_san_pham.sql
  dòng 10] `nhom_hang_id uuid references public.nhom_hang(id)`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — không có gì mới để nhầm.
- Kiến trúc kiểm kê: MEDIUM — thiết kế mới (chưa có tiền lệ y hệt), nhưng mọi mảnh ghép
  (RPC pattern, RLS pattern, Excel pattern) đều HIGH vì có bản chạy thật để chép.
- Lịch sử KiotViet: HIGH — dữ liệu, định dạng, và RPC khuôn đều đã xác nhận qua code
  đang chạy production.
- Công tắc quyền: MEDIUM — hướng đọc-bảng-trực-tiếp là suy luận hợp lý từ pattern có
  sẵn (`getCurrentUser()`), nhưng CHƯA có tiền lệ y hệt cho "công tắc không theo vai
  trò" trong dự án — cần thảo luận/xác nhận ở discuss-phase nếu muốn hướng khác.

**Research date:** 2026-09-24
**Valid until:** ~2026-10-24 (30 ngày, schema/RLS ổn định, không phụ thuộc thư viện
ngoài dễ đổi phiên bản)
