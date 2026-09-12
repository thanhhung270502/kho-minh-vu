# Kho Minh Vũ

## What This Is

Nền tảng quản lý xuất nhập tồn và đặt hàng cho **CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ** —
một doanh nghiệp thương mại phụ tùng xe máy với 3.266 mã hàng, 2 kho, 25 nhà cung cấp,
khoảng 92 phiếu xuất mỗi ngày. Hệ thống thay thế KiotViet đang dùng, dựng bằng
Next.js + Supabase, phục vụ ba nhóm người dùng: thủ kho (điện thoại, quét mã),
văn phòng (máy tính, nhập liệu dày) và quản lý (dashboard).

## Core Value

Ngày đầu go-live, **toàn bộ 923 phiếu xuất/tuần và 78 phiếu nhập/tuần chạy trên hệ mới
mà không ai phải mở KiotViet để đối chiếu.** Đó là tiêu chí thành công duy nhất — không
phải số lượng tính năng.

## Requirements

### Validated

<!-- Hạ tầng đã dựng và chạy được (commit e2e11dd, khôi phục ở 22f80ef). -->
<!-- Đây là hạ tầng, chưa phải năng lực nghiệp vụ — mọi màn hình vẫn là placeholder. -->

- ✓ Khung Next.js 16 App Router + TypeScript strict — scaffold
- ✓ Ant Design v6 + Tailwind v4 sống chung đúng thứ tự CSS layer — scaffold
- ✓ Supabase client cho browser / server / proxy, làm mới phiên bằng `getUser()` — scaffold
- ✓ TanStack Query v5 có chính sách retry phân biệt lỗi Postgrest và lỗi mạng — scaffold
- ✓ React Hook Form + Zod, validate biến môi trường lúc khởi động — scaffold

### Active

**Nền dữ liệu**
- [ ] Schema đầy đủ: danh mục, sản phẩm, chứng từ, đơn đặt hàng, sổ cái kho, tồn kho
- [ ] Sổ cái `kho_movement` append-only, chặn UPDATE/DELETE ở tầng database
- [ ] Trigger cập nhật `ton_kho` và tính giá vốn bình quân gia quyền di động
- [ ] RLS bốn vai trò (quản lý / văn phòng / thủ kho / chỉ xem), đọc vai trò từ JWT claims
- [ ] RPC ghi sổ chứng từ trong một transaction, RPC hủy sinh bút toán đảo
- [ ] Tìm sản phẩm không dấu (unaccent + pg_trgm), ưu tiên mã phát sinh gần đây
- [ ] Job đối chiếu `ton_kho` với tổng `kho_movement` hằng đêm

**Chín màn hình v1**
- [ ] Tổng quan — tồn theo nhóm/công đoạn, mã dưới định mức, hàng không luân chuyển >30 ngày, biểu đồ nhập–xuất 30 ngày
- [ ] Danh mục hàng hóa — bảng 3.266 mã, lọc và tìm, import–export Excel, chi tiết + thẻ kho
- [ ] Phiếu nhập — tạo, thêm dòng, nhập đơn giá, ghi sổ, in phiếu
- [ ] Phiếu xuất (PC + mobile) — tạo từ đơn đặt hoặc tạo mới, quét barcode, cảnh báo vượt tồn, in phiếu giao
- [ ] Đơn đặt hàng — tạo theo khách, theo dõi đã xuất / còn lại, chuyển sang phiếu xuất
- [ ] Tồn kho (PC + mobile) — tồn theo kho, thẻ kho từng mã có link chứng từ, tuổi tồn
- [ ] Đối tác — NCC và khách hàng chung một danh sách, lịch sử giao dịch
- [ ] Kiểm kê (mobile) — phiên kiểm kê theo nhóm, đếm bằng quét mã, bảng lệch, duyệt sinh điều chỉnh
- [ ] Cài đặt — người dùng & vai trò, kho, nhóm hàng, ĐVT, công đoạn, quy tắc đánh số chứng từ

**Chuyển dữ liệu**
- [ ] Nạp 3.266 mã hàng, 90 nhóm, 25 đối tác, 2 kho từ file export KiotViet
- [ ] Tách trường ĐVT thành `dvt` + `cong_doan`
- [ ] Trích danh sách khách hàng thật từ ô Ghi chú của 4.732 dòng bán
- [ ] Nhập giá vốn khởi đầu bằng Excel
- [ ] Kiểm kê thực tế để set tồn đầu kỳ

### Out of Scope

- **Công nợ phải thu / phải trả** — đã chốt ngoài phạm vi v1; cần thêm bảng thanh toán, đối chiếu, tuổi nợ
- **Quản lý theo lô & hạn dùng** — phụ tùng xe máy chưa cần truy xuất lô; kéo theo FIFO và toàn bộ logic phân bổ lô
- **Nối API hệ sản xuất Vũ Trụ L.An** — nhà máy được coi là **một nhà cung cấp**; chỉ chừa sẵn loại phiếu "Nhập từ nhà máy"
- **Quản lý sản xuất (WIP, lệnh sản xuất, tiến độ xưởng)** — ranh giới đã chốt: chỉ kho thương mại Minh Vũ
- **Nhiều chi nhánh** — hiện 1 chi nhánh, 2 kho; bảng `kho` đã đủ để mở rộng sau
- **Hóa đơn điện tử, kết nối thuế** — giá đang bằng 0 trên hệ cũ, chưa phát sinh nghiệp vụ hóa đơn
- **App native** — web responsive + quét barcode qua camera trình duyệt là đủ
- **Sổ quỹ, thanh toán** — hệ quả của việc bỏ công nợ ở v1

## Context

**Hệ thống đang thay thế:** KiotViet. Số liệu rút từ 4 file export ngày 12/09/2026,
kỳ dữ liệu 03–12/09/2026 (10 ngày).

| Chỉ số | Giá trị |
|---|---|
| Mã hàng | 3.266, thuộc 90 nhóm |
| Phiếu xuất / 10 ngày | 923 (5,1 dòng/phiếu) |
| Phiếu nhập / 10 ngày | 78 (7,6 dòng/phiếu) |
| Đơn vị đang tồn | 389.671 |
| Mã có phát sinh trong 10 ngày | 1.223 / 3.266 (37%) |
| Mã tồn > 0 nhưng không xuất | 1.720 |

**Ba chỗ dữ liệu cũ đang phải "lách" — phải sửa khi chuyển, không bê nguyên:**

1. **Trường ĐVT bị dùng làm mã công đoạn.** CÁI 1.571 · CARBON 518 · SƠN 394 ·
   XI MẠ 278 · ÉP 230 · CẶP 148 · BỘ 42 · CHAI 22 · NANO 20. Bốn giá trị giữa là
   công đoạn xử lý bề mặt, không phải đơn vị tính. Hệ quả: không trả lời được
   "hàng sơn tồn bao nhiêu" và "một cặp là mấy cái" cùng lúc.
   → Tách thành `dvt` và `cong_doan`, thêm `quy_doi`.

2. **Khách hàng thật nằm trong ô Ghi chú.** Cả 4.732 dòng bán gắn với một mã khách
   duy nhất "BỘ PHẬN ĐIỀU PHỐI ĐƠN". Tên khách thật — QUỲNH (317), NGỌC (288),
   TỐT (285), NHUNG (260), VI (192), OANH (179), QUYÊN (175), PHƯƠNG (161) — là
   chữ tự do trong Ghi chú. Không lọc, không cộng, không xếp hạng được.
   → Bảng `doi_tac` dùng chung NCC và khách; phiếu xuất bắt buộc có `doi_tac_id`.

3. **Giá bằng 0 trên toàn bộ chứng từ.** Cả 4.732 dòng xuất và 594 dòng nhập đều có
   đơn giá = 0. Hệ cũ chỉ chạy số lượng → **không có giá vốn lịch sử nào để kế thừa**.
   → Nhập giá vốn khởi đầu một lần bằng Excel lúc migrate.

**Ba rủi ro đã nhận diện:**

- **Xuất âm.** 42 mã đang bị xuất khi tồn ≤ 0. Chặn cứng ở v1 sẽ làm kho kẹt ngay
  ngày đầu và quay lại KiotViet. Cho xuất nhưng bắt buộc chọn lý do, đưa vào báo cáo
  hằng ngày cho quản lý.
- **Thói quen nhập liệu.** Người dùng quen KiotViet; mọi khác biệt về phím tắt và
  thứ tự thao tác đều là ma sát. Cần 2 giờ đào tạo và một tuần chạy song song.
- **Một người làm.** Không ai review code, không ai trực khi lỗi giờ cao điểm.
  Bù bằng: backup tự động Supabase, môi trường staging riêng, pgTAP cho trigger/RLS,
  giám sát lỗi runtime, và giữ KiotViet ở chế độ chỉ đọc thêm 3 tháng sau go-live.

**Trạng thái code hiện tại:** repo có scaffold Next.js 16 + antd v6 + Tailwind v4 +
Supabase (36 file, 1 commit). Mọi màn hình còn là placeholder `<ChuaTrienKhai>`.
`CLAUDE.md` và điều hướng trong `app-shell.tsx` còn viết cho phạm vi cũ (theo dõi
sản xuất 5 xưởng) — phải viết lại theo phạm vi này.

## Constraints

- **Tech stack**: Next.js 16 App Router + TypeScript, Ant Design v6 (bảng/form) +
  Tailwind v4 (layout), Supabase (Postgres + Auth + RLS + Realtime), TanStack Query v5,
  React Hook Form + Zod, exceljs, Recharts — đã chốt, không đổi giữa chừng.
- **Không ORM**: dùng supabase-js + type sinh tự động. Prisma/Drizzle kết nối trực tiếp
  bằng service role → bypass RLS, phá toàn bộ mô hình phân quyền.
- **Timeline**: 6 tuần, làm ngoài giờ, một người. Mỗi tuần phải kết thúc bằng một thứ
  chạy được, không phải một thứ làm dở.
- **Thiết bị**: thủ kho dùng điện thoại (quét mã, kiểm kê); văn phòng dùng máy tính với
  bảng dày. Hai lớp UI trên cùng một API.
- **Hiệu năng nhập liệu**: mục tiêu dưới 20 giây một phiếu xuất khi tạo từ đơn đặt hàng
  có sẵn. Văn phòng nhập ~470 dòng/ngày.
- **Bảo mật**: phân quyền cài bằng RLS ở tầng database, không bằng logic giao diện.
  `service_role` key tuyệt đối không đặt vào biến `NEXT_PUBLIC_*`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Giá vốn **bình quân gia quyền di động**, không FIFO | FIFO cần quản lý theo lô, thêm bảng và toàn bộ logic phân bổ lô khi xuất. Với 3.266 SKU và một người triển khai, đó là chi phí không đáng khi chưa cần truy xuất lô cho phụ tùng xe máy | — Pending |
| **Một bảng chứng từ cho bảy loại** (`loai_ct`) | Nhập, xuất, trả NCC, trả khách, chuyển kho, kiểm kê, điều chỉnh dùng chung header + dòng. Thẻ kho chỉ phải join một bảng | — Pending |
| **Vừa có sổ cái vừa có bảng tồn tổng hợp** | Sổ cái trả lời "vì sao tồn là con số này", bảng tồn trả lời "tồn là bao nhiêu" trong một phần nghìn giây. Chỉ sổ cái thì mỗi lần mở màn tồn phải cộng dồn hàng trăm nghìn dòng; chỉ bảng tồn thì lệch số không truy được | — Pending |
| **Tồn kho là kết quả, không phải dữ liệu nhập tay** | Không màn nào cho sửa trực tiếp số tồn. Sai số chỉnh bằng phiếu kiểm kê, có người ký, có lý do | — Pending |
| **Chứng từ hai trạng thái sống** `NHAP_LIEU` → `HOAN_THANH` | Sửa thoải mái khi chưa ghi sổ; ghi sổ rồi thì khóa. Hủy phiếu đã ghi sổ sinh bút toán đảo, không xóa bản ghi | — Pending |
| **Ghi sổ bằng Postgres RPC**, không bằng Server Action nhiều bước | Ghi sổ phải atomic. Bốn câu lệnh rời rạc từ Server Action không phải một transaction — mất mạng giữa chừng là lệch tồn vĩnh viễn | — Pending |
| **Dùng khóa ngoại (FK)** — lệch với quy tắc global "không dùng FK" | Quy tắc global viết cho backend Kotlin nơi tầng ứng dụng giữ toàn vẹn dữ liệu. Ở đây không có backend riêng: Postgres **là** backend. Tài liệu thiết kế nêu rõ dữ liệu hiện có 2 mã xuất hiện trên hóa đơn mà không có trong danh mục — ràng buộc FK chặn đúng loại lỗi này | — Pending |
| **13 bảng, không phải 11** như tài liệu ghi | Tài liệu đếm nhầm: phần mô hình dữ liệu liệt kê 12 bảng (kho, nhom_hang, don_vi_tinh, cong_doan, doi_tac, san_pham, chung_tu, chung_tu_dong, don_dat_hang, don_dat_hang_dong, kho_movement, ton_kho), cộng thêm `nguoi_dung` để RLS biết vai trò và chứng từ biết `nguoi_tao_id` | — Pending |
| **Vai trò đọc từ JWT claims**, không truy vấn bảng trong RLS policy | Policy phải `SELECT vai_tro FROM nguoi_dung WHERE id = auth.uid()` sẽ chạy mỗi dòng. Quét bảng tồn 3.266 mã sẽ chậm thấy rõ. Dùng custom access token hook | — Pending |
| **Cho xuất âm, bắt buộc chọn lý do** | Chặn cứng sẽ làm kho kẹt ngay ngày đầu và quay lại KiotViet. 42 mã đang bị xuất khi tồn ≤ 0 là thực tế vận hành, không phải lỗi nhập liệu | — Pending |
| Nhà máy Vũ Trụ L.An là **một nhà cung cấp** | Giữ ranh giới v1 ở kho thương mại. 49% hàng nhập là hàng nhà máy nên vẫn tách loại phiếu "Nhập từ nhà máy" để sau nối API | — Pending |
| **Không nạp tồn 389.671 từ KiotViet** | Tồn khởi điểm sai thì cả hệ thống sai từ ngày đầu, và không có cách sửa ngoài kiểm kê lại. Phải kiểm kê thực tế trước go-live | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-12 after initialization*
