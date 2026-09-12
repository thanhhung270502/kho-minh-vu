import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const fontSans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-app-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Hệ thống theo dõi sản xuất & tồn kho",
    template: "%s · Theo dõi sản xuất",
  },
  description:
    "Theo dõi lô sản xuất qua 5 xưởng (ép nhựa, sơn, carbon, xi mạ, đóng gói) và tồn kho nguyên vật liệu, bán thành phẩm, thành phẩm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={fontSans.variable}>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
