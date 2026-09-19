"use client";

import { App, Button, Dropdown, Space } from "antd";
import { useState } from "react";

import { ghiBoLocRaUrl, type BoLocSanPham } from "../schemas/bo-loc.schema";

type Props = {
  boLoc: BoLocSanPham;
  soMa: number;
  /** Chỉ truyền khi người dùng có quyền sửa — plan 20 nối màn nhập vào đây. */
  onMoNhap?: () => void;
  /** Chỉ truyền cho QUẢN LÝ — giá vốn đầu kỳ là việc một lần, không phải việc hằng ngày. */
  onMoGiaVon?: () => void;
};

/** Tải một file từ route trả blob; lỗi thì đọc JSON để hiện câu tiếng Việt. */
async function tai(url: string): Promise<{ ok: true } | { ok: false; loi: string }> {
  const res = await fetch(url);

  if (!res.ok) {
    try {
      const j = (await res.json()) as { title?: string; action?: string };
      return { ok: false, loi: `${j.title ?? "Không tải được file"}. ${j.action ?? ""}` };
    } catch {
      return { ok: false, loi: "Không tải được file. Thử lại sau ít phút." };
    }
  }

  const blob = await res.blob();
  const ten =
    /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
    "danh-muc.xlsx";

  const diaChi = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = diaChi;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi ngay sau khi trình duyệt nhận lệnh tải, không giữ blob trong bộ nhớ.
  URL.revokeObjectURL(diaChi);

  return { ok: true };
}

export function NutExcel({ boLoc, soMa, onMoNhap, onMoGiaVon }: Props) {
  const { message } = App.useApp();
  const [dangTai, setDangTai] = useState(false);

  async function chay(url: string) {
    setDangTai(true);
    const kq = await tai(url);
    setDangTai(false);
    if (!kq.ok) message.error(kq.loi);
  }

  return (
    // `Dropdown.Button` đã bị antd v6 bỏ — ghép tay đúng khuyến nghị của nó.
    <Space.Compact>
      <Button
        loading={dangTai}
        title={`Xuất ${soMa.toLocaleString("vi-VN")} mã đang lọc`}
        onClick={() => void chay(`/api/danh-muc/xuat-excel?${ghiBoLocRaUrl(boLoc)}`)}
      >
        Xuất Excel
      </Button>
      <Dropdown
        menu={{
          items: [
            { key: "mau", label: "Tải file mẫu trống" },
            ...(onMoNhap ? [{ key: "nhap", label: "Nhập từ Excel…" }] : []),
            ...(onMoGiaVon ? [{ key: "gia_von", label: "Nạp giá vốn đầu kỳ…" }] : []),
          ],
          onClick: ({ key }) => {
            if (key === "mau") void chay("/api/danh-muc/mau-excel");
            if (key === "nhap") onMoNhap?.();
            if (key === "gia_von") onMoGiaVon?.();
          },
        }}
      >
        <Button aria-label="Thêm lựa chọn Excel">⋯</Button>
      </Dropdown>
    </Space.Compact>
  );
}
