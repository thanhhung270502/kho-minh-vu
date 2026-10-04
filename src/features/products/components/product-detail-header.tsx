"use client";

import { App, Button, Popconfirm } from "antd";
import Link from "next/link";

import { StatusDot } from "@/shared/components/status-dot";
import { explainError } from "@/shared/lib/errors";

import { useBulkAssign } from "../hooks/useProducts";
import type { ProductDetail } from "../types";

type Props = {
  product: ProductDetail;
  canEdit: boolean;
  onEdit: () => void;
};

export function ProductDetailHeader({ product, canEdit, onEdit }: Props) {
  const { message } = App.useApp();
  const assign = useBulkAssign();

  const setActive = (isActive: boolean) =>
    assign.mutate(
      // "sua_o" — nguồn nhật ký sửa của thao tác một mã (hợp đồng DB).
      { ids: [product.id], change: { isActive }, source: "sua_o" },
      {
        onSuccess: () =>
          message.success(
            isActive
              ? `Đã cho ${product.code} kinh doanh lại`
              : `Đã ngừng kinh doanh ${product.code}`,
          ),
        onError: (error) => {
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        },
      },
    );

  return (
    <div>
      <Link href="/danh-muc" className="text-[13px] font-semibold text-chu-phu">
        ← Danh mục
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.04em]">
              {product.code}
            </h1>
            <StatusDot variant="badge" tone={product.isActive ? "done" : "muted"}>
              {product.isActive ? "Đang kinh doanh" : "Ngừng kinh doanh"}
            </StatusDot>
          </div>
          <div className="mt-1 text-[13.5px] text-chu-phu">{product.name}</div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            {product.isActive ? (
              <Popconfirm
                title={`Ngừng kinh doanh ${product.code}?`}
                description="Mã ẩn khỏi danh sách mặc định. Tồn và lịch sử vẫn giữ nguyên."
                okText="Ngừng kinh doanh"
                cancelText="Thôi"
                onConfirm={() => setActive(false)}
              >
                <Button loading={assign.isPending}>Ngừng kinh doanh</Button>
              </Popconfirm>
            ) : (
              <Button loading={assign.isPending} onClick={() => setActive(true)}>
                Mở lại kinh doanh
              </Button>
            )}
            <Button type="primary" onClick={onEdit}>
              Sửa
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
