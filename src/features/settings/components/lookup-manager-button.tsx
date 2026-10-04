"use client";

import { Button, Modal, Tabs } from "antd";
import { useState } from "react";

import { LookupTable } from "./lookup-table";

/**
 * Nhóm hàng / ĐVT / Công đoạn rời Cài đặt (Phase 11, NVPT-04) nhưng vẫn cần
 * chỗ đổi tên, xóa, đổi màu công đoạn, đặt nhóm cha — form mã hàng chỉ thêm
 * nhanh mã + tên. Route `/danh-muc` ghép nút này vào thanh công cụ, nên feature
 * products không phải import gì từ settings.
 */
export function LookupManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Danh mục phụ</Button>
      <Modal
        open={open}
        title="Danh mục phụ của mã hàng"
        width={880}
        footer={null}
        destroyOnHidden
        onCancel={() => setOpen(false)}
      >
        <Tabs
          items={[
            { key: "nhom_hang", label: "Nhóm hàng", children: <LookupTable table="nhom_hang" /> },
            { key: "don_vi_tinh", label: "Đơn vị tính", children: <LookupTable table="don_vi_tinh" /> },
            { key: "cong_doan", label: "Xử lý", children: <LookupTable table="cong_doan" /> },
          ]}
        />
      </Modal>
    </>
  );
}
