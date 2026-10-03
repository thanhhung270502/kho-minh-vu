"use client";

import { Button, Grid } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { DetailPanel } from "@/shared/components/detail-panel";
import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useAnalysisRows } from "@/features/analytics/hooks/useAnalytics";
import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";

import { useLookups, useProducts } from "../hooks/useProducts";
import { useProductTableUrl } from "../hooks/useProductTableUrl";
import { forecastById } from "../lib/product-expanded";
import {
  DEFAULT_PRODUCT_FILTER,
  countActiveFilters,
  type ProductFilter,
} from "../schemas/filter.schema";
import type { CatalogPermissions } from "../types";
import { BulkAssignBar } from "./bulk-assign-bar";
import type { ImportKind } from "./excel-button";
import { buildProductColumns } from "./product-columns";
import { ProductFilterPanel } from "./product-filter-panel";
import { ProductModals } from "./product-modals";
import { ProductRowDetail } from "./product-row-detail";
import { ProductTableBody } from "./product-table-body";
import { ProductToolbar } from "./product-toolbar";
import { ToolbarActions } from "./toolbar-actions";

export type { CatalogPermissions };

function hasActiveFilter(filter: ProductFilter): boolean {
  return (
    filter.categoryId !== null ||
    filter.stageId !== null ||
    filter.unitId !== null ||
    filter.stockStatus !== null ||
    filter.hasImage !== null ||
    filter.standard !== null ||
    filter.tradingStatus !== DEFAULT_PRODUCT_FILTER.tradingStatus
  );
}

export function ProductTable({
  permissions,
  extraActions,
  showForecast = false,
}: {
  permissions: CatalogPermissions;
  /** Nút do route ghép vào thanh công cụ — xem `danh-muc/page.tsx`. */
  extraActions?: ReactNode;
  /** Quản lý + văn phòng (view-analysis): hai cột Khách đặt / Dự kiến hết hàng. */
  showForecast?: boolean;
}) {
  const { filter, selectedId, navigate, selectProduct, toggleProduct } = useProductTableUrl();
  const products = useProducts(filter);
  const lookups = useLookups();
  // RPC phân tích chặn thủ kho / chỉ xem (0079) — không gọi khi không có quyền.
  const analysis = useAnalysisRows(30, { enabled: showForecast });
  const forecastMap = useMemo(() => forecastById(analysis.data ?? []), [analysis.data]);
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null; copyFromId?: string | null }>({
    open: false,
    id: null,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState<ImportKind | null>(null);

  // Bảng lưu MÃ hãng / dòng / linh kiện — tên tra bộ mã hóa ngay trên trình duyệt.
  const { dictionary } = useCodeDictionary();

  // Từ 768px chi tiết mở ngay dưới dòng; điện thoại quá chật cho dòng mở rộng.
  const wide = Grid.useBreakpoint().md ?? false;
  const renderDetail = (id: string) => (
    <ProductRowDetail
      productId={id}
      forecast={showForecast ? (forecastMap.get(id) ?? null) : undefined}
      canEdit={permissions.canEdit}
      onEdit={(editId) => setDrawer({ open: true, id: editId })}
      onCopy={(fromId) => setDrawer({ open: true, id: null, copyFromId: fromId })}
    />
  );


  /**
   * Người dùng đổi bộ lọc thì tập đang chọn không còn nghĩa — bỏ chọn để không
   * gán hàng loạt nhầm sang những mã họ không còn nhìn thấy. Tách khỏi
   * `navigate` vì việc tự về trang 1 (trong effect bên dưới) không được phép
   * setState.
   */
  const changeFilter = useCallback(
    (next: ProductFilter) => {
      setSelected([]);
      navigate(next);
    },
    [navigate],
  );

  const rows = products.data?.rows ?? [];
  // Mã đang chọn không nằm trên trang này (vừa ngừng kinh doanh nên bị lọc ẩn,
  // hoặc mở bằng link) → không có dòng để mở rộng, dùng ngăn kéo thay.
  const selectedOffPage =
    selectedId !== null && !products.isPending && !rows.some((row) => row.id === selectedId);
  const total = products.data?.total ?? 0;

  // Trang cuối rỗng sau khi lọc lại — quay về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (products.isPending || products.isFetching) return;
    if (filter.page > 1 && rows.length === 0) navigate({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.isPending, products.isFetching, rows.length, filter.page]);

  const columns = buildProductColumns({
    filter,
    canEdit: permissions.canEdit,
    lookups: lookups.data,
    dictionary,
    onEdit: (id) => setDrawer({ open: true, id }),
    forecasts: showForecast ? { byId: forecastMap, loading: analysis.isPending } : null,
  });

  return (
    <>
      <ListLayout
        filterPanel={
          <ProductFilterPanel
            filter={filter}
            lookups={lookups.data}
            onChange={changeFilter}
          />
        }
        toolbar={
          <ProductToolbar
            filter={filter}
            onChange={changeFilter}
            secondaryActions={
              <ToolbarActions
                filter={filter}
                total={total}
                canEdit={permissions.canEdit}
                canFillStandard={permissions.canFillStandard}
                extraActions={extraActions}
                onOpenImport={setImportOpen}
              />
            }
            addButton={
              permissions.canEdit ? (
                <Button
                  type="primary"
                  onClick={() => setDrawer({ open: true, id: null })}
                >
                  Thêm mã hàng
                </Button>
              ) : null
            }
          />
        }
        activeFilterCount={countActiveFilters(filter)}
        detailPanel={
          selectedId && (!wide || selectedOffPage) ? (
            <DetailPanel title="Chi tiết mã hàng" forceDrawer onClose={() => selectProduct(null)}>
              {renderDetail(selectedId)}
            </DetailPanel>
          ) : null
        }
      >
        {permissions.canEdit ? (
          <BulkAssignBar
            ids={selected}
            lookups={lookups.data}
            onDone={() => setSelected([])}
          />
        ) : null}

        <QueryState
          query={products}
          isEmpty={(page) => page.rows.length === 0}
          emptyDescription={
            filter.q ? (
              `Không có mã khớp “${filter.q}”. Thử gõ ít chữ hơn hoặc bỏ dấu.`
            ) : hasActiveFilter(filter) ? (
              <div className="flex flex-col items-center gap-3">
                <span>Không có mã nào khớp bộ lọc. Xóa bớt điều kiện.</span>
                <Button size="small" onClick={() => changeFilter(DEFAULT_PRODUCT_FILTER)}>
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              "Chưa có mã hàng nào. Bấm “Thêm mã hàng” hoặc nhập từ Excel."
            )
          }
        >
          {(page) => (
            <ProductTableBody
              columns={columns}
              rows={page.rows}
              total={total}
              filter={filter}
              hasSelection={permissions.canEdit}
              selected={selected}
              onSelectionChange={setSelected}
              loading={products.isFetching && !products.isPending}
              onFilterChange={changeFilter}
              selectedId={selectedId}
              onRowClick={toggleProduct}
              renderExpanded={wide ? (row) => renderDetail(row.id) : undefined}
            />
          )}
        </QueryState>
      </ListLayout>

      <ProductModals
        importOpen={importOpen}
        onCloseImport={() => setImportOpen(null)}
        onViewRecentlyEdited={() => {
          setImportOpen(null);
          changeFilter({
            ...DEFAULT_PRODUCT_FILTER,
            sortBy: "updatedAt",
            sortDir: "desc",
          });
        }}
        drawer={drawer}
        onCloseDrawer={() => setDrawer((state) => ({ ...state, open: false }))}
      />
    </>
  );
}
