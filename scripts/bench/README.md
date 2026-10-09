# Bench Phase 22 — đo hiệu năng khi dữ liệu phình

Sinh dữ liệu quy mô lớn trên Supabase LOCAL, đo thời gian các RPC nóng, so trước/sau
khi áp migration. Kết quả nằm ở `.planning/phases/22-toi-uu-du-lieu-lon/bench/`.

## Chỉ chạy trên LOCAL

Cấu hình lấy từ `npx supabase status -o env`, không đọc `.env.local` (file đó đổi qua lại
local và cloud). `scripts/bench/local-env.ts` chặn mọi host khác `127.0.0.1` / `localhost`
trước khi kết nối. Cần `npm run db:start` và đã `npm run seed:users` (có tài khoản quản lý).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run bench:seed -- --days 99` | Dựng danh mục + chứng từ 99 ngày (mức "hiện tại") |
| `npm run bench:seed -- --years 5` | Mức 5 năm, khoảng 1 triệu dòng `kho_movement` |
| `npm run bench:run -- --label <nhãn>` | Đo p50/p95/max từng RPC, lưu `<nhãn>.json` và `.md` |
| `npm run bench:compare -- <a> <b>` | So hai lần đo |
| `npm run bench:explain -- <nhãn>` | Lưu đầu ra EXPLAIN các truy vấn then chốt |
| `npm run bench:clean` | Xóa sạch dữ liệu BENCH, kiểm mồ côi |

Thời gian ước tính: 99 ngày vài phút; 5 năm vài chục phút tới khoảng 2 giờ — nên chạy nền,
chạy lại thì tiếp tục được (không nhân đôi).

## Bảng tiền tố

| Thứ | Giá trị |
|---|---|
| `san_pham.ma_hang` | `BENCH-0001` … `BENCH-3300` (hàng thường), `BENCH-CB-01` … `BENCH-CB-10` (`loai_hang = 'COMBO'`) |
| `nhom_hang.ma` | `BENCH-NH-01` … `BENCH-NH-90` |
| `doi_tac.ma` | NCC `BENCH-NCC-01` … `BENCH-NCC-25`; khách `BENCH-KH-001` … `BENCH-KH-030`; nội bộ `NBBENCH` (mã `NB…` bị báo cáo loại ra) |
| `nhan_vien_phu_trach.ten_viet_tat` | `BENCH-NV1` … `BENCH-NV8` |
| `chung_tu.so_ct` | `BENCH-<PN\|HD\|TK\|DC\|KK><YYMMDD>-<NNN>`; tồn đầu `BENCH-PN-DAU-K1` / `BENCH-PN-DAU-K2`; phiên kiểm kê mở `BENCH-KK-MO`; nháp của bench runner `BENCH-NHAP-<epoch ms>` |
| `don_dat_hang.so_dh` | `BENCH-DH<YYMMDD>-<NNN>` |
| Tài khoản bench | `bench.quanly@khominhvu.local`, `bench.thukho@khominhvu.local` — `bench:clean` KHÔNG xóa |

Tồn đầu kỳ đi qua `ghi_so_chung_tu` (phiếu NHAP) nên trigger tồn kho và giá vốn bình quân
chạy đúng; không có dòng nào INSERT thẳng vào `kho_movement`.

## Lưu ý

- `npm run db:test` chạy `supabase db reset` nên xóa sạch dữ liệu bench. Đo xong mới chạy pgTAP.
- `bench:clean` dùng `session_replication_role = replica` để xóa sổ cái; chỉ dành cho dữ liệu thử.
- Giới hạn đã biết: bút toán đảo của phiếu hủy có `ngay = now()` lúc seed và
  `kho_movement.created_at` = lúc seed (sổ cái bất biến, không sửa lại được).
