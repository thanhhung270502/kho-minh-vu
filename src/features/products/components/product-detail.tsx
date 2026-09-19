"use client";

import { Button, Descriptions, Statistic, Tabs, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";

import { AuditLog } from "@/shared/components/audit-log";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useLookups, useProductDetail, useStockByWarehouse } from "../hooks/useProducts";
import type { Lookups } from "../types";
import { formatNumber } from "./product-columns";
import { ProductDrawer } from "./product-drawer";
import { StockCard } from "./stock-card";

export type ProductDetailPermissions = {
  canEdit: boolean;
  canViewCost: boolean;
  canEditSalePrice: boolean;
  canViewHistory: boolean;
};

/** Khóa là TÊN CỘT trong `nhat_ky_sua.truong` — không đổi sang tiếng Anh. */
const FIELD_LABELS: Record<string, string> = {
  ma_hang: "Mã hàng",
  ten_hang: "Tên hàng",
  nhom_hang_id: "Nhóm hàng",
  dvt_id: "Đơn vị tính",
  cong_doan_id: "Công đoạn",
  quy_doi: "Quy đổi",
  kho_mac_dinh_id: "Kho mặc định",
  ton_toi_thieu: "Tồn tối thiểu",
  ton_toi_da: "Tồn tối đa",
  gia_ban: "Giá bán",
  dang_kinh_doanh: "Đang kinh doanh",
  barcode: "Barcode",
  ghi_chu: "Ghi chú",
  can_ra_dvt: "Cờ ĐVT mâu thuẫn",
  da_xac_nhan_ra: "Đã xác nhận rà",
};

/** Nhật ký lưu uuid — đổi sang tên để người đọc hiểu được. */
function buildRenderValue(lookups: Lookups | undefined) {
  return (field: string, value: unknown) => {
    if (typeof value !== "string" || !lookups) return undefined;

    const items =
      field === "nhom_hang_id"
        ? lookups.categories
        : field === "dvt_id"
          ? lookups.units
          : field === "cong_doan_id"
            ? lookups.stages
            : field === "kho_mac_dinh_id"
              ? lookups.warehouses
              : null;

    return items?.find((item) => item.id === value)?.name;
  };
}

export function ProductDetailView({
  id,
  permissions,
}: {
  id: string;
  permissions: ProductDetailPermissions;
}) {
  const detail = useProductDetail(id);
  const stockByWarehouse = useStockByWarehouse(id);
  const lookups = useLookups();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <QueryState
      query={detail}
      isEmpty={(product) => product === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy mã hàng này — có thể đã bị đổi mã.</span>
          <Link href="/danh-muc">
            <Button size="small">Về danh mục</Button>
          </Link>
        </div>
      }
    >
      {(product) => {
        if (!product) return null;

        return (
          <>
            <Link href="/danh-muc" className="mb-2 inline-block text-sm">
              ← Danh mục
            </Link>

            <PageHeader
              title={product.code}
              description={product.name}
              actions={
                permissions.canEdit ? (
                  <Button type="primary" onClick={() => setEditOpen(true)}>
                    Sửa
                  </Button>
                ) : null
              }
            />

            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                {
                  key: "category",
                  label: "Nhóm hàng",
                  children: product.categoryName ?? "—",
                },
                { key: "unit", label: "Đơn vị tính", children: product.unitName },
                {
                  key: "stage",
                  label: "Công đoạn",
                  children: (
                    <Tag color={product.stageColor || undefined}>
                      {product.stageName}
                    </Tag>
                  ),
                },
                {
                  key: "conversion",
                  label: "Quy đổi",
                  children: formatNumber(product.conversion),
                },
                {
                  key: "warehouse",
                  label: "Kho mặc định",
                  children: product.defaultWarehouseName ?? "—",
                },
                {
                  key: "limits",
                  label: "Tồn tối thiểu / tối đa",
                  children: `${formatNumber(product.minStock)} / ${
                    product.maxStock === null
                      ? "không giới hạn"
                      : formatNumber(product.maxStock)
                  }`,
                },
                {
                  key: "salePrice",
                  label: "Giá bán",
                  children: formatNumber(product.salePrice),
                },
                ...(permissions.canViewCost
                  ? [
                      {
                        key: "costPrice",
                        label: "Giá vốn",
                        children: formatNumber(product.costPrice),
                      },
                    ]
                  : []),
                { key: "barcode", label: "Barcode", children: product.barcode ?? "—" },
                {
                  key: "status",
                  label: "Trạng thái",
                  children: (
                    <span className="flex flex-wrap gap-1">
                      {product.isActive ? (
                        <Tag color="green">Đang kinh doanh</Tag>
                      ) : (
                        <Tag>Ngừng kinh doanh</Tag>
                      )}
                      {product.needsReview ? <Tag color="orange">Cần rà</Tag> : null}
                    </span>
                  ),
                },
                { key: "note", label: "Ghi chú", children: product.note ?? "—" },
              ]}
            />

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">Tồn theo kho</h3>
              <QueryState
                query={stockByWarehouse}
                emptyDescription="Chưa có tồn — chưa có chứng từ nào cho mã này."
              >
                {(stocks) => (
                  <div className="flex flex-wrap gap-6">
                    {stocks.map((stock) => (
                      <Statistic
                        key={stock.warehouseId}
                        title={stock.warehouseName}
                        value={stock.quantity}
                        suffix={product.unitName}
                      />
                    ))}
                  </div>
                )}
              </QueryState>
            </div>

            <Tabs
              className="mt-4"
              items={[
                {
                  key: "stock-card",
                  label: "Thẻ kho",
                  children: (
                    <StockCard
                      productId={id}
                      canViewCost={permissions.canViewCost}
                    />
                  ),
                },
                ...(permissions.canViewHistory
                  ? [
                      {
                        key: "audit-log",
                        label: "Lịch sử sửa",
                        children: (
                          <AuditLog
                            table="san_pham"
                            id={id}
                            fieldLabels={FIELD_LABELS}
                            renderValue={buildRenderValue(lookups.data)}
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <ProductDrawer
              id={id}
              open={editOpen}
              permissions={permissions}
              onClose={() => setEditOpen(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
