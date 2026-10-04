// File thuần (bẫy 9): trạng thái hộp thoại "Nhập mã hàng mới" — tách khỏi
// component cho gọn; không JSX, không hook.
import type { NewProductImportResult } from "../api/new-product-import.api";
import { applyToRows, CATALOG_REASONS, type DraftFields, type DraftRow } from "./new-product-import";

export type ImportState = {
  step: "pick" | "preview" | "done";
  drafts: DraftRow[];
  catalog: Map<number, string[]>;
  /** Sheet tên hàng chuẩn không tải được — ô tên trống chưa được tự điền. */
  nameSheetError: string | null;
  selected: number[];
  /** null = chưa chọn: lấy kho đầu tiên (Kho 1) khi danh mục về. */
  warehouseId: string | null;
  result: NewProductImportResult | null;
  /** Mọi dòng không nhập được sau lần nạp — lỗi client + lỗi RPC. */
  finalProblems: Map<number, string[]>;
};

export type ImportAction =
  | { type: "loaded"; drafts: DraftRow[]; catalog: Map<number, string[]>; nameSheetError: string | null }
  | { type: "edit"; rows: number[]; patch: Partial<DraftFields> }
  | { type: "select"; rows: number[] }
  | { type: "warehouse"; id: string }
  | { type: "done"; result: NewProductImportResult; problems: Map<number, string[]> }
  | { type: "reset" };

export const INITIAL_IMPORT_STATE: ImportState = {
  step: "pick",
  drafts: [],
  catalog: new Map(),
  nameSheetError: null,
  selected: [],
  warehouseId: null,
  result: null,
  finalProblems: new Map(),
};

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case "loaded":
      return {
        ...INITIAL_IMPORT_STATE,
        warehouseId: state.warehouseId,
        step: "preview",
        drafts: action.drafts,
        catalog: action.catalog,
        nameSheetError: action.nameSheetError,
      };
    case "edit":
      return {
        ...state,
        drafts: applyToRows(state.drafts, action.rows, action.patch),
        catalog: action.patch.name === undefined ? state.catalog : dropNameClash(state.catalog, action.rows),
      };
    case "select":
      return { ...state, selected: action.rows };
    case "warehouse":
      return { ...state, warehouseId: action.id };
    case "done": {
      const merged = new Map(action.problems);
      for (const e of action.result.errors) merged.set(e.row, [e.reason]);
      return { ...state, step: "done", result: action.result, finalProblems: merged };
    }
    case "reset":
      return { ...INITIAL_IMPORT_STATE, warehouseId: state.warehouseId };
  }
}

/**
 * Lỗi "tên đã có trong danh mục" chỉ đúng với tên lúc đọc file. Người dùng sửa tên
 * thì bỏ lỗi đó đi; tên mới vẫn trùng thì RPC nạp sẽ trả lại đúng dòng đó.
 */
function dropNameClash(catalog: Map<number, string[]>, rows: number[]): Map<number, string[]> {
  const next = new Map(catalog);
  for (const row of rows) {
    const rest = (next.get(row) ?? []).filter((reason) => reason !== CATALOG_REASONS.name);
    if (rest.length > 0) next.set(row, rest);
    else next.delete(row);
  }
  return next;
}
