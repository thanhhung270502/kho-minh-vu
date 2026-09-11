"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

type PageHeaderProps = {
  tieuDe: string;
  moTa?: ReactNode;
  /** Nút hành động chính của màn hình (Tạo lệnh, Xuất Excel...). */
  hanhDong?: ReactNode;
};

export function PageHeader({ tieuDe, moTa, hanhDong }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {/* `mb-1` không cần `!` vì @layer utilities đứng sau @layer antd —
            layer quyết định thắng thua trước cả độ ưu tiên selector. */}
        <Typography.Title level={4} className="mb-1">
          {tieuDe}
        </Typography.Title>
        {moTa ? (
          <Typography.Text type="secondary">{moTa}</Typography.Text>
        ) : null}
      </div>

      {hanhDong ? <div className="flex gap-2">{hanhDong}</div> : null}
    </div>
  );
}
