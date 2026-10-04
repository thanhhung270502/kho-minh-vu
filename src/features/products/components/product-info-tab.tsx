"use client";

import { Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import { ProductImagePreview } from "@/features/images/components/product-image-preview";

import { standardFieldText, type ProductForecast } from "../lib/product-expanded";
import { PRODUCT_KIND_LABELS, type ProductDetail } from "../types";
import { formatNumber } from "../lib/format";
import { SharedVehiclesText } from "./shared-vehicles-text";

type Props = {
  product: ProductDetail;
  /** undefined = người xem không có quyền xem phân tích → ẩn hai ô dự báo. */
  forecast: ProductForecast | null | undefined;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <div className="text-xs text-chu-phu">{label}</div>
      <div className="mt-1 break-words">{children}</div>
    </div>
  );
}

const empty = <span className="text-gray-400">Chưa có</span>;

function stockoutText(forecast: ProductForecast | null) {
  if (!forecast) return "—";
  if (!forecast.selling) return <Typography.Text type="secondary">Không bán trong 30 ngày</Typography.Text>;
  if (!forecast.stockoutDate) return "—";
  return (
    <>
      {dayjs(forecast.stockoutDate).format("DD/MM/YYYY")}
      {forecast.daysOfCover !== null ? (
        <span className="ml-1 text-xs text-chu-phu">(còn {Math.max(0, Math.round(forecast.daysOfCover))} ngày)</span>
      ) : null}
    </>
  );
}

/** Tab "Thông tin" của dòng mở rộng — bố cục theo ảnh mẫu KiotViet, không có giá. */
export function ProductInfoTab({ product, forecast }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="w-28 shrink-0 sm:w-36">
          <ProductImagePreview productId={product.id} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold sm:text-lg">{product.name}</div>
          <div className="mt-1 text-sm text-chu-phu">Nhóm hàng: {product.categoryName ?? "(không nhóm)"}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Tag className="m-0" color={product.kind === "COMBO" ? "purple" : undefined}>
              {PRODUCT_KIND_LABELS[product.kind]}
            </Tag>
            {product.isActive ? null : <Tag className="m-0" color="orange">Ngừng kinh doanh</Tag>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        <Field label="Mã hàng"><span className="font-mono">{product.code}</span></Field>
        <Field label="Tồn kho">
          {product.kind === "COMBO" ? (
            <span className="text-chu-phu">Theo thành phần</span>
          ) : (
            <span className="tabular-nums">{formatNumber(product.totalStock)} {product.unitName ?? ""}</span>
          )}
        </Field>
        <Field label="Vị trí kệ">{product.shelfLocation ?? empty}</Field>
        <Field label="Kho mặc định">{product.defaultWarehouseName ?? empty}</Field>
        <Field label="Hãng xe">{standardFieldText(product.brandName, product.brandCode) ?? empty}</Field>
        <Field label="Dòng xe">{standardFieldText(product.modelName, product.modelCode) ?? empty}</Field>
        {product.sharedVehicles.length > 0 ? (
          <Field label="Xe dùng chung"><SharedVehiclesText vehicles={product.sharedVehicles} /></Field>
        ) : null}
        <Field label="Linh kiện">{standardFieldText(product.partName, product.partCode) ?? empty}</Field>
        <Field label="Ghi chú">
          {product.note ?? <Tag className="m-0" color="green">Đủ quy chuẩn</Tag>}
        </Field>
        <Field label="Đơn vị tính">{product.unitName ?? empty}</Field>
        <Field label="Xử lý">
          {product.stageName ? <Tag className="m-0" color={product.stageColor || undefined}>{product.stageName}</Tag> : empty}
        </Field>
        {forecast !== undefined ? (
          <>
            <Field label="Đơn đặt">{forecast ? formatNumber(forecast.customerOrdered) : "—"}</Field>
            <Field label="Dự kiến hết hàng">{stockoutText(forecast)}</Field>
          </>
        ) : null}
      </div>
    </div>
  );
}
