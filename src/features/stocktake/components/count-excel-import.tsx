"use client";

import { App, Alert, Button, Select, Tooltip, Typography, Upload } from "antd";
import { useEffect, useMemo, useState } from "react";

import { MAX_FILE_MB } from "@/features/products/lib/excel-template";

import { countTemplateUrl } from "../api/count-import.api";
import { useCountImport } from "../hooks/useCountImport";
import { useCountSheet } from "../hooks/useStocktake";
import { CountImportResultView } from "./count-import-result";

type Props = { sessionId: string; editable: boolean };

const ALL_CATEGORIES = "";

/**
 * Đường nhập số đếm bằng Excel — dành cho đợt đếm đầu kỳ D-01 (giấy/Excel ngoài
 * hệ rồi nhập lại). Ba khối: tải file mẫu theo nhóm → chọn file đã điền → xem
 * kiểm tra rồi nạp. Khuôn `provisional-stock-preview.tsx`.
 */
export function CountExcelImport({ sessionId, editable }: Props) {
  const { message } = App.useApp();
  const sheet = useCountSheet(sessionId, ALL_CATEGORIES);
  const { state, check, load, reset } = useCountImport(sessionId);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of sheet.data ?? []) {
      seen.set(row.categoryId, row.categoryName);
    }
    return [
      { value: ALL_CATEGORIES, label: "Toàn phạm vi phiên" },
      ...Array.from(seen, ([value, label]) => ({ value, label })),
    ];
  }, [sheet.data]);

  const result = state.result;

  // Nạp thành công thật sự (không phải chỉ chuyển bước "loaded" — RPC vẫn có
  // thể trả loaded=false nếu race condition sinh lỗi mới giữa lúc kiểm và nạp).
  useEffect(() => {
    if (state.step === "loaded" && result?.loaded) {
      void message.success(
        `Đã nạp ${(result.newCount + result.overwriteCount).toLocaleString("vi-VN")} số đếm`,
      );
    }
  }, [state.step, result, message]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography.Text strong>1. Tải file mẫu</Typography.Text>
        <Typography.Paragraph type="secondary" className="mb-0">
          Mỗi nhóm một file. File không có số tồn — người đếm điền cột Số đếm. Để trống = chưa
          đếm.
        </Typography.Paragraph>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-full max-w-xs"
            value={categoryId}
            options={categoryOptions}
            loading={sheet.isPending}
            onChange={setCategoryId}
          />
          <a
            href={countTemplateUrl(sessionId, categoryId || undefined)}
            download
            className="ant-btn ant-btn-default"
          >
            Tải file mẫu nhóm này
          </a>
        </div>
      </div>

      {!editable ? (
        <Alert
          type="warning"
          showIcon
          title="Phiên đã duyệt/hủy — không nhập được"
          description="File mẫu vẫn tải được để in giấy, nhưng không nạp số đếm vào phiên này nữa."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Typography.Text strong>2. Nhập file đã điền</Typography.Text>
            <Upload.Dragger
              accept=".xlsx"
              maxCount={1}
              showUploadList={false}
              disabled={state.submitting}
              beforeUpload={check}
            >
              <p className="px-4 py-6">
                {state.submitting
                  ? "Đang đọc file và kiểm từng mã…"
                  : "Kéo file đã điền số đếm vào đây, hoặc bấm để chọn."}
              </p>
            </Upload.Dragger>
            <Typography.Paragraph type="secondary" className="mb-0">
              Tối đa {MAX_FILE_MB}MB. Chọn file chỉ KIỂM, chưa ghi gì vào sổ kiểm kê.
            </Typography.Paragraph>
          </div>

          {state.error ? (
            <Alert
              type="error"
              showIcon
              title={state.error.title}
              description={state.error.action}
              action={
                state.step === "checked" ? (
                  <Button size="small" onClick={load}>
                    Thử lại
                  </Button>
                ) : undefined
              }
            />
          ) : null}

          {result ? (
            <div className="flex flex-col gap-3">
              <Typography.Text strong>3. Kết quả kiểm tra</Typography.Text>
              <CountImportResultView result={result} />

              {state.step === "checked" ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={state.submitting} onClick={reset}>
                    Chọn file khác
                  </Button>
                  <Tooltip
                    title={
                      result.errorCount > 0
                        ? "Sửa hết dòng lỗi trong file rồi tải lại — không nạp nửa vời"
                        : ""
                    }
                  >
                    <span>
                      <Button
                        type="primary"
                        loading={state.submitting}
                        disabled={result.errorCount > 0}
                        onClick={load}
                      >
                        Nạp số đếm
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              ) : null}

              {state.step === "loaded" ? (
                <>
                  {result.loaded ? (
                    <Alert
                      type="success"
                      showIcon
                      title={`Đã nạp ${(result.newCount + result.overwriteCount).toLocaleString("vi-VN")} số đếm`}
                    />
                  ) : (
                    <Alert
                      type="error"
                      showIcon
                      title="Không nạp được — còn dòng lỗi"
                      description={
                        result.reason ??
                        "Có mã bị lỗi mới phát sinh sau khi kiểm — sửa lại file rồi tải lên lần nữa."
                      }
                    />
                  )}
                  <div>
                    <Button onClick={reset}>Nạp file khác</Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
