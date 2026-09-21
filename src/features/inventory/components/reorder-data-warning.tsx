"use client";

import { Alert } from "antd";

// Số đo lưu trữ KiotViet ngày 20/09 (05-CONTEXT §Specific Ideas). RPC chỉ trả độ dài
// cửa sổ, không trả ngày đầu/cuối hay số mã có lịch sử — nạp thêm lưu trữ thì sửa ở đây.
export const ARCHIVE_SNAPSHOT = {
  days: 10,
  period: "03/09 → 12/09/2026",
  productsWithHistory: "1.223",
  totalProducts: "3.266",
};

type Props = {
  /** `so_ngay_du_lieu` thật lấy từ dòng đầu của `de_xuat_dinh_muc`. */
  dataDays: number;
};

/**
 * Bắt buộc, không phải trang trí (D-04): người duyệt phải biết đề xuất dựa trên
 * bao nhiêu ngày dữ liệu trước khi bấm, nếu không là duyệt mù cả nghìn dòng.
 */
export function ReorderDataWarning({ dataDays }: Props) {
  // Cửa sổ thật khác số đo thì ngày và độ phủ ở trên đã cũ — thà không nói còn hơn nói sai.
  const snapshot = dataDays === ARCHIVE_SNAPSHOT.days ? ARCHIVE_SNAPSHOT : null;

  return (
    <Alert
      type="warning"
      showIcon
      className="mb-4"
      title={`Lịch sử bán dùng để đề xuất chỉ trải ${dataDays} ngày — xem cột Căn cứ trước khi duyệt`}
      description={
        <ul className="m-0 list-disc space-y-1 ps-5">
          <li>
            Đề xuất suy từ hóa đơn lưu trữ KiotViet
            {snapshot ? ` ${snapshot.period}` : ""}, chỉ {dataDays} ngày
            {snapshot
              ? `, chạm ${snapshot.productsWithHistory} trong ${snapshot.totalProducts} mã`
              : ""}
            . Mã chưa từng bán mượn trung bình của nhóm hàng.
          </li>
          <li>
            Ngần ấy ngày quá ngắn để nói về tốc độ bán: một đơn lớn bất thường
            đủ thổi định mức của mã đó lên gấp đôi. Mã chỉ có một, hai lần bán
            là con số kém tin nhất.
          </li>
          <li>
            Nên chạy lại màn này sau vài tháng, khi hệ mới đã có lịch sử bán của
            chính nó.
          </li>
        </ul>
      }
    />
  );
}
