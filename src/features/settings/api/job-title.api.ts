import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BusinessPermission, Role } from "@/shared/lib/permissions";

import { titleCodeFromName, type JobTitleFormValues } from "../schemas/job-title.schema";

export type JobTitle = {
  id: string;
  code: string;
  name: string;
  scope: Role;
  permissions: BusinessPermission[];
  userCount: number;
  /** Bốn chức vụ mặc định (0082) — đổi tên/quyền được, không xóa được. */
  isSystem: boolean;
};

const SYSTEM_CODES = ["QUAN_LY", "NHAN_VIEN", "THU_KHO", "CHI_XEM"];

export const jobTitleKeys = {
  all: ["job-titles"] as const,
};

/** Lớp api là chỗ DUY NHẤT chạm tên bảng/cột tiếng Việt của chức vụ. */
export async function fetchJobTitles(): Promise<JobTitle[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("chuc_vu")
    .select("id, ma, ten, pham_vi, chuc_vu_quyen(quyen), nguoi_dung(count)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.ma,
    name: row.ten,
    scope: row.pham_vi,
    // Cột quyen là text có CHECK 9 giá trị (0082) — kiểu sinh ra chỉ biết `string`.
    permissions: row.chuc_vu_quyen.map((q) => q.quyen as BusinessPermission),
    userCount: row.nguoi_dung[0]?.count ?? 0,
    isSystem: SYSTEM_CODES.includes(row.ma),
  }));
}

export async function saveJobTitle(id: string | null, values: JobTitleFormValues): Promise<void> {
  const table = getSupabaseBrowserClient().from("chuc_vu");
  const { error } = id
    ? await table.update({ ten: values.name.trim(), pham_vi: values.scope }).eq("id", id)
    : await table.insert({ ma: titleCodeFromName(values.name), ten: values.name.trim(), pham_vi: values.scope });
  if (error) throw error;
}

/** Không có policy cho phép thì Postgres xóa 0 dòng, `error` null — đếm để báo đúng. */
export async function deleteJobTitle(id: string): Promise<void> {
  const { error, count } = await getSupabaseBrowserClient()
    .from("chuc_vu")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  if (!count) throw new Error("Không xóa được chức vụ này — chức vụ mặc định không xóa được.");
}

export async function setJobTitlePermission(
  jobTitleId: string,
  permission: BusinessPermission,
  enabled: boolean,
): Promise<void> {
  const table = getSupabaseBrowserClient().from("chuc_vu_quyen");
  const { error } = enabled
    ? await table.upsert({ chuc_vu_id: jobTitleId, quyen: permission }, { ignoreDuplicates: true })
    : await table.delete().eq("chuc_vu_id", jobTitleId).eq("quyen", permission);
  if (error) throw error;
}
