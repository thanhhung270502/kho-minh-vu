"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Modal, Result, Steps, Tabs, Typography, Upload } from "antd";
import { useReducer } from "react";

import { DocumentImportError, submitDocumentFile } from "../api/document-import.api";
import { KIND_LABELS, type DocumentKind, type ImportMode } from "../lib/document-excel";
import { dialogReducer, INITIAL_DIALOG_STATE } from "../lib/import-dialog-state";
import { ImportIssuesTable } from "./import-issues-table";

const MAX_FILE_MB = 20;
const n = (v: number) => v.toLocaleString("vi-VN");

type Props = {
  kind: DocumentKind;
  /** null = đóng. */
  mode: ImportMode | null;
  onClose: () => void;
};

/** Chọn file → xem trước (lỗi / cảnh báo theo dòng) → nạp. Phiếu nạp vào luôn là NHÁP. */
export function DocumentImportDialog({ kind, mode, onClose }: Props) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(dialogReducer, INITIAL_DIALOG_STATE);
  const label = KIND_LABELS[kind].one;
  const activeMode: ImportMode = mode ?? "moi";

  async function submit(file: File, commit: boolean) {
    try {
      const result = await submitDocumentFile(kind, activeMode, file, commit);
      if (commit && result.committed) {
        // Nhập hàng loạt chạm danh sách, bộ đếm, tồn dự kiến — làm mới cả trang.
        void queryClient.invalidateQueries();
        dispatch({ type: "committed", result });
        return;
      }
      dispatch({ type: "preview", result });
    } catch (error) {
      if (error instanceof DocumentImportError) {
        dispatch({ type: "error", title: error.title, action: error.action });
        return;
      }
      dispatch({ type: "error", title: "Không gửi được file", action: "Kiểm tra kết nối mạng rồi bấm Kiểm tra lại." });
    }
  }

  function selectFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      dispatch({ type: "error", title: "File không phải .xlsx", action: "Mở bằng Excel rồi Lưu thành .xlsx, sau đó chọn lại." });
      return false;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      dispatch({ type: "error", title: `File lớn hơn ${MAX_FILE_MB}MB`, action: "Chia nhỏ file rồi nhập từng phần." });
      return false;
    }
    dispatch({ type: "select-file", file });
    void submit(file, false);
    return false; // antd không tự upload — ta tự gọi route handler.
  }

  function close() {
    if (state.submitting) return;
    dispatch({ type: "reset" });
    onClose();
  }

  const result = state.result;
  const errorCount = result?.errors.length ?? 0;
  const verb = activeMode === "moi" ? "Tạo" : "Cập nhật";

  return (
    <Modal
      open={mode !== null}
      title={`${activeMode === "moi" ? "Nhập mới" : "Cập nhật"} ${label} từ Excel`}
      width={860}
      closable={!state.submitting}
      mask={{ closable: !state.submitting }}
      onCancel={close}
      footer={
        state.step === 1
          ? [
              <Button key="other" disabled={state.submitting} onClick={() => dispatch({ type: "reset" })}>
                Chọn file khác
              </Button>,
              <Button
                key="commit"
                type="primary"
                loading={state.submitting}
                disabled={errorCount > 0 || (result?.documents ?? 0) === 0}
                onClick={() => {
                  if (!state.file) return;
                  dispatch({ type: "submitting" });
                  void submit(state.file, true);
                }}
              >
                {verb} {n(result?.documents ?? 0)} {label}
              </Button>,
            ]
          : state.step === 2
            ? [<Button key="close" type="primary" onClick={close}>Đóng</Button>]
            : null
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
              <Button size="small" onClick={() => { dispatch({ type: "submitting" }); void submit(state.file as File, false); }}>
                Kiểm tra lại
              </Button>
            ) : null
          }
        />
      ) : null}

      {state.dataChanged ? (
        <Alert className="mb-3" type="warning" showIcon title="Dữ liệu đã thay đổi từ lúc xem trước — kiểm tra lại các lỗi dưới đây. Chưa có gì được nạp." />
      ) : null}

      {state.step === 0 ? (
        <>
          <Upload.Dragger accept=".xlsx" maxCount={1} showUploadList={false} disabled={state.submitting} beforeUpload={selectFile}>
            <p className="px-4 py-6">
              {state.submitting ? "Đang đọc và kiểm tra file…" : "Kéo file vào đây hoặc bấm để chọn file .xlsx"}
            </p>
          </Upload.Dragger>
          <Typography.Paragraph type="secondary" className="mt-3 mb-0">
            {activeMode === "moi" ? (
              <>
                Mỗi số phiếu thành một {label} nháp — chưa đụng tồn, kiểm lại trên web rồi mới ghi sổ.{" "}
                <a href={`/api/chung-tu-excel/${kind}/mau?kieu=moi`}>Tải file mẫu</a>
              </>
            ) : (
              <>
                Sửa thông tin không ảnh hưởng tồn (người nhận, ghi chú, lý do xuất âm…) của mọi {label}, kể cả đã
                ghi sổ. Mã hàng, số lượng, kho, ngày phải giữ nguyên. Ô trống = giữ nguyên. Lấy file bằng “Tải mẫu
                cập nhật” ở nút ⋯ — file có sẵn các phiếu đang lọc.
              </>
            )}
          </Typography.Paragraph>
        </>
      ) : null}

      {state.step === 1 && result ? (
        <>
          <Alert
            className="mb-3"
            type={errorCount > 0 ? "error" : "success"}
            showIcon
            title={
              errorCount > 0
                ? `${n(errorCount)} lỗi — sửa file rồi chọn lại. Chưa có gì được nạp.`
                : `Sẵn sàng: ${n(result.documents)} ${label}, ${n(result.lines)} dòng hàng.`
            }
          />
          <Tabs
            items={[
              ...(errorCount > 0
                ? [{ key: "errors", label: `Lỗi (${n(errorCount)})`, children: <ImportIssuesTable issues={result.errors} fileName={`loi-${kind}.csv`} /> }]
                : []),
              ...(result.warnings.length > 0
                ? [{ key: "warnings", label: `Cảnh báo (${n(result.warnings.length)})`, children: <ImportIssuesTable issues={result.warnings} fileName={`canh-bao-${kind}.csv`} /> }]
                : []),
            ]}
          />
        </>
      ) : null}

      {state.step === 2 && result ? (
        <>
          <Result
            status={result.partial ? "warning" : "success"}
            title={
              activeMode === "moi"
                ? `Đã tạo ${n(result.created)} ${label} nháp`
                : `Đã cập nhật ${n(result.updated)} ${label}`
            }
            subTitle={result.partial ? `Nạp được ${n(result.partial.done)}/${n(result.partial.total)} phiếu. ${result.partial.message}` : "Mở từng phiếu để kiểm lại rồi ghi sổ."}
          />
          {result.warnings.length > 0 ? <ImportIssuesTable issues={result.warnings} fileName={`canh-bao-${kind}.csv`} /> : null}
        </>
      ) : null}
    </Modal>
  );
}
