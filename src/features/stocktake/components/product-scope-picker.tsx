"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Typography } from "antd";
import { useState } from "react";

import { ProductSearchInput } from "@/shared/components/product-search-input";
import { explainError } from "@/shared/lib/errors";

import { fetchNegativeStockProducts } from "../api/stocktake.api";
import { stocktakeKeys } from "../api/stocktake.keys";

export type PickedProduct = { id: string; code: string; name: string };

type Props = {
  warehouseId: string;
  value: PickedProduct[];
  onChange: (next: PickedProduct[]) => void;
};

/** Thêm vào cuối, bỏ mã đã có — giữ thứ tự người dùng chọn. */
function merge(
  current: PickedProduct[],
  added: PickedProduct[],
): PickedProduct[] {
  const seen = new Set(current.map((p) => p.id));
  const fresh: PickedProduct[] = [];
  for (const p of added) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    fresh.push({ id: p.id, code: p.code, name: p.name });
  }
  return [...current, ...fresh];
}

/**
 * Chọn TỪNG MÃ cần kiểm (0129): gõ tìm thêm từng mã, hoặc thêm một lần mọi mã đang
 * tồn âm của kho đã chọn. Danh sách giữ ở cha — form chỉ cần mảng id.
 */
export function ProductScopePicker({ warehouseId, value, onChange }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [loadingNegative, setLoadingNegative] = useState(false);

  async function addNegative() {
    setLoadingNegative(true);
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: stocktakeKeys.negative(warehouseId),
        queryFn: () => fetchNegativeStockProducts(warehouseId),
      });
      if (rows.length === 0) {
        message.info("Kho này không có mã nào đang âm.");
        return;
      }
      const next = merge(value, rows);
      const added = next.length - value.length;
      if (added === 0) {
        message.info(`Cả ${rows.length.toLocaleString("vi-VN")} mã đang âm đã có trong danh sách.`);
        return;
      }
      onChange(next);
      message.success(`Đã thêm ${added.toLocaleString("vi-VN")} mã đang âm.`);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    } finally {
      setLoadingNegative(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <ProductSearchInput
            onSelect={(product) =>
              onChange(
                merge(value, [
                  { id: product.id, code: product.code, name: product.name },
                ]),
              )
            }
          />
        </div>
        <Button
          onClick={() => void addNegative()}
          loading={loadingNegative}
          disabled={!warehouseId}
          title={warehouseId ? undefined : "Chọn kho trước"}
        >
          Thêm các mã đang âm
        </Button>
      </div>

      {value.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa chọn mã nào"
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Typography.Text type="secondary">
              Đã chọn {value.length.toLocaleString("vi-VN")} mã
            </Typography.Text>
            <Button size="small" type="link" onClick={() => onChange([])}>
              Bỏ hết
            </Button>
          </div>
          <ul className="m-0 max-h-72 list-none overflow-y-auto rounded border border-gray-100 p-0">
            {value.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 last:border-b-0"
              >
                <span className="shrink-0 font-mono">{product.code}</span>
                <span className="min-w-0 flex-1 truncate text-chu-phu">
                  {product.name}
                </span>
                <Button
                  size="small"
                  type="text"
                  icon={<DeleteOutlined />}
                  aria-label={`Bỏ ${product.code}`}
                  onClick={() =>
                    onChange(value.filter((p) => p.id !== product.id))
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
