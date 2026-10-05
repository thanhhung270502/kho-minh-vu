// File thuần: trạng thái hộp nhập Excel chứng từ. File / bước / lỗi / đang gửi ràng
// buộc nhau nên dùng useReducer thay vì nhiều useState rời.
import type { DocumentImportResult } from "../api/document-import.api";

export type DialogState = {
  step: 0 | 1 | 2;
  file: File | null;
  result: DocumentImportResult | null;
  error: { title: string; action: string } | null;
  /** Server thấy lỗi mới lúc nạp → quay lại xem trước, chưa nạp gì. */
  dataChanged: boolean;
  submitting: boolean;
};

export type DialogAction =
  | { type: "select-file"; file: File }
  | { type: "submitting" }
  | { type: "preview"; result: DocumentImportResult }
  | { type: "committed"; result: DocumentImportResult }
  | { type: "error"; title: string; action: string }
  | { type: "reset" };

export const INITIAL_DIALOG_STATE: DialogState = {
  step: 0,
  file: null,
  result: null,
  error: null,
  dataChanged: false,
  submitting: false,
};

export function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "select-file":
      return { ...INITIAL_DIALOG_STATE, file: action.file, submitting: true };
    case "submitting":
      return { ...state, submitting: true, error: null };
    case "preview":
      return { ...state, step: 1, result: action.result, submitting: false, error: null, dataChanged: state.step === 1 };
    case "committed":
      return { ...state, step: 2, result: action.result, submitting: false, error: null, dataChanged: false };
    case "error":
      return { ...state, submitting: false, error: { title: action.title, action: action.action } };
    case "reset":
      return INITIAL_DIALOG_STATE;
  }
}
