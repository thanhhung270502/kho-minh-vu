"use client";

import { Alert, Button, Statistic } from "antd";

import type { NewProductImportResult } from "../../api/new-product-import.api";

type Props = {
  result: NewProductImportResult;
  errorCount: number;
  downloading: boolean;
  onDownloadErrors: () => void;
};

/** Bước cuối: số mã đã thêm, phiếu điều chỉnh tồn, dòng bị bỏ qua (IMP-03/04). */
export function ImportSummary({ result, errorCount, downloading, onDownloadErrors }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Statistic title="Mã đã thêm" value={result.added} />
        <Statistic title="Dòng bỏ qua" value={errorCount} />
        <Statistic title="Phiếu điều chỉnh tồn" value={result.docNo ?? "Không cần"} />
      </div>

      {result.docNo ? (
        <Alert
          type="success"
          showIcon
          title={`Tồn trong file đã vào sổ bằng phiếu ${result.docNo}`}
          description="Phiếu đã ghi sổ. Thẻ kho của từng mã hiện dòng điều chỉnh mang số phiếu này."
        />
      ) : null}

      {errorCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={`${errorCount} dòng chưa nhập`}
          description="Tải file dòng lỗi, sửa theo cột Lý do rồi nhập lại file đó."
          action={
            <Button size="small" loading={downloading} onClick={onDownloadErrors}>
              Tải file dòng lỗi
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
