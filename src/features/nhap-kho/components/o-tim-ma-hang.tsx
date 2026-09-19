"use client";

import { Select, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState, type Ref } from "react";
import type { RefSelectProps } from "antd/es/select";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type MaHangTim = {
  id: string;
  ma_hang: string;
  ten_hang: string;
  dvt_id: string | null;
  quy_doi: number | null;
  kho_mac_dinh_id: string | null;
};

async function timMaHang(q: string): Promise<MaHangTim[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("tim_san_pham", {
    p_tu_khoa: q,
    p_gioi_han: 20,
  });
  if (error) throw error;
  return (data ?? []) as MaHangTim[];
}

type Props = {
  onChon: (sp: MaHangTim) => void;
  oRef?: Ref<RefSelectProps>;
  disabled?: boolean;
};

/**
 * Ô gõ mã hàng của bảng dòng. Chọn xong tự xóa ô để gõ mã kế tiếp — luồng nhập
 * liệu là gõ liên tục, không phải chọn từng cái rồi bấm chuột (D-07).
 */
export function OTimMaHang({ onChon, oRef, disabled }: Props) {
  const [q, setQ] = useState("");

  const ket_qua = useQuery({
    queryKey: ["tim-san-pham", q],
    queryFn: () => timMaHang(q),
    enabled: q.trim().length >= 1,
    staleTime: 30_000,
  });

  function chonDauTien(): boolean {
    const ds = ket_qua.data ?? [];
    if (ds.length === 0) return false;

    // Gõ ĐÚNG mã thì phải ra đúng mã đó. `tim_san_pham` xếp theo
    // `lan_phat_sinh_cuoi` trước rồi mới tới độ giống — hợp lý khi gõ dở, nhưng
    // khiến mã chạy nhiều đè lên mã khớp tuyệt đối. Kho gõ mã đầy đủ suốt ngày,
    // chọn nhầm ở đây là nhập sai hàng.
    const goc = q.trim().toLowerCase();
    const khopHan = ds.find((sp) => sp.ma_hang.toLowerCase() === goc);

    onChon(khopHan ?? ds[0]);
    setQ("");
    return true;
  }

  return (
    // Bắt Enter ở LỚP BỌC NGOÀI, pha capture — tức là TRƯỚC rc-select.
    // Enter mặc định của antd có chọn option, nhưng ngay sau đó rc-select gọi
    // focus() về chính ô tìm của nó, nuốt mất lệnh chuyển sang ô Số lượng mà
    // `onChon` hẹn trong setTimeout. Chặn ở pha capture thì focus mới ở lại
    // đúng ô kế tiếp. Đo tận tay ở UAT Phase 3 bài 5.
    <div
      className="w-full"
      onKeyDownCapture={(e) => {
        if (e.key !== "Enter") return;
        if (chonDauTien()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <Select
        ref={oRef}
        showSearch
        value={null}
        // `searchValue` phải controlled thì mới xóa được ô sau khi TỰ chọn bằng
        // Enter (đường onChange của antd không chạy trong nhánh đó).
        searchValue={q}
        disabled={disabled}
        className="w-full min-w-56"
        placeholder="Gõ mã hoặc tên hàng"
        filterOption={false}
        loading={ket_qua.isFetching}
        onSearch={setQ}
        notFoundContent={
          ket_qua.isFetching
            ? "Đang tìm…"
            : q
              ? "Không có mã nào khớp. Kiểm tra lại hoặc tạo mã mới ở Danh mục."
              : "Gõ để tìm mã hàng"
        }
        options={(ket_qua.data ?? []).map((sp) => ({
          value: sp.id,
          label: `${sp.ma_hang} — ${sp.ten_hang}`,
        }))}
        optionRender={(o) => {
          const sp = (ket_qua.data ?? []).find((x) => x.id === o.value);
          if (!sp) return o.label;
          return (
            <div className="flex flex-col">
              <span className="font-mono text-[13px]">{sp.ma_hang}</span>
              <Typography.Text type="secondary" className="truncate text-xs">
                {sp.ten_hang}
              </Typography.Text>
            </div>
          );
        }}
        onChange={(id) => {
          const sp = (ket_qua.data ?? []).find((x) => x.id === id);
          if (sp) onChon(sp);
          setQ("");
        }}
      />
    </div>
  );
}
