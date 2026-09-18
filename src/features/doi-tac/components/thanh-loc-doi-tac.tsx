"use client";

import { Button, Input, Segmented, Select } from "antd";
import { useEffect, useRef, useState } from "react";

import type { BoLocDoiTac, LoaiDoiTac } from "../types";
import { NHAN_LOAI_DOI_TAC } from "../types";

type Props = {
  boLoc: BoLocDoiTac;
  coQuyenSua: boolean;
  onDoi: (thayDoi: Partial<BoLocDoiTac>) => void;
  onThem: () => void;
};

const LOAI: Array<{ label: string; value: string }> = [
  { label: "Tất cả", value: "tat_ca" },
  ...(["NCC", "KHACH", "CA_HAI"] as LoaiDoiTac[]).map((l) => ({
    label: NHAN_LOAI_DOI_TAC[l],
    value: l,
  })),
];

const TRANG_THAI = [
  { label: "Đang hoạt động", value: "dang" },
  { label: "Ngừng hoạt động", value: "ngung" },
  { label: "Tất cả", value: "tat_ca" },
];

export function ThanhLocDoiTac({ boLoc, coQuyenSua, onDoi, onThem }: Props) {
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

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Input.Search
        allowClear
        value={tuKhoa}
        placeholder="Tìm mã, tên, số điện thoại"
        className="w-full sm:w-72"
        onChange={(e) => goTim(e.target.value)}
        onSearch={(v) => {
          if (hen.current) clearTimeout(hen.current);
          onDoi({ q: v.trim() });
        }}
      />

      <Segmented
        options={LOAI}
        value={boLoc.loai ?? "tat_ca"}
        onChange={(v) =>
          onDoi({ loai: v === "tat_ca" ? null : (v as LoaiDoiTac) })
        }
      />

      <Select
        options={TRANG_THAI}
        value={boLoc.hoatDong}
        className="w-44"
        onChange={(v) => onDoi({ hoatDong: v })}
      />

      {coQuyenSua ? (
        <Button type="primary" className="ms-auto" onClick={onThem}>
          Thêm đối tác
        </Button>
      ) : null}
    </div>
  );
}
