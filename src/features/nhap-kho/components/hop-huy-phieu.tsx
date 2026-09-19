"use client";

import { Alert, App, Input, Modal } from "antd";
import { useState } from "react";

import { explainError, isPostgrestError, errorCode } from "@/shared/lib/errors";

import { useHuyPhieu } from "../hooks/usePhieuNhap";
import type { ChiTietPhieu } from "../types";

type Props = { phieu: ChiTietPhieu; open: boolean; onClose: () => void };

export function HopHuyPhieu({ phieu, open, onClose }: Props) {
  const { message } = App.useApp();
  const huy = useHuyPhieu(phieu.id);
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState<string | null>(null);

  const daGhiSo = phieu.trang_thai === "HOAN_THANH";

  function dong() {
    if (huy.isPending) return;
    setLyDo("");
    setLoi(null);
    onClose();
  }

  async function chay() {
    if (lyDo.trim().length < 5) {
      setLoi("Nhập lý do hủy, ít nhất 5 ký tự — lý do sẽ lưu vào phiếu.");
      return;
    }

    try {
      await huy.mutateAsync(lyDo.trim());
      message.success(`Đã hủy phiếu ${phieu.so_ct}`);
      dong();
    } catch (e) {
      if (errorCode(e) === "42501") {
        setLoi("Chỉ quản lý hủy được phiếu nhập đã ghi sổ.");
        return;
      }
      if (isPostgrestError(e) && e.code === "23514") {
        setLoi(e.message);
        return;
      }
      const l = explainError(e);
      setLoi(`${l.title}. ${l.action}`);
    }
  }

  return (
    <Modal
      open={open}
      title={`Hủy phiếu ${phieu.so_ct}?`}
      okText="Hủy phiếu"
      okButtonProps={{ danger: true }}
      cancelText="Thôi"
      confirmLoading={huy.isPending}
      onOk={() => void chay()}
      onCancel={dong}
    >
      {loi ? <Alert className="mb-3" type="error" showIcon title={loi} /> : null}

      {daGhiSo ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Ba điều xảy ra khi hủy phiếu đã ghi sổ"
          description={
            <ul className="mb-0 ps-4">
              <li>Tồn giảm lại bằng bút toán đảo — bản ghi gốc giữ nguyên, không xóa.</li>
              <li>
                <strong>Giá vốn KHÔNG tự quay về số trước khi nhập</strong> — bình quân gia
                quyền là trung bình lịch sử.
              </li>
              <li>Tồn có thể xuống âm nếu hàng đã xuất đi.</li>
            </ul>
          }
        />
      ) : (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Phiếu chưa ghi sổ nên chưa đụng tồn — hủy là đóng phiếu lại, không sinh bút toán nào."
        />
      )}

      <Input.TextArea
        autoFocus
        rows={3}
        value={lyDo}
        placeholder="Lý do hủy (lưu vào phiếu)"
        onChange={(e) => setLyDo(e.target.value)}
      />
    </Modal>
  );
}
