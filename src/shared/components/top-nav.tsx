"use client";

import Link from "next/link";

import { MenuTaiKhoan } from "@/shared/components/menu-tai-khoan";
import type { MucDieuHuong } from "@/shared/lib/dieu-huong";
import type { VaiTro } from "@/shared/lib/quyen";

import { ICON_DIEU_HUONG } from "./icon-dieu-huong";

type TopNavProps = {
  nguoiDung: { hoTen: string; vaiTro: VaiTro };
  muc: MucDieuHuong[];
  dangMo: string;
};

/**
 * Thanh điều hướng ngang dạng pill — dựng bằng thẻ HTML thường + next/link,
 * không dùng antd Menu (pill nền xanh không ép được qua token antd). Vì
 * không phải component antd nên Tailwind ở đây là đúng chỗ, không cần `!`.
 */
export function TopNav({ nguoiDung, muc, dangMo }: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-vien bg-nen-the">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="shrink-0 font-semibold text-chu-chinh">
          Kho Minh Vũ
        </Link>

        {/* Pill nav — chỉ hiện từ 992px, dưới đó đã có thanh tab đáy. */}
        <nav className="hidden items-center gap-1 rounded-full bg-brand-600 p-1 lg:flex">
          {muc.map((m) => (
            <Link
              key={m.duongDan}
              href={m.duongDan}
              aria-current={m.duongDan === dangMo ? "page" : undefined}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                m.duongDan === dangMo
                  ? "bg-brand-400 font-medium text-white"
                  : "text-white/80 hover:bg-brand-500 hover:text-white",
              ].join(" ")}
            >
              {ICON_DIEU_HUONG[m.icon]}
              {m.nhan}
            </Link>
          ))}
        </nav>

        <div className="ms-auto">
          <MenuTaiKhoan nguoiDung={nguoiDung} />
        </div>
      </div>
    </header>
  );
}
