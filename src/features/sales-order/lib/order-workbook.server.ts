import ExcelJS from "exceljs";

import {
  RECIPIENT_KIND_LABELS,
  formatOrderRecipients,
  recipientKindOf,
} from "@/shared/lib/recipient";

import type { OrderRow } from "../types";
import { ORDER_STATUS_LABELS } from "./order-status";
import { orderProgress } from "./order-progress";

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export async function buildOrderWorkbook(rows: OrderRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Đơn đặt", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "Số đơn", key: "no", width: 16 },
    { header: "Ngày đơn", key: "date", width: 12 },
    { header: "Loại", key: "kind", width: 12 },
    { header: "Người nhận", key: "recipients", width: 34 },
    { header: "SL đặt", key: "ordered", width: 12, style: { numFmt: "#,##0.##" } },
    { header: "SL đã xuất", key: "shipped", width: 12, style: { numFmt: "#,##0.##" } },
    { header: "Tiến độ %", key: "percent", width: 11 },
    { header: "Trạng thái", key: "status", width: 16 },
    { header: "Người tạo", key: "creator", width: 22 },
    { header: "Ghi chú", key: "note", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    ws.addRow({
      no: r.orderNo,
      date: formatDate(r.orderDate),
      kind: RECIPIENT_KIND_LABELS[recipientKindOf(r.recipients)],
      recipients: formatOrderRecipients(r.recipients),
      ordered: r.orderedQuantity,
      shipped: r.shippedQuantity,
      percent: orderProgress(r.shippedQuantity, r.orderedQuantity).percent ?? "",
      status: ORDER_STATUS_LABELS[r.status],
      creator: r.createdByName ?? "",
      note: r.note ?? "",
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
