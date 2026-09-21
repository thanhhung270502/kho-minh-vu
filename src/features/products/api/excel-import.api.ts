import { z } from "zod";

/**
 * Hình dạng JSON do RPC `nhap_danh_muc` sinh ra và route handler chuyển tiếp
 * nguyên vẹn — khóa là hợp đồng của database, giữ tiếng Việt. Map sang miền
 * ngay dưới đây để component không bao giờ thấy khóa này.
 */
const errorRowSchema = z.object({
  dong: z.number(),
  cot: z.string(),
  thong_bao: z.string(),
});

const changeRowSchema = z.object({
  dong: z.number(),
  ma_hang: z.string(),
  loai: z.enum(["THEM", "SUA"]),
  /** `{ ten_hang: [cũ, mới] }` — RPC trả mảng 2 phần tử cho mỗi trường đổi. */
  truong: z.record(z.string(), z.array(z.unknown())).nullable().optional(),
});

const resultSchema = z.object({
  tong: z.number(),
  them: z.number(),
  sua: z.number(),
  khong_doi: z.number(),
  da_nap: z.boolean(),
  loi: z.array(errorRowSchema),
  thay_doi: z.array(changeRowSchema),
  thay_doi_bi_cat: z.boolean().optional(),
});

const responseSchema = z.object({
  dinhDang: z.enum(["mau_moi", "kiotviet"]),
  result: resultSchema,
});

// --- Mô hình miền ----------------------------------------------------------

export type ImportErrorRow = {
  row: number;
  column: string;
  message: string;
};

export type ImportChangeRow = {
  row: number;
  code: string;
  kind: "THEM" | "SUA";
  /** `{ ten_hang: [cũ, mới] }` — khóa là tên cột database. */
  fields: Record<string, unknown[]> | null;
};

export type ImportResult = {
  total: number;
  added: number;
  updated: number;
  unchanged: number;
  committed: boolean;
  errors: ImportErrorRow[];
  changes: ImportChangeRow[];
  changesTruncated: boolean;
};

export type SourceFormat = "mau_moi" | "kiotviet";

export type ImportResponse = {
  format: SourceFormat;
  result: ImportResult;
};

export type ImportMode = "kiem_tra" | "nap";

function toImportResponse(raw: z.infer<typeof responseSchema>): ImportResponse {
  return {
    format: raw.dinhDang,
    result: {
      total: raw.result.tong,
      added: raw.result.them,
      updated: raw.result.sua,
      unchanged: raw.result.khong_doi,
      committed: raw.result.da_nap,
      errors: raw.result.loi.map((error) => ({
        row: error.dong,
        column: error.cot,
        message: error.thong_bao,
      })),
      changes: raw.result.thay_doi.map((change) => ({
        row: change.dong,
        code: change.ma_hang,
        kind: change.loai,
        fields: change.truong ?? null,
      })),
      changesTruncated: raw.result.thay_doi_bi_cat ?? false,
    },
  };
}

/** Lỗi có sẵn câu tiếng Việt do route handler soạn — không cần dịch lại. */
export class ExcelImportError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
    readonly status: number,
  ) {
    super(`${title}. ${action}`);
    this.name = "ExcelImportError";
  }
}

export async function submitImportFile(
  file: File,
  mode: ImportMode,
): Promise<ImportResponse> {
  const form = new FormData();
  form.set("file", file);
  form.set("che_do", mode);

  const response = await fetch("/api/danh-muc/nhap-excel", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Cần tải lại hẳn trang đăng nhập, không dùng router.push: cache TanStack
      // Query của phiên cũ phải bị bỏ đi cùng.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dang-nhap?tiep_tuc=/danh-muc");
    }

    let title = "Không nhập được file";
    let action = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị.";
    try {
      const body = (await response.json()) as { title?: string; action?: string };
      title = body.title ?? title;
      action = body.action ?? action;
    } catch {
      /* server trả không phải JSON — giữ câu mặc định */
    }

    throw new ExcelImportError(title, action, response.status);
  }

  // Dữ liệu từ mạng là `unknown` cho tới khi parse.
  return toImportResponse(responseSchema.parse(await response.json()));
}
