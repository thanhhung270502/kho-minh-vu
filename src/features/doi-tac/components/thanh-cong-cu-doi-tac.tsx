"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useEffect, useRef, useState } from "react";

import type { BoLocDoiTac } from "../types";

type Props = {
  boLoc: BoLocDoiTac;
  coQuyenSua: boolean;
  onDoi: (thayDoi: Partial<BoLocDoiTac>) => void;
  onThem: () => void;
};

/** Ô tìm + nút "Thêm đối tác" — phần trên của thanh công cụ, khớp trang danh mục. */
export function ThanhCongCuDoiTac({ boLoc, coQuyenSua, onDoi, onThem }: Props) {
  // Ô tìm gõ tới đâu hiện tới đó, nhưng chỉ đẩy lên URL sau 300ms để không
  // bắn một request mỗi phím.
  const [tuKhoa, setTuKhoa] = useState(boLoc.q);
  const [qTruoc, setQTruoc] = useState(boLoc.q);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (nút "Xóa bộ lọc", bấm back) thì ô tìm phải theo.
  // Chỉnh ngay trong lúc render, không dùng useEffect — cách React khuyến nghị
  // cho "state phụ thuộc prop", và tránh một vòng render thừa.
  if (boLoc.q !== qTruoc) {
    setQTruoc(boLoc.q);
    setTuKhoa(boLoc.q);
  }

  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); }, []);

  function goTim(v: string) {
    setTuKhoa(v);
    if (hen.current) clearTimeout(hen.current);
    hen.current = setTimeout(() => onDoi({ q: v.trim() }), 300);
  }

  function timNgay() {
    if (hen.current) clearTimeout(hen.current);
    onDoi({ q: tuKhoa.trim() });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        value={tuKhoa}
        prefix={<SearchOutlined />}
        placeholder="Tìm mã, tên, số điện thoại"
        className="w-full sm:max-w-md"
        onChange={(e) => goTim(e.target.value)}
        onPressEnter={timNgay}
      />

      {coQuyenSua ? (
        <Button type="primary" className="ms-auto" onClick={onThem}>
          Thêm đối tác
        </Button>
      ) : null}
    </div>
  );
}
