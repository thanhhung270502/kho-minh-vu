"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Nút hành động chính của màn hình (Tạo lệnh, Xuất Excel...). */
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {/* `mb-1` không cần `!` vì @layer utilities đứng sau @layer antd —
            layer quyết định thắng thua trước cả độ ưu tiên selector. */}
        <Typography.Title level={4} className="mb-1">
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary">{description}</Typography.Text>
        ) : null}
      </div>

      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
