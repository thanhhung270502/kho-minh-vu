"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { BoLocPhieu } from "../schemas/phieu-nhap.schema";

type Props = {
  filter: BoLocPhieu;
  onDoi: (b: BoLocPhieu) => void;
  nutThem?: ReactNode;
};

export function ThanhCongCuPhieu({ filter, onDoi, nutThem }: Props) {
  const [tuKhoa, setTuKhoa] = useState(filter.q);
  const [qTruoc, setQTruoc] = useState(filter.q);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (lint react-hooks/set-state-in-effect).
  if (filter.q !== qTruoc) {
    setQTruoc(filter.q);
    setTuKhoa(filter.q);
  }

  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); }, []);

  function goTim(v: string) {
    setTuKhoa(v);
    if (hen.current) clearTimeout(hen.current);
    hen.current = setTimeout(() => onDoi({ ...filter, q: v.trim(), page: 1 }), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        value={tuKhoa}
        prefix={<SearchOutlined />}
        placeholder="Số phiếu hoặc tên nhà cung cấp"
        className="w-full sm:max-w-xs"
        onChange={(e) => goTim(e.target.value)}
        onPressEnter={() => {
          if (hen.current) clearTimeout(hen.current);
          onDoi({ ...filter, q: tuKhoa.trim(), page: 1 });
        }}
      />
      {nutThem ? <div className="ms-auto">{nutThem}</div> : null}
    </div>
  );
}
