"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/shared/lib/text";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

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
  /** Quản lý/Admin — luôn đủ quyền, và là người duy nhất đụng được tài khoản Admin. */
  isAdmin: boolean;
  /** Tạo / sửa hồ sơ, khóa, đặt lại mật khẩu (quyền Tạo tài khoản). */
  canProfile: boolean;
  /** Tích quyền cho tài khoản nhân viên (quyền Phân quyền). */
  canAssign: boolean;
};

/**
 * Mọi hành động quản trị đều tự kiểm người gọi bằng `getUser()` + bảng (vai_tro,
 * quyen_cua_toi) — KHÔNG tin dữ liệu client gửi lên và cũng không tin claim trong
 * JWT (claim có thể cũ hơn bảng — xem D-05). RPC ở database kiểm lại lần nữa (0117).
 */
async function getAdminSession(): Promise<AdminSession | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục." };

  const [profile, grants] = await Promise.all([
    supabase.from("nguoi_dung").select("vai_tro, dang_hoat_dong").eq("id", user.id).maybeSingle(),
    supabase.rpc("quyen_cua_toi"),
  ]);

  if (profile.error) return { error: explainError(profile.error).action };
  if (grants.error) return { error: explainError(grants.error).action };
  if (!profile.data?.dang_hoat_dong) return { error: "Tài khoản đã bị vô hiệu hóa." };

  const isAdmin = profile.data.vai_tro === "quan_ly";
  const granted = grants.data ?? [];
  const canProfile = isAdmin || granted.includes("tao_tai_khoan");
  const canAssign = isAdmin || granted.includes("phan_quyen");
  if (!canProfile && !canAssign) {
    return { error: "Tài khoản chưa có quyền Tạo tài khoản hoặc Phân quyền." };
  }

  return { supabase, userId: user.id, isAdmin, canProfile, canAssign };
}

const NOT_ADMIN_TARGET = "Chỉ Quản lý/Admin được sửa tài khoản Quản lý/Admin.";
const NEED_PROFILE = "Tài khoản chưa có quyền Tạo tài khoản.";

/** Ghi trọn bộ quyền theo người (dat_quyen_nguoi_dung, 0117). Admin không cần ghi. */
async function savePermissions(session: AdminSession, id: string, permissions: string[]) {
  const { error } = await session.supabase.rpc("dat_quyen_nguoi_dung", { p_id: id, p_quyen: permissions });
  if (error) throw error;
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
    .select(
      "id, ho_ten, ten_dang_nhap, vai_tro, chuc_vu_id, dang_hoat_dong, phai_doi_mat_khau, duyet_kiem_ke",
    )
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

/** Phạm vi của loại tài khoản đọc từ DB — không tin `role` client gửi lên. */
async function scopeOfJobTitle({ supabase }: AdminSession, jobTitleId: string) {
  const { data, error } = await supabase.from("chuc_vu").select("pham_vi").eq("id", jobTitleId).maybeSingle();
  if (error) throw error;
  return data?.pham_vi ?? null;
}

/**
 * luu_nguoi_dung soạn sẵn câu tiếng Việt cho ca nghiệp vụ 23514 ("Thủ kho
 * phải được gán ít nhất một kho") — hiện nguyên văn. explainError() dịch 23514
 * thành câu chung về mã hàng/số lượng, sai ngữ cảnh ở màn tài khoản.
 */
function describeProfileError(error: unknown): string {
  if (isPostgrestError(error) && error.code === "23514") return error.message;
  return explainError(error).action;
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
  if (!session.canProfile) return { ok: false, message: NEED_PROFILE };

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const values = parsed.data;

  const scope = await scopeOfJobTitle(session, values.jobTitleId);
  if (!scope) return { ok: false, field: "jobTitleId", message: "Chọn lại loại tài khoản." };
  if (scope === "quan_ly" && !session.isAdmin) {
    return { ok: false, field: "jobTitleId", message: "Chỉ Quản lý/Admin được tạo tài khoản Quản lý/Admin." };
  }

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

  const { error: profileError } = await session.supabase.rpc("luu_nguoi_dung", {
    p_id: created.user.id,
    p_ho_ten: values.fullName,
    p_ten_dang_nhap: values.username,
    p_chuc_vu_id: values.jobTitleId,
    p_kho_ids: values.warehouseIds,
    p_phai_doi_mat_khau: true,
    p_duyet_kiem_ke: values.approveStocktake,
  });

  if (profileError) {
    // Hồ sơ hỏng thì tài khoản Auth vừa tạo thành rác: xóa để lần sau tạo lại được.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: describeProfileError(profileError) };
  }

  // Không có quyền Phân quyền thì tài khoản mới bắt đầu không có quyền nào.
  if (scope !== "quan_ly" && session.canAssign) {
    try {
      await savePermissions(session, created.user.id, values.permissions);
    } catch (error) {
      revalidatePath("/cai-dat/nguoi-dung");
      return { ok: false, message: `Đã tạo tài khoản nhưng chưa lưu được quyền: ${explainError(error).action}` };
    }
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
  if (previous.vai_tro === "quan_ly" && !session.isAdmin) return { ok: false, message: NOT_ADMIN_TARGET };

  // Chỉ có quyền Phân quyền: giữ nguyên hồ sơ, chỉ ghi quyền.
  if (!session.canProfile) {
    try {
      await savePermissions(session, values.id, values.permissions);
    } catch (error) {
      return { ok: false, message: explainError(error).action };
    }
    revalidatePath("/cai-dat/nguoi-dung");
    return { ok: true };
  }

  const nextScope = await scopeOfJobTitle(session, values.jobTitleId);
  if (!nextScope) return { ok: false, field: "jobTitleId", message: "Chọn lại loại tài khoản." };
  if (nextScope === "quan_ly" && !session.isAdmin) {
    return { ok: false, field: "jobTitleId", message: "Chỉ Quản lý/Admin được cấp loại Quản lý/Admin." };
  }

  const losingManagerRole = previous.vai_tro === "quan_ly" && nextScope !== "quan_ly";
  if (losingManagerRole && !(await hasOtherManager(session, values.id))) {
    return {
      ok: false,
      field: "jobTitleId",
      message: "Phải còn ít nhất một Quản lý/Admin đang hoạt động.",
    };
  }

  const { error } = await session.supabase.rpc("luu_nguoi_dung", {
    p_id: values.id,
    p_ho_ten: values.fullName,
    // "" = chưa đặt tên đăng nhập (tài khoản từ seed) — RPC ghi thành NULL (0072).
    p_ten_dang_nhap: previous.ten_dang_nhap ?? "",
    p_chuc_vu_id: values.jobTitleId,
    p_kho_ids: values.warehouseIds,
    p_phai_doi_mat_khau: previous.phai_doi_mat_khau,
    p_duyet_kiem_ke: values.approveStocktake,
  });

  if (error) return { ok: false, message: describeProfileError(error) };

  if (nextScope !== "quan_ly" && session.canAssign) {
    try {
      await savePermissions(session, values.id, values.permissions);
    } catch (permissionError) {
      return { ok: false, message: `Đã lưu hồ sơ nhưng chưa lưu được quyền: ${explainError(permissionError).action}` };
    }
  }

  const warehousesChanged =
    previous.warehouseIds.length !== values.warehouseIds.length ||
    previous.warehouseIds.some((k) => !values.warehouseIds.includes(k));

  // Chỉ đổi quyền thì có hiệu lực ngay (co_quyen đọc bảng), không cần thu
  // hồi phiên. Đổi phạm vi / kho thì claim JWT cũ lệch bảng: thu hồi để ép làm mới.
  if (previous.vai_tro !== nextScope || warehousesChanged) await revokeSessions(values.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}

export async function setUserActive(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await getAdminSession();
  if ("error" in session) return { ok: false, message: session.error };

  if (!session.canProfile) return { ok: false, message: NEED_PROFILE };

  const previous = await readProfile(session, input.id);
  if (!previous) return { ok: false, message: "Không tìm thấy tài khoản này." };
  if (previous.vai_tro === "quan_ly" && !session.isAdmin) return { ok: false, message: NOT_ADMIN_TARGET };

  if (!input.isActive && previous.vai_tro === "quan_ly" && !(await hasOtherManager(session, input.id))) {
    return { ok: false, message: "Phải còn ít nhất một Quản lý/Admin đang hoạt động." };
  }

  // Người có quyền Tạo tài khoản (không phải Admin) không qua được RLS ghi nguoi_dung
  // — quyền đã kiểm ở trên nên ghi bằng service role.
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("nguoi_dung")
    .update({ dang_hoat_dong: input.isActive })
    .eq("id", input.id);

  if (error) return { ok: false, message: explainError(error).action };

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

  if (!session.canProfile) return { ok: false, message: NEED_PROFILE };

  const previous = await readProfile(session, values.id);
  if (!previous) return { ok: false, message: "Không tìm thấy tài khoản này." };
  if (previous.vai_tro === "quan_ly" && !session.isAdmin) return { ok: false, message: NOT_ADMIN_TARGET };

  const admin = createSupabaseAdminClient();
  const { error: passwordError } = await admin.auth.admin.updateUserById(values.id, {
    password: values.tempPassword,
  });
  if (passwordError) return { ok: false, field: "tempPassword", message: explainError(passwordError).action };

  // Mật khẩu tạm chỉ dùng một lần: bật lại cờ để người dùng phải tự đặt mật khẩu riêng.
  // Truyền lại giá trị CŨ của công tắc duyệt kiểm kê (không để null — RPC coi null
  // là "giữ nguyên", nhưng ghi rõ ý định ở đây rõ ràng hơn là dựa vào hành vi ngầm).
  // Cờ xem lịch sử KiotViet không truyền: màn đó đã gỡ (Phase 10), RPC giữ nguyên.
  const { error } = await session.supabase.rpc("luu_nguoi_dung", {
    p_id: values.id,
    p_ho_ten: previous.ho_ten,
    p_ten_dang_nhap: previous.ten_dang_nhap ?? "",
    p_chuc_vu_id: previous.chuc_vu_id,
    p_kho_ids: previous.warehouseIds,
    p_phai_doi_mat_khau: true,
    p_duyet_kiem_ke: previous.duyet_kiem_ke,
  });
  if (error) return { ok: false, message: describeProfileError(error) };

  await revokeSessions(values.id);

  revalidatePath("/cai-dat/nguoi-dung");
  return { ok: true };
}
