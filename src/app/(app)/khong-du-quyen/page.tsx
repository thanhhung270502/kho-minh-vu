import type { Metadata } from "next";

import { KhongDuQuyen } from "@/shared/components/khong-du-quyen";

export const metadata: Metadata = { title: "Không đủ quyền" };

export default function KhongDuQuyenPage() {
  return <KhongDuQuyen />;
}
