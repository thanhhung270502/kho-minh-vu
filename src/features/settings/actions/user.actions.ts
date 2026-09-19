"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/shared/lib/text";
import { explainError } from "@/shared/lib/errors";

import {
  updateUserSchema,
  resetPasswordSchema,
  createUserSchema,
  type UpdateUserInput,
  type ResetPasswordInput,
  type CreateUserInput,
} from "../schemas/user.schema";

/** Kết quả trả về giao diện: lỗi gắn được vào đúng ô nhập nhờ `field`. */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; field?: string };

/** Ban vô thời hạn (100 năm) — Supabase Auth không nhận giá trị "vĩnh viễn". */
const INDEFINITE_BAN = "876000h";

type AdminSession = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

/**
 * Mọi hành động quản trị đều tự kiểm người gọi bằng `getUser()` + bảng `nguoi_dung`,
 * KHÔNG tin dữ liệu client gửi lên và cũng không tin claim trong JWT (claim có thể
 * cũ hơn bảng — xem D-05).
 */
async function getAdminSession(): Promise<AdminSession | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };

  const { data, error } = await supabase
    .from("nguoi_dung")
    .select("vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { error: explainError(error).action };
  if (!data?.dang_hoat_dong || data.vai_tro !== "quan_ly") {
    return { error: "Chỉ quản lý được quản trị tài khoản." };
  }

  return { supabase, userId: user.id };
}

/** Giữ ít nhất một quản lý đang hoạt động, nếu không sẽ không ai vào được Cài đặt nữa. */
async function hasOtherManager(
  { supabase }: AdminSession,
  exceptId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("nguoi_dung")
    .select("id", { count: "exact", head: true })
    .eq("vai_tro", "quan_ly")
    .eq("dang_hoat_dong", true)
    .neq("id", exceptId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

async function readProfile(session: AdminSession, id: string) {
  const { data, error } = await session.supabase
    .from("nguoi_dung")
    .select("id, ho_ten, ten_dang_nhap, vai_tro, dang_hoat_dong, phai_doi_mat_khau")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: warehouses, error: warehouseError } = await session.supabase
    .from("nguoi_dung_kho")
    .select("kho_id")
    .eq("nguoi_dung_id", id);

  if (warehouseError) throw warehouseError;

  return { ...data, warehouseIds: (warehouses ?? []).map((k) => k.kho_id) };
}

function firstIssue(issues: { path: PropertyKey[]; message: string }[]): ActionResult {
  const first = issues[0];
  return {
    ok: false,
    message: first?.message ?? "Dữ liệu không hợp lệ",
    field: first?.path?.[0] ? String(first.path[0]) : undefined,
  };
}

/** Thu hồi phiên: chặn LÀM MỚI token. Token đang cầm hết hạn theo TTL (xem D-05). */
async function revokeSessions(userId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("thu_hoi_phien_nguoi_dung", {
    p_nguoi_dung_id: userId,
  });
  if (error) throw error;
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  const session = await getAdminSession();
  if ("error" in session) return { ok: false, message: session.error };

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const values = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToEmail(values.username),
    password: values.tempPassword,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    const trung =
      createError?.code === "email_exists" || createError?.message?.includes("already been registered");
    return {
      ok: false,
      field: trung ? "username" : undefined,
      message: trung
        ? "Tên đăng nhập này đã có người dùng. Chọn tên khác."
        : (createError ? explainError(createError).action : "Không tạo được tài khoản."),
    };
  }

  const { error: profileError } = await session.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: created.user.id,
    p_ho_ten: values.fullName,
    p_ten_dang_nhap: values.username,
    p_vai_tro: values.role,
    p_kho_ids: values.warehouseIds,
    p_phai_doi_mat_khau: true,
  });

  if (profileError) {
    // Hồ sơ hỏng thì tài khoản Auth vừa tạo thành rác: xóa để lần sau tạo lại được.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: explainError(profileError).action };
  }

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function updateUser(
  input: UpdateUserInput,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if ("error" in session) return { ok: false, message: session.error };

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const values = parsed.data;

  const previous = await readProfile(session, values.id);
  if (!previous) return { ok: false, message: "Không tìm thấy tài khoản này." };

  const losingManagerRole = previous.vai_tro === "quan_ly" && values.role !== "quan_ly";
  if (losingManagerRole && !(await hasOtherManager(session, values.id))) {
    return {
      ok: false,
      field: "role",
      message: "Phải còn ít nhất một quản lý đang hoạt động.",
    };
  }

  const { error } = await session.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: values.id,
    p_ho_ten: values.fullName,
    p_ten_dang_nhap: previous.ten_dang_nhap ?? "",
    p_vai_tro: values.role,
    p_kho_ids: values.warehouseIds,
    p_phai_doi_mat_khau: previous.phai_doi_mat_khau,
  });

  if (error) return { ok: false, message: explainError(error).action };

  const warehousesChanged =
    previous.warehouseIds.length !== values.warehouseIds.length ||
    previous.warehouseIds.some((k) => !values.warehouseIds.includes(k));

  if (previous.vai_tro !== values.role || warehousesChanged) await revokeSessions(values.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function setUserActive(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await getAdminSession();
  if ("error" in session) return { ok: false, message: session.error };

  const previous = await readProfile(session, input.id);
  if (!previous) return { ok: false, message: "Không tìm thấy tài khoản này." };

  if (!input.isActive && previous.vai_tro === "quan_ly" && !(await hasOtherManager(session, input.id))) {
    return { ok: false, message: "Phải còn ít nhất một quản lý đang hoạt động." };
  }

  const { error } = await session.supabase
    .from("nguoi_dung")
    .update({ dang_hoat_dong: input.isActive })
    .eq("id", input.id);

  if (error) return { ok: false, message: explainError(error).action };

  const admin = createSupabaseAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(input.id, {
    ban_duration: input.isActive ? "none" : INDEFINITE_BAN,
  });
  if (banError) return { ok: false, message: explainError(banError).action };

  if (!input.isActive) await revokeSessions(input.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if ("error" in session) return { ok: false, message: session.error };

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const values = parsed.data;

  const previous = await readProfile(session, values.id);
  if (!previous) return { ok: false, message: "Không tìm thấy tài khoản này." };

  const admin = createSupabaseAdminClient();
  const { error: passwordError } = await admin.auth.admin.updateUserById(values.id, {
    password: values.tempPassword,
  });
  if (passwordError) return { ok: false, field: "tempPassword", message: explainError(passwordError).action };

  // Mật khẩu tạm chỉ dùng một lần: bật lại cờ để người dùng phải tự đặt mật khẩu riêng.
  const { error } = await session.supabase.rpc("luu_ho_so_nguoi_dung", {
    p_id: values.id,
    p_ho_ten: previous.ho_ten,
    p_ten_dang_nhap: previous.ten_dang_nhap ?? "",
    p_vai_tro: previous.vai_tro,
    p_kho_ids: previous.warehouseIds,
    p_phai_doi_mat_khau: true,
  });
  if (error) return { ok: false, message: explainError(error).action };

  await revokeSessions(values.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}
