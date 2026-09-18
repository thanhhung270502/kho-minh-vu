/**
 * Logic thật nằm ở `src/shared/lib/tach-dvt-cong-doan.ts` — dùng chung giữa script
 * nạp dữ liệu (Phase 1) và luồng nhập Excel trong ứng dụng (Phase 2, D-22).
 * Hai bản chép rời sẽ lệch nhau theo thời gian, nên file này chỉ re-export.
 */
export * from "../../src/shared/lib/tach-dvt-cong-doan";
