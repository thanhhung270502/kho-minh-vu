---
phase: 02-khung-ung-dung
plan: 11
status: complete
completed: 2026-09-18
requirements: [DMUC-01, DMUC-02, DMUC-03, DMUC-04, DMUC-05]
---

# Plan 02-11 — Lớp dữ liệu danh mục

## Đã làm

| File | Vai trò |
|---|---|
| `src/features/danh-muc/types.ts` | Kiểu suy từ `database.types.ts`; `SanPhamInput` cố ý không có `gia_von` |
| `src/features/danh-muc/schemas/bo-loc.schema.ts` | Bộ lọc trên URL: `docBoLocTuUrl`, `ghiBoLocRaUrl`, `thamSoRpc` |
| `src/features/danh-muc/api/san-pham.keys.ts` | Query key tập trung |
| `src/features/danh-muc/api/san-pham.api.ts` | 11 hàm gọi RPC/PostgREST, hàm nào cũng `if (error) throw error` |
| `src/features/danh-muc/hooks/useSanPham.ts` | 9 hook TanStack Query, mutation tự invalidate danh sách + nhật ký |
| `src/shared/api/lich-su-sua.api.ts` | Đọc nhật ký sửa dùng chung cho danh mục và đối tác |

## Hai lỗi bắt được nhờ viết assert trước

1. **`Number(null)` là 0, không phải NaN.** Bản đầu của `docBoLocTuUrl` kẹp mọi khóa
   vắng mặt về giá trị nhỏ nhất, nên URL không có `kich_thuoc` cho ra 10 mã/trang thay vì
   50. Assert quay vòng `docBoLocTuUrl(ghiBoLocRaUrl(x)) === x` bắt ngay.
2. **Lọc "Tất cả" phải gửi `null` tường minh.** Bỏ trường `p_dang_kinh_doanh` thì RPC dùng
   mặc định `true` và màn hình lặng lẽ giấu mã đã ngừng kinh doanh — đúng loại lỗi im
   lặng khó thấy nhất. Đã ép null và có assert riêng.

## Ràng buộc tự đặt ra cho các plan giao diện

`san_pham` không còn quyền đọc mức bảng (0029): không `select('*')`, không `.select()`
trống sau insert/update. Đã kiểm bằng grep, chỉ còn chuỗi đó trong comment cảnh báo.
Văn phòng lưu mã hàng thì khóa `gia_ban` bị **xóa khỏi payload** thay vì gửi giá trị cũ —
trigger `chan_sua_gia_khong_du_quyen` chỉ nổi giận khi giá trị đổi, nhưng bỏ hẳn khóa là
cách chắc chắn nhất.

## Kiểm

`npx tsx scripts/kiem-tra-ham-thuan.ts` — 10 assert mới cho bộ lọc URL, tất cả đạt.
`npm run check` xanh.
