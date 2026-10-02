"use client";

import { Alert, Button, Modal, Select } from "antd";
import { useMemo, useReducer } from "react";

import { explainError } from "@/shared/lib/errors";

import { ExcelImportError } from "../../api/excel-import.api";
import { useLookups } from "../../hooks/useProducts";
import {
  useDownloadNewProductErrors,
  useImportNewProducts,
  useReadNewProductFile,
} from "../../hooks/useNewProductImport";
import {
  draftProblems,
  toErrorExportRows,
  toImportPayload,
} from "../../lib/new-product-import";
import { INITIAL_IMPORT_STATE, importReducer } from "../../lib/new-product-import-state";
import { BulkApplyBar } from "./bulk-apply-bar";
import { FilePicker } from "./file-picker";
import { ImportSummary } from "./import-summary";
import { PreviewTable } from "./preview-table";

type Problem = { title: string; action: string };

function toProblem(error: unknown): Problem {
  if (error instanceof ExcelImportError) return { title: error.title, action: error.action };
  return explainError(error);
}

/** "Nhập mã hàng mới" (Phase 15): file 4 cột → chọn trường trên màn → nạp, dòng lỗi bỏ qua. */
export function NewProductImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lookups = useLookups();
  const read = useReadNewProductFile();
  const save = useImportNewProducts();
  const download = useDownloadNewProductErrors();
  const [state, dispatch] = useReducer(importReducer, INITIAL_IMPORT_STATE);

  const problems = useMemo(() => draftProblems(state.drafts, state.catalog), [state.drafts, state.catalog]);
  const validCount = state.drafts.length - problems.size;
  const warehouseId = state.warehouseId ?? lookups.data?.warehouses[0]?.id ?? null;
  const busy = read.isPending || save.isPending;

  function pick(file: File) {
    read.reset();
    const defaultUnitId = lookups.data?.units.find((u) => u.code === "CAI")?.id ?? null;
    read.mutate(
      { file, defaultUnitId },
      { onSuccess: ({ drafts, catalog }) => dispatch({ type: "loaded", drafts, catalog }) },
    );
  }

  function submit() {
    save.mutate(
      { rows: toImportPayload(state.drafts, problems), warehouseId },
      { onSuccess: (result) => dispatch({ type: "done", result, problems }) },
    );
  }

  function downloadErrors(map: Map<number, string[]>) {
    download.mutate(toErrorExportRows(state.drafts, map));
  }

  function close() {
    if (busy) return;
    dispatch({ type: "reset" });
    read.reset();
    save.reset();
    onClose();
  }

  const saveError = save.error ? toProblem(save.error) : null;
  const downloadError = download.error ? toProblem(download.error) : null;

  return (
    <Modal
      open={open}
      title="Nhập mã hàng mới từ Excel"
      width={1280}
      closable={!busy}
      mask={{ closable: !busy }}
      onCancel={close}
      destroyOnHidden
      footer={
        state.step === "preview"
          ? [
              <Button key="other" disabled={busy} onClick={() => dispatch({ type: "reset" })}>
                Chọn file khác
              </Button>,
              <Button key="save" type="primary" loading={save.isPending} disabled={validCount === 0} onClick={submit}>
                Nhập {validCount.toLocaleString("vi-VN")} mã
              </Button>,
            ]
          : state.step === "done"
            ? [
                <Button key="close" type="primary" onClick={close}>
                  Đóng
                </Button>,
              ]
            : null
      }
    >
      {state.step === "pick" ? (
        <FilePicker reading={read.isPending} error={read.error ? toProblem(read.error) : null} onPick={pick} />
      ) : null}

      {state.step === "preview" ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">
              <b>{validCount.toLocaleString("vi-VN")}</b> dòng sẽ nhập ·{" "}
              <span className={problems.size > 0 ? "text-red-600" : undefined}>
                {problems.size.toLocaleString("vi-VN")} dòng lỗi bị bỏ qua
              </span>
            </span>
            {problems.size > 0 ? (
              <Button size="small" loading={download.isPending} onClick={() => downloadErrors(problems)}>
                Tải file dòng lỗi
              </Button>
            ) : null}
            <span className="ml-auto flex items-center gap-2 text-sm">
              Ghi tồn vào kho
              <Select
                size="small"
                className="w-36"
                value={warehouseId ?? undefined}
                options={(lookups.data?.warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
                onChange={(id: string) => dispatch({ type: "warehouse", id })}
              />
            </span>
          </div>

          {saveError ? <Alert type="error" showIcon title={saveError.title} description={saveError.action} /> : null}
          {downloadError ? (
            <Alert type="error" showIcon title={downloadError.title} description={downloadError.action} />
          ) : null}

          <BulkApplyBar
            count={state.selected.length}
            lookups={lookups.data}
            onApply={(patch) => dispatch({ type: "edit", rows: state.selected, patch })}
            onClear={() => dispatch({ type: "select", rows: [] })}
          />
          <div className="overflow-x-auto">
            <PreviewTable
              rows={state.drafts}
              problems={problems}
              lookups={lookups.data}
              selected={state.selected}
              onSelect={(rows) => dispatch({ type: "select", rows })}
              onChange={(row, patch) => dispatch({ type: "edit", rows: [row], patch })}
            />
          </div>
        </div>
      ) : null}

      {state.step === "done" && state.result ? (
        <>
          {downloadError ? (
            <Alert className="mb-3" type="error" showIcon title={downloadError.title} description={downloadError.action} />
          ) : null}
          <ImportSummary
            result={state.result}
            errorCount={state.finalProblems.size}
            downloading={download.isPending}
            onDownloadErrors={() => downloadErrors(state.finalProblems)}
          />
        </>
      ) : null}
    </Modal>
  );
}
