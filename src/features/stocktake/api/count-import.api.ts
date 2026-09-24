import { z } from "zod";

/**
 * Hình dạng jsonb do RPC `nhap_so_dem_kiem_ke` (migration 0065) trả về, route
 * `/api/kiem-ke/nhap-excel` chuyển tiếp nguyên vẹn trong `{ result }`. Khóa là hợp
 * đồng của database (tiếng Việt) — chỉ file này thấy chúng, map sang mô hình miền
 * ngay dưới đây. Parse bằng zod: RPC đổi hình dạng thì báo lỗi rõ, không lặng lẽ
 * hiện 0.
 *
 * Ba nhánh trả về khác hình dạng (đọc 0065_kiem_ke_dem.sql dòng 498-539):
 * - chế độ kiểm tra (hoặc nạp nhưng còn dòng lỗi): có `chi_tiet_dat`/`chi_tiet_cap_nhat`
 *   khi không lỗi, hoặc chỉ `loi` + `ly_do` khi còn dòng lỗi — mọi trường chi tiết
 *   đều optional vì không nhánh nào có đủ tất cả.
 * - nạp thành công: chỉ có `chi_tiet_bo_qua`, không có `chi_tiet_dat`/`chi_tiet_cap_nhat`/`loi`.
 */
const itemRowSchema = z.object({
  san_pham_id: z.string(),
  ma_hang: z.string(),
  so_dem: z.number(),
});

const reasonRowSchema = z.object({ ma_hang: z.string(), ly_do: z.string() });

const resultSchema = z.object({
  da_nap: z.boolean(),
  dat: z.number(),
  cap_nhat: z.number(),
  bo_qua: z.number(),
  so_loi: z.number(),
  chi_tiet_dat: z.array(itemRowSchema).optional(),
  chi_tiet_cap_nhat: z.array(itemRowSchema).optional(),
  chi_tiet_bo_qua: z.array(reasonRowSchema).optional(),
  loi: z.array(reasonRowSchema).optional(),
  /** Chỉ có khi còn dòng lỗi — "Sửa hết dòng lỗi rồi nạp lại". */
  ly_do: z.string().optional(),
});

const responseSchema = z.object({ result: resultSchema });

// --- Mô hình miền ------------------------------------------------------------

/** `"check"` chỉ xem trước (route gửi `che_do=kiem_tra`), `"load"` ghi thật (`che_do=nap`). */
export type CountImportMode = "check" | "load";

export type CountImportRow = { code: string; quantity: number };
export type CountImportIssue = { key: string; code: string; reason: string };

export type CountImportResult = {
  loaded: boolean;
  newCount: number;
  overwriteCount: number;
  skippedCount: number;
  errorCount: number;
  newRows: CountImportRow[];
  overwriteRows: CountImportRow[];
  skippedRows: CountImportIssue[];
  errors: CountImportIssue[];
  reason: string | null;
};

function toIssues(
  rows: Array<z.infer<typeof reasonRowSchema>> | undefined,
): CountImportIssue[] {
  return (rows ?? []).map((row, index) => ({
    key: String(index),
    code: row.ma_hang,
    reason: row.ly_do,
  }));
}

function toRows(
  rows: Array<z.infer<typeof itemRowSchema>> | undefined,
): CountImportRow[] {
  return (rows ?? []).map((row) => ({ code: row.ma_hang, quantity: row.so_dem }));
}

function toCountImportResult(raw: z.infer<typeof resultSchema>): CountImportResult {
  return {
    loaded: raw.da_nap,
    newCount: raw.dat,
    overwriteCount: raw.cap_nhat,
    skippedCount: raw.bo_qua,
    errorCount: raw.so_loi,
    newRows: toRows(raw.chi_tiet_dat),
    overwriteRows: toRows(raw.chi_tiet_cap_nhat),
    skippedRows: toIssues(raw.chi_tiet_bo_qua),
    errors: toIssues(raw.loi),
    reason: raw.ly_do ?? null,
  };
}

/** Lỗi có sẵn câu tiếng Việt do route handler soạn — không cần dịch lại. */
export class CountImportError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
    readonly status: number,
  ) {
    super(`${title}. ${action}`);
    this.name = "CountImportError";
  }
}

export async function postCountFile(input: {
  sessionId: string;
  file: File;
  mode: CountImportMode;
}): Promise<CountImportResult> {
  // Tên trường là hợp đồng với route handler — giữ đúng chữ route đọc.
  const form = new FormData();
  form.set("file", input.file);
  form.set("phien", input.sessionId);
  form.set("che_do", input.mode === "load" ? "nap" : "kiem_tra");

  const response = await fetch("/api/kiem-ke/nhap-excel", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Tải lại hẳn trang đăng nhập, không dùng router.push: cache TanStack Query
      // của phiên cũ phải bị bỏ đi cùng.
      const continueTo = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname : "/kiem-ke",
      );
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/dang-nhap?tiep_tuc=${continueTo}`);
    }

    let title = "Không xử lý được file";
    let action = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị kèm tên file.";
    try {
      const body = (await response.json()) as { title?: string; action?: string };
      title = body.title ?? title;
      action = body.action ?? action;
    } catch {
      /* máy chủ trả không phải JSON (trang lỗi của nền tảng) — giữ câu mặc định */
    }

    throw new CountImportError(title, action, response.status);
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new CountImportError(
      "Máy chủ trả kết quả không đúng dạng",
      "Tải lại trang rồi kiểm lại file. Nếu đã bấm nạp thật, mở bảng đếm xem số đã đổi chưa trước khi bấm lại — nạp lần hai chỉ ghi đè cùng số.",
      500,
    );
  }

  return toCountImportResult(parsed.data.result);
}

/** URL GET tải file mẫu đếm — `categoryId` rỗng/`undefined` = toàn phạm vi phiên. */
export function countTemplateUrl(sessionId: string, categoryId?: string): string {
  const params = new URLSearchParams({ phien: sessionId });
  if (categoryId) params.set("nhom", categoryId);
  return `/api/kiem-ke/mau-excel?${params.toString()}`;
}
