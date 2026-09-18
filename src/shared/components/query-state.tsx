"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Alert, Button, Empty, Skeleton } from "antd";
import type { ReactNode } from "react";

import { dienGiaiLoi } from "@/shared/lib/errors";

type QueryStateProps<TData> = {
  query: UseQueryResult<TData>;
  /** Chỉ chạy khi đã có dữ liệu thật và không rỗng. */
  children: (data: TData) => ReactNode;
  /** Mặc định coi mảng rỗng là rỗng. Truyền hàm riêng cho shape khác. */
  laRong?: (data: TData) => boolean;
  /** Nội dung trạng thái rỗng — nói rõ vì sao trống và làm gì tiếp. */
  moTaRong?: ReactNode;
  /** Khung xương lúc tải. Mặc định là Skeleton nhiều dòng. */
  khungCho?: ReactNode;
};

function macDinhLaRong(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

/**
 * Bọc mọi màn hình đọc dữ liệu để không màn hình nào thiếu trạng thái.
 *
 * Bốn trạng thái bắt buộc: đang tải → lỗi (có nút Thử lại) → rỗng → có dữ liệu.
 * Không tự render bảng trực tiếp từ `query.data` mà bỏ qua component này.
 */
export function QueryState<TData>({
  query,
  children,
  laRong = macDinhLaRong,
  moTaRong = "Chưa có dữ liệu.",
  khungCho,
}: QueryStateProps<TData>) {
  if (query.isPending) {
    return <>{khungCho ?? <Skeleton active paragraph={{ rows: 6 }} />}</>;
  }

  if (query.isError) {
    const loi = dienGiaiLoi(query.error);

    return (
      <Alert
        type="error"
        showIcon
        title={loi.tieuDe}
        description={
          <div className="flex flex-col items-start gap-3">
            <span>{loi.huongXuLy}</span>
            {/* Lỗi hết phiên / thiếu quyền thử lại cũng vô ích — không đưa nút. */}
            {loi.loai !== "het-phien" && loi.loai !== "khong-du-quyen" ? (
              <Button
                size="small"
                onClick={() => void query.refetch()}
                loading={query.isFetching}
              >
                Thử lại
              </Button>
            ) : null}
          </div>
        }
      />
    );
  }

  if (laRong(query.data)) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={moTaRong}
        className="py-8"
      />
    );
  }

  return <>{children(query.data)}</>;
}
