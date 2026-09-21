import { useQueryClient } from "@tanstack/react-query";
import { useReducer, useRef } from "react";

import { explainError } from "@/shared/lib/errors";

import { inventoryKeys } from "../api/inventory.keys";
import {
  ProvisionalStockError,
  submitProvisionalStock,
  type ProvisionalStockMode,
  type ProvisionalStockResult,
} from "../api/provisional-stock.api";

export type ProvisionalStockFlowState = {
  step: 0 | 1 | 2;
  file: File | null;
  /** `""` = không chọn kho (antd v6 cảnh báo option `value: null`). */
  warehouseId: string;
  result: ProvisionalStockResult | null;
  error: { title: string; action: string } | null;
  submitting: boolean;
};

type Action =
  | { type: "set-warehouse"; warehouseId: string }
  | { type: "submit"; file: File; warehouseId: string }
  | { type: "preview"; result: ProvisionalStockResult }
  | { type: "committed"; result: ProvisionalStockResult }
  // Kiểm hỏng thì quay về chọn file: kết quả cũ không còn khớp kho vừa chọn.
  | { type: "error"; title: string; action: string; backToStart: boolean }
  | { type: "reset" };

const INITIAL_STATE: ProvisionalStockFlowState = {
  step: 0,
  file: null,
  warehouseId: "",
  result: null,
  error: null,
  submitting: false,
};

function reducer(
  state: ProvisionalStockFlowState,
  action: Action,
): ProvisionalStockFlowState {
  switch (action.type) {
    case "set-warehouse":
      return { ...state, warehouseId: action.warehouseId };
    case "submit":
      return {
        ...state,
        file: action.file,
        warehouseId: action.warehouseId,
        submitting: true,
        error: null,
      };
    case "preview":
      return { ...state, step: 1, result: action.result, submitting: false };
    case "committed":
      return { ...state, step: 2, result: action.result, submitting: false };
    case "error": {
      const error = { title: action.title, action: action.action };
      return action.backToStart
        ? { ...INITIAL_STATE, warehouseId: state.warehouseId, error }
        : { ...state, submitting: false, error };
    }
    case "reset":
      return { ...INITIAL_STATE, warehouseId: state.warehouseId };
  }
}

/**
 * Luồng ba bước của màn nạp tồn tạm: chọn file → xem trước → nạp thật. Tách khỏi
 * component để phần giao diện không vượt ~200 dòng.
 */
export function useProvisionalStockFlow() {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // Chặn bấm dồn trước khi nút kịp vẽ lại `loading`: bấm "Nạp thật" 5 lần chỉ gửi
  // một request. RPC vẫn idempotent — đây là lớp chặn thứ nhất, không phải duy nhất.
  const inFlight = useRef(false);

  // Chế độ sang route qua trường `che_do`: "kiem_tra" chỉ xem trước, "nap" ghi sổ.
  async function run(
    file: File,
    mode: ProvisionalStockMode,
    warehouseId: string,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "submit", file, warehouseId });

    try {
      const result = await submitProvisionalStock({ file, mode, warehouseId });
      if (mode === "kiem_tra") {
        dispatch({ type: "preview", result });
        return;
      }
      if (result.committed) {
        void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        // Tồn theo kho còn hiện ở danh mục hàng và thẻ kho của chi tiết mã.
        void queryClient.invalidateQueries({ queryKey: ["products"] });
      }
      dispatch({ type: "committed", result });
    } catch (e) {
      const { title, action } =
        e instanceof ProvisionalStockError ? e : explainError(e);
      dispatch({
        type: "error",
        title,
        action,
        backToStart: mode === "kiem_tra",
      });
    } finally {
      inFlight.current = false;
    }
  }

  /** Dùng làm `beforeUpload` — trả `false` để Upload không tự tải lên. */
  function selectFile(file: File): boolean {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      void run(file, "kiem_tra", state.warehouseId);
    } else {
      dispatch({
        type: "error",
        title: "File không phải .xlsx",
        action:
          "Chọn đúng file danh mục KiotViet xuất ra (DanhSachSanPham_KV….xlsx).",
        backToStart: true,
      });
    }
    return false;
  }

  function changeWarehouse(warehouseId: string) {
    // Đổi kho khi đang xem trước thì kiểm lại ngay: mã chưa có kho mặc định đổi
    // từ "lỗi" sang "sẽ nạp" (hoặc ngược lại).
    if (state.step === 1 && state.file) {
      void run(state.file, "kiem_tra", warehouseId);
    } else {
      dispatch({ type: "set-warehouse", warehouseId });
    }
  }

  function commit() {
    if (state.file) void run(state.file, "nap", state.warehouseId);
  }

  function reset() {
    dispatch({ type: "reset" });
  }

  return { state, selectFile, changeWarehouse, commit, reset };
}
