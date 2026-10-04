"use client";

import { Button } from "antd";
import { useState } from "react";

import { StandardFillDialog } from "./standard-fill-dialog";

/** Nút + hộp thoại "Điền quy chuẩn từ mã" — giữ state mở/đóng ngay tại đây. */
export function StandardFillButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Điền quy chuẩn từ mã</Button>
      <StandardFillDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
