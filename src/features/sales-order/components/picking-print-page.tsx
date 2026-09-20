"use client";

import { QueryState } from "@/shared/components/query-state";

import { useOrderDetail, useOrderLines } from "../hooks/useOrders";
import { PickingPrintTemplate } from "./picking-print-template";

export function PickingPrintPage({ id }: { id: string }) {
  const detail = useOrderDetail(id);
  const lines = useOrderLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(order) => order === null}
      emptyDescription="Không tìm thấy đơn này."
    >
      {(order) =>
        order ? <PickingPrintTemplate order={order} lines={lines.data ?? []} /> : null
      }
    </QueryState>
  );
}
