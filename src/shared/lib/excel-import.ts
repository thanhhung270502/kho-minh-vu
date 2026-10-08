import { z } from "zod";


const issueSchema = z.object({ row: z.number(), docNo: z.string(), message: z.string() });

const resultSchema = z.object({
  committed: z.boolean(),
  documents: z.number(),
  lines: z.number(),
  created: z.number(),
  updated: z.number(),
  errors: z.array(issueSchema),
  warnings: z.array(issueSchema),
  partial: z.object({ done: z.number(), total: z.number(), message: z.string() }).nullable(),
});

export type ImportIssue = z.infer<typeof issueSchema>;
export type ExcelImportResult = z.infer<typeof resultSchema>;

/** "moi" = nhập mới; "cap_nhat" = cập nhật — giá trị gửi route (tham số `kieu`), giữ tiếng Việt. */
export type ExcelImportMode = "moi" | "cap_nhat";

/** Lỗi route trả `{ title, action }` — giữ nguyên để hiện đúng câu tiếng Việt. */
export class ExcelImportError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
  ) {
    super(title);
  }
}

/** `commit` false = chỉ kiểm tra (xem trước); true = nạp thật. */
/**
 * Gửi file tới route nhập Excel (POST `endpoint`, form: file, kieu, che_do). Dùng
 * chung cho chứng từ và đối tác — route nào cũng trả cùng hình dạng kết quả.
 */
export async function submitExcelImport(
  endpoint: string,
  mode: ExcelImportMode,
  file: File,
  commit: boolean,
): Promise<ExcelImportResult> {
  const form = new FormData();
  form.set("file", file);
  form.set("kieu", mode);
  form.set("che_do", commit ? "nap" : "kiem_tra");

  const response = await fetch(endpoint, { method: "POST", body: form });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = z.object({ title: z.string(), action: z.string() }).safeParse(body);
    throw parsed.success
      ? new ExcelImportError(parsed.data.title, parsed.data.action)
      : new ExcelImportError("Máy chủ không xử lý được file", "Thử lại sau ít phút.");
  }

  const parsed = z.object({ result: resultSchema }).safeParse(body);
  if (!parsed.success) {
    throw new ExcelImportError("Máy chủ trả dữ liệu lạ", "Tải lại trang rồi thử lần nữa.");
  }
  return parsed.data.result;
}
