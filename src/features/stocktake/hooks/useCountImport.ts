"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useReducer, useRef } from "react";

import { explainError } from "@/shared/lib/errors";

import {
  CountImportError,
  postCountFile,
  type CountImportResult,
} from "../api/count-import.api";
import { invalidateCountProgress } from "./useStocktake";

export type CountImportState = {
  step: "idle" | "checked" | "loaded";
  file: File | null;
  result: CountImportResult | null;
  error: { title: string; action: string } | null;
  submitting: boolean;
};

type Action =
  | { type: "submit"; file: File }
  | { type: "checked"; result: CountImportResult }
  | { type: "loaded"; result: CountImportResult }
  // Kiểm hỏng thì quay về chọn file: kết quả cũ không còn khớp file vừa chọn.
  | { type: "error"; title: string; action: string; backToStart: boolean }
  | { type: "reset" };

const INITIAL_STATE: CountImportState = {
  step: "idle",
  file: null,
  result: null,
  error: null,
  submitting: false,
};

function reducer(state: CountImportState, action: Action): CountImportState {
  switch (action.type) {
    case "submit":
      return { ...state, file: action.file, submitting: true, error: null };
    case "checked":
      return { ...state, step: "checked", result: action.result, submitting: false };
    case "loaded":
      return { ...state, step: "loaded", result: action.result, submitting: false };
    case "error":
      return action.backToStart
        ? { ...INITIAL_STATE, error: { title: action.title, action: action.action } }
        : { ...state, submitting: false, error: { title: action.title, action: action.action } };
    case "reset":
      return INITIAL_STATE;
  }
}

/**
 * Luồng ba bước của nhập số đếm từ Excel: chọn file → kiểm tra → nạp. Tách khỏi
 * component để phần giao diện không vượt ~200 dòng (khuôn `useProvisionalStockFlow`).
 */
export function useCountImport(sessionId: string) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  // Chặn bấm dồn trước khi nút kịp vẽ lại `loading` — RPC vẫn idempotent (T-06-63),
  // đây là lớp chặn thứ nhất, không phải duy nhất.
  const inFlight = useRef(false);

  async function run(file: File, mode: "check" | "load") {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "submit", file });

    try {
      const result = await postCountFile({ sessionId, file, mode });
      if (mode === "check") {
        dispatch({ type: "checked", result });
      } else {
        if (result.loaded) {
          invalidateCountProgress(queryClient, sessionId);
        }
        dispatch({ type: "loaded", result });
      }
    } catch (e) {
      const { title, action } = e instanceof CountImportError ? e : explainError(e);
      dispatch({ type: "error", title, action, backToStart: mode === "check" });
    } finally {
      inFlight.current = false;
    }
  }

  /** Dùng làm `beforeUpload` — trả `false` để Upload không tự tải lên. */
  function check(file: File): boolean {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      void run(file, "check");
    } else {
      dispatch({
        type: "error",
        title: "File không phải .xlsx",
        action: "Dùng đúng file mẫu vừa tải, hoặc mở bằng Excel rồi lưu lại thành .xlsx.",
        backToStart: true,
      });
    }
    return false;
  }

  function load() {
    if (state.file) void run(state.file, "load");
  }

  function reset() {
    dispatch({ type: "reset" });
  }

  return { state, check, load, reset };
}
