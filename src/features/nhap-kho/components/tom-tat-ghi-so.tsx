"use client";

import { Alert, Typography } from "antd";

import type { ChiTietPhieu, DongPhieu } from "../types";

function so(v: number): string {
  return v.toLocaleString("vi-VN");
}

/** Hiện trước khi bấm ghi sổ — người dùng phải biết hậu quả trước, không sau. */
export function TomTatGhiSo({ phieu, dong }: { phieu: ChiTietPhieu; dong: DongPhieu[] }) {
  const tongSoLuong = dong.reduce((t, d) => t + Number(d.so_luong), 0);
  const tongTien = dong.reduce((t, d) => t + Number(d.so_luong) * Number(d.don_gia), 0);
  const khoBiAnhHuong = [...new Set(dong.map((d) => d.ten_kho).filter(Boolean))];

  return (
    <div className="flex flex-col gap-3">
      <Typography.Paragraph className="mb-0">
        Phiếu <strong className="font-mono">{phieu.so_ct}</strong> — {dong.length} dòng, tổng
        số lượng <strong>{so(tongSoLuong)}</strong>, tổng tiền <strong>{so(tongTien)}</strong>.
      </Typography.Paragraph>

      <Typography.Paragraph className="mb-0">
        Tồn sẽ tăng ở: <strong>{khoBiAnhHuong.join(", ") || (phieu.ten_kho ?? "—")}</strong>.
      </Typography.Paragraph>

      <Alert
        type="warning"
        showIcon
        title="Ghi sổ xong không sửa được"
        description="Sai thì phải hủy phiếu và lập lại. Giá vốn đã tính sẽ KHÔNG tự quay về số cũ — bình quân gia quyền là trung bình lịch sử, không hoàn tác được."
      />
    </div>
  );
}
