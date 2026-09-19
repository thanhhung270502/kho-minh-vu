# Phase 3: Phiếu nhập — Research

**Researched:** 2026-09-19
**Nguồn:** đọc thẳng migration 0007/0008/0011/0012/0016, test 10/20, và đo database thật.

---

## 1. Thay đổi "kho theo từng dòng" (D-05) đụng vào đâu

### Đọc `0011_rpc_ghi_so.sql`

Bảy hàm nội bộ `_ghi_so_*` đều lấy kho từ **header**: `p_ct.kho_id`. Riêng phiếu nhập:

```sql
create or replace function public._ghi_so_nhap(p_ct public.chung_tu, p_dong public.chung_tu_dong)
... insert into public.kho_movement (..., kho_id, ...) values (..., p_ct.kho_id, ...);
```

**Cách ít rủi ro nhất:** thêm `chung_tu_dong.kho_id` **nullable**, và trong hàm dùng
`coalesce(p_dong.kho_id, p_ct.kho_id)`. Dòng cũ (kho_id null) rơi về kho header → **mọi
test Phase 1 giữ nguyên hành vi**, không phải viết lại.

Hai chỗ khác trong `ghi_so_chung_tu` cũng dùng `v_ct.kho_id` và phải đổi theo:
- Kiểm xuất âm: `where kho_id = v_ct.kho_id` → phải là kho của dòng.
- `_ghi_so_chuyen_kho` dùng `kho_id` + `kho_den_id`: **giữ nguyên** — chuyển kho theo bản
  chất là chuyện của cả phiếu, không phải từng dòng.

### `huy_chung_tu` KHÔNG cần sửa

Nó đảo theo `kho_movement.kho_id` đã ghi, không đọc lại `chung_tu.kho_id`:

```sql
for v_mv in select * from public.kho_movement where chung_tu_id = ... and la_but_toan_dao = false
insert into public.kho_movement (..., v_mv.kho_id, -v_mv.so_luong, ...)
```

→ **Sửa `03-WORK-UNITS.md` WU-1: bỏ `huy_chung_tu` khỏi phạm vi.**

### ⚠️ Policy đọc của thủ kho sẽ giấu nhầm phiếu

`0016` lọc chứng từ cho thủ kho theo **header**:

```sql
and (kho_id = (select public.kho_hien_tai()) or kho_den_id = (select public.kho_hien_tai()))
```

Phiếu có header Kho 1 nhưng một dòng về Kho 2 → **thủ kho Kho 2 không thấy phiếu đó**, dù
hàng thuộc kho mình. Phải mở rộng policy bằng `exists` lên `chung_tu_dong`. Không làm là lỗi
phân quyền âm thầm, không ai phát hiện tới khi thủ kho hỏi "sao không thấy phiếu".

---

## 2. ⚠️ D-11 (chỉ quản lý hủy) sẽ làm ĐỎ test 20 đang xanh

`huy_chung_tu` hiện chỉ chặn `chi_xem`:

```sql
if (select public.vai_tro_hien_tai()) = 'chi_xem' then raise ... 42501
```

Còn `supabase/tests/20_chung_tu_test.sql` **đăng nhập `vanphong` ở dòng 87** rồi gọi
`huy_chung_tu` cho phiếu nhập đã ghi sổ ở **dòng 180**. Thêm ràng buộc "chỉ quản lý hủy phiếu
nhập đã ghi sổ" sẽ làm assertion đó fail.

**Kế hoạch phải:** đổi dòng 180 sang phiên `quanly`, và **thêm assertion mới** chứng minh
`vanphong` bị 42501 — nếu không, ràng buộc D-11 không có gì bảo vệ.

Phạm vi ràng buộc: chỉ áp cho `loai_ct = 'NHAP'` và `trang_thai = 'HOAN_THANH'`. Phiếu còn
`NHAP_LIEU` thì người nhập tự hủy được (chưa đụng tồn). Các loại khác giữ nguyên để không
đoán trước Phase 4.

---

## 3. Giá vốn: trigger đã có, không viết lại

`0008` tính bình quân gia quyền di động bằng trigger trên `kho_movement`. Comment của
`huy_chung_tu` đã ghi sẵn điều dễ hiểu nhầm:

> bút toán đảo của phiếu NHẬP có `so_luong` âm nên trigger giá vốn **KHÔNG** tính lại — giá
> vốn không tự quay về số trước khi nhập.

→ Màn hủy phiếu (WU-10) phải nói rõ điều này cho người dùng, đừng để họ tưởng hủy là sạch sẽ.

Với D-01 (giá vốn đầu = 0): phiếu nhập đầu tiên của một mã làm giá vốn nhảy từ 0 lên đơn giá
nhập — đúng công thức, không phải lỗi.

---

## 4. RPC và lớp dữ liệu dùng lại được

| Thứ | Chữ ký | Dùng ở |
|---|---|---|
| `ghi_so_chung_tu` | `(p_chung_tu_id uuid) → chung_tu` | WU-9 |
| `huy_chung_tu` | `(p_chung_tu_id uuid, p_ly_do text) → chung_tu` | WU-10 |
| `sinh_so_ct` | `(p_loai loai_ct, p_nam smallint) → text` | WU-2, WU-7 |
| `tim_san_pham` | `(p_tu_khoa text, p_gioi_han int)` trả `ma_hang, ten_hang, dvt_id, quy_doi, lan_phat_sinh_cuoi…` | WU-8 — ô gõ mã |
| `danh_sach_doi_tac` | đã có, lọc `p_loai = 'NCC'` | WU-7 — chọn nhà cung cấp |

`tim_san_pham` **không trả giá vốn** → an toàn cho mọi vai trò, dùng thẳng cho ô tìm mã.

---

## 5. Đánh số riêng cho nhập nhà máy (D-10) — hai đường

| Đường | Được | Mất |
|---|---|---|
| **Thêm giá trị enum `loai_ct = 'NHAP_NHA_MAY'`** | `sinh_so_ct` và `cau_hinh_so_ct` chạy nguyên si | Đụng mọi `case v_ct.loai_ct` trong 0011, mọi policy liệt kê loại, và 7 dòng cấu hình thành 8 — màn Cài đặt phải đổi theo |
| **Giữ `loai_ct = 'NHAP'`, thêm cột `nguon_nhap` (`NCC`/`NHA_MAY`) + tiền tố phụ** | Không đụng enum, không đụng `_ghi_so_nhap`; phiếu nhà máy vẫn là phiếu nhập về mọi mặt nghiệp vụ | `sinh_so_ct` phải nhận thêm tham số nguồn; `cau_hinh_so_ct` khóa chính là `loai_ct` nên cần khóa phụ hoặc bảng phụ |

**Khuyến nghị: đường 2.** Nhà máy là một *nhà cung cấp*, không phải một *loại chứng từ* —
đổi enum là mô hình hóa sai và kéo theo sửa 7 chỗ đã test.

---

## 6. Con số để bám khi làm và khi nghiệm thu

- 594 dòng / 78 phiếu nhập trong `luu_tru_nhap_kiotviet`; **không dòng nào có đơn giá**.
- 3.268/3.268 mã `gia_von = 0`.
- NCC000001 (VŨ TRỤ L.AN) = 289 dòng / 10 phiếu — nguồn nhập lớn nhất.
- Phiếu lớn nhất PN000649: **48 dòng** → bảng dòng phải chịu được 48 dòng không giật.
- 2 kho: K1 (Kho 1), K2 (Kho 2).

---

## 7. Bẫy đã biết, áp thẳng vào phase này

Từ `CLAUDE.md` §Bẫy 1–12 và `.memory/patterns/nextjs-antd-supabase-ui.md`:

1. `instanceof PostgrestError` luôn false → dùng `maLoi(e)` / `laLoiPostgrest(e)`.
2. Hàm thuần dùng cả hai phía phải nằm ngoài file `"use client"`.
3. Hook đọc một bản ghi phải có `enabled` — màn `/nhap-kho/[id]` sẽ có id, nhưng ngăn kéo
   tạo mới thì không.
4. antd v6: `Alert.message` → `title`, `Modal.maskClosable` → `mask.closable`.
5. `select('*')` bị cấm trên `san_pham`/`kho_movement` (quyền theo cột).
6. Mọi `update`/`delete` kiểm `count` — thiếu policy thì PostgREST trả 0 dòng, không báo lỗi.
7. Thêm route mới thì thêm dòng vào `scripts/kiem-tra-quyen-route.ts` (hiện 50 ô).
8. pgTAP: gọi hàm volatile trong `WHERE` của `UPDATE` → dòng vừa chèn ngoài snapshot.
