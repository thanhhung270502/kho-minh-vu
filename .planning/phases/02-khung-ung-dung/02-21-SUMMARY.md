---
phase: 02-khung-ung-dung
plan: 21
status: complete
completed: 2026-09-18
requirements: [AUTH-01, AUTH-02, AUTH-07, DMUC-01, DMUC-02, DMUC-03, DMUC-04, DMUC-05, DMUC-06, DMUC-07, DTAC-01, DTAC-02, DTAC-03, DLIEU-04, CDAT-01, CDAT-02, CDAT-03, CDAT-04]
---

# Plan 02-21 — Tích hợp cuối Phase 2

## Đã làm

| File | Vai trò |
|---|---|
| `scripts/kiem-tra-quyen-route.ts` | Ma trận 9 route × 5 vai trò, kiểm bằng HTTP trên phiên thật |
| `src/providers/query-client.ts` | Bỏ chữ phạm vi cũ trong comment |
| `src/features/README.md` | Bảng 4 feature thật + 2 quy ước (`.server.ts`, `quyen.ts` chỉ ẩn/hiện) |
| `CLAUDE.md` | 3 bẫy mới (quyền theo cột, hiệu lực token, đọc Excel) + 3 lệnh kiểm |
| `.memory/blockers/mo-sau-phase-1.md` | Đóng 6 mục Phase 2, ghi rõ 2 việc người dùng phải tự làm |
| `.planning/.../02-VALIDATION.md` | `wave_0_complete: true`, mọi dòng ✅ kèm bằng chứng |

## Toàn bộ bộ kiểm

```
pgTAP trên cloud — 15 file, 199 assert, 0 lỗi
  10:18  20:18  30:26  40:14  41:16  42:7  50:12  51:17
  60:10  61:14  62:8   63:6   70:12  80:10 90:11
npm run verify:hook                      ✓ 4/4 tài khoản có vai_tro (+kho_id)
npx tsx scripts/kiem-tra-ham-thuan.ts    ✓
npx tsx scripts/kiem-tra-doc-excel.ts    ✓ file KiotViet thật 3.266 dòng
npx tsx scripts/kiem-tra-quyen-route.ts  ✓ 45/45 ô đúng
npm run check                            exit 0
```

Ma trận quyền route đúng **ngay lần chạy đầu** — không phải sửa route nào. Nó phủ cả hai
ca dễ lọt: gõ thẳng URL `/cai-dat/so-chung-tu` bằng tài khoản văn phòng (→ `/khong-du-quyen`)
và `?tiep_tuc=//evil.com` khi đã đăng nhập (→ về `/`, không chuyển ra ngoài miền).

## Quyết định khi thực thi

- **Script lấy cookie bằng chính `createServerClient` của `@supabase/ssr`** với kho cookie
  trong RAM, không tự ghép chuỗi token: định dạng cookie là chi tiết nội bộ của thư viện,
  ghép tay thì test xanh/đỏ theo phiên bản chứ không theo code của mình. Script không in
  cookie hay token ra màn hình.
- **Nhận biết "bị chặn" theo hai đường**: header `Location` chứa `/khong-du-quyen`, HOẶC
  phản hồi 200 mà thân chứa đường dẫn đó (Next có thể trả redirect dạng payload RSC).
- **Giữ nguyên mọi giá trị cấu hình** trong `antd-theme.ts` / `query-client.ts`, chỉ sửa chữ
  trong comment — plan yêu cầu dọn chữ, không phải chỉnh hành vi.

## Trạng thái Phase 2

18/18 yêu cầu đã có màn hình dùng được và bằng chứng kiểm trong SUMMARY của từng plan.
Hai việc còn lại **thuộc về người dùng**, không phải phần mềm:

1. Rà 150 giá trị ô Ghi chú KiotViet tại `/doi-tac/ra-ghi-chu`.
2. Rà 364 mã "Cần rà" tại `/danh-muc`.

Sẵn sàng cho `/spartan:phase verify 2`.
