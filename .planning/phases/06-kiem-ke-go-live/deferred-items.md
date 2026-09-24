# Deferred Items — Phase 6 (Kiểm kê & Go-live)

Việc phát hiện ngoài phạm vi của plan đang thực thi, KHÔNG sửa ngay (SCOPE
BOUNDARY — chỉ sửa những gì trực tiếp do task hiện tại gây ra). Ghi lại để plan
sau hoặc người dùng quyết định.

## 06-04: `38_kiem_ke_dem_test.sql` dùng `(fn()).*` cho RPC ghi sổ (VÔ HẠI, không phải bug)

**Phát hiện lúc:** Thực thi 06-04 Task 2 (dry-run GREEN), khi bisect lỗi giả ở
pgTAP 39 do khuôn `(fn(...)).* ` gọi lại hàm VOLATILE một lần cho MỖI cột được
chiếu (xác nhận bằng thực nghiệm — xem `06-04-SUMMARY.md` Deviations #1).

**File liên quan:** `supabase/tests/38_kiem_ke_dem_test.sql` (06-03) dùng cùng
khuôn cho `mo_phien_kiem_ke`/`luu_dong_kiem_ke`:
```sql
select (public.mo_phien_kiem_ke(...)).*;
select (public.luu_dong_kiem_ke(...)).*;
```

**Vì sao KHÔNG sửa ngay:** Ngoài `files_modified` của 06-04. Vô hại với hai RPC
này cụ thể:
- `mo_phien_kiem_ke` bị gọi lại nhiều lần sẽ tạo thêm chứng từ KIEM_KE "orphan"
  (mỗi lần một `so_ct` khác nhau qua `sinh_so_ct`), nhưng mọi assertion của 38
  chỉ tham chiếu ĐÚNG MỘT `id` đã capture trong temp table nên không bị lộ ra.
- `luu_dong_kiem_ke` là UPSERT (`ON CONFLICT`) trên khóa `(chung_tu_id,
  san_pham_id)` — gọi lại nhiều lần với CÙNG tham số converge về cùng kết quả
  cuối (idempotent trong phạm vi MỘT statement, vì không có thao tác nào khác
  xen giữa các lần gọi lặp).

**Rủi ro nếu không sửa:** Phiếu KIEM_KE "orphan" từ các lần gọi thừa của
`mo_phien_kiem_ke` sẽ tồn tại thật trên database sau khi 06-05 đẩy schema và
chạy pgTAP 38 thật (không dry-run) — mỗi lần chạy `npm run db:test:linked` sẽ
để lại vài chứng từ KIEM_KE rác (trạng thái NHAP_LIEU, không ai dùng). Không
ảnh hưởng tồn kho hay sổ cái (mo_phien_kiem_ke không ghi kho_movement).

**Đề xuất khi có plan chạm lại `38_kiem_ke_dem_test.sql`:** đổi
`(public.mo_phien_kiem_ke(...)).* ` → `select * from public.mo_phien_kiem_ke(...)`
và tương tự cho `luu_dong_kiem_ke`, theo đúng pattern đã áp dụng ở
`39_kiem_ke_duyet_test.sql`.

**Không phải bug của migration `0065`/`0066`** — đây thuần túy là cách VIẾT SQL
TRONG TEST, không phải hành vi sai của RPC.
