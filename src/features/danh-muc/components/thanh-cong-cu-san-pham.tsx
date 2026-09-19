"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { BoLocSanPham } from "../schemas/bo-loc.schema";

type Props = {
  boLoc: BoLocSanPham;
  onDoi: (b: BoLocSanPham) => void;
  hanhDongPhu?: ReactNode;
  nutThem?: ReactNode;
};

/** Ô tìm + hành động — phần trên của thanh công cụ, tách khỏi panel lọc. */
export function ThanhCongCuSanPham({ boLoc, onDoi, hanhDongPhu, nutThem }: Props) {
  const [tuKhoa, setTuKhoa] = useState(boLoc.q);
  const [qTruoc, setQTruoc] = useState(boLoc.q);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (xem SUMMARY plan 13).
  if (boLoc.q !== qTruoc) {
    setQTruoc(boLoc.q);
    setTuKhoa(boLoc.q);
  }

  useEffect(() => () => { if (hen.current) clearTimeout(hen.current); }, []);

  /** Mọi thay đổi điều kiện đều về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function doi(thayDoi: Partial<BoLocSanPham>) {
    onDoi({ ...boLoc, ...thayDoi, trang: 1 });
  }

  function goTim(v: string) {
    setTuKhoa(v);
    if (hen.current) clearTimeout(hen.current);
    hen.current = setTimeout(() => doi({ q: v.trim() }), 300);
  }

  function timNgay() {
    if (hen.current) clearTimeout(hen.current);
    doi({ q: tuKhoa.trim() });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        autoFocus
        value={tuKhoa}
        prefix={<SearchOutlined />}
        placeholder="Mã hoặc tên hàng — vd: op po air blade"
        className="w-full sm:max-w-md"
        onChange={(e) => goTim(e.target.value)}
        onPressEnter={timNgay}
      />
      <div className="ms-auto flex gap-2">
        {hanhDongPhu}
        {nutThem}
      </div>
    </div>
  );
}
