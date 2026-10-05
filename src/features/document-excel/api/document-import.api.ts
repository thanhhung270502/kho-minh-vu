import { z } from "zod";

import type { DocumentKind, ImportMode } from "../lib/document-excel";

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
export type DocumentImportResult = z.infer<typeof resultSchema>;

/** Lỗi route trả `{ title, action }` — giữ nguyên để hiện đúng câu tiếng Việt. */
export class DocumentImportError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
  ) {
    super(title);
  }
}

/** `commit` false = chỉ kiểm tra (xem trước); true = nạp thật. */
export async function submitDocumentFile(
  kind: DocumentKind,
  mode: ImportMode,
  file: File,
  commit: boolean,
): Promise<DocumentImportResult> {
  const form = new FormData();
  form.set("file", file);
  form.set("kieu", mode);
  form.set("che_do", commit ? "nap" : "kiem_tra");

  const response = await fetch(`/api/chung-tu-excel/${kind}/nhap`, { method: "POST", body: form });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = z.object({ title: z.string(), action: z.string() }).safeParse(body);
    throw parsed.success
      ? new DocumentImportError(parsed.data.title, parsed.data.action)
      : new DocumentImportError("Máy chủ không xử lý được file", "Thử lại sau ít phút.");
  }

  const parsed = z.object({ result: resultSchema }).safeParse(body);
  if (!parsed.success) {
    throw new DocumentImportError("Máy chủ trả dữ liệu lạ", "Tải lại trang rồi thử lần nữa.");
  }
  return parsed.data.result;
}
