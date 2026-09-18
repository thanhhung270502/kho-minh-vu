"use client";

import { Alert, App, Modal, Typography } from "antd";
import { useState, useTransition } from "react";

import { datLaiMatKhau } from "../actions/nguoi-dung.actions";
import type { DongNguoiDung } from "../api/nguoi-dung.api";
import { OMatKhauTam, sinhMatKhauTam } from "./o-mat-khau-tam";

type Props = {
  nguoiDung: DongNguoiDung | null;
  onDong: () => void;
};

export function HopDatLaiMatKhau({ nguoiDung, onDong }: Props) {
  const { message } = App.useApp();
  const [dangChay, batDau] = useTransition();
  const [matKhau, setMatKhau] = useState(() => sinhMatKhauTam());
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);

  function dong() {
    setLoi(null);
    setXong(null);
    setMatKhau(sinhMatKhauTam());
    onDong();
  }

  function luu() {
    if (!nguoiDung) return;
    setLoi(null);

    batDau(async () => {
      const kq = await datLaiMatKhau({ id: nguoiDung.id, matKhauTam: matKhau });
      if (!kq.ok) {
        setLoi(kq.thongBao);
        return;
      }
      setXong(matKhau);
      message.success("Đã đặt lại mật khẩu");
    });
  }

  return (
    <Modal
      open={Boolean(nguoiDung)}
      title={`Đặt lại mật khẩu — ${nguoiDung?.ho_ten ?? ""}`}
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
          {loi ? <Alert type="error" showIcon message={loi} /> : null}
          <OMatKhauTam value={matKhau} onChange={setMatKhau} autoFocus />
          <Typography.Text type="secondary">
            Tối thiểu 8 ký tự, có cả chữ và số. Nhân viên phải đổi ở lần đăng nhập đầu.
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
