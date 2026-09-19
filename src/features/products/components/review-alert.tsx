"use client";

import { Alert, Button } from "antd";

type Props = {
  visible: boolean;
  canEdit: boolean;
  onSuggest: () => void;
};

/** Cảnh báo mã cần rà công đoạn/ĐVT — chỉ hiện khi đang lọc "Cần rà". */
export function ReviewAlert({ visible, canEdit, onSuggest }: Props) {
  if (!visible) return null;

  return (
    <Alert
      className="mb-3"
      type="warning"
      showIcon
      title="Mã mua ngoài chưa rõ công đoạn và các mã có ô ĐVT mâu thuẫn"
      description="Gán lại công đoạn, hoặc chọn rồi bấm “Xác nhận đã rà” nếu hiện tại đã đúng."
      action={
        canEdit ? (
          <Button size="small" onClick={onSuggest}>
            Gợi ý theo đuôi mã
          </Button>
        ) : null
      }
    />
  );
}
