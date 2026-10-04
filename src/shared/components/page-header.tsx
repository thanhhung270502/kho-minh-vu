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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {/* `mb-1` không cần `!` vì @layer utilities đứng sau @layer antd —
            layer quyết định thắng thua trước cả độ ưu tiên selector. */}
        <Typography.Title level={1} className="mb-1 text-[30px] leading-[1.1] font-extrabold tracking-[-0.04em]">
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary" className="text-[13.5px]">
            {description}
          </Typography.Text>
        ) : null}
      </div>

      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
