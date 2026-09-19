# Phase 3: Phiếu nhập — Work Units

**Decomposed:** 2026-09-19
**Nguồn:** `03-CONTEXT.md` (D-01..D-14)

Mỗi WU: tối đa 3 file, tối đa nửa ngày, một commit.
Migration tiếp theo bắt đầu từ **0041** (0040 là cuối của Phase 2).

---

## Wave 1 — Nền database (chạy song song được)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-1** | `kho_id` nullable vào `chung_tu_dong`; `_ghi_so_nhap` + kiểm xuất âm dùng `coalesce(dòng, header)`; mở policy đọc của thủ kho theo dòng | `0041_kho_theo_dong.sql`, `tests/22_kho_theo_dong_test.sql` | D-05 |
| **WU-2** | Đánh số riêng cho nhập nhà máy, không phá 7 dòng `cau_hinh_so_ct` đang chạy | `0042_so_phieu_nha_may.sql`, `tests/80_cau_hinh_so_ct_test.sql` | D-10, NHAP-07 |
| **WU-3** | RPC `dat_gia_von_dau_ky` — chỉ quản lý, chỉ khi `gia_von = 0`, ghi nhật ký | `0043_gia_von_dau_ky.sql`, `tests/91_gia_von_dau_ky_test.sql` | D-02 |

⚠️ WU-1 sửa hàm đã test ở Phase 1 — chạy lại **toàn bộ** pgTAP (199 assert) sau khi push,
không chỉ file của WU.

**Sửa sau khi nghiên cứu (xem `03-RESEARCH.md`):**
- `huy_chung_tu` KHÔNG cần sửa cho kho-theo-dòng (nó đảo theo `kho_movement.kho_id` đã ghi).
- Nhưng policy đọc chứng từ của **thủ kho** lọc theo header → phải mở rộng, nếu không thủ kho
  Kho 2 không thấy phiếu có dòng về kho mình.
- D-11 (chỉ quản lý hủy) **sẽ làm đỏ test 20 dòng 180** đang chạy dưới `vanphong` → WU-10 phải
  sửa test đó và thêm assertion chứng minh `vanphong` bị 42501.

## Wave 2 — RPC đọc + lớp dữ liệu client

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-4** | `danh_sach_chung_tu` (lọc + phân trang server), `chi_tiet_chung_tu` (header + dòng + kho theo dòng) | `0044_rpc_chung_tu.sql`, `tests/21_danh_sach_chung_tu_test.sql` | NHAP-01 |
| **WU-5** | types, zod schema, api, keys, hooks cho phiếu nhập | `features/nhap-kho/{types.ts,schemas/*,api/*}` | NHAP-01..05 |

## Wave 3 — Giao diện nhập liệu

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-6** | Màn danh sách phiếu nhập: bộ lọc trên URL, bảng, trạng thái rỗng | `app/(app)/nhap-kho/page.tsx`, `components/bang-phieu-nhap.tsx`, `components/thanh-loc-phieu.tsx` | NHAP-01 |
| **WU-7** | Đầu phiếu: NCC, kho mặc định, ngày, loại nhập (NCC/nhà máy); tạo là sinh chứng từ `NHAP_LIEU` có số ngay | `app/(app)/nhap-kho/[id]/page.tsx`, `components/dau-phieu-nhap.tsx` | NHAP-01, D-09, D-10 |
| **WU-8** | Bảng dòng nhập bằng bàn phím: gõ mã → Enter → số lượng → đơn giá → Enter sang dòng mới; kho theo dòng; mỗi dòng lưu ngay | `components/bang-dong-nhap.tsx`, `components/o-tim-ma-hang.tsx` | NHAP-02, D-05, D-07, D-09 |

## Wave 4 — Ghi sổ, hủy, in

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-9** | Ghi sổ: chặn khi có dòng đơn giá 0, xác nhận, khóa phiếu sau khi `HOAN_THANH` | `components/nut-ghi-so.tsx` | NHAP-03, NHAP-04, D-04 |
| **WU-10** | Hủy phiếu: chỉ quản lý, bắt buộc lý do, hiện bút toán đảo. ⚠️ Cần migration sửa `huy_chung_tu` + sửa test 20 dòng 180 | `0045_chi_quan_ly_huy_nhap.sql`, `tests/20_chung_tu_test.sql`, `components/hop-huy-phieu.tsx` | NHAP-05, D-11..D-13 |
| **WU-11** | Mẫu in không có giá, một mẫu duy nhất | `app/(app)/nhap-kho/[id]/in/page.tsx`, `components/mau-in-phieu-nhap.tsx` | NHAP-06, D-14 |

## Wave 5 — Việc ngoài NHAP-01..08 và tích hợp

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-12** | Nạp giá vốn đầu kỳ bằng Excel: route đọc file + màn xem trước, gọi `dat_gia_von_dau_ky` | `app/api/danh-muc/gia-von-dau-ky/route.ts`, `features/danh-muc/components/nap-gia-von.tsx` | D-02 (ngoài roadmap) |
| **WU-13** | Tích hợp cuối: menu trái, thêm route vào `kiem-tra-quyen-route.ts`, chạy toàn bộ bộ kiểm | `shared/components/app-shell.tsx`, `scripts/kiem-tra-quyen-route.ts` | — |

---

## Thứ tự phụ thuộc

```
Wave 1  WU-1  WU-2  WU-3        ← độc lập nhau, chạy song song được
           ↓
Wave 2  WU-4 → WU-5              ← WU-4 cần kho-theo-dòng của WU-1
           ↓
Wave 3  WU-6   WU-7 → WU-8       ← WU-6 độc lập với WU-7/8
           ↓
Wave 4  WU-9  WU-10  WU-11       ← đều cần phiếu nhập liệu được ở Wave 3
           ↓
Wave 5  WU-12  WU-13
```

**13 plan / 8 wave** (sau khi soát phụ thuộc — xem bảng dưới). WU-12 nằm ngoài NHAP-01..08 — nếu cần cắt để về đúng phạm vi
roadmap thì cắt WU-12 trước tiên (giá vốn đầu kỳ có thể dồn sang kiểm kê Phase 6).

---

## Wave thật sau khi soát phụ thuộc

Bản phân rã đầu chia 5 wave theo cảm tính và có **3 chỗ phụ thuộc cùng wave** (05←04,
08←07, 10←09) — đúng lỗi đã vấp ở Phase 2 plan 02. Tính lại theo đường dài nhất:

| Wave | Plan | Chạy song song được |
|---|---|---|
| 1 | 03-01, 03-02, 03-03 | 3 tab |
| 2 | 03-04, 03-12 | 2 tab |
| 3 | 03-05 | — |
| 4 | 03-06, 03-07 | 2 tab |
| 5 | 03-08, 03-11 | 2 tab |
| 6 | 03-09 | — |
| 7 | 03-10 | — |
| 8 | 03-13 | — |

Phủ yêu cầu: NHAP-01..08 đều có ít nhất hai plan chạm tới, không yêu cầu nào hở.
