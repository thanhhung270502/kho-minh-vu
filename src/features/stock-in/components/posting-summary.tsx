"use client";

import { Alert, Typography } from "antd";

import type { DocumentDetail, DocumentLine } from "../types";

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

/** Hiện trước khi bấm ghi sổ — người dùng phải biết hậu quả trước, không sau. */
export function PostingSummary({
  receipt,
  lines,
}: {
  receipt: DocumentDetail;
  lines: DocumentLine[];
}) {
  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const totalAmount = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );
  const affectedWarehouses = [
    ...new Set(lines.map((line) => line.warehouseName).filter(Boolean)),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Typography.Paragraph className="mb-0">
        Phiếu <strong className="font-mono">{receipt.docNo}</strong> — {lines.length}{" "}
        dòng, tổng số lượng <strong>{formatNumber(totalQuantity)}</strong>, tổng tiền{" "}
        <strong>{formatNumber(totalAmount)}</strong>.
      </Typography.Paragraph>

      <Typography.Paragraph className="mb-0">
        Tồn sẽ tăng ở:{" "}
        <strong>
          {affectedWarehouses.join(", ") || (receipt.warehouseName ?? "—")}
        </strong>
        .
      </Typography.Paragraph>

      <Alert
        type="warning"
        showIcon
        title="Ghi sổ xong không sửa được"
        description="Sai thì phải hủy phiếu và lập lại. Giá vốn đã tính sẽ KHÔNG tự quay về số cũ — bình quân gia quyền là trung bình lịch sử, không hoàn tác được."
      />
    </div>
  );
}
