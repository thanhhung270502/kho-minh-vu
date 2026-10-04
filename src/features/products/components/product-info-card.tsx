"use client";

import { Tag } from "antd";
import type { ReactNode } from "react";

import { formatNumber } from "../lib/format";
import { standardFieldText } from "../lib/product-expanded";
import { PRODUCT_KIND_LABELS, type ProductDetail } from "../types";
import { SharedVehiclesText } from "./shared-vehicles-text";

export function ProductInfoCard({ product }: { product: ProductDetail }) {
  const fields: { label: string; value: ReactNode }[] = [
    { label: "Nhóm hàng", value: product.categoryName },
    { label: "Loại hàng", value: PRODUCT_KIND_LABELS[product.kind] },
    { label: "Hãng xe", value: standardFieldText(product.brandName, product.brandCode) },
    { label: "Dòng xe", value: standardFieldText(product.modelName, product.modelCode) },
    {
      label: "Xe dùng chung",
      value:
        product.sharedVehicles.length > 0 ? (
          <SharedVehiclesText vehicles={product.sharedVehicles} />
        ) : null,
    },
    { label: "Linh kiện", value: standardFieldText(product.partName, product.partCode) },
    { label: "Barcode", value: product.barcode },
    { label: "Đơn vị tính", value: product.unitName },
    { label: "Quy đổi", value: formatNumber(product.conversion) },
    {
      label: "Xử lý",
      value: product.stageName ? (
        <Tag color={product.stageColor || undefined}>{product.stageName}</Tag>
      ) : null,
    },
    { label: "Kho mặc định", value: product.defaultWarehouseName },
    {
      label: "Tồn tối thiểu / tối đa",
      value: `${formatNumber(product.minStock)} / ${
        product.maxStock === null ? "không giới hạn" : formatNumber(product.maxStock)
      }`,
    },
    { label: "Vị trí kệ", value: product.shelfLocation },
    { label: "Mô tả", value: product.description },
    {
      label: "Ghi chú",
      value: product.note ?? <Tag color="green" className="m-0">Đủ quy chuẩn</Tag>,
    },
    {
      label: "Trạng thái",
      value: (
        <span className="flex flex-wrap items-center gap-1">
          {product.isActive ? "Đang kinh doanh" : "Ngừng kinh doanh"}
          {product.directSale ? null : <Tag>Không bán trực tiếp</Tag>}
        </span>
      ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-the border border-vien">
      <h2 className="m-0 px-5 py-4 text-[15px] font-extrabold">Thông tin hàng</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => {
          const empty = field.value === null || field.value === undefined || field.value === "";
          return (
            <div
              key={field.label}
              className="-ml-px flex min-w-0 flex-col gap-1 border-t border-l border-vien px-5 py-3.5"
            >
              <span className="text-[12px] font-semibold text-trung-tinh-350">{field.label}</span>
              <span
                className={
                  empty
                    ? "text-[13.5px] font-bold text-trung-tinh-250"
                    : "text-[13.5px] font-bold break-words"
                }
              >
                {empty ? "—" : field.value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
