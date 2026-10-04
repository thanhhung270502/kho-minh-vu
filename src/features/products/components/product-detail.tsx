"use client";

import { Button, Tabs } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AuditLog } from "@/shared/components/audit-log";
import { QueryState } from "@/shared/components/query-state";

import { useLookups, useProductDetail } from "../hooks/useProducts";
import { FIELD_LABELS, buildRenderValue } from "../lib/product-audit-labels";
import { ComboComponents } from "./combo-components";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDrawer } from "./product-drawer";
import { ProductInfoCard } from "./product-info-card";
import { StockCard } from "./stock-card";
import { WarehouseStockTable } from "./warehouse-stock-table";

export type ProductDetailPermissions = {
  canEdit: boolean;
  canViewHistory: boolean;
  canViewCost: boolean;
};

export function ProductDetailView({
  id,
  permissions,
  imagesSection,
}: {
  id: string;
  permissions: ProductDetailPermissions;
  /**
   * Aside "Hình ảnh" (Phase 9/20) — route ghép sẵn từ feature ảnh. KHÔNG import
   * feature `images` trực tiếp ở đây (luật `src/features/README.md`).
   */
  imagesSection?: ReactNode;
}) {
  const detail = useProductDetail(id);
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
            <ProductDetailHeader
              product={product}
              canEdit={permissions.canEdit}
              onEdit={() => setEditOpen(true)}
            />

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex min-w-0 flex-col gap-5">
                <ProductInfoCard product={product} />
                {product.kind === "COMBO" ? (
                  <section className="rounded-the border border-vien px-5 py-4">
                    <h2 className="m-0 mb-3 text-[15px] font-extrabold">Thành phần combo</h2>
                    <ComboComponents comboId={id} canEdit={permissions.canEdit} />
                  </section>
                ) : null}
                <WarehouseStockTable
                  productId={id}
                  unitName={product.unitName}
                  minStock={product.minStock}
                  canViewCost={permissions.canViewCost}
                />
                <section className="rounded-the border border-vien px-5 pb-4">
                  <Tabs
                    items={[
                      {
                        key: "stock-card",
                        label: "Thẻ kho",
                        children: <StockCard productId={id} />,
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
                </section>
              </div>
              {imagesSection ? <aside className="min-w-0">{imagesSection}</aside> : null}
            </div>

            <ProductDrawer
              id={id}
              open={editOpen}
              onClose={() => setEditOpen(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
