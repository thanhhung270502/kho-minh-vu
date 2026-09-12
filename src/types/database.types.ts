/**
 * File này ĐƯỢC SINH TỰ ĐỘNG từ schema Supabase — không sửa tay.
 *
 * Sinh lại sau mỗi lần đổi schema:
 *   npm run db:types
 *
 * Hiện tại là shape rỗng hợp lệ vì database chưa có bảng nào.
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
