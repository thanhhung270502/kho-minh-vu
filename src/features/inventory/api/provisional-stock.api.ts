import { z } from "zod";

/**
 * Hình dạng jsonb do RPC `nap_ton_tam` (migration 0061) trả về, route handler
 * `/api/ton-kho/nap-tam` chuyển tiếp nguyên vẹn trong `{ result }`. Khóa là hợp
 * đồng của database nên giữ tiếng Việt; map sang miền ngay dưới đây để component
 * không bao giờ thấy chúng. Parse bằng zod thay vì ép kiểu: route hay RPC đổi hình
 * dạng thì báo lỗi rõ ràng, không lặng lẽ hiện 0.
 */
const reasonRowSchema = z.object({ ma_hang: z.string(), ly_do: z.string() });

/** Chỉ có ở chế độ xem trước — khi nạp thật RPC không trả lại chi tiết từng dòng. */
const loadRowSchema = z.object({ ma_hang: z.string(), so_luong: z.number() });

const resultSchema = z.object({
  da_nap: z.boolean(),
  dat: z.number(),
  bo_qua: z.number(),
  so_loi: z.number(),
  chi_tiet_dat: z.array(loadRowSchema).optional(),
  chi_tiet_bo_qua: z.array(reasonRowSchema),
  loi: z.array(reasonRowSchema),
  chung_tu_id: z.string().optional(),
  so_ct: z.string().optional(),
  /** Có khi bấm nạp mà không còn mã nào cần nạp — RPC không tạo chứng từ rỗng. */
  ly_do: z.string().optional(),
});

const responseSchema = z.object({ result: resultSchema });

// --- Mô hình miền ------------------------------------------------------------

/**
 * Giá trị trường `che_do` route handler đọc — hợp đồng với route, giữ nguyên chữ:
 * `kiem_tra` chỉ xem trước, `nap` tạo và ghi sổ chứng từ.
 */
export type ProvisionalStockMode = "kiem_tra" | "nap";

export type ProvisionalStockIssue = {
  /** Khóa dòng cho bảng — mã hàng có thể rỗng hoặc lặp giữa các dòng lỗi. */
  key: string;
  code: string;
  reason: string;
};

export type ProvisionalStockResult = {
  committed: boolean;
  toLoad: number;
  skipped: number;
  errorCount: number;
  /** Tổng số lượng sẽ nạp (cộng cả mã tồn âm) — `null` khi RPC không trả chi tiết. */
  totalQuantity: number | null;
  skippedRows: ProvisionalStockIssue[];
  errors: ProvisionalStockIssue[];
  documentId: string | null;
  documentNo: string | null;
  note: string | null;
};

function toIssues(
  rows: Array<z.infer<typeof reasonRowSchema>>,
): ProvisionalStockIssue[] {
  return rows.map((row, index) => ({
    key: String(index),
    code: row.ma_hang,
    reason: row.ly_do,
  }));
}

function toProvisionalStockResult(
  raw: z.infer<typeof resultSchema>,
): ProvisionalStockResult {
  return {
    committed: raw.da_nap,
    toLoad: raw.dat,
    skipped: raw.bo_qua,
    errorCount: raw.so_loi,
    totalQuantity: raw.chi_tiet_dat
      ? raw.chi_tiet_dat.reduce((sum, row) => sum + row.so_luong, 0)
      : null,
    skippedRows: toIssues(raw.chi_tiet_bo_qua),
    errors: toIssues(raw.loi),
    documentId: raw.chung_tu_id ?? null,
    documentNo: raw.so_ct ?? null,
    note: raw.ly_do ?? null,
  };
}

/** Lỗi có sẵn câu tiếng Việt do route handler soạn — không cần dịch lại. */
export class ProvisionalStockError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
    readonly status: number,
  ) {
    super(`${title}. ${action}`);
    this.name = "ProvisionalStockError";
  }
}

export async function submitProvisionalStock(input: {
  file: File;
  mode: ProvisionalStockMode;
  /** `""` = không chọn kho áp dụng. */
  warehouseId: string;
}): Promise<ProvisionalStockResult> {
  // Tên trường là hợp đồng với route handler — giữ đúng chữ route đọc.
  const form = new FormData();
  form.set("file", input.file);
  form.set("che_do", input.mode);
  form.set("kho_mac_dinh", input.warehouseId);

  const response = await fetch("/api/ton-kho/nap-tam", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Tải lại hẳn trang đăng nhập, không dùng router.push: cache TanStack Query
      // của phiên cũ phải bị bỏ đi cùng.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dang-nhap?tiep_tuc=/ton-kho/nap-tam");
    }

    let title = "Không xử lý được file";
    let action = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị kèm tên file.";
    try {
      const body = (await response.json()) as {
        title?: string;
        action?: string;
      };
      title = body.title ?? title;
      action = body.action ?? action;
    } catch {
      /* máy chủ trả không phải JSON (trang lỗi của nền tảng) — giữ câu mặc định */
    }

    throw new ProvisionalStockError(title, action, response.status);
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ProvisionalStockError(
      "Máy chủ trả kết quả không đúng dạng",
      "Tải lại trang rồi kiểm lại file. Nếu đã bấm nạp thật, mở màn Tồn kho xem số đã đổi chưa trước khi bấm lại — nạp lần hai không tạo thêm chứng từ.",
      500,
    );
  }

  return toProvisionalStockResult(parsed.data.result);
}
