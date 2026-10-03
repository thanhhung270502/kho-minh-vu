"use client";

import { Button, Descriptions, Tabs, Tag } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AuditLog } from "@/shared/components/audit-log";
import { PageHeader } from "@/shared/components/page-header";
import { QueryState } from "@/shared/components/query-state";

import { useLookups, useProductDetail } from "../hooks/useProducts";
import { standardFieldText } from "../lib/product-expanded";
import { PRODUCT_KIND_LABELS, type Lookups } from "../types";
import { ProductDrawer } from "./product-drawer";
import { StockCard } from "./stock-card";
import { WarehouseStock } from "./warehouse-stock";

export type ProductDetailPermissions = {
  canEdit: boolean;
  canViewHistory: boolean;
};

/** Khóa là TÊN CỘT trong `nhat_ky_sua.truong` — không đổi sang tiếng Anh. */
const FIELD_LABELS: Record<string, string> = {
  ma_hang: "Mã hàng",
  ten_hang: "Tên hàng",
  nhom_hang_id: "Nhóm hàng",
  dvt_id: "Đơn vị tính",
  cong_doan_id: "Xử lý",
  quy_doi: "Quy đổi",
  kho_mac_dinh_id: "Kho mặc định",
  ton_toi_thieu: "Tồn tối thiểu",
  ton_toi_da: "Tồn tối đa",
  // Giá bán đã bỏ khỏi giao diện (Phase 10) — giữ nhãn để đọc nhật ký sửa cũ.
  gia_ban: "Giá bán",
  dang_kinh_doanh: "Đang kinh doanh",
  barcode: "Barcode",
  ghi_chu: "Ghi chú (tự sinh)",
  mo_ta: "Mô tả",
  loai_hang: "Loại hàng",
  hang_xe: "Hãng xe",
  dong_xe: "Dòng xe",
  linh_kien: "Linh kiện",
  // Cột Phase 15 đã bỏ (0086) — giữ nhãn để đọc nhật ký sửa cũ.
  loai_hang_id: "Loại hàng (cũ)",
  dong_xe_id: "Dòng xe (cũ)",
  duoc_ban_truc_tiep: "Được bán trực tiếp",
  vi_tri_ke: "Vị trí kệ",
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
  imagesSection,
}: {
  id: string;
  permissions: ProductDetailPermissions;
  /**
   * Mục "Hình ảnh" (Phase 9) — route ghép sẵn từ feature ảnh. KHÔNG import
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
                { key: "kind", label: "Loại hàng", children: PRODUCT_KIND_LABELS[product.kind] },
                { key: "brand", label: "Hãng xe", children: standardFieldText(product.brandName, product.brandCode) ?? "—" },
                { key: "model", label: "Dòng xe", children: standardFieldText(product.modelName, product.modelCode) ?? "—" },
                { key: "part", label: "Linh kiện", children: standardFieldText(product.partName, product.partCode) ?? "—" },
                { key: "unit", label: "Đơn vị tính", children: product.unitName },
                {
                  key: "stage",
                  label: "Xử lý",
                  children: (
                    <Tag color={product.stageColor || undefined}>
                      {product.stageName}
                    </Tag>
                  ),
                },
                {
                  key: "warehouse",
                  label: "Kho mặc định",
                  children: product.defaultWarehouseName ?? "—",
                },
                { key: "shelf", label: "Vị trí kệ", children: product.shelfLocation ?? "—" },
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
                    </span>
                  ),
                },
                { key: "description", label: "Mô tả", children: product.description ?? "—" },
                {
                  key: "note",
                  label: "Ghi chú",
                  children: product.note ?? <Tag color="green" className="m-0">Đủ quy chuẩn</Tag>,
                },
              ]}
            />

            {imagesSection ? <div className="mt-4">{imagesSection}</div> : null}

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">Tồn theo kho</h3>
              <WarehouseStock productId={id} unitName={product.unitName} />
            </div>

            <Tabs
              className="mt-4"
              items={[
                {
                  key: "stock-card",
                  label: "Thẻ kho",
                  children: (
                    <StockCard productId={id} />
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
              onClose={() => setEditOpen(false)}
            />
          </>
        );
      }}
    </QueryState>
  );
}
