"use client";

import { Alert, App, Modal, Typography } from "antd";
import { useState, useTransition } from "react";

import { datLaiMatKhau } from "../actions/nguoi-dung.actions";
import type { DongNguoiDung } from "../api/nguoi-dung.api";
import { OMatKhauTam, generateTempPassword } from "./o-mat-khau-tam";

type Props = {
  user: DongNguoiDung | null;
  onClose: () => void;
};

export function HopDatLaiMatKhau({ user, onClose }: Props) {
  const { message } = App.useApp();
  const [dangChay, batDau] = useTransition();
  const [password, setMatKhau] = useState(() => generateTempPassword());
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);

  function dong() {
    setLoi(null);
    setXong(null);
    setMatKhau(generateTempPassword());
    onClose();
  }

  function luu() {
    if (!user) return;
    setLoi(null);

    batDau(async () => {
      const kq = await datLaiMatKhau({ id: user.id, tempPassword: password });
      if (!kq.ok) {
        setLoi(kq.thongBao);
        return;
      }
      setXong(password);
      message.success("Đã đặt lại mật khẩu");
    });
  }

  return (
    <Modal
      open={Boolean(user)}
      title={`Đặt lại mật khẩu — ${user?.ho_ten ?? ""}`}
      okText={xong ? "Xong" : "Đặt lại"}
      cancelButtonProps={{ style: xong ? { display: "none" } : undefined }}
      confirmLoading={dangChay}
      onOk={() => (xong ? dong() : luu())}
      onCancel={dong}
    >
      {xong ? (
        <div className="flex flex-col gap-2">
          <Typography.Text>Mật khẩu tạm mới — đưa tận tay nhân viên:</Typography.Text>
          <Typography.Paragraph copyable className="mb-0 font-mono text-base">
            {xong}
          </Typography.Paragraph>
          <Typography.Text type="secondary">
            Nhân viên đã bị đăng xuất khỏi mọi thiết bị và phải đổi mật khẩu ở lần đăng
            nhập tới.
          </Typography.Text>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {loi ? <Alert type="error" showIcon title={loi} /> : null}
          <OMatKhauTam value={password} onChange={setMatKhau} autoFocus />
          <Typography.Text type="secondary">
            Tối thiểu 8 ký tự, có cả chữ và số. Nhân viên phải đổi ở lần đăng nhập đầu.
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
