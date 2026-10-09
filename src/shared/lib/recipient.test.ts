import { describe, expect, it } from "vitest";
import {
  COMMON_GOODS_LABEL,
  formatOrderRecipients,
  isInternalPartnerCode,
  isMultiRecipientOrder,
  lineRecipientLabel,
  partnerLabel,
  recipientDisplayName,
  recipientKindOf,
  staffNames,
  toStaffRefs,
} from "@/shared/lib/recipient";

describe("recipient", () => {
  it("người nhận: một đối tác tùy chọn + nhiều nhân viên (0090, Phase 18)", () => {
    const staffAn = { id: "a", name: "An" };
    const staffBinh = { id: "b", name: "Bình" };
    const partnerLienHoa = { id: "d", code: "KH01", name: "Liên Hoa" };
    expect(toStaffRefs(["a", "b"], ["An", "Bình"])).toStrictEqual([
      staffAn,
      staffBinh,
    ]);
    expect(toStaffRefs(null, null)).toStrictEqual([]);
    expect(toStaffRefs(["a"], []), "thiếu tên → '?'").toStrictEqual([
      { id: "a", name: "?" },
    ]);
    expect(staffNames([staffAn, { id: "b", name: " Bình " }])).toBe("An, Bình");
    expect(staffNames([])).toBe("—");
    expect(partnerLabel(partnerLienHoa)).toBe("KH01 Liên Hoa");
    expect(partnerLabel({ ...partnerLienHoa, code: null })).toBe("Liên Hoa");
    expect(partnerLabel({ id: "d", code: null, name: null })).toBe("—");
    expect(
      formatOrderRecipients({ partner: null, staff: [staffAn, staffBinh] }),
      "không gắn nhãn Nội bộ",
    ).toBe("An, Bình");
    expect(formatOrderRecipients({ partner: null, staff: [] })).toBe(
      "Chưa chọn người nhận",
    );
    expect(formatOrderRecipients({ partner: partnerLienHoa, staff: [] })).toBe(
      "KH01 Liên Hoa",
    );
    expect(
      formatOrderRecipients({ partner: partnerLienHoa, staff: [staffAn] }),
    ).toBe("KH01 Liên Hoa · An");
    // NB001 (Bộ phận điều phối đơn) là đối tác nội bộ: có nhân viên thì chỉ hiện nhân viên.
    const partnerNb001 = {
      id: "nb1",
      code: "NB001",
      name: "BỘ PHẬN ĐIỀU PHỐI ĐƠN",
    };
    expect(
      formatOrderRecipients({ partner: partnerNb001, staff: [staffAn] }),
    ).toBe("An");
    expect(formatOrderRecipients({ partner: partnerNb001, staff: [] })).toBe(
      "NB001 BỘ PHẬN ĐIỀU PHỐI ĐƠN",
    );
    expect(isInternalPartnerCode("nb002")).toBe(true);
    expect(isInternalPartnerCode("NBA01"), "phải là NB + số").toBe(false);
    expect(recipientKindOf({ partner: null, staff: [staffAn] })).toBe(
      "internal",
    );
    expect(recipientKindOf({ partner: partnerLienHoa, staff: [] })).toBe(
      "partner",
    );
    // Phase 17 (DDAT-02, A3): phiếu đi lấy hàng chỉ in TÊN người nhận — không "Nội bộ —", không mã đối tác.
    expect(recipientDisplayName("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    expect(recipientDisplayName("  ")).toBe("—");
    expect(recipientDisplayName(null)).toBe("—");
    expect(lineRecipientLabel("An", 1)).toBe("An");
    expect(lineRecipientLabel(null, 2), "hàng chung khi đơn có ≥ 2 người").toBe(
      "Chung",
    );
    expect(lineRecipientLabel(null, 1)).toBe("");
    expect(lineRecipientLabel("  ", 3)).toBe("Chung");
    expect(COMMON_GOODS_LABEL).toBe("Chung");
    expect(isMultiRecipientOrder(1, false)).toBe(false);
    expect(isMultiRecipientOrder(2, false)).toBe(true);
    expect(isMultiRecipientOrder(1, true)).toBe(true);
    expect(isMultiRecipientOrder(0, false)).toBe(false);
  });
});
