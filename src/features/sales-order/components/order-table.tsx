"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useOrders } from "../hooks/useOrders";
import {
  DEFAULT_ORDER_FILTER,
  countActiveOrderFilters,
  readOrderFilterFromUrl,
  writeOrderFilterToUrl,
  type OrderFilter,
} from "../schemas/order.schema";
import { CreateOrderButton } from "./create-order-button";
import { OrderFilterPanel } from "./order-filter-panel";
import { OrderTableBody } from "./order-table-body";
import { OrderToolbar } from "./order-toolbar";

export function OrderTable({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(() => readOrderFilterFromUrl(searchParams), [searchParams]);
  const orders = useOrders(filter);

  const changeFilter = useCallback(
    (next: OrderFilter) => {
      const query = writeOrderFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const rows = orders.data?.items ?? [];
  const total = orders.data?.total ?? 0;

  // Trang cuối cạn sau khi lọc lại — về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (orders.isPending || orders.isFetching) return;
    if (filter.page > 1 && rows.length === 0) changeFilter({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.isPending, orders.isFetching, rows.length, filter.page]);

  const hasActiveFilter = countActiveOrderFilters(filter) > 0;

  return (
    <ListLayout
      activeFilterCount={countActiveOrderFilters(filter)}
      filterPanel={<OrderFilterPanel filter={filter} onChange={changeFilter} />}
      toolbar={
        <OrderToolbar
          filter={filter}
          onChange={changeFilter}
          addButton={canCreate ? <CreateOrderButton /> : null}
        />
      }
    >
      <QueryState
        query={orders}
        isEmpty={(page) => page.items.length === 0}
        emptyDescription={
          filter.q ? (
            `Không có đơn nào khớp “${filter.q}”.`
          ) : hasActiveFilter ? (
            <div className="flex flex-col items-center gap-3">
              <span>Không có đơn nào khớp bộ lọc.</span>
              <Button size="small" onClick={() => changeFilter(DEFAULT_ORDER_FILTER)}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span>Chưa có đơn đặt hàng nào.</span>
              {canCreate ? <CreateOrderButton label="Tạo đơn đầu tiên" /> : null}
            </div>
          )
        }
      >
        {(page) => (
          <OrderTableBody
            rows={page.items}
            total={total}
            filter={filter}
            loading={orders.isFetching && !orders.isPending}
            onFilterChange={changeFilter}
          />
        )}
      </QueryState>
    </ListLayout>
  );
}
