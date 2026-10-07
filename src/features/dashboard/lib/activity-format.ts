// File thuần (bẫy 9): component client và scripts/test-pure-functions.ts cùng import.
// Dựng câu và đường dẫn cho một dòng "Hoạt động gần đây".
import type { ActivityAction, ActivityEvent, ActivityGroup, ActivityKind } from "../types";

export const ACTIVITY_GROUPS: Array<{ key: ActivityGroup; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "orders", label: "Đơn đặt" },
  { key: "issues", label: "Duyệt đơn" },
  { key: "receipts", label: "Nhập hàng" },
  { key: "other", label: "Khác" },
  { key: "catalog", label: "Hàng hóa" },
];

/** Hợp đồng với p_nhom của hoat_dong_gan_day (0116). */
export const ACTIVITY_GROUP_TO_RPC: Record<ActivityGroup, string | undefined> = {
  all: undefined,
  orders: "don_dat",
  receipts: "nhap",
  issues: "xuat",
  other: "khac",
  catalog: "danh_muc",
};

const NOUNS: Record<ActivityKind, string> = {
  DON_DAT: "đơn",
  NHAP: "phiếu nhập",
  XUAT: "hóa đơn",
  TRA_NCC: "phiếu trả NCC",
  TRA_KHACH: "phiếu khách trả",
  KIEM_KE: "phiếu kiểm kho",
  DIEU_CHINH: "phiếu điều chỉnh",
  CHUYEN_KHO: "phiếu chuyển kho",
  SAN_PHAM: "mã hàng",
  DOI_TAC: "đối tác",
};

const VERBS: Record<ActivityAction, string> = {
  tao: "tạo",
  sua: "sửa",
  xac_nhan: "xác nhận",
  mo_khoa: "mở khóa",
  hoan_thanh: "hoàn thành",
  huy: "hủy",
  ghi_so: "ghi sổ",
};

/** Chấm màu theo thao tác — cùng màu với StatusDot: cam = còn việc, mực = đã chốt, xám = hủy. */
export const ACTIVITY_DOT: Record<ActivityAction, string> = {
  tao: "bg-trung-tinh-400",
  sua: "bg-canh-bao",
  xac_nhan: "bg-chu-chinh",
  mo_khoa: "bg-canh-bao",
  hoan_thanh: "bg-chu-chinh",
  huy: "bg-trung-tinh-250",
  ghi_so: "bg-chu-chinh",
};

/** "tạo đơn", "nhập Excel 24 mã hàng", "ghi sổ 86 phiếu nhập" — chưa có tên người. */
export function activityPhrase(event: ActivityEvent): { verb: string; object: string } {
  const noun = NOUNS[event.kind];
  const verb =
    event.viaImport && (event.action === "tao" || event.action === "sua")
      ? event.action === "tao"
        ? "nhập Excel"
        : "cập nhật Excel"
      : VERBS[event.action];
  if (event.count > 1) return { verb, object: `${event.count.toLocaleString("vi-VN")} ${noun}` };
  return { verb, object: noun };
}

const DETAIL_BASE: Partial<Record<ActivityKind, string>> = {
  DON_DAT: "/don-dat",
  NHAP: "/nhap-hang",
  XUAT: "/duyet-don",
  TRA_NCC: "/tra-hang",
  TRA_KHACH: "/tra-hang",
  KIEM_KE: "/kiem-ke",
  SAN_PHAM: "/danh-muc",
};

const LIST_PATH: Partial<Record<ActivityKind, string>> = {
  DON_DAT: "/don-dat",
  NHAP: "/nhap-hang",
  XUAT: "/duyet-don",
  KIEM_KE: "/kiem-ke",
  SAN_PHAM: "/danh-muc",
  DOI_TAC: "/doi-tac",
};

/** Một bản ghi → trang chi tiết; nhiều bản ghi gộp → danh sách. null = chưa có màn để mở. */
export function activityHref(event: ActivityEvent): string | null {
  if (event.count > 1 || !event.targetId) return LIST_PATH[event.kind] ?? null;
  if (event.kind === "DOI_TAC") return `/doi-tac?chon=${event.targetId}`;
  const base = DETAIL_BASE[event.kind];
  return base ? `${base}/${event.targetId}` : null;
}

/** "Vừa xong", "5 phút trước", "3 giờ trước", "Hôm qua 14:20", "05/10 09:12". */
export function activityTime(at: string, now: Date = new Date()): string {
  const time = new Date(at);
  const minutes = Math.floor((now.getTime() - time.getTime()) / 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hhmm = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (time >= startOfToday) return `${Math.floor(minutes / 60)} giờ trước`;
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (time >= startOfYesterday) return `Hôm qua ${hhmm}`;
  return `${pad(time.getDate())}/${pad(time.getMonth() + 1)} ${hhmm}`;
}
