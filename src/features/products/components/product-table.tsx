"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useLookups, useProducts } from "../hooks/useProducts";
import {
  DEFAULT_PRODUCT_FILTER,
  countActiveFilters,
  readFilterFromUrl,
  writeFilterToUrl,
  type ProductFilter,
} from "../schemas/filter.schema";
import type { CatalogPermissions } from "../types";
import { BulkAssignBar } from "./bulk-assign-bar";
import { buildProductColumns } from "./product-columns";
import { ProductFilterPanel } from "./product-filter-panel";
import { ProductModals } from "./product-modals";
import { ProductTableBody } from "./product-table-body";
import { ProductToolbar } from "./product-toolbar";
import { ReviewActions } from "./review-actions";
import { ReviewAlert } from "./review-alert";

export type { CatalogPermissions };

function hasActiveFilter(filter: ProductFilter): boolean {
  return (
    filter.categoryId !== null ||
    filter.stageId !== null ||
    filter.unitId !== null ||
    filter.stockStatus !== null ||
    filter.needsReview ||
    filter.tradingStatus !== DEFAULT_PRODUCT_FILTER.tradingStatus
  );
}

export function ProductTable({ permissions }: { permissions: CatalogPermissions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(() => readFilterFromUrl(searchParams), [searchParams]);
  const products = useProducts(filter);
  const lookups = useLookups();
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [costImportOpen, setCostImportOpen] = useState(false);

  // Badge "Cần rà": lấy tổng từ chính RPC danh sách, không thêm RPC mới.
  const reviewCount = useProducts({
    ...DEFAULT_PRODUCT_FILTER,
    needsReview: true,
    tradingStatus: "all",
    pageSize: 10,
  });

  const navigate = useCallback(
    (next: ProductFilter) => {
      const query = writeFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
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
  const total = products.data?.total ?? 0;

  // Trang cuối rỗng sau khi lọc lại — quay về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (products.isPending || products.isFetching) return;
    if (filter.page > 1 && rows.length === 0) navigate({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.isPending, products.isFetching, rows.length, filter.page]);

  const columns = buildProductColumns({
    filter,
    canViewCost: permissions.canViewCost,
    canEdit: permissions.canEdit,
    lookups: lookups.data,
    onEdit: (id) => setDrawer({ open: true, id }),
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
              <ReviewActions
                onOpenCostImport={
                  permissions.canEditSalePrice ? () => setCostImportOpen(true) : undefined
                }
                filter={filter}
                total={total}
                reviewCount={reviewCount.data?.total ?? 0}
                canEdit={permissions.canEdit}
                onFilterChange={changeFilter}
                onOpenImport={() => setImportOpen(true)}
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
      >
        <ReviewAlert
          visible={filter.needsReview}
          canEdit={permissions.canEdit}
          onSuggest={() => setSuggestionsOpen(true)}
        />

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
            />
          )}
        </QueryState>
      </ListLayout>

      <ProductModals
        costImportOpen={costImportOpen}
        onCloseCostImport={() => setCostImportOpen(false)}
        permissions={permissions}
        suggestionsOpen={suggestionsOpen}
        onCloseSuggestions={() => setSuggestionsOpen(false)}
        importOpen={importOpen}
        onCloseImport={() => setImportOpen(false)}
        onViewRecentlyEdited={() => {
          setImportOpen(false);
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
