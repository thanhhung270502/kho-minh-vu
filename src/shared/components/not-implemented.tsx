"use client";

import { Card, Typography } from "antd";

type NotImplementedProps = {
  /** Những gì màn hình này sẽ làm khi hoàn thiện. */
  planned: string[];
  /** Việc phải xong trước mới làm được màn hình này. */
  dependsOn?: string;
};

/**
 * Khung tạm cho route đã có trong menu nhưng chưa xây. Ghi rõ phạm vi để
 * người dùng góp ý trước khi code, thay vì để page trắng.
 */
export function NotImplemented({ planned, dependsOn }: NotImplementedProps) {
  return (
    <Card>
      <Typography.Paragraph type="secondary">
        Màn hình chưa triển khai. Dự kiến gồm:
      </Typography.Paragraph>

      <ul className="m-0 list-disc space-y-1.5 pl-5">
        {planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {dependsOn ? (
        <Typography.Paragraph type="secondary" className="mt-4 mb-0">
          Cần làm trước: {dependsOn}
        </Typography.Paragraph>
      ) : null}
    </Card>
  );
}
