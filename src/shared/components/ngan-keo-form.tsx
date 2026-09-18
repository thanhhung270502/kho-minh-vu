"use client";

import { Button, Drawer, Grid, Space } from "antd";
import type { ReactNode } from "react";

type NganKeoFormProps = {
  open: boolean;
  tieuDe: string;
  phuDe?: ReactNode;
  dangLuu: boolean;
  onDong: () => void;
  onLuu: () => void;
  nhanLuu?: string;
  children: ReactNode;
};

/**
 * Ngăn kéo bên phải cho mọi form tạo/sửa (D-13): bảng phía sau giữ nguyên bộ lọc và
 * vị trí cuộn, sửa xong mã này mở được mã kế.
 *
 * antd v6 đổi `width` thành `size` (nhận cả số px) và `maskClosable` thành
 * `mask.closable` — đừng chép mẫu v5.
 */
export function NganKeoForm({
  open,
  tieuDe,
  phuDe,
  dangLuu,
  onDong,
  onLuu,
  nhanLuu = "Lưu",
  children,
}: NganKeoFormProps) {
  const manHinh = Grid.useBreakpoint();
  const toanManHinh = !manHinh.sm;

  return (
    <Drawer
      open={open}
      onClose={onDong}
      title={tieuDe}
      placement="right"
      size={toanManHinh ? "100%" : 560}
      destroyOnHidden
      // Đang lưu thì không cho đóng: đóng giữa chừng làm người dùng tưởng đã hủy.
      closable={!dangLuu}
      keyboard={!dangLuu}
      mask={{ closable: !dangLuu }}
      extra={phuDe}
      footer={
        <Space className="flex justify-end">
          <Button onClick={onDong} disabled={dangLuu}>
            Hủy
          </Button>
          <Button type="primary" onClick={onLuu} loading={dangLuu}>
            {nhanLuu}
          </Button>
        </Space>
      }
    >
      {children}
    </Drawer>
  );
}
