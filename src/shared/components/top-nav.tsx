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
    <header data-khong-in className="sticky top-0 z-20 border-b border-vien bg-nen-the">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="shrink-0 font-semibold text-chu-chinh">
          Kho Minh Vũ
        </Link>

        {/*
          Pill nav — chỉ hiện từ 992px, dưới đó đã có thanh tab đáy. Nền là
          gradient + viền + đổ bóng nhẹ (giá trị trích xuất thật từ KiotViet),
          không phải màu đặc nên cần style riêng — Tailwind color scale không
          biểu diễn được gradient 2 điểm dừng chính xác từ token.
        */}
        <nav
          className="hidden items-center gap-0.5 rounded-full p-px lg:flex"
          style={{
            background: "linear-gradient(0deg, var(--color-brand-500) 0%, var(--color-brand-400) 100%)",
            border: "1px solid var(--color-brand-500)",
            boxShadow: "0 0 4px 0 rgba(0,112,244,.15)",
          }}
        >
          {muc.map((m) => {
            const active = m.duongDan === dangMo;
            return (
              <Link
                key={m.duongDan}
                href={m.duongDan}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-2 rounded-full px-2 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/25"
              >
                {ICON_DIEU_HUONG[m.icon]}
                <span className="relative">
                  {m.nhan}
                  {active ? (
                    <span className="absolute left-1/2 top-[18px] h-[3px] w-8 -translate-x-1/2 rounded-full bg-white" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto">
          <MenuTaiKhoan nguoiDung={nguoiDung} />
        </div>
      </div>
    </header>
  );
}
