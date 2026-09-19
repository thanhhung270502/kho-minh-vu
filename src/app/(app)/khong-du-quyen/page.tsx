import type { Metadata } from "next";

import { Forbidden } from "@/shared/components/forbidden";

export const metadata: Metadata = { title: "Không đủ quyền" };

export default function ForbiddenPage() {
  return <Forbidden />;
}
