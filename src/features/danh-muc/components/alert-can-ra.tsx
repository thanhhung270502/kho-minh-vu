"use client";

import { Alert, Button } from "antd";

type Props = {
  hien: boolean;
  choPhepSua: boolean;
  onGoiY: () => void;
};

/** Cảnh báo mã cần rà công đoạn/ĐVT — chỉ hiện khi đang lọc "Cần rà". */
export function AlertCanRa({ hien, choPhepSua, onGoiY }: Props) {
  if (!hien) return null;

  return (
    <Alert
      className="mb-3"
      type="warning"
      showIcon
      title="Mã mua ngoài chưa rõ công đoạn và các mã có ô ĐVT mâu thuẫn"
      description="Gán lại công đoạn, hoặc chọn rồi bấm “Xác nhận đã rà” nếu hiện tại đã đúng."
      action={
        choPhepSua ? (
          <Button size="small" onClick={onGoiY}>
            Gợi ý theo đuôi mã
          </Button>
        ) : null
      }
    />
  );
}
