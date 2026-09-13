---
status: complete
phase: 01-nen-du-lieu
source: [01-SUMMARY.md]
started: 2026-09-13T02:30:00Z
updated: 2026-09-13T03:10:00Z
---

## Current Test

[testing complete]

## Cách kiểm

Bài 1 do người dùng xác nhận. Bài 2–6 người dùng yêu cầu Claude tự kiểm, nên được
kiểm bằng truy vấn trực tiếp trên dữ liệu thật đã nạp vào `kho-vu-tru`.

Dữ liệu chỉ **chứng minh** được những gì thể hiện trong chính nó. Kết luận nào là
phán đoán kinh doanh được ghi rõ là "dữ liệu gợi ý", không phải "đã xác nhận".

## Tests

### 1. Chuỗi migration dựng được từ database rỗng
expected: Lần db:push đầu trên project rỗng áp trọn 0001–0019 không lỗi; dry-run hiện báo up to date
result: pass
verified_by: người dùng
note: Không chạy reset thật vì kho-vu-tru là database duy nhất và đang chứa 3.266 mã. Bằng chứng thay thế — lần push đầu trên project rỗng thành công, và `db push --dry-run` báo "Remote database is up to date".

### 2. Công đoạn và nhóm hàng tách đúng
expected: Hàng có tên chứa "carbon" (mã đuôi -CB) được gán công đoạn CARBON; "Hàng Hãng - L5/6" (1.135 mã) và "Hàng Ngoài - L5/6" (189 mã) là hai nhóm riêng, đều là hàng mua ngoài
result: pass
verified_by: dữ liệu
evidence: |
  Lấy 1.441 mã có công đoạn suy từ ô ĐVT làm chuẩn, đối chiếu đuôi mã hàng:
    CARBON → -CB : 504/518 = 97,3%
    XI MẠ  → -X  : 265/278 = 95,3%
    SƠN    → -S  : 373/395 = 94,4%
    ÉP, NANO    : không dùng quy ước đuôi
  Hàng Hãng - L5/6: 1.135/1.135 là MUA_NGOAI. Hàng Ngoài - L5/6: 189/189 là MUA_NGOAI.
  Hai nhóm có mã riêng (HANG_HANG_L5_6, HANG_NGOAI_L5_6), không bị trộn.
observations:
  - "145 mã đang MUA_NGOAI có đuôi công đoạn (78 -S, 64 -CB, 2 -X, 1 -N) — gán tự động được ở Phase 2 với độ tin cậy ~95%."
  - "Số mã thật sự cần người rà giảm từ 1.825 xuống khoảng 356 (trừ 1.324 hàng Hãng/Ngoài và 145 mã có đuôi)."
  - "8 mã có ô ĐVT mâu thuẫn với tên và đuôi mã — xem mục Cần người quyết bên dưới."

### 3. Sản phẩm biết thuộc kho nào
expected: Mỗi mã hàng gắn đúng kho nó nằm — 3.240 mã Kho 1, 26 mã Kho 2
result: pass
verified_by: dữ liệu (sau khi sửa)
reported: "Lần kiểm đầu: dữ liệu kho đúng nhưng nằm sai cột san_pham.vi_tri_ke (cột dành cho dãy/kệ/tầng)."
severity: minor
resolution: |
  Người dùng chọn phương án A. Sửa ở migration 0025 + script import, viết test trước (đỏ → xanh).
  Sau sửa: kho_mac_dinh_id Kho 1 = 3.240, Kho 2 = 26, không mã nào NULL; vi_tri_ke sạch cả 3.266 dòng.
  Chạy import lại lần nữa: kho_mac_dinh_id giữ nguyên, không bị ghi đè thành NULL.
  60_kho_mac_dinh_test.sql 10/10, toàn bộ 89/89 pgTAP xanh.

### 4. Quy đổi hàng đơn vị CẶP
expected: 148 mã đơn vị CẶP (vd. bố thắng đùm) có quy_doi = 1, tức 1 CẶP là 1 đơn vị tồn kho
result: pass
verified_by: dữ liệu
evidence: |
  182 dòng hóa đơn của hàng CẶP đều ghi ĐVT = CẶP.
  Bán ra với số lượng lẻ: 1 (41 dòng), 3 (19), 5 (36), 7 (1) — tổng 83 dòng số lẻ.
  KiotViet ghi Quy đổi = 1, Mã ĐVT cơ bản để trống → CẶP là đơn vị gốc.
  Kết luận: 1 CẶP là 1 đơn vị tồn. Việc KHÔNG tự đặt quy_doi = 2 là đúng — đặt 2 sẽ làm sai tồn của 148 mã.

### 5. Tìm kiếm với từ khóa thật
expected: Gõ không dấu ra hàng có dấu, kết quả đúng loại hàng người dùng đang tìm
result: pass
verified_by: dữ liệu
evidence: |
  "air blade 13 carbon" → Ốp tay dắt sau / Ốp pô / Hộc chứa đồ / Ốp két tản nhiệt AIR BLADE 13 carbon
  "bo thang dum"        → SAKURA BỐ THẮNG ĐÙM, BỐ THẮNG ĐÙM SAU AIRBLADE, Bố Thắng Đùm (Bố Đỏ)...
  "loc gio pcx"         → LỌC GIÓ PCX 19, Ốp bầu lọc gió PCX 21 carbon, LỌC GIÓ PCX CỦ THƯỜNG...
  "op po"               → Ốp pô AIR BLADE 11 xi, Ốp pô SPARK sơn đen mờ, Ốp pô EXCITER 21 carbon...
  Kèm 14 assertion trong 40_tim_kiem_test.sql chạy xanh trên dữ liệu thật.

### 6. Nhà cung cấp và khách hàng
expected: 23 NCC thật (bỏ NB001, NB002); mã 0317415317 là Tân Thiên Long; 8 tên trong ô Ghi chú hóa đơn là khách hàng thật
result: pass
verified_by: dữ liệu
scope_note: "Phần 'là khách hàng thật' vượt phạm vi Phase 1. Phân loại khách là DLIEU-04 ở Phase 2. Phase 1 chỉ cần ghi chú được lưu nguyên vẹn — đã đúng."
evidence: |
  NCC: 23 dòng, NB001 và NB002 không có trong doi_tac, 0317415317 → NCC900001 CÔNG TY TNHH MTV XE MÁY TÂN THIÊN LONG.
  Ghi chú: 3.505 dòng hóa đơn có ghi chú, 8 tên chính đúng số lượng tài liệu thiết kế.
  Dữ liệu gợi ý về 8 tên:
    - KHÔNG phải nhân viên lập hóa đơn: người bán chỉ có Bùi Thị Kim Chi (3.598) và Chề Quay Dậu (1.134),
      người tạo là Minh Nhi (4.719) và Từ Vĩnh An (13) — không trùng tên nào trong 8 tên.
    - Mỗi tên đi với 27–58 hóa đơn khác nhau trong 10 ngày, qua 1–2 người bán → khách mua lặp lại thường xuyên.
    - Kênh bán 100% "Bán trực tiếp".
  Dữ liệu KHÔNG phân biệt được "khách sỉ" với "nhân viên sale ngoài mang đơn về" — cần người quyết.

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
note: "Lần kiểm đầu 5 đạt / 1 lỗi. Lỗi bài 3 đã sửa và kiểm lại — xem resolution."

## Gaps

- truth: "Mỗi mã hàng gắn đúng kho nó nằm, lưu ở chỗ các phase sau đọc được đúng nghĩa"
  status: resolved
  fixed_in: "supabase/migrations/0025_kho_mac_dinh.sql, scripts/import-kiotviet/kiem-tra.ts, scripts/import-kiotviet/nap-du-lieu.ts"
  chosen_fix: "A"
  reason: "Dữ liệu kho (Kho 1 / Kho 2) nằm trong san_pham.vi_tri_ke — cột dành cho dãy/kệ/tầng"
  severity: minor
  test: 3
  root_cause: |
    Cột "Vị trí" trong file export KiotViet chứa TÊN KHO, không phải vị trí kệ.
    Ánh xạ vi_tri → vi_tri_ke viết dựa trên tên cột giống nhau, trước khi soi giá trị thật.
    Dữ liệu tự nó nhất quán: 3.240 / 26 khớp tài liệu thiết kế, Kho 2 trùng khít Nhóm 122B (26 mã).
  artifacts:
    - scripts/import-kiotviet/kiem-tra.ts        # vi_tri: doChuoi(d.o["vi_tri"])
    - scripts/import-kiotviet/nap-du-lieu.ts      # vi_tri_ke: s.duLieu.vi_tri
    - supabase/migrations/0024_nap_danh_muc_day_du.sql
  missing:
    - "Chỗ lưu kho mặc định của sản phẩm, hoặc quyết định bỏ dữ liệu này"
  impact: |
    Không làm hỏng yêu cầu nào của Phase 1 — không chỗ nào đang đọc vi_tri_ke để suy ra kho.
    Rủi ro nằm ở sau: khi đưa vị trí kệ thật vào, cột này đã bẩn "Kho 1"; và Phase 3–4 có thể cần
    kho mặc định để điền sẵn khi tạo phiếu.
  fix_options:
    - "A. Thêm san_pham.kho_mac_dinh_id → kho(id), chuyển Kho 1/Kho 2 sang, xoá vi_tri_ke. Giữ được dữ liệu."
    - "B. Xoá trắng vi_tri_ke, bỏ dữ liệu kho mặc định."

## Cần người quyết (không phải lỗi của Phase 1)

1. **8 mã có ô ĐVT mâu thuẫn với tên và đuôi mã.** Phase 1 nạp trung thực theo ô ĐVT gốc.
   Có thể ô ĐVT nhập sai, cũng có thể là sơn vân carbon (qua xưởng sơn, "carbon" chỉ là bề ngoài).

   | ĐVT gốc | Mã hàng | Tên hàng |
   |---|---|---|
   | SƠN | HVR23-75-35-CB | Mặt nạ VARIO 23 carbon [CTS 1024] |
   | SƠN | HVR23-75-36-CB | Mặt nạ VARIO 23 carbon [CTS 1022] |
   | SƠN | HVR23-75-37-CB | Mặt nạ VARIO 23 carbon [CTS 1023] |
   | SƠN | YE19-46-9635-CB | Đầu đèn EXCITER 19 carbon CTS1024 |
   | SƠN | YE19-46-9736-CB | Đầu đèn EXCITER 19 carbon CTS1022 |
   | SƠN | YE19-46-9837-CB | Đầu đèn EXCITER 19 carbon CTS1023 |
   | XI MẠ | YE15-29-CB | Ốp xi nhan trước EXCITER 15 carbon |
   | ÉP | HL10-16ATBAĐ-S | Che pô (thay thế) LEAD 10 sơn bạc đen |

2. **8 tên trong ô Ghi chú là khách sỉ hay nhân viên sale ngoài** — quyết định cho DLIEU-04 ở Phase 2.
