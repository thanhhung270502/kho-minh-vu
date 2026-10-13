"use client";

import { QueryState } from "@/shared/components/query-state";

import { useCountSheet, useStocktakeSession } from "../hooks/useStocktake";
import { StocktakePrintTemplate } from "./stocktake-print-template";

export function StocktakePrintPage({ id }: { id: string }) {
  const session = useStocktakeSession(id);
  const sheet = useCountSheet(id);

  return (
    <QueryState
      query={session}
      isEmpty={(data) => data === null}
      emptyDescription="Không tìm thấy phiên kiểm kê này, hoặc phiên thuộc kho bạn không được phân."
    >
      {(data) =>
        data ? (
          <QueryState
            query={sheet}
            isEmpty={(rows) => rows.length === 0}
            emptyDescription="Phiên này không có mã nào để kiểm."
          >
            {(rows) => <StocktakePrintTemplate session={data} rows={rows} />}
          </QueryState>
        ) : null
      }
    </QueryState>
  );
}
