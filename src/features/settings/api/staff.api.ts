import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

import type { StaffFormValues } from "../schemas/staff.schema";

type StaffRowDb = Database["public"]["Tables"]["nhan_vien_phu_trach"]["Row"];
type StaffWrite = Database["public"]["Tables"]["nhan_vien_phu_trach"]["Insert"];

export type StaffRow = {
  id: string;
  shortName: string;
  fullName: string;
  isActive: boolean;
};

export const staffKeys = {
  all: ["staff"] as const,
};

function toStaffRow(row: StaffRowDb): StaffRow {
  return {
    id: row.id,
    shortName: row.ten_viet_tat,
    fullName: row.ten_day_du,
    isActive: row.dang_dung,
  };
}

function toStaffWrite(values: StaffFormValues): StaffWrite {
  return {
    ten_viet_tat: values.shortName,
    ten_day_du: values.fullName,
    dang_dung: values.isActive,
  };
}

/** Cả nhân viên đã ngừng — màn Cài đặt phải bật lại được. */
export async function fetchStaff(): Promise<StaffRow[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("nhan_vien_phu_trach")
    .select("id, ten_viet_tat, ten_day_du, dang_dung, created_at, updated_at")
    .order("dang_dung", { ascending: false })
    .order("ten_day_du");
  if (error) throw error;
  return (data ?? []).map(toStaffRow);
}

export async function saveStaff(id: string | null, values: StaffFormValues): Promise<void> {
  const client = getSupabaseBrowserClient().from("nhan_vien_phu_trach");
  const { error } = id
    ? await client.update(toStaffWrite(values)).eq("id", id)
    : await client.insert(toStaffWrite(values));
  if (error) throw error;
}
