"use client";

import { Button, Drawer, Grid, Space } from "antd";
import type { ReactNode } from "react";

type FormDrawerProps = {
  open: boolean;
  title: string;
  extra?: ReactNode;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  children: ReactNode;
};

/**
 * Ngăn kéo bên phải cho mọi form tạo/sửa (D-13): bảng phía sau giữ nguyên bộ lọc và
 * vị trí cuộn, sửa xong mã này mở được mã kế.
 *
 * antd v6 đổi `width` thành `size` (nhận cả số px) và `maskClosable` thành
 * `mask.closable` — đừng chép mẫu v5.
 */
export function FormDrawer({
  open,
  title,
  extra,
  saving,
  onClose,
  onSave,
  saveLabel = "Lưu",
  children,
}: FormDrawerProps) {
  const screens = Grid.useBreakpoint();
  const fullScreen = !screens.sm;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      placement="right"
      size={fullScreen ? "100%" : 560}
      destroyOnHidden
      // Đang lưu thì không cho đóng: đóng giữa chừng làm người dùng tưởng đã hủy.
      closable={!saving}
      keyboard={!saving}
      mask={{ closable: !saving }}
      extra={extra}
      footer={
        <Space className="flex justify-end">
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="primary" onClick={onSave} loading={saving}>
            {saveLabel}
          </Button>
        </Space>
      }
    >
      {children}
    </Drawer>
  );
}
