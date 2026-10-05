/**
 * Người nhận của đơn đặt hàng / hóa đơn: một đối tác (tùy chọn) cộng danh sách
 * nhân viên có thứ tự, ghi ở bảng nối (0090). "Nội bộ" nghĩa là không có đối tác.
 *
 * File thuần, không gắn chỉ thị client component (bẫy 9): Server Component, phiếu
 * in và script kiểm hàm thuần đều import được.
 */
export type RecipientKind = "partner" | "internal";

export const RECIPIENT_KIND_LABELS: Record<RecipientKind, string> = {
  internal: "Nội bộ",
  partner: "Đối tác",
};

export type StaffRef = { id: string; name: string };
export type PartnerRef = { id: string; code: string | null; name: string | null };
export type OrderRecipients = { partner: PartnerRef | null; staff: StaffRef[] };

/** Nhãn ô "Người nhận" của dòng hàng chung khi đơn có ≥ 2 nhân viên (D2/D4). */
export const COMMON_GOODS_LABEL = "Chung";

/** RPC trả hai mảng song song (id, tên) cùng thứ tự; null khi không có. */
export function toStaffRefs(
  ids: readonly string[] | null | undefined,
  names: readonly (string | null)[] | null | undefined,
): StaffRef[] {
  return (ids ?? []).map((id, index) => ({ id, name: names?.[index] ?? "?" }));
}

export function recipientKindOf(recipients: OrderRecipients): RecipientKind {
  return recipients.partner ? "partner" : "internal";
}

/**
 * Phiếu in (DDAT-02): chỉ tên đầy đủ của người nhận — không tiền tố "Nội bộ —",
 * không mã đối tác.
 */
export function recipientDisplayName(name: string | null | undefined): string {
  return name?.trim() || "—";
}

export function staffNames(staff: readonly StaffRef[]): string {
  return (
    staff
      .map((person) => person.name.trim())
      .filter(Boolean)
      .join(", ") || "—"
  );
}

/**
 * Đối tác nội bộ: mã bắt đầu "NB" (NB001 Bộ phận điều phối đơn, NB002 Nhập bù —
 * tồn nội bộ). Hàng của các đơn này thật ra giao qua nhân viên nhận, rồi nhân viên
 * giao tận tay khách — trên giấy tờ không ghi tên khách.
 */
export function isInternalPartnerCode(code: string | null | undefined): boolean {
  return /^NB\d/i.test(code?.trim() ?? "");
}

/** Đơn của đối tác nội bộ có nhân viên nhận: chỉ hiện tên nhân viên, ẩn tên đối tác. */
export function showsStaffOnly(recipients: OrderRecipients): boolean {
  return (
    recipients.partner !== null &&
    isInternalPartnerCode(recipients.partner.code) &&
    recipients.staff.length > 0
  );
}

export function partnerLabel(partner: PartnerRef): string {
  return [partner.code, partner.name].filter(Boolean).join(" ") || "—";
}

export function formatOrderRecipients(recipients: OrderRecipients): string {
  const { partner, staff } = recipients;
  if (showsStaffOnly(recipients)) return staffNames(staff);
  if (partner) {
    return staff.length > 0
      ? `${partnerLabel(partner)} · ${staffNames(staff)}`
      : partnerLabel(partner);
  }
  // 0097: đơn tạm được tạo trước, người nhận chọn sau trong trang đơn.
  return staff.length > 0 ? staffNames(staff) : "Chưa chọn người nhận";
}

export function lineRecipientLabel(
  name: string | null | undefined,
  staffCount: number,
): string {
  return name?.trim() || (staffCount >= 2 ? COMMON_GOODS_LABEL : "");
}

/** Lưới dòng chỉ hiện cột/ô người nhận khi đơn thật sự có nhiều người — đơn một người nhập nhanh như cũ (D2). */
export function isMultiRecipientOrder(
  staffCount: number,
  anyLineAssigned: boolean,
): boolean {
  return staffCount >= 2 || anyLineAssigned;
}
