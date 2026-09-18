"use client";

import { App, Button, Input, Space } from "antd";

/**
 * Mật khẩu tạm 10 ký tự từ `crypto.getRandomValues`, không dùng `Math.random`
 * (không phải nguồn ngẫu nhiên an toàn). Bỏ các ký tự dễ đọc nhầm khi đọc qua
 * điện thoại: 0/O, 1/l/I.
 */
const BANG_CHU = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sinhMatKhauTam(dai = 10): string {
  const so = new Uint32Array(dai);
  crypto.getRandomValues(so);
  return Array.from(so, (n) => BANG_CHU[n % BANG_CHU.length]).join("");
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
};

export function OMatKhauTam({ value, onChange, autoFocus }: Props) {
  const { message } = App.useApp();

  async function sao() {
    try {
      await navigator.clipboard.writeText(value);
      message.success("Đã sao chép mật khẩu");
    } catch {
      message.warning("Trình duyệt không cho sao chép — chọn và copy tay giúp.");
    }
  }

  return (
    <Space.Compact className="w-full">
      <Input.Password
        value={value}
        autoFocus={autoFocus}
        placeholder="Mật khẩu tạm"
        onChange={(e) => onChange(e.target.value)}
      />
      <Button onClick={() => onChange(sinhMatKhauTam())}>Tạo ngẫu nhiên</Button>
      <Button disabled={!value} onClick={() => void sao()}>
        Sao chép
      </Button>
    </Space.Compact>
  );
}
