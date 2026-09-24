import type { Database } from "@/types/database.types";

type HistoryRpcArgs =
  Database["public"]["Functions"]["tra_cuu_lich_su_kiotviet"]["Args"];

/** Khai một chỗ, không rải chuỗi khắp nơi (CLAUDE.md Bước 4). */
export const kiotVietHistoryKeys = {
  all: ["kiotviet-history"] as const,
  list: (args: HistoryRpcArgs) => ["kiotviet-history", "list", args] as const,
  voucher: (type: "NHAP" | "XUAT", voucherNo: string) =>
    ["kiotviet-history", "voucher", type, voucherNo] as const,
};
