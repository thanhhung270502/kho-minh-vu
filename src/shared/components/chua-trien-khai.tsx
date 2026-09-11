"use client";

import { Card, Typography } from "antd";

type ChuaTrienKhaiProps = {
  /** Những gì màn hình này sẽ làm khi hoàn thiện. */
  seCo: string[];
  /** Việc phải xong trước mới làm được màn hình này. */
  phuThuoc?: string;
};

/**
 * Khung tạm cho route đã có trong menu nhưng chưa xây. Ghi rõ phạm vi để
 * người dùng góp ý trước khi code, thay vì để trang trắng.
 */
export function ChuaTrienKhai({ seCo, phuThuoc }: ChuaTrienKhaiProps) {
  return (
    <Card>
      <Typography.Paragraph type="secondary">
        Màn hình chưa triển khai. Dự kiến gồm:
      </Typography.Paragraph>

      <ul className="m-0 list-disc space-y-1.5 pl-5">
        {seCo.map((muc) => (
          <li key={muc}>{muc}</li>
        ))}
      </ul>

      {phuThuoc ? (
        <Typography.Paragraph type="secondary" className="mt-4 mb-0">
          Cần làm trước: {phuThuoc}
        </Typography.Paragraph>
      ) : null}
    </Card>
  );
}
