"use client";

import { Button, Table, Typography } from "antd";
import type { TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useInventory } from "../hooks/useInventory";
import {
  DEFAULT_INVENTORY_FILTER,
  INVENTORY_PAGE_SIZES,
  INVENTORY_SORT_FIELDS,
  countActiveInventoryFilters,
  readInventoryFilterFromUrl,
  writeInventoryFilterToUrl,
  type InventoryFilter,
  type InventorySortField,
} from "../schemas/inventory.schema";
import type { InventoryRow } from "../types";
import { buildStockColumns } from "./stock-columns";
import { StockFilterPanel } from "./stock-filter-panel";
import { StockToolbar } from "./stock-toolbar";

type Props = {
  /** Chỉ quản lý nạp được tồn tạm — RPC `nap_ton_tam` chặn mọi vai trò khác. */
  canLoadProvisionalStock: boolean;
};

export function StockTable({ canLoadProvisionalStock }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL là nguồn sự thật của bộ lọc: refresh hay gửi link đều giữ nguyên điều kiện.
  const filter = useMemo(
    () => readInventoryFilterFromUrl(searchParams),
    [searchParams],
  );
  const inventory = useInventory(filter);
  const lookups = useLookups();

  const changeFilter = useCallback(
    (next: InventoryFilter) => {
      const query = writeInventoryFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  const rows = inventory.data?.rows ?? [];
  const total = inventory.data?.total ?? 0;

  // Trang cuối cạn sau khi lọc lại — về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (inventory.isPending || inventory.isFetching) return;
    if (filter.page > 1 && rows.length === 0)
      changeFilter({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory.isPending, inventory.isFetching, rows.length, filter.page]);

  // Lọc một kho thì RPC chỉ cộng tồn của kho đó — cột của kho còn lại sẽ toàn số 0
  // giả, nên chỉ giữ cột của kho đang lọc.
  const allWarehouses = lookups.data?.warehouses ?? [];
  const warehouses = filter.warehouseId
    ? allWarehouses.filter((warehouse) => warehouse.id === filter.warehouseId)
    : allWarehouses;
  const columns = buildStockColumns({ filter, warehouses });
  const tableWidth = columns.reduce(
    (sum, column) =>
      sum + (typeof column.width === "number" ? column.width : 0),
    0,
  );

  const activeFilterCount = countActiveInventoryFilters(filter);
  const clearFilters = () =>
    changeFilter({ ...DEFAULT_INVENTORY_FILTER, pageSize: filter.pageSize });

  // Chỉ nói "tồn bằng 0" khi đang xem cả danh mục — có bộ lọc thì trang toàn 0 là
  // chuyện bình thường (vd: lọc "Hết hàng").
  const pageHasNoStock =
    activeFilterCount === 0 &&
    filter.q === "" &&
    rows.length > 0 &&
    rows.every((row) => row.totalStock === 0);

  function handleTableChange(
    pagination: TablePaginationConfig,
    sorter: SorterResult<InventoryRow> | SorterResult<InventoryRow>[],
  ) {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = active?.columnKey as InventorySortField | undefined;
    const sortable =
      field !== undefined && INVENTORY_SORT_FIELDS.includes(field);

    changeFilter({
      ...filter,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? filter.pageSize,
      sortBy: sortable && active?.order ? field : null,
      sortDir: active?.order === "descend" ? "desc" : "asc",
    });
  }

  return (
    <ListLayout
      activeFilterCount={activeFilterCount}
      filterPanel={<StockFilterPanel filter={filter} onChange={changeFilter} />}
      toolbar={<StockToolbar filter={filter} onChange={changeFilter} />}
    >
      <QueryState
        query={inventory}
        isEmpty={(result) => result.rows.length === 0}
        emptyDescription={
          filter.q ? (
            `Không có mã khớp “${filter.q}”. Thử gõ ít chữ hơn hoặc bỏ dấu.`
          ) : activeFilterCount > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <span>
                {filter.stockStatus === "duoi_dinh_muc"
                  ? "Không có mã nào dưới định mức. Mã chưa đặt định mức tồn tối thiểu chỉ vào danh sách này khi tồn âm."
                  : "Không có mã nào khớp bộ lọc. Xóa bớt điều kiện."}
              </span>
              <Button size="small" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <span>
              Chưa có mã hàng nào đang kinh doanh. Thêm mã ở{" "}
              <Link href="/danh-muc">Danh mục hàng</Link>.
            </span>
          )
        }
      >
        {(result) => (
          <>
            {/* Thủ kho mở trên điện thoại: bảng cuộn ngang trong khung riêng. */}
            <div className="overflow-x-auto">
              <Table<InventoryRow>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={result.rows}
                loading={inventory.isFetching && !inventory.isPending}
                scroll={{ x: tableWidth }}
                onChange={(pagination, _filters, sorter) =>
                  handleTableChange(pagination, sorter)
                }
                pagination={{
                  current: filter.page,
                  pageSize: filter.pageSize,
                  total,
                  showSizeChanger: true,
                  pageSizeOptions: [...INVENTORY_PAGE_SIZES],
                  showTotal: (count) => `${count.toLocaleString("vi-VN")} mã`,
                }}
              />
            </div>

            {pageHasNoStock ? (
              <Typography.Text type="secondary" className="mt-2 block text-xs">
                Tồn của mọi mã trên trang này đang bằng 0 — tồn chỉ đổi khi có
                chứng từ ghi sổ, không sửa tay được.{" "}
                {canLoadProvisionalStock ? (
                  <Link href="/ton-kho/nap-tam">Nạp tồn tạm từ KiotViet</Link>
                ) : null}
              </Typography.Text>
            ) : null}
          </>
        )}
      </QueryState>
    </ListLayout>
  );
}
