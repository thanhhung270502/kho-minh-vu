import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/** Giá trị truyền thẳng cho RPC `lich_su_sua` — là tên bảng trong database. */
export type AuditedTable = "san_pham" | "doi_tac" | "nguoi_dung";

export type AuditLogEntry = {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  editedAt: string;
  editorId: string | null;
  editorName: string | null;
};

type AuditLogRpcRow =
  Database["public"]["Functions"]["lich_su_sua"]["Returns"][number];

function toAuditLogEntry(row: AuditLogRpcRow): AuditLogEntry {
  return {
    id: row.id,
    field: row.truong,
    oldValue: row.gia_tri_cu,
    newValue: row.gia_tri_moi,
    source: row.nguon,
    editedAt: row.sua_luc,
    editorId: row.nguoi_sua_id,
    editorName: row.ho_ten_nguoi_sua,
  };
}

export const auditLogKey = (table: AuditedTable, id: string) =>
  ["audit-log", table, id] as const;

/** Bảng nhat_ky_sua không cấp quyền đọc cho client — chỉ đi qua RPC có kiểm vai trò. */
export async function fetchAuditLog(
  table: AuditedTable,
  recordId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("lich_su_sua", {
    p_bang: table,
    p_ban_ghi_id: recordId,
  });
  if (error) throw error;
  return (data ?? []).map(toAuditLogEntry);
}
