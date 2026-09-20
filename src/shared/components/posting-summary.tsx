"use client";

import { Alert, Typography } from "antd";
import type { ReactNode } from "react";

/**
 * Hộp tóm tắt hậu quả trước khi ghi sổ (D-12) — hiện TRƯỚC khi bấm ghi sổ,
 * người dùng phải biết hậu quả trước, không sau. Nâng lên đây từ
 * `features/stock-in` vì `stock-out` (plan 04-13) dùng lại lần thứ hai —
 * đủ điều kiện theo CLAUDE.md để chuyển thành component dùng chung.
 *
 * `headline` và `children` để mỗi chiều chứng từ tự soạn nội dung riêng
 * (nhập tăng tồn có giá; xuất giảm tồn không giá, có dòng vượt tồn và lý do
 * xuất âm) — component này chỉ giữ khung bố cục chung.
 */
export function PostingSummary({
  docNo,
  headline,
  children,
  warningTitle,
  warningDescription,
}: {
  docNo: string;
  headline: ReactNode;
  children?: ReactNode;
  warningTitle: string;
  warningDescription: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Typography.Paragraph className="mb-0">
        Phiếu <strong className="font-mono">{docNo}</strong> — {headline}
      </Typography.Paragraph>

      {children}

      <Alert type="warning" showIcon title={warningTitle} description={warningDescription} />
    </div>
  );
}
