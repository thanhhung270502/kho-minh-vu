/**
 * Người nhận của đơn đặt hàng / phiếu xuất: đối tác hoặc nhân viên nội bộ.
 *
 * Database giữ hai cột (`doi_tac_id`, `nguoi_nhan_id`) với CHECK đúng một cột
 * có giá trị (0076). Component chỉ thấy union này — không bao giờ phải tự đoán
 * chế độ từ hai field rời rạc.
 *
 * File thuần, không gắn chỉ thị client component (bẫy 9): Server Component và
 * script kiểm hàm thuần đều import được.
 */
export type RecipientKind = "partner" | "internal";

export type Recipient =
  | { kind: "partner"; id: string; code: string | null; name: string | null }
  | { kind: "internal"; id: string; name: string | null };

/** Lựa chọn trên form: chế độ + id, chưa cần tên. */
export type RecipientChoice = { kind: RecipientKind; id: string };

export const RECIPIENT_KIND_LABELS: Record<RecipientKind, string> = {
  partner: "Đối tác",
  internal: "Nội bộ",
};

/**
 * RPC trả `null` cho cột không dùng dù type sinh tự động khai `string` — nên
 * nhận `string | null` ở mọi field và kiểm tường minh.
 */
export function toRecipient(source: {
  partnerId: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  internalId: string | null;
  internalName: string | null;
}): Recipient | null {
  if (source.internalId) {
    return { kind: "internal", id: source.internalId, name: source.internalName };
  }
  if (source.partnerId) {
    return {
      kind: "partner",
      id: source.partnerId,
      code: source.partnerCode,
      name: source.partnerName,
    };
  }
  return null;
}

export function formatRecipient(recipient: Recipient | null): string {
  if (!recipient) return "—";
  if (recipient.kind === "internal") {
    return `Nội bộ — ${recipient.name ?? "?"}`;
  }
  return [recipient.code, recipient.name].filter(Boolean).join(" ") || "—";
}
