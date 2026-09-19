import type { ThemeConfig } from "antd";

/**
 * Token giao diện dùng chung. Đổi màu/khoảng cách ở đây, KHÔNG ghi đè bằng
 * class Tailwind trên từng component antd — làm vậy mỗi màn hình sẽ lệch nhau.
 *
 * Giữ `colorPrimary` trùng với --color-brand-600 trong src/app/globals.css.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1652F0",
    colorLink: "#1652F0",
    colorInfo: "#1652F0",
    colorSuccess: "#16A34A",
    colorWarning: "#F59E0B",
    colorError: "#E5484D",
    colorBgLayout: "#F0F2F5",
    colorBgContainer: "#FFFFFF",
    colorText: "#1F2A37",
    colorTextSecondary: "#6B7280",
    colorBorder: "#E5E7EB",
    colorBorderSecondary: "#F0F0F0",
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    // Màn hình kho chủ yếu là bảng số liệu dày đặc, cỡ chữ 14 dễ đọc trên
    // máy văn phòng lẫn điện thoại thủ kho.
    fontSize: 14,
    boxShadowTertiary: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
  },
  components: {
    Table: {
      // Bảng lô hàng thường dài, header dính giúp không mất tên cột khi cuộn.
      headerBg: "#E8F0FE",
      headerColor: "#344054",
      borderColor: "#F0F0F0",
      rowHoverBg: "#F7F9FC",
      cellPaddingBlock: 10,
    },
    Layout: {
      bodyBg: "#F0F2F5",
      headerBg: "#FFFFFF",
      headerHeight: 56,
    },
    Modal: {
      borderRadiusLG: 16,
      titleFontSize: 18,
    },
    Tag: {
      defaultBg: "#F1F3F5",
      defaultColor: "#6B7280",
    },
    Menu: {
      itemHeight: 40,
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
    },
  },
};
