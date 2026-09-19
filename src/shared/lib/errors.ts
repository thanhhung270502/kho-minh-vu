import { AuthError } from "@supabase/supabase-js";

/**
 * Hình dạng lỗi PostgREST trả về.
 *
 * KHÔNG dùng `instanceof PostgrestError`: supabase-js chỉ dựng instance của lớp
 * đó khi truy vấn gọi `.throwOnError()`. Dự án dùng `const { error } = await …;
 * if (error) throw error`, nên thứ ném ra là OBJECT THƯỜNG parse từ JSON —
 * `instanceof` luôn false và mọi lỗi nghiệp vụ rơi xuống câu chung chung.
 * (Phát hiện khi UAT Phase 2: "mã trùng" hiện "Không tải được dữ liệu".)
 */
export type PostgrestErrorShape = {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export function isPostgrestError(error: unknown): error is PostgrestErrorShape {
  if (!error || typeof error !== "object") return false;

  const object = error as Record<string, unknown>;
  return typeof object.code === "string" && typeof object.message === "string";
}

/** Mã lỗi để so sánh trực tiếp trong component: `errorCode(e) === "23505"`. */
export function errorCode(error: unknown): string | null {
  return isPostgrestError(error) ? error.code : null;
}

export type ErrorKind =
  /** Hết phiên đăng nhập — phải đăng nhập lại (tương đương HTTP 401). */
  | "session-expired"
  /** Đã đăng nhập nhưng không đủ quyền — RLS chặn (tương đương HTTP 403). */
  | "forbidden"
  /** Bản ghi được yêu cầu không tồn tại (hoặc bị RLS che khỏi tầm nhìn). */
  | "not-found"
  /** Dữ liệu gửi lên vi phạm ràng buộc (trùng mã, sai khoá ngoại...). */
  | "invalid-data"
  /** Không gọi được tới máy chủ. */
  | "offline"
  | "unknown";

export type ExplainedError = {
  kind: ErrorKind;
  title: string;
  /** Nói rõ chuyện gì xảy ra VÀ làm gì tiếp theo. */
  action: string;
  /** Mã gốc để đối chiếu log khi cần — không bắt người dùng đọc. */
  code?: string;
};

/** Mã lỗi Postgres / PostgREST gặp thường xuyên. */
const SESSION_EXPIRED_CODES = new Set(["PGRST301", "PGRST302"]);
const FORBIDDEN_CODE = "42501";
/** .single() nhưng truy vấn trả về 0 dòng (hoặc nhiều hơn 1 dòng). */
const NOT_FOUND_CODE = "PGRST116";
const DUPLICATE_CODE = "23505";
const FOREIGN_KEY_CODE = "23503";
const CHECK_VIOLATION_CODE = "23514";

/**
 * Chuyển lỗi kỹ thuật thành thông báo người dùng đọc được.
 *
 * Cấm trả về "Có lỗi xảy ra": người vận hành tại kho phải biết nên bấm
 * thử lại, gọi quản trị, hay sửa lại số liệu vừa nhập.
 */
export function explainError(error: unknown): ExplainedError {
  if (error instanceof AuthError) {
    if (error.code === "invalid_credentials") {
      return {
        kind: "invalid-data",
        title: "Sai tên đăng nhập hoặc mật khẩu",
        action: "Kiểm tra lại, chú ý bộ gõ tiếng Việt và phím Caps Lock.",
        code: error.code,
      };
    }

    if (error.code === "user_banned") {
      return {
        kind: "forbidden",
        title: "Tài khoản đã bị vô hiệu hóa",
        action: "Liên hệ quản lý để mở lại tài khoản.",
        code: error.code,
      };
    }

    if (error.code === "weak_password") {
      return {
        kind: "invalid-data",
        title: "Mật khẩu quá yếu",
        action: "Dùng ít nhất 8 ký tự, có cả chữ và số.",
        code: error.code,
      };
    }

    return {
      kind: "session-expired",
      title: "Phiên đăng nhập đã hết hạn",
      action: "Đăng nhập lại để tiếp tục công việc đang làm dở.",
      code: error.code ?? error.name,
    };
  }

  if (isPostgrestError(error)) {
    if (SESSION_EXPIRED_CODES.has(error.code)) {
      return {
        kind: "session-expired",
        title: "Phiên đăng nhập đã hết hạn",
        action: "Đăng nhập lại để tiếp tục công việc đang làm dở.",
        code: error.code,
      };
    }

    if (error.code === FORBIDDEN_CODE) {
      return {
        kind: "forbidden",
        title: "Tài khoản không có quyền với dữ liệu này",
        action:
          "Tài khoản của bạn chỉ thao tác được trên kho được phân công. Liên hệ quản trị hệ thống nếu cần mở thêm quyền.",
        code: error.code,
      };
    }

    if (error.code === NOT_FOUND_CODE) {
      return {
        kind: "not-found",
        title: "Không tìm thấy bản ghi",
        action:
          "Bản ghi có thể đã bị xoá, hoặc không thuộc kho bạn được phân quyền. Quay lại danh sách và chọn lại.",
        code: error.code,
      };
    }

    if (error.code === DUPLICATE_CODE) {
      return {
        kind: "invalid-data",
        title: "Dữ liệu đã tồn tại",
        action:
          "Mã bạn vừa nhập đã có trong hệ thống. Kiểm tra lại hoặc dùng mã khác.",
        code: error.code,
      };
    }

    if (error.code === FOREIGN_KEY_CODE || error.code === CHECK_VIOLATION_CODE) {
      return {
        kind: "invalid-data",
        title: "Dữ liệu không hợp lệ",
        action:
          "Một số trường tham chiếu tới bản ghi không tồn tại hoặc vi phạm ràng buộc. Kiểm tra lại mã hàng, kho và số lượng vừa nhập.",
        code: error.code,
      };
    }

    return {
      kind: "unknown",
      title: "Máy chủ từ chối yêu cầu",
      action: `${error.message}. Thử lại, nếu vẫn lỗi hãy báo quản trị kèm mã ${error.code}.`,
      code: error.code,
    };
  }

  // fetch thất bại (mất mạng, Supabase không phản hồi) ném TypeError.
  if (error instanceof TypeError) {
    return {
      kind: "offline",
      title: "Không kết nối được máy chủ",
      action:
        "Kiểm tra kết nối mạng của máy rồi bấm Thử lại. Dữ liệu bạn đang nhập vẫn được giữ nguyên.",
    };
  }

  return {
    kind: "unknown",
    title: "Không tải được dữ liệu",
    action:
      error instanceof Error
        ? `${error.message}. Bấm Thử lại, nếu vẫn lỗi hãy báo quản trị hệ thống.`
        : "Bấm Thử lại, nếu vẫn lỗi hãy báo quản trị hệ thống.",
  };
}
