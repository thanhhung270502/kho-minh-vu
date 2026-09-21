"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Modal,
  Statistic,
  Steps,
  Table,
  Typography,
  Upload,
} from "antd";
import { useReducer } from "react";

import { productKeys } from "../api/product.keys";
import {
  toCostImportResult,
  type CostImportResult,
  type CostImportResultPayload,
} from "../lib/cost-template";
import { MAX_FILE_MB } from "../lib/excel-template";

type State = {
  step: 0 | 1 | 2;
  file: File | null;
  result: CostImportResult | null;
  error: { title: string; action: string } | null;
  submitting: boolean;
};

type Action =
  | { type: "select-file"; file: File }
  | { type: "submitting" }
  | { type: "preview"; result: CostImportResult }
  | { type: "committed"; result: CostImportResult }
  | { type: "error"; title: string; action: string }
  | { type: "reset" };

const INITIAL_STATE: State = {
  step: 0,
  file: null,
  result: null,
  error: null,
  submitting: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select-file":
      return { ...INITIAL_STATE, file: action.file, submitting: true };
    case "submitting":
      return { ...state, submitting: true, error: null };
    case "preview":
      return { ...state, step: 1, result: action.result, submitting: false, error: null };
    case "committed":
      return { ...state, step: 2, result: action.result, submitting: false, error: null };
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

export function CostImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  async function submit(file: File, mode: "kiem_tra" | "nap") {
    const form = new FormData();
    form.set("file", file);
    form.set("che_do", mode);

    try {
      const response = await fetch("/api/danh-muc/gia-von-dau-ky", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        result?: CostImportResultPayload;
        title?: string;
        action?: string;
      };

      if (!response.ok || !body.result) {
        dispatch({
          type: "error",
          title: body.title ?? "Không nạp được giá vốn",
          action: body.action ?? "Thử lại sau ít phút.",
        });
        return;
      }

      if (mode === "nap") {
        void queryClient.invalidateQueries({ queryKey: productKeys.all });
        dispatch({ type: "committed", result: toCostImportResult(body.result) });
        return;
      }
      dispatch({ type: "preview", result: toCostImportResult(body.result) });
    } catch {
      dispatch({
        type: "error",
        title: "Không gửi được file",
        action: "Kiểm tra kết nối mạng rồi thử lại.",
      });
    }
  }

  function selectFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      dispatch({
        type: "error",
        title: "File không phải .xlsx",
        action: "Lưu lại thành .xlsx rồi chọn.",
      });
      return false;
    }
    dispatch({ type: "select-file", file });
    void submit(file, "kiem_tra");
    return false;
  }

  function close() {
    if (state.submitting) return;
    dispatch({ type: "reset" });
    onClose();
  }

  const result = state.result;

  return (
    <Modal
      open={open}
      title="Nạp giá vốn đầu kỳ"
      width={880}
      closable={!state.submitting}
      mask={{ closable: !state.submitting }}
      onCancel={close}
      footer={
        state.step === 1
          ? [
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
                disabled={(result?.applied ?? 0) === 0}
                onClick={() => {
                  if (!state.file) return;
                  dispatch({ type: "submitting" });
                  void submit(state.file, "nap");
                }}
              >
                Đặt giá vốn cho {result?.applied ?? 0} mã
              </Button>,
            ]
          : state.step === 2
            ? [
                <Button key="close" type="primary" onClick={close}>
                  Đóng
                </Button>,
              ]
            : null
      }
    >
      <Steps
        className="mb-4"
        size="small"
        current={state.step}
        items={[{ title: "Chọn file" }, { title: "Xem trước" }, { title: "Kết quả" }]}
      />

      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="Chỉ đặt được cho mã đang có giá vốn 0. Sau khi mã đã có phiếu nhập thật, giá vốn do hệ thống tính và không nạp đè được nữa."
      />

      {state.error ? (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          title={state.error.title}
          description={state.error.action}
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
            <p className="px-4 py-6">Kéo file vào đây — hai cột: Mã hàng và Giá vốn.</p>
          </Upload.Dragger>
          <Typography.Paragraph type="secondary" className="mt-3 mb-0">
            Tối đa {MAX_FILE_MB}MB.{" "}
            <a href="/api/danh-muc/gia-von-dau-ky">Tải file mẫu</a>
          </Typography.Paragraph>
        </>
      ) : null}

      {state.step >= 1 && result ? (
        <>
          <div className="mb-3 flex flex-wrap gap-8">
            <Statistic
              title="Sẽ đặt"
              value={result.applied}
              valueStyle={{ color: "#389e0d" }}
            />
            <Statistic title="Bỏ qua (đã có giá vốn)" value={result.skipped} />
            <Statistic
              title="Lỗi"
              value={result.errorCount}
              valueStyle={result.errorCount ? { color: "#cf1322" } : undefined}
            />
          </div>

          <div className="max-h-[50vh] overflow-auto">
            {result.skippedRows.length > 0 ? (
              <>
                <Typography.Text strong>Bỏ qua</Typography.Text>
                <Table
                  className="mb-3"
                  rowKey="code"
                  size="small"
                  pagination={false}
                  dataSource={result.skippedRows}
                  columns={[
                    { title: "Mã hàng", dataIndex: "code", width: 180 },
                    {
                      title: "Giá vốn hiện tại",
                      dataIndex: "currentCost",
                      width: 150,
                      align: "right",
                      render: (value: number) => Number(value).toLocaleString("vi-VN"),
                    },
                    { title: "Lý do", dataIndex: "reason" },
                  ]}
                />
              </>
            ) : null}

            {result.errors.length > 0 ? (
              <>
                <Typography.Text strong>Lỗi</Typography.Text>
                <Table
                  rowKey={(row) => `${row.code}-${row.reason}`}
                  size="small"
                  pagination={false}
                  dataSource={result.errors}
                  columns={[
                    { title: "Mã hàng", dataIndex: "code", width: 180 },
                    { title: "Lý do", dataIndex: "reason" },
                  ]}
                />
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {state.step === 2 && result ? (
        <Alert
          className="mt-3"
          type="success"
          showIcon
          title={`Đã đặt giá vốn cho ${result.applied} mã`}
          description={`${result.skipped} mã bỏ qua vì đã có giá vốn.`}
        />
      ) : null}
    </Modal>
  );
}
