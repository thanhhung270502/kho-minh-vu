"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Modal, Result, Steps, Typography, Upload } from "antd";
import { useReducer } from "react";

import {
  ExcelImportError,
  submitImportFile,
  type ImportMode,
  type ImportResponse,
} from "../api/excel-import.api";
import { productKeys } from "../api/product.keys";
import { MAX_FILE_MB } from "../lib/excel-template";
import { ImportPreview } from "./import-preview";

type State = {
  step: 0 | 1 | 2;
  file: File | null;
  response: ImportResponse | null;
  error: { title: string; action: string } | null;
  /** Server thấy lỗi mới lúc nạp → quay lại xem trước, chưa nạp gì. */
  dataChanged: boolean;
  submitting: boolean;
};

type Action =
  | { type: "select-file"; file: File }
  | { type: "submitting" }
  | { type: "preview"; response: ImportResponse }
  | { type: "committed"; response: ImportResponse }
  | { type: "error"; title: string; action: string }
  | { type: "reset" };

const INITIAL_STATE: State = {
  step: 0,
  file: null,
  response: null,
  error: null,
  dataChanged: false,
  submitting: false,
};

/** Nhiều trạng thái ràng buộc nhau (file / bước / lỗi / đang gửi) → useReducer. */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select-file":
      return { ...INITIAL_STATE, file: action.file, submitting: true };
    case "submitting":
      return { ...state, submitting: true, error: null };
    case "preview":
      return {
        ...state,
        step: 1,
        response: action.response,
        submitting: false,
        error: null,
        dataChanged: state.step === 1,
      };
    case "committed":
      return {
        ...state,
        step: 2,
        response: action.response,
        submitting: false,
        error: null,
        dataChanged: false,
      };
    case "error":
      return {
        ...state,
        submitting: false,
        error: { title: action.title, action: action.action },
      };
    case "reset":
      return INITIAL_STATE;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onViewRecentlyEdited: () => void;
};

export function ExcelImport({ open, onClose, onViewRecentlyEdited }: Props) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  async function submit(file: File, mode: ImportMode) {
    try {
      const response = await submitImportFile(file, mode);

      if (mode === "nap" && response.result.committed) {
        void queryClient.invalidateQueries({ queryKey: productKeys.all });
        void queryClient.invalidateQueries({ queryKey: ["audit-log", "san_pham"] });
        dispatch({ type: "committed", response });
        return;
      }

      dispatch({ type: "preview", response });
    } catch (error) {
      if (error instanceof ExcelImportError) {
        dispatch({ type: "error", title: error.title, action: error.action });
        return;
      }
      dispatch({
        type: "error",
        title: "Không gửi được file",
        action: "Kiểm tra kết nối mạng rồi bấm Kiểm tra lại.",
      });
    }
  }

  function selectFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      dispatch({
        type: "error",
        title: "File không phải .xlsx",
        action: "Mở bằng Excel rồi Lưu thành .xlsx, sau đó chọn lại.",
      });
      return false;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      dispatch({
        type: "error",
        title: `File lớn hơn ${MAX_FILE_MB}MB`,
        action: "Chia nhỏ file rồi nhập từng phần.",
      });
      return false;
    }

    dispatch({ type: "select-file", file });
    void submit(file, "kiem_tra");
    return false; // antd không tự upload — ta tự gọi route handler.
  }

  function close() {
    if (state.submitting) return;
    dispatch({ type: "reset" });
    onClose();
  }

  const result = state.response?.result;
  const changeCount = (result?.added ?? 0) + (result?.updated ?? 0);

  return (
    <Modal
      open={open}
      title="Nhập danh mục từ Excel"
      width={900}
      closable={!state.submitting}
      mask={{ closable: !state.submitting }}
      onCancel={close}
      footer={
        state.step === 1 ? (
          [
            <Button
              key="other"
              disabled={state.submitting}
              onClick={() => dispatch({ type: "reset" })}
            >
              Chọn file khác
            </Button>,
            <Button
              key="commit"
              type="primary"
              loading={state.submitting}
              disabled={(result?.errors.length ?? 0) > 0 || changeCount === 0}
              onClick={() => {
                if (!state.file) return;
                dispatch({ type: "submitting" });
                void submit(state.file, "nap");
              }}
            >
              Nạp {changeCount} thay đổi
            </Button>,
          ]
        ) : state.step === 2 ? (
          [
            <Button
              key="view"
              onClick={() => {
                dispatch({ type: "reset" });
                onViewRecentlyEdited();
              }}
            >
              Xem các mã vừa sửa
            </Button>,
            <Button key="close" type="primary" onClick={close}>
              Đóng
            </Button>,
          ]
        ) : null
      }
    >
      <Steps
        className="mb-4"
        size="small"
        current={state.step}
        items={[{ title: "Chọn file" }, { title: "Xem trước" }, { title: "Kết quả" }]}
      />

      {state.error ? (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          title={state.error.title}
          description={state.error.action}
          action={
            state.file ? (
              <Button
                size="small"
                onClick={() => {
                  dispatch({ type: "submitting" });
                  void submit(state.file as File, "kiem_tra");
                }}
              >
                Kiểm tra lại
              </Button>
            ) : null
          }
        />
      ) : null}

      {state.dataChanged ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Dữ liệu đã thay đổi từ lúc xem trước — kiểm tra lại các lỗi dưới đây. Chưa có gì được nạp."
        />
      ) : null}

      {state.step === 0 ? (
        <>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            showUploadList={false}
            disabled={state.submitting}
            beforeUpload={selectFile}
          >
            <p className="px-4 py-6">
              Kéo file vào đây — nhận file mẫu hệ mới hoặc file DanhSachSanPham xuất từ
              KiotViet.
            </p>
          </Upload.Dragger>

          <Typography.Paragraph type="secondary" className="mt-3 mb-0">
            Ô để trống nghĩa là giữ nguyên giá trị đang có. Tối đa {MAX_FILE_MB}MB.{" "}
            <a href="/api/danh-muc/mau-excel">Tải file mẫu trống</a>
          </Typography.Paragraph>
        </>
      ) : null}

      {state.step === 1 && state.response ? (
        <ImportPreview
          response={state.response}
          fileName={state.file?.name ?? ""}
        />
      ) : null}

      {state.step === 2 && result ? (
        <Result
          status="success"
          title={`Đã nạp: ${result.added} mã mới, ${result.updated} mã sửa`}
          subTitle={`${result.unchanged} mã trong file không có gì thay đổi.`}
        />
      ) : null}
    </Modal>
  );
}
