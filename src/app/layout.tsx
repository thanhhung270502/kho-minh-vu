import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

// Design system 3b: Manrope cho chữ (có subset vietnamese, đậm 800 cho tiêu
// đề), JetBrains Mono cho số phiếu và mã hàng.
const fontSans = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
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
