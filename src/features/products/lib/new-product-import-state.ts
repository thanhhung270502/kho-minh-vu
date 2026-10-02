// File thuần (bẫy 9): trạng thái hộp thoại "Nhập mã hàng mới" — tách khỏi
// component cho gọn; không JSX, không hook.
import type { NewProductImportResult } from "../api/new-product-import.api";
import { applyToRows, type DraftFields, type DraftRow } from "./new-product-import";

export type ImportState = {
  step: "pick" | "preview" | "done";
  drafts: DraftRow[];
  catalog: Map<number, string[]>;
  selected: number[];
  /** null = chưa chọn: lấy kho đầu tiên (Kho 1) khi danh mục về. */
  warehouseId: string | null;
  result: NewProductImportResult | null;
  /** Mọi dòng không nhập được sau lần nạp — lỗi client + lỗi RPC. */
  finalProblems: Map<number, string[]>;
};

export type ImportAction =
  | { type: "loaded"; drafts: DraftRow[]; catalog: Map<number, string[]> }
  | { type: "edit"; rows: number[]; patch: Partial<DraftFields> }
  | { type: "select"; rows: number[] }
  | { type: "warehouse"; id: string }
  | { type: "done"; result: NewProductImportResult; problems: Map<number, string[]> }
  | { type: "reset" };

export const INITIAL_IMPORT_STATE: ImportState = {
  step: "pick",
  drafts: [],
  catalog: new Map(),
  selected: [],
  warehouseId: null,
  result: null,
  finalProblems: new Map(),
};

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case "loaded":
      return { ...INITIAL_IMPORT_STATE, warehouseId: state.warehouseId, step: "preview", drafts: action.drafts, catalog: action.catalog };
    case "edit":
      return { ...state, drafts: applyToRows(state.drafts, action.rows, action.patch) };
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
