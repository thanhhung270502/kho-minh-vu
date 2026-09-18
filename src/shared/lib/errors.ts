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
export type LoiPostgrest = {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export function laLoiPostgrest(e: unknown): e is LoiPostgrest {
  if (!e || typeof e !== "object") return false;

  const o = e as Record<string, unknown>;
  return typeof o.code === "string" && typeof o.message === "string";
}

/** Mã lỗi để so sánh trực tiếp trong component: `maLoi(e) === "23505"`. */
export function maLoi(e: unknown): string | null {
  return laLoiPostgrest(e) ? e.code : null;
}

export type LoaiLoi =
  /** Hết phiên đăng nhập — phải đăng nhập lại (tương đương HTTP 401). */
  | "het-phien"
  /** Đã đăng nhập nhưng không đủ quyền — RLS chặn (tương đương HTTP 403). */
  | "khong-du-quyen"
  /** Bản ghi được yêu cầu không tồn tại (hoặc bị RLS che khỏi tầm nhìn). */
  | "khong-tim-thay"
  /** Dữ liệu gửi lên vi phạm ràng buộc (trùng mã, sai khoá ngoại...). */
  | "du-lieu-khong-hop-le"
  /** Không gọi được tới máy chủ. */
  | "mat-ket-noi"
  | "khong-xac-dinh";

export type LoiDaDien = {
  loai: LoaiLoi;
  tieuDe: string;
  /** Nói rõ chuyện gì xảy ra VÀ làm gì tiếp theo. */
  huongXuLy: string;
  /** Mã gốc để đối chiếu log khi cần — không bắt người dùng đọc. */
  maGoc?: string;
};

/** Mã lỗi Postgres / PostgREST gặp thường xuyên. */
const MA_HET_PHIEN = new Set(["PGRST301", "PGRST302"]);
const MA_KHONG_DU_QUYEN = "42501";
/** .single() nhưng truy vấn trả về 0 dòng (hoặc nhiều hơn 1 dòng). */
const MA_KHONG_TIM_THAY = "PGRST116";
const MA_TRUNG_DU_LIEU = "23505";
const MA_SAI_KHOA_NGOAI = "23503";
const MA_VI_PHAM_RANG_BUOC = "23514";

/**
 * Chuyển lỗi kỹ thuật thành thông báo người dùng đọc được.
 *
 * Cấm trả về "Có lỗi xảy ra": người vận hành tại kho phải biết nên bấm
 * thử lại, gọi quản trị, hay sửa lại số liệu vừa nhập.
 */
export function dienGiaiLoi(error: unknown): LoiDaDien {
  if (error instanceof AuthError) {
    if (error.code === "invalid_credentials") {
      return {
        loai: "du-lieu-khong-hop-le",
        tieuDe: "Sai tên đăng nhập hoặc mật khẩu",
        huongXuLy:
          "Kiểm tra lại, chú ý bộ gõ tiếng Việt và phím Caps Lock.",
        maGoc: error.code,
      };
    }

    if (error.code === "user_banned") {
      return {
        loai: "khong-du-quyen",
        tieuDe: "Tài khoản đã bị vô hiệu hóa",
        huongXuLy: "Liên hệ quản lý để mở lại tài khoản.",
        maGoc: error.code,
      };
    }

    if (error.code === "weak_password") {
      return {
        loai: "du-lieu-khong-hop-le",
        tieuDe: "Mật khẩu quá yếu",
        huongXuLy: "Dùng ít nhất 8 ký tự, có cả chữ và số.",
        maGoc: error.code,
      };
    }

    return {
      loai: "het-phien",
      tieuDe: "Phiên đăng nhập đã hết hạn",
      huongXuLy: "Đăng nhập lại để tiếp tục công việc đang làm dở.",
      maGoc: error.code ?? error.name,
    };
  }

  if (laLoiPostgrest(error)) {
    if (MA_HET_PHIEN.has(error.code)) {
      return {
        loai: "het-phien",
        tieuDe: "Phiên đăng nhập đã hết hạn",
        huongXuLy: "Đăng nhập lại để tiếp tục công việc đang làm dở.",
        maGoc: error.code,
      };
    }

    if (error.code === MA_KHONG_DU_QUYEN) {
      return {
        loai: "khong-du-quyen",
        tieuDe: "Tài khoản không có quyền với dữ liệu này",
        huongXuLy:
          "Tài khoản của bạn chỉ thao tác được trên kho được phân công. Liên hệ quản trị hệ thống nếu cần mở thêm quyền.",
        maGoc: error.code,
      };
    }

    if (error.code === MA_KHONG_TIM_THAY) {
      return {
        loai: "khong-tim-thay",
        tieuDe: "Không tìm thấy bản ghi",
        huongXuLy:
          "Bản ghi có thể đã bị xoá, hoặc không thuộc kho bạn được phân quyền. Quay lại danh sách và chọn lại.",
        maGoc: error.code,
      };
    }

    if (error.code === MA_TRUNG_DU_LIEU) {
      return {
        loai: "du-lieu-khong-hop-le",
        tieuDe: "Dữ liệu đã tồn tại",
        huongXuLy:
          "Mã bạn vừa nhập đã có trong hệ thống. Kiểm tra lại hoặc dùng mã khác.",
        maGoc: error.code,
      };
    }

    if (
      error.code === MA_SAI_KHOA_NGOAI ||
      error.code === MA_VI_PHAM_RANG_BUOC
    ) {
      return {
        loai: "du-lieu-khong-hop-le",
        tieuDe: "Dữ liệu không hợp lệ",
        huongXuLy:
          "Một số trường tham chiếu tới bản ghi không tồn tại hoặc vi phạm ràng buộc. Kiểm tra lại mã hàng, kho và số lượng vừa nhập.",
        maGoc: error.code,
      };
    }

    return {
      loai: "khong-xac-dinh",
      tieuDe: "Máy chủ từ chối yêu cầu",
      huongXuLy: `${error.message}. Thử lại, nếu vẫn lỗi hãy báo quản trị kèm mã ${error.code}.`,
      maGoc: error.code,
    };
  }

  // fetch thất bại (mất mạng, Supabase không phản hồi) ném TypeError.
  if (error instanceof TypeError) {
    return {
      loai: "mat-ket-noi",
      tieuDe: "Không kết nối được máy chủ",
      huongXuLy:
        "Kiểm tra kết nối mạng của máy rồi bấm Thử lại. Dữ liệu bạn đang nhập vẫn được giữ nguyên.",
    };
  }

  return {
    loai: "khong-xac-dinh",
    tieuDe: "Không tải được dữ liệu",
    huongXuLy:
      error instanceof Error
        ? `${error.message}. Bấm Thử lại, nếu vẫn lỗi hãy báo quản trị hệ thống.`
        : "Bấm Thử lại, nếu vẫn lỗi hãy báo quản trị hệ thống.",
  };
}
