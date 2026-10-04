import type { StatusTone } from "@/shared/lib/status-tone";

import { cn } from "../utils/cn";

const DOT: Record<StatusTone, string> = {
  pending: "bg-canh-bao",
  active: "bg-trung-tinh-400",
  done: "bg-chu-chinh",
  danger: "bg-nguy-hiem",
  muted: "bg-trung-tinh-250",
};

const TEXT: Record<StatusTone, string> = {
  pending: "text-chu-chinh",
  active: "text-chu-chinh",
  done: "text-chu-chinh",
  danger: "text-nguy-hiem",
  muted: "text-trung-tinh-300",
};

const BADGE: Record<StatusTone, string> = {
  pending: "bg-canh-bao-nen text-canh-bao-chu",
  active: "bg-trung-tinh-75 text-trung-tinh-600",
  done: "bg-trung-tinh-75 text-chu-chinh",
  danger: "bg-nguy-hiem/10 text-nguy-hiem",
  muted: "bg-trung-tinh-75 text-trung-tinh-350",
};

type Props = {
  tone: StatusTone;
  children: React.ReactNode;
  /**
   * `dot` cho ô bảng (chấm + chữ, không nền); `badge` cho đầu trang chi tiết
   * (viên thuốc nền nhạt). Design 1A bỏ hẳn Tag có viền màu cho trạng thái.
   */
  variant?: "dot" | "badge";
  /** Gạch ngang chữ — dành cho chứng từ/phiên đã hủy. */
  strike?: boolean;
  className?: string;
};

/**
 * Hiển thị trạng thái bằng chấm màu + chữ. Không phải component antd và không
 * có hook nên dùng được cả ở Server Component lẫn Client Component.
 */
export function StatusDot({
  tone,
  children,
  variant = "dot",
  strike = false,
  className,
}: Props) {
  const dot = (
    <span className={cn("size-[7px] shrink-0 rounded-full", DOT[tone])} />
  );

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex h-[26px] items-center gap-[7px] rounded-full px-2.5 text-[12.5px] font-semibold whitespace-nowrap",
          BADGE[tone],
          className,
        )}
      >
        {dot}
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap",
        TEXT[tone],
        strike && "line-through decoration-trung-tinh-250",
        className,
      )}
    >
      {dot}
      {children}
    </span>
  );
}
