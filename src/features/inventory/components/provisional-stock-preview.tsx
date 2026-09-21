"use client";

import {
  Alert,
  Button,
  Select,
  Statistic,
  Steps,
  Typography,
  Upload,
  theme,
} from "antd";
import Link from "next/link";

// Tiền lệ stock-in / useInventory: danh mục tra cứu (kho) chỉ có một nguồn.
import { useLookups } from "@/features/products/hooks/useProducts";
import { MAX_FILE_MB } from "@/features/products/lib/excel-template";

import { useProvisionalStockFlow } from "../hooks/useProvisionalStockFlow";
import { ProvisionalStockIssues } from "./provisional-stock-issues";

/**
 * Màn nạp tồn tạm ba bước — nằm trong thân trang, không bọc Modal. Chọn file là
 * gửi ngay ở chế độ "kiem_tra" (chỉ xem trước); chỉ nút "Nạp thật" mới gửi chế
 * độ "nap" (trường `che_do` của route, xem `useProvisionalStockFlow`).
 */
export function ProvisionalStockPreview() {
  const lookups = useLookups();
  const { token } = theme.useToken();
  const { state, selectFile, changeWarehouse, commit, reset } =
    useProvisionalStockFlow();

  const result = state.result;
  const warehouseOptions = [
    { value: "", label: "Không chọn — mã chưa có kho mặc định sẽ báo lỗi" },
    ...(lookups.data?.warehouses ?? []).map((w) => ({
      value: w.id,
      label: w.name,
    })),
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Alert
        type="warning"
        showIcon
        title="Số nạp ở đây là SỐ TẠM từ KiotViet, chưa đếm thực tế"
        description="Dùng để các màn tồn kho có dữ liệu mà kiểm. Đây không phải tồn đầu kỳ chính thức: kiểm kê sẽ đè lên bằng phiếu điều chỉnh riêng. Mã nào đã có chứng từ thật trên hệ mới sẽ bị bỏ qua, không bao giờ nạp đè."
      />

      <Steps
        size="small"
        current={state.step}
        items={[
          { title: "Chọn file" },
          { title: "Xem trước" },
          { title: "Kết quả" },
        ]}
      />

      {state.error ? (
        <Alert
          type="error"
          showIcon
          title={state.error.title}
          description={state.error.action}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <Typography.Text strong>
          Kho áp dụng cho mã chưa có kho mặc định
        </Typography.Text>
        <Select
          className="w-full max-w-md"
          value={state.warehouseId}
          options={warehouseOptions}
          loading={lookups.isPending}
          disabled={state.submitting || state.step === 2}
          onChange={changeWarehouse}
        />
        {lookups.isError ? (
          <Typography.Text type="danger">
            Không tải được danh sách kho — vẫn nạp được mã đã có kho mặc định.{" "}
            <Button
              type="link"
              size="small"
              onClick={() => void lookups.refetch()}
            >
              Thử lại
            </Button>
          </Typography.Text>
        ) : null}
      </div>

      {state.step === 0 ? (
        <div>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            showUploadList={false}
            disabled={state.submitting}
            beforeUpload={selectFile}
          >
            <p className="px-4 py-6">
              {state.submitting
                ? "Đang đọc file và kiểm từng mã…"
                : "Kéo file danh mục KiotViet (DanhSachSanPham_KV….xlsx) vào đây, hoặc bấm để chọn."}
            </p>
          </Upload.Dragger>
          <Typography.Paragraph type="secondary" className="mt-2 mb-0">
            Tối đa {MAX_FILE_MB}MB. Chọn file chỉ KIỂM, chưa ghi gì vào sổ kho.
          </Typography.Paragraph>
        </div>
      ) : null}

      {state.step >= 1 && result ? (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Statistic
              title={result.committed ? "Đã nạp" : "Sẽ nạp"}
              value={result.toLoad}
              groupSeparator="."
              styles={{ content: { color: token.colorSuccess } }}
            />
            <Statistic
              title="Bỏ qua (đã có chứng từ thật hoặc tồn 0)"
              value={result.skipped}
              groupSeparator="."
            />
            <Statistic
              title="Lỗi"
              value={result.errorCount}
              groupSeparator="."
              styles={
                result.errorCount > 0
                  ? { content: { color: token.colorError } }
                  : undefined
              }
            />
          </div>
          {result.totalQuantity !== null ? (
            <Typography.Text type="secondary">
              Tổng số lượng sẽ nạp (cộng cả mã tồn âm):{" "}
              {result.totalQuantity.toLocaleString("vi-VN", {
                maximumFractionDigits: 4,
              })}
              . Đối chiếu với tổng tồn trên KiotViet trước khi bấm nạp.
            </Typography.Text>
          ) : null}
          <ProvisionalStockIssues
            errors={result.errors}
            skippedRows={result.skippedRows}
          />
        </>
      ) : null}

      {state.step === 1 && result ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={state.submitting} onClick={reset}>
            Chọn file khác
          </Button>
          <Button
            type="primary"
            loading={state.submitting}
            disabled={result.toLoad === 0}
            onClick={commit}
          >
            {result.toLoad === 0
              ? "Không còn mã nào cần nạp"
              : `Nạp thật ${result.toLoad.toLocaleString("vi-VN")} mã`}
          </Button>
        </div>
      ) : null}

      {state.step === 2 && result ? (
        <>
          {result.committed ? (
            <Alert
              type="success"
              showIcon
              title={`Đã tạo và ghi sổ phiếu điều chỉnh ${result.documentNo ?? ""}`}
              description="Ghi chú phiếu bắt đầu bằng nhãn [NAP_TON_TAM]. Số phiếu hiện trong thẻ kho của từng mã. Kiểm kê sau này đè lên bằng phiếu điều chỉnh khác, không xóa phiếu này."
            />
          ) : (
            <Alert
              type="info"
              showIcon
              title="Không tạo chứng từ nào"
              description={
                result.note ??
                "Không còn mã nào cần nạp — mọi mã đã có chứng từ thật, tồn 0 hoặc lỗi."
              }
            />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/ton-kho">Mở màn Tồn kho</Link>
            <Button onClick={reset}>Kiểm file khác</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
