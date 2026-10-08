import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TestProject } from "vitest/node";

import type { Database } from "@/types/database.types";

import { assertLocalSupabaseUrl } from "./local-guard";

// Cấu hình đọc từ `supabase status` hoặc TEST_SUPABASE_*; tuyệt đối không từ .env.local (cloud).

export type TestRole = "quan_ly" | "thu_kho" | "chi_xem";
export type TestAccount = { email: string; password: string };
export type TestAccounts = Record<TestRole, TestAccount> & { k1Id: string };

declare module "vitest" {
  export interface ProvidedContext {
    supabase: { url: string; anonKey: string };
    accounts: TestAccounts;
  }
}

type Admin = SupabaseClient<Database>;

const EMAIL_PREFIX = "itest.";
const TEMP_TITLE_CODE = "ITEST_THU_KHO";

const ACCOUNT_SPEC: Record<
  TestRole,
  {
    local: string;
    titleCode: string;
    scope: Database["public"]["Enums"]["vai_tro"];
    warehouseCodes: string[];
    permissions: string[];
  }
> = {
  quan_ly: {
    local: "quanly",
    titleCode: "QUAN_LY",
    scope: "quan_ly",
    warehouseCodes: [],
    permissions: [],
  },
  thu_kho: {
    local: "thukho",
    titleCode: "THU_KHO",
    scope: "thu_kho",
    warehouseCodes: ["K1"],
    permissions: ["nhap_kho"],
  },
  chi_xem: {
    local: "chixem",
    titleCode: "CHI_XEM",
    scope: "chi_xem",
    warehouseCodes: [],
    permissions: [],
  },
};

function readLocalConfig(): {
  url: string;
  anonKey: string;
  serviceKey: string;
} {
  const fromEnv = {
    url: process.env.TEST_SUPABASE_URL,
    anonKey: process.env.TEST_SUPABASE_ANON_KEY,
    serviceKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
  };
  if (fromEnv.url && fromEnv.anonKey && fromEnv.serviceKey) {
    return {
      url: fromEnv.url,
      anonKey: fromEnv.anonKey,
      serviceKey: fromEnv.serviceKey,
    };
  }

  let output: string;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Không đọc được `supabase status`. Chạy `npm run db:start` trước khi chạy integration test.",
    );
  }

  const values = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match?.[1]) values.set(match[1], match[2] ?? "");
  }

  const url = fromEnv.url ?? values.get("API_URL");
  const anonKey =
    fromEnv.anonKey ?? values.get("ANON_KEY") ?? values.get("PUBLISHABLE_KEY");
  const serviceKey =
    fromEnv.serviceKey ??
    values.get("SERVICE_ROLE_KEY") ??
    values.get("SECRET_KEY");
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "`supabase status` thiếu API_URL / ANON_KEY / SERVICE_ROLE_KEY. Chạy `npm run db:start` trước.",
    );
  }
  return { url, anonKey, serviceKey };
}

async function findUsers(admin: Admin): Promise<Map<string, string>> {
  const users = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email?.startsWith(EMAIL_PREFIX)) users.set(user.email, user.id);
    }
    if (data.users.length < 200) return users;
  }
}

/**
 * Xóa tài khoản; nếu đã ký chứng từ thì khóa ngoại (chung_tu.nguoi_tao_id, nhat_ky_sua...) giữ lại —
 * sổ cái append-only nên không xóa được chứng từ để gỡ khóa ngoại. Khi đó khóa tài khoản
 * (ban + ngừng hoạt động) và lần chạy sau dùng lại, mật khẩu được đặt mới.
 */
async function removeUser(
  admin: Admin,
  id: string,
): Promise<"deleted" | "deactivated"> {
  // nguoi_dung / nguoi_dung_kho xóa theo cascade từ auth.users; nguoi_dung_quyen không có khóa ngoại.
  const { error: permissionError } = await admin
    .from("nguoi_dung_quyen")
    .delete()
    .eq("nguoi_dung_id", id);
  if (permissionError) throw permissionError;

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (!deleteError) return "deleted";

  const { error: profileError } = await admin
    .from("nguoi_dung")
    .update({ dang_hoat_dong: false })
    .eq("id", id);
  if (profileError) throw profileError;
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: "876000h",
  });
  if (banError) throw banError;
  return "deactivated";
}

async function removeUsers(admin: Admin, ids: string[]): Promise<void> {
  const errors: unknown[] = [];
  for (const id of ids) {
    try {
      await removeUser(admin, id);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `Không dọn hết tài khoản itest.* (${errors.length} lỗi).`,
    );
  }
}

async function deleteTempTitle(admin: Admin): Promise<void> {
  const { error } = await admin
    .from("chuc_vu")
    .delete()
    .eq("ma", TEMP_TITLE_CODE);
  if (error) throw error;
}

export default async function setup(project: TestProject) {
  const { url, anonKey, serviceKey } = readLocalConfig();
  assertLocalSupabaseUrl(url);

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Lần chạy trước chết ngang có thể để sót tài khoản và chức vụ tạm.
  await removeUsers(admin, [...(await findUsers(admin)).values()]);
  const retained = await findUsers(admin);
  await deleteTempTitle(admin).catch(() => undefined);

  const accountIds: string[] = [];
  let createdTempTitle = false;
  const accounts = {} as Record<TestRole, TestAccount>;
  let k1Id = "";

  try {
    const [
      { data: titles, error: titleError },
      { data: warehouses, error: warehouseError },
    ] = await Promise.all([
      admin.from("chuc_vu").select("id, ma, pham_vi"),
      admin.from("kho").select("id, ma"),
    ]);
    if (titleError) throw titleError;
    if (warehouseError) throw warehouseError;

    const foundK1 = warehouses?.find((w) => w.ma === "K1")?.id;
    if (!foundK1)
      throw new Error(
        "Không có kho K1 — DB local thiếu dữ liệu nền, chạy `npm run db:reset`.",
      );
    k1Id = foundK1;

    for (const role of Object.keys(ACCOUNT_SPEC) as TestRole[]) {
      const spec = ACCOUNT_SPEC[role];
      let titleId = titles?.find((t) => t.ma === spec.titleCode)?.id;
      if (!titleId) {
        // DB local có thể đã bị xóa chức vụ mẫu bằng tay; CI (db reset) thì luôn có.
        const { data, error } = await admin
          .from("chuc_vu")
          .insert({
            ma: TEMP_TITLE_CODE,
            ten: "ITEST Thủ kho",
            pham_vi: spec.scope,
          })
          .select("id")
          .single();
        if (error) throw error;
        titleId = data.id;
        createdTempTitle = true;
      }

      const email = `${EMAIL_PREFIX}${spec.local}@khominhvu.local`;
      const password = randomBytes(12).toString("base64url");
      const retainedId = retained.get(email);
      let userId: string;
      if (retainedId) {
        const { error } = await admin.auth.admin.updateUserById(retainedId, {
          password,
          ban_duration: "none",
        });
        if (error)
          throw new Error(`Không dùng lại được ${email}: ${error.message}`);
        userId = retainedId;
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw new Error(`Không tạo được ${email}: ${error.message}`);
        userId = created.user.id;
      }
      accountIds.push(userId);
      accounts[role] = { email, password };

      const { error: profileError } = await admin.from("nguoi_dung").upsert(
        {
          id: userId,
          ho_ten: `ITEST ${spec.local}`,
          chuc_vu_id: titleId,
          ten_dang_nhap: `${EMAIL_PREFIX}${spec.local}`,
          dang_hoat_dong: true,
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;
      for (const table of ["nguoi_dung_kho", "nguoi_dung_quyen"] as const) {
        const { error } = await admin
          .from(table)
          .delete()
          .eq("nguoi_dung_id", userId);
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
          .insert(
            warehouseIds.map((khoId) => ({
              nguoi_dung_id: userId,
              kho_id: khoId,
            })),
          );
        if (error) throw error;
      }
      if (spec.permissions.length > 0) {
        const { error } = await admin
          .from("nguoi_dung_quyen")
          .insert(
            spec.permissions.map((quyen) => ({ nguoi_dung_id: userId, quyen })),
          );
        if (error) throw error;
      }
    }
  } catch (error) {
    await removeUsers(admin, accountIds);
    if (createdTempTitle) await deleteTempTitle(admin);
    throw error;
  }

  project.provide("supabase", { url, anonKey });
  project.provide("accounts", { ...accounts, k1Id });

  // Chạy cả khi test lỗi: Vitest luôn gọi teardown của globalSetup.
  return async function teardown() {
    const errors: unknown[] = [];
    try {
      await removeUsers(admin, accountIds);
    } catch (error) {
      errors.push(error);
    }
    if (createdTempTitle) {
      try {
        await deleteTempTitle(admin);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0)
      throw new AggregateError(errors, "Teardown integration test lỗi.");
  };
}
