import type { ThemeConfig } from "antd";

/**
 * Token giao diện dùng chung. Đổi màu/khoảng cách ở đây, KHÔNG ghi đè bằng
 * class Tailwind trên từng component antd — làm vậy mỗi màn hình sẽ lệch nhau.
 *
 * Design system đơn sắc "hướng 3b" (Phase 20, nối tiếp 1A của quick 261004-f2l):
 * đen #0A0A0A là màu chính, thẻ trắng viền mảnh #EDEDED không đổ bóng, màu chỉ
 * dùng để báo hiệu (cam = cần xử lý, đỏ = tồn âm/lỗi). Giữ `colorPrimary` trùng
 * với `--color-brand-500` trong src/app/globals.css.
 */
const INK = "#0A0A0A";
// Chữ thường dịu hơn mực của nút/viền chọn: đen tuyền trên trắng tinh bị góp ý là chói.
const TEXT = "#262626";
// Nền trang trắng ngà — thẻ vẫn trắng nên tách lớp rõ mà đỡ chói.
const PAGE_BG = "#F3F2EF";
const WARNING = "#BF6600"; // oklch(0.6 0.15 60) trong design
const DANGER = "#CC2827"; // oklch(0.55 0.2 27)
const SUCCESS = "#2F9E5B";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: INK,
    colorPrimaryHover: "#262626",
    colorPrimaryActive: "#000000",
    // antd tự sinh các bậc nhạt (nền thông báo, nền ngày được chọn, option
    // đang chọn…) từ màu seed. Seed là đen thì các bậc "nhạt" ra xám đậm —
    // Alert info thành dải đen. Khai báo tường minh để giữ nền sáng.
    colorPrimaryBg: "#F3F3F3",
    colorPrimaryBgHover: "#EBEBEB",
    colorPrimaryBorder: "#D4D4D4",
    colorPrimaryBorderHover: "#A3A3A3",
    colorLink: INK,
    colorLinkHover: "#404040",
    colorInfo: INK,
    colorInfoBg: "#F5F5F5",
    colorInfoBgHover: "#EBEBEB",
    colorInfoBorder: "#E5E5E5",
    colorInfoBorderHover: "#D4D4D4",
    colorSuccess: SUCCESS,
    colorWarning: WARNING,
    colorError: DANGER,
    colorText: TEXT,
    // Chữ phụ đậm hơn (góp ý: chữ xám nhạt nhỏ khó đọc).
    colorTextSecondary: "#5E5E5E",
    colorTextTertiary: "#737373",
    colorTextQuaternary: "#8C8C8C",
    colorTextPlaceholder: "#8C8C8C",
    colorBorder: "#E5E5E5",
    colorBorderSecondary: "#EDEDED",
    colorSplit: "#F3F3F3",
    colorBgLayout: PAGE_BG,
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorFillSecondary: "#F3F3F3",
    colorFillTertiary: "#F5F5F5",
    controlItemBgActive: "#F3F3F3",
    controlItemBgActiveHover: "#EBEBEB",
    controlOutline: "rgba(10,10,10,.08)",
    // Góp ý người dùng (2 lần): chữ nhỏ — 14/12 → 16/14 cho bảng dày đọc lâu không mỏi.
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    lineHeight: 1.5,
    fontFamily: "var(--font-sans)",
    fontFamilyCode: "var(--font-mono)",
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 4,
    // Thẻ trong design chỉ có viền, không đổ bóng; bóng chỉ còn cho lớp nổi
    // (dropdown, modal) để vẫn tách khỏi nền.
    boxShadowTertiary: "none",
    boxShadowSecondary: "0 6px 24px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)",
    fontWeightStrong: 700,
    controlHeight: 38,
  },
  components: {
    Table: {
      headerBg: "#FAFAFA",
      headerColor: "#5E5E5E",
      headerSplitColor: "transparent",
      headerSortActiveBg: "#F5F5F5",
      headerSortHoverBg: "#F5F5F5",
      borderColor: "#F3F3F3",
      // Rê chuột phải thấy rõ đang ở dòng nào trên bảng dày (#FAFAFA cũ gần như
      // trùng nền trắng). Vẫn là xám — màu chỉ dùng để báo hiệu.
      rowHoverBg: "#EDEDED",
      rowSelectedBg: "#F3F3F3",
      rowSelectedHoverBg: "#E5E5E5",
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      headerBorderRadius: 0,
      footerBg: "#FAFAFA",
    },
    Layout: {
      bodyBg: PAGE_BG,
      headerBg: "#FFFFFF",
      headerHeight: 60,
    },
    Modal: {
      borderRadiusLG: 16,
      titleFontSize: 18,
      titleColor: INK,
      contentBg: "#FFFFFF",
      headerBg: "#FFFFFF",
      footerBg: "#FFFFFF",
    },
    // Tag trong design là chip nền xám nhạt, không viền.
    Tag: {
      defaultBg: "#F3F3F3",
      defaultColor: "#404040",
      borderRadiusSM: 9999,
    },
    Menu: {
      itemHeight: 40,
      itemSelectedBg: "#F3F3F3",
      itemSelectedColor: INK,
    },
    Button: {
      borderRadius: 9999,
      borderRadiusLG: 9999,
      borderRadiusSM: 9999,
      fontWeight: 600,
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      defaultBorderColor: "#E5E5E5",
      defaultHoverBorderColor: "#A3A3A3",
      defaultHoverColor: INK,
    },
    Input: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: INK,
      activeShadow: "0 0 0 3px rgba(10,10,10,.08)",
      colorBgContainerDisabled: "#F3F3F3",
    },
    InputNumber: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: INK,
      activeShadow: "0 0 0 3px rgba(10,10,10,.08)",
    },
    Select: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: INK,
      activeOutlineColor: "rgba(10,10,10,.08)",
      optionSelectedBg: "#F3F3F3",
      // Dòng đang trỏ bằng ↑/↓ phải nhìn thấy rõ — Enter sẽ chọn đúng dòng này.
      optionActiveBg: "#E2E2E2",
      colorBgContainerDisabled: "#F3F3F3",
    },
    // Công tắc bật = đang hoạt động / đang dùng: xanh lá, không dùng màu đen chủ đạo.
    Switch: {
      colorPrimary: SUCCESS,
      colorPrimaryHover: "#268A4E",
    },
    DatePicker: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: INK,
      activeShadow: "0 0 0 3px rgba(10,10,10,.08)",
      colorBgContainerDisabled: "#F3F3F3",
    },
    Card: {
      borderRadiusLG: 16,
      colorBorderSecondary: "#EDEDED",
      headerFontSize: 17,
    },
    Checkbox: {
      borderRadiusSM: 4,
    },
    Segmented: {
      itemSelectedBg: "#FFFFFF",
      itemSelectedColor: INK,
      itemColor: "#5E5E5E",
      itemHoverColor: INK,
      trackBg: "#F5F5F5",
      borderRadius: 9,
      borderRadiusSM: 7,
    },
    Tabs: {
      inkBarColor: INK,
      itemSelectedColor: INK,
      itemHoverColor: "#404040",
    },
    Pagination: {
      itemActiveBg: INK,
      itemActiveColor: "#FFFFFF",
      itemActiveColorHover: "#FFFFFF",
    },
    Statistic: {
      contentFontSize: 28,
    },
    Form: {
      labelColor: "#5E5E5E",
      labelFontSize: 14,
      labelRequiredMarkColor: DANGER,
      itemMarginBottom: 16,
    },
  },
};
