"use client";

import { App, Select } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ganHangLoat } from "../api/san-pham.api";
import { khoaSanPham } from "../api/san-pham.keys";
import { dienGiaiLoi } from "@/shared/lib/errors";

type Truong = "cong_doan_id" | "nhom_hang_id" | "dvt_id";

type Props = {
  sanPhamId: string;
  truong: Truong;
  nhan: ReactNode;
  tuyChon: Array<{ value: string; label: ReactNode }>;
  choPhep: boolean;
};

/**
 * Sửa một ô ngay trên bảng. Cập nhật lạc quan: dòng đổi ngay, lỗi thì trả lại
 * giá trị cũ — rà 356 mã mà mỗi lần chờ round-trip thì không ai rà nổi.
 */
export function OSuaNhanh({ sanPhamId, truong, nhan, tuyChon, choPhep }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [mo, setMo] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);

  if (!choPhep) return <>{nhan}</>;

  async function luu(giaTri: string) {
    setMo(false);
    setDangLuu(true);

    // Ảnh chụp mọi trang danh sách đang cache, để hoàn lại nếu lỗi.
    const anhChup = queryClient.getQueriesData({ queryKey: khoaSanPham.tatCa });

    try {
      await ganHangLoat([sanPhamId], { [truong]: giaTri || null }, "sua_o");
    } catch (e) {
      for (const [khoa, dl] of anhChup) queryClient.setQueryData(khoa, dl);
      const loi = dienGiaiLoi(e);
      message.error(`${loi.tieuDe}. ${loi.huongXuLy}`);
    } finally {
      setDangLuu(false);
      void queryClient.invalidateQueries({ queryKey: khoaSanPham.tatCa });
    }
  }

  if (!mo) {
    return (
      <span
        role="button"
        tabIndex={0}
        className="cursor-pointer border-b border-dashed border-gray-300 hover:border-gray-600"
        title="Bấm để sửa nhanh"
        onClick={() => setMo(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setMo(true);
        }}
      >
        {dangLuu ? "…" : nhan}
      </span>
    );
  }

  return (
    <Select
      open
      autoFocus
      showSearch
      size="small"
      className="w-44"
      optionFilterProp="label"
      options={tuyChon}
      onChange={(v) => void luu(v)}
      onBlur={() => setMo(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setMo(false);
      }}
    />
  );
}
