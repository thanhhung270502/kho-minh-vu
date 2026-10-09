# Kho Minh Vũ: Dữ liệu phình theo thời gian và kế hoạch tối ưu

_Ngày 09/10/2026. Đo trên project `phonzy` (kho-vu-tru), 99 ngày dữ liệu thật từ 14/06 đến 08/10/2026.
Project production `rnpq` không truy cập được qua MCP, nên phải đo lại ở đó trước khi chốt (xem §8)._

---

## 1. Kết luận nhanh

- **Không có "big data" theo nghĩa dung lượng.** Toàn hệ ghi khoảng 1 triệu dòng mỗi năm, dưới 1 GB/năm.
  Postgres trên Supabase gói nhỏ vẫn gánh được 10 năm.
  Không cần partition, không cần read replica, không cần đổi database, không cần xóa hay lưu trữ dữ liệu cũ.
- **Vấn đề nằm ở cách đọc dữ liệu.** Có khoảng 10 RPC đọc **toàn bộ lịch sử** mỗi lần gọi. Thời gian của chúng tăng tuyến tính theo tuổi hệ thống, và ba trong số đó chạy mỗi lần mở dashboard.
  Ngoại suy đường thẳng thì dashboard (`tong_quan_chi_so`) chạm trần `statement_timeout` 8 giây sau khoảng **1,5–2 năm**.
  Riêng `phan_tich_ton_kho` đã từng chạm trần một lần (ghi chú đầu migration 0100).
- **Đường ghi sổ an toàn.** Giá vốn tính tăng dần dựa trên `ton_kho`, không cộng lại sổ cái, nên ghi sổ và hủy phiếu chỉ tốn theo số dòng của phiếu, không phụ thuộc lịch sử.
- **Chiến lược** gồm ba bậc, làm theo thứ tự, bậc sau chỉ làm khi bậc trước chưa đủ:
  1. Index và viết lại điều kiện cho dùng được index. Rẻ, không đụng dữ liệu.
  2. Viết lại 6 RPC nóng để chỉ đọc khoảng thời gian cần.
  3. Bảng tổng hợp được cập nhật cùng transaction ghi sổ: chốt tồn theo tháng, ngày bán cuối, tổng hợp theo ngày.

---

## 2. Số đo thật (phonzy, 99 ngày)

### 2.1 Số dòng và tốc độ tăng

| Bảng | Dòng hiện có | Dòng/ngày | Dự báo/năm | Dự báo 5 năm | Kích thước hiện tại |
|---|---:|---:|---:|---:|---:|
| `kho_movement` (sổ cái) | 54.830 | ~554 | ~200k | ~1,0 triệu | 16 MB |
| `chung_tu_dong` | 53.929 | ~545 | ~200k | ~1,0 triệu | 18 MB |
| `don_dat_hang_dong` | 21.416 | ~216 | ~80k | ~400k | 6 MB |
| `chung_tu_nguoi_nhan` | 10.938 | ~110 | ~40k | ~200k | 1,5 MB |
| `chung_tu` | 9.845 | ~99 | ~36k | ~180k | 6 MB |
| `nhat_ky_sua` (audit) | 8.941 | ~90 | ~33k | ~165k | 6 MB |
| `don_dat_hang_nguoi_nhan` | 5.701 | ~58 | ~21k | ~105k | 0,9 MB |
| `don_dat_hang` | 4.583 | ~46 | ~17k | ~85k | 1,2 MB |
| `san_pham` / `ton_kho` | 3.290 / 3.022 | — | cố định | cố định | nhưng bị UPDATE khoảng 550 lần/ngày |

Số đơn đặt trên phonzy (~46/ngày) thấp hơn số hóa đơn (~99/ngày), vì phần lịch sử KiotViet
được nạp thẳng vào `chung_tu` mà không đi qua đơn. Sau go-live, đơn sẽ đi 1:1 với hóa đơn, nên
`don_dat_hang_dong` và `nhat_ky_sua` sẽ tăng nhanh hơn bảng trên, ước khoảng 170k dòng/năm mỗi bảng.

### 2.2 Query tốn thời gian nhất (pg_stat_statements, từ 12/09/2026)

| RPC | Số lần gọi | Trung bình | Lâu nhất | Có phình theo lịch sử? |
|---|---:|---:|---:|---|
| `tim_san_pham` | 4.776 | 228 ms | 1,1 s | **Không.** Chậm vì từ khóa 1–2 ký tự và lần gọi đầu nạp từ điển unaccent (§6) |
| `danh_sach_san_pham` | 5.174 | 111 ms | 0,7 s | Không. Danh mục cộng `ton_kho` |
| `phan_tich_ton_kho` | 866 | 244 ms | **2,9 s** | **Có.** Quét mọi dòng hóa đơn từ trước tới nay, mỗi lần tải gọi 4 lần |
| `tong_quan_chi_so` | 152 | **1,1 s** | 2,8 s | **Có.** Quét sổ cái 31 lần mỗi lần gọi |
| `phan_tich_theo_ky` | 117 | 762 ms | 2,2 s | **Có.** Tồn đầu kỳ cộng toàn bộ sổ cái |
| `nhap_xuat_theo_ngay` / `_theo_ky` | 281 | ~310 ms | 1,9 s | Có, vì điều kiện ngày không dùng được index |
| `hoat_dong_gan_day` | 57 | 308 ms | 1,6 s | **Có.** Gom nhóm cả `nhat_ky_sua` và `chung_tu` rồi mới cắt LIMIT |
| `ghi_so_chung_tu` | 11.139 | 13 ms | 6,1 s* | Không (*đỉnh do tranh khóa hoặc nạp hàng loạt) |
| `danh_sach_chung_tu` | 5.368 | 27 ms | 1,4 s | Không, vì mặc định lọc tháng này |

Thống kê bảng cũng xác nhận điều này: `chung_tu_dong` đã bị seq scan 1.342 lần (60 triệu dòng đọc),
`kho_movement` 400 lần (21,6 triệu dòng), `chung_tu` 3.159 lần (30 triệu dòng).

---

## 3. Bản đồ dữ liệu phình

| Nhóm | Bảng | Ghi chú |
|---|---|---|
| **Sổ cái và chứng từ** (tăng theo nghiệp vụ) | `kho_movement`, `chung_tu`, `chung_tu_dong`, `chung_tu_nguoi_nhan` | Append-only theo nguyên tắc 2. **Giữ vĩnh viễn**, không xóa, không archive |
| **Đơn đặt** | `don_dat_hang`, `don_dat_hang_dong`, `don_dat_hang_nguoi_nhan` | `_cap_nhat_tien_do_ddh` ghi lại mọi dòng của đơn mỗi lần ghi sổ hoặc hủy, kể cả khi giá trị không đổi |
| **Audit** | `nhat_ky_sua` | Không xóa được (trigger chặn). Bản ghi `_tao_moi` lưu nguyên dòng dạng jsonb |
| **Nhật ký job** | `nhat_ky_doi_chieu`, `ma_hoa_dong_bo`, `cron.job_run_details` | Tăng chậm (khoảng 1 dòng/ngày), không có chính sách dọn |
| **Bảng nóng tuy nhỏ** | `san_pham`, `ton_kho`, `chuoi_so_ct`, `chuoi_so_dh` | Mỗi dòng sổ cái khóa và UPDATE `san_pham` và `ton_kho`. Bộ đếm số chứng từ là một dòng duy nhất bị khóa tới khi commit |
| **Tĩnh / lưu trữ** | danh mục, `luu_tru_*_kiotviet`, `ma_hoa` (bị xóa sạch rồi nạp lại hằng ngày) | Không đáng lo |

Không có realtime, không có `refetchInterval`. Nhưng TanStack Query đặt mặc định `staleTime 30s` và
`refetchOnWindowFocus: true` (`src/providers/query-client.ts:62-64`), nên mỗi lần quay lại tab sau hơn 30 giây,
mọi RPC nặng của màn đang mở đều chạy lại.

---

## 4. Rủi ro xếp hạng (độ phình × tần suất gọi)

| # | Đường đọc | Vì sao phình | Gọi khi nào |
|---|---|---|---|
| 1 | `tong_quan_chi_so` (0093) | LATERAL 30 ngày quét lại `kho_movement` 30 lần. `(m.ngay at time zone …)::date` không dùng được index. 14 lần `count(*)` trên `chung_tu.created_at`, cột này không có index | Mỗi lần mở dashboard hoặc quay lại tab |
| 2 | `phan_tich_ton_kho` (0101) | Quét mọi hóa đơn XUAT từ trước tới nay để lấy "ngày bán cuối". `fetchAllPages` dùng `.range()` nên **chạy lại toàn bộ hàm 4 lần** (3.266 mã chia trang 1000) | Dashboard, `/phan-tich`, danh mục (khi bật dự báo) |
| 3 | `hoat_dong_gan_day` (0116) | Gom nhóm toàn bộ `nhat_ky_sua` (đơn đặt) và đọc `chung_tu` 3 lần trên 3 cột thời gian không có index, rồi mới LIMIT. Client lọc "hôm nay và hôm qua" **sau khi** tải về | Dashboard |
| 4 | `bang_dem_kiem_ke` (0066) | Mỗi mã chạy một subquery `[NAP_TON_TAM]`, đi qua **mọi dòng lịch sử** của mã đó | Chạy lại sau **mỗi lần lưu số đếm** |
| 5 | `tim_kiem_toan_cuc` (0092) | `so_ct` / `so_dh ilike '%x%'` không có index trigram, nên quét cả hai bảng. Với thủ kho, hàm RLS chạy cho từng dòng | Mỗi phím gõ trong ⌘K |
| 6 | `phan_tich_theo_ky` (0101) | Tồn đầu kỳ bằng tổng mọi movement từ ngày đầu | `/phan-tich`, mỗi lần đổi kỳ hoặc kho |
| 7 | `nhap_xuat_theo_ky` (0101) | Điều kiện ngày không dùng được index nên quét cả sổ cái dù kỳ ngắn | Biểu đồ `/phan-tich` |
| 8 | `bao_cao_xuat_am` (0083) | Window chạy qua toàn bộ lịch sử của từng cặp (kho, mã) phát sinh trong ngày | Dashboard |
| 9 | `danh_sach_doi_tac` (0080) | Mỗi đối tác chạy một `count(*)` trên `chung_tu`. NB001 và khách lẻ có lịch sử tăng mãi | **Mỗi phím gõ** ô chọn khách |
| 10 | `danh_sach_don` + `dem_don_theo_trang_thai` | `don_dat_hang` **không có index theo `ngay_dh`**, nên quét cả bảng dù mặc định lọc tháng này | `/don-dat`, sau mỗi thao tác trên đơn |
| 11 | `the_kho_san_pham` (0108) | Tính lũy kế và `count(*) over ()` trên toàn bộ lịch sử của mã | Chi tiết mã, sau mỗi lần ghi sổ |
| 12 | Xóa dòng phiếu nháp | **Khóa ngoại `kho_movement.chung_tu_dong_id` không có index**, nên mỗi lần DELETE phải quét cả sổ cái | Sửa phiếu nháp, kiểm kê |
| 13 | `lich_su_giao_dich_doi_tac`, xuất Excel | `count(*) over ()` trên toàn bộ lịch sử. Xuất Excel đơn lặp tuần tự qua các trang | Khi người dùng yêu cầu |

---

## 5. Kế hoạch theo wave

Mỗi wave là một hoặc vài migration nhỏ, đánh số tiếp sau **0123**. Wave nào cũng phải có bằng chứng đo trước và sau.

### Wave 0: Dựng thước đo (làm trước tiên, khoảng nửa ngày)

Không đo được thì không biết sửa có ăn thua hay không.

- [ ] **Script sinh 5 năm dữ liệu giả trên Supabase local**, ví dụ `scripts/seed-scale.ts`, mở rộng từ `test:load`.
  - Nhân bản 99 ngày thật lùi về quá khứ cho đủ khoảng 1 triệu dòng `kho_movement` và khoảng 170k đơn.
  - Đánh dấu `LOADTEST` để dọn được.
  - Bắt buộc ghi qua RPC ghi sổ để trigger `ton_kho` và giá vốn chạy đúng.
- [ ] **Script benchmark**, ví dụ `scripts/bench-rpc.ts`: gọi từng RPC trong §4 qua supabase-js bằng tài khoản `quan_ly` và `thu_kho`, mỗi RPC 5 lần, ghi p50 và p95 ra bảng.
  Đây là chốt chặn hồi quy cho các phase sau.
- [ ] **Đo baseline trên `rnpq`** (production) bằng `pg_stat_statements` và `pg_stat_user_tables`, cùng các câu đã chạy trên phonzy.

**Xong khi:** có bảng p50/p95 của 13 đường đọc ở hai mức 99 ngày và 5 năm.

### Wave 1: Index và điều kiện dùng được index (1 migration, không đổi dữ liệu, khoảng nửa ngày)

```sql
-- Khóa ngoại thiếu index: DELETE dòng phiếu đang quét cả sổ cái
create index idx_movement_chung_tu_dong on public.kho_movement (chung_tu_dong_id) where chung_tu_dong_id is not null;
create index idx_chung_tu_goc            on public.chung_tu (chung_tu_goc_id)       where chung_tu_goc_id is not null;
create index idx_de_nghi_gop_ma_ct       on public.de_nghi_gop_ma (chung_tu_id);

-- Lọc theo ngày trên toàn sổ cái (dashboard, kỳ phân tích)
create index idx_movement_ngay on public.kho_movement (ngay);

-- Danh sách và hoạt động gần đây
create index idx_ddh_ngay            on public.don_dat_hang (ngay_dh desc, so_dh desc);
create index idx_chung_tu_tao        on public.chung_tu (created_at desc);
create index idx_chung_tu_ghi_so     on public.chung_tu (ngay_ghi_so desc) where ngay_ghi_so is not null;
create index idx_nhat_ky_sua_bang_luc on public.nhat_ky_sua (bang, sua_luc desc);
-- thay cho idx_chung_tu_loai_ngay: khớp đúng ORDER BY của danh_sach_chung_tu
create index idx_chung_tu_loai_ngay_so on public.chung_tu (loai_ct, ngay_ct desc, so_ct desc);

-- Tìm theo số chứng từ / số đơn (⌘K và ô tìm của danh sách)
create index idx_chung_tu_so_ct_trgm on public.chung_tu     using gin (so_ct extensions.gin_trgm_ops);
create index idx_ddh_so_dh_trgm      on public.don_dat_hang using gin (so_dh extensions.gin_trgm_ops);
```

- [ ] **Viết lại điều kiện ngày cho dùng được index** trong `tong_quan_chi_so`, `phan_tich_theo_ky`, `nhap_xuat_theo_ky`,
  `hoat_dong_gan_day`, `the_kho_san_pham`: so sánh trực tiếp trên cột, không bọc hàm quanh cột.
  ```sql
  -- trước: (m.ngay at time zone 'Asia/Ho_Chi_Minh')::date <= p_den
  -- sau:   m.ngay < ((p_den + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
  ```
  ⚠️ Phải giữ đúng ngữ nghĩa. Bút toán thường có `ngay = ngay_ct 00:00`, bút toán đảo có `ngay = now()`.
  Viết pgTAP so kết quả hàm cũ và hàm mới trên cùng bộ dữ liệu trước khi thay.
- [ ] **Bỏ hai index chết** `idx_ddh_nguoi_nhan` và `idx_chung_tu_nguoi_nhan` (cột đã ngừng dùng từ 0090), sau khi grep chắc chắn không còn chỗ đọc.
- [ ] Nhớ bẫy 5: cột mới trên `kho_movement` cần `grant select (cột)`. Index thì không cần.

**Xong khi:** `danh_sach_don`, `tim_kiem_toan_cuc` và việc xóa dòng phiếu chuyển sang Index Scan trong `EXPLAIN`. Benchmark 5 năm của nhóm này dưới 100 ms.

### Wave 2: Viết lại 6 RPC nóng (chưa thêm bảng, khoảng 1–1,5 ngày)

| RPC | Sửa | Kỳ vọng |
|---|---|---|
| `tong_quan_chi_so` | Bỏ LATERAL 30 ngày. Gom movement 30 ngày gần nhất **một lượt** theo ngày, rồi lùi lũy kế từ tồn hiện tại (`ton_kho`) bằng window. 14 lần `count(*)` thay bằng một lần `group by` ngày trên `created_at` đã có index | O(30 ngày) |
| `phan_tich_ton_kho` | Trả **một giá trị jsonb**, thay cho setof cộng `.range()`, nên mỗi lần tải chỉ chạy 1 lần thay vì 4. Tạm giới hạn "ngày bán cuối" trong 365 ngày, xử lý triệt để ở Wave 3 | Còn ¼ thời gian, sau đó O(365 ngày) |
| `hoat_dong_gan_day` | Nhận mốc thời gian dưới (`p_tu`) từ client (hôm qua 00:00). Mỗi nhánh `where … >= p_tu order by … limit n` **trước khi** gom nhóm | O(2 ngày) |
| `bang_dem_kiem_ke` | Subquery `[NAP_TON_TAM]` từng mã thay bằng một CTE gom **một lần** theo `san_pham_id` (lọc phiếu DIEU_CHINH trước, chỉ vài phiếu), rồi `left join` | O(mã trong phạm vi) |
| `danh_sach_doi_tac` | Thêm tham số bỏ qua số giao dịch khi gọi từ ô chọn khách và từ xuất Excel. Màn danh sách đối tác vẫn đếm, nhưng chỉ trên trang đang xem | Ô chọn khách O(1) |
| `danh_sach_don` / `dem_don_theo_trang_thai` | Sau khi có index Wave 1, đưa điều kiện ngày lên đầu. Ba `sum` / `count` tương quan trên `don_dat_hang_dong` gom thành một LATERAL | O(tháng) |

Phía frontend:
- [ ] Các query dashboard và phân tích đặt `refetchOnWindowFocus: false`, `staleTime` 5 phút. Đã có nút "Làm mới".
- [ ] `excel-import-dialog.tsx:51` đang gọi `invalidateQueries()` không kèm key, làm mọi query chạy lại. Đổi thành chỉ các key liên quan.
- [ ] Xuất Excel đơn đặt: lặp `danh_sach_don` theo trang thay bằng RPC `xuat_excel_don_dat` (đã có từ 0107/0120).

**Xong khi:** benchmark 5 năm cho dashboard (cả 4 RPC cộng lại) dưới 1,5 giây ở p95, và mỗi RPC chỉ chạy một lần mỗi lần tải.

### Wave 3: Bảng tổng hợp cập nhật cùng transaction ghi sổ (khoảng 2–3 ngày, chỉ làm khi Wave 2 chưa đủ)

Nguyên tắc: **sổ cái vẫn là nguồn sự thật.** Bảng tổng hợp chỉ là bộ đệm, được ghi trong trigger
`cap_nhat_ton_va_gia_von` (cùng transaction nên vẫn atomic), có hàm dựng lại từ sổ cái,
và được job đối soát đêm (`doi-chieu-ton-hang-dem`) kiểm tra.

1. **`san_pham.ngay_ban_cuoi`** (hoặc bảng `(kho_id, san_pham_id)` nếu cần theo kho), cập nhật khi có movement XUAT bán.
   → `phan_tich_ton_kho` không còn đọc lịch sử. Rẻ nhất, nên làm đầu tiên.
2. **`ton_kho_chot_thang (kho_id, san_pham_id, thang, so_luong, gia_tri)`**: chốt cuối mỗi tháng.
   - Tồn đầu kỳ = số chốt của tháng liền trước + movement từ đầu tháng.
   - → `phan_tich_theo_ky` và `the_kho_san_pham` chỉ còn tốn tối đa khoảng 1 tháng dữ liệu.
   - Cần quyết định cách xử lý **phiếu ghi lùi ngày** vào tháng đã chốt: trigger cộng dồn vào các tháng sau, hoặc job tính lại tháng bị ảnh hưởng.
3. **`ton_kho_ngay (ngay, kho_id, san_pham_id, sl_nhap, sl_xuat_ban, sl_xuat_nb, sl_tra, …)`**: tổng hợp theo ngày, chỉ có dòng khi phát sinh.
   → `tong_quan_chi_so`, `nhap_xuat_theo_ngay` và `nhap_xuat_theo_ky` đọc từ đây.
4. Tùy chọn: **`kho_movement.ton_sau`** (tồn sau bút toán), giúp `bao_cao_xuat_am` và thẻ kho thành O(trang).
   Vướng chỗ phiếu ghi lùi ngày làm sai thứ tự theo `ngay`, nên chỉ làm nếu (2) chưa đủ.

Lý do không dùng materialized view: trên Supabase phải `REFRESH` bằng pg_cron, số liệu luôn trễ, và
`REFRESH` toàn phần vẫn quét cả sổ cái.

### Wave 4: Đường ghi và vệ sinh (khoảng 1 ngày, làm xen kẽ được)

- [ ] **Trigger trên `san_pham` bỏ qua cập nhật chỉ do ghi sổ.** Thêm `WHEN` để `ghi_nhat_ky_san_pham`,
  `set_updated_at_san_pham` và `tu_sinh_ghi_chu_san_pham` không chạy khi chỉ `gia_von` hoặc `lan_phat_sinh_cuoi` đổi.
  Hiện mỗi dòng ghi sổ tốn thêm 4 trigger và một phép so jsonb.
- [ ] **`_cap_nhat_tien_do_ddh`:** chỉ UPDATE dòng có `so_luong_da_xuat is distinct from` giá trị mới.
- [ ] **Bộ đếm số chứng từ:** gọi `sinh_so_ct` / `sinh_so_dh` càng muộn càng tốt trong transaction dài
  (`hoan_thanh_don`, nạp Excel), để giảm thời gian giữ khóa dòng đếm.
- [ ] **Thứ tự khóa `san_pham` khi ghi sổ:** sắp dòng theo `san_pham_id` trước khi lặp, tránh deadlock giữa hai phiếu chung mã.
  Kiểm bằng `npm run test:concurrency`.
- [ ] **`ma_hoa`:** đổi xóa sạch rồi nạp lại hằng ngày thành upsert kèm xóa phần thừa.
- [ ] **Chính sách giữ log** (chỉ log job, **không đụng** sổ cái, chứng từ hay `nhat_ky_sua`):
  `nhat_ky_doi_chieu`, `ma_hoa_dong_bo` và `cron.job_run_details` giữ 180 ngày.
- [ ] **RLS cho thủ kho:** policy SELECT của `chung_tu` gọi `phieu_co_dong_thuoc_kho_hien_tai(id)` cho từng dòng.
  Đo trên benchmark bằng tài khoản thủ kho. Nếu đáng kể thì thêm cột phi chuẩn hóa `chung_tu.cac_kho uuid[]`,
  được ghi khi thêm hoặc sửa dòng, kèm index GIN, để policy chỉ còn `cac_kho && kho_hien_tai()`.
- [ ] **Lý do hủy để cột riêng** thay cho nối vào `ghi_chu` (`'Hủy: …'`, `'[hủy hóa đơn …]'`). Không gấp.

### Không làm (và khi nào nên xem lại)

| Không làm | Lý do | Xem lại khi |
|---|---|---|
| Partition `kho_movement` / `chung_tu_dong` | Dưới 10 triệu dòng thì index đủ; partition làm phức tạp FK, RLS và pgTAP | Trên 10 triệu dòng hoặc DB trên 8 GB |
| Archive hoặc xóa chứng từ cũ | Trái nguyên tắc 2; thẻ kho và đối soát cần lịch sử đầy đủ | Không bao giờ với sổ cái |
| Read replica, đổi database | Quá tải không đến từ số dòng | Có nhiều chi nhánh hoặc báo cáo BI nặng |
| Dọn `nhat_ky_sua` | Thiết kế là bất biến; 33–170k dòng/năm vẫn nhỏ | Trên 5 triệu dòng thì tính chuyện tách bảng theo năm |

---

## 6. Ngoài lề: đường nóng nhất không phải big data

`tim_san_pham` chiếm nhiều thời gian DB nhất (1.090 giây trên 4.776 lần gọi), nhưng **không phình theo lịch sử**:
- Với từ khóa từ 3 ký tự, khi kết nối đã ấm, hàm mất **khoảng 6 ms** vì index trigram hoạt động.
- Với từ khóa 1–2 ký tự (ví dụ "6"), hàm mất **239 ms**. Trigram không index được chuỗi dưới 3 ký tự, nên Postgres quét 3.290 mã và chạy `unaccent` trên từng dòng.
- Lần gọi đầu trên một kết nối mới mất thêm khoảng 160 ms để nạp từ điển unaccent.

Hướng sửa:
- Với từ khóa dưới 3 ký tự, chỉ tìm **tiền tố mã** (`upper(ma_hang) like 'X%'` kèm index `text_pattern_ops`).
- Thêm cột sinh sẵn `tim_kiem text generated always as (f_unaccent(ma_hang || ' ' || ten_hang)) stored` để không phải chạy `unaccent` trên từng dòng.

Làm chung Wave 1 được.

---

## 7. Mốc dự báo (ngoại suy đường thẳng, đo lại sau Wave 0)

| Đường đọc | Hiện tại (99 ngày) | Chạm 8 s khoảng |
|---|---|---|
| `tong_quan_chi_so` | 1,1 s trung bình, 2,8 s đỉnh | 1,5–2 năm (theo đỉnh: dưới 1 năm) |
| `phan_tich_theo_ky` | 0,76 s trung bình, 2,2 s đỉnh | khoảng 2,5 năm |
| `phan_tich_ton_kho` | 0,24 s trung bình × 4 lần/tải, 2,9 s đỉnh | Đỉnh đã từng vượt 8 s (0100); có thể quay lại trong khoảng 1 năm |
| Các đường còn lại | dưới 0,4 s | 3–5 năm, nhưng người dùng thấy chậm sớm hơn |

---

## 8. Cần anh quyết định hoặc kiểm tra

1. **Đo trên `rnpq`.** MCP chỉ thấy `phonzy` và `tinhgianoibo`. Theo memory, rnpq mới tới migration 0084, nên các RPC
   phân tích (0093–0101) có thể chưa có trên production. Cần chốt thứ tự deploy so với các migration tối ưu.
2. **pg_cron đối soát đêm** có thực sự đăng ký trên cloud không. Đăng ký nằm trong khối `exception`, có thể đã thất bại im lặng: `select * from cron.job`.
3. **Thẻ kho và tồn đầu kỳ xếp theo `ngay` (ngày chứng từ) hay `created_at` (thời điểm ghi sổ)?**
   Đây là quyết định nghiệp vụ, nó quyết định Wave 3 mục 2 và 4.
4. Có chấp nhận **giới hạn "ngày bán cuối" trong 365 ngày** ở Wave 2 trong khi chờ cột tổng hợp ở Wave 3 không.

---

## 9. Thứ tự đề xuất

```
Wave 0 (đo) → Wave 1 (index + điều kiện ngày) → Wave 2 (6 RPC) → đo lại
                                                      │
                                    còn chậm? ──có──→ Wave 3 (ngày bán cuối → chốt tháng → tổng hợp ngày)
Wave 4: làm xen kẽ bất kỳ lúc nào
```

Tổng ước lượng: Wave 0–2 khoảng 2–3 ngày công, xử lý mọi rủi ro trong 2–3 năm tới.
Wave 3 khoảng 2–3 ngày, xử lý dứt điểm cho 10 năm.
