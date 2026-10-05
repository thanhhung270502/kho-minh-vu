/**
 * Gọi RPC nhap_chung_tu_excel theo lô. Lớp api: chỗ duy nhất của feature chạm tên
 * RPC và khóa jsonb tiếng Việt; trả mô hình miền tiếng Anh cho route handler.
 *
 * Chia lô vì vai trò authenticated có statement_timeout 8 giây — file lịch sử
 * KiotViet có thể tới vài chục nghìn dòng. Mỗi lô là một transaction.
 */
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { KIND_LABELS, type DocumentKind, type ImportMode, type RowIssue, type RpcDocument } from "../lib/document-excel";

const BATCH_DOCS = 300;
const BATCH_LINES = 3_000;

const issueSchema = z.object({ dong: z.number().nullable(), so: z.string().nullable(), loi: z.string() });
const rpcResultSchema = z.object({
  committed: z.boolean(),
  phieu_moi: z.number(),
  phieu_sua: z.number(),
  so_dong: z.number(),
  loi: z.array(issueSchema),
  canh_bao: z.array(issueSchema),
});

export type DocumentImportResult = {
  committed: boolean;
  documents: number;
  lines: number;
  created: number;
  updated: number;
  errors: RowIssue[];
  warnings: RowIssue[];
  /** Nạp dở: lô sau lỗi bất ngờ — các lô trước đã nạp (phiếu nháp). */
  partial: { done: number; total: number; message: string } | null;
};

const toIssue = (i: z.infer<typeof issueSchema>): RowIssue => ({ row: i.dong ?? 0, docNo: i.so ?? "", message: i.loi });

/** Chia theo số phiếu VÀ số dòng — một phiếu không bao giờ bị cắt đôi. */
function batches(documents: readonly RpcDocument[]): RpcDocument[][] {
  const out: RpcDocument[][] = [];
  let current: RpcDocument[] = [];
  let lines = 0;
  for (const doc of documents) {
    if (current.length > 0 && (current.length >= BATCH_DOCS || lines + doc.dong.length > BATCH_LINES)) {
      out.push(current);
      current = [];
      lines = 0;
    }
    current.push(doc);
    lines += doc.dong.length;
  }
  if (current.length > 0) out.push(current);
  return out;
}

async function callRpc(kind: DocumentKind, mode: ImportMode, docs: RpcDocument[], checkOnly: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("nhap_chung_tu_excel", {
    p_loai: KIND_LABELS[kind].rpc,
    p_kieu: mode,
    p_phieu: docs as unknown as Json,
    p_chi_kiem_tra: checkOnly,
  });
  if (error) throw error;
  return rpcResultSchema.parse(data);
}

/**
 * Kiểm tra (`commit` = false) hoặc nạp. Nạp luôn kiểm lại toàn bộ trước: dữ liệu
 * có thể đổi từ lúc xem trước, và một lô lỗi không được làm nạp dở các lô khác.
 */
export async function importDocuments(
  kind: DocumentKind,
  mode: ImportMode,
  documents: RpcDocument[],
  localIssues: RowIssue[],
  commit: boolean,
): Promise<DocumentImportResult> {
  const groups = batches(documents);
  const result: DocumentImportResult = {
    committed: false,
    documents: documents.length,
    lines: documents.reduce((s, d) => s + d.dong.length, 0),
    created: 0,
    updated: 0,
    errors: [...localIssues],
    warnings: [],
    partial: null,
  };

  for (const group of groups) {
    const r = await callRpc(kind, mode, group, true);
    result.errors.push(...r.loi.map(toIssue));
    result.warnings.push(...r.canh_bao.map(toIssue));
  }
  result.errors.sort((a, b) => a.row - b.row);
  result.warnings.sort((a, b) => a.row - b.row);

  if (!commit || result.errors.length > 0 || documents.length === 0) return result;

  let done = 0;
  for (const group of groups) {
    try {
      const r = await callRpc(kind, mode, group, false);
      if (!r.committed) {
        result.errors.push(...r.loi.map(toIssue));
        break;
      }
      result.created += r.phieu_moi;
      result.updated += r.phieu_sua;
      done += group.length;
    } catch (e) {
      result.partial = {
        done,
        total: documents.length,
        message: e instanceof Error ? e.message : "Lỗi không xác định",
      };
      break;
    }
  }
  if (done > 0 && done < documents.length && !result.partial) {
    result.partial = { done, total: documents.length, message: "Dữ liệu đổi giữa chừng — các phiếu còn lại chưa nạp." };
  }
  result.committed = done > 0;
  return result;
}
