import type { ThemeConfig } from "antd";

/**
 * Token giao diện dùng chung. Đổi màu/khoảng cách ở đây, KHÔNG ghi đè bằng
 * class Tailwind trên từng component antd — làm vậy mỗi màn hình sẽ lệch nhau.
 *
 * Giữ `colorPrimary` trùng với --color-brand-500 trong src/app/globals.css.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1677ff",
    colorSuccess: "#16a34a",
    colorWarning: "#f59e0b",
    colorError: "#dc2626",
    borderRadius: 6,
    // Màn hình kho chủ yếu là bảng số liệu dày đặc, cỡ chữ 14 dễ đọc trên
    // máy văn phòng lẫn điện thoại thủ kho.
    fontSize: 14,
  },
  components: {
    Table: {
      // Bảng lô hàng thường dài, header dính giúp không mất tên cột khi cuộn.
      headerBg: "#fafafa",
      cellPaddingBlock: 10,
    },
    Layout: {
      siderBg: "#ffffff",
      headerBg: "#ffffff",
      headerHeight: 56,
    },
    Menu: {
      itemHeight: 40,
    },
  },
};
