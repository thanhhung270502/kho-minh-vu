"use client";

import { CopyOutlined, EditOutlined, PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { App, Button, Popconfirm } from "antd";
import Link from "next/link";

import { explainError } from "@/shared/lib/errors";

import { useBulkAssign } from "../hooks/useProducts";
import { expandedActions } from "../lib/product-expanded";
import type { ProductDetail } from "../types";

type Props = {
  product: ProductDetail;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
};

/**
 * Hàng nút đáy của chi tiết dòng. Không có nút Xóa: mã hàng đã có chứng từ
 * không xóa được (sổ kho chỉ thêm) — ngừng kinh doanh thay cho xóa.
 */
export function ProductRowActions({ product, canEdit, onEdit, onCopy }: Props) {
  const { message } = App.useApp();
  const assign = useBulkAssign();
  const actions = expandedActions({ canEdit, isActive: product.isActive });

  const setActive = (isActive: boolean) =>
    assign.mutate(
      // "sua_o" — nguồn nhật ký sửa của thao tác một mã ngay trên bảng (hợp đồng DB).
      { ids: [product.id], change: { isActive }, source: "sua_o" },
      {
        onSuccess: () => message.success(isActive ? `Đã cho ${product.code} kinh doanh lại` : `Đã ngừng kinh doanh ${product.code}`),
        onError: (error) => {
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        },
      },
    );

  return (
    <>
      {actions.includes("deactivate") ? (
        <Popconfirm
          title={`Ngừng kinh doanh ${product.code}?`}
          description="Mã ẩn khỏi danh sách mặc định. Tồn và lịch sử vẫn giữ nguyên."
          okText="Ngừng kinh doanh"
          cancelText="Thôi"
          onConfirm={() => setActive(false)}
        >
          <Button icon={<PauseCircleOutlined />} loading={assign.isPending}>
            Ngừng kinh doanh
          </Button>
        </Popconfirm>
      ) : null}
      {actions.includes("reactivate") ? (
        <Button icon={<PlayCircleOutlined />} loading={assign.isPending} onClick={() => setActive(true)}>
          Kinh doanh lại
        </Button>
      ) : null}
      {actions.includes("copy") ? (
        <Button icon={<CopyOutlined />} onClick={() => onCopy(product.id)}>
          Sao chép
        </Button>
      ) : null}

      <span className="flex-1" />

      {actions.includes("detail") ? (
        <Link href={`/danh-muc/${product.id}`}>
          <Button>Xem chi tiết</Button>
        </Link>
      ) : null}
      {actions.includes("edit") ? (
        <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(product.id)}>
          Chỉnh sửa
        </Button>
      ) : null}
    </>
  );
}
