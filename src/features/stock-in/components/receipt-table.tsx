"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useReceipts } from "../hooks/useReceipts";
import {
  DEFAULT_RECEIPT_FILTER,
  countActiveReceiptFilters,
  readReceiptFilterFromUrl,
  writeReceiptFilterToUrl,
  type ReceiptFilter,
} from "../schemas/receipt.schema";
import { CreateReceiptButton } from "./create-receipt-button";
import { ReceiptFilterPanel } from "./receipt-filter-panel";
import { ReceiptTableBody } from "./receipt-table-body";
import { ReceiptToolbar } from "./receipt-toolbar";

export function ReceiptTable({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(
    () => readReceiptFilterFromUrl(searchParams),
    [searchParams],
  );
  const receipts = useReceipts(filter);
  const [createOpen, setCreateOpen] = useState(false);

  const changeFilter = useCallback(
    (next: ReceiptFilter) => {
      const query = writeReceiptFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const rows = receipts.data?.rows ?? [];
  const total = receipts.data?.total ?? 0;

  // Trang cuối cạn sau khi lọc lại — về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (receipts.isPending || receipts.isFetching) return;
    if (filter.page > 1 && rows.length === 0) changeFilter({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts.isPending, receipts.isFetching, rows.length, filter.page]);

  const hasActiveFilter = countActiveReceiptFilters(filter) > 0;

  return (
    <>
      <ListLayout
        activeFilterCount={countActiveReceiptFilters(filter)}
        filterPanel={<ReceiptFilterPanel filter={filter} onChange={changeFilter} />}
        toolbar={
          <ReceiptToolbar
            filter={filter}
            onChange={changeFilter}
            addButton={
              canCreate ? (
                <Button type="primary" onClick={() => setCreateOpen(true)}>
                  Tạo phiếu nhập
                </Button>
              ) : null
            }
          />
        }
      >
        <QueryState
          query={receipts}
          isEmpty={(page) => page.rows.length === 0}
          emptyDescription={
            filter.q ? (
              `Không có phiếu nào khớp “${filter.q}”.`
            ) : hasActiveFilter ? (
              <div className="flex flex-col items-center gap-3">
                <span>Không có phiếu nào khớp bộ lọc.</span>
                <Button
                  size="small"
                  onClick={() => changeFilter(DEFAULT_RECEIPT_FILTER)}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              "Chưa có phiếu nhập nào. Bấm “Tạo phiếu nhập” để ghi chuyến hàng đầu tiên."
            )
          }
        >
          {(page) => (
            <ReceiptTableBody
              rows={page.rows}
              total={total}
              filter={filter}
              loading={receipts.isFetching && !receipts.isPending}
              onFilterChange={changeFilter}
            />
          )}
        </QueryState>
      </ListLayout>

      <CreateReceiptButton open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
