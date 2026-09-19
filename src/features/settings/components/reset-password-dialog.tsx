"use client";

import { Alert, App, Modal, Typography } from "antd";
import { useState, useTransition } from "react";

import { resetPassword } from "../actions/user.actions";
import type { UserRow } from "../api/user.api";
import { TempPasswordField, generateTempPassword } from "./temp-password-field";

type Props = {
  user: UserRow | null;
  onClose: () => void;
};

export function ResetPasswordDialog({ user, onClose }: Props) {
  const { message } = App.useApp();
  const [running, startTransition] = useTransition();
  const [password, setPassword] = useState(() => generateTempPassword());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function close() {
    setError(null);
    setDone(null);
    setPassword(generateTempPassword());
    onClose();
  }

  function save() {
    if (!user) return;
    setError(null);

    startTransition(async () => {
      const result = await resetPassword({ id: user.id, tempPassword: password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDone(password);
      message.success("Đã đặt lại mật khẩu");
    });
  }

  return (
    <Modal
      open={Boolean(user)}
      title={`Đặt lại mật khẩu — ${user?.ho_ten ?? ""}`}
      okText={done ? "Xong" : "Đặt lại"}
      cancelButtonProps={{ style: done ? { display: "none" } : undefined }}
      confirmLoading={running}
      onOk={() => (done ? close() : save())}
      onCancel={close}
    >
      {done ? (
        <div className="flex flex-col gap-2">
          <Typography.Text>Mật khẩu tạm mới — đưa tận tay nhân viên:</Typography.Text>
          <Typography.Paragraph copyable className="mb-0 font-mono text-base">
            {done}
          </Typography.Paragraph>
          <Typography.Text type="secondary">
            Nhân viên đã bị đăng xuất khỏi mọi thiết bị và phải đổi mật khẩu ở lần đăng
            nhập tới.
          </Typography.Text>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {error ? <Alert type="error" showIcon title={error} /> : null}
          <TempPasswordField value={password} onChange={setPassword} autoFocus />
          <Typography.Text type="secondary">
            Tối thiểu 8 ký tự, có cả chữ và số. Nhân viên phải đổi ở lần đăng nhập đầu.
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
