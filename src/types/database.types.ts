/**
 * File này ĐƯỢC SINH TỰ ĐỘNG từ schema Supabase — không sửa tay.
 *
 * Sinh lại sau mỗi lần đổi schema:
 *   npm run db:types          (cloud — cần SUPABASE_PROJECT_ID trong .env.local)
 *   npm run db:types:local    (local — cần `supabase start` đang chạy)
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ FILE NÀY ĐANG LÀ STUB RỖNG — CHƯA PHẢN ÁNH SCHEMA THẬT.                   │
 * │                                                                           │
 * │ 19 migration trong supabase/migrations/ đã định nghĩa 16 bảng, 5 enum,    │
 * │ 1 view và 6 RPC, nhưng chưa từng được áp lên database nào nên chưa sinh   │
 * │ được kiểu.                                                                │
 * │                                                                           │
 * │ Chạy `npm run db:push` rồi `npm run db:types` để lấp file này.            │
 * │ Xem supabase/README.md phần "Thiết lập lần đầu".                          │
 * │                                                                           │
 * │ Phase 2 KHÔNG bắt đầu được cho tới khi file này có nội dung thật.         │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
