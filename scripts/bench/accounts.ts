import { randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import type { BenchRole } from "./stats";

type Admin = SupabaseClient<Database>;
export type BenchAccounts = Record<BenchRole, { email: string; password: string }>;

// Tài khoản riêng cho bench, không động tới quanly@ / thukho1@ của người dùng.
// Không xóa sau khi đo: có thể đã là nguoi_tao_id của phiếu nháp đo, khóa ngoại sẽ giữ lại.
const SPEC: Record<
  BenchRole,
  {
    email: string;
    username: string;
    fullName: string;
    titleCode: string;
    warehouseCodes: string[];
    permissions: string[];
  }
> = {
  quan_ly: {
    email: "bench.quanly@khominhvu.local",
    username: "bench.quanly",
    fullName: "BENCH quanly",
    titleCode: "QUAN_LY",
    warehouseCodes: [],
    permissions: [],
  },
  thu_kho: {
    email: "bench.thukho@khominhvu.local",
    username: "bench.thukho",
    fullName: "BENCH thukho",
    titleCode: "THU_KHO",
    warehouseCodes: ["K1"],
    permissions: ["nhap_kho"],
  },
};

async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
}

export async function ensureBenchAccounts(admin: Admin): Promise<BenchAccounts> {
  const [{ data: titles, error: titleError }, { data: warehouses, error: warehouseError }] =
    await Promise.all([admin.from("chuc_vu").select("id, ma"), admin.from("kho").select("id, ma")]);
  if (titleError) throw titleError;
  if (warehouseError) throw warehouseError;

  const accounts = {} as BenchAccounts;
  for (const role of Object.keys(SPEC) as BenchRole[]) {
    const spec = SPEC[role];
    const titleId = titles?.find((t) => t.ma === spec.titleCode)?.id;
    if (!titleId) throw new Error(`DB local thiếu chức vụ ${spec.titleCode}.`);

    const password = randomBytes(18).toString("base64url");
    const existingId = await findUserIdByEmail(admin, spec.email);
    let userId: string;
    if (existingId) {
      const { error } = await admin.auth.admin.updateUserById(existingId, {
        password,
        ban_duration: "none",
      });
      if (error) throw new Error(`Không dùng lại được ${spec.email}: ${error.message}`);
      userId = existingId;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`Không tạo được ${spec.email}: ${error.message}`);
      userId = data.user.id;
    }
    accounts[role] = { email: spec.email, password };

    const { error: profileError } = await admin.from("nguoi_dung").upsert(
      {
        id: userId,
        ho_ten: spec.fullName,
        chuc_vu_id: titleId,
        ten_dang_nhap: spec.username,
        dang_hoat_dong: true,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    for (const table of ["nguoi_dung_kho", "nguoi_dung_quyen"] as const) {
      const { error } = await admin.from(table).delete().eq("nguoi_dung_id", userId);
      if (error) throw error;
    }

    const warehouseIds = spec.warehouseCodes.map((code) => {
      const id = warehouses?.find((w) => w.ma === code)?.id;
      if (!id) throw new Error(`Không có kho ${code}.`);
      return id;
    });
    if (warehouseIds.length > 0) {
      const { error } = await admin
        .from("nguoi_dung_kho")
        .insert(warehouseIds.map((khoId) => ({ nguoi_dung_id: userId, kho_id: khoId })));
      if (error) throw error;
    }
    if (spec.permissions.length > 0) {
      const { error } = await admin
        .from("nguoi_dung_quyen")
        .insert(spec.permissions.map((quyen) => ({ nguoi_dung_id: userId, quyen })));
      if (error) throw error;
    }
  }
  return accounts;
}
