import type { ThemeConfig } from "antd";

/**
 * Token giao diện dùng chung. Đổi màu/khoảng cách ở đây, KHÔNG ghi đè bằng
 * class Tailwind trên từng component antd — làm vậy mỗi màn hình sẽ lệch nhau.
 *
 * Giá trị lấy từ script trích xuất CSS thật của KiotViet (fnb.kiotviet.vn), đã
 * giải hết alias `--kv-*` và quy đổi rem->px. Giữ `colorPrimary` trùng với
 * `--color-brand-500` trong src/app/globals.css (thang màu của KiotViet đặt
 * mốc chính ở bậc 500, không phải 600 như bản ước lượng từ ảnh trước đây).
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0070F4",
    colorPrimaryHover: "#005AC3",
    colorPrimaryActive: "#004392",
    colorLink: "#0070F4",
    colorInfo: "#0070F4",
    colorSuccess: "#00B63E",
    colorWarning: "#FF8800",
    colorError: "#FF0000",
    colorText: "#15171A",
    colorTextSecondary: "#525D6A",
    colorTextTertiary: "#85909D",
    colorTextQuaternary: "#A4ACB5",
    colorBorder: "#D1D5DA",
    colorBorderSecondary: "#E8EAED",
    colorBgLayout: "#F7F8F9",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorFillSecondary: "#F0F1F3",
    colorFillTertiary: "#F7F8F9",
    // Màn hình kho chủ yếu là bảng số liệu dày đặc, cỡ chữ 14 dễ đọc trên
    // máy văn phòng lẫn điện thoại thủ kho.
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    lineHeight: 1.4286,
    borderRadius: 9,
    borderRadiusLG: 12,
    borderRadiusSM: 7,
    borderRadiusXS: 4,
    boxShadowTertiary: "-8px 8px 24px 0 rgba(0,0,0,.04)",
    controlHeight: 32,
  },
  components: {
    Table: {
      // Bảng lô hàng thường dài, header dính giúp không mất tên cột khi cuộn.
      headerBg: "#E6F1FE",
      headerColor: "#15171A",
      headerSplitColor: "transparent",
      borderColor: "#E8EAED",
      rowHoverBg: "#F0F1F3",
      rowSelectedBg: "#CCE2FD",
      rowSelectedHoverBg: "#B3D4FC",
      cellPaddingBlock: 6,
      cellPaddingInline: 10,
      headerBorderRadius: 12,
    },
    Layout: {
      bodyBg: "#F7F8F9",
      headerBg: "#FFFFFF",
      headerHeight: 56,
    },
    Modal: {
      borderRadiusLG: 24,
      titleFontSize: 18,
      titleColor: "#15171A",
      contentBg: "#FFFFFF",
      headerBg: "#FFFFFF",
      footerBg: "#FFFFFF",
      boxShadow: "0 8px 16px rgba(0,0,0,.15)",
    },
    // Tag KiotViet là dạng VIỀN nền trong suốt (không phải nền xám đặc như bản
    // ước lượng trước) — border tự động lấy từ colorBorder ở trên (#D1D5DA).
    Tag: {
      defaultBg: "transparent",
      defaultColor: "#3E464F",
      borderRadiusSM: 7,
    },
    Menu: {
      itemHeight: 40,
    },
    Button: {
      borderRadius: 12,
      fontWeight: 600,
      primaryShadow: "0 2px 12px 0 rgba(0,112,244,.15)",
      defaultShadow: "none",
    },
    Input: {
      borderRadius: 9,
      hoverBorderColor: "#A4ACB5",
      activeBorderColor: "#0070F4",
      activeShadow: "0 2px 12px 0 rgba(0,112,244,.35)",
      colorBgContainerDisabled: "#F0F1F3",
    },
    Select: {
      borderRadius: 9,
      hoverBorderColor: "#A4ACB5",
      activeBorderColor: "#0070F4",
      colorBgContainerDisabled: "#F0F1F3",
      // Select không có token `activeShadow` riêng (chỉ Input/DatePicker có) —
      // bỏ hẳn thay vì ép kiểu, đúng luật "token antd không nhận thì bỏ".
    },
    DatePicker: {
      borderRadius: 9,
      hoverBorderColor: "#A4ACB5",
      activeBorderColor: "#0070F4",
      activeShadow: "0 2px 12px 0 rgba(0,112,244,.35)",
      colorBgContainerDisabled: "#F0F1F3",
    },
    Card: {
      borderRadiusLG: 12,
      colorBorderSecondary: "transparent",
      // Không đặt thêm `boxShadow` riêng cho Card: đổ bóng thật của Card lấy
      // từ `boxShadowTertiary` ở token chung, đã khớp giá trị KiotViet phía trên.
    },
    Form: {
      labelColor: "#15171A",
      labelFontSize: 12,
      labelRequiredMarkColor: "#FF0000",
      itemMarginBottom: 16,
    },
  },
};
