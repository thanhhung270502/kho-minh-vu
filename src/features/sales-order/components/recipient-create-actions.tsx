"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Divider } from "antd";

type Props = {
  typed: string;
  onCreate: (target: "staff" | "customer") => void;
};

/** Cuối danh sách gợi ý: gõ tên chưa có thì thêm ngay nhân viên hoặc khách. */
export function RecipientCreateActions({ typed, onCreate }: Props) {
  return (
    <>
      <Divider className="my-1" />
      <div className="flex flex-col items-start px-2 pb-1">
        <Button
          type="link"
          size="small"
          className="h-auto px-0"
          icon={<PlusOutlined />}
          // Giữ dropdown và chữ đang gõ cho tới khi modal mở.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onCreate("staff")}
        >
          {`Thêm nhân viên phụ trách "${typed}"`}
        </Button>
        <Button
          type="link"
          size="small"
          className="h-auto px-0"
          icon={<PlusOutlined />}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onCreate("customer")}
        >
          {`Thêm khách hàng "${typed}"`}
        </Button>
      </div>
    </>
  );
}
