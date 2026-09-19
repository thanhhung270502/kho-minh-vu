# Phase 3: Phiếu nhập — Work Units

**Decomposed:** 2026-09-19
**Nguồn:** `03-CONTEXT.md` (D-01..D-14)

Mỗi WU: tối đa 3 file, tối đa nửa ngày, một commit.
Migration tiếp theo bắt đầu từ **0041** (0040 là cuối của Phase 2).

---

## Wave 1 — Nền database (chạy song song được)

| WU | Việc | File | Yêu cầu |
|---|---|---|---|
| **WU-1** | `kho_id` vào `chung_tu_dong`; `ghi_so_chung_tu`/`huy_chung_tu` lấy kho theo dòng; `chung_tu.kho_id` thành kho mặc định | `0041_kho_theo_dong.sql`, `tests/20_chung_tu_test.sql`, `tests/10_ton_kho_test.sql` | D-05 |
| **WU-2** | Đánh số riêng cho nhập nhà máy, không phá 7 dòng `cau_hinh_so_ct` đang chạy | `0042_so_phieu_nha_may.sql`, `tests/80_cau_hinh_so_ct_test.sql` | D-10, NHAP-07 |
| **WU-3** | RPC `dat_gia_von_dau_ky` — chỉ quản lý, chỉ khi `gia_von = 0`, ghi nhật ký | `0043_gia_von_dau_ky.sql`, `tests/91_gia_von_dau_ky_test.sql` | D-02 |

⚠️ WU-1 sửa hàm đã test ở Phase 1 — chạy lại **toàn bộ** pgTAP (199 assert) sau khi push,
không chỉ file của WU.

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
| **WU-10** | Hủy phiếu: chỉ quản lý, bắt buộc lý do, hiện bút toán đảo | `components/hop-huy-phieu.tsx` | NHAP-05, D-11..D-13 |
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

**13 work unit / 5 wave.** WU-12 nằm ngoài NHAP-01..08 — nếu cần cắt để về đúng phạm vi
roadmap thì cắt WU-12 trước tiên (giá vốn đầu kỳ có thể dồn sang kiểm kê Phase 6).
