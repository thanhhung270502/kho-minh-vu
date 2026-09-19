"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Alert, Button, Empty, Skeleton } from "antd";
import type { ReactNode } from "react";

import { explainError } from "@/shared/lib/errors";

type QueryStateProps<TData> = {
  query: UseQueryResult<TData>;
  /** Chỉ chạy khi đã có dữ liệu thật và không rỗng. */
  children: (data: TData) => ReactNode;
  /** Mặc định coi mảng rỗng là rỗng. Truyền hàm riêng cho shape khác. */
  isEmpty?: (data: TData) => boolean;
  /** Nội dung trạng thái rỗng — nói rõ vì sao trống và làm gì tiếp. */
  emptyDescription?: ReactNode;
  /** Khung xương lúc tải. Mặc định là Skeleton nhiều dòng. */
  skeleton?: ReactNode;
};

function defaultIsEmpty(data: unknown): boolean {
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
  isEmpty = defaultIsEmpty,
  emptyDescription = "Chưa có dữ liệu.",
  skeleton,
}: QueryStateProps<TData>) {
  if (query.isPending) {
    return <>{skeleton ?? <Skeleton active paragraph={{ rows: 6 }} />}</>;
  }

  if (query.isError) {
    const explained = explainError(query.error);

    return (
      <Alert
        type="error"
        showIcon
        title={explained.title}
        description={
          <div className="flex flex-col items-start gap-3">
            <span>{explained.action}</span>
            {/* Lỗi hết phiên / thiếu quyền thử lại cũng vô ích — không đưa nút. */}
            {explained.kind !== "session-expired" && explained.kind !== "forbidden" ? (
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

  if (isEmpty(query.data)) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyDescription}
        className="py-8"
      />
    );
  }

  return <>{children(query.data)}</>;
}
