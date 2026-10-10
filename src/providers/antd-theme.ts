import type { ThemeConfig } from "antd";

/**
 * Token giao diện dùng chung. Đổi màu/khoảng cách ở đây, KHÔNG ghi đè bằng
 * class Tailwind trên từng component antd — làm vậy mỗi màn hình sẽ lệch nhau.
 *
 * Theme trắng – xanh dương, nối tiếp design system "hướng 3b" (Phase 20): nền
 * trắng tinh, thẻ trắng viền mảnh #EDEDED không đổ bóng, chữ và viền giữ thang
 * xám. Xanh dương #0070F4 là màu chính — nút chính, mục đang chọn, liên kết,
 * ô đang focus. Cam = cần xử lý, đỏ = tồn âm/lỗi vẫn giữ nguyên nghĩa báo hiệu.
 * Giữ `colorPrimary` trùng với `--color-brand-500` trong src/app/globals.css.
 */
const PRIMARY = "#0070F4";
const PRIMARY_HOVER = "#1A7EF5";
const PRIMARY_ACTIVE = "#0057BD";
// Nền xanh rất nhạt cho mục đang chọn (option, menu, dòng bảng được chọn).
const PRIMARY_BG = "#EAF3FE";
const PRIMARY_BG_HOVER = "#DCEBFE";
const PRIMARY_RING = "rgba(0,112,244,.12)";
// Tiêu đề modal giữ mực đậm — chỉ phần tương tác mới mang màu xanh.
const INK = "#0A0A0A";
// Chữ thường dịu hơn mực của nút/viền chọn: đen tuyền trên trắng tinh bị góp ý là chói.
const TEXT = "#262626";
// Nền trang xám ngả xanh — thẻ trắng nổi lên bằng viền #E6ECF4 + bóng nhẹ.
const PAGE_BG = "#F3F6FB";
const CARD_BORDER = "#E6ECF4";
const CARD_SHADOW = "0 1px 2px rgba(16,40,80,.04), 0 4px 16px -8px rgba(16,40,80,.08)";
// Header bảng, dòng tổng, đường kẻ giữa các dòng — cùng tông xanh nhạt với nền.
const TABLE_HEAD_BG = "#F6F9FD";
const ROW_SPLIT = "#EEF2F7";
const WARNING = "#BF6600"; // oklch(0.6 0.15 60) trong design
const DANGER = "#CC2827"; // oklch(0.55 0.2 27)
const SUCCESS = "#2F9E5B";

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: PRIMARY,
    colorPrimaryHover: PRIMARY_HOVER,
    colorPrimaryActive: PRIMARY_ACTIVE,
    // Khai báo tường minh các bậc nhạt để khớp thang --color-brand-* ở
    // globals.css, không để antd tự sinh lệch tông.
    colorPrimaryBg: PRIMARY_BG,
    colorPrimaryBgHover: PRIMARY_BG_HOVER,
    colorPrimaryBorder: "#99C5FB",
    colorPrimaryBorderHover: "#4D9AF7",
    colorLink: PRIMARY,
    colorLinkHover: PRIMARY_HOVER,
    colorLinkActive: PRIMARY_ACTIVE,
    colorInfo: PRIMARY,
    colorInfoBg: "#F5F9FF",
    colorInfoBgHover: PRIMARY_BG,
    colorInfoBorder: "#CCE2FD",
    colorInfoBorderHover: "#99C5FB",
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
    colorBorderSecondary: CARD_BORDER,
    colorSplit: ROW_SPLIT,
    colorBgLayout: PAGE_BG,
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorFillSecondary: "#F3F3F3",
    colorFillTertiary: "#F5F5F5",
    controlItemBgActive: PRIMARY_BG,
    controlItemBgActiveHover: PRIMARY_BG_HOVER,
    controlOutline: PRIMARY_RING,
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
    // Thẻ (Card) dùng boxShadowTertiary: bóng rất nhẹ để tách khỏi nền #F3F6FB.
    boxShadowTertiary: CARD_SHADOW,
    boxShadowSecondary: "0 6px 24px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)",
    fontWeightStrong: 700,
    controlHeight: 38,
  },
  components: {
    Table: {
      headerBg: TABLE_HEAD_BG,
      headerColor: "#5E5E5E",
      headerSplitColor: "transparent",
      headerSortActiveBg: "#F5F5F5",
      headerSortHoverBg: "#F5F5F5",
      borderColor: ROW_SPLIT,
      // Rê chuột phải thấy rõ đang ở dòng nào trên bảng dày (#FAFAFA cũ gần như
      // trùng nền trắng). Hover xanh xám đủ đậm; dòng được chọn xanh rõ hơn.
      rowHoverBg: "#EBF0F7",
      rowSelectedBg: PRIMARY_BG,
      rowSelectedHoverBg: PRIMARY_BG_HOVER,
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
      headerBorderRadius: 0,
      footerBg: TABLE_HEAD_BG,
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
      itemSelectedBg: PRIMARY_BG,
      itemSelectedColor: PRIMARY,
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
      defaultHoverBorderColor: PRIMARY,
      defaultHoverColor: PRIMARY,
    },
    Input: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: PRIMARY,
      activeShadow: `0 0 0 3px ${PRIMARY_RING}`,
      colorBgContainerDisabled: "#F3F3F3",
    },
    InputNumber: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: PRIMARY,
      activeShadow: `0 0 0 3px ${PRIMARY_RING}`,
    },
    Select: {
      borderRadius: 10,
      hoverBorderColor: "#A3A3A3",
      activeBorderColor: PRIMARY,
      activeOutlineColor: PRIMARY_RING,
      optionSelectedBg: PRIMARY_BG,
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
      activeBorderColor: PRIMARY,
      activeShadow: `0 0 0 3px ${PRIMARY_RING}`,
      colorBgContainerDisabled: "#F3F3F3",
    },
    Card: {
      borderRadiusLG: 16,
      colorBorderSecondary: CARD_BORDER,
      headerFontSize: 17,
    },
    Checkbox: {
      borderRadiusSM: 4,
    },
    Segmented: {
      itemSelectedBg: "#FFFFFF",
      itemSelectedColor: PRIMARY,
      itemColor: "#5E5E5E",
      itemHoverColor: INK,
      trackBg: "#F5F5F5",
      borderRadius: 9,
      borderRadiusSM: 7,
    },
    Tabs: {
      inkBarColor: PRIMARY,
      itemSelectedColor: PRIMARY,
      itemHoverColor: PRIMARY_HOVER,
    },
    Pagination: {
      itemActiveBg: PRIMARY,
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
