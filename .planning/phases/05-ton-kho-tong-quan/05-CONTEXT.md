# Phase 5: Tồn kho & Tổng quan - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning — NHƯNG bị chặn bởi hai việc ngoài phase (xem `<open_items>`)

<domain>
## Phase Boundary

Người dùng nhìn thấy tồn kho hiện tại mà không phải hỏi ai, truy được mọi biến động
của một mã về đúng chứng từ sinh ra nó, và biết trước mã nào sắp hết thay vì biết sau.

**Hai cái đau người dùng tự nêu** (Office Hours 20/09):
1. **Không ai biết tồn thật** — muốn biết còn bao nhiêu phải hỏi thủ kho hoặc mở KiotViet
2. **Hết hàng mới biết** — tới lúc khách đặt mới phát hiện kho trống, rồi mới chạy đi đặt

**Bản hẹp đã chọn:** tồn kho + thẻ kho (TON-01, TON-02). Đau thứ hai không nằm trong
bản hẹp đó, nên bổ sung đúng phần giải nó: đề xuất định mức tồn tối thiểu từ lịch sử
bán, rồi danh sách mã dưới định mức (TQAN-02).

**Trong phạm vi đợt này:** TON-01, TON-02, TQAN-02, cộng việc nạp tồn tạm (xem D-05).

**Ra khỏi phạm vi đợt này:**
TON-03 (tuổi tồn / không luân chuyển) · TON-04 (chuyển kho) · TON-05 (màn tồn trên
điện thoại) · TQAN-01 (tồn theo nhóm/công đoạn) · TQAN-03 (không luân chuyển 30 ngày)
· TQAN-04 (biểu đồ nhập–xuất 30 ngày) · TQAN-05 (tổng giá trị tồn) · TQAN-06 (báo cáo
xuất âm).

> **Việc phải làm ngoài code:** ROADMAP.md và REQUIREMENTS.md đang xếp cả 11 yêu cầu
> vào Phase 5. Tám yêu cầu trên dời sang đợt sau nên roadmap phải cập nhật.
> **Chưa sửa** — chờ người dùng quyết cách xếp (một Phase 5.1 riêng, hay dồn vào Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Màn tồn kho

- **D-01:** Một dòng cho **mỗi mã hàng**, kho là **cột** (`Kho 1` · `Kho 2` · `Tổng`).
  Hợp lý khi chỉ có 2 kho: nhìn một mã biết ngay nằm ở đâu, và số dòng khớp với danh
  mục nên đối chiếu được. Nếu sau này thêm kho thứ ba thì phải xem lại hình này.
- **D-02:** **Không hiện giá trị tồn** (tồn × giá vốn) ở đợt này. Màn chỉ có số lượng.
  Tránh hẳn chuyện quyền đọc `gia_von` (migration 0029 đã thu quyền đọc mức cột, chỉ
  đọc được qua RPC `gia_von_san_pham`). Tổng giá trị tồn (TQAN-05) để đợt sau.
- Lọc: nhóm hàng, công đoạn, kho, và ô tìm một dòng theo mã/tên gõ không dấu — dùng lại
  đúng bộ lọc của `danh_sach_san_pham` (migration 0030) đã có sẵn.

### Thẻ kho

- **D-03:** Dùng lại RPC `the_kho_san_pham` (migration 0031) đã có, **bổ sung cột tồn
  lũy kế tại từng thời điểm**. Phản hồi business 19/09 nêu đích danh thiếu sót này:
  *"Chi tiết: tồn tại thời điểm đó — chưa có"*. Không có cột này thì thẻ kho chỉ là
  danh sách biến động rời rạc, không dựng lại được bức tranh.
- Mỗi dòng có link mở đúng chứng từ sinh ra nó (TON-02).

### Định mức tồn tối thiểu và cảnh báo sắp hết

- **D-04:** Định mức **suy từ lịch sử bán KiotViet**, hệ đề xuất — người duyệt. Không
  bắt ai ngồi gõ 3.266 dòng.
  - Mã **có** lịch sử bán (1.223 mã): định mức từ tốc độ bán của chính nó.
  - Mã **không** có lịch sử (2.043 mã): lấy theo **trung bình nhóm hàng**.
  - Con số đề xuất **không tự ghi đè** — phải có người bấm duyệt.

> **Cảnh báo về chất lượng dữ liệu, phải ghi vào màn duyệt:** lịch sử chỉ trải
> **10 ngày** (03/09 → 12/09/2026), 4.732 dòng, chạm **1.223/3.266 mã**. Một tuần rưỡi
> là quá ngắn để nói về tốc độ bán — một đơn lớn bất thường đủ thổi định mức lên gấp
> đôi. Màn duyệt phải hiện rõ định mức này dựa trên bao nhiêu ngày và bao nhiêu lần
> bán, để người duyệt biết con số nào đáng tin. Chạy lại sau vài tháng khi hệ mới có
> lịch sử của chính nó.

### Nạp tồn tạm để màn có dữ liệu

- **D-05:** Nạp tồn hiện tại của KiotViet vào làm **số tạm**, qua **một chứng từ
  `DIEU_CHINH`**. Dùng `DIEU_CHINH` chứ không `KIEM_KE` để dành `KIEM_KE` cho phiên
  đếm thật của Phase 6 — hai thứ không lẫn vào nhau trong báo cáo kiểm kê.
  - Đi qua chứng từ, **không sửa `ton_kho` tay** (nguyên tắc kiến trúc số 1).
  - Ghi chú chứng từ nói rõ: số tạm từ KiotViet, chưa đếm thực tế.
  - Kiểm kê Phase 6 sinh phiếu điều chỉnh **đè lên**, không xóa chứng từ này.

> **Đây là đi ngược một quyết định đã khóa — có chủ đích, người dùng đã xác nhận sau
> khi được cảnh báo.** ROADMAP Phase 6 tiêu chí 4 và DLIEU-06 ghi: *"Tồn đầu kỳ được
> set từ kết quả kiểm kê thực tế, **không bê nguyên số 389.671 từ KiotViet**"*.
> Cách hòa giải: số nạp ở đây **không phải tồn đầu kỳ chính thức**, nó là số tạm gắn
> nhãn để màn đọc có cái mà hiện và để UAT được bằng dữ liệu giống thật. Tồn đầu kỳ
> chính thức vẫn do kiểm kê Phase 6 đặt. Nếu go-live trước khi kiểm kê xong thì quyết
> định này thành sai — phải kiểm lại ở Phase 6.

### Claude's Discretion

- Ngưỡng và công thức cụ thể của đề xuất định mức (số ngày chờ hàng, cách làm mượt số
  liệu 10 ngày, cách chặn giá trị vô lý). Ràng buộc: phải hiện rõ căn cứ cho người duyệt.
- Cách đánh dấu chứng từ nạp tạm sao cho truy ngược được và Phase 6 nhận ra nó.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quyết định nghiệp vụ
- `.planning/feedback/2026-09-19-business.md` — đặc biệt lượt 1 (danh mục hàng hóa):
  mục "Chi tiết: tồn tại thời điểm đó — chưa có" là nguồn của D-03; và bảng "Chốt cuối"
  câu 3 (đầu kỳ neo vào kiểm kê Phase 6) là quyết định mà D-05 đang đi ngược có chủ đích.
- `.planning/ROADMAP.md` §Phase 5 và §Phase 6 (tiêu chí 4 — tồn đầu kỳ)
- `.planning/REQUIREMENTS.md` — TON-01..05, TQAN-01..06, DLIEU-06
- `.planning/phases/04-don-dat-hang-phieu-xuat/04-CONTEXT.md` — D-11..D-14 về xuất âm,
  gợi ý mã trùng; Phase 5 đọc dữ liệu do Phase 4 sinh ra

### Luật dự án
- `CLAUDE.md` — 5 nguyên tắc kiến trúc (đặc biệt số 1: tồn là kết quả, không nhập tay),
  quy ước đặt tên, 18 bẫy đã gặp
- `.memory/index.md` và ba file trong `.memory/patterns/`

### Database đã có, dùng lại chứ đừng viết mới
- `supabase/migrations/0008_so_cai_ton_kho.sql` — bảng `ton_kho` (khóa `(kho_id, san_pham_id)`)
  và trigger tính tồn + giá vốn
- `supabase/migrations/0030_danh_sach_san_pham.sql` — `danh_sach_san_pham` đã có bộ lọc
  nhóm/công đoạn/ĐVT/`p_trang_thai_ton` và phân trang server; `chi_tiet_san_pham`
- `supabase/migrations/0031_the_kho_san_pham.sql` — `the_kho_san_pham(p_san_pham_id,
  p_kho_id, p_trang, p_kich_thuoc)`, hiện trả 14 cột, **thiếu tồn lũy kế**
- `supabase/migrations/0029_an_gia_von.sql` — vì sao `select *` trên `san_pham` và
  `kho_movement` trả 42501, và RPC `gia_von_san_pham`
- `supabase/migrations/0017_doi_chieu.sql` — `doi_chieu_ton()` đối chiếu `ton_kho` với
  tổng `kho_movement`
- `supabase/migrations/0011_rpc_ghi_so.sql` — `_ghi_so_dieu_chinh` (đường nạp tồn tạm của D-05)
- `data/kiotviet/README.md` — bốn file export, các bẫy đọc file KiotViet

</canonical_refs>

<code_context>
## Existing Code Insights

### Đã có sẵn
| Thứ | Ở đâu | Dùng cho |
|---|---|---|
| `ton_kho` + trigger tự cập nhật | migration 0008 | TON-01 — chỉ cần RPC đọc |
| `the_kho_san_pham` | migration 0031 | TON-02 — chỉ cần thêm cột lũy kế |
| `danh_sach_san_pham` với bộ lọc đầy đủ | migration 0030 | khuôn cho RPC tồn kho |
| `san_pham.ton_toi_thieu` (cột đã có, mặc định 0) | migration 0005 | TQAN-02 — chỉ thiếu dữ liệu |
| `_ghi_so_dieu_chinh` | migration 0011 | D-05 nạp tồn tạm |
| `luu_tru_hoa_don_kiotviet` 4.732 dòng | migration lưu trữ | D-04 suy định mức |
| Đọc Excel phía server | `src/shared/lib/o-excel.ts` | nạp file danh mục KiotViet |
| Khuôn màn danh sách | `src/shared/components/list-layout.tsx` | màn tồn kho |
| 4 trạng thái bắt buộc | `src/shared/components/query-state.tsx` | mọi màn đọc |

### Established Patterns
- Mapper Việt→Anh chỉ sống ở `api/` + `types.ts`; component không bao giờ thấy `so_luong`
- RPC đọc trả `tong_so_dong` kèm mỗi dòng để khỏi gọi thêm lượt đếm (khuôn 0030/0045)
- RPC `SECURITY DEFINER` phải tự áp phạm vi kho của `thu_kho` — RLS không chạy bên trong
- Route tiếng Việt không dấu; tên file/hàm tiếng Anh

### Integration Points
- Route mới: `src/app/(app)/ton-kho` (+ màn dưới định mức, + màn duyệt đề xuất định mức)
- Thẻ kho nằm trong trang chi tiết mã hàng đã có: `src/app/(app)/danh-muc/[id]`
- `scripts/test-route-permissions.ts` phải thêm dòng cho mọi route mới (bẫy 12)

</code_context>

<specifics>
## Specific Ideas

**Số đo ngày 20/09 trên `kho-vu-tru` — dùng số này, đừng đo lại:**

| | |
|---|---|
| `ton_kho` | 2 dòng, **0 dòng có số lượng khác 0** |
| `kho_movement` | 6 dòng (phiếu thử Phase 3 + bút toán đảo) |
| `chung_tu` | 4 |
| Mã có `ton_toi_thieu > 0` | **0 / 3.266** |
| `luu_tru_hoa_don_kiotviet` | 4.732 dòng · **1.223 mã** · **03/09 → 12/09/2026** · 37.283 đơn vị |
| `luu_tru_nhap_kiotviet` | 594 dòng |
| Kho | 2 |

**Bộ export KiotViet không có file tồn kho.** Bốn file: danh mục, NCC, chi tiết nhập,
chi tiết hóa đơn. Số tồn nằm trong **cột tồn của file danh mục** (`DanhSachSanPham_KV…`),
và Phase 2 đã cố ý không nạp cột đó. Thư mục `data/kiotviet/` hiện chỉ có README — file
thật bị gitignore và không nằm trong bản làm việc này.

</specifics>

<deferred>
## Deferred Ideas

### Tám yêu cầu dời khỏi đợt này (cần cập nhật roadmap)
TON-03 tuổi tồn / không luân chuyển · TON-04 chuyển kho (`CHUYEN_KHO` — cơ chế ghi sổ
đã có từ Phase 1, chỉ thiếu giao diện) · TON-05 màn tồn trên điện thoại · TQAN-01 tồn
theo nhóm và công đoạn · TQAN-03 không luân chuyển 30 ngày · TQAN-04 biểu đồ nhập–xuất
30 ngày · TQAN-05 tổng giá trị tồn kho · TQAN-06 báo cáo xuất âm theo lý do.

**TQAN-03 và TQAN-04 còn vướng dữ liệu:** hệ mới chưa chạy đủ 30 ngày nào. Phải chốt
tính từ lưu trữ KiotViet (chỉ có 10 ngày) hay chỉ tính từ ngày go-live.

### Từ phản hồi 19/09, chưa xếp phase
- Ảnh sản phẩm + màn danh mục dùng được trên điện thoại
- Vị trí kệ (`san_pham.vi_tri_ke` — cột có, rỗng ở cả 3.270 mã)
- NCC theo mã hàng suy từ lịch sử nhập (594 dòng chỉ chạm 406/3.270 mã)
- Đầu kỳ / cuối kỳ trong chi tiết mã hàng
- Báo cáo "sale nào bán nhiều nhất" (cần Phase 4 chạy trước)

### Nhỏ
- Chạy lại đề xuất định mức sau vài tháng, trên lịch sử của chính hệ mới

</deferred>

<open_items>
## Chặn — phải gỡ trước khi thực thi Phase 5

1. **Phase 4 chưa chạy xong.** Phase 5 đọc dữ liệu do Phase 4 sinh ra. Phần database
   của Phase 4 đã có trên cloud (migration tới 0057) nhưng toàn bộ giao diện chưa làm.
2. **Bản làm việc này không chạy được gì.** Không có `node_modules`, không có
   `.env.local`, Supabase CLI chưa đăng nhập → không `npm run check`, không `db:push`,
   không `db:types`, không `db:test:linked`. Xem `04-01-SUMMARY` và commit `8fc8bfe`.
3. **`src/types/database.types.ts` lạc hậu** — chưa biết một RPC nào của Phase 4.
4. **Cần file `DanhSachSanPham_KV…`** đặt vào `data/kiotviet/` thì D-05 mới nạp được
   tồn tạm. Thư mục đang trống.
5. **Chưa rõ ai đã đẩy migration 0050–0057 lên database thật.** Không phải từ thư mục
   này. Nếu có phiên khác đang làm cùng database thì hai bên sẽ ghi đè nhau.

</open_items>

---

*Phase: 5-Tồn kho & Tổng quan*
*Context gathered: 2026-09-20*
