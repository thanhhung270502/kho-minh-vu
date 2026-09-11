import type { Metadata } from "next";

import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Báo cáo" };

export default function BaoCaoPage() {
  return (
    <>
      <PageHeader
        tieuDe="Báo cáo"
        moTa="Thay thế báo cáo thủ công đang làm trên Google Sheet."
      />

      <ChuaTrienKhai
        seCo={[
          "Sản lượng theo xưởng / theo ca / theo khoảng ngày",
          "Tỷ lệ phế phẩm và FTY, phân tích theo mã lỗi và theo khuôn",
          "Biến động tồn kho đầu kỳ - nhập - xuất - cuối kỳ",
          "Xuất file Excel giữ đúng định dạng đang dùng để nộp",
        ]}
        phuThuoc="có dữ liệu thật từ màn hình Lệnh sản xuất và Tồn kho"
      />
    </>
  );
}
