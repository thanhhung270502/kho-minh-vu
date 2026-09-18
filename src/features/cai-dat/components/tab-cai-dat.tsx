"use client";

import { Tabs } from "antd";
import { usePathname, useRouter } from "next/navigation";

import { coQuyen, type Quyen, type VaiTro } from "@/shared/lib/quyen";

type MucTab = { duongDan: string; nhan: string; quyen: Quyen };

export const TAB_CAI_DAT: MucTab[] = [
  { duongDan: "/cai-dat/nguoi-dung", nhan: "Người dùng", quyen: "cai_dat_nguoi_dung" },
  { duongDan: "/cai-dat/kho", nhan: "Kho", quyen: "cai_dat_kho" },
  { duongDan: "/cai-dat/nhom-hang", nhan: "Nhóm hàng", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/don-vi-tinh", nhan: "Đơn vị tính", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/cong-doan", nhan: "Công đoạn", quyen: "cai_dat_danh_muc_phu" },
  { duongDan: "/cai-dat/so-chung-tu", nhan: "Số chứng từ", quyen: "cai_dat_so_chung_tu" },
];

export function tabDauTien(vaiTro: VaiTro): string {
  return (
    TAB_CAI_DAT.find((t) => coQuyen(vaiTro, t.quyen))?.duongDan ?? "/cai-dat/nhom-hang"
  );
}

export function TabCaiDat({ vaiTro }: { vaiTro: VaiTro }) {
  const router = useRouter();
  const pathname = usePathname();

  const muc = TAB_CAI_DAT.filter((t) => coQuyen(vaiTro, t.quyen));
  // Trang con (ví dụ /cai-dat/kho/abc) vẫn phải sáng đúng tab cha.
  const dangMo = muc.find((t) => pathname.startsWith(t.duongDan))?.duongDan;

  return (
    <Tabs
      className="mb-4"
      activeKey={dangMo}
      onChange={(k) => router.push(k)}
      items={muc.map((t) => ({ key: t.duongDan, label: t.nhan }))}
    />
  );
}
