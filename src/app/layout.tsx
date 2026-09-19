import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

// KiotViet dùng Inter, Roboto, Helvetica, Arial — đổi từ Be Vietnam Pro để
// giao diện gần với cái người dùng đang quen. Weight 800 dùng cho số liệu
// nổi bật trên dashboard (Phase 5).
const fontSans = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-app-sans",
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
    <html lang="vi" className={fontSans.variable}>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
