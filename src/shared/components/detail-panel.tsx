"use client";

import { CloseOutlined } from "@ant-design/icons";
import { Button, Drawer, Grid } from "antd";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  onClose: () => void;
  /** Nút cạnh tiêu đề — "Xem chi tiết", "Sửa"… */
  extra?: ReactNode;
  /** Luôn là ngăn kéo, kể cả màn rộng (vd. mã đang chọn không có trên trang bảng). */
  forceDrawer?: boolean;
  children: ReactNode;
};

/**
 * Panel chi tiết của bảng danh sách: từ 1280px là cột phải dính theo cuộn,
 * bảng vẫn bấm được dòng khác; dưới 1280px là ngăn kéo phủ kín màn hình
 * (điện thoại không đủ chỗ cho hai cột). Chỉ render khi có dòng đang chọn.
 */
export function DetailPanel({ title, onClose, extra, forceDrawer = false, children }: Props) {
  const screens = Grid.useBreakpoint();

  if (forceDrawer || !screens.xl) {
    return (
      <Drawer open title={title} extra={extra} size="100%" onClose={onClose}>
        {children}
      </Drawer>
    );
  }

  return (
    <aside className="sticky top-4 max-h-[calc(100vh-2rem)] w-[360px] shrink-0 overflow-y-auto rounded-the bg-nen-the p-4 shadow-the">
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1 text-base font-semibold">{title}</div>
        {extra}
        <Button type="text" size="small" icon={<CloseOutlined />} aria-label="Đóng" onClick={onClose} />
      </div>
      {children}
    </aside>
  );
}
