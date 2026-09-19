"use client";

import { QueryState } from "@/shared/components/query-state";

import { useReceiptDetail, useReceiptLines } from "../hooks/useReceipts";
import { ReceiptPrintTemplate } from "./receipt-print-template";

export function ReceiptPrintPage({ id }: { id: string }) {
  const detail = useReceiptDetail(id);
  const lines = useReceiptLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(receipt) => receipt === null}
      emptyDescription="Không tìm thấy phiếu này."
    >
      {(receipt) =>
        receipt ? (
          <ReceiptPrintTemplate receipt={receipt} lines={lines.data ?? []} />
        ) : null
      }
    </QueryState>
  );
}
