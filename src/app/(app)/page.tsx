import { ChuaTrienKhai } from "@/shared/components/chua-trien-khai";
import { PageHeader } from "@/shared/components/page-header";

export default function TongQuanPage() {
  return (
    <>
      <PageHeader
        tieuDe="Tổng quan sản xuất"
        moTa="Tình hình 5 xưởng và tồn kho trong ngày."
      />

      <ChuaTrienKhai
        seCo={[
          "Số lô đang chạy tại từng xưởng: ép nhựa, sơn, carbon, xi mạ, đóng gói",
          "Lô trễ tiến độ so với ngày giao dự kiến",
          "Tồn kho chạm ngưỡng cảnh báo (nguyên vật liệu, phôi chờ xử lý, thành phẩm)",
          "Tỷ lệ phế phẩm và FTY trong ngày theo xưởng",
        ]}
        phuThuoc="thiết kế schema database và màn hình Lệnh sản xuất"
      />
    </>
  );
}
