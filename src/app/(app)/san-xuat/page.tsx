import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Lệnh sản xuất" };

export default function SanXuatPage() {
  return (
    <>
      <PageHeader
        tieuDe="Lệnh sản xuất"
        moTa="Theo dõi từng lô đi qua các công đoạn của 5 xưởng."
      />

      <ChuaTrienKhai
        seCo={[
          "Danh sách lệnh sản xuất kèm bộ lọc theo xưởng, trạng thái, khoảng ngày",
          "Chi tiết lô: đang ở công đoạn nào, ai xác nhận, thời điểm vào/ra công đoạn",
          "Ghi nhận sản lượng đạt / phế phẩm kèm lý do (bavia, rỗ khí, cong vênh, bám dính kém)",
          "Chuyển lô sang công đoạn kế tiếp hoặc nhập kho phôi chờ xử lý",
        ]}
        phuThuoc="thiết kế schema database (bảng lô, công đoạn, lịch sử chuyển công đoạn)"
      />
    </>
  );
}
