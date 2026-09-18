---
phase: 02-khung-ung-dung
plan: 12
status: complete
completed: 2026-09-18
requirements: [DMUC-06, DMUC-07]
---

# Plan 02-12 — Excel: một nguồn logic, đọc ở server

## Đã làm

| File | Vai trò |
|---|---|
| `src/shared/lib/tach-dvt-cong-doan.ts` | Logic tách ĐVT/công đoạn chuyển từ `scripts/` về đây, dùng `boDau` sẵn có |
| `src/shared/lib/o-excel.ts` | `doSo`, `doChuoi`, `doNgayExcel`, `docSheetDau(đường dẫn \| Buffer)` — stream reader `styles: "ignore"` |
| `scripts/import-kiotviet/{tach-dvt-cong-doan,doc-file}.ts` | Chỉ còn re-export + lớp mỏng đọc theo đường dẫn |
| `src/features/danh-muc/lib/mau-excel.ts` | 15 cột mẫu hệ mới, kiểu `DongNhap` khớp hợp đồng RPC `nhap_danh_muc` |
| `src/features/danh-muc/lib/doc-file-danh-muc.server.ts` | Nhận diện 2 định dạng, chuyển về `DongNhap`, `taoFileMau` |
| `src/app/api/danh-muc/nhap-excel/route.ts` | POST multipart: kiểm quyền, giới hạn 5MB/.xlsx, parse, gọi RPC bằng phiên người dùng |
| `src/app/api/danh-muc/mau-excel/route.ts` | GET file mẫu trống |
| `scripts/kiem-tra-doc-excel.ts` | Kiểm trên file KiotViet THẬT |

## Kiểm trên dữ liệu thật

`npx tsx scripts/kiem-tra-doc-excel.ts` xanh, gồm:

- Đọc `DanhSachSanPham_*.xlsx` thật: **3.266 dòng**, không crash `reading 'styles'`.
- Mã qua xử lý bề mặt suy được công đoạn; mã "CÁI" trả `cong_doan: null` kèm
  `cong_doan_khi_tao_moi: "MUA_NGOAI"` — **không ghi đè công đoạn đã rà**.
- Giá bán 0 của hệ cũ không được gửi đi (nếu gửi sẽ xóa giá quản lý vừa đặt).
- Cột "Vị trí" của KiotViet là TÊN KHO: đúng **26 mã Kho 2** như dữ liệu thật.
- Quay vòng: xuất mẫu hệ mới → đọc lại → nhận đúng định dạng, không mất mã, ĐVT giữ nguyên.
- File hỏng báo "Không đọc được file Excel…" thay vì ném lỗi thô.

`npm run import:kiotviet` (dry-run) vẫn đọc 3.266 dòng, 0 lỗi — script Phase 1 không đổi
hành vi sau khi rút logic ra.

Không cookie: `GET /api/danh-muc/mau-excel` và `POST /api/danh-muc/nhap-excel` đều trả **401**.

## Quyết định khi thực thi

- **Không dùng `import "server-only"`** trong `doc-file-danh-muc.server.ts`: gói đó ném lỗi
  khi chạy ngoài điều kiện `react-server`, mà script kiểm bằng `tsx` phải import được.
  Hàng rào thật là `node:stream` trong `o-excel.ts` — import nhầm vào Client Component là
  build hỏng ngay.
- `docSheetDau` trả thêm danh sách tên cột đã chuẩn hóa để nhận diện định dạng, thay vì
  đoán theo tên file.
- Script kiểm phải bọc trong `async function main()`: `tsx` biên dịch ra CJS nên không
  nhận `await` ở cấp cao nhất.
