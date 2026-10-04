import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

// Design system "Kho Minh Vu 1A": Be Vietnam Pro cho chữ (dấu tiếng Việt
// cân hơn Inter), JetBrains Mono cho số phiếu và mã hàng.
const fontSans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-app-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-app-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Kho Minh Vũ",
    template: "%s · Kho Minh Vũ",
  },
  description:
    "Quản lý xuất nhập tồn phụ tùng xe máy cho CTY TNHH SX-TM P.Tùng Xe Máy Minh Vũ.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
