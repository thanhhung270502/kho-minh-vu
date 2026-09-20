"use client";

import { QueryState } from "@/shared/components/query-state";

import { useIssueDetail, useIssueLines } from "../hooks/useIssues";
import { DeliveryPrintTemplate } from "./delivery-print-template";

export function DeliveryPrintPage({ id }: { id: string }) {
  const detail = useIssueDetail(id);
  const lines = useIssueLines(id);

  return (
    <QueryState
      query={detail}
      isEmpty={(issue) => issue === null}
      emptyDescription="Không tìm thấy phiếu này."
    >
      {(issue) =>
        issue ? <DeliveryPrintTemplate issue={issue} lines={lines.data ?? []} /> : null
      }
    </QueryState>
  );
}
